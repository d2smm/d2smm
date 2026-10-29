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

For user-directed actions, `configure({enabled, sound, testFcr, protectMatches})` accepts a partial settings change; `configurePreferences({showGem})` changes gem visibility. Both return promises and persist through the manager's queue. `installFile(file)` validates a JSON file before installation. Do not invoke these actions silently on behalf of another mod.

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
