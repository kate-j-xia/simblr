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

Working branch: **`main`**. `base-grid` is fully merged into it and is now stale — check
`git branch --show-current` rather than trusting this line.

**Nothing is pushed.** `main` is ahead of `origin/main`. CSS/JS changes only reach the blog after
pushing `main`, so *nothing done since the last push is visible in Tumblr yet.* Pushing is the
user's call.

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

**There are TWO customizer bridges, light and dark.** The light one sets `:root` and sits after
`tokens.css` / before `dark.css`. The dark one sets `:root[data-theme="dark"]` and must sit
**after `dark.css`** — both are 0-2-0 against it, so document order is the only thing deciding, and
a dark bridge placed earlier silently does nothing. `dark.css` holds the defaults that
`dev/preview.html` and any non-Tumblr context see; the bridge overrides them on the live blog, so
the `<meta content="...">` defaults must be kept equal to the values in `dark.css`.

**Every token the light bridge sets explicitly must be restated in `dark.css`,** derived or not.
`tokens.css` derives `--icon-color` from `--primary-text-color` via `color-mix`, but the light
bridge assigns it a literal, which then outranks the derivation and survives into dark mode.
That shipped once as `#6b6b6b` icons on `#16151a` — 3.41:1. Only `--muted-text-color` and
`--quiet-text-color` are safe to leave derived, because no bridge touches them. Check parity with:
```bash
python3 - <<'PY'
import re
src=open('theme.html').read()
n=[m.group(1) for m in re.finditer(r'name="color:([^"]+)"', src)]
light=[x for x in n if not x.lower().startswith('dark')]
dark=[x[5:].strip().lower() for x in n if x.lower().startswith('dark')]
print("no dark partner:", [x for x in light if x.lower() not in dark] or "none")
PY
```

**Why they exist at all:** the bridges assign `{color:...}` values to the `:root` tokens, and they
are the *only* place Tumblr's Customize panel can reach the token system, precisely because
`theme.html` is the only templated file.

**Adding a colour** means editing three things — the `<meta name="color:...">` list, the light
bridge, *and* the dark bridge — then re-pasting `theme.html`. A tweak to an *existing* field's
value in the Customize panel needs neither a push nor a re-paste. Verify nothing is orphaned:
```bash
diff <(grep -o 'name="color:[^"]*"' theme.html | sed 's/name="color://;s/"//' | sort) \
     <(sed -n '/<style>/,/<\/style>/p' theme.html | grep -o '{color:[^}]*}' | sed 's/{color://;s/}//' | sort)
```

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
- **Dark mode lives in two places on purpose.** `resolveTheme()` in `js/theme.js` is the real
  logic, but it is *duplicated* in an inline `<script>` in `theme.html`'s `<head>`. That copy has
  to exist: `theme.js` is deferred, so it runs after first paint and the page would flash light
  before going dark, and `{block:ifDarkDefault}` is a Tumblr tag that only substitutes inside
  `theme.html`. The inline snippet resolves the theme, writes `data-theme` on `<html>`, and hands
  the blog-level default to `theme.js` via `data-theme-default`. **Change one, change both.**
  Precedence: reader's stored choice (`simblr-theme`) → blog "Dark default" option → OS
  `prefers-color-scheme`.
- **`section.prefs` in the sidebar is the reader-settings group**, not navigation. Each row is a
  `.pref-toggle` button: a constant `.pref-label` naming the setting, and a `.pref-icon` whose
  `FILL` axis carries on/off, driven by `aria-pressed`. There are two rows — `.layout-toggle` and
  `.theme-toggle` — and **a third setting is one more copied button plus a handler**. Do not
  invent a second control shape for it, and do not go back to labels that flip between states, or
  the rows will look identical while meaning different things. Only `.layout-toggle` is wrapped in
  `{block:IndexPage}`: a permalink has no grid to switch to, but it *is* where an external link
  lands, so dark mode has to be reachable there.
- **CSS is split by concern**, linked from `theme.html` in this order (tokens must be first):
  - `css/tokens.css` — `:root` custom properties. The only place to change palette or typeface.
  - `css/base.css` — reset, body typography, links, scrollbar. No layout, no components.
  - `css/layout.css` — sidebars, posts container and rail, Masonry grid, pagination, responsive.
  - `css/posts.css` — post-card internals (titles, media, photoset rows, trail, tags, `.when`,
    asks, chat, notes).
  - `css/dark.css` — token overrides only, under `:root[data-theme="dark"]`. **Never a bare
    `[data-theme="dark"]`**: it ties with the customizer block in `theme.html` at 0-1-0 and loses
    on document order, so dark mode renders light with no error. Verified — the bare selector
    genuinely fails. If a dark rule needs a selector other than `:root[data-theme="dark"]`, the
    colour it wants is missing from `tokens.css` and belongs there.
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
- **`hidden` loses to any author `display` rule.** `.pref-toggle` sets `display: flex`, which is
  author-origin and so beats the UA stylesheet's `[hidden] { display: none }` outright — specificity
  never enters into it. `layout.css` carries an explicit `.pref-toggle[hidden] { display: none }`
  to restore it. Without that the toggles stay visible when `theme.js` fails to load, which makes a
  total script failure look like a broken click handler. Any new JS-revealed control needs the same
  rule.
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
- **Icons are Material *Symbols*** (variable axes `opsz,wght,FILL,GRAD`), linked in `<head>` — not
  the legacy Material Icons. Google's own `.material-symbols-outlined` rule hardcodes
  `font-size: 24px`, so `.post-btns .post-icon` must stay specific enough to override it. The post
  markup originally used `mageicons` (from `ref3.html`) whose stylesheet was never loaded, so all
  six icons rendered as nothing — a wrong icon *name* fails the same way, as literal text.
