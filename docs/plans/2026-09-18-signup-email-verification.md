# Sign-up Email Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A self-served sign-up sends a confirmation email and the account cannot enter the app until the link is clicked; nothing that works today (login, invites, the bookkeeper's Clients page) breaks.

**Architecture:** SuperTokens' `EmailVerification` recipe in `REQUIRED` mode on the backend (so `verifySession()` itself rejects unverified sessions), delivered through SendGrid like the other transactional mail. Frontend gets two small pages — "check your inbox" and the link target — and the sign-up / login / invite flows are re-ordered so `PERSONAL_TOKEN` (the thing the route guards key off) is only ever written after the email is verified. Client creation from the Clients page moves to a backend endpoint because the browser-side sign-up it uses today replaces the bookkeeper's own session with the new client's.

**Tech Stack:** supertokens-node 13.6.1 (backend), supertokens-web-js 0.5.0 (frontend), SuperTokens core 4.4 (docker), @sendgrid/mail 7, jest + ts-jest (backend), react-router-dom 6.30.

**Spec:** the bug report sent to Church Finance Pros on 2026-09-18 (Teams): "When a client creates an account it doesn't send the confirmation email, and it drops them straight into the dashboard instead ... anyone can sign up with any email address and there's nothing verifying it's really theirs."

## Global Constraints

- **Local only.** Test on `localhost:3000` / `localhost:8080` / SuperTokens core `localhost:3567` (`docker compose up -d` in the backend). Do **not** run `make deploy-*` and do not run anything against the staging or production databases. (User: "no need to push it to prod for now we can test it locally first".)
- Frontend prettier: no semicolons, single quotes, trailing commas. Backend uses semicolons.
- Frontend must run on port 3000 (backend CORS).
- Before this ships to any environment, `scripts/verifyExistingUsers.ts` (Task 5) must be run against that environment's core, otherwise every existing account — including Matt's — is locked out by `REQUIRED` mode.
- Backend tests: read the **`Test Suites:`** line, not just `Tests:`. A suite that fails to load shows 0 tests and the run still looks green.
- Google sign-in users are verified by SuperTokens automatically (the provider asserts the email); those flows (`GoogleCallBack.tsx`, `signUp-google`) are untouched.

## What is verified about the current behaviour

- `church-sync-pro/src/pages/Auth/signUp/index.tsx:103` — `// sendEmail()` commented out; `:119` writes `PERSONAL_TOKEN`; `:121` reloads; `:141-145` then redirects to `/daily`.
- `quickplan-connect/src/app.ts:11` imports `EmailVerification` but `recipeList` (`:49-145`) never registers it. `src/app.ts:66-91` creates the `Users` row inside the sign-up override with `isActive: true`.
- `church-sync-pro/src/common/utils/supertoken.ts:36-57` — `sendEmail()` already wraps `sendVerificationEmail()` and is unused.
- `church-sync-pro/src/pages/Main/client/components/modal.tsx:75-84` — Clients page calls `emailPasswordSignUp` with `password: 'csp@2024'` and a synthetic email `${church-slug}-${bookkeeperEmail}`; SuperTokens' sign-up API creates a session for the *new* user in the bookkeeper's browser.
- `quickplan-connect/src/controller/user.ts:495-520` — `updateInvitationStatus` trusts `bookkeeperId` from the body.
- `node_modules/supertokens-node/lib/build/recipe/emailverification/api/implementation.js:51` — `isEmailVerifiedGET` calls `session.fetchAndSetClaim(...)`, so a frontend `isEmailVerified()` call refreshes a stale claim (needed in Task 9).
- `emailVerificationClaim.js:70` — `isVerified(refetchTimeOnFalseInSeconds = 10, maxAgeInSeconds = 300)`: a session created *before* verification keeps `false` for up to 10 s unless something refetches it.

---

### Task 1: SendGrid delivery for the verification email (backend)

**Files:**
- Create: `quickplan-connect/src/services/verificationEmail.ts`
- Test: `quickplan-connect/src/services/__tests__/verificationEmail.test.ts`

**Interfaces:**
- Produces: `buildVerificationMessage({ to, link }): SendGridMessage` and `sendVerificationEmail({ to, link }): Promise<void>` — consumed by Task 2.

- [x] **Step 1: Write the failing test**

```ts
// quickplan-connect/src/services/__tests__/verificationEmail.test.ts
/**
 * The verification email is the only thing standing between "anyone can sign up as any
 * address" and a real account, so what goes on the wire is pinned here: the recipient,
 * the sender the domain is authenticated for, the link itself, and click tracking OFF
 * (SendGrid's tracking domain for churchsyncpro.com no longer resolves - see CLAUDE.md).
 */
jest.mock('@sendgrid/mail', () => ({ setApiKey: jest.fn(), send: jest.fn().mockResolvedValue([{}]) }));

import sgMail from '@sendgrid/mail';
import { buildVerificationMessage, sendVerificationEmail } from '../verificationEmail';

const mockedSend = (sgMail as any).send as jest.Mock;
const mockedSetKey = (sgMail as any).setApiKey as jest.Mock;

const link = 'http://localhost:3000/auth/verify-email?token=abc&rid=emailverification';

describe('buildVerificationMessage', () => {
  it('addresses the message and carries the link in both html and text bodies', () => {
    const msg = buildVerificationMessage({ to: 'pastor@church.org', link });
    expect(msg.to).toBe('pastor@church.org');
    expect(msg.from).toBe('support@churchsyncpro.com');
    expect(msg.subject).toMatch(/confirm your email/i);
    expect(msg.html).toContain(link);
    expect(msg.text).toContain(link);
  });

  it('disables click tracking so the link is not rewritten to the dead tracking domain', () => {
    const msg = buildVerificationMessage({ to: 'a@b.c', link });
    expect(msg.trackingSettings).toEqual({ clickTracking: { enable: false, enableText: false } });
  });
});

describe('sendVerificationEmail', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sets the API key and sends exactly one message', async () => {
    await sendVerificationEmail({ to: 'a@b.c', link });
    expect(mockedSetKey).toHaveBeenCalledTimes(1);
    expect(mockedSend).toHaveBeenCalledTimes(1);
    expect(mockedSend.mock.calls[0][0].to).toBe('a@b.c');
  });

  it('propagates a SendGrid failure instead of swallowing it', async () => {
    mockedSend.mockRejectedValueOnce(new Error('sendgrid down'));
    await expect(sendVerificationEmail({ to: 'a@b.c', link })).rejects.toThrow('sendgrid down');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd /Volumes/T7/OtherProject/quickplan-connect && npx jest src/services/__tests__/verificationEmail.test.ts`
Expected: FAIL — `Cannot find module '../verificationEmail'`.

- [x] **Step 3: Write minimal implementation**

```ts
// quickplan-connect/src/services/verificationEmail.ts
/* eslint-disable @typescript-eslint/no-var-requires */
const sgMail = require('@sendgrid/mail');

const { SENDGRID_API_KEY, NODE_ENV } = process.env;

// The domain's SendGrid click-tracking CNAME is gone (see CLAUDE.md / sendgrid-dns-broken),
// so every link must go out untouched. Same setting the invitation and reset mails use.
const NO_CLICK_TRACKING = { trackingSettings: { clickTracking: { enable: false, enableText: false } } };

export const buildVerificationMessage = ({ to, link }: { to: string; link: string }) => ({
  to,
  from: 'support@churchsyncpro.com',
  subject: 'Confirm your email for Church Sync Pro',
  text: `Thanks for signing up for Church Sync Pro.\n\nConfirm your email address by opening this link:\n${link}\n\nIf you did not create an account, you can ignore this email.`,
  html: `
    <p>Thanks for signing up for Church Sync Pro.</p>
    <p>Confirm your email address by clicking the button below.</p>
    <p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#1f2937;color:#fff;text-decoration:none;border-radius:6px">Confirm my email</a></p>
    <p>Or copy this link into your browser:<br/><a href="${link}">${link}</a></p>
    <p>If you did not create an account, you can ignore this email.</p>
  `,
  ...NO_CLICK_TRACKING,
});

export const sendVerificationEmail = async ({ to, link }: { to: string; link: string }) => {
  sgMail.setApiKey(SENDGRID_API_KEY);
  if (NODE_ENV === 'development') {
    // Local mail is unsigned (DKIM CNAMEs missing) and often lands in spam; the link in the
    // server log is the reliable way to finish a local sign-up.
    console.log(`[email-verification] ${to} -> ${link}`);
  }
  await sgMail.send(buildVerificationMessage({ to, link }));
};
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx jest src/services/__tests__/verificationEmail.test.ts`
Expected: PASS, 4 tests, `Test Suites: 1 passed`.

