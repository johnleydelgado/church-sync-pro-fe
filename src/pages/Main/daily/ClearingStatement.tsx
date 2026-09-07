import { ClearingStatementData, getClearingStatement } from '@/common/api/user'
import { formatDate } from '@/common/utils/helper'
import { RootState } from '@/redux/store'
import { FormatMoney } from 'format-money-js'
import React, { FC, useState } from 'react'
import { useQuery } from 'react-query'
import { useSelector } from 'react-redux'
import { HiOutlinePrinter, HiOutlineQuestionMarkCircle } from 'react-icons/hi'
import { Tooltip } from '@material-tailwind/react'

// The endpoint returns dollars, so format directly (see DailyJournalEntries).
const fm = new FormatMoney({ decimals: 2 })
const usd = (n: number | null | undefined) =>
  fm.from(Number(n ?? 0), { symbol: '$ ' })?.toString() || '$ 0.00'

const thisMonth = () => new Date().toISOString().slice(0, 7)

/**
 * Monthly clearing-account statement. This is what the client's accounting team
 * reconciles against at month end: every line is something Church Sync Pro posted,
 * with the QuickBooks entry and Planning Center batch behind it. The closing
 * figure is CSP's cumulative additions; the live QuickBooks balance is shown next
 * to it so deposits already reconciled out of clearing are visible as the difference.
 */
const ClearingStatement: FC = () => {
  const { user } = useSelector((state: RootState) => state.common)
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const [month, setMonth] = useState<string>(thisMonth())

  const email =
    user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email

  const { data, isLoading } = useQuery<ClearingStatementData | null>(
    ['getClearingStatement', email, month],
    async () => (email ? await getClearingStatement(email, month) : null),
    { staleTime: 60_000, refetchOnWindowFocus: false, enabled: !!email },
  )

  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  return (
    <section className="statement pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 pb-4">
        <div>
          <h2 className="text-lg font-bold text-primary">Clearing account statement</h2>
          <p className="max-w-2xl pt-1 text-sm text-gray-500">
            Everything Church Sync Pro posted to
            {data?.clearingAccount?.name ? ` ${data.clearingAccount.name}` : ' your clearing account'}
            {' '}this month, with the QuickBooks entry behind each line. Reconcile it against the
            account&apos;s activity in QuickBooks at month end.
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <input
            type="month"
            value={month}
            max={thisMonth()}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            aria-label="Statement month"
          />
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <HiOutlinePrinter size={16} />
            Print / save as PDF
          </button>
        </div>
      </div>

      {isLoading || !data ? (
        <p className="py-6 text-sm text-gray-400">Loading {monthLabel}…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 py-6 md:grid-cols-4">
            <div className="rounded-xl border border-gray-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Opening</p>
              <p className="pt-1 text-xl font-bold text-primary">{usd(data.opening)}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Net added in {monthLabel.split(' ')[0]}</p>
              <p className="pt-1 text-xl font-bold text-success">{usd(data.totals.net)}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Closing (posted by CSP)</p>
              <p className="pt-1 text-xl font-bold text-primary">{usd(data.closing)}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-slate-50 p-4">
              <div className="flex items-center gap-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">In QuickBooks now</p>
                <Tooltip
                  content="The clearing account's live balance in QuickBooks. It is lower than CSP's closing figure by whatever your team has already reconciled against bank deposits."
                  className="max-w-xs bg-gray-800 text-xs"
                >
                  <span><HiOutlineQuestionMarkCircle size={14} className="text-gray-400" /></span>
                </Tooltip>
              </div>
              <p className="pt-1 text-xl font-bold text-primary">
                {data.qboBalance === null ? '—' : usd(data.qboBalance)}
              </p>
              {data.difference !== null ? (
                <p className="pt-0.5 text-xs text-gray-400">{usd(data.difference)} already reconciled</p>
              ) : (
                <p className="pt-0.5 text-xs text-gray-400">Not readable from QuickBooks</p>
              )}
            </div>
          </div>

          {data.lines.length === 0 ? (
            <p className="py-4 text-sm text-gray-400">Nothing was posted in {monthLabel}.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full min-w-[46rem] text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-right">Giving</th>
                    <th className="px-4 py-3 text-right">Fees</th>
                    <th className="px-4 py-3 text-right">Refunds</th>
                    <th className="px-4 py-3 text-right">Net to clearing</th>
                    <th className="px-4 py-3 text-right">Running balance</th>
                    <th className="px-4 py-3 text-left">QuickBooks entries</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.map((l) => (
                    <tr key={l.date} className="border-t border-gray-100">
                      <td className="px-4 py-2 font-medium text-primary">{formatDate(l.date)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-success">{usd(l.gross)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-gray-500">{usd(l.fees)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-red-600">
                        {l.refundsGross ? `−${usd(l.refundsGross)}` : '—'}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium text-primary">{usd(l.net)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-gray-600">{usd(l.runningBalance)}</td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-500">
                        {l.qboEntryIds.length ? `#${l.qboEntryIds.join(', #')}` : '—'}
                        {l.batchIds.length ? <span className="text-gray-300"> · PCO {l.batchIds.join(', ')}</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 bg-slate-50 font-semibold">
                  <tr>
                    <td className="px-4 py-3">Totals</td>
                    <td className="px-4 py-3 text-right tabular-nums">{usd(data.totals.gross)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{usd(data.totals.fees)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{data.totals.refundsGross ? `−${usd(data.totals.refundsGross)}` : '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{usd(data.totals.net)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{usd(data.closing)}</td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <p className="pt-3 text-xs text-gray-400">
            Generated {new Date(data.generatedAt).toLocaleString()}. Figures are what Church Sync Pro posted;
            the QuickBooks balance is read live and includes any reconciliation your team has done.
          </p>
        </>
      )}
    </section>
  )
}

export default ClearingStatement
