// Copyright 2026 Linu Alex. SPDX-License-Identifier: Apache-2.0
// One board, drawn as an SVG string. Pure: the same inputs always produce the
// same markup, so a board in the browser and a saved image of it are identical.
//
// Geometry and styling follow the Slate Chess app's SwiftUI board:
//   BoardSurface.swift      squares
//   ColorBoardView.swift    light inlay frame (0.1 square) + hairline
//   BoardCoordinates.swift  inside labels, 0.2 square, opposite square colour
//   BoardPieceLayer.swift   pieces at 0.9 of a square
//   LastMoveArrow.swift     arrow shape and proportions
//   BookMoveBadge.swift     corner badge
import { frameOfMove, settled } from './animate.js';
import { MARK_COLORS } from './theme.js';

// Piece sets: { name, label?, licence?, credit?, pieces: { wK: { viewBox, body }, ... } }. None is built
// into the core; pieces/<name>.js registers one, and pgn-replay.all.js includes classic-staunton.
const PIECE_SETS = {};
export function registerPieceSet(set) { PIECE_SETS[set.name] = set; return set; }
/** Registered sets by name. A piece script that ran before the library left its set in a global. */
export function pieceSets() {
  const early = globalThis.PgnReplayPieceSets;
  if (early) for (const set of Object.values(early)) if (!PIECE_SETS[set.name]) PIECE_SETS[set.name] = set;
  return PIECE_SETS;
}
export function pieceSet(name) {
  const set = pieceSets()[name];
  if (!set) {
    const have = Object.keys(PIECE_SETS);
    throw new Error(`Unknown piece set "${name}". ${have.length ? `Registered: ${have.join(', ')}` : 'None registered: load pieces/classic-staunton.js, or use pgn-replay.all.js'}`);
  }
  return set;
}

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n = (v) => Math.round(v * 100) / 100;
const markColor = (c) => MARK_COLORS[c] || c || MARK_COLORS.green;

// The artwork draws every piece in two colours: a fill (#fff) and a line (#000, or Mérida's #1f1a17).
// White pieces are filled and outlined; black pieces are the same drawing inverted (line is the body,
// fill the detail). Recolouring follows the app's Tools/bake-piece-tints.py exactly.
const FILL = /#fff(?:fff)?\b/gi;
const LINE = /#000(?:000)?\b|#1f1a17\b/gi;
function tintBody(body, white, tint) {
  if (!tint) return body;
  let fill = tint.light, line = tint.dark;                  // classic pair: same swap for both sides
  if (tint.line) { fill = white ? tint.light : tint.line; line = white ? tint.line : tint.dark; }
  // Placeholders first, so a new colour never gets matched by the second replacement.
  return body.replace(FILL, '\u0001').replace(LINE, '\u0002').split('\u0001').join(fill).split('\u0002').join(line);
}

/** <symbol> definitions for a piece set, in the theme's piece colours. Emit once per document. */
export function pieceDefs(setName, idp, tint = null) {
  const set = pieceSet(setName);
  return Object.entries(set.pieces)
    .map(([code, p]) => `<symbol id="${idp}-${code}" viewBox="${p.viewBox}">${tintBody(p.body, code[0] === 'w', tint)}</symbol>`)
    .join('');
}

/** Board metrics for a box of `size` px at (x, y). */
export function boardMetrics(theme, x, y, size) {
  const coordOut = theme.coordinates === 'outside';
  const frameUnits = theme.frame ? 0.2 : 0;
  const marginUnits = coordOut ? 0.35 : 0;
  const sq = size / (8 + frameUnits + marginUnits);
  const fw = theme.frame ? sq * 0.1 : 0;
  const ox = x + marginUnits * sq + fw;       // top-left of the a8/h1 square grid
  const oy = y + fw;
  return { sq, fw, ox, oy, size: sq * 8 };
}