- [x] **Step 5: Commit**

```bash
cd /Volumes/T7/OtherProject/quickplan-connect
git add src/services/verificationEmail.ts src/services/__tests__/verificationEmail.test.ts
git commit -m "Send the email-verification mail through SendGrid like the other transactional mail"
```

---

### Task 2: Register EmailVerification (REQUIRED) — extract the SuperTokens config (backend)

**Files:**
- Create: `quickplan-connect/src/supertokensConfig.ts`
- Modify: `quickplan-connect/src/app.ts:7-146`
- Test: `quickplan-connect/src/__tests__/supertokensConfig.test.ts`

**Interfaces:**
- Consumes: `sendVerificationEmail` (Task 1).
- Produces: `buildSupertokensConfig(): TypeInput` (the object passed to `supertokens.init`) and `emailVerificationConfig` — reused by the script in Task 5.

- [x] **Step 1: Confirm the delivery-input field names in the installed SDK**

Run: `grep -n "emailVerifyLink\|EMAIL_VERIFICATION" node_modules/supertokens-node/lib/build/recipe/emailverification/types.d.ts`
Expected: a type with `type: "EMAIL_VERIFICATION"`, `user: { id: string; email: string }`, `emailVerifyLink: string`. If the field is named differently, use that name in Steps 2–4.

- [x] **Step 2: Write the failing test**

```ts
// quickplan-connect/src/__tests__/supertokensConfig.test.ts
/**
 * REQUIRED mode is what makes verifySession() itself refuse an unverified account; if a
 * refactor ever drops the recipe or flips it to OPTIONAL, the sign-up bug comes straight
 * back with no test failing anywhere else. The delivery override is pinned to our
 * SendGrid sender so the SuperTokens demo mailer is never used.
 */
jest.mock('supertokens-node/recipe/emailverification', () => ({
  __esModule: true,
  default: { init: jest.fn((cfg) => ({ recipe: 'emailverification', cfg })) },
}));
jest.mock('supertokens-node/recipe/thirdpartyemailpassword', () => ({
  init: jest.fn(() => ({ recipe: 'tpep' })),
  Google: jest.fn(() => ({})),
}));
jest.mock('supertokens-node/recipe/emailpassword', () => ({ __esModule: true, default: { init: jest.fn(() => ({ recipe: 'ep' })) } }));
jest.mock('supertokens-node/recipe/session', () => ({ init: jest.fn(() => ({ recipe: 'session' })) }));
jest.mock('../db/models/user', () => ({ __esModule: true, default: {} }));
jest.mock('../services/verificationEmail', () => ({ sendVerificationEmail: jest.fn() }));

import EmailVerification from 'supertokens-node/recipe/emailverification';
import { sendVerificationEmail } from '../services/verificationEmail';
import { buildSupertokensConfig, emailVerificationConfig } from '../supertokensConfig';

const mockedInit = (EmailVerification as any).init as jest.Mock;
const mockedSend = sendVerificationEmail as unknown as jest.Mock;

describe('buildSupertokensConfig', () => {
  it('registers EmailVerification in REQUIRED mode alongside the auth and session recipes', () => {
    const cfg = buildSupertokensConfig();
    const recipes = cfg.recipeList.map((r: any) => r.recipe);
    expect(recipes).toEqual(['tpep', 'ep', 'emailverification', 'session']);
    expect(mockedInit).toHaveBeenCalledWith(expect.objectContaining({ mode: 'REQUIRED' }));
  });
});

describe('emailVerificationConfig.emailDelivery', () => {
  const original = { sendEmail: jest.fn() };
  const delivery = emailVerificationConfig.emailDelivery!.override!(original as any, {} as any);

  beforeEach(() => jest.clearAllMocks());

  it('sends verification mail through SendGrid with the SDK-built link', async () => {
    await delivery.sendEmail({
      type: 'EMAIL_VERIFICATION',
      user: { id: 'st-1', email: 'pastor@church.org' },
      emailVerifyLink: 'http://localhost:3000/auth/verify-email?token=t&rid=emailverification',
      userContext: {},
    } as any);
    expect(mockedSend).toHaveBeenCalledWith({
      to: 'pastor@church.org',
      link: 'http://localhost:3000/auth/verify-email?token=t&rid=emailverification',
    });
    expect(original.sendEmail).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 3: Run test to verify it fails**

Run: `npx jest src/__tests__/supertokensConfig.test.ts`
Expected: FAIL — `Cannot find module '../supertokensConfig'`.

- [x] **Step 4: Create the config module** (this is `app.ts:33-146` moved verbatim, plus the new recipe)

```ts
// quickplan-connect/src/supertokensConfig.ts
/* eslint-disable @typescript-eslint/no-var-requires */
const ThirdPartyEmailPassword = require('supertokens-node/recipe/thirdpartyemailpassword');
const Session = require('supertokens-node/recipe/session');
import EmailPassword from 'supertokens-node/recipe/emailpassword';
import EmailVerification from 'supertokens-node/recipe/emailverification';
import type { TypeInput as EmailVerificationInput } from 'supertokens-node/recipe/emailverification/types';

import User from './db/models/user';
import { formFields } from './constant/forms';
import { sendVerificationEmail } from './services/verificationEmail';

const apiPort = process.env.API_PORT || 8080;
export const apiDomain = process.env.API_URL || `http://localhost:${apiPort}`;
const websitePort = process.env.WEBSITE_PORT || 3000;
export const websiteDomain = process.env.WEBSITE_URL || `http://localhost:${websitePort}`;
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, API_KEYS } = process.env;

interface ResultObject {
  [key: string]: string;
}

// REQUIRED means verifySession() refuses a session whose email is not verified, so the
// backend enforces this, not just the sign-up page. Existing accounts must be marked
// verified before this reaches an environment: scripts/verifyExistingUsers.ts.
export const emailVerificationConfig: EmailVerificationInput = {
  mode: 'REQUIRED',
  emailDelivery: {
    override: (originalImplementation) => ({
      ...originalImplementation,
      sendEmail: async (input) => {
        await sendVerificationEmail({ to: input.user.email, link: input.emailVerifyLink });
      },
    }),
  },
};

export const buildSupertokensConfig = () => ({
  framework: 'express' as const,
  supertokens: {
    connectionURI: apiDomain,
    apiKey: API_KEYS,
  },
  appInfo: {
    appName: 'Church Sync Pro',
    apiDomain,
    websiteDomain,
    apiBasePath: '/auth',
    websiteBasePath: '/auth',
  },
  recipeList: [
    ThirdPartyEmailPassword.init({
      // ... (move lines 51-106 of app.ts here unchanged: signUpFeature, providers, override)
    }),
    EmailPassword.init({
      // ... (move lines 109-142 of app.ts here unchanged)
    }),
    EmailVerification.init(emailVerificationConfig),
    Session.init(),
  ],
});
```

The two `// ...` comments above mean: cut those exact lines out of `app.ts` and paste them; do not retype them. The `ResultObject` interface moves with them.

