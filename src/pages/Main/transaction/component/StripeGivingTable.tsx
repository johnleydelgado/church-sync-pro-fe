import React, { FC, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Button } from '@material-tailwind/react'
import {
  HiChevronDown,
  HiChevronUp,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineExclamationCircle,
} from 'react-icons/hi'

import { StripeGivingDay, getStripeGivingByDay } from '@/common/api/user'
import Empty from '@/common/components/empty/Empty'
import Loading from '@/common/components/loading/Loading'
import PaginationStripe from '@/common/components/pagination/PaginationStripe'
import StripeGivingDayDetail from './StripeGivingDayDetail'
import { mainRoute } from '@/common/constant/route'
import { formatDate } from '@/common/utils/helper'
import { RootState } from '@/redux/store'
import { FormatMoney } from 'format-money-js'

interface StripeGivingTableProps {
  /** Inclusive day range, YYYY-MM-DD. */
  from: string
  to: string
}

// The endpoint returns dollars, matching the Daily Sync contract - so format dollars directly
// rather than reusing helper.formatUsd, which divides by 100.
const fm = new FormatMoney({ decimals: 2 })
const formatUsd = (amount: number | undefined | null) =>
  fm.from(Number(amount ?? 0), { symbol: '$ ' })?.toString() || '$ 0.00'

/**
 * Days per page.
 *
 * Fifteen rows is roughly one screen at this row height. The whole range is already in memory -
 * one sweep fetched it - so this is presentational only, and the summary cards above deliberately
 * keep reporting the WHOLE range rather than the current page.
 */
const DAYS_PER_PAGE = 15

// Why a day can have nothing to show. Kept in one place so the page explains itself instead of
// rendering an empty table that could mean anything.
const UNAVAILABLE_COPY: Record<string, string> = {
  no_user: 'We could not find your account.',
  no_pco_token:
    'Planning Center is not connected yet, so there is no giving to read.',
  no_org_timezone:
    "Planning Center did not report your organisation's timezone, so days cannot be grouped reliably.",
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
      Not posted yet
    </span>
  )
}

