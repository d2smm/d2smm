# Changelog

## 2.13.7

- Reduce Mod Manager and build details by 50% on Retina-density displays, preserving the existing scale on standard-density monitors.

## 2.13.6

- Audit build attributes against trade notation: MAX/MIN, AR, LL/ML, FBR/ICB, CB/DS/OW, DR/MDR, PLR, and kill bonuses.
- Use familiar item abbreviations including JMOD, HOTO, CTA, SOJ, SHAKO, and ARACH; retain full names on hover and for accessibility.

## 2.13.5

- Use uppercase trade shorthand, `5@` for all resistances, and value-first resistance labels such as `30% LR`.
- Show actual variable rolls beneath smaller perfection percentages; widen the item-type column.

## 2.13.4

- Show base item types in the equipment's left column without repeating them beneath item names.
- Add a divider after MF and remove extra dividers below skill groups, mercenary details, and the Charms heading.

## 2.13.3

- Show the game's combined charm bonuses beside Charms; remove redundant SC/LC/GC labels while keeping item names accessible.

## 2.13.2

- Condense build details into a single stats/resists bar, equipment rows, native skill icons, and mercenary details beneath Skills.
- Shorten numeric stats from 1,000 upward: 1K, 2.5K, 51K, and 0.1M at 100,000.
- Remove skill descriptions and unique/set/runeword base types; retain chosen options and use standard D2 shorthand for inline magic/rare stats.
- Tighten and center charm rows, separate the four attributes, and place mercenary skill choices before Life/Dmg. The standard build fixture covers all 20 small charms.

## 2.13.1

- Build details reuses the shared RPG modal frame, heading font, and close control with a pure black interior.
- Improve spacing, text contrast, and narrow-screen readability; preserve the existing build information and controls.

## 2.13.0

- Press **U** to open Gear Loadouts; text editing and the game's L shortcut are preserved.
- Reduce the loadout dialog by 25%.
- Add a read-only build-details button beside Equip, with character stats, Terror progress, full item descriptions, charms, mercenary details, and chosen skills in a compact plain layout.
- Show native-roll perfection percentages for uniques, sets, and runewords; retain full magic and rare item stats. The browser C++ core averages independent variable rolls without weighting fixed or duplicated display properties.

## 2.12.0

- Loot Guard 1.5.0 adds perfect War Traveler (50 MF, 190 enhanced defense, 10 thorns) and Exile, Infinity, Doom, Breath of the Dying, Grief, Last Wish, Death, Enigma, Phoenix, Dream, Pride and Faith at any roll to the defaults.
- Support exact item-name conditions and explicit rarity scopes in editable rules. Existing magic/rare rules retain their scope.
- Move loot matching and derived item facts into the browser C++ core; rejected rule imports leave the accepted program intact.

## 2.11.1

- Enable **Gather Run Drops** by default while preserving saved preferences. Unopened chests stay in place.
- Add a separate **Gather Chests** option, off by default. Each category can be enabled independently.
- Save a focused, repeatable gathering-settings check and add the gathering demonstration to the promo edit.

## 2.11.0

- Add **QoL**, with automatic placement of newly picked-up charms when the native Charm grid has room. Native restrictions, item identities and stat updates are preserved.
- Add reusable, persistent unread control badges. Charms shows a small red dot until opened; marks are scoped by class and shared across contributing mods.

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
