# Theme layout, custom pages, and repost dedup — design

Date: 2026-08-21
Status: approved, pending implementation plan

## Context

The theme (`theme.html` + `css/`/`js/`) has markup for a full posts loop and sidebars, plus
Masonry/InfiniteScroll wiring added in an earlier session under the assumption that the home
feed itself would be a grid. This design revises that assumption and settles the remaining open
questions about page structure, pagination, duplicate-repost handling, and visual base.

Reference files in the repo root (`ref.html`, `ref2.html`, `ref3.html`, `ref4.html`) are
self-contained example Tumblr themes used as design/feature sources, not code to link against
directly (see `work-docs/GETTING_STARTED.md` §3 for why — different architecture, one file per
theme vs. this project's split `css/`/`js`/`theme.html`).

## 1. Page architecture & pagination

- **Home (`{block:IndexPage}`)**: single-post-at-a-time, as already built. No Masonry, no grid
  classes here.
- **Tag pages (`{block:TagPage}`)**: any `/tagged/...` URL. Same `theme.html`, but switches to
  Masonry grid layout via a `{block:TagPage}` conditional on the posts container's classes.
  Tumblr filters posts to the tag automatically — no separate custom page needed per tag/category.
- **Pagination**: classic `{block:PreviousPage}` / `{block:NextPage}` links (already present in
  the markup) everywhere, full page load on click. No infinite scroll anywhere in the theme.
  Reason: the InfiniteScroll library's `history` option only cosmetically rewrites the URL as you
  scroll — it doesn't produce real separate pages or reliably restore scroll position on
  back-navigation, which was the specific pain point (losing position while hunting through
  downloads).
- **Consequence for existing code**: this reverses part of an earlier "quick fix" pass.
  - `js/theme.js` should be simplified: keep Masonry (still needed for tag-page grids), drop the
    `InfiniteScroll(...)` wiring entirely.
  - `theme.html`: the `.grid` / `.grid__item` / sizer classes currently added unconditionally to
    the posts loop need to move behind a `{block:TagPage}` check instead of wrapping every post.
  - `.pagination__next` / `.page-load-status` classes added for InfiniteScroll's `path`/`status`
    hooks are no longer needed and should be removed along with the InfiniteScroll vendor script
    tag and `js/vendor/infinite-scroll.pkgd.min.js`.

## 2. Duplicate-repost handling

**Root cause**: reblogging your own earlier post (e.g. to attach a download link once a file is
ready) creates two separate feed entries (original + self-reblog) containing the same image.
However, not every repost is a true duplicate — some reposts of the same original carry genuinely
different content (different caption, different addition) that should stay visible. A blanket
"same root post = hide the older one" rule would silently swallow those too, which is worse than
the original visual annoyance.

**Approach — opt-in via tag**: no automatic content comparison. Instead, when a repost is truly
superseding an earlier one (nothing new to see in the older post), tag the *older* post with a
fixed marker tag (e.g. `superseded`). A small JS pass after page load (on any page showing
multiple posts — home and tag pages both) hides any post tagged `superseded` **only if** another
visible post shares its `root-url` (so a stray `superseded` tag on a post with no matching repost
on the same page doesn't vanish it). This keeps control per-post and in your hands — reposts with
new content simply never get tagged, so they're untouched.

This still depends on the `root-url` attribute in `theme.html`, which currently has a template bug
(mismatched `{block:NotReblog}` open tags, never closed) that needs fixing for the matching to work
at all.

**Trade-off** (acknowledged, acceptable at this scale): requires you to remember to tag superseded
posts; nothing happens automatically if you forget. That's intentional — it trades a little manual
upkeep for zero risk of hiding content you wanted visible.

## 3. Custom pages

Both become static directory/index pages — hand-copied into Tumblr's Pages editor per the
project's existing workflow (see `work-docs/GETTING_STARTED.md` table) — that link to Tumblr's
native tag pages rather than embedding post content directly:

- **`pages/downloads.html`**: CC/download-focused hub. Short intro (credit policy, terms of use),
  then links grouped by game: `TS2 Downloads` (`/tagged/ts2-downloads`), `TS3 Downloads`
  (`/tagged/ts3-downloads`), plus any download subcategories as they get tagged.
- **`pages/nav.html`**: broader story/content directory. `TS2` and `TS3` sections, each listing
  links to Builds, Legacies, Worlds, specific families, etc. as tagged
  (e.g. `/tagged/ts2-builds`, `/tagged/ts2-legacy-<familyname>`).

Adding a new category later is "add a link + tag consistently" — no new page files, no new theme
code beyond the one shared `{block:TagPage}` grid-mode switch from §1.

**Sidebar listing**: already handled by existing markup — `theme.html` line ~87 has
`{block:HasPages}{block:Pages}<li><a href="{URL}">{Label}</a></li>{/block:Pages}{/block:HasPages}`,
which lists every Tumblr Page with "show link on blog" enabled. No code change needed; just check
that box when creating both pages in Tumblr's dashboard.

## 4. Visual base: porting `ref.html`

`ref.html` is self-contained (inline `<style>`/`<script>`), the opposite of this project's split
architecture. Porting means extracting its CSS into this project's token system, not copying the
file wholesale:

1. Pull `ref.html`'s color palette, fonts, and spacing into `css/base.css`'s `:root` custom
   properties, extending what's already there (`--primary-bg-color`, `--primary-text-color`, etc.)
2. Port its layout chrome — sidebar styling, header, and **post card structure/content**
   (placement of likes, profile name, date, etc. per post) — into `css/base.css` as the starting
   point for the UI pass.
3. This supersedes the stale plan in `work-docs/GETTING_STARTED.md` §1a, which had the pairing
   backwards (ref.html for grid layout, ref2.html for aesthetic). `ref.html` is now the layout +
   aesthetic + content-structure base; `ref2`/`ref3`/`ref4` remain available as feature references
   for later, unrelated work.
4. User has already flagged follow-up visual tweaks (e.g. borders, sourced from a different
   reference file) as wanted later — explicitly out of scope for this port; port `ref.html`
   as-is first, adjust after.

**Out of scope for this design** (tracked separately in `work-docs/GETTING_STARTED.md` step 6):
the dark/light toggle mechanism. `ref.html` has toggle code, but which reference's approach to
actually implement is a future decision.

## Open items for implementation planning

- Fix the `root-url` attribute's mismatched `{block:NotReblog}` tags (blocking §2).
- Decide exact CSS selectors/BEM-ish naming for the `{block:TagPage}` grid-mode switch so it
  doesn't collide with home-feed post styling.
- `work-docs/GETTING_STARTED.md` should be updated to reflect this design (stale "Decisions made
  so far" and "Next steps" sections) once implementation starts.
