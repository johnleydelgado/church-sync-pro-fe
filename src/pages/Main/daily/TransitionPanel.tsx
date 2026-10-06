import React, { FC, useState } from 'react'
import { useMutation, useQueryClient } from 'react-query'
import { Button } from '@material-tailwind/react'
import {
  HiChevronDown,
  HiChevronUp,
  HiOutlineExclamationCircle,
  HiOutlineCheckCircle,
} from 'react-icons/hi'
import { FormatMoney } from 'format-money-js'

import { ClearingTransition, markTransitionTruedUp } from '@/common/api/user'
import { formatDate } from '@/common/utils/helper'
import { failNotification, successNotification } from '@/common/utils/toast'

interface TransitionPanelProps {
  email: string
  transition: ClearingTransition
  /** The church's own name for the mapped clearing account, so the entry below names it. */
  clearingAccountName?: string | null
}

const fm = new FormatMoney({ decimals: 2 })
const usd = (n: number | null | undefined) =>
  fm.from(Number(n ?? 0), { symbol: '$ ' })?.toString() || '$ 0.00'

/**
 * The mid-period switch-over, for the bookkeeper.
 *
 * A church that goes live on the 15th keeps receiving Stripe deposits that mix money from the
 * old process with money CSP posted. CSP cannot see inside a deposit, so it never tries to
 * split one. It does not need to: if every deposit is cleared in full against the clearing
 * account, the account goes negative by exactly the old-process money, and that number is the
 * one-time adjusting entry. This panel just names it - and then gets out of the way.
 */
