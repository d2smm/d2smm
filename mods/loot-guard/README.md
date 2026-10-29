# Loot Guard

Exceptional magic and rare drops, across every class.

- `*** Item Name ***` highlights.
- Optional protection from native hiding and auto-sell.
- Native Baal laugh on new matches, respecting mute and volume.
- White attention gem while a matching floor item remains unresolved.
- Import/export JSON with editable thresholds.

The official package has **48 permanent elite rules** plus one optional common-item test. Testing is off by default. Uniques, sets, and normal items are outside this matcher; native filtering still handles them.

Read [every threshold](RULES.txt), [research credits](SOURCES.txt), or the [JSON guide](../../docs/loot-rules.md). The catalog is deliberately conservative; it is not a guarantee that every useful upgrade will match or that a native despawn limit cannot remove a drop.

## Source

- [`mod.json`](mod.json): official package and defaults.
- [`runtime/rule-catalog.js`](runtime/rule-catalog.js): editable condition definitions.
- [`runtime/rules.js`](runtime/rules.js): item facts and matching.
- [`runtime/adapter.js`](runtime/adapter.js): native label/filter integration.
- [`runtime/alerts.js`](runtime/alerts.js): drop notification lifetime and sound requests.
- [`runtime/base-kinds.js`](runtime/base-kinds.js): factual item categories.

Rules were informed by public D2 pickit concepts and adapted to D2 Survivors' actual modifiers. No bot integration, NIP interpreter, or automated pickup is included.
