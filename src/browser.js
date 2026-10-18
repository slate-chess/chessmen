// Copyright 2026 Linu Alex. SPDX-License-Identifier: Apache-2.0
// Script-tag entry (dist/pgn-replay.js, global PgnReplay): everything in index.js,
// plus zero-code mounting of every <div data-pgn-replay> once the page has loaded.
import { autoInit } from './board.js';

export * from './index.js';

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => autoInit());
  else queueMicrotask(() => autoInit());
}
