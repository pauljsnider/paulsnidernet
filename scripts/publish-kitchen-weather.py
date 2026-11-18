#!/usr/bin/env python3
"""Publish a compact local weather feed for the legacy iPad kitchen display."""

from __future__ import annotations

import json
import sys
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import requests


REPOSITORY_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_FILE = REPOSITORY_ROOT / "family" / "kitchen-weather.json"
KITCHEN_TIMEZONE = ZoneInfo("America/Chicago")
LOCATION = {"name": "Leawood, KS", "latitude": 38.9667, "longitude": -94.6161}
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
WEATHER_CODES = {
    0: "Clear",
    1: "Mostly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Icy fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    56: "Freezing drizzle",
    57: "Heavy freezing drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Heavy freezing rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Rain showers",
    81: "Rain showers",
    82: "Heavy showers",
    85: "Snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorms",
    96: "Thunderstorms",
    99: "Severe thunderstorms",
}


def condition_for(code: int | None) -> str:
    """Return a short, board-friendly label for an Open-Meteo weather code."""
    return WEATHER_CODES.get(code, "Conditions unavailable")


def rounded(value) -> int | None:
    return int(round(value)) if isinstance(value, (int, float)) else None


def daily_value(daily: dict, name: str, index: int):
    values = daily.get(name) or []
    return values[index] if index < len(values) else None


def daily_forecast(daily: dict, index: int, fallback_date: str) -> dict:
    """Return one compact forecast day without assuming every field is present."""
    return {
        "date": daily_value(daily, "time", index) or fallback_date,
        "high_f": rounded(daily_value(daily, "temperature_2m_max", index)),
        "low_f": rounded(daily_value(daily, "temperature_2m_min", index)),
        "condition": condition_for(daily_value(daily, "weather_code", index)),
        "precipitation_chance": rounded(daily_value(daily, "precipitation_probability_max", index)),
    }


def build_weather_feed(payload: dict, now: datetime | None = None) -> dict:
    """Convert Open-Meteo's response to a tiny, legacy-browser-friendly schema."""
    current = payload.get("current") or {}
    daily = payload.get("daily") or {}
    now = now.astimezone(KITCHEN_TIMEZONE) if now else datetime.now(KITCHEN_TIMEZONE)
    fallback_date = now.date().isoformat()
    dates = daily.get("time") or []
    today = daily_forecast(daily, 0, fallback_date)
    forecast = [
        daily_forecast(daily, index, fallback_date)
        for index in range(1, min(len(dates), 4))
    ]
    return {
        "generated_at": now.isoformat(),
        "location": LOCATION["name"],
        "current": {
            "temperature_f": rounded(current.get("temperature_2m")),
            "feels_like_f": rounded(current.get("apparent_temperature")),
            "condition": condition_for(current.get("weather_code")),
        },
        "today": today,
        "forecast": forecast,
    }


MAX_RETRY_DELAY_SECONDS = 60


def retry_after_seconds(response, now=None):
    """Parse delay-seconds or HTTP-date without logging untrusted header text."""
    if response is None:
        return None
    value = response.headers.get("Retry-After", "").strip()
    try:
        if value.isascii() and value.isdigit():
            # Avoid converting arbitrarily long upstream integers.
            digits = value.lstrip("0") or "0"
            return MAX_RETRY_DELAY_SECONDS + 1 if len(digits) > 6 else int(digits)
        target = parsedate_to_datetime(value)
        if target.tzinfo is None:
            return None
        current = now or datetime.now(timezone.utc)
        return max(0, (target - current).total_seconds())
    except (ValueError, TypeError, OverflowError):
        return None


def publish_weather(output_file: Path = OUTPUT_FILE, now: datetime | None = None) -> dict:
    """Fetch Leawood's current conditions and write the local display feed."""
    parameters = {
        "latitude": LOCATION["latitude"],
        "longitude": LOCATION["longitude"],
        "current": "temperature_2m,apparent_temperature,weather_code",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
        "forecast_days": 4,
        "temperature_unit": "fahrenheit",
        "timezone": "America/Chicago",
    }
    for attempt in range(1, 4):
        started = time.monotonic()
        phase = "request"
        try:
            response = requests.get(OPEN_METEO_URL, params=parameters, timeout=(10, 60))
            phase = "status"
            response.raise_for_status()
            phase = "payload"
            payload = response.json()
            if not isinstance(payload, dict) or not isinstance(payload.get("current"), dict):
                raise ValueError("Missing current conditions")
            feed = build_weather_feed(payload, now=now)
            if feed["current"]["temperature_f"] is None:
                raise ValueError("Missing temperature")
            break
        except (requests.RequestException, ValueError, KeyError, TypeError) as error:
            error_response = getattr(error, "response", None)
            status = error_response.status_code if error_response is not None else None
            transient = isinstance(error, (requests.Timeout, requests.ConnectionError)) or (
                status is not None and (status == 429 or 500 <= status < 600)
            )
            elapsed = max(0, time.monotonic() - started)
            # Report only our phase, elapsed time and class/status, never upstream text.
            detail = f"HTTP {status}" if status is not None else type(error).__name__
            diagnostic = f"phase={phase}, elapsed={elapsed:.2f}s, connect_limit=10s, read_limit=60s"
            delay = retry_after_seconds(error_response) if transient else None
            deferred = delay is not None and delay > MAX_RETRY_DELAY_SECONDS
            if not transient or attempt == 3 or deferred:
                reason = " Retry-After exceeds the 60s wait budget; deferring to a later run." if deferred else ""
                raise RuntimeError(f"Could not fetch the kitchen weather feed: {detail} after {attempt} attempt(s). {diagnostic}.{reason}") from error
            delay = max(2 ** attempt, delay or 0)
            print(f"Kitchen weather attempt {attempt} failed: {detail}; {diagnostic}; retrying in {delay:g}s.", file=sys.stderr)
            time.sleep(delay)

    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(json.dumps(feed, indent=2) + "\n", encoding="utf-8")
    print(f"Published weather for {feed['location']}: {feed['current']['temperature_f']}° and {feed['current']['condition']}.")
    return feed


def main() -> int:
    try:
        publish_weather()
    except RuntimeError as error:
        print(f"Kitchen weather publishing failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
