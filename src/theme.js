// Copyright 2026 Linu Alex. SPDX-License-Identifier: Apache-2.0
// Visual tokens, ported from the Slate Chess app (Shared/BoardColorScheme.swift and the
// board views) so a board drawn here matches a board drawn by the app.

/**
 * Board colour schemes, keyed by the app's BoardColorScheme raw values and listed in
 * the app's order (Board & Pieces settings). The last four are the app's dark boards.
 */
export const SCHEMES = {
  mahogany: { light: '#f0e3c7', dark: '#c4611f', hlLight: ['#f2ad59', 0.7], hlDark: ['#d98040', 0.75] },
  classic: { light: '#f0d9ad', dark: '#b88761', hlLight: ['#f2b266', 0.7], hlDark: ['#e6994c', 0.8] },
  teal: { light: '#cee0ea', dark: '#457e9c', hlLight: ['#fbf9db', 0.7], hlDark: ['#e2e2c9', 0.8] },
  green: { light: '#f6f7f2', dark: '#9aba8c', hlLight: ['#289d52', 0.6], hlDark: ['#289d52', 0.7] },
  blue: { light: '#adbee3', dark: '#5b76be', hlLight: ['#6699ff', 0.7], hlDark: ['#4c80e6', 0.7] },
  cyan: { light: '#ddecf2', dark: '#5a96b4', hlLight: ['#0083b3', 0.6], hlDark: ['#0083b3', 0.7] },
  red: { light: '#f0e9e4', dark: '#a65041', hlLight: ['#bd1414', 0.6], hlDark: ['#bd1414', 0.7] },
  oak: { light: '#f2e8c2', dark: '#a1703d', hlLight: ['#f2bf59', 0.7], hlDark: ['#d99e40', 0.75] },
  walnut: { light: '#e8dbb5', dark: '#6b4226', hlLight: ['#e6b252', 0.7], hlDark: ['#c78f38', 0.75] },
  carrara: { light: '#f5f2ed', dark: '#9e9e9c', hlLight: ['#f2cc73', 0.7], hlDark: ['#d9ad52', 0.75] },
  slate: { light: '#d9dbde', dark: '#575e66', hlLight: ['#8cbff2', 0.7], hlDark: ['#669ed9', 0.75] },
  midnight: { light: '#cdba96', dark: '#17202b', hlLight: ['#9ec71a', 0.65], hlDark: ['#94ba1a', 0.7] },
  sage: { light: '#c6d4a4', dark: '#8ca877', hlLight: ['#f2b84c', 0.7], hlDark: ['#e6a640', 0.75] },
  mustard: { light: '#f2ecc8', dark: '#d4a21b', hlLight: ['#5973d9', 0.55], hlDark: ['#4c66cc', 0.6] },
  terracotta: { light: '#e8cfa5', dark: '#c57143', hlLight: ['#3399a6', 0.6], hlDark: ['#298594', 0.65] },
  blackWhite: { light: '#ffffff', dark: '#000000', hlLight: ['#808080', 0.6], hlDark: ['#808080', 0.7] },
  ember: { light: '#bb652d', dark: '#232323', hlLight: ['#f0a860', 1], hlDark: ['#ffc880', 1] },
  espresso: { light: '#4a3935', dark: '#1e1716', hlLight: ['#c89a5e', 1], hlDark: ['#e0b070', 1] },
  graphite: { light: '#3c444d', dark: '#161b22', hlLight: ['#7fb3d5', 1], hlDark: ['#9fc9e5', 1] },
  navy: { light: '#34495e', dark: '#1d2835', hlLight: ['#6fa8dc', 1], hlDark: ['#8fbfea', 1] },
};

/** Display names, as in the app's Board & Pieces settings (Classic shortened from "Classic (Beige & Brown)"). */
export const SCHEME_LABELS = {
  mahogany: 'Mahogany', classic: 'Classic', teal: 'Steel Blue', green: 'Green', blue: 'Royal Blue',
  cyan: 'Ice Blue', red: 'Brick', oak: 'Oak', walnut: 'Walnut', carrara: 'Carrara', slate: 'Slate',
  midnight: 'Midnight & Khaki', sage: 'Sage', mustard: 'Cream & Mustard', terracotta: 'Terracotta',
  blackWhite: 'Black & White', ember: 'Ember & Charcoal', espresso: 'Espresso', graphite: 'Graphite', navy: 'Navy',
};

