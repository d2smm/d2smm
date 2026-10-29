# Changelog

## 2.9.1

- The gem fills the bottom bar's circular mount and scales with the native HUD instead of remaining a fixed screen size.
- Its white attention glow scales with the gem; the event list keeps readable text and opens above it.
- When the native mount is absent, the gem stays hidden. M and the MODS menu remain available.

## 2.9.0

- Closing Mod Manager or Characters returns keyboard focus to the native canvas. Another open dialog retains focus; a paused game remains paused.
- The gem appears during gameplay at the bottom center, over Open Mini Panel. Its attention list opens upward. Hiding the gem restores the original control.
- MODS is inserted above SAVE AND EXIT even when the manager starts with the pause menu already open.
- During play, **Save and Exit to update** invokes the native exit action. Native warnings and cancellation remain intact; activation waits for the title screen.
- Initial contributor repository with native build tooling, mod source directories, and documentation.

## 2.8.0

- Loot Guard JSON export includes editable conditions and thresholds.
- JSON imports are validated, preserve toggles, and remain marked as edited.
- Native game-menu integration and manager-first updates.

## 2.7.0

- Shared attention API, bright white gem notifications, and a scrollable event list.
- Unresolved matching loot remains visible until pickup or removal; ordinary notices expire after one minute.

## Earlier work

Characters, Gear Loadouts, the bookmark installer, optional extension loader, and the strict elite Loot Guard catalog predate this public source handoff. This file is a concise feature history, not a reconstruction of every historical release.