- [x] **Step 5: Point `app.ts` at it**

Replace `app.ts:7-146` (the requires of `Session`/`ThirdPartyEmailPassword`, the `EmailPassword`/`EmailVerification`/`User`/`formFields` imports, the domain constants, `ResultObject`, the boot log and the whole `supertokens.init({...})` call) with:

```ts
const supertokens = require('supertokens-node');
import { buildSupertokensConfig, apiDomain, websiteDomain } from './supertokensConfig';

// Boot diagnostics only. The SuperTokens apiKey must never be logged - Cloud Run
// log entries are readable by anyone with project viewer access.
console.log('supertokens config', { apiDomain, websiteDomain, apiKeyConfigured: Boolean(process.env.API_KEYS) });

supertokens.init(buildSupertokensConfig());
```

Keep the `getallUsers` import if anything below still references it (it is only in a commented cron today — remove the import if eslint flags it as unused).

- [x] **Step 6: Run the test and the whole suite**

Run: `npx jest src/__tests__/supertokensConfig.test.ts && npx tsc --noEmit && npx jest 2>&1 | grep -E "^(Tests|Test Suites):"`
Expected: new suite PASS (2 tests); tsc clean; `Test Suites: 26 passed` (24 existing + Task 1 + this).

- [x] **Step 7: Boot the backend locally and confirm the recipe is live**

Run: `docker compose up -d && WEBSITE_URL=http://localhost:3000 npm run dev` (in a second terminal), then
`curl -s -X POST http://localhost:8080/auth/user/email/verify/token -H 'rid: emailverification' -o /dev/null -w '%{http_code}\n'`
Expected: `401` (the endpoint exists and wants a session). Before this task it returned `404`.

- [x] **Step 8: Commit**

```bash
git add src/supertokensConfig.ts src/app.ts src/__tests__/supertokensConfig.test.ts
git commit -m "Require email verification: register the EmailVerification recipe and move the SuperTokens config out of app.ts"
```

---

### Task 3: Accepting an invitation proves the address — mark the invitee verified (backend)

**Files:**
- Create: `quickplan-connect/src/services/emailVerification.ts`
- Modify: `quickplan-connect/src/controller/user.ts:495-520` (`updateInvitationStatus`)
- Test: `quickplan-connect/src/controller/__tests__/updateInvitationStatus.test.ts`

**Interfaces:**
- Produces: `markEmailVerified(email: string): Promise<number>` (number of SuperTokens users marked) — reused by Task 5.
- Changes: `updateInvitationStatus` no longer reads `bookkeeperId` from the body; it derives the `Users.id` from the invited email.

- [x] **Step 1: Confirm the SDK function names**

Run: `grep -n "static getUsersByEmail\|static createEmailVerificationToken\|static verifyEmailUsingToken" node_modules/supertokens-node/lib/build/recipe/thirdpartyemailpassword/index.d.ts node_modules/supertokens-node/lib/build/recipe/emailverification/index.d.ts`
Expected: all three present. (`createEmailVerificationToken(userId, email?)`, `verifyEmailUsingToken(token)` were confirmed at `emailverification/index.d.ts:9-25`.)

- [x] **Step 2: Write the failing tests**

```ts
// quickplan-connect/src/controller/__tests__/updateInvitationStatus.test.ts
/**
 * The invitation token was mailed to this address, so accepting it is proof the inbox is
 * theirs - the same proof a verification link gives. Without this, an invited bookkeeper
 * would sign up and be stopped at "check your inbox" for a mail that was never sent.
 * The user id is derived from the email rather than trusted from the body.
 */
function mockModel() {
  return { __esModule: true, default: { findOne: jest.fn(), update: jest.fn() } };
}
jest.mock('../../db/models/user', mockModel);
jest.mock('../../db/models/bookkeeper', mockModel);
jest.mock('../../db/models/userSettings', mockModel);
jest.mock('../../services/emailVerification', () => ({ markEmailVerified: jest.fn() }));

import Users from '../../db/models/user';
import bookkeeper from '../../db/models/bookkeeper';
import { markEmailVerified } from '../../services/emailVerification';
import { updateInvitationStatus } from '../user';

const mockedUsers = Users as unknown as { findOne: jest.Mock };
const mockedBk = bookkeeper as unknown as { findOne: jest.Mock; update: jest.Mock };
const mockedMark = markEmailVerified as unknown as jest.Mock;

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

it('refuses without an invitation token', async () => {
  const res = makeRes();
  await updateInvitationStatus({ body: { email: 'bk@cfp.com' } } as any, res);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(mockedMark).not.toHaveBeenCalled();
});

it('refuses a token that does not match the invited email', async () => {
  mockedBk.findOne.mockResolvedValue(null);
  const res = makeRes();
  await updateInvitationStatus({ body: { email: 'bk@cfp.com', invitationToken: 'nope' } } as any, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(mockedMark).not.toHaveBeenCalled();
  expect(mockedBk.update).not.toHaveBeenCalled();
});

it('marks the invitee verified and links the row to the user found by email, ignoring a body id', async () => {
  mockedBk.findOne.mockResolvedValue({ id: 7, email: 'bk@cfp.com' });
  mockedUsers.findOne.mockResolvedValue({ id: 42 });
  mockedBk.update.mockResolvedValue([1]);
  const res = makeRes();
  await updateInvitationStatus(
    { body: { email: 'bk@cfp.com', invitationToken: 'tok', bookkeeperId: 999 } } as any,
    res,
  );
  expect(mockedMark).toHaveBeenCalledWith('bk@cfp.com');
  expect(mockedBk.update).toHaveBeenCalledWith(
    { inviteAccepted: true, userId: 42 },
    { where: { email: 'bk@cfp.com', invitationToken: 'tok' } },
  );
  expect(res.status).toHaveBeenCalledWith(200);
});

it('still accepts the invite when no Users row exists yet (sign-up override has not run)', async () => {
  mockedBk.findOne.mockResolvedValue({ id: 7 });
  mockedUsers.findOne.mockResolvedValue(null);
  mockedBk.update.mockResolvedValue([1]);
  const res = makeRes();
  await updateInvitationStatus({ body: { email: 'bk@cfp.com', invitationToken: 'tok' } } as any, res);
  expect(mockedBk.update).toHaveBeenCalledWith(
    { inviteAccepted: true },
    { where: { email: 'bk@cfp.com', invitationToken: 'tok' } },
  );
});
```

Check `user.ts`'s imports first: if the controller imports other models at module load (it does — `UserSettings`, `tokens`, etc.), add a `jest.mock` for each one that throws on load, following the pattern in `stripeGivingSyncStartDay.test.ts` (`qboClient`, `quickBookApi` if pulled in).

- [x] **Step 3: Run tests to verify they fail**

Run: `npx jest src/controller/__tests__/updateInvitationStatus.test.ts`
Expected: FAIL — `Cannot find module '../../services/emailVerification'` (or suite loads and the 3rd/4th tests fail on `update` args).

- [x] **Step 4: Write the service**

```ts
// quickplan-connect/src/services/emailVerification.ts
/* eslint-disable @typescript-eslint/no-var-requires */
const ThirdPartyEmailPassword = require('supertokens-node/recipe/thirdpartyemailpassword');
import EmailVerification from 'supertokens-node/recipe/emailverification';

/**
 * Marks every SuperTokens user with this email as verified. Used when the address has
 * already been proven some other way (an invitation token that was mailed to it, or an
 * account that predates verification). Returns how many users were marked.
 */
export const markEmailVerified = async (email: string): Promise<number> => {
  const stUsers: Array<{ id: string }> = await ThirdPartyEmailPassword.getUsersByEmail(email);
  let marked = 0;
  for (const stUser of stUsers) {
    const token = await EmailVerification.createEmailVerificationToken(stUser.id, email);
    if (token.status === 'OK') {
      await EmailVerification.verifyEmailUsingToken(token.token);
      marked += 1;
    }
    // EMAIL_ALREADY_VERIFIED_ERROR: nothing to do.
  }
  return marked;
};
```

