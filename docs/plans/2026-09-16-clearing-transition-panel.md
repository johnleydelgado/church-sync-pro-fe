# Clearing Account Transition Panel — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When a church goes live on CSP mid-period, the Clearing Account Statement shows the one-time true-up figure left over from the old process, instead of leaving the bookkeeper to work it out.

**Architecture:** Two repos. Backend (`/Volumes/T7/OtherProject/quickplan-connect`) snapshots the clearing account's QuickBooks balance *net of CSP's own postings* at the moment the go-live date is saved, stores it on `UserSettings`, and has `getClearingStatement` return a `transition` block computed by a pure helper. Frontend (`/Volumes/T7/OtherProject/church-sync-pro`) renders a `TransitionPanel` on the Daily Sync page that disappears once the church marks the transition trued up. No Stripe access exists, so nothing here splits deposits — the arithmetic is entirely `balance at go-live + CSP posted − QuickBooks balance now`.

**Tech Stack:** Node/TypeScript/Express/Sequelize/Postgres + jest (backend); React/CRA/react-query/Tailwind (frontend, no test suite — verify with `tsc`, `eslint`, `craco build`, browser).

---

## Why the maths is what it is (read this first)

The clearing account is a running tally of "money Stripe still owes the church." CSP only ever **adds** to it (one journal entry per day, debiting the mapped account for gross − fees). A human at CFP **clears it down** when Stripe deposits land. CSP never credits it — verified: the only deposit-creating code is the dead Stripe-payout path.

Let, all in cents:

| symbol | meaning | source |
|---|---|---|
| `S` | balance at go-live, **excluding anything CSP had already posted** | snapshot, captured once |
| `C` | net CSP has posted for days ≥ go-live | Σ `DailyJeSync` net where `day >= goLiveDay` |
| `Q` | live QuickBooks balance of the mapped account | `Account.CurrentBalance` |

Then, by definition of the account:

```
Q        = S + C − released
released = S + C − Q            ← money cleared out of the account since go-live
gap      = S − Q
  gap > 0  →  trueUp    = gap   ← more was cleared than CSP put in: old-process money. One adjusting entry.
  gap < 0  →  inTransit = −gap  ← CSP money not yet landed. Nothing to true up yet.
```

Worked on Matt's example (`S = 0`): CSP posts $3,000 (9/15–17), a $5,000 deposit lands 9/18 and is cleared in full → `Q = −2,000` → `trueUp = 2,000`. Exactly his number, with no deposit splitting.

**Why the snapshot is net of CSP's postings:** the snapshot is taken when the go-live date is saved, which can be *after* CSP has posted (Matt saved 9/15 after posting 9/15). Verified live: his account holds exactly $904.45 = CSP's single entry, so `S = 904.45 − 904.45 = 0`. The local sandbox's mapped account (Undeposited Funds) holds $3,662.88 with $0.68 posted → `S = 3,662.20`. Non-zero starts are real, which is why `S` is stored rather than assumed.

**Known caveat to surface in the UI, not hide:** `trueUp` is understated by whatever CSP money is still in transit at the moment of reading. The panel says to read it a few days after the last pre-go-live deposit has landed.

**Verified facts you can rely on:**
- `getClearingStatement` is at `quickplan-connect/src/controller/journalEntry.ts` ~line 176. It reads `DailyJeSync` only, plus `readQboClearingBalance` (a non-exported `const` in the same file, ~line 47).
- The mapped clearing account is `settings.settingBankData` entry with `type === 'donation'`.
- `parseSyncStartDay` is exported from `quickplan-connect/src/services/dailyDonationSync.ts` and turns `MM-DD-YYYY` or `YYYY-MM-DD` into `YYYY-MM-DD`, or `null`.
- `setStartDataAutomation` is at `quickplan-connect/src/controller/user.ts` ~line 134.
- Controller tests mock every model; copy the pattern in `quickplan-connect/src/controller/__tests__/stripeGivingSyncStartDay.test.ts`.
- Frontend statement: `church-sync-pro/src/pages/Main/daily/ClearingStatement.tsx`; types and API in `church-sync-pro/src/common/api/user.ts` (`ClearingStatementData`, `getClearingStatement` ~line 328).
- Prettier: no semicolons in the frontend; semicolons in the backend. Match each file.

---

### Task 1: Pure transition arithmetic (backend)

**Files:**
- Create: `quickplan-connect/src/utils/transition.ts`
- Test: `quickplan-connect/src/utils/__tests__/transition.test.ts`

**Step 1: Write the failing test**

```ts
import { transitionFigures } from '../transition';

describe('transitionFigures', () => {
  test("Matt's example: $3,000 posted, a $5,000 deposit cleared in full", () => {
    // Go-live balance 0. CSP posted 3,000. The bookkeeper cleared 5,000, so QuickBooks reads -2,000.
    const f = transitionFigures({ balanceAtGoLiveCents: 0, postedSinceGoLiveCents: 300000, qboBalanceCents: -200000 });
    expect(f.releasedCents).toBe(500000);
    expect(f.trueUpCents).toBe(200000);
    expect(f.inTransitCents).toBe(0);
  });

  test('nothing cleared yet: everything CSP posted is still in transit', () => {
    const f = transitionFigures({ balanceAtGoLiveCents: 0, postedSinceGoLiveCents: 300000, qboBalanceCents: 300000 });
    expect(f.releasedCents).toBe(0);
    expect(f.inTransitCents).toBe(300000);
    expect(f.trueUpCents).toBe(0);
  });

  test('a non-zero starting balance is not mistaken for a true-up', () => {
    // The local sandbox: Undeposited Funds held 3,662.20 that was never CSP's; CSP posted 0.68.
    const f = transitionFigures({ balanceAtGoLiveCents: 366220, postedSinceGoLiveCents: 68, qboBalanceCents: 366288 });
    expect(f.releasedCents).toBe(0);
    expect(f.inTransitCents).toBe(68);
    expect(f.trueUpCents).toBe(0);
  });

  test('exactly balanced: nothing in transit, nothing to true up', () => {
    const f = transitionFigures({ balanceAtGoLiveCents: 0, postedSinceGoLiveCents: 100000, qboBalanceCents: 0 });
    expect(f).toEqual({ releasedCents: 100000, inTransitCents: 0, trueUpCents: 0 });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Volumes/T7/OtherProject/quickplan-connect && npx jest src/utils/__tests__/transition.test.ts`
