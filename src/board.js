// Copyright 2026 Linu Alex. SPDX-License-Identifier: Apache-2.0
// chessmen: the replay board for web pages. Look, controls, autoplay, game list and
// appearance menus, on top of the stage (stage.js). API: README.md.
import { SCHEMES, SCHEME_LABELS, PIECE_COLOURS, PIECE_COLOUR_LABELS } from './theme.js';
import { pieceSets as registeredSets } from './render.js';
import { loadGame, plyRecord, moveLabel, lastPly as gameLastPly } from './game.js';
import { create as createStage } from './stage.js';

export const VERSION = '0.5.1';

// The Slate look: the app's default board. Any stage theme key can be overridden per board.
// pieceSet falls back along PIECE_ORDER to the first set the page has loaded.
export const BOARD_THEME = {
  scheme: 'mahogany', pieceSet: 'classic-staunton', coordinates: 'inside', lastMove: 'arrow',
  frame: true, surface: 'transparent', moveDuration: 0.42,
};
const PIECE_ORDER = ['classic-staunton', 'modern-staunton'];
// Piece sets, with the app's names. Only sets cleared for redistribution ship, as pieces/<id>.js.
const PIECE_LABELS = { 'classic-staunton': 'Classic Staunton', 'modern-staunton': 'Modern Staunton' };
const PIECE_ALIASES = { merida: 'classic-staunton', cburnett: 'modern-staunton' };

/** Every board colour scheme: [{ id, label, light, dark }], in the app's order. */
export function schemes() {
  return Object.keys(SCHEMES).map((id) => ({ id, label: SCHEME_LABELS[id] || id, light: SCHEMES[id].light, dark: SCHEMES[id].dark }));
}

/** Piece colours: [{ id, label, light, dark, line }], in the app's order. */
export function pieceColours() {
  return Object.keys(PIECE_COLOURS).map((id) => ({ id, label: PIECE_COLOUR_LABELS[id] || id, ...(PIECE_COLOURS[id] || {}) }));
}
function colourId(name) {
  if (name && typeof name === 'object') return name;            // custom { light, dark, line? }
  if (name in PIECE_COLOURS) return name;
  throw new Error(`chessmen: unknown piece colours "${name}". Known: ${Object.keys(PIECE_COLOURS).join(', ')}`);
}

/** Piece sets loaded on this page: [{ id, label, licence }]. Load more with pieces/<name>.js. */
export function pieceSets() {
  const loaded = registeredSets();
  const ids = PIECE_ORDER.filter((id) => loaded[id]);
  for (const id of Object.keys(loaded)) if (!ids.includes(id)) ids.push(id);
  return ids.map((id) => ({ id, label: PIECE_LABELS[id] || loaded[id].label || id, licence: loaded[id].licence }));
}

function pieceId(name) {
  const id = PIECE_ALIASES[name] || name;
  const have = pieceSets().map((p) => p.id);
  if (!have.length) throw new Error('chessmen: no piece set loaded. Use chessmen.all.js, or add <script src="pieces/classic-staunton.js"> after chessmen.js.');
  if (have.includes(id)) return id;
  if (name && typeof console !== 'undefined') console.warn(`chessmen: piece set "${name}" isn't loaded (add pieces/${id}.js); using ${have[0]}.`);
  return have[0];
}
function schemeId(name) {
  if (name && typeof name === 'object') return name;            // custom { light, dark, hlLight, hlDark }
  if (SCHEMES[name]) return name;
  throw new Error(`chessmen: unknown board colours "${name}". Known: ${Object.keys(SCHEMES).join(', ')}`);
}

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* private mode */ } },
};

const ICONS = {
  first: '<path d="M6 5h2v14H6zM20 5v14L9 12z"/>',
  prev: '<path d="M17 5v14L6 12z"/>',
  play: '<path d="M7 5v14l12-7z"/>',
  pause: '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>',
  next: '<path d="M7 5v14l11-7z"/>',
  last: '<path d="M16 5h2v14h-2zM4 5v14l11-7z"/>',
  flip: '<path d="M7 4 3 8l4 4V9h10V7H7zm10 8v3H7v2h10v3l4-4z"/>',
};

