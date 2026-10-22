/*
 * Still in transit at month-end: the words and the CSV, kept free of React and of `@/` imports
 * (types only) so they can be unit-tested on their own. Every amount is DOLLARS, signed - the
 * payout-report endpoints' unit. Days are YYYY-MM-DD and are compared as strings.
 */
import type {
  PayoutDayRange,
  PayoutOutstanding,
  PayoutOutstandingItem,
} from '@/common/api/user'

/** `[PAYOUT_OUTSTANDING_KEY, churchId, month]`: the report for one church and month. */
export const PAYOUT_OUTSTANDING_KEY = 'payoutOutstanding'

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const pad = (n: number) => String(n).padStart(2, '0')

/** Year, month (1-12) and day of a YYYY-MM-DD string, without a time zone getting involved. */
const parts = (day: string) => {
  const [y, m, d] = day.split('-').map(Number)
  return { y: y ?? 0, m: m ?? 1, d: d ?? 1 }
}

/** A Date as YYYY-MM-DD in the browser's own time zone (toISOString would give UTC's day). */
export const localDay = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** "2026-02" -> "2026-02-28". */
export const lastDayOfMonth = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  return `${month}-${pad(new Date(y ?? 0, m ?? 1, 0).getDate())}`
}

/** The calendar month before `now`: what an upload's payout dates start as. */
export const previousMonthRange = (now: Date): PayoutDayRange => ({
  from: localDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
  to: localDay(new Date(now.getFullYear(), now.getMonth(), 0)),
})

const isRealDay = (day: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false
  const { y, m, d } = parts(day)
  const date = new Date(y, m - 1, d)
  return date.getMonth() === m - 1 && date.getDate() === d
}

/** "Sep 15", or "Sep 15, 2025" when `year` is given and differs. */
export const shortDay = (day: string, year?: number) => {
  const { y, m, d } = parts(day)
  const label = `${MONTHS_SHORT[m - 1] ?? ''} ${d}`
  return year !== undefined && y !== year ? `${label}, ${y}` : label
}

/** "September 30, 2026". */
export const longDay = (day: string) => {
  const { y, m, d } = parts(day)
  return `${MONTHS_LONG[m - 1] ?? ''} ${d}, ${y}`
}

/** "October 2026", from YYYY-MM. */
export const monthWords = (month: string) => {
  const { y, m } = parts(`${month}-01`)
  return `${MONTHS_LONG[m - 1] ?? ''} ${y}`
}

/**
 * A span of days in words: "Sep 15 – Sep 30", or "Sep 15" for one day. `compact` drops the
 * repeated month inside one month ("Oct 1 – 31"). Years show only where they differ from `year`.
 */
export const rangeWords = (
  range: PayoutDayRange,
  { year, compact = false }: { year?: number; compact?: boolean } = {},
) => {
  if (range.from === range.to) return shortDay(range.from, year)
  const from = parts(range.from)
  const to = parts(range.to)
  const sameMonth = from.y === to.y && from.m === to.m
  // A span that crosses a year names both years, or neither side reads right on its own.
  const yearOf = from.y === to.y ? year : -1
  if (compact && sameMonth) return `${shortDay(range.from, yearOf)} – ${to.d}`
  return `${shortDay(range.from, yearOf)} – ${shortDay(range.to, yearOf)}`
}

/** "A", "A and B", "A, B and C". */
export const listWords = (items: string[]) =>
  items.length <= 1
    ? items[0] ?? ''
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`

/** "1 gift" / "3 gifts". */
const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`

/**
 * Why a payout range can't go with an upload, in the upload's words; null when it can. The
 * server checks the same things and its message is shown as-is if it still refuses.
 */
export const payoutRangeProblem = (
  from: string,
  to: string,
  today: string,
): string | null => {
  if (!from || !to)
    return 'Enter both payout dates: the first and the last payout day in the file.'
  if (!isRealDay(from) || !isRealDay(to))
    return 'Enter each payout date as a full date.'
  if (from > to) return 'The “from” date is after the “to” date.'
  if (to > today)
    return 'The “to” date is in the future. Pick payout dates that have already happened.'
  if (from.slice(0, 7) !== to.slice(0, 7))
    return `One file can't cover two months. Split it at the month-end: CSP can't tell which side of ${shortDay(
      lastDayOfMonth(from.slice(0, 7)),
    )} each row falls on.`
  return null
}

/**
 * The coverage warning, or null when the uploaded payout dates cover every day: "Payout reports
 * for Sep 15 – Sep 30 haven't been uploaded, so this total is incomplete."
 */
export const coverageWarning = (
  coverage: PayoutOutstanding['coverage'],
  asOf: string,
): string | null => {
  if (coverage.complete) return null
  const year = parts(asOf).y
  const missing = (coverage.missing ?? []).map((range) =>
    rangeWords(range, { year }),
  )
  if (missing.length === 0)
    return `The payout reports uploaded don't cover every day up to ${shortDay(
      asOf,
      year,
    )}, so this total is incomplete.`
  return `Payout reports for ${listWords(
    missing,
  )} haven't been uploaded, so this total is incomplete.`
}

/** True when the whole month is before the church's sync start date: CSP put nothing in then. */
export const isBeforeSyncStart = (report: PayoutOutstanding) =>
  !!report.coverage.from && report.coverage.from > report.asOf

const KIND_WORDS: Record<string, string> = {
  gift: 'Gift',
  gift_refund: 'Gift refund',
  registration: 'Registration',
  registration_refund: 'Registration refund',
  day_unresolved: "Can't tell which gifts",
}

