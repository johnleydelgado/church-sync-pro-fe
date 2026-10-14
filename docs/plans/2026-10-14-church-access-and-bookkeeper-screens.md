# Church Access and Bookkeeper Screens Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Give Matt's team, on the test site by **Friday 2026-10-16**, the screens their bookkeepers will use for real:
- everyone picks a church from a switcher;
- a **Churches** page where they add churches (no fake logins) and connect QuickBooks / Planning Center;
- a **People** tab where an owner invites bookkeepers (with a copyable link) and decides who may connect integrations;
- the backend checks, on every church endpoint, that the person asking belongs to that church.

**Architecture:** A church keeps filing its data under one `Users` row, its **account** (`Churches.ownerUserId`), exactly as today. The money tables, unique keys, locks, token lookups and the sync engine are untouched. What changes:
- Who may touch that account: `ChurchMembers`, checked by one Express middleware on every church route.
- What the frontend selects: one `selectedChurch` for everyone. It carries the account's email, so the ~35 existing endpoints keep their request shape.
- New `/church/*` endpoints run the Churches page and the People tab.

**Tech Stack:**
- Backend `quickplan-connect`: Express + TypeScript + Sequelize 6 / Postgres. Jest unit tests, plus `*.integration.test.ts` against a real Postgres. Semicolons.
- Frontend `church-sync-pro`: CRA + CRACO, React 18, redux-toolkit + redux-persist, react-query 3, Tailwind. No semicolons.

**Supersedes** Phases 2–4 of `docs/plans/2026-09-18-churches-as-entities.md`. Phase 1 there (tables, nullable `churchId` columns, backfill) stays as built. Phase 2 Task 4's `churchContext.ts` helpers are reused.

---

## 1. Why the plan changed (rethink, 2026-10-14)

The 2026-09-18 plan moved every per-church row from `userId` to `churchId`, then dropped `userId`. Re-reading the code on `develop` today, that is the wrong first move:

| Fact (verified 2026-10-14) | Consequence |
|---|---|
| Every idempotency key is `userId`-based: `daily_je_sync_user_day_unique (userId, day)`, `user_sync_user_batch_donation_unique`, `payout_transactions_user_row_key`, and the import lock `pg_try_advisory_xact_lock(74010, userId)` | Re-keying the ledger means rewriting the guards that stop double posting to a live church's QuickBooks. |
| `userId` is NOT NULL on UserSettings, UserSync, DailyJeSync, tokens, registration, userEmailPreferences, email_logs, billing, PayoutReportUploads, PayoutTransactions | "A church with no owner login" would need ten schema changes before it can store anything. |
| Tokens are found by `token_entity.email`; the engine, clearing snapshot, payout import and coverage check all take `(email, userId)`; 39 `UserSettings` lookups by `userId` in 10 files | Several hundred edits on the money path. |
| Nothing reads or writes `churchId` today; every row written since 2026-09-25 has it NULL | Phase 1's columns were never kept up. |
| A church created from the Clients page already gets its own `Users` row (`createClientChurch`) that nobody signs in with | "A church without a person's login" already exists. It just isn't named that way. |
| Only the 7 payout endpoints check who is asking (`canActFor`). The other ~35 church endpoints trust the email in the request | **This** is the real gap for "production-ready". |

So the new plan:

1. **Don't re-key. Name what is already there.** Every church has exactly one account row; `Churches.ownerUserId` points at it.
   - For Active Church the account row is Matt's login.
   - For a church added from the Churches page it is a row with an unroutable `@accounts.churchsyncpro.invalid` address and no SuperTokens user. Nobody can sign in as it.
   - The account row is 1:1 with the church: a new unique index enforces it. So `(userId, day)` is already "per church".
2. **People get access through `ChurchMembers`, checked on every church endpoint by one middleware.** The checks are written in one place and attached in one file (`routers.ts`).
3. **The frontend selects a church, not an email.** `selectedChurch` (from `GET /church/mine`) carries `accountEmail`, and the existing calls send that. Putting `churchId` on the wire for those calls is a later, optional step.
4. **Whoever adds a church owns it.**
   - Owners invite and remove people, toggle integration access, and rename or deactivate the church.
   - Bookkeepers do the daily work, and connect integrations only if an owner allows it (Phase 0 Q2 decision).
5. **Invites must work without email.** SendGrid DNS is broken and Microsoft 365 recipients never receive invites (2026-09-29). Every invite therefore returns a link the owner can copy and send themselves. A person who already has a login is added straight away.
6. **Phase 1's `churchId` columns on data tables stay unused and unmaintained.** They are documented as such, not stamped.

## 2. Decisions taken by default (flag to John if any is wrong)

| # | Decision | Effect someone will notice |
|---|---|---|
| D1 | Data stays filed under the church's account row; no `churchId` re-key | none |
| D2 | Creator of a church becomes its **owner** member, with integrations on | A CFP bookkeeper who adds a church can connect its QuickBooks |
| D3 | Integration access is enforced server-side: owner always, bookkeeper only when toggled | The backfill left almost every existing bookkeeper `false`. On Active Church, Matt must switch it on for anyone who should reconnect QuickBooks or Planning Center. Daily work is not affected. |
| D4 | The legacy `bookkeeper` table becomes a mirror; access reads `ChurchMembers` only; the five legacy routes are retired once the new screens are on staging | Old Clients page and old Bookkeepers tab are gone |
| D5 | Per-person-per-church access. Phase 0 Q1 (team-level "all of CFP sees all our churches") is still open; it would be an `Organizations` layer over the same tables later | Matt invites each bookkeeper to each church |
| D6 | No Stripe connect on the Churches page (Stripe Connect is blocked, see memory `stripe-connect-blocked`) | The Integrations tab keeps its Stripe card as it is |
| D7 | Billing untouched (stays on the account row the frontend already sends) | none |
| D8 | Deactivating a church stops its nightly posting (skip reason `church_inactive`) but keeps it readable by its members | Inactive churches are listed under the active ones and never auto-selected |

## 3. Open questions for John (non-blocking; needed before Matt tests)

- **Q-A, staging data.** Matt's team would test the bookkeeper flow on staging, which has no real giving. Choose one:
  - connect a staging church to Active Church's real Planning Center plus a QuickBooks **sandbox** (staging would then store real donor-derived rows), or
  - use a Planning Center test org, or
  - accept that the pages look empty.
- **Q-B, staging logins.** Who gets staging logins (Matt and Novelyn?). Their invite links come from the People tab. Email verification is ON on staging, and invite acceptance verifies the address (existing behaviour).

---

## 4. Access rule (the single source of truth)

`checkAccountAccess(actor, account, need)` in `quickplan-connect/src/services/churchAccess.ts`:

1. **`actor.id === account.id` → allowed**, for any `need`. This covers:
   - a person's own login: profile, their own billing, `getUserRelated` at sign-in;
   - a church's own login (Matt on Active Church).
2. **Otherwise** a church must be filed under `account`, and the actor must have a `ChurchMembers` row on it with `inviteAccepted = true` and `userId = actor.id`. Then:
   - `need = 'member'` → allowed.
   - `need = 'integrations'` → `role = 'owner'` OR `integrationAccessEnabled`.
   - `need = 'owner'` → `role = 'owner'`.
3. **Failures:**
   - 403 `{ success:false, message }`; no session user row → 403 ("sign in again"). Never 401: SuperTokens' frontend treats 401 as "refresh the session".
   - Unknown account or church → 404.
4. **Logging:** a `logger.warn` on every 403 with `{ path, actorId, accountId }`, so a wrongly blocked screen shows up in Cloud Run logs.

Inactive churches are still accessible (D8).

## 5. API contract (both sides build to this)

All under `/csp`, all `verifySession()`. Responses use the existing `responseSuccess` envelope `{ code, message, data, success }`. Errors are `{ success:false, message }`, with a human sentence in `message`. The frontend shows it as is.

```ts
// GET /church/mine  -> data: MyChurch[]   (active first, then by name)
// A client login that owns no church yet gets one created on this call (ensureOwnChurch).
interface MyChurch {
  id: number
  name: string
  isActive: boolean
  role: 'owner' | 'bookkeeper'
  canConnectIntegrations: boolean   // owner, or bookkeeper with integrationAccessEnabled
  canManagePeople: boolean          // owner
  accountUserId: number             // the Users row the church's data is filed under
  accountEmail: string              // what the existing endpoints take as `email`
  connections: { qbo: boolean; pco: boolean }
}

// POST /church/create { name }                       -> data: MyChurch          (409 duplicate name among your churches)
// POST /church/update { churchId, name?, isActive? } -> data: 'ok'              (owner)
// GET  /church/people?churchId=                      -> data: ChurchPerson[]    (member)
// POST /church/people/invite { churchId, email }     -> data: InviteResult      (owner; 409 already on / already invited)
// POST /church/people/access { churchId, memberId, integrationAccessEnabled } -> data: 'ok' (owner; 400 for an owner row)
// POST /church/people/remove { churchId, memberId }  -> data: 'ok'              (owner; 409 last owner)

interface ChurchPerson {
  memberId: number
  role: 'owner' | 'bookkeeper'
  name: string | null               // first + last from Users, 'N/A' dropped
  email: string                     // the login's email, or the invited address
  status: 'active' | 'invited'
  integrationAccessEnabled: boolean // owners: always true
  isYou: boolean
  inviteLink: string | null         // only for 'invited' rows, only when the caller is an owner
}

interface InviteResult {
  memberId: number
  addedExisting: boolean            // true: the email already had a login, added straight away, no link
  inviteLink: string | null         // set when addedExisting is false
  emailSent: boolean                // false when SendGrid refused; the link still works
}
```

**Invite acceptance stays on the existing public endpoints and link format.**
- The link is `INVITATION_URL?bookkeeperEmail=<encoded>&invitationToken=<hex>`.
- The page is `InviteLink.tsx`.
- `POST /user/checkValidInvitation` and `/user/updateInvitationStatus` now read `ChurchMembers`.

---

## 6. Schedule and cut line

| When (PH time) | Tasks |
|---|---|
| Wed 10/14 afternoon–night | 1–6 backend: access check, guarded routes, resync migration, church service + endpoints |
| Thu 10/15 morning | 7–10: invite acceptance, token save, nightly skip, backend to **staging** (works with the current staging frontend) |
| Thu 10/15 afternoon–night | 11–16 frontend foundation, switcher, effective-email sweep, bank-mapping fix |
| Fri 10/16 | 17–21 OAuth, Churches page, People tab, tabs + empty state, local browser run; 22 staging deploy + checks. Done by Fri 18:00 PH (Fri morning US) |

**If time runs short, drop in this order:**
1. Churches page mobile cards (the table still scrolls).
2. Profile's church-name change.
3. "Existing login is added straight away" (fall back to the link for everyone).
4. Retiring the legacy routes (Task 22 step 7). It slips to next week and does not affect the demo.

**Never drop:**
- the access check;
- the switcher;
- Add church plus connect;
- People invite, link and toggle;
- the bank-mapping fix.

---

## 7. Backend tasks (`/Volumes/T7/OtherProject/quickplan-connect`)

### Task 1: Worktree and baseline

- [ ] **Step 1:** Create the worktree and wire up its local-only files.
  ```bash
  cd /Volumes/T7/OtherProject/quickplan-connect && git fetch origin
  git worktree add ../quickplan-connect-churches -b feat/churches-access develop
  cd ../quickplan-connect-churches
  ln -s ../quickplan-connect/node_modules node_modules
  cp ../quickplan-connect/src/db/config/config.json src/db/config/config.json
  ```
  Integration suites fail to load without that `config.json` (gitignored).
- [ ] **Step 2:** Start the test database and migrate it.
  ```bash
  docker start csp-test-pg
  npx sequelize-cli db:migrate --url postgres://admin:1234@127.0.0.1:55433/csp_test --migrations-path src/db/migrations
  ```
- [ ] **Step 3:** Record the baseline.
  ```bash
  npx tsc --noEmit
  npx jest 2>&1 | grep -E "^Tests:|^Test Suites:"
  TEST_DB_NAME=csp_test npm run test:integration 2>&1 | grep -E "^Tests:|^Test Suites:"
  ```
  Expected: all passing (develop: about 289 unit / 82 integration). Write the numbers in the PR description.

### Task 2: `churchAccess.ts`, the access rule

**Files:**
- Create: `src/services/churchAccess.ts`
- Test: `src/services/__tests__/churchAccess.test.ts`

- [ ] **Step 1: Write the failing tests.** Mock the models and SuperTokens the way `src/controller/__tests__/payoutReport.test.ts` does.