const TransitionPanel: FC<TransitionPanelProps> = ({
  email,
  transition,
  clearingAccountName,
}) => {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  // Folded by default: a once-only job, and the true-up is the riskiest figure on the page to
  // act on without reading the explanation that goes with it.
  const [open, setOpen] = useState(false)

  const trueUp = useMutation(async () => markTransitionTruedUp(email), {
    onSuccess: () => {
      successNotification({ title: 'Transition marked as trued up' })
      queryClient.invalidateQueries('getClearingStatement')
    },
    onError: () => {
      failNotification({ title: 'Could not record the true-up' })
    },
  })

  const notCaptured = transition.balanceAtGoLive === null
  const unreadable = transition.qboBalance === null
  const hasTrueUp = (transition.trueUp ?? 0) > 0

  const summary = notCaptured || unreadable
    ? 'figures unavailable'
    : hasTrueUp
    ? `one-time true-up ${usd(transition.trueUp)}`
    : 'nothing to true up yet'

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        className="mt-8 flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-left print:hidden"
      >
        <span className="text-sm font-semibold text-amber-800">
          Switch-over to CSP on {formatDate(transition.goLiveDay)} ·{' '}
          <span className="font-normal">{summary}</span>
        </span>
        <span className="flex items-center gap-1 text-sm font-semibold text-amber-800">
          Show details
          <HiChevronDown size={18} />
        </span>
      </button>
    )
  }

  return (
    <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5 print:hidden">
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-expanded
        className="flex w-full items-center justify-between gap-2 pb-2 text-left"
      >
        <span className="text-sm font-semibold text-amber-800">
          Switch-over to CSP on {formatDate(transition.goLiveDay)}
        </span>
        <span className="flex items-center gap-1 text-sm font-semibold text-amber-800">
          Hide
          <HiChevronUp size={18} />
        </span>
      </button>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="max-w-2xl text-sm text-amber-900/80">
            Until the last Stripe deposit from before that date has landed,
            deposits will mix old-process money with money CSP posted. Clear
            each deposit in full against the clearing account anyway — the
            leftover below is your one-time adjusting entry.
          </p>
        </div>
        {!confirming ? (
          <Button
            size="sm"
            variant="outlined"
            onClick={() => setConfirming(true)}
            className="border-amber-400 normal-case text-amber-800"
          >
            Mark as trued up
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-800">
              Adjusting entry is in QuickBooks?
            </span>
            <Button
              size="sm"
              onClick={() => trueUp.mutate()}
              disabled={trueUp.isLoading}
              className="bg-yellow normal-case"
            >
              Yes, done
            </Button>
            <Button
              size="sm"
              variant="text"
              onClick={() => setConfirming(false)}
              className="normal-case text-gray-600"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {notCaptured ? (
        <p className="flex items-center gap-2 pt-4 text-sm text-red-600">
          <HiOutlineExclamationCircle size={16} />
          The clearing balance at go-live was not captured (QuickBooks could not
          be read at the time). Re-save the start date on the Daily Giving page
          to capture it.
        </p>
      ) : unreadable ? (
        <p className="flex items-center gap-2 pt-4 text-sm text-gray-500">
          <HiOutlineExclamationCircle size={16} />
          QuickBooks could not be read just now, so the figures below cannot be
          computed.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 pt-4 md:grid-cols-4">
            <Figure
              label="In the account at go-live"
              value={usd(transition.balanceAtGoLive)}
            />
            <Figure
              label="Posted by CSP since"
              value={usd(transition.postedSinceGoLive)}
            />
            <Figure
              label="In QuickBooks now"
              value={usd(transition.qboBalance)}
            />
            <Figure
              label="Cleared out since go-live"
              value={usd(transition.released)}
            />
          </div>

          {hasTrueUp ? (
            <div className="mt-4 rounded-lg border border-amber-300 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                One-time true-up
              </p>
              <p className="pt-1 text-2xl font-bold text-amber-800">
                {usd(transition.trueUp)}
              </p>
              <p className="pt-1 text-sm text-gray-600">
                {usd(transition.trueUp)} more has been cleared out of the
                account than CSP ever put in. Usually that is giving from
                before go-live that came through a Stripe deposit afterwards.
              </p>

              {/* The entry itself, rather than the amount alone. The credit side is
                  contribution income by the church's own accounting decision, and this last
                  slice of old activity is recognised NET of fees - the Stripe fees inside it
                  belong to gifts CSP never posted, so there is no fee line to split out. */}
              <div className="mt-3 overflow-hidden rounded-md border border-gray-200">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="px-3 py-2 text-gray-500">Debit</td>
                      <td className="px-3 py-2 text-gray-700">
                        {clearingAccountName || 'Clearing account'}
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums text-primary">
                        {usd(transition.trueUp)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-gray-500">Credit</td>
                      <td className="px-3 py-2 text-gray-700">
                        Contribution / Giving income
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums text-primary">
                        {usd(transition.trueUp)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* CSP cannot see inside a deposit, so it cannot tell giving from event money in
                  this leftover - and Planning Center pays both out in the same deposit. */}
              <p className="mt-3 flex gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                <HiOutlineExclamationCircle
                  size={18}
                  className="mt-0.5 shrink-0 text-amber-700"
                />
                <span>
                  Check before posting: if your Stripe deposits also carry event
                  or registration payments, part of this amount is event income,
                  not giving. CSP doesn&apos;t record those, so they end up here
                  too. Split that part out first.
                </span>
              </p>

              <p className="pt-3 text-sm text-gray-600">
                Post that entry, then mark the transition trued up. Read this a
                few days after the last pre-go-live deposit landed — anything of
                CSP&apos;s still in transit makes it read low.
              </p>
            </div>
          ) : (
            <p className="flex items-center gap-2 pt-4 text-sm text-gray-600">
              <HiOutlineCheckCircle size={16} className="text-success" />
              Nothing to true up yet. {usd(transition.inTransit)} of CSP&apos;s
              postings is still on its way to the bank.
            </p>
          )}
        </>
      )}
    </div>
  )
}

const Figure: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg bg-white/70 p-3">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
      {label}
    </p>
    <p className="pt-0.5 text-lg font-bold text-primary">{value}</p>
  </div>
)

export default TransitionPanel
