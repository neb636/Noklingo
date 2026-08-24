# Lesson media directory

Each licensed lesson uses this exact shape:

```text
<lesson-id>/intro.mp4
<lesson-id>/poster.jpg
<lesson-id>/captions.vtt
```

The checked-in `coffee-order/captions.vtt` is an explicitly marked timing and
language draft. No placeholder MP4 or poster is committed: the seed lesson is
set to `draft-unavailable`, so the interface shows its user-facing fallback
until reviewed, licensed assets occupy those paths.