```ts
jest.mock('supertokens-node/recipe/thirdpartyemailpassword', () => ({ __esModule: true, default: { getUserById: jest.fn() } }));
jest.mock('supertokens-node/recipe/emailpassword', () => ({ __esModule: true, default: { getUserById: jest.fn() } }));
jest.mock('../../db/models/user', () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock('../../db/models/church', () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock('../../db/models/churchMember', () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock('../../db/models/tokens', () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock('../../db/models/tokenEntity', () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock('../../utils/logger', () => ({ createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }) }));

import ThirdPartyEmailPassword from 'supertokens-node/recipe/thirdpartyemailpassword';
import EmailPassword from 'supertokens-node/recipe/emailpassword';
import Users from '../../db/models/user';
import Church from '../../db/models/church';
import ChurchMember from '../../db/models/churchMember';
import {
  actorFromSession, checkAccountAccess, clearSessionEmailCache, requireAccountAccess, requireChurch, fromBody, ChurchAccessError,
} from '../churchAccess';

const users = (Users as any).findOne as jest.Mock;
const churches = (Church as any).findOne as jest.Mock;
const members = (ChurchMember as any).findOne as jest.Mock;
const tpep = (ThirdPartyEmailPassword as any).getUserById as jest.Mock;
const ep = (EmailPassword as any).getUserById as jest.Mock;

const MATT = { id: 1, email: 'matt@example.test' };
const BK = { id: 2, email: 'bk@example.test' };
const ACCOUNT = { id: 10, email: 'church-abc@accounts.churchsyncpro.invalid' };
const CHURCH = { id: 100, ownerUserId: 10, isActive: true };

beforeEach(() => { jest.resetAllMocks(); clearSessionEmailCache(); });

describe('checkAccountAccess', () => {
  it('lets anyone at their own row', async () => {
    churches.mockResolvedValue(null);
    await expect(checkAccountAccess(BK as any, BK as any, 'owner')).resolves.toMatchObject({ church: null, membership: null });
  });
  it('lets an accepted member at the church filed under the account', async () => {
    churches.mockResolvedValue(CHURCH);
    members.mockResolvedValue({ role: 'bookkeeper', integrationAccessEnabled: false });
    await expect(checkAccountAccess(BK as any, ACCOUNT as any)).resolves.toMatchObject({ church: CHURCH });
    expect(members).toHaveBeenCalledWith({ where: { churchId: 100, userId: 2, inviteAccepted: true } });
  });
  it('refuses a stranger', async () => {
    churches.mockResolvedValue(CHURCH);
    members.mockResolvedValue(null);
    await expect(checkAccountAccess(BK as any, ACCOUNT as any)).rejects.toMatchObject({ status: 403 });
  });
  it('refuses another person\'s own row (no church filed under it)', async () => {
    churches.mockResolvedValue(null);
    await expect(checkAccountAccess(BK as any, MATT as any)).rejects.toMatchObject({ status: 403 });
  });
  it('needs the owner\'s say-so for integrations', async () => {
    churches.mockResolvedValue(CHURCH);
    members.mockResolvedValue({ role: 'bookkeeper', integrationAccessEnabled: false });
    await expect(checkAccountAccess(BK as any, ACCOUNT as any, 'integrations')).rejects.toMatchObject({ status: 403 });
    members.mockResolvedValue({ role: 'bookkeeper', integrationAccessEnabled: true });
    await expect(checkAccountAccess(BK as any, ACCOUNT as any, 'integrations')).resolves.toBeTruthy();
  });
  it('keeps owner actions for owners', async () => {
    churches.mockResolvedValue(CHURCH);
    members.mockResolvedValue({ role: 'bookkeeper', integrationAccessEnabled: true });
    await expect(checkAccountAccess(BK as any, ACCOUNT as any, 'owner')).rejects.toMatchObject({ status: 403 });
    members.mockResolvedValue({ role: 'owner', integrationAccessEnabled: true });
    await expect(checkAccountAccess(BK as any, ACCOUNT as any, 'owner')).resolves.toBeTruthy();
  });
});

describe('actorFromSession', () => {
  it('finds the Users row through either recipe and caches the email', async () => {
    tpep.mockResolvedValue(undefined);
    ep.mockResolvedValue({ email: BK.email });
    users.mockResolvedValue(BK);
    await expect(actorFromSession('st-2')).resolves.toBe(BK);
    await actorFromSession('st-2');
    expect(ep).toHaveBeenCalledTimes(1);
    expect(users).toHaveBeenCalledWith({ where: { email: BK.email } });
  });
  it('is null without a session', async () => {
    await expect(actorFromSession(undefined)).resolves.toBeNull();
  });
});

describe('middleware', () => {
  const run = async (mw: any, req: any) => {
    const res: any = { locals: {} };
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    const next = jest.fn();
    await mw(req, res, next);
    return { res, next, code: res.status.mock.calls[0]?.[0], body: res.json.mock.calls[0]?.[0] };
  };
  const signedInAs = (u: any) => { tpep.mockResolvedValue({ email: u.email }); users.mockImplementation(async ({ where }: any) => (where.email === u.email ? u : where.email === ACCOUNT.email || where.id === ACCOUNT.id ? ACCOUNT : null)); };

  it('passes a member through and leaves the access on res.locals', async () => {
    signedInAs(BK);
    churches.mockResolvedValue(CHURCH);
    members.mockResolvedValue({ role: 'bookkeeper', integrationAccessEnabled: false });
    const { next, res } = await run(requireAccountAccess(fromBody), { body: { email: ACCOUNT.email }, session: { getUserId: () => 'st-2' } });
    expect(next).toHaveBeenCalled();
    expect(res.locals.churchAccess.account).toBe(ACCOUNT);
  });
  it('answers 403 for a stranger and never calls the handler', async () => {
    signedInAs(BK);
    churches.mockResolvedValue(CHURCH);
    members.mockResolvedValue(null);
    const { next, code, body } = await run(requireAccountAccess(fromBody), { body: { email: ACCOUNT.email }, session: { getUserId: () => 'st-2' } });
    expect(next).not.toHaveBeenCalled();
    expect(code).toBe(403);
    expect(body.success).toBe(false);
  });
  it('answers 404 when the request names no known account', async () => {
    signedInAs(BK);
    const { code } = await run(requireAccountAccess(fromBody), { body: { email: '' }, session: { getUserId: () => 'st-2' } });
    expect(code).toBe(404);
  });
  it('answers 403 (not 401) when the session has no Users row', async () => {
    tpep.mockResolvedValue({ email: 'ghost@example.test' });
    users.mockResolvedValue(null);
    const { code } = await run(requireAccountAccess(fromBody), { body: { email: ACCOUNT.email }, session: { getUserId: () => 'st-9' } });
    expect(code).toBe(403);
  });
  it('requireChurch finds the account through churchId', async () => {
    signedInAs(BK);
    churches.mockImplementation(async ({ where }: any) => (where.id === 100 || where.ownerUserId === 10 ? CHURCH : null));
    members.mockResolvedValue({ role: 'owner', integrationAccessEnabled: true });
    const { next } = await run(requireChurch('owner'), { body: { churchId: 100 }, query: {}, session: { getUserId: () => 'st-2' } });
    expect(next).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**
  `npx jest src/services/__tests__/churchAccess.test.ts`. Expected: FAIL, "Cannot find module '../churchAccess'".

- [ ] **Step 3: Implement.** Imports follow `src/controller/payoutReport.ts`: `SessionRequest` comes from `supertokens-node/lib/build/framework/express`, and `createLogger` from `../utils/logger`.

```ts
import { NextFunction, Request, Response } from 'express';
import { SessionRequest } from 'supertokens-node/lib/build/framework/express';
import ThirdPartyEmailPassword from 'supertokens-node/recipe/thirdpartyemailpassword';
import EmailPassword from 'supertokens-node/recipe/emailpassword';
import Church from '../db/models/church';
import ChurchMember from '../db/models/churchMember';
import Users from '../db/models/user';
import tokens from '../db/models/tokens';
import tokenEntity from '../db/models/tokenEntity';
import { canConnectIntegrations } from './churchContext';
import { createLogger } from '../utils/logger';

const logger = createLogger('church-access');

/**
 * Who may work on which church.
 *
 * A church's settings, tokens and postings are filed under one Users row - its account,
 * Churches.ownerUserId. For a church that started as a client login (Active Church) that row is
 * the person's own login; for a church added from the Churches page it is a row nobody signs in
 * with. People reach a church through ChurchMembers. This file is the only place that decides.
 */
export type ChurchNeed = 'member' | 'integrations' | 'owner';

export interface ChurchAccess {
  /** Null when the row is a person's own login with no church filed under it. */
  church: Church | null;
  account: Users;
  /** Null when the caller IS the account. */
  membership: ChurchMember | null;
}

export class ChurchAccessError extends Error {
  constructor(public readonly status: 403 | 404, message: string) {
    super(message);
    this.name = 'ChurchAccessError';
  }
}

const NO_ACCESS = "You don't have access to this church.";

// One SuperTokens lookup per person per five minutes rather than per request.
const SESSION_EMAIL_TTL_MS = 5 * 60 * 1000;
const sessionEmails = new Map<string, { email: string; at: number }>();
export const clearSessionEmailCache = () => sessionEmails.clear();

/** The signed-in person's Users row. A session only carries the SuperTokens id, so go through the email. */
export const actorFromSession = async (sessionUserId: string | undefined): Promise<Users | null> => {
  if (!sessionUserId) return null;
  let hit = sessionEmails.get(sessionUserId);
  if (!hit || Date.now() - hit.at > SESSION_EMAIL_TTL_MS) {
    const st: any =
      (await ThirdPartyEmailPassword.getUserById(sessionUserId)) ?? (await EmailPassword.getUserById(sessionUserId));
    if (!st?.email) return null;
    hit = { email: String(st.email), at: Date.now() };
    sessionEmails.set(sessionUserId, hit);
  }
  return Users.findOne({ where: { email: hit.email } });
};

/** May `actor` work on the data filed under `account`? See section 4 of the plan. */
export const checkAccountAccess = async (actor: Users, account: Users, need: ChurchNeed = 'member'): Promise<ChurchAccess> => {
  const church = await Church.findOne({ where: { ownerUserId: account.id } });
  if (actor.id === account.id) return { church, account, membership: null };
  if (!church) throw new ChurchAccessError(403, NO_ACCESS);
  const membership = await ChurchMember.findOne({ where: { churchId: church.id, userId: actor.id, inviteAccepted: true } });
  if (!membership) throw new ChurchAccessError(403, NO_ACCESS);
  if (need === 'owner' && membership.role !== 'owner') {
    throw new ChurchAccessError(403, 'Only an owner of this church can do that.');
  }
  if (need === 'integrations' && !canConnectIntegrations(membership)) {
    throw new ChurchAccessError(403, "This church's owner hasn't given you access to connect QuickBooks or Planning Center.");
  }
  return { church, account, membership };
};

type Named = { email?: unknown; userId?: unknown };

const findAccount = async ({ email, userId }: Named): Promise<Users | null> => {
  if (userId !== undefined && userId !== null && userId !== '') {
    const id = Number(userId);
    return Number.isInteger(id) && id > 0 ? Users.findOne({ where: { id } }) : null;
  }
  return typeof email === 'string' && email ? Users.findOne({ where: { email } }) : null;
};

const guard =
  (resolveAccount: (req: Request) => Promise<Users | null>, need: ChurchNeed) =>
  async (req: SessionRequest, res: Response, next: NextFunction) => {
    let actor: Users | null = null;
    let account: Users | null = null;
    try {
      actor = await actorFromSession(req.session?.getUserId());
      if (!actor) throw new ChurchAccessError(403, 'Your account was not found. Sign out and sign in again.');
      account = await resolveAccount(req);
      if (!account) throw new ChurchAccessError(404, 'Church not found.');
      res.locals.actor = actor;
      res.locals.churchAccess = await checkAccountAccess(actor, account, need);
      return next();
    } catch (e) {
      if (e instanceof ChurchAccessError) {
        if (e.status === 403) logger.warn('church access refused', { path: req.path, actorId: actor?.id, accountId: account?.id, need });
        return res.status(e.status).json({ success: false, message: e.message });
      }
      logger.error('church access check failed', { path: req.path, error: e instanceof Error ? e.message : String(e) });
      return res.status(500).json({ success: false, message: 'Could not check your access to this church. Try again.' });
    }
  };

