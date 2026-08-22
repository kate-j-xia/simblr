# ref.html Replica Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reproduce `ref.html`'s visual design in this project's split HTML/CSS/JS architecture, with markup and stylesheets organized cleanly enough to build on for years.

**Architecture:** `theme.html`'s ref3-derived post loop (~330 lines) is replaced with `ref.html`'s 45-line structure, reformatted for readability and extended with a kept-from-ref3 button row. `css/base.css` splits into four concern-scoped files (`tokens`, `base`, `layout`, `posts`) plus the existing empty `dark.css`, all linked from `theme.html`'s `<head>` in that order. Photoset row layout, which `ref.html` delegates to jQuery + pxuphotoset, becomes one pure tested function in `js/theme.js` plus DOM wiring. The Task 1–4 Masonry grid and reader toggle survive unchanged; `ref.html`'s left rail applies in list mode only.

**Tech Stack:** Vanilla HTML/CSS/JS, Tumblr classic theme templating, Masonry v4 + imagesLoaded (self-hosted in `js/vendor/`), Google Fonts (Lora + Lato + Material Icons), plain Node `assert` for the pure functions. No build step, no package manager.

**Spec:** `docs/superpowers/specs/2026-08-21-ref-html-replica-design.md`

## Progress — read this first

**All tasks are done and committed** on branch `base-grid`, except **Task 9 Step 10** — the
publish step (merge to `main`, push, paste `theme.html` into Tumblr), which is the user's call.

Nothing has been pushed. `main` is 18 commits ahead of `origin/main` and `base-grid` is ahead of
`main` — see "How to resume" below for the exact sequence.

### Verified working in the local harness (`dev/preview.html`, desktop 1280px)

- Grid mode: two columns at x=375 and x=842, 427px each. Masonry positions via percentage `left`,
  not `transform` — measure with `getBoundingClientRect()` *after* layout settles, or you will
  misread a race as a broken grid.
- Photosets: `data-layout="21"` with three images renders a row of two (211px each in grid,
  248px in list) then one full-width image, in both grid and list mode.
- Permalink, narrative tag, catalog tag, home, and the sub-700px breakpoint all resolve to the
  documented layout, and the toggle choice survives a reload.
- List mode: rail at 100px inset, feed width 500px, pagination text aligned to the post text at
  476px (both clear the 1px rail border).
- Post cards match `ref.html`: uppercase letter-spaced title with a full-measure underline, Lora
  body copy, muted uppercase `.when` footer, 17px round inline avatar, tag glyph + tags, and the
  three-icon button row rendering as real Material Icons.

### Deviations from the plan as written

1. **Tasks 4–7 were committed as one commit (`764b339`), not four.** The old ref3 wrappers
   interleaved (header → date → body → footer), so a staged replacement would have left the
   template malformed between commits for no review benefit.
2. **`.grid .grid__item img { width: 100% }` was deleted from `layout.css`.** It has specificity
   0-2-1 and outranked `posts.css`'s `.when img` (0-1-1), so the footer avatar stayed full card
   width — the original complaint. Post image sizing is now entirely `posts.css`'s job
   (`.ph > img`, `.ph > a > img`, `.photo-row img`). **Do not reintroduce a blanket `img` rule in
   `layout.css`.**
3. **Pagination gained a list-mode rail.** Task 3 as written left pagination 100px left of the
   post text. Fixed with `section.posts:not(.grid) ~ .pagination`, which adds `padding-left` and a
   `border-left`, forming the L that `ref.html`'s footer has. Relies on `.pagination` being a
   *sibling following* `section.posts` — it is, at the end of the template.
4. **A duplicate `{block:PostNotes}` block was removed** from `theme.html`. It was present twice
   and would have rendered the notes list twice on permalink pages. Pre-existing, unrelated to
   this plan.
5. **`.claude/launch.json` was added** so the preview harness can be served over HTTP
   (`python3 -m http.server 8765`) rather than `file://`, which is what the preview tooling needs.
   A second `preview-alt` config on port 8766 was added later, for when 8765 is already taken.
6. **Task 9's CSS audit found two gaps rather than dead ref3 rules.** The three "styled but never
   emitted" selectors (`grid`, `photo-row`, `tmblr-full`) are all added at runtime, so nothing was
   deleted. Instead: `initLayout()`'s permalink early-return never added `.is-loaded`, leaving
   permalink pages blank until the 3s failsafe fired; and `.side` (the optional right-sidebar
   image) had no width constraint. Both fixed.
7. **`CLAUDE.md` and `GETTING_STARTED.md` were updated surgically, not wholesale.** The versions
   in the repo had already outgrown the replacement text this plan specified in Task 9 Steps 4–6.

### How to resume

```bash
cd /Users/kate/projects/simblr
git checkout base-grid          # already there
node js/theme.test.js           # layout + dedup + photoset tests should pass
python3 -m http.server 8765     # then open http://localhost:8765/dev/preview.html
```

Only Task 9 Step 10 remains. **That is the only step that touches the live blog**, and pushing is
the user's call, not the agent's.

### Known issues / not yet verified

- **Nothing has been seen inside Tumblr yet.** `{LikeButton}`, `{PostNotes}`, `Tumblr.Lightbox`,
  and real photoset markup cannot be exercised by the harness.
- **`{block:Answer}` uses `{Replies}`**, carried over from `ref.html`. Unverified against current
  Tumblr templating — check it renders on a real ask post.
- The harness's Material Icons briefly render as ligature text (`link repeat favorite_border`)
  before the icon font loads. Cosmetic, harness-only.

## Global Constraints

- No new build tooling, package manager, or test framework.
- Vendor libraries stay self-hosted in `js/vendor/`. Fonts and Material Icons are the only CDN exceptions.
- **No Tumblr template syntax in any `.css` or `.js` file.** Tumblr substitutes `{block:X}`, `{color:X}`, `{select:X}` only inside `theme.html`; external files are served raw from GitHub Pages, where those are dead text. Every `{color:x}` in `ref.html`'s CSS becomes a `:root` token.
- **Element-qualify ambiguous selectors.** `class="posts"` is on both the `<section>` and every `<article>`. Always write `section.posts` / `article.posts`. A bare `.posts { opacity: 0 }` once hid every post.
- CSS custom properties are lowercase and hyphenated: `--primary-bg-color`, `--muted-text-color`.
- CSS formatting: one declaration per line, one selector per line in a selector list, 4-space indent, lowercase hex. Every file opens with a comment naming what it owns; every section gets a banner comment.
- No `!important` except to override Tumblr's own injected styles; comment why when used.
- Keep `{block:X}` / `{/block:X}` balanced in `theme.html`.
- The Masonry column sizer must equal item width: `.grid__col-sizer` and `.grid__item` are both `calc(50% - 20px)`. Change them together or the grid silently collapses to one column.
- Verify with `node --check js/theme.js` and `node js/theme.test.js` before every commit.
- GitHub Pages serves `main` at root. Linked CSS/JS changes only reach Tumblr after merging to `main`.

---

### Task 1: Rebuild the local preview harness  ✅ DONE

**Files:**
- Create: `dev/preview.html`
- Create: `dev/fixtures.js`
- Create: `dev/README.md`

**Interfaces:**
- Produces: `dev/preview.html`, a static page that loads the real `css/*.css` and `js/theme.js` by relative path against placeholder posts. Every later task uses it to verify visually without merging to `main`. Supports `?kind=` (`home`, `tag`, `permalink`) and `?tag=` URL params to exercise the layout buckets.

**Context:** The spec (§7) names manual remote verification as the top risk: every visual check otherwise costs a merge to `main` plus a paste into Tumblr. A harness was built earlier this project and removed at the user's request; the user has now approved rebuilding it. It is a dev tool only — never linked from `theme.html`, never shipped to Tumblr.

The harness mimics *Tumblr's rendered output*, not `theme.html`'s template source. It must reproduce the two attributes `js/theme.js` reads (`data-page-kind`, `data-tag` on `section.posts`) and the sizer divs Masonry measures.

- [x] **Step 1: Create the dev directory and the harness page**

