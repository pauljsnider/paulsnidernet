#!/usr/bin/env python3
"""Publish a small, iPad-friendly daily photo set for the kitchen display.

The Google Photos shared-album page is used only by this scheduled publisher.
The kitchen page itself reads the generated local JPEGs and JSON manifest, so
the old iPad never depends on Google Photos, a login, or short-lived URLs.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import io
import json
import os
import re
import secrets
import shutil
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Iterable
from zoneinfo import ZoneInfo

import requests
from PIL import Image, ImageOps


REPOSITORY_ROOT = Path(__file__).resolve().parent.parent
FAMILY_DIRECTORY = REPOSITORY_ROOT / "family"
PHOTO_DIRECTORY = FAMILY_DIRECTORY / "kitchen-photos"
MANIFEST_FILE = FAMILY_DIRECTORY / "kitchen-photos.json"
PHOTO_COUNT = 5
MAX_IMAGE_SIZE = (1600, 1200)
MIN_IMAGE_DIMENSION = 600
KITCHEN_TIMEZONE = ZoneInfo("America/Chicago")

# The album page embeds image URLs in escaped data blobs. We deliberately only
# retain the resulting Google-hosted image URLs long enough to create local
# derivatives; the published manifest never exposes them.
GOOGLE_IMAGE_URL = re.compile(
    r"https?://(?:lh[3-6]\.googleusercontent\.com|googleusercontent\.com)/[^\s\"\\<>]+",
    re.IGNORECASE,
)
RENDITION_SUFFIX = re.compile(r"=(?:w\d+|h\d+|s\d+)(?:-[^?]*)?(?=\?|$)", re.IGNORECASE)
SHARED_MEDIA_CARD = re.compile(
    r'<a\b[^>]*\bhref="(?P<href>[^\"]*/photo/[^\"]+)"[^>]*>.*?'
    r'<img\b[^>]*\bsrc="(?P<image>https?://(?:lh[3-6]\.)?googleusercontent\.com/[^\"]+)"[^>]*>',
    re.IGNORECASE | re.DOTALL,
)

REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; SniderKitchenPhotoPublisher/1.0)",
    "Accept": "text/html,application/xhtml+xml,image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
}


def _unescape_album_page(page: str) -> str:
    """Normalise the common JSON escapes used in public album HTML."""
    return html.unescape(
        page.replace("\\u003d", "=")
        .replace("\\u0026", "&")
        .replace("\\u002F", "/")
        .replace("\\u002f", "/")
        .replace("\\/", "/")
    )


def extract_photo_urls(page: str) -> list[str]:
    """Return unique Google image candidates embedded in a shared album page."""
    candidates = []
    seen = set()
    for url in GOOGLE_IMAGE_URL.findall(_unescape_album_page(page)):
        # URL punctuation occasionally follows a serialized string value.
        cleaned = url.rstrip(".,;)")
        if cleaned not in seen:
            seen.add(cleaned)
            candidates.append(cleaned)
    return candidates


def _absolute_media_url(href: str) -> str:
    """Turn a public album's relative media link into an absolute URL."""
    if href.startswith("http://") or href.startswith("https://"):
        return href
    return "https://photos.google.com/" + href.lstrip("./")


def extract_media_candidates(page: str) -> list[dict[str, str]]:
    """Return unique album media image URLs paired with their item pages.

    The item page is needed to distinguish an actual still from a video poster,
    which Google otherwise returns as an ordinary JPEG thumbnail.
    """
    candidates = []
    seen_ids = set()
    normalised_page = _unescape_album_page(page)
    for match in SHARED_MEDIA_CARD.finditer(normalised_page):
        image_url = match.group("image").rstrip(".,;)")
        identifier = source_id(image_url)
        if identifier in seen_ids:
            continue
        seen_ids.add(identifier)
        candidates.append({
            "image_url": image_url,
            "item_url": _absolute_media_url(match.group("href")),
            "id": identifier,
        })
    return candidates


def source_id(url: str) -> str:
    """Return a non-reversible, stable ID without retaining an album image URL."""
    base_url = url.split("?", 1)[0]
    base_url = RENDITION_SUFFIX.sub("", base_url)
    return hashlib.sha256(base_url.encode("utf-8")).hexdigest()[:20]


def high_resolution_url(url: str) -> str:
    """Ask Google's image host for a suitably sized rendition when possible."""
    base_url, separator, query = url.partition("?")
    updated = RENDITION_SUFFIX.sub("=w1600-h1200", base_url)
    return updated + (separator + query if separator else "")