/** For the existing endpoints, which name the church by its account's email or user id. */
export const requireAccountAccess = (locate: (req: Request) => Named | Promise<Named>, need: ChurchNeed = 'member') =>
  guard(async (req) => findAccount(await locate(req)), need);

/** For /church endpoints, which name the church by churchId. */
export const requireChurch = (need: ChurchNeed = 'member') =>
  guard(async (req) => {
    const id = Number(req.body?.churchId ?? req.query?.churchId);
    if (!Number.isInteger(id) || id <= 0) return null;
    const church = await Church.findOne({ where: { id } });
    return church?.ownerUserId ? Users.findOne({ where: { id: church.ownerUserId } }) : null;
  }, need);

// Where each existing endpoint names its church.
export const fromQuery = (req: Request): Named => ({ email: req.query?.email });
export const fromBody = (req: Request): Named => ({ email: req.body?.email });
export const fromBodyUserId = (req: Request): Named => ({ userId: req.body?.userId });
export const fromBillingData = (req: Request): Named => ({ userId: req.body?.data?.userId });
/** finalSyncStripe sends one email per item; all items must be the same church. */
export const fromBodyItems = (req: Request): Named => {
  const emails = new Set((Array.isArray(req.body?.data) ? req.body.data : []).map((d: any) => d?.email));
  return emails.size === 1 ? { email: [...emails][0] } : {};
};
/** deleteUserToken names a token row; its church is the token entity's email. */
export const fromTokenId = async (req: Request): Promise<Named> => {
  const token: any = await tokens.findOne({ where: { id: req.body?.id } });
  const entity: any = token ? await tokenEntity.findOne({ where: { id: token.tokenEntityId } }) : null;
  return { email: entity?.email };
};
```

- [ ] **Step 4: Run the tests and confirm they pass.** `npx jest src/services/__tests__/churchAccess.test.ts` should pass, and `npx tsc --noEmit` should be clean.
- [ ] **Step 5: Commit.**
  ```bash
  git add src/services/churchAccess.ts src/services/__tests__/churchAccess.test.ts
  git commit -m "Add one church access rule and its Express guards"
  ```

### Task 3: Guard every church route; retire `canActFor`

**Files:**
- Modify: `src/routes/routers.ts`
- Modify: `src/controller/payoutReport.ts` (`forChurch` drops its own check)
- Modify: `src/controller/__tests__/payoutReport.test.ts` (drop the `canActFor` / 403 cases; the guard tests cover them)

- [ ] **Step 1: Add the guards in `routers.ts`.** Import from `../services/churchAccess` and define:
  ```ts
  const q = requireAccountAccess(fromQuery);
  const b = requireAccountAccess(fromBody);
  const bUser = requireAccountAccess(fromBodyUserId);
  ```
  Insert the guard between `verifySession()` and the handler, per this table.

| Guard | Routes |
|---|---|
| `q` | `getFunds`, `getStripePayouts`, `getUserRelated`, `getDailyJournalEntries`, `getClearingStatement`, `getStripeGivingByDay`, `getStripeGivingDayDetail`, `payoutReportStatus`, `payoutReportReview`, `payoutReportSignups` |
| `b` | `getBatches`, `getStripeList`, `getAllQboData`, `deleteQboDeposit`, `addProject`, `updateProject`, `findCustomer`, `addTokenInUser`, `createSettings`, `updateRegisterSettings`, `enableAutoSyncSetting`, `postStripeGivingDay`, `markTransitionTruedUp`, `payoutReportPreview`, `payoutReportImport`, `payoutReportResolve`, `payoutReportRecheckGiving`, `manualSync`, `isUserHaveTokens`, `getTokenList`, `addUpdateBankSettings`, `addUpdateBankCharges`, `setStartDataAutomation` |
| `requireAccountAccess(fromBody, 'integrations')` | `updateUserToken` |
| `requireAccountAccess(fromTokenId, 'integrations')` | `deleteUserToken` |
| `requireAccountAccess(fromBodyItems)` | `finalSyncStripe` |
| `bUser` | `handleRegistrationEvents`, `userUpdate` (`updateUserData`), `viewBilling`, `crudUserEmailPreferences` |
| `requireAccountAccess(fromBillingData)` | `addUpdateBilling` |
| `requireAccountAccess(fromBodyUserId, 'owner')` | `toggleUserActiveStatus` (legacy, retired in Task 22) |
| **unguarded, on purpose** | `createUser` (Google sign-up: no Users row yet), `updateUser` (unrouted from the UI), `createPaymentIntent` (the email is the subscription form's), `authQB`/`authPC`/`authStripe`/`callBack*` (no church; the token is attached by the guarded `updateUserToken`), the public password and invitation routes, `healthCheck`, the legacy `bookkeeperList`/`createClientChurch`/`sendEmailInvitation`/`deleteBookeeper` (retired in Task 22), and every `requireAutomationKey` route |

- [ ] **Step 2: Simplify `forChurch` in `payoutReport.ts`.**
  - Keep `sessionEmail` for the actor; `uploadedBy` and `resolvedBy` still need it.
  - Delete the `canActFor(...)` call and the `canActFor` export, plus the now-unused `bookkeeper` and `Op` imports. The guard has already refused strangers.
  - The `if (!actor)` branch becomes a plain 403. That can only happen if SuperTokens loses the user between the guard and the handler.
- [ ] **Step 3: Update `payoutReport.test.ts`.**
  - Remove the tests that assert 403 for a stranger, and the `bookkeeper` mock.
  - Keep the 400 / 409 / 500 mapping tests.
  - Run `npx jest src/controller/__tests__/payoutReport.test.ts`; expect PASS.
- [ ] **Step 4: Run the full suite.**
  - `npx tsc --noEmit && npx jest 2>&1 | grep -E "^Tests:|^Test Suites:"`. Expect all passing; the count changes only by the moved tests.
  - `grep -nE "verifySession\(\), [A-Za-z]+\);" src/routes/routers.ts` lists every route still without a guard. Each must appear in the "unguarded, on purpose" row.
- [ ] **Step 5: Commit.**
  ```bash
  git commit -am "Check church membership on every church endpoint, not just the payout ones"
  ```

### Task 4: Resync migration (memberships written since 2026-09-25; one church per account)

Since the backfill, only the legacy `bookkeeper` table was written:
- Invites and Clients-page churches on staging.
- Accepted invites on production, where Phase 1 has not even run yet.

This migration brings `ChurchMembers` up to date, promotes the bookkeeper who created a church to owner, and adds the unique index the design relies on.

**Files:**
- Create: `src/db/churchResyncPlan.js` (pure; plain JS because sequelize-cli has no ts-node, same as `churchBackfillPlan.js`)
- Create: `src/db/migrations/20261015000001-resync-church-members.js`
- Test: `src/db/__tests__/churchResyncPlan.test.ts`
- Test: `src/db/migrations/__tests__/churchResync.integration.test.ts`

- [ ] **Step 1: Write the failing planner tests.**

```ts
/* eslint-disable @typescript-eslint/no-var-requires */
const { planResync } = require('../churchResyncPlan');

const churches = [{ id: 100, ownerUserId: 10 }];
const accounts = [{ id: 10, email: 'grace-bk@example.test' }];

it('adds a member for a bookkeeper row written after the backfill', () => {
  const plan = planResync(churches, [], [{ userId: 2, clientId: 10, email: 'bk@example.test', invitationToken: 't', inviteAccepted: true, bookkeeperIntegrationAccessEnabled: false }], accounts);
  expect(plan.insert).toEqual([expect.objectContaining({ churchId: 100, userId: 2, role: 'bookkeeper', inviteAccepted: true })]);
});

it('accepts a pending member whose legacy invite was accepted later', () => {
  const members = [{ id: 7, churchId: 100, userId: null, invitedEmail: 'BK@example.test', role: 'bookkeeper', inviteAccepted: false }];
  const plan = planResync(churches, members, [{ userId: 2, clientId: 10, email: 'bk@example.test', invitationToken: 't', inviteAccepted: true }], accounts);
  expect(plan.accept).toEqual([{ id: 7, userId: 2 }]);
  expect(plan.insert).toEqual([]);
});

it('makes the bookkeeper who created a church its owner and drops the unused account membership', () => {
  const members = [
    { id: 8, churchId: 100, userId: 10, invitedEmail: null, role: 'owner', inviteAccepted: true },
    { id: 9, churchId: 100, userId: 2, invitedEmail: 'grace-bk@example.test', role: 'bookkeeper', inviteAccepted: true },
  ];
  // createClientChurch wrote the church's own synthetic email on the bookkeeper row.
  const plan = planResync(churches, members, [{ userId: 2, clientId: 10, email: 'grace-bk@example.test', inviteAccepted: true }], accounts);
  expect(plan.promote).toEqual([9]);
  expect(plan.dropMembers).toEqual([8]);
});

it('changes nothing when already in step', () => {
  const members = [{ id: 9, churchId: 100, userId: 2, invitedEmail: 'bk@example.test', role: 'bookkeeper', inviteAccepted: true }];
  const plan = planResync(churches, members, [{ userId: 2, clientId: 10, email: 'bk@example.test', inviteAccepted: true }], accounts);
  expect(plan).toEqual({ insert: [], accept: [], promote: [], dropMembers: [] });
});

it('ignores rows for an account no church is filed under', () => {
  const plan = planResync(churches, [], [{ userId: 2, clientId: 99, email: 'x@example.test', inviteAccepted: true }], accounts);
  expect(plan.insert).toEqual([]);
});
```

- [ ] **Step 2: Run the planner tests and confirm they fail.**
  `npx jest src/db/__tests__/churchResyncPlan.test.ts`. Expected: FAIL, "Cannot find module".

- [ ] **Step 3: Implement the planner.**

```js
'use strict';

/**
 * Brings ChurchMembers up to date with the legacy `bookkeeper` table, which is all that
 * invites, acceptances and the Clients page wrote between the 2026-09-25 backfill and the
 * church screens. Pure, like churchBackfillPlan.js.
 *
 * - A bookkeeper row with no member yet becomes one.
 * - A member still waiting on an invite whose legacy row was since accepted gets its user.
 * - A church added from the Clients page (createClientChurch wrote the church's own email on
 *   the bookkeeper row) is owned by the bookkeeper who added it; the membership of its
 *   account row - a login nobody uses - is dropped.
 */
const lower = (s) => (s || '').trim().toLowerCase();

