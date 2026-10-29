# Characters

Keep up to **three heroes per class** using the game's native archived-hero system. New character creation requires the banked hero to reach **level 99**, preserving the intended golden-glow progression.

Click a campfire class with multiple managed heroes to choose one. A level-99 hero opens the same chooser with **New character** at the bottom. A lower-level single hero keeps the ordinary game selection.

The chooser follows the clicked class. It contains no class changer or gear panel. Selecting the currently active hero uses native selection without replacing progress or applying another outfit. Switching to a different managed hero equips its default loadout.

Management is opt-in and currently softcore only. Active or resumable runs are not abandoned. Export a game backup before enabling save-affecting management.

## Source

- [`runtime/characters.js`](runtime/characters.js): native-game bridge and lifecycle.
- [`runtime/characters-core.js`](runtime/characters-core.js): character/loadout decisions and item-conservation checks.
- [`runtime/characters-controller.js`](runtime/characters-controller.js): coherent operations.
- [`runtime/characters-store.js`](runtime/characters-store.js): mod records and transaction persistence.
- [`runtime/characters-view.js`](runtime/characters-view.js): chooser and gear presentation.
- [`runtime/equipment-view.js`](runtime/equipment-view.js): item slots and details.

[Gear Loadouts](../gear-loadouts/README.md) shares this transaction owner. Do not create a competing save writer for a new character feature.
