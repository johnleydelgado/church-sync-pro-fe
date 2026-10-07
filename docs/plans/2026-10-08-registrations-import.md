# Registrations Import Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let a church upload Planning Center's payout report so CSP records every registration
(event) charge and refund in QuickBooks before the Stripe deposit that carries it is cleared —
and proves nothing else in the deposit went unrecorded.

**Architecture:** The bookkeeper uploads the payout-report CSV on the Clearing page. The backend
parses it, classifies every row (registration to post, already recorded, before the start date,
giving to verify, or held for review), verifies giving rows against Planning Center + CSP's own
day ledger, and posts one journal entry per charge date for new registration charges (and one per
refund date for refunds), reusing the day ledger (`DailyJeSync`) so the Clearing statement and
switch-over maths include registrations automatically. Every imported row is stored with a unique
key, so re-uploading a file never posts twice. Unrecognised rows wait in a review list.

**Tech Stack:** Backend `quickplan-connect` (Express + TypeScript, Sequelize/Postgres, Jest,
node-quickbooks). Frontend `church-sync-pro` (CRA + CRACO, React, react-query, Tailwind,
material-tailwind, react-select).

---

## 0. Background (read first)

**Why this exists.** Planning Center pays Giving *and* Registrations out in the same Stripe
deposits. CSP records giving only, so each deposit can carry money CSP never recorded and the
bookkeeper must check every batch by hand. Matt (Church Finance Pros, 2026-10-07/08) set the rule:
*every dollar in a payout must be recorded by CSP before the deposit clears it* — including refunds
and anything Planning Center might pay out later.

**Why an upload and not an API.** Verified 2026-10-08: Planning Center's Registrations API
(2025-05-01, its only version) exposes only `total_paid` per registration — no payments, dates,
fees or refunds; no Planning Center API exposes payouts; CSP's PCO token is scoped `giving+calendar`
(`/registrations/v2` returns `401 bad_scope`). Planning Center told developers in
planningcenter/developers#1395 (Jan 2026) a payments endpoint is on their list with no date. The
payout report export has everything per transaction. Design the import so an API source could
replace the upload later (the classifier and poster take parsed rows, not a file).

**Decisions already made (Matt, 2026-10-08) — do not re-litigate:**
1. Default every event to **44000 Event Income** (QBO account id `77` for Active Church), with an
   optional per-event override of **account and class** on the Mapping page (other clients need it).
2. Post registrations **dated the charge date** (refunds on the refund date) — same day-for-day rule
   as giving.
3. **Registration start date by charge date: 2026-10-01** for Active. Rows charged earlier are
   ignored even if they appear in a later report (September is covered by the manual true-up; the
   $321.10 of late-September charges in the Oct 1–2 deposits gets a one-off manual entry).
4. No stopgap: Clearing reads low in October until the first upload. Must be live before October's
   close.
5. Uploads: weekly + one before month-end close. The Clearing page shows the date of the **last
   payout report loaded**.
6. Unknown rows: **post everything recognised, hold only the unknowns** in a review list until
   someone codes them (or marks them handled). One odd line must not block the file, and must not
   pass quietly.
7. Fees go to the church's mapped Stripe-fee account (`settingBankCharges`), net to Clearing —
   exactly like giving.

**The file** (`payout_transactions_YYYY-MM-DD.csv`, exported from Planning Center → Accounts →
payout report, "full transaction details"):

```
Date,Type,Source,Name,Fund/Signup,Gross,Fee,Net,Payment method,Campus,Description
2026-09-28,Charge,Giving,Joseph Silva,Tithes & Offerings,"1,900.00",41.15,"1,858.85",card,,"Donation #403670967 - Joseph Silva - Tithes & Offerings ($1,900.00)"
2026-09-27,Charge,Registrations,Mary Kunkleman,SHE Conference 2026,60.00,1.59,58.41,card,,"Registration #86735390 - Mary Kunkleman - SHE Conference 2026"
2026-09-05,Refund,Registrations,Ashton Anderson,Active Youth Magic Mountain Trip,-55.00,0.00,-55.00,card,,"REFUND FOR CHARGE (Registration #85597556 - Ashton Anderson ..."
```

Facts verified against Matt's September file + QuickBooks (use them as acceptance numbers):
- `Date` is the **charge (or refund) date**, not the payout date. There is **no payout id** per row.
- Types seen: `Charge`, `Refund`. Sources seen: `Giving`, `Registrations`.
- Every row's description carries `Donation #<id>` or `Registration #<id>` (refunds wrap it in
  `REFUND FOR CHARGE (...)`).
- `Fee` is a positive magnitude; `Net = Gross − Fee`. Refund rows had `Fee = 0.00`.
- September registrations: 37 charges + 2 refunds = **$2,170.00 gross, $61.10 fee, $2,108.90 net**.
  Giving rows: 348, net $70,209.41. File total net $72,318.31 = every September Stripe deposit.

**Never put the real files in the repo** — they carry donor names. Tests use the synthetic rows below.

---

**Plan checked 2026-10-08:** the code in Tasks 1–4 was run as written — 26/26 tests pass — and on
Matt's real September file it yields 348 giving lines + 39 registration rows ($2,170.00 / $61.10 /
$2,108.90, 23 balanced entries over 21 days) with start date 08-01-2026, all 39 `before_start` with
10-01-2026, and 387 unique row keys for 387 rows.

## 1. Design

### 1.1 Data

New table **`PayoutReportUploads`** — one row per upload (audit trail + "last report loaded"):
`id, userId, fileName, uploadedBy, rowCount, firstDay, lastDay, summary (JSON), createdAt, updatedAt`.

New table **`PayoutTransactions`** — one row per file row ever seen, unique on `(userId, rowKey)`:
`id, userId, uploadId, rowKey, line, day, type, source, name, fundOrSignup, grossCents, feeCents,
netCents, paymentMethod, description, status, reason, accountRef, classRef, qboEntryId, note,
resolvedBy, resolvedAt, createdAt, updatedAt`.

`rowKey`: `registration:<id>:<type>:<day>:<grossCents>` / `donation:<id>:<type>:<day>:<grossCents>`;
rows without an id fall back to `raw:<sha1 of the CSV line>`.

`status` values:

| status | meaning | counts in Clearing? |
|---|---|---|
| `posted` | registration charge/refund posted to QBO | yes |
| `pending` | being posted right now; if left behind by a crash it goes to review, never auto-retried | no |
| `failed` | QuickBooks rejected the entry; retried on the next upload | no |
| `before_start` | registration dated before the registration start date | no (manual) |
| `giving_covered` | giving row whose day is fully in QuickBooks, or before the giving start date | already, via giving |
| `giving_not_posted` | giving row whose day is not (fully) in QuickBooks yet — **needs attention** | no |
| `held` | unrecognised row — **needs review** | no |
| `resolved` | held row coded via the review list and posted | yes |
| `dismissed` | held row marked "handled outside CSP" (note required) | no |

**`DailyJeSync`** gains registration columns (same day row as giving, separate counters so giving's
"Adjustment" memo and `CSP-<day>-<n>` numbering are untouched):
`registrationGrossCents, registrationFeeCents, registrationRefundGrossCents,
registrationRefundFeeCents (BIGINT, default 0), registrationEntryCount (INT, default 0),
registrationEntryIds (JSON)`. `netCentsOf` adds them, so the statement, "posted by CSP to date" and
the switch-over panel include registrations with no further change.

**Mapping** lives in the existing `UserSettings.settingRegistrationData` (JSON, currently `null` for
Active) in a versioned shape so the dead legacy Stripe path can never misread it:

```json
{ "version": 2,
  "default": { "account": { "value": "77", "label": "44000 Event Income" }, "class": null },
  "events": [ { "signup": "SHE Conference 2026", "account": { "value": "77", "label": "44000 Event Income" }, "class": { "value": "…", "label": "Women" } } ] }
```

The registration start date reuses `UserSettings.startDateAutomationRegistration` (`MM-DD-YYYY`,
written by the existing `setStartDataAutomation` with `type: 'registration'`). Clearing account:
`settingBankData` slot `type: 'registration'`, falling back to `type: 'donation'`.

### 1.2 Journal entries

- **Charges**, one entry per charge date per upload: credit each (account, class) its gross; debit the
  fee account the total fee; debit Clearing the net. Doc number `CSP-E-<day>-<n>` (`n` =
  `registrationEntryCount + 1`). Memo `Church Sync Pro - PCO Registrations - <day> | upload:<id>`.
- **Refunds**, one entry per refund date per upload: debit each (account, class) the refunded amount,
  credit Clearing the same. Doc number `CSP-ER-<day>-<n>`. Refund rows with a non-zero fee are
  **held** (never seen in real data; their accounting is unknown).
- Grouping is by **account + class** (the giving builder groups by account only — do not reuse it).

### 1.3 Giving check (Matt's "every dollar")