Expected: FAIL — `Cannot find module '../transition'`

**Step 3: Write minimal implementation**

```ts
// quickplan-connect/src/utils/transition.ts

export interface TransitionInputs {
  /** The clearing account's balance on the go-live day, EXCLUDING anything CSP had posted. */
  balanceAtGoLiveCents: number;
  /** Net CSP has posted for days on or after go-live. */
  postedSinceGoLiveCents: number;
  /** The account's live balance in QuickBooks right now. */
  qboBalanceCents: number;
}

export interface TransitionFigures {
  /** Money the bookkeeper has cleared out of the account since go-live. */
  releasedCents: number;
  /** CSP money that has not landed in the bank yet. Zero when there is a true-up. */
  inTransitCents: number;
  /** Old-process money cleared through the account: the one-time adjusting entry. Zero while money is still in transit. */
  trueUpCents: number;
}

/**
 * The transition arithmetic, from the one identity the clearing account obeys:
 *
 *     balance now = balance at go-live + CSP posted since − cleared out since
 *
 * CSP knows the first two and can read the third, so what was cleared out falls out directly.
 * If more was cleared than CSP ever put in, the excess is money from the old process that came
 * through a Stripe deposit after go-live - which is exactly the one-time true-up a church needs
 * when it switches over mid-period. No deposit is ever split; the account does the sum itself.
 *
 * Understated by whatever CSP money is still in transit at the moment of reading, so the panel
 * tells the reader to wait until the last pre-go-live deposit has landed.
 */
export const transitionFigures = (i: TransitionInputs): TransitionFigures => {
  const releasedCents = i.balanceAtGoLiveCents + i.postedSinceGoLiveCents - i.qboBalanceCents;
  const gap = i.balanceAtGoLiveCents - i.qboBalanceCents;
  return {
    releasedCents,
    inTransitCents: Math.max(0, -gap),
    trueUpCents: Math.max(0, gap),
  };
};
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/utils/__tests__/transition.test.ts`
Expected: PASS, 4 tests

**Step 5: Commit**

```bash
cd /Volumes/T7/OtherProject/quickplan-connect
git add src/utils/transition.ts src/utils/__tests__/transition.test.ts
git commit -m "Add the clearing-account transition arithmetic

One identity: balance now = balance at go-live + posted since - cleared out
since. Everything the transition panel shows falls out of it."
```

---

### Task 2: Snapshot columns on UserSettings (backend)

**Files:**
- Create: `quickplan-connect/src/db/migrations/20260916000001-add-clearing-transition-to-usersettings.js`
- Modify: `quickplan-connect/src/db/models/userSettings.ts` (interface ~line 6, class fields ~line 20, `init` block)

**Step 1: Write the migration**

```js
'use strict';

/**
 * What the clearing account held when a church went live on CSP, and whether they have
 * since trued up the switch-over.
 *
 * A church that starts mid-period keeps receiving Stripe deposits that mix old-process money
 * with money CSP posted. The only way to tell the leftover apart from a normal running
 * balance is to know what the account held before CSP touched it - so that is captured once,
 * when the go-live date is saved, and never guessed.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('UserSettings', 'clearingBalanceAtGoLiveCents', {
      type: Sequelize.BIGINT,
      allowNull: true,
    });
    await queryInterface.addColumn('UserSettings', 'clearingSnapshotAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('UserSettings', 'transitionTruedUpAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('UserSettings', 'transitionTruedUpAt');
    await queryInterface.removeColumn('UserSettings', 'clearingSnapshotAt');
    await queryInterface.removeColumn('UserSettings', 'clearingBalanceAtGoLiveCents');
  },
};
```

**Step 2: Add the fields to the model**

In `src/db/models/userSettings.ts`, add to `UserSettingsAttributes`:

```ts
  clearingBalanceAtGoLiveCents?: number | null;
  clearingSnapshotAt?: Date | null;
  transitionTruedUpAt?: Date | null;
```

Add to the class body (next to `startDateAutomationRegistration`):

```ts
  public clearingBalanceAtGoLiveCents!: number | null;
  public clearingSnapshotAt!: Date | null;
  public transitionTruedUpAt!: Date | null;
```

Add to the `init({...})` attribute map (next to `startDateAutomationRegistration`):

```ts
    clearingBalanceAtGoLiveCents: { type: DataTypes.BIGINT, allowNull: true },
    clearingSnapshotAt: { type: DataTypes.DATE, allowNull: true },
    transitionTruedUpAt: { type: DataTypes.DATE, allowNull: true },
```

Check the exact table name used in `init` — it is `UserSettings` (confirm with `grep -n "tableName\|modelName" src/db/models/userSettings.ts`). The migration's first argument must match.

**Step 3: Run the migration locally and typecheck**

Run: `npm run db:migrate` (requires the local Postgres container `quickplan-connect-db-1` to be up: `docker compose up -d db`)
Expected: `== 20260916000001-add-clearing-transition-to-usersettings: migrated`

Run: `npx tsc --noEmit`
Expected: no output

**Step 4: Commit**

```bash
git add src/db/migrations/20260916000001-add-clearing-transition-to-usersettings.js src/db/models/userSettings.ts
git commit -m "Store what the clearing account held at go-live, and when it was trued up"
```

---

### Task 3: Snapshot service, and share the balance reader (backend)

**Files:**
- Create: `quickplan-connect/src/services/clearingSnapshot.ts`
- Modify: `quickplan-connect/src/controller/journalEntry.ts` — delete the local `readQboClearingBalance` (~lines 40–58) and the local `netOf` inside `getClearingStatement`; import both from the new service
- Test: `quickplan-connect/src/services/__tests__/clearingSnapshot.test.ts`

**Step 1: Write the failing test**

