# Lesson media

Each authored lesson gets one directory named for its curriculum slug:

```text
public/lessons/<lesson-id>/
├── intro.mp4
├── poster.jpg
└── captions.vtt
```

Use H.264/AAC MP4 and WebVTT captions. The reference lesson expects files in
`public/lessons/everyday-thai/`, but it remains intentionally marked as draft
until its source video and verified transcript are supplied.

Do not commit inferred dialogue or fabricated timestamps to make validation
pass. Follow `docs/COURSE_AUTHORING.md` for the verification workflow.
