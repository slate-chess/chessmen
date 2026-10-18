// Copyright 2026 Linu Alex. SPDX-License-Identifier: Apache-2.0
// Run with `npm test` (builds dist/ first) or `node --test test/*.test.js` after `npm run build`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import * as SC from '../src/index.js';
import classic from '../src/pieces/classic-staunton.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const showcase = read('games/showcase.pgn');

// The app's BoardColorScheme cases, in its order (Shared/BoardColorScheme.swift).
const APP_ORDER = ['mahogany', 'classic', 'teal', 'green', 'blue', 'cyan', 'red', 'oak', 'walnut', 'carrara', 'slate',
  'midnight', 'sage', 'mustard', 'terracotta', 'blackWhite', 'ember', 'espresso', 'graphite', 'navy'];

test('splitPGN splits a multi-game file and normalises line endings', () => {
  const games = SC.splitPGN(showcase);
  assert.equal(games.length, 3);
  for (const g of games) assert.match(g, /^\[Event /);
  assert.equal(SC.splitPGN(showcase.replace(/\n/g, '\r\n')).length, 3);
  assert.deepEqual(SC.splitPGN('1. e4 e5'), ['1. e4 e5']);
  assert.deepEqual(SC.splitPGN(''), []);
});

test('loadGame reads headers, moves, comments, NAGs and variations', () => {
  const ends = SC.splitPGN(showcase).map((pgn) => {
    const g = SC.loadGame({ pgn });
    return [g.headers.White, g.result, SC.moveLabel(SC.plyRecord(g, SC.lastPly(g)))];
  });
  assert.deepEqual(ends, [['Paul Morphy', '1-0', '17.Rd8#'], ['Adolf Anderssen', '1-0', '23.Be7#'], ['Adolf Anderssen', '1-0', '24.Bxe7#']]);

  const v = SC.loadGame('1. e4 e5 2. Nf3 {develops} Nc6!? (2... d6 3. d4) 3. Bb5 $1 *');
  assert.equal(v.plies.length, 5);
  assert.equal(v.plies[2].comment, 'develops');
  assert.equal(v.plies[3].glyph, '!?');
  assert.equal(v.plies[4].glyph, '!');
  assert.deepEqual(v.plies[3].variations[0].map((m) => m.san), ['d6', 'd4']);
  assert.equal(SC.findPly(v, '2...Nc6'), 4);
  assert.throws(() => SC.findPly(v, '2...Nf6'), /game has 2...Nc6/);
  assert.throws(() => SC.loadGame('1. e4 e5 2. Ke3'), /Illegal/);
});

test('loadGame starts from a FEN', () => {
  const fen = '8/8/8/8/8/8/4K3/4k3 b - - 0 1';
  assert.equal(SC.loadGame({ fen }).startFen, fen);
  assert.equal(SC.fenAt(SC.loadGame({ fen }), 0), fen);
});

test('the 20 colour schemes are the app\'s, in its order, each with a label', () => {
  assert.deepEqual(Object.keys(SC.SCHEMES), APP_ORDER);
  assert.deepEqual(SC.schemes().map((s) => s.id), APP_ORDER);
  for (const s of SC.schemes()) {
    assert.ok(SC.SCHEME_LABELS[s.id], s.id);
    assert.match(s.light, /^#[0-9a-f]{6}$/);
    assert.match(s.dark, /^#[0-9a-f]{6}$/);
  }
  assert.equal(SC.DEFAULT_THEME.scheme, 'mahogany');
  // With the app's source at hand (SLATE_APP, as for tools/build_pieces.py), check it still has this order.
  const swift = process.env.SLATE_APP && path.join(process.env.SLATE_APP, 'Shared/BoardColorScheme.swift');
  if (swift && fs.existsSync(swift)) {
    const cases = [...fs.readFileSync(swift, 'utf8').matchAll(/^\s*case (\w+) = "/gm)].map((m) => m[1]);
    assert.deepEqual(cases, APP_ORDER);
  }
});

test('boardSVG draws squares, pieces and the last-move arrow', () => {
  SC.registerPieceSet(classic);
  const g = SC.loadGame('1. e4');
  const theme = SC.resolveTheme({ pieceSet: 'classic-staunton', scheme: 'navy' });
  const svg = SC.boardSVG({ fen: SC.fenAt(g, 1), lastMove: SC.plyRecord(g, 1) }, theme, { size: 400, idp: 't' });
  assert.equal((svg.match(/<use href="#t-/g) || []).length, 32);
  assert.ok(svg.includes(SC.SCHEMES.navy.dark));
  assert.ok(svg.includes(`fill="${SC.MARK_COLORS.green}"`));
  const doc = SC.boardDocument({ fen: SC.START_FEN }, theme, 240);
  assert.match(doc, /^<svg [^>]*viewBox="0 0 240 240"/);
  assert.equal((doc.match(/<symbol /g) || []).length, 12);
  assert.throws(() => SC.boardDocument({ fen: SC.START_FEN }, SC.resolveTheme({ pieceSet: 'nope' })), /Unknown piece set "nope"/);
});

// ---- built files ----------------------------------------------------------

function browserContext() {
  const ctx = { console, queueMicrotask, setTimeout, clearTimeout };
  ctx.window = ctx; ctx.globalThis = ctx;
  return vm.createContext(ctx);
}
const run = (ctx, f) => vm.runInContext(read(f), ctx, { filename: f });
// Values from the context come from another realm; compare them as JSON.
const ev = (ctx, code) => JSON.parse(vm.runInContext(`JSON.stringify(${code})`, ctx));

test('piece-set scripts register, loaded after or before the library', () => {
  const after = browserContext();
  run(after, 'dist/pgn-replay.js');
  assert.deepEqual(ev(after, 'PgnReplay.pieceSets()'), []);
  run(after, 'dist/pieces/modern-staunton.js');
  run(after, 'dist/pieces/classic-staunton.js');
  assert.deepEqual(ev(after, 'PgnReplay.pieceSets()'), [
    { id: 'classic-staunton', label: 'Classic Staunton', licence: 'Unlicense' },
    { id: 'modern-staunton', label: 'Modern Staunton', licence: 'BSD-3-Clause' },
  ]);

  const before = browserContext();
  run(before, 'dist/pieces/modern-staunton.js');
  run(before, 'dist/pgn-replay.js');
  assert.deepEqual(ev(before, 'PgnReplay.pieceSets().map(p => p.id)'), ['modern-staunton']);
  assert.match(ev(before, 'PgnReplay.boardDocument({ fen: PgnReplay.START_FEN }, PgnReplay.resolveTheme({ pieceSet: "modern-staunton" }))'), /<symbol id="cs-wK"/);
});

test('the one-tag build carries Classic Staunton and the stylesheet', () => {
  const ctx = browserContext();
  run(ctx, 'dist/pgn-replay.all.js');
  assert.deepEqual(ev(ctx, 'PgnReplay.pieceSets().map(p => p.id)'), ['classic-staunton']);
  assert.equal(ev(ctx, 'PgnReplay.schemes().length'), 20);
  const all = read('dist/pgn-replay.all.js');
  assert.ok(all.includes('.pgn-replay .sb-bar'), 'CSS is inlined');
  assert.ok(all.includes('pgn-replay-css'));
});

test('dist has no companion set and keeps the licence notices', () => {
  const files = fs.readdirSync(path.join(root, 'dist'), { recursive: true }).filter((f) => /\.(m?js|css)$/.test(f));
  assert.ok(files.length >= 8);
  for (const f of files) {
    const text = read(path.join('dist', f));
    assert.ok(!/companion/i.test(text), `${f} mentions companion`);
    if (/^pgn-replay\.(js|mjs|all\.js)$/.test(f)) {
      assert.ok(text.startsWith('/*! PGN Replay '), `${f} banner`);
      assert.ok(text.includes('Copyright (c) 2025, Jeff Hlywa'), `${f} keeps the chess.js notice`);
      assert.ok(text.includes('THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS'), `${f} keeps the chess.js disclaimer`);
    }
  }
  for (const f of ['src', 'tools'].flatMap((d) => fs.readdirSync(path.join(root, d), { recursive: true }).map((x) => path.join(d, x)))) {
    if (/\.(m?js|css|py)$/.test(f)) {
      const text = read(f);
      assert.ok(/Copyright 2026 Linu Alex|Licence: (Unlicense|BSD-3-Clause)/.test(text.slice(0, 400)), `${f} header`);
      assert.ok(!/companion/i.test(text), `${f} mentions companion`);
    }
  }
});

test('the library is board UI only: no video, narration or timeline code', () => {
  const src = fs.readdirSync(path.join(root, 'src'), { recursive: true }).filter((f) => /\.(js|css)$/.test(f) && !f.startsWith('pieces'));
  for (const f of src) {
    const text = read(path.join('src', f));
    assert.ok(!/timeline|director|narration|AudioContext|caption|youtube|studio|\bvideo\b/i.test(text), `src/${f} has video code`);
  }
  assert.ok(!fs.existsSync(path.join(root, 'src/timeline.js')));
});

test('parseMarks reads every shorthand and rejects bad squares', () => {
  assert.deepEqual(SC.parseMarks({ arrows: ['e2e4 blue', ['g1', 'f3']], circles: ['d5 red'], badges: [['e5', '!']] }), {
    arrows: [{ from: 'e2', to: 'e4', color: 'blue' }, { from: 'g1', to: 'f3', color: undefined }],
    highlights: [], circles: [{ square: 'd5', color: 'red' }], badges: [{ square: 'e5', glyph: '!' }],
  });
  assert.throws(() => SC.parseMarks({ circles: ['z9'] }), /Bad square/);
});

test('FEN input: isFEN and toGames tell positions from PGN', () => {
  const fen = 'r1bk3r/p2pBpNp/n4n2/1p1NP2P/6P1/3P4/P1P1K3/q5b1 b - - 1 23';
  assert.ok(SC.isFEN(fen));
  assert.ok(SC.isFEN('8/8/8/8/8/8/8/K6k'));
  assert.ok(!SC.isFEN('1. e4 e5'));
  assert.ok(!SC.isFEN(showcase));
  assert.deepEqual(SC.toGames(fen), [{ fen }]);
  assert.deepEqual(SC.toGames('8/8/8/8/8/8/8/K6k'), [{ fen: '8/8/8/8/8/8/8/K6k w - - 0 1' }]);
  assert.deepEqual(SC.toGames([fen, '1. e4 e5', { fen, label: 'Mate' }]).map((g) => Object.keys(g).join()), ['fen', 'pgn', 'fen,label']);
  assert.equal(SC.toGames(showcase).length, 3);
  const g = SC.loadGame(SC.toGames(fen)[0]);
  assert.equal(SC.lastPly(g), 0);
  assert.equal(SC.fenAt(g, 0), fen);
  assert.throws(() => SC.loadGame(SC.toGames('8/8/8/8/8/8/8/9')[0] ?? { fen: 'bad' }));
});
