# Writing loot rules

The easiest starting point is **Loot Guard → Rules → Export JSON**. The export expands preset IDs into editable conditions. Change a threshold and its displayed `reason`, then use **Import JSON**. Invalid files leave the accepted installation intact.

An example package is in [`examples/elite-caster-ring.json`](../examples/elite-caster-ring.json). It keeps the `loot-guard` ID so it can replace the installed rules through the normal import flow. **It replaces the whole rule set with one example rule**, so export your current rules first.

```json
{
  "id": "example-blue-caster",
  "reason": "Magic ring with 10 FCR and 120 mana",
  "when": {
    "all": [
      {"field": "type", "op": "eq", "value": "ring"},
      {"field": "rarity", "op": "eq", "value": "magic"},
      {"stat": "fcr", "op": "gte", "value": 10},
      {"stat": "mana", "op": "gte", "value": 120}
    ]
  }
}
```

## Conditions

| Shape | Meaning |
| --- | --- |
| `{"all": [...]}` | Every child matches |
| `{"any": [...]}` | At least one child matches |
| `{"atLeast": 2, "conditions": [...]}` | At least the specified number match |
| `{"stat": "fcr", "op": "gte", "value": 20}` | Compare an explicit item modifier |
| `{"field": "rarity", "op": "eq", "value": "rare"}` | Compare an item field |
| `{"metric": "allResist", "op": "gte", "value": 30}` | Compare a derived metric |

Numeric operators: `gte`, `gt`, `lte`, `eq`. Fields `type`, `rarity`, `base`, `name`, and `kind` support `eq` only. Names are exact canonical game names. `kind` comes from the base-category table; do not invent categories from the displayed name.

Rules target **magic and rare** items unless they declare `rarities`, such as `"rarities": ["unique"]` or `"rarities": ["runeword"]`. A named rule also uses an exact `name` condition, for example `{"field":"name","op":"eq","value":"Enigma"}`. Existing rules therefore do not start matching unrelated uniques or runewords. Implicit base modifiers are excluded, so base weapon damage is not enhanced damage. Rules are not an LLD or required-level classifier. Different matching rules are alternatives: any selected rule may match.

The defaults include War Traveler only at **50 MF / 190 enhanced defense / 10 thorns**, and Exile, Infinity, Doom, Breath of the Dying, Grief, Last Wish, Death, Enigma, Phoenix, Dream, Pride and Faith at any roll. Export JSON to edit these conditions or add another named item; `thorns` is an admitted stat.

The validator allows at most 100 `extraRules`, 12 children per group, condition depth 6, and a 256 KiB package. It rejects unknown keys and unsupported stats. [`packages.js`](../src/manager/packages.js) is the exact schema/allowlist authority; [`rule-catalog.js`](../mods/loot-guard/runtime/rule-catalog.js) contains complete production examples.

## Useful metrics

| Metric | Meaning |
| --- | --- |
| `attributes` | Strength + Dexterity |
| `resistTotal` / `resistCount` | Sum of four resistances / number at least 30 |
| `allResist` / `bestResist` | Lowest / highest of the four resistances |
| `elementalTotal` / `elementalCount` | Same as above, excluding poison |
| `classMax` / `treeMax` | Highest class / tree bonus, including all-skills |
| `combined` | Highest related class + tree combination, including all-skills |
| `skillMax` | Highest specific-skill modifier |
| `assassinSkills` | Assassin class + highest Assassin tree bonus |
| `javelinSkills` / `bowSkills` | Amazon class + the relevant tree bonus |

The last three metrics do not add all-skills. Use the actual modifier names exposed by the game and admitted by the validator, not D2R NIP syntax. This project does not execute NIP code.

`toggle: "testFcr"` makes a rule depend on **[Testing] Match on common items**. That switch is off by default. The official testing rule accepts magic items with 10%+ FCR solely to confirm highlighting and alerts; it is not part of the elite policy.

Official thresholds: [RULES.txt](../mods/loot-guard/RULES.txt). Research credits: [SOURCES.txt](../mods/loot-guard/SOURCES.txt).
