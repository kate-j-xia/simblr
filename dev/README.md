# Dev preview harness

Local-only. Never linked from `theme.html`, never copied into Tumblr.

Open `dev/preview.html` directly in a browser (`file://` works — no server needed).
It loads the real `css/*.css` and `js/theme.js` by relative path against placeholder
posts that mimic Tumblr's rendered output.

URL params:

- `kind` — `` (home, the default), `tag`, or `permalink`
- `tag` — the tag name, for exercising narrative vs catalog buckets

Examples:

- `preview.html` — home feed, defaults to grid
- `preview.html?kind=tag&tag=ts2-legacies` — narrative tag, defaults to one column
- `preview.html?kind=tag&tag=ts2-builds` — catalog tag, defaults to grid
- `preview.html?kind=permalink` — permalink, one column

What it CANNOT show: `{LikeButton}`, `{PostNotes}`, `Tumblr.Lightbox`, and real
photoset markup. Those only exist inside Tumblr.
