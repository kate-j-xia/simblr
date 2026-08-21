# ref.html Replica in a Clean Codebase — Design

**Status:** approved in chat, pending written review
**Supersedes:** Tasks 5–6 of `2026-08-21-theme-layout-and-pages.md` (partially — see §8)

## 1. Goal

Reproduce `ref.html`'s visual design in this project's split HTML/CSS/JS architecture, with
markup and stylesheets organized well enough to build on for years. Two goals, equally weighted:

1. **Visual fidelity** to `ref.html` — its typography, spacing, rails, and post-card structure.
2. **Code quality** — `ref.html` is a single 804-line file with 300-character CSS lines, inline
   `{color:...}` calls, and no separation between concerns. The replica must not inherit that.

Non-goal: replicating `ref.html`'s *implementation*. Its jQuery dependency, CDN links, and
customizer-field-in-CSS pattern are explicitly rejected.

## 2. The core problem

`theme.html`'s current post loop (~330 lines) was ported from `ref3.html`, a different theme.
`ref.html`'s post loop is 45 lines with a fundamentally different structure:

| | `ref3.html` (what we have) | `ref.html` (what we want) |
|---|---|---|
| Post header | avatar + username + timeago row | **none** |
| Attribution | header | `.when` footer: "Posted on DATE … originally by X" |
| Wrappers | `post-outer` › `post-inner` › `post-body` › `post-body-inner` | `article` › `.media` › `.ph` |
| Reblog trail | `.comment-header` / `.comment-body` | `li.comment` › `a.user` |
| Tags | `.tagscont` | `.tags` |

This is why ~65 emitted classes have no CSS: they belong to a theme we are not building. The fix
is to replace the loop, not to style it.

## 3. Decisions made

| Question | Decision |
|---|---|
| ref3 features (like/reblog buttons, note count) | **Keep the button row**, restyled to `ref.html`'s understated look. Drop the post header, pinned indicator, and timeago. |
| Photosets | **Vanilla row layout.** Pure function parses `{PhotosetLayout}`; no jQuery, no pxuphotoset. |
| Typography | **Lora (body) + Lato (headings/nav)**, replacing JetBrains Mono. |
| Grid vs single column | **Grid-first (approach A).** Keep the Task 1–4 grid + toggle. `ref.html`'s rail applies in list mode; grid mode drops it. |

## 4. Architecture

### 4.1 CSS file split

`css/base.css` is 342 lines and would roughly double. Split by concern, each linked from
`theme.html`'s `<head>`:

| File | Owns |
|---|---|
| `css/tokens.css` | `:root` custom properties only — colors, fonts. The single place to change the palette. |
| `css/base.css` | Reset, body typography, links, headings, scrollbar. No layout, no components. |
| `css/layout.css` | Sidebars, `section.posts` rail, Masonry grid, pagination, layout toggle, all responsive rules. |
| `css/posts.css` | Post-card internals: media, captions, trail, tags, `.when`, asks, chats, audio, notes. |
| `css/dark.css` | Dark-mode token overrides. Stays empty for now. |

`tokens.css` must load first; the rest are order-independent by design (no cross-file selector
overrides). Load order in `<head>` is tokens → base → layout → posts → dark.