For giving rows dated on/after the giving start date (`startDateAutomationFund`): fetch the days from
Planning Center (same helpers as Daily Giving), and mark a row `giving_covered` only when (a) the
donation id is one of that day's settled Stripe gifts and (b) CSP's day claim (`UserSync`, donationId
= day) is `posted` with `postedGrossCents ≥` the day's gross. Otherwise `giving_not_posted` with a
reason (`day_not_posted`, `day_partly_posted`, `not_in_planning_center`, `planning_center_unreachable`).
Rows before the giving start date are `giving_covered` (`before_giving_start`). A "Check again"
action re-runs this for stored `giving_not_posted` rows.

### 1.4 API (all behind `verifySession()`, effective email in body/query like the rest of the app)

| Method | Path | Purpose |
|---|---|---|
| POST | `/csp/user/payoutReport/preview` | `{email, fileName, csvText}` → what an import would do. No writes. |
| POST | `/csp/user/payoutReport/import` | same body → stores rows, posts entries, returns result |
| GET | `/csp/user/payoutReport/status?email=` | last upload, counts needing attention, readiness |
| GET | `/csp/user/payoutReport/review?email=` | `held` + `giving_not_posted` rows |
| POST | `/csp/user/payoutReport/resolve` | `{email, id, action: 'post'|'dismiss', account?, class?, note?}` |
| POST | `/csp/user/payoutReport/recheckGiving` | `{email}` → re-run the giving check |
| GET | `/csp/user/payoutReport/signups?email=` | distinct signup names seen (Mapping page) |

Existing, reused: `POST /csp/user/updateRegisterSettings` (mapping JSON),
`POST /csp/user/setStartDataAutomation` with `type: 'registration'` (start date).

### 1.5 Frontend

- **Clearing page** (`src/pages/Main/daily/`): a "Payout reports" card under the balance — last
  report loaded (date, file, charge dates covered), items needing attention, **Upload payout report**
  → modal: choose CSV → preview → Confirm → result. Below it, the review list.
- **Statement**: a *Registrations* column; fees/refunds/to-clearing include registrations; entry ids
  include `CSP-E` entries.
- **Mapping → Registration tab**: replace the Stripe-era content with start date, default
  account + class, and per-event overrides (events from `/signups`, plus free text).

### 1.6 Out of scope (YAGNI)

Reading Stripe; the Registrations API; auto-import; per-payout reconciliation (the file has no payout
ids); deleting the legacy Stripe registration code (leave it, it is unreachable: scheduler paused,
`isAutomationRegistration=false`); the one-off $321.10 September entry (manual, from the October file).

---

## 2. Conventions for every task

- Backend work in `/Volumes/T7/OtherProject/quickplan-connect-reg` (branch `feat/registrations-import`
  from `origin/main`); frontend in `/Volumes/T7/OtherProject/church-sync-pro-reg` (same branch name).
  Never branch from `develop` (it carries unreleased churches + email-verification work).
- Backend: `npx jest <path>` per task; before each commit `npx tsc --noEmit` and read the
  **`Test Suites:`** line (a suite that fails to *load* still prints green `Tests:`).
- `jest.mock` factories are hoisted: use `function mockX()` declarations, never `const` arrows; mock
  `../services/qboClient` and `../utils/quickBookApi` whenever a real module that imports them is
  loaded (see `src/controller/__tests__/clearingStatementTransition.test.ts`).
- Integration tests need the `csp-test-pg` container: `docker start csp-test-pg`, then
  `npx sequelize-cli db:migrate --url postgres://admin:1234@127.0.0.1:55433/csp_test --migrations-path src/db/migrations`,
  then `npm run test:integration`.
- Frontend: no test suite. Verify with `npx tsc --noEmit`, `npx eslint <files>`,
  `CI=false npx craco build`, then the real page.
- Money is integer **cents** everywhere in the backend; API responses return **dollars** (match
  `getClearingStatement`). Prettier: frontend no semicolons; backend semicolons.
- Commit messages end with the attribution trailer in use in this repo.

---

## 3. Backend tasks

### Task 1: Parse the payout report

**Files:**
- Create: `src/services/payoutReport/parsePayoutReport.ts`
- Test: `src/services/payoutReport/__tests__/parsePayoutReport.test.ts`

**Step 1: Write the failing test**

```ts
import { parsePayoutReport, PayoutReportFormatError } from '../parsePayoutReport';

const HEADER = 'Date,Type,Source,Name,Fund/Signup,Gross,Fee,Net,Payment method,Campus,Description';
const csv = (...lines: string[]) => [HEADER, ...lines].join('\r\n');

describe('parsePayoutReport', () => {
  test('reads a giving charge with quoted thousands', () => {
    const [row] = parsePayoutReport(csv(
      '2026-09-28,Charge,Giving,Joseph Silva,Tithes & Offerings,"1,900.00",41.15,"1,858.85",card,,"Donation #403670967 - Joseph Silva - Tithes & Offerings ($1,900.00)"',
    ));
    expect(row).toMatchObject({
      line: 2, day: '2026-09-28', type: 'Charge', source: 'Giving', fundOrSignup: 'Tithes & Offerings',
      grossCents: 190000, feeCents: 4115, netCents: 185885, paymentMethod: 'card',
      externalId: 'donation:403670967', rowKey: 'donation:403670967:charge:2026-09-28:190000',
    });
  });

  test('reads a registration charge and a refund of an earlier charge', () => {
    const rows = parsePayoutReport(csv(
      '2026-09-27,Charge,Registrations,Mary K,SHE Conference 2026,60.00,1.59,58.41,card,,"Registration #86735390 - Mary K - SHE Conference 2026"',
      '2026-09-05,Refund,Registrations,Ashton A,Active Youth Magic Mountain Trip,-55.00,0.00,-55.00,card,,"REFUND FOR CHARGE (Registration #85597556 - Ashton A - Active Youth Magic Mountain Trip)"',
    ));
    expect(rows[0]).toMatchObject({ externalId: 'registration:86735390', grossCents: 6000, feeCents: 159, netCents: 5841 });
    expect(rows[1]).toMatchObject({
      type: 'Refund', externalId: 'registration:85597556', grossCents: -5500, feeCents: 0, netCents: -5500,
      rowKey: 'registration:85597556:refund:2026-09-05:-5500',
    });
  });

  test('a row with no recognisable id still gets a stable key', () => {
    const line = '2026-10-02,Dispute,Stripe,,,-25.00,15.00,-40.00,card,,Chargeback';
    const a = parsePayoutReport(csv(line))[0];
    const b = parsePayoutReport(csv(line))[0];
    expect(a.externalId).toBeNull();
    expect(a.rowKey).toMatch(/^raw:[0-9a-f]{40}$/);
    expect(a.rowKey).toBe(b.rowKey);
  });

  test('tolerates a BOM, LF endings and blank lines', () => {
    const text = '\uFEFF' + HEADER + '\n\n2026-09-27,Charge,Registrations,M,SHE,60.00,1.59,58.41,card,,"Registration #1 - M - SHE"\n';
    expect(parsePayoutReport(text)).toHaveLength(1);
  });

  test('rejects a file that is not the payout report', () => {
    expect(() => parsePayoutReport('id,donor_id,amount\n1,2,3')).toThrow(PayoutReportFormatError);
  });

  test('rejects a row whose amount is not a number, naming the line', () => {
    expect(() => parsePayoutReport(csv('2026-09-27,Charge,Giving,X,F,abc,0,0,card,,"Donation #1"'))).toThrow(/line 2/);
  });

  test('rejects a date that is not YYYY-MM-DD', () => {
    expect(() => parsePayoutReport(csv('09/27/2026,Charge,Giving,X,F,1.00,0,1.00,card,,"Donation #1"'))).toThrow(/line 2/);
  });
});
```

**Step 2: Run it — expect FAIL (module not found)**

Run: `npx jest src/services/payoutReport/__tests__/parsePayoutReport.test.ts`

**Step 3: Implement**

