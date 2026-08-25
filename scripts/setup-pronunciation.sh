#!/usr/bin/env zsh
set -euo pipefail

repo_root="${0:A:h:h}"
tool_root="$repo_root/tools/pronunciation-generator"

if ! command -v ffmpeg >/dev/null || ! command -v ffprobe >/dev/null; then
  print -u2 "FFmpeg and FFprobe are required. On macOS with Homebrew: brew install ffmpeg"
  exit 1
fi

python3 -m venv "$tool_root/.venv"
"$tool_root/.venv/bin/python" -m pip install --upgrade pip
"$tool_root/.venv/bin/python" -m pip install -r "$tool_root/requirements.txt"
print "Pronunciation generator setup is complete. The Whisper model downloads on the first generation run."
