// Copyright 2026 Linu Alex. SPDX-License-Identifier: Apache-2.0
// The mounted board and stage, against the minimal DOM in test/dom.js: option handling,
// autoplay semantics, the controls, events, the appearance menus and the remember key.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installDOM } from './dom.js';
import {
  create, autoInit, createStage, listen, registerPieceSet, version, MARK_COLORS, SCHEMES, PIECE_COLOURS,
} from '../src/index.js';
import classic from '../src/pieces/classic-staunton.js';

registerPieceSet(classic);

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const showcase = fs.readFileSync(path.join(root, 'games/showcase.pgn'), 'utf8');

// 1.e4(1) e5(2) 2.Nf3(3) Nc6(4)
const SHORT = '[White "A"]\n[Black "B"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 1-0';
const OTHER = '[White "C"]\n[Black "D"]\n\n1. d4 d5 *';
const MATE_FEN = 'r1bk3r/p2pBpNp/n4n2/1p1NP2P/6P1/3P4/P1P1K3/q5b1 b - - 1 23';

/** A board in a fresh DOM, torn down when the test ends. */
function mount(t, opts, domOpts) {
  const dom = installDOM(domOpts);
  t.after(() => dom.restore());
  const host = dom.document.createElement('div');
  dom.document.body.appendChild(host);
  return { dom, host, board: create(host, opts) };
}

/** Let real time pass (the stage times its animations off performance.now), then draw. */
async function settle(dom) {
  await new Promise((r) => setTimeout(r, 5));
  dom.frames(10);
}

function withDOM(t, domOpts) {
  const dom = installDOM(domOpts);
  t.after(() => dom.restore());
  return dom;
}

// ---- options --------------------------------------------------------------------------

test('create() with only a PGN: autoplay on, full chrome, no picker', (t) => {
  const { dom, host, board } = mount(t, { games: SHORT });
  assert.equal(board.version, version);
  assert.deepEqual(board.state, { game: 0, ply: 0, lastPly: 4, playing: true, orientation: 'white' });
  assert.equal(board.headers.White, 'A');
  assert.ok(host.classList.contains('chessmen'));
  assert.ok(dom.query(host, '.cm-meta'), 'meta');
  assert.ok(dom.query(host, '.cm-stage'), 'stage');
  assert.ok(dom.query(host, '.cm-sr'), 'live region');
  assert.equal(dom.queryAll(dom.query(host, '.cm-bar'), '.cm-btn').length, 6);
  assert.equal(dom.query(host, '.cm-picker'), null, 'one game needs no picker');
  assert.equal(dom.query(host, '.cm-appearance'), null);
  assert.equal(dom.query(host, '.cm-players').textContent, 'A – B');
  assert.equal(dom.query(host, '.cm-info').textContent, 'move 0/2');
  board.last();
  assert.equal(dom.query(host, '.cm-info').textContent, 'move 2/2 · 1-0');
});

test('controls: false and meta: false leave them out', (t) => {
  const { dom, host } = mount(t, { games: SHORT, controls: false, meta: false, autoplay: false });
  assert.equal(dom.query(host, '.cm-bar'), null);
  assert.equal(dom.query(host, '.cm-meta'), null);
  assert.ok(dom.query(host, '.cm-stage'));
});

test('the picker labels each game and switching it loads that game', (t) => {
  const games = [{ pgn: SHORT, label: 'Mine' }, '8/8/8/8/8/8/8/K6k', '[Opening "Sicilian"]\n\n1. e4 c5 *', OTHER];
  const { dom, host, board } = mount(t, { games, autoplay: false });
  const picker = dom.query(host, '.cm-picker');
  assert.deepEqual(picker.childNodes.map((o) => o.text), ['Mine', 'Position 2', 'Sicilian', 'C vs D']);
  dom.change(picker, '3');
  assert.equal(board.state.game, 3);
  assert.equal(board.headers.White, 'C');
  assert.equal(picker.value, '3');
  // picker: false hides it even with several games
  const second = mount(t, { games, autoplay: false, picker: false });
  assert.equal(second.dom.query(second.host, '.cm-picker'), null);
});

test('game picks the first game and out-of-range values clamp', (t) => {
  assert.equal(mount(t, { games: [SHORT, OTHER], game: 1, autoplay: false }).board.state.game, 1);
  assert.equal(mount(t, { games: [SHORT, OTHER], game: 99, autoplay: false }).board.state.game, 1);
  assert.equal(mount(t, { games: [SHORT, OTHER], game: -5, autoplay: false }).board.state.game, 0);
});