```ts
import crypto from 'crypto';

/**
 * Planning Center's payout report ("full transaction details" export from Accounts).
 *
 * `Date` is the CHARGE (or refund) date, not the payout date, and the file carries no payout id -
 * so rows can be recorded, but not attributed to a particular deposit. Every row that comes from
 * Giving or Registrations carries its Planning Center id in the description, which is what makes
 * re-uploading a file safe (see `rowKey`).
 */
export const PAYOUT_REPORT_HEADER = [
  'Date', 'Type', 'Source', 'Name', 'Fund/Signup', 'Gross', 'Fee', 'Net', 'Payment method', 'Campus', 'Description',
];

export class PayoutReportFormatError extends Error {}

export interface PayoutRow {
  line: number; // 1-based line in the file, for messages
  day: string; // YYYY-MM-DD
  type: string; // 'Charge' | 'Refund' | whatever Planning Center adds later
  source: string; // 'Giving' | 'Registrations' | ...
  name: string;
  fundOrSignup: string;
  grossCents: number;
  feeCents: number; // magnitude as printed (positive)
  netCents: number;
  paymentMethod: string;
  campus: string;
  description: string;
  externalId: string | null; // 'donation:<id>' | 'registration:<id>'
  rowKey: string; // unique per (church, row); re-uploads never post twice
}

/** RFC 4180: quoted fields, doubled quotes, commas and newlines inside quotes. */
export const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
};

const toCents = (raw: string, what: string, line: number): number => {
  const cleaned = String(raw ?? '').replace(/[$,\s]/g, '');
  const n = Number(cleaned);
  if (cleaned === '' || !Number.isFinite(n)) {
    throw new PayoutReportFormatError(`line ${line}: ${what} "${raw}" is not an amount`);
  }
  return Math.round(n * 100);
};

const ID_PATTERN = /(Donation|Registration) #(\d+)/;

export const parsePayoutReport = (text: string): PayoutRow[] => {
  const [header, ...body] = parseCsv(text);
  const normalized = (header ?? []).map((h) => h.trim());
  if (PAYOUT_REPORT_HEADER.some((h, i) => normalized[i] !== h)) {
    throw new PayoutReportFormatError(
      'This is not a Planning Center payout report. Export "full transaction details" from the payout report and upload that file.',
    );
  }
  return body.map((f, i) => {
    const line = i + 2;
    const [day, type, source, name, fundOrSignup, gross, fee, net, paymentMethod, campus, description] = f.map((x) => (x ?? '').trim());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new PayoutReportFormatError(`line ${line}: date "${day}" is not YYYY-MM-DD`);
    const grossCents = toCents(gross, 'Gross', line);
    const feeCents = toCents(fee, 'Fee', line);
    const netCents = toCents(net, 'Net', line);
    const m = description.match(ID_PATTERN);
    const externalId = m ? `${m[1].toLowerCase()}:${m[2]}` : null;
    const rowKey = externalId
      ? `${externalId}:${type.toLowerCase()}:${day}:${grossCents}`
      // From the parsed fields, not the raw line: a quoted field may contain a line break, which
      // would shift raw-line positions and break re-upload safety for these rows.
      : `raw:${crypto.createHash('sha1').update(f.map((x) => (x ?? '').trim()).join('\u0001')).digest('hex')}`;
    return { line, day, type, source, name, fundOrSignup, grossCents, feeCents, netCents, paymentMethod, campus, description, externalId, rowKey };
  });
};
```

**Step 4: Run it — expect PASS (7 tests).** Then `npx tsc --noEmit`.

**Step 5: Commit** — `git add src/services/payoutReport && git commit -m "Parse Planning Center's payout report"`

---

### Task 2: Registration mapping (default + per-event, account + class)

**Files:**
- Create: `src/services/payoutReport/registrationMapping.ts`
- Test: `src/services/payoutReport/__tests__/registrationMapping.test.ts`

**Step 1: Failing test**

```ts
import { readRegistrationMapping, accountForSignup } from '../registrationMapping';

const v2 = {
  version: 2,
  default: { account: { value: '77', label: '44000 Event Income' }, class: null },
  events: [{ signup: 'SHE Conference 2026', account: { value: '78', label: 'Women' }, class: { value: 'c9', label: 'Women' } }],
};

test('legacy (Stripe-era) data is not a v2 mapping', () => {
  expect(readRegistrationMapping([{ registration: 'x', account: {} }])).toBeNull();
  expect(readRegistrationMapping(null)).toBeNull();
});

test('an event override wins, matched case- and space-insensitively', () => {
  expect(accountForSignup(readRegistrationMapping(v2)!, '  she conference 2026 ')).toEqual({ accountRef: '78', classRef: 'c9', via: 'event' });
});

test('anything else falls back to the default', () => {
  expect(accountForSignup(readRegistrationMapping(v2)!, 'Magic Mountain')).toEqual({ accountRef: '77', classRef: undefined, via: 'default' });
});

test('no default and no override means nothing to post to', () => {
  const m = readRegistrationMapping({ version: 2, default: { account: null }, events: [] })!;
  expect(accountForSignup(m, 'Any')).toBeNull();
});
```

**Step 2:** `npx jest src/services/payoutReport/__tests__/registrationMapping.test.ts` → FAIL.

**Step 3: Implement**

```ts
export interface Choice { value: string; label?: string }
export interface RegistrationEventMapping { signup: string; account: Choice; class?: Choice | null }
export interface RegistrationMappingV2 {
  version: 2;
  default: { account: Choice | null; class?: Choice | null };
  events: RegistrationEventMapping[];
}

/** Only the v2 shape counts. `settingRegistrationData` also holds the dead Stripe-era array. */
export const readRegistrationMapping = (raw: any): RegistrationMappingV2 | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.version !== 2) return null;
  return {
    version: 2,
    default: { account: raw.default?.account?.value ? raw.default.account : null, class: raw.default?.class?.value ? raw.default.class : null },
    events: (Array.isArray(raw.events) ? raw.events : []).filter((e: any) => e?.signup && e?.account?.value),
  };
};

const norm = (s: string) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

export const accountForSignup = (
  mapping: RegistrationMappingV2,
  signup: string,
): { accountRef: string; classRef?: string; via: 'event' | 'default' } | null => {
  const hit = mapping.events.find((e) => norm(e.signup) === norm(signup));
  if (hit) return { accountRef: hit.account.value, classRef: hit.class?.value || undefined, via: 'event' };
  if (mapping.default.account?.value) {
    return { accountRef: mapping.default.account.value, classRef: mapping.default.class?.value || undefined, via: 'default' };
  }
  return null;
};
```

**Step 4:** run → PASS. **Step 5:** commit "Registration mapping: default account plus per-event overrides".

---

### Task 3: Classify rows

**Files:**
- Create: `src/services/payoutReport/classifyRows.ts`
- Test: `src/services/payoutReport/__tests__/classifyRows.test.ts`

**Step 1: Failing test**

```ts
import { classifyRows } from '../classifyRows';
import { PayoutRow } from '../parsePayoutReport';
import { readRegistrationMapping } from '../registrationMapping';

const mapping = readRegistrationMapping({ version: 2, default: { account: { value: '77' } }, events: [] })!;
const row = (o: Partial<PayoutRow>): PayoutRow => ({
  line: 2, day: '2026-10-05', type: 'Charge', source: 'Registrations', name: 'N', fundOrSignup: 'SHE',
  grossCents: 6000, feeCents: 159, netCents: 5841, paymentMethod: 'card', campus: '', description: 'Registration #1',
  externalId: 'registration:1', rowKey: 'registration:1:charge:2026-10-05:6000', ...o,
});
const ctx = { registrationStartDay: '2026-10-01', mapping, knownKeys: new Set<string>() };

test('a new registration charge on/after the start date is posted to its account', () => {
  expect(classifyRows([row({})], ctx)[0]).toMatchObject({ status: 'to_post', accountRef: '77' });
});
test('a charge before the start date is left alone', () => {
  expect(classifyRows([row({ day: '2026-09-28' })], ctx)[0]).toMatchObject({ status: 'before_start' });
});
test('a refund on/after the start date posts, even when the charge was earlier', () => {
  expect(classifyRows([row({ type: 'Refund', grossCents: -5500, feeCents: 0, netCents: -5500 })], ctx)[0].status).toBe('to_post');
});
test('a row already imported is reported, not posted again', () => {
  const known = { ...ctx, knownKeys: new Set(['registration:1:charge:2026-10-05:6000']) };
  expect(classifyRows([row({})], known)[0].status).toBe('already_recorded');
});
test('giving rows are handed to the giving check', () => {
  expect(classifyRows([row({ source: 'Giving' })], ctx)[0].status).toBe('giving');
});
test.each([
  [{ source: 'Stripe' }, 'unrecognised_source'],
  [{ type: 'Dispute' }, 'unrecognised_type'],
  [{ netCents: 5000 }, 'amounts_do_not_add_up'],
  [{ grossCents: -6000, netCents: -6159 }, 'unexpected_sign'],
  [{ type: 'Refund', grossCents: -5500, feeCents: 150, netCents: -5650 }, 'refund_with_fee'],
])('odd rows are held: %o', (o, reason) => {
  expect(classifyRows([row(o as any)], ctx)[0]).toMatchObject({ status: 'held', reason });
});
test('no account mapped holds the row', () => {
  const none = { ...ctx, mapping: readRegistrationMapping({ version: 2, default: { account: null }, events: [] })! };
  expect(classifyRows([row({})], none)[0]).toMatchObject({ status: 'held', reason: 'no_account_mapped' });
});
```

**Step 2:** run → FAIL.

**Step 3: Implement**