- [x] **Step 5: Rewrite `updateInvitationStatus`**

```ts
export const updateInvitationStatus = async (req: Request, res: Response) => {
  const { email, invitationToken } = req.body;

  try {
    // This runs before the invitee has a session, so the invitation token IS the
    // credential. Without it in the WHERE clause, anyone could post an invited email
    // plus their own user id and attach themselves to that church's books.
    if (!invitationToken) {
      return responseError({ res, code: 401, message: 'Invitation token required' });
    }

    const invite = await bookkeeper.findOne({ where: { email, invitationToken } });
    if (!invite) {
      return responseError({ res, code: 400, message: 'Error in invitation' });
    }

    // The token was mailed to this address, so accepting it proves the inbox is theirs -
    // the same proof a verification link gives. Otherwise REQUIRED mode would stop the
    // invitee at "check your inbox" for a mail that was never sent.
    await markEmailVerified(email);

    // Derive the user from the email rather than trusting an id from the body.
    const user = await Users.findOne({ where: { email } });
    const updateData: { inviteAccepted: boolean; userId?: number } = { inviteAccepted: true };
    if (user) {
      updateData.userId = user.id;
    }

    const bookkeeperData = await bookkeeper.update(updateData, { where: { email, invitationToken } });
    return responseSuccess(res, bookkeeperData);
  } catch (e) {
    return responseError({ res, code: 400, message: e });
  }
};
```

Add `import { markEmailVerified } from '../services/emailVerification';` at the top of `controller/user.ts`.

- [x] **Step 6: Run tests, tsc, whole suite**

Run: `npx jest src/controller/__tests__/updateInvitationStatus.test.ts && npx tsc --noEmit && npx jest 2>&1 | grep -E "^(Tests|Test Suites):"`
Expected: 4 PASS; tsc clean; `Test Suites: 27 passed`.

- [x] **Step 7: Commit**

```bash
git add src/services/emailVerification.ts src/controller/user.ts src/controller/__tests__/updateInvitationStatus.test.ts
git commit -m "Accepting an invitation marks the invitee's email verified and derives the user from the email"
```

---

### Task 4: Create clients server-side so the bookkeeper keeps their own session (backend + frontend)

**Files:**
- Modify: `quickplan-connect/src/controller/user.ts` (new `createClientChurch`)
- Modify: `quickplan-connect/src/constant/routes.ts` (add `createClientChurch: '/user/createClientChurch'`)
- Modify: `quickplan-connect/src/routes/routers.ts` (register with `verifySession()`)
- Test: `quickplan-connect/src/controller/__tests__/createClientChurch.test.ts`
- Modify: `church-sync-pro/src/common/constant/routes-api.ts` (`userRoutes.createClientChurch`)
- Modify: `church-sync-pro/src/common/api/user.ts` (new `createClientChurch`)
- Modify: `church-sync-pro/src/pages/Main/client/components/modal.tsx:1-18, 51-116`

**Interfaces:**
- Produces: `POST /csp/user/createClientChurch { churchName, bookkeeperId } → { clientId, email }`.
- Frontend: `createClientChurch(churchName: string, bookkeeperId: number): Promise<{ clientId: number; email: string }>`.

Why: today the modal calls SuperTokens' sign-up API from the browser (`modal.tsx:75-84`). That API sets the *new* user's session cookies, so the bookkeeper's tab silently continues on the client's session. With REQUIRED mode that session is unverified and every following request 403s. Creating the user with the backend SDK (`ThirdPartyEmailPassword.emailPasswordSignUp`) creates no session. The password becomes random: nobody is meant to log in as a synthetic `church-slug-bookkeeper@…` address, and it removes the shared `csp@2024` already flagged to the client.

- [x] **Step 1: Check the `Users` columns the sign-up override writes**

Run: `grep -n "isSubscribe\|isActive\|firstName\|lastName\|churchName\|role" src/db/models/user.ts | head -12`
Expected: those attributes exist; note `isSubscribe`'s type (string `'0'` is what the form sends today).

- [x] **Step 2: Write the failing tests**

```ts
// quickplan-connect/src/controller/__tests__/createClientChurch.test.ts
/**
 * A bookkeeper adding a church must not end up logged in AS that church. The browser
 * sign-up API sets the new user's session cookies; the backend SDK call does not. This
 * also retires the shared default password the old flow hard-coded in the browser.
 */
function mockModel() {
  return { __esModule: true, default: { findOne: jest.fn(), create: jest.fn(), update: jest.fn() } };
}
jest.mock('../../db/models/user', mockModel);
jest.mock('../../db/models/bookkeeper', mockModel);
jest.mock('../../db/models/userSettings', mockModel);
jest.mock('supertokens-node/recipe/thirdpartyemailpassword', () => ({ emailPasswordSignUp: jest.fn() }));
jest.mock('../../services/emailVerification', () => ({ markEmailVerified: jest.fn() }));

import Users from '../../db/models/user';
import bookkeeper from '../../db/models/bookkeeper';
const ThirdPartyEmailPassword = require('supertokens-node/recipe/thirdpartyemailpassword');
import { createClientChurch } from '../user';

const mockedUsers = Users as unknown as { findOne: jest.Mock; create: jest.Mock };
const mockedBk = bookkeeper as unknown as { create: jest.Mock };
const mockedSignUp = ThirdPartyEmailPassword.emailPasswordSignUp as jest.Mock;

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedUsers.findOne.mockResolvedValue({ id: 5, email: 'jake@cfp.com', role: 'bookkeeper' });
});

it('creates the SuperTokens user with the synthetic address and a random password, then the rows', async () => {
  mockedSignUp.mockResolvedValue({ status: 'OK', user: { id: 'st-9' } });
  mockedUsers.create.mockResolvedValue({ id: 77 });
  mockedBk.create.mockResolvedValue({});
  const res = makeRes();
  await createClientChurch({ body: { churchName: 'Active Church', bookkeeperId: 5 } } as any, res);

  expect(mockedSignUp).toHaveBeenCalledTimes(1);
  const [email, password] = mockedSignUp.mock.calls[0];
  expect(email).toBe('active-church-jake@cfp.com');
  expect(password).not.toBe('csp@2024');
  expect(password.length).toBeGreaterThanOrEqual(24);

  expect(mockedUsers.create).toHaveBeenCalledWith(
    expect.objectContaining({ email, churchName: 'Active Church', role: 'client', isActive: true }),
  );
  expect(mockedBk.create).toHaveBeenCalledWith(
    expect.objectContaining({ email, clientId: 77, userId: 5, inviteAccepted: true, bookkeeperIntegrationAccessEnabled: false }),
  );
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: { clientId: 77, email } }));
});

it('returns 409 when that church already exists for this bookkeeper', async () => {
  mockedSignUp.mockResolvedValue({ status: 'EMAIL_ALREADY_EXISTS_ERROR' });
  const res = makeRes();
  await createClientChurch({ body: { churchName: 'Active Church', bookkeeperId: 5 } } as any, res);
  expect(res.status).toHaveBeenCalledWith(409);
  expect(mockedUsers.create).not.toHaveBeenCalled();
});

it('rejects a missing church name or unknown bookkeeper', async () => {
  const res1 = makeRes();
  await createClientChurch({ body: { churchName: '', bookkeeperId: 5 } } as any, res1);
  expect(res1.status).toHaveBeenCalledWith(400);

  mockedUsers.findOne.mockResolvedValue(null);
  const res2 = makeRes();
  await createClientChurch({ body: { churchName: 'X', bookkeeperId: 5 } } as any, res2);
  expect(res2.status).toHaveBeenCalledWith(400);
  expect(mockedSignUp).not.toHaveBeenCalled();
});
```

