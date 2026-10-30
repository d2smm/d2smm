# QoL

Small conveniences that preserve the game's rules.

Newly picked-up charms move into **Charms** when a fitting space is available. The game handles the transfer, unique-charm restrictions, saving and stat updates. If it cannot place the charm, it stays in the normal inventory. A full normal inventory still uses the game's usual pickup refusal.

A small red dot on the native Charms button means its contents changed. Opening Charms clears the dot. Unread marks survive manager restarts and remain separate for each class. Turning QoL off stops future automatic transfers without undoing existing placements.

- [`core/`](core/) — C++ admission and item-conservation checks in `d2smm::qol`.
- [`runtime/native.js`](runtime/native.js) — bindings to the loaded game's charm operations.
- [`runtime/qol.js`](runtime/qol.js) — pickup and lifecycle integration.
- [Shared badge API](../../docs/api.md#unread-control-badges) — reusable by other mods.
