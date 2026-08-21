# Theme Layout, Custom Pages & Repost Dedup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the theme a content-type-driven layout (2-column grid for catalog content, one column for narrative content) with a reader toggle, replace infinite scroll with numbered pagination, add opt-in repost dedup, port `ref.html`'s visual design into `css/base.css`, and write the two custom pages (downloads, nav).

**Architecture:** `theme.html` stays the single template for every view; it emits `data-page-kind` / `data-tag` on the posts section and lets `js/theme.js` resolve the layout. Resolution is two pure, unit-tested functions: `getLayoutBucket()` maps page kind + tag to `home`/`narrative`/`catalog`/`permalink`, and `resolveLayout()` picks grid-vs-list from a `localStorage` override or the bucket's default. A sidebar toggle writes that override per bucket. On each page load `js/theme.js` runs dedup first (removes reposts tagged `superseded` when a newer duplicate exists), then applies the layout, initializing or destroying Masonry accordingly. `css/base.css` absorbs `ref.html`'s ported palette/typography/chrome and owns the column count (including the mobile collapse to 1 column). `pages/downloads.html` and `pages/nav.html` become static link directories into Tumblr's native tag pages — no new custom page code needed per category.

**Tech Stack:** Vanilla HTML/CSS/JS, Tumblr classic theme templating, Masonry v4 (self-hosted), imagesLoaded (self-hosted), no build step, no test framework (plain Node `assert` used for the one pure function that needs it).

## Global Constraints

- No new build tooling, package manager, or test framework — this repo has none today and the spec doesn't call for one.
- Vendor libraries are self-hosted in `js/vendor/`, downloaded from unpkg.com (already approved pattern this session), never linked via CDN in `theme.html`.
- `css/base.css` custom properties follow the existing naming style already in the file (`--primary-bg-color`, `--primary-text-color`) — lowercase, hyphenated, `--<subject>-color` for colors.
- Ported CSS must target this project's actual class names in `theme.html`, not `ref.html`'s class names, except where `ref.html` targets Tumblr's own generated markup (e.g. `{PostNotes}` output: `.comment`, `.user`, `ol.notes li`, etc.) — those class names are Tumblr's, not `ref.html`'s, and apply unchanged since this project also outputs `{PostNotes}` raw.
- Every markup change must keep `theme.html` valid Tumblr templating (balanced `{block:X}`/`{/block:X}` tags).
- Grid is 2 columns on desktop, 1 below 700px. Column width is set in CSS on `.grid__col-sizer` (never hardcoded in JS), since Masonry measures that element.
- Layout defaults by page kind: home → grid, catalog tag → grid, narrative tag → list, permalink → list. Reader overrides persist per page kind under the single `localStorage` key `simblr-layout`.
- All `localStorage` access must be wrapped in try/catch — it throws in private browsing on some browsers, and a theme that white-screens there is worse than one that forgets a preference.

---

### Task 1: Remove Infinite Scroll, restore plain pagination, fix the imagesLoaded dependency

**Files:**
- Modify: `theme.html:26` (remove `if:Infinite scroll` customizer option)
- Modify: `theme.html:54-56` (script tags in `<head>`)
- Modify: `theme.html:439-451` (pagination markup, current line numbers — reread the file at execution time since earlier tasks in this plan shift line numbers)
- Modify: `js/theme.js` (remove `InfiniteScroll(...)` block)
- Delete: `js/vendor/infinite-scroll.pkgd.min.js`
- Create: `js/vendor/imagesloaded.pkgd.min.js` (downloaded)

**Interfaces:**
- Produces: `js/vendor/imagesloaded.pkgd.min.js` supplying the global `imagesLoaded` function that `js/theme.js` already calls — this replaces the copy that used to be bundled inside `infinite-scroll.pkgd.min.js`, which this task deletes.

**Context:** `js/theme.js` calls `imagesLoaded(grid, ...)`, but that global was only defined because it happened to be bundled inside `infinite-scroll.pkgd.min.js`. Removing Infinite Scroll without replacing that dependency will silently break the Masonry init (later tasks depend on this working). `masonry.pkgd.min.js` does NOT bundle `imagesLoaded` (verified: `grep -c imagesLoaded js/vendor/masonry.pkgd.min.js` returns 0).

- [ ] **Step 1: Download the standalone imagesLoaded library**

```bash
cd /Users/kate/projects/simblr/js/vendor && curl -fsSL -o imagesloaded.pkgd.min.js https://unpkg.com/imagesloaded@5/imagesloaded.pkgd.min.js
```

- [ ] **Step 2: Verify the download**

Run: `head -c 200 /Users/kate/projects/simblr/js/vendor/imagesloaded.pkgd.min.js`
Expected: starts with a comment block naming "imagesLoaded PACKAGED" (mirrors the header style of the other two vendor files already in this folder).

- [ ] **Step 3: Delete the Infinite Scroll vendor file**

```bash
rm /Users/kate/projects/simblr/js/vendor/infinite-scroll.pkgd.min.js
```

- [ ] **Step 4: Update the script tags in theme.html's `<head>`**

Find (currently around line 54-56):
```html
        <script defer src="https://kate-j-xia.github.io/simblr/js/vendor/masonry.pkgd.min.js"></script>
        <script defer src="https://kate-j-xia.github.io/simblr/js/vendor/infinite-scroll.pkgd.min.js"></script>
        <script defer src="https://kate-j-xia.github.io/simblr/js/theme.js"></script>
```

