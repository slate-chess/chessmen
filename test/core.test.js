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
  run(after, 'dist/chessmen.js');
  assert.deepEqual(ev(after, 'Chessmen.pieceSets()'), []);
  run(after, 'dist/pieces/modern-staunton.js');
  run(after, 'dist/pieces/classic-staunton.js');
  assert.deepEqual(ev(after, 'Chessmen.pieceSets()'), [
    { id: 'classic-staunton', label: 'Classic Staunton', licence: 'Unlicense' },
    { id: 'modern-staunton', label: 'Modern Staunton', licence: 'BSD-3-Clause' },
  ]);

  const before = browserContext();
  run(before, 'dist/pieces/modern-staunton.js');
  run(before, 'dist/chessmen.js');
  assert.deepEqual(ev(before, 'Chessmen.pieceSets().map(p => p.id)'), ['modern-staunton']);
  assert.match(ev(before, 'Chessmen.boardDocument({ fen: Chessmen.START_FEN }, Chessmen.resolveTheme({ pieceSet: "modern-staunton" }))'), /<symbol id="cs-wK"/);
});

test('the one-tag build carries Classic Staunton and the stylesheet', () => {
  const ctx = browserContext();
  run(ctx, 'dist/chessmen.all.js');
  assert.deepEqual(ev(ctx, 'Chessmen.pieceSets().map(p => p.id)'), ['classic-staunton']);
  assert.equal(ev(ctx, 'Chessmen.schemes().length'), 20);
  const all = read('dist/chessmen.all.js');
  assert.ok(all.includes('.chessmen .cm-bar'), 'CSS is inlined');
  assert.ok(all.includes('chessmen-css'));
});

