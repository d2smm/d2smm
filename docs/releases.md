# Releases

The official installer and release feed live at [d2s.arken.gg](https://d2s.arken.gg/) and [updates/stable.json](https://d2s.arken.gg/updates/stable.json).

## Prepare

1. Update `VERSION`, the readable manager version declaration, and `CHANGELOG.md`.
2. Change the loot package version only when that package changes.
3. Build from committed source. Review the generated descriptor, size, and SHA-256.
4. Exercise the affected browser behavior and retain proof outside the public source tree.
5. Commit and tag the accepted release. Publishing is a separate maintainer action.

The runtime currently has a **1 MiB** ceiling enforced by installed updaters and the build. Version 2.13.2 is close to that limit. Do not add another copy of a parser or texture; a future limit change requires a deliberate loader migration.

## Static hosting

`dist/site/` is a static distribution. It contains the website, the current versioned manager, the current loot package, and the update feed. `site/_headers` supplies the game-origin CORS headers for Cloudflare Pages-compatible hosting. Other hosts must configure equivalent response headers themselves.

Runtime files need cross-origin access from `https://d2survivors.lol`; startup uses Subresource Integrity. The stable feed must not be cached as immutable. Versioned artifacts are immutable: change the version when bytes change.

Keep **all previously published versioned manager and mod paths** when releasing. Older bookmarks, installed runtime selections, and rollback may depend on them. A fresh build alone contains only the current version; it must be combined with the retained release archive for production. Never replace an old version's bytes.

The optional extension is produced as `dist/extension/`. To distribute a ZIP, archive the contents of that directory at the ZIP root. The site's extension link is currently hidden; the default build does not advertise or require a ZIP download.

## Production ownership

Build every manager release from this repository. Historical runtime copies and distribution archives are not alternate authoring sources.

The current official site uses the maintainer's native Cloudflare publication workflow. Credentials, account state, and that private deployment environment are deliberately excluded from this repository. Pull-request CI builds and validates source only; it does not deploy.

The manager's canonical update origin is intentionally fixed. Hosting a fork is not enough to make it an official update source. Review the updater trust boundary and loader behavior before changing it.