**Rejected:** a single large file (what we have — already unwieldy), and per-post-type files
(`photo.css`, `chat.css` — too granular; they'd share too much).

### 4.2 Formatting conventions

These are the checkable part of "properly formatted." All CSS in this project:

- One declaration per line; one selector per line in a selector list.
- 4-space indent (matches the existing file).
- Lowercase hex, hyphenated lowercase custom properties (`--muted-text-color`).
- Every file opens with a comment naming what it owns; every section gets a banner comment.
- **No Tumblr template syntax, ever.** External CSS is never templated — `{color:x}` and
  `{select:x}` are dead text. `ref.html` uses them heavily; every one becomes a `:root` token.
- **Element-qualify ambiguous selectors.** `class="posts"` is on both the `<section>` and every
  `<article>`; always write `section.posts` / `article.posts`. This has already caused one bug.
- No `!important` except where overriding Tumblr's own injected styles; comment why when used.

### 4.3 `theme.html` structure

Replace the ref3 post loop with `ref.html`'s, reformatted for readability: one Tumblr block per
line where it fits, nested blocks indented, a comment above each post-type section. `ref.html`
packs `{block:Text}`, its title, the reblog loop, and the not-reblog branch onto one 400-character
line; ours will be a readable multi-line block.

Post skeleton:

```
article.posts
  .title           (Text/Link/Quote titles)
  .media > .ph     (Photo, Photoset, Video)
  li.comment       (captions & reblog trail, with a.user)
  .when            (date, "originally by", tags)
  .post-btns       (kept from ref3, restyled)
```

### 4.4 `js/theme.js`

Add one pure function alongside the existing tested pair, plus its DOM wiring:

- `getPhotosetRows(layout)` — `"221"` → `[2, 2, 1]`. Returns `[]` for empty/invalid input.
- `layoutPhotosets()` — reads `data-layout`, wraps images into flex row `<div>`s.

Must run **before** Masonry measures, alongside `removeSupersededReposts()`. Ordering in the
existing entry point becomes: dedup → photosets → layout.

File organization: pure functions at top, DOM wiring below, single entry point and single
`module.exports` at the bottom. This is the existing shape; keep it.

## 5. Visual details to port

- **Rail:** `section.posts` gets `border-left` + `padding-left: 100px` in list mode only. This
  fixes a Task 5 bug where the rail was applied to `.pagination` alone, indenting pagination
  100px past the posts.
- **Title underline:** `.title:after` is a 1px rule extending `calc(100% + 100px)` with
  `margin-left: -100px`, so it crosses the rail. Same trick on `.q:after` for asks.
- **`.when` footer:** muted, uppercase, 1.4em round inline avatar for the reblog-root portrait.
- **Tags:** inline, comma-free, muted, with a leading tag glyph.
- **Button row (`.post-btns`):** kept from ref3 but restyled to match `.when` rather than
  `ref3.html`'s pill buttons — meaning: sits directly below `.when`, inherits its muted color and
  uppercase Lato treatment, icons at `1.2em` inline with the text, no borders, no background, no
  hover fill. Concretely it should read as a continuation of the footer, not as a widget.

`ref.html`'s tag/settings glyphs are inline SVG. Keep them as inline SVG (not Material Icons) —
they're `currentColor`-fillable and need no network request. Material Icons stays linked for the
button row.

## 6. Testing

- `node js/theme.test.js` — existing layout + dedup tests, plus new `getPhotosetRows` cases
  (`"221"`, `"3"`, `""`, malformed input).
- `node --check js/theme.js`.
- Balanced-block check for the new post loop across `Posts`, `Text`, `Photo`, `Photoset`, `Video`,
  `Audio`, `Answer`, `Chat`, `Quote`, `Link`, `Date`, `HasTags`, `RebloggedFrom`, `NotReblog`.
- Visual verification in Tumblr's preview — the only way to see `{LikeButton}`, `{PostNotes}`,
  Lightbox, and real photosets.

## 7. Risks

- **Big-bang markup replacement.** The post loop is replaced wholesale, so a mistake affects every
  post type at once. Mitigate by porting post types one at a time, verifying block balance after
  each, rather than one giant edit.
- **Verification is manual and remote.** No local harness exists (removed earlier by request).
  Every visual check costs a merge to `main` + paste into Tumblr. Consider rebuilding
  `dev/preview.html` as the first task — it would pay for itself across this many changes.
- **Grid mode is under-specified by `ref.html`.** `ref.html` has no two-column mode, so card
  spacing in grid is our own judgment, not a port.

## 8. Relationship to the existing plan

Tasks 1–4 of `2026-08-21-theme-layout-and-pages.md` stand. Tasks 5–6 are partially superseded:
their `:root` tokens, sidebar, nav, and `.comment`/`.user` trail rules survive and move into the
new files; the `.pagination` rail moves to `section.posts`; `.tagscont` and `.post-title` are
replaced by `ref.html`'s `.tags` and `.title`. Tasks 7–9 are unaffected.