Replace with:
```html
        <script defer src="https://kate-j-xia.github.io/simblr/js/vendor/masonry.pkgd.min.js"></script>
        <script defer src="https://kate-j-xia.github.io/simblr/js/vendor/imagesloaded.pkgd.min.js"></script>
        <script defer src="https://kate-j-xia.github.io/simblr/js/theme.js"></script>
```

- [ ] **Step 5: Remove the now-unused "Infinite scroll" customizer option**

Find (currently around line 26):
```html
        <meta name="if:Infinite scroll" content="">
```

Delete that line entirely.

- [ ] **Step 6: Replace the pagination block**

Find the pagination section near the end of the posts loop (currently around lines 439-451):
```html
        <!--+++++++++++++++++++++++++++++++++++++++++++++++++-->

            <!------ INFINITE SCROLL ------>

            {block:PreviousPage}<a href="{PreviousPage}">{lang:Previous page} </a>{/block:PreviousPage}

            {block:NextPage}<a class="pagination__next" href="{NextPage}">  {lang:Next page}</a>{/block:NextPage}

            {block:IndexPage}{block:ifInfiniteScroll}
            <div class="page-load-status">
                <div class="infinite-scroll-request-error">{lang:Error loading more posts}</div>
            </div>
            {/block:ifInfiniteScroll}{/block:IndexPage}
```

Replace with:
```html
        <!--+++++++++++++++++++++++++++++++++++++++++++++++++-->

            <!------ PAGINATION ------>

            <footer class="pagination">
                {block:PreviousPage}<a href="{PreviousPage}">{lang:Previous page}</a>{/block:PreviousPage}
                {block:NextPage}<a href="{NextPage}">{lang:Next page}</a>{/block:NextPage}
            </footer>
```

- [ ] **Step 7: Remove the InfiniteScroll wiring from js/theme.js**

Find:
```javascript
let infScroll = new InfiniteScroll(
    grid, { 
        path: '.pagination__next',
        append: '.grid__item',
        outlayer: msnry,
        status: '.page-load-status',
        historyTitle: false,
    }
);
```

Delete that block entirely (the closing lines of the file).

- [ ] **Step 8: Verify theme.js still has valid syntax**

Run: `node --check /Users/kate/projects/simblr/js/theme.js`
Expected: no output, exit code 0.

- [ ] **Step 9: Verify theme.html block tags stay balanced**

Run:
```bash
cd /Users/kate/projects/simblr && for tag in Posts PostNotes IndexPage TagPage PreviousPage NextPage; do o=$(grep -o "{block:$tag}" theme.html | wc -l); c=$(grep -o "{/block:$tag}" theme.html | wc -l); echo "$tag: open=$o close=$c"; done
```
Expected: `open` equals `close` for every tag listed.

- [ ] **Step 10: Commit**

```bash
cd /Users/kate/projects/simblr && git add theme.html js/theme.js js/vendor/imagesloaded.pkgd.min.js && git rm js/vendor/infinite-scroll.pkgd.min.js && git commit -m "Replace infinite scroll with numbered pagination, self-host imagesLoaded"
```

---

### Task 2: Fix the root-url attribute bug and add a data-tags attribute for dedup

**Files:**
- Modify: `theme.html` (article opening tag, currently line 117-126 — reread at execution time since Task 1 shifted line numbers)

