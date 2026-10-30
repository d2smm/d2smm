# Architecture

## One page, one manager

The bookmark or optional extension starts a bundled browser runtime on `https://d2survivors.lol/play/`. The bundle is assembled in the order declared by [`src/bundle.json`](../src/bundle.json). The manager owns installation, settings, UI, updates, and attention sources. Mods use common game adapters instead of each rediscovering unrelated globals.

| Owner | Responsibility |
| --- | --- |
| [`src/manager`](../src/manager/) | Mod records, update selection, manager presentation and lifecycle |
| [`src/game/game-contract.js`](../src/game/game-contract.js) | Discover and validate the loaded game's native contract |
| [`src/game/game-menu.js`](../src/game/game-menu.js) | Native MODS row and player-requested exit flow |
| [`src/game/game-ui.js`](../src/game/game-ui.js) | Session presentation, mini-panel anchor, canvas focus |
| [`mods/loot-guard/runtime`](../mods/loot-guard/runtime/) | Item facts, rules, label/filter hooks, and alert requests |
| [`mods/characters/runtime`](../mods/characters/runtime/) | Archived heroes, loadouts, item conservation, persistence and equipment UI |
| [`mods/terrorized`](../mods/terrorized/) | Native Terror replay UI; browser C++ policy owns exact tier/act selection and one-use admission |

## Native-game boundary

Compatibility is discovered from the loaded game modules and verified method shapes, not a hardcoded build-number allowlist. Acorn parses the actual JavaScript source. The adapter preserves native functions and restores only hooks it still owns during disposal.

Ambiguous or unsupported contracts disable the affected operation. A new game build is not permission to guess at a save structure, evaluate an entire unrelated module again, or silently remove native confirmations. A discovered hook is an internal adapter capability, not a stable public mod API.

## Persistence

The manager's IndexedDB stores package text, checksums, settings, preferences, and runtime selection. Character management has its own records and transaction boundary. Native game storage remains the authority for actual heroes and items; mod metadata references real identities.

Characters and Gear Loadouts share an implementation because a hero switch and its default equipment must remain coherent. They remain separate concepts and UI screens. Shared stash is not a private mod database. Inactive gear uses explicitly reserved personal storage, while each real item exists once.

## Packages and executable integrations

The current package format admits declarative loot conditions with bounded depth and size. It does not run user-supplied code. One loot-rule package is active at a time. A different package ID cannot replace it without explicit removal.

Executable mods are compiled into the reviewed manager source set. A new capability requires a clear owner, validation, teardown, tests proportional to its risk, and a manager release. There is no general third-party JavaScript plugin sandbox in this release.

## Lifecycle

Every installed hook, observer, timer, channel, dialog and attention source needs a matching teardown. Updates prepare and verify the candidate before disposing the current manager, and activate only at the title boundary. Cancellation preserves the old runtime. Late callbacks must not revive disposed UI or override another owner's method.

The existing manager and integrations use browser JavaScript bindings, with native C++ build tooling and an optional macOS Objective-C++ CDP transport. Terrorized's new selection and admission policy runs as a small, self-contained C++ WebAssembly module in the page. Its JavaScript adapter delegates the actual replay and save operations to the loaded game. This does not replace the game's engine or migrate unrelated mod logic.
