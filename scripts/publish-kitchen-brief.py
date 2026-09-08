#!/usr/bin/env python3
"""Publish a small, safe Daily Brief feed for the legacy kitchen display.

The screen is deliberately a curated *glance* view.  It contains no generated
summaries or arbitrary news: each field comes from one of the explicit,
family-safe sources below.  A source failure leaves that small section empty
rather than substituting a noisy or unsuitable headline.
"""

from __future__ import annotations

import csv
import json
import re
import sys
import xml.etree.ElementTree as ElementTree
from datetime import datetime
from email.utils import parsedate_to_datetime
from html import unescape
from pathlib import Path
from urllib.parse import urljoin
from zoneinfo import ZoneInfo

import requests


REPOSITORY_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_FILE = REPOSITORY_ROOT / "family" / "kitchen-brief.json"
KITCHEN_TIMEZONE = ZoneInfo("America/Chicago")
KC_LIBRARY_URL = "https://kclibrary.org/calendar-view"
KCUR_ARTS_URL = "https://www.kcur.org/arts-life"
MIT_AI_RSS_URL = "https://news.mit.edu/rss/topic/artificial-intelligence2"
YAHOO_FTV_URL = "https://query1.finance.yahoo.com/v8/finance/chart/FTV?range=5d&interval=1d"
FRED_SERIES = (
    ("S&P 500", "https://fred.stlouisfed.org/graph/fredgraph.csv?id=SP500"),
    ("Nasdaq", "https://fred.stlouisfed.org/graph/fredgraph.csv?id=NASDAQCOM"),
)

# The family pick is intentionally conservative.  A title must positively
# identify a children/family activity and must not include any blocked topic.
FAMILY_WORDS = (
    "family", "storytime", "lego", "kids", "kid", "children", "child",
    "toddler", "baby", "youth", "teen", "tween", "stem", "craft",
    "science", "art", "movie",
)
BLOCKED_WORDS = (
    "politic", "election", "campaign", "government", "crime", "shoot",
    "murder", "death", "war", "attack", "arrest", "court", "adult",
    "beer", "wine", "cocktail",
)
KC_NEWS_BLOCKED_WORDS = BLOCKED_WORDS + (
    "warning", "cancel", "storm", "violent", "injur", "disaster",
)


def clean_text(value: str) -> str:
    """Convert a small HTML fragment into a compact one-line label."""
    without_tags = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"\s+", " ", unescape(without_tags)).strip()


def is_safe_family_title(title: str) -> bool:
    """Accept only explicitly family-oriented, non-sensitive event titles."""
    lower_title = (title or "").lower()
    return (
        bool(lower_title)
        and any(word in lower_title for word in FAMILY_WORDS)
        and not any(word in lower_title for word in BLOCKED_WORDS)
    )


def parse_kc_library_events(html: str, now: datetime | None = None) -> list[dict]:
    """Extract upcoming, safe events from the official KC Library calendar."""
    now = (now or datetime.now(KITCHEN_TIMEZONE)).astimezone(KITCHEN_TIMEZONE)
    events = []
    links = re.findall(
        r'<a\s+class="calendar-link"\s+href="([^"]+)">(.*?)</a>',
        html or "",
        flags=re.IGNORECASE | re.DOTALL,
    )
    for href, body in links:
        title_match = re.search(
            r'<div\s+class="calendar-link__title">(.*?)</div>',
            body,
            flags=re.IGNORECASE | re.DOTALL,
        )
        time_match = re.search(
            r'<time\s+datetime="([^"]+)"[^>]*>(.*?)</time>(.*?)</div>',
            body,
            flags=re.IGNORECASE | re.DOTALL,
        )
        if not title_match or not time_match:
            continue
        title = clean_text(title_match.group(1))
        if not is_safe_family_title(title):
            continue
        try:
            starts_at = datetime.fromisoformat(time_match.group(1)).astimezone(KITCHEN_TIMEZONE)
        except ValueError:
            continue
        if starts_at.date() < now.date():
            continue
        location = clean_text(time_match.group(3)).strip(" |")
        detail = starts_at.strftime("%a, %b %-d at %-I:%M %p")
        if location:
            detail += " • " + location
        events.append(
            {
                "title": title,
                "detail": detail,
                "date": starts_at.date().isoformat(),
                "source": "Kansas City Public Library",
                "url": urljoin(KC_LIBRARY_URL, unescape(href)),
            }
        )
    return sorted(events, key=lambda event: (event["date"], event["title"]))


