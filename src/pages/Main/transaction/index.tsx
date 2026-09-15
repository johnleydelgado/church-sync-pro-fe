import Loading from '@/common/components/loading/Loading'
import MainLayout from '@/common/components/main-layout/MainLayout'
import React, { FC, useMemo, useState } from 'react'
import { useQuery } from 'react-query'
import { useSelector } from 'react-redux'
import { RootState } from '../../../redux/store'
import { isEmpty } from 'lodash'
import { getUserRelated } from '@/common/api/user'
import StripeGivingTable from './component/StripeGivingTable'

import { BiSync } from 'react-icons/bi'
import { Link } from 'react-router-dom'
import { mainRoute } from '@/common/constant/route'
import { Button } from '@material-tailwind/react'

// Kept for `view-details` and `view-detail-stripe`, which still type their Planning Center
// payloads against these. The batch UI itself is switched off (see below) but the shapes it
// described are still what those pages receive.
export interface AttributesProps {
  batch: { id: string; attributes: any }
  donations: [{ donation: object; designation: object; fund: object }]
}

export interface BatchesProps {
  batches: AttributesProps[]
  synchedBatches: [
    { id: string; batchId: string; createdAt: Date; donationId: string },
  ]
}

/**
 * Widest range the API will answer, in days. Kept in step with MAX_RANGE_DAYS on the backend:
 * the sweep is a single paginated Planning Center request, so an unbounded range would pull a
 * church's whole history and take minutes.
 */
const MAX_RANGE_DAYS = 366

/** Quick ranges, each ending today. */
const RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 12 months', days: 365 },
]

/** Today, and `days - 1` days before it, as date-only strings in the browser's local day. */
const rangeFor = (days: number) => {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - (days - 1))
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`
  return { from: iso(start), to: iso(end) }
}

interface DashboardProps {}

const Dashboard: FC<DashboardProps> = () => {
  const { user } = useSelector((state: RootState) => state.common)
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)

  // `from`/`to` are the source of truth; the quick-range buttons just set them. A church
  // testing against older giving needs to reach any month, not only the last ninety days.
  const initial = useMemo(() => rangeFor(30), [])
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)

  const applyRange = (days: number) => {
    const next = rangeFor(days)
    setFrom(next.from)
    setTo(next.to)
  }

  // Backwards or over-wide ranges are rejected by the API; say so here rather than
  // letting the table render an error the church cannot act on.
  const rangeError = useMemo(() => {
    if (from > to) return 'The start date is after the end date.'
    const span =
      Math.round(
        (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
          86400000,
      ) + 1
    if (span > MAX_RANGE_DAYS)
      return `That range is ${span} days. Planning Center is asked for the whole range at once, so pick a year or less — then step back a year at a time.`
    return null
  }, [from, to])

  const { data: userData, isLoading: isLoadingUser } = useQuery(
    ['getUserRelated'],
    async () => {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      if (email) return await getUserRelated(email)
    },
    { staleTime: Infinity, refetchOnWindowFocus: false },
  )

  const hasMapping = !isEmpty(userData?.data?.UserSetting?.settingsData)

  return (
    <MainLayout>
      <div className="flex h-full gap-4">
        <div className="w-screen rounded-lg bg-white p-8">
          {/* Header */}
          <div className="border-b-2 pb-4">
            <div className="flex items-center gap-2">
              <BiSync size={28} className="text-blue-400" />
              <span className="text-lg font-bold text-primary">
                Stripe Giving
              </span>
            </div>
            <p className="max-w-3xl pt-1 text-sm text-gray-500">
              Every day&apos;s online giving that Stripe processed, read
              straight from Planning Center, and whether its journal entry has
              reached QuickBooks yet. Open a day to see the gifts behind it.
              Cash and cheques are not shown — Stripe never handles them.
            </p>
          </div>

          {/* Range picker. The batch tab that used to sit here is switched off:
              batches hold cash and cheques, which are out of scope for the daily
              journal entry. BatchTable.tsx is left in place for when it returns. */}
          <div className="flex flex-wrap items-end justify-between gap-4 pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  From
                </span>
                <input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(e) => setFrom(e.target.value)}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-600 focus:border-yellow focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  To
                </span>
                <input
                  type="date"
                  value={to}
                  min={from}
                  onChange={(e) => setTo(e.target.value)}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-600 focus:border-yellow focus:outline-none"
                />
              </label>
            </div>
            <div className="flex items-center gap-2">
              {RANGES.map((r) => (
                <Button
                  key={r.days}
                  size="sm"
                  variant="outlined"
                  onClick={() => applyRange(r.days)}
                  className="border-gray-300 normal-case text-gray-600"
                >
                  {r.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Table */}
          {isLoadingUser ? (
            <div className="flex h-96 items-center justify-center">
              <Loading />
            </div>
          ) : !hasMapping ? (
            <div className="flex h-96 flex-col items-center justify-center">
              <p className="text-center text-2xl font-thin">
                You haven&apos;t set up your donation categories yet.
              </p>
              <Link
                to={mainRoute.AUTOMATION_MAPPING + '?tab=0'}
                className="pt-4 text-xl text-blue-400 underline"
              >
                Set up mapping
              </Link>
            </div>
          ) : rangeError ? (
            <div className="flex h-48 items-center justify-center">
              <p className="text-lg font-thin text-gray-500">{rangeError}</p>
            </div>
          ) : (
            <StripeGivingTable from={from} to={to} />
          )}
        </div>
      </div>
    </MainLayout>
  )
}

export default Dashboard
