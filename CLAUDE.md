# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Church Sync Pro is the **frontend** (Create React App + CRACO) for a SaaS tool that syncs giving/donation data between three external systems: **Planning Center (PCO)**, **QuickBooks Online (QBO)**, and **Stripe**. The backend lives elsewhere; this app talks to it over REST at `REACT_APP_API_PATH` (`/csp/` namespace). Auth is handled by SuperTokens.

## Commands

```bash
npm start          # or `npm run dev` — runs CRA dev server via CRACO on :3000
npm run build      # production build to ./build
npm test           # craco test (CRA/Jest watch mode)
npm test -- App.test.tsx          # run a single test file
npm test -- -t "name of test"     # run tests matching a name
npm run lint:fix   # eslint --fix across the repo
```

There is effectively no test suite yet (only the CRA boilerplate `src/App.test.tsx`). Don't assume tests gate changes.

### Deploy (Google Cloud Run, via Makefile)

```bash
make deploy-stg    # build DockerfileSTG, push to GCR, deploy csp-fe
make deploy-prd    # build DockerfilePRD, push to GCR, deploy csp-fe-prd
```

Both deploy to project `church-sync-pro-385703`, region `us-central1`. Env vars are injected from `.env.staging` / `.env.production` at deploy time.

## Conventions that bite

- **Path alias:** `@/` → `src/` (defined in both `craco.config.js` and `tsconfig.json`). Use `@/common/...` not deep relative paths.
- **Prettier:** no semicolons, single quotes, trailing commas (`.prettierrc`). Match this — files are written without semicolons.
- **Linting is loose:** `no-explicit-any`, `no-unused-vars`, and `ban-ts-comment` are all **off**. `any` is used pervasively in API layers; don't treat existing `any` as a bug to fix unless asked.
- **Env vars** are CRA-style `REACT_APP_*`, read via `process.env`. Files: `.env.development`, `.env.staging`, `.env.production`.

## Architecture

### Routing & auth gating (the core control flow)

Everything renders through a single catch-all route in `App.tsx` → `src/pages/MainPage.tsx`. `MainPage` declares **all** routes (public + private) and is where you add a new page.

Routes are constants in `src/common/constant/route.ts`: `route` (public/top-level), `mainRoute` (app pages), `routeSettings` (settings sub-pages).

Access control uses a custom guard system, **not** SuperTokens route components:
- `src/common/components/Route/PrivateRoute.tsx` takes `guards: RouteGuard[]` and a `Component`. Each guard has `{ failCondition, requestDone, onFail }`; the first failing guard `<Navigate>`s to its `onFail`.
- Guards are defined in `src/common/utils/routeGuards.ts` (`authGuard`, `unAuthGuard`, etc.). **Important gotcha:** guard objects are evaluated **once at module load** from `localStorage` values — they are not reactive. Auth state lives in localStorage tokens (see storage below).

### Auth & token storage

- **SuperTokens** is initialized in `App.tsx` (`Session`, `ThirdPartyEmailPassword`, `EmailPassword` recipes; `apiBasePath: '/auth'`). Session existence is checked imperatively via `Session.doesSessionExist()`.
- App-level tokens/flags are kept in `localStorage` through `src/common/utils/storage.ts`. Keys are namespaced by `REACT_APP_NAME_PROJECT` (`storageKey`: `PERSONAL_TOKEN`, `TOKENS`, `SETTINGS`, `QBQ_ACCESS_TOKEN`, `PC_ACCESS_TOKEN`). The presence of `PERSONAL_TOKEN` is what `authGuard`/`unAuthGuard` key off of.
- Logout flow is centralized in `useLogoutHandler`.

### State: Redux + redux-persist + react-query (two parallel systems)

Redux store (`src/redux/store.ts`) combines four slices, persisted to localStorage via redux-persist (`whitelist: ['common','qboData','stripeData']`):
- `common` (`src/redux/common.ts`) — the big one: current `user`, `bookkeeper`, selected client, modal stack (`openModals`), transaction date ranges, UI flags. This holds most cross-cutting UI state.
- `qboData` / `stripeData` — cached third-party data. A custom `checkExpirationMiddleware` in the store resets these slices after 24h (compares `persistedAt`).
- `nonPersistState` — explicitly not persisted.

**react-query** (`QueryClientProvider` in `App.tsx`) handles server data fetching. Custom hooks wrap it: `useQueries.tsx`, `useInvalidateQueries.tsx`, `useGetTokenList.tsx`. Many queries key off `user`/`bookkeeper` from redux and re-run when those change.

Both systems coexist — server fetches go through react-query OR direct API calls dispatched into redux (see `BackgroundDataFetcher`). When changing data flow, check which system owns the data first.

### API layer

`src/common/api/*.ts` (one file per domain: `user`, `qbo`, `stripe`, `planning-center`, `auth`). Each creates its own `axios.create({ baseURL: REACT_APP_API_PATH })` instance. Endpoint path strings are centralized in `src/common/constant/routes-api.ts` (`pcRoutes`, `qboRoutes`, `stripeRoutes`, `userRoutes`). `user.ts` is by far the largest and covers settings, billing, bookkeeper/invites, bank mappings, and sync triggers.

### Background fetching

`src/common/components/background-caller-api/BackgroundDataFetcher.tsx` mounts at the router root and fires route-dependent side effects — e.g. when navigating to the automation mapping page it pulls QBO + Stripe data into redux. Route-conditional data loading lives here, not in the pages.

### Modals

Modals are managed through redux `common.openModals` (an array acting as a stack). Modal identifiers are string constants in `src/common/constant/modal.ts` (`MODALS_NAME`). Open/close via the `OPEN_MODAL`/`CLOSE_MODAL` actions from `src/redux/common.ts` rather than local component state.

### Pages

`src/pages/Main/*` are the app's feature areas: `transaction` (+ `view-details`, `view-detail-stripe`), `automation` (`mapping`, `archive`), `client` (client management table — actively being built, see git status), `settings` (sub-pages: Account/Integrations, Billing, Profile, Bookkeeper, Projects, Email), `dashboard`, `home`, `ask-us`, `quick-start-guide`, `accounts-token`. `src/pages/Auth/*` holds login/signup/password flows; `src/pages/Subscription/*` holds the Stripe subscription plan page. Feature-specific components live in a `components/` folder next to their page.

### Roles

Two user roles flow through the app: `client` and `bookkeeper` (see `UserInfo.role` / `BookkeeperInfo` in `src/redux/common.ts`). A bookkeeper acts on behalf of a selected client, so many queries resolve the effective email as `user.role === 'bookkeeper' ? bookkeeper?.clientEmail : user.email`. Preserve this pattern when adding data fetches.

## Other

- **Stripe** is loaded two ways: a publishable key hardcoded in `App.tsx` (`loadStripe(...)`) and `REACT_APP_STRIPE_PUB_KEY` from env. Payment intents are created via the backend (`stripeRoutes.createPaymentIntent`).
- **Drag and drop** uses `react-dnd` with the HTML5 backend (provider in `App.tsx`) — used in the automation mapping UI.
- **UI stack:** Tailwind + Material Tailwind + Flowbite React + Headless UI; toasts via `react-toastify`; icons via `react-icons`/`heroicons`.
- Node **16** is the build/runtime target (see Dockerfiles); `npm ci --legacy-peer-deps` is used in CI/Docker because of peer-dep conflicts.
