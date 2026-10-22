# Still in transit at month-end (outstanding deposits report)

2026-10-22. Asked for by Matt Moore (Church Finance Pros) on 2026-10-14: "we should be able to easily
identify which deposits have cleared the bank and which are still in transit. Ideally, we could generate
a report of all outstanding deposits and use that as supporting documentation for the reconciliation."
On 2026-10-16 he called it "our biggest holdup". Promised: started the week of 2026-10-19.

## What it is

For any month-end, every gift and registration CSP put into the Clearing account that Stripe had not
paid out by that date, tied to QuickBooks' Clearing balance on that date. It is the itemised backup for
the Clearing account's month-end balance.

## Where the answer "paid out yet?" comes from

Planning Center's API has no payout data, Stripe access is blocked (see memory
`stripe-connect-blocked`), and the payout report's rows carry NO payout date or id (real file checked:
`Date,Type,Source,Name,Fund/Signup,Gross,Fee,Net,Payment method,Campus,Description`, Date = charge date).
The payout report is exported in Planning Center for a range of PAYOUT dates, so the range the
bookkeeper chose is the missing fact. **The upload now asks for it** ("Payouts in this file: from / to").

Rule, for month-end D:
- an item (gift, gift refund, registration charge, registration refund) in a file whose payout range
  ends on or before D was paid out by D: not in transit;
- in a file whose payout range starts after D: paid out after D: **in transit at D**;
- in no file: not paid out yet as far as CSP knows: **in transit at D**.
An item that appears in several files (overlapping uploads are allowed) takes its earliest payout range.

Validated on real data before building (exports in /Volumes/T7/Downloads/ChurchSyncPro, never commit
them - donor names): September's payout file (payouts made in September) leaves 18 settled gifts
received 9/15-9/30 unpaid, net $4,689.62 - exactly the 18 the donations export dates as paid out
Oct 1-6. Plus the 9/30 $1,750 ACH (net $1,749.70) that was still settling at export and settled 10/7
= **19 gifts, $6,439.32**, the in-transit total reconciled with Matt to the cent on 2026-10-07.

## What the team sees