**Interfaces:**
- Produces: each `<article>` in the posts loop gets a corrected `root-url` attribute (traces to the original post via `{ReblogRootURL}` on reblogs, `{Permalink}` otherwise) and a new `data-tags` attribute (pipe-delimited list of the post's tags, empty string if none). Task 4's dedup script consumes both.

**Context:** The current `root-url` attribute has mismatched block tags — `{block:NotReblog}` is opened twice and never closed, which is invalid Tumblr templating and breaks the intended "trace to original post" behavior needed for dedup matching.

- [ ] **Step 1: Fix the root-url attribute and add data-tags**

Find (current article opening tag):
```html
                <article
                    class="posts grid__item"
                    id="post-{PostID}"
                    post-type="{PostType}"
                    {block:NotReblog}original-post{/block:NotReblog}
                    {block:RebloggedFrom}reblogged-post via-name="{ReblogParentName}" src-name="{ReblogRootName}"{/block:RebloggedFrom}
                    username="{block:NotReblog}{Name}{/block:NotReblog}{block:RebloggedFrom}{ReblogRootName}{/block:RebloggedFrom}"
                    root-url="{block:NotReblog}{Permalink}{block:NotReblog}{block:RebloggedFrom}{ReblogRootURL}{/block:RebloggedFrom}"
                    {block:HasTags}has-tags{/block:HasTags}
                >
```

Note: the `class="posts grid__item"` part of this block is rewritten by Task 3 — only change the `root-url` line and add the `data-tags` line in this task, leave `class` as-is for now:

```html
                <article
                    class="posts grid__item"
                    id="post-{PostID}"
                    post-type="{PostType}"
                    {block:NotReblog}original-post{/block:NotReblog}
                    {block:RebloggedFrom}reblogged-post via-name="{ReblogParentName}" src-name="{ReblogRootName}"{/block:RebloggedFrom}
                    username="{block:NotReblog}{Name}{/block:NotReblog}{block:RebloggedFrom}{ReblogRootName}{/block:RebloggedFrom}"
                    root-url="{block:NotReblog}{Permalink}{/block:NotReblog}{block:RebloggedFrom}{ReblogRootURL}{/block:RebloggedFrom}"
                    data-tags="{block:HasTags}{block:Tags}{Tag}|{/block:Tags}{/block:HasTags}"
                    {block:HasTags}has-tags{/block:HasTags}
                >
```

- [ ] **Step 2: Verify block tags stay balanced**

Run:
```bash
cd /Users/kate/projects/simblr && for tag in NotReblog RebloggedFrom HasTags Tags; do o=$(grep -o "{block:$tag}" theme.html | wc -l); c=$(grep -o "{/block:$tag}" theme.html | wc -l); echo "$tag: open=$o close=$c"; done
```
Expected: `open` equals `close` for every tag listed.

- [ ] **Step 3: Commit**

```bash
cd /Users/kate/projects/simblr && git add theme.html && git commit -m "Fix root-url block tags and add data-tags attribute for repost dedup"
```

---

### Task 3: Layout resolution, reader toggle, and responsive columns

**Files:**
- Modify: `theme.html` (page-kind attributes on the posts section, toggle button in sidebar, remove hardcoded grid classes)
- Modify: `js/theme.js` (layout resolution, toggle wiring, Masonry lifecycle)
- Modify: `js/theme.test.js` (add layout-resolution tests — file is created in Task 4; if executing tasks in order, create it here instead and Task 4 appends to it)
- Modify: `css/base.css` (grid columns, responsive breakpoint, toggle button)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `getLayoutBucket(pageKind, tag, narrativeTags)` — pure. Returns `'home' | 'narrative' | 'catalog' | 'permalink'`. A `pageKind` of `'tag'` resolves to `'narrative'` when `tag` is in `narrativeTags`, else `'catalog'`.
  - `resolveLayout(bucket, stored)` — pure. Returns `'grid' | 'list'`. `stored` is the parsed `localStorage` object (or `null`). Returns `stored[bucket]` when set, else the bucket default: `home` → grid, `catalog` → grid, `narrative` → list, `permalink` → list.
  - `LAYOUT_STORAGE_KEY` — the `localStorage` key name (`'simblr-layout'`), holding a JSON object mapping bucket → `'grid' | 'list'`.
  - The posts `<section>` carries `data-page-kind` and `data-tag`; the resolved layout is applied as a `.grid` class on that section (plus `.grid__item` on each article) so CSS and Masonry both key off the same signal.

**Context:** The grid classes are currently hardcoded on in `theme.html` from an earlier session. This task makes them JS-driven instead, since the layout now depends on stored preferences that only JS can read. To avoid a flash of the wrong layout, the sizer elements always render (they're invisible, zero-height) and only the `.grid` / `.grid__item` classes toggle.

- [ ] **Step 1: Replace the posts section opening with page-kind attributes**

Find:
```html
            <section class="posts grid">
                <div class="grid__col-sizer"></div>
                <div class="grid__gutter-sizer"></div>

                {block:Posts}
```

Replace with:
```html
            <section
                class="posts"
                data-page-kind="{block:TagPage}tag{/block:TagPage}{block:PermalinkPage}permalink{/block:PermalinkPage}"
                data-tag="{block:TagPage}{Tag}{/block:TagPage}"
            >
                <div class="grid__col-sizer"></div>
                <div class="grid__gutter-sizer"></div>

                {block:Posts}
```

Note: Tumblr treats a tag page as *also* being an index page, so `{block:IndexPage}` cannot distinguish home from tag and is deliberately not used here. Only the two unambiguous cases emit a value; an empty `data-page-kind` means "home feed", which the JS in Step 3 treats as `'home'`.

- [ ] **Step 2: Remove the hardcoded grid class from the article tag**

Find:
```html
                <article
                    class="posts grid__item"
                    id="post-{PostID}"
```

Replace with:
```html
                <article
                    class="posts"
                    id="post-{PostID}"
```

- [ ] **Step 3: Add the layout toggle button to the sidebar**

Find (in `#sidebar-left`, just before the closing `</nav>`):
```html
                    {block:ifLink6}<li><a href="{text:link 6 url}">{text:link 6}</a></li>{/block:ifLink6}
                </nav>
```

Replace with:
```html
                    {block:ifLink6}<li><a href="{text:link 6 url}">{text:link 6}</a></li>{/block:ifLink6}
                    {block:IndexPage}<li><button type="button" class="layout-toggle" hidden>grid view</button></li>{/block:IndexPage}
                </nav>
```

The button starts `hidden` and is revealed by JS, so visitors with JS disabled never see a control that does nothing. `{block:IndexPage}` covers both the home feed and tag pages (Tumblr counts tag pages as index pages) while excluding permalink pages, which have no layout to toggle.

- [ ] **Step 4: Write the failing tests for layout resolution**

Create `js/theme.test.js` (or append to it if Task 4 ran first):
```javascript
const assert = require('assert');
const {
    getLayoutBucket,
    resolveLayout,
} = require('./theme.js');

const NARRATIVE = ['ts2-legacies', 'ts3-legacies'];

// Page kind -> bucket.
assert.strictEqual(getLayoutBucket('', '', NARRATIVE), 'home');
assert.strictEqual(getLayoutBucket('permalink', '', NARRATIVE), 'permalink');
assert.strictEqual(getLayoutBucket('tag', 'ts2-builds', NARRATIVE), 'catalog');
assert.strictEqual(getLayoutBucket('tag', 'ts2-legacies', NARRATIVE), 'narrative');

// Tag matching is case-insensitive, since Tumblr preserves the tag's display case.
assert.strictEqual(getLayoutBucket('tag', 'TS2-Legacies', NARRATIVE), 'narrative');

// Defaults when nothing is stored.
assert.strictEqual(resolveLayout('home', null), 'grid');
assert.strictEqual(resolveLayout('catalog', null), 'grid');
assert.strictEqual(resolveLayout('narrative', null), 'list');
assert.strictEqual(resolveLayout('permalink', null), 'list');

// A stored override wins over the default.
assert.strictEqual(resolveLayout('home', { home: 'list' }), 'list');
assert.strictEqual(resolveLayout('narrative', { narrative: 'grid' }), 'grid');

// Overrides are remembered per bucket and do not leak across buckets.
assert.strictEqual(resolveLayout('narrative', { catalog: 'grid' }), 'list');

console.log('layout tests passed');
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `node /Users/kate/projects/simblr/js/theme.test.js`
Expected: throws, because `getLayoutBucket` / `resolveLayout` are not exported yet.

- [ ] **Step 6: Implement layout resolution and toggle wiring in js/theme.js**

Add near the top of `js/theme.js`, above the existing Masonry code:

```javascript
const LAYOUT_STORAGE_KEY = 'simblr-layout';

const NARRATIVE_TAGS = [
    'ts2-legacies',
    'ts3-legacies',
];

const LAYOUT_DEFAULTS = {
    home: 'grid',
    catalog: 'grid',
    narrative: 'list',
    permalink: 'list',
};

function getLayoutBucket(pageKind, tag, narrativeTags) {
    if (pageKind === 'permalink') return 'permalink';
    if (pageKind !== 'tag') return 'home';
    const normalized = (tag || '').toLowerCase();
    const isNarrative = narrativeTags.some(
        (t) => t.toLowerCase() === normalized
    );
    return isNarrative ? 'narrative' : 'catalog';
}

function resolveLayout(bucket, stored) {
    if (stored && stored[bucket]) return stored[bucket];
    return LAYOUT_DEFAULTS[bucket];
}

function readStoredLayouts() {
    try {
        return JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY)) || {};
    } catch (e) {
        return {};
    }
}