Create `dev/preview.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>simblr theme preview</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;600;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">

    <link href="../css/tokens.css" rel="stylesheet">
    <link href="../css/base.css" rel="stylesheet">
    <link href="../css/layout.css" rel="stylesheet">
    <link href="../css/posts.css" rel="stylesheet">
    <link href="../css/dark.css" rel="stylesheet">
</head>
<body>
    <aside id="sidebar-left">
        <a href="/"><img class="avatar" src="https://placehold.co/128x128/eeeeee/999999.png" alt=""></a>
        <h1 class="title"><a href="/">kate j xia</a></h1>
        <div class="description">a sims 2 and 3 simblr. builds, legacies, and downloads.</div>
        <nav class="menu">
            <li><a href="#">home</a></li>
            <li><a href="#">ask</a></li>
            <li><a href="#">navigation</a></li>
            <li><a href="#">downloads</a></li>
            <li><button type="button" class="layout-toggle" hidden>grid view</button></li>
        </nav>
    </aside>

    <section class="posts" data-page-kind="" data-tag="">
        <div class="grid__col-sizer"></div>
        <div class="grid__gutter-sizer"></div>
    </section>

    <footer class="pagination">
        <a href="#">Previous page</a>
        <a href="#">Next page</a>
    </footer>

    <script src="../js/vendor/masonry.pkgd.min.js"></script>
    <script src="../js/vendor/imagesloaded.pkgd.min.js"></script>
    <script src="fixtures.js"></script>
    <script src="../js/theme.js"></script>
</body>
</html>
```

Note the scripts are NOT `defer` here and `fixtures.js` runs before `theme.js`: the fixtures must be in the DOM before `theme.js` measures them.

- [x] **Step 2: Create the fixture data**

Create `dev/fixtures.js`:
```javascript
/* Dev-only. Injects placeholder posts that mimic Tumblr's rendered output,
   so css/ and js/ can be checked without pasting theme.html into Tumblr. */

const params = new URLSearchParams(location.search);
const section = document.querySelector('section.posts');
section.dataset.pageKind = params.get('kind') || '';
section.dataset.tag = params.get('tag') || '';

function img(w, h) {
    return `https://placehold.co/${w}x${h}/eeeeee/999999.png`;
}

const POSTS = [
    `<div class="title">A text post with a title</div>
     <li class="comment">Body copy for the text post. It should wrap across a
     couple of lines so line-height and measure are visible.</li>`,

    `<div class="media"><div class="ph"><img src="${img(500, 700)}" alt=""></div></div>
     <li class="comment"><a href="#" class="user">someblog</a>A photo caption.</li>`,

    `<div class="media"><div class="ph">
       <div class="photo-slideshow" data-layout="21">
         <img src="${img(500, 400)}" alt=""><img src="${img(500, 400)}" alt="">
         <img src="${img(500, 300)}" alt="">
       </div></div></div>`,

    `<div class="quote title">A pull quote, set larger than body copy.</div>
     <div class="source">— someone</div>`,

    `<div class="q"><span class="as">anon sent: </span>Do you take build requests?</div>
     <li class="comment"><span class="user">kate replied: </span>Sometimes!</li>`,

    `<ol class="chat">
       <li class="l"><span class="label">A:</span> first line</li>
       <li class="l"><span class="label">B:</span> second line</li>
     </ol>`,
];

const FOOTER = `
    <div class="when">
        Posted on <a href="#">August 21st, 2026</a>
        <span class="ca"><img src="${img(40, 40)}" alt=""></span>
        originally by <a href="#">someblog</a>
        <div class="tags">
            <a href="#">ts2 builds</a><a href="#">download</a>
        </div>
    </div>
    <div class="post-btns">
        <a href="#"><span class="material-icons post-icon">chat_bubble_outline</span> 42</a>
        <a href="#"><span class="material-icons post-icon">repeat</span></a>
        <a href="#"><span class="material-icons post-icon">favorite_border</span></a>
    </div>`;

POSTS.forEach((body, i) => {
    const article = document.createElement('article');
    article.className = 'posts';
    article.id = `post-${i}`;
    article.setAttribute('root-url', `https://example.com/post/${i}`);
    article.dataset.tags = '';
    article.innerHTML = body + FOOTER;
    section.appendChild(article);
});
```

- [x] **Step 3: Document the harness**

Create `dev/README.md`:
```markdown
# Dev preview harness

Local-only. Never linked from `theme.html`, never copied into Tumblr.

Open `dev/preview.html` directly in a browser (`file://` works — no server needed).
It loads the real `css/*.css` and `js/theme.js` by relative path against placeholder
posts that mimic Tumblr's rendered output.

URL params:

- `?kind=` — `` (home, the default), `tag`, or `permalink`
- `?tag=` — the tag name, for exercising narrative vs catalog buckets

Examples:

- `preview.html` — home feed, defaults to grid
- `preview.html?kind=tag&tag=ts2-legacies` — narrative tag, defaults to one column
- `preview.html?kind=tag&tag=ts2-builds` — catalog tag, defaults to grid
- `preview.html?kind=permalink` — permalink, one column

What it CANNOT show: `{LikeButton}`, `{PostNotes}`, `Tumblr.Lightbox`, and real
photoset markup. Those only exist inside Tumblr.
```

- [x] **Step 4: Ensure dev/ is not served as part of the theme**

Confirm nothing links to `dev/`:

Run: `grep -rn "dev/" theme.html css/ js/ || echo "clean"`
Expected: prints `clean`.

- [x] **Step 5: Manual verification**

Open `dev/preview.html` in a browser. Expected at this point: an unstyled-but-populated page — the CSS files for `tokens`/`layout`/`posts` don't exist yet (Task 2 creates them), so those `<link>`s 404 harmlessly. Six placeholder posts and the sidebar must be visible. This is the baseline the next tasks improve.

- [x] **Step 6: Commit**

```bash
cd /Users/kate/projects/simblr && git add dev/ && git commit -m "Add local preview harness for CSS/JS verification"
```

---

### Task 2: Split the CSS into concern-scoped files and adopt Lora + Lato  ✅ DONE

**Files:**
- Create: `css/tokens.css`
- Create: `css/layout.css`
- Create: `css/posts.css`
- Modify: `css/base.css` (reduce to reset/typography/links/scrollbar)
- Modify: `theme.html` (font link, stylesheet links)

**Interfaces:**
- Produces: the `:root` token set every later task consumes — `--primary-bg-color`, `--primary-text-color`, `--title-color`, `--blog-title-color`, `--link-hover-color`, `--border-color`, `--text-border-color`, `--scrollbar-color`, `--muted-text-color`, `--body-font`, `--heading-font`, `--post-width`.
- Consumes: the existing rules in `css/base.css`, which are redistributed, not rewritten.

**Context:** `css/base.css` is 342 lines mixing tokens, typography, grid, sidebar, nav, pagination, and post rules. This task is a pure reorganization plus the font swap — no visual change is intended beyond typography. Doing it first means every later task edits a small, focused file.

`ref.html`'s customizer defaults (its `<meta name="color:...">` tags) supply the values. Two deliberate departures, both carried over from the earlier port: `--primary-text-color` stays `#111111` rather than `ref.html`'s `#cccccc` (which is near-invisible on white), and `--link-hover-color` stays this project's `#f08dbd` rather than `ref.html`'s `#eeeeee`.

- [x] **Step 1: Create the token file**

Create `css/tokens.css`:
```css
/* Design tokens. The single place to change the palette or typeface.
   Must be linked before every other stylesheet. */

:root {
    /* -- color ----------------------------------------------------------- */

    --primary-bg-color: #ffffff;
    --primary-text-color: #111111;
    --title-color: #000000;
    --blog-title-color: #000000;
    --link-hover-color: #f08dbd;
    --border-color: #f5f5f5;
    --text-border-color: #eeeeee;
    --scrollbar-color: #d5d5d5;

    /* Muted text is the RGB of --primary-text-color at 60%. If you change
       --primary-text-color, change these two to match. */
    --muted-text-color: rgba(17, 17, 17, .6);
    --quiet-text-color: rgba(17, 17, 17, .75);

    /* -- type ------------------------------------------------------------ */

    --body-font: normal .95em/1.6em "Lora", georgia, serif;
    --heading-font: 600 .8em/1.25em "Lato", sans-serif;

    /* -- metrics --------------------------------------------------------- */

    /* Width of a post in one-column (list) layout. Grid layout ignores this
       and uses calc(50% - 20px) so Masonry can measure it. */
    --post-width: 500px;

    /* Left offset clearing the fixed sidebar, and the rail inset inside it. */
    --feed-offset: 375px;
    --rail-inset: 100px;
}
```

