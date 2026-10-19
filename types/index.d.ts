// Copyright 2026 Linu Alex. SPDX-License-Identifier: Apache-2.0
// Hand-written types for the whole public surface: the replay board (create, autoInit),
// the stage under it (createStage, listen) and the pure core. There is no TypeScript in
// this project; these are written against src/ and checked by types/sample.ts.
/// <reference lib="dom" />

export const version: string;

// ---- squares, pieces, colours --------------------------------------------------------

/** An algebraic square, e.g. `"e4"`. */
export type Square = string;

/** A piece as the renderer names it: colour letter then upper-case piece letter. */
export type PieceCode =
  | 'wK' | 'wQ' | 'wR' | 'wB' | 'wN' | 'wP'
  | 'bK' | 'bQ' | 'bR' | 'bB' | 'bN' | 'bP';

/** chess.js piece letters, as they appear on a move record. */
export type PieceLetter = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export type Colour = 'w' | 'b';

export type Orientation = 'white' | 'black';

/** The six named mark colours; any CSS colour string also works. */
export type MarkColourName = 'green' | 'red' | 'blue' | 'yellow' | 'orange' | 'purple';
export type MarkColour = MarkColourName | (string & {});

/** Board colour scheme ids, in the Slate Chess app's order. The last four are its dark boards. */
export type SchemeId =
  | 'mahogany' | 'classic' | 'teal' | 'green' | 'blue' | 'cyan' | 'red' | 'oak' | 'walnut'
  | 'carrara' | 'slate' | 'midnight' | 'sage' | 'mustard' | 'terracotta' | 'blackWhite'
  | 'ember' | 'espresso' | 'graphite' | 'navy';

/** Piece colour (tint) ids, in the app's order. `original` keeps the artwork's own colours. */
export type PieceColourId =
  | 'original' | 'ivoryGraphite' | 'pearlSlate' | 'champagneSteel' | 'ivoryEspresso'
  | 'blushBurgundy' | 'creamCocoa' | 'pistachioLagoon' | 'sandClaret' | 'porcelainNavy'
  | 'parchmentMoss' | 'amberSky';

/** Piece sets that ship with the library, plus their aliases. Any registered id is accepted. */
export type PieceSetId =
  | 'classic-staunton' | 'modern-staunton' | 'merida' | 'cburnett' | (string & {});

/** A board colour scheme: square colours plus the highlight colour and opacity for each. */
export interface Scheme {
  light: string;
  dark: string;
  hlLight: [string, number];
  hlDark: [string, number];
}

/** A piece tint. `line` (Amber & Sky only) is one outline colour both sides share. */
export interface PieceColour {
  light: string;
  dark: string;
  line?: string;
}

export interface SchemeInfo {
  id: SchemeId;
  label: string;
  light: string;
  dark: string;
}

export interface PieceSetInfo {
  id: string;
  label: string;
  licence?: string;
}

/** `original` carries no colours; only `amberSky` carries a `line`. */
export interface PieceColourInfo {
  id: PieceColourId;
  label: string;
  light?: string;
  dark?: string;
  line?: string;
}

// ---- themes --------------------------------------------------------------------------

/** Every theme key, as `DEFAULT_THEME` holds them. */
export interface Theme {
  /** A `SchemeId`, or your own scheme object. */
  scheme: SchemeId | Scheme;
  pieceSet: PieceSetId;
  /** A `PieceColourId`, or your own `{ light, dark, line? }`. */
  pieceColours: PieceColourId | PieceColour;
  /** Anything other than these two hides the coordinates. */
  coordinates: 'inside' | 'outside' | 'none' | (string & {});
  /** Anything other than these three hides the last-move mark. */
  lastMove: 'arrow' | 'highlight' | 'both' | 'none' | (string & {});
  /** The light inlay strip and hairline around the squares. */
  frame: boolean;
  /** Piece size relative to its square. */
  pieceScale: number;
  font: string;
  /** The surface the board sits on. `create()` makes this `"transparent"`. */
  surface: string;
  text: string;
  textMuted: string;
  /** SwiftUI-style spring, as the app animates moves. */
  spring: { response: number; damping: number };
  /** Seconds until a piece is considered settled. */
  moveDuration: number;
}

