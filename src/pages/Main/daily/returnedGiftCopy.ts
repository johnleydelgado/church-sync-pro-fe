import { FormatMoney } from 'format-money-js'

// A gift the donor's bank returned, in words, with exactly what to book. No `@/` imports at run
// time, so CRA's jest loads this file without an alias mapper (tests: returnedGiftCopy.test.ts).
// Every amount is in DOLLARS, like the rest of the payout-report pages.
// docs/plans/2026-11-10-payout-bounces.md

const fm = new FormatMoney({ decimals: 2 })
const usd = (n: number) =>
  fm.from(Number(n), { symbol: '$ ' })?.toString() || '$ 0.00'
const cents = (n: number) => Math.round(Number(n) * 100)
const fromCents = (c: number) => c / 100

/** "2026-10-05" -> "10/5/2026", as the app's formatDate shows days. */
const day = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return `${m}/${d}/${y}`
}

/** The states of a gift the donor's bank returned (a review-list reason or a summary `state`). */
export const RETURNED_STATES = [
  'returned_gift',
  'returned_after_posting',
  'returned_day_unsettled',
]

export interface ReturnedGiftFacts {
  state: string
  /** The gift's amount (its charge's gross) and the Stripe fee on that charge. */
  gift: number
  /** Unknown (absent) from an older backend: the exact entry then waits. */
  fee?: number | null
  returnedOn: string | null
  /** What the return cost (positive) or gave back (negative); null until it is uploaded. */
  cost: number | null
}

/** The entry that books what a never-posted returned gift cost. */
const costEntry = (cost: number, on: string) =>
  cost > 0
    ? `book the ${usd(
        cost,
      )} it cost: debit your Stripe fees account, credit Clearing, dated ${day(
        on,
      )}`
    : `book the ${usd(
        -cost,
      )} it gave back: debit Clearing, credit your Stripe fees account, dated ${day(
        on,
      )}`

/**
 * What happened to a returned gift and exactly what to book. CSP posts nothing for it.
 * - never in QuickBooks: book only what the return cost;
 * - posted before it came back: one entry that takes the gift out and books the cost together
 *   (taking the gift out alone, then booking the cost, would count its original fee twice);
 * - its day not fully posted: CSP can't tell yet.
 */
export const returnedGiftWords = (g: ReturnedGiftFacts): string => {
  const on = g.returnedOn ? ` on ${day(g.returnedOn)}` : ''
  if (g.state === 'returned_day_unsettled')
    return `The donor's bank returned this gift${on}, but its day isn't fully in QuickBooks yet, so CSP can't tell whether it was posted. Bring the day up to date on Daily Giving, then press Check again.`

  if (g.state === 'returned_after_posting') {
    const lead = `The donor's bank returned this gift${on} after CSP had posted it, so QuickBooks still has it.`
    if (
      g.cost === null ||
      !g.returnedOn ||
      typeof g.fee !== 'number' ||
      Number.isNaN(g.fee)
    )
      return `${lead} Once the payout report with the return is uploaded, this shows the exact entry to add; then mark it handled.`
    // Reverse the gift (income, its fee, its net in Clearing) and book the cost, as one entry.
    const feeCents = cents(g.cost) - cents(g.fee)
    const clearingCents = cents(g.gift) - cents(g.fee) + cents(g.cost)
    const fees =
      feeCents === 0
        ? ''
        : feeCents > 0
        ? `, debit your Stripe fees account ${usd(fromCents(feeCents))}`
        : `, credit your Stripe fees account ${usd(fromCents(-feeCents))}`
    return `${lead} Add one entry dated ${day(
      g.returnedOn,
    )}: debit the gift's income account ${usd(
      g.gift,
    )}${fees}, credit Clearing ${usd(
      fromCents(clearingCents),
    )}. Then mark it handled.`
  }

  const lead = `The donor's bank returned this gift${on}, so it was never in QuickBooks.`
  if (g.cost === null || !g.returnedOn)
    return `${lead} What the return cost will show once the payout report with the return is uploaded; book it then and mark it handled.`
  if (cents(g.cost) === 0)
    return `${lead} The return cost nothing in fees, so there's nothing to book. Mark it handled.`
  return `${lead} To settle it, ${costEntry(
    g.cost,
    g.returnedOn,
  )}. Then mark it handled.`
}
