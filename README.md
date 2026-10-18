# PGN Replay

<p align="center">
  <a href="https://slatechess.com/opensource/pgn-replay-demo.html"><b>Live demo &amp; playground</b></a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="https://slatechess.com/opensource/pgn-replay-demo.html#recipes">Recipes</a> ·
  <a href="llms.txt">llms.txt</a> ·
  <a href="CHANGELOG.md">Changelog</a>
</p>
<p align="center">
  <a href="https://github.com/slate-chess/pgn-replay/tags"><img alt="Version" src="https://img.shields.io/github/v/tag/slate-chess/pgn-replay?label=version&color=c4611f"></a>
  <a href="LICENSE"><img alt="Licence: Apache 2.0" src="https://img.shields.io/badge/licence-Apache%202.0-blue"></a>
  <img alt="Setup: one script tag" src="https://img.shields.io/badge/setup-one%20script%20tag-brightgreen">
</p>

**Embed a PGN replay on any web page.** One script tag, zero dependencies — animated moves, arrows, variations,
and 20 board themes.

Give it a PGN and it replays the game; give it a FEN and it shows the position. Smooth move animation, a last-move
arrow, controls, a game picker, arrows and circles, and a second board that slides in for variations. Two Staunton
piece sets, SVG rendering, no build step.