- [x] **Step 2: Reduce base.css to reset, typography, links, and scrollbar**

Replace the entire contents of `css/base.css` with:
```css
/* Reset, base typography, links, and scrollbar.
   No layout and no components — those live in layout.css and posts.css. */

/* -- typography ------------------------------------------------------------ */

body {
    margin: 0;
    font: var(--body-font);
    letter-spacing: .15px;
    color: var(--primary-text-color);
    background: var(--primary-bg-color);
    text-align: left;
    word-wrap: break-word;
    word-break: break-word;
    overflow-x: hidden;
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
}

h1,
h2,
h3,
h4 {
    margin: .25em 0;
    padding: 0;
    font-weight: 600;
    color: var(--title-color);
}

small,
big,
sub,
pre {
    /* Tumblr's editor emits these for emphasis; normalize so they don't
       disrupt the vertical rhythm. */
    font-size: 1em;
    line-height: 1.5em;
    vertical-align: baseline;
}

hr {
    border: none;
    margin: 2em 25%;
    border-top: 1px solid var(--text-border-color);
}

/* -- links ------------------------------------------------------------ */

a {
    color: var(--primary-text-color);
    text-decoration: none;
    transition: color .3s linear;
}

a:hover {
    color: var(--link-hover-color);
}

/* -- scrollbar --------------------------------------------------------- */

::-webkit-scrollbar {
    width: 12px;
    height: 12px;
    background-color: transparent;
}

::-webkit-scrollbar-thumb {
    background-clip: padding-box;
    border-radius: 6px;
    background-color: var(--scrollbar-color);
    border: 4px solid transparent;
}
```

- [x] **Step 3: Create layout.css with the sidebar, grid, toggle, and responsive rules**

Create `css/layout.css`. These are the sidebar/nav/grid/toggle/responsive rules moved out of the old `base.css` verbatim, minus the `.pagination` rail (Task 3 rewrites that) and minus `--muted-text-color` hardcoding:
```css
/* Page furniture: sidebars, nav, the posts container, the Masonry grid,
   the layout toggle, pagination, and all responsive rules. */

/* -- sidebar ------------------------------------------------------------ */

#sidebar-left,
#sidebar-right {
    position: fixed;
    top: 0;
    width: 275px;
    padding: 150px 50px 50px 50px;
    max-height: calc(100vh - 200px);
    overflow-y: auto;
}

#sidebar-left {
    left: 0;
}

#sidebar-right {
    right: 0;
}

#sidebar-left .title {
    display: block;
    margin-bottom: 15px;
    text-transform: uppercase;
    letter-spacing: 2.5px;
    font: var(--heading-font);
    color: var(--blog-title-color);
}

#sidebar-left .avatar {
    display: block;
    margin: 0 0 25px 0;
    height: 40px;
    width: 40px;
    border-radius: 100%;
}

#sidebar-left .description {
    margin-bottom: 25px;
}

/* -- nav ------------------------------------------------------------ */

.menu li {
    display: block;
    position: relative;
    margin-bottom: 5px;
    list-style: none;
}

/* Dotted leader behind each link; the link's own background masks it. */
.menu li:before {
    content: '';
    position: absolute;
    top: 50%;
    z-index: -1;
    left: 0;
    height: 0;
    border-bottom: 1px dotted var(--border-color);
    width: 100%;
}

.menu a,
.layout-toggle {
    display: inline-block;
    font-size: .8em;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    font-family: "Lato", sans-serif;
    color: var(--muted-text-color);
    padding-right: 10px;
    background: var(--primary-bg-color);
}

.layout-toggle {
    padding-left: 0;
    border: 0;
    cursor: pointer;
}

/* -- grid ------------------------------------------------------------ */

/* Sizers are measurement-only: invisible, and ignored in list layout. */
.grid__col-sizer,
.grid__gutter-sizer {
    height: 0;
}

/* Must match .grid__item width exactly: Masonry fits columns as
   containerWidth / (colSizer + gutter), so a plain 50% here plus a gutter
   overflows and collapses to a single column. */
.grid__col-sizer {
    width: calc(50% - 20px);
}

.grid__gutter-sizer {
    width: 40px;
}

.grid .grid__item {
    width: calc(50% - 20px);
    margin-bottom: 40px;
}

.grid .grid__item img {
    width: 100%;
    display: block;
}

/* Avoid the load-then-jump flicker: hide until Masonry has measured.
   The animation is a failsafe — if theme.js fails to load, the feed still
   reveals itself after 3s rather than leaving a permanently blank page. */
section.posts:not(.is-loaded) {
    opacity: 0;
    animation: reveal-failsafe 0s 3s forwards;
}

@keyframes reveal-failsafe {
    to { opacity: 1; }
}

section.posts.is-loaded {
    opacity: 1;
    transition: opacity .3s ease;
}

/* -- responsive ------------------------------------------------------------ */

@media (max-width: 700px) {
    #sidebar-left,
    #sidebar-right {
        position: static;
        width: auto;
        max-height: none;
        padding: 50px 25px 25px 25px;
    }

    .grid__col-sizer {
        width: 100%;
    }

    .grid__gutter-sizer {
        width: 0;
    }

    .grid .grid__item {
        width: 100%;
    }
}
```

- [x] **Step 4: Create an empty posts.css placeholder**

Create `css/posts.css`:
```css
/* Post-card internals: titles, media, captions, reblog trail, tags,
   the .when footer, asks, chats, audio, and notes. */
```

Tasks 4–9 fill this in. It exists now so the `<link>` in Task 2 Step 6 resolves.

- [x] **Step 5: Swap the font link in theme.html**

Find (currently around line 45):
```html
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap" rel="stylesheet">
```

Replace with:
```html
        <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;600;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
```

- [x] **Step 6: Update the stylesheet links in theme.html**

Find:
```html
        <link href="https://kate-j-xia.github.io/simblr/css/base.css" rel="stylesheet">
        <link href="https://kate-j-xia.github.io/simblr/css/dark.css" rel="stylesheet">
```

Replace with (order matters — tokens must come first):
```html
        <link href="https://kate-j-xia.github.io/simblr/css/tokens.css" rel="stylesheet">
        <link href="https://kate-j-xia.github.io/simblr/css/base.css" rel="stylesheet">
        <link href="https://kate-j-xia.github.io/simblr/css/layout.css" rel="stylesheet">
        <link href="https://kate-j-xia.github.io/simblr/css/posts.css" rel="stylesheet">
        <link href="https://kate-j-xia.github.io/simblr/css/dark.css" rel="stylesheet">
```

- [x] **Step 7: Verify no template syntax leaked into the CSS**

Run:
```bash
cd /Users/kate/projects/simblr && grep -n '{[a-zA-Z]*:' css/*.css | grep -v '^\s*/\*' || echo "clean"
```
Expected: prints `clean`. Any hit is a Tumblr tag that will never be substituted.

- [x] **Step 8: Manual verification**

Open `dev/preview.html`. Expected: body copy now renders in Lora (a serif); the sidebar title and nav links in uppercase Lato; the grid still lays out in two columns; the toggle still switches to one column. Post internals are still unstyled — that's Tasks 4–9.

**Expected transient regression:** the old `section.posts { margin-left: 375px }` rule is deliberately NOT carried into `layout.css` here — Task 3 rewrites it as part of the rail work. So between this task and Task 3, the feed sits underneath the fixed sidebar. That is expected; do not "fix" it, and do not merge to `main` in this state.

- [x] **Step 9: Commit**

```bash
cd /Users/kate/projects/simblr && git add css/ theme.html && git commit -m "Split base.css into tokens/base/layout/posts and adopt Lora + Lato"
```

---

### Task 3: Move the rail onto the posts section and scope it to list mode  ✅ DONE

**Files:**
- Modify: `css/layout.css`

