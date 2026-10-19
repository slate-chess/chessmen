# chessmen changelog

## 0.5.1 (2026-10-19)

Fixes for three things the README already promised and one piece of stale branding. No API changes.

- **Space now drives the board**, not a second timer. The stage binds the same keys for standalone use, and both
  handlers were running: Space stepped the game on the stage's own fixed 1100 ms interval while the board's timer
  was merely paused, so `interval`, `endPause` and `loop` were ignored and the play/pause button never flipped.
  The board now captures the keyboard on its host element, ahead of the stage, and owns it.
- **Coming back to a tab no longer resumes a board that is still scrolled out of view.** The two gates were
  overwriting one another; they are now tracked separately and combined.
- `autoInit` assigns the board to `node.chessmen` (was `node.slateBoard`, left over from the old name). The
  property is undocumented; use the value `Chessmen.create` returns.
- The changelog title no longer carries a name this project never shipped under.
- **TypeScript definitions** for the whole public surface, shipped as `types/index.d.ts` and wired up through
  `"types"` in `package.json` and the `exports` map (including `chessmen/pieces/<name>.mjs`). Hand-written, with
  no TypeScript in the library itself; `npm run types` checks them against `types/sample.ts` in CI.
- API audit of the README against `src/`: corrected the two bundle sizes in the Files table, documented
  `b.setTheme()`, `b.version`, the `"Position N"` picker label, that `appearance` needs `controls`, that `pieces`
  throws when no set is loaded at all, `setMarks`'s board argument and the full `createStage` option list, and
  added `--cm-text` to the custom-property list. No runtime behaviour changed.
- Tests: 16 → 52. The board and stage are now mounted in a minimal DOM (`test/dom.js`, no new dependency) to
  cover `create()`'s options, autoplay semantics (interval, end pause, loop, reduced motion, hidden tab, off
  screen), the controls, the keyboard, the events, the appearance menus, the `remember` round-trip, `autoInit`
  and `listen`, plus edge cases for `splitPGN`, `isFEN`, `toGames`, `findPly` and the theme fallbacks.

## 0.5.0 (2026-10-18)

- **Renamed to chessmen**, from Slate Chessboard. Nothing was ever published under the old name, so there is no
  deprecated package and no migration path to keep: the names simply change.
  - Files: `dist/chessmen.all.js`, `.js`, `.mjs`, `.css` (were `dist/slate-chessboard.*`).
  - Global: `Chessmen` (was `SlateChessboard`); `ChessmenPieceSets` for early piece-set registration.
  - No-code embed: `data-chessmen`; the host class is `.chessmen`.
  - CSS prefixes: board classes and custom properties are `cm-` / `--cm-*` (were `sb-` / `--sb-*`); the stage's
    internal classes are `cmb-` (were `scb-`). Restyle any page that targeted the old names.
  - `postMessage` key: `{ chessmen: "goto", args: [...] }`.
  - Error messages are prefixed `chessmen:`.
  - Repository: `github.com/slate-chess/chessmen`. Demo: `slatechess.com/opensource/chessmen/`, with a redirect
    from the old demo URL.
- **Published to npm** as [`chessmen`](https://www.npmjs.com/package/chessmen): `npm install chessmen`.
  jsDelivr and unpkg serve it from the registry.
- README: a "Safe to depend on" section — pinned immutable CDN bytes, no phoning home, no lock-in.

## 0.4.0 (2026-10-15)

- **Piece colours**: the app's twelve pairings (`pieceColours` option, `setPieceColours`, `PgnReplay.pieceColours()`,
  a third appearance menu, remembered with `remember`). Same names, hex values and recolouring rule as the app's
  `PieceTint`. **Amber & Sky** lights both sides by hue with one shared outline: the pairing for the dark boards.
- README: the dark-board diagram is now Classic Staunton in Amber & Sky on Navy.

## 0.3.1 (2026-10-15)

- **FEN input**: a `fen` option shows one position (diagrams, puzzle starts); `games` and the no-code embed also accept
  a FEN, or a list mixing PGN and FEN. A placement-only FEN is read as White to move. A position with no moves shows
  "Position" and the side to move instead of players and a move count. New helpers: `isFEN`, `toGames`.
- README diagrams, drawn by the library (`npm run readme-image`).

## 0.3.0 (2026-10-15)

First public release.

- **One readable source tree** in `src/` replaces the minified `vendor/chess-stage.js`: the board, the stage, and the
  pure core (game model, themes, marks, SVG rendering, animation), each file under Apache 2.0.
- **One script tag**: `dist/pgn-replay.all.js` carries the board, its stylesheet and the Classic Staunton pieces.
  The separate files are still built: `dist/pgn-replay.js` (global), `.mjs` (ES module), `.css`, and
  `dist/pieces/<name>.js` (registering script) or `.mjs` (module).
- Built with esbuild from npm's chess.js 1.4.0 (`npm run build`); its BSD 2-Clause notice is kept in every bundle.
- One API on `PgnReplay`: the `ChessStage` global is gone. The bare stage is `PgnReplay.createStage`
  (and `board.stage` as before), plus `listen`, `loadGame`, `boardSVG`, `boardDocument`, `registerPieceSet`,
  `parseMarks` and the rest of the core. Parent-window messages use the key `pgnReplay`.
- The 20 colour schemes and their labels live in the core (`SCHEMES`, `SCHEME_LABELS`), in the app's order.
- `PgnReplay.DEFAULT_THEME` is now the stage's full default theme; the board's own defaults are `BOARD_THEME`.
- Piece scripts may load before or after the library.
- Board UI only: the video tooling the runtime came with (director timelines, narration audio, captions, the
  landscape/portrait/square video layouts, the timeline scrubber) is not part of the library. The stage keeps
  moves, animation, marks, variations, its controls and `listen`; `layout`, `setCaption`, `play(director)`,
  `cue`, `seek` and `setLayout` are gone.
- Showcase games are now three classics: the Opera Game, the Immortal Game and the Evergreen Game.
- Tests: `npm test` (node --test).

## Before 0.3.0

Earlier versions were used only on slatechess.com and were not published.
