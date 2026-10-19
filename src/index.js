// Copyright 2026 Linu Alex. SPDX-License-Identifier: Apache-2.0
// chessmen, as an ES module: the replay board (create, autoInit), the stage under it
// (createStage, listen), and the pure core it draws with (game model, themes, marks, SVG
// rendering, animation). Importing it has no side effects; nothing mounts on its own.
export { VERSION as version, create, autoInit, splitPGN, isFEN, toGames, schemes, pieceSets, pieceColours, BOARD_THEME } from './board.js';
export { create as createStage, listen } from './stage.js';
export { loadGame, fenAt, plyRecord, findPly, playLine, moveLabel, placement, lastPly, START_FEN } from './game.js';
export { SCHEMES, SCHEME_LABELS, PIECE_COLOURS, PIECE_COLOUR_LABELS, MARK_COLORS, DEFAULT_THEME, resolveTheme } from './theme.js';
export { boardSVG, boardDocument, boardMetrics, pieceDefs, pieceSet, registerPieceSet, arrowPath, esc } from './render.js';
export { sceneBody, sceneDocument, VIEW_SIZE } from './scene.js';
export { parseMarks, NO_MARKS } from './marks.js';
export { spring, frameOfMove, settled, movers, captureSquare } from './animate.js';