function cell(square, orientation) {
  const f = square.charCodeAt(0) - 97;
  const r = +square[1];
  return orientation === 'black' ? { col: 7 - f, row: r - 1 } : { col: f, row: 8 - r };
}

function center(square, m, orientation) {
  const { col, row } = cell(square, orientation);
  return { x: m.ox + (col + 0.5) * m.sq, y: m.oy + (row + 0.5) * m.sq };
}

/** The app's arrow: shaft 0.15 sq, head 0.30 long × 0.38 wide, tip backed off to the square edge. */
export function arrowPath(start, end, sq) {
  const dx = end.x - start.x, dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.001) return '';
  const ux = dx / len, uy = dy / len, px = -uy, py = ux;
  const shaft = sq * 0.075, headHalf = sq * 0.19;
  const backOff = (sq / 2) / Math.max(Math.abs(ux), Math.abs(uy));
  const tipD = Math.max(0, len - backOff);
  const head = Math.min(sq * 0.3, tipD);
  const tip = { x: start.x + ux * tipD, y: start.y + uy * tipD };
  const neck = { x: tip.x - ux * head, y: tip.y - uy * head };
  const o = (p, a) => `${n(p.x + px * a)},${n(p.y + py * a)}`;
  return `M${o(start, shaft)}L${o(neck, shaft)}L${o(neck, headHalf)}L${n(tip.x)},${n(tip.y)}L${o(neck, -headHalf)}L${o(neck, -shaft)}L${o(start, -shaft)}Z`;
}

const GLYPH_STYLE = {
  '!!': '#1a9f8f', '!': '#3a9b4a', '!?': '#5b8bd9', '?!': '#d9a520', '?': '#e0782a', '??': '#cf3a2b',
  '#': '#2b2b2e', '+': '#2b2b2e',
};

function badgeSVG(b, m, orientation, theme) {
  const c = center(b.square, m, orientation);
  const d = m.sq * 0.34, r = d / 2;
  const lim = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const cx = lim(c.x + m.sq * 0.42, m.ox + r, m.ox + m.size - r);
  const cy = lim(c.y - m.sq * 0.42, m.oy + r, m.oy + m.size - r);
  if (b.glyph === 'book') {
    const s = d * 0.5;
    return `<g><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="#fff" stroke="rgba(0,0,0,.35)" stroke-width="${n(Math.max(0.5, m.sq * 0.012))}"/>`
      + `<path transform="translate(${n(cx - s / 2)},${n(cy - s * 0.42)}) scale(${n(s / 24)})" fill="#6b4521" d="M2 3.5C5 2.5 9 2.7 11.4 4.6V21C9 19.3 5 19.1 2 20.1ZM22 3.5C19 2.5 15 2.7 12.6 4.6V21C15 19.3 19 19.1 22 20.1Z"/></g>`;
  }
  const fill = b.color ? markColor(b.color) : (GLYPH_STYLE[b.glyph] || '#2b2b2e');
  const label = esc(b.glyph ?? b.text ?? '');
  const fs = d * (label.length > 1 ? 0.5 : 0.62);
  return `<g><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}" stroke="rgba(255,255,255,.9)" stroke-width="${n(m.sq * 0.02)}"/>`
    + `<text x="${n(cx)}" y="${n(cy + fs * 0.36)}" font-family="${esc(theme.font)}" font-weight="700" font-size="${n(fs)}" fill="#fff" text-anchor="middle">${label}</text></g>`;
}

/**
 * Render one board.
 * @param {object} board  { fen, orientation, lastMove, anim:{rec, elapsed}, arrows, highlights, circles, badges, dim, label }
 * @param {object} theme  resolved theme
 * @param {object} box    { x, y, size, idp }
 */
