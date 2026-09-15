import React, { FC, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Button, Tooltip } from '@material-tailwind/react'
import { Spinner } from 'flowbite-react'
import { AiOutlineSync } from 'react-icons/ai'
import {
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineExclamationCircle,
} from 'react-icons/hi'

import {
  StripeGivingDay,
  getStripeGivingByDay,
  postStripeGivingDay,
} from '@/common/api/user'
import Empty from '@/common/components/empty/Empty'
import Loading from '@/common/components/loading/Loading'
import { mainRoute } from '@/common/constant/route'
import { formatDate } from '@/common/utils/helper'
import { failNotification, successNotification } from '@/common/utils/toast'
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
  const [postingDay, setPostingDay] = useState<string | null>(null)

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

  const postDay = useMutation(
    async (day: string) => postStripeGivingDay(email as string, day),
    {
      onMutate: (day: string) => {
        setPostingDay(day)
      },
      onSettled: () => setPostingDay(null),
      onSuccess: (result, day) => {
        if (result?.postedDays?.length) {
          successNotification({ title: `Posted ${formatDate(day)} to QuickBooks` })
        } else if (result?.failedDays?.length) {
          failNotification({ title: `Could not post ${formatDate(day)}` })
        } else if (result?.reason) {
          // A skip is not a success. Say which setup step is missing rather than
          // showing a green toast for an entry that was never written.
          failNotification({
            title: `Nothing posted - ${result.reason.replace(/_/g, ' ')}`,
          })
        } else {
          successNotification({
            title: `${formatDate(day)} is already up to date in QuickBooks`,
          })
        }
        queryClient.invalidateQueries(queryKey)
        queryClient.invalidateQueries('getDailyJournalEntries')
      },
      onError: () => {
        failNotification({ title: 'Could not reach the sync service' })
      },
    },
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
        }),
        { gross: 0, fees: 0, net: 0, donations: 0 },
      ),
    [days],
  )

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

      <div className="overflow-hidden rounded-xl border border-gray-100">
        <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          <div className="col-span-3">Date</div>
          <div className="col-span-2 text-right">Gross</div>
          <div className="col-span-2 text-right">Stripe fees</div>
          <div className="col-span-2 text-right">To clearing</div>
          <div className="col-span-3 text-right">Status</div>
        </div>

        {days.map((day) => {
          const isPosting = postingDay === day.date
          const isPosted = (day.status || '').toLowerCase() === 'posted'
          return (
            <div
              key={day.date}
              className="grid grid-cols-12 items-center gap-2 border-t border-gray-100 px-4 py-4"
            >
              <div className="col-span-3">
                <p className="font-medium text-primary">
                  {formatDate(day.date)}
                </p>
                <p className="text-xs text-gray-400">
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
              <div className="col-span-3 flex items-center justify-end gap-3">
                <StatusBadge status={day.status} />
                {isPosted ? null : (
                  <Tooltip
                    content={
                      <span className="block max-w-xs text-xs leading-snug">
                        Post this day&apos;s journal entry to QuickBooks now,
                        without waiting for the 8am run.
                      </span>
                    }
                    placement="top"
                  >
                    <Button
                      size="sm"
                      disabled={isPosting || !email}
                      onClick={() => postDay.mutate(day.date)}
                      className="flex items-center gap-2 whitespace-nowrap bg-yellow normal-case"
                    >
                      {isPosting ? (
                        <>
                          <Spinner size="sm" />
                          Posting…
                        </>
                      ) : (
                        <>
                          <AiOutlineSync size={16} />
                          Post
                        </>
                      )}
                    </Button>
                  </Tooltip>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default StripeGivingTable
