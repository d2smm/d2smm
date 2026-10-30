# Development

## Build

Requirements: CMake 3.24+, a C++20 compiler, and OpenSSL 3 development files. The JSON dependency is vendored and pinned. No Node, npm, Python, or network download is needed during the build.

macOS:

```sh
brew install cmake openssl@3
cmake -S . -B build -DOPENSSL_ROOT_DIR="$(brew --prefix openssl@3)"
cmake --build build --target d2smm-build
```

Linux (Debian/Ubuntu packages):

```sh
sudo apt-get install cmake g++ libssl-dev
cmake -S . -B build
cmake --build build --target d2smm-build
```

Then:

```sh
ctest --test-dir build -R build-tool --output-on-failure
./build/d2smm-build --source . --output dist
```

The tool writes `dist/bootstrap.js`, its checksum descriptor, a hosted bookmarklet, an unpacked extension, and `dist/site/`. It refuses unknown populated output directories and any in-repository destination outside `dist/`. Rebuilding an owned output preserves earlier versioned release paths; use a new empty output for clean-distribution checks.

`VERSION` controls the generated manager and extension versions. The builder substitutes the manager's version declaration; update that source declaration and the changelog alongside a release for readable source history. The loot package's version is independent.

## Test without risking a real save

Use a separate browser profile or Incognito context with a disposable game. Do not import a player's only save. The live game must remain the actual upstream origin because the adapters intentionally enforce it.

Fresh profiles may first reach `/play/setup.html`. Complete that normal file-source choice (the available Hosted Files option or your own game files), then continue past the native intro and click Play. Wait for the actual camp state; a loaded setup page or a fixed short delay is not game readiness.

For a local candidate, build the optional unpacked extension and load `dist/extension/` using Chrome's **Load unpacked** control in your test profile. This is a development loader, not a Chrome Web Store listing. A previously selected newer runtime can supersede an older local candidate; start with clean isolated mod storage when testing that boundary.

On macOS, an optional native CDP transport is available:

```sh
cmake --build build --target d2smm-cdp
./build/d2smm-cdp --version
```

It accepts one CDP command or up to 32 sequential commands from standard input and an exact loopback WebSocket target as its argument. It neither launches nor discovers a browser. Use only a browser/profile you own for testing, with remote debugging explicitly enabled. Verify the context and exact target before sending commands. Never point a mutation fixture at a player's session.

For the installer website, the build also emits `dist/site-preview-command.json`. Send it through that transport to an owned test tab already on `https://d2s.arken.gg/`. It replaces that tab's document with the candidate site and embedded assets; it refuses other origins. This is a preview only. Final acceptance must use the published page.

## Existing browser checks

[`tests/browser/`](../tests/browser/) contains browser-executed checks, not Node tests. Evaluate them in the isolated page after the candidate loads; retain the returned `passed` result and any failing checks.

| Check | Prerequisite / effect |
| --- | --- |
| `loot-guard-checks.js` | Candidate rule engine loaded; exercises elite matches and rejects |
| `loot-guard-alert-checks.js` | Candidate rule/alert globals; controlled time and playback |
| `attention-checks.js` | Attention module loaded; controlled registry lifetime |
| `rules-json-checks.js` | Official Loot Guard enabled; changes **mod** rules, restores official rules, and verifies native save bytes unchanged |
| `game-exit-checks.js` | Defines `checkGameExit(source)`; pass the text of `src/game/game-menu.js`. Controlled native-action receivers verify cancellation and teardown |
| `builtin-mod-hooks.js` | Native builder emits `builtin-mod-hooks-command.json`; actual core/integration in a detached realm checks independent activation and retained protections |
| `builtin-mod-ui.js` | Native builder emits `builtin-mod-ui-command.json`; isolated real game checks the cards, persisted settings, gem state, and unchanged native save/metadata; leaves built-ins off for restart verification |

Some checks refer to the current official package version. Update their expectation deliberately when releasing a new package; do not weaken failed assertions to accommodate a bug.

## Real interaction proof

### Standard gallery seeds

[`tests/fixtures/gallery.json`](../tests/fixtures/gallery.json) is the shared source for two level-99 Amazons (Windrunner and Stormspear), an elite **Beast Loop** rare ring, and the native menu capture coordinates. These are synthetic examples, not a player's exported save. Beast Loop's rolls exercise `ring-caster`; they do not claim to reproduce a historical ring's exact rolls or value. Keep the common-item testing rule off.

The build emits three development-only commands outside `dist/site/`:

- `gallery-load-command.json` loads the candidate manager and checks native save bytes are unchanged.
- `gallery-fixtures-command.json` installs [`gallery-scenes.js`](../tests/browser/gallery-scenes.js).
- `gallery-menu-command.json` opens the real pause menu from camp, highlights MODS, and captures its crop at 2500×1400. The screenshot is response ID 8. Inspect the image if upstream menu geometry changes.

