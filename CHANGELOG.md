# Changelog

## 2.10.1

- Add optional **Gather Run Drops** under Terrorized → Options. A defeated Terror boss's exit portal gathers available floor loot into a view-scaled ring over 1.5 seconds; pickup stays native.
- Preserve drop identities, item stats, labels and normal gold/experience attraction. Pause and skill-choice screens hold the animation; disabling stops it without moving items back.
- Namespace the native mod implementation under `d2smm::terrorized`, including its math bindings.

## 2.10.0

- Add Terrorized, with RERUN first in the native Terror completion menu. It replays the completed tier and act, even after a higher tier unlocks, while retaining native modifier rolls and progression checks.
- Give Terrorized its own Enabled control. Debug, training, unfinished and unsupported Cow replays keep the native menu unchanged.
- Compress the embedded heading font losslessly to preserve the existing loader size limit.

## 2.9.10

- Use a subtle dark gray scrollbar thumb on a black track in Mod Manager.

## 2.9.9

- Reduce the Mod Manager dialog to 75% size and keep its scrolling area within the window. The gem continues to follow the game's HUD scale.

## 2.9.8

- List Characters and Gear Loadouts alongside Loot Guard, with independent persistent switches and Open actions.
- Use the same Enabled control for all three mods; keep Loot Guard's sound, testing, and protection settings under Options, separate from Rules.
- Disabling a built-in stops new feature actions while retaining saved heroes, loadouts, reserved-gear protections, and in-flight transactions.
- The gem is purple when any mod is enabled and blue when all are off.
- Remove the README tagline.

## 2.9.7

- Give both title lines the same gold gradient and shorten the integrity statement, keeping its first sentence on one line on desktop.
- Give the title gem a black background and label the main button “DRAG THIS TO BOOKMARK BAR,” removing the separate instruction above it. The saved bookmark remains D2SMM.
- Fade the bookmark guide in over 200 ms on hover or click, and replace the README banner with the supplied site artwork.

## 2.9.6

- Add a solid black circular backing to the blue-gem favicon, retaining the original artwork and transparent corners.

## 2.9.5

- Reuse the blue gem as the installer site's favicon.

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