test('dist has no companion set and keeps the licence notices', () => {
  const files = fs.readdirSync(path.join(root, 'dist'), { recursive: true }).filter((f) => /\.(m?js|css)$/.test(f));
  assert.ok(files.length >= 8);
  for (const f of files) {
    const text = read(path.join('dist', f));
    assert.ok(!/companion/i.test(text), `${f} mentions companion`);
    if (/^chessmen\.(js|mjs|all\.js)$/.test(f)) {
      assert.ok(text.startsWith('/*! chessmen '), `${f} banner`);
      assert.ok(text.includes('Copyright (c) 2025, Jeff Hlywa'), `${f} keeps the chess.js notice`);
      assert.ok(text.includes('THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS'), `${f} keeps the chess.js disclaimer`);
    }
  }
  // A copied dist/ is a redistribution on its own: BSD-3-Clause wants the notice, the three
  // conditions and the disclaimer in the file, not a pointer to a document left behind.
  const notices = read('THIRD-PARTY-NOTICES.md');
  const bsd = notices.slice(notices.indexOf('Copyright (c) 2006, Colin M. L. Burnett'));
  const clause3 = bsd.slice(0, bsd.indexOf('```')).match(/3\. Neither the name[^\n]*/)[0];
  for (const f of ['pieces/modern-staunton.js', 'pieces/modern-staunton.mjs']) {
    const text = read(path.join('dist', f));
    assert.ok(text.includes('Copyright (c) 2006, Colin M. L. Burnett'), `${f} keeps the Burnett notice`);
    assert.ok(text.includes('Redistribution and use in source and binary forms'), `${f} keeps the conditions`);
    assert.ok(text.includes(clause3), `${f} keeps the non-endorsement clause, verbatim from the notices file`);
    assert.ok(text.includes('THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS'), `${f} keeps the disclaimer`);
  }
  // The Unlicense carries no conditions, so Classic Staunton has nothing to reproduce.
  assert.ok(!read('dist/pieces/classic-staunton.js').includes('Redistribution and use'),
    'classic-staunton should not claim a licence it is not under');

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

// ---- edges ----------------------------------------------------------------

test('splitPGN: only a blank line before a tag pair splits games', () => {
  assert.deepEqual(SC.splitPGN('   \n\n  \n '), []);
  // No tag pair after the blank line, so it is one game with a gap in the movetext.
  assert.deepEqual(SC.splitPGN('1. e4\n\n1. d4'), ['1. e4\n\n1. d4']);
  assert.equal(SC.splitPGN('[Event "a"]\n\n1. e4\n\n2. d4 *').length, 1);
  assert.equal(SC.splitPGN('[Event "a"]\n\n1. e4\n\n\n\n[Event "b"]\n\n1. d4').length, 2);
  assert.equal(SC.splitPGN('\n\n[Event "a"]\n\n1. e4\n').length, 1, 'leading blank lines');
  assert.equal(SC.splitPGN('[Event "a"]\r\n\r\n1. e4\r\n\r\n[Event "b"]\r\n\r\n1. d4').length, 2);
  assert.deepEqual(SC.splitPGN('  1. e4  '), ['1. e4'], 'each game is trimmed');
});

test('isFEN wants all eight ranks, and never throws on odd input', () => {
  assert.ok(SC.isFEN(SC.START_FEN));
  assert.ok(SC.isFEN('  8/8/8/8/8/8/8/K6k  '), 'trimmed first');
  assert.ok(SC.isFEN('8/8/8/8/8/8/8/K6k w - - 0 1'));
  assert.ok(!SC.isFEN('8/8/8/8/8/8/K6k'), 'seven ranks');
  assert.ok(!SC.isFEN('8/8/8/8/8/8/8/K6k/8'), 'nine ranks');
  assert.ok(!SC.isFEN('9/9/9/9/9/9/9/9'), '9 is not a run length');
  assert.ok(!SC.isFEN('8/8/8/8/8/8/8/K6kw - - 0 1'), 'the side to move needs a space');
  assert.ok(!SC.isFEN(''));
  assert.ok(!SC.isFEN('1. e4 e5 2. Nf3'));
  assert.ok(!SC.isFEN('[Event "x"]\n\n1. e4'));
  for (const odd of [undefined, null, 0, 12345678, {}, []]) assert.ok(!SC.isFEN(odd), String(odd));
});

test('toGames: empty input, placement-only FENs, labels and arrays', () => {
  for (const empty of [undefined, null, '', '   ', []]) assert.deepEqual(SC.toGames(empty), [], String(empty));
  // A placement-only FEN gains White to move; a full one is only trimmed.
  assert.deepEqual(SC.toGames([{ fen: '8/8/8/8/8/8/8/K6k', label: 'K' }]), [{ fen: '8/8/8/8/8/8/8/K6k w - - 0 1', label: 'K' }]);
  assert.deepEqual(SC.toGames(' 8/8/8/8/8/8/8/K6k b - - 4 9 '), [{ fen: '8/8/8/8/8/8/8/K6k b - - 4 9' }]);
  const entry = { pgn: '1. e4', label: 'x' };
  assert.deepEqual(SC.toGames([entry]), [entry], 'a PGN entry passes through');
  assert.deepEqual(SC.toGames(SC.START_FEN), [{ fen: SC.START_FEN }]);
  assert.deepEqual(SC.toGames('[Event "a"]\n\n1. e4\n\n[Event "b"]\n\n1. d4').map((g) => g.pgn.slice(0, 11)), ['[Event "a"]', '[Event "b"]']);
  // Inside an array each item is one game: a multi-game string is left whole.
  assert.equal(SC.toGames(['[Event "a"]\n\n1. e4\n\n[Event "b"]\n\n1. d4']).length, 1);
  // Every result is something loadGame accepts.
  for (const g of SC.toGames([SC.START_FEN, '1. e4 e5', { fen: '8/8/8/8/8/8/8/K6k' }])) assert.ok(SC.loadGame(g).startFen);
});

test('findPly and fenAt at the edges of a game', () => {
  const g = SC.loadGame('1. e4 e5 2. Nf3 Nc6 *');
  assert.equal(SC.fenAt(g, 0), SC.START_FEN);
  assert.equal(SC.fenAt(g, -5), SC.START_FEN, 'before the start');
  assert.equal(SC.fenAt(g, 99), SC.fenAt(g, 4), 'past the end is the last position');
  assert.equal(SC.plyRecord(g, 99), null);
  assert.equal(SC.findPly(g, 3), 3, 'a number passes through');
  assert.equal(SC.findPly(g, '3'), 3);
  assert.equal(SC.findPly(g, '2.Nf3'), 3);
  assert.equal(SC.findPly(g, '2...Nc6'), 4);
  assert.equal(SC.findPly(g, 'Nf3'), 3, 'a unique SAN needs no number');
  assert.throws(() => SC.findPly(g, '9.Qh5'), /No ply 9\.Qh5/);
  assert.throws(() => SC.findPly(g, 'Qh5'), /matches 0 moves/);
  const twice = SC.loadGame('1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 *');
  assert.throws(() => SC.findPly(twice, 'Nf3'), /matches 2 moves; add the move number/);
  assert.equal(SC.findPly(twice, '3.Nf3'), 5);
  // A game that starts from a black-to-move FEN numbers its first ply 2.
  const black = SC.loadGame({ pgn: '[FEN "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"]\n\n1... e5 *' });
  assert.equal(black.plies[0].ply, 2);
  assert.equal(SC.moveLabel(black.plies[0]), '1...e5');
});

test('resolveTheme fills the gaps without touching the defaults', () => {
  const t = SC.resolveTheme();
  assert.equal(t.scheme, 'mahogany');
  assert.equal(t.colors, SC.SCHEMES.mahogany);
  assert.equal(t.tint, null, 'original keeps the artwork colours');
  assert.deepEqual(
    [t.coordinates, t.lastMove, t.frame, t.pieceScale, t.moveDuration, t.pieceSet],
    ['inside', 'arrow', true, 0.9, 0.42, 'classic-staunton'],
    'the defaults the README documents',
  );
  const over = SC.resolveTheme({ scheme: 'navy', frame: false, moveDuration: 0.1 });
  assert.equal(over.colors.light, SC.SCHEMES.navy.light);
  assert.equal(over.coordinates, 'inside', 'keys left out keep their default');
  // undefined means "not specified", not "clear the default"
  assert.equal(SC.resolveTheme({ scheme: undefined, frame: undefined }).frame, true);
  assert.equal(SC.DEFAULT_THEME.colors, undefined, 'DEFAULT_THEME is not mutated');
  assert.equal(SC.DEFAULT_THEME.frame, true);
  // Re-resolving a resolved theme (what stage.setTheme does) picks up the new scheme.
  const again = SC.resolveTheme({ ...over, scheme: 'green', colors: undefined, tint: undefined });
  assert.equal(again.colors, SC.SCHEMES.green);
  assert.equal(again.frame, false, 'and keeps the rest of the theme');
  // Custom scheme and tint objects are used as given.
  const custom = { light: '#fff', dark: '#000', hlLight: ['#888', 0.5], hlDark: ['#888', 0.6] };
  assert.equal(SC.resolveTheme({ scheme: custom }).colors, custom);
  assert.deepEqual(SC.resolveTheme({ pieceColours: { light: '#1', dark: '#2' } }).tint, { light: '#1', dark: '#2' });
  assert.throws(() => SC.resolveTheme({ scheme: 'bogus' }), /Unknown colour scheme "bogus"\. Known: mahogany/);
  assert.throws(() => SC.resolveTheme({ pieceColours: 'bogus' }), /Unknown piece colours "bogus"/);
});

test('every scheme has a usable highlight pair, and every mark colour is a hex', () => {
  for (const id of Object.keys(SC.SCHEMES)) {
    const c = SC.resolveTheme({ scheme: id }).colors;
    for (const k of ['hlLight', 'hlDark']) {
      assert.match(c[k][0], /^#[0-9a-f]{6}$/i, `${id}.${k}`);
      assert.ok(c[k][1] > 0 && c[k][1] <= 1, `${id}.${k} opacity`);
    }
  }
  for (const [name, hex] of Object.entries(SC.MARK_COLORS)) assert.match(hex, /^#[0-9a-f]{6}$/i, name);
});

test('the theme decides whether the last move is an arrow, a highlight or neither', () => {
  SC.registerPieceSet(classic);
  const g = SC.loadGame('1. e4');
  const draw = (lastMove) => SC.boardSVG({ fen: SC.fenAt(g, 1), lastMove: SC.plyRecord(g, 1) },
    SC.resolveTheme({ lastMove, pieceSet: 'classic-staunton' }), { size: 400, idp: 't' });
  const arrowFill = `fill="${SC.MARK_COLORS.green}"`;
  const hl = SC.SCHEMES.mahogany.hlLight[0];      // e2 and e4 are both light squares
  assert.ok(draw('arrow').includes(arrowFill) && !draw('arrow').includes(hl));
  assert.ok(!draw('highlight').includes(arrowFill) && draw('highlight').includes(hl));
  assert.ok(draw('both').includes(arrowFill) && draw('both').includes(hl));
  assert.ok(!draw('none').includes(arrowFill) && !draw('none').includes(hl));
  // Coordinates: inside and outside draw the labels, anything else leaves them out.
  const coords = (coordinates) => SC.boardSVG({ fen: SC.START_FEN },
    SC.resolveTheme({ coordinates, pieceSet: 'classic-staunton' }), { size: 400, idp: 't' });
  for (const on of ['inside', 'outside']) assert.ok(coords(on).includes('>a</text>'), on);
  assert.ok(!coords('none').includes('>a</text>'));
});