```ts
jest.mock('../../db/models/userSettings', () => ({ __esModule: true, default: { findOne: jest.fn(), update: jest.fn() } }));
jest.mock('../../db/models/DailyJeSync', () => ({ __esModule: true, default: { findAll: jest.fn() } }));
jest.mock('../qboClient', () => ({ getQboTokensForUser: jest.fn().mockResolvedValue({}) }));
jest.mock('../../utils/quickBookApi', () => ({ __esModule: true, default: jest.fn() }));

import UserSettings from '../../db/models/userSettings';
import DailyJeSync from '../../db/models/DailyJeSync';
import quickBookApi from '../../utils/quickBookApi';
import { captureClearingSnapshot, netCentsOf } from '../clearingSnapshot';

const settings = UserSettings as unknown as { findOne: jest.Mock; update: jest.Mock };
const ledger = DailyJeSync as unknown as { findAll: jest.Mock };
const qbApi = quickBookApi as unknown as jest.Mock;

const withQboBalance = (balance: number | Error) =>
  qbApi.mockReturnValue({
    getAccount: (_id: string, cb: (e: any, d: any) => void) =>
      balance instanceof Error ? cb(balance, null) : cb(null, { CurrentBalance: balance }),
  });

const row = (gross: number, fee: number, day = '2026-09-15') => ({ toJSON: () => ({ day, postedGrossCents: gross, postedFeeCents: fee }) });

beforeEach(() => {
  jest.clearAllMocks();
  settings.findOne.mockResolvedValue({
    settingBankData: [{ type: 'donation', value: '175000', label: 'Clearing' }],
    startDateAutomationFund: '09-15-2026',
  });
  settings.update.mockResolvedValue([1]);
});

describe('netCentsOf', () => {
  test('gross minus fees minus refunds, treating missing columns as zero', () => {
    expect(netCentsOf({ postedGrossCents: 92586, postedFeeCents: 2141 })).toBe(90445);
    expect(netCentsOf({ postedGrossCents: 100, postedFeeCents: 32, refundedGrossCents: 100, refundedFeeCents: 32 })).toBe(0);
  });
});

describe('captureClearingSnapshot', () => {
  test("stores the balance net of CSP's own postings - Matt's account", async () => {
    // QuickBooks holds 904.45 and that is exactly CSP's one entry, so the church started from zero.
    withQboBalance(904.45);
    ledger.findAll.mockResolvedValue([row(92586, 2141)]);
    const cents = await captureClearingSnapshot('matt@example.test', 1);
    expect(cents).toBe(0);
    expect(settings.update).toHaveBeenCalledWith(
      expect.objectContaining({ clearingBalanceAtGoLiveCents: 0, clearingSnapshotAt: expect.any(Date) }),
      { where: { userId: 1 } },
    );
  });

  test('keeps a pre-existing balance that was never CSP\'s - the sandbox account', async () => {
    withQboBalance(3662.88);
    ledger.findAll.mockResolvedValue([row(100, 32)]);
    expect(await captureClearingSnapshot('a@b.test', 7)).toBe(366220);
  });

  test('records nothing rather than a wrong number when QuickBooks cannot be read', async () => {
    withQboBalance(new Error('token revoked'));
    ledger.findAll.mockResolvedValue([]);
    expect(await captureClearingSnapshot('a@b.test', 7)).toBeNull();
    expect(settings.update).toHaveBeenCalledWith(
      expect.objectContaining({ clearingBalanceAtGoLiveCents: null, clearingSnapshotAt: null }),
      { where: { userId: 7 } },
    );
  });

  test('records nothing when no clearing account is mapped yet', async () => {
    settings.findOne.mockResolvedValue({ settingBankData: [] });
    ledger.findAll.mockResolvedValue([]);
    expect(await captureClearingSnapshot('a@b.test', 7)).toBeNull();
  });

  test('a day posted before go-live stays inside the starting balance', async () => {
    // "Post anyway" can put a pre-cutoff day into the account. The statement only adds back
    // postings on or after go-live, so the snapshot must subtract only those - otherwise the
    // old day is subtracted here and never added back, and every later figure drifts.
    settings.findOne.mockResolvedValue({
      settingBankData: [{ type: 'donation', value: '175000', label: 'Clearing' }],
      startDateAutomationFund: '09-15-2026',
    });
    withQboBalance(1000);
    ledger.findAll.mockResolvedValue([
      { toJSON: () => ({ day: '2026-09-10', postedGrossCents: 20000, postedFeeCents: 0 }) },
      { toJSON: () => ({ day: '2026-09-15', postedGrossCents: 80000, postedFeeCents: 0 }) },
    ]);
    // 100,000 in the account; only the 80,000 from 9/15 is "since go-live". The 9/10 posting is
    // part of what the account held at go-live, so the snapshot is 20,000 - not 0.
    expect(await captureClearingSnapshot('a@b.test', 7)).toBe(20000);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/services/__tests__/clearingSnapshot.test.ts`
Expected: FAIL — `Cannot find module '../clearingSnapshot'`

**Step 3: Write the service**

