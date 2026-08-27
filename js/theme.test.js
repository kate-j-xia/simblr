const assert = require('assert');
const {
    getLayoutBucket,
    resolveLayout,
    getPostsToHide,
    getPhotosetRows,
    getTumblrImageKey,
    getDuplicateTrailImages,
    resolveTheme,
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

// Tumblr serves one image at many sizes. The path segment after the host is
// the media key and is stable across them, so it identifies the image itself.
assert.strictEqual(
    getTumblrImageKey('https://64.media.tumblr.com/abc123/s500x750/pic.jpg'),
    'abc123'
);
assert.strictEqual(
    getTumblrImageKey('https://64.media.tumblr.com/abc123/s1280x1920/pic.jpg'),
    'abc123'
);

// Same image at two sizes must produce the same key; different images must not.
assert.strictEqual(
    getTumblrImageKey('https://64.media.tumblr.com/abc123/s500x750/pic.jpg'),
    getTumblrImageKey('https://64.media.tumblr.com/abc123/s250x400/pic.jpg')
);
assert.notStrictEqual(
    getTumblrImageKey('https://64.media.tumblr.com/abc123/s500x750/pic.jpg'),
    getTumblrImageKey('https://64.media.tumblr.com/def456/s500x750/pic.jpg')
);

// Non-Tumblr and malformed URLs fall back to the whole string, so they still
// compare equal to themselves and never collide with a real media key.
assert.strictEqual(getTumblrImageKey('/local/pic.jpg'), '/local/pic.jpg');
assert.strictEqual(getTumblrImageKey(''), '');
assert.strictEqual(getTumblrImageKey(null), '');
assert.strictEqual(getTumblrImageKey(undefined), '');

console.log('image key tests passed');

const M = 'https://64.media.tumblr.com/aaa/s1280x1920/pic.jpg';
const M_SMALL = 'https://64.media.tumblr.com/aaa/s500x750/pic.jpg';
const OTHER = 'https://64.media.tumblr.com/bbb/s500x750/pic.jpg';

// A trail image matching the post's own media is a duplicate, even at a
// different size — that is the whole point.
assert.deepStrictEqual(
    [...getDuplicateTrailImages([M], [M_SMALL])],
    [0]
);

// A trail image the post does not render is real added content. Keep it.
assert.deepStrictEqual(
    [...getDuplicateTrailImages([M], [OTHER])],
    []
);

// Mixed: only the matching ones go.
assert.deepStrictEqual(
    [...getDuplicateTrailImages([M], [OTHER, M_SMALL, OTHER])],
    [1]
);

// Photosets: several media images, all echoed in the trail.
assert.deepStrictEqual(
    [...getDuplicateTrailImages([M, OTHER], [M_SMALL, OTHER])],
    [0, 1]
);

// Degenerate input must not throw. No media means nothing is a duplicate,
// which is the safe direction: never remove a reblogger's own image.
assert.deepStrictEqual([...getDuplicateTrailImages([], [M])], []);
assert.deepStrictEqual([...getDuplicateTrailImages([M], [])], []);
assert.deepStrictEqual([...getDuplicateTrailImages(null, null)], []);
assert.deepStrictEqual([...getDuplicateTrailImages(undefined, undefined)], []);

console.log('trail dedup tests passed');

// Older posts use a flat filename whose size is baked into the last segment,
// e.g. tumblr_abc_500.jpg vs tumblr_abc_1280.jpg. Without stripping that
// suffix the same photo yields two different keys and the duplicate survives.
assert.strictEqual(
    getTumblrImageKey('https://64.media.tumblr.com/tumblr_abc123_500.jpg'),
    getTumblrImageKey('https://64.media.tumblr.com/tumblr_abc123_1280.jpg')
);
assert.strictEqual(
    getTumblrImageKey('https://64.media.tumblr.com/tumblr_inline_xyz_540.png'),
    getTumblrImageKey('https://64.media.tumblr.com/tumblr_inline_xyz_75sq.png')
);

// Different photos must still not collide once the suffix is stripped.
assert.notStrictEqual(
    getTumblrImageKey('https://64.media.tumblr.com/tumblr_abc123_500.jpg'),
    getTumblrImageKey('https://64.media.tumblr.com/tumblr_def456_500.jpg')
);

// The modern hashed form has no size in the segment; leave it untouched.
assert.strictEqual(
    getTumblrImageKey('https://64.media.tumblr.com/abc123/s500x750/pic.jpg'),
    'abc123'
);

console.log('legacy image key tests passed');

// -- theme resolution -------------------------------------------------------

// With nothing stored and no blog default, the system preference decides.
assert.strictEqual(resolveTheme(null, true, ''), 'dark');
assert.strictEqual(resolveTheme(null, false, ''), 'light');

// A stored choice always wins — over the system and over the blog default.
assert.strictEqual(resolveTheme('light', true, ''), 'light');
assert.strictEqual(resolveTheme('dark', false, ''), 'dark');
assert.strictEqual(resolveTheme('light', true, 'dark'), 'light');

// The blog's "Dark default" option outranks the system preference, but only
// while the reader has not made a choice of their own.
assert.strictEqual(resolveTheme(null, false, 'dark'), 'dark');
assert.strictEqual(resolveTheme(null, true, 'dark'), 'dark');

// Anything else stored is not a choice — fall back rather than trusting a junk
// value onto <html>.
assert.strictEqual(resolveTheme('', true, ''), 'dark');
assert.strictEqual(resolveTheme('sepia', false, ''), 'light');
assert.strictEqual(resolveTheme(undefined, true, ''), 'dark');

// A missing blog default (the attribute absent entirely) must behave as unset,
// not as truthy.
assert.strictEqual(resolveTheme(null, false, undefined), 'light');

console.log('theme tests passed');
