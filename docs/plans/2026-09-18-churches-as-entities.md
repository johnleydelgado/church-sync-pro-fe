# Churches as Entities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **STATUS: PROPOSAL — do not execute past Phase 0 until Church Finance Pros (Jake) confirms the direction.** Phases 1–4 are written against the schema as it is on 2026-09-18 and will need re-verifying against the code at execution time.

**Goal:** A church becomes its own record that any number of people can work on, instead of being a login with a church name on it — so one client account can run several churches, and CFP can add a church without creating a fake user for it.

**Architecture:** Add a `Churches` table and a `ChurchMembers` join (person ↔ church, with a role), backfill one church per existing client login, then move every per-church row (settings, QBO/PCO tokens, sync history, mappings, email preferences) from `userId` to `churchId` behind a single backend resolver that accepts either the new `churchId` or the legacy `email` parameter. The frontend swaps the `role === 'bookkeeper' ? bookkeeper?.clientEmail : email` idiom (68 uses in 32 files) for one `selectedChurch` in redux and one hook. Legacy columns are dropped only after every environment has switched.

**Tech Stack:** Sequelize 6 + sequelize-cli migrations (Postgres), Express, jest/ts-jest (backend); React 18 + redux-toolkit + react-query (frontend).

**Spec:** the proposal sent to Jake on 2026-09-18 ("church isn't really a thing — it's a login") and his 2026-09-18 reply: bookkeeper multi-church is the priority; a client-side change is welcome "if it prevents boxing us in".

## Global Constraints

- **Migrations are run separately from deploys** (`NODE_ENV=staging npx sequelize-cli db:migrate`, `make migrate-prd`), and always **before** the backend that needs them.
- Every phase must leave both environments working with the *previous* phase's frontend — additive columns first, dual-read next, removal last.
- Money tables (`DailyJeSync`, `UserSync`, `SyncRun`) are never rewritten in place; they gain a `churchId` that is backfilled, and `userId` stays until Phase 4.
- Per-user things stay per-user: `Billing` (who pays), `Users.role`, profile fields.
- Backend uses semicolons; frontend does not. Read the `Test Suites:` line.

## What the code says today (verified 2026-09-18)

| Fact | Where |
|---|---|
| A church is `Users.churchName` on a row with `role = 'client'`; there is no churches table | `src/db/models/user.ts:13,15` |
| Settings (fund mapping, clearing account, go-live, transition snapshot) are one-per-user | `userSettings.ts:96` `User.hasOne(UserSettings)` |
| QBO / PCO / Stripe tokens hang off the user | `tokens.ts:76` `User.hasMany(tokens, { foreignKey: 'userId' })` |
| Sync history is keyed by user | `UserSync.ts:98` (hasOne), `DailyJeSync.ts:118` (hasMany) |
| Also per-user: `registration` (fund mappings), `emailLog`, `userEmailPreferences`, `billing` | each model's `User.hasOne/hasMany` |
| Bookkeeper access is one row per (bookkeeper, church) | `bookkeeper.ts:83-87` (`userId`, `clientId`) |
| Adding a client from the Clients page creates a real login (`role: 'client'`) | `client/components/modal.tsx` (moves server-side in the sign-up-verification plan) |
| Backend resolves "which church" from an `email` request parameter, ~37 sites | `controller/user.ts` (25 req reads), `journalEntry.ts` (11), `stripe.ts`, `qbo.ts`, `planning-center.ts`, `index.ts`, `automation.ts` |
| Services take `email` too | `syncEngine.ts` (24 mentions), `qboClient.ts`, `dailyDonationSync.ts`, `clearingSnapshot.ts` |
| Frontend: effective church = `role === 'bookkeeper' ? bookkeeper?.clientEmail : email` | 68 uses / 32 files (list in Phase 3) |
| NavBar church switcher exists for bookkeepers only, fed by `useBookkeeperListSidebar` | `NavBar.tsx:148-190` |

---

## Phase 0 — Decide (no code)

### Task 0: Confirm the shape with CFP

Questions whose answers change Phases 1–3. Ask before writing migrations.

