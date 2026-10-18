// Copyright 2026 Linu Alex. SPDX-License-Identifier: Apache-2.0
// Builds dist/ with esbuild:
//   pgn-replay.js      one <script>, global PgnReplay (bring your own piece set and CSS)
//   pgn-replay.mjs     ES module, same API, no auto-mounting
//   pgn-replay.all.js  one <script> with the CSS and Classic Staunton built in
//   pgn-replay.css     the stylesheet
//   pieces/<name>.js         a script that registers the set; pieces/<name>.mjs exports it
// chess.js is bundled from node_modules with its BSD 2-Clause notice kept in the output.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const board = fs.readFileSync(path.join(root, 'src/board.js'), 'utf8').match(/VERSION = '([^']+)'/)[1];
if (board !== version) throw new Error(`package.json says ${version} but src/board.js says ${board}`);

const banner = `/*! PGN Replay ${version} | Copyright 2026 Linu Alex | Apache-2.0 | https://slatechess.com\n`
  + ' * Keep the NOTICE file with any copy or derivative (Apache 2.0, section 4(d)). Source: src/ in the package. */';

// chess.js ships without a licence comment in its code, so attach its LICENSE as a legal comment.
const chessLicense = fs.readFileSync(path.join(root, 'node_modules/chess.js/LICENSE'), 'utf8').trim();
const chessVersion = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/chess.js/package.json'), 'utf8')).version;
const chessNotice = {
  name: 'chess-js-notice',
  setup(b) {
    b.onLoad({ filter: /node_modules[\\/]chess\.js[\\/].*\.js$/ }, (args) => ({
      contents: `/*! chess.js ${chessVersion}, https://github.com/jhlywa/chess.js\n${chessLicense}\n*/\n` + fs.readFileSync(args.path, 'utf8'),
      loader: 'js',
    }));
  },
};

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'pieces'), { recursive: true });

const common = {
  bundle: true, minify: true, target: 'es2020', legalComments: 'inline', banner: { js: banner },
  plugins: [chessNotice], loader: { '.css': 'text' }, absWorkingDir: root, logLevel: 'warning',
};
await build({ ...common, entryPoints: ['src/browser.js'], format: 'iife', globalName: 'PgnReplay', outfile: 'dist/pgn-replay.js' });
await build({ ...common, entryPoints: ['src/index.js'], format: 'esm', outfile: 'dist/pgn-replay.mjs' });
await build({ ...common, entryPoints: ['src/all.js'], format: 'iife', globalName: 'PgnReplay', outfile: 'dist/pgn-replay.all.js' });

const css = fs.readFileSync(path.join(root, 'src/pgn-replay.css'), 'utf8').replace(/^\/\*.*?\*\/\n/s, '');
fs.writeFileSync(path.join(dist, 'pgn-replay.css'), banner + '\n' + css);

for (const f of fs.readdirSync(path.join(root, 'src/pieces')).filter((f) => f.endsWith('.js'))) {
  const name = f.replace(/\.js$/, '');
  // Loaded after the library it registers at once; loaded before, the library picks it up from the global.
  await build({
    ...common, banner: undefined, format: 'iife', outfile: `dist/pieces/${name}.js`,
    stdin: {
      contents: `import set from './src/pieces/${f}';\nconst S = globalThis.PgnReplay;\nif (S && S.registerPieceSet) S.registerPieceSet(set);\n(globalThis.PgnReplayPieceSets ||= {})[set.name] = set;`,
      resolveDir: root, loader: 'js',
    },
  });
  await build({ ...common, banner: undefined, entryPoints: [`src/pieces/${f}`], format: 'esm', outfile: `dist/pieces/${name}.mjs` });
}

for (const f of fs.readdirSync(dist, { recursive: true }).filter((f) => /\.(m?js|css)$/.test(f)).sort()) {
  console.log(`dist/${f}`.padEnd(36), `${(fs.statSync(path.join(dist, f)).size / 1024).toFixed(1)} KB`);
}
