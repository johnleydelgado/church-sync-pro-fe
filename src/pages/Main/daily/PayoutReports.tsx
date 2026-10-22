import React, { FC } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@material-tailwind/react'
import { HiOutlineExclamationCircle, HiOutlineUpload } from 'react-icons/hi'

import { PayoutStatus } from '@/common/api/user'
import { formatDate } from '@/common/utils/helper'
import { useChurch } from '@/common/hooks/useChurch'
import PayoutReportUploadModal from './PayoutReportUploadModal'
import PayoutReview from './PayoutReview'
import {
  PAYOUT_REVIEW_ID,
  dayRange,
  mappingLinkFor,
  plural,
} from './payoutCopy'
import { rangeWords } from './outstanding'
import { usePayoutStatus } from './usePayoutStatus'

/**
 * "Last upload: payouts Sep 1 – Sep 30 · loaded 10/22/2026 by Ana · file.csv". An upload from
 * before payout dates were asked for has none, so it names its charge dates instead.
 */
const lastUploadWords = (last: NonNullable<PayoutStatus['lastUpload']>) => {
  const loaded = `loaded ${formatDate(last.uploadedAt)}${
    last.uploadedBy ? ` by ${last.uploadedBy}` : ''
  }`
  const payouts =
    last.payoutFrom && last.payoutTo
      ? `payouts ${rangeWords(
          { from: last.payoutFrom, to: last.payoutTo },
          { year: new Date().getFullYear() },
        )}`
      : null
  const charges =
    !payouts && (last.firstDay || last.lastDay)
      ? `charges ${dayRange(last.firstDay, last.lastDay)}`
      : null
  return [
    `Last upload: ${payouts ?? loaded}`,
    payouts ? loaded : null,
    last.fileName,
    charges,
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * Payout reports, on the Clearing page.
 *
 * Planning Center pays giving AND event registrations out in the same Stripe deposits, and CSP
 * only hears about giving from the API - so each deposit can carry money CSP never recorded. The
 * church uploads the payout report instead; this card says when that last happened, what is
 * still waiting for a person, and opens the upload.
 */
const PayoutReports: FC<{
  /** The upload dialog. The Clearing page holds it, so the in-transit section can open it too. */
  uploading: boolean
  onUploadingChange: (open: boolean) => void
}> = ({ uploading, onUploadingChange }) => {
  const { email } = useChurch()
  const { data: status, isLoading, error } = usePayoutStatus()

  const last = status?.lastUpload ?? null
  const needsReview = status?.needsReview ?? 0
  const givingNotPosted = status?.givingNotPosted ?? 0
  // Unknown readiness (the status call failed) leaves the button on: the server still refuses a
  // file it cannot take, and the modal shows its reason.
  const blocked = status ? !status.ready : false

  const attention = [
    needsReview > 0
      ? `${plural(needsReview, 'item needs', 'items need')} review`
      : '',
    givingNotPosted > 0
      ? `${plural(
          givingNotPosted,
          'giving line',
          'giving lines',
        )} not in QuickBooks yet`
      : '',
  ].filter(Boolean)

  return (
    <section className="pb-2 print:hidden">
      <div className="rounded-xl border border-gray-200 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-lg font-bold text-primary">Payout reports</h2>
            <p className="pt-1 text-sm text-gray-500">
              Upload Planning Center&apos;s payout report for each month (part
              of a month is fine; add the rest later) with the payout dates you
              chose when exporting it. CSP uses it to record event and
              registration payments, and to show what&apos;s still in transit at
              month-end.
            </p>
          </div>
          <div className="flex max-w-xs flex-col items-end gap-2">
            <Button
              size="sm"
              onClick={() => onUploadingChange(true)}
              // Off while still checking, so it never flashes on for a church that isn't set up.
              disabled={!email || isLoading || blocked}
              className="flex items-center gap-2 bg-yellow normal-case"
            >
              <HiOutlineUpload size={16} />
              Upload payout report
            </Button>
            {blocked ? (
              <p className="text-right text-xs text-amber-700">
                {status?.notReadyReason ||
                  'Finish the registration setup on the Mapping page first.'}{' '}
                <Link
                  to={mappingLinkFor(status?.notReadyReason)}
                  className="font-semibold underline"
                >
                  Open Mapping
                </Link>
              </p>
            ) : null}
          </div>
        </div>

        <p className="pt-4 text-sm text-gray-600">
          {isLoading
            ? 'Checking your payout reports…'
            : error
            ? error.message
            : last
            ? lastUploadWords(last)
            : 'No payout report loaded yet.'}
        </p>

        {attention.length > 0 ? (
          <button
            type="button"
            onClick={() =>
              document
                .getElementById(PAYOUT_REVIEW_ID)
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
            className="mt-2 flex items-center gap-2 text-left text-sm font-semibold text-amber-700 hover:underline"
          >
            <HiOutlineExclamationCircle size={16} className="shrink-0" />
            {attention.join(' · ')}
          </button>
        ) : null}
      </div>

      <PayoutReview email={email} />

      <PayoutReportUploadModal
        open={uploading}
        email={email}
        registrationStartDay={status?.registrationStartDay ?? null}
        onClose={() => onUploadingChange(false)}
      />
    </section>
  )
}

export default PayoutReports