- **The like button is a glyph under Tumblr's control, not a button.** `{LikeButton}` renders
  Tumblr's own widget, which can't be restyled; it's stretched invisibly over the `cloud` glyph so
  Tumblr handles the click. The liked state fills the same glyph via `'FILL' 1` rather than
  swapping icons. None of this can be tested outside Tumblr.
- **Tags render on permalink pages only** (`{block:PermalinkPage}` inside `.when`), so the feed
  stays clean while tag pages remain reachable by click. Note count is not rendered at all.
- **`{LikeButton}` and `Tumblr.Lightbox.init(...)` can only be tested inside Tumblr.**

## Conventions

- Vendor libraries are self-hosted in `js/vendor/` (downloaded from unpkg), never CDN-linked.
  Fonts and Material Icons are the deliberate exceptions.
- CSS custom properties are lowercase and hyphenated: `--primary-bg-color`, `--muted-text-color`.
- Keep `{block:X}` / `{/block:X}` balanced. Quick check — note the `[ }]`, which is what lets it
  see parameterised openers like `{block:JumpPagination length="5"}`:
  ```bash
  for tag in Posts IndexPage TagPage PermalinkPage Pagination JumpPagination Date HasTags Tags; do
    o=$(grep -o "{block:${tag}[ }]" theme.html | wc -l | tr -d ' ')
    c=$(grep -o "{/block:${tag}}" theme.html | wc -l | tr -d ' ')
    [ "$o" != "$c" ] && echo "MISMATCH $tag: open=$o close=$c"
  done; echo "balance ok"
  ```
  The `${tag}` braces are required: this shell is zsh, where a bare `$tag[...]` parses as array
  subscripting and the loop dies with "bad math expression" while still printing `balance ok`.

  Add every `if:` option you use to that tag list — the default list above does not cover them.
- **Never write a block tag inside an HTML comment.** Tumblr substitutes template tags across the
  raw text of `theme.html` and has no concept of comments, so an opener written in prose is a
  *real* opener and pairs with the next real closer. This has already broken the theme once: a
  comment explaining `ifDarkDefault` (written with braces) paired with the closer in the script
  below it, and when the option was off Tumblr deleted the span between them — which contained the
  comment's `-->` and the `<script>` open tag. The comment ran on and swallowed all three script
  tags, so no JavaScript loaded at all and both sidebar toggles rendered inert.

  A mismatch reported by the check above **is not a false positive just because the extra tag is
  in a comment** — that is exactly the bug. Name tags without braces in prose (`ifDarkDefault`,
  not `{block:ifDarkDefault}`). To confirm a suspected break, simulate the substitution and parse
  the result rather than eyeballing it:
  ```bash
  python3 - <<'PY'
  from html.parser import HTMLParser
  src = open('theme.html').read()
  o = src.index('{block:ifDarkDefault}'); c = src.index('{/block:ifDarkDefault}')
  rendered = src[:o] + src[c+len('{/block:ifDarkDefault}'):]   # option OFF
  class P(HTMLParser):
      def __init__(s): super().__init__(); s.n=0
      def handle_starttag(s,t,a):
          if t=='script': s.n+=1
  p=P(); p.feed(rendered); print('script tags surviving:', p.n)   # expect 4
  PY
  ```
- Verify JS with `node --check js/theme.js` and `node js/theme.test.js` before committing.
- **Check that every `var(--x)` resolves.** A misspelled custom property does not error — it falls
  back to the initial value, so the rule appears to do nothing for no visible reason. This caught a
  real bug where `--post-link-underline-color` was referenced but `--link-underline-color` defined:
  ```bash
  comm -13 <(grep -oh -- '--[a-z-]*:' css/*.css | sed 's/:$//' | sort -u) \
           <(grep -oh 'var(--[a-z-]*' css/*.css | sed 's/var(//' | sort -u)
  ```
  Prints nothing when clean; any line is a token referenced but never defined.
- **Colour fields must be wired twice.** Every `<meta name="color:X">` in `theme.html` needs a
  matching entry in the inline `<style>` block, or the picker appears in Tumblr and does nothing:
  ```bash
  diff <(grep -o 'name="color:[^"]*"' theme.html | sed 's/name="color://;s/"//' | sort) \
       <(sed -n '/<style>/,/<\/style>/p' theme.html | grep -o '{color:[^}]*}' | sed 's/{color://;s/}//' | sort)
  ```

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
