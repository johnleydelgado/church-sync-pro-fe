import React, { FC, useState } from 'react'
import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { Spinner } from 'flowbite-react'
import { Button } from '@material-tailwind/react'
import {
  HiOutlineDownload,
  HiOutlineExclamationCircle,
  HiOutlineInformationCircle,
  HiOutlineUpload,
} from 'react-icons/hi'

import {
  PayoutOutstanding,
  PayoutReportError,
  getPayoutOutstanding,
} from '@/common/api/user'
import { mainRoute } from '@/common/constant/route'
import { useChurch } from '@/common/hooks/useChurch'
import { formatDate } from '@/common/utils/helper'
import {
  IN_TRANSIT_ID,
  PAYOUT_OUTSTANDING_KEY,
  coverageWarning,
  csvFileName,
  firstStepWords,
  groupByDay,
  hasNoPayoutReports,
  inTransitSentence,
  itemCountWords,
  itemName,
  itemTotals,
  kindWords,
  lastDayOfMonth,
  localDay,
  longDay,
  monthWords,
  outstandingCsv,
  paidOutWords,
  shortDay,
  showAnywayWords,
} from './outstanding'
import { mappingLinkFor, plural, usd } from './payoutCopy'
import { usePayoutStatus } from './usePayoutStatus'

const cents = (dollars: number | null | undefined) =>
  Math.round(Number(dollars ?? 0) * 100)

/** Red for money going back out (refunds), so a negative line isn't read as a gift. */
const amountClass = (dollars: number) =>
  cents(dollars) < 0 ? 'text-red-600' : 'text-gray-700'

/**
 * Hands the browser a CSV made here, on the page. A byte-order mark first, so Excel reads
 * names with accents as UTF-8.
 */
