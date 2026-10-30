# Terrorized

Terror enhancements and quality of life.

**RERUN** is the first option after completing a Terror. It starts the tier and act you just finished, even when a higher tier has unlocked. Terror 25, Act II stays Terror 25, Act II. Every rerun requires a player action.

The game still handles eligibility, the retained hero, modifier rolls, rewards, progression and starting the run. Modifiers roll normally; RERUN does not advance the tier or repeat the victory payout. Charsi's Wares and End The Run stay available.

Turn Terrorized on or off in Mod Manager. There is no extra panel to configure.

The initial version supports completed standard Terror acts. Training, debug runs, an unfinished native replay, alternate native retired-hero contexts, and Cow Terror are excluded. The game's current replay format cannot retain the Cow-map flag safely.

## Implementation

- [`core/`](core/) owns eligibility, the exact tier/act and single-use offer tickets in C++.
- [`runtime/native.js`](runtime/native.js) binds the loaded game's replay operation without reexecuting its module or replacing global randomness.
- [`runtime/terrorized.js`](runtime/terrorized.js) connects the native completion menu and manager preference to that core.
- [`generated/`](generated/) contains the source-verified Wasm artifact used by the self-contained loader.

Compatibility follows the loaded native contract, not a game-build allowlist. An unsupported contract leaves the native completion menu intact. Tests use isolated game data; never point mutation fixtures at a player's save.
