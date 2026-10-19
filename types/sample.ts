// Copyright 2026 Linu Alex. SPDX-License-Identifier: Apache-2.0
// Type-check sample: imports the package the way a TypeScript page would and uses the whole
// public surface, so `npm run types` fails if index.d.ts drifts from src/. Nothing runs it.
import {
  create,
  autoInit,
  createStage,
  listen,
  schemes,
  pieceSets,
  pieceColours,
  registerPieceSet,
  loadGame,
  fenAt,
  plyRecord,
  lastPly,
  findPly,
  playLine,
  moveLabel,
  placement,
  isFEN,
  splitPGN,
  toGames,
  parseMarks,
  resolveTheme,
  boardSVG,
  boardDocument,
  boardMetrics,
  pieceDefs,
  pieceSet,
  arrowPath,
  esc,
  sceneBody,
  sceneDocument,
  spring,
  frameOfMove,
  settled,
  movers,
  captureSquare,
  version,
  VIEW_SIZE,
  NO_MARKS,
  START_FEN,
  SCHEMES,
  SCHEME_LABELS,
  PIECE_COLOURS,
  PIECE_COLOUR_LABELS,
  MARK_COLORS,
  DEFAULT_THEME,
  BOARD_THEME,
} from 'chessmen';
import type {
  Board,
  BoardOptions,
  BoardState,
  Game,
  MoveRecord,
  Marks,
  PieceSet,
  ResolvedTheme,
  Stage,
  Theme,
} from 'chessmen';
import classic from 'chessmen/pieces/classic-staunton.mjs';

/** Checks the inferred type of `value` is assignable to `T` without widening it. */
const is = <T>(value: T): T => value;

const host = document.getElementById('board') as HTMLElement;
const pgn = '[White "Morphy"]\n\n1. e4 e5 2. Nf3 d6 1-0';

// ---- the board -----------------------------------------------------------------------

const opts: BoardOptions = {
  games: pgn,
  game: 0,
  autoplay: false,
  interval: 900,
  endPause: 2000,
  loop: false,
  controls: true,
  picker: true,
  meta: true,
  orientation: 'black',
  scheme: 'navy',
  pieces: 'modern-staunton',
  pieceColours: 'amberSky',
  appearance: true,
  remember: 'chessmen-look',
  theme: { lastMove: 'both', coordinates: 'outside', frame: false, moveDuration: 0.3 },
};
const board: Board = create(host, opts);

// Custom scheme and tint objects, and a list mixing PGN, FEN and labelled entries.
create(host, {
  games: [pgn, '8/8/8/8/8/8/8/K6k', { fen: START_FEN, label: 'Start' }, { pgn, label: 'Opera' }],
  scheme: { light: '#fff', dark: '#000', hlLight: ['#808080', 0.6], hlDark: ['#808080', 0.7] },
  pieceColours: { light: '#F9D978', dark: '#84D6EC', line: '#16100B' },
});
create(host, { fen: '8/8/8/8/8/8/8/K6k w - - 0 1' });

is<Board>(board.play().pause().toggle().next().prev().first().last().flip());
is<Board>(board.goto(12).goto('13.Rxd7'));
is<Board>(board.load(1).load(1, { keepPlaying: true }).setGames(pgn));
is<Board>(board.setScheme('ember').setPieces('merida').setPieceColours('porcelainNavy'));
is<Board>(board.setTheme({ pieceScale: 0.95, spring: { response: 0.3, damping: 0.8 } }));
is<string>(board.version);
is<BoardState>(board.state);
is<number>(board.state.ply + board.state.lastPly);
is<boolean>(board.state.playing);
is<'white' | 'black'>(board.state.orientation);
is<string | undefined>(board.headers.White);
is<string>(board.appearance.pieces);
board.on('move', (e) => is<number>(e.ply + e.lastPly + e.game));
board.on('move', (e) => is<string | null>(e.move ? e.move.san : null));
board.on('game', (e) => is<string | undefined>(e.headers.Black));
board.on('appearance', (e) => is<string>(e.pieces));
board.destroy();

is<Promise<Board[]>>(autoInit());
is<Promise<Board[]>>(autoInit(document.body));

// ---- the stage -----------------------------------------------------------------------

const stage: Stage = board.stage;
const bare: Stage = createStage(host, {
  pgn,
  theme: { scheme: 'graphite' },
  orientation: 'white',
  controls: false,
  reducedMotion: true,
  ply: '2...d6',
});
createStage(host, { fen: START_FEN });
createStage(host, { game: { pgn, label: 'x' } });
createStage(host);