const planResync = (churches, members, bookkeepers, accounts) => {
  const churchIdByAccount = new Map(churches.filter((c) => c.ownerUserId != null).map((c) => [c.ownerUserId, c.id]));
  const accountEmail = new Map(accounts.map((a) => [a.id, lower(a.email)]));
  const byUser = new Map();
  const byInvite = new Map();
  for (const m of members) {
    if (m.userId != null) byUser.set(`${m.churchId}:${m.userId}`, m);
    else if (m.invitedEmail) byInvite.set(`${m.churchId}:${lower(m.invitedEmail)}`, m);
  }

  const plan = { insert: [], accept: [], promote: [], dropMembers: [] };
  const seen = new Set();
  for (const b of bookkeepers) {
    const churchId = churchIdByAccount.get(b.clientId);
    if (churchId == null) continue;
    if (b.userId != null && b.userId === b.clientId) continue;
    const key = b.userId != null ? `${churchId}:${b.userId}` : `${churchId}:invite:${lower(b.email)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const member = b.userId != null ? byUser.get(`${churchId}:${b.userId}`) : undefined;
    const pending = byInvite.get(`${churchId}:${lower(b.email)}`);
    const addedThisChurch = b.userId != null && lower(b.email) !== '' && lower(b.email) === accountEmail.get(b.clientId);

    if (addedThisChurch) {
      if (member && member.role !== 'owner') plan.promote.push(member.id);
      if (!member) plan.insert.push({ churchId, userId: b.userId, role: 'owner', integrationAccessEnabled: true, invitedEmail: null, invitationToken: null, inviteAccepted: true });
      const accountMember = byUser.get(`${churchId}:${b.clientId}`);
      if (accountMember && !plan.dropMembers.includes(accountMember.id)) plan.dropMembers.push(accountMember.id);
      continue;
    }
    if (member) continue;
    if (pending) {
      if (b.userId != null && b.inviteAccepted) plan.accept.push({ id: pending.id, userId: b.userId });
      continue;
    }
    plan.insert.push({
      churchId,
      userId: b.userId == null ? null : b.userId,
      role: 'bookkeeper',
      integrationAccessEnabled: !!b.bookkeeperIntegrationAccessEnabled,
      invitedEmail: b.email || null,
      invitationToken: b.invitationToken || null,
      inviteAccepted: !!b.inviteAccepted && b.userId != null,
    });
  }
  return plan;
};

module.exports = { planResync };
```

- [ ] **Step 4: Run the planner tests and confirm they pass.** Run `npx jest src/db/__tests__/churchResyncPlan.test.ts`; expect PASS.

- [ ] **Step 5: Write the migration.**
  - `up` first runs `require('./20260925000003-backfill-churches').up(queryInterface)`. It is idempotent, and creates churches for client logins that signed up since. Its churchId stamp is harmless.
  - Then, in one transaction:
    - refuse if any `ownerUserId` owns two churches;
    - load the churches, the `ChurchMembers` rows, `bookkeeper`, and the account rows' `id, email`;
    - `planResync`;
    - `bulkInsert` the inserts;
    - accept updates: `SET "userId", "inviteAccepted" = true`;
    - promote updates: `SET role = 'owner', "integrationAccessEnabled" = true, "inviteAccepted" = true, "invitedEmail" = NULL`;
    - delete the `dropMembers` rows;
    - add the unique index.
  - `down` drops the index only. The membership corrections are data fixes and stay. Say so in the header.

```js
'use strict';

/**
 * Catch ChurchMembers up with the legacy bookkeeper table (rules: ../churchResyncPlan.js) and
 * make "one church per account row" a database rule - the church screens rely on it.
 *
 * Safe to re-run. `down` only drops the index: the membership corrections are data fixes.
 */
const backfill = require('./20260925000003-backfill-churches');
const { planResync } = require('../churchResyncPlan');

module.exports = {
  async up(queryInterface) {
    await backfill.up(queryInterface);
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      const q = async (sql) => (await sequelize.query(sql, { transaction }))[0];
      const dupes = await q(`SELECT "ownerUserId" FROM "Churches" WHERE "ownerUserId" IS NOT NULL GROUP BY 1 HAVING count(*) > 1`);
      if (dupes.length) throw new Error(`Accounts owning more than one church: ${dupes.map((d) => d.ownerUserId).join(', ')}`);

      const churches = await q(`SELECT id, "ownerUserId" FROM "Churches"`);
      const members = await q(`SELECT id, "churchId", "userId", "invitedEmail", role, "inviteAccepted" FROM "ChurchMembers"`);
      const bookkeepers = await q(`SELECT "userId", "clientId", email, "invitationToken", "inviteAccepted", "bookkeeperIntegrationAccessEnabled" FROM "bookkeeper" ORDER BY id`);
      const accounts = await q(`SELECT u.id, u.email FROM "Users" u JOIN "Churches" c ON c."ownerUserId" = u.id`);

      const plan = planResync(churches, members, bookkeepers, accounts);
      const now = new Date();
      if (plan.insert.length) {
        await queryInterface.bulkInsert('ChurchMembers', plan.insert.map((m) => ({ ...m, createdAt: now, updatedAt: now })), { transaction });
      }
      for (const a of plan.accept) {
        await sequelize.query(`UPDATE "ChurchMembers" SET "userId" = :userId, "inviteAccepted" = true, "updatedAt" = now() WHERE id = :id`, { replacements: a, transaction });
      }
      if (plan.promote.length) {
        await sequelize.query(`UPDATE "ChurchMembers" SET role = 'owner', "integrationAccessEnabled" = true, "inviteAccepted" = true, "invitedEmail" = NULL, "updatedAt" = now() WHERE id IN (:ids)`, { replacements: { ids: plan.promote }, transaction });
      }
      if (plan.dropMembers.length) {
        await sequelize.query(`DELETE FROM "ChurchMembers" WHERE id IN (:ids)`, { replacements: { ids: plan.dropMembers }, transaction });
      }
      await queryInterface.addIndex('Churches', ['ownerUserId'], {
        unique: true,
        name: 'churches_owner_user_unique',
        where: { ownerUserId: { [require('sequelize').Op.ne]: null } },
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Churches', 'churches_owner_user_unique');
  },
};
```

- [ ] **Step 6: Write the integration test.** Copy the setup of `churches.integration.test.ts`: the same `wipe`/`seed` shape, with ids 9201–9205. Seed:
  - a client "Active", with a backfilled church;
  - a bookkeeper row added after the backfill;
  - a pending legacy invite whose row was later accepted;
  - a createClientChurch-style church (a synthetic client, and a bookkeeper row whose `email` = that client's email).

  Then run `backfill.up`, mutate the legacy rows, and run `resync.up`. Assert:
  - the inserted, accepted and promoted members;
  - the account membership is dropped;
  - a second `resync.up` changes nothing;
  - `INSERT INTO "Churches" ("name","ownerUserId",...)` with an existing `ownerUserId` throws.

  `wipe` must call `resync.down` (it drops the index) before `backfill.down`.
- [ ] **Step 7: Migrate the test database and run the integration suite.**
  ```bash
  npx sequelize-cli db:migrate --url postgres://admin:1234@127.0.0.1:55433/csp_test --migrations-path src/db/migrations
  TEST_DB_NAME=csp_test npm run test:integration 2>&1 | grep -E "^Tests:|^Test Suites:|✕"
  ```
  Expect all passing.
- [ ] **Step 8: Commit.**
  ```bash
  git add src/db/churchResyncPlan.js src/db/__tests__/churchResyncPlan.test.ts \
    src/db/migrations/20261015000001-resync-church-members.js \
    src/db/migrations/__tests__/churchResync.integration.test.ts
  git commit -m "Catch church memberships up with the bookkeeper table; one church per account row"
  ```

### Task 5: Church service (list, create, update, people, invite, access, remove)

**Files:**
- Create: `src/services/inviteEmail.ts`. Move the SendGrid send and the link format out of `src/controller/index.ts`, and use it from `sendEmailInvitation` too.
- Create: `src/services/churches.ts`
- Test: `src/services/__tests__/churches.integration.test.ts` (real Postgres; SendGrid mocked)

- [ ] **Step 1: Create `inviteEmail.ts`.** Copy the template id, sender, subject and `NO_CLICK_TRACKING` from `index.ts:21-75` verbatim, and make `index.ts` import from it.

```ts
/* eslint-disable @typescript-eslint/no-var-requires */
const sgMail = require('@sendgrid/mail');
const { SENDGRID_API_KEY, INVITATION_URL } = process.env;

/** Encoded: a '+' in the address would otherwise be read back as a space by the page. */
export const inviteLinkFor = (email: string, token: string): string =>
  `${INVITATION_URL}?bookkeeperEmail=${encodeURIComponent(email)}&invitationToken=${token}`;

export const sendInviteEmail = async (to: string, inviteLink: string): Promise<void> => {
  sgMail.setApiKey(SENDGRID_API_KEY);
  await sgMail.send({
    to,
    from: 'support@churchsyncpro.com',
    subject: 'You have been invited to take on the role of a bookkeeper.',
    templateId: 'd-4529481214ab4c4e85018b4dfb3b6f20',
    dynamicTemplateData: { inviteLink },
    trackingSettings: { clickTracking: { enable: false, enableText: false } },
  });
};
```

- [ ] **Step 2: Write the failing integration tests.** Ids 9301–9310. Mock `../inviteEmail` with `sendInviteEmail: jest.fn()` and keep the real `inviteLinkFor`. Cases:
  1. `listMyChurches` for a `client` login with no church creates one owner church (named from `churchName`), and calling it twice still gives one church.
  2. `createChurch(bk, 'Grace')`:
     - creates an account row (`@accounts.churchsyncpro.invalid`, role `client`) and makes the bookkeeper its owner, with `canConnectIntegrations`;
     - a second `createChurch(bk, ' grace ')` → 409.
  3. `listMyChurches` returns `connections.qbo = true` once a `token_entity` (email = account email, isEnabled) holds a qbo token with an access_token.
  4. `invitePerson`:
     - a new address → a pending member with an `inviteLink` containing `invitationToken=`;
     - the same address again → 409;
     - an address that already has a login → `addedExisting: true`, an accepted member, no link;
     - a mail failure → `emailSent: false`, and the invite still exists.
  5. `listPeople`:
     - for the owner, the invited row carries `inviteLink`;
     - for a bookkeeper member, `inviteLink` is null on every row;
     - `isYou` marks the caller.
  6. `setIntegrationAccess` flips a bookkeeper, and refuses an owner row (400).
  7. `removePerson`:
     - removes a bookkeeper, and deletes the matching legacy `bookkeeper` row;
     - refuses the last owner (409).
  8. `updateChurch({ name: 'Grace Fellowship' })` renames both `Churches.name` and the account's `Users.churchName`.
  9. `updateChurch({ isActive: false })` sets only `Churches.isActive`.
- [ ] **Step 3: Run the tests and confirm they fail.**
  `TEST_DB_NAME=csp_test npx jest --config jest.integration.config.js src/services/__tests__/churches.integration.test.ts` should FAIL.
- [ ] **Step 4: Implement `churches.ts`.** Use `import sequelize from '../db'`, as `syncEngine.ts` does. For the `tokens` / `tokenEntity` imports, use the same paths `controller/user.ts` uses.

```ts
import crypto from 'crypto';
import { Op, UniqueConstraintError } from 'sequelize';
import sequelize from '../db';
import Church from '../db/models/church';
import ChurchMember from '../db/models/churchMember';
import Users from '../db/models/user';
import bookkeeper from '../db/models/bookkeeper';
import tokens from '../db/models/tokens';
import tokenEntity from '../db/models/tokenEntity';
import { canConnectIntegrations } from './churchContext';
import { ChurchAccess } from './churchAccess';
import { inviteLinkFor, sendInviteEmail } from './inviteEmail';
import { createLogger } from '../utils/logger';

const logger = createLogger('churches');

export class ChurchServiceError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = 'ChurchServiceError';
  }
}

export interface MyChurch {
  id: number; name: string; isActive: boolean; role: 'owner' | 'bookkeeper';
  canConnectIntegrations: boolean; canManagePeople: boolean;
  accountUserId: number; accountEmail: string; connections: { qbo: boolean; pco: boolean };
}
export interface ChurchPerson {
  memberId: number; role: 'owner' | 'bookkeeper'; name: string | null; email: string;
  status: 'active' | 'invited'; integrationAccessEnabled: boolean; isYou: boolean; inviteLink: string | null;
}

/** A church added from the Churches page files its data under a row nobody can sign in as: no SuperTokens user, and .invalid never receives mail. */
const ACCOUNT_DOMAIN = 'accounts.churchsyncpro.invalid';
const MAX_NAME = 200;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cleanName = (name: unknown): string => {
  const n = typeof name === 'string' ? name.trim() : '';
  if (!n) throw new ChurchServiceError('Enter the church name.');
  if (n.length > MAX_NAME) throw new ChurchServiceError(`Church names can be up to ${MAX_NAME} characters.`);
  return n;
};
const lowerEq = (column: string, value: string) => sequelize.where(sequelize.fn('lower', sequelize.col(column)), value);
const personName = (u: any): string | null =>
  u ? [u.firstName, u.lastName].filter((s: string) => s && s !== 'N/A').join(' ') || null : null;

/** A client login - from before churches, or signed up since - owns the church its data is filed under. */
export const ensureOwnChurch = async (actor: Users): Promise<void> => {
  if ((actor as any).role !== 'client') return;
  if (await Church.findOne({ where: { ownerUserId: actor.id } })) return;
  try {
    await sequelize.transaction(async (transaction) => {
      const church: any = await Church.create(
        { name: ((actor as any).churchName || '').trim() || `Church #${actor.id}`, ownerUserId: actor.id, isActive: true } as any,
        { transaction },
      );
      await ChurchMember.create(
        { churchId: church.id, userId: actor.id, role: 'owner', integrationAccessEnabled: true, inviteAccepted: true } as any,
        { transaction },
      );
    });
  } catch (e) {
    if (!(e instanceof UniqueConstraintError)) throw e; // a parallel request made it first
  }
};

