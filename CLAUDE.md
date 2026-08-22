# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

A custom Tumblr theme for a Sims 2/3 simblr blog (`kate-j-xia`). Plain HTML/CSS/JS — no build
step, no package manager, no framework. The only test runner is `node js/theme.test.js`.

## Start here

1. `docs/superpowers/plans/2026-08-21-ref-html-replica.md` — **the active plan.** Its **Progress**
   section lists what's done, deviations, known issues, and a "How to resume" block.
   **Read it before touching anything.** Tasks 1–9 done except Step 10 of Task 9, which is the
   publish step (merge to `main`, push, paste `theme.html` into Tumblr) — the user's call.
2. `docs/superpowers/specs/2026-08-21-ref-html-replica-design.md` — the approved design behind it.
3. `docs/superpowers/plans/2026-08-21-theme-layout-and-pages.md` — the *earlier* plan. Tasks 1–6
   done; Tasks 7–9 (custom pages, doc refresh) are still open and unaffected by the newer plan.
4. `work-docs/GETTING_STARTED.md` — background and dev loop. Its "Next steps" are stale.

Working branch: `base-grid`. Main branch: `main`.

**Nothing is pushed.** `main` is ahead of `origin/main` and `base-grid` is ahead of `main`. CSS/JS
changes only reach the blog after merging to `main` and pushing, so *nothing done since the last
push is visible in Tumblr yet.* Pushing is the user's call.

## Local preview

`dev/preview.html` loads the real `css/*.css` and `js/theme.js` against placeholder posts, so most
changes can be checked without touching Tumblr:

```bash
python3 -m http.server 8765   # then open http://localhost:8765/dev/preview.html
```

Params: `?kind=tag&tag=ts2-legacies` (narrative), `?kind=tag&tag=ts2-builds` (catalog),
`?kind=permalink`. It cannot show `{LikeButton}`, `{PostNotes}`, the Lightbox, or real photosets.
`dev/` is never linked from `theme.html`.

## How Tumblr theming works here (the part that trips people up)

Tumblr hosts exactly **one HTML blob** — whatever is pasted into *Customize → Edit HTML*. That
blob is `theme.html`. Everything else is either linked from it or hand-copied into Tumblr:

| Path | Role | How Tumblr sees it |
|---|---|---|
| `theme.html` | The template. The **only** place `{block:...}` / `{Title}` / `{color:...}` tags work | Pasted into Tumblr's editor |
| `css/*.css`, `js/*.js` | Styles and behavior | Fetched by the browser from GitHub Pages. **Tumblr never processes these** |
| `pages/*.html` | Local backups of custom Tumblr Pages | Not fetched. Hand-copied into Settings → Pages |
| `ref*.html` | Reference themes to port *from* | Never shipped. See below |

**Critical consequence:** Tumblr template syntax in a CSS or JS file is never substituted — it's
served raw from GitHub Pages. A `{select:font size}` in a stylesheet is dead text, not a variable.
`ref*.html` uses that syntax heavily; every one must become a `:root` token when ported. Check with:
`grep -n '{[a-zA-Z]*:' css/*.css`

**Hosting:** GitHub Pages is live at `https://kate-j-xia.github.io/simblr/`, serving `main` at
root. Linked CSS/JS changes only reach the blog after merging to `main` — feature-branch work
won't show up in Tumblr.

## Architecture

- **`theme.html`** — one template for every view. It emits `data-page-kind` (`""` = home, `tag`,
  `permalink`) and `data-tag` on `section.posts`, then lets JS decide the layout. Note Tumblr
  counts tag pages as index pages, so `{block:IndexPage}` cannot distinguish home from tag — only
  `{block:TagPage}` and `{block:PermalinkPage}` are used to emit page kind. The post loop follows
  `ref.html`'s structure: content, then a `.when` footer carrying date, attribution, and tags.
  There is **no post header** — no avatar or username above the post, by design.
- **`js/theme.js`** — pure, tested functions (`getLayoutBucket`, `resolveLayout`, `getPostsToHide`,
  `getPhotosetRows`) plus DOM wiring. On load it runs dedup → photoset rows → layout, in that
  order; each step changes post height and Masonry must measure last. A sidebar toggle writes a
  grid/list override per bucket under
  `simblr-layout`. Masonry is initialized/destroyed as layout changes.
- **CSS is split by concern**, linked from `theme.html` in this order (tokens must be first):
  - `css/tokens.css` — `:root` custom properties. The only place to change palette or typeface.
  - `css/base.css` — reset, body typography, links, scrollbar. No layout, no components.
  - `css/layout.css` — sidebars, posts container and rail, Masonry grid, pagination, responsive.
  - `css/posts.css` — post-card internals (titles, media, photoset rows, trail, tags, `.when`,
    asks, chat, notes).
  - `css/dark.css` — empty. Dark mode not started; it should only need to override tokens.