const StripeGivingTable: FC<StripeGivingTableProps> = ({ from, to }) => {
  const queryClient = useQueryClient()
  const user = useSelector((state: RootState) => state.common.user)
  const bookkeeper = useSelector((state: RootState) => state.common.bookkeeper)
  const [page, setPage] = useState(1)
  // Single-open accordion, matching the Daily Sync page.
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  const email =
    user?.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user?.email

  const queryKey = ['getStripeGivingByDay', email, from, to]

  const { data, isLoading, isError, error } = useQuery(
    queryKey,
    async () => {
      if (!email) return { days: [] as StripeGivingDay[] }
      return await getStripeGivingByDay(email, from, to)
    },
    { staleTime: 60_000, refetchOnWindowFocus: false, retry: false },
  )

  // Memoised so the totals below do not recompute on every render: `?? []` builds a fresh
  // array each time, which would make the useMemo dependency change constantly.
  const days = useMemo(() => data?.days ?? [], [data])

  const totals = useMemo(
    () =>
      days.reduce(
        (acc, d) => ({
          gross: acc.gross + d.gross,
          fees: acc.fees + d.fees,
          net: acc.net + d.net,
          donations: acc.donations + d.donations,
          posted:
            acc.posted + ((d.status || '').toLowerCase() === 'posted' ? 1 : 0),
        }),
        { gross: 0, fees: 0, net: 0, donations: 0, posted: 0 },
      ),
    [days],
  )

  const totalPages = Math.max(1, Math.ceil(days.length / DAYS_PER_PAGE))

  // Clamped, not merely reset by an effect. The list changes whenever the query key changes -
  // which includes `email`, because a bookkeeper can switch client from the navbar without
  // touching the dates. Landing on page 4 of a list that now has one page renders a header with
  // no rows under it, and the pagination control hides itself at one page, so there is nothing
  // left on screen to click back with. Deriving the page makes that state unreachable.
  const safePage = Math.min(page, totalPages)
  const pagedDays = useMemo(
    () => days.slice((safePage - 1) * DAYS_PER_PAGE, safePage * DAYS_PER_PAGE),
    [days, safePage],
  )

  // Collapse any open row when the range changes - it belongs to the range being left.
  useEffect(() => {
    setPage(1)
    setExpandedDay(null)
  }, [from, to])

  if (isLoading) return <Loading />

  if (isError) {
    const message =
      (error as any)?.response?.data?.message ??
      'Planning Center could not be reached.'
    return (
      <Empty
        message={`We could not load your Stripe giving. ${message}`}
        action={
          <Button
            size="sm"
            className="normal-case bg-yellow"
            onClick={() => queryClient.invalidateQueries(queryKey)}
          >
            Try again
          </Button>
        }
      />
    )
  }

  if (data?.unavailable) {
    return (
      <Empty
        message={
          UNAVAILABLE_COPY[data.unavailable] ??
          'This church is not set up for Stripe giving yet.'
        }
        action={
          <Link
            to={mainRoute.AUTOMATION_MAPPING}
            className="text-base font-semibold text-blue-400 underline"
          >
            Finish setup
          </Link>
        }
      />
    )
  }

  if (!days.length) {
    return (
      <Empty message="No Stripe giving in this date range. Cash and cheques are not shown here - they are not processed by Stripe." />
    )
  }

  return (
    <div className="pt-6">
      {/* Range summary - the same three figures as a day's journal entry, for the whole range. */}
      <div className="grid grid-cols-1 gap-4 pb-6 md:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-gray-500">Gross giving</p>
          <p className="pt-1 text-2xl font-bold text-success">
            {formatUsd(totals.gross)}
          </p>
          <p className="pt-1 text-xs text-gray-400">
            {totals.donations} donation{totals.donations === 1 ? '' : 's'} over{' '}
            {days.length} day{days.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-gray-500">Stripe fees</p>
          <p className="pt-1 text-2xl font-bold text-gray-600">
            {formatUsd(totals.fees)}
          </p>
          <p className="pt-1 text-xs text-gray-400">What Stripe took</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-gray-500">To clearing</p>
          <p className="pt-1 text-2xl font-bold text-primary">
            {formatUsd(totals.net)}
          </p>
          <p className="pt-1 text-xs text-gray-400">
            What Stripe deposits to the bank
          </p>
        </div>
      </div>

      {/* The page's other question, answered before the table: how much of this range has
          actually reached QuickBooks. The nightly run settles yesterday each morning, so a
          recent day sitting at "not posted" is expected, not a fault. */}
      <p className="pb-4 text-sm text-gray-500">
        <span className="font-semibold text-primary">
          {totals.posted} of {days.length}
        </span>{' '}
        {days.length === 1 ? 'day has' : 'days have'} been posted to QuickBooks.
        {totals.posted < days.length
          ? ' The rest are posted by the 8am run, or from the Daily Sync page.'
          : ''}
      </p>

      <div className="overflow-hidden rounded-xl border border-gray-100">
        <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          <div className="col-span-3">Date</div>
          <div className="col-span-2 text-right">Gross</div>
          <div className="col-span-2 text-right">Stripe fees</div>
          <div className="col-span-2 text-right">To clearing</div>
          <div className="col-span-3 text-right">Status</div>
        </div>

        {pagedDays.map((day) => {
          const isOpen = expandedDay === day.date
          return (
            <div key={day.date} className="border-t border-gray-100">
              {/* The row is a div, not a button: it contains the Post button, and a button
                  inside a button is invalid and swallows the inner click. Only the date cell
                  toggles, which is also the behaviour you want - pressing Post must post,
                  not expand. */}
              <div className="grid grid-cols-12 items-center gap-2 px-4 py-4">
                <div className="col-span-3">
                  <button
                    type="button"
                    onClick={() => setExpandedDay(isOpen ? null : day.date)}
                    aria-expanded={isOpen}
                    className="flex items-center gap-2 rounded text-left font-medium text-primary transition hover:underline"
                  >
                    {isOpen ? (
                      <HiChevronUp size={18} className="text-gray-400" />
                    ) : (
                      <HiChevronDown size={18} className="text-gray-400" />
                    )}
                    {formatDate(day.date)}
                  </button>
                  <p className="pl-6 text-xs text-gray-400">
                    {day.donations} donation{day.donations === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="col-span-2 text-right font-semibold text-success">
                  {formatUsd(day.gross)}
                </div>
                <div className="col-span-2 text-right text-gray-500">
                  {formatUsd(day.fees)}
                </div>
                <div className="col-span-2 text-right font-medium text-primary">
                  {formatUsd(day.net)}
                </div>
                <div className="col-span-3 flex items-center justify-end">
                  <StatusBadge status={day.status} />
                </div>
              </div>

              {isOpen ? (
                <StripeGivingDayDetail
                  email={email as string}
                  day={day.date}
                  orgTimeZone={data?.orgTimeZone}
                />
              ) : null}
            </div>
          )
        })}
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 p-6">
          <p className="text-xs text-gray-400">
            Showing {(safePage - 1) * DAYS_PER_PAGE + 1}–
            {Math.min(safePage * DAYS_PER_PAGE, days.length)} of {days.length}{' '}
            days
          </p>
          <PaginationStripe
            currentPage={safePage}
            onPageChange={(next: number) => {
              setPage(next)
              // Collapse on the way out: an open panel would otherwise stay mounted and keep
              // its day's fetch alive for a row the reader can no longer see.
              setExpandedDay(null)
            }}
            totalPages={totalPages}
            /* Not a page size - PaginationStripe treats this as the +/- radius of the
               page-number window, so 2 shows at most five page buttons. */
            itemPerPage={2}
          />
        </div>
      ) : null}
    </div>
  )
}

export default StripeGivingTable
