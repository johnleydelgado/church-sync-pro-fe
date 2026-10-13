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
  not_in_planning_center: "Planning Center doesn't list this gift on that day",
  planning_center_unreachable: "Couldn't reach Planning Center to check",
  posting_interrupted:
    'Posting was interrupted — check QuickBooks for this entry',
}

/** A code the page doesn't know is still shown: an odd line must never pass quietly. */
export const reasonWords = (code: string | null | undefined) =>
  code ? REASON_WORDS[code] ?? code.replace(/_/g, ' ') : ''

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
