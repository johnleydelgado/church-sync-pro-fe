import MainLayout from '@/common/components/main-layout/MainLayout'
import Loading from '@/common/components/loading/Loading'
import Empty from '@/common/components/empty/Empty'
import {
  DailyJournalEntry,
  getDailyJournalEntries,
} from '@/common/api/user'
import { mainRoute } from '@/common/constant/route'
import { formatDate } from '@/common/utils/helper'
import { RootState } from '@/redux/store'
import { FormatMoney } from 'format-money-js'
import React, { FC, useState } from 'react'
import { useQuery } from 'react-query'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Tooltip } from '@material-tailwind/react'
import ClearingStatement from './ClearingStatement'
import { BiCalendarCheck } from 'react-icons/bi'
import {
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineExclamationCircle,
  HiChevronDown,
  HiChevronUp,
  HiOutlineQuestionMarkCircle,
} from 'react-icons/hi'

interface DailyJournalEntriesProps {}

// NOTE: the backend contract returns dollars (not cents), so we format
// dollars directly here rather than reusing helper.formatUsd which divides by 100.
const fm = new FormatMoney({ decimals: 2 })
const formatUsd = (amount: number | undefined | null) =>
  fm.from(Number(amount ?? 0), { symbol: '$ ' })?.toString() || '$ 0.00'

const formatRelative = (dateString: string | null) => {
  if (!dateString) return null
  const then = new Date(dateString).getTime()
  if (Number.isNaN(then)) return null
  const diffMs = Date.now() - then
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
  return formatDate(dateString)
}

const StatusBadge: FC<{ status: string }> = ({ status }) => {
  const normalized = (status || '').toLowerCase()
  if (normalized === 'posted') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
        <HiOutlineCheckCircle size={16} />
        Posted
      </span>
    )
  }
  if (normalized === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600">
        <HiOutlineExclamationCircle size={16} />
        Failed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">
      <HiOutlineClock size={16} />
      {normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Pending'}
    </span>
  )
}