**Interfaces:**
- Consumes: `--feed-offset`, `--rail-inset`, `--post-width`, `--border-color` from `css/tokens.css` (Task 2).

**Context:** `ref.html` puts the border-left rail and `padding-left: 100px` on `section` itself, so posts and pagination share one indent. The earlier port put the rail on `.pagination` only, so pagination currently sits 100px further right than the posts with a rail appearing from nowhere. This task fixes that.

The rail is a one-column device: in a 2-column grid it would sit far left of the right-hand column and read as an accident. So it applies only when `section.posts` does NOT have the `.grid` class — i.e. list mode, which `js/theme.js` already toggles.

- [x] **Step 1: Replace the posts-container and pagination rules in layout.css**

In `css/layout.css`, find the `/* -- grid ---- */` banner and insert this section immediately ABOVE it:
```css
/* -- posts container ------------------------------------------------------ */

section.posts {
    margin: 0 0 0 var(--feed-offset);
    padding-top: 150px;
    min-height: calc(100vh - 150px);
    position: relative;
}

/* The rail is a one-column device. In grid mode it would sit far left of the
   right-hand column and read as an accident, so it is list-mode only —
   js/theme.js adds .grid to this element when grid layout is active. */
section.posts:not(.grid) {
    width: var(--post-width);
    padding-left: var(--rail-inset);
    border-left: 1px solid var(--border-color);
}

section.posts.grid {
    max-width: 900px;
}

section.posts:not(.grid) article.posts {
    padding-bottom: 150px;
}

/* -- pagination ------------------------------------------------------------ */

.pagination {
    position: relative;
    display: block;
    margin: 0 0 150px var(--feed-offset);
    padding: 50px 0 0 0;
    color: var(--muted-text-color);
    border-top: 1px solid var(--border-color);
}

/* Match the feed's rail so Previous/Next line up with the posts above them. */
.pagination a {
    display: inline-block;
    margin: 0 10px 0 0;
    color: var(--muted-text-color);
}
```

- [x] **Step 2: Add the matching responsive overrides**

In `css/layout.css`'s `@media (max-width: 700px)` block, add these rules inside the block:
```css
    section.posts,
    section.posts:not(.grid) {
        margin: 0 25px;
        width: auto;
        padding-left: 0;
        padding-top: 25px;
        border-left: 0;
    }

    section.posts:not(.grid) article.posts {
        padding-bottom: 75px;
    }

    .pagination {
        margin: 0 25px 50px 25px;
        padding: 25px 0 0 0;
    }
```

The rail and the 375px offset both assume a fixed sidebar, which the mobile breakpoint unpins — so both are removed here.

- [x] **Step 3: Verify the old pagination rail is gone**

Run:
```bash
cd /Users/kate/projects/simblr && grep -n "border-left" css/layout.css
```
Expected: exactly one hit, inside the `section.posts:not(.grid)` rule. The `.pagination` rule must no longer set `border-left`.

- [x] **Step 4: Manual verification**

Open `dev/preview.html` (grid, home): no rail, two columns, pagination flush with the feed's left edge. Click the toggle to switch to list: a hairline rail appears down the left of the feed, posts are indented 100px inside it, and pagination stays aligned with the post text. Open `dev/preview.html?kind=tag&tag=ts2-legacies`: list mode with the rail by default. Narrow below 700px: rail and offset both disappear.

- [x] **Step 5: Commit**

```bash
cd /Users/kate/projects/simblr && git add css/layout.css && git commit -m "Move ref.html rail from pagination onto section.posts, list mode only"
```

---

### Task 4: Replace the post loop — text, quote, link, and chat types  ✅ DONE

**Files:**
- Modify: `theme.html` (the `{block:Posts}` loop)
- Modify: `css/posts.css`

**Interfaces:**
- Produces: the `article.posts` skeleton every later task extends — `.title`, `li.comment` / `a.user`, `.quote`, `.source`, `ol.chat` / `.l` / `.label`. The `root-url` and `data-tags` attributes from the existing loop are preserved verbatim, because `js/theme.js`'s `removeSupersededReposts()` reads them.

**Context:** The current loop is ref3-derived and ~330 lines. It is replaced in three passes (Tasks 4, 5, 6) so a mistake is caught against one group of post types rather than all of them at once. `ref.html` packs each post type onto a single 300–400 character line; ours is reformatted multi-line.

Read `theme.html`'s current `{block:Posts}` loop before starting — the exact line numbers have shifted across tasks.

- [x] **Step 1: Replace the article opening and the text/quote/link/chat blocks**

In `theme.html`, find the `{block:Posts}` line and everything down to (but NOT including) the `{block:Photo}` block. Replace that span with:
```html
        {block:Posts}
            <article
                class="posts"
                id="post-{PostID}"
                post-type="{PostType}"
                root-url="{block:NotReblog}{Permalink}{/block:NotReblog}{block:RebloggedFrom}{ReblogRootURL}{/block:RebloggedFrom}"
                data-tags="{block:HasTags}{block:Tags}{Tag}|{/block:Tags}{/block:HasTags}"
            >

                <!------ QUOTE ------>
                {block:Quote}
                    <div class="quote title">{Quote}</div>
                    {block:Source}<div class="source">{Source}</div>{/block:Source}
                {/block:Quote}

                <!------ TEXT ------>
                {block:Text}
                    {block:Title}<div class="title">{Title}</div>{/block:Title}
                    {block:RebloggedFrom}
                        {block:Reblogs}
                            <li class="comment{block:Title} ted{/block:Title}">
                                <a{block:HasPermalink} href="{Permalink}"{/block:HasPermalink} class="user">{Username}</a>
                                {Body}
                            </li>
                        {/block:Reblogs}
                    {/block:RebloggedFrom}
                    {block:NotReblog}
                        <li class="comment{block:Title} ted{/block:Title}">{Body}</li>
                    {/block:NotReblog}
                {/block:Text}

                <!------ LINK ------>
                {block:Link}
                    <div class="title"><a href="{URL}" {Target}>{Name}</a></div>
                    {block:Description}
                        {block:NotReblog}<li class="comment ted">{Description}</li>{/block:NotReblog}
                    {/block:Description}
                    {block:RebloggedFrom}
                        {block:Reblogs}
                            <li class="comment">
                                <a{block:HasPermalink} href="{Permalink}"{/block:HasPermalink} class="user">{Username}</a>
                                {Body}
                            </li>
                        {/block:Reblogs}
                    {/block:RebloggedFrom}
                {/block:Link}

                <!------ CHAT ------>
                {block:Chat}
                    {block:Title}<div class="title">{Title}</div>{/block:Title}
                    <ol class="chat{block:Title} ted{/block:Title}">
                        {block:Lines}
                            <li class="l {Alt}">
                                {block:Label}<span class="label">{Label}</span>{/block:Label}
                                {Line}
                            </li>
                        {/block:Lines}
                    </ol>
                {/block:Chat}
```

- [x] **Step 2: Add the title, caption, and chat CSS**

Append to `css/posts.css`:
```css
/* -- titles ------------------------------------------------------------ */

/* ref.html applies one heading treatment to titles, usernames, chat labels,
   and the date footer alike; that shared rule is what makes the theme cohere. */
.title,
.user,
.label,
.when,
.audio_info {
    color: var(--title-color);
    font: var(--heading-font);
    position: relative;
    text-transform: uppercase;
    letter-spacing: 1.5px;
}

.title {
    letter-spacing: 2.5px;
    font-weight: 600;
}

/* A rule that runs the full measure and crosses the rail, so the underline
   reads as part of the page grid rather than part of the post. */
article.posts .title:after {
    content: '';
    display: block;
    margin-top: 25px;
    height: 1px;
    background: var(--border-color);
    width: calc(100% + var(--rail-inset));
    margin-left: calc(-1 * var(--rail-inset));
}

/* In grid mode there is no rail to cross, so the underline stays inside. */
section.posts.grid .title:after {
    width: 100%;
    margin-left: 0;
}

.title a {
    color: var(--title-color);
}

.title a:hover {
    color: var(--link-hover-color);
}

.quote {
    line-height: 1.75em;
}

.source {
    margin-top: 20px;
}

article.posts img,
article.posts li,
article.posts blockquote {
    max-width: 100%;
}

/* -- captions and reblog trail --------------------------------------------- */

.comment {
    margin: 0;
    padding: 0 0 10px 0;
    border-top: 1px dotted var(--border-color);
    list-style: none;
}

.comment:first-of-type {
    border: 0;
}

.comment:last-of-type {
    padding-bottom: 0;
}

/* These carry list-item markers from the base list styling; suppress them. */
.comment:before,
.chat li:before,
ol.notes li:before {
    display: none;
}

.user {
    display: block;
    margin-bottom: 10px;
    border: 0;
}

.user,
.user a {
    color: var(--link-hover-color);
}

.comment .user:after {
    content: ' commented:';
}

/* The first trail entry is the post's own author, already named in .when. */
article.posts .comment:first-of-type .user {
    display: none;
}

/* .ted = "has a title above it", so it needs to clear the title underline. */
.ted:first-of-type {
    padding-top: 25px;
}

/* -- chat ------------------------------------------------------------ */

ol.chat {
    margin: 0;
    padding: 0;
    list-style: none;
    text-align: left;
}

.l {
    padding: 0 0 20px 0;
}

.l:last-child {
    padding-bottom: 0;
    border: 0;
}

.label {
    display: inline-block;
}
```