def read_manifest(manifest_file: Path) -> dict:
    try:
        return json.loads(manifest_file.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def manifest_is_current(manifest: dict, today: str, family_directory: Path) -> bool:
    if manifest.get("date") != today:
        return False
    photos = manifest.get("photos") or []
    if len(photos) != PHOTO_COUNT:
        return False
    return all((family_directory / photo.get("src", "")).is_file() for photo in photos)


def download_and_prepare(session: requests.Session, url: str, output_file: Path) -> bool:
    """Download one usable photo and save an optimized JPEG derivative."""
    try:
        response = session.get(high_resolution_url(url), timeout=30, stream=True)
        response.raise_for_status()
        content_type = response.headers.get("content-type", "").lower()
        if "image" not in content_type:
            return False
        payload = response.content
        with Image.open(io.BytesIO(payload)) as opened_image:
            image = ImageOps.exif_transpose(opened_image)
            if min(image.size) < MIN_IMAGE_DIMENSION:
                return False
            if image.mode not in ("RGB", "L"):
                background = Image.new("RGB", image.size, "#ffffff")
                if image.mode == "RGBA":
                    background.paste(image, mask=image.getchannel("A"))
                else:
                    background.paste(image.convert("RGB"))
                image = background
            else:
                image = image.convert("RGB")
            image.thumbnail(MAX_IMAGE_SIZE, Image.Resampling.LANCZOS)
            image.save(output_file, "JPEG", quality=84, optimize=True)
        return True
    except (OSError, requests.RequestException, ValueError):
        return False


def is_video_candidate(session: requests.Session, item_url: str) -> bool:
    """Return whether a public Google Photos media page represents a video.

    Google serves a JPEG poster for videos from the same image host it uses for
    still photos. Its public item page identifies videos with ``isVideo``.
    Treat a failed item-page check as ineligible so video posters never slip
    into the kitchen display.
    """
    try:
        response = session.get(item_url, headers=REQUEST_HEADERS, timeout=30)
        response.raise_for_status()
        return "isVideo" in response.text
    except requests.RequestException:
        return True


def _distributed_candidate_order(candidates: Iterable[dict[str, str]], previous_ids: set[str]) -> list[dict[str, str]]:
    """Randomly interleave the full album list instead of clustering at its start."""
    fresh = [candidate for candidate in candidates if candidate["id"] not in previous_ids]
    fallback = [candidate for candidate in candidates if candidate["id"] in previous_ids]
    randomizer = secrets.SystemRandom()

    def spread(items: list[dict[str, str]]) -> list[dict[str, str]]:
        if not items:
            return []
        buckets = []
        for bucket_index in range(PHOTO_COUNT):
            start = (bucket_index * len(items)) // PHOTO_COUNT
            end = ((bucket_index + 1) * len(items)) // PHOTO_COUNT
            bucket = items[start:end]
            randomizer.shuffle(bucket)
            buckets.append(bucket)
        ordered = []
        while any(buckets):
            for bucket in buckets:
                if bucket:
                    ordered.append(bucket.pop())
        return ordered

    return spread(fresh) + spread(fallback)


def publish_photo_set(
    album_url: str,
    manifest_file: Path = MANIFEST_FILE,
    photo_directory: Path = PHOTO_DIRECTORY,
    now: datetime | None = None,
    force: bool = False,
    session: requests.Session | None = None,
) -> bool:
    """Publish five randomly selected local photo derivatives for today's display.

    Returns ``True`` when the set changed and ``False`` when today's valid set
    was already present. Existing files are preserved if a full fresh set can't
    be prepared.
    """
    now = now.astimezone(KITCHEN_TIMEZONE) if now else datetime.now(KITCHEN_TIMEZONE)
    today = now.date().isoformat()
    previous_manifest = read_manifest(manifest_file)
    if not force and manifest_is_current(previous_manifest, today, manifest_file.parent):
        print(f"Kitchen photos already published for {today}; leaving them unchanged.")
        return False

    http = session or requests.Session()
    try:
        album_response = http.get(album_url, headers=REQUEST_HEADERS, timeout=30)
        album_response.raise_for_status()
    except requests.RequestException as error:
        raise RuntimeError("Could not load the Google Photos shared album.") from error

    media_candidates = extract_media_candidates(album_response.text)
    if len(media_candidates) < PHOTO_COUNT:
        raise RuntimeError("The shared album did not provide enough image candidates.")

    previous_ids = {
        str(photo.get("id"))
        for photo in previous_manifest.get("photos", [])
        if photo.get("id")
    }
    ordered_candidates = _distributed_candidate_order(media_candidates, previous_ids)
    selected = []

    with tempfile.TemporaryDirectory(prefix="kitchen-photos-") as temporary_directory:
        temporary_path = Path(temporary_directory)
        for candidate in ordered_candidates:
            if len(selected) == PHOTO_COUNT:
                break
            output_file = temporary_path / f"current-{len(selected) + 1}.jpg"
            if is_video_candidate(http, candidate["item_url"]):
                continue
            if download_and_prepare(http, candidate["image_url"], output_file):
                selected.append({
                    "src": f"kitchen-photos/current-{len(selected) + 1}.jpg",
                    "id": candidate["id"],
                })

        if len(selected) != PHOTO_COUNT:
            raise RuntimeError("Could not prepare five usable photos from the shared album.")

        photo_directory.mkdir(parents=True, exist_ok=True)
        for old_photo in photo_directory.glob("current-*.jpg"):
            old_photo.unlink()
        for index in range(1, PHOTO_COUNT + 1):
            shutil.move(str(temporary_path / f"current-{index}.jpg"), photo_directory / f"current-{index}.jpg")

    manifest = {
        "generated_at": now.isoformat(),
        "date": today,
        "photos": selected,
    }
    manifest_file.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Published {PHOTO_COUNT} still photos for {today} from {len(media_candidates)} album candidates.")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Publish the kitchen display's daily photo set.")
    parser.add_argument("--force", action="store_true", help="replace today's existing photo set")
    arguments = parser.parse_args()
    album_url = os.getenv("GOOGLE_PHOTOS_ALBUM_URL", "").strip()
    if not album_url:
        print("GOOGLE_PHOTOS_ALBUM_URL must be set as a GitHub Actions secret.", file=sys.stderr)
        return 2
    try:
        publish_photo_set(album_url, force=arguments.force)
    except RuntimeError as error:
        print(f"Kitchen photo publishing failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
