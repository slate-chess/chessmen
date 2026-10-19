# Third-party notices and authorship for chessmen

## Authorship

chessmen is Copyright 2026 Linu Alex, licensed under Apache 2.0 (LICENSE, NOTICE). It was written by Linu
Alex for Slate Chess with AI assistance (Claude). That covers everything in `src/` (the board, the stage and the
core: board drawing, animation, arrows, variations, themes), `tools/`, `test/`, `demo.html` and `examples/`. The
board's look follows the Slate Chess app: its colour schemes are the app's values.

`games/showcase.pgn` holds three 19th-century games (Morphy 1858, Anderssen 1851 and 1852), whose moves are public
domain; the scores were entered by hand and checked move by move with chess.js, not copied from a database.

No GPL code is used: neither Lichess's GPL/AGPL front end nor its GPL `merida` piece set.

## chess.js (bundled in `dist/chessmen*.js` and `.mjs`)

The built files bundle **chess.js** 1.4.0 from npm by Jeff Hlywa and contributors (github.com/jhlywa/chess.js), BSD 2-Clause. It
provides the chess rules: legal moves, check and mate, castling and en passant, reading SAN moves, and the PGN
parser. chessmen uses it to turn a PGN into the positions it replays. BSD 2-Clause requires this notice to be
kept with the code; the build also writes it into each bundle as a `/*!` comment:

```
Copyright (c) 2025, Jeff Hlywa (jhlywa@gmail.com)
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
```

Text from the repository's `LICENSE` (copyright year as published there on 2026-10-15). The site's
acknowledgements page should carry it too.

## Piece sets in `src/pieces/` (built to `dist/pieces/`)

Generated from the Slate Chess app's piece artwork by `tools/build_pieces.py`.

### Modern Staunton (`modern-staunton`): BSD 3-Clause

After the chess pieces by Colin M. L. Burnett (Wikimedia Commons, 2006), offered under BSD 3-Clause, CC BY-SA 3.0,
GFDL 1.2 or GPLv2+; we elect BSD 3-Clause. Redrawn by Slate Chess so fills and lines take colours separately.

```
Copyright (c) 2006, Colin M. L. Burnett
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the
following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the
   following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the
   following disclaimer in the documentation and/or other materials provided with the distribution.
3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote
   products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### Classic Staunton (`classic-staunton`, also inside `dist/chessmen.all.js`): Unlicense

After Chess Mérida by Armando Hernández Marroquín (1998), via the `chess_merida_unicode` project
(mip.noekeon.org/HTMLTTChess/chess_merida_unicode.html), released under the Unlicense; adapted by Slate Chess for
the fill and line colours. This is not Lichess's GPL `merida` set, which is not used.