/** A partial theme, as passed to `resolveTheme`, `create({ theme })` or `setTheme`. */
export type ThemeOptions = Partial<Theme>;

/** What `resolveTheme` returns: a full theme with the scheme and tint looked up. */
export type ResolvedTheme = Theme & {
  colors: Scheme;
  /** `null` for `original` — the artwork keeps its own colours. */
  tint: PieceColour | null;
};

export const DEFAULT_THEME: Theme;
/** The replay board's own defaults, layered over `DEFAULT_THEME` by `create()`. */
export const BOARD_THEME: ThemeOptions;

export const SCHEMES: Record<SchemeId, Scheme>;
export const SCHEME_LABELS: Record<SchemeId, string>;
export const PIECE_COLOURS: Record<PieceColourId, PieceColour | null>;
export const PIECE_COLOUR_LABELS: Record<PieceColourId, string>;
export const MARK_COLORS: Record<MarkColourName, string>;

/** Merge a partial theme over the defaults and resolve the scheme and tint. Throws on unknown ids. */
export function resolveTheme(theme?: ThemeOptions): ResolvedTheme;

// ---- the game model ------------------------------------------------------------------

export const START_FEN: string;

/** One move of a game. `variations` holds the alternatives to this move, each a line of its own. */
export interface MoveRecord {
  /** 1 = White's first move. */
  ply: number;
  moveNo: number;
  color: Colour;
  san: string;
  from: Square;
  to: Square;
  piece: PieceLetter;
  captured: PieceLetter | null;
  promotion: PieceLetter | null;
  flags: string;
  fenBefore: string;
  fenAfter: string;
  comment: string | null;
  /** A NAG or inline annotation, e.g. `"!?"`. */
  glyph: string | null;
  variations: MoveRecord[][];
}

export interface Game {
  headers: Record<string, string>;
  startFen: string;
  /** Empty for a game loaded from a FEN. */
  plies: MoveRecord[];
  result: string | null;
}

/** A game or position to load: `{ pgn }`, `{ fen }`, or a string that is read as either. */
export interface GameEntry {
  pgn?: string;
  fen?: string;
  /** The label the game picker shows for this entry. */
  label?: string;
}
export type GameSource = string | GameEntry;

/** PGN text with one or more games, a FEN, or an array mixing strings and entries. */
export type GameList = GameSource | GameSource[];

/** Load a game: `{ pgn }` or `{ fen }`, or a string read as whichever it looks like. */
export function loadGame(source: GameSource): Game;
/** FEN of the position after `ply` (0 or less = the start position). */
export function fenAt(game: Game, ply: number): string;
/** The move record for a ply number, or `null`. */
export function plyRecord(game: Game, ply: number): MoveRecord | null;
/** The last ply number in the main line, 0 if there are no moves. */
export function lastPly(game: Game): number;
/** Find a ply by a human reference: `"14...Nxe4"`, `"14.Nf3"`, `"Nxe4"`, or a number. Throws if it doesn't match. */
export function findPly(game: Game, ref: string | number): number;
/** Play SAN moves from a FEN, for variations written in a script. */
export function playLine(fen: string, sans: string[], firstPly?: number): MoveRecord[];
/** SAN with its move number, e.g. `"14...Nxe4"`. */
export function moveLabel(rec: MoveRecord): string;
/** Piece placement of a FEN as `{ e4: "wP", ... }`. */
export function placement(fen: string): Partial<Record<Square, PieceCode>>;

/** True for a FEN (a full one, or just the piece placement), as opposed to PGN text. */
export function isFEN(text: unknown): boolean;
/** Split a PGN file with one or more games into one string per game. */
export function splitPGN(text: string): string[];
/** Normalise a game list into `[{ pgn } | { fen }, ...]`. A placement-only FEN gets `"w - - 0 1"`. */
export function toGames(list?: GameList | null): GameEntry[];