function writeStoredLayout(bucket, layout) {
    const stored = readStoredLayouts();
    stored[bucket] = layout;
    try {
        localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(stored));
    } catch (e) {
        /* private browsing — preference just won't persist */
    }
}
```

- [ ] **Step 7: Replace the Masonry block with a layout-aware version**

Find the existing Masonry + imagesLoaded block (after Task 1's edits):
```javascript
let grid = document.querySelector('.grid');
let msnry = new Masonry(grid, {
    itemSelector: '.none',
    columnWidth: '.grid__col-sizer',
    gutter: '.grid__gutter-sizer',
    percentPosition: true,
    stagger: 30,
});

imagesLoaded(
    grid, function() {
        grid.classList.remove('are-images-unloaded');
        msnry.options.itemSelector = '.grid__item';
        let items = grid.querySelectorAll('.grid__item');
        msnry.appended(items);
    }
)
```

Replace with:
```javascript
function initLayout() {
    const section = document.querySelector('section.posts');
    if (!section) return;

    const bucket = getLayoutBucket(
        section.dataset.pageKind,
        section.dataset.tag,
        NARRATIVE_TAGS
    );
    if (bucket === 'permalink') return;

    const articles = Array.from(section.querySelectorAll('article.posts'));
    const toggle = document.querySelector('.layout-toggle');
    let msnry = null;

    function applyLayout(layout) {
        if (layout === 'grid') {
            section.classList.add('grid');
            articles.forEach((a) => a.classList.add('grid__item'));
            if (!msnry) {
                msnry = new Masonry(section, {
                    itemSelector: '.grid__item',
                    columnWidth: '.grid__col-sizer',
                    gutter: '.grid__gutter-sizer',
                    percentPosition: true,
                    stagger: 30,
                });
            }
            imagesLoaded(section, function () {
                section.classList.add('is-loaded');
                msnry.layout();
            });
        } else {
            if (msnry) {
                msnry.destroy();
                msnry = null;
            }
            section.classList.remove('grid');
            articles.forEach((a) => a.classList.remove('grid__item'));
            section.classList.add('is-loaded');
        }

        if (toggle) {
            toggle.hidden = false;
            toggle.textContent = layout === 'grid' ? 'list view' : 'grid view';
        }
    }

    applyLayout(resolveLayout(bucket, readStoredLayouts()));

    if (toggle) {
        toggle.addEventListener('click', function () {
            const next = section.classList.contains('grid') ? 'list' : 'grid';
            writeStoredLayout(bucket, next);
            applyLayout(next);
        });
    }
}

if (typeof document !== 'undefined') {
    initLayout();
}

if (typeof module !== 'undefined') {
    module.exports = {
        getLayoutBucket,
        resolveLayout,
        LAYOUT_STORAGE_KEY,
    };
}
```

Note: if Task 4 already added a `module.exports` block, merge these keys into it rather than adding a second `module.exports` assignment (the later one would silently overwrite the earlier).

- [ ] **Step 8: Run the tests to verify they pass**

Run: `node /Users/kate/projects/simblr/js/theme.test.js`
Expected: prints `layout tests passed`, exit code 0.

- [ ] **Step 9: Verify theme.js syntax**

Run: `node --check /Users/kate/projects/simblr/js/theme.js`
Expected: no output, exit code 0.

- [ ] **Step 10: Add the grid, responsive, and toggle CSS**

Replace the empty `/* -- grid --- */` section at the bottom of `css/base.css` with:
```css
/* -- grid ------------------------------------------------------------ */

.posts {
    margin: 0 0 0 375px;
    max-width: 900px;
}

/* Sizers are measurement-only: invisible, and ignored in list layout. */
.grid__col-sizer,
.grid__gutter-sizer {
    height: 0;
}

