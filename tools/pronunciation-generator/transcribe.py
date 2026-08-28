#!/usr/bin/env python3
"""Local multilingual transcript writer used by the lesson audio generator."""
import argparse
import json
from pathlib import Path

from faster_whisper import WhisperModel


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--model", default="large-v3")
    parser.add_argument("--model-cache", required=True)
    parser.add_argument("--hotwords", default="")
    args = parser.parse_args()

    model = WhisperModel(
        args.model,
        device="cpu",
        compute_type="int8",
        download_root=args.model_cache,
    )
    segments, info = model.transcribe(
        args.audio,
        task="transcribe",
        beam_size=5,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 400},
        hotwords=args.hotwords or None,
        condition_on_previous_text=False,
        multilingual=True,
    )
    payload = {
        "language": info.language,
        "languageProbability": info.language_probability,
        "mode": "multilingual",
        "model": args.model,
        "segments": [],
    }
    for segment in segments:
        payload["segments"].append({
            "text": segment.text,
            "start": segment.start,
            "end": segment.end,
            "averageLogProbability": segment.avg_logprob,
            "words": [
                {"text": word.word, "start": word.start, "end": word.end, "probability": word.probability}
                for word in (segment.words or [])
            ],
        })
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