export function boardSVG(board, theme, { x = 0, y = 0, size = 400, idp = 'cs' } = {}) {
  if (size < 12) return ''; // mid-transition, too small to draw
  const m = boardMetrics(theme, x, y, size);
  const { sq } = m;
  const orientation = board.orientation || 'white';
  const C = theme.colors;
  const out = [];

  // Frame: light inlay strip, then a fine dark line where it meets the surround.
  if (theme.frame) {
    out.push(`<rect x="${n(m.ox - m.fw)}" y="${n(m.oy - m.fw)}" width="${n(m.size + 2 * m.fw)}" height="${n(m.size + 2 * m.fw)}" fill="${C.light}"/>`);
    out.push(`<rect x="${n(m.ox - m.fw + 0.5)}" y="${n(m.oy - m.fw + 0.5)}" width="${n(m.size + 2 * m.fw - 1)}" height="${n(m.size + 2 * m.fw - 1)}" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="1"/>`);
  }

  // Squares: one light fill, then the dark squares as a single path. Edges are
  // rounded per index so fractional sizes leave no seams.
  const edge = (i) => n(i * sq);
  out.push(`<rect x="${n(m.ox)}" y="${n(m.oy)}" width="${n(m.size)}" height="${n(m.size)}" fill="${C.light}"/>`);
  let dark = '';
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    if ((row + col) % 2 === 1) dark += `M${n(m.ox + edge(col))},${n(m.oy + edge(row))}h${n(sq)}v${n(sq)}h${n(-sq)}Z`;
  }
  out.push(`<path d="${dark}" fill="${C.dark}"/>`);

  const squareRect = (square, fill, opacity) => {
    const { col, row } = cell(square, orientation);
    return `<rect x="${n(m.ox + col * sq)}" y="${n(m.oy + row * sq)}" width="${n(sq)}" height="${n(sq)}" fill="${fill}" fill-opacity="${opacity}"/>`;
  };
  const isLight = (square) => { const { col, row } = cell(square, orientation); return (row + col) % 2 === 0; };

  // Last-move squares in the scheme's own highlight colours.
  const lm = board.lastMove;
  if (lm && (theme.lastMove === 'highlight' || theme.lastMove === 'both')) {
    for (const s of [lm.from, lm.to]) {
      const [col, op] = isLight(s) ? C.hlLight : C.hlDark;
      out.push(squareRect(s, col, op));
    }
  }
  for (const h of board.highlights || []) {
    out.push(squareRect(h.square, markColor(h.color || 'yellow'), h.opacity ?? 0.5));
  }

  // Coordinates.
  if (theme.coordinates === 'inside') {
    const fs = Math.max(7, sq * 0.2);
    const font = `font-family="${esc(theme.font)}" font-weight="600" font-size="${n(fs)}"`;
    for (let row = 0; row < 8; row++) {
      const rank = orientation === 'black' ? row + 1 : 8 - row;
      const fill = row % 2 === 0 ? C.dark : C.light;
      out.push(`<text x="${n(m.ox + fs * 0.72)}" y="${n(m.oy + row * sq + fs * 0.72 + fs * 0.35)}" ${font} fill="${fill}" text-anchor="middle">${rank}</text>`);
    }
    for (let col = 0; col < 8; col++) {
      const file = 'abcdefgh'[orientation === 'black' ? 7 - col : col];
      const fill = (7 + col) % 2 === 0 ? C.dark : C.light;
      out.push(`<text x="${n(m.ox + (col + 1) * sq - fs * 0.62)}" y="${n(m.oy + 8 * sq - fs * 0.72 + fs * 0.35)}" ${font} fill="${fill}" text-anchor="middle">${file}</text>`);
    }
  } else if (theme.coordinates === 'outside') {
    const fs = sq * 0.22;
    const font = `font-family="${esc(theme.font)}" font-weight="600" font-size="${n(fs)}" fill="${theme.textMuted}" text-anchor="middle"`;
    for (let row = 0; row < 8; row++) {
      const rank = orientation === 'black' ? row + 1 : 8 - row;
      out.push(`<text x="${n(m.ox - m.fw - sq * 0.18)}" y="${n(m.oy + (row + 0.5) * sq + fs * 0.35)}" ${font}>${rank}</text>`);
    }
    for (let col = 0; col < 8; col++) {
      const file = 'abcdefgh'[orientation === 'black' ? 7 - col : col];
      out.push(`<text x="${n(m.ox + (col + 0.5) * sq)}" y="${n(m.oy + m.size + m.fw + fs * 1.1)}" ${font}>${file}</text>`);
    }
  }

  // Circles sit under the pieces, like a hand-drawn ring on a diagram.
  for (const c of board.circles || []) {
    const p = center(c.square, m, orientation);
    out.push(`<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${n(sq * 0.43)}" fill="none" stroke="${markColor(c.color)}" stroke-opacity="${c.opacity ?? 0.85}" stroke-width="${n(sq * 0.07)}"/>`);
  }

  // Pieces: resting, then captured pieces fading, then movers on top.
  const frame = board.anim ? frameOfMove(board.anim.rec, board.anim.elapsed, theme) : settled(board.fen);
  const ps = sq * theme.pieceScale, inset = (sq - ps) / 2;
  const use = (piece, px, py, opacity = 1) =>
    `<use href="#${idp}-${piece}" x="${n(px + inset)}" y="${n(py + inset)}" width="${n(ps)}" height="${n(ps)}"${opacity < 1 ? ` opacity="${n(opacity)}"` : ''}/>`;
  const topLeft = (square) => { const { col, row } = cell(square, orientation); return { x: m.ox + col * sq, y: m.oy + row * sq }; };
  for (const { sq: s, piece } of frame.still) { const p = topLeft(s); out.push(use(piece, p.x, p.y)); }
  for (const f of frame.fading) { if (f.opacity > 0.01) { const p = topLeft(f.sq); out.push(use(f.piece, p.x, p.y, f.opacity)); } }
  for (const mv of frame.moving) {
    const a = topLeft(mv.from), b = topLeft(mv.to);
    out.push(use(mv.piece, a.x + (b.x - a.x) * mv.p, a.y + (b.y - a.y) * mv.p));
  }

  // Last-move arrow (the app's green, 55%, with a faint outline). Drawn once the
  // piece has landed so it never points at an empty square mid-flight.
  const arrow = (from, to, color, opacity, outline = true) => {
    const d = arrowPath(center(from, m, orientation), center(to, m, orientation), sq);
    return `<path d="${d}" fill="${markColor(color)}" fill-opacity="${opacity}"${outline ? ` stroke="rgba(0,0,0,.25)" stroke-width="${n(Math.max(1, sq * 0.02))}"` : ''}/>`;
  };
  if (lm && (theme.lastMove === 'arrow' || theme.lastMove === 'both') && (!board.anim || frame.done)) {
    out.push(arrow(lm.from, lm.to, 'green', 0.55));
  }
  for (const a of board.arrows || []) out.push(arrow(a.from, a.to, a.color || 'green', a.opacity ?? 0.8));
  for (const b of board.badges || []) out.push(badgeSVG(b, m, orientation, theme));

  // Dim: the main board "paused" while a variation plays elsewhere.
  if (board.dim) {
    out.push(`<rect x="${n(m.ox - m.fw)}" y="${n(m.oy - m.fw)}" width="${n(m.size + 2 * m.fw)}" height="${n(m.size + 2 * m.fw)}" fill="#000" fill-opacity="${n(0.5 * board.dim)}"/>`);
  }
  return `<g>${out.join('')}</g>`;
}

/** Standalone SVG document for one board: images, share cards, thumbnails. */
export function boardDocument(board, theme, size = 640, idp = 'cs') {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`
    + `<defs>${pieceDefs(theme.pieceSet, idp, theme.tint)}</defs>`
    + `<rect width="${size}" height="${size}" fill="${theme.surface}"/>`
    + boardSVG(board, theme, { x: 0, y: 0, size, idp })
    + `</svg>`;
}
