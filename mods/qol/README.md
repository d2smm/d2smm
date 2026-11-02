# QoL

Small conveniences that preserve the game's rules.

Ordinary monster collisions and summons no longer shove monsters sideways. Approaching monsters give way to the front of the pack; melee monsters hold within native attack reach and pursue again when the target moves away. Attacks, special movement and intentional skill knockback remain native.

**Options → Hide hit stars** hides the large critical-strike flash. It is off by default and does not change critical damage or other effects.

Monster status colors hold for at least three seconds between changes and switch instantly; damage and status durations remain native. Turning QoL off restores native behavior.

Newly picked-up charms move into **Charms** when a fitting space is available. The game handles the transfer, unique-charm restrictions, saving and stat updates. If it cannot place the charm, it stays in the normal inventory. A full normal inventory still uses the game's usual pickup refusal.

A small red dot on the native Charms button means its contents changed. Opening Charms clears the dot. Unread marks survive manager restarts and remain separate for each class. Turning QoL off stops future automatic transfers without undoing existing placements.

- [`core/`](core/) — C++ admission and item-conservation checks in `d2smm::qol`.
- [`runtime/native.js`](runtime/native.js) — bindings to the loaded game's charm operations.
- [`runtime/qol.js`](runtime/qol.js) — pickup and lifecycle integration.
- [Shared badge API](../../docs/api.md#unread-control-badges) — reusable by other mods.