export const listMyChurches = async (actor: Users): Promise<MyChurch[]> => {
  await ensureOwnChurch(actor);
  const memberships: any[] = await ChurchMember.findAll({
    where: { userId: actor.id, inviteAccepted: true },
    include: [{ model: Church, as: 'Church' }],
  });
  const filed = memberships.filter((m) => m.Church?.ownerUserId);
  if (!filed.length) return [];
  const accounts: any[] = await Users.findAll({ where: { id: filed.map((m) => m.Church.ownerUserId) } });
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const entities: any[] = await tokenEntity.findAll({
    where: { email: accounts.map((a) => a.email), isEnabled: true },
    include: tokens,
  });
  const connected = new Map<string, Set<string>>();
  for (const e of entities) {
    const set = connected.get(e.email) ?? new Set<string>();
    for (const t of e.tokens ?? []) if (t.access_token) set.add(t.token_type);
    connected.set(e.email, set);
  }
  return filed
    .map((m): MyChurch | null => {
      const account = accountById.get(m.Church.ownerUserId);
      if (!account) return null;
      const types = connected.get(account.email) ?? new Set<string>();
      return {
        id: m.Church.id,
        name: m.Church.name,
        isActive: m.Church.isActive !== false,
        role: m.role,
        canConnectIntegrations: canConnectIntegrations(m),
        canManagePeople: m.role === 'owner',
        accountUserId: account.id,
        accountEmail: account.email,
        connections: { qbo: types.has('qbo'), pco: types.has('pco') },
      };
    })
    .filter((c): c is MyChurch => c !== null)
    .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name));
};

export const createChurch = async (actor: Users, rawName: unknown): Promise<MyChurch> => {
  const name = cleanName(rawName);
  if ((await listMyChurches(actor)).some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    throw new ChurchServiceError(`You already have a church called ${name}.`, 409);
  }
  const churchId = await sequelize.transaction(async (transaction) => {
    const account: any = await Users.create(
      {
        email: `church-${crypto.randomBytes(8).toString('hex')}@${ACCOUNT_DOMAIN}`,
        churchName: name, firstName: 'N/A', lastName: 'N/A', role: 'client', isSubscribe: '0', isActive: true,
      } as any,
      { transaction },
    );
    const church: any = await Church.create({ name, ownerUserId: account.id, isActive: true } as any, { transaction });
    await ChurchMember.create(
      { churchId: church.id, userId: actor.id, role: 'owner', integrationAccessEnabled: true, inviteAccepted: true } as any,
      { transaction },
    );
    return church.id as number;
  });
  const created = (await listMyChurches(actor)).find((c) => c.id === churchId);
  if (!created) throw new Error(`church ${churchId} was created but is not listed`);
  return created;
};

export const updateChurch = async (access: ChurchAccess, changes: { name?: unknown; isActive?: unknown }) => {
  if (!access.church) throw new ChurchServiceError('Church not found.', 404);
  const church = access.church;
  const name = changes.name !== undefined ? cleanName(changes.name) : undefined;
  await sequelize.transaction(async (transaction) => {
    await church.update(
      { ...(name !== undefined ? { name } : {}), ...(changes.isActive !== undefined ? { isActive: changes.isActive === true } : {}) },
      { transaction },
    );
    // Older screens read the name off the account row. isActive stays on the church: for Active
    // Church the account row is Matt's own login, which must not be switched off with it.
    if (name !== undefined) await Users.update({ churchName: name } as any, { where: { id: access.account.id }, transaction });
  });
};

export const listPeople = async (access: ChurchAccess, actor: Users): Promise<ChurchPerson[]> => {
  if (!access.church) throw new ChurchServiceError('Church not found.', 404);
  const canManage = access.membership === null || access.membership.role === 'owner';
  const rows: any[] = await ChurchMember.findAll({ where: { churchId: access.church.id }, include: [{ model: Users, as: 'User' }] });
  const rank = (p: ChurchPerson) => (p.role === 'owner' ? 0 : p.status === 'active' ? 1 : 2);
  return rows
    .map((m): ChurchPerson => {
      const invited = !(m.inviteAccepted && m.userId);
      return {
        memberId: m.id,
        role: m.role,
        name: personName(m.User),
        email: m.User?.email ?? m.invitedEmail ?? '',
        status: invited ? 'invited' : 'active',
        integrationAccessEnabled: canConnectIntegrations(m),
        isYou: m.userId === actor.id,
        inviteLink: canManage && invited && m.invitationToken && m.invitedEmail ? inviteLinkFor(m.invitedEmail, m.invitationToken) : null,
      };
    })
    .sort((a, b) => rank(a) - rank(b) || a.email.localeCompare(b.email));
};

export const invitePerson = async (access: ChurchAccess, rawEmail: unknown) => {
  if (!access.church) throw new ChurchServiceError('Church not found.', 404);
  const churchId = access.church.id;
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email)) throw new ChurchServiceError('Enter a valid email address.');

  const login: any = await Users.findOne({ where: lowerEq('email', email) });
  if (login && (await ChurchMember.findOne({ where: { churchId, userId: login.id } }))) {
    throw new ChurchServiceError(`${email} is already on this church.`, 409);
  }
  if (await ChurchMember.findOne({ where: { [Op.and]: [{ churchId }, lowerEq('invitedEmail', email)] } as any })) {
    throw new ChurchServiceError(`${email} has already been invited. Copy their invite link from the list.`, 409);
  }

  if (login) {
    // Already has a Church Sync Pro login: add them now rather than send a link they'd have to accept.
    const member: any = await ChurchMember.create({
      churchId, userId: login.id, role: 'bookkeeper', integrationAccessEnabled: false,
      invitedEmail: email, invitationToken: null, inviteAccepted: true,
    } as any);
    return { memberId: member.id as number, addedExisting: true, inviteLink: null, emailSent: false };
  }

  const token = crypto.randomBytes(16).toString('hex');
  const member: any = await ChurchMember.create({
    churchId, userId: null, role: 'bookkeeper', integrationAccessEnabled: false,
    invitedEmail: email, invitationToken: token, inviteAccepted: false,
  } as any);
  const inviteLink = inviteLinkFor(email, token);
  let emailSent = true;
  try {
    await sendInviteEmail(email, inviteLink);
  } catch (e) {
    // SendGrid's DNS is not set up (2026-09-29): the owner can still send the link themselves.
    emailSent = false;
    logger.warn('invite email not sent', { churchId, error: e instanceof Error ? e.message : String(e) });
  }
  return { memberId: member.id as number, addedExisting: false, inviteLink, emailSent };
};

const memberOf = async (access: ChurchAccess, memberId: unknown): Promise<any> => {
  const m = await ChurchMember.findOne({ where: { id: Number(memberId), churchId: access.church!.id } });
  if (!m) throw new ChurchServiceError('That person is not on this church.', 404);
  return m;
};

export const setIntegrationAccess = async (access: ChurchAccess, memberId: unknown, enabled: unknown) => {
  const m = await memberOf(access, memberId);
  if (m.role === 'owner') throw new ChurchServiceError('Owners can always connect QuickBooks and Planning Center.');
  await m.update({ integrationAccessEnabled: enabled === true });
};