test('a FEN position: no moves, paused, and the meta line says who is to move', (t) => {
  const { dom, host, board } = mount(t, { fen: MATE_FEN });
  assert.equal(board.state.lastPly, 0);
  assert.equal(board.state.playing, false, 'a position has nothing to play');
  assert.equal(dom.query(host, '.cm-players').textContent, 'Position');
  assert.equal(dom.query(host, '.cm-info').textContent, 'Black to move');
  // fen wins over games, and games also accepts a FEN string
  assert.equal(mount(t, { games: SHORT, fen: MATE_FEN }).board.state.lastPly, 0);
  assert.equal(mount(t, { games: MATE_FEN }).board.state.playing, false);
  // asking for autoplay explicitly overrides the positions rule
  assert.equal(mount(t, { fen: MATE_FEN, autoplay: true }).board.state.playing, true);
  // a mixed list still autoplays
  assert.equal(mount(t, { games: [MATE_FEN, SHORT] }).board.state.playing, true);
});

test('reduced motion turns autoplay off unless the page insists', (t) => {
  assert.equal(mount(t, { games: SHORT }, { reducedMotion: true }).board.state.playing, false);
  assert.equal(mount(t, { games: SHORT, autoplay: true }, { reducedMotion: true }).board.state.playing, true);
  assert.equal(mount(t, { games: SHORT, autoplay: false }).board.state.playing, false);
});

test('create() needs a game', (t) => {
  const dom = withDOM(t);
  const host = dom.document.createElement('div');
  for (const opts of [{}, { games: '' }, { games: [] }, { games: null }]) {
    assert.throws(() => create(host, opts), /no games/, JSON.stringify(opts));
  }
});