```ts
// quickplan-connect/src/services/clearingSnapshot.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import DailyJeSync from '../db/models/DailyJeSync';
import UserSettings from '../db/models/userSettings';
import quickBookApi from '../utils/quickBookApi';
import { parseSyncStartDay } from './dailyDonationSync';
import { getQboTokensForUser } from './qboClient';

/** Net cents one ledger day added to clearing: gross, less fees, less anything refunded back out. */
export const netCentsOf = (r: any): number =>
  Number(r?.postedGrossCents ?? 0) -
  Number(r?.postedFeeCents ?? 0) -
  (Number(r?.refundedGrossCents ?? 0) - Number(r?.refundedFeeCents ?? 0));

/**
 * The clearing account's LIVE balance from QuickBooks, including whatever the accountant has
 * cleared against bank deposits. CSP only ever sees what it adds, so a running sum of its own
 * entries grows forever and stops meaning anything once reconciliation starts. Returns null if
 * the account can't be read, and callers say so rather than showing a wrong number.
 */
export const readQboClearingBalance = async (email: string, accountId: string | undefined): Promise<number | null> => {
  if (!accountId) return null;
  try {
    const qb: any = quickBookApi(await getQboTokensForUser(email));
    const account: any = await new Promise((resolve, reject) =>
      qb.getAccount(accountId, (err: any, data: any) => (err ? reject(err) : resolve(data))),
    );
    const bal = Number(account?.CurrentBalance);
    return Number.isFinite(bal) ? bal : null;
  } catch {
    return null;
  }
};

/**
 * Record what the clearing account held when the church went live - net of anything CSP had
 * already posted, because the go-live date is often saved AFTER the first day has been posted
 * (Matt saved 9/15 with 9/15 already in the account). Without this number the statement cannot
 * tell a pre-existing balance from money left over by the old process.
 *
 * Returns the stored cents, or null - and stores null - when QuickBooks can't be read, so the
 * panel can say "not captured" instead of computing from a guess.
 */
export const captureClearingSnapshot = async (email: string, userId: number): Promise<number | null> => {
  const settings = await UserSettings.findOne({ where: { userId } });
  const bank = (settings?.settingBankData as unknown as any[]) || [];
  const clearing = bank.find((b) => b?.type === 'donation');
  const qboBalance = await readQboClearingBalance(email, clearing?.value);

  if (qboBalance === null) {
    await UserSettings.update({ clearingBalanceAtGoLiveCents: null, clearingSnapshotAt: null }, { where: { userId } });
    return null;
  }

  // Only postings on or after go-live are subtracted - the same set the statement adds back.
  // A pre-cutoff day someone posted on purpose is part of what the account held at go-live.
  // No go-live date means nothing is subtracted, which is also what the statement assumes.
  const goLiveDay = parseSyncStartDay(settings?.startDateAutomationFund);
  const rows = await DailyJeSync.findAll({ where: { userId } });
  const postedCents = rows
    .map((r: any) => r.toJSON())
    .filter((r: any) => !goLiveDay || String(r.day) >= goLiveDay)
    .reduce((sum: number, r: any) => sum + netCentsOf(r), 0);
  const snapshotCents = Math.round(qboBalance * 100) - postedCents;

  await UserSettings.update(
    { clearingBalanceAtGoLiveCents: snapshotCents, clearingSnapshotAt: new Date() },
    { where: { userId } },
  );
  return snapshotCents;
};
```

**Step 4: Point journalEntry.ts at the service**

In `src/controller/journalEntry.ts`:
- Delete the local `readQboClearingBalance` const and its docblock (~lines 40–58).
- Delete the imports it needed if now unused: `getQboTokensForUser` from `../services/qboClient` and `quickBookApi` from `../utils/quickBookApi` (check with `npx tsc --noEmit` — it will flag unused? No; ESLint will: `npx eslint src/controller/journalEntry.ts`).
- Add: `import { captureClearingSnapshot, netCentsOf, readQboClearingBalance } from '../services/clearingSnapshot';` (`captureClearingSnapshot` is used in Task 6).
- Inside `getClearingStatement`, replace the local `const netOf = (r: any) => ...` with `const netOf = netCentsOf;` — or just substitute `netCentsOf` at the three call sites.

**Step 5: Run all backend tests**

Run: `npx jest`
Expected: all suites pass (previous count 153 + 6 new = 159; adjust if you added more)

Run: `npx tsc --noEmit && npx eslint src/controller/journalEntry.ts src/services/clearingSnapshot.ts`
Expected: clean

**Step 6: Commit**

```bash
git add src/services/clearingSnapshot.ts src/services/__tests__/clearingSnapshot.test.ts src/controller/journalEntry.ts
git commit -m "Capture what the clearing account held at go-live

Net of CSP's own postings, because the go-live date is usually saved after
the first day has already been posted. Moves the QuickBooks balance reader
into a service so the snapshot and the statement read it the same way."
```

---

### Task 4: Take the snapshot when the go-live date is saved (backend)

**Files:**
- Modify: `quickplan-connect/src/controller/user.ts` — `setStartDataAutomation` (~line 134)
- Test: `quickplan-connect/src/controller/__tests__/setStartDataAutomation.test.ts`

**Step 1: Write the failing test**

```ts
jest.mock('../../db/models/user', () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock('../../db/models/userSettings', () => ({ __esModule: true, default: { findOne: jest.fn(), update: jest.fn(), create: jest.fn() } }));
jest.mock('../../services/clearingSnapshot', () => ({ captureClearingSnapshot: jest.fn() }));

import Users from '../../db/models/user';
import UserSettings from '../../db/models/userSettings';
import { captureClearingSnapshot } from '../../services/clearingSnapshot';
import { setStartDataAutomation } from '../user';

const users = Users as unknown as { findOne: jest.Mock };
const settings = UserSettings as unknown as { findOne: jest.Mock; update: jest.Mock; create: jest.Mock };
const snapshot = captureClearingSnapshot as unknown as jest.Mock;

const makeRes = () => { const res: any = {}; res.status = jest.fn().mockReturnValue(res); res.json = jest.fn().mockReturnValue(res); return res; };
const call = async (body: any) => { const res = makeRes(); await setStartDataAutomation({ body } as any, res); return res; };

beforeEach(() => {
  jest.clearAllMocks();
  users.findOne.mockResolvedValue({ toJSON: () => ({ id: 1 }) });
  settings.findOne.mockResolvedValue({ id: 10 });
  settings.update.mockResolvedValue([1]);
  snapshot.mockResolvedValue(0);
});

describe('setStartDataAutomation and the go-live snapshot', () => {
  test('saving the donation start date captures the snapshot and re-opens the transition', async () => {
    await call({ email: 'a@b.test', type: 'donation', date: '09-15-2026' });
    expect(snapshot).toHaveBeenCalledWith('a@b.test', 1);
    expect(settings.update).toHaveBeenCalledWith(
      expect.objectContaining({ startDateAutomationFund: '09-15-2026', transitionTruedUpAt: null }),
      { where: { userId: 1 } },
    );
  });

  test('a snapshot failure does not fail the save', async () => {
    snapshot.mockRejectedValue(new Error('qbo down'));
    const res = await call({ email: 'a@b.test', type: 'donation', date: '09-15-2026' });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('the registration start date does not touch the clearing snapshot', async () => {
    await call({ email: 'a@b.test', type: 'registration', date: '09-15-2026' });
    expect(snapshot).not.toHaveBeenCalled();
  });
});
```