export const removePerson = async (access: ChurchAccess, memberId: unknown) => {
  const m = await memberOf(access, memberId);
  const churchId = access.church!.id;
  if (m.role === 'owner' && (await ChurchMember.count({ where: { churchId, role: 'owner', inviteAccepted: true } })) <= 1) {
    throw new ChurchServiceError('A church needs at least one owner.', 409);
  }
  await sequelize.transaction(async (transaction) => {
    await m.destroy({ transaction });
    // Keep the legacy table in step until its endpoints are retired.
    const who = [...(m.userId ? [{ userId: m.userId }] : []), ...(m.invitedEmail ? [{ email: m.invitedEmail }] : [])];
    for (const w of who) await bookkeeper.destroy({ where: { clientId: access.account.id, ...w }, transaction });
  });
};
```

> After writing, scan the file for control characters (memory `write-tool-unicode-escapes`).

- [ ] **Step 5: Run the integration tests and confirm they pass.** Also run the full unit suite and `tsc`.
- [ ] **Step 6: Commit.**
  ```bash
  git add src/services/churches.ts src/services/inviteEmail.ts src/services/__tests__/churches.integration.test.ts src/controller/index.ts
  git commit -m "Church service: list, add, rename, people, invite with a copyable link, access, remove"
  ```

### Task 6: `/church/*` endpoints

**Files:**
- Create: `src/controller/church.ts`
- Modify: `src/constant/routes.ts`. Add `churchRoutes` and export it next to the others.
- Modify: `src/routes/routers.ts`
- Test: `src/controller/__tests__/church.test.ts` (services mocked)

- [ ] **Step 1: Write the failing tests.** Mock `../../services/churches` and `../../services/churchAccess` (`actorFromSession`). Assert:
  - `ChurchServiceError(…, 409)` → status 409 with its message;
  - an unknown error → 500 "Could not …";
  - `myChurches` with no actor → 403;
  - every handler reads `res.locals.churchAccess` rather than the body for the church.
- [ ] **Step 2: Run the tests and confirm they fail.**
- [ ] **Step 3: Implement the controller.**

```ts
import { Response } from 'express';
import { SessionRequest } from 'supertokens-node/lib/build/framework/express';
import { responseSuccess } from '../utils/response';
import { actorFromSession } from '../services/churchAccess';
import {
  ChurchServiceError, createChurch, invitePerson, listMyChurches, listPeople, removePerson, setIntegrationAccess, updateChurch,
} from '../services/churches';
import { createLogger } from '../utils/logger';

const logger = createLogger('church-endpoints');

const fail = (res: Response, e: unknown, fallback: string) => {
  if (e instanceof ChurchServiceError) return res.status(e.status).json({ success: false, message: e.message });
  logger.error(fallback, { error: e instanceof Error ? e.message : String(e) });
  return res.status(500).json({ success: false, message: `${fallback} Try again in a minute.` });
};

export const myChurches = async (req: SessionRequest, res: Response) => {
  try {
    const actor = await actorFromSession(req.session?.getUserId());
    if (!actor) return res.status(403).json({ success: false, message: 'Your account was not found. Sign out and sign in again.' });
    return responseSuccess(res, await listMyChurches(actor));
  } catch (e) {
    return fail(res, e, 'Could not load your churches.');
  }
};

export const addChurch = async (req: SessionRequest, res: Response) => {
  try {
    const actor = await actorFromSession(req.session?.getUserId());
    if (!actor) return res.status(403).json({ success: false, message: 'Your account was not found. Sign out and sign in again.' });
    return responseSuccess(res, await createChurch(actor, req.body?.name));
  } catch (e) {
    return fail(res, e, 'Could not add the church.');
  }
};

// Behind requireChurch(...): res.locals.churchAccess and res.locals.actor are set.
export const editChurch = async (req: SessionRequest, res: Response) => {
  try {
    await updateChurch(res.locals.churchAccess, { name: req.body?.name, isActive: req.body?.isActive });
    return responseSuccess(res, 'ok');
  } catch (e) {
    return fail(res, e, 'Could not update the church.');
  }
};
export const churchPeople = async (req: SessionRequest, res: Response) => {
  try {
    return responseSuccess(res, await listPeople(res.locals.churchAccess, res.locals.actor));
  } catch (e) {
    return fail(res, e, 'Could not load the people on this church.');
  }
};
export const invite = async (req: SessionRequest, res: Response) => {
  try {
    return responseSuccess(res, await invitePerson(res.locals.churchAccess, req.body?.email));
  } catch (e) {
    return fail(res, e, 'Could not send the invite.');
  }
};
export const personAccess = async (req: SessionRequest, res: Response) => {
  try {
    await setIntegrationAccess(res.locals.churchAccess, req.body?.memberId, req.body?.integrationAccessEnabled);
    return responseSuccess(res, 'ok');
  } catch (e) {
    return fail(res, e, 'Could not change their access.');
  }
};
export const removeFromChurch = async (req: SessionRequest, res: Response) => {
  try {
    await removePerson(res.locals.churchAccess, req.body?.memberId);
    return responseSuccess(res, 'ok');
  } catch (e) {
    return fail(res, e, 'Could not remove them.');
  }
};
```

- [ ] **Step 4: Add the routes.**
  - `routes.ts`:
    ```ts
    const churchRoutes = {
      mine: '/church/mine',
      create: '/church/create',
      update: '/church/update',
      people: '/church/people',
      invite: '/church/people/invite',
      access: '/church/people/access',
      remove: '/church/people/remove',
    };
    ```
  - `routers.ts`:
    ```ts
    routers.get(churchRoutes.mine, verifySession(), myChurches);
    routers.post(churchRoutes.create, verifySession(), addChurch);
    routers.post(churchRoutes.update, verifySession(), requireChurch('owner'), editChurch);
    routers.get(churchRoutes.people, verifySession(), requireChurch('member'), churchPeople);
    routers.post(churchRoutes.invite, verifySession(), requireChurch('owner'), invite);
    routers.post(churchRoutes.access, verifySession(), requireChurch('owner'), personAccess);
    routers.post(churchRoutes.remove, verifySession(), requireChurch('owner'), removeFromChurch);
    ```
- [ ] **Step 5: Run the checks.** `npx jest`, `npx tsc --noEmit`; expect PASS.
- [ ] **Step 6: Commit.**
  ```bash
  git commit -am "Add /church endpoints for the Churches page and the People tab"
  ```

### Task 7: Invite acceptance reads `ChurchMembers`

**Files:**
- Modify: `src/controller/user.ts` (`checkValidInvitation`, `updateInvitationStatus`)
- Test: `src/controller/__tests__/updateInvitationStatus.test.ts` (update)

- [ ] **Step 1: Update the tests.** Mock `ChurchMember` with `findOne`, `update`, `destroy`. Cases:
  - no token → 401;
  - token + email not found → 400;
  - found with a login → the member gets `userId` + `inviteAccepted: true`, `markEmailVerified` is called, and the legacy `bookkeeper.update` mirror is called;
  - the login is already a member of that church → the invite row is destroyed and the call succeeds;
  - found but no login yet → stays pending (no update) and still succeeds;
  - `checkValidInvitation` finds the row case-insensitively by email.
- [ ] **Step 2: Run the tests and confirm they fail.**
- [ ] **Step 3: Implement.** Use a shared helper in `user.ts`:
  ```ts
  const findInvite = (email: string, token: string) =>
    ChurchMember.findOne({
      where: {
        [Op.and]: [
          { invitationToken: token },
          sequelize.where(sequelize.fn('lower', sequelize.col('invitedEmail')), String(email).trim().toLowerCase()),
        ],
      } as any,
    });
  ```
  Import `sequelize from '../db'` and `Op` if `user.ts` lacks them.
  - `checkValidInvitation`: `findInvite` → `'exist'`, else 400 `'not found !'` (keep the message; `InviteLink.tsx` reads it).
  - `updateInvitationStatus` keeps its first lines (token required; "This runs before the invitee has a session…" comment), then:
    1. `findInvite`;
    2. `markEmailVerified(email)`;
    3. `const user = await Users.findOne({ where: { email } })`;
    4. if the user exists and the invite is not yet accepted: `ChurchMember.findOne({ where: { churchId: invite.churchId, userId: user.id } })` → if found, `invite.destroy()`; else `invite.update({ userId: user.id, inviteAccepted: true })`;
    5. mirror: `bookkeeper.update({ inviteAccepted: true, ...(user ? { userId: user.id } : {}) }, { where: { email, invitationToken } })`;
    6. `responseSuccess(res, 'accepted')`.
- [ ] **Step 4: Run the tests and confirm they pass.**
- [ ] **Step 5: Commit.**
  ```bash
  git commit -am "Accept invites against ChurchMembers; keep the bookkeeper table mirrored"
  ```

### Task 8: Saving a connection files it under the church's account, and a reconnect replaces it

Today:
- `updateUserToken` takes `userId` from the body, which can be the bookkeeper's own id (memory: CallBack/Account flows).
- A reconnect of the same type is silently ignored, so the old token stays.

**Files:**
- Modify: `src/controller/user.ts` (`updateUserToken`)
- Test: `src/controller/__tests__/updateUserToken.test.ts` (new)

- [ ] **Step 1: Write the failing tests** (models mocked; `res.locals.churchAccess.account = { id: 10, email: 'acct@x' }`):
  1. no entity → creates `token_entity { email: 'acct@x', isEnabled: true }` and a token with `userId: 10` (not the body's `userId: 2`);
  2. an existing token of that type → `update` with the new access/refresh/realm and `userId: 10`, no `create`;
  3. a bad `token_type` → 400.
- [ ] **Step 2: Run the tests and confirm they fail.**
- [ ] **Step 3: Implement.**

```ts
export const updateUserToken = async (req: Request, res: Response) => {
  // Behind requireAccountAccess(fromBody, 'integrations'): the church's account, not whoever clicked Connect.
  const account = res.locals.churchAccess.account;
  const { token_type, access_token, refresh_token, realm_id } = req.body;
  if (!['qbo', 'pco', 'stripe'].includes(token_type)) {
    return responseError({ res, code: 400, message: 'Unknown connection type' });
  }
  try {
    const fields = { access_token, refresh_token, realm_id: realm_id ?? null, userId: account.id };
    const entity: any =
      (await tokenEntity.findOne({ where: { email: account.email } })) ??
      (await tokenEntity.create({ email: account.email, isEnabled: true }));
    const existing: any = await tokens.findOne({ where: { tokenEntityId: entity.id, token_type } });
    // Connecting again replaces the old connection (it used to be ignored, keeping a dead token).
    if (existing) await existing.update(fields);
    else await tokens.create({ ...fields, tokenEntityId: entity.id, token_type } as any);
    return responseSuccess(res, 'success');
  } catch (e) {
    console.log('ERROR: ', e);
    return responseError({ res, code: 400, message: e });
  }
};
```

- [ ] **Step 4: Run the tests and confirm they pass**, then commit:
  ```bash
  git commit -am "File a new connection under the church's account; reconnecting replaces it"
  ```

### Task 9: The nightly run skips deactivated churches

**Files:**
- Modify: `src/controller/automation.ts` (`dailyJournalSync`, around line 966)
- Test: `src/controller/__tests__/dailyJournalSync.test.ts` (new; mock `SyncRun`, `User`, `Church`, `runDailyDonationSync`, logger)

- [ ] **Step 1: Write the failing test.** Two client accounts; `Church.findAll` returns `[{ ownerUserId: 11 }]` as inactive. Assert:
  - `runDailyDonationSync` is called once, for 10;
  - `skips` contains `{ email: <11's email>, reason: 'church_inactive' }`.
- [ ] **Step 2: Run the test and confirm it fails.**
- [ ] **Step 3: Implement.** After `User.findAll`:
  ```ts
  const inactive = new Set((await Church.findAll({ where: { isActive: false }, attributes: ['ownerUserId'] })).map((c: any) => c.ownerUserId));
  ```
  In the loop, before `runDailyDonationSync`:
  ```ts
  if (inactive.has(user.id)) { skips.push({ email: String(user.email), reason: 'church_inactive' }); continue; }
  ```
- [ ] **Step 4: Run the test and confirm it passes**, then commit:
  ```bash
  git commit -am "Nightly run skips deactivated churches"
  ```

### Task 10: Backend to staging (backwards compatible)

The current staging frontend sends:
- a client's own email → allowed as "own row";
- a bookkeeper's selected `clientEmail` → allowed once the resync has made them a member.

So it keeps working.

- [ ] **Step 1: Full checks.** Run `npx tsc --noEmit`, `npx jest`, `TEST_DB_NAME=csp_test npm run test:integration`. Expect all green, and record the counts.
- [ ] **Step 2: Review.** Dispatch `superpowers:code-reviewer` on `git diff develop...feat/churches-access`. Fix the findings.
- [ ] **Step 3: Read staging before migrating** (one-off script recipe in memory `csp-backend-repo`; read-only):
  - `count(*)` of `Churches` and of `ChurchMembers` by role;
  - `bookkeeper` rows;
  - client logins without a church.

  Keep the numbers.
- [ ] **Step 4: Merge and migrate.**
  ```bash
  git switch develop && git merge --no-ff feat/churches-access && git push origin develop
  NODE_ENV=staging npx sequelize-cli db:migrate
  ```
  Re-read the counts. They should match the planner's expectations, and the duplicate-owner check must not have thrown.
- [ ] **Step 5: Deploy the backend to staging.** Run `make deploy-stg-be` using the deploy workaround (throwaway `DOCKER_CONFIG`, `DOCKER_HOST`, `CLOUDSDK_CORE_ACCOUNT`; memory `docker-credential-desktop-hang`).
  - Probe: `curl -s -o /dev/null -w '%{http_code}' https://<staging be>/csp/church/mine` → `401` (registered, no session).
  - `gcloud run revisions describe` shows a new image digest.
- [ ] **Step 6: Smoke-test the current staging frontend** in the browser with ego-browser: owner login → Daily Giving, Clearing and Mapping load. If there is a bookkeeper login, switch clients and load Daily Giving. In Cloud Run logs, `church access refused` must not appear for these.

---

## 8. Frontend tasks (`/Volumes/T7/OtherProject/church-sync-pro`)

### Task 11: Worktree, API client and types

- [ ] **Step 1: Create the worktree.**
  ```bash
  git worktree add ../church-sync-pro-churches -b feat/churches-ui develop && cd ../church-sync-pro-churches && ln -s ../church-sync-pro/node_modules node_modules
  ```
  Copy any gitignored `.env.development.local` if one exists.
- [ ] **Step 2: Add the routes.** In `src/common/constant/routes-api.ts`, add `churchRoutes` (the same 7 paths as the backend) and export it.
- [ ] **Step 3: Create the API client.** `src/common/api/church.ts`:

```ts
import axios from 'axios'
import { churchRoutes } from '../constant/routes-api'

const { REACT_APP_API_PATH } = process.env
const apiCall = axios.create({ baseURL: REACT_APP_API_PATH, headers: { 'Content-type': 'application/json' } })

export interface MyChurch {
  id: number
  name: string
  isActive: boolean
  role: 'owner' | 'bookkeeper'
  canConnectIntegrations: boolean
  canManagePeople: boolean
  accountUserId: number
  accountEmail: string
  connections: { qbo: boolean; pco: boolean }
}

export interface ChurchPerson {
  memberId: number
  role: 'owner' | 'bookkeeper'
  name: string | null
  email: string
  status: 'active' | 'invited'
  integrationAccessEnabled: boolean
  isYou: boolean
  inviteLink: string | null
}

export interface InviteResult {
  memberId: number
  addedExisting: boolean
  inviteLink: string | null
  emailSent: boolean
}

/** The server's own sentence, so the page can show it as is. */
export class ChurchApiError extends Error {}

const call = async <T>(p: Promise<any>, fallback: string): Promise<T> => {
  try {
    return (await p).data.data as T
  } catch (e: any) {
    throw new ChurchApiError(e?.response?.data?.message ?? fallback)
  }
}

export const getMyChurches = () =>
  call<MyChurch[]>(apiCall.get(churchRoutes.mine), 'Could not load your churches.')
export const createChurch = (name: string) =>
  call<MyChurch>(apiCall.post(churchRoutes.create, { name }), 'Could not add the church.')
export const updateChurch = (churchId: number, changes: { name?: string; isActive?: boolean }) =>
  call<'ok'>(apiCall.post(churchRoutes.update, { churchId, ...changes }), 'Could not update the church.')
export const getChurchPeople = (churchId: number) =>
  call<ChurchPerson[]>(apiCall.get(churchRoutes.people, { params: { churchId } }), 'Could not load the people on this church.')
export const inviteToChurch = (churchId: number, email: string) =>
  call<InviteResult>(apiCall.post(churchRoutes.invite, { churchId, email }), 'Could not send the invite.')
export const setPersonAccess = (churchId: number, memberId: number, integrationAccessEnabled: boolean) =>
  call<'ok'>(apiCall.post(churchRoutes.access, { churchId, memberId, integrationAccessEnabled }), 'Could not change their access.')
export const removeFromChurch = (churchId: number, memberId: number) =>
  call<'ok'>(apiCall.post(churchRoutes.remove, { churchId, memberId }), 'Could not remove them.')