**Upload (Clearing page, Upload payout report).** New required field: "Payouts in this file: from
[date] to [date]", prefilled with the previous calendar month. Refused when from > to, to is in the
future, or the range crosses a month-end ("Split it at the month-end: CSP can't tell which side of Oct 31
each row falls on"). Everything else about the upload is unchanged.

**Clearing page, under the monthly statement, for the month picked there: "Still in transit on <Month
D>".**
- One sentence: "$X is still in transit: N gifts and M registrations that Stripe paid out after Oct 31
  (or hasn't paid out yet)."
- Tie-out: QuickBooks Clearing balance on D; still in transit (this list); difference. A non-zero
  difference is explained in words where CSP knows why (see Differences).
- Coverage warning, prominent, when uploaded payout ranges do not cover every day from the sync start
  date to D: "Payout reports for Sep 15 - Sep 30 haven't been uploaded, so this total is incomplete."
  The list still shows, the total reads as incomplete.
- "Not in QuickBooks yet" note: settled giving dated on or before D that CSP has not posted (a day
  reading Partly in QuickBooks). Not in the list - it is not in Clearing - but named, because the balance
  will change when it is added.
- The list: one row per item grouped by day: date, kind, donor/registrant, fund or event, gross, fee,
  net, and when it was paid out ("paid out in payouts of Oct 1-31" or "not paid out yet"). Totals.
- Included in the statement's Print / PDF. Plus Download CSV.

## Data

### Migration
`PayoutReportUploads`: add `payoutFrom` and `payoutTo` (DATEONLY, nullable - existing uploads have
none). Production has 0 uploads (2026-10-22); staging's test uploads stay null and count as "range
unknown" (their rows are treated as paid out by their own lastDay, and coverage treats them as gaps).

### Giving in Clearing (CSP's side)
`DailyJeSync` keeps day totals only (postedGrossCents/postedFeeCents, refundedGrossCents/FeeCents), no
gift ids. Per-gift lines come from Planning Center for the day, using the SAME selection the posting
engine uses (Stripe-processed: payment_source planning_center, card/ach, succeeded, the church's local
day). For each posted day up to D:
- if Planning Center's settled total for the day equals the day's posted total: every settled gift is
  in Clearing;
- if it is larger (late ACH not added yet): the gifts beyond what was posted are "not in QuickBooks
  yet" - pick them by completed_at, latest first, until the remainder equals the posted total; if no
  set of gifts adds up exactly, show the day as one line ("Sep 30: $X posted, can't tell which gifts")
  rather than guess.
Only days that are not fully paid out need Planning Center at all: a day whose posted net equals the
net of its Giving rows in files paid out by D is skipped without a Planning Center call.
Refunds: posted on the refund day (a reversing entry, out of Clearing); they appear in payout files as
Type=Refund rows. A refund posted on or before D but not in a file paid out by D is a negative line.

### Registrations in Clearing
`PayoutTransactions` rows CSP recorded (status `posted`) with day <= D. Each came from an upload, so its
payout range is that upload's (earliest if it appears in several). A registration charged Oct 30 paid
out Nov 3 is only recorded when November's file is uploaded (dated Oct 30) - so October's report changes
after November's upload, exactly as QuickBooks' Oct 31 balance does. Both move together.

### QuickBooks balance on D
`reportGeneralLedgerDetail({ account: <clearing id>, start_date, end_date: D })` - NOT
`reportTransactionList`, which ignores the account filter (memory `qbo-api-traps`). Prove the section
header names the clearing account before trusting the figure. The clearing account is the one mapped on
Mapping -> Bank (same for giving and registrations).

### Differences
difference = QuickBooks balance on D - still in transit. Explained where CSP knows: the switch-over
(go-live balance captured, true-up posted - from the transition panel's data); otherwise "QuickBooks has
$X in Clearing that CSP's records don't account for" with the QuickBooks entries in Clearing up to D that
CSP didn't make (DocNumber not starting with `CSP-`), date / type / amount / memo, so the team can look.
Deposits the team recorded for a different amount than the payout show up here too.

## API

`GET /csp/user/payoutReport/outstanding?email=<church account email>&month=YYYY-MM` - same guard as the
other payout routes (`requireAccountAccess(fromQuery)`, membership), read-only. Dollars, signed
(refunds negative), like every payout endpoint.

```
{
  month: '2026-10', asOf: '2026-10-31',
  coverage: { complete: boolean, from: '2026-09-15', missing: [{ from, to }] },
  qbo: { account: { id, name } | null, balance: number | null, message?: string },
  inTransit: { net, gifts: { count, gross, fee, net }, registrations: { count, gross, fee, net } },
  difference: number | null,
  differenceNotes: [{ kind: 'switch_over' | 'not_csp', text, amount, entries?: [{ date, type, amount, memo, docNumber }] }],
  notInQuickBooksYet: [{ day, count, gross, net }],
  items: [{ day, kind: 'gift' | 'gift_refund' | 'registration' | 'registration_refund' | 'day_unresolved',
            ref, name, fundOrEvent, gross, fee, net, paidOut: { from, to } | null }]
}
```
A month whose end is in the future reports as of today. Before the sync start date: an empty report
saying so.

## Edge cases
- Late ACH: dated its gift day; in the list once settled and posted; listed under "Not in QuickBooks
  yet" while settled but not added.
- Failed ACH after posting: Planning Center no longer lists it as succeeded; the day's posted total
  exceeds Planning Center's - shown as a day_unresolved line, never silently dropped.
- A month with no uploads at all: coverage incomplete, every posted item reads "not paid out yet".
- Pre-go-live days are not CSP's (never posted) and never appear.

## Testing
- Backend unit tests (jest), synthetic data only: the rule (paid by D / after D / never), overlapping
  uploads, range validation (straddle, future, reversed), coverage gaps, partial posting (exact subset,
  no exact subset), refunds, registrations, the QuickBooks figure and its account check.
- Real-data check outside the repo: run the computation with September's payout file as one upload
  (payouts Sep 1-30) and the donations export as the Planning Center source: expect 18 gifts / $4,689.62
  with the 9/30 ACH pending, 19 / $6,439.32 with it settled.
- Frontend: tsc, eslint, build; the page in a browser with the endpoint's answers held or replaced
  (CDP Fetch) for: complete and tied, incomplete coverage, difference with entries, empty month, error.
- Staging deploy and a click-through; production after John's OK.
