#!/usr/bin/env python3
"""Create timestamped dialogue logs for the downloaded Instagram reels."""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime
from pathlib import Path

from faster_whisper import WhisperModel


CAPTIONS = {
    "DbLLNypSMDH": "Wanna impress your Thai girlfriend? Surprise her by saying these phrases. Let me know the result.",
    "DcOP6I7y_i9": "How to deal with your angry Thai girlfriend. Saying these phrases will save your life.",
    "DcbIu-OyPNB": "5 ways to say ‘it’s okay’ in Thai. Follow for more Thai in real life.",
    "DcYjinlyu2w": "How much? Learn these 6 useful words to describe quantity in Thai.",
    "DcV9636yyq5": "Ordering coffee in Thai is easier than you think. You can say the type of coffee in English: ao plus type of coffee plus hot or cold plus your preferences.",
    "DcTZKYUSK9N": "Food allergies in Thai. Learn this for your next meal in Thailand.",
    "DcQ3KtgSPKN": "Most common verbs in Thai. Follow for more Thai in real life.",
    "DcLreBDSxkH": "If you’re learning Thai, here are some useful words you can use. Follow for more Thai in real life.",
    "DcJHCxwygGy": "Nice things to say in Thai. Save this for your next chat with Thai people.",
    "DcGiG_XydRu": "Wanna talk about the weather in Thai? These are the words you need to know.",
    "DcD9zQ8SQ8v": "แล้วเจอกัน is boring. Let’s be creative and say these phrases.",
    "DcBXuuUS0k9": "How do you describe your food? Learn these 5 basic flavors in Thai and start talking about food like a local.",
}


def stamp(seconds: float) -> str:
    minutes, remainder = divmod(seconds, 60)
    return f"{int(minutes):02d}:{remainder:06.3f}"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", default="small", help="Whisper model: tiny, base, small, medium, or large-v3")
    parser.add_argument("--output", type=Path, default=Path("reel_dialogue_logs"))
    args = parser.parse_args()

    args.output.mkdir(exist_ok=True)
    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    records = []

    for video in sorted(Path.cwd().glob("learnthai_irl_*.mp4")):
        match = re.match(r"learnthai_irl_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_(.+)$", video.stem)
        code = match.group(1) if match else video.stem
        print(f"Transcribing {video.name}", flush=True)
        segments, info = model.transcribe(
            str(video),
            task="transcribe",
            vad_filter=True,
            beam_size=5,
            condition_on_previous_text=True,
        )
        rows = []
        for segment in segments:
            rows.append({
                "start": round(segment.start, 3),
                "end": round(segment.end, 3),
                "text": segment.text.strip(),
            })
        records.append({
            "video": video.name,
            "shortcode": code,
            "model": args.model,
            "caption": CAPTIONS.get(code, ""),
            "detected_language": info.language,
            "language_probability": round(info.language_probability, 4),
            "segments": rows,
        })

    stamp_now = datetime.now().isoformat(timespec="seconds")
    (args.output / "dialogue_logs.json").write_text(
        json.dumps({"generated_at": stamp_now, "reels": records}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    with (args.output / "dialogue_logs.md").open("w", encoding="utf-8") as output:
        output.write("# Learn Thai IRL — Reel Dialogue Logs\n\n")
        output.write(f"Generated {stamp_now}. Timestamps refer to each MP4.\n\n")
        for record in records:
            output.write(f"## [{record['video']}](../{record['video']})\n\n")
            output.write(f"**Detected language:** `{record['detected_language']}`\n\n")
            output.write(f"**Instagram caption:** {record['caption']}\n\n")
            output.write("**Dialogue transcript:**\n\n")
            if record["segments"]:
                for segment in record["segments"]:
                    output.write(f"- `{stamp(segment['start'])}–{stamp(segment['end'])}` {segment['text']}\n")
            else:
                output.write("- *(No speech detected.)*\n")
            output.write("\n")

    print(f"Wrote {len(records)} reel logs to {args.output}/", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