```ts
import { PayoutRow } from './parsePayoutReport';
import { RegistrationMappingV2, accountForSignup } from './registrationMapping';

export type ClassifiedStatus = 'to_post' | 'already_recorded' | 'before_start' | 'giving' | 'held';
export interface ClassifiedRow {
  row: PayoutRow;
  status: ClassifiedStatus;
  reason?: string;
  accountRef?: string;
  classRef?: string;
}
export interface ClassifyContext {
  registrationStartDay: string; // YYYY-MM-DD, required: never post a church's whole history
  mapping: RegistrationMappingV2;
  knownKeys: Set<string>; // rowKeys already stored in a final state
}

const held = (row: PayoutRow, reason: string): ClassifiedRow => ({ row, status: 'held', reason });

/**
 * What to do with each row. Pure - no I/O - so the rules can be read and tested in one place.
 * Anything not positively recognised is HELD for a person, never skipped: Matt's rule is that
 * every dollar in a payout is recorded or someone has looked at it.
 */
export const classifyRows = (rows: PayoutRow[], ctx: ClassifyContext): ClassifiedRow[] =>
  rows.map((row) => {
    if (ctx.knownKeys.has(row.rowKey)) return { row, status: 'already_recorded' };
    if (row.type !== 'Charge' && row.type !== 'Refund') return held(row, 'unrecognised_type');
    if (row.source === 'Giving') return { row, status: 'giving' };
    if (row.source !== 'Registrations') return held(row, 'unrecognised_source');
    if (row.netCents !== row.grossCents - row.feeCents) return held(row, 'amounts_do_not_add_up');
    if ((row.type === 'Charge' && row.grossCents <= 0) || (row.type === 'Refund' && row.grossCents >= 0)) {
      return held(row, 'unexpected_sign');
    }
    if (row.type === 'Refund' && row.feeCents !== 0) return held(row, 'refund_with_fee');
    if (row.day < ctx.registrationStartDay) return { row, status: 'before_start' };
    const target = accountForSignup(ctx.mapping, row.fundOrSignup);
    if (!target) return held(row, 'no_account_mapped');
    return { row, status: 'to_post', accountRef: target.accountRef, classRef: target.classRef };
  });
```

**Step 4:** run → PASS. **Step 5:** commit "Classify payout-report rows: post, skip, check or hold".

---

### Task 4: Registration journal entries (charges and refunds)

**Files:**
- Create: `src/services/payoutReport/registrationEntries.ts`
- Test: `src/services/payoutReport/__tests__/registrationEntries.test.ts`

**Step 1: Failing test**

```ts
import { registrationChargeEntry, registrationRefundEntry, registrationDocNumber } from '../registrationEntries';

const opts = {
  day: '2026-10-05', docNumber: 'CSP-E-2026-10-05-1', memo: 'Church Sync Pro - PCO Registrations - 2026-10-05',
  clearing: { value: '1150040022', name: 'Clearing Account' },
  fees: { value: '5', name: 'Bank Charges', classRef: 'gf' },
};

test('doc numbers fit QuickBooks (21 chars)', () => {
  expect(registrationDocNumber('2026-10-05', 1, 'charge')).toBe('CSP-E-2026-10-05-1');
  expect(registrationDocNumber('2026-10-05', 12, 'refund')).toBe('CSP-ER-2026-10-05-12');
});

test('charges: gross to income per account+class, fee to fees, net to clearing', () => {
  const je = registrationChargeEntry(
    [
      { accountRef: '77', grossCents: 6000, feeCents: 159 },
      { accountRef: '77', grossCents: 6000, feeCents: 159 },
      { accountRef: '77', classRef: 'women', grossCents: 3000, feeCents: 95 },
    ],
    opts,
  );
  const lines = je.Line.map((l: any) => [l.JournalEntryLineDetail.PostingType, l.JournalEntryLineDetail.AccountRef.value, l.JournalEntryLineDetail.ClassRef?.value, l.Amount]);
  expect(lines).toEqual([
    ['Credit', '77', undefined, 120],
    ['Credit', '77', 'women', 30],
    ['Debit', '5', 'gf', 4.13],
    ['Debit', '1150040022', undefined, 145.87],
  ]);
  expect(je).toMatchObject({ TxnDate: '2026-10-05', DocNumber: 'CSP-E-2026-10-05-1' });
});

test('refunds: income debited back, clearing credited', () => {
  const je = registrationRefundEntry([{ accountRef: '77', grossCents: -5500, feeCents: 0 }], { ...opts, docNumber: 'CSP-ER-2026-10-05-1' });
  expect(je.Line.map((l: any) => [l.JournalEntryLineDetail.PostingType, l.JournalEntryLineDetail.AccountRef.value, l.Amount])).toEqual([
    ['Debit', '77', 55],
    ['Credit', '1150040022', 55],
  ]);
});

test('refuses empty or unbalanced input', () => {
  expect(() => registrationChargeEntry([], opts)).toThrow();
  expect(() => registrationChargeEntry([{ accountRef: '77', grossCents: 100, feeCents: 200 }], opts)).toThrow(/exceed/);
  expect(() => registrationChargeEntry([{ accountRef: '77', grossCents: 100, feeCents: 5 }], { ...opts, fees: { value: '' } })).toThrow(/fee account/);
});
```

**Step 2:** run → FAIL.

**Step 3: Implement**

```ts
/**
 * Journal entries for registration (event) money from Planning Center's payout report.
 *
 * Same shape as a day of giving - gross to income, Stripe's fee to the fee account, net to the
 * clearing account - so Clearing keeps matching the net deposits. Grouped by account AND class:
 * per-event mapping may send two events to the same account under different classes, which the
 * giving builder (grouping by account only) would silently merge.
 */
export interface RegistrationEntryLine { accountRef: string; classRef?: string; grossCents: number; feeCents: number }
export interface RegistrationEntryOptions {
  day: string;
  docNumber: string;
  memo: string;
  clearing: { value: string; name?: string };
  fees: { value: string; name?: string; classRef?: string };
}

const amount = (cents: number) => Math.round(cents) / 100;
const detail = (postingType: 'Debit' | 'Credit', accountRef: { value: string; name?: string }, classRef?: string) => ({
  PostingType: postingType,
  AccountRef: accountRef,
  ...(classRef ? { ClassRef: { value: classRef } } : {}),
});
const line = (cents: number, d: any) => ({ Amount: amount(cents), DetailType: 'JournalEntryLineDetail', JournalEntryLineDetail: d });

export const registrationDocNumber = (day: string, sequence: number, kind: 'charge' | 'refund'): string =>
  `CSP-${kind === 'refund' ? 'ER' : 'E'}-${day}-${sequence}`.slice(0, 21);

const groupByAccountClass = (lines: RegistrationEntryLine[]) => {
  const out = new Map<string, { accountRef: string; classRef?: string; cents: number }>();
  for (const l of lines) {
    const key = `${l.accountRef}|${l.classRef ?? ''}`;
    const prev = out.get(key) ?? { accountRef: l.accountRef, classRef: l.classRef, cents: 0 };
    prev.cents += Math.abs(l.grossCents);
    out.set(key, prev);
  }
  return [...out.values()];
};

const assertBalanced = (je: any) => {
  const sum = (t: string) => je.Line.filter((l: any) => l.JournalEntryLineDetail.PostingType === t).reduce((s: number, l: any) => s + Math.round(l.Amount * 100), 0);
  if (sum('Debit') !== sum('Credit')) throw new Error(`Registration entry imbalance: debits ${sum('Debit')} != credits ${sum('Credit')}`);
  return je;
};

export const registrationChargeEntry = (lines: RegistrationEntryLine[], o: RegistrationEntryOptions) => {
  if (!lines.length) throw new Error('No registration charges to post');
  const grossCents = lines.reduce((s, l) => s + l.grossCents, 0);
  const feeCents = lines.reduce((s, l) => s + Math.abs(l.feeCents), 0);
  if (feeCents > grossCents) throw new Error(`Fees ${feeCents} exceed gross ${grossCents}`);
  if (feeCents > 0 && !o.fees.value) throw new Error('No Stripe fee account is mapped');
  return assertBalanced({
    Line: [
      ...groupByAccountClass(lines).map((g) => line(g.cents, detail('Credit', { value: g.accountRef }, g.classRef))),
      ...(feeCents > 0 ? [line(feeCents, detail('Debit', { value: o.fees.value, name: o.fees.name }, o.fees.classRef))] : []),
      line(grossCents - feeCents, detail('Debit', o.clearing)),
    ],
    TxnDate: o.day,
    DocNumber: o.docNumber,
    PrivateNote: o.memo,
  });
};

/** Refund rows carry negative gross and (always, so far) a zero fee; the classifier holds the rest. */
export const registrationRefundEntry = (lines: RegistrationEntryLine[], o: RegistrationEntryOptions) => {
  if (!lines.length) throw new Error('No registration refunds to post');
  if (lines.some((l) => l.feeCents !== 0)) throw new Error('Refunds with a returned fee are held for review');
  const cents = lines.reduce((s, l) => s + Math.abs(l.grossCents), 0);
  return assertBalanced({
    Line: [
      ...groupByAccountClass(lines).map((g) => line(g.cents, detail('Debit', { value: g.accountRef }, g.classRef))),
      line(cents, detail('Credit', o.clearing)),
    ],
    TxnDate: o.day,
    DocNumber: o.docNumber,
    PrivateNote: o.memo,
  });
};
```