- [ ] **Q1.** One church, many people — does CFP want *team-level* access ("everyone at CFP sees all our churches") or per-person-per-church as today? Per-person is what this plan builds; team-level adds an `Organizations` table and one more join and can be layered on later without redoing this.
- [ ] **Q2.** When a church has both an owner (the church's own login) and CFP bookkeepers, who may connect QuickBooks/Planning Center? Today: owner always; bookkeeper only when `bookkeeperIntegrationAccessEnabled`. Keep that flag per membership (this plan does).
- [ ] **Q3.** Billing: per church or per payer account? This plan leaves `Billing` on the user (payer) and adds nothing.
- [ ] **Q4.** Existing production data: one client (Matt's account, "Active Church") with CFP attached. Backfill is trivial; confirm nothing else has been created on prod since 2026-09-17.

Record the answers at the top of this file, then proceed.

---

## Phase 1 — Additive schema + backfill (safe to deploy alone)

After this phase nothing behaves differently: new tables exist and every existing church has a `Churches` row and memberships, but all code still reads `userId`/`email`.

### Task 1: `Churches` and `ChurchMembers` tables

**Files:**
- Create: `quickplan-connect/src/db/migrations/20260925000001-create-churches.js`
- Create: `quickplan-connect/src/db/models/church.ts`
- Create: `quickplan-connect/src/db/models/churchMember.ts`
- Test: `quickplan-connect/src/db/models/__tests__/churchAssociations.test.ts`

**Interfaces:**
- Produces: `Church { id, name, ownerUserId: number | null, isActive }`, `ChurchMember { id, churchId, userId, role: 'owner' | 'bookkeeper', integrationAccessEnabled, invitedEmail, invitationToken, inviteAccepted }`.
- `User.hasMany(ChurchMember, { foreignKey: 'userId' })`, `Church.hasMany(ChurchMember, { foreignKey: 'churchId' })`, `ChurchMember.belongsTo(Church)`, `ChurchMember.belongsTo(User)`.

- [ ] **Step 1: Confirm actual table names** — run `psql` (local) `\dt` and note the exact names (`Users`, `UserSettings`, `tokens`, `bookkeepers`?, …). Sequelize pluralises model names unless `tableName` is set; none of the models set it. Use the names `\dt` prints in every migration below.

- [ ] **Step 2: Migration**

```js
'use strict';

/**
 * A church becomes its own record. Until now "a church" was a Users row with role
 * 'client' and a churchName column, so one login could only ever be one church and a
 * bookkeeper's access had to be a row per (bookkeeper, client-login) pair.
 *
 * Additive: nothing reads these tables yet. Backfill is the next migration.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Churches', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING(256), allowNull: false },
      ownerUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onDelete: 'SET NULL',
      },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('ChurchMembers', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      churchId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Churches', key: 'id' },
        onDelete: 'CASCADE',
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true, // null while an invitation is outstanding
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      role: { type: Sequelize.ENUM('owner', 'bookkeeper'), allowNull: false },
      integrationAccessEnabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      invitedEmail: { type: Sequelize.STRING(256), allowNull: true },
      invitationToken: { type: Sequelize.STRING(256), allowNull: true },
      inviteAccepted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('ChurchMembers', ['churchId', 'userId'], {
      unique: true,
      name: 'church_members_church_user_unique',
      where: { userId: { [Sequelize.Op.ne]: null } },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ChurchMembers');
    await queryInterface.dropTable('Churches');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_ChurchMembers_role";');
  },
};
```

- [ ] **Step 3: Models** — follow `userSettings.ts` exactly (class extends `Model`, `init({...}, { sequelize, modelName })`, associations at the bottom of the file).

```ts
// src/db/models/church.ts
import { Model, DataTypes } from 'sequelize';
import sequelize from '../config'; // same import the other models use - copy it verbatim
import User from './user';

export interface ChurchAttributes {
  id: number;
  name: string;
  ownerUserId: number | null;
  isActive: boolean;
}

class Church extends Model<ChurchAttributes> implements ChurchAttributes {
  public id!: number;
  public name!: string;
  public ownerUserId!: number | null;
  public isActive!: boolean;
}

Church.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(256), allowNull: false },
    ownerUserId: { type: DataTypes.INTEGER, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, modelName: 'Church' },
);

Church.belongsTo(User, { foreignKey: 'ownerUserId', as: 'Owner' });
User.hasMany(Church, { foreignKey: 'ownerUserId', as: 'OwnedChurches' });

export default Church;
```

```ts
// src/db/models/churchMember.ts
import { Model, DataTypes } from 'sequelize';
import sequelize from '../config';
import User from './user';
import Church from './church';

export type ChurchRole = 'owner' | 'bookkeeper';

export interface ChurchMemberAttributes {
  id: number;
  churchId: number;
  userId: number | null;
  role: ChurchRole;
  integrationAccessEnabled: boolean;
  invitedEmail: string | null;
  invitationToken: string | null;
  inviteAccepted: boolean;
}

class ChurchMember extends Model<ChurchMemberAttributes> implements ChurchMemberAttributes {
  public id!: number;
  public churchId!: number;
  public userId!: number | null;
  public role!: ChurchRole;
  public integrationAccessEnabled!: boolean;
  public invitedEmail!: string | null;
  public invitationToken!: string | null;
  public inviteAccepted!: boolean;
}

ChurchMember.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    churchId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    role: { type: DataTypes.ENUM('owner', 'bookkeeper'), allowNull: false },
    integrationAccessEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    invitedEmail: { type: DataTypes.STRING(256), allowNull: true },
    invitationToken: { type: DataTypes.STRING(256), allowNull: true },
    inviteAccepted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { sequelize, modelName: 'ChurchMember' },
);

ChurchMember.belongsTo(Church, { foreignKey: 'churchId', as: 'Church' });
ChurchMember.belongsTo(User, { foreignKey: 'userId', as: 'User' });
Church.hasMany(ChurchMember, { foreignKey: 'churchId', as: 'Members' });
User.hasMany(ChurchMember, { foreignKey: 'userId', as: 'Memberships' });

export default ChurchMember;
```

- [ ] **Step 4: Association smoke test** (mirrors how other model files are loaded in the suite — mock `../config` the way existing model tests do, or if none exist, this test only asserts the association names):

```ts
// src/db/models/__tests__/churchAssociations.test.ts
jest.mock('../../config', () => {
  const { Sequelize } = require('sequelize');
  return { __esModule: true, default: new Sequelize('sqlite::memory:', { logging: false }) };
});
import Church from '../church';
import ChurchMember from '../churchMember';

it('links members to churches and users under the names the controllers will use', () => {
  expect(Object.keys(Church.associations)).toEqual(expect.arrayContaining(['Owner', 'Members']));
  expect(Object.keys(ChurchMember.associations)).toEqual(expect.arrayContaining(['Church', 'User']));
});
```

(If `sqlite3` is not installed, `npm i -D sqlite3` — dev-only. If the config module cannot be mocked this way, drop the test and rely on the migration run.)

- [ ] **Step 5: Run locally**

`NODE_ENV=development npx sequelize-cli db:migrate` → both tables exist (`\dt`), `npx jest src/db/models/__tests__/churchAssociations.test.ts` PASS, `npx tsc --noEmit` clean.

- [ ] **Step 6: Commit** — `git commit -m "Add Churches and ChurchMembers tables and models (additive)"`.

### Task 2: `churchId` on every per-church table (nullable, additive)

**Files:**
- Create: `quickplan-connect/src/db/migrations/20260925000002-add-churchid-columns.js`
- Modify: `userSettings.ts`, `tokens.ts`, `UserSync.ts`, `DailyJeSync.ts`, `SyncRun.ts` (if it has `userId` — confirm), `registration.ts`, `emailLog.ts`, `userEmailPreferences.ts` — add `churchId?: number | null` attribute + `DataTypes.INTEGER, allowNull: true`.

- [ ] **Step 1: Migration** — one `addColumn(<table>, 'churchId', { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Churches', key: 'id' } })` per table in the list, plus an index on each; `down` removes them in reverse.
- [ ] **Step 2: Models** — add the attribute to each interface/class/`init` (three places per file, same as `clearingBalanceAtGoLiveCents` was added to `userSettings.ts`).
- [ ] **Step 3: Migrate locally, `tsc`, full jest** — no behaviour change expected: `Test Suites:` count unchanged, all passing.
- [ ] **Step 4: Commit** — `"Add nullable churchId to every per-church table (additive)"`.

### Task 3: Backfill — one church per client login, memberships from `bookkeeper`

**Files:**
- Create: `quickplan-connect/src/db/migrations/20260925000003-backfill-churches.js`
- Test: `quickplan-connect/src/db/migrations/__tests__/backfillChurches.test.ts` (tests the pure planning function)
- Create: `quickplan-connect/src/utils/backfillChurches.ts` (pure: input rows → output rows, so it can be unit tested)

- [ ] **Step 1: Pure planner + test**

```ts
// src/utils/backfillChurches.ts
export interface ClientRow { id: number; churchName: string | null; isActive?: boolean }
export interface BookkeeperRow {
  userId: number | null; clientId: number; email: string | null;
  invitationToken: string | null; inviteAccepted: boolean | null; bookkeeperIntegrationAccessEnabled: boolean | null;
}
export interface Plan {
  churches: Array<{ ownerUserId: number; name: string; isActive: boolean }>;
  members: Array<{ ownerUserId: number; userId: number | null; role: 'owner' | 'bookkeeper'; integrationAccessEnabled: boolean; invitedEmail: string | null; invitationToken: string | null; inviteAccepted: boolean }>;
}

/** One church per client login, an owner membership for it, and a bookkeeper membership per legacy bookkeeper row. */
export const planBackfill = (clients: ClientRow[], bookkeepers: BookkeeperRow[]): Plan => {
  const churches = clients.map((c) => ({ ownerUserId: c.id, name: c.churchName?.trim() || `Church #${c.id}`, isActive: c.isActive ?? true }));
  const owners = clients.map((c) => ({ ownerUserId: c.id, userId: c.id, role: 'owner' as const, integrationAccessEnabled: true, invitedEmail: null, invitationToken: null, inviteAccepted: true }));
  const clientIds = new Set(clients.map((c) => c.id));
  const bks = bookkeepers
    .filter((b) => clientIds.has(b.clientId) && b.userId !== b.clientId)
    .map((b) => ({ ownerUserId: b.clientId, userId: b.userId, role: 'bookkeeper' as const, integrationAccessEnabled: !!b.bookkeeperIntegrationAccessEnabled, invitedEmail: b.email, invitationToken: b.invitationToken, inviteAccepted: !!b.inviteAccepted }));
  return { churches, members: [...owners, ...bks] };
};
```

Test cases: (a) two clients + one bookkeeper on client 1 → 2 churches, 3 members; (b) a bookkeeper row whose `clientId` has no client login is skipped; (c) empty `churchName` gets the fallback name; (d) an outstanding invite (`userId` null) becomes a member with `userId: null`, `inviteAccepted: false`.

- [ ] **Step 2: Migration** — inside one transaction: `SELECT id, "churchName", "isActive" FROM "Users" WHERE role = 'client'`, `SELECT * FROM <bookkeeper table>`, call `planBackfill`, `bulkInsert('Churches')`, re-select ids by `ownerUserId`, `bulkInsert('ChurchMembers')` with the resolved `churchId`, then for each per-church table: `UPDATE <table> t SET "churchId" = c.id FROM "Churches" c WHERE c."ownerUserId" = t."userId" AND t."churchId" IS NULL`. `down`: null every `churchId`, delete `ChurchMembers`, delete `Churches`.

  The migration must `require` the compiled planner: sequelize-cli runs plain JS, so either `require('ts-node/register')` at the top (check how `.sequelizerc` / existing migrations resolve TS — none do today) or duplicate the 15-line planner inside the migration and keep the TS one as the tested source of truth. Prefer the duplicate; note it in a comment.

- [ ] **Step 3: Run on local, then verify with SQL**

```sql
select count(*) from "Churches";                                   -- = number of client users
select role, count(*) from "ChurchMembers" group by role;          -- owners = churches
select count(*) from "UserSettings" where "churchId" is null;      -- 0 for rows whose user is a client
select count(*) from "DailyJeSync" where "churchId" is null;       -- 0
```

- [ ] **Step 4: Commit** — `"Backfill one church per client login and memberships from the bookkeeper table"`.

**Phase 1 deploy note:** migrations to staging, then prod (`make migrate-prd`) — no backend change needed yet. Verify the SQL above on each.

---

## Phase 2 — Backend reads churches (dual-read; legacy `email` still accepted)

### Task 4: One resolver for "which church is this request about"

**Files:**
- Create: `quickplan-connect/src/services/churchContext.ts`
- Test: `quickplan-connect/src/services/__tests__/churchContext.test.ts`

**Interfaces:**
- Produces: `resolveChurch(input: { churchId?: number | string; email?: string }): Promise<{ church: Church; ownerUser: User | null } | null>` — `churchId` wins; otherwise `email` → `Users.findOne` → `Church.findOne({ where: { ownerUserId } })`. Also `assertMembership(churchId, userId): Promise<ChurchMember>` (throws 403 shape when not a member).

```ts
export const resolveChurch = async ({ churchId, email }: { churchId?: number | string; email?: string }) => {
  if (churchId !== undefined && churchId !== null && churchId !== '') {
    const church = await Church.findOne({ where: { id: Number(churchId) } });
    if (!church) return null;
    const ownerUser = church.ownerUserId ? await Users.findOne({ where: { id: church.ownerUserId } }) : null;
    return { church, ownerUser };
  }
  if (email) {
    // Legacy: the frontend still sends the client's email. Every client login owns exactly one church after the backfill.
    const ownerUser = await Users.findOne({ where: { email } });
    if (!ownerUser) return null;
    const church = await Church.findOne({ where: { ownerUserId: ownerUser.id } });
    return church ? { church, ownerUser } : null;
  }
  return null;
};
```

Tests: churchId path; email path; unknown church → null; `churchId` takes precedence over a conflicting `email`.

### Task 5: Services take a `churchId`

**Files:** `services/qboClient.ts` (`getQboClientForUser(email)` → also `getQboClientForChurch(churchId)` reading `tokens` by `churchId`), `services/syncEngine.ts`, `services/dailyDonationSync.ts`, `services/clearingSnapshot.ts` (`captureClearingSnapshot(email, userId)` → `(churchId)`), `controller/automation.ts` (`generatePcToken`).

Pattern per function: add a `churchId` parameter, read `tokens` / `UserSettings` / `DailyJeSync` `where: { churchId }`, and keep the old email-based export as a thin wrapper that calls `resolveChurch({ email })` first. Existing tests keep passing through the wrappers; add one test per new function asserting the `where` clause uses `churchId`.

Write rows with **both** `userId` (owner) and `churchId` until Phase 4.

### Task 6: Controllers accept `churchId`

Inventory (from `grep -c "req.query\|req.body"`): `user.ts` 25 sites, `journalEntry.ts` 11, `stripe.ts` 6, `qbo.ts` 6, `index.ts` 6, `planning-center.ts` 5, `automation.ts` 2, `db.ts` 1.

Mechanical change at each site that reads `email` to find the church:

```ts
// before
const { email } = req.query;
const user = await Users.findOne({ where: { email } });
const settings = await UserSettings.findOne({ where: { userId: user.id } });

// after
const ctx = await resolveChurch({ churchId: req.query.churchId as string, email: req.query.email as string });
if (!ctx) return responseError({ res, code: 404, message: 'Church not found' });
const settings = await UserSettings.findOne({ where: { churchId: ctx.church.id } });
```

Do one controller per commit, running that controller's tests + `tsc` each time. `getClearingStatement`, `getStripeGivingByDay`, `postStripeGivingDay`, `getDailyJournalEntries`, `setStartDataAutomation`, `createSettings`, `callBackQBO`, `callBackPC`, `getFunds`, `getBookkeeperList` are the ones the daily workflow touches — do those first and browser-test after each.

### Task 7: Church + membership endpoints (replace Clients page + invites)

- `POST /church/create { name }` → `Church.create({ name, ownerUserId: null })` + `ChurchMember.create({ role: 'bookkeeper', userId: <caller>, integrationAccessEnabled: true })` for a bookkeeper caller, or `ownerUserId: <caller>` + owner membership for a client caller. **No `Users` row, no SuperTokens user.**
- `GET /church/mine` → churches the caller is a member of, with their role and access flag (feeds the switcher for everyone).
- `POST /church/:id/invite { email }` → `ChurchMember.create({ churchId, invitedEmail, invitationToken, role: 'bookkeeper' })` + the existing invite email; `POST /church/acceptInvite { email, invitationToken }` → sets `userId`, `inviteAccepted`, marks email verified (as the sign-up-verification plan does).
- `POST /church/:id/members/:memberId/access { enabled }` → the integration-access toggle.
- Keep `sendEmailInvitation` / `updateInvitationStatus` / `createClientChurch` working (they write both tables) until Phase 4.

Sign-up for `role: 'client'` also creates the church + owner membership inside the sign-up override.

---

## Phase 3 — Frontend switches to `selectedChurch`

### Task 8: Redux + hook

- `redux/common.ts`: add `selectedChurch: { id: number; name: string; role: 'owner' | 'bookkeeper'; integrationAccessEnabled: boolean } | null` and `setSelectedChurch`. Keep `bookkeeper` until Task 10.
- `src/common/hooks/useChurch.ts`:

```ts
export const useChurch = () => {
  const { user, selectedChurch } = useSelector((s: RootState) => s.common)
  return {
    churchId: selectedChurch?.id ?? null,
    // legacy param while the backend dual-reads; remove in Phase 4
    email: user.role === 'bookkeeper' ? selectedChurch?.ownerEmail ?? '' : user.email,
    canConnectIntegrations: selectedChurch?.role === 'owner' || !!selectedChurch?.integrationAccessEnabled,
  }
}
```

- API clients in `src/common/api/*.ts`: every function that sends `email` also sends `churchId` when present.

### Task 9: NavBar switcher for everyone, fed by `/church/mine`

Replace `useBookkeeperListSidebar` in `NavBar.tsx:148-190` with `useMyChurches()`; on first load pick the first church; `selectOrganizationHandler` dispatches `setSelectedChurch`. Clients with one church see it as a label, not a dropdown.

### Task 10: Replace the 68 `clientEmail` uses

Files (32): `common/api/qbo.ts`, `common/api/user.ts`, `common/components/modal/ModalRegistrationActiveInActive.tsx`, `common/components/modal/ModalCreateUpdateProject.tsx`, `common/components/NavBar/NavBar.tsx`, `common/components/SideBar/SideBar.tsx`, `common/hooks/useGetTokenList.tsx`, `pages/Main/accounts-token/CallBack.tsx`, `common/context/PaginationProvider.tsx`, `common/hooks/usePaginationStripe.tsx`, `pages/MainPage.tsx`, `pages/Main/automation/mapping/component/Registration.tsx`, `pages/Auth/login/index.tsx`, `pages/Main/client/components/ClientTableRow.tsx`, `pages/Main/automation/archive/index.tsx`, `pages/Main/automation/archive/hooks/useGetDeactivatedMapping.tsx`, `pages/Main/automation/mapping/index.tsx`, `pages/Main/automation/mapping/component/DeleteModalRegistration.tsx`, `pages/Main/settings/component/Projects.tsx`, `pages/Main/automation/mapping/component/Donation.tsx`, `pages/Main/transaction/component/BatchTable.tsx`, `pages/Main/daily/DailyJournalEntries.tsx`, `pages/Main/transaction/component/StripeGivingTable.tsx`, `pages/Main/daily/ClearingStatement.tsx`, `pages/Main/quick-start-guide/QuickStartGuide.tsx`, `pages/Main/transaction/view-details/index.tsx`, `pages/Main/settings/index.tsx`, `pages/Main/settings/component/Account.tsx`, `pages/Main/settings/modal/DeleteModal.tsx`, `pages/Main/transaction/index.tsx`, `redux/common.ts`, `pages/Main/transaction/view-detail-stripe/index.tsx`.

Pattern: `const { email, churchId } = useChurch()` replaces the ternary; react-query keys gain `churchId`. One page per commit; browser-check the page after each. `/daily`, `/transaction`, `/automation/mapping`, `/settings?tab=integrations` are the ones to check by hand.

### Task 11: Clients page → Churches page

`pages/Main/client` becomes "Churches": list from `/church/mine`, "Add church" calls `/church/create` (no login created), row actions: invite bookkeeper, toggle integration access, deactivate. The bookkeeper-settings tab (`/settings?tab=bookkeeper`) becomes "People" for the selected church.

---

## Phase 4 — Remove the legacy path (only after all environments run Phase 3)

- Backend: drop the `email`-fallback branch in `resolveChurch`; stop writing `userId` on per-church rows; migration to `NOT NULL` `churchId` and drop `userId` from `UserSettings`, `tokens`, `UserSync`, `DailyJeSync`, `registration`, `emailLog`, `userEmailPreferences`; drop the `bookkeeper` table; drop `Users.churchName`.
- Frontend: remove `bookkeeper` from redux and the `email` field from `useChurch`.
- Delete `createClientChurch` (from the sign-up-verification plan) — its job is `/church/create` now.

---

## Self-review

- **Spec coverage.** "One client, many churches": Phase 1 schema + Task 7 `/church/create` + Task 9 switcher for everyone. "Add a church without creating a fake login": Task 7. "Bookkeeper multi-church" (Jake's priority): already true today and preserved via memberships. "Not boxed in": team-level access (Q1) is a later `Organizations` table over the same `ChurchMembers` shape.
- **Every step in Phases 2–4 that says "one per commit" is intentionally a list, not step-by-step code:** the mechanical transformation is shown once, the inventory is exact, and each site must be re-read at execution time because the controllers are still changing (the sign-up-verification plan edits `user.ts` first).
- **Type consistency:** `resolveChurch` returns `{ church, ownerUser }` everywhere; `ChurchMember.role` is `'owner' | 'bookkeeper'` in the enum, the model, the planner and the redux type; `integrationAccessEnabled` replaces `bookkeeperIntegrationAccessEnabled` at the new tables only — the legacy column keeps its name until Phase 4.