const DailyJournalEntries: FC<DailyJournalEntriesProps> = () => {
  const { user } = useSelector((state: RootState) => state.common)
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const reduxQboData = useSelector(
    (state: RootState) => state.qboData.reduxQboData,
  )

  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const accountNameByRef = (accountRef: string) => {
    const account = reduxQboData?.accounts?.find(
      (acc) => acc.value === accountRef || acc.label === accountRef,
    )
    return account?.label || 'Revenue account'
  }

  const { data, isLoading } = useQuery(
    ['getDailyJournalEntries', user, bookkeeper],
    async () => {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      if (email) return await getDailyJournalEntries(email)
      return null
    },
    { staleTime: Infinity, refetchOnWindowFocus: false },
  )

  const automation = data?.automation
  const entries: DailyJournalEntry[] = data?.entries || []
  const isAutoOn = !!automation?.isEnabled
  const lastRun = formatRelative(automation?.lastRunAt || null)

  return (
    <MainLayout>
      <div className="flex h-full gap-4">
        <div className="w-screen rounded-lg bg-white p-8">
          {/* Header */}
          <div className="border-b-2 pb-4">
            <div className="flex items-center gap-2">
              <BiCalendarCheck size={28} className="text-blue-400" />
              <span className="text-lg font-bold text-primary">
                Daily Journal Entries
              </span>
            </div>
            <p className="max-w-3xl pt-1 text-sm text-gray-500">
              Each day we post one entry to QuickBooks for your Stripe online
              giving — crediting your revenue, and debiting Stripe fees and a
              clearing account for the deposit that&apos;s on its way.
            </p>
          </div>

          {isLoading ? (
            <div className="flex h-96 items-center justify-center">
              <Loading />
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 gap-4 py-6 md:grid-cols-2">
                {/* Stripe clearing balance */}
                <div className="rounded-xl border border-gray-100 bg-slate-50 p-6">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-semibold text-gray-500">
                      Stripe Clearing balance
                    </p>
                    <Tooltip
                      content="Money Stripe has collected from online giving that hasn't landed in your bank account yet. Once the deposit arrives, this clears."
                      className="max-w-xs bg-gray-800 text-xs"
                    >
                      <span>
                        <HiOutlineQuestionMarkCircle
                          size={16}
                          className="text-gray-400"
                        />
                      </span>
                    </Tooltip>
                  </div>
                  <p className="pt-2 text-3xl font-bold text-primary">
                    {formatUsd(
                      data?.qboClearingBalance ?? data?.clearingBalance,
                    )}
                  </p>
                  <p className="pt-1 text-xs text-gray-400">
                    {data?.qboClearingBalance != null
                      ? `Live in QuickBooks${
                          data?.clearingAccountName
                            ? ` · ${data.clearingAccountName}`
                            : ''
                        } · ${formatUsd(data?.clearingBalance)} posted by CSP to date`
                      : 'Posted by CSP to date · QuickBooks balance unavailable'}
                  </p>
                </div>

                {/* Automation status */}
                <div className="rounded-xl border border-gray-100 bg-slate-50 p-6">
                  <p className="text-sm font-semibold text-gray-500">
                    Automation status
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        isAutoOn ? 'bg-success' : 'bg-gray-300'
                      }`}
                    />
                    <p
                      className={`text-xl font-bold ${
                        isAutoOn ? 'text-success' : 'text-gray-400'
                      }`}
                    >
                      Auto-sync: {isAutoOn ? 'On' : 'Off'}
                    </p>
                  </div>
                  <p className="pt-1 text-xs text-gray-400">
                    {automation?.lastRunAt
                      ? `Last run: ${lastRun}${
                          automation?.lastRunStatus
                            ? ` (${automation.lastRunStatus})`
                            : ''
                        }`
                      : 'Never run yet'}
                  </p>
                </div>
              </div>

              {/* Entries */}
              {entries.length === 0 ? (
                // Wrapped so the empty state sits just under the summary cards.
                // Unwrapped it centres itself in the full-height page and leaves
                // a large gap between the cards and the message.
                <div className="py-8">
                  <Empty
                    message="No journal entries yet. Once your accounts are connected and your funds are mapped, your daily entries will appear here."
                    action={
                      <Link
                        to={mainRoute.AUTOMATION_MAPPING}
                        className="text-base font-semibold text-blue-400 underline"
                      >
                        Set up mapping
                      </Link>
                    }
                  />
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-100">
                  {/* Header row */}
                  <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    <div className="col-span-3">Date</div>
                    <div className="col-span-2 text-right">Revenue</div>
                    <div className="col-span-2 text-right">Stripe Fees</div>
                    <div className="col-span-2 text-right">To Clearing</div>
                    <div className="col-span-3 text-right">Status</div>
                  </div>

                  {entries.map((entry) => {
                    const isOpen = expandedRow === entry.batchId
                    return (
                      <div
                        key={entry.batchId}
                        className="border-t border-gray-100"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedRow(isOpen ? null : entry.batchId)
                          }
                          className="grid w-full grid-cols-12 items-center gap-2 px-4 py-4 text-left transition hover:bg-slate-50"
                        >
                          <div className="col-span-3 flex items-center gap-2 font-medium text-primary">
                            {isOpen ? (
                              <HiChevronUp size={18} className="text-gray-400" />
                            ) : (
                              <HiChevronDown
                                size={18}
                                className="text-gray-400"
                              />
                            )}
                            {formatDate(entry.date)}
                          </div>
                          <div className="col-span-2 text-right font-semibold text-success">
                            {formatUsd(entry.gross)}
                          </div>
                          <div className="col-span-2 text-right text-gray-500">
                            {formatUsd(entry.fees)}
                          </div>
                          <div className="col-span-2 text-right font-medium text-primary">
                            {formatUsd(entry.net)}
                          </div>
                          <div className="col-span-3 flex justify-end">
                            <StatusBadge status={entry.status} />
                          </div>
                        </button>

                        {isOpen ? (
                          <div className="bg-slate-50 px-4 py-4 md:px-12">
                            <p className="pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                              Revenue credited
                            </p>
                            <div className="space-y-1">
                              {entry.credits?.length ? (
                                entry.credits.map((credit, idx) => (
                                  <div
                                    key={`${entry.batchId}-${idx}`}
                                    className="flex items-center justify-between border-b border-gray-100 py-1 text-sm"
                                  >
                                    <span className="text-gray-600">
                                      {accountNameByRef(credit.accountRef)}
                                    </span>
                                    <span className="font-medium text-primary">
                                      {formatUsd(credit.amount)}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-gray-400">
                                  No credit breakdown available.
                                </p>
                              )}
                            </div>
                            {entry.memo ? (
                              <p className="pt-3 text-sm text-gray-500">
                                <span className="font-semibold text-gray-600">
                                  Memo:{' '}
                                </span>
                                {entry.memo}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}

              <ClearingStatement />
            </>
          )}
        </div>
      </div>
    </MainLayout>
  )
}

export default DailyJournalEntries