test('unknown ids: schemes and piece colours throw, a missing piece set falls back', (t) => {
  const dom = withDOM(t);
  const host = dom.document.createElement('div');
  assert.throws(() => create(host, { games: SHORT, scheme: 'nope' }), /unknown board colours "nope"\. Known: mahogany/);
  assert.throws(() => create(host, { games: SHORT, pieceColours: 'nope' }), /unknown piece colours "nope"\. Known: original/);

  const warnings = [];
  const warn = console.warn;
  console.warn = (m) => warnings.push(m);
  t.after(() => { console.warn = warn; });
  const board = create(host, { games: SHORT, autoplay: false, pieces: 'nope' });
  assert.match(warnings.join('\n'), /piece set "nope" isn't loaded/);
  assert.equal(board.appearance.pieces, 'classic-staunton');
  // aliases resolve to the set they name
  assert.equal(create(host, { games: SHORT, autoplay: false, pieces: 'merida' }).appearance.pieces, 'classic-staunton');
});

test('the board theme reaches the stage, and theme overrides reach it too', (t) => {
  const { board } = mount(t, { games: SHORT, autoplay: false });
  assert.match(board.stage.svg(), /fill="transparent"/, 'BOARD_THEME surface');
  const custom = mount(t, { games: SHORT, autoplay: false, theme: { surface: '#123456', coordinates: 'none' } });
  assert.match(custom.board.stage.svg(), /fill="#123456"/);
  assert.doesNotMatch(custom.board.stage.svg(), /text-anchor="middle">a</, 'coordinates off');
  // the explicit option wins over the same key inside theme
  const both = mount(t, { games: SHORT, autoplay: false, scheme: 'navy', theme: { scheme: 'green' } });
  assert.ok(both.board.stage.svg().includes(SCHEMES.navy.dark));
  assert.equal(both.board.appearance.scheme, 'navy');
});

// ---- autoplay -------------------------------------------------------------------------

test('autoplay steps on its interval, holds the end, then loops to the next game', (t) => {
  const { dom, board } = mount(t, {
    games: [SHORT, OTHER], interval: 100, endPause: 500, theme: { moveDuration: 0.001 },
  });
  assert.equal(board.state.playing, true);
  dom.tick();
  assert.equal(board.state.ply, 1);
  dom.tick(3);
  assert.equal(board.state.ply, 4, 'at the last move');
  dom.tick();                                   // starts the end pause
  assert.deepEqual([board.state.game, board.state.playing], [0, true]);
  dom.tick();                                   // still inside it
  assert.equal(board.state.game, 0);
  dom.wait(500);
  dom.tick();
  assert.deepEqual([board.state.game, board.state.ply, board.state.playing], [1, 0, true], 'next game, still playing');
});

test('the documented autoplay defaults are the real ones', (t) => {
  const { dom, board } = mount(t, { games: [SHORT, OTHER], theme: { moveDuration: 0.001 } });
  assert.deepEqual(dom.periods(), [1100], 'interval');
  dom.tick(5);                                  // four moves, then the end pause starts
  assert.equal(board.state.ply, 4);
  dom.tick(2);                                  // 2200 ms of the 3000 ms pause
  assert.equal(board.state.game, 0, 'still holding the final position');
  dom.tick();                                   // 3300 ms: the pause is over
  assert.equal(board.state.game, 1, 'loop is on by default');
});

test('loop: false stops after the last move', (t) => {
  const { dom, board } = mount(t, { games: SHORT, interval: 100, endPause: 200, loop: false, theme: { moveDuration: 0.001 } });
  dom.tick(5);
  dom.wait(300);
  dom.tick();
  assert.equal(board.state.playing, false);
  assert.equal(board.state.ply, 4);
});

test('autoplay holds still while the tab is hidden or the board is off screen', (t) => {
  const { dom, board } = mount(t, { games: SHORT, interval: 100, theme: { moveDuration: 0.001 } });
  dom.visibility(true);
  dom.tick(2);
  assert.equal(board.state.ply, 0, 'hidden tab');
  dom.visibility(false);
  dom.tick();
  assert.equal(board.state.ply, 1);
  dom.intersect(false);
  dom.tick(2);
  assert.equal(board.state.ply, 1, 'scrolled away');
  dom.intersect(true);
  dom.tick();
  assert.equal(board.state.ply, 2);
});

test('returning to the tab does not resume a board that is still scrolled away', (t) => {
  const { dom, board } = mount(t, { games: SHORT, interval: 100, theme: { moveDuration: 0.001 } });
  dom.intersect(false);
  dom.visibility(true);          // tab hidden while the board is off screen
  dom.visibility(false);         // and back again: the off-screen gate must still hold
  dom.tick(3);
  assert.equal(board.state.ply, 0, 'still off screen, so still still');
  dom.intersect(true);
  dom.tick();
  assert.equal(board.state.ply, 1, 'resumes only once it is back on screen');
});

test('Space drives the board autoplay, honouring interval, not the stage timer', (t) => {
  const { dom, host, board } = mount(t, { games: SHORT, autoplay: false, interval: 100, theme: { moveDuration: 0.001 } });
  const stageEl = dom.query(host, '.cm-stage');
  const play = dom.query(host, '.cm-play');

  dom.key(stageEl, ' ');
  assert.equal(board.state.playing, true, 'Space starts the board, not just the stage');
  assert.deepEqual(dom.periods(), [100], 'the board interval, not the stage default of 1100');
  assert.equal(play.getAttribute('aria-label'), 'Pause', 'the button reflects it');

  dom.key(stageEl, ' ');
  assert.equal(board.state.playing, false);
  assert.equal(play.getAttribute('aria-label'), 'Play');
  assert.equal(dom.timers, 0, 'no stray stage timer left running');
});

test('play, pause and destroy start and stop the one timer', (t) => {
  const { dom, board } = mount(t, { games: SHORT, autoplay: false });
  assert.equal(dom.timers, 0);
  board.play();
  assert.equal(dom.timers, 1);
  board.play();
  assert.equal(dom.timers, 1, 'play twice is still one timer');
  board.toggle();
  assert.equal(dom.timers, 0);
  board.play();
  board.destroy();
  assert.equal(dom.timers, 0);
});

// ---- controls, keyboard, events -------------------------------------------------------

test('the buttons move the game and pause autoplay', (t) => {
  const { dom, host, board } = mount(t, { games: SHORT, interval: 100, theme: { moveDuration: 0.001 } });
  dom.click(dom.query(host, '.cm-next'));
  assert.deepEqual([board.state.ply, board.state.playing], [1, false], 'a manual move pauses');
  dom.click(dom.query(host, '.cm-last'));
  assert.equal(board.state.ply, 4);
  dom.click(dom.query(host, '.cm-prev'));
  assert.equal(board.state.ply, 3);
  dom.click(dom.query(host, '.cm-first'));
  assert.equal(board.state.ply, 0);
  dom.click(dom.query(host, '.cm-flip'));
  assert.equal(board.state.orientation, 'black');

  const play = dom.query(host, '.cm-play');
  assert.equal(play.getAttribute('aria-label'), 'Play');
  dom.click(play);
  assert.equal(board.state.playing, true);
  assert.equal(play.getAttribute('aria-label'), 'Pause');
  dom.click(play);
  assert.equal(board.state.playing, false);
  assert.equal(play.getAttribute('aria-label'), 'Play');
});

test('the arrow keys and Home/End move the board and pause it', (t) => {
  const { dom, host, board } = mount(t, { games: SHORT, interval: 100, theme: { moveDuration: 0.001 } });
  const stageEl = dom.query(host, '.cm-stage');
  dom.key(stageEl, 'ArrowRight');
  assert.deepEqual([board.state.ply, board.state.playing], [1, false]);
  dom.key(stageEl, 'ArrowRight');
  dom.key(stageEl, 'ArrowLeft');
  assert.equal(board.state.ply, 1);
  dom.key(stageEl, 'End');
  assert.equal(board.state.ply, 4);
  dom.key(stageEl, 'Home');
  assert.equal(board.state.ply, 0);
  dom.key(stageEl, 'f');
  assert.equal(board.state.orientation, 'black');
});

test('goto takes a ply number or a move reference, and clamps', (t) => {
  const { board } = mount(t, { games: SHORT, autoplay: false });
  assert.equal(board.goto('2.Nf3').state.ply, 3);
  assert.equal(board.goto(2).state.ply, 2);
  assert.equal(board.goto(99).state.ply, 4);
  assert.equal(board.goto(-3).state.ply, 0);
  assert.throws(() => board.goto('9.Qh5'), /No ply 9\.Qh5/);
});

test('move, game and appearance events carry the current state', (t) => {
  const { board } = mount(t, { games: [SHORT, OTHER], autoplay: false });
  const moves = [], games = [], looks = [];
  board.on('move', (e) => moves.push(e)).on('game', (e) => games.push(e)).on('appearance', (e) => looks.push(e));

  board.next();
  assert.deepEqual(
    (({ game, ply, lastPly, headers }) => ({ game, ply, lastPly, white: headers.White }))(moves.at(-1)),
    { game: 0, ply: 1, lastPly: 4, white: 'A' },
  );
  assert.equal(moves.at(-1).move.san, 'e4');
  board.first();
  assert.equal(moves.at(-1).move, null, 'the start position has no move');

  board.load(1);
  assert.deepEqual(games.at(-1), { game: 1, headers: games.at(-1).headers });
  assert.equal(games.at(-1).headers.White, 'C');
  assert.equal(moves.at(-1).lastPly, 2);

  board.setScheme('navy').setPieces('merida').setPieceColours('amberSky');
  assert.deepEqual(looks.at(-1), { scheme: 'navy', pieces: 'classic-staunton', pieceColours: 'amberSky' });
  assert.deepEqual(board.appearance, { scheme: 'navy', pieces: 'classic-staunton', pieceColours: 'amberSky' });
  assert.equal(looks.length, 3);
});

test('setGames replaces the list and relabels the picker', (t) => {
  const { dom, host, board } = mount(t, { games: [SHORT, OTHER], autoplay: false });
  board.goto(3);
  board.setGames(showcase);
  assert.equal(board.state.game, 0);
  assert.equal(board.state.ply, 0, 'starts the new game from the beginning');
  assert.equal(dom.query(host, '.cm-picker').childNodes.length, 3);
  assert.equal(board.headers.White, 'Paul Morphy');
  // a single game leaves the picker in place but with one entry
  board.setGames(SHORT);
  assert.equal(dom.query(host, '.cm-picker').childNodes.length, 1);
  assert.equal(board.state.lastPly, 4);
});

test('destroy() empties the host and gives the element back', (t) => {
  const { host, board } = mount(t, { games: SHORT, autoplay: false });
  board.destroy();
  assert.equal(host.childNodes.length, 0);
  assert.equal(host.classList.contains('chessmen'), false);
});

// ---- appearance menus and the remember key --------------------------------------------

test('the appearance menus list every choice and apply it', (t) => {
  const { dom, host, board } = mount(t, { games: SHORT, autoplay: false, appearance: true });
  const menus = dom.queryAll(dom.query(host, '.cm-appearance'), '.cm-picker');
  assert.equal(menus.length, 3);
  const [schemeMenu, pieceMenu, colourMenu] = menus;
  assert.equal(schemeMenu.childNodes.length, Object.keys(SCHEMES).length);
  assert.equal(colourMenu.childNodes.length, Object.keys(PIECE_COLOURS).length);
  assert.equal(schemeMenu.value, 'mahogany');
  assert.equal(pieceMenu.value, 'classic-staunton');
  assert.equal(colourMenu.value, 'original');

  dom.change(schemeMenu, 'navy');
  assert.equal(board.appearance.scheme, 'navy');
  assert.ok(board.stage.svg().includes(SCHEMES.navy.dark));
  dom.change(colourMenu, 'amberSky');
  assert.equal(board.appearance.pieceColours, 'amberSky');
  // the menus follow changes made from script
  board.setScheme('green');
  assert.equal(schemeMenu.value, 'green');
});

test('appearance needs controls — documented, and a question in the PR', (t) => {
  const { dom, host } = mount(t, { games: SHORT, autoplay: false, appearance: true, controls: false });
  assert.equal(dom.query(host, '.cm-appearance'), null);
});

test('remember keeps the look in localStorage and reads it back', (t) => {
  const dom = withDOM(t);
  const host = dom.document.createElement('div');
  const first = create(host, { games: SHORT, autoplay: false, remember: 'look' });
  assert.equal(dom.localStorage.getItem('look'), null, 'nothing stored until something changes');

  first.setScheme('navy').setPieceColours('amberSky');
  assert.deepEqual(JSON.parse(dom.localStorage.getItem('look')), {
    scheme: 'navy', pieces: 'classic-staunton', pieceColours: 'amberSky',
  });

  // a later visit picks the stored look up, over the page's own options
  const second = create(dom.document.createElement('div'), {
    games: SHORT, autoplay: false, remember: 'look', scheme: 'classic', pieceColours: 'original',
  });
  assert.deepEqual(second.appearance, { scheme: 'navy', pieces: 'classic-staunton', pieceColours: 'amberSky' });

  // another key is a different visitor setting
  const third = create(dom.document.createElement('div'), { games: SHORT, autoplay: false, remember: 'other', scheme: 'oak' });
  assert.equal(third.appearance.scheme, 'oak');

  // custom objects can't round-trip through storage, so they are left out of it
  first.setScheme({ light: '#fff', dark: '#000', hlLight: ['#888', 0.5], hlDark: ['#888', 0.6] });
  assert.equal(JSON.parse(dom.localStorage.getItem('look')).scheme, undefined);
  assert.equal(typeof first.appearance.scheme, 'object');
});

test('without remember nothing is stored, and blocked storage is not fatal', (t) => {
  const dom = withDOM(t);
  create(dom.document.createElement('div'), { games: SHORT, autoplay: false }).setScheme('navy');
  assert.equal(dom.localStorage.size, 0);

  dom.localStorage.blocked = true;              // private mode: reads and writes throw
  const board = create(dom.document.createElement('div'), { games: SHORT, autoplay: false, remember: 'look' });
  board.setScheme('navy');
  assert.equal(board.appearance.scheme, 'navy');
});

// ---- the stage ------------------------------------------------------------------------

test('the bare stage steps, marks and flips', (t) => {
  const dom = withDOM(t);
  const el = dom.document.createElement('div');
  const stage = createStage(el, { pgn: SHORT, reducedMotion: true });
  assert.equal(dom.queryAll(el, 'BUTTON').length, 4);
  assert.deepEqual(stage.state, { ply: 0, orientation: 'white', variationOpen: false });
  stage.next();
  dom.frames();
  assert.equal(stage.state.ply, 1);
  assert.equal(stage.game.headers.White, 'A');

  stage.setMarks({ arrows: ['e2e4 blue'], circles: ['d5 red'], badges: [['e5', '!']] });
  const svg = stage.svg();
  assert.ok(svg.includes(MARK_COLORS.blue), 'arrow colour');
  assert.ok(svg.includes(MARK_COLORS.red), 'circle colour');
  assert.match(svg, /^<svg [^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  stage.clearMarks();
  assert.ok(!stage.svg().includes(MARK_COLORS.blue));

  stage.flip();
  assert.equal(stage.state.orientation, 'black');
  stage.setOrientation('white');
  assert.equal(stage.state.orientation, 'white');
  stage.last();
  assert.equal(stage.state.ply, 4);
  // controls: false leaves the buttons out
  const bare = dom.document.createElement('div');
  createStage(bare, { fen: MATE_FEN, controls: false });
  assert.equal(dom.queryAll(bare, 'BUTTON').length, 0);
});

test('the stage opens a variation over the board and closes it again', async (t) => {
  const dom = withDOM(t);
  const stage = createStage(dom.document.createElement('div'), { pgn: SHORT, reducedMotion: true });
  stage.goto(1);
  stage.openVariation({ after: 1, moves: ['c5', 'Nf3'], label: 'Sicilian' });
  assert.equal(stage.state.variationOpen, true);
  await settle(dom);
  assert.match(stage.svg(), /Sicilian/);
  stage.variationNext();
  await settle(dom);
  stage.closeVariation();
  await settle(dom);
  assert.equal(stage.state.variationOpen, false);
  assert.equal(stage.state.ply, 1, 'the main board stayed where it was');
  // a variation written in the PGN itself
  const withLine = createStage(dom.document.createElement('div'), {
    pgn: '1. e4 e5 2. Nf3 (2. d4 exd4) Nc6 *', reducedMotion: true,
  });
  withLine.openVariation({ pgnVariation: '2.Nf3' });
  await settle(dom);
  assert.match(withLine.svg(), /Instead of 2\.Nf3/);
});

test('listen() lets a parent window drive the stage by postMessage', (t) => {
  const dom = withDOM(t);
  const stage = createStage(dom.document.createElement('div'), { pgn: SHORT, reducedMotion: true });
  const target = dom.document.createElement('div');
  listen(stage, target);
  const replies = [];
  const send = (data) => target.dispatchEvent(new dom.Event('message', { data, source: { postMessage: (m) => replies.push(m) } }));

  send({ chessmen: 'goto', args: [2] });
  assert.equal(stage.state.ply, 2);
  assert.deepEqual(replies.at(-1), { chessmen: 'ok', method: 'goto', state: stage.state });

  send({ chessmen: 'setMarks', args: [{ circles: ['d5 red'] }] });
  assert.ok(stage.svg().includes(MARK_COLORS.red));

  send({ chessmen: 'goto', args: ['9.Qh5'] });
  assert.equal(replies.at(-1).chessmen, 'error');
  assert.match(replies.at(-1).message, /No ply 9\.Qh5/);

  const before = replies.length;
  send({ chessmen: 'nonsense' });
  send({});
  send(null);
  assert.equal(replies.length, before, 'unknown methods are ignored');
});

// ---- autoInit -------------------------------------------------------------------------

/** A scope that filters like the real `[data-chessmen]:not([data-chessmen-ready])` selector. */
const scopeOf = (...nodes) => ({ querySelectorAll: () => nodes.filter((n) => !n.hasAttribute('data-chessmen-ready')) });

test('autoInit mounts data-chessmen elements once, from a script child or the text', async (t) => {
  const dom = withDOM(t);
  const withScript = dom.document.createElement('div');
  withScript.setAttribute('data-chessmen', '{"autoplay":false,"interval":900}');
  const pgn = dom.document.createElement('script');
  pgn.setAttribute('type', 'application/x-chess-pgn');
  pgn.textContent = SHORT;
  withScript.appendChild(pgn);

  const withText = dom.document.createElement('div');
  withText.setAttribute('data-chessmen', '');
  withText.textContent = '1. d4 d5 2. c4 *';

  const scope = scopeOf(withScript, withText);
  const boards = await autoInit(scope);
  assert.equal(boards.length, 2);
  assert.deepEqual(boards.map((b) => b.state.lastPly), [4, 3]);
  assert.equal(boards[0].state.playing, false, 'options come from the attribute');
  assert.equal(withScript.getAttribute('data-chessmen-ready'), '');
  assert.deepEqual(await autoInit(scope), [], 'a mounted element is left alone');
});

test('autoInit reads a data-src PGN and a FEN', async (t) => {
  const dom = withDOM(t);
  const fetched = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => { fetched.push(url); return { text: async () => showcase }; };
  t.after(() => { globalThis.fetch = realFetch; });

  const node = dom.document.createElement('div');
  node.setAttribute('data-chessmen', '{"autoplay":false}');
  node.setAttribute('data-src', 'games/showcase.pgn');
  const [board] = await autoInit(scopeOf(node));
  assert.deepEqual(fetched, ['games/showcase.pgn']);
  assert.equal(board.headers.White, 'Paul Morphy');

  const diagram = dom.document.createElement('div');
  diagram.setAttribute('data-chessmen', '{"autoplay":false}');
  diagram.textContent = MATE_FEN;
  const [position] = await autoInit(scopeOf(diagram));
  assert.equal(position.state.lastPly, 0);
});
