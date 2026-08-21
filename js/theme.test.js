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