Check `responseSuccess`'s exact JSON shape first (`grep -n "responseSuccess" -A 6 src/utils/response.ts`) and adjust the `success: true` assertion to match.

**Step 2: Run test to verify it fails**

Run: `npx jest src/controller/__tests__/setStartDataAutomation.test.ts`
Expected: FAIL — `captureClearingSnapshot` not called / `transitionTruedUpAt` not in update

**Step 3: Modify the controller**

Add the import at the top of `src/controller/user.ts`:

```ts
import { captureClearingSnapshot } from '../services/clearingSnapshot';
```

In the `userSettings` exists → `type === 'donation'` branch, replace the update with:

```ts
        // A new go-live date re-opens the transition: whatever was trued up was for the old date.
        await UserSettings.update(
          { startDateAutomationFund: String(date), transitionTruedUpAt: null },
          { where: { userId: user.id } },
        );
```

Then, after the whole `if (userSettings) {...} else {...}` block and before `return responseSuccess(res, 'Success');`, add:

```ts
    if (type === 'donation') {
      // What the clearing account holds right now, net of CSP's postings, is the baseline the
      // transition panel measures from. Best effort: QuickBooks being unreachable must not stop
      // the date from saving - the panel reports "not captured" and the church can re-save.
      try {
        await captureClearingSnapshot(String(email), user.id);
      } catch (e) {
        console.error('captureClearingSnapshot failed', e instanceof Error ? e.message : e);
      }
    }
```

**Step 4: Run tests**

Run: `npx jest src/controller/__tests__/setStartDataAutomation.test.ts && npx tsc --noEmit`
Expected: PASS, 3 tests; tsc clean

**Step 5: Commit**

```bash
git add src/controller/user.ts src/controller/__tests__/setStartDataAutomation.test.ts
git commit -m "Snapshot the clearing account whenever the go-live date is saved"
```

---

### Task 5: Return the transition block from the statement (backend)

**Files:**
- Modify: `quickplan-connect/src/controller/journalEntry.ts` — `getClearingStatement`
- Test: `quickplan-connect/src/controller/__tests__/clearingStatementTransition.test.ts`

**Step 1: Write the failing test**

```ts
jest.mock('../../db/models/user', () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock('../../db/models/userSettings', () => ({ __esModule: true, default: { findOne: jest.fn(), update: jest.fn() } }));
jest.mock('../../db/models/UserSync', () => ({ __esModule: true, default: { findAll: jest.fn() } }));
jest.mock('../../db/models/SyncRun', () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock('../../db/models/DailyJeSync', () => ({ __esModule: true, default: { findAll: jest.fn() } }));
jest.mock('../automation', () => ({ generatePcToken: jest.fn() }));
jest.mock('../../services/donationSweep', () => ({ fetchDonationsForDay: jest.fn(), fetchDonationsForRange: jest.fn() }));
jest.mock('../../services/dailyDonationSync', () => {
  const actual = jest.requireActual('../../services/dailyDonationSync');
  return { ...actual, getOrgTimeZone: jest.fn(), runDailyDonationSync: jest.fn() };
});
jest.mock('../../services/clearingSnapshot', () => {
  const actual = jest.requireActual('../../services/clearingSnapshot');
  return { ...actual, readQboClearingBalance: jest.fn(), captureClearingSnapshot: jest.fn() };
});

import Users from '../../db/models/user';
import UserSettings from '../../db/models/userSettings';
import DailyJeSync from '../../db/models/DailyJeSync';
import { readQboClearingBalance } from '../../services/clearingSnapshot';
import { getClearingStatement } from '../journalEntry';

const users = Users as unknown as { findOne: jest.Mock };
const settings = UserSettings as unknown as { findOne: jest.Mock };
const ledger = DailyJeSync as unknown as { findAll: jest.Mock };
const qbo = readQboClearingBalance as unknown as jest.Mock;

const makeRes = () => { const res: any = {}; res.status = jest.fn().mockReturnValue(res); res.json = jest.fn().mockReturnValue(res); return res; };
const day = (d: string, gross: number, fee: number) => ({ day: d, postedGrossCents: gross, postedFeeCents: fee, entryCount: 1, qboEntryIds: ['1'], batchIds: [] });

const statement = async (opts: { settings: any; rows: any[]; qbo: number | null }) => {
  users.findOne.mockResolvedValue({ id: 1 });
  settings.findOne.mockResolvedValue({
    settingBankData: [{ type: 'donation', value: '175000', label: 'Clearing' }],
    ...opts.settings,
  });
  ledger.findAll.mockResolvedValue(opts.rows);
  qbo.mockResolvedValue(opts.qbo);
  const res = makeRes();
  await getClearingStatement({ query: { email: 'a@b.test', month: '2026-09' } } as any, res);
  return res.json.mock.calls[0][0].data;
};

beforeEach(() => jest.clearAllMocks());

describe('getClearingStatement: transition block', () => {
  test('absent when the church has no go-live date', async () => {
    const d = await statement({ settings: { startDateAutomationFund: null }, rows: [], qbo: 0 });
    expect(d.transition).toBeNull();
  });

  test("Matt's example: a $5,000 deposit cleared against $3,000 of CSP postings", async () => {
    const d = await statement({
      settings: { startDateAutomationFund: '09-15-2026', clearingBalanceAtGoLiveCents: 0, clearingSnapshotAt: new Date('2026-09-15T12:00:00Z'), transitionTruedUpAt: null },
      rows: [day('2026-09-15', 100000, 0), day('2026-09-16', 100000, 0), day('2026-09-17', 100000, 0)],
      qbo: -2000,
    });
    expect(d.transition).toMatchObject({
      goLiveDay: '2026-09-15',
      balanceAtGoLive: 0,
      postedSinceGoLive: 3000,
      qboBalance: -2000,
      released: 5000,
      inTransit: 0,
      trueUp: 2000,
      truedUpAt: null,
    });
  });

  test('only days on or after go-live count as posted-since', async () => {
    const d = await statement({
      settings: { startDateAutomationFund: '09-15-2026', clearingBalanceAtGoLiveCents: 0 },
      rows: [day('2026-09-10', 50000, 0), day('2026-09-15', 100000, 0)],
      qbo: 1500,
    });
    expect(d.transition.postedSinceGoLive).toBe(1000);
  });

  test('figures are null, not zero, when the snapshot was never captured', async () => {
    const d = await statement({ settings: { startDateAutomationFund: '09-15-2026', clearingBalanceAtGoLiveCents: null }, rows: [], qbo: 0 });
    expect(d.transition.balanceAtGoLive).toBeNull();
    expect(d.transition.trueUp).toBeNull();
    expect(d.transition.released).toBeNull();
  });

  test('figures are null when QuickBooks cannot be read', async () => {
    const d = await statement({ settings: { startDateAutomationFund: '09-15-2026', clearingBalanceAtGoLiveCents: 0 }, rows: [], qbo: null });
    expect(d.transition.trueUp).toBeNull();
    expect(d.qboBalance).toBeNull();
  });

  test('carries truedUpAt so the panel can retire itself', async () => {
    const at = new Date('2026-10-01T00:00:00Z');
    const d = await statement({ settings: { startDateAutomationFund: '09-15-2026', clearingBalanceAtGoLiveCents: 0, transitionTruedUpAt: at }, rows: [], qbo: 0 });
    expect(new Date(d.transition.truedUpAt).toISOString()).toBe(at.toISOString());
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/controller/__tests__/clearingStatementTransition.test.ts`
Expected: FAIL — `d.transition` is `undefined`

