# Gear Loadouts

Three outfits per class, independent of which hero is active.

**Equip** tries a saved outfit. **Make default** assigns it to the current hero. **Save for character** saves an outfit and makes it that hero's default. Save changed equipment before switching heroes.

Each real item exists once. The same ring can be referenced by multiple outfits without being copied. Only the ten worn slots are managed; charms, mercenary gear, and ordinary inventory are outside the loadout.

## Storage

The mod reserves an **empty personal stash** explicitly. Its two 10×5 halves hold inactive equipment; the third outfit can be worn. Shared stash tabs remain available for ordinary use. Referenced real items can be retrieved from shared tabs without moving unrelated items.

Missing items, insufficient room, an occupied cursor, or an unsettled run block the affected operation. Reserved gear is protected from selling or discarding. The Personal tab opens loadout UI while reserved. Item previews include native hover details and current item location.

Export a game backup before opting in. Do not delete mod records or clear browser data as a recovery strategy for a failed item operation; retain the current save and the last known-good backup.

## Source

Loadouts and character switching share the [Characters core](../characters/runtime/characters-core.js), [controller](../characters/runtime/characters-controller.js), and [store](../characters/runtime/characters-store.js). Presentation lives in the [character/gear view](../characters/runtime/characters-view.js) and [equipment view](../characters/runtime/equipment-view.js).

This directory documents the distinct feature without duplicating the transaction implementation.
