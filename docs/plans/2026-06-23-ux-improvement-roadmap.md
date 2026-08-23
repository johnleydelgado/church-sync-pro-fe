# Church Sync Pro — UX Improvement Roadmap

> **For Claude:** REQUIRED SUB-SKILL when executing: superpowers:executing-plans / subagent-driven-development, task-by-task.
>
> **PROJECT CONSTRAINT: DO NOT COMMIT.** Every task ends in a **REVIEW CHECKPOINT** — show the diff, pause for the human. Most tasks are visual; "verify" = `npx tsc --noEmit` exits 0 + the dev server recompiles clean + a described visual check on the running app (`localhost:3000`). Add lightweight tests only where there's real logic (e.g. client search filtering).

**Goal:** Turn the functional-but-rough UI into something a non-technical church bookkeeper trusts — remove placeholder/dead content, make the core "sync" action and its success state unmistakable, fix broken screens, and converge on one consistent design language.

**Architecture:** Frontend-only changes in `/Volumes/T7/OtherProject/church-sync-pro` (CRA + Tailwind + Material-Tailwind + Flowbite). Work in risk order: P0 trust-killers → P1 core experience → P2 design-system/polish. No backend changes except where a screen needs real data (flagged per task). Preserve all existing data flows/redux/react-query unless a task explicitly fixes them.

**Tech Stack:** React 18, CRA/CRACO, Tailwind, Material-Tailwind, Flowbite-React, Headless UI, react-router-dom v6, react-query, redux, react-toastify, react-icons/heroicons.

**Audit basis:** three completed UX reviews (config/onboarding — already partly fixed; daily-use+navigation; settings/billing/auth+design-consistency). The config P0 (Quick Start checklist + Mapping tooltips) is ALREADY DONE and not repeated here.

**Sequencing:** P0 ships first (independent, high-trust-impact, low-risk). P1 is the bulk of the experience work. P2 (design system) is best last so it can absorb the components P0/P1 touch. Items needing a **product decision or backend** are tagged 🔶.

---

## PHASE 0 — Trust-killers (ship first)

### Task 0.1 — Replace pricing-page demo content + fix dead links 🔶(needs real plan copy)
**Why:** The public pricing page shows Material-Tailwind demo content ("200+ components, 40+ built-in pages, 5 team members") and every nav link goes to `/`. First thing a prospect sees; looks unfinished; gates revenue.
**Files:** `src/pages/Subscription/card.tsx` (hardcoded feature list ~84-112; price-by-index ~73), `src/pages/Subscription/constant.ts` (demo features ~11-40), `src/pages/Subscription/plan.tsx` (nav `to="/"` ~106-129; header copy ~136), `src/pages/Subscription/modal.tsx` (interval inferred from title string ~63; error render ~206).
**Approach:** Replace feature lists with REAL plan benefits (get the actual tiers/features from the product owner — 🔶). Make `card.tsx` read from `constant.ts` (it currently ignores `item.features`). Fix all nav `to` targets to real routes (or remove the marketing nav if this page is post-login only). Single source of truth for plan interval — pass a typed `interval: 'monthly'|'yearly'` instead of string-matching the title. Style the payment error + add a "Pay" loading state + a success confirmation.
**Verify:** tsc 0; visually the three cards show real features, nav links work, payment modal shows loading/error/success.
**REVIEW CHECKPOINT 0.1.**

### Task 0.2 — Real Help content + clickable email + fix accordion 🔶(needs real FAQ copy)
**Why:** Ask Us is entirely Lorem ipsum; the support email isn't clickable; accordion index logic is off-by-one.
**Files:** `src/pages/Main/ask-us/contant/AskUsData.ts` (Lorem ~1-37), `src/pages/Main/ask-us/AskUs.tsx` (email span ~52-55; commented dupes ~72-146; open/handleOpen ~34-36), `src/pages/Main/ask-us/component/AccordionAskUs.tsx` (dynamic `bg-[${bgColor}]` ~29,32).
**Approach:** Write real FAQ answers (🔶 — draft from the product: "How do I sync a batch?", "What does the check mark mean?", "Why is a batch missing?", "How do I undo a sync?", "What's a clearing account?"). Make the email a real `<a href="mailto:help@churchsyncpro.com">`. Fix the `open`/`handleOpen` off-by-one; delete the commented duplicate block. Replace `bg-[${bgColor}]` with static conditional classes.
**Verify:** tsc 0; FAQ expands correctly, email opens mail client, alternating row colors render.
**REVIEW CHECKPOINT 0.2.**

