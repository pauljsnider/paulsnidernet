#!/usr/bin/env python3
"""Publish a compact local weather feed for the legacy iPad kitchen display."""

from __future__ import annotations

import json
import sys
from datetime import datetime
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
    try:
        response = requests.get(OPEN_METEO_URL, params=parameters, timeout=30)
        response.raise_for_status()
        feed = build_weather_feed(response.json(), now=now)
    except (requests.RequestException, ValueError, KeyError) as error:
        raise RuntimeError("Could not fetch the kitchen weather feed.") from error

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