- [x] **Step 3: Verify block balance**

Run:
```bash
cd /Users/kate/projects/simblr && for tag in Posts Quote Source Text Title Link Description Chat Lines Label Reblogs RebloggedFrom NotReblog HasPermalink HasTags Tags; do o=$(grep -o "{block:$tag}" theme.html | wc -l); c=$(grep -o "{/block:$tag}" theme.html | wc -l); echo "$tag: open=$o close=$c"; done
```
Expected: `open` equals `close` for every tag.

- [x] **Step 4: Manual verification**

Open `dev/preview.html`. The text post shows an uppercase letter-spaced title with a hairline rule beneath it; in list mode that rule extends left across the rail, in grid mode it stops at the card edge. The quote post renders larger with its source beneath. The chat post shows bold labels with no bullet markers.

- [x] **Step 5: Commit**

```bash
cd /Users/kate/projects/simblr && git add theme.html css/posts.css && git commit -m "Replace text/quote/link/chat post markup with ref.html structure"
```

---

### Task 5: Replace the post loop — photo, photoset, video, and audio types  ✅ DONE

**Files:**
- Modify: `theme.html` (the `{block:Posts}` loop)
- Modify: `css/posts.css`

**Interfaces:**
- Consumes: the `article.posts` skeleton from Task 4.
- Produces: `.media` › `.ph` media wrapper, and `.photo-slideshow` carrying `data-layout="{PhotosetLayout}"` — Task 8's `layoutPhotosets()` reads that attribute.

**Context:** `ref.html` wraps photo, photoset, and video in a shared `.media` › `.ph` container, then puts the caption below it. Audio sits outside that wrapper. Note the attribute is `data-layout`, not `layout` — the current ref3 markup uses a bare `layout` attribute, which is not valid HTML and is not what Task 8 reads.

- [x] **Step 1: Replace the media blocks**

In `theme.html`, find the span from `{block:Photo}` through the end of the `{block:Audio}` block and replace it with:
```html
                <!------ MEDIA (photo, photoset, video) ------>
                <div class="media">
                    <div class="ph">

                        {block:Photo}
                            {block:IndexPage}
                                <a href="#" onclick="Tumblr.Lightbox.init([{'width':{PhotoWidth-HighRes},'height':{PhotoHeight-HighRes},'low_res':'{PhotoURL-500}','high_res':'{PhotoURL-HighRes}'}]); return false;">
                                    <img src="{PhotoURL-HighRes}" alt="{PhotoAlt}">
                                </a>
                            {/block:IndexPage}
                            {block:PermalinkPage}
                                {LinkOpenTag}<img src="{PhotoURL-HighRes}" alt="{PhotoAlt}">{LinkCloseTag}
                            {/block:PermalinkPage}
                        {/block:Photo}

                        {block:Photoset}
                            <div class="photo-slideshow" id="photoset_{PostID}" data-layout="{PhotosetLayout}">
                                {block:Photos}
                                    <img src="{PhotoURL-500}" alt="{PhotoAlt}" data-highres="{PhotoURL-HighRes}">
                                {/block:Photos}
                            </div>
                        {/block:Photoset}

                        {block:Video}
                            <div class="video">{Video-500}</div>
                        {/block:Video}

                    </div>
                </div>

                <!------ AUDIO ------>
                {block:Audio}
                    {block:AudioPlayer}
                        <div class="hold">
                            <div class="player">{AudioPlayerWhite}</div>
                            <div class="audio_info">
                                {block:TrackName}<span class="track">{TrackName}</span>{/block:TrackName}
                                {block:Artist}<span class="artist">{Artist}</span>{/block:Artist}
                            </div>
                        </div>
                    {/block:AudioPlayer}
                {/block:Audio}

                <!------ CAPTION ------>
                {block:Caption}
                    {block:Reblogs}
                        <li class="comment">
                            <a{block:HasPermalink} href="{Permalink}"{/block:HasPermalink} class="user">{Username}</a>
                            {Body}
                        </li>
                    {/block:Reblogs}
                    {block:NotReblog}
                        <li class="comment">
                            <a{block:HasPermalink} href="{Permalink}"{/block:HasPermalink} class="user">{Name}</a>
                            {Caption}
                        </li>
                    {/block:NotReblog}
                {/block:Caption}
```

- [x] **Step 2: Add the media and audio CSS**

Append to `css/posts.css`:
```css
/* -- media ------------------------------------------------------------ */

.ph {
    position: relative;
    overflow: hidden;
}

.ph img {
    width: 100%;
    display: block;
}

.video * {
    display: block;
    min-width: 100%;
}

/* Tumblr injects its own wrapper around embedded media at full width. */
.tmblr-full > img {
    width: 100%;
}

/* An empty .media wrapper renders on every non-media post; collapse it so it
   does not add stray vertical space to text posts. */
.media:empty,
.ph:empty {
    display: none;
}

/* -- audio ------------------------------------------------------------ */

.hold {
    background: var(--primary-bg-color);
    border: 1px solid var(--border-color);
    position: relative;
    display: block;
    min-height: 24px;
    padding: 15px;
}

.player {
    width: 25px;
    height: 24px;
    position: absolute;
    left: 10px;
    top: calc(50% - 15px);
    display: block;
    overflow: hidden;
}

.audio_info {
    color: var(--primary-text-color);
    vertical-align: middle;
    line-height: 12px;
    margin-left: 45px;
    max-width: calc(100% - 75px);
}

.audio_info span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
}

.hold .track {
    font-weight: 600;
    color: var(--title-color);
}
```

- [x] **Step 3: Verify block balance**

Run:
```bash
cd /Users/kate/projects/simblr && for tag in Photo Photoset Photos Video Audio AudioPlayer TrackName Artist Caption IndexPage PermalinkPage Reblogs NotReblog HasPermalink; do o=$(grep -o "{block:$tag}" theme.html | wc -l); c=$(grep -o "{/block:$tag}" theme.html | wc -l); echo "$tag: open=$o close=$c"; done
```
Expected: `open` equals `close` for every tag.

- [x] **Step 4: Manual verification**

Open `dev/preview.html`. The photo post shows a full-width image with its caption below, attributed to `someblog`. The photoset post shows three stacked images (rows come in Task 8). No stray gap above text-only posts — if there is one, the `.media:empty` rule is not matching and the wrapper needs `{block:Photo}`-style conditioning.

- [x] **Step 5: Commit**

```bash
cd /Users/kate/projects/simblr && git add theme.html css/posts.css && git commit -m "Replace photo/photoset/video/audio post markup with ref.html structure"
```

---

### Task 6: Replace the post loop — ask and answer posts  ✅ DONE

**Files:**
- Modify: `theme.html` (the `{block:Posts}` loop)
- Modify: `css/posts.css`

**Interfaces:**
- Consumes: the `article.posts` skeleton from Task 4 and the `.comment` rules it defined.
- Produces: `.q` (the question) and `.as` (the asker label).