/** A kind the page doesn't know is still shown, never dropped. */
export const kindWords = (kind: string) =>
  KIND_WORDS[kind] ?? kind.replace(/_/g, ' ')

/** "Paid out in payouts of Oct 1 – 31", or "Not paid out yet". */
export const paidOutWords = (paidOut: PayoutDayRange | null, year?: number) =>
  paidOut
    ? `Paid out in payouts of ${rangeWords(paidOut, { year, compact: true })}`
    : 'Not paid out yet'

/**
 * The report's one sentence. Past month: "$X was still in transit on Sep 30: 19 gifts and 2
 * registrations that Stripe paid out after Sep 30 (or hasn't paid out yet)." A month still
 * running reads as today ("so far"), when nothing can have been paid out after it yet.
 */
export const inTransitSentence = (
  report: PayoutOutstanding,
  soFar: boolean,
  money: (dollars: number) => string,
) => {
  const year = parts(report.asOf).y
  const asOf = shortDay(report.asOf, year)
  const { gifts, registrations } = report.inTransit
  if (report.items.length === 0 && cents(report.inTransit.net) === 0)
    return soFar
      ? 'Nothing is in transit today: Stripe has paid out everything CSP put into Clearing.'
      : `Nothing was in transit on ${asOf}: Stripe had paid out everything CSP put into Clearing by then.`
  const what =
    listWords(
      [
        gifts.count > 0 ? plural(gifts.count, 'gift', 'gifts') : '',
        registrations.count > 0
          ? plural(registrations.count, 'registration', 'registrations')
          : '',
      ].filter(Boolean),
    ) || plural(report.items.length, 'item', 'items')
  return soFar
    ? `${money(
        report.inTransit.net,
      )} is still in transit today: ${what} that Stripe hasn't paid out yet.`
    : `${money(
        report.inTransit.net,
      )} was still in transit on ${asOf}: ${what} that Stripe paid out after ${asOf} (or hasn't paid out yet).`
}

const cents = (dollars: number) => Math.round(Number(dollars ?? 0) * 100)

/** Sums in whole cents, so a long list doesn't pick up floating-point pennies. */
export const itemTotals = (items: PayoutOutstandingItem[]) => {
  const sum = (pick: (item: PayoutOutstandingItem) => number) =>
    items.reduce((total, item) => total + cents(pick(item)), 0) / 100
  return {
    count: items.length,
    gross: sum((item) => item.gross),
    fee: sum((item) => item.fee),
    net: sum((item) => item.net),
  }
}

/** The list grouped by day, oldest first; each day keeps the server's order inside it. */
export const groupByDay = (items: PayoutOutstandingItem[]) => {
  const days = new Map<string, PayoutOutstandingItem[]>()
  items.forEach((item) => {
    const list = days.get(item.day)
    if (list) list.push(item)
    else days.set(item.day, [item])
  })
  return Array.from(days.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([day, dayItems]) => ({
      day,
      items: dayItems,
      net: itemTotals(dayItems).net,
    }))
}

/* --- CSV --- */

/** Two decimals, no symbol or thousands separator, so a spreadsheet reads it as a number. */
const amount = (dollars: number) => (cents(dollars) / 100).toFixed(2)

/**
 * One CSV cell. Quoted when it holds a comma, quote or line break (quotes doubled), and text
 * that a spreadsheet would run as a formula (=, +, -, @ first) is prefixed with ' - names come
 * from Planning Center and are typed by donors.
 */
export const csvCell = (value: string | null | undefined) => {
  let text = value ?? ''
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) || text !== text.trim()
    ? `"${text.replace(/"/g, '""')}"`
    : text
}

const csvLine = (cells: (string | null | undefined)[]) =>
  cells.map(csvCell).join(',')

export const CSV_COLUMNS = [
  'Day',
  'Kind',
  'Ref',
  'Name',
  'Fund or event',
  'Gross',
  'Fee',
  'Net',
  'Paid out from',
  'Paid out to',
]

/**
 * The list as CSV: a header line naming the church, month and totals, a blank line, then one row
 * per item, oldest day first. Amounts are cells of their own, never quoted or prefixed.
 */
export const outstandingCsv = (
  churchName: string,
  report: PayoutOutstanding,
) => {
  const totals = itemTotals(report.items)
  const warning = coverageWarning(report.coverage, report.asOf)
  const header = [
    csvLine(['Church', churchName, 'Month', report.month]),
    csvLine(['As of', report.asOf, 'Items', String(totals.count)]),
    `Gross,${amount(totals.gross)},Fee,${amount(totals.fee)},Net,${amount(
      totals.net,
    )}`,
    csvLine(['Coverage', warning ? `Incomplete. ${warning}` : 'Complete']),
  ].join(',')
  const rows = groupByDay(report.items).flatMap((group) =>
    group.items.map((item) =>
      [
        csvLine([
          item.day,
          kindWords(item.kind),
          item.ref,
          item.name,
          item.fundOrEvent,
        ]),
        amount(item.gross),
        amount(item.fee),
        amount(item.net),
        csvLine([item.paidOut?.from, item.paidOut?.to]),
      ].join(','),
    ),
  )
  return [header, '', csvLine(CSV_COLUMNS), ...rows].join('\r\n') + '\r\n'
}

/** "in-transit-active-church-2026-09.csv". */
export const csvFileName = (churchName: string, month: string) => {
  const slug =
    churchName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'church'
  return `in-transit-${slug}-${month}.csv`
}