// ---- marks ---------------------------------------------------------------------------

export interface Arrow {
  from: Square;
  to: Square;
  color?: MarkColour;
  opacity?: number;
}

export interface SquareMark {
  square: Square;
  color?: MarkColour;
  opacity?: number;
}

export interface Badge {
  square: Square;
  /** An annotation glyph (`"!"`, `"??"`, …) or `"book"` for the book-move badge. */
  glyph?: string;
  text?: string;
  color?: MarkColour;
}

/** Marks in any shorthand: `"e2e4 green"`, `["d7", "red"]`, or the object itself. */
export interface MarksInput {
  arrows?: Array<string | [Square, Square, MarkColour?] | Arrow>;
  highlights?: Array<string | [Square, MarkColour?] | SquareMark>;
  circles?: Array<string | [Square, MarkColour?] | SquareMark>;
  badges?: Array<string | [Square, string?] | Badge>;
}

export interface Marks {
  arrows: Arrow[];
  highlights: SquareMark[];
  circles: SquareMark[];
  badges: Badge[];
}

/** Normalise marks written in any of the shorthands. Throws on a square that isn't a1–h8. */
export function parseMarks(m?: MarksInput): Marks;
export const NO_MARKS: Marks;

// ---- animation -----------------------------------------------------------------------

/** Underdamped spring step response: 0 at the origin, 1 at the destination. */
export function spring(t: number, opts?: { response?: number; damping?: number }): number;

export interface MoveFrame {
  still: Array<{ sq: Square; piece: PieceCode }>;
  moving: Array<{ from: Square; to: Square; p: number; piece: PieceCode }>;
  fading: Array<{ sq: Square; piece: PieceCode; opacity: number }>;
  done: boolean;
}

/** The pieces to draw for a move `elapsed` seconds in. */
export function frameOfMove(rec: MoveRecord, elapsed: number, theme: ResolvedTheme): MoveFrame;
/** A position at rest. */
export function settled(fen: string): MoveFrame;
/** The pieces a move relocates, including the rook in castling. */
export function movers(rec: MoveRecord): Array<{ from: Square; to: Square }>;
/** The square of the captured piece — differs from `to` only for en passant. */
export function captureSquare(rec: MoveRecord): Square | null;

// ---- rendering -----------------------------------------------------------------------

/** One piece's artwork. */
export interface PieceArt {
  viewBox: string;
  body: string;
}

export interface PieceSet {
  name: string;
  label?: string;
  licence?: string;
  credit?: string;
  pieces: Record<PieceCode, PieceArt>;
}

/** Register a piece set so `pieces`/`pieceSet` can name it. */
export function registerPieceSet(set: PieceSet): PieceSet;
/** A registered piece set by name. Throws if it isn't loaded. */
export function pieceSet(name: PieceSetId): PieceSet;
/** `<symbol>` definitions for a piece set, in the theme's piece colours. Emit once per document. */
export function pieceDefs(setName: PieceSetId, idp: string, tint?: PieceColour | null): string;

/** One board to draw. `anim` draws it mid-move; without it the position is at rest. */
export interface BoardDrawing {
  fen: string;
  orientation?: Orientation;
  /** The move to mark as last played, as the theme's `lastMove` asks. */
  lastMove?: MoveRecord | null;
  anim?: { rec: MoveRecord; elapsed: number } | null;
  arrows?: Arrow[];
  highlights?: SquareMark[];
  circles?: SquareMark[];
  badges?: Badge[];
  /** 0–1: darken the board, for the main board while a variation is open. */
  dim?: number;
}

export interface BoardBox {
  x?: number;
  y?: number;
  size?: number;
  /** Id prefix, matching the one `pieceDefs` was called with. */
  idp?: string;
}

/** Square size and origin for a board of `size` px at (x, y). */
export function boardMetrics(
  theme: ResolvedTheme,
  x: number,
  y: number,
  size: number,
): { sq: number; fw: number; ox: number; oy: number; size: number };