- **`dev/preview.html`** — local harness. Never linked from `theme.html`.

Layout defaults: home → grid, catalog tag → grid, narrative tag → one column, permalink → one
column. Narrative tags are listed in `NARRATIVE_TAGS` in `js/theme.js`; that list only sets the
*default*, never a hard rule.

## Gotchas that have already caused bugs

- **`class="posts"` is on both the `<section>` and every `<article>`.** Always element-qualify:
  `section.posts` vs `article.posts`. A bare `.posts { opacity: 0 }` rule once hid every post.
- **Masonry column sizer must equal item width.** Masonry fits columns as
  `containerWidth / (colSizer + gutter)`. A `50%` sizer plus a gutter overflows and silently
  collapses the grid to one column with no error. `.grid__col-sizer` and `.grid__item` are both
  `calc(50% - 20px)` — change them together.
- **The feed is `opacity: 0` until JS adds `.is-loaded`.** A `reveal-failsafe` keyframe reveals it
  after 3s so a failed `theme.js` request can't leave the blog permanently blank. Keep that
  failsafe if you touch the reveal logic.
- **Never put a blanket `img` rule in `layout.css`.** `.grid .grid__item img` (specificity 0-2-1)
  outranks `posts.css`'s `.when img` (0-1-1) and blows the inline footer avatars up to full card
  width. That was the "avatars are huge" bug. Post image sizing belongs to `posts.css` only.
- **Masonry positions with percentage `left`, not `transform`,** because `percentPosition: true`.
  It also lays out asynchronously via `imagesLoaded`. Measuring `getBoundingClientRect()` right
  after load shows every item at the same x and looks like a collapsed grid — it isn't. Wait for
  layout, or read `Masonry.data(section).items[i].position`.
- **The rail is list-mode only.** `section.posts:not(.grid)` owns the `border-left` and
  `padding-left`; `section.posts:not(.grid) ~ .pagination` mirrors them so Previous/Next line up
  with the post text. That sibling selector depends on `.pagination` following `section.posts`.
- **Photoset rows depend on `data-layout`, not `layout`.** The ref3 markup used a bare `layout`
  attribute; `getPhotosetRows` reads `dataset.layout`. A malformed layout string returns `[]` and
  leaves the images stacked rather than throwing.
- **Every code path out of `initLayout()` must add `.is-loaded`.** The permalink early-return once
  skipped it, so permalink pages stayed blank until the 3s failsafe fired.
- **Icons are Material Icons**, linked in `<head>`. The post markup originally used `mageicons`
  (from `ref3.html`) whose stylesheet was never loaded, so all six icons rendered as nothing.
- **`{LikeButton}` and `Tumblr.Lightbox.init(...)` can only be tested inside Tumblr.**

## Conventions

- Vendor libraries are self-hosted in `js/vendor/` (downloaded from unpkg), never CDN-linked.
  Fonts and Material Icons are the deliberate exceptions.
- CSS custom properties are lowercase and hyphenated: `--primary-bg-color`, `--muted-text-color`.
- Keep `{block:X}` / `{/block:X}` balanced. Quick check:
  `for tag in Posts IndexPage TagPage PermalinkPage; do echo "$tag $(grep -o "{block:$tag}" theme.html | wc -l)/$(grep -o "{/block:$tag}" theme.html | wc -l)"; done`
- Verify JS with `node --check js/theme.js` and `node js/theme.test.js` before committing.

## Reference themes

`ref.html` is the visual base, and `theme.html`'s post markup now follows its structure. Its inline
CSS has been ported into `css/tokens.css`, `base.css`, `layout.css`, and `posts.css`.

`ref3.html` supplied the post markup that was **replaced** in commit `764b339` — treat any
resemblance to it as vestigial, and don't port more from it without a reason. It is a different
theme with a different structure (post headers, pill buttons, `ph-inner`/`qa-set`/`ans-flex`
wrappers) that `ref.html` does not have. `ref2`/`ref4` remain secondary references.

These are self-contained single files with inline `<style>`/`<script>`, i.e. the opposite of this
project's split architecture. **They are not drop-in material.** Port a snippet by translating its
class names and colors into this project's token system and placing it in the right file. Note
that `ref*.html` CSS uses Tumblr customizer syntax (`{color:background}`) directly — that must
become a `:root` custom property here, since external CSS is never templated.
