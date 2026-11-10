import { FormatMoney } from 'format-money-js'
import { mainRoute } from '@/common/constant/route'
import { formatDate } from '@/common/utils/helper'

// Every payout-report endpoint returns DOLLARS (signed: refunds negative), like the rest of this
// page - so format dollars directly. NOT helper.formatUsd, which divides by 100.
const fm = new FormatMoney({ decimals: 2 })
export const usd = (n: number | null | undefined) =>
  fm.from(Number(n ?? 0), { symbol: '$ ' })?.toString() || '$ 0.00'

/** Why the backend held a payout-report line, in the words the page shows. */
const REASON_WORDS: Record<string, string> = {
  unrecognised_type:
    "Planning Center listed a transaction type CSP doesn't know",
  unrecognised_source: 'Not from Giving or Registrations',
  amounts_do_not_add_up: "Gross minus fee doesn't equal net",
  unexpected_sign: 'A charge below zero, or a refund above zero',
  refund_with_fee: 'A refund that returns a fee',
  no_account_mapped: 'No income account set for this event',
  day_not_posted: "That day isn't in QuickBooks yet",
  day_partly_posted: 'That day is only partly in QuickBooks',
  not_in_planning_center:
    "Planning Center doesn't list this gift on or around that day",
  returned_gift:
    "The donor's bank returned this gift, so it was never in QuickBooks. Book what it cost in fees, then mark it handled",
  returned_after_posting:
    "The donor's bank returned this gift after CSP posted it, so QuickBooks still has it. Take it out of QuickBooks and book what it cost in fees, then mark it handled",
  returned_day_unsettled:
    "The donor's bank returned this gift, but its day isn't fully in QuickBooks yet, so CSP can't tell whether it was posted. Bring the day up to date on Daily Giving, then press Check again",
  returned_without_charge:
    "Part of a gift the donor's bank returned, but the gift isn't in any payout report you've uploaded. Upload that report, or book this yourself and mark it handled",
  returned_unconfirmed:
    "Looks like a returned gift, but Planning Center doesn't show the gift as returned. Check it in Planning Center",
  returned_ambiguous:
    'Part of a returned gift, but more than one gift matches it. Book it yourself, then mark it handled',
  planning_center_unreachable: "Couldn't reach Planning Center to check",
  posting_interrupted:
    'Posting was interrupted — check QuickBooks for this entry',
}

/** The states of a gift the donor's bank returned (a review-list reason or a summary `state`). */
export const RETURNED_STATES = [
  'returned_gift',
  'returned_after_posting',
  'returned_day_unsettled',
]

/**
 * A gift the donor's bank returned, in full: what happened and exactly what to book. CSP posts nothing
 * for it (docs/plans/2026-11-10-payout-bounces.md). `cost` is in dollars, positive = a cost.
 */
export const returnedGiftWords = (g: {
  state: string
  returnedOn: string | null
  cost: number | null
}) => {
  const on = g.returnedOn ? ` on ${formatDate(g.returnedOn)}` : ''
  const book =
    g.cost !== null && g.returnedOn
      ? `book the ${usd(
          g.cost,
        )} it cost in fees (debit bank fees, credit Clearing, dated ${formatDate(
          g.returnedOn,
        )})`
      : 'book what it cost in fees once the payout report with the return is uploaded'
  if (g.state === 'returned_after_posting')
    return `The donor's bank returned this gift${on} after CSP had posted it, so QuickBooks still has it. Take the gift out of QuickBooks and ${book}, then mark it handled.`
  if (g.state === 'returned_day_unsettled')
    return `The donor's bank returned this gift${on}, but its day isn't fully in QuickBooks yet, so CSP can't tell whether it was posted. Bring the day up to date on Daily Giving, then press Check again.`
  return `The donor's bank returned this gift${on}, so it was never in QuickBooks. To settle it, ${book}, then mark it handled.`
}

/** A code the page doesn't know is still shown: an odd line must never pass quietly. */
export const reasonWords = (code: string | null | undefined) =>
  code ? REASON_WORDS[code] ?? code.replace(/_/g, ' ') : ''

/** The review list's element id, so the card's "need review" line can take the reader there. */
export const PAYOUT_REVIEW_ID = 'payout-review'

/** "1 line" / "3 lines". */
export const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`

/**
 * The Mapping tab that fixes a missing setup step. The server names the tab in its message
 * ("Choose the clearing account on Mapping → Bank first."): clearing and fee accounts live on
 * Bank (tab 3), the start date and event accounts on Registration (tab 2).
 */
export const mappingLinkFor = (setupMessage: string | null | undefined) =>
  `${mainRoute.AUTOMATION_MAPPING}?tab=${
    /bank|clearing|fee/i.test(setupMessage ?? '') ? 3 : 2
  }`

/** "10/1/2026–10/9/2026", or a single date when the range is one day. */
export const dayRange = (
  first: string | null | undefined,
  last: string | null | undefined,
) => {
  if (first && last && first !== last)
    return `${formatDate(first)}–${formatDate(last)}`
  return formatDate(first || last || '')
}