/** Render one board as an SVG fragment (a `<g>`), without the piece definitions. */
export function boardSVG(board: BoardDrawing, theme: ResolvedTheme, box?: BoardBox): string;
/** A standalone SVG document for one board: images, share cards, thumbnails. */
export function boardDocument(
  board: BoardDrawing,
  theme: ResolvedTheme,
  size?: number,
  idp?: string,
): string;
/** The app's arrow shape between two points, for a square of `sq` px. */
export function arrowPath(
  start: { x: number; y: number },
  end: { x: number; y: number },
  sq: number,
): string;
/** Escape text for SVG/HTML markup. */
export function esc(s: unknown): string;

/** The stage draws in a square viewBox of this size. */
export const VIEW_SIZE: number;

/** What the stage shows at one instant: the board, and a variation board sliding in over it. */
export interface Scene {
  main: BoardDrawing;
  side?: BoardDrawing | null;
  /** 0 = the variation is off stage, 1 = fully in. */
  sideT?: number;
  sideLabel?: string | null;
}

/** A scene as an SVG fragment (no `<svg>` wrapper, no defs). */
export function sceneBody(scene: Scene, theme: ResolvedTheme, idp?: string): string;
/** A complete SVG document for a scene. */
export function sceneDocument(scene: Scene, theme: ResolvedTheme, idp?: string): string;

// ---- the stage -----------------------------------------------------------------------

export interface StageOptions {
  /** PGN text for the game to show. */
  pgn?: string;
  /** A single position, if there is no `pgn`. */
  fen?: string;
  /** A game source, taking precedence over `pgn` and `fen`. */
  game?: GameSource;
  theme?: ThemeOptions;
  orientation?: Orientation;
  /** Show the stage's own four buttons (default true). */
  controls?: boolean;
  /** Override the `prefers-reduced-motion` query: `true` renders moves without animating. */
  reducedMotion?: boolean;
  /** Ply to open on, as a number or a reference like `"14...Nxe4"`. */
  ply?: number | string;
}

/** Open a variation: a line from the PGN, SAN moves after a ply, or SAN moves from a FEN. */
export type VariationSpec =
  | { pgnVariation: number | string; index?: number; label?: string }
  | { after?: number | string; moves?: string[]; fen?: string; label?: string };

export interface StageState {
  ply: number;
  orientation: Orientation;
  variationOpen: boolean;
}

export interface StagePlyEvent {
  ply: number;
  move: MoveRecord | null;
}

/** One animated board. `Chessmen.create` builds on it; reach it as `board.stage`. */
export interface Stage {
  /** Load a game or position, replacing the current one. */
  load(source: GameSource): Stage;
  /** Go to a ply number or a reference like `"13.Rxd7"`. */
  goto(ref: number | string, opts?: { animate?: boolean }): Stage;
  next(): Stage;
  prev(): Stage;
  first(): Stage;
  last(): Stage;
  flip(): Stage;
  setOrientation(o: Orientation): Stage;
  setTheme(t: ThemeOptions): Stage;
  /** Marks on the board in front, or on the one named. */
  setMarks(m: MarksInput, board?: 'main' | 'side'): Stage;
  clearMarks(): Stage;
  /** Slide a second board in over this one, showing a variation. */
  openVariation(spec: VariationSpec): Stage;
  variationNext(): Stage;
  closeVariation(): Stage;
  /** Step through the game at a steady pace, or stop doing so. */
  toggle(): Stage;
  /** The current picture as a standalone SVG string. */
  svg(): string;
  readonly state: StageState;
  readonly game: Game;
  on(ev: 'ply', fn: (e: StagePlyEvent) => void): Stage;
  destroy(): void;
}

/** Mount a bare stage — one animated board, without the replay board's controls. */
export function createStage(el: HTMLElement, opts?: StageOptions): Stage;

/**
 * Let a parent window drive a stage inside an iframe:
 * `postMessage({ chessmen: "goto", args: ["14...Nxe4"] }, "*")`.
 */
