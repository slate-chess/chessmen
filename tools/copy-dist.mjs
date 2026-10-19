// Copyright 2026 Linu Alex. SPDX-License-Identifier: Apache-2.0
// Copies what a site serves into a folder, keeping this repo's layout so every relative link works:
//   npm run build && npm run copy -- ../my-site/chessmen
// dist/ and examples/ are replaced whole; other files in the folder are left alone.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = process.argv[2];
if (!dest) { console.error('usage: node tools/copy-dist.mjs <folder>'); process.exit(1); }
if (!fs.existsSync(path.join(root, 'dist/chessmen.all.js'))) { console.error('dist/ is missing: run npm run build'); process.exit(1); }

const ITEMS = ['dist', 'examples', 'games', 'demo.html', 'llms.txt', 'README.md', 'CHANGELOG.md', 'LICENSE', 'NOTICE', 'THIRD-PARTY-NOTICES.md'];
fs.mkdirSync(dest, { recursive: true });
for (const item of ITEMS) {
  const to = path.join(dest, item);
  if (item === 'dist' || item === 'examples') fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(path.join(root, item), to, { recursive: true });
}
console.log(`copied ${ITEMS.join(', ')} to ${path.resolve(dest)}`);
