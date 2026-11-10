# Returned gifts and late-evening gifts in payout reports

2026-11-10/11. Backend `quickplan-connect`, frontend `church-sync-pro`: branches `feat/payout-returned-gifts`
(the upload check) and `feat/daily-giving-returned` (Daily Giving), both cut from `main`.

## What happened

On 2026-11-09 Matt previewed Active Church's October payout report. It said two giving lines were "on days
that aren't in QuickBooks yet" and that two more lines "need a look". It also told him to post those days on
Daily Giving. All four were false alarms:

- **A late-evening gift.** Donation 407356032 ($187 ACH) was given at 11:53 pm on 10/15, church time. The file
  dates it 10/16, but CSP had posted it in CSP-2026-10-15-2. The check only looked on the file's date.
- **A gift the donor's bank returned.** Donation 404799338 ($600 ACH) was charged on 10/4 and returned on 10/5.
  Planning Center marks it failed, so CSP rightly never posted it. The file carries its charge
  ("Donation #404799338 - <donor> - Tithes & Offerings ($600.00)") and Stripe's own lines taking it back, which
  name only Stripe's payment id:
  - `Charge failure`: "Funds reversed due to payment py_3UMp... failed" (-$600.00 gross, -$600.75 net)
  - `Fee`: "Application fee refund for py_3UMp..." (+$0.05 net)

  Together they cost the church **$1.00**.

The next morning Matt's team recorded the file and booked both gifts **by hand** in QuickBooks: the $187 a
second time, and the $600 as income that never arrived. On 2026-11-10 they were told to delete both entries
(#21481, #21482) and book the $1.00. That is why every sentence below has to be exactly true.

## The rules (backend)

**Late-evening gifts.** A charge is looked for on the file's date and on the day either side, as Planning
Center groups gifts in the church's time zone. It is then judged on the day it is found (`givingCoverage.ts`).

**Returned gifts (`returnedGifts.ts`, pure).** Stripe's lines are tied to their gift:
- A failure is tied to the one charge with the same donor name, the same fund and the same amount, made up to
  14 days before it, whose gift Planning Center marks failed.
- A gift is returned once, so a return never takes a gift that already has one. Returns are matched oldest
  first.
- A fee goes with the failure that names the same Stripe payment.
- A failure that can't be tied is held for a person:
  - `returned_without_charge`: no gift like it has been uploaded.
  - `returned_unconfirmed`: Planning Center doesn't mark the gift returned.
  - `returned_ambiguous`: more than one gift fits.
  - `planning_center_unreachable`: Planning Center couldn't be read.
- The returns of gifts from before the sync start date are left alone, like that giving.

**What CSP's posting says about a returned gift** (`givingCoverage`, from the day's ledger):
- `returned_gift`: the day holds 0, or something between Planning Center's settled total and its
  refund-inclusive total. The gift was never in QuickBooks.
- `returned_after_posting`: the day holds more than the refund-inclusive total. CSP posted the gift before it
  came back, so QuickBooks still has it.
- `returned_day_unsettled`: the day holds less than the settled total. CSP can't tell yet.

**What gets stored.** CSP posts **nothing** for a returned gift (John, 2026-11-10: the risk of automatic
postings in the client's books isn't worth about $1 a return).
- The gift's charge becomes **one item** in the review list, held with its state. `returned_day_unsettled` is
  the exception: it waits as a giving line for "Check again".
- Stripe's lines tied to it are covered (`returned_gift_line`), and their link is kept in
  `PayoutTransactions.giftDonationId` (migration 20261111000001).
- The review list works out the gift's cost (the net of all its lines) and return date from that link.
- `relinkStoredReturnLines` runs after every upload and on "Check again". It ties return lines left open
  earlier: their gift came in a later file, Planning Center was down, or they were stored before this code.
  It asks Planning Center afresh about every stored charge it considers.

## What people read (frontend)

All the sentences are in `returnedGiftCopy.ts` (pure, tested):
- **Never in QuickBooks:** "book the $1.00 it cost: debit your Stripe fees account, credit Clearing, dated
  10/5/2026. Then mark it handled."
- **Posted before it came back:** one entry, so the gift's original fee isn't counted twice. Debit the gift's
  income account $600.00, debit your Stripe fees account $0.70, credit Clearing $600.70.
- **Day not settled:** bring the day up to date on Daily Giving, then press Check again.
- **Cost unknown yet:** it shows once the payout report with the return is uploaded.

The upload preview lists each returned gift once. The "not in QuickBooks" box links to Daily Giving only for
days that really need posting. Daily Giving shows "$600.00 returned by the bank (1 gift)" on the gift's day,
in words that make no claim about QuickBooks.

## Checked

- Against Active Church's real October file, rebuilt read-only from the rows production stored: 71
  registrations as before, 326 giving lines covered, nothing "not in QuickBooks", one returned gift costing
  $1.00, nothing held.
- Three review rounds (backend and frontend), each finding reproduced against the test database and fixed.
  The first design was abandoned after them: grouping by donation id, with automatic CSP-B fee entries. Its
  branches are `feat/payout-bounces` and `backup/daily-giving-returned-*`.

## Left for later

- **A day that lost money after posting** (a dispute after success) only shows at the payout check. Daily Giving
  does not flag it: a flag needs a way to clear it once a person fixes QuickBooks.
- **Automatic fee entries for returned gifts**, if returns become common.
