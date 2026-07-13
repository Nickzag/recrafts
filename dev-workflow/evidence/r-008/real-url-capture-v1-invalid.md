# Invalid Capture Diagnostic

The first R-008 adapter run declared `1440x900` while its PNG was `1280x720`. Root cause: `Browser.newPage` received the unsupported `viewportSize` option instead of `viewport`, so Chromium retained its default viewport. This run is retained as negative diagnostic evidence and is excluded from qualification. The adapter now validates PNG dimensions against the declared viewport before returning `complete`; the corrected run is `real-url-capture-v2`.