def parse_kcur_arts_news(html: str, limit: int = 1) -> list[dict]:
    """Extract calm, non-political local arts/life headlines from KCUR."""
    items = []
    promos = re.findall(
        r'<ps-promo\s+class="Promo[AB]"[^>]*>(.*?)</ps-promo>',
        html or "",
        flags=re.IGNORECASE | re.DOTALL,
    )
    for promo in promos:
        title_match = re.search(
            r'<div\s+class="Promo[AB]-title">.*?<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>',
            promo,
            flags=re.IGNORECASE | re.DOTALL,
        )
        if not title_match:
            continue
        title = clean_text(title_match.group(2))
        description_match = re.search(
            r'<div\s+class="Promo[AB]-description">(.*?)</div>',
            promo,
            flags=re.IGNORECASE | re.DOTALL,
        )
        description = clean_text(description_match.group(1)) if description_match else ""
        source_text = (title + " " + description).lower()
        if not title or any(word in source_text for word in KC_NEWS_BLOCKED_WORDS):
            continue
        items.append(
            {
                "title": title,
                "detail": "KCUR • KC arts & life",
                "source": "KCUR",
                "url": unescape(title_match.group(1)),
            }
        )
        if len(items) >= limit:
            break
    return items


def parse_mit_ai_items(xml_text: str, limit: int = 2) -> list[dict]:
    """Return safe headlines from MIT News' official AI RSS feed."""
    try:
        root = ElementTree.fromstring(xml_text)
    except ElementTree.ParseError:
        return []
    items = []
    for item in root.findall(".//item"):
        title = clean_text(item.findtext("title") or "")
        link = clean_text(item.findtext("link") or "")
        if not title or not link or any(word in title.lower() for word in BLOCKED_WORDS):
            continue
        published = item.findtext("pubDate") or ""
        try:
            published_date = parsedate_to_datetime(published).astimezone(KITCHEN_TIMEZONE).date().isoformat()
        except (TypeError, ValueError):
            published_date = ""
        items.append(
            {
                "title": title,
                "detail": "MIT News • AI & science",
                "date": published_date,
                "source": "MIT News",
                "url": link,
            }
        )
        if len(items) >= limit:
            break
    return items


def parse_market_close(csv_text: str, name: str) -> dict | None:
    """Read FRED's final two daily values as a market-close snapshot."""
    rows = []
    try:
        reader = csv.DictReader((csv_text or "").splitlines())
        for row in reader:
            raw_date = (row.get("observation_date") or "").strip()
            raw_value = (row.get(next(iter(row.keys() - {"observation_date"}), "")) or "").strip()
            if raw_value in ("", "."):
                continue
            rows.append((datetime.strptime(raw_date, "%Y-%m-%d").date(), float(raw_value)))
    except (KeyError, StopIteration, ValueError):
        return None
    if len(rows) < 2:
        return None
    previous_date, previous_value = rows[-2]
    latest_date, latest_value = rows[-1]
    if previous_value == 0:
        return None
    return {
        "name": name,
        "value": round(latest_value, 2),
        "change_pct": round(((latest_value - previous_value) / previous_value) * 100, 2),
        "as_of": latest_date.isoformat(),
    }


