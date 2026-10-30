# Mod integration API

This is a small source-integration surface, not a promise that every internal global is stable. Prefer these entry points over private game objects. See [architecture](architecture.md) before adding hooks.

## Manager

```js
await D2Mods.ready;
D2Mods.show();
D2Mods.close();
const status = D2Mods.status();
const json = D2Mods.exportText(); // null when no loot package is installed
```

For user-directed actions, `configure({enabled, sound, testFcr, protectMatches})` accepts a partial settings change; `configurePreferences({showGem})` changes gem visibility and `configurePreferences({terrorizedGatherDrops})` changes the optional gathering feature. Both return promises and persist through the manager's queue. `installFile(file)` validates a JSON file before installation. Do not invoke these actions silently on behalf of another mod.

`configureBuiltin(id, enabled)` accepts `characters`, `gear-loadouts`, `terrorized`, and `qol`. `status().builtinMods` reports their IDs, enabled states, versions, and any concise availability problem. Disabling stops new feature actions; it does not cancel an admitted transaction, delete metadata, release reserved stash space, or move equipment. Characters still restores its assigned equipment when the manual Gear Loadouts interface is off. Terrorized invalidates pending menu choices when disabled. Built-ins update with Mod Manager.

`checkUpdates()` reads the canonical feed. `installManagerUpdate()` and `installModUpdate()` are explicit user actions. Let the manager UI enforce their ordering and native exit flow.

`status()` is a diagnostic snapshot. Its nested native/runtime fields are not a versioned gameplay API. `D2GameContract`, `D2Characters`, and `D2LootGuard` internals may change with compatibility work; new consumers should propose a narrow shared contract.

## Attention

```js
const notices = D2Mods.attention.source('my-mod', 'My Mod');

// Expires after one minute.
notices.raise('completed', {title: 'Loadout ready'});

// Remains until its owner resolves it.
notices.raise('pending', {
  title: 'Something needs attention',
  detail: 'A concise, useful detail',
  untilResolved: true
});

notices.resolve('pending');
notices.clear();   // Disable: remove this mod's notices.
notices.dispose(); // Unload: release this source.
```

Source IDs must be unique lowercase letters, digits, and hyphens. Event IDs are local to that source. Repeating an unchanged event does not duplicate it or extend its lifetime. A mod must resolve notices when they stop being relevant and clear them when disabled. Loot Guard keeps unresolved floor drops visible until pickup, removal, or the world ending.

The attention list is transient UI state. It neither writes saves nor grants authority to act on the game.

## Unread control badges

```js
await D2Mods.ready;
const changes = D2Mods.badges.source('my-mod');
await changes.markUnread('charms', 'amazon');
await changes.clear('charms', 'amazon'); // Clears only this source's mark.
changes.dispose(); // Stops this producer; existing unread marks remain.
```

Use lowercase letters, digits and hyphens for source, target and context IDs, up to 64 characters. Source IDs are exclusive while registered. The native target currently provided is `charms`; its context is the class ID. Only mark a change after it succeeds.

Repeated marks are idempotent. Opening the actual own-character Charms view marks that class read across sources. Already-visible content is read immediately. Other classes and sources remain independent. Marks persist in manager storage, separately from the native save; they do not trigger the attention gem or expire on a timer.

New controls can reuse the C++ ledger and [`D2ControlBadgeView`](../src/manager/control-badge-view.js). Add their native visibility/context binding in the shared game adapter; do not copy notification storage or infer read state from a click that failed to open its content.