Note: `registrationChargeEntry` must use the fee-account check message `"No Stripe fee account is mapped"` — the test asserts `/fee account/`.

**Step 4:** run → PASS. **Step 5:** commit "Journal entries for registration charges and refunds".

---

### Task 5: Migration + models

**Files:**
- Create: `src/db/migrations/20261008000001-payout-reports-and-registration-ledger.js`
- Create: `src/db/models/PayoutReportUpload.ts`, `src/db/models/PayoutTransaction.ts`
- Modify: `src/db/models/DailyJeSync.ts` (attributes + init for the six new columns)

**Step 1: Migration**

```js
'use strict';

/**
 * Registrations from Planning Center's payout report (see docs/plans/2026-10-08-registrations-import.md
 * in the frontend repo). One row per upload, one row per file row ever seen (unique per church, so
 * a re-upload never posts twice), and registration totals on the existing day ledger so the
 * Clearing statement counts them.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PayoutReportUploads', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE' },
      fileName: { type: Sequelize.STRING(512), allowNull: true },
      uploadedBy: { type: Sequelize.STRING(256), allowNull: true },
      rowCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      firstDay: { type: Sequelize.STRING(10), allowNull: true },
      lastDay: { type: Sequelize.STRING(10), allowNull: true },
      summary: { type: Sequelize.JSON, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });
    await queryInterface.createTable('PayoutTransactions', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE' },
      uploadId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'PayoutReportUploads', key: 'id' }, onDelete: 'SET NULL' },
      rowKey: { type: Sequelize.STRING(128), allowNull: false },
      line: { type: Sequelize.INTEGER, allowNull: true },
      day: { type: Sequelize.STRING(10), allowNull: false },
      type: { type: Sequelize.STRING(32), allowNull: false },
      source: { type: Sequelize.STRING(64), allowNull: false },
      name: { type: Sequelize.STRING(256), allowNull: true },
      fundOrSignup: { type: Sequelize.STRING(512), allowNull: true },
      grossCents: { type: Sequelize.BIGINT, allowNull: false },
      feeCents: { type: Sequelize.BIGINT, allowNull: false },
      netCents: { type: Sequelize.BIGINT, allowNull: false },
      paymentMethod: { type: Sequelize.STRING(32), allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.STRING(32), allowNull: false },
      reason: { type: Sequelize.STRING(64), allowNull: true },
      accountRef: { type: Sequelize.STRING(64), allowNull: true },
      classRef: { type: Sequelize.STRING(64), allowNull: true },
      qboEntryId: { type: Sequelize.STRING(64), allowNull: true },
      note: { type: Sequelize.TEXT, allowNull: true },
      resolvedBy: { type: Sequelize.STRING(256), allowNull: true },
      resolvedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });
    await queryInterface.addIndex('PayoutTransactions', ['userId', 'rowKey'], { unique: true, name: 'payout_transactions_user_row_key' });
    await queryInterface.addIndex('PayoutTransactions', ['userId', 'status'], { name: 'payout_transactions_user_status' });

    for (const col of ['registrationGrossCents', 'registrationFeeCents', 'registrationRefundGrossCents', 'registrationRefundFeeCents']) {
      await queryInterface.addColumn('DailyJeSync', col, { type: Sequelize.BIGINT, allowNull: false, defaultValue: 0 });
    }
    await queryInterface.addColumn('DailyJeSync', 'registrationEntryCount', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn('DailyJeSync', 'registrationEntryIds', { type: Sequelize.JSON, allowNull: true });
  },

  async down(queryInterface) {
    for (const col of ['registrationEntryIds', 'registrationEntryCount', 'registrationRefundFeeCents', 'registrationRefundGrossCents', 'registrationFeeCents', 'registrationGrossCents']) {
      await queryInterface.removeColumn('DailyJeSync', col);
    }
    await queryInterface.dropTable('PayoutTransactions');
    await queryInterface.dropTable('PayoutReportUploads');
  },
};
```

**Table names (verified in production 2026-10-08):** `"DailyJeSync"`, `"Users"`, `"UserSync"`,
`"UserSettings"` — every existing model sets `freezeTableName: true` with `modelName` = table name.
Do the same for the new models (`modelName: 'PayoutReportUploads'` / `'PayoutTransactions'`).

**Step 2: Models.** Copy the structure of `src/db/models/DailyJeSync.ts` (interface, class, `init`
with `sequelize`, `modelName`), set `modelName: 'PayoutReportUploads'` / `'PayoutTransactions'` and
`freezeTableName: true` (the house convention), and declare every column from the migration. BIGINT columns come back from
Postgres as **strings** — every reader must `Number()` them (see the QBO-traps memory).
Add to `DailyJeSync`'s interface, class and `init` the six columns with the same types/defaults.

**Step 3: Verify**

```bash
docker start csp-test-pg
npx sequelize-cli db:migrate --url postgres://admin:1234@127.0.0.1:55433/csp_test --migrations-path src/db/migrations
npx sequelize-cli db:migrate:undo --url postgres://admin:1234@127.0.0.1:55433/csp_test --migrations-path src/db/migrations
npx sequelize-cli db:migrate --url postgres://admin:1234@127.0.0.1:55433/csp_test --migrations-path src/db/migrations
npx tsc --noEmit && npx jest
```
Expected: up, down and up again succeed; all unit suites still pass.

**Step 4: Commit** — "Tables for payout reports, and registration totals on the day ledger".

---

### Task 6: Registrations in the clearing maths (netCentsOf + statement)

**Files:**
- Modify: `src/services/clearingSnapshot.ts:9-12` (`netCentsOf`)
- Modify: `src/controller/journalEntry.ts` (`getClearingStatement` line + totals objects)
- Test: `src/services/__tests__/clearingSnapshot.test.ts` (add a case), `src/controller/__tests__/clearingStatementTransition.test.ts` (add a case)

**Step 1: Failing tests**

```ts
// clearingSnapshot.test.ts
test('registration money on the day counts towards what CSP put into clearing', () => {
  expect(netCentsOf({
    postedGrossCents: '10000', postedFeeCents: '300', refundedGrossCents: '0', refundedFeeCents: '0',
    registrationGrossCents: '6000', registrationFeeCents: '159', registrationRefundGrossCents: '5500', registrationRefundFeeCents: '0',
  })).toBe(10000 - 300 + 6000 - 159 - 5500);
});
```

```ts
// clearingStatementTransition.test.ts — a registration-only day appears on the statement
test('a registration-only day is a statement line, and its entries are listed', async () => {
  const d = await statement({
    settings: { startDateAutomationFund: null },
    rows: [{ day: '2026-09-20', postedGrossCents: 0, postedFeeCents: 0, entryCount: 0, qboEntryIds: [], batchIds: [],
      registrationGrossCents: 6000, registrationFeeCents: 159, registrationRefundGrossCents: 0, registrationRefundFeeCents: 0,
      registrationEntryCount: 1, registrationEntryIds: ['30001'] }],
    qbo: 0,
  });
  expect(d.lines[0]).toMatchObject({ date: '2026-09-20', gross: 0, registrations: 60, registrationFees: 1.59, net: 58.41, qboEntryIds: ['30001'] });
  expect(d.totals).toMatchObject({ registrations: 60, registrationFees: 1.59, registrationRefunds: 0, net: 58.41 });
});
```

**Step 2:** run both → FAIL.

**Step 3: Implement**

```ts
// clearingSnapshot.ts
/** Net cents one ledger day added to clearing: giving and registrations, less fees, less refunds. */
export const netCentsOf = (r: any): number =>
  Number(r?.postedGrossCents ?? 0) -
  Number(r?.postedFeeCents ?? 0) -
  (Number(r?.refundedGrossCents ?? 0) - Number(r?.refundedFeeCents ?? 0)) +
  Number(r?.registrationGrossCents ?? 0) -
  Number(r?.registrationFeeCents ?? 0) -
  (Number(r?.registrationRefundGrossCents ?? 0) - Number(r?.registrationRefundFeeCents ?? 0));
```

In `getClearingStatement`, add to each line:
`registrations: toDollars(r.registrationGrossCents), registrationFees: toDollars(r.registrationFeeCents), registrationRefunds: toDollars(r.registrationRefundGrossCents)`,
and `qboEntryIds: [...(r.qboEntryIds ?? []), ...(r.registrationEntryIds ?? [])]`; add the same three
sums to `totals`. Leave `gross`/`fees`/`refundsGross` as giving-only so existing consumers are unchanged.

`captureClearingSnapshot` and the transition block use `netCentsOf` already — no change, which keeps
the snapshot and `postedSinceGoLive` on the same day set (see the clearing-transition memory).

**Step 4:** `npx jest src/services/__tests__/clearingSnapshot.test.ts src/controller/__tests__/clearingStatementTransition.test.ts src/controller/__tests__/dailyJournalEntriesDayTotals.test.ts` → PASS. Full `npx jest` → all suites pass.