**Step 3: Modify `getClearingStatement`**

Add imports at the top of `journalEntry.ts` (some already exist — do not duplicate):

```ts
import { parseSyncStartDay } from '../services/dailyDonationSync'; // already imported alongside getOrgTimeZone
import { transitionFigures } from '../utils/transition';
```

Inside `getClearingStatement`, after `const qboBalance = await readQboClearingBalance(...)`, add:

```ts
    // The switch-over, for a church that went live mid-period. Null when no go-live date is
    // set. Figures are null - never zero - when either input is missing, because a zero here
    // reads as "nothing to true up" and would be a lie.
    const goLiveDay = parseSyncStartDay(settings?.startDateAutomationFund);
    let transition: any = null;
    if (goLiveDay) {
      const s: any = settings;
      const postedSinceGoLiveCents = rows
        .filter((r: any) => r.day >= goLiveDay)
        .reduce((sum: number, r: any) => sum + netCentsOf(r), 0);
      const snapshotCents = s?.clearingBalanceAtGoLiveCents == null ? null : Number(s.clearingBalanceAtGoLiveCents);
      const figures =
        qboBalance !== null && snapshotCents !== null
          ? transitionFigures({
              balanceAtGoLiveCents: snapshotCents,
              postedSinceGoLiveCents,
              qboBalanceCents: Math.round(qboBalance * 100),
            })
          : null;
      transition = {
        goLiveDay,
        balanceAtGoLive: snapshotCents === null ? null : toDollars(snapshotCents),
        snapshotAt: s?.clearingSnapshotAt ?? null,
        postedSinceGoLive: toDollars(postedSinceGoLiveCents),
        qboBalance,
        released: figures ? toDollars(figures.releasedCents) : null,
        inTransit: figures ? toDollars(figures.inTransitCents) : null,
        trueUp: figures ? toDollars(figures.trueUpCents) : null,
        truedUpAt: s?.transitionTruedUpAt ?? null,
      };
    }
```

and add `transition,` to the `responseSuccess(res, {...})` object.

**Step 4: Run tests**

Run: `npx jest && npx tsc --noEmit`
Expected: all pass; tsc clean

**Step 5: Commit**

```bash
git add src/controller/journalEntry.ts src/controller/__tests__/clearingStatementTransition.test.ts
git commit -m "Report the mid-period switch-over on the clearing statement

Balance at go-live, what CSP has posted since, what has been cleared out,
and the one-time true-up that falls out of the difference. Null rather
than zero when an input is missing - zero would read as done."
```

---

### Task 6: "Mark as trued up" endpoint (backend)

**Files:**
- Modify: `quickplan-connect/src/controller/journalEntry.ts` — add `markTransitionTruedUp`
- Modify: `quickplan-connect/src/constant/routes.ts` — add `markTransitionTruedUp: '/user/markTransitionTruedUp'`
- Modify: `quickplan-connect/src/routes/routers.ts` — import + `routers.post(userRoutes.markTransitionTruedUp, verifySession(), markTransitionTruedUp);`
- Test: append to `quickplan-connect/src/controller/__tests__/clearingStatementTransition.test.ts`

**Step 1: Write the failing test** (append to the existing file; add `update: jest.fn()` is already on the `userSettings` mock)

```ts
import { markTransitionTruedUp } from '../journalEntry';

describe('markTransitionTruedUp', () => {
  test('stamps the settings row and returns the timestamp', async () => {
    users.findOne.mockResolvedValue({ id: 1 });
    const upd = (UserSettings as unknown as { update: jest.Mock }).update.mockResolvedValue([1]);
    const res = makeRes();
    await markTransitionTruedUp({ body: { email: 'a@b.test' } } as any, res);
    expect(upd).toHaveBeenCalledWith({ transitionTruedUpAt: expect.any(Date) }, { where: { userId: 1 } });
    expect(res.json.mock.calls[0][0].data.truedUpAt).toBeTruthy();
  });

  test('404 for an unknown email', async () => {
    users.findOne.mockResolvedValue(null);
    const res = makeRes();
    await markTransitionTruedUp({ body: { email: 'nobody@b.test' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/controller/__tests__/clearingStatementTransition.test.ts`
Expected: FAIL — `markTransitionTruedUp` is not exported

**Step 3: Implement**

Append to `journalEntry.ts`:

```ts
/**
 * The church has made its one-time adjusting entry. The transition panel retires itself;
 * saving a new go-live date re-opens it (see setStartDataAutomation).
 */
export const markTransitionTruedUp = async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? '');
  try {
    const user = await Users.findOne({ where: { email } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const truedUpAt = new Date();
    await UserSettings.update({ transitionTruedUpAt: truedUpAt }, { where: { userId: user.id } });
    return responseSuccess(res, { truedUpAt });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Could not record the true-up' });
  }
};
```

