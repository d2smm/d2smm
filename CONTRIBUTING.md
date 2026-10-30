# Contribute to D2SMM

Make the player's experience better without playing the game for them.

## Choose a path

**Loot rules:** start with Loot Guard's **Rules → Export JSON**. Edit an exported condition, keep its reason accurate, and import it into an isolated test session. Submit the rule with examples that should match and examples that should not. The official catalog is deliberately strict: ordinary upgrades, one good resistance, or a convenient leveling item are not elite.

**New mods:** open a [mod proposal](https://github.com/contextlimit/d2smm/issues/new?template=mod-proposal.yml) before a large implementation. Explain the player action, the game hooks it needs, where its state lives, how it unloads, and whether it touches saves. Small fixes can go straight to a pull request.

**UI and compatibility:** fix the owning module, keep controls concise, and include a screenshot or short clip of the actual interaction. A native game update should disable an unverified capability rather than make the adapter guess.

## What belongs here

- Information, accessibility, presentation, and player-directed organization.
- Native game actions with their original requirements and confirmations intact.
- Features that clean up their hooks, listeners, notices, and resources when disabled.
- Small, reviewable changes with honest evidence.

We do not accept automated combat, farming, pickup loops, progression bypasses, or bypasses of native save / eligibility checks. No unsolicited network uploads, telemetry, or access to unrelated sites.

## Submitting your mod

1. Fork the repository and create a descriptive branch.
2. Read [architecture](docs/architecture.md), [API](docs/api.md), and [development](docs/development.md).
3. Put mod-owned code and a short README in `mods/<mod-id>/`. Shared game hooks belong in `src/game/`; manager-wide UI belongs in `src/manager/`.
4. Use the existing validated JSON format for loot packages. Executable features require source integration and review; the file installer does not execute arbitrary code.
5. Build, exercise the feature in a separate test profile, and include the exact game / manager versions. Back up test saves first. Never commit or upload a player's save, profile, or credentials.
6. Open a focused pull request with the problem, result, screenshots where useful, verification, and remaining limitations. Update the mod catalog and relevant docs.

Do not commit `dist/`, `build/`, downloaded game bundles, local recordings, or deployment state. Update source; let the build produce distributions. Keep third-party licenses with dependencies and explain new dependencies before adding them.

## Working with Claude or ChatGPT

AI-assisted contributions are welcome. Give the assistant a narrow task and the relevant files; ask it to reason from the current implementation rather than remembered Diablo mechanics.

> Read CONTRIBUTING.md, docs/architecture.md, and the relevant mod README. Help me implement [specific improvement]. Preserve the game's integrity and native confirmations. Do not add automated play or upload saves. Keep the change small, explain which hooks and state it touches, then help me test the real interaction and document any limitation.

Review every change. Check behavior yourself, credit material sources, and report what you actually tested. A generated explanation or a passing syntax check is not proof that items and saves are safe.

## Review expectations

The maintainer checks scope, readable ownership, lifecycle cleanup, native-game compatibility, data integrity, and the actual user experience. New persistence or item-moving code needs focused failure-path evidence. Ordinary visual changes do not need a new testing framework.

Be kind, be specific, and leave the camp better than you found it.
