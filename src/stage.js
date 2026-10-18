// Copyright 2026 Linu Alex. SPDX-License-Identifier: Apache-2.0
// The stage: mounts one animated board into an element and exposes one small API that a
// page, an LLM-generated artifact, or a parent window (via postMessage) can drive.
// PgnReplay.create (board.js) builds on it; use it directly as
// PgnReplay.createStage, or through board.stage.
//
//   const stage = PgnReplay.createStage(el, { pgn, controls: true });
//   stage.goto('9...b5'); stage.setMarks({ arrows: ['f1c4 blue'] });
//   stage.openVariation({ pgnVariation: '15...Nxd7' }); stage.variationNext();
import { loadGame, fenAt, plyRecord, findPly, playLine, moveLabel, lastPly } from './game.js';
import { resolveTheme } from './theme.js';
import { pieceDefs } from './render.js';
import { sceneBody, VIEW_SIZE } from './scene.js';
import { parseMarks, NO_MARKS } from './marks.js';

let instances = 0;

const ICONS = {
  prev: '<path d="M12 5l-9 7 9 7zM21 5l-9 7 9 7z"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  next: '<path d="M3 5l9 7-9 7zM12 5l9 7-9 7z"/>',
  flip: '<path d="M7 4v13M7 17l-3-3M7 17l3-3M17 20V7M17 7l-3 3M17 7l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
};

const STYLE = `
.scb-stage{position:relative;font-family:ui-rounded,'SF Pro Rounded',system-ui,sans-serif;color:#fff;outline:none}
.scb-stage svg.scb-stage-view{display:block;width:100%;height:auto}
.scb-stage-bar{display:flex;gap:10px;justify-content:center;padding:12px 0 2px}
.scb-stage-bar button{all:unset;cursor:pointer;display:grid;place-items:center;height:44px;min-width:64px;border-radius:22px;background:#2c2c2e;color:#0a84ff;transition:background .15s}
.scb-stage-bar button:hover{background:#3a3a3c}
.scb-stage-bar button:focus-visible{outline:2px solid #0a84ff;outline-offset:2px}
.scb-stage-bar svg{width:22px;height:22px;fill:currentColor}
@media (prefers-reduced-motion:reduce){.scb-stage-bar button{transition:none}}`;

function injectStyle() {
  if (typeof document === 'undefined' || document.getElementById('scb-stage-style')) return;
  const s = document.createElement('style');
  s.id = 'scb-stage-style';
  s.textContent = STYLE;
  document.head.appendChild(s);
}

/**
 * @param {HTMLElement} el
 * @param {object} opts { pgn|fen|game, theme, orientation, controls, reducedMotion, ply }
 */