```

- [ ] **Step 4: Check and commit.** `npx tsc --noEmit` should be clean. Commit: `"Church API client"`.

### Task 12: Redux holds the selected church; the email-era fields go

**Files:**
- Modify: `src/redux/common.ts`
- Modify: `src/redux/store.ts` (only if a migrate is added; see the note)

- [ ] **Step 1: Add the new state.**
  ```ts
  selectedChurch: MyChurch | null          // initial null
  pendingConnection: PendingConnection | null  // initial null
  ```
  with
  ```ts
  export interface PendingConnection {
    churchId: number
    accountEmail: string
    accountUserId: number
    returnTo: string
  }
  ```
  Reducers: `setSelectedChurch`, `setPendingConnection`, and
  ```ts
  resetChurchScopedState: (state) => {
    state.selectedBankAccount = null
    state.selectedBankExpense = null
  }
  ```
  `resetUserData` also nulls `selectedChurch` and `pendingConnection`.
- [ ] **Step 2: Delete the email-era fields:** `bookkeeper`, `BookkeeperInfo`, `setBookkeeper`, `selectdClient`, `SelectedClient`, `setSelectedClient`, `accountState`, `setAccountState`, `integrationTo`, `setIntegrationTo`.
- [ ] **Step 3: Collect the to-do list.** Run `npx tsc --noEmit 2>&1 | grep -o "src/[^(]*" | sort | uniq -c`. That list is Task 15's to-do list; save it to the scratchpad. Do not commit a red build: carry on to Tasks 13–15 in the same branch and commit once tsc is green again. Or commit with `--no-verify` and the message "WIP: tsc red until Task 15" (no pre-commit hook exists today, so a plain commit works).

> **redux-persist note:** the root reconciler (`autoMergeLevel1`) puts the persisted `common` object back whole. A browser that ran the old build therefore has **no** `selectedChurch` key: it reads as `undefined`, not `null`. Every read must be `?? null`; `useChurch` does this. The leftover `bookkeeper` key is ignored. Scenario S10 covers it.

### Task 13: `useMyChurches`, `useChurch`, and keeping a church selected

**Files:**
- Create: `src/common/hooks/useChurch.ts`
- Modify: `src/pages/MainPage.tsx`: mount `useKeepChurchSelected()` once, and set the `SETTINGS` localStorage key from `church.accountUserId` (today it is `userData.id` at `MainPage.tsx:127`).
- Modify: `src/common/components/background-caller-api/BackgroundDataFetcher.tsx`:
  - effect deps `[location, churchId]`, so QuickBooks/Stripe lists reload on a switch;
  - replace `getQboData(user, bookkeeper)` / `getActiveStripeList(user, bookkeeper)` with the `(email)` signatures from Task 15.

```ts
import { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useQuery } from 'react-query'
import isEqual from 'lodash/isEqual'
import { RootState } from '@/redux/store'
import { resetChurchScopedState, setSelectedChurch } from '@/redux/common'
import { getMyChurches, MyChurch } from '@/common/api/church'

export const MY_CHURCHES_KEY = 'myChurches'

/** Every church the signed-in person belongs to. */
export const useMyChurches = () => {
  const userId = useSelector((s: RootState) => s.common.user?.id)
  return useQuery([MY_CHURCHES_KEY, userId], getMyChurches, { enabled: !!userId, staleTime: 60_000 })
}

/** The church every page works on. `email` is its account's email, which the older endpoints take. */
export const useChurch = () => {
  const church = useSelector((s: RootState) => s.common.selectedChurch) ?? null
  return {
    church,
    churchId: church?.id ?? null,
    email: church?.accountEmail ?? '',
    accountUserId: church?.accountUserId ?? null,
    canConnectIntegrations: !!church?.canConnectIntegrations,
    canManagePeople: !!church?.canManagePeople,
  }
}

export const useSwitchChurch = () => {
  const dispatch = useDispatch()
  return useCallback(
    (next: MyChurch | null) => {
      // Bank and fee choices are per church; never carry one church's into another's Mapping page.
      dispatch(resetChurchScopedState())
      dispatch(setSelectedChurch(next))
    },
    [dispatch],
  )
}

/** Keeps the selection pointing at a church the person still belongs to, with up-to-date rights. */
export const useKeepChurchSelected = () => {
  const dispatch = useDispatch()
  const selected = useSelector((s: RootState) => s.common.selectedChurch) ?? null
  const { data: churches } = useMyChurches()
  const switchChurch = useSwitchChurch()
  useEffect(() => {
    if (!churches) return
    const current = churches.find((c) => c.id === selected?.id)
    if (current) {
      if (!isEqual(current, selected)) dispatch(setSelectedChurch(current))
      return
    }
    switchChurch(churches.find((c) => c.isActive) ?? churches[0] ?? null)
  }, [churches]) // eslint-disable-line react-hooks/exhaustive-deps
}
```

- [ ] Check that `lodash/isEqual` is importable (`lodash` is a dependency: `grep '"lodash"' package.json`). If it is not, use `JSON.stringify` equality.

### Task 14: One church switcher, in the sidebar and the mobile drawer

**Files:**
- Create: `src/common/components/ChurchSwitcher/ChurchSwitcher.tsx`
- Modify: `src/common/components/SideBar/SideBar.tsx`. Replace `useBookkeeperListSidebar`, `selectOrganizationHandler`, the auto-select effect and the react-select block (around lines 300–460).
- Modify: `src/common/components/NavBar/NavBar.tsx`. Replace the same block (around lines 145–300).
- Modify: `src/common/components/SideBar/constant.tsx`:
  - the "Clients" item → `{ name: 'Churches', link: mainRoute.CHURCHES, icon: <FiUsers size={30} /> }`, shown to everyone;
  - the Settings dropdown's Bookkeeper link → `People`, pointing at `/settings?tab=people`.
- Modify: `src/common/constant/route.ts`: add `CHURCHES: '/churches'` to `mainRoute`.

The component:
- shows the selected church's name;
- under it, "Owner" or "Bookkeeper";
- when the person has more than one church, a **controlled** `react-select` (`value`, not `defaultValue`), whose options are labelled with name + "(inactive)";
- a "Manage churches" link to `/churches`;
- with no church, "No church yet", linking to `/churches`.

On change it calls `useSwitchChurch()`. Nothing else: the queries are keyed by `churchId` (Task 15), and `MainPage` reloads the page data.

- Remove the `isEmpty(data)` gating and the "Client's account" / "Bookkeeper account" labels.
- Remove the `role === 'client'` filter that hid "Clients".
- Delete `useBookkeeperListSidebar` and `useToggleUserActiveStatus` from `src/common/hooks/useQueries.tsx` once Task 18 has replaced the Clients page. tsc will tell.

### Task 15: Replace the effective-email idiom (tsc-driven sweep)

**Pattern**, applied at every site from Task 12's list:

```ts
// before
const { user, bookkeeper } = useSelector((s: RootState) => s.common)
const email = user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
useQuery(['getAllQboData', bookkeeper], () => QboGetAllQboData({ email }))
// after
const { email, churchId } = useChurch()
useQuery(['getAllQboData', churchId], () => QboGetAllQboData({ email }), { enabled: !!churchId })
```

Other replacements:

| Before | After |
|---|---|
| `bookkeeper?.clientId` | `accountUserId` |
| `bookkeeper?.churchName` | `church?.name` |
| a `role === 'client'` gate about the church (Integrations, Projects) | `canConnectIntegrations` / `!!church` |
| `bookkeeper.bookkeeperIntegrationAccessEnabled` | `canConnectIntegrations` |

Helpers whose signatures change:

| Helper | New signature |
|---|---|
| `getQboData(user, bookkeeper)` | `getQboData(email: string)` |
| `getActiveStripeList(user, bookkeeper)` | `getActiveStripeList(email: string)` |
| `getUserRelatedSettings(user, bookkeeper)` | `getUserRelatedSettings(email: string)` |

Every query key that held `bookkeeper` now holds `churchId`. These keys had no church at all and gain `churchId`:
- `['getUserRelated']` in `transaction/index.tsx:91` and `transaction/view-detail-stripe/index.tsx:194`;
- `['getFunds']` in `view-detail-stripe/index.tsx:112`.

Work in groups. Each group is one commit, with `npx tsc --noEmit` showing fewer errors after it:

1. **Data helpers:**
   - `common/api/qbo.ts`, `common/api/user.ts` (`getUserRelatedSettings`; drop the `BookkeeperInfo` import);
   - `common/context/PaginationProvider.tsx`, adding `enabled: !!churchId` (today it fires on every page with an empty email);
   - `common/hooks/useGetTokenList.tsx`, `common/hooks/usePaginationStripe.tsx`;
   - `BackgroundDataFetcher.tsx`, `pages/MainPage.tsx`.
2. **Daily work:**
   - `daily/DailyJournalEntries.tsx`, `daily/ClearingStatement.tsx`, `daily/PayoutReports.tsx`. The child components take `email` as a prop and stay as they are.
   - `transaction/index.tsx`, `transaction/component/StripeGivingTable.tsx`, `transaction/component/BatchTable.tsx` (kept but unmounted: fix it, don't delete it).
   - `transaction/view-details/index.tsx`, `transaction/view-detail-stripe/index.tsx`.
3. **Mapping:**
   - `automation/mapping/index.tsx` (with Task 16), `mapping/component/Donation.tsx`, `mapping/component/RegistrationMapping.tsx`;
   - the unmounted `Registration.tsx`, `DeleteModalRegistration.tsx`, `AddUpdateModalRegistration.tsx`, `common/components/modal/ModalRegistrationActiveInActive.tsx`: mechanical fix only;
   - `automation/archive/index.tsx`, `archive/hooks/useGetDeactivatedMapping.tsx`.
4. **Settings and other:**
   - `settings/index.tsx` (with Task 20);
   - `settings/component/Account.tsx` (with Task 17), `Projects.tsx`, `Billing.tsx`, `Email.tsx`, `Profile.tsx`;
   - `settings/modal/DeleteModal.tsx`, `common/components/modal/ModalCreateUpdateProject.tsx`;
   - `quick-start-guide/QuickStartGuide.tsx`;
   - `pages/Auth/login/index.tsx` (delete the commented `setBookkeeper` line).
   - **Profile:** for everyone, show the church name read-only, with the hint "Rename it on the Churches page (owners)". Today clients edit `Users.churchName` there, which would drift from `Churches.name`.

Finish:
- `grep -rnE "clientEmail|bookkeeper\?\.|selectdClient|accountState" src --include='*.ts' --include='*.tsx'` → only `PayoutReview`/`InviteLink` names unrelated to redux, or nothing.
- `npx tsc --noEmit` clean.
- `npx eslint` on the changed files.

### Task 16: The Mapping page can't carry one church's bank choice into another

`mapping/index.tsx:417-441` saves `selectedBankAccount` / `selectedBankExpense` in an effect that also fires on mount. Those values are global, persisted redux. So opening Mapping after a switch saves the previous church's choice into the new church.

- [ ] **Step 1:** Delete both save effects (lines around 417–441).
- [ ] **Step 2:** Save where the person makes the choice. In the four `onChange` handlers that dispatch `setSelectedBankAccount(updatedBankAccounts)` (around lines 675, 716) and `setSelectedBankExpense({...})` (around 750, 784), call:
  ```ts
  saveBankData({ email, data: <the new value> })
  ```
  or `saveBankCharges(...)`, right after the dispatch, with the same value.
- [ ] **Step 3:** The load effect (around line 379) keeps dispatching from `userData`. Task 13's `resetChurchScopedState` clears the values on a switch, so a church with no bank setting shows empty, not the last church's.
- [ ] **Step 4:** Browser check (S4): switch to a church with no bank setting → Mapping → Bank tab shows nothing selected. `getUserRelated` for that church still shows `settingBankData` null.

### Task 17: Connecting QuickBooks / Planning Center is always for a named church

**Files:**
- Create: `src/common/hooks/useConnectIntegration.ts`
- Modify: `src/pages/Main/settings/component/Account.tsx`:
  - the connect handlers (around lines 86–101) use the hook with `returnTo: '/settings?tab=integrations'`;
  - **delete** the `accountState` effect (around lines 169–216).
- Modify: `src/pages/Main/accounts-token/CallBack.tsx`

```ts
import { useDispatch } from 'react-redux'
import { authApi } from '@/common/api/auth'
import { setPendingConnection } from '@/redux/common'
import { MyChurch } from '@/common/api/church'

const START = { qbo: 'authQB', pco: 'authPC', stripe: 'authStripe' } as const

