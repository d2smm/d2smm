# Terrorized

Terror enhancements and quality of life.

**RERUN** is the first option after completing a Terror. It starts the tier and act you just finished, even when a higher tier has unlocked. Terror 25, Act II stays Terror 25, Act II. Every rerun requires a player action.

The game still handles eligibility, the retained hero, modifier rolls, rewards, progression and starting the run. Modifiers roll normally; RERUN does not advance the tier or repeat the victory payout. Charsi's Wares and End The Run stay available.

Turn Terrorized on or off in Mod Manager.

**Gather Run Drops**, under **Options**, is on by default; existing saved preferences are preserved. When a defeated Terror boss's exit portal appears, available floor drops move into an evenly spaced ring around your character over 1.5 seconds. The ring scales with the game view. Pick items up normally.

Unopened chests stay in place unless **Gather Chests** is enabled. That separate option is off by default and also works without Gather Run Drops. Items already dropped from a chest count as ordinary floor loot.

The native ground-placement helper keeps resting positions reachable, so obstacles can shift individual spots. Gold and experience already being collected keep their normal attraction. Discarded gear and items you're already reaching for stay under native control. Pauses and skill choices hold the animation; switching it off stops movement where it is. It runs once per portal, without creating items or changing their stats.

RERUN supports completed standard Terror acts. Training, debug runs, an unfinished native replay, alternate native retired-hero contexts, and Cow Terror are excluded. The game's current replay format cannot retain the Cow-map flag safely.

## Implementation

- [`core/`](core/) owns eligibility, the exact tier/act, single-use offer tickets, and gathering geometry/timing in browser C++/Wasm under `d2smm::terrorized`.
- [`runtime/native.js`](runtime/native.js) binds the loaded game's replay operation without reexecuting its module or replacing global randomness.
- [`runtime/terrorized.js`](runtime/terrorized.js) connects the native completion menu and manager preference to that core.
- [`runtime/gather.js`](runtime/gather.js) connects native portal and pickup lifetimes to the core; [`gather-native.js`](runtime/gather-native.js) retains the game's sprite and label movement.
- [`generated/`](generated/) contains the source-verified Wasm artifact used by the self-contained loader.

Compatibility follows the loaded native contract, not a game-build allowlist. An unsupported contract leaves the native completion menu intact. Tests use isolated game data; never point mutation fixtures at a player's save.