Check how `responseSuccess` shapes its JSON (`src/utils/response.ts` or wherever `grep -rn "export const responseSuccess" src/utils` points) and adjust the last `expect` in the first test to match its actual envelope.

- [x] **Step 3: Run tests to verify they fail**

Run: `npx jest src/controller/__tests__/createClientChurch.test.ts`
Expected: FAIL — `createClientChurch` is not exported.

- [x] **Step 4: Write the controller**

Add to `quickplan-connect/src/controller/user.ts` (imports at top: `import crypto from 'crypto';` and `const ThirdPartyEmailPassword = require('supertokens-node/recipe/thirdpartyemailpassword');` if not already present):

```ts
/**
 * A bookkeeper adding a church from the Clients page. Done here with the backend SDK
 * rather than the browser sign-up API because that API would replace the bookkeeper's
 * session with the new client's. The address is synthetic (nobody reads it) and the
 * password random (nobody is meant to log in as it): the bookkeeper works on the
 * church through their own login.
 */
export const createClientChurch = async (req: Request, res: Response) => {
  const { churchName, bookkeeperId } = req.body;
  try {
    if (!churchName || typeof churchName !== 'string' || !churchName.trim()) {
      return responseError({ res, code: 400, message: 'Church name is required' });
    }
    const bk = await Users.findOne({ where: { id: bookkeeperId } });
    if (!bk) {
      return responseError({ res, code: 400, message: 'Bookkeeper not found' });
    }

    const email = `${churchName.trim().toLowerCase().replace(/ /g, '-')}-${bk.email}`;
    const password = crypto.randomBytes(24).toString('base64url');

    const signUp = await ThirdPartyEmailPassword.emailPasswordSignUp(email, password);
    if (signUp.status === 'EMAIL_ALREADY_EXISTS_ERROR') {
      return responseError({ res, code: 409, message: 'A church with this name already exists' });
    }

    const client = await Users.create({
      email,
      churchName: churchName.trim(),
      firstName: 'N/A',
      lastName: 'N/A',
      role: 'client',
      isSubscribe: '0',
      isActive: true,
    });

    // Same row sendEmailInvitation writes on its createdByBk branch.
    await bookkeeper.create({
      email,
      inviteSent: true,
      invitationToken: crypto.randomBytes(16).toString('hex'),
      inviteAccepted: true,
      clientId: client.id,
      userId: bk.id,
      bookkeeperIntegrationAccessEnabled: false,
    });

    return responseSuccess(res, { clientId: client.id, email });
  } catch (e) {
    return responseError({ res, code: 500, message: e.message ?? e });
  }
};
```

If `isSubscribe` is not a string column (Step 1), use the model's type.

- [x] **Step 5: Route it**

`src/constant/routes.ts` — in `userRoutes`: `createClientChurch: '/user/createClientChurch',`
`src/routes/routers.ts` — next to line 114: `routers.post(userRoutes.createClientChurch, verifySession(), createClientChurch);` and add `createClientChurch` to the import from `../controller/user`.

- [x] **Step 6: Run tests, tsc, suite**

Run: `npx jest src/controller/__tests__/createClientChurch.test.ts && npx tsc --noEmit && npx jest 2>&1 | grep -E "^(Tests|Test Suites):"`
Expected: 3 PASS; tsc clean; `Test Suites: 28 passed`.

- [x] **Step 7: Commit backend**

```bash
git add src/controller/user.ts src/constant/routes.ts src/routes/routers.ts src/controller/__tests__/createClientChurch.test.ts
git commit -m "Create client churches server-side so the bookkeeper keeps their own session"
```

- [x] **Step 8: Frontend API client**

`church-sync-pro/src/common/constant/routes-api.ts` — in `userRoutes`: `createClientChurch: '/user/createClientChurch',`

`church-sync-pro/src/common/api/user.ts` — next to `sendEmailInvitation`:

```ts
const createClientChurch = async (churchName: string, bookkeeperId: number) => {
  const url = userRoutes.createClientChurch
  const response = await apiCall.post(
    url,
    JSON.stringify({ churchName, bookkeeperId }),
  )
  return response.data.data as { clientId: number; email: string }
}
```

(Match the envelope you confirmed in Step 2 — if `responseSuccess` returns `{ data }`, `response.data.data` is right. This throws on failure, per the CLAUDE.md rule on API catch blocks.) Add it to the file's export list.

- [x] **Step 9: Rewire the modal**

In `modal.tsx`:
- Replace the import on line 2 with `import { createClientChurch } from '@/common/api/user'`.
- Delete line 18 (`emailPasswordSignUp` import) and the `sendEmailInvitationDebounced` block (lines 51-62).
- Replace the body of `handleAddOrUpdateRegistration` between `setIsSending(true)` / `try {` and the `queryClient.invalidateQueries` line with:

```ts
      if (!churchName) {
        failNotification({ title: 'Church name is required.' })
        return
      }

      await createClientChurch(churchName, user.id)
```

Keep the `invalidateQueries`, `successNotification`, `handleCloseModals`, `catch`, `finally`. In the `catch`, show the server's message when there is one so a 409 reads as "already exists":

```ts
    } catch (e: any) {
      failNotification({
        title: e?.response?.data?.message || 'An error occurred. Please try again.',
      })
      console.error('Error:', e)
    }
```

- [x] **Step 10: Type-check, lint**

Run: `cd /Volumes/T7/OtherProject/church-sync-pro && npx tsc --noEmit && npx eslint src/pages/Main/client/components/modal.tsx src/common/api/user.ts`
Expected: clean (`getUserRelated`/`sendEmailInvitation` no longer imported in the modal; `debounce` import removed if now unused).

- [x] **Step 11: Commit frontend**

```bash
git add src/common/constant/routes-api.ts src/common/api/user.ts src/pages/Main/client/components/modal.tsx
git commit -m "Clients page creates churches through the backend instead of signing up in the browser"
```

---

### Task 5: One-off script — mark every existing account verified (backend)

**Files:**
- Create: `quickplan-connect/scripts/verifyExistingUsers.ts`
- Modify: `quickplan-connect/CLAUDE.md` (deploy note) — if the backend has no CLAUDE.md, add the note to the frontend `CLAUDE.md` Deploy section instead.

**Interfaces:**
- Consumes: `buildSupertokensConfig` (Task 2), `markEmailVerified` (Task 3).

Why: `REQUIRED` mode applies to every session, including accounts created before the recipe existed. Without this, Matt's production login stops working the moment the backend deploys. The script is idempotent (already-verified users are skipped inside `markEmailVerified`).

- [x] **Step 1: Write the script**

```ts
// quickplan-connect/scripts/verifyExistingUsers.ts
/**
 * Marks every account that exists today as email-verified. Run ONCE per environment
 * BEFORE deploying a backend with EmailVerification in REQUIRED mode, otherwise every
 * existing login is refused with "invalid claim". Safe to re-run.
 *
 *   NODE_ENV=development DOTENV_CONFIG_PATH=.env npx ts-node -r dotenv/config scripts/verifyExistingUsers.ts
 *   NODE_ENV=staging     DOTENV_CONFIG_PATH=.env.staging    ... (staging core)
 *   NODE_ENV=uat-prd     DOTENV_CONFIG_PATH=.env.production ... (production core)
 */
/* eslint-disable @typescript-eslint/no-var-requires */
const supertokens = require('supertokens-node');
import { buildSupertokensConfig } from '../src/supertokensConfig';
import { markEmailVerified } from '../src/services/emailVerification';
import Users from '../src/db/models/user';

const main = async () => {
  supertokens.init(buildSupertokensConfig());
  const users = await Users.findAll({ attributes: ['email'], raw: true });
  let marked = 0;
  for (const { email } of users as Array<{ email: string }>) {
    const n = await markEmailVerified(email);
    if (n > 0) {
      marked += n;
      console.log(`verified ${email}`);
    }
  }
  console.log(`${users.length} accounts checked, ${marked} newly marked verified`);
};

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
```

