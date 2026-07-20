# Noklingo audio assets

Seed lessons use `tts:` references routed through the browser's Thai speech voice so the POC is usable without shipping copied recordings. The audio abstraction also accepts normal local or remote URLs through Howler. When original recordings are added here, reference them from course data as `/audio/file-name.mp3`; the service worker will cache them after first playback for offline use.
