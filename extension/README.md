# Optional Chrome loader

The default install is the bookmark at [d2s.arken.gg](https://d2s.arken.gg/). This extension starts the same manager automatically on the game page.

Build the project, open Chrome's extensions page, enable Developer mode, and choose **Load unpacked → dist/extension/**. Use a separate test profile when developing. The source directory alone is incomplete; the native build adds the packaged bootstrap.

There is no Chrome Web Store listing in this repository. The loader requests scripting, active-tab access, and access to the D2 Survivors origin. It does not maintain another copy of mod settings: those remain in the game page's IndexedDB.