Check the NODE_ENV names against `config/config.json` (the memory says `uat` / `uat-prd` map to staging / prod in `package.json` scripts) and correct the header comment if they differ.

- [x] **Step 2: Run it locally**

Run: `NODE_ENV=development DOTENV_CONFIG_PATH=.env npx ts-node -r dotenv/config scripts/verifyExistingUsers.ts`
Expected: `N accounts checked, N newly marked verified` (first run), then re-run → `N accounts checked, 0 newly marked verified`.

- [x] **Step 3: Prove it worked**

Log in on `localhost:3000` with an account that existed before this work. Expected: reaches `/quick-start-guide` as before (Task 8's login change is not in yet, so this is the pre-existing flow — the point is `verifySession()` no longer 403s).

- [x] **Step 4: Document the deploy precondition**

Add to the Deploy section of `church-sync-pro/CLAUDE.md` (the file that documents both deploys):

```
Email verification is REQUIRED on the backend. Before the first deploy of that to any
environment, run `scripts/verifyExistingUsers.ts` against that environment's SuperTokens
core (see the script header) or every existing login is refused.
```

- [x] **Step 5: Commit**

```bash
git add scripts/verifyExistingUsers.ts
git commit -m "Script to mark pre-existing accounts verified before REQUIRED mode reaches an environment"
# and in church-sync-pro:
git add CLAUDE.md && git commit -m "Document the verify-existing-users precondition for backend deploys"
```

---

### Task 6: Frontend recipe, routes and the two verification pages

**Files:**
- Modify: `church-sync-pro/src/App.tsx:43-47`
- Modify: `church-sync-pro/src/common/constant/route.ts:1-15`
- Create: `church-sync-pro/src/pages/Auth/verify-email/CheckInbox.tsx`
- Create: `church-sync-pro/src/pages/Auth/verify-email/VerifyEmail.tsx`
- Modify: `church-sync-pro/src/pages/MainPage.tsx` (two routes, `guards={[]}`)

**Interfaces:**
- Produces: `route.CHECK_INBOX = '/check-your-inbox'` (navigate with `state: { email }`) and `route.VERIFY_EMAIL = '/auth/verify-email'` (the SDK-built link: `${websiteDomain}/auth/verify-email?token=…&rid=emailverification`).

- [x] **Step 1: Register the recipe**

`App.tsx` recipeList becomes:

```tsx
    recipeList: [
      Session.init(),
      ThirdPartyEmailPassword.init(),
      EmailPassword.init(),
      EmailVerification.init(),
    ],
```

(`EmailVerification` is already imported on line 12.)

- [x] **Step 2: Add the routes**

`route.ts`, inside `route`:

```ts
  CHECK_INBOX: '/check-your-inbox',
  VERIFY_EMAIL: '/auth/verify-email',
```

- [x] **Step 3: The "check your inbox" page**

```tsx
// church-sync-pro/src/pages/Auth/verify-email/CheckInbox.tsx
import { Button, Spinner } from 'flowbite-react'
import { FC, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Session from 'supertokens-web-js/recipe/session'

import { route } from '@/common/constant/route'
import { sendEmail } from '@/common/utils/supertoken'

import bgImage from '../../../common/assets/bg-registration.png'

// Shown after sign-up, and after a login by an account that has not confirmed its email
// yet. The session exists (it is what lets "Resend" work) but PERSONAL_TOKEN is not set,
// so every private route still bounces to the login page.
const CheckInbox: FC = () => {
  const location = useLocation()
  const email: string | undefined = location.state?.email
  const [sending, setSending] = useState(false)

  const resend = async () => {
    setSending(true)
    try {
      await sendEmail()
    } finally {
      setSending(false)
    }
  }

  const backToLogin = async () => {
    await Session.signOut()
    window.location.href = route.ROOT
  }

  return (
    <div className="h-screen flex font-lato">
      <div
        className="flex-grow"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="flex w-full h-full justify-end items-center">
          <div
            style={{ backgroundColor: 'rgba(251, 251, 251, 0.8)' }}
            className="sm:w-96 xs:w-96 md:w-[520px] shadow-2xl rounded-3xl m-4 sm:mr-12"
          >
            <div className="flex flex-col gap-4 p-12 items-center text-center">
              <p className="text-2xl">Check your inbox</p>
              <div className="border-[0.5px] w-52" />
              <p className="text-slate-700">
                We sent a confirmation link to{' '}
                <span className="font-semibold">{email ?? 'your email address'}</span>.
                Open it to finish creating your account.
              </p>
              <p className="text-sm text-slate-500">
                Nothing there? Check your spam folder, or send it again.
              </p>
              <Button
                className="bg-btmColor rounded-md shadow-sm h-12 w-full hover:bg-slate-600 [&>*]:text-white"
                onClick={resend}
                disabled={sending}
              >
                {sending ? <Spinner className="mr-8" /> : <p>Resend email</p>}
              </Button>
              <button
                type="button"
                className="text-sm text-slate-600 underline"
                onClick={backToLogin}
              >
                Back to sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckInbox
```

- [x] **Step 4: The link-target page**

```tsx
// church-sync-pro/src/pages/Auth/verify-email/VerifyEmail.tsx
import { Button, Spinner } from 'flowbite-react'
import { FC, useEffect, useState } from 'react'
import { verifyEmail } from 'supertokens-web-js/recipe/emailverification'
import Session from 'supertokens-web-js/recipe/session'

import { route } from '@/common/constant/route'

import bgImage from '../../../common/assets/bg-registration.png'

type State = 'verifying' | 'verified' | 'invalid' | 'error'

// The target of the link in the verification email. The SDK reads ?token= from the URL
// itself. No session is needed to consume the token, so this works in any browser.
const VerifyEmail: FC = () => {
  const [state, setState] = useState<State>('verifying')

  useEffect(() => {
    let cancelled = false
    verifyEmail()
      .then((r) => {
        if (cancelled) return
        setState(r.status === 'OK' ? 'verified' : 'invalid')
      })
      .catch(() => !cancelled && setState('error'))
    return () => {
      cancelled = true
    }
  }, [])

  const goToLogin = async () => {
    // A session may exist from the sign-up tab; drop it so login starts clean and
    // the fresh session carries the verified claim.
    try {
      await Session.signOut()
    } catch {
      // no session - fine
    }
    window.location.href = route.ROOT
  }

  const copy: Record<State, { title: string; body: string }> = {
    verifying: { title: 'Confirming your email…', body: '' },
    verified: {
      title: 'Email confirmed',
      body: 'Your account is ready. Sign in to get started.',
    },
    invalid: {
      title: 'This link has expired',
      body: 'Sign in and we will send you a fresh confirmation link.',
    },
    error: {
      title: 'Something went wrong',
      body: 'Please try the link again, or sign in to request a new one.',
    },
  }

  return (
    <div className="h-screen flex font-lato">
      <div
        className="flex-grow"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="flex w-full h-full justify-end items-center">
          <div
            style={{ backgroundColor: 'rgba(251, 251, 251, 0.8)' }}
            className="sm:w-96 xs:w-96 md:w-[520px] shadow-2xl rounded-3xl m-4 sm:mr-12"
          >
            <div className="flex flex-col gap-4 p-12 items-center text-center">
              <p className="text-2xl">{copy[state].title}</p>
              <div className="border-[0.5px] w-52" />
              {state === 'verifying' ? (
                <Spinner />
              ) : (
                <>
                  <p className="text-slate-700">{copy[state].body}</p>
                  <Button
                    className="bg-btmColor rounded-md shadow-sm h-12 w-full hover:bg-slate-600 [&>*]:text-white"
                    onClick={goToLogin}
                  >
                    <p>Go to sign in</p>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VerifyEmail
```

- [x] **Step 5: Mount them**

In `MainPage.tsx`, import both and add after the `route.RESET_PASSWORD` route:

```tsx
        <Route
          path={route.CHECK_INBOX}
          element={<PrivateRoute Component={CheckInbox} guards={[]} />}
        />
        <Route
          path={route.VERIFY_EMAIL}
          element={<PrivateRoute Component={VerifyEmail} guards={[]} />}
        />
```

- [x] **Step 6: Type-check, lint, smoke**

Run: `npx tsc --noEmit && npx eslint src/App.tsx src/common/constant/route.ts src/pages/Auth/verify-email src/pages/MainPage.tsx`
Then with the dev server on :3000, open `http://localhost:3000/auth/verify-email?token=bogus&rid=emailverification` in ego-browser.
Expected: "This link has expired" card with a "Go to sign in" button (the SDK returned `EMAIL_VERIFICATION_INVALID_TOKEN_ERROR`).

- [x] **Step 7: Commit**

```bash
git add src/App.tsx src/common/constant/route.ts src/pages/Auth/verify-email src/pages/MainPage.tsx
git commit -m "Add the check-your-inbox and verify-email pages and register the EmailVerification recipe"
```

---

### Task 7: Sign-up sends the email and stops at "check your inbox" (frontend)

**Files:**
- Modify: `church-sync-pro/src/pages/Auth/signUp/index.tsx:4, 15, 18-30, 40-51, 101-122, 141-149`

**Interfaces:**
- Consumes: `route.CHECK_INBOX` (Task 6), `sendEmail` (existing util).

- [x] **Step 1: Replace the success branch** (lines 101-122)

```tsx
      } else {
        // The backend refuses this session until the address is confirmed
        // (EmailVerification REQUIRED), so nothing app-side is set up here:
        // no PERSONAL_TOKEN, no redux user. The email is sent, and the account
        // is picked up again by the login page once the link has been opened.
        await sendEmail()
        navigate(route.CHECK_INBOX, { state: { email } })
      }
```

- [x] **Step 2: Remove what the old flow needed**

- Delete the `checkSession` callback and its `useEffect` (lines 141-149), the `signUpSuccess` state (line 51), the `delay` helper (line 40), and the imports of `shouldLoadRoute`, `setUserData`, `storageKey`, `getUserRelated`, `useLocation`, `useDispatch`, `useCallback`, `useEffect` if now unused.
- Add `import { useNavigate } from 'react-router-dom'` and `import { sendEmail } from '@/common/utils/supertoken'`; inside the component `const navigate = useNavigate()`.
- Keep the `user.email` read from redux (it pre-fills the form) — `useSelector` stays.

- [x] **Step 3: Type-check, lint**

Run: `npx tsc --noEmit && npx eslint src/pages/Auth/signUp/index.tsx`
Expected: clean.

- [x] **Step 4: Verify in the browser**

With backend (`WEBSITE_URL=http://localhost:3000 npm run dev`) and frontend running, in ego-browser:
1. Open `http://localhost:3000/signup`, choose Client, fill church name / names / a fresh email `verify-test-<timestamp>@example.com` / password `Testing123!`, submit.
2. Expected: toast "Please check your email and click the link in it", URL `/check-your-inbox`, the card names the email. `localStorage` has no `PERSONAL_TOKEN` (`Object.keys(localStorage).filter(k => k.endsWith('PERSONAL_TOKEN'))` → `[]`).
3. Navigate to `http://localhost:3000/daily`. Expected: bounced to `/` (login).
4. Backend terminal shows `[email-verification] verify-test-…@example.com -> http://localhost:3000/auth/verify-email?token=…`.
5. Open that link. Expected: "Email confirmed" → "Go to sign in".

Screenshot steps 2 and 5 to the scratchpad (`scale: "css"`).

- [x] **Step 5: Commit**

```bash
git add src/pages/Auth/signUp/index.tsx
git commit -m "Sign-up sends the confirmation email and stops at check-your-inbox instead of entering the app"
```

---

### Task 8: Login refuses an unconfirmed account and re-sends the link (frontend)

**Files:**
- Modify: `church-sync-pro/src/pages/Auth/login/index.tsx:109-129`

- [x] **Step 1: Gate on the claim before touching app state**

Replace the start of the success branch (line 109 `} else {`) with:

```tsx
      } else {
        // Sign-in succeeded but REQUIRED mode means the backend will refuse every
        // request until the address is confirmed - so do not set PERSONAL_TOKEN.
        const { isVerified } = await isEmailVerified()
        if (!isVerified) {
          await sendEmail()
          setLoading(false)
          navigate(route.CHECK_INBOX, { state: { email } })
          return
        }
        const userData = await getUserRelated(email)
```

Imports: `import { isEmailVerified } from 'supertokens-web-js/recipe/emailverification'`, `import { sendEmail } from '@/common/utils/supertoken'`, `useNavigate` from `react-router-dom` (check whether the file already has `navigate`; add `const navigate = useNavigate()` if not), and `route` from `@/common/constant/route` if not imported.

- [x] **Step 2: Type-check, lint**

Run: `npx tsc --noEmit && npx eslint src/pages/Auth/login/index.tsx`

- [x] **Step 3: Verify in the browser**

1. Sign up a second fresh email (Task 7 flow) but do **not** open the link. Click "Back to sign in".
2. Log in with it. Expected: `/check-your-inbox`, a second `[email-verification]` line in the backend log, no `PERSONAL_TOKEN`.
3. Open the new link → "Email confirmed" → sign in again. Expected: lands on `/quick-start-guide` with `PERSONAL_TOKEN=client`.
4. Log in with the pre-existing local account (verified by Task 5). Expected: straight to `/quick-start-guide`.

- [x] **Step 4: Commit**

```bash
git add src/pages/Auth/login/index.tsx
git commit -m "Login sends an unconfirmed account back to check-your-inbox instead of into the app"
```

---

### Task 9: Invited bookkeepers land in the app (frontend)

**Files:**
- Modify: `church-sync-pro/src/pages/Main/invite-link/InviteLink.tsx:140-162`
- Modify: `church-sync-pro/src/common/api/user.ts:666-680` (`updateInvitationStatus` no longer needs the id)

Why: the invitee signs up in the browser, so their session is created *unverified*. Task 3 marks them verified on accept, but the session's claim was cached as `false` and stays that way for up to 10 s (`refetchTimeOnFalseInSeconds`). Calling `isEmailVerified()` after accepting hits `isEmailVerifiedGET`, which `fetchAndSetClaim`s — so the very next `getUserRelated` (behind `verifySession()`) passes.

- [x] **Step 1: Reorder the success branch**

Replace lines 140-162 (`// sendEmail()` through `window.location.reload()`) with:

```tsx
      } else {
        // Accept first: the backend marks this address verified (the invite token was
        // mailed to it) and links the row to our user. Then refresh the session's
        // verification claim before the first verifySession()-protected call.
        await updateInvitationStatus(bookkeeperEmail as string, invitationToken)
        await isEmailVerified()
        const userData = await getUserRelated(email)
        const { id, role, firstName, lastName, churchName, img_url } =
          userData.data

        dispatch(
          setUserData({
            id,
            role,
            firstName,
            lastName,
            churchName,
            email,
            img_url,
          }),
        )
        setSignUpSuccess(true)
        localStorage.setItem(storageKey.PERSONAL_TOKEN, role)
        // Only reload on a successful signup so the success state can render.
        // Reloading on error would wipe the form and the error toast.
        window.location.reload()
      }
```

Add `import { isEmailVerified } from 'supertokens-web-js/recipe/emailverification'`. Remove the `delay` helper if nothing else uses it.

- [x] **Step 2: Simplify the API client**

```ts
const updateInvitationStatus = async (
  email: string,
  invitationToken?: string | null,
) => {
  const url = userRoutes.updateInvitationStatus
  // The backend requires the token: it is the only credential the invitee has
  // before their session exists. It derives the user id from the email itself.
  const data = JSON.stringify({ email, invitationToken })
```

(keep the rest of the function). Fix every other caller: `grep -rn "updateInvitationStatus(" src` and drop the middle argument.

- [x] **Step 3: Type-check, lint**

Run: `npx tsc --noEmit && npx eslint src/pages/Main/invite-link/InviteLink.tsx src/common/api/user.ts`

- [x] **Step 4: Verify in the browser**

1. Logged in as a local client, Settings → Bookkeeper → invite `invite-test-<timestamp>@example.com`.
2. Backend log / local DB: `select "invitationToken" from bookkeeper where email='invite-test-…'`. Build `http://localhost:3000/invite-bookkeeper?bookkeeperEmail=<email>&invitationToken=<token>`.
3. In a fresh ego-browser context (no cookies), open it, fill the form, submit.
4. Expected: no "check your inbox"; page reloads into the app with `PERSONAL_TOKEN=bookkeeper`; the church shows in the NavBar switcher. Backend log shows no 403 `invalid claim`.
5. Local DB: `select "userId","inviteAccepted" from bookkeeper where email='invite-test-…'` → `userId` set, `inviteAccepted = true`.

- [x] **Step 5: Commit**

```bash
git add src/pages/Main/invite-link/InviteLink.tsx src/common/api/user.ts
git commit -m "Invite acceptance runs before the first protected call so the verified claim is fresh"
```

---

### Task 10: Full local regression and wrap-up

- [x] **Step 1: Backend gates**

Run: `cd /Volumes/T7/OtherProject/quickplan-connect && npx tsc --noEmit && npx jest 2>&1 | grep -E "^(Tests|Test Suites):"`
Expected: `Test Suites: 28 passed`, all tests passed.

- [x] **Step 2: Frontend gates**

Run: `cd /Volumes/T7/OtherProject/church-sync-pro && npx tsc --noEmit && npx eslint src && CI=false npx craco build 2>&1 | tail -5`
Expected: clean; build succeeds.

- [x] **Step 3: Clients page (the flow REQUIRED mode would have broken)**

Logged in locally as a bookkeeper: Client Management → Add client "Regression Church".
Expected: success toast, church appears in the sidebar/NavBar list, and the bookkeeper is **still themselves** — reload the page, `PERSONAL_TOKEN=bookkeeper`, NavBar shows the bookkeeper's name, no 403s in the network log. Local DB: `select email, role from "Users" where "churchName"='Regression Church'` → `regression-church-<bk email>`, `client`.

Then try adding "Regression Church" again. Expected: toast "A church with this name already exists".

- [x] **Step 4: Bookkeeper works on the new church**

Switch to "Regression Church" in the NavBar and open Settings → Integrations. Expected: page loads (the effective email resolves to the synthetic client; `getUserRelated`/settings calls succeed).

- [x] **Step 5: Google sign-in unaffected**

Not testable locally without the OAuth redirect configured for localhost — note as untested in the summary; SuperTokens marks provider-verified emails as verified, so the Google flows need no change.

- [x] **Step 6: Record what was verified**

Append to the plan's own "Verification log" section (create it at the bottom): date, each browser check from Tasks 6-10 with pass/fail, screenshot paths.

- [x] **Step 7: Push both branches (no deploy)**

```bash
cd /Volumes/T7/OtherProject/quickplan-connect && git push
cd /Volumes/T7/OtherProject/church-sync-pro && git push
```

Do **not** run `make deploy-stg` / `make deploy-prd`. Before any future deploy: Task 5's script against that environment first.

---

## Self-review

- **Spec coverage.** Email sent on sign-up: Tasks 1, 2, 7. No entry until verified: Task 2 (backend enforcement) + Tasks 7, 8 (no `PERSONAL_TOKEN` until verified). Login of an unverified account: Task 8. Invites keep working: Tasks 3, 9. Clients page keeps working (and loses `csp@2024`): Task 4. Existing accounts keep working: Task 5. Link target exists: Task 6.
- **Known gap, deliberate:** the Google sign-up/sign-in pages are untouched (provider-verified).
- **Type consistency:** `sendVerificationEmail({ to, link })` (Task 1) ← Task 2 override; `markEmailVerified(email): Promise<number>` (Task 3) ← Tasks 5; `createClientChurch(churchName, bookkeeperId)` (Task 4 both sides); `updateInvitationStatus(email, invitationToken)` (Task 9 both sides); `route.CHECK_INBOX` / `route.VERIFY_EMAIL` (Task 6) ← Tasks 7, 8.
- **Things to confirm at execution, not assume** (each has a grep step): the delivery-input field name (Task 2 Step 1), `getUsersByEmail` (Task 3 Step 1), `Users` column types (Task 4 Step 1), `responseSuccess` envelope (Task 4 Step 2), NODE_ENV names (Task 5 Step 1).

---

## Verification log — 2026-09-18, local only (backend :8080, frontend :3000, core docker 4.4)

Backend: `npx tsc --noEmit` clean; `npx jest` → **Test Suites: 28 passed, Tests: 189 passed**.
Frontend: `npx tsc --noEmit` clean; `npx eslint src` 0 errors (27 pre-existing warnings); `CI=false npx craco build` compiled.
`scripts/verifyExistingUsers.ts` on the local core: `1 accounts checked, 2 newly marked verified`, re-run `0 newly marked` (idempotent); that account then loaded `/daily` under REQUIRED mode.

| Check | Result |
|---|---|
| `/auth/verify-email?token=bogus` | "This link has expired" card, Go to sign in |
| Sign up fresh client | lands on `/check-your-inbox`, `church-sync-pro-personal-token` absent, `/daily` bounces to `/`, link logged by backend |
| Login before verifying | `/check-your-inbox`, token absent, second mail logged; Resend logs a third |
| Open link → login | "Email confirmed" → login lands on `/quick-start-guide`, token `client` |
| Bookkeeper sign-up → verify → login | token `bookkeeper`, `/client-management/client-list` loads |
| Clients page: add "Regression Church" | row appears; after reload still "Book Keeper / Bookkeeper account"; DB: Users row 5 `role client`, bookkeeper row `userId 4, clientId 5, inviteAccepted t`; duplicate → "A church with this name already exists" |
| Invite flow: client invites → invitee opens link, signs up | lands in app with token `bookkeeper`, "Verify Test Church" in NavBar; bookkeeper row `userId 6, inviteAccepted t`; no `invalid claim` / 403 in backend log |
| Google sign-in | not testable locally (no OAuth redirect for localhost) — untouched code path |

Screenshots: scratchpad `check-inbox.png`, `verified.png`, `invitee-in-app.png`.

One false alarm during testing: the first run "crashed" — a second `ts-node index.ts` was still holding :8080 (EADDRINUSE from an earlier session), so a nodemon restart died and mails after the first were served by the stale process. Killing every backend process and starting one fresh cleared it; not a code issue.

Not deployed. Before staging/prod: run the script against that core first (CLAUDE.md, Deploy).