**Step 5:** commit "Registrations count towards the clearing statement and switch-over".

---

### Task 7: Giving check

**Files:**
- Create: `src/services/payoutReport/givingCoverage.ts`
- Test: `src/services/payoutReport/__tests__/givingCoverage.test.ts`

**Step 1: Failing test (the pure part)**

```ts
import { givingCoverage } from '../givingCoverage';

const r = (id: string, day: string) => ({ externalId: `donation:${id}`, day } as any);
const days = new Map([
  ['2026-10-05', { pcoGrossCents: 10000, postedGrossCents: 10000, pcoIds: new Set(['1', '2']) }],
  ['2026-10-06', { pcoGrossCents: 5000, postedGrossCents: 2000, pcoIds: new Set(['3']) }],
  ['2026-10-07', { pcoGrossCents: 4000, postedGrossCents: 0, pcoIds: new Set(['4']) }],
]);

test.each([
  ['1', '2026-10-05', 'giving_covered', undefined],
  ['3', '2026-10-06', 'giving_not_posted', 'day_partly_posted'],
  ['4', '2026-10-07', 'giving_not_posted', 'day_not_posted'],
  ['9', '2026-10-05', 'giving_not_posted', 'not_in_planning_center'],
  ['5', '2026-09-01', 'giving_covered', 'before_giving_start'],
])('donation %s on %s → %s', (id, day, status, reason) => {
  expect(givingCoverage([r(id, day)], { givingStartDay: '2026-09-15', days })[0]).toMatchObject({ status, reason });
});

test('Planning Center unreachable: nothing is called covered', () => {
  expect(givingCoverage([r('1', '2026-10-05')], { givingStartDay: '2026-09-15', days: null })[0])
    .toMatchObject({ status: 'giving_not_posted', reason: 'planning_center_unreachable' });
});
```

**Step 2:** run → FAIL.

**Step 3: Implement** — the pure function plus the I/O loader that builds `days`:

```ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import UserSync from '../../db/models/UserSync';
import { Op } from 'sequelize';
import { generatePcToken } from '../../controller/automation';
import { fetchDonationsForRange } from '../donationSweep';
import { getOrgTimeZone } from '../dailyDonationSync';
import { filterStripeElectronic, groupDonationsByDay } from '../../utils/mapping';
import { PayoutRow } from './parsePayoutReport';

export interface DayCoverage { pcoGrossCents: number; postedGrossCents: number; pcoIds: Set<string> }
export interface CoverageResult { row: PayoutRow; status: 'giving_covered' | 'giving_not_posted'; reason?: string }

/**
 * Matt's rule, for the giving half of a payout: a giving line counts as recorded only when CSP has
 * posted its whole day. CSP keeps day totals, not gift ids, so "whole day posted" is the proof:
 * the gift is one of Planning Center's settled Stripe gifts that day, and the day's claim covers
 * at least that day's gross.
 */
export const givingCoverage = (
  rows: Pick<PayoutRow, 'externalId' | 'day'>[] & any[],
  ctx: { givingStartDay: string | null; days: Map<string, DayCoverage> | null },
): CoverageResult[] =>
  rows.map((row) => {
    if (ctx.givingStartDay && row.day < ctx.givingStartDay) return { row, status: 'giving_covered', reason: 'before_giving_start' };
    if (!ctx.days) return { row, status: 'giving_not_posted', reason: 'planning_center_unreachable' };
    const d = ctx.days.get(row.day);
    const id = String(row.externalId ?? '').replace(/^donation:/, '');
    if (!d || !d.pcoIds.has(id)) return { row, status: 'giving_not_posted', reason: 'not_in_planning_center' };
    if (d.postedGrossCents <= 0) return { row, status: 'giving_not_posted', reason: 'day_not_posted' };
    if (d.postedGrossCents < d.pcoGrossCents) return { row, status: 'giving_not_posted', reason: 'day_partly_posted' };
    return { row, status: 'giving_covered' };
  });

/** Planning Center + CSP's own claims for the given days. null when Planning Center can't be read. */
export const loadDayCoverage = async (email: string, userId: number, dayList: string[]): Promise<Map<string, DayCoverage> | null> => {
  if (!dayList.length) return new Map();
  const sorted = [...new Set(dayList)].sort();
  try {
    const token: any = await generatePcToken(email);
    if (!token?.access_token) return null;
    const config = { headers: { Authorization: `Bearer ${token.access_token}` } };
    const tz = await getOrgTimeZone(config);
    if (!tz) return null;
    const { donations } = await fetchDonationsForRange(config, sorted[0], sorted[sorted.length - 1]);
    const byDay = groupDonationsByDay(filterStripeElectronic(donations), tz);
    const claims = await UserSync.findAll({ where: { userId, donationId: { [Op.in]: sorted } } });
    const posted = new Map<string, number>();
    for (const c of claims as any[]) {
      const j = c.toJSON();
      if (j.status === 'posted') posted.set(String(j.donationId), Number(j.postedGrossCents ?? 0));
    }
    const out = new Map<string, DayCoverage>();
    for (const day of sorted) {
      const gifts = byDay[day] ?? [];
      out.set(day, {
        pcoGrossCents: gifts.reduce((s: number, g: any) => s + (Number(g?.attributes?.amount_cents) || 0), 0),
        postedGrossCents: posted.get(day) ?? 0,
        pcoIds: new Set(gifts.map((g: any) => String(g.id))),
      });
    }
    return out;
  } catch {
    return null;
  }
};
```

**Step 4:** run → PASS. **Step 5:** commit "Check giving lines in a payout against CSP's posted days".

---

### Task 8: The import service (preview, import, post)

**Files:**
- Create: `src/services/payoutReport/importPayoutReport.ts`
- Test: `src/services/payoutReport/__tests__/importPayoutReport.integration.test.ts` (real Postgres; PCO + QBO mocked)

**Behaviour (write the tests first, one `test` per bullet):**
1. Preview of a fresh file → counts and dollars per status, entries it *would* post (day, doc
   number preview, gross/fee/net), giving lines by status, held rows with reasons. **No rows written.**
2. Import → `PayoutReportUploads` row; one `PayoutTransactions` row per file row; one QBO call per
   (day, charge|refund); `DailyJeSync.registration*` updated; rows `posted` with `qboEntryId`.
3. Import the same file again → zero QBO calls; every registration row `already_recorded`.
4. An overlapping file (old rows + 2 new) → only the 2 new rows post.
5. Charges before the start date → `before_start`, no QBO call.
6. A QBO failure for one day → that day's rows `failed` (reason = error message), other days post; a
   later upload retries the failed rows (status `failed` is NOT in `knownKeys`).
7. Missing setup refuses the whole import with a clear message and writes nothing: no registration
   start date, no v2 mapping default, no fee account (when any row has a fee), no clearing account.
8. Two concurrent imports of the same file → the QBO mock is called once per day (row insertion via
   `findOrCreate` under the unique index decides who posts).
9. Giving rows stored as `giving_covered` / `giving_not_posted`; a later upload that finds the day
   now posted flips them to `giving_covered`.
10. A row left `pending` (simulate: insert one directly) is NOT re-posted by a later upload, and is
   listed by `listReview` as `posting_interrupted`.

Mock pattern (as `dailyDonationSync.integration.test.ts`):

```ts
jest.mock('../../../controller/automation', () => ({ generatePcToken: jest.fn(), automationJournalEntry: jest.fn(), getFundInDonation: jest.fn() }));
jest.mock('../givingCoverage', () => ({ ...jest.requireActual('../givingCoverage'), loadDayCoverage: jest.fn() }));
```

Each test seeds a `Users` row (id 90010), `UserSettings` with
`startDateAutomationRegistration: '10-01-2026'`, `startDateAutomationFund: '09-15-2026'`,
`settingBankData: [{ type: 'registration', value: '1150040022', label: 'Clearing Account' }]`,
`settingBankCharges: { account: { value: '5', label: 'Bank Charges' }, class: { value: 'gf', label: 'General Fund' } }`,
`settingRegistrationData: { version: 2, default: { account: { value: '77', label: '44000 Event Income' } }, events: [] }`,
and cleans `PayoutTransactions`, `PayoutReportUploads`, `DailyJeSync`, `UserSettings`, `Users` for that id in `beforeEach`.

**Implementation outline (complete it to pass the tests):**

```ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Op } from 'sequelize';
import sequelize from '../../db';
import Users from '../../db/models/user';
import UserSettings from '../../db/models/userSettings';
import DailyJeSync from '../../db/models/DailyJeSync';
import PayoutReportUpload from '../../db/models/PayoutReportUpload';
import PayoutTransaction from '../../db/models/PayoutTransaction';
import { automationJournalEntry } from '../../controller/automation';
import { parseSyncStartDay } from '../dailyDonationSync';
import { parsePayoutReport, PayoutRow } from './parsePayoutReport';
import { readRegistrationMapping } from './registrationMapping';
import { classifyRows, ClassifiedRow } from './classifyRows';
import { givingCoverage, loadDayCoverage } from './givingCoverage';
import { registrationChargeEntry, registrationRefundEntry, registrationDocNumber } from './registrationEntries';

export class PayoutImportSetupError extends Error {}

/**
 * Statuses that mean "never post this row again from an upload". `pending` is here on purpose: a
 * row left pending means the process died between QuickBooks accepting an entry and our database
 * recording it - QuickBooks may already have it, so retrying could post it twice. Those rows are
 * surfaced in the review list instead ("posting was interrupted - check QuickBooks"), and only
 * `failed` (QuickBooks said no) is retried automatically.
 */
const FINAL = ['posted', 'pending', 'before_start', 'giving_covered', 'resolved', 'dismissed', 'held'];

interface Setup {
  userId: number;
  registrationStartDay: string;
  givingStartDay: string | null;
  mapping: NonNullable<ReturnType<typeof readRegistrationMapping>>;
  clearing: { value: string; name?: string };
  fees: { value: string; name?: string; classRef?: string };
}

export const loadSetup = async (email: string): Promise<Setup> => {
  const user: any = await Users.findOne({ where: { email } });
  if (!user) throw new PayoutImportSetupError('No church found for this account.');
  const s: any = await UserSettings.findOne({ where: { userId: user.id } });
  const registrationStartDay = parseSyncStartDay(s?.startDateAutomationRegistration);
  if (!registrationStartDay) throw new PayoutImportSetupError('Set the registration start date on Mapping → Registration first.');
  const mapping = readRegistrationMapping(s?.settingRegistrationData);
  if (!mapping?.default.account) throw new PayoutImportSetupError('Choose the income account for event payments on Mapping → Registration first.');
  const bank = (s?.settingBankData as any[]) ?? [];
  const clearingSlot = bank.find((b) => b?.type === 'registration' && b?.value) ?? bank.find((b) => b?.type === 'donation' && b?.value);
  if (!clearingSlot) throw new PayoutImportSetupError('Choose the clearing account on Mapping → Bank first.');
  const charges = s?.settingBankCharges ?? {};
  return {
    userId: user.id,
    registrationStartDay,
    givingStartDay: parseSyncStartDay(s?.startDateAutomationFund),
    mapping,
    clearing: { value: String(clearingSlot.value), name: clearingSlot.label },
    fees: { value: String(charges?.account?.value ?? ''), name: charges?.account?.label, classRef: charges?.class?.value || undefined },
  };
};

// classify(): parse → knownKeys from PayoutTransactions WHERE status IN FINAL → classifyRows → giving coverage for 'giving' rows.
// previewPayoutReport({ email, csvText }): loadSetup + classify; returns summarize(classified, coverage). No writes.
// importPayoutReport({ email, fileName, csvText, uploadedBy }):
//   1. loadSetup + classify (setup errors throw before anything is written)
//   2. create PayoutReportUpload (rowCount, firstDay, lastDay)
//   3. for each to_post row: PayoutTransaction.findOrCreate({ where: { userId, rowKey }, defaults: { ...row, status: 'pending', accountRef, classRef, uploadId } });
//      keep it only if created, or if the existing row's status is 'failed' (then set status 'pending')
//   4. group kept rows by (day, kind = type === 'Refund' ? 'refund' : 'charge'); for each group:
//        DailyJeSync.findOrCreate({ where: { userId, day }, defaults: { userId, day, postedGrossCents: 0, postedFeeCents: 0, entryCount: 0 } });
//        sequelize.transaction(async (tx) => {
//          const ledger = await DailyJeSync.findOne({ where: { userId, day }, transaction: tx, lock: tx.LOCK.UPDATE });
//          const seq = Number(ledger.registrationEntryCount) + 1;
//          const opts = { day, docNumber: registrationDocNumber(day, seq, kind), memo: `Church Sync Pro - PCO Registrations${kind === 'refund' ? ' Refund' : ''} - ${day} | upload:${uploadId}`, clearing, fees };
//          const lines = group.map((r) => ({ accountRef: r.accountRef, classRef: r.classRef || undefined, grossCents: r.grossCents, feeCents: r.feeCents }));
//          const je = kind === 'refund' ? registrationRefundEntry(lines, opts) : registrationChargeEntry(lines, opts);
//          const created: any = await automationJournalEntry(email, je);
//          await ledger.update({ registrationGrossCents | registrationRefundGrossCents (+= |gross|), registrationFeeCents | registrationRefundFeeCents (+= fee), registrationEntryCount: seq, registrationEntryIds: [...(ledger.registrationEntryIds ?? []), String(created?.Id ?? '')].filter(Boolean) }, { transaction: tx });
//          await PayoutTransaction.update({ status: 'posted', qboEntryId: created?.Id ?? null, reason: null }, { where: { id: group.map((r) => r.id) }, transaction: tx });
//        }) — catch per group: PayoutTransaction.update({ status: 'failed', reason: message.slice(0, 64) })
//   5. upsert the other rows: before_start / held (with reason) / giving_covered|giving_not_posted (with reason) via findOrCreate;
//      an existing giving_not_posted row is updated to its new coverage result
//   6. save summary JSON on the upload row and return it
```

The summary shape (shared by preview and import, dollars):

```ts
{
  file: { rows, firstDay, lastDay },
  registrations: { toPost: { count, gross, fees, net }, alreadyRecorded: number, beforeStart: { count, net } }, // signed: refunds negative
  entries: [{ day, kind, docNumber, count, gross, fees, net, qboEntryId? , error? }],
  giving: { covered: number, notPosted: [{ day, count, net, reason }] },
  held: [{ line, day, type, source, fundOrSignup, net, reason }],
}
```

**Run:** `npm run test:integration -- importPayoutReport` → all 9 pass; then `npx jest` and
`npx tsc --noEmit`. **Commit:** "Import a payout report: record registrations once, check giving, hold the rest".

---

### Task 9: Review list actions

**Files:**
- Create: `src/services/payoutReport/reviewPayoutRows.ts`
- Test: add to `importPayoutReport.integration.test.ts`

Tests first:
1. `resolveHeldRow({ action: 'post', account, class })` on a held row whose amounts add up → posts a
   single-row charge (gross > 0) or refund (gross < 0) entry with `registrationDocNumber`, updates the
   ledger exactly like Task 8, sets `status: 'resolved', qboEntryId, resolvedBy, resolvedAt, accountRef, classRef`.
2. `action: 'post'` on an `amounts_do_not_add_up` or `refund_with_fee` row → refused (`dismiss` only).
3. `action: 'dismiss'` without a note → refused; with a note → `status: 'dismissed'`.
4. Acting on a row that is not `held` → refused (no double posting through the review list).
5. `recheckGiving(email)` re-runs `givingCoverage` for stored `giving_not_posted` rows and updates them.
6. `listReview(email)` returns `held` + `giving_not_posted` + `pending` (as `posting_interrupted`)
   rows, newest first, with counts. A `posting_interrupted` row offers **Mark posted** (with the QBO
   entry number the bookkeeper found) or **Post now** (only after they confirm QuickBooks has none).

Implement to pass, reusing Task 8's per-group posting function (export it as `postRegistrationGroup`
rather than duplicating it). **Commit:** "Review list: code or dismiss held payout rows; re-check giving".

---

### Task 10: Controllers + routes

**Files:**
- Create: `src/controller/payoutReport.ts`
- Modify: `src/constant/routes.ts` (userRoutes), `src/routes/routers.ts`
- Test: `src/controller/__tests__/payoutReport.test.ts` (services mocked)

Routes (add to `userRoutes`):

```ts
payoutReportPreview: '/user/payoutReport/preview',
payoutReportImport: '/user/payoutReport/import',
payoutReportStatus: '/user/payoutReport/status',
payoutReportReview: '/user/payoutReport/review',
payoutReportResolve: '/user/payoutReport/resolve',
payoutReportRecheckGiving: '/user/payoutReport/recheckGiving',
payoutReportSignups: '/user/payoutReport/signups',
```

Register each with `verifySession()` exactly like `getClearingStatement`. Controller rules (test each):
- `csvText` missing or > 5 MB → 400; `PayoutReportFormatError` → 400 with its message;
  `PayoutImportSetupError` → 409 with its message; anything else → 500 `"Could not read the payout report"`
  (log the error; never echo stack traces).
- `uploadedBy` = the session user's email (`req.session.getUserId()` → Users lookup), not the body.
- `status` returns `{ lastUpload: { fileName, uploadedAt, firstDay, lastDay, uploadedBy } | null, needsReview: n, givingNotPosted: n, registrationStartDay, ready: boolean, notReadyReason }`.
- `signups` returns distinct `fundOrSignup` where `source = 'Registrations'`, sorted.

**Commit:** "Payout report endpoints".

---

## 4. Frontend tasks

### Task 11: API client