**Context:** `ref.html`'s ask styling is far simpler than `ref3.html`'s (`qa-set`, `ans-flex`, `que-flex`, `ans-head`). The question is an italic muted block with a full-measure rule beneath it; the answer is an ordinary `.comment`.

- [x] **Step 1: Replace the answer block**

In `theme.html`, find the current `{block:Answer}` span and replace it with:
```html
                <!------ ASK ------>
                {block:Answer}
                    <div class="q"><span class="as">{Asker} sent: </span>{Question}</div>
                    {block:Answerer}
                        <li class="comment"><span class="user">{Answerer} replied: </span>{Answer}</li>
                    {/block:Answerer}
                    {block:NotReblog}
                        <li class="comment reply">{Replies}</li>
                    {/block:NotReblog}
                    {block:RebloggedFrom}
                        {block:Reblogs}
                            <li class="comment">
                                <a{block:HasPermalink} href="{Permalink}"{/block:HasPermalink} class="user">{Username}</a>
                                {Body}
                            </li>
                        {/block:Reblogs}
                    {/block:RebloggedFrom}
                {/block:Answer}
```

- [x] **Step 2: Add the ask CSS**

Append to `css/posts.css`:
```css
/* -- asks ------------------------------------------------------------ */

.q {
    font-style: italic;
    color: var(--quiet-text-color);
}

/* Same full-measure rule as .title:after, so questions and titles share
   one visual device. */
.q:after {
    content: '';
    display: block;
    margin-top: 15px;
    height: 1px;
    background: var(--border-color);
    width: calc(100% + var(--rail-inset));
    margin-left: calc(-1 * var(--rail-inset));
}

section.posts.grid .q:after {
    width: 100%;
    margin-left: 0;
}

.as {
    text-transform: lowercase;
    color: var(--primary-text-color);
}

.as a {
    color: var(--primary-text-color);
}

.answerer {
    border: 0;
    margin-bottom: 10px;
    color: var(--title-color);
}
```

- [x] **Step 3: Verify block balance**

Run:
```bash
cd /Users/kate/projects/simblr && for tag in Answer Answerer NotReblog RebloggedFrom Reblogs HasPermalink; do o=$(grep -o "{block:$tag}" theme.html | wc -l); c=$(grep -o "{/block:$tag}" theme.html | wc -l); echo "$tag: open=$o close=$c"; done
```
Expected: `open` equals `close` for every tag.

- [x] **Step 4: Manual verification**

Open `dev/preview.html`. The ask post shows "anon sent:" in lowercase followed by the italic question, a hairline rule beneath it, then the reply as normal body copy.

- [x] **Step 5: Commit**

```bash
cd /Users/kate/projects/simblr && git add theme.html css/posts.css && git commit -m "Replace ask/answer post markup with ref.html structure"
```

---

### Task 7: Add the .when footer, tags, and the restyled button row  ✅ DONE

**Files:**
- Modify: `theme.html` (the `{block:Posts}` loop, post footer)
- Modify: `css/posts.css`

**Interfaces:**
- Consumes: the `article.posts` skeleton from Task 4.
- Produces: `.when` (date + attribution), `.tags`, and `.post-btns` — closing the `article` element that Task 4 opened.

**Context:** This replaces the ref3 post header entirely: attribution moves to the footer, where `ref.html` puts it. The spec decided the ref3 button row survives but is restyled to read as a continuation of `.when` — no borders, no background, no hover fill, icons inline at `1.2em`.

`ref.html` uses an inline SVG tag glyph. Keeping it as inline SVG means no extra network request and it inherits `currentColor`.

- [x] **Step 1: Add the footer and close the article**

In `theme.html`, find the span from the current post-footer markup through `{/block:Posts}` and replace it with:
```html
                <!------ FOOTER ------>
                {block:Date}
                    <div class="when">
                        Posted on <a href="{Permalink}">{Month} {DayOfMonth}{DayOfMonthSuffix}, {Year}</a>
                        {block:RebloggedFrom}
                            <span class="ca"><img src="{ReblogRootPortraitURL-40}" alt=""></span>
                            originally by <a href="{ReblogRootURL}">{ReblogRootName}</a>
                        {/block:RebloggedFrom}
                        {block:NoteCount}<a href="{Permalink}" class="notes-link">{NoteCount} notes</a>{/block:NoteCount}

                        {block:HasTags}
                            <div class="tags">
                                <svg viewBox="0 0 216 216" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M95.2,186c1.7,0,3.2-0.6,4.3-1.7l64.8-66.7c2.3-2.4,2.3-6.1-0.1-8.4L94.7,39.7c-1.1-1.1-2.7-1.7-4.2-1.7l-67.1,0.1c-3.3,0-6,2.6-6,5.9L17,109.9c0,1.6,0.6,3.2,1.8,4.3l72.3,70.2C92.2,185.5,93.7,186,95.2,186z M29.4,50L88,49.8l63.6,63.6l-56.5,58.2L29,107.4L29.4,50z M67.1,77.7c0,4.6-3.8,8.4-8.4,8.4s-8.4-3.8-8.4-8.4c0-4.6,3.8-8.4,8.4-8.4S67.1,73.1,67.1,77.7z"/></svg>
                                {block:Tags}<a href="{TagURL}">{Tag}</a>{/block:Tags}
                            </div>
                        {/block:HasTags}
                    </div>
                {/block:Date}

                <!------ BUTTONS ------>
                <div class="post-btns">
                    <a href="{Permalink}" title="permalink"><span class="material-icons post-icon">link</span></a>
                    <a href="{ReblogURL}" target="_blank" title="reblog"><span class="material-icons post-icon">repeat</span></a>
                    <span class="like-btn" title="like">{LikeButton}</span>
                </div>

            </article>

            {block:PostNotes}
                <article class="posts pagenotes">
                    <div class="title">{NoteCountWithLabel}</div>
                    {PostNotes}
                </article>
            {/block:PostNotes}

        {/block:Posts}
```

- [x] **Step 2: Add the footer, tags, and button CSS**

Append to `css/posts.css`:
```css
/* -- post footer ------------------------------------------------------------ */

.when {
    color: var(--muted-text-color);
    margin-top: 15px;
    font-weight: normal;
}

.when a {
    color: var(--muted-text-color);
}

.when a:hover {
    color: var(--link-hover-color);
}

/* The reblog-root portrait, sized to sit inline with the date text. */
.when img {
    width: 1.4em;
    height: 1.4em;
    margin: -.25em 5px 0 5px;
    vertical-align: middle;
    display: inline-block;
    border-radius: 100%;
}

.when svg {
    height: 1.2em;
    display: inline-block;
    fill: currentColor;
    vertical-align: middle;
}

/* -- tags ------------------------------------------------------------ */

.tags {
    margin-top: 10px;
}

.tags svg {
    margin: -2px 10px 0 0;
}

.tags a {
    color: var(--muted-text-color);
    margin-right: 5px;
    display: inline;
}

/* -- post buttons ---------------------------------------------------------- */

/* Reads as a continuation of .when, not as a widget: no border, no
   background, no hover fill. */
.post-btns {
    margin-top: 10px;
    color: var(--muted-text-color);
    font: var(--heading-font);
    text-transform: uppercase;
    letter-spacing: 1.5px;
}

.post-btns a,
.post-btns .like-btn {
    display: inline-block;
    margin-right: 12px;
    color: var(--muted-text-color);
    cursor: pointer;
}

.post-btns a:hover,
.post-btns .like-btn:hover {
    color: var(--link-hover-color);
}

/* Material Icons ship at 24px; scale to sit inline with the footer text. */
.post-icon {
    font-size: 1.2em;
    vertical-align: middle;
    line-height: 1;
}

/* -- notes ------------------------------------------------------------ */

.pagenotes ol.notes {
    margin: 0;
    padding: 0;
    list-style: none;
}

.pagenotes ol.notes li {
    padding: 5px 0;
    border-top: 1px dotted var(--border-color);
}

.pagenotes ol.notes li:first-child {
    border-top: 0;
}

.pagenotes ol.notes img.avatar {
    width: 1.4em;
    height: 1.4em;
    margin-right: 8px;
    border-radius: 100%;
    vertical-align: middle;
}
```