const FEN_RE = /^[pnbrqkPNBRQK1-8]+(\/[pnbrqkPNBRQK1-8]+){7}(\s|$)/;

/** True for a FEN (a full one, or just the piece placement), as opposed to PGN text. */
export function isFEN(text) { return FEN_RE.test(String(text).trim()); }

/**
 * Normalises `games` into [{ pgn } | { fen }, ...]: PGN text with one or many games, a FEN, or an
 * array of PGN strings, FEN strings or { pgn | fen, label } objects. A FEN with only the piece
 * placement gets "w - - 0 1" (White to move, no castling).
 */
export function toGames(list) {
  const items = Array.isArray(list) ? list : isFEN(list) ? [list] : splitPGN(list || '');
  return items.map((g) => {
    if (typeof g === 'string') g = isFEN(g) ? { fen: g } : { pgn: g };
    if (g.fen) {
      const fen = String(g.fen).trim();
      return { ...g, fen: fen.includes(' ') ? fen : `${fen} w - - 0 1` };
    }
    return g;
  });
}

/** Splits a PGN file with one or more games into one string per game. */
export function splitPGN(text) {
  return String(text).replace(/\r\n?/g, '\n').split(/\n\s*\n(?=\[)/).map((s) => s.trim()).filter(Boolean);
}

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

function button(name, label, onClick) {
  const b = el('button', 'cm-btn cm-' + name, `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`);
  b.type = 'button';
  b.setAttribute('aria-label', label);
  b.title = label;
  b.addEventListener('click', onClick);
  return b;
}

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Mounts a board in `host`. Options (all optional except games):
 *   games       PGN text (one or many games), a FEN, or an array of PGN / FEN strings or {pgn | fen, label}
 *   fen         a single position to show instead of games (a diagram or a puzzle start)
 *   game        index of the first game (0)
 *   autoplay    step through the moves on its own (true; false under reduced motion or for positions only)
 *   interval    ms between moves (1100); endPause: ms to hold the final position (3000)
 *   loop        after the last move, go on to the next game (true)
 *   controls    show the button bar (true); picker: show the game menu when there are 2+ games (true)
 *   meta        show players, result and move counter above the board (true)
 *   orientation "white" | "black"
 *   scheme      board colours: an id from Chessmen.schemes() or { light, dark, hlLight, hlDark }
 *   pieces      piece set id from Chessmen.pieceSets() ("classic-staunton", "modern-staunton")
 *   pieceColours piece colours from Chessmen.pieceColours() ("original", ..., "amberSky"), or { light, dark, line? }
 *   appearance  show board-colour and piece menus in the bar (false)
 *   remember    localStorage key: keep the visitor's scheme and pieces across visits (off)
 *   theme       any other stage theme overrides (see BOARD_THEME and DEFAULT_THEME)
 */
export function create(host, opts = {}) {
  const o = {
    game: 0, autoplay: !reducedMotion(), interval: 1100, endPause: 3000, loop: true,
    controls: true, picker: true, meta: true, orientation: 'white', ...opts,
  };
  let games = toGames(o.fen ? [{ fen: o.fen }] : o.games);
  if (!games.length) throw new Error('chessmen: no games (give it PGN text or a FEN)');
  // Positions alone have nothing to play through, so they start paused unless autoplay is asked for.
  if (opts.autoplay === undefined && games.every((g) => g.fen)) o.autoplay = false;

  const listeners = {};
  const emit = (ev, data) => (listeners[ev] || []).forEach((fn) => fn(data));
  let index = Math.min(Math.max(0, o.game | 0), games.length - 1);
  let timer = 0, holdUntil = 0, wantPlay = !!o.autoplay, visible = true;

  host.classList.add('chessmen');
  host.innerHTML = '';
  const meta = o.meta ? el('div', 'cm-meta') : null;
  const stageEl = el('div', 'cm-stage');
  const status = el('div', 'cm-sr');
  status.setAttribute('aria-live', 'polite');
  if (meta) host.appendChild(meta);
  host.appendChild(stageEl);

  const saved = (o.remember && store.get(o.remember)) || {};
  let look = {
    scheme: schemeId(saved.scheme || o.scheme || (o.theme && o.theme.scheme) || BOARD_THEME.scheme),
    pieceSet: pieceId(saved.pieces || o.pieces || (o.theme && o.theme.pieceSet) || BOARD_THEME.pieceSet),
    pieceColours: colourId(saved.pieceColours || o.pieceColours || (o.theme && o.theme.pieceColours) || 'original'),
  };
  const stage = createStage(stageEl, {
    game: games[index], controls: false, orientation: o.orientation,
    theme: { ...BOARD_THEME, ...(o.theme || {}), ...look },
  });
  function applyLook(change) {
    look = { ...look, ...change };
    stage.setTheme(look);
    if (o.remember) store.set(o.remember, { scheme: typeof look.scheme === 'string' ? look.scheme : undefined, pieces: look.pieceSet,
      pieceColours: typeof look.pieceColours === 'string' ? look.pieceColours : undefined });
    if (schemeMenu && typeof look.scheme === 'string') schemeMenu.value = look.scheme;
    if (pieceMenu) pieceMenu.value = look.pieceSet;
    if (colourMenu && typeof look.pieceColours === 'string') colourMenu.value = look.pieceColours;
    emit('appearance', { scheme: look.scheme, pieces: look.pieceSet, pieceColours: look.pieceColours });
  }

  let playBtn = null, picker = null, schemeMenu = null, pieceMenu = null, colourMenu = null;
  if (o.controls) {
    const bar = el('div', 'cm-bar');
    playBtn = button('play', 'Play', () => api.toggle());
    bar.append(
      button('first', 'Start of game', () => { api.pause(); api.first(); }),
      button('prev', 'Previous move', () => { api.pause(); api.prev(); }),
      playBtn,
      button('next', 'Next move', () => { api.pause(); api.next(); }),
      button('last', 'End of game', () => { api.pause(); api.last(); }),
      button('flip', 'Flip board', () => api.flip()),
    );
    if (o.picker && games.length > 1) {
      picker = el('select', 'cm-picker');
      picker.setAttribute('aria-label', 'Choose a game');
      games.forEach((g, i) => picker.add(new Option(label(i), i)));
      picker.addEventListener('change', () => api.load(+picker.value));
      bar.appendChild(picker);
    }
    host.appendChild(bar);
    if (o.appearance) {
      const look2 = el('div', 'cm-bar cm-appearance');
      schemeMenu = el('select', 'cm-picker');
      schemeMenu.setAttribute('aria-label', 'Board colours');
      schemes().forEach((x) => schemeMenu.add(new Option(x.label, x.id)));
      schemeMenu.value = typeof look.scheme === 'string' ? look.scheme : '';
      schemeMenu.addEventListener('change', () => applyLook({ scheme: schemeMenu.value }));
      pieceMenu = el('select', 'cm-picker');
      pieceMenu.setAttribute('aria-label', 'Pieces');
      pieceSets().forEach((x) => pieceMenu.add(new Option(x.label, x.id)));
      pieceMenu.value = look.pieceSet;
      pieceMenu.addEventListener('change', () => applyLook({ pieceSet: pieceMenu.value }));
      colourMenu = el('select', 'cm-picker');
      colourMenu.setAttribute('aria-label', 'Piece colours');
      pieceColours().forEach((x) => colourMenu.add(new Option(x.label, x.id)));
      colourMenu.value = typeof look.pieceColours === 'string' ? look.pieceColours : '';
      colourMenu.addEventListener('change', () => applyLook({ pieceColours: colourMenu.value }));
      look2.append(schemeMenu, pieceMenu, colourMenu);
      host.appendChild(look2);
    }
  }
  host.appendChild(status);

  function headers() { return (stage.game && stage.game.headers) || {}; }
  function label(i) {
    if (games[i].label) return games[i].label;
    if (games[i].fen) return `Position ${i + 1}`;
    const h = loadGame(games[i]).headers || {};
    return h.Opening || `${h.White || 'White'} vs ${h.Black || 'Black'}`;
  }
  function lastPly() { return gameLastPly(stage.game); }

  function update() {
    const ply = stage.state.ply, n = lastPly(), h = headers();
    const rec = ply ? plyRecord(stage.game, ply) : null;
    const moveText = rec ? moveLabel(rec) : 'Start';
    if (meta) {
      meta.innerHTML = '';
      const who = el('b', 'cm-players');
      // A bare position (a FEN with no moves) has no players or move count, just the side to move.
      const position = !n && !h.White && !h.Black;
      who.textContent = position ? 'Position' : `${h.White || 'White'} – ${h.Black || 'Black'}`;
      const info = el('span', 'cm-info');
      const toMove = stage.game.startFen.split(' ')[1] === 'b' ? 'Black to move' : 'White to move';
      info.textContent = [h.Opening, n ? `move ${Math.ceil(ply / 2)}/${Math.ceil(n / 2)}` : toMove, ply >= n && h.Result ? h.Result : null]
        .filter(Boolean).join(' · ');
      meta.append(who, info);
    }
    if (!timer) status.textContent = rec ? `After ${moveText}` : 'Starting position';
    if (picker) picker.value = String(index);
    if (playBtn) {
      const on = !!timer;
      playBtn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[on ? 'pause' : 'play']}</svg>`;
      playBtn.setAttribute('aria-label', on ? 'Pause' : 'Play');
      playBtn.title = on ? 'Pause' : 'Play';
    }
    emit('move', { game: index, ply, lastPly: n, move: rec, headers: h });
  }

  function tick() {
    if (!visible) return;
    if (stage.state.ply < lastPly()) { stage.next(); return; }
    const now = Date.now();
    if (!holdUntil) { holdUntil = now + o.endPause; return; }
    if (now < holdUntil) return;
    holdUntil = 0;
    if (o.loop) api.load((index + 1) % games.length, { keepPlaying: true });
    else api.pause();
  }
  function start() { if (!timer) { timer = setInterval(tick, o.interval); update(); } }
  function stop() { if (timer) { clearInterval(timer); timer = 0; holdUntil = 0; update(); } }

  // Only animate while on screen and the tab is visible: saves battery and keeps the page calm.
  // The two gates are tracked apart and combined, so coming back to the tab does not resume a
  // board that is still scrolled out of view.
  let io = null, onScreen = true;
  const gate = () => { visible = onScreen && !document.hidden; };
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver((es) => { onScreen = es.some((e) => e.isIntersecting); gate(); });
    io.observe(host);
  }
  const onVis = () => gate();
  document.addEventListener('visibilitychange', onVis);

  // The board owns the keyboard. The stage binds the same keys for standalone use, so this
  // listener captures on the host — before the stage's own, which sits on the stage element —
  // and stops the event there. Space therefore drives the board's autoplay, with its interval,
  // endPause and loop, rather than the stage's bare timer.
  const KEYS = { ArrowLeft: 'prev', ArrowRight: 'next', Home: 'first', End: 'last', f: 'flip', ' ': 'toggle' };
  const onKey = (e) => {
    const k = KEYS[e.key];
    if (!k) return;
    e.preventDefault();
    e.stopPropagation();
    if (k !== 'toggle' && k !== 'flip') api.pause(); // a manual move stops autoplay; flipping is not a move
    api[k]();
  };
  host.addEventListener('keydown', onKey, true);
  stage.on('ply', () => update()); // fires on every move, from the API, the bar or the keyboard

  const api = {
    version: VERSION,
    /** The underlying stage: marks, arrows, variations (README, "Advanced"). */
    stage,
    get state() { return { game: index, ply: stage.state.ply, lastPly: lastPly(), playing: !!timer, orientation: stage.state.orientation }; },
    get headers() { return headers(); },
    play() { wantPlay = true; start(); return api; },
    pause() { wantPlay = false; stop(); return api; },
    toggle() { return timer ? api.pause() : api.play(); },
    next() { stage.next(); return api; },
    prev() { stage.prev(); return api; },
    first() { stage.first(); return api; },
    last() { stage.last(); return api; },
    goto(ply) { stage.goto(ply); return api; },
    flip() { stage.flip(); update(); return api; },
    /** Board colours: an id from Chessmen.schemes(), or { light, dark, hlLight, hlDark }. */
    setScheme(id) { applyLook({ scheme: schemeId(id) }); return api; },
    /** Piece set: an id from Chessmen.pieceSets(). */
    setPieces(id) { applyLook({ pieceSet: pieceId(id) }); return api; },
    /** Piece colours: an id from Chessmen.pieceColours(), or { light, dark, line? }. */
    setPieceColours(id) { applyLook({ pieceColours: colourId(id) }); return api; },
    get appearance() { return { scheme: look.scheme, pieces: look.pieceSet, pieceColours: look.pieceColours }; },
    setTheme(t) {
      const { scheme, pieceSet, pieceColours, ...rest } = t || {};
      stage.setTheme(rest);
      if (scheme || pieceSet || pieceColours) applyLook({ ...(scheme ? { scheme: schemeId(scheme) } : {}), ...(pieceSet ? { pieceSet: pieceId(pieceSet) } : {}),
        ...(pieceColours ? { pieceColours: colourId(pieceColours) } : {}) });
      return api;
    },
    /** Shows game `i` from the start. */
    load(i, { keepPlaying = false } = {}) {
      index = ((i % games.length) + games.length) % games.length;
      holdUntil = 0;
      stage.load(games[index]);
      if (!keepPlaying && !wantPlay) stop();
      emit('game', { game: index, headers: headers() });
      return api;
    },
    /** Replaces the game list (PGN text or array) and shows the first one. */
    setGames(list) {
      games = toGames(list);
      if (picker) { picker.innerHTML = ''; games.forEach((g, i) => picker.add(new Option(label(i), i))); }
      return api.load(0, { keepPlaying: true });
    },
    on(ev, fn) { (listeners[ev] || (listeners[ev] = [])).push(fn); return api; },
    destroy() {
      stop(); io && io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      host.removeEventListener('keydown', onKey, true);
      stage.destroy(); host.innerHTML = ''; host.classList.remove('chessmen');
    },
  };

  update();
  if (wantPlay) start();
  return api;
}

/** Mounts every <div data-chessmen='{"interval":900}'> on the page. Games come from a child
 *  <script type="application/x-chess-pgn">, the element's text, or a data-src URL: PGN or a FEN. */
export function autoInit(scope = document) {
  return Promise.all([...scope.querySelectorAll('[data-chessmen]:not([data-chessmen-ready])')].map(async (node) => {
    node.setAttribute('data-chessmen-ready', '');
    const attr = node.getAttribute('data-chessmen');
    const opts = attr && attr.trim().startsWith('{') ? JSON.parse(attr) : {};
    const script = node.querySelector('script[type="application/x-chess-pgn"]');
    let pgn = opts.games || (script ? script.textContent : node.textContent);
    if (node.dataset.src) pgn = await (await fetch(node.dataset.src)).text();
    node.chessmen = create(node, { ...opts, games: pgn });
    return node.chessmen;
  }));
}
