import MainLayout from '@/common/components/main-layout/MainLayout'
import Loading from '@/common/components/loading/Loading'
import { getDailyJournalEntries } from '@/common/api/user'
import { mainRoute } from '@/common/constant/route'
import { RootState } from '@/redux/store'
import { FormatMoney } from 'format-money-js'
import React, { FC } from 'react'
import { useQuery } from 'react-query'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import ClearingStatement from './ClearingStatement'
import { HiOutlineDocumentText } from 'react-icons/hi'

interface ClearingPageProps {}

// NOTE: the backend contract returns dollars (not cents), so we format
// dollars directly here rather than reusing helper.formatUsd which divides by 100.
const fm = new FormatMoney({ decimals: 2 })
const formatUsd = (amount: number | undefined | null) =>
  fm.from(Number(amount ?? 0), { symbol: '$ ' })?.toString() || '$ 0.00'

/**
 * What the clearing balance means, in words. A bare -$4,681.01 next to "$29,262.36 posted by
 * CSP" read as an error; most of the time it is just Stripe deposits doing their job.
 */
const balanceMeaning = (balance: number | null | undefined) => {
  if (balance === null || balance === undefined)
    return "QuickBooks couldn't be read just now, so the live balance isn't shown."
  const cents = Math.round(balance * 100)
  if (cents > 0)
    return "Online giving CSP has recorded that Stripe hasn't deposited yet. It comes down as each deposit is cleared against this account."
  if (cents === 0)
    return 'Everything CSP recorded has been deposited and cleared.'
  return "Negative: more has been cleared out of this account than CSP put in. That happens when Stripe deposits carry money CSP doesn't record — giving from before you switched to CSP, or event and registration payments."
}

/**
 * The Clearing page - month-end. The balance Stripe still owes, and the monthly statement the
 * accountants reconcile against. The day-by-day work (what is posted, what is waiting) lives on
 * Daily Giving; this page used to list the same days a second time.
 */
const DailyJournalEntries: FC<ClearingPageProps> = () => {
  const { user } = useSelector((state: RootState) => state.common)
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)

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

  const balance = data?.qboClearingBalance
  const isNegative = balance != null && Math.round(balance * 100) < 0

  return (
    <MainLayout>
      <div className="flex h-full gap-4">
        <div className="w-screen rounded-lg bg-white p-8">
          {/* Header */}
          <div className="border-b-2 pb-4">
            <div className="flex items-center gap-2">
              <HiOutlineDocumentText size={28} className="text-blue-400" />
              <span className="text-lg font-bold text-primary">
                Clearing account
              </span>
            </div>
            <p className="max-w-3xl pt-1 text-sm text-gray-500">
              CSP&apos;s daily entries park the money Stripe owes you here until
              the deposit reaches your bank. Use this page at month-end to
              reconcile it.
            </p>
          </div>

          {isLoading ? (
            <div className="flex h-96 items-center justify-center">
              <Loading />
            </div>
          ) : (
            <>
              <div className="py-6">
                <div className="rounded-xl border border-gray-100 bg-slate-50 p-6">
                  <p className="text-sm font-semibold text-gray-500">
                    {data?.clearingAccountName || 'Clearing account'} · balance
                    in QuickBooks today
                  </p>
                  <p
                    className={`pt-2 text-3xl font-bold ${
                      isNegative ? 'text-amber-700' : 'text-primary'
                    }`}
                  >
                    {balance == null ? '—' : formatUsd(balance)}
                  </p>
                  <p className="max-w-3xl pt-2 text-sm text-gray-600">
                    {balanceMeaning(balance)}
                  </p>
                  <p className="pt-3 text-xs text-gray-400">
                    CSP has posted {formatUsd(data?.clearingBalance)} to this
                    account in total.{' '}
                    <Link
                      to={mainRoute.TRANSACTION}
                      className="font-semibold text-blue-400 underline"
                    >
                      See each day on Daily Giving
                    </Link>
                  </p>
                </div>
              </div>

              <ClearingStatement />
            </>
          )}
        </div>
      </div>
    </MainLayout>
  )
}

export default DailyJournalEntries
