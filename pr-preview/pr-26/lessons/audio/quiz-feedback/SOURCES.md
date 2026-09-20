# Quiz feedback sound sources

The correct and perfect-score effects are derived from the bundled compliments lesson video at `public/lessons/drafts/compliments/intro.mp4`. The wrong-answer buzzer comes from `public/lessons/drafts/reel-2026-07-26/intro.mp4`. The licensed stock sounds previously used by the quiz were removed.

Each video's audio was separated into voice and non-voice stems with `UVR-MDX-NET-Inst_HQ_3`, then the following non-voice windows were trimmed and faded:

| App asset | Source video and window | Use |
| --- | --- | --- |
| `correct.mp3` | Compliments, 00:08.88–00:09.92 | Bright stepped reveal chime |
| `incorrect.mp3` | Reel 2026-07-26, 00:00.84–00:01.53 | Red-X wrong-answer buzzer |
| `perfect.mp3` | Compliments, 00:12.60–00:14.18 | Trophy/confetti celebration |

The clips retain the video's original character, contain no voice activity after separation, and are encoded as 44.1 kHz, 160 kbps MP3 files. Only short edge fades and loudness normalization were applied.