/** Remember which church the connection is for, then go to QuickBooks / Planning Center. */
export const useConnectIntegration = () => {
  const dispatch = useDispatch()
  return async (type: keyof typeof START, church: MyChurch, returnTo: string) => {
    dispatch(setPendingConnection({ churchId: church.id, accountEmail: church.accountEmail, accountUserId: church.accountUserId, returnTo }))
    window.location.href = await authApi(START[type])
  }
}
```

`CallBack.tsx`:
- Read `pendingConnection` (`?? null`) instead of `role` / `selectdClient`.
- For each of qbo, pco and stripe, after the backend exchange call:
  ```ts
  updateUserToken({ email: pending.accountEmail, userId: pending.accountUserId, token_type, access_token, refresh_token, realm_id })
  ```
- If that returns falsy, show the existing error screen. Today a failure is silent.
- On success:
  - `dispatch(setPendingConnection(null))`;
  - `queryClient.invalidateQueries('myChurches')` and `invalidateQueries('getTokenList')`;
  - `navigate(pending.returnTo)`.
- With no `pendingConnection`, show the error screen with the text "We lost track of which church this connection was for. Start again from the Churches page." and a link to `/churches`.
- Change the error screen's link from the dead `/qbo-planning-center-login` to `/churches`.

### Task 18: Churches page (replaces Clients)

**Files:**
- Create: `src/pages/Main/churches/index.tsx`
- Create: `src/pages/Main/churches/AddChurchModal.tsx`
- Create: `src/pages/Main/churches/ChurchRow.tsx`. Adapt `client/components/ClientTableRow.tsx`; reuse `client/components/searchInput.tsx`, `filtersPopover.tsx` and `pagination.tsx` by moving them into `churches/components/`.
- Modify: `src/pages/MainPage.tsx`:
  - route `mainRoute.CHURCHES` → `ChurchesPage` (`authGuard`);
  - `mainRoute.CLIENT_LIST` → `<Navigate to={mainRoute.CHURCHES} replace />`.
- Delete: `src/pages/Main/client/` once nothing imports it.

Page:
- **Header:** "Churches" and the "Add church" button. Subtitle: "Every church you work on. Pick one in the sidebar to work on it."
- **Data:** `useMyChurches()`; search by name; filter Active / Inactive / All; 10 per page (keep the existing pieces).
- **Columns:**
  - **Church**: the name, plus "Owner" / "Bookkeeper" underneath.
  - **QuickBooks** and **Planning Center**: "Connected ✓"; or a `Connect` button when `canConnectIntegrations` (`useConnectIntegration()(type, church, '/churches')`); otherwise "Not connected".
  - **Status**: Active / Inactive.
  - **Actions:**
    - `Open`: `switchChurch(c)`, then navigate to `/transaction`.
    - `People`: switch, then `/settings?tab=people`.
    - Owners only: `Deactivate` / `Reactivate`. A confirm modal says "Deactivating stops the nightly posting for {name}. People keep access and can reactivate it." Then `updateChurch(c.id, { isActive })` and invalidate `myChurches`.
- **AddChurchModal:**
  - one input, "Church name";
  - submit → `createChurch(name)` → invalidate `myChurches` → `switchChurch(created)` → toast "{name} added. Connect QuickBooks and Planning Center to start." → close;
  - errors show `ChurchApiError.message` under the input (409 duplicate).
- **Mobile:** cards with name, role, status, Open and People (cut line 1).

### Task 19: People tab (replaces Bookkeepers)

**Files:**
- Create: `src/pages/Main/settings/component/People.tsx`
- Create: `src/pages/Main/settings/component/InvitePersonModal.tsx`
- Modify: `src/pages/Main/settings/index.tsx`: the tab `{ key: 'people', label: 'People', Component: People }`. Treat `?tab=bookkeeper` as `people`.
- Modify: `MainPage.tsx` legacy redirect: `/settings/bookkeeper` → `/settings?tab=people`.
- Delete: `settings/component/Bookkeeper.tsx` and `settings/bookkeeper/components/*` once nothing imports them. Remove the unused `['bookkeeperList']` query in `Projects.tsx:96-103`.

People tab:
- **Data:** `useQuery(['churchPeople', churchId], () => getChurchPeople(churchId!), { enabled: !!churchId })`.
- **Header:** "People on {church.name}". For owners, an "Invite someone" button.
- **Non-owners** see the list with the note "Only an owner of {name} can invite or remove people."
- **Rows:**
  - **Name / email**: name, or email for pending rows; "(you)" when `isYou`.
  - **Role**: Owner / Bookkeeper.
  - **Status**: Active / "Invited, hasn't joined yet".
  - **Can connect QuickBooks & Planning Center**:
    - owner rows: "Always";
    - bookkeeper rows: a toggle, enabled for owners → `setPersonAccess` → invalidate `churchPeople` and `myChurches`.
  - **Actions** (owners): `Copy invite link` (pending rows; `navigator.clipboard.writeText(inviteLink)`, toast "Link copied") and `Remove` (confirm; not on yourself as the last owner, where the server answers 409 and the message is shown).
- **InvitePersonModal:**
  - an email input; submit → `inviteToChurch(churchId, email)`.
  - If `addedExisting`: "{email} already has a Church Sync Pro login, so they've been added. They'll see {church} in their church list."
  - Else: show the link in a read-only input with a Copy button, and:
    - `emailSent` true: "We've emailed them this link. If it doesn't arrive, send it yourself.";
    - `emailSent` false: "The email didn't go out. Copy the link and send it to them."
  - Then invalidate `churchPeople`.

### Task 20: Settings tabs follow the church's permissions; a no-church state

- [ ] **Step 1: Tab visibility.** In `settings/index.tsx`, replace `clientOnly` with `visible: (c: MyChurch | null) => boolean`:

  | Tab | Visible when |
  |---|---|
  | profile | always |
  | billing | always (unchanged behaviour) |
  | integrations | `c?.canConnectIntegrations` |
  | people | `!!c` |
  | projects | `!!c` |
  | email | `!!c` |

  Projects used to be client-only. Bookkeepers need it (QuickBooks projects for the church).
- [ ] **Step 2: Mapping links.** `mapping/index.tsx:523, 589, 616` link to Integrations. When `!canConnectIntegrations`, render the text "Ask an owner of {church} to connect it" instead of the link.
- [ ] **Step 3: No-church state.** Create `src/common/components/NoChurchYet.tsx`:
  - text: "You're not on a church yet. Add one, or ask a church's owner to invite you.";
  - an `Add church` button that opens `AddChurchModal`.

  In `MainPage.tsx`, when `useMyChurches()` has loaded `[]` and the path is not `/churches` or `/settings`, render it inside the main layout in place of the page. The sidebar stays.

### Task 21: Local verification (before anything goes to staging)

- [ ] **Step 1: Static checks.** Run `npx tsc --noEmit`, `npx eslint $(git diff --name-only develop -- 'src/**/*.ts*')` and `CI=false npx craco build`. All must be clean. Scan new files for control characters.
- [ ] **Step 2: Start the local stack.** Run the backend from the `-churches` worktree, migrated on the local DB, and the frontend on **port 3000** (CORS; free the port rather than move).
- [ ] **Step 3: Run the scenarios** with the `jev-browser-testing` skill (ego lite, plain JS audits first), then read the key pages yourself once.
  - **S1:** Owner login with an existing church. Single church → label, no dropdown. Daily Giving, Clearing and Mapping load. People lists the members.
  - **S2:** Owner invites a new address → link shown and copied. Open the link in a second ego profile → sign up → the app opens on that church, role Bookkeeper. The Integrations tab is hidden; Daily Giving loads.
  - **S3:** Owner turns on access for that bookkeeper. The bookkeeper reloads → the Integrations tab shows; Connect is offered on Churches.
  - **S4:** The bookkeeper adds "Test Two". They are its owner; the switcher lists both. Switching changes Daily Giving, Clearing and Mapping to the right church. Mapping → Bank on Test Two is empty (Task 16), and the original church's bank setting is unchanged in the DB.
  - **S5:** Owner invites an address that already has a login → added at once, listed Active.
  - **S6:** In the bookkeeper's console, `fetch('<api>/user/getUserRelated?email=<another church account>', {credentials:'include'})` → 403. `fetch` POST `/user/updateUserToken` for a church where access is off → 403.
  - **S7:** Deactivate Test Two → shown Inactive, never auto-selected. POST `/csp/dailyJournalSync` locally with the automation key and `{ "email": "<Test Two account>" }` → skip `church_inactive`.
  - **S8:** A bookkeeper with no churches → the "not on a church yet" state, with Add church.
  - **S9:** Remove the S2 bookkeeper. Their next load shows no such church; their direct API calls → 403.
  - **S10:** Load the app in a browser whose localStorage holds the develop build's `persist:root` (copy it from a session of the old build) → it selects the first church, with no crash.
  - **S11:** Connect Planning Center on Test Two from the Churches page, if the local OAuth redirect allows localhost; else do it on staging in Task 22. Afterwards `tokens.userId` = Test Two's account id. A second connect replaces the token.
- [ ] **Step 4: Review.** Dispatch `superpowers:code-reviewer` on `git diff develop...feat/churches-ui`. Fix the findings.

### Task 22: Staging, the legacy routes, docs

- [ ] **Step 1: Merge and deploy.**
  ```bash
  git switch develop && git merge --no-ff feat/churches-ui && git push origin develop
  ```
  Then `make deploy-stg` (same deploy workaround).
- [ ] **Step 2: Confirm the live bundle.** Fetch staging `/`, find `static/js/main.*.js`, and grep it for `Add church` and `People on`.
- [ ] **Step 3: Run S1–S9 and S11 on staging.** Use staging logins created through the People tab. Never enter a password into a non-localhost site from the agent: John signs in, or uses accounts he sets up.
- [ ] **Step 4: Matt's test (needs Q-A and Q-B answered).** Create his team's staging church(es) and invite links. Send nothing to Matt without John's go-ahead.
- [ ] **Step 5: Retire the legacy routes** (backend, after the frontend is live on staging), on a new branch `chore/retire-legacy-church-routes` from develop:
  - delete the routes and their controller functions `bookkeeperList`, `createClientChurch`, `sendEmailInvitation`, `deleteBookeeper` and `toggleUserActiveStatus`;
  - delete the tests that cover them;
  - delete the frontend API functions that call them.

  Then tsc, jest, merge, and deploy to staging. This step is on the cut line.
- [ ] **Step 6: Docs.**
  - Frontend `CLAUDE.md`: Roles, the selected church, Churches / People, the access rule, the `?? null` persist note. Replace the "effective email" idiom text.
  - Backend `CLAUDE.md`: `churchAccess.ts`, the guard table, the account-row meaning of `Churches.ownerUserId`, `@accounts.churchsyncpro.invalid`.
  - Add a pointer at the top of `2026-09-18-churches-as-entities.md`.
  - Memory: update `client-decisions`, `branch-flow…` (what's on develop only) and `matt-oct14-reply-and-commitments` (done / not done).

---

## 9. Production release (NOT part of Friday; listed so nothing is forgotten)

This work sits on top of develop-only work. It ships to production together with the following, in this order:

1. **Churches Phase 1 migrations** (`20260925000001`–`4`), then this plan's `20261015000001`. Read prod first:
   - client logins, with `isActive`;
   - `bookkeeper` rows (Johnley, Novelyn accepted; Gary pending);
   - no account owning two churches.
2. **Sign-up email verification:** `scripts/verifyExistingUsers.ts` against the prod SuperTokens core **before** the backend deploy (CLAUDE.md), or every login is refused.
3. **Tell Matt:**
   - "Clients" is now "Churches";
   - invites give a link to copy;
   - **switch on "Can connect QuickBooks & Planning Center" for anyone who needs it** (D3).

## 10. Later (deliberately not now)

- Put `churchId` on the wire for the ~35 older endpoints (a header or param plus the same guard), then stop sending `email`.
- Re-key data tables to `churchId`. Only if something needs a church with **no** account row, which nothing does.
- An `Organizations` layer (Phase 0 Q1).
- Changing someone's role (making a bookkeeper an owner).
- Scoping `deleteQboDeposit`'s `UserSync.destroy` by the church (`qbo.ts:139`); legacy batch view.
- Fixing the `userEmailPreferences` model enum mismatch.
- Fixing `addUpdateBank*` creating `UserSettings` without `isAutomationEnable`.

## 11. Self-review

- **Spec coverage (Matt, 2026-10-14):** "the same interface and workflow our bookkeepers will eventually use".
  - Switcher for everyone: Task 14.
  - Churches page with add + connect: Tasks 17–18.
  - People with invite, link and access: Task 19.
  - Server-side access on every church endpoint: Tasks 2–3.
  - Deactivation that actually stops posting: Task 9.
  - All on staging by Friday: Task 22.
- **Money path untouched:** the engine, `DailyJeSync`, `UserSync`, `PayoutTransactions`, their unique keys and the advisory lock are not edited. The only money-adjacent changes are:
  - the token save (Task 8);
  - the nightly skip (Task 9);
  - the bank-mapping save timing (Task 16).

  Each has its own test or browser check.
- **Type consistency:**
  - `MyChurch` and `ChurchPerson` have identical fields in the backend service, the API contract (section 5) and `church.ts`.
  - `ChurchNeed` is `'member' | 'integrations' | 'owner'` everywhere.
  - `res.locals.churchAccess` is set by both guards and read by Tasks 6 and 8.
- **Unverified API assumptions, to check while building:**
  - `sequelize.where(fn('lower', col(...)))` inside `Op.and`;
  - `queryInterface.addIndex(..., { where })` with `Op.ne`, which mirrors the Phase 1 migration's partial index;
  - `include: tokens` with no alias, as `controller/user.ts` uses it.