Wire the route constant and router line as listed under **Files**.

**Step 4: Run everything**

Run: `npx jest && npx tsc --noEmit`
Expected: all pass

**Step 5: Commit and push**

```bash
git add src/controller/journalEntry.ts src/constant/routes.ts src/routes/routers.ts src/controller/__tests__/clearingStatementTransition.test.ts
git commit -m "Let a church mark the switch-over as trued up"
git push
```

---

### Task 7: Frontend types and API (frontend)

**Files:**
- Modify: `church-sync-pro/src/common/api/user.ts` — `ClearingStatementData` (~line 316), add `markTransitionTruedUp`, export it
- Modify: `church-sync-pro/src/common/constant/routes-api.ts` — add `markTransitionTruedUp: '/user/markTransitionTruedUp'`

**Step 1: Add the type** (above `ClearingStatementData`)

```ts
/** The mid-period switch-over. Dollars. Figures are null when an input could not be read. */
export interface ClearingTransition {
  goLiveDay: string
  balanceAtGoLive: number | null
  snapshotAt: string | null
  postedSinceGoLive: number
  qboBalance: number | null
  released: number | null
  inTransit: number | null
  trueUp: number | null
  truedUpAt: string | null
}
```

and add to `ClearingStatementData`:

```ts
  transition: ClearingTransition | null
```

**Step 2: Add the API function** (next to `getClearingStatement`)

```ts
const markTransitionTruedUp = async (
  email: string,
): Promise<{ truedUpAt: string }> => {
  const url = userRoutes.markTransitionTruedUp
  const res = await apiCall.post(url, JSON.stringify({ email }))
  return res.data.data
}
```

Add `markTransitionTruedUp,` to the export list at the bottom of the file.

**Step 3: Typecheck**

Run: `cd /Volumes/T7/OtherProject/church-sync-pro && npx tsc --noEmit`
Expected: clean

**Step 4: Commit**

```bash
git add src/common/api/user.ts src/common/constant/routes-api.ts
git commit -m "Type the clearing statement's transition block"
```

---

### Task 8: The TransitionPanel and the relabel (frontend)

**Files:**
- Create: `church-sync-pro/src/pages/Main/daily/TransitionPanel.tsx`
- Modify: `church-sync-pro/src/pages/Main/daily/ClearingStatement.tsx` — render the panel; fix the `difference > 0` caption

**Step 1: Create the panel**

```tsx
import React, { FC, useState } from 'react'
import { useMutation, useQueryClient } from 'react-query'
import { Button } from '@material-tailwind/react'
import { HiOutlineExclamationCircle, HiOutlineCheckCircle } from 'react-icons/hi'
import { FormatMoney } from 'format-money-js'

import { ClearingTransition, markTransitionTruedUp } from '@/common/api/user'
import { formatDate } from '@/common/utils/helper'
import { failNotification, successNotification } from '@/common/utils/toast'

interface TransitionPanelProps {
  email: string
  transition: ClearingTransition
}

const fm = new FormatMoney({ decimals: 2 })
const usd = (n: number | null | undefined) =>
  fm.from(Number(n ?? 0), { symbol: '$ ' })?.toString() || '$ 0.00'

/**
 * The mid-period switch-over, for the bookkeeper.
 *
 * A church that goes live on the 15th keeps receiving Stripe deposits that mix money from the
 * old process with money CSP posted. CSP cannot see inside a deposit, so it never tries to
 * split one. It does not need to: if every deposit is cleared in full against the clearing
 * account, the account goes negative by exactly the old-process money, and that number is the
 * one-time adjusting entry. This panel just names it - and then gets out of the way.
 */
const TransitionPanel: FC<TransitionPanelProps> = ({ email, transition }) => {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)

  const trueUp = useMutation(async () => markTransitionTruedUp(email), {
    onSuccess: () => {
      successNotification({ title: 'Transition marked as trued up' })
      queryClient.invalidateQueries('getClearingStatement')
    },
    onError: () => failNotification({ title: 'Could not record the true-up' }),
  })

  const notCaptured = transition.balanceAtGoLive === null
  const unreadable = transition.qboBalance === null
  const hasTrueUp = (transition.trueUp ?? 0) > 0

  return (
    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 print:hidden">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-amber-800">
            Switching to CSP on {formatDate(transition.goLiveDay)}
          </p>
          <p className="max-w-2xl pt-1 text-sm text-amber-900/80">
            Until the last Stripe deposit from before that date has landed, deposits will mix
            old-process money with money CSP posted. Clear each deposit in full against the
            clearing account anyway — the leftover below is your one-time adjusting entry.
          </p>
        </div>
        {!confirming ? (
          <Button
            size="sm"
            variant="outlined"
            onClick={() => setConfirming(true)}
            className="border-amber-400 normal-case text-amber-800"
          >
            Mark as trued up
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-800">Adjusting entry is in QuickBooks?</span>
            <Button size="sm" onClick={() => trueUp.mutate()} disabled={trueUp.isLoading} className="bg-yellow normal-case">
              Yes, done
            </Button>
            <Button size="sm" variant="text" onClick={() => setConfirming(false)} className="normal-case text-gray-600">
              Cancel
            </Button>
          </div>
        )}
      </div>

      {notCaptured ? (
        <p className="flex items-center gap-2 pt-4 text-sm text-red-600">
          <HiOutlineExclamationCircle size={16} />
          The clearing balance at go-live was not captured (QuickBooks could not be read at the
          time). Re-save the start date on the Stripe Giving page to capture it.
        </p>
      ) : unreadable ? (
        <p className="flex items-center gap-2 pt-4 text-sm text-gray-500">
          <HiOutlineExclamationCircle size={16} />
          QuickBooks could not be read just now, so the figures below cannot be computed.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 pt-4 md:grid-cols-4">
            <Figure label="In the account at go-live" value={usd(transition.balanceAtGoLive)} />
            <Figure label="Posted by CSP since" value={usd(transition.postedSinceGoLive)} />
            <Figure label="In QuickBooks now" value={usd(transition.qboBalance)} />
            <Figure label="Cleared out since go-live" value={usd(transition.released)} />
          </div>

          {hasTrueUp ? (
            <div className="mt-4 rounded-lg border border-amber-300 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                One-time true-up
              </p>
              <p className="pt-1 text-2xl font-bold text-amber-800">{usd(transition.trueUp)}</p>
              <p className="pt-1 text-sm text-gray-600">
                {usd(transition.trueUp)} more has been cleared out of the account than CSP ever
                put in. That is old-process money that came through a Stripe deposit after
                go-live. Post one adjusting entry for this amount, then mark the transition trued
                up. Read this a few days after the last pre-go-live deposit landed — anything of
                CSP&apos;s still in transit makes it read low.
              </p>
            </div>
          ) : (
            <p className="flex items-center gap-2 pt-4 text-sm text-gray-600">
              <HiOutlineCheckCircle size={16} className="text-success" />
              Nothing to true up yet. {usd(transition.inTransit)} of CSP&apos;s postings is still
              on its way to the bank.
            </p>
          )}
        </>
      )}
    </div>
  )
}

const Figure: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg bg-white/70 p-3">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
    <p className="pt-0.5 text-lg font-bold text-primary">{value}</p>
  </div>
)

export default TransitionPanel
```