def parse_ftv_ticker(payload: dict) -> dict | None:
    """Return Fortive's latest available quote with a daily percentage change."""
    try:
        result = payload["chart"]["result"][0]
        meta = result["meta"]
        close_prices = result["indicators"]["quote"][0]["close"]
        timestamps = result["timestamp"]
        latest_close = next(value for value in reversed(close_prices) if isinstance(value, (int, float)))
        latest_timestamp = next(value for value in reversed(timestamps) if isinstance(value, (int, float)))
    except (KeyError, IndexError, StopIteration, TypeError):
        return None
    price = meta.get("regularMarketPrice")
    if not isinstance(price, (int, float)):
        price = latest_close
    change = meta.get("regularMarketChangePercent")
    if not isinstance(change, (int, float)):
        previous_close = next(
            (value for value in reversed(close_prices[:-1]) if isinstance(value, (int, float))),
            None,
        )
        change = ((price - previous_close) / previous_close) * 100 if previous_close else None
    quoted_at = datetime.fromtimestamp(latest_timestamp, KITCHEN_TIMEZONE).date().isoformat()
    return {
        "ticker": "FTV",
        "name": "Fortive",
        "value": round(price, 2),
        "change_pct": round(change, 2) if isinstance(change, (int, float)) else None,
        "as_of": quoted_at,
    }


def fetch_text(url: str) -> str:
    """Fetch a public source with a bounded request and a descriptive agent."""
    response = requests.get(
        url,
        timeout=30,
        headers={"User-Agent": "SniderKitchenBrief/1.0 (+https://paulsnider.net)"},
    )
    response.raise_for_status()
    return response.text


def build_brief_feed(
    now: datetime,
    local: dict | None,
    kc_news: dict | None,
    ai: list[dict],
    markets: list[dict],
    ticker: dict | None,
) -> dict:
    """Return the stable static-JSON contract read by old Safari."""
    return {
        "generated_at": now.astimezone(KITCHEN_TIMEZONE).isoformat(),
        "local": local,
        "kc_news": kc_news,
        "ai": ai,
        "markets": markets,
        "ticker": ticker,
    }


def publish_brief(output_file: Path = OUTPUT_FILE, now: datetime | None = None) -> dict:
    """Fetch each allowlisted source independently and write the brief feed."""
    now = (now or datetime.now(KITCHEN_TIMEZONE)).astimezone(KITCHEN_TIMEZONE)
    local = None
    kc_news = None
    ai = []
    markets = []
    ticker = None

    try:
        events = parse_kc_library_events(fetch_text(KC_LIBRARY_URL), now)
        local = events[0] if events else None
    except (requests.RequestException, ValueError) as error:
        print(f"KC family pick unavailable: {error}", file=sys.stderr)

    try:
        items = parse_kcur_arts_news(fetch_text(KCUR_ARTS_URL))
        kc_news = items[0] if items else None
    except requests.RequestException as error:
        print(f"KCUR item unavailable: {error}", file=sys.stderr)

    try:
        ai = parse_mit_ai_items(fetch_text(MIT_AI_RSS_URL))
    except requests.RequestException as error:
        print(f"MIT AI items unavailable: {error}", file=sys.stderr)

    for name, url in FRED_SERIES:
        try:
            market = parse_market_close(fetch_text(url), name)
            if market:
                markets.append(market)
        except requests.RequestException as error:
            print(f"{name} close unavailable: {error}", file=sys.stderr)

    try:
        ticker = parse_ftv_ticker(json.loads(fetch_text(YAHOO_FTV_URL)))
    except (requests.RequestException, ValueError) as error:
        print(f"Fortive ticker unavailable: {error}", file=sys.stderr)

    feed = build_brief_feed(now, local, kc_news, ai, markets, ticker)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(json.dumps(feed, indent=2) + "\n", encoding="utf-8")
    print(
        "Published Daily Brief: "
        + ("KC pick" if local else "no KC pick")
        + ", "
        + ("KCUR item" if kc_news else "no KCUR item")
        + f", {len(ai)} MIT items, {len(markets)} market closes"
        + (", Fortive ticker." if ticker else ", no Fortive ticker.")
    )
    return feed


def main() -> int:
    publish_brief()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