- [x] **Step 3: Verify block balance across the whole file**

Run:
```bash
cd /Users/kate/projects/simblr && for tag in Posts Date RebloggedFrom NoteCount HasTags Tags PostNotes Text Photo Photoset Video Audio Answer Chat Quote Link Caption IndexPage TagPage PermalinkPage NotReblog Reblogs; do o=$(grep -o "{block:$tag}" theme.html | wc -l); c=$(grep -o "{/block:$tag}" theme.html | wc -l); if [ "$o" != "$c" ]; then echo "MISMATCH $tag: open=$o close=$c"; fi; done; echo "balance check done"
```
Expected: prints only `balance check done` — no MISMATCH lines.

- [x] **Step 4: Confirm no ref3 classes survive**

Run:
```bash
cd /Users/kate/projects/simblr && grep -on 'ph-inner\|ph-left\|ph-right\|post-outer\|post-inner\|post-body\|post-header\|userpic\|username-txt\|tagscont\|post-title\|qa-set\|ans-flex\|que-flex\|pinned-flex\|timeago' theme.html || echo "no ref3 classes remain"
```
Expected: prints `no ref3 classes remain`.

- [x] **Step 5: Manual verification**

Open `dev/preview.html`. Every post ends with a muted uppercase line: "Posted on August 21st, 2026 [small round avatar] originally by someblog", then a tag glyph followed by tag links, then a row of three icons. No avatar or username appears at the *top* of any post. Icons sit on the text baseline, not floating above it.

- [x] **Step 6: Commit**

```bash
cd /Users/kate/projects/simblr && git add theme.html css/posts.css && git commit -m "Add ref.html .when footer, tags, and restyled post button row"
```

---

### Task 8: Vanilla photoset row layout  ✅ DONE

**Files:**
- Modify: `js/theme.js`
- Modify: `js/theme.test.js`
- Modify: `css/posts.css`

**Interfaces:**
- Consumes: `.photo-slideshow[data-layout]` from Task 5.
- Produces: `getPhotosetRows(layout)` — pure. Input: a `{PhotosetLayout}` string of digits, e.g. `"221"`. Output: an array of row sizes, e.g. `[2, 2, 1]`. Returns `[]` for empty, non-string, or non-digit input. Also `layoutPhotosets()`, which wraps each photoset's `<img>` children into `div.photo-row` elements.

**Context:** `ref.html` delegates this to jQuery + `pxuphotoset.min.js`. Per the spec, we write it ourselves: it is about twenty lines and removes a ~90KB jQuery dependency from a project that otherwise needs none.

`{PhotosetLayout}` is a digit string where each digit is the number of photos in that row. `"221"` means three rows: two photos, two photos, one photo.

Ordering matters: this must run before Masonry measures, so it goes with `removeSupersededReposts()` in the entry point — dedup → photosets → layout.

- [x] **Step 1: Write the failing tests**

Append to `js/theme.test.js`, and add `getPhotosetRows` to the existing destructured `require` at the top of the file:
```javascript
// Photoset layout strings are digit-per-row, e.g. "221" = 2, then 2, then 1.
assert.deepStrictEqual(getPhotosetRows('221'), [2, 2, 1]);
assert.deepStrictEqual(getPhotosetRows('3'), [3]);
assert.deepStrictEqual(getPhotosetRows('111'), [1, 1, 1]);

// Degenerate input must not throw — a malformed layout should fall back to
// "no rows", which leaves the images stacked rather than breaking the page.
assert.deepStrictEqual(getPhotosetRows(''), []);
assert.deepStrictEqual(getPhotosetRows(null), []);
assert.deepStrictEqual(getPhotosetRows(undefined), []);
assert.deepStrictEqual(getPhotosetRows('abc'), []);
assert.deepStrictEqual(getPhotosetRows('2x1'), []);

// A literal zero would create an empty row; treat the whole string as invalid.
assert.deepStrictEqual(getPhotosetRows('201'), []);

console.log('photoset tests passed');
```

- [x] **Step 2: Run the tests to verify they fail**

Run: `node /Users/kate/projects/simblr/js/theme.test.js`
Expected: the layout and dedup tests pass, then it throws on `getPhotosetRows` not being a function.

- [x] **Step 3: Implement the pure function and DOM wiring**

In `js/theme.js`, insert above `removeSupersededReposts()`:
```javascript
// {PhotosetLayout} is a digit-per-row string: "221" means a row of two, a row
// of two, then a row of one. Returns [] for anything malformed, which leaves
// the photoset stacked rather than throwing.
function getPhotosetRows(layout) {
    if (typeof layout !== 'string' || layout === '') return [];
    if (!/^[1-9]+$/.test(layout)) return [];
    return layout.split('').map(Number);
}

function layoutPhotosets() {
    const sets = document.querySelectorAll('.photo-slideshow[data-layout]');

    sets.forEach((set) => {
        const rows = getPhotosetRows(set.dataset.layout);
        if (rows.length === 0) return;

        const images = Array.from(set.children);
        let i = 0;

        rows.forEach((count) => {
            const row = document.createElement('div');
            row.className = 'photo-row';
            images.slice(i, i + count).forEach((img) => row.appendChild(img));
            i += count;
            if (row.children.length > 0) set.appendChild(row);
        });

        // Any images the layout string didn't account for go in a final row,
        // so a mismatch between layout and photo count never drops a photo.
        if (i < images.length) {
            const row = document.createElement('div');
            row.className = 'photo-row';
            images.slice(i).forEach((img) => row.appendChild(img));
            set.appendChild(row);
        }
    });
}
```

- [x] **Step 4: Wire it into the entry point and exports**

Find:
```javascript
if (typeof document !== 'undefined') {
    // Dedup first: initLayout() snapshots the article list, so anything removed
    // afterwards would leave a stale reference and a hole in the grid.
    removeSupersededReposts();
    initLayout();
}

if (typeof module !== 'undefined') {
    module.exports = {
        getLayoutBucket,
        resolveLayout,
        getPostsToHide,
        LAYOUT_STORAGE_KEY,
    };
}
```

Replace with:
```javascript
if (typeof document !== 'undefined') {
    // Order matters. Dedup first: initLayout() snapshots the article list, so
    // anything removed afterwards leaves a stale reference and a hole in the
    // grid. Photosets next, because they change post height and Masonry must
    // measure the final layout.
    removeSupersededReposts();
    layoutPhotosets();
    initLayout();
}

if (typeof module !== 'undefined') {
    module.exports = {
        getLayoutBucket,
        resolveLayout,
        getPostsToHide,
        getPhotosetRows,
        LAYOUT_STORAGE_KEY,
    };
}
```

- [x] **Step 5: Run the tests to verify they pass**

Run: `node /Users/kate/projects/simblr/js/theme.test.js`
Expected: prints `layout tests passed`, `dedup tests passed`, `photoset tests passed`, exit code 0.

- [x] **Step 6: Verify syntax**

Run: `node --check /Users/kate/projects/simblr/js/theme.js`
Expected: no output, exit code 0.

- [x] **Step 7: Add the photoset row CSS**

Append to `css/posts.css`:
```css
/* -- photosets ------------------------------------------------------------ */

/* Rows are built by layoutPhotosets() in js/theme.js from {PhotosetLayout}.
   Until that runs, images stay stacked — which is a fine fallback. */
.photo-row {
    display: flex;
    gap: 4px;
    margin-bottom: 4px;
}

.photo-row:last-child {
    margin-bottom: 0;
}

/* Equal-width columns regardless of intrinsic image size; min-width:0 stops
   flex items from refusing to shrink below their content width. */
.photo-row img {
    flex: 1 1 0;
    min-width: 0;
    object-fit: cover;
    display: block;
}
```

- [x] **Step 8: Manual verification**

Open `dev/preview.html`. The photoset fixture uses `data-layout="21"` with three images, so it must render as a row of two side by side, then a single full-width image beneath. Resize the window — rows stay proportional. Toggle to list mode and confirm the rows still hold.

- [x] **Step 9: Commit**

```bash
cd /Users/kate/projects/simblr && git add js/theme.js js/theme.test.js css/posts.css && git commit -m "Add vanilla photoset row layout, replacing pxuphotoset dependency"
```