const downloadCsv = (fileName: string, csv: string) => {
  const blob = new Blob([String.fromCharCode(0xfeff), csv], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Not straight away: some browsers still read the URL after click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** "Upload payout report", or - while the setup refuses files - what to set up and where. */
const UploadAction: FC<{ onUpload: () => void; primary?: boolean }> = ({
  onUpload,
  primary,
}) => {
  const { data: status } = usePayoutStatus()
  // Unknown readiness (still checking, or the check failed) leaves the button on: the dialog shows
  // the server's reason if it refuses the file.
  if (status && !status.ready)
    return (
      <p className="text-sm text-amber-800">
        {status.notReadyReason ||
          'Finish the registration setup on the Mapping page first.'}{' '}
        <Link
          to={mappingLinkFor(status.notReadyReason)}
          className="font-semibold underline"
        >
          Open Mapping
        </Link>
      </p>
    )
  return primary ? (
    <Button
      size="sm"
      onClick={onUpload}
      className="flex items-center gap-2 bg-yellow normal-case"
    >
      <HiOutlineUpload size={16} />
      Upload payout report
    </Button>
  ) : (
    <button
      type="button"
      onClick={onUpload}
      className="inline-flex items-center gap-2 rounded-md border border-amber-400 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
    >
      <HiOutlineUpload size={16} />
      Upload payout report
    </button>
  )
}

/**
 * Still in transit at month-end, under the monthly statement and for the same month. Every gift
 * and registration CSP put into Clearing that Stripe hadn't paid out by the month's last day,
 * tied to QuickBooks' Clearing balance on that day: the itemised backup the accountants
 * reconcile the Clearing account against. Paid-out dates come only from the payout reports
 * uploaded above, so with none the section asks for them first, and a gap in them turns the
 * total into an "up to". Plan: docs/plans/2026-10-22-outstanding-deposits.md.
 */
const OutstandingDeposits: FC<{
  /** YYYY-MM, shared with the statement's month: changing either changes both. */
  month: string
  onMonthChange: (month: string) => void
  /** Opens the payout-report upload dialog the Payout reports card uses. */
  onUpload: () => void
}> = ({ month, onMonthChange, onUpload }) => {
  const { email, churchId, church } = useChurch()
  const today = localDay(new Date())
  const monthEnd = lastDayOfMonth(month)
  // A month that hasn't ended reads as today: nothing can have been paid out "after" it yet.
  const soFar = monthEnd >= today
  // "Show the posted gifts anyway", for this month only: another month starts at the first step.
  const [shownAnywayFor, setShownAnywayFor] = useState<string | null>(null)
  const showAnyway = shownAnywayFor === month

  const { data, isLoading, isFetching, error, refetch } = useQuery<
    PayoutOutstanding,
    PayoutReportError
  >(
    [PAYOUT_OUTSTANDING_KEY, churchId, month],
    () => getPayoutOutstanding({ email, month }),
    {
      enabled: !!churchId && !!email,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      // The server's refusal (4xx) won't change by asking again; a passing hiccup might.
      retry: (failures, e) => (e?.status ?? 500) >= 500 && failures < 1,
    },
  )

  const asOf = data?.asOf ?? monthEnd
  // Only a list on show to download: not while loading, not on an error (even one that follows
  // an earlier answer), not for an empty month, not behind the "upload your reports" step.
  const canDownload =
    !!data &&
    !error &&
    !isLoading &&
    !data.message &&
    data.items.length > 0 &&
    (showAnyway || !hasNoPayoutReports(data))
  const title = soFar
    ? 'Still in transit today'
    : `Still in transit on ${longDay(asOf)}`

  return (
    <section
      id={IN_TRANSIT_ID}
      className="scroll-mt-4 pt-10 print:break-before-page print:pt-0"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 pb-4">
        <div>
          <h2 className="text-lg font-bold text-primary">{title}</h2>
          <p className="max-w-2xl pt-1 text-sm text-gray-500">
            {soFar
              ? `${monthWords(
                  month,
                )} so far: every gift and registration CSP put into Clearing that Stripe hasn't paid out yet.`
              : `Every gift and registration CSP put into Clearing by ${shortDay(
                  asOf,
                )} that Stripe hadn't paid out by then. This is the backup for the Clearing balance at month-end.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {/* The statement's month, again here so it can be changed without scrolling up. */}
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
            Month
            <input
              type="month"
              value={month}
              max={today.slice(0, 7)}
              onChange={(e) => e.target.value && onMonthChange(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-normal"
            />
          </label>
          {canDownload ? (
            <button
              type="button"
              onClick={() => {
                if (!data) return
                const name = church?.name ?? ''
                downloadCsv(
                  csvFileName(name, month),
                  outstandingCsv(name, data),
                )
              }}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <HiOutlineDownload size={16} />
              Download CSV
            </button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <p className="flex items-center gap-2 py-6 text-sm text-gray-400">
          <Spinner size="sm" />
          Working out what is still in transit
          {soFar ? ' today' : ` on ${shortDay(asOf)}`}… This can take a little
          while: CSP checks Planning Center for each day not paid out yet.
        </p>
      ) : error ? (
        <div
          role="alert"
          className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <HiOutlineExclamationCircle size={18} className="shrink-0" />
          <span className="flex-1">{error.message}</span>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 print:hidden"
          >
            {isFetching ? 'Trying again…' : 'Try again'}
          </button>
        </div>
      ) : data ? (
        <Report
          report={data}
          soFar={soFar}
          onUpload={onUpload}
          showAnyway={showAnyway}
          onShowAnyway={() => setShownAnywayFor(month)}
        />
      ) : null}
    </section>
  )
}

const Report: FC<{
  report: PayoutOutstanding
  soFar: boolean
  onUpload: () => void
  showAnyway: boolean
  onShowAnyway: () => void
}> = ({ report, soFar, onUpload, showAnyway, onShowAnyway }) => {
  const asOf = shortDay(report.asOf)
  const year = Number(report.asOf.slice(0, 4))

  // An empty report says why there is nothing (nothing posted yet, before the sync start date):
  // that reason is the whole answer, with no tie-out to show against it.
  if (report.message)
    return (
      <p className="flex items-center gap-2 py-6 text-sm text-gray-600">
        <HiOutlineInformationCircle size={18} className="shrink-0" />
        {report.message}
      </p>
    )

  const warning = coverageWarning(report.coverage, report.asOf)
  const accountName = report.qbo.account?.name || 'Clearing'
  const on = soFar ? 'today' : `on ${asOf}`
  const groups = groupByDay(report.items)
  const totals = itemTotals(report.items)
  const difference = report.difference
  const differs = difference !== null && cents(difference) !== 0

  // Useful on its own, so it stays even before any payout report is uploaded.
  const quickBooksCard = (
    <div className="rounded-xl border border-gray-100 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {accountName} in QuickBooks {on}
      </p>
      <p className="pt-1 text-xl font-bold text-primary">
        {report.qbo.balance === null ? '—' : usd(report.qbo.balance)}
      </p>
      {report.qbo.balance === null ? (
        <p className="pt-0.5 text-xs text-amber-700">
          {report.qbo.message || "QuickBooks couldn't be read just now."}
        </p>
      ) : null}
    </div>
  )

  // No payout report covers any of these dates: every posted gift would read "not paid out yet",
  // so the honest first thing to show is how to get an answer.
  if (hasNoPayoutReports(report) && !showAnyway)
    return (
      <div className="space-y-6 pt-6">
        <div className="rounded-xl border border-light-blue-200 bg-light-blue-50 p-5 text-light-blue-900">
          <p className="text-base font-semibold">{firstStepWords(report)}</p>
          <p className="pt-1 text-sm">
            CSP needs them to know which gifts and registrations Stripe has
            already paid out.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4 print:hidden">
            <UploadAction onUpload={onUpload} primary />
            {report.items.length > 0 ? (
              <button
                type="button"
                onClick={onShowAnyway}
                className="text-sm text-light-blue-800 underline hover:text-light-blue-900"
              >
                {showAnywayWords(report.items)}
              </button>
            ) : null}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3 print:grid-cols-3">
          {quickBooksCard}
        </div>
      </div>
    )

  return (
    <div className="space-y-6 pt-6">
      {warning ? (
        // Payout reports missing: the total is a ceiling, so the headline and the reason are one
        // message rather than a warning and a sentence that contradicts it.
        <div
          role="status"
          className="flex gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-900"
        >
          <HiOutlineExclamationCircle size={22} className="mt-0.5 shrink-0" />
          <div className="min-w-0 text-sm">
            <p className="text-base font-semibold">
              {inTransitSentence(report, soFar, usd)}
            </p>
            <p className="pt-1">{warning}</p>
            <div className="pt-3 print:hidden">
              <UploadAction onUpload={onUpload} />
            </div>
          </div>
        </div>
      ) : (
        <p className="text-base font-semibold text-primary">
          {inTransitSentence(report, soFar, usd)}
        </p>
      )}

      {/* The tie-out: what QuickBooks says, what this list says, and the gap between them. */}
      <div className="grid gap-4 md:grid-cols-3 print:grid-cols-3">
        {quickBooksCard}
        <div className="rounded-xl border border-gray-100 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Still in transit (this list)
          </p>
          <p className="pt-1 text-xl font-bold text-primary">
            {warning ? 'Up to ' : ''}
            {usd(report.inTransit.net)}
          </p>
          <p
            className={`pt-0.5 text-xs ${
              warning ? 'font-semibold text-amber-700' : 'text-gray-400'
            }`}
          >
            {warning
              ? 'Incomplete: payout reports are missing'
              : itemCountWords(report.items) || 'Nothing listed'}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Difference
          </p>
          <p
            className={`pt-1 text-xl font-bold ${
              differs || warning ? 'text-amber-700' : 'text-primary'
            }`}
          >
            {difference === null ? '—' : usd(difference)}
          </p>
          {/* With payout reports missing the list itself is unsettled, so even a zero difference
              proves nothing yet. */}
          <p
            className={`pt-0.5 text-xs ${
              warning ? 'font-semibold text-amber-700' : 'text-gray-400'
            }`}
          >
            {warning
              ? 'Not final: payout reports are missing'
              : difference === null
              ? 'Needs the QuickBooks balance'
              : !differs
              ? 'QuickBooks and this list agree'
              : difference > 0
              ? `QuickBooks holds ${usd(difference)} more than this list`
              : `QuickBooks holds ${usd(-difference)} less than this list`}
          </p>
        </div>
      </div>

      {/* The server's notes always; "CSP can't say why" only once the list is settled - with
          payout reports missing the gap is mostly those reports, not something to look for. */}
      {report.differenceNotes.length > 0 || (differs && !warning) ? (
        <DifferenceNotes report={report} />
      ) : null}

      {report.notInQuickBooksYet.length > 0 ? (
        <NotInQuickBooksYet days={report.notInQuickBooksYet} />
      ) : null}

      {groups.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-gray-100 print:overflow-visible print:rounded-none print:border-0">
          <table className="w-full min-w-[56rem] text-sm print:min-w-0 print:text-xs">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left print:px-2">Kind</th>
                <th className="px-4 py-3 text-left print:px-2">
                  Donor or registrant
                </th>
                <th className="px-4 py-3 text-left print:px-2">
                  Fund or event
                </th>
                <th className="px-4 py-3 text-right print:px-2">Gross</th>
                <th className="px-4 py-3 text-right print:px-2">Fee</th>
                <th className="px-4 py-3 text-right print:px-2">Net</th>
                <th className="px-4 py-3 text-left print:px-2">Paid out</th>
              </tr>
            </thead>
            {groups.map((group) => (
              <tbody key={group.day} className="border-t border-gray-200">
                <tr className="break-inside-avoid break-after-avoid bg-slate-50/60">
                  <td
                    colSpan={5}
                    className="px-4 py-2 font-semibold text-primary print:px-2"
                  >
                    {formatDate(group.day)}
                    <span className="font-normal text-gray-400">
                      {' '}
                      · {plural(group.items.length, 'item', 'items')}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-right font-semibold tabular-nums text-primary print:px-2">
                    {usd(group.net)}
                  </td>
                  <td />
                </tr>
                {group.items.map((item, index) => (
                  <tr
                    key={`${item.ref}-${index}`}
                    className={`break-inside-avoid border-t border-gray-50 ${
                      item.kind === 'day_unresolved'
                        ? 'bg-amber-50/60 italic'
                        : ''
                    }`}
                  >
                    <td className="px-4 py-2 whitespace-nowrap text-gray-600 print:px-2">
                      {kindWords(item.kind)}
                    </td>
                    <td className="px-4 py-2 text-gray-700 print:px-2">
                      {itemName(item) || '—'}
                    </td>
                    <td className="px-4 py-2 text-gray-600 print:px-2">
                      {item.fundOrEvent?.trim() || '—'}
                    </td>
                    <td
                      className={`px-4 py-2 whitespace-nowrap text-right tabular-nums print:px-2 ${amountClass(
                        item.gross,
                      )}`}
                    >
                      {usd(item.gross)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right tabular-nums text-gray-500 print:px-2">
                      {usd(item.fee)}
                    </td>
                    <td
                      className={`px-4 py-2 whitespace-nowrap text-right font-medium tabular-nums print:px-2 ${amountClass(
                        item.net,
                      )}`}
                    >
                      {usd(item.net)}
                    </td>
                    <td className="px-4 py-2 text-gray-500 print:px-2">
                      {paidOutWords(item.paidOut, year)}
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
            {/* A plain last row, not <tfoot>: printing repeats a tfoot at the foot of every page,
                where it reads like a page subtotal. */}
            <tbody className="break-inside-avoid border-t-2 bg-slate-50 font-semibold">
              <tr>
                <td className="px-4 py-3 print:px-2" colSpan={3}>
                  Totals · {plural(totals.count, 'item', 'items')}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums print:px-2">
                  {usd(totals.gross)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums print:px-2">
                  {usd(totals.fee)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums print:px-2">
                  {usd(totals.net)}
                </td>
                <td className="px-4 py-3 print:px-2" />
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="text-xs text-gray-400">
        When each item was paid out comes from the payout dates given with each
        uploaded payout report. An item in no uploaded report counts as not paid
        out yet.
      </p>
    </div>
  )
}

/** Why QuickBooks and the list differ, where CSP knows - with the QuickBooks entries behind it. */
const DifferenceNotes: FC<{ report: PayoutOutstanding }> = ({ report }) => (
  <div className="break-inside-avoid rounded-xl border border-gray-200 p-4 text-sm">
    <p className="font-semibold text-gray-800">Why they differ</p>
    {report.differenceNotes.length === 0 ? (
      <p className="pt-1 text-gray-600">
        CSP can&apos;t say why. Look in QuickBooks for entries in the Clearing
        account dated on or before {shortDay(report.asOf)} that CSP didn&apos;t
        make.
      </p>
    ) : (
      <ul className="space-y-3 pt-1">
        {report.differenceNotes.map((note, index) => (
          <li key={`${note.kind}-${index}`}>
            <p className="flex flex-wrap justify-between gap-x-4 text-gray-700">
              <span>{note.text}</span>
              <span className="whitespace-nowrap font-semibold tabular-nums">
                {usd(note.amount)}
              </span>
            </p>
            {note.entries && note.entries.length > 0 ? (
              <div className="mt-2 overflow-x-auto print:overflow-visible">
                <table className="w-full min-w-[28rem] text-xs print:min-w-0">
                  <thead className="text-left uppercase tracking-wide text-gray-400">
                    <tr>
                      <th className="py-1 pr-3">Date</th>
                      <th className="py-1 pr-3">Type</th>
                      <th className="py-1 pr-3">No.</th>
                      <th className="py-1 pr-3">Memo</th>
                      <th className="py-1 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {note.entries.map((entry, entryIndex) => (
                      <tr
                        key={`${entry.date}-${entry.docNumber}-${entryIndex}`}
                        className="break-inside-avoid border-t border-gray-100 text-gray-600"
                      >
                        <td className="py-1 pr-3 whitespace-nowrap">
                          {formatDate(entry.date)}
                        </td>
                        <td className="py-1 pr-3">{entry.type}</td>
                        <td className="py-1 pr-3 font-mono">
                          {entry.docNumber || '—'}
                        </td>
                        <td className="py-1 pr-3">{entry.memo || '—'}</td>
                        <td className="py-1 whitespace-nowrap text-right tabular-nums">
                          {usd(entry.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    )}
  </div>
)

/** Settled giving CSP hasn't posted: not in Clearing, so not listed - but the balance will move. */
const NotInQuickBooksYet: FC<{
  days: PayoutOutstanding['notInQuickBooksYet']
}> = ({ days }) => {
  const net = days.reduce((total, day) => total + cents(day.net), 0) / 100
  return (
    <div className="break-inside-avoid rounded-xl border border-light-blue-200 bg-light-blue-50 p-4 text-sm text-light-blue-900">
      <p className="flex items-center gap-2 font-semibold">
        <HiOutlineInformationCircle size={18} className="shrink-0" />
        Not in QuickBooks yet
      </p>
      <p className="pt-1">
        This giving has settled but CSP hasn&apos;t posted it, so it isn&apos;t
        in Clearing or in this list. When it is added, the Clearing balance goes
        up by {usd(net)}.
      </p>
      <ul className="list-disc space-y-0.5 pl-9 pt-1">
        {days.map((day) => (
          <li key={day.day}>
            {formatDate(day.day)}: {plural(day.count, 'gift', 'gifts')},{' '}
            {usd(day.gross)} given, {usd(day.net)} to Clearing
          </li>
        ))}
      </ul>
      <p className="pt-2 print:hidden">
        Add it on{' '}
        <Link to={mainRoute.TRANSACTION} className="font-semibold underline">
          Daily Giving
        </Link>
        .
      </p>
    </div>
  )
}

export default OutstandingDeposits
