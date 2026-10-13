import React, { FC, useState } from 'react'
import { useQuery } from 'react-query'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Button } from '@material-tailwind/react'
import { HiOutlineExclamationCircle, HiOutlineUpload } from 'react-icons/hi'

import {
  PayoutReportError,
  PayoutStatus,
  getPayoutReportStatus,
} from '@/common/api/user'
import { formatDate } from '@/common/utils/helper'
import { RootState } from '@/redux/store'
import PayoutReportUploadModal from './PayoutReportUploadModal'
import { dayRange, mappingLinkFor, plural } from './payoutCopy'

/** The review list's element id, so the "need review" line can take the reader there. */
export const PAYOUT_REVIEW_ID = 'payout-review'

/**
 * Payout reports, on the Clearing page.
 *
 * Planning Center pays giving AND event registrations out in the same Stripe deposits, and CSP
 * only hears about giving from the API - so each deposit can carry money CSP never recorded. The
 * church uploads the payout report instead; this card says when that last happened, what is
 * still waiting for a person, and opens the upload.
 */
const PayoutReports: FC = () => {
  const { user } = useSelector((state: RootState) => state.common)
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const [uploading, setUploading] = useState(false)

  const email =
    user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email

  const {
    data: status,
    isLoading,
    error,
  } = useQuery<PayoutStatus | null, PayoutReportError>(
    ['payoutReportStatus', email],
    async () => (email ? await getPayoutReportStatus(email) : null),
    {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      enabled: !!email,
      retry: false,
    },
  )

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
              Stripe deposits carry event and registration payments as well as
              giving. Upload Planning Center&apos;s payout report each week, and
              once before month-end, so CSP records those payments too.
            </p>
          </div>
          <div className="flex max-w-xs flex-col items-end gap-2">
            <Button
              size="sm"
              onClick={() => setUploading(true)}
              disabled={!email || blocked}
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
            ? [
                `Last loaded ${formatDate(last.uploadedAt)}${
                  last.uploadedBy ? ` by ${last.uploadedBy}` : ''
                }`,
                last.fileName,
                last.firstDay || last.lastDay
                  ? `charges ${dayRange(last.firstDay, last.lastDay)}`
                  : '',
              ]
                .filter(Boolean)
                .join(' · ')
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

      <PayoutReportUploadModal
        open={uploading}
        email={email}
        registrationStartDay={status?.registrationStartDay ?? null}
        onClose={() => setUploading(false)}
      />
    </section>
  )
}

export default PayoutReports
