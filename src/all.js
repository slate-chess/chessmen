// Copyright 2026 Linu Alex. SPDX-License-Identifier: Apache-2.0
// One-tag entry (dist/pgn-replay.all.js): the script-tag build, its stylesheet and the
// Classic Staunton pieces, so a page needs nothing but <script src="pgn-replay.all.js">.
import css from './pgn-replay.css';
import classicStaunton from './pieces/classic-staunton.js';
import { registerPieceSet } from './render.js';

export * from './browser.js';

registerPieceSet(classicStaunton);
if (typeof document !== 'undefined' && !document.getElementById('pgn-replay-css')) {
  const style = document.createElement('style');
  style.id = 'pgn-replay-css';
  style.textContent = css;
  // First in <head>, so the page's own rules (custom properties included) still win.
  document.head.insertBefore(style, document.head.firstChild);
}