export function listen(stage: Stage, target?: Window | EventTarget | null): void;

// ---- the replay board ----------------------------------------------------------------

export interface BoardOptions {
  /** PGN text with one or more games, a FEN, or an array of strings or `{ pgn | fen, label }`. */
  games?: GameList;
  /** One position to show instead of `games` (a diagram or a puzzle start). */
  fen?: string;
  /** Which game to show first (default 0). */
  game?: number;
  /** Step through the moves on its own. Defaults to true, but false under reduced motion and for positions. */
  autoplay?: boolean;
  /** Milliseconds between moves (default 1100). */
  interval?: number;
  /** Milliseconds to hold the final position (default 3000). */
  endPause?: number;
  /** After a game ends, go on to the next one (default true). */
  loop?: boolean;
  /** The button bar (default true). */
  controls?: boolean;
  /** The game menu, when there are two or more games (default true). */
  picker?: boolean;
  /** Players, opening, move counter and result above the board (default true). */
  meta?: boolean;
  orientation?: Orientation;
  /** Board colours: a `SchemeId` or your own scheme object. */
  scheme?: SchemeId | Scheme;
  /** Piece set id. Falls back to the first loaded set with a console warning. */
  pieces?: PieceSetId;
  /** Piece colours: a `PieceColourId` or your own `{ light, dark, line? }`. */
  pieceColours?: PieceColourId | PieceColour;
  /** Appearance menus for visitors (default false). Needs `controls`. */
  appearance?: boolean;
  /** A localStorage key: keep the visitor's appearance choice across visits. */
  remember?: string;
  /** Any other theme overrides. */
  theme?: ThemeOptions;
}

export interface BoardState {
  game: number;
  ply: number;
  lastPly: number;
  playing: boolean;
  orientation: Orientation;
}

export interface Appearance {
  scheme: SchemeId | Scheme;
  pieces: string;
  pieceColours: PieceColourId | PieceColour;
}

export interface BoardMoveEvent {
  game: number;
  ply: number;
  lastPly: number;
  move: MoveRecord | null;
  headers: Record<string, string>;
}

export interface BoardGameEvent {
  game: number;
  headers: Record<string, string>;
}

export interface Board {
  readonly version: string;
  /** The stage under the board: marks, arrows, variations. */
  readonly stage: Stage;
  readonly state: BoardState;
  /** PGN tags of the current game. */
  readonly headers: Record<string, string>;
  readonly appearance: Appearance;
  play(): Board;
  pause(): Board;
  toggle(): Board;
  next(): Board;
  prev(): Board;
  first(): Board;
  last(): Board;
  /** Go to a ply number or a reference like `"13.Rxd7"`. */
  goto(ply: number | string): Board;
  flip(): Board;
  setScheme(id: SchemeId | Scheme): Board;
  setPieces(id: PieceSetId): Board;
  setPieceColours(id: PieceColourId | PieceColour): Board;
  /** Any theme key, after mounting. */
  setTheme(t: ThemeOptions): Board;
  /** Show game `i` from the start. */
  load(i: number, opts?: { keepPlaying?: boolean }): Board;
  /** Replace the game list and show the first one. */
  setGames(list: GameList): Board;
  on(ev: 'move', fn: (e: BoardMoveEvent) => void): Board;
  on(ev: 'game', fn: (e: BoardGameEvent) => void): Board;
  on(ev: 'appearance', fn: (e: Appearance) => void): Board;
  destroy(): void;
}

/** Mount a replay board in `host`. Needs `games` or `fen`; throws without either. */
export function create(host: HTMLElement, opts: BoardOptions): Board;

/** Mount every `<div data-chessmen>` that isn't mounted yet. */
export function autoInit(scope?: ParentNode): Promise<Board[]>;

/** Every board colour scheme, in the app's order. */
export function schemes(): SchemeInfo[];
/** The piece sets loaded on this page, in the app's order. */
export function pieceSets(): PieceSetInfo[];
/** Every piece colour, in the app's order. */
export function pieceColours(): PieceColourInfo[];
