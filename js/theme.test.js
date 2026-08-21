const assert = require('assert');
const {
    getLayoutBucket,
    resolveLayout,
    getPostsToHide,
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
