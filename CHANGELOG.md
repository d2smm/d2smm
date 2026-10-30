# Changelog

## 2.9.4

- Added cropped gallery scenes for two level-99 Amazons, an unresolved Beast Loop loot alert, and the native menu with MODS selected. Kept the Guardian Angel hover capture.
- Added reusable synthetic gallery seeds and native-build-generated capture commands. Fixtures use the shipped UI and loot adapter without writing native saves or inserting items into the real world.
- Preserve every screenshot's full crop in the slideshow and simplify the integrity statement.
- Native CDP command batches now stop on JavaScript exceptions, so a failed fixture guard cannot fall through to later input commands.

## 2.9.3

- Applied the requested four-stop gold gradient to the installer site's D2S text.
- Trimmed the bottom three pixels of the main button artwork while preserving its drag target, glow, and keyboard focus outline.

## 2.9.2

- Lowered the bottom gem slightly, with the offset scaling alongside the HUD.
- Stronger black drop shadow for both enabled and disabled gem artwork.
- Reused the gem as the O in the installer site's antique-gold title. It starts blue; clicking only toggles blue and purple.

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
