#!/usr/bin/env python3
"""Download the public reels from an Instagram profile as MP4 files.

This uses Instagram's public web feed endpoint. It does not ask for or store
Instagram credentials. The account must be publicly viewable to the caller.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


APP_ID = "936619743392459"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)


def request_json(url: str) -> dict:
    request = Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
            "Referer": "https://www.instagram.com/",
            "X-IG-App-ID": APP_ID,
            "X-Requested-With": "XMLHttpRequest",
        },
    )
    with urlopen(request, timeout=45) as response:
        return json.load(response)


def feed_page(user_id: str, cursor: str | None) -> dict:
    query = {"count": "12"}
    if cursor:
        query["max_id"] = cursor
    url = (
        "https://www.instagram.com/api/v1/feed/user/"
        f"{user_id}/?{urlencode(query)}"
    )
    return request_json(url)


def download(url: str, target: Path) -> None:
    request = Request(url, headers={"User-Agent": USER_AGENT, "Referer": "https://www.instagram.com/"})
    temporary = target.with_suffix(target.suffix + ".part")
    with urlopen(request, timeout=120) as response, temporary.open("wb") as output:
        while True:
            block = response.read(1024 * 1024)
            if not block:
                break
            output.write(block)
    temporary.replace(target)


def post_filename(post: dict, username: str) -> str:
    taken_at = datetime.fromtimestamp(post["taken_at"], timezone.utc).strftime("%Y-%m-%d_%H-%M-%S")
    return f"{username}_{taken_at}_{post['code']}.mp4"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("username", nargs="?", default="learnthai_irl")
    parser.add_argument("--user-id", default="34990140461")
    parser.add_argument("--output", type=Path, default=Path.cwd())
    parser.add_argument("--max-pages", type=int, default=0, help="0 means all available pages")
    parser.add_argument("--retry-delay", type=int, default=90)
    args = parser.parse_args()

    args.output.mkdir(parents=True, exist_ok=True)
    cursor = None
    seen_posts: set[str] = set()
    page_number = 0
    downloaded = 0

    while True:
        page_number += 1
        if args.max_pages and page_number > args.max_pages:
            break

        for attempt in range(5):
            try:
                payload = feed_page(args.user_id, cursor)
                if payload.get("require_login") or payload.get("status") == "fail":
                    raise RuntimeError(payload.get("message", "Instagram rejected the feed request"))
                break
            except (HTTPError, URLError, RuntimeError, TimeoutError) as error:
                if attempt == 4:
                    print(f"Could not fetch page {page_number}: {error}", file=sys.stderr)
                    return 2
                delay = args.retry_delay * (attempt + 1)
                print(f"Instagram is rate-limiting page {page_number}; retrying in {delay}s", flush=True)
                time.sleep(delay)

        items = payload.get("items", [])
        if not items:
            break

        print(f"Page {page_number}: {len(items)} posts", flush=True)
        for post in items:
            post_id = str(post.get("pk") or post.get("id"))
            if post_id in seen_posts:
                continue
            seen_posts.add(post_id)

            # Reels appear as media_type 2 with product_type "clips".
            if post.get("media_type") != 2 or post.get("product_type") != "clips":
                continue
            versions = post.get("video_versions") or []
            if not versions:
                print(f"Skipping {post.get('code', post_id)}: no public MP4 URL", flush=True)
                continue

            best = max(versions, key=lambda item: (item.get("width", 0), item.get("height", 0)))
            target = args.output / post_filename(post, args.username)
            if target.exists() and target.stat().st_size > 0:
                print(f"Exists: {target.name}", flush=True)
                continue

            try:
                print(f"Downloading: {target.name}", flush=True)
                download(best["url"], target)
                downloaded += 1
            except (HTTPError, URLError, OSError) as error:
                print(f"Failed {target.name}: {error}", file=sys.stderr)
                target.with_suffix(target.suffix + ".part").unlink(missing_ok=True)

        if not payload.get("more_available") or not payload.get("next_max_id"):
            break
        cursor = payload["next_max_id"]
        time.sleep(3)

    print(f"Finished: {downloaded} new MP4(s); {len(seen_posts)} post(s) inspected")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