Create a **new** context with `Target.createBrowserContext`, then an `about:blank` target in that context. Verify it with `Target.getBrowserContexts` and `Target.getTargetInfo`: its context must be the newly returned non-default ID. Retain that receipt before navigating the exact target to the upstream game. Set `globalThis.__D2GalleryLease = {contextId, targetId}` in that verified page. The marker is a prerequisite, not a substitute for host-side context verification. Never use an existing player target or import a backup.

Send the load command through `d2smm-cdp`, click Play normally, and enable the official Loot Guard package in this disposable manager. Then send the fixture command. Evaluate `D2GalleryScenes.characters()` for the real chooser renderer, or `await D2GalleryScenes.loot()` for the real matching/notification path. Hover the bottom gem normally to reveal its log. `D2GalleryScenes.checkLootLifecycle()` verifies pickup resolution and disabled-filter clearing; it leaves the unresolved example visible for capture.

The character fixture records view actions without forwarding them to save operations. The loot fixture uses the shipped rules and adapter in a detached realm, publishing through its own attention source; it never inserts an item into the real world or inventory. These are UI and adapter proofs, **not** evidence of native hero creation or a natural loot drop. `D2GalleryScenes.status()` reports recorded actions, checks, and unchanged save state. Call `D2GalleryScenes.clear()` between scenes and `D2GalleryScenes.dispose()` at completion, then close only the test context created for this run.

Keep the accepted Guardian Angel hover image, `site/assets/gallery/item-details.webp`, unchanged when refreshing these three examples. Crop through `Page.captureScreenshot` and encode with a native image tool such as `cwebp`; do not redraw the interface or add proof labels.

For game-access changes, exercise the actual menu, close the manager, and verify that WASD moves the player. Check the bottom gem's placement, its upward log, hiding it, and the title screen. Start the manager while the native pause menu is already open and verify MODS appears above SAVE AND EXIT. An update test should preserve native confirmation and cancellation and activate only after reaching the title.

Use normal game controls, process-native captures, and targeted state reads. Do not add TEST COPY or FPS overlays to product UI. Report controlled boundary checks separately from actual gameplay proof. A screenshot of an idle menu does not prove save or item conservation.

New tests should cover a concrete risk; do not duplicate the implementation or build a new framework for a small visual fix.

## Promo production

[`media/promo/edit.json`](../media/promo/edit.json) owns scene order, timing, crops and captions. [`shots.json`](../media/promo/shots.json) owns the timed browser actions; [`presentation.js`](../media/promo/presentation.js) supplies editorial pointers, simulated browser chrome and the explicitly simulated drop flash. None of these files is included in the shipped manager.

Build the native media tools with `cmake --build build --target d2smm-cdp d2smm-media`. Encoding requires FFmpeg with `drawtext`, invoked through the configured native `cx` wrapper.

`d2smm-cdp --record WEBSOCKET RECIPE NEW_OUTPUT` records process-native screencast frames and their timing. A `d2smm.capture.v1` recipe requires the verified `browserContextId`, `targetId`, a duration of 500–30000 milliseconds, and timed `actions` containing CDP commands. Its optional `prepare` commands run before recording. Capture uses 2500×1400 by default and rejects a mismatched compositor size. Never substitute a player's target for the disposable context. Recording activates that exact owned tab before fixing its viewport.

Encode each approved capture into a reusable clip:

```sh
build/d2smm-media --encode /absolute/capture-directory /absolute/media-root/clips/site.mp4
```

The edit expects `site.mp4`, `install.mp4`, `menu.mp4`, `characters.mp4` and `loot.mp4` in `clips/`, plus the retained repository artwork. To revise captions, timing or framing without recapturing those clips, edit the JSON and render to a new export name:

```sh
build/d2smm-media --render "$PWD" /absolute/media-root /absolute/media-root/exports/D2SMM-Promo-v2.mp4
```

Retain the capture frames and receipts, encoded clips, per-scene masters, original synthesized soundtrack, edit receipt and final export outside temporary cleanup. The initial production is under `.local/promo-20261030/`; generated media stays ignored. Preserve previously accepted exports when revising the film.

The browser bookmarks gesture is composited; it does not create real browser bookmarks. Character and loot scenes use the shared synthetic fixtures, including `D2GalleryScenes.resolveLoot()` to clear the real attention log after simulated pickup. Loadout stills are the accepted gallery images. Do not describe this production as natural gameplay, native save-switch proof, or an already published release. Local commits do not authorize uploading the film or deploying the site.