export function create(el, opts = {}) {
  injectStyle();
  const idp = `cs${++instances}`;
  const listeners = {};
  const emit = (ev, data) => (listeners[ev] || []).forEach((fn) => fn(data));
  const reduced = opts.reducedMotion ?? (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);

  let theme = resolveTheme(opts.theme);
  if (reduced) theme = { ...theme, moveDuration: 0.001 };
  let orientation = opts.orientation || 'white';
  let game, ply, marks, side, sideT, anim, sideAnim;
  let raf = 0, auto = 0;

  // ---- DOM ----------------------------------------------------------------
  el.classList.add('scb-stage');
  el.tabIndex = el.tabIndex >= 0 ? el.tabIndex : 0;
  el.innerHTML = '';
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'scb-stage-view');
  svg.setAttribute('role', 'img');
  svg.setAttribute('viewBox', `0 0 ${VIEW_SIZE} ${VIEW_SIZE}`);
  const defs = document.createElementNS(svgNS, 'defs');
  const body = document.createElementNS(svgNS, 'g');
  svg.append(defs, body);
  el.appendChild(svg);

  const button = (name, label, fn) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.innerHTML = `<svg viewBox="0 0 24 24">${ICONS[name]}</svg>`;
    b.addEventListener('click', fn);
    return b;
  };
  if (opts.controls !== false) {
    const bar = document.createElement('div');
    bar.className = 'scb-stage-bar';
    bar.append(
      button('prev', 'Previous move', () => api.prev()),
      button('play', 'Play', () => api.toggle()),
      button('next', 'Next move', () => api.next()),
      button('flip', 'Flip board', () => api.flip()),
    );
    el.appendChild(bar);
  }
  el.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: 'prev', ArrowRight: 'next', Home: 'first', End: 'last', f: 'flip', ' ': 'toggle' }[e.key];
    if (k) { e.preventDefault(); api[k](); }
  });

  // ---- state & drawing ---------------------------------------------------------
  const now = () => performance.now() / 1000;

  function currentScene() {
    const rec = plyRecord(game, ply);
    const n = now();
    let st = sideT;
    if (sideAnim) {
      const k = Math.min(1, (n - sideAnim.start) / sideAnim.dur);
      st = sideAnim.from + (sideAnim.to - sideAnim.from) * k;
    }
    const animFor = (board) => (anim && anim.board === board ? { rec: anim.rec, elapsed: n - anim.start } : null);
    return {
      moveText: rec ? moveLabel(rec) : null,
      main: { fen: fenAt(game, ply), orientation, lastMove: rec, anim: animFor('main'), ...marks.main, dim: 1 },
      side: side && {
        fen: side.idx ? side.recs[side.idx - 1].fenAfter : side.startFen,
        orientation, lastMove: side.recs[side.idx - 1] || null, anim: animFor('side'), ...marks.side,
      },
      sideT: st, sideLabel: side?.label,
    };
  }

  function draw() {
    const scene = currentScene();
    body.innerHTML = sceneBody(scene, theme, idp);
    svg.setAttribute('aria-label', scene.moveText ? `Position after ${scene.moveText}` : 'Starting position');
    return scene;
  }

  function animating() {
    const n = now();
    return (anim && n - anim.start < theme.moveDuration) || (sideAnim && n - sideAnim.start < sideAnim.dur);
  }

  function loop() {
    cancelAnimationFrame(raf);
    const tick = () => {
      draw();
      if (animating()) raf = requestAnimationFrame(tick);
      else {
        if (sideAnim && sideAnim.to === 0) side = null;
        anim = null; sideAnim = null; draw();
      }
    };
    raf = requestAnimationFrame(tick);
  }

  function load(source) {
    game = loadGame(source);
    defs.innerHTML = pieceDefs(theme.pieceSet, idp, theme.tint);
    ply = opts.ply !== undefined ? findPly(game, opts.ply) : (game.startFen.split(' ')[1] === 'b' ? 1 : 0);
    marks = { main: NO_MARKS, side: NO_MARKS };
    side = null; sideT = 0; anim = null; sideAnim = null;
    draw();
    emit('ply', { ply, move: plyRecord(game, ply) });
  }

  function step(target, animate = true) {
    const first = game.startFen.split(' ')[1] === 'b' ? 1 : 0;
    target = Math.max(first, Math.min(lastPly(game), target));
    if (target === ply) return;
    const rec = plyRecord(game, target);
    anim = animate && target === ply + 1 ? { board: 'main', rec, start: now() } : null;
    ply = target;
    marks.main = NO_MARKS;
    emit('ply', { ply, move: rec });
    anim ? loop() : draw();
  }

  const api = {
    /** Load a game: { pgn } or { fen }, or a PGN/FEN string. */
    load(source) { load(source); return api; },
    goto(ref, { animate = true } = {}) { step(typeof ref === 'number' ? ref : findPly(game, ref), animate); return api; },
    next() { step(ply + 1); return api; },
    prev() { step(ply - 1, false); return api; },
    first() { step(0, false); return api; },
    last() { step(lastPly(game), false); return api; },
    flip() { orientation = orientation === 'white' ? 'black' : 'white'; draw(); return api; },
    setOrientation(o) { orientation = o; draw(); return api; },
    setTheme(t) { theme = resolveTheme({ ...theme, ...t, colors: undefined, tint: undefined }); defs.innerHTML = pieceDefs(theme.pieceSet, idp, theme.tint); draw(); return api; },
    /** Marks on the board in front: { arrows, highlights, circles, badges }. */
    setMarks(m, board) { marks[board || (side ? 'side' : 'main')] = parseMarks(m); draw(); return api; },
    clearMarks() { marks = { main: NO_MARKS, side: NO_MARKS }; draw(); return api; },
    /** { after, moves } or { pgnVariation, index } or { fen, moves }. */
    openVariation(spec) {
      let startFen, recs, label = spec.label;
      if (spec.pgnVariation) {
        const rec = plyRecord(game, findPly(game, spec.pgnVariation));
        recs = rec.variations[spec.index || 0] || [];
        startFen = rec.fenBefore;
        label ??= `Instead of ${moveLabel(rec)}`;
      } else {
        const after = spec.after !== undefined ? findPly(game, spec.after) : ply;
        startFen = spec.fen || fenAt(game, after);
        recs = spec.moves ? playLine(startFen, spec.moves, after + 1) : [];
        label ??= after ? `After ${moveLabel(plyRecord(game, after))}` : 'Variation';
      }
      side = { startFen, recs, idx: 0, label };
      marks.side = NO_MARKS;
      sideT = 1; sideAnim = { from: 0, to: 1, start: now(), dur: reduced ? 0.001 : 0.55 };
      loop();
      return api;
    },
    variationNext() {
      if (!side || side.idx >= side.recs.length) return api;
      const rec = side.recs[side.idx];
      side = { ...side, idx: side.idx + 1 };
      marks.side = NO_MARKS;
      anim = { board: 'side', rec, start: now() };
      loop();
      return api;
    },
    closeVariation() {
      if (!side) return api;
      sideT = 0; sideAnim = { from: 1, to: 0, start: now(), dur: reduced ? 0.001 : 0.45 };
      marks.side = NO_MARKS;
      loop();
      return api;
    },
    /** Steps through the game at a steady pace, or stops doing so. */
    toggle() {
      if (auto) { clearInterval(auto); auto = 0; return api; }
      auto = setInterval(() => { if (ply >= lastPly(game)) { clearInterval(auto); auto = 0; } else step(ply + 1); }, 1100);
      return api;
    },
    /** Current picture as a standalone SVG string (for export or thumbnails). */
    svg() { const s = svg.cloneNode(true); s.setAttribute('xmlns', svgNS); return s.outerHTML; },
    get state() { return { ply, orientation, variationOpen: !!side }; },
    get game() { return game; },
    on(ev, fn) { (listeners[ev] ||= []).push(fn); return api; },
    destroy() { clearInterval(auto); cancelAnimationFrame(raf); el.innerHTML = ''; },
  };

  load(opts.game || (opts.pgn ? { pgn: opts.pgn } : opts.fen ? { fen: opts.fen } : { fen: undefined, pgn: '' }));
  return api;
}

/**
 * Let a parent window drive a stage inside an iframe — the shape sandboxed LLM
 * artifacts and embedding hosts can use:
 *   iframe.contentWindow.postMessage({ pgnReplay: 'goto', args: ['14...Nxe4'] }, '*')
 */
export function listen(stage, target = typeof window !== 'undefined' ? window : null) {
  if (!target) return;
  target.addEventListener('message', (e) => {
    const { pgnReplay: method, args = [] } = e.data || {};
    if (!method || typeof stage[method] !== 'function') return;
    try { stage[method](...args); e.source?.postMessage({ pgnReplay: 'ok', method, state: stage.state }, '*'); }
    catch (err) { e.source?.postMessage({ pgnReplay: 'error', method, message: err.message }, '*'); }
  });
}