### Task 0.3 — Fix the "Anonymous/TBH" donor bug
**Why:** Batch detail shows every donor as "Anonymous" or placeholder "TBH"; real-name logic is commented out. A reconciliation tool that never shows donors is broken.
**Files:** `src/pages/Main/transaction/view-details/index.tsx` (~404-413), and mirror in `src/pages/Main/transaction/view-detail-stripe/` if it has the same pattern.
**Approach:** Restore real donor-name rendering from the PCO person relationship/included data (check what the API actually returns — if names require a `?include=` the list endpoint doesn't fetch, note the backend/data gap 🔶). Show "Anonymous" ONLY when the donation is genuinely anonymous. Remove "TBH".
**Verify:** tsc 0; donor column shows real names (or correctly "Anonymous").
**REVIEW CHECKPOINT 0.3.**

### Task 0.4 — Make the sync action a labeled button with a green "Synced" state
**Why:** THE core daily action is a 28px gray icon with no label (doesn't look clickable), and "done" is a yellow check (reads as warning). This is the product's central trust moment.
**Files:** `src/pages/Main/transaction/component/BatchTable.tsx` (~79, 201-224), `src/pages/Main/transaction/component/StripePayoutTable.tsx` (~167-189; add `disabled`), shared color in `tailwind.config.js` if adding a success green.
**Approach:** Replace the bare icon with a Material-Tailwind `Button size="sm"` (icon + text) labeled **"Sync to QuickBooks"**; while syncing show a spinner + "Syncing…" and `disabled`; when synced show a **green** `HiCheckCircle` + "Synced" (introduce a `success`/green token — do NOT reuse yellow). Add a `Tooltip`. Apply identically to both tables (Stripe table currently lacks `disabled` → fixes double-submit).
**Verify:** tsc 0; the action is obviously a button, shows progress, resolves to green "Synced".
**REVIEW CHECKPOINT 0.4.** (Pairs with P2 semantic-color work — keep the green token reusable.)

### Task 0.5 — Surface real billing/subscription state 🔶(needs backend data)
**Why:** The Billing tab shows only a contact-info form; plan/card/renewal/invoices are all commented out. Users can't see what they pay or when.
**Files:** `src/pages/Main/settings/component/Billing.tsx` (commented plan block ~332-361; dead "Add" button ~203-209; misfiring toast ~177-181).
**Approach:** Build a subscription panel: current plan, price, renewal/cancel date, payment method (last4), invoice history, and a "Manage subscription" action (ideally Stripe billing portal). This needs backend endpoints — check what `viewBilling`/subscription data the API exposes (🔶 likely a small backend addition). At minimum, wire the existing data and remove the dead "Add" button + fix the toast that fires on successful submit. Make the cancel button neutral (not red).
**Verify:** tsc 0; billing shows real plan/renewal (or a clear "no subscription" state).
**REVIEW CHECKPOINT 0.5.**

---

## PHASE 1 — Core experience

### Task 1.1 — Navigation IA + client-side routing
**Why:** The daily screen ("Transaction") has no priority and shares the sync icon with two other things; nav uses `<a href>` (full reloads) + `window.location.reload()`; active-state is substring-matched (mis-highlights); collapsed icons have no labels; Log-out looks like Help.
**Files:** `src/common/components/SideBar/SideBar.tsx` (~149, 230-275, 234, 478, 491-495, 516-549), `src/common/components/SideBar/constant.tsx` (~86-134), `src/common/components/NavBar/NavBar.tsx` (~117-126, 295, 303-305), `src/pages/Main/dashboard/Dashboard.tsx` (~33).
**Approach:** Rename "Transaction" → **"Daily Sync"** (or "Donations"), move it to the top, give it a distinct (non-sync) icon. Convert all top-level `<a href>` → react-router `<Link to>`; remove `window.location.reload()`. Replace `pathName.includes(link)` with an exact/prefix matcher; drive accordion expansion off a real route match. Add `title`/Tooltip on collapsed icons; visually separate Log-out (divider + muted/red tint). Delete the misleading `dropdownArrLinkClients` (or wire it correctly). Fix the dead role guard (`'Bookkeepers'` name mismatch).
**Verify:** tsc 0; nav is instant (no white flash), correct item highlights, collapsed rail readable.
**REVIEW CHECKPOINT 1.1.**

### Task 1.2 — Empty / loading / error states
**Why:** Primary screens blank the whole page on every refetch; empty states are wordless Lottie animations; errors are inconsistent.
**Files:** `src/common/components/empty/Empty.tsx` (commented copy ~9), `src/pages/Main/transaction/index.tsx` (full-page spinner ~507-511; misconfig copy ~629-655), `BatchTable.tsx`/`StripePayoutTable.tsx` (in-table `<Loading/>`).
**Approach:** Make `Empty` accept `message`/`action` props; give Transaction a real empty state ("No batches found for this date range — try widening the filter"). Keep header/tabs/filters mounted during refetch and swap only the table body for a skeleton. Rewrite misconfig copy in plain language with descriptive link text (not "Click Here!").
**Verify:** tsc 0; filtering doesn't blank the page; empty states have words + a next step.
**REVIEW CHECKPOINT 1.2.**

### Task 1.3 — Confirmations on destructive/irreversible actions
**Why:** Disconnecting an integration and "Remove sync" (which **deletes a QuickBooks deposit**) fire instantly with no confirmation.
**Files:** `src/pages/Main/settings/component/Account.tsx` (disconnect ~221-227), `src/pages/Main/transaction/view-details/index.tsx` (remove-sync ~276-286), reuse the redux `OPEN_MODAL` modal system (`src/common/constant/modal.ts`).
**Approach:** Put both behind a confirm modal ("Disconnect QuickBooks? Your syncs will stop." / "Remove this sync? This deletes the deposit in QuickBooks."). Use the existing modal stack pattern.
**Verify:** tsc 0; both actions prompt before executing.
**REVIEW CHECKPOINT 1.3.**

### Task 1.4 — Fix the Settings shell (double layout + split IA)
**Why:** Every settings sub-component renders its own `MainLayout` + "Settings" header AND is mounted both as a tab panel and a standalone route → chrome drawn twice; Projects/Email aren't in the tab bar; tab labels don't match panels.
**Files:** `src/pages/Main/settings/index.tsx` (~116-144, 209-277 dead Tab.Group), and the per-component layout/header in `component/Profile.tsx`, `Billing.tsx`, `Account.tsx`, `Bookkeeper.tsx`, `Projects.tsx`, `Email.tsx`; route defs in `src/pages/MainPage.tsx`.
**Approach:** Remove `MainLayout` + the per-component "Settings" header from the six sub-pages; keep ONE in `settings/index.tsx`. Rename tabs to match panels (Profile / Billing / Integrations / Bookkeepers) and add Projects + Email as tabs so all six live in one place. Drive the active tab from a URL param (`useSearchParams`) so it's deep-linkable; delete the standalone duplicate routes (or make them redirect into the tab). Delete the dead `Tab.Group`/`tabValue2` cruft.
**Verify:** tsc 0; Settings shows chrome once, all six sections reachable as tabs, tabs deep-link.
**Risk:** Touches routing — verify every settings deep link + the sidebar Settings dropdown still work.
**REVIEW CHECKPOINT 1.4.**

### Task 1.5 — Client management bugs (search/edit/deactivation/empty)
**Why:** Search is decorative (typing does nothing); deactivation modal shows a blank name (wrong field); Edit buttons are dead; no empty/loading state.
**Files:** `src/pages/Main/client/index.tsx` (filter ~40-62), `src/pages/Main/client/components/searchInput.tsx` (~11-22), `src/pages/Main/client/components/modalClientDeactivation.tsx` (~68 uses `.name`), `ClientTableRow.tsx` (~146-156 dead Edit), `clientCard.tsx` (~58-68 dead Edit).
**Approach:** Lift search into `index.tsx` state, pass `value`/`onChange` to `SearchInput`, extend `filteredAndSortedClients` to match name/email. Fix the modal to use `churchName`. Wire Edit to open the update modal (or hide it if out of scope). Add empty ("No clients yet") + loading skeleton.
**Test (lightweight):** a small unit test for the client filter function (name/email/status) since it's real logic.
**Verify:** tsc 0; typing filters the list; deactivation shows the church name; Edit does something or is gone.
**REVIEW CHECKPOINT 1.5.**

### Task 1.6 — Auth fixes (typos, password field, feedback, responsive)
**Why:** "Sig up" typo (customer-facing); signup password shows plaintext; forgot-password gives no success feedback; inconsistent error display; reset-password card overflows on mobile.
**Files:** `src/pages/Auth/login/index.tsx` (~308), `src/pages/Auth/signUp/index.tsx` (~368 password type), `src/pages/Auth/forgot-password/index.tsx` (~43, 92), `src/pages/Auth/reset-password/index.tsx` (~79, 120, 151), `src/pages/Auth/secondaryLogin/` (render-phase reload ~213).
**Approach:** Fix "Sig up"→"Sign up". Make signup password a real password field with the same eye-toggle as login. Forgot-password: show a "Check your email" confirmation and relabel the button "Send reset link". Standardize error display (pick the field-`helperText`+toast pattern). Make reset-password use the same flex-centered card as login. Remove the render-phase `window.location.reload()` in secondaryLogin.
**Verify:** tsc 0; no typos; password masked; forgot-password confirms; reset card centered on mobile.
**REVIEW CHECKPOINT 1.6.**

### Task 1.7 — Dashboard & Home are empty shells
**Why:** `/dashboard` renders the word "Dashboard" + a `window.location.reload()`; `/home` is a full-bleed image with no affordances and strips the navbar (mobile dead-end).
**Files:** `src/pages/Main/dashboard/Dashboard.tsx`, `src/pages/Main/home/Home.tsx`.
**Approach:** Decide per screen: either make Dashboard a real landing (today's batch count, last sync time, "Sync today's giving" CTA, integration status — reuse Transaction's card/table patterns) OR replace its body with `<Navigate to={mainRoute.TRANSACTION} />`. For Home, add a primary CTA overlay and stop stripping the navbar on mobile, or redirect to the working screen. 🔶 product call on whether a Dashboard is wanted.
**Verify:** tsc 0; no route lands the user on a blank/one-word page.
**REVIEW CHECKPOINT 1.7.**

### Task 1.8 — Unify Transaction date controls + dynamic year presets
**Why:** Two date controls (top "start date" + Filters popover range) with no explained relationship; year presets hardcoded 2024…2018 (missing recent years in 2026).
**Files:** `src/pages/Main/transaction/index.tsx` (~560-572), `src/pages/Main/transaction/component/DateRange.tsx` (~71-86).
**Approach:** Pick one model — fold the top start-date into the Filters popover, or clearly label them ("Showing from" vs "Quick filter") with documented precedence. Generate the last ~6 year presets dynamically from the current year.
**Verify:** tsc 0; date filtering is unambiguous; current year is selectable.
**REVIEW CHECKPOINT 1.8.**

---

## PHASE 2 — Design system + polish (do last)

### Task 2.1 — Canonical Button / Input / Modal
**Why:** Three competing UI kits (Material-Tailwind, Flowbite, raw `<button>`), inputs redefined per-file (Billing + Profile each define their own `Input`), copy-pasted modal `Transition.Child` blocks.
**Files:** create `src/common/components/ui/Button.tsx`, `Input.tsx`, `Modal.tsx`; migrate high-traffic screens first (Transaction, Settings, Auth).
**Approach:** Build one `Button` with semantic `variant` (`primary | secondary | destructive | ghost`) + `loading` state, one `Input` (label + error + helper), one `Modal` wrapping the Headless-UI/redux pattern. Migrate incrementally (don't rewrite every screen at once); each migration is its own checkpoint. YAGNI — only the variants actually used.
**Verify:** tsc 0; migrated screens look consistent; no behavior change.
**REVIEW CHECKPOINT 2.1 (per migration batch).**

### Task 2.2 — Semantic colors (green = success)
**Why:** Success is conveyed in yellow everywhere (reads as caution); six different button color conventions for similar actions; near-duplicate blues.
**Files:** `tailwind.config.js` (theme colors), then sweep usages.
**Approach:** Define semantic tokens (`primary`, `success` green, `danger` red, `muted`) and map components to them. Make all "done/synced/connected" signals green. Audit yellow-on-white for WCAG contrast. Collapse the duplicate blues (`primary` vs `btmColor`).
**Verify:** tsc 0; success states are green; button colors map to intent.
**REVIEW CHECKPOINT 2.2.**

### Task 2.3 — Fix dynamic Tailwind classes
**Why:** `bg-[${colors.x}]` / `bg-[${bgColor}]` are interpolated at runtime; Tailwind JIT can't see them so they silently never render (SideBar/NavBar active bg, AskUs row stripes).
**Files:** `src/common/components/SideBar/SideBar.tsx` (~491-495), `NavBar/NavBar.tsx` (~303-305), `ask-us/component/AccordionAskUs.tsx` (~29,32) — grep the repo for `` `bg-[${ `` and `` w=full `` too.
**Approach:** Replace with static conditional classes (e.g. `active ? 'bg-primary' : 'bg-transparent'`). Fix the broken `w=full` typo class.
**Verify:** tsc 0; active nav backgrounds + accordion stripes actually render.
**REVIEW CHECKPOINT 2.3.**

### Task 2.4 — Copy & dead-code polish
**Why:** "Synched" vs "Synced" inconsistency, customer-facing typos ("anage"), leftover `console.log`s in render paths, large commented-out blocks across auth/settings.
**Files:** repo-wide sweep — grep `Synched`, `console.log`, obvious commented `<Accordion>`/layout blocks; typos in `Account.tsx` (~324), broken `w=full` classes.
**Approach:** Standardize on "Synced". Remove `console.log`s from render/handlers in shipping screens. Delete clearly-dead commented blocks (verify they're obsolete first). Fix typos.
**Verify:** tsc 0; grep shows no "Synched"/stray `console.log` in touched files.
**REVIEW CHECKPOINT 2.4.**

### Task 2.5 — Accessibility pass
**Why:** Placeholder-as-label in auth, nested interactive elements (Account card is a `<button>` containing a clickable `<p>`), color-only status signals, missing focus styles.
**Files:** `Auth/*` (labels), `settings/component/Account.tsx` (nested `<button>`), status badges across Client/Transaction, file-upload focus in `Profile.tsx`.
**Approach:** Persistent `<label>`s on auth inputs; replace nested interactive elements with a card + explicit buttons; add text/badge status (not color-only); visible focus styles on custom controls.
**Verify:** tsc 0; keyboard-tab through auth + settings is sane; status has text.
**REVIEW CHECKPOINT 2.5.**

---

## Acceptance (roadmap-level)
- [ ] No placeholder/demo content visible to users (pricing, help, donor names)
- [ ] The sync action is an obvious labeled button with a clear green "Synced" confirmation
- [ ] Billing shows real subscription state (or a clear empty state)
- [ ] Navigation is instant (Link-based), correctly highlighted, task-labeled
- [ ] Every primary screen has empty/loading/error states; no full-page blank on refetch
- [ ] Destructive actions confirm first
- [ ] Settings renders chrome once; all sections reachable; client search works
- [ ] One Button/Input/Modal; green=success; no runtime-interpolated Tailwind classes
- [ ] No customer-facing typos, "Synched", stray console.logs, or dead commented blocks

## Items needing a product/backend decision (🔶 — get input before building)
- Real pricing tiers + feature lists (0.1) and real FAQ content (0.2)
- Whether donor names are available from the current PCO data fetch (0.3)
- Billing/subscription data + Stripe billing-portal endpoint (0.5)
- Whether a real Dashboard is wanted or `/dashboard` should just redirect (1.7)

## Out of scope
Backend sync work (separate roadmap), the deferred library migrations (CRA→Vite etc.), and the already-completed config-flow P0 (Quick Start checklist + Mapping tooltips).
