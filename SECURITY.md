# Security policy

## Scope

chessmen is a browser widget. There is no server component, no account, no database and no user data: the
library runs entirely in the page that embeds it, and makes no network request of its own except fetching a PGN
from a URL the page author gives it with `data-src`.

So a vulnerability here means something the widget does to the page that embeds it, or to the person reading it.
In practice that is:

- **Injection.** PGN and FEN are untrusted input. A game whose headers, comments or move text cause script to run,
  or markup to escape into the host page, is a vulnerability.
- **Escaping the widget.** CSS or SVG from a position or a piece set that reaches beyond the board's own element.
- **Unexpected requests.** Anything that makes the library contact a host the page author did not name.
- **Tampered distribution.** A file in `dist/` that does not match the source in `src/`. CI rebuilds `dist/` on
  every change and fails if the result differs from what is committed.

Out of scope: bugs in a page that embeds the library, a PGN that renders wrongly but harmlessly, denial of service
from a pathological PGN you supply to your own page, and anything in chess.js (report those to
[chess.js](https://github.com/jhlywa/chess.js)).

## Reporting

Report privately through GitHub:
[**Report a vulnerability**](https://github.com/slate-chess/chessmen/security/advisories/new). Please do not open a
public issue for a security problem first.

Include the version you are on (`Chessmen.version` or the CDN URL), the browser, and a page or PGN that shows the
problem. We will acknowledge within a week, and tell you what we intend to do and when.

## Supported versions

Fixes go into the next release from `main`. Older versions are not patched: the library is one file with no
runtime dependencies, so moving to the current version is a URL change. Pinned CDN bytes never change under you,
which also means a pinned old version keeps any bug it shipped with — update to pick up a fix.
