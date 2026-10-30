# UI assets

`ui/panel.webp` and `ui/button.webp` are compact AI-generated dark stone/metal UI textures. `ui/gem-on.webp` and `ui/gem-off.webp` are 150×150 variants edited from a user-supplied classic Battle.net-style reference. Their 66×66 artwork and 70×70 control scale together to fit a 40-HUD-pixel circular mount. See [rights notes](../NOTICE.md) before reusing derivative artwork.

`fonts/cinzel.ttf` is distributed with its [OFL license](fonts/font-license.txt). The runtime uses its losslessly compressed `fonts/generated/cinzel.woff2`, retaining the full glyph set; the adjacent JSON records source/output identities. Regenerate with native Google WOFF2 1.0.2 (`woff2_compress cinzel.ttf`) and update those identities. Website-only cathedral and gallery assets live in [`site/assets`](../site/assets/). No game sound file is included.

The original independent README banner has separate [generation provenance](../docs/assets/README.md).

The site's gem is staged directly from `ui/gem-on.webp` and `ui/gem-off.webp`, not a second editable image. It replaces the O in MOD, toggles color, and reveals the footer's GitHub mark. The heading uses live text with a restrained antique-gold bevel matching the gem's metal rim.

The footer's [GitHub mark](../site/assets/github-mark.svg) is the unmodified `mark-github-24.svg` from [Primer Octicons at ea8e6bb](https://github.com/primer/octicons/blob/ea8e6bb79894cc7e85564ee9b53d86b418738d04/icons/mark-github-24.svg), with its [MIT license](../site/assets/github-mark-LICENSE.txt). The black fill and white glow are applied by the site's CSS.