Move parsing and legality come from [chess.js](https://github.com/jhlywa/chess.js) (bundled in, BSD 2-Clause), so
the PGN your pages already have works unchanged — including headers, comments and variations.

By the makers of [Slate Chess](https://slatechess.com) — the personal chess coach for Apple devices. Apache 2.0.

<p align="center">
  <a href="https://slatechess.com/opensource/pgn-replay-demo.html"><img src="docs/opera-game.svg" width="360" alt="The Opera Game after 16.Qb8+: Classic Staunton pieces on the Mahogany board, with a green last-move arrow, a blue arrow from d1 to d8 and a red circle on d8"></a>
  &nbsp;
  <a href="https://slatechess.com/opensource/pgn-replay-demo.html"><img src="docs/immortal-game.svg" width="360" alt="The final position of the Immortal Game, 23.Be7#: Classic Staunton pieces in Amber and Sky on the Navy board"></a>
</p>
<p align="center"><sub>The Opera Game (Morphy, 1858) with arrows and a circle · the Immortal Game's final mate, on the Navy board. Drawn by the library (<code>npm run readme-image</code>).</sub></p>

[Live demo](https://slatechess.com/opensource/pgn-replay-demo.html) · [Local demo page](demo.html) · [Examples](examples/) · [llms.txt](llms.txt) · [Changelog](CHANGELOG.md)
(Serve the folder over http to open the HTML pages, e.g. `python3 -m http.server`.)

## Quick start

```html
<div id="board"></div>
<script src="https://cdn.jsdelivr.net/npm/pgn-replay@0.5.0/dist/pgn-replay.all.js"></script>
<script>
  PgnReplay.create(document.getElementById("board"), {
    games: '[White "Paul Morphy"]\n[Black "Duke Karl / Count Isouard"]\n\n1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0'
  });
</script>
```

That one file holds the board, its stylesheet and the Classic Staunton pieces. To serve it yourself, copy
`dist/` into your site and point the `src` at `dist/pgn-replay.all.js`. To offer Modern Staunton as well,
add `<script src="…/dist/pieces/modern-staunton.js"></script>` after it.

Or with no script of your own:

```html
<div data-pgn-replay='{"interval": 900}' data-src="games/showcase.pgn"></div>
<script src="https://cdn.jsdelivr.net/npm/pgn-replay@0.5.0/dist/pgn-replay.all.js"></script>
```

A position instead of a game, for diagrams and puzzles:

```js
PgnReplay.create(el, { fen: "r1bk3r/p2pBpNp/n4n2/1p1NP2P/6P1/3P4/P1P1K3/q5b1 b - - 1 23" });
```

`games` also takes a FEN (or a list mixing PGN and FEN), and so does the no-code embed. A FEN with only the piece
placement is read as White to move.

`data-src` needs the page served over http(s); for a file opened from disk, put the PGN inside the element
in a `<script type="application/x-chess-pgn">…</script>` child.

As an ES module (with a bundler, or a `<script type="module">`), after `npm install pgn-replay`:

```js
import { create, registerPieceSet } from "pgn-replay";        // dist/pgn-replay.mjs
import classic from "pgn-replay/pieces/classic-staunton.mjs";
import "pgn-replay/pgn-replay.css";                          // or a <link> to it
registerPieceSet(classic);
create(document.getElementById("board"), { games: pgnText });
```

Works in current Chrome, Edge, Firefox and Safari (desktop and mobile).

## For AI assistants

[`llms.txt`](llms.txt) is a one-page guide for LLMs and coding agents: a complete minimal page, valid option values
and the common mistakes. [`examples/`](examples/) has four complete pages to copy: `replay.html`, `appearance.html`,
`annotate.html` and `embed.html` (no code).

## Files

| File | Use |
|---|---|
| `dist/pgn-replay.all.js` | **One script tag**: board, stylesheet and Classic Staunton pieces (99 KB, 37 KB gzipped) |
| `dist/pgn-replay.js` | Script tag, global `PgnReplay`, without CSS or pieces (67 KB, 25 KB gzipped) |
| `dist/pgn-replay.mjs` | ES module, same API, nothing mounts on its own |
| `dist/pgn-replay.css` | The stylesheet, for the two files above |
| `dist/pieces/<name>.js` / `.mjs` | A piece set: a script that registers itself, or a module that exports it |

## Source and building

| Path | What it is |
|---|---|
| `src/board.js`, `src/pgn-replay.css` | The replay board: API, controls, autoplay, game list, appearance menus |
| `src/stage.js`, `src/scene.js` | The stage under it: one animated board, with marks and a variation board that slides in |
| `src/game.js`, `theme.js`, `marks.js`, `render.js`, `animate.js` | The pure core: PGN model (chess.js for the rules), colour schemes, arrows and other marks, SVG board, spring animation |
| `src/pieces/*.js` | Piece sets, generated by `tools/build_pieces.py`; don't edit by hand |
| `src/index.js`, `browser.js`, `all.js` | Entry points: ES module, script tag, one-tag build |
| `games/showcase.pgn` | Three classic games for the demo: the Opera Game (1858), the Immortal Game (1851), the Evergreen Game (1852) |

```bash
npm install          # esbuild and chess.js, exact versions
npm run build        # writes dist/ (checked in, so pages can load it straight from the repo)
npm test             # build, then node --test
npm run copy -- <dir>  # copy dist/, docs and examples into a folder of your site
```

## Options

`PgnReplay.create(element, options)` returns a board. All options are optional except `games` (or `fen`).

| Option | Default | Meaning |
|---|---|---|
| `games` | — | PGN text with one or more games, a FEN, or an array of PGN / FEN strings or `{ pgn \| fen, label }` |
| `fen` | — | One position to show instead of `games` (a diagram or a puzzle start) |
| `game` | `0` | Which game to show first |
| `autoplay` | `true` | Step through the moves on its own (off when the user asks for reduced motion, and for positions given as FEN) |
| `interval` | `1100` | Milliseconds between moves |
| `endPause` | `3000` | Milliseconds to hold the final position |
| `loop` | `true` | After a game ends, go on to the next one (back to the first after the last) |
| `controls` | `true` | Button bar: start, previous, play/pause, next, end, flip |
| `picker` | `true` | Game menu in the bar, when there are two or more games. Its labels are the `label`, else the PGN `Opening` tag, else "White vs Black" |
| `meta` | `true` | Players, opening, move counter and result above the board |
| `orientation` | `"white"` | Side at the bottom |
| `scheme` | `"mahogany"` | Board colours (below), or your own `{ light, dark, hlLight: [colour, opacity], hlDark: [...] }` |
| `pieces` | `"classic-staunton"` | Piece set (below). Falls back to the first loaded set, with a console warning |
| `pieceColours` | `"original"` | Piece colours (below), or your own `{ light, dark, line? }` |
| `appearance` | `false` | Board-colour, piece and piece-colour menus under the board, so visitors choose |
| `remember` | off | A localStorage key, e.g. `"pgn-replay-look"`: keeps the visitor's choice across visits |
| `theme` | Slate look | Other stage theme overrides (below) |

Autoplay pauses itself when the board is off screen or the tab is hidden. Any manual move (buttons or keys) pauses it.

## Methods and events

```js
const b = PgnReplay.create(el, { games });
b.play(); b.pause(); b.toggle();
b.next(); b.prev(); b.first(); b.last(); b.goto(12);   // ply number, or SAN label like "13.Rxd7"
b.flip();
b.load(1);                    // show game 2 from the start
b.setGames(otherPgnText);     // replace the list
b.setScheme("navy");        // or { light, dark, hlLight, hlDark }
b.setPieces("modern-staunton");
b.setPieceColours("amberSky");   // or { light, dark, line? }
b.appearance;                 // { scheme, pieces, pieceColours }
PgnReplay.schemes();         // [{ id, label, light, dark }] in the app's order
PgnReplay.pieceSets();       // [{ id, label, licence }] loaded on this page
PgnReplay.pieceColours();    // [{ id, label, light, dark, line }] in the app's order
b.state;                      // { game, ply, lastPly, playing, orientation }
b.headers;                    // PGN tags of the current game
b.on("move", ({ game, ply, lastPly, move, headers }) => {});
b.on("game", ({ game, headers }) => {});
b.on("appearance", ({ scheme, pieces, pieceColours }) => {});
b.destroy();
```

Keyboard, when the board has focus: ← → move, Home / End, Space play/pause, F flip.

## Board colours and pieces

Same names, colours and order as the Slate Chess app's **Board & Pieces** settings, so a board on the web looks like
the one in the app.

**Board colours** (`scheme`): `mahogany` (default, the app's), `classic`, `teal` (Steel Blue), `green`, `blue`
(Royal Blue), `cyan` (Ice Blue), `red` (Brick), `oak`, `walnut`, `carrara`, `slate`, `midnight`, `sage`, `mustard`,
`terracotta`, `blackWhite`, and the dark boards `ember`, `espresso`, `graphite`, `navy`.

**Pieces** (`pieces`): Classic Staunton is inside `pgn-replay.all.js`; load each other set you offer with its own script tag.

| id | App name | File | Licence | Use |
|---|---|---|---|---|
| `classic-staunton` | Classic Staunton | `dist/pieces/classic-staunton.js` (29 KB), also inside `.all.js` | Unlicense | Default |
| `modern-staunton` | Modern Staunton | `dist/pieces/modern-staunton.js` (8 KB) | BSD 3-Clause | Cleaner, lighter lines |

Aliases: `merida`, `cburnett`. Your own set: `PgnReplay.registerPieceSet({ name, pieces: { wK: { viewBox, body }, … } })`
with all twelve pieces (`wK`…`bP`) as SVG markup, then `pieces: name`.

**Piece colours** (`pieceColours`), the app's twelve: `original` (default, as drawn), `ivoryGraphite`, `pearlSlate`,
`champagneSteel`, `ivoryEspresso`, `blushBurgundy`, `creamCocoa`, `pistachioLagoon`, `sandClaret`, `porcelainNavy`,
`parchmentMoss`, and `amberSky`. On the dark boards (`ember`, `espresso`, `graphite`, `navy`, `midnight`) use
**`amberSky`**: both sides are lit and told apart by hue (amber and sky blue) with one dark outline, so black pieces
don't vanish into dark squares. Works with every piece set.

```js
PgnReplay.create(el, { games, scheme: "navy", pieceColours: "amberSky" });
```

Other stage theme keys, through `theme` (`PgnReplay.DEFAULT_THEME` has them all):

| Key | Values |
|---|---|
| `coordinates` | `"inside"` or `"outside"` (anything else hides them) |
| `lastMove` | `"arrow"`, `"highlight"` or `"both"` (anything else hides it) |
| `frame` | `true` / `false` |
| `moveDuration` | seconds per move animation (`0.42`) |

The controls and text take the page's colours through CSS custom properties on `.pgn-replay`:
`--sb-muted`, `--sb-btn-bg`, `--sb-btn-bg-hover`, `--sb-btn-text`, `--sb-focus`, `--sb-max-width`.

## Advanced: arrows, highlights and side variations

`b.stage` is the stage under the board, for teaching and analysis pages:

```js
b.pause();
b.stage.goto("13.Rxd7");
b.stage.setMarks({ arrows: ["h1d1 green"], circles: ["d7 red"], badges: [["e5", "!"]] });
b.stage.openVariation({ after: "13.Rxd7", moves: ["Nxd7", "Qxd7"] });  // SAN array; a second board slides in
b.stage.variationNext(); b.stage.closeVariation();
b.stage.svg();   // the current picture as an SVG string (share images, thumbnails)
```

The stage on its own, without the board's controls: `PgnReplay.createStage(el, { pgn, controls, theme })`.
`PgnReplay.listen(stage)` lets a parent window drive it with `postMessage({ pgnReplay: "goto", args: ["13.Rxd7"] })`.

The pure core is on the same global (and the ES module) for tooling and server-side images:
`loadGame`, `fenAt`, `plyRecord`, `findPly`, `moveLabel`, `SCHEMES`, `SCHEME_LABELS`, `resolveTheme`,
`parseMarks`, `boardSVG`, `boardDocument` (a standalone SVG of one position), `sceneDocument`, `registerPieceSet`.

## License

Copyright 2026 Linu Alex

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this software except in compliance
with the License. You may obtain a copy of the License at [LICENSE](LICENSE) or
http://www.apache.org/licenses/LICENSE-2.0. Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
either express or implied. See the License for the specific language governing permissions and limitations under
the License.

**Redistribution (Section 4).** You may reproduce and distribute copies of the Work or Derivative Works, with or
without modifications, in Source or Object form, provided that you:

1. give any other recipients a copy of the License (4a);
2. cause any modified files to carry prominent notices stating that you changed them (4b);
3. retain all copyright, patent, trademark and attribution notices from the Source form (4c); and
4. include a readable copy of the attribution notices in the [NOTICE](NOTICE) file with any Derivative Works you
   distribute, in at least one of: a NOTICE text file distributed with them, the source form or documentation, or
   a display generated by the Derivative Works where such third-party notices normally appear (4d).

**Attribution notice (NOTICE):**

```
PGN Replay
Copyright 2026 Linu Alex
Created by Linu Alex for Slate Chess (https://slatechess.com).
```

**Trademarks (Section 6).** The License does not grant permission to use the trade names, trademarks, service marks
or product names "Slate Chess" or "PGN Replay", except as required for reasonable and customary use in
describing the origin of the Work and reproducing the content of the NOTICE file.

**Patents (Section 3).** Each contributor grants a patent license for their contributions, which terminates for
anyone who brings patent litigation alleging that the Work infringes a patent.

**Third-party components** keep their own licenses: chess.js (BSD 2-Clause), Modern Staunton pieces (BSD 3-Clause),
Classic Staunton pieces (the Unlicense). See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## Versioning

Semantic versions in `package.json` and `src/board.js` (`PgnReplay.version`; the build checks they agree), this README and [CHANGELOG.md](CHANGELOG.md).
Patch: fixes and looks. Minor: new options or methods. Major: a change that breaks a page using the old API.

## Roadmap

- Play mode: drag pieces, legal-move hints.
- More of the app's board styles: patterned boards, edge colours, piece tints.

## Contributing

Issues and pull requests are welcome. Please run `npm test` before sending a change, and keep new code free of
GPL-licensed sources (the project is Apache 2.0).