---

### Task 9: Remove dead CSS, verify end to end, and update the docs  ✅ DONE (except Step 10, publish)

**Files:**
- Modify: `CLAUDE.md`
- Modify: `work-docs/GETTING_STARTED.md`
- Modify: `css/posts.css` (only if the audit finds orphans)

**Interfaces:**
- Consumes: everything from Tasks 1–8.

**Context:** Tasks 4–7 replaced the markup wholesale. Any CSS still targeting ref3 class names is now dead, and `CLAUDE.md` describes an architecture that no longer exists (it names `css/base.css` as owning everything and cites `css/base.css:13`, a line removed in Task 2).

- [x] **Step 1: Audit for CSS rules with no matching markup**

Run:
```bash
cd /Users/kate/projects/simblr
grep -ohE '^\.[a-zA-Z][a-zA-Z0-9_-]*' css/*.css | sed 's/^\.//' | sort -u > /tmp/css_sel.txt
grep -o 'class="[^"{]*"' theme.html dev/preview.html dev/fixtures.js 2>/dev/null | sed 's/.*class="//;s/"//' | tr ' ' '\n' | sort -u > /tmp/html_sel.txt
echo "=== styled but never emitted (candidates for deletion) ==="
comm -23 /tmp/css_sel.txt /tmp/html_sel.txt
```
Expected: the only survivors should be classes Tumblr generates rather than `theme.html` (`notes`, `note`, `avatar`, `tmblr-full`, `photo-row`, `grid`, `grid__item`, `is-loaded`, `liked`, `ted`, `alt`). Delete anything else — those are ref3 orphans.

- [x] **Step 2: Audit for markup with no CSS**

Run:
```bash
cd /Users/kate/projects/simblr && echo "=== emitted but never styled ===" && comm -13 /tmp/css_sel.txt /tmp/html_sel.txt
```
Expected: a short list only. Anything structural (a wrapper that needs layout) must be styled or removed from the markup.

- [x] **Step 3: Run the full verification suite**

Run:
```bash
cd /Users/kate/projects/simblr && node --check js/theme.js && node js/theme.test.js && grep -n '{[a-zA-Z]*:' css/*.css | grep -v '/\*' || echo "no template syntax in css"
```
Expected: three test lines print, then `no template syntax in css`.

- [x] **Step 4: Update CLAUDE.md's architecture section**

In `CLAUDE.md`, find the `## Architecture` section and replace its bullet list with:
```markdown
- **`theme.html`** — one template for every view. It emits `data-page-kind` (`""` = home, `tag`,
  `permalink`) and `data-tag` on `section.posts`, then lets JS decide the layout. Tumblr counts tag
  pages as index pages, so `{block:IndexPage}` cannot distinguish home from tag — only
  `{block:TagPage}` and `{block:PermalinkPage}` emit a page kind. The post loop follows
  `ref.html`'s structure: content, then a `.when` footer carrying date, attribution, and tags.
- **`js/theme.js`** — three pure, tested functions (`getLayoutBucket`, `resolveLayout`,
  `getPhotosetRows`) plus their DOM wiring. On load it runs dedup → photoset rows → layout, in that
  order; each step changes post height, and Masonry must measure last.
- **CSS is split by concern**, linked in this order (tokens must be first):
  - `css/tokens.css` — `:root` custom properties. The only place to change the palette or typeface.
  - `css/base.css` — reset, body typography, links, scrollbar.
  - `css/layout.css` — sidebars, posts container and rail, Masonry grid, pagination, responsive.
  - `css/posts.css` — post-card internals.
  - `css/dark.css` — empty. Dark mode not started.
- **`dev/preview.html`** — local harness. Loads the real CSS/JS against placeholder posts so
  changes can be checked without merging to `main`. Never linked from `theme.html`.
```

- [x] **Step 5: Update CLAUDE.md's gotchas section**

In `CLAUDE.md`, find the `## Gotchas that have already caused bugs` section and add these two bullets to the existing list:
```markdown
- **The rail is list-mode only.** `section.posts:not(.grid)` owns the `border-left` and
  `padding-left`. It used to live on `.pagination`, which indented pagination 100px past the posts.
  If you add a rule with `border-left` on the feed, check it does not apply in grid mode.
- **Photoset rows depend on `data-layout`, not `layout`.** The ref3 markup used a bare `layout`
  attribute; `getPhotosetRows` reads `dataset.layout`. A malformed layout string returns `[]` and
  leaves images stacked rather than throwing.
```

- [x] **Step 6: Update the reference-themes section of CLAUDE.md**

Find the `## Reference themes` section and replace its first paragraph with:
```markdown
`ref.html` is the visual base, and the post markup in `theme.html` now follows its structure. Its
inline CSS has been ported into `css/tokens.css`, `css/base.css`, `css/layout.css`, and
`css/posts.css`. `ref2`/`ref3`/`ref4` are secondary references only — `ref3.html` supplied the post
markup that was replaced, so treat any resemblance to it as vestigial.
```

- [x] **Step 7: Update GETTING_STARTED.md's next steps**

In `work-docs/GETTING_STARTED.md`, find the `## 6. Next steps` section and replace its numbered list with:
```markdown
1. **Custom pages**: write `pages/downloads.html` and `pages/nav.html` (Tasks 7–8 of
   `2026-08-21-theme-layout-and-pages.md`), then add them as real Tumblr Pages with "show link on
   blog" enabled.
2. **Dark mode**: fill in `css/dark.css` with dark-palette overrides of the tokens in
   `css/tokens.css`, then write the toggle logic in `js/theme.js` (button handler, `localStorage`,
   `prefers-color-scheme` default). Because every color is a token, this should be a
   one-file change.
3. **Tag hygiene**: keep tagging by game + category (`ts2-builds`, `ts3-downloads`) so the nav and
   downloads pages stay accurate, and add narrative tags to `NARRATIVE_TAGS` in `js/theme.js` so
   they default to one column.
4. **Polish**: cross-device check, verify `{LikeButton}` and `{PostNotes}` render correctly inside
   Tumblr, and revisit text contrast (`--primary-text-color` was kept at `#111111` rather than
   ported from `ref.html`).
```

- [x] **Step 8: Full manual verification**

Open each in a browser and confirm:
- `dev/preview.html` — grid, two columns, no rail, footer on every post
- `dev/preview.html?kind=tag&tag=ts2-legacies` — one column with rail
- `dev/preview.html?kind=tag&tag=ts2-builds` — grid
- `dev/preview.html?kind=permalink` — one column with rail
- Toggle switches layout and persists across reload
- Below 700px, one column, no rail, sidebar stacked above the feed

- [x] **Step 9: Commit**

```bash
cd /Users/kate/projects/simblr && git add CLAUDE.md work-docs/GETTING_STARTED.md css/ && git commit -m "Remove dead ref3 CSS and update docs for the split-CSS architecture"
```

- [ ] **Step 10: Publish and verify in Tumblr**

```bash
cd /Users/kate/projects/simblr && git checkout main && git merge base-grid && git push origin main
```

Wait about a minute for the GitHub Pages rebuild, then confirm the new files are live before pasting:

```bash
for f in tokens base layout posts; do echo -n "$f.css: "; curl -s -o /dev/null -w "%{http_code}\n" "https://kate-j-xia.github.io/simblr/css/$f.css"; done
```
Expected: `200` for all four.

Then paste `theme.html` into Tumblr's Customize → Edit HTML and check what the harness cannot show: `{LikeButton}` renders and the outline→solid heart swap works on click, `{PostNotes}` renders on a permalink, the Lightbox opens on photo click, and a real multi-photo photoset forms rows.

---

## Notes for the executor

- **Tasks 4–7 are one logical change split into four.** After Task 4 and until Task 7 lands, `theme.html` is mid-surgery: the article opens in Task 4 and only closes in Task 7. The block-balance check will legitimately fail in between. Do not "fix" it by adding a closing tag — work through to Task 7.
- **`ref.html` is not drop-in material.** Every snippet needs its `{color:x}` translated to a token and its class names checked against `theme.html`'s.
- **When a manual verification step fails, stop.** These are CSS changes with no automated coverage; a skipped visual check is how the last round shipped six invisible icons.