**Files:** `src/common/constant/routes-api.ts` (same seven paths under `userRoutes`),
`src/common/api/user.ts` (types + functions).

```ts
export interface PayoutSummary {
  file: { rows: number; firstDay: string | null; lastDay: string | null }
  registrations: { toPost: { count: number; gross: number; fees: number; net: number }; alreadyRecorded: number; beforeStart: { count: number; net: number } }
  entries: { day: string; kind: 'charge' | 'refund'; docNumber: string; count: number; gross: number; fees: number; net: number; qboEntryId?: string; error?: string }[]
  giving: { covered: number; notPosted: { day: string; count: number; net: number; reason: string }[] }
  held: { line: number; day: string; type: string; source: string; fundOrSignup: string; net: number; reason: string }[]
}

const previewPayoutReport = async (email: string, fileName: string, csvText: string): Promise<PayoutSummary> => {
  const res = await apiCall.post(userRoutes.payoutReportPreview, JSON.stringify({ email, fileName, csvText }))
  return res.data.data
}
// importPayoutReport, getPayoutReportStatus, getPayoutReview, resolvePayoutRow, recheckPayoutGiving,
// getPayoutSignups — same pattern. Errors THROW (do not return [] on failure: callers report outcomes).
```

Encode the email in query strings (`encodeURIComponent`). **Verify:** `npx tsc --noEmit`. **Commit.**

### Task 12: Upload card + modal on the Clearing page

**Files:**
- Create: `src/pages/Main/daily/PayoutReports.tsx`, `src/pages/Main/daily/PayoutReportUploadModal.tsx`
- Modify: `src/pages/Main/daily/DailyJournalEntries.tsx` (render `<PayoutReports />` between the balance card and `<ClearingStatement />`)

Behaviour:
- Card: "Payout reports" — *Last loaded {date} · {fileName} · charges {firstDay}–{lastDay}* or
  *No payout report loaded yet*; amber line *{n} items need review* (scrolls to the list);
  primary button **Upload payout report** (disabled with the `notReadyReason` from `/status` when setup is missing, linking to Mapping).
- Modal step 1: `<input type="file" accept=".csv,text/csv">`; read with `file.text()`; call preview.
  Format/setup errors show inline (the server message), not a toast.
- Step 2 (preview): plain sentences, not a data dump:
  *"Records {n} registration payments: ${gross} to income, ${fees} fees, ${net} to Clearing, in {k} entries."*;
  *"{m} already recorded (skipped)"*; *"{b} charged before your start date of {date} (left alone)"*;
  giving: *"{c} giving lines are already in QuickBooks"* and, if any, a warning list of days not yet
  posted with a link to Daily Giving; held: *"{h} lines need a look — they will wait in the review list"*.
  Buttons: **Record {n} payments** (primary) / Cancel. If nothing to post and nothing held, the primary
  button reads **Save upload** (still records the giving check + "last loaded").
- Step 3 (result): the entries posted (doc number + QBO id), failures in red with "will retry on next upload".
- On success invalidate `getClearingStatement`, `getDailyJournalEntries`, `payoutReportStatus`, `payoutReview`.
- Dollars formatted with the page's local dollar `formatUsd` (NOT `@/common/utils/helper`'s, which divides by 100).

**Verify:** tsc, eslint, build; then the real page (see Task 16). **Commit.**

### Task 13: Review list

**Files:** Create `src/pages/Main/daily/PayoutReview.tsx`; render it under `PayoutReports`.

- Two groups: **Needs coding** (`held`) — date, description, amount, reason in words
  (`unrecognised_type` → "Planning Center listed a type CSP doesn't know", `no_account_mapped` →
  "No income account set for this event", …); actions **Code it** (account + optional class
  dropdowns from `getQboData`, then post) and **Handled outside CSP** (note required).
  **Giving not in QuickBooks yet** (`giving_not_posted`) — day, amount, reason, link to Daily Giving,
  and a **Check again** button (`recheckGiving`).
- Hidden entirely when both groups are empty.

**Commit.**

### Task 14: Mapping → Registration tab

**Files:**
- Create: `src/pages/Main/automation/mapping/component/RegistrationMapping.tsx`
- Modify: `src/pages/Main/automation/mapping/index.tsx` — in the Registration `Tab.Panel`, replace the
  Stripe-events branch (the `stripeEvents && stripeEvents.length > 0 ? … : "No event/registration payments found…"`
  block, ~lines 562–628) with `<RegistrationMapping userData={userData} />`; change the tab subtitle
  `'Event / registration payments from Stripe'` to `'Event and registration payments (from your payout report)'`.

Component:
- **Record registrations charged on or after** `<input type="date">` → `setStartDataAutomation({ type: 'registration', date: MM-DD-YYYY })`
  (React date inputs ignore programmatic `fill`; set via the input's native value setter when testing).
- **Default income account** + **class** (react-select, options from `getQboData(user, bookkeeper)`:
  `accounts.filter(a => a.type !== 'Bank' && a.type !== 'Credit Card')`, `classes`).
- **Per-event overrides**: rows of *event name* (select from `/signups` or type a new one) + account + class + remove; "Add event".
- **Save** → `updateRegisterSettings({ email, data: { version: 2, default, events } })` (widen the
  `data` type to accept the v2 object), success toast, invalidate `getUserRelated`.
- Show which fee account is used ("Stripe fees go to {settingBankCharges.account.label} — change on the Fees tab").

**Commit.**

### Task 15: Statement shows registrations

**Files:** `src/common/api/user.ts` (`ClearingStatementLine` + totals: `registrations`, `registrationFees`, `registrationRefunds`),
`src/pages/Main/daily/ClearingStatement.tsx`.

Add a **Registrations** column after Giving; Stripe fees column shows `fees + registrationFees`;
Refunds shows `refundsGross + registrationRefunds`; footer totals likewise. The QuickBooks-entries
column already receives the `CSP-E` ids from the backend (Task 6). **Commit.**

---

## 5. Docs, staging, release

### Task 16: Docs + memory

- Frontend `CLAUDE.md`: a "Registrations (payout report upload)" section — what it does, statuses,
  the start-date rule, that the file has no payout ids, never commit real files.
- Backend `CLAUDE.md`: the new tables, the `DailyJeSync.registration*` columns and why they are
  separate from `entryCount`, `CSP-E`/`CSP-ER` doc numbers, `netCentsOf` now including registrations.

### Task 17: Staging (the "test site" Matt will use)

1. Merge `feat/registrations-import` into `develop` in both repos (plain merge, keep the branch).
2. Backend: `NODE_ENV=staging npx sequelize-cli db:migrate` (from the develop checkout), then `make deploy-stg-be`;
   frontend `make deploy-stg`. Confirm the bundle contains "Upload payout report".
3. Staging posts to the QuickBooks **sandbox** (`QBO_USE_SANDBOX=true` on `csp-be`, verified 2026-10-08).
   In the sandbox company create/choose: an Event Income account, a fee account, a clearing account.
4. A staging test church for CFP: giving start date `10-01-2026` (so September's giving lines read
   "before your start date" — no Planning Center connection needed for the test), registration start
   date **`08-01-2026`** for the September run (three registration rows are dated Aug 30–31; with
   `09-01-2026` the run covers only 35 rows / $1,950.00), default account = sandbox Event Income.
5. Dry-run Matt's September file there yourself first. Acceptance (from the verified numbers):
   registrations to post **37 charges + 2 refunds = $2,170.00 gross, $61.10 fees, $2,108.90 net**
   (summary amounts are signed: refunds count negative), in **23 entries across 21 days**;
   348 giving lines "before your start date"; 0 held. Upload it again → 0 posted, 39 already recorded.
6. Logins for Matt's team on staging: create them directly (staging has email verification REQUIRED
   and invite mail lands in Microsoft junk — see the SendGrid memory). Send Matt the link.

### Task 18: Production

Preconditions: Matt has run September on staging and is happy; the branch is reviewed.
1. Merge `feat/registrations-import` into `main` (fast-forward if possible) and push; merge `main` into `develop`.
2. From `/Volumes/T7/OtherProject/quickplan-connect-prod`: `git pull --ff-only`, then
   `make migrate-prd` (guarded: must be clean `main`), then `make deploy-prd`. Frontend from
   `church-sync-pro-prod`: `git pull --ff-only && make deploy-prd`.
3. Verify live: `/csp/user/payoutReport/status` returns 401 without a session (route registered);
   frontend bundle contains "Upload payout report".
4. Configure Active Church (with Matt): registration start date `10-01-2026`; default account
   44000 Event Income (id `77`), class as Matt says; fee account = whatever their Mapping holds after
   their fee adjustment; clearing slot `registration` = Clearing Account (`1150040022`, already set).
5. First real upload: the October payout report so far. Expect the late-September charges
   (≈$321.10 net, in the Oct 1–2 deposits) to show as **before your start date** — they get the
   manual Sept 30 entry. Check the Clearing statement and the switch-over panel afterwards.
6. Update memory: what shipped, revisions, and anything Matt changes.
