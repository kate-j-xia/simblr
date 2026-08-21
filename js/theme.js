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