.grid__col-sizer {
    width: 50%;
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

/* Avoid the load-then-jump flicker: hide until Masonry has measured. */
.posts:not(.is-loaded) {
    opacity: 0;
}

.posts.is-loaded {
    opacity: 1;
    transition: opacity .3s ease;
}

/* -- layout toggle ------------------------------------------------------- */

.layout-toggle {
    display: inline-block;
    padding: 0;
    border: 0;
    background: var(--primary-bg-color);
    font-size: .8em;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    font-family: "Lato", sans-serif;
    color: var(--muted-text-color);
    cursor: pointer;
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

    .posts {
        margin: 0 25px;
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

    .pagination {
        margin: 50px 25px;
        padding: 25px 0 0 0;
    }
}
```

Note: this depends on `--muted-text-color`, defined in Task 5. If executing strictly in order, the toggle text will fall back to inheriting until Task 5 lands — harmless, and resolved once Task 5 runs.

- [ ] **Step 11: Manual verification**

In Tumblr's live preview: home feed defaults to a 2-column grid; a legacy tag page (using a tag from `NARRATIVE_TAGS`) defaults to one column; a builds tag page defaults to grid. Click the sidebar toggle on each — layout switches immediately, and the label updates. Reload: the toggled choice persists. Toggle grid on a catalog tag, then visit a narrative tag — it should still be one column (per-bucket memory). Narrow the browser under 700px: grid collapses to a single column and sidebars stack above the feed.

- [ ] **Step 12: Commit**

```bash
cd /Users/kate/projects/simblr && git add theme.html js/theme.js js/theme.test.js css/base.css && git commit -m "Add per-page-kind layout resolution with reader toggle and responsive grid"
```

---

### Task 4: Implement opt-in repost dedup

**Files:**
- Modify: `js/theme.js` (add dedup logic, run before layout init)
- Modify: `js/theme.test.js` (append dedup tests; created in Task 3)

**Interfaces:**
- Produces: `getPostsToHide(posts)` — pure function. Input: array of `{ rootUrl: string, superseded: boolean }` objects in DOM order (Tumblr lists newest-first, so index 0 is the newest post). Output: a `Set<number>` of indices that should be removed. A post is only included if it's tagged `superseded` AND at least one other post sharing its `rootUrl` is NOT tagged `superseded` (guarantees at least one visible copy always survives, and a stray `superseded` tag with no matching duplicate on the page does nothing).
- Consumes: `root-url` and `data-tags` attributes from Task 2.

**Ordering requirement:** dedup must run *before* `initLayout()` from Task 3, so Masonry never measures posts that are about to be removed. Task 3's `initLayout()` snapshots `articles` once at init; removing DOM nodes afterward would leave stale references and a gap in the grid.

- [ ] **Step 1: Write the failing test**

Append to `js/theme.test.js` (created in Task 3 — add this below the layout tests, reusing the existing `require`; add `getPostsToHide` to that destructured import rather than requiring the module twice):
```javascript
const { getPostsToHide } = require('./theme.js');

// A stray "superseded" tag with no duplicate on the page does nothing.
assert.deepStrictEqual(
    getPostsToHide([{ rootUrl: 'a', superseded: true }]),
    new Set()
);

// Older post tagged superseded, newer post (index 0) is not — hide the older one.
assert.deepStrictEqual(
    getPostsToHide([
        { rootUrl: 'a', superseded: false },
        { rootUrl: 'a', superseded: true },
    ]),
    new Set([1])
);

// Neither post tagged — nothing hidden even though they duplicate.
assert.deepStrictEqual(
    getPostsToHide([
        { rootUrl: 'a', superseded: false },
        { rootUrl: 'a', superseded: false },
    ]),
    new Set()
);

// Both copies tagged superseded — refuse to hide everything, keep both visible.
assert.deepStrictEqual(
    getPostsToHide([
        { rootUrl: 'a', superseded: true },
        { rootUrl: 'a', superseded: true },
    ]),
    new Set()
);

// Different root URLs never interact, even if one is tagged superseded.
assert.deepStrictEqual(
    getPostsToHide([
        { rootUrl: 'a', superseded: false },
        { rootUrl: 'b', superseded: true },
    ]),
    new Set()
);

console.log('dedup tests passed');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node /Users/kate/projects/simblr/js/theme.test.js`
Expected: the layout tests still pass, then it throws on `getPostsToHide` not being exported yet.

- [ ] **Step 3: Add the pure function and DOM wiring to js/theme.js**

Insert into `js/theme.js` above Task 3's `initLayout()` definition:

```javascript
function getPostsToHide(posts) {
    const groups = new Map();
    posts.forEach((post, i) => {
        if (!groups.has(post.rootUrl)) {
            groups.set(post.rootUrl, []);
        }
        groups.get(post.rootUrl).push(i);
    });

    const hide = new Set();
    groups.forEach((indices) => {
        if (indices.length < 2) return;
        const hasVisibleSurvivor = indices.some((i) => !posts[i].superseded);
        if (!hasVisibleSurvivor) return;
        indices.forEach((i) => {
            if (posts[i].superseded) hide.add(i);
        });
    });
    return hide;
}

function removeSupersededReposts() {
    const articles = Array.from(document.querySelectorAll('article.posts'));
    const posts = articles.map((article) => ({
        rootUrl: article.getAttribute('root-url') || '',
        superseded: (article.dataset.tags || '')
            .split('|')
            .includes('superseded'),
    }));

    getPostsToHide(posts).forEach((i) => articles[i].remove());
}
```

Then update the two bottom blocks that Task 3 added, so dedup runs first and both functions are exported from a single `module.exports`:

```javascript
if (typeof document !== 'undefined') {
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

- [ ] **Step 4: Run the test to verify it passes**

Run: `node /Users/kate/projects/simblr/js/theme.test.js`
Expected: prints `layout tests passed` then `dedup tests passed`, exit code 0.

- [ ] **Step 5: Verify theme.js still has valid browser syntax**

Run: `node --check /Users/kate/projects/simblr/js/theme.js`
Expected: no output, exit code 0.

- [ ] **Step 6: Manual verification**

On your live Tumblr blog (or the Edit HTML preview), tag an older duplicate post `superseded` and confirm it disappears from the rendered feed while its newer self-reblog (with the download link) stays visible. Confirm a post tagged `superseded` with no actual duplicate on the page is unaffected.

- [ ] **Step 7: Commit**

```bash
cd /Users/kate/projects/simblr && git add js/theme.js js/theme.test.js && git commit -m "Add opt-in repost dedup via superseded tag"
```

---

### Task 5: Port ref.html's sidebar, nav, and pagination chrome into css/base.css

**Files:**
- Modify: `css/base.css`

**Interfaces:**
- Produces: new `:root` custom properties (`--title-color`, `--blog-title-color`, `--border-color`, `--text-border-color`, `--scrollbar-color`, `--muted-text-color`, `--heading-font`) that Task 6 also uses for post-body components.
- Consumes: nothing from earlier tasks (independent CSS-only change); targets `theme.html`'s existing sidebar/nav/pagination classes (`#sidebar-left`, `#sidebar-right`, `.avatar`, `.title`, `.description`, `.menu`, and the `.pagination` footer added in Task 1).

**Context:** `ref.html`'s inline `<style>` block (lines 43-692) doesn't use CSS custom properties — it uses Tumblr's live customizer field syntax directly (e.g. `{color:background}`). The concrete default values live in `ref.html`'s `<meta name="color:...">` tags (lines 13-20). This task ports those defaults as fixed values into this project's `:root` var system, per the approved design (§4) — colors become static for now, not wired to new Tumblr customizer fields (that would be new scope beyond the spec).

- [ ] **Step 1: Extend the `:root` color and font tokens**

Find:
```css
:root {
    --primary-bg-color: #ffffff;
    --primary-text-color: #111111;
}
```

Replace with:
```css
:root {
    --primary-bg-color: #ffffff;
    --primary-text-color: #111111;
    --title-color: #000000;
    --blog-title-color: #000000;
    --border-color: #f5f5f5;
    --text-border-color: #eeeeee;
    --scrollbar-color: #d5d5d5;
    --muted-text-color: rgba(17, 17, 17, .6);
    --heading-font: 600 .85em/1.25em "Lato", sans-serif;
}
```

Note: `--muted-text-color` uses `17, 17, 17` (the RGB of `--primary-text-color`'s `#111111`) rather than porting `ref.html`'s own text color, since this project already made its own choice there. `ref.html`'s default `--primary-text-color` equivalent was `#cccccc` (light gray) — very low contrast against `#ffffff`; keeping the existing `#111111` on purpose rather than porting that value. Flag this for a later pass since you mentioned wanting to adjust things like borders — text contrast may be worth a similar look.

Also note: `{color:Link hover}` already exists as a Tumblr customizer field in `theme.html` (default `#f08dbd`) — do not overwrite that default with `ref.html`'s `#eeeeee`; it's this project's own prior choice.

- [ ] **Step 2: Add scrollbar styling**

Add to `css/base.css` (new section, after the `:root` block):
```css
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

- [ ] **Step 3: Style the left sidebar (profile/nav)**

Add:
```css
/* -- sidebar ------------------------------------------------------------ */

#sidebar-left {
    position: fixed;
    top: 0;
    left: 0;
    width: 275px;
    padding: 150px 50px 50px 50px;
    max-height: calc(100vh - 200px);
    overflow-y: auto;
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

#sidebar-right {
    position: fixed;
    top: 0;
    right: 0;
    width: 275px;
    padding: 150px 50px 50px 50px;
    max-height: calc(100vh - 200px);
    overflow-y: auto;
}
```

- [ ] **Step 4: Style the nav menu (dotted-underline links)**

Add:
```css
/* -- nav ------------------------------------------------------------ */

.menu li {
    display: block;
    position: relative;
    margin-bottom: 5px;
    list-style: none;
}

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

.menu a {
    display: inline-block;
    font-size: .8em;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    font-family: "Lato", sans-serif;
    color: var(--muted-text-color);
    padding-right: 10px;
    background: var(--primary-bg-color);
}
```

- [ ] **Step 5: Style the pagination footer**

Add:
```css
/* -- pagination ------------------------------------------------------------ */

.pagination {
    position: relative;
    display: block;
    margin: 50px 0 150px 375px;
    padding: 50px 0 0 100px;
    color: var(--muted-text-color);
    border-top: 1px solid var(--border-color);
    border-left: 1px solid var(--border-color);
}

.pagination a {
    display: inline-block;
    margin: 0 10px 0 0;
    color: var(--muted-text-color);
}
```

- [ ] **Step 6: Manual verification**

Open `theme.html` via Tumblr's live preview (or a local static copy with placeholder content, per `work-docs/GETTING_STARTED.md` §5's dev-loop notes). Confirm: left sidebar is fixed-position with uppercase small-caps title and dotted-underline nav links; right sidebar (when an image is set) sits fixed on the opposite edge; Previous/Next links at the bottom are indented past the sidebar width and separated by a border.

- [ ] **Step 7: Commit**

```bash
cd /Users/kate/projects/simblr && git add css/base.css && git commit -m "Port ref.html sidebar, nav, and pagination styling into base.css"
```

---

### Task 6: Port ref.html's post-card typography and reblog-trail styling

**Files:**
- Modify: `css/base.css`

**Interfaces:**
- Consumes: `:root` tokens from Task 5 (`--title-color`, `--border-color`, `--text-border-color`, `--muted-text-color`, `--heading-font`).

**Context:** `{PostNotes}` in `theme.html` outputs Tumblr's own generated markup for the reblog trail and notes list — it uses Tumblr's fixed class names (`.comment`, `.user`, `ol.notes li`, etc.), not this project's custom classes, so `ref.html`'s CSS for that content ports over unchanged. Post titles and tag lists, however, use this project's own class names (`.post-title`, `.tagscont`), which differ from `ref.html`'s (`.title`, `.tags`) — those get the same visual treatment applied to the correct selectors.

- [ ] **Step 1: Style post titles**

Add to `css/base.css`:
```css
/* -- post titles ------------------------------------------------------------ */

.post-title {
    color: var(--title-color);
    font: var(--heading-font);
    position: relative;
    text-transform: uppercase;
    letter-spacing: 2.5px;
    font-weight: 600;
}

.post-title a {
    color: var(--title-color);
}
```

- [ ] **Step 2: Style the tags list**

Add:
```css
/* -- tags ------------------------------------------------------------ */

.tagscont a {
    color: var(--muted-text-color);
    margin-right: 5px;
    display: inline;
}

.tagscont a:after {
    content: ',';
}

.tagscont a:last-of-type {
    margin-right: 0;
}

.tagscont a:last-of-type::after {
    display: none;
}
```

- [ ] **Step 3: Style the Tumblr-generated reblog trail and notes**

Add:
```css
/* -- reblog trail & notes (Tumblr-generated markup via {PostNotes}) --------- */

.comment {
    margin: 0;
    padding: 0 0 10px 0;
    border-top: 1px dotted var(--border-color);
    list-style: none;
}

.comment a {
    border-bottom: 1px solid var(--text-border-color);
}

.comment:first-of-type {
    border: 0;
}

.comment:before,
ol.notes li:before {
    display: none;
}

.user {
    border: 0 !important;
    display: block;
    margin-bottom: 10px;
}

article .comment:first-of-type .user {
    display: none;
}

.comment .user:after {
    content: ' commented:';
}

.comment:last-of-type {
    padding-bottom: 0;
}
```

- [ ] **Step 4: Manual verification**

In Tumblr's live preview, open a post with a reblog trail and check tags: post titles render uppercase with letter-spacing; tags are comma-separated inline links; the reblog trail shows each commenter's name followed by "commented:" with a dotted divider between entries.

- [ ] **Step 5: Commit**

```bash
cd /Users/kate/projects/simblr && git add css/base.css && git commit -m "Port ref.html post title, tags, and reblog-trail styling into base.css"
```

---

### Task 7: Write pages/downloads.html

**Files:**
- Modify: `pages/downloads.html` (currently empty)

**Interfaces:**
- Consumes: none (static content fragment). Links use relative `/tagged/...` URLs, which resolve correctly once pasted into Tumblr's Pages editor on the live blog.

**Context:** Per `work-docs/GETTING_STARTED.md`, files under `pages/` are not fetched by Tumblr — they're local backups of content you hand-copy into Settings → Pages. When rendered live, Tumblr wraps this content in the same theme chrome (sidebar, etc.) as any other page, so this file should contain only the inner content, not a full `<html>` document.

- [ ] **Step 1: Write the page content**

Replace the full (currently empty) contents of `pages/downloads.html` with:
```html
<div class="page-directory">
    <h1 class="post-title">Downloads</h1>
    <p>All CC and saves are free to use. Please don't reupload or claim as your own — a like/reblog or credit when you use something is always appreciated.</p>

    <h2 class="post-title">The Sims 2</h2>
    <ul>
        <li><a href="/tagged/ts2-downloads">All TS2 downloads</a></li>
    </ul>

    <h2 class="post-title">The Sims 3</h2>
    <ul>
        <li><a href="/tagged/ts3-downloads">All TS3 downloads</a></li>
    </ul>
</div>
```

- [ ] **Step 2: Style the directory list**

Add to `css/base.css`:
```css
/* -- page directories (downloads/nav) --------------------------------------- */

.page-directory ul {
    margin: 0 0 25px 0;
    padding: 0;
    list-style: none;
}

.page-directory li {
    margin-bottom: 5px;
}

.page-directory a {
    color: var(--muted-text-color);
}
```

- [ ] **Step 3: Manual verification**

Copy the contents of `pages/downloads.html` into a new Tumblr Page (Settings → Pages → Add a Page → Edit HTML source), title it "Downloads", enable "show link on blog", save, and confirm it renders inside the normal theme chrome with working tag links.

- [ ] **Step 4: Commit**

```bash
cd /Users/kate/projects/simblr && git add pages/downloads.html css/base.css && git commit -m "Write downloads page content and directory list styling"
```

---

### Task 8: Write pages/nav.html

**Files:**
- Modify: `pages/nav.html` (currently empty)

**Interfaces:**
- Consumes: `.page-directory` styling from Task 7.

- [ ] **Step 1: Write the page content**

Replace the full (currently empty) contents of `pages/nav.html` with:
```html
<div class="page-directory">
    <h1 class="post-title">Navigation</h1>

    <h2 class="post-title">The Sims 2</h2>
    <ul>
        <li><a href="/tagged/ts2-builds">Builds</a></li>
        <li><a href="/tagged/ts2-legacies">Legacies</a></li>
        <li><a href="/tagged/ts2-worlds">Worlds</a></li>
    </ul>

    <h2 class="post-title">The Sims 3</h2>
    <ul>
        <li><a href="/tagged/ts3-builds">Builds</a></li>
        <li><a href="/tagged/ts3-legacies">Legacies</a></li>
        <li><a href="/tagged/ts3-worlds">Worlds</a></li>
    </ul>
</div>
```

Note: add one `<li>` per specific family/legacy tag as you create them (e.g. `/tagged/ts2-legacy-<familyname>`) — this file is meant to grow incrementally, per the approved design (§3).

- [ ] **Step 2: Manual verification**

Copy the contents of `pages/nav.html` into a new Tumblr Page titled "Navigation", enable "show link on blog", save, and confirm both pages (Downloads and Navigation) now appear in the sidebar nav list (via the existing `{block:HasPages}{block:Pages}` loop at `theme.html`'s sidebar — no code change needed for that part).

- [ ] **Step 3: Commit**

```bash
cd /Users/kate/projects/simblr && git add pages/nav.html && git commit -m "Write navigation page content"
```

---

### Task 9: Update work-docs/GETTING_STARTED.md

**Files:**
- Modify: `work-docs/GETTING_STARTED.md`

**Context:** This doc's "Decisions made so far" (§1a) and "Next steps" (§6) sections are now stale — they describe Magic Grid (superseded by Masonry + this plan's tag-page-only grid), infinite scroll (removed), and a ref.html/ref2.html pairing that turned out to be backwards. Leaving it stale caused confusion at the start of this session; update it so future sessions start from accurate state.

- [ ] **Step 1: Replace the "Decisions made so far" section**

Find the `## 1a. Decisions made so far` section and replace its bullet list with:
```markdown
- **Layout follows content type, not page location.** Catalog content (builds, downloads,
  screenshots) defaults to a 2-column Masonry grid; narrative content (legacies, family tags)
  defaults to one column. Defaults by page kind: home → grid, catalog tags → grid, narrative tags
  → one column, permalink → one column. Narrative tags are listed in `NARRATIVE_TAGS` in
  `js/theme.js` — add new legacy/family tags there, or they'll default to grid.
- **Reader layout toggle**: sidebar button switches grid/list on any multi-post page, remembered
  in `localStorage` **per page kind** (key `simblr-layout`), so choosing grid for downloads doesn't
  also flatten legacies. The hardcoded narrative list only sets the *default*, never a hard rule.
- **Grid density**: 2 columns desktop, 1 column under 700px. Column width lives in CSS on
  `.grid__col-sizer`, which Masonry measures — no separate mobile layout. 2 rather than the usual
  3–4 on purpose: dense grids read as overwhelming and impersonal.
- **Grid technique**: Masonry v4 + imagesLoaded (both self-hosted in `js/vendor/`, downloaded from
  unpkg.com). The feed stays hidden until imagesLoaded fires, then fades in — this is what prevents
  the load-then-jump flicker. No infinite scroll anywhere — numbered
  `{block:PreviousPage}`/`{block:NextPage}` links only, since infinite scroll's URL-rewrite didn't
  solve the "lose my scroll position" problem it was meant to.
- **Repost dedup**: opt-in only. Tag an older, truly-superseded repost `superseded` and a JS pass
  removes it if a newer post shares its `root-url` attribute. No automatic hiding based on content
  matching, since some reposts of the same original carry genuinely different content.
- **Custom pages**: `pages/downloads.html` and `pages/nav.html` are static link directories into
  Tumblr's native tag pages (e.g. `/tagged/ts2-builds`), not per-category custom pages. Both show
  up in the sidebar automatically via the existing `{block:Pages}` loop once added as real Tumblr
  Pages with "show link on blog" enabled.
- **Visual base**: `ref.html` (not `ref2.html`) is the aesthetic + layout + post-card-content base
  — its sidebar, nav, pagination, and post-card CSS were ported into `css/base.css`. `ref2`/`ref3`/
  `ref4` remain available as references for unrelated future features.
- **Dark mode file split**: two files (`css/base.css` + `css/dark.css`) rather than one file with
  `:root`/`[data-theme="dark"]` variable blocks — still the plan, not yet implemented.
- **Repo visibility / hosting**: repo is public, GitHub Pages is live at
  `https://kate-j-xia.github.io/simblr/`, and `theme.html`'s `<head>` links point there.
```

- [ ] **Step 2: Replace the "Next steps" section**

Find the `## 6. Next steps` section and replace its numbered list with:
```markdown
1. **Dark mode**: fill in `css/dark.css` with dark-palette variable overrides, then write the
   toggle logic in `js/theme.js` (button handler, `localStorage`, `prefers-color-scheme` default).
2. **Responsive breakpoints**: adjust the sidebar/grid for mobile — only once the desktop version
   feels right.
3. **Tag hygiene**: as you post, keep tagging consistently by game + category (`ts2-builds`,
   `ts3-downloads`, etc.) so `pages/nav.html` and `pages/downloads.html` stay accurate — add a new
   `<li>` there whenever a new category/family gets its own tag, and add narrative tags to
   `NARRATIVE_TAGS` in `js/theme.js` so they default to one column.
4. **Polish**: cross-device check, screenshots, revisit border styling (flagged as a follow-up
   during the `ref.html` port), fill out a proper install doc.
```

- [ ] **Step 3: Commit**

```bash
cd /Users/kate/projects/simblr && git add work-docs/GETTING_STARTED.md && git commit -m "Update GETTING_STARTED.md to reflect current theme design decisions"
```
