const LAYOUT_STORAGE_KEY = 'simblr-layout';

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
    // Order matters. Dedup first: initLayout() snapshots the article list, so
    // anything removed afterwards leaves a stale reference and a hole in the
    // grid. Photosets next, because they change post height and Masonry must
    // measure the final layout.
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
        LAYOUT_STORAGE_KEY,
    };
}
