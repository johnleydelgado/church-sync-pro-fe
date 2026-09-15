import React, { FC } from 'react'
import { useQuery } from 'react-query'
import { Spinner } from 'flowbite-react'
import { HiOutlineExclamationCircle } from 'react-icons/hi'

import {
  StripeGivingDonation,
  getStripeGivingDayDetail,
} from '@/common/api/user'
import { FormatMoney } from 'format-money-js'

// Mirrors the day list's own map: the same setup problems, said the same way.
const UNAVAILABLE_COPY: Record<string, string> = {
  no_user: 'We could not find your account.',
  no_pco_token: 'Planning Center is not connected, so this day cannot be read.',
  no_org_timezone:
    "Planning Center did not report your organisation's timezone, so this day cannot be read reliably.",
}

interface StripeGivingDayDetailProps {
  email: string
  /** YYYY-MM-DD. */
  day: string
  /** The church's timezone, so each gift's time reads as the church would see it. */
  orgTimeZone?: string
}

// Dollars, like the rest of this page's API contract.
const fm = new FormatMoney({ decimals: 2 })
const formatUsd = (amount: number | undefined | null) =>
  fm.from(Number(amount ?? 0), { symbol: '$ ' })?.toString() || '$ 0.00'

/**
 * The time a gift came in, in the CHURCH's timezone rather than the browser's.
 *
 * A bookkeeper in another timezone looking at a day's gifts must see the times that day was
 * actually made of; rendering in the viewer's zone would show gifts apparently landing outside
 * the very day they are filed under.
 */
const formatTime = (iso: string, timeZone?: string) => {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
    }).format(at)
  } catch {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(at)
  }
}

/** Rendered as `CARD · credit`; PCO's own tag in the Giving UI is CARD:CREDIT. */
const methodLabel = (donation: StripeGivingDonation) => {
  const base = (donation.paymentMethod || '').toUpperCase()
  return donation.paymentMethodSub
    ? `${base} · ${donation.paymentMethodSub}`
    : base || '—'
}

const StripeGivingDayDetail: FC<StripeGivingDayDetailProps> = ({
  email,
  day,
  orgTimeZone,
}) => {
  // Keyed by day, so a day already opened once reopens instantly instead of re-querying
  // Planning Center every time the row is toggled.
  const { data, isLoading, isError, error, refetch } = useQuery(
    ['getStripeGivingDayDetail', email, day],
    async () => await getStripeGivingDayDetail(email, day),
    { staleTime: 5 * 60_000, refetchOnWindowFocus: false, retry: false },
  )

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-6 text-sm text-gray-400">
        <Spinner size="sm" />
        Loading this day&apos;s donations…
      </div>
    )
  }

  if (isError) {
    const message =
      (error as any)?.response?.data?.message ??
      'Planning Center could not be reached.'
    return (
      <div className="flex flex-wrap items-center gap-3 px-4 py-6 text-sm text-red-500">
        <span className="flex items-center gap-2">
          <HiOutlineExclamationCircle size={16} />
          {message}
        </span>
        <button
          type="button"
          onClick={() => refetch()}
          className="font-semibold text-blue-400 underline"
        >
          Try again
        </button>
      </div>
    )
  }

  // The backend answers a setup problem with HTTP 200 and an `unavailable` reason. Falling
  // through to "no donations on this day" would report a revoked Planning Center token as an
  // empty day - under a row that says, say, "12 donations". The token can lapse between the
  // day list being fetched and this row being opened, so this is reachable, not theoretical.
  if (data?.unavailable) {
    return (
      <div className="flex items-center gap-2 px-4 py-6 text-sm text-gray-500">
        <HiOutlineExclamationCircle size={16} className="text-gray-400" />
        {UNAVAILABLE_COPY[data.unavailable] ??
          'This day could not be read from Planning Center.'}
      </div>
    )
  }

  const donations = data?.donations ?? []

  if (!donations.length) {
    return (
      <div className="px-4 py-6 text-sm text-gray-400">
        No Stripe donations on this day.
      </div>
    )
  }

  return (
    <div className="bg-slate-50 px-4 py-4 md:px-8">
      <p className="pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Donations in this entry
      </p>

      {/* Its own horizontal scroll: a long fund name must not push the page sideways. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
              <th className="py-2 pr-4 font-semibold">Time</th>
              <th className="py-2 pr-4 font-semibold">Fund</th>
              <th className="py-2 pr-4 font-semibold">Method</th>
              <th className="py-2 pr-4 text-right font-semibold">Gross</th>
              <th className="py-2 pr-4 text-right font-semibold">Fee</th>
              <th className="py-2 text-right font-semibold">Net</th>
            </tr>
          </thead>
          <tbody>
            {donations.map((donation) => (
              <tr
                key={donation.id}
                className="border-t border-gray-200 align-top"
              >
                <td className="whitespace-nowrap py-2 pr-4 text-gray-500">
                  {formatTime(donation.receivedAt, orgTimeZone)}
                </td>
                <td className="py-2 pr-4 text-gray-600">
                  {donation.designations.length ? (
                    donation.designations.map((d, i) => (
                      <div key={`${donation.id}-${i}`}>
                        {d.fundName}
                        {donation.designations.length > 1 ? (
                          <span className="text-gray-400">
                            {' '}
                            {formatUsd(d.amount)}
                          </span>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <span className="text-gray-400">Unallocated</span>
                  )}
                </td>
                <td className="whitespace-nowrap py-2 pr-4 text-xs text-gray-500">
                  {methodLabel(donation)}
                  {donation.feeCovered ? (
                    // Worth surfacing: the donor grossed the gift up to cover the fee, so the
                    // amount here is larger than what they meant the church to receive.
                    <span className="block text-gray-400">fee covered</span>
                  ) : null}
                </td>
                <td className="whitespace-nowrap py-2 pr-4 text-right font-medium text-success">
                  {formatUsd(donation.gross)}
                </td>
                <td className="whitespace-nowrap py-2 pr-4 text-right text-gray-500">
                  {formatUsd(donation.fee)}
                </td>
                <td className="whitespace-nowrap py-2 text-right font-medium text-primary">
                  {formatUsd(donation.net)}
                </td>
              </tr>
            ))}
          </tbody>
          {data?.totals ? (
            <tfoot>
              <tr className="border-t-2 border-gray-300 text-sm font-semibold">
                <td className="py-2 pr-4 text-gray-500" colSpan={3}>
                  {data.totals.count} donation
                  {data.totals.count === 1 ? '' : 's'}
                </td>
                <td className="py-2 pr-4 text-right text-success">
                  {formatUsd(data.totals.gross)}
                </td>
                <td className="py-2 pr-4 text-right text-gray-600">
                  {formatUsd(data.totals.fees)}
                </td>
                <td className="py-2 text-right text-primary">
                  {formatUsd(data.totals.net)}
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  )
}

export default StripeGivingDayDetail
