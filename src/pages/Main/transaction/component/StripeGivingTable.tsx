import React, { FC, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Button, Tooltip } from '@material-tailwind/react'
import { Spinner } from 'flowbite-react'
import { AiOutlineSync } from 'react-icons/ai'
import {
  HiChevronDown,
  HiChevronUp,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineExclamationCircle,
  HiOutlineMinusCircle,
} from 'react-icons/hi'

import {
  StripeGivingDay,
  getStripeGivingByDay,
  postStripeGivingDay,
  setStartDataAutomation,
} from '@/common/api/user'
import { failNotification, successNotification } from '@/common/utils/toast'
import ConfirmPostDialog from './ConfirmPostDialog'
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

const StatusBadge: FC<{ status: string; excluded?: boolean }> = ({
  status,
  excluded,
}) => {
  const normalized = (status || '').toLowerCase()
  // Excluded outranks "not posted": a day before the church's start date is not outstanding
  // work, it is giving they have decided not to bring across. Saying "not posted yet" about it
  // turns the table into a to-do list of things nobody intends to do.
  if (excluded && normalized !== 'posted') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-400">
        <HiOutlineMinusCircle size={16} />
        Not needed
      </span>
    )
  }
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
  const [postingDay, setPostingDay] = useState<string | null>(null)
  // The excluded day awaiting confirmation, if any.
  const [confirmDay, setConfirmDay] = useState<string | null>(null)
  const [showExcluded, setShowExcluded] = useState(false)

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

  const syncStartDay = data?.syncStartDay ?? null

  /** A day the church has decided not to bring across. No cutoff set means nothing is excluded. */
  const isExcluded = (day: string) => !!syncStartDay && day < syncStartDay

  const postDay = useMutation(
    async (day: string) => postStripeGivingDay(email as string, day),
    {
      onMutate: (day: string) => {
        setPostingDay(day)
      },
      onSettled: () => setPostingDay(null),
      onSuccess: (result, day) => {
        if (result?.postedDays?.length) {
          successNotification({
            title: `Posted ${formatDate(day)} to QuickBooks`,
          })
        } else if (result?.failedDays?.length) {
          failNotification({ title: `Could not post ${formatDate(day)}` })
        } else if (result?.reason) {
          // A skip is not a success. Name the setup step that is missing rather than showing a
          // green toast for an entry that was never written.
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

  /** Post immediately for a day in range; ask first for one the church excluded. */
  const requestPost = (day: string) => {
    if (isExcluded(day)) return setConfirmDay(day)
    postDay.mutate(day)
  }

  const saveCutoff = useMutation(
    // The column is shared with the mapping page, which writes MM-DD-YYYY - so this does too,
    // rather than introducing a second format into an unvalidated varchar.
    async (day: string) => {
      const [y, m, d] = day.split('-')
      return await setStartDataAutomation(
        email as string,
        'donation',
        `${m}-${d}-${y}`,
      )
    },
    {
      onSuccess: () => {
        successNotification({ title: 'Sync start date saved' })
        queryClient.invalidateQueries(queryKey)
      },
      onError: (e: any) => {
        failNotification({
          title: e?.message || 'The start date could not be saved.',
        })
      },
    },
  )

  // Memoised so the totals below do not recompute on every render: `?? []` builds a fresh
  // array each time, which would make the useMemo dependency change constantly.
  const allDays = useMemo(() => data?.days ?? [], [data])

  const excludedCount = useMemo(
    () => allDays.filter((d) => isExcluded(d.date)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allDays, syncStartDay],
  )

  // What the table actually lists. Hiding excluded days is what turns this from a month of
  // history into the short list of what still needs syncing - which is the point of the cutoff.
  const days = useMemo(
    () => (showExcluded ? allDays : allDays.filter((d) => !isExcluded(d.date))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allDays, showExcluded, syncStartDay],
  )

  // Summed over the visible days only, so "3 of 5 days posted" counts the same days the reader
  // can see. Counting excluded history in would make the fraction permanently and confusingly
  // short of complete.
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
          syncable: acc.syncable + (isExcluded(d.date) ? 0 : 1),
        }),
        { gross: 0, fees: 0, net: 0, donations: 0, posted: 0, syncable: 0 },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days, syncStartDay],
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
  // Toggling excluded days reshapes the list too, so it resets the page the same way.
  useEffect(() => {
    setPage(1)
    setExpandedDay(null)
  }, [from, to, showExcluded])

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

  // Everything in range is excluded. This must NOT fall through to the generic empty state:
  // that one says there is no giving here, which is false, and it renders without the cutoff
  // control - leaving no way to widen the cutoff back and no hint that anything was hidden.
  if (!days.length && allDays.length > 0) {
    return (
      <div className="pt-6">
        <Empty
          message={
            allDays.length === 1
              ? `The one day of giving in this range falls before your sync start date of ${formatDate(
                  syncStartDay as string,
                )}, so nothing here needs syncing.`
              : `All ${
                  allDays.length
                } days of giving in this range fall before your sync start date of ${formatDate(
                  syncStartDay as string,
                )}, so nothing here needs syncing.`
          }
          action={
            <Button
              size="sm"
              className="bg-yellow normal-case"
              onClick={() => setShowExcluded(true)}
            >
              Show them anyway
            </Button>
          }
        />
      </div>
    )
  }

  if (!days.length) {
    return (
      <Empty message="No Stripe giving in this date range. Cash and cheques are not shown here - they are not processed by Stripe." />
    )
  }

  return (
    <div className="pt-6">
      <ConfirmPostDialog
        day={confirmDay}
        syncStartDay={syncStartDay}
        onCancel={() => setConfirmDay(null)}
        onConfirm={(day) => {
          setConfirmDay(null)
          postDay.mutate(day)
        }}
      />

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

      {/* The cutoff. Everything before it is giving the church has decided not to bring
          across - which is both what stops the 8am run reaching back into history, and what
          keeps this table showing only work that is genuinely outstanding. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-slate-50 px-5 py-4">
        <label className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <span className="font-semibold">Only sync donations from</span>
          <input
            type="date"
            value={syncStartDay ?? ''}
            onChange={(e) =>
              e.target.value && saveCutoff.mutate(e.target.value)
            }
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 focus:border-yellow focus:outline-none"
          />
          <span>onward</span>
          {saveCutoff.isLoading ? (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Spinner size="sm" className="h-3 w-3" />
              Saving
            </span>
          ) : null}
        </label>

        {excludedCount > 0 ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500">
              {excludedCount} earlier{' '}
              {excludedCount === 1 ? 'day is' : 'days are'} excluded
            </span>
            <button
              type="button"
              onClick={() => setShowExcluded((v) => !v)}
              className="font-semibold text-blue-400 underline"
            >
              {showExcluded ? 'Hide them' : 'Show them'}
            </button>
          </div>
        ) : !syncStartDay ? (
          <span className="text-sm text-gray-400">
            No start date set — every day below counts as outstanding.
          </span>
        ) : null}
      </div>

      {/* How much of what is listed has actually reached QuickBooks. The nightly run settles
          yesterday each morning, so a recent day sitting at "not posted" is expected. */}
      {totals.syncable > 0 ? (
        <p className="pb-4 text-sm text-gray-500">
          <span className="font-semibold text-primary">
            {totals.posted} of {totals.syncable}
          </span>{' '}
          {totals.syncable === 1 ? 'day has' : 'days have'} been posted to
          QuickBooks.
          {totals.posted < totals.syncable
            ? ' Post one here, or let the 8am run settle it.'
            : ''}
        </p>
      ) : (
        // Every visible day is excluded, so "0 of 0 days have been posted" would be both true
        // and meaningless. Say what the reader is actually looking at instead.
        <p className="pb-4 text-sm text-gray-500">
          Every day shown is before your sync start date. None of it needs
          syncing.
        </p>
      )}

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
          const excluded = isExcluded(day.date)
          const isPosting = postingDay === day.date
          const isPosted = (day.status || '').toLowerCase() === 'posted'
          return (
            <div key={day.date} className="border-t border-gray-100">
              {/* The row is a div, not a button: it contains the Post button, and a button
                  inside a button is invalid and swallows the inner click. Only the date cell
                  toggles, which is also the behaviour you want - pressing Post must post,
                  not expand. */}
              <div
                className={`grid grid-cols-12 items-center gap-2 px-4 py-4 ${
                  excluded ? 'opacity-60' : ''
                }`}
              >
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
                <div className="col-span-3 flex items-center justify-end gap-3">
                  <StatusBadge status={day.status} excluded={excluded} />
                  {isPosted ? null : (
                    <Tooltip
                      content={
                        <span className="block max-w-xs text-xs leading-snug">
                          {excluded
                            ? "This day is before your sync start date. You'll be asked to confirm."
                            : "Post this day's journal entry to QuickBooks now, without waiting for the 8am run."}
                        </span>
                      }
                      placement="top"
                    >
                      <Button
                        size="sm"
                        disabled={isPosting || !email}
                        onClick={() => requestPost(day.date)}
                        className={`flex items-center gap-2 whitespace-nowrap normal-case ${
                          excluded
                            ? 'border border-gray-300 bg-white text-gray-600 shadow-none'
                            : 'bg-yellow'
                        }`}
                      >
                        {isPosting ? (
                          <>
                            <Spinner size="sm" />
                            Posting…
                          </>
                        ) : (
                          <>
                            <AiOutlineSync size={16} />
                            {excluded ? 'Post anyway' : 'Post'}
                          </>
                        )}
                      </Button>
                    </Tooltip>
                  )}
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
