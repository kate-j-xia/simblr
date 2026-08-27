const LAYOUT_STORAGE_KEY = 'simblr-layout';
const THEME_STORAGE_KEY = 'simblr-theme';

// Tags whose pages default to a single column. These set the *default* only —
// the reader can always toggle, and an unlisted tag just defaults to grid.
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

// Precedence: the reader's stored choice, then the blog-level "Dark default"
// customizer option, then the operating system. The blog default outranks the
// OS because it is the owner's stated design intent for a first-time visitor;
// anyone who disagrees clicks the toggle once and their choice is stored, which
// then outranks both.
//
// Kept pure and separate from the DOM because the same rule runs twice: here,
// and in the inline <head> snippet in theme.html that applies the theme before
// first paint. If you change this, change that snippet too.
function resolveTheme(stored, prefersDark, blogDefault) {
    if (stored === 'dark' || stored === 'light') return stored;
    if (blogDefault === 'dark') return 'dark';
    return prefersDark ? 'dark' : 'light';
}

function readStoredTheme() {
    try {
        return localStorage.getItem(THEME_STORAGE_KEY);
    } catch (e) {
        return null;
    }
}

function writeStoredTheme(theme) {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {
        /* private browsing — preference just won't persist */
    }
}

function initTheme() {
    const root = document.documentElement;
    const toggle = document.querySelector('.theme-toggle');
    const media = window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;

    function applyTheme(theme) {
        root.dataset.theme = theme;
        if (toggle) {
            toggle.hidden = false;
            // Label is static and names the setting; state lives in
            // aria-pressed, which CSS reads to fill the icon.
            toggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
        }
    }

    // The inline <head> snippet already applied the theme; re-resolving here
    // keeps the two in step and wires up the button once the DOM exists.
    applyTheme(resolveTheme(
        readStoredTheme(),
        media ? media.matches : false,
        root.dataset.themeDefault
    ));

    if (toggle) {
        toggle.addEventListener('click', function () {
            const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
            writeStoredTheme(next);
            applyTheme(next);
        });
    }

    // Follow the OS while the reader has expressed no preference of their own.
    // Once they have clicked the toggle, their choice is stored and this stops
    // overriding it.
    if (media && media.addEventListener) {
        media.addEventListener('change', function (e) {
            if (readStoredTheme()) return;
            if (root.dataset.themeDefault === 'dark') return;
            applyTheme(e.matches ? 'dark' : 'light');
        });
    }
}

// Opt-in dedup: a post is only hidden if it's tagged `superseded` AND another
// post on the page shares its root URL without that tag, so at least one copy
// always survives.
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

// Tumblr serves the same image at many sizes, so two URLs for one photo differ
// only in their /sWxH/ segment. The path segment right after the host is the
// media key and is stable across sizes, which makes it usable as an identity.
// Anything that isn't a recognizable Tumblr media URL falls back to the whole
// string: it still equals itself and can never collide with a real key.
function getTumblrImageKey(src) {
    if (typeof src !== 'string' || src === '') return '';
    const match = src.match(/^https?:\/\/[^/]*media\.tumblr\.com\/(.+)$/);
    if (!match) return src;

    const path = match[1];
    // Modern form: /<hash>/s500x750/filename.jpg — the first segment is the
    // key and is already size-independent.
    if (path.includes('/')) return path.slice(0, path.indexOf('/'));

    // Legacy form: /tumblr_abc123_500.jpg — one flat segment with the size
    // baked into it. Strip the extension and the trailing size token, or the
    // same photo at two sizes yields two keys and the duplicate survives.
    return path.replace(/\.[a-z0-9]+$/i, '').replace(/_[0-9]+(sq)?$/i, '');
}

// On a reblogged photo post Tumblr renders the photo twice: once through
// {block:Photo}/{block:Photoset}, and again inside the root trail entry's
// {Body}. Returns the indices of trail images that merely echo the post's own
// media, so they can be dropped and the trail left carrying only commentary.
//
// Note the asymmetry: with no media, nothing is a duplicate. Erring that way
// means a reblogger's own added image is never removed.
function getDuplicateTrailImages(mediaSrcs, trailSrcs) {
    const duplicates = new Set();
    if (!Array.isArray(mediaSrcs) || !Array.isArray(trailSrcs)) return duplicates;

    const mediaKeys = new Set(
        mediaSrcs.map(getTumblrImageKey).filter((key) => key !== '')
    );
    if (mediaKeys.size === 0) return duplicates;

    trailSrcs.forEach((src, i) => {
        const key = getTumblrImageKey(src);
        if (key !== '' && mediaKeys.has(key)) duplicates.add(i);
    });
    return duplicates;
}

function removeDuplicateTrailImages() {
    document.querySelectorAll('article.posts').forEach((article) => {
        const media = Array.from(article.querySelectorAll('.ph img'));
        const trail = Array.from(article.querySelectorAll('.comment img'));
        if (media.length === 0 || trail.length === 0) return;

        const mediaSrcs = media.map((img) => img.getAttribute('src') || '');
        const trailSrcs = trail.map((img) => img.getAttribute('src') || '');

        getDuplicateTrailImages(mediaSrcs, trailSrcs).forEach((i) => {
            const img = trail[i];
            // Tumblr wraps trail images in a figure/.tmblr-full. Dropping the
            // image alone would leave that wrapper behind as dead vertical
            // space, so take it too once it has nothing else in it.
            const wrapper = img.parentElement;
            img.remove();
            if (
                wrapper &&
                wrapper !== article &&
                wrapper.children.length === 0 &&
                wrapper.textContent.trim() === ''
            ) {
                wrapper.remove();
            }
        });
    });
}

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

function initLayout() {
    const section = document.querySelector('section.posts');
    if (!section) return;

    const bucket = getLayoutBucket(
        section.dataset.pageKind,
        section.dataset.tag,
        NARRATIVE_TAGS
    );
    // Permalinks are always one column, so there is nothing to lay out or
    // toggle — but the feed still has to be revealed, or it stays invisible
    // until the 3s reveal-failsafe animation fires.
    if (bucket === 'permalink') {
        section.classList.add('is-loaded');
        return;
    }

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
            // The label is static and names the setting; state lives in
            // aria-pressed, which CSS reads to fill the icon.
            toggle.setAttribute('aria-pressed', layout === 'grid' ? 'true' : 'false');
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
    // Order matters. Dedup first: initLayout() snapshots the article list, so
    // anything removed afterwards leaves a stale reference and a hole in the
    // grid. Photosets next, because they change post height and Masonry must
    // measure the final layout.
    // Theme first, and independent of the rest: it only sets an attribute on
    // <html>, and it must still run on pages that have no feed to lay out.
    initTheme();
    removeSupersededReposts();
    removeDuplicateTrailImages();
    layoutPhotosets();
    initLayout();
}

if (typeof module !== 'undefined') {
    module.exports = {
        getLayoutBucket,
        resolveLayout,
        getPostsToHide,
        getPhotosetRows,
        getTumblrImageKey,
        getDuplicateTrailImages,
        resolveTheme,
        LAYOUT_STORAGE_KEY,
        THEME_STORAGE_KEY,
    };
}
