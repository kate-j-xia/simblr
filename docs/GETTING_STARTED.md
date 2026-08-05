# Getting Started

A working guide for picking this project back up: how the pieces fit together, how to actually
execute a change, and where your ideas should land in the file structure.

## 1. Current state of the project

```
theme.html            → <head>: meta/customizer fields, viewport, font links, and placeholder
                         <link>/<script> tags for base/dark/js (need real URLs once GitHub Pages
                         is live — see §4). <body>: both sidebars done, plus a full posts loop
                         (photo, photoset, video, text, quote, answer, caption, date/tags/notes,
                         pagination). No CSS classes styled yet — markup only.
css/base.css           → started: typography layer (font, base colors — still raw hex, not yet
                          converted to CSS custom properties)
css/dark.css            → empty (created; supersedes the earlier css/light.css plan)
js/theme.js              → empty
pages/downloads.html    → empty
pages/nav.html           → empty
docs/README.md           → one-line placeholder
ref.html, ref2.html      → untracked reference copies (see §3)
```

Branch: `feature/base`. Repo is now **public**, so GitHub Pages hosting (§4) is unblocked.

## 1a. Decisions made so far

- **Layout + aesthetic split**: building `ref.html`'s grid-style layout, but keeping `ref2.html`'s
  typography/color aesthetic (uppercase small-caps nav, dotted underlines, muted palette). These
  are separable — layout mechanism vs. design tokens — so no conflict.
- **Grid technique**: **Magic Grid** (MIT licensed, npm/CDN library — download and self-host the
  file in this repo rather than pull from a CDN, consistent with how `css/`/`js/` are hosted).
  Chosen over pure CSS Grid for true masonry-style packing (variable post heights, no dead space),
  and over Griddery (smaller community, though its attribution-required license turned out fine).
  Trade-off accepted: need to handle the load-then-snap flicker — posts render, then reposition
  once images load and Magic Grid measures them — using its `.onReady()`/`.onPositionComplete()`
  callbacks.
- **Dark mode file split**: two files (`css/base.css` + `css/dark.css`) rather than one file with
  `:root`/`[data-theme="dark"]` variable blocks. Confirm this is still what you want before writing
  much dark-mode CSS — switching approaches gets more annoying the more CSS you write against one.
- **Repo visibility**: flipped public (was going to stay private until polished) — needed for
  GitHub Pages on a free plan.

## 2. How the pieces connect

Tumblr only ever hosts **one HTML blob** — whatever you paste into *Customize → Edit HTML*. That
blob is `theme.html`. Everything else in this repo exists to be either *linked from* that file or
*copy-pasted into Tumblr's dashboard by hand*:

| File/folder | What it's for | How Tumblr sees it |
|---|---|---|
| `theme.html` | The main feed template — the only place Tumblr's templating tags (`{block:Posts}`, `{Title}`, etc.) work | Pasted directly into Tumblr's Edit HTML box |
| `css/*.css` | Your stylesheets | **Not** pasted in — linked via `<link href="...">` in `theme.html`'s `<head>`, pointing at a hosted URL (see §4) |
| `js/theme.js`, Magic Grid | Dark-mode toggle, grid layout, any interactivity | Same — linked via `<script src="...">`, not inlined |
| `assets/fonts`, `assets/images` | Self-hosted font files, banner, icons | Referenced by URL from your CSS (`@font-face`, `background-image`, etc.) |
| `pages/*.html` | Local backups of custom Tumblr **Pages** (Downloads, Legacy nav) | Tumblr does **not** fetch these. You manually copy the body content into Settings → Pages in Tumblr's dashboard. These files are version control for that content, nothing more. |
| `docs/` | Your own documentation | Never touches Tumblr at all |

**The one thing that trips people up**: editing `css/base.css` does nothing to your live Tumblr
blog by itself. It only takes effect once (a) that file is hosted somewhere Tumblr can fetch it,
and (b) `theme.html`'s `<head>` links to that hosted URL.

## 3. How this differs from `ref.html` / `ref2.html`

Those reference files are the opposite architecture: **one self-contained file**, CSS inlined in a
`<style>` block, JS inlined in a `<script>` block, plus Tumblr-CDN-hosted scripts. That's why they
"just work" if pasted whole into Tumblr — nothing to host separately.

Your project deliberately splits that apart for maintainability (separate concerns, dark-mode
variables, no jQuery). Practical implication: **`ref.html`/`ref2.html` are not drop-in material.**
When you find a piece you want (a specific post-type block, a CSS rule, an icon), you port it —
copy the relevant snippet, translate class names/colors into your system, place it in the right
file from the table above. Don't link to them or expect them to run as part of your build.

## 4. Hosting — GitHub Pages

Repo is public now, so this is unblocked. To finish wiring it up:

1. Repo Settings → Pages → Deploy from branch → `main`, root (or `/docs` if you'd rather keep the
   site source separate from documentation — up to you, just be consistent).
2. Once live, your files are reachable at `https://<username>.github.io/simblr/css/base.css` etc.
3. Replace the three placeholder `href`/`src` values in `theme.html` (lines ~33–35) with the real
   URLs.
