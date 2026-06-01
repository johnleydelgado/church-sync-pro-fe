# Church Sync Pro — Web Client

Frontend for **Church Sync Pro**, a SaaS tool that syncs church giving data between **Planning Center (PCO)**, **QuickBooks Online (QBO)**, and **Stripe**. Built with Create React App (via CRACO), TypeScript, Redux, and react-query.

> This is the frontend only. It talks to the **backend API** (`church-sync-pro-be`, the `quickplan-connect` repo) over REST at `REACT_APP_API_PATH`. Run the backend alongside this app for anything beyond static pages.

## Tech stack

- **React 18** + TypeScript, bootstrapped with CRA and customized via **CRACO** (`craco.config.js`)
- **Redux Toolkit** + `redux-persist` for client/UI state, **react-query** for server data
- **SuperTokens** (`supertokens-web-js`) for authentication/sessions
- **Stripe** (`@stripe/react-stripe-js`) for subscription billing
- **Tailwind CSS** + Material Tailwind + Flowbite + Headless UI; `react-toastify` for toasts
- **react-dnd** for the automation mapping drag-and-drop UI

## Getting started

Requirements: Node (see the backend's `.nvmrc`, v18), npm.

```bash
npm install
npm start          # or `npm run dev` — dev server on http://localhost:3000
```

The dev server reads `.env.development`, which points at the backend on `http://localhost:8080`. Start the backend first (see its README).

### Scripts

```bash
npm start          # run dev server (CRACO)
npm run build      # production build to ./build
npm test           # test runner (Jest watch mode)
npm run lint:fix   # eslint --fix across the repo
```

## Environment

CRA-style `REACT_APP_*` variables, one file per environment (`.env.development`, `.env.staging`, `.env.production`):

| Variable | Purpose |
| --- | --- |
| `REACT_APP_NAME_PROJECT` | App name; also namespaces localStorage keys |
| `REACT_APP_HOST_BE` | Backend host (e.g. `http://localhost:8080`) |
| `REACT_APP_API_PATH` | API base URL (e.g. `http://localhost:8080/csp/`) |
| `REACT_APP_GOOGLE_CALLBACK_URL` | Google OAuth callback |
| `REACT_APP_STRIPE_PUB_KEY` | Stripe publishable key |

## Project structure

```
src/
  App.tsx                 # providers (Redux, react-query, SuperTokens, Stripe, DnD)
  pages/
    MainPage.tsx          # declares ALL routes (public + private)
    Auth/                 # login, signup, password reset
    Main/                 # transaction, automation, client, settings, dashboard, ...
    Subscription/         # Stripe plan page
  common/
    api/                  # axios calls per domain (user, qbo, stripe, planning-center)
    components/           # shared UI incl. PrivateRoute, BackgroundDataFetcher
    constant/             # route + API-path + modal constants
    hooks/                # react-query wrappers
    utils/                # storage (localStorage tokens), route guards
  redux/                  # store + slices (common, qboData, stripeData, nonPersistState)
```

Key conventions: imports use the `@/` → `src/` alias; Prettier is configured with **no semicolons** and single quotes; routes are added in `src/pages/MainPage.tsx` using the `PrivateRoute` + guard system. See `CLAUDE.md` for the detailed architecture notes.

## Deployment

Dockerized and deployed to Google Cloud Run via the `Makefile`:

```bash
make deploy-stg    # staging  (service csp-fe)
make deploy-prd    # production (service csp-fe-prd)
```

Both target GCP project `church-sync-pro-385703` in `us-central1`; env vars are injected from `.env.staging` / `.env.production` at deploy time.
