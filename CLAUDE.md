# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

A custom Tumblr theme for a Sims 2/3 simblr blog (`kate-j-xia`). Plain HTML/CSS/JS — no build
step, no package manager, no framework. The only test runner is `node js/theme.test.js`.

## Start here

1. `work-docs/GETTING_STARTED.md` — current state, decisions, dev loop, next steps.
2. `docs/superpowers/plans/2026-08-21-theme-layout-and-pages.md` — the active implementation plan.
   Its **Progress** section lists what's done, deviations from the plan as written, and known
   issues. **Read it before continuing work.** Tasks 1–3 done; resume at Task 4.
3. `docs/superpowers/specs/2026-08-21-theme-layout-and-pages-design.md` — the approved design and
   the reasoning behind it.

Working branch: `base-grid`. Main branch: `main`.

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
served raw from GitHub Pages. `{select:font size}` in `css/base.css` is dead text, not a variable.
(There's one such leftover at `css/base.css:13`.)

**Hosting:** GitHub Pages is live at `https://kate-j-xia.github.io/simblr/`, serving `main` at
root. Linked CSS/JS changes only reach the blog after merging to `main` — feature-branch work
won't show up in Tumblr.

## Architecture

- **`theme.html`** — one template for every view. It emits `data-page-kind` (`""` = home, `tag`,
  `permalink`) and `data-tag` on `section.posts`, then lets JS decide the layout. Note Tumblr
  counts tag pages as index pages, so `{block:IndexPage}` cannot distinguish home from tag — only
  `{block:TagPage}` and `{block:PermalinkPage}` are used to emit page kind.
- **`js/theme.js`** — two pure, tested functions (`getLayoutBucket`, `resolveLayout`) map page kind
  + tag to `home`/`narrative`/`catalog`/`permalink` and pick grid-vs-list from a `localStorage`
  override or the bucket default. A sidebar toggle writes the override per bucket under
  `simblr-layout`. Masonry is initialized/destroyed as layout changes.
- **`css/base.css`** — `:root` tokens, body typography, grid, responsive, icons, toggle. The
  `ref.html` visual port (sidebar/nav/pagination chrome, post-card typography) is **not done yet**.
- **`css/dark.css`** — empty. Dark mode not started.

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

`ref.html` is the visual base — layout, spacing, fonts, and post-card content structure (where
likes/profile/date sit). `ref2`/`ref3`/`ref4` are secondary references for individual features.

These are self-contained single files with inline `<style>`/`<script>`, i.e. the opposite of this
project's split architecture. **They are not drop-in material.** Port a snippet by translating its
class names and colors into this project's token system and placing it in the right file. Note
that `ref*.html` CSS uses Tumblr customizer syntax (`{color:background}`) directly — that must
become a `:root` custom property here, since external CSS is never templated.
