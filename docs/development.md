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

Some checks refer to the current official package version. Update their expectation deliberately when releasing a new package; do not weaken failed assertions to accommodate a bug.

## Real interaction proof

For game-access changes, exercise the actual menu, close the manager, and verify that WASD moves the player. Check the bottom gem's placement, its upward log, hiding it, and the title screen. Start the manager while the native pause menu is already open and verify MODS appears above SAVE AND EXIT. An update test should preserve native confirmation and cancellation and activate only after reaching the title.

Use normal game controls, process-native captures, and targeted state reads. Do not add TEST COPY or FPS overlays to product UI. Report controlled boundary checks separately from actual gameplay proof. A screenshot of an idle menu does not prove save or item conservation.

New tests should cover a concrete risk; do not duplicate the implementation or build a new framework for a small visual fix.
