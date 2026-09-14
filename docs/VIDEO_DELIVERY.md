# Public website videos

Keep original source files. Generate delivery files before adding a public background video:

```powershell
# Install FFmpeg or set FFMPEG_PATH to its executable.
npm run videos:optimize -- "path/to/source.mp4" unique-video-name
```

This preserves the complete duration, removes background audio, avoids upscaling,
and creates H.264 desktop/mobile MP4s with metadata at the beginning for progressive
playback, plus a WebP poster. Content hashes allow safe long-lived CDN caching.
Re-run when the source changes. The JSON output lists the generated URLs.

Use `OptimizedVideo` from `@/components/public/OptimizedVideo` with `desktop`,
`mobile`, and `poster` URLs. Set `priority` only for the visible hero. Other players
defer their sources until near the viewport, and pause when offscreen or the tab
is hidden. Always review visual quality on desktop/mobile and verify actual playback.
This background-video encoder deliberately removes audio; do not use it for narrated
or customer-uploaded videos. Private attachment previews use metadata-only loading.

New source uploads are not automatically transcoded by the browser or CDN. Run this
command as part of adding each public video. Never overwrite hash-named files.
After deployment, verify a GET with `Range: bytes=0-1023` returns 206 and check
cache headers; do not assume a successful local build proves CDN delivery.
