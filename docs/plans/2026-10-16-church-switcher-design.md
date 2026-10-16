# Church Switcher Redesign

Approved 2026-10-16 (John picked "Card + list" from the mockup). Replaces the current
`src/common/components/ChurchSwitcher/ChurchSwitcher.tsx` (church name in capitals next to a
person icon, a role dot, a pale-teal react-select that only appears with 2+ churches, and a small
"Manage churches" link).

## What it is

One **church card** at the top of the sidebar, the same for owners and bookkeepers, whether they
have one church or many. Clicking it opens **your churches** with each one's role, plus
**Add church** and **Manage churches**. Who you are moves to the bottom of the sidebar, next to
Log out, so "which church am I working on" and "who am I" stop competing at the top.

## The card (trigger)

- Expanded sidebar: full-width button on the blue sidebar (`bg-white/15`, `border-white/35`,
  rounded-xl). Left: a 34px rounded square badge with the church's first letter (yellow
  `#FFC107`, dark text). Middle: the church name on one line (truncated, full name in `title`),
  and under it the role ("Owner" / "Bookkeeper", plus " · Inactive" when inactive). Right: an
  up/down selector icon.
- Collapsed sidebar: only the badge, as a 36px button; the list opens to the right of the sidebar.
- Mobile drawer: the same card at full width; the list opens in place under it (not floating), so
  the drawer never clips it.
- Accessible name: "Switch church. Current: {name}, {role}". `aria-haspopup`, `aria-expanded`.

## The list (panel)

- White panel, rounded-xl, hairline border, light shadow, 288px wide, scrolls past ~6 rows.
- "Your churches" caption, then one row per church: badge (yellow for the current one, light blue
  for others, grey for inactive), name (one line, `title` for the full name), role line, and a
  check on the current church (also `aria-current`). Inactive churches read muted and say
  "Inactive". Same-name churches keep today's disambiguation (role, then `#id`).
- A search field appears when there are more than 6 churches and filters by name.
- Footer: **Add church** (opens the Churches page's `AddChurchModal`) and **Manage churches**
  (link to `/churches`).
- Picking a church switches through `useSwitchChurch()` and closes; picking the current church
  just closes. Escape and clicking outside close; focus returns to the card.

## States

- Loading: the card shows a skeleton (badge + two bars) with sr-only "Loading your churches".
- Error with nothing selected: the card says "Couldn't load your churches" with Try again.
- No church: the card says "No church yet"; the list holds only Add church and Manage churches.
- One church: the card still opens the list (one row, then the actions), so everyone learns one
  pattern.

## Who you are

The person's avatar (photo or icon) and name move to the bottom of the sidebar, in the block that
holds Log out. The top of the sidebar is the app name, then the church card. The mobile drawer
follows the same order.

## Out of scope

No change to routing, the Churches page, or the switching rules (`useSwitchChurch`, remount on
switch). react-select stays a dependency for other pages; only the switcher stops using it.

## Verification

`npx tsc --noEmit`, `npx eslint`, `CI=false npx craco build`; local screenshots of expanded
(one church, several churches open), collapsed (open), mobile drawer (open), no-church, loading;
keyboard: Tab to the card, Enter opens, move through rows, Enter switches, Escape closes and
focus returns.