4. Consider a cache-busting query string (`?v=2`) when you update CSS/JS post-launch, since browsers
   (and Tumblr's own caching) may hold onto old versions otherwise.

## 5. The actual dev loop

1. Edit files locally (`css/`, `js/`, `theme.html`, `pages/`) in your editor.
2. For CSS/JS-only changes (dark-mode toggle, grid behavior, spacing, colors) — test in a plain
   browser tab with placeholder HTML that skips Tumblr's `{block:...}` tags. Fast iteration, no
   Tumblr needed.
3. For anything involving the post loop (`{block:Posts}` and friends) — paste `theme.html` into
   Tumblr's *Customize → Edit HTML*, use its live preview against your real posts. This is the only
   place those tags actually render.
4. Commit locally, push to your feature branch, open a PR into `main` when a chunk is done (feature
   branch per chunk, PR to self-review, merge, delete branch — per your git workflow notes).
5. Once GitHub Pages is enabled (§4), pushing to `main` is what makes your *linked* CSS/JS changes
   show up live on Tumblr — no copy-paste needed for those, only for `theme.html` itself and the
   contents of `pages/*.html`.

## 6. Next steps

In order — each one roughly matches the "layers" approach for CSS (tokens → base → layout →
components → responsive) discussed earlier:

1. **Enable GitHub Pages and wire up the real URLs** in `theme.html` (§4). Do this before writing
   much more CSS/JS so you're not testing against placeholder paths.
2. **Design tokens**: add a CSS custom properties block to `css/base.css` — colors, font(s),
   spacing scale, pulled from `ref2.html`'s palette. Convert the two hardcoded hex colors already
   in `css/base.css` (`#111111`, `#ffffff`) into variables as part of this.
3. **Finish the base layer**: reset + typography rules in `css/base.css`, referencing the new
   variables — port from `ref2.html`'s "basics" section.
4. **Page skeleton + grid**: sidebar positioning, content area, and the Magic Grid container setup
   — download Magic Grid into the repo, wire up its init call in `js/theme.js` (or a dedicated
   `js/grid.js` if you'd rather keep concerns separated), including the fade-in-after-`onReady()`
   handling to avoid the load flicker.
5. **Post component styling**: style `.entry`, `.title`, `.date`, `.tags`, `.media`, etc. — the
   classes already exist in `theme.html`'s posts loop, so this is pure CSS, one component group at
   a time, checking each against Tumblr's live preview as you go.
6. **Dark mode**: fill in `css/dark.css` with the dark-palette variable overrides, then write
   `js/theme.js`'s toggle logic (button handler, `localStorage`, `prefers-color-scheme` default).
7. **Responsive breakpoints**: adjust the grid/sidebar for mobile — only once the desktop version
   feels right.
8. **Custom pages**: draft `pages/downloads.html` (Sims 2 / Sims 3 sections, tag filtering) and
   `pages/nav.html` (legacy/playthrough index), then hand-copy into Tumblr's Pages editor.
9. **Polish + docs**: cross-device check, screenshots, fill out `docs/README.md` with install
   instructions.

## 7. Timeline / goals

Loosely paced — sessions, not calendar dates, since this is relaxed alongside other work:

| Milestone | Covers | Status |
|---|---|---|
| Foundation | Repo, folder structure, `<head>` scaffolding, posts-loop markup | ✅ done |
| Hosting live | GitHub Pages enabled, real URLs in `theme.html` | ⬜ next up |
| Visual base | Design tokens, typography, base layout | ⬜ |
| Grid | Magic Grid wired up, flicker handled, looks right on real posts | ⬜ |
| Post styling | All post types styled and checked against live Tumblr preview | ⬜ |
| Dark mode | Toggle working, persists, respects system preference | ⬜ |
| Responsive | Mobile breakpoints | ⬜ |
| Custom pages | Downloads (S2/S3 + tags), Legacy nav | ⬜ |
| Publish | Docs finished, polish pass, live on Tumblr | ⬜ |

A reasonable near-term goal: get through **Hosting live → Grid** as one push, since those three
build directly on each other (can't meaningfully test the grid without real hosted CSS/JS URLs) —
that gets you to a genuinely visible, working feed for the first time, which is usually the most
motivating point to reach.

## 8. "I have an idea — which file do I touch?"

| Your idea is about... | Touch this file |
|---|---|
| Colors, fonts, spacing, light/dark palette | `css/base.css` (shared rules + tokens) or `css/dark.css` (dark overrides) |
| Toggle behavior, search, grid layout, any interactivity | `js/theme.js` (or a separate `js/grid.js` for Magic Grid setup) |
| New post-type layout, sidebar/nav structure, anything using post data | `theme.html` — the only file where `{block:...}` tags work |
| Downloads page content or layout | `pages/downloads.html` (then hand-copy into Tumblr) |
| Legacy/playthroughs nav content | `pages/nav.html` (then hand-copy into Tumblr) |
| Fonts/banner/icons themselves (the asset files) | `assets/fonts/`, `assets/images/` |
| Notes on how to install / what you did | `docs/README.md` |

If an idea touches more than one row (e.g. "add a tag-filter chip system to Downloads"), that's
normal — split it into pieces per file (markup in `pages/downloads.html`, styling in `css/base.css`,
filter logic in `js/theme.js`) rather than trying to do it all in one place.