**Step 2: Render it and fix the caption** in `ClearingStatement.tsx`

Import: `import TransitionPanel from './TransitionPanel'`

Immediately inside the `<>` that follows `isLoading || !data ? ... : (`, before the tiles `<div className="grid grid-cols-2 ...">`, add:

```tsx
          {data.transition && !data.transition.truedUpAt ? (
            <TransitionPanel email={email} transition={data.transition} />
          ) : null}
```

Replace the `data.difference > 0` branch's caption:

```tsx
              ) : data.difference > 0 ? (
                // QuickBooks is below CSP's figure: money has been cleared out. During a
                // switch-over that includes old-process money, which is NOT reconciliation -
                // the transition panel above names the leftover.
                <p className="pt-0.5 text-xs text-gray-400">
                  {usd(data.difference)}{' '}
                  {data.transition && !data.transition.truedUpAt
                    ? 'cleared out — see the switch-over panel'
                    : 'already reconciled'}
                </p>
```

**Step 3: Verify**

Run: `npx tsc --noEmit && npx eslint src/pages/Main/daily/ && CI=false npx craco build 2>&1 | grep -E "Compiled|Failed"`
Expected: tsc clean; no new lint errors; `Compiled with warnings` (pre-existing formik warning only)

**Step 4: Commit and push**

```bash
git add src/pages/Main/daily/TransitionPanel.tsx src/pages/Main/daily/ClearingStatement.tsx
git commit -m "Show the mid-period switch-over on the clearing statement

Names the one-time true-up instead of leaving the bookkeeper to infer it
from a negative balance, and retires itself once they mark it done."
git push
```

---

### Task 9: End-to-end verification, then deploy

**Local (QuickBooks sandbox — the non-zero-start case):**

1. Start the stack: `cd quickplan-connect && docker compose up -d && npm run dev`; `cd church-sync-pro && npm start`. Use @ego-browser. Port 3000 must be free (an AidFone dev server sometimes holds it).
2. On `/transaction`, set the cutoff to `2023-04-01`. This calls `setStartDataAutomation` → snapshot. Confirm in the DB:
   `select "startDateAutomationFund","clearingBalanceAtGoLiveCents","clearingSnapshotAt" from "UserSettings";`
   Expected: `clearingBalanceAtGoLiveCents` ≈ `366220` (Undeposited Funds 3,662.88 minus CSP's 0.68 posted — exact value depends on the sandbox's current balance; it must equal `round(qbo*100) − Σnet`).
3. Open `/daily`. The amber panel shows go-live 4/1/2023, balance at go-live ≈ $3,662.20, posted since $0.68, "Nothing to true up yet. $0.68 still on its way."
4. Simulate the switch-over: in the sandbox, post a manual journal entry crediting Undeposited Funds $2.68 / debiting the bank $2.68 (clears CSP's 0.68 plus $2.00 of "old money"). Reload `/daily`: **One-time true-up $2.00**.
5. Click *Mark as trued up* → *Yes, done*. Panel disappears; `transitionTruedUpAt` is set.
6. Re-save the cutoff on `/transaction`. Panel reappears (`transitionTruedUpAt` reset) with a fresh snapshot.
7. Delete the manual sandbox JE from step 4 afterwards.

**Backend:** `npx jest` (all green) and `npx tsc --noEmit`.

**Migrations, then deploy** — run the migration BEFORE deploying the backend that reads the columns:

```bash
cd /Volumes/T7/OtherProject/quickplan-connect
NODE_ENV=staging npx sequelize-cli db:migrate        # staging DB (csp_staging)
make migrate-prd                                     # production DB
export CLOUDSDK_CORE_ACCOUNT=johnley00@gmail.com
make deploy-stg-be && make deploy-prd
cd /Volumes/T7/OtherProject/church-sync-pro
make deploy-stg && make deploy-prd
```

Then confirm the live prod bundle carries the change (do not trust the deploy message):

```bash
B=$(curl -s https://csp-fe-prd-n32ggvrsvq-uc.a.run.app/ | grep -o 'static/js/main\.[a-z0-9]*\.js' | head -1)
curl -s "https://csp-fe-prd-n32ggvrsvq-uc.a.run.app/$B" | grep -c "Mark as trued up"   # expect ≥ 1
```

**Production sanity, no writes:** Matt has `startDateAutomationFund = 09-15-2026` already, saved BEFORE this deploy — so his snapshot is null until he re-saves the date. Tell him: re-save the start date once on the Stripe Giving page; the panel will then show balance at go-live $0.00 (verified live: the account holds exactly CSP's $904.45).

---

## Out of scope (deliberately)

- Splitting individual Stripe deposits — impossible without Stripe access, and unnecessary.
- Posting the adjusting entry from CSP — which account it credits depends on the church's old process; that is the bookkeeper's call. The panel names the amount only.
- Registrations — the same clearing account is mapped for both slots on Matt's church; if registrations ever post, `postedSinceGoLive` will need to include them. Not today.