is<Stage>(stage.next().prev().first().last().flip().toggle());
is<Stage>(stage.goto(4).goto('2...d6', { animate: false }));
is<Stage>(stage.load(pgn).load({ fen: START_FEN }).setOrientation('black'));
is<Stage>(stage.setTheme({ surface: '#000' }));
is<Stage>(stage.setMarks({ arrows: ['e2e4 green'] }).clearMarks());
is<Stage>(
  stage.setMarks(
    {
      arrows: [['g1', 'f3'], ['d1', 'd8', 'blue'], { from: 'a1', to: 'a8', color: '#abc', opacity: 0.5 }],
      highlights: ['e5 yellow', ['d4'], { square: 'c3', opacity: 0.4 }],
      circles: [['d8', 'red']],
      badges: [['e5', '!'], { square: 'b8', glyph: 'book' }, { square: 'f7', text: '1', color: 'purple' }],
    },
    'main',
  ),
);
is<Stage>(stage.openVariation({ after: '2.Nf3', moves: ['Nc6', 'Bb5'], label: 'Spanish' }));
is<Stage>(stage.openVariation({ pgnVariation: '2...d6', index: 0 }));
is<Stage>(stage.openVariation({ fen: START_FEN, moves: ['e4'] }));
is<Stage>(stage.variationNext().closeVariation());
is<string>(stage.svg());
is<boolean>(stage.state.variationOpen);
is<Game>(stage.game);
stage.on('ply', (e) => is<number>(e.ply));
bare.destroy();
listen(bare);
listen(bare, window);

// ---- the pure core -------------------------------------------------------------------

const game: Game = loadGame({ pgn });
is<Game>(loadGame(pgn));
is<Game>(loadGame({ fen: START_FEN }));
is<string>(game.startFen);
is<string | null>(game.result);
is<string | undefined>(game.headers.Event);

const rec: MoveRecord | null = plyRecord(game, 3);
if (rec) {
  is<number>(rec.ply + rec.moveNo);
  is<'w' | 'b'>(rec.color);
  is<string>(rec.san + rec.from + rec.to + rec.flags + rec.fenBefore + rec.fenAfter);
  is<string | null>(rec.comment);
  is<string | null>(rec.glyph);
  is<MoveRecord[][]>(rec.variations);
  is<string>(moveLabel(rec));
  is<string | null>(captureSquare(rec));
  is<number>(movers(rec).length);
}
is<string>(fenAt(game, 2));
is<number>(lastPly(game));
is<number>(findPly(game, '1.e4'));
is<number>(findPly(game, 1));
is<MoveRecord[]>(playLine(START_FEN, ['e4', 'e5'], 1));
is<MoveRecord[]>(playLine(START_FEN, ['e4']));
is<string | undefined>(placement(START_FEN).e2);

is<boolean>(isFEN(START_FEN));
is<string[]>(splitPGN(pgn));
is<number>(toGames(pgn).length);
is<string | undefined>(toGames([pgn, START_FEN])[0].pgn);
is<string | undefined>(toGames(START_FEN)[0].fen);

const marks: Marks = parseMarks({ circles: ['d5 red'] });
is<string>(marks.circles[0].square);
is<Marks>(NO_MARKS);

// ---- themes and rendering ------------------------------------------------------------

const theme: ResolvedTheme = resolveTheme({ scheme: 'navy', pieceColours: 'amberSky' });
is<Theme>(theme);
is<string>(theme.colors.light + theme.colors.dark);
is<number>(theme.colors.hlDark[1]);
is<string | undefined>(theme.tint ? theme.tint.line : undefined);
is<ResolvedTheme>(resolveTheme());
is<Theme>(DEFAULT_THEME);
is<string | undefined>(BOARD_THEME.surface);
is<string>(SCHEMES.mahogany.light + SCHEME_LABELS.navy + MARK_COLORS.green + PIECE_COLOUR_LABELS.amberSky);
is<string | undefined>(PIECE_COLOURS.amberSky ? PIECE_COLOURS.amberSky.line : undefined);

const set: PieceSet = registerPieceSet(classic);
is<PieceSet>(pieceSet('classic-staunton'));
is<string>(set.pieces.wK.viewBox + set.pieces.bP.body);
is<string | undefined>(set.licence);
is<string>(pieceDefs(theme.pieceSet, 't', theme.tint));
is<string>(pieceDefs('classic-staunton', 't'));

is<string>(boardSVG({ fen: fenAt(game, 1), lastMove: plyRecord(game, 1) }, theme));
is<string>(
  boardSVG(
    {
      fen: START_FEN,
      orientation: 'black',
      arrows: marks.arrows,
      highlights: marks.highlights,
      circles: marks.circles,
      badges: marks.badges,
      dim: 0.5,
      anim: rec ? { rec, elapsed: 0.1 } : null,
    },
    theme,
    { x: 0, y: 0, size: 400, idp: 't' },
  ),
);
is<string>(boardDocument({ fen: START_FEN }, theme, 240, 't'));
is<number>(boardMetrics(theme, 0, 0, 400).sq);
is<string>(arrowPath({ x: 0, y: 0 }, { x: 10, y: 10 }, 40));
is<string>(esc('<b>'));
is<number>(VIEW_SIZE);
is<string>(sceneBody({ main: { fen: START_FEN }, sideT: 0 }, theme));
is<string>(sceneDocument({ main: { fen: START_FEN }, side: { fen: START_FEN }, sideT: 1, sideLabel: 'x' }, theme, 't'));

is<number>(spring(0.1));
is<number>(spring(0.1, { response: 0.26, damping: 0.82 }));
is<boolean>(settled(START_FEN).done);
is<string>(settled(START_FEN).still[0].piece);
if (rec) is<number>(frameOfMove(rec, 0.1, theme).moving[0].p);

is<string>(version);
is<number>(schemes().length + pieceSets().length + pieceColours().length);
is<string>(schemes()[0].label + pieceSets()[0].id);
is<string | undefined>(pieceColours()[0].light);