/** Teaching-mark colours. Picked to stay legible on every scheme above. */
// Piece colours, named, ordered and valued as the app's PieceTint (Shared/PieceSet.swift).
// light/dark: white's and black's colour; line (Amber & Sky only): one outline both sides share,
// so both sides can be lit, which is what the dark boards need. null = the artwork's own colours.
export const PIECE_COLOURS = {
  original: null,
  ivoryGraphite:   { light: '#F2F0E8', dark: '#3F4246' },
  pearlSlate:      { light: '#E8EDF0', dark: '#46505A' },
  champagneSteel:  { light: '#F3E7D0', dark: '#596979' },
  ivoryEspresso:   { light: '#F5EBD7', dark: '#51483E' },
  blushBurgundy:   { light: '#F7E8EE', dark: '#76293D' },
  creamCocoa:      { light: '#F6E8D5', dark: '#35251F' },
  pistachioLagoon: { light: '#E9F2BC', dark: '#2E4A50' },
  sandClaret:      { light: '#F7E6C2', dark: '#7A2E35' },
  porcelainNavy:   { light: '#EFF3F8', dark: '#1F3357' },
  parchmentMoss:   { light: '#F2EAD3', dark: '#3A4A2A' },
  amberSky:        { light: '#F9D978', dark: '#84D6EC', line: '#16100B' },
};
export const PIECE_COLOUR_LABELS = {
  original: 'Original', ivoryGraphite: 'Ivory & Graphite', pearlSlate: 'Pearl & Slate',
  champagneSteel: 'Champagne & Steel', ivoryEspresso: 'Ivory & Espresso', blushBurgundy: 'Blush & Burgundy',
  creamCocoa: 'Cream & Cocoa', pistachioLagoon: 'Pistachio & Lagoon', sandClaret: 'Sand & Claret',
  porcelainNavy: 'Porcelain & Navy', parchmentMoss: 'Parchment & Moss', amberSky: 'Amber & Sky',
};

export const MARK_COLORS = {
  green: '#219a3d',   // the app's LastMoveArrow fill
  red: '#d6402b',
  blue: '#2f6fd6',
  yellow: '#e6b800',
  orange: '#ee7a1c',
  purple: '#8a4fd1',
};

export const DEFAULT_THEME = {
  scheme: 'mahogany',
  pieceSet: 'classic-staunton', // registered by pieces/classic-staunton.js (built into chessmen.all.js)
  pieceColours: 'original',   // a PIECE_COLOURS id, or { light, dark, line? }
  coordinates: 'inside',      // 'inside' | 'outside' | 'none'
  lastMove: 'arrow',          // 'arrow' | 'highlight' | 'both' | 'none'
  frame: true,                // the light inlay strip + hairline around the squares
  pieceScale: 0.9,            // piece size relative to its square (app: 0.9)
  font: "ui-rounded, 'SF Pro Rounded', Poppins, system-ui, sans-serif",
  surface: '#1c1c1e',         // the card the board sits on in the app
  text: '#ffffff',
  textMuted: '#9a9aa0',
  // Move animation: SwiftUI .spring(response: 0.26, dampingFraction: 0.82)
  spring: { response: 0.26, damping: 0.82 },
  moveDuration: 0.42,         // seconds until a piece is considered settled
};

/** Merge a partial theme over the defaults and resolve the colour scheme. */
export function resolveTheme(theme = {}) {
  // Undefined keys mean "not specified", not "clear the default".
  const given = Object.fromEntries(Object.entries(theme || {}).filter(([, v]) => v !== undefined));
  const t = { ...DEFAULT_THEME, ...given };
  const base = typeof t.scheme === 'string' ? SCHEMES[t.scheme] : t.scheme;
  if (!base) throw new Error(`Unknown colour scheme "${t.scheme}". Known: ${Object.keys(SCHEMES).join(', ')}`);
  t.colors = base;
  const tint = typeof t.pieceColours === 'string' ? PIECE_COLOURS[t.pieceColours] : t.pieceColours;
  if (tint === undefined) throw new Error(`Unknown piece colours "${t.pieceColours}". Known: ${Object.keys(PIECE_COLOURS).join(', ')}`);
  t.tint = tint;
  return t;
}
