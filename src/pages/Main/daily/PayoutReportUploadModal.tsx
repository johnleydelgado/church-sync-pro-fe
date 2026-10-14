import React, { FC, useEffect, useState } from 'react'
import { useMutation, useQueryClient } from 'react-query'
import { Link } from 'react-router-dom'
import { Dialog, Transition } from '@headlessui/react'
import { Button } from '@material-tailwind/react'
import { Spinner } from 'flowbite-react'
import {
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineInformationCircle,
  HiOutlineUpload,
} from 'react-icons/hi'

import {
  PayoutImportResult,
  PayoutReportError,
  PayoutSummary,
  importPayoutReport,
  previewPayoutReport,
} from '@/common/api/user'
import { mainRoute } from '@/common/constant/route'
import { formatDate } from '@/common/utils/helper'
import {
  dayRange,
  mappingLinkFor,
  plural,
  reasonWords,
  usd,
} from './payoutCopy'

interface PayoutReportUploadModalProps {
  open: boolean
  /** The selected church's account email (`useChurch().email`). */
  email: string
  /** The registration start date, YYYY-MM-DD, for the "before your start date" line. */
  registrationStartDay: string | null
  onClose: () => void
}

type Step =
  | { name: 'choose' }
  | {
      name: 'preview'
      fileName: string
      csvText: string
      summary: PayoutSummary
    }
  | { name: 'result'; result: PayoutImportResult }

// The server refuses anything bigger; a month of payout lines is a small fraction of this.
const MAX_FILE_BYTES = 5 * 1024 * 1024

// What an import can change: the statement and the balance card above it, the status line, the
// review list - and the event names the Mapping page offers.
const CHANGED_BY_IMPORT = [
  'getClearingStatement',
  'getDailyJournalEntries',
  'payoutReportStatus',
  'payoutReview',
  'payoutSignups',
]

/** How many lines of a list the preview shows before "and N more". */
const PREVIEW_LIST_LIMIT = 5

/**
 * Upload Planning Center's payout report: choose the CSV, read what CSP would do with it, then
 * record it. Nothing is written until the second step is confirmed - the preview call writes
 * nothing - and the third step shows exactly which QuickBooks entries were made.
 */
const PayoutReportUploadModal: FC<PayoutReportUploadModalProps> = ({
  open,
  email,
  registrationStartDay,
  onClose,
}) => {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>({ name: 'choose' })
  // Shown inline, in the step it belongs to, rather than as a toast: "this isn't a payout
  // report" or "set the start date first" has to stay readable while the person acts on it.
  const [error, setError] = useState<PayoutReportError | null>(null)

  // Every opening starts clean: a preview left over from the last file must never be the one
  // that gets confirmed.
  useEffect(() => {
    if (open) {
      setStep({ name: 'choose' })
      setError(null)
    }
  }, [open])

  const preview = useMutation<
    { fileName: string; csvText: string; summary: PayoutSummary },
    PayoutReportError,
    File
  >(
    async (file) => {
      if (file.size > MAX_FILE_BYTES)
        throw new Error(
          'That file is over 5 MB — far bigger than a payout report. Check you picked the right file.',
        )
      const csvText = await file.text()
      const summary = await previewPayoutReport(email, file.name, csvText)
      return { fileName: file.name, csvText, summary }
    },
    {
      onMutate: () => setError(null),
      onSuccess: (read) => setStep({ name: 'preview', ...read }),
      onError: (e) => setError(e),
    },
  )

  const record = useMutation<
    PayoutImportResult,
    PayoutReportError,
    { fileName: string; csvText: string }
  >(
    async ({ fileName, csvText }) =>
      importPayoutReport(email, fileName, csvText),
    {
      onMutate: () => setError(null),
      onSuccess: (result) => setStep({ name: 'result', result }),
      onError: (e) => setError(e),
      // Settled, not only success: an import that fails part-way can still have written rows.
      onSettled: () =>
        CHANGED_BY_IMPORT.forEach((key) => queryClient.invalidateQueries(key)),
    },
  )

  const busy = preview.isLoading || record.isLoading
  // Not while a request is in flight: closing then would hide whether the file was recorded.
  const close = () => {
    if (!busy) onClose()
  }

  const chooseFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Cleared, so picking the same file again - after fixing it - still fires a change.
    e.target.value = ''
    if (file) preview.mutate(file)
  }

  const title =
    step.name === 'choose'
      ? 'Upload a payout report'
      : step.name === 'preview'
      ? 'Check before recording'
      : step.result.entries.some((entry) => entry.error)
      ? 'Recorded, with entries still to post'
      : 'Payout report recorded'

  return (
    <Transition appear show={open} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={close}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-semibold text-primary"
                >
                  {title}
                </Dialog.Title>

                {step.name === 'choose' ? (
                  <div className="pt-2 text-sm text-gray-600">
                    <p>
                      Export it from Planning Center (Accounts → payout report,
                      with full transaction details). The file is named like{' '}
                      <span className="font-mono text-xs">
                        payout_transactions_2026-10-12.csv
                      </span>
                      . Nothing is recorded until you confirm on the next step.
                    </p>
                    <label
                      className={`mt-4 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-4 py-8 font-semibold text-gray-600 focus-within:border-primary ${
                        busy
                          ? 'cursor-wait opacity-60'
                          : 'cursor-pointer hover:border-primary hover:text-primary'
                      }`}
                    >
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="sr-only"
                        disabled={busy}
                        onChange={chooseFile}
                      />
                      {preview.isLoading ? (
                        <>
                          <Spinner size="sm" />
                          Reading the file…
                        </>
                      ) : (
                        <>
                          <HiOutlineUpload size={20} />
                          Choose the CSV file
                        </>
                      )}
                    </label>
                  </div>
                ) : step.name === 'preview' ? (
                  <PreviewStep
                    fileName={step.fileName}
                    summary={step.summary}
                    registrationStartDay={registrationStartDay}
                  />
                ) : (
                  <ResultStep result={step.result} />
                )}

                {error ? <ErrorNote error={error} /> : null}

                <div className="flex flex-wrap items-center justify-end gap-3 pt-6">
                  {step.name === 'choose' ? (
                    <Button
                      size="sm"
                      variant="outlined"
                      onClick={close}
                      disabled={busy}
                      className="border-gray-300 normal-case text-gray-600"
                    >
                      Cancel
                    </Button>
                  ) : step.name === 'preview' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null)
                          setStep({ name: 'choose' })
                        }}
                        disabled={busy}
                        className="mr-auto text-sm font-medium text-gray-500 underline disabled:opacity-50"
                      >
                        Choose a different file
                      </button>
                      <Button
                        size="sm"
                        variant="outlined"
                        onClick={close}
                        disabled={busy}
                        className="border-gray-300 normal-case text-gray-600"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          record.mutate({
                            fileName: step.fileName,
                            csvText: step.csvText,
                          })
                        }
                        disabled={busy}
                        className="flex items-center gap-2 bg-yellow normal-case"
                      >
                        {record.isLoading ? (
                          <>
                            <Spinner size="sm" />
                            Recording…
                          </>
                        ) : step.summary.registrations.toPost.count > 0 ? (
                          `Record ${plural(
                            step.summary.registrations.toPost.count,
                            'payment',
                            'payments',
                          )}`
                        ) : (
                          // Nothing to post: the upload still records the giving check and
                          // "last loaded", and hands any held lines to the review list.
                          'Save upload'
                        )}
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={close}
                      className="bg-yellow normal-case"
                    >
                      Done
                    </Button>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

/** Step 2: what recording the file would do, in sentences rather than a dump of rows. */
/**
 * Re-uploading is safe - lines an earlier upload brought in are skipped, never recorded twice -
 * but people should see that before they press Record, not wonder afterwards.
 */
const OverlapNotice: FC<{ summary: PayoutSummary }> = ({ summary }) => {
  const overlap = summary.overlap
  if (!overlap) return null
  const { rowsSeenBefore, previousUploads } = overlap
  if (rowsSeenBefore === 0 && previousUploads.length === 0) return null
  const everything =
    summary.file.rows > 0 && rowsSeenBefore >= summary.file.rows
  const latest = previousUploads[0]

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sky-900">
      <p className="flex items-center gap-2 font-semibold">
        <HiOutlineInformationCircle size={16} className="shrink-0" />
        {everything
          ? 'Everything in this file was already uploaded.'
          : rowsSeenBefore > 0
          ? `${plural(
              rowsSeenBefore,
              'line in this file was',
              'lines in this file were',
            )} already uploaded.`
          : 'You already uploaded a report covering some of these dates.'}
      </p>
      {latest ? (
        <p className="pt-1">
          Earlier upload: {latest.fileName || 'a payout report'}, uploaded{' '}
          {formatDate(latest.uploadedAt)}
          {latest.uploadedBy ? ` by ${latest.uploadedBy}` : ''}
          {latest.firstDay
            ? `, charges ${dayRange(latest.firstDay, latest.lastDay)}`
            : ''}
          {previousUploads.length > 1
            ? ` (and ${plural(
                previousUploads.length - 1,
                'other upload',
                'other uploads',
              )})`
            : ''}
          .
        </p>
      ) : null}
      <p className="pt-1">
        {everything
          ? 'Nothing in it will be recorded twice, so there is nothing new to record.'
          : rowsSeenBefore > 0
          ? 'Those lines are skipped; only the new ones are recorded.'
          : 'None of its lines are in this file, so all of these are new.'}
      </p>
    </div>
  )
}

const PreviewStep: FC<{
  fileName: string
  summary: PayoutSummary
  registrationStartDay: string | null
}> = ({ fileName, summary, registrationStartDay }) => {
  const { registrations, entries, giving, held } = summary
  const { toPost } = registrations
  const refunds = entries
    .filter((entry) => entry.kind === 'refund')
    .reduce((n, entry) => n + entry.count, 0)
  const notPostedLines = giving.notPosted.reduce((n, day) => n + day.count, 0)

  return (
    <div className="space-y-3 pt-2 text-sm text-gray-700">
      <p className="text-gray-500">
        {fileName} · {plural(summary.file.rows, 'line', 'lines')}
        {summary.file.firstDay || summary.file.lastDay
          ? ` · charges ${dayRange(
              summary.file.firstDay,
              summary.file.lastDay,
            )}`
          : ''}
      </p>

      <OverlapNotice summary={summary} />

      <ul className="list-disc space-y-1 pl-5">
        <li>
          {toPost.count > 0 ? (
            <>
              Records{' '}
              {plural(
                toPost.count,
                'registration payment',
                'registration payments',
              )}
              {refunds > 0
                ? `, including ${plural(refunds, 'refund', 'refunds')}`
                : ''}
              : <strong>{usd(toPost.gross)}</strong> to income,{' '}
              <strong>{usd(toPost.fees)}</strong> fees,{' '}
              <strong>{usd(toPost.net)}</strong> to Clearing, in{' '}
              {plural(entries.length, 'entry', 'entries')}.
            </>
          ) : (
            'No new registration payments to record.'
          )}
        </li>
        {registrations.alreadyRecorded > 0 ? (
          <li>{registrations.alreadyRecorded} already recorded (skipped).</li>
        ) : null}
        {registrations.beforeStart.count > 0 ? (
          <li>
            {registrations.beforeStart.count} charged before your start date
            {registrationStartDay
              ? ` of ${formatDate(registrationStartDay)}`
              : ''}{' '}
            (left alone).
          </li>
        ) : null}
        {giving.covered > 0 ? (
          // `covered` also counts giving dated before the church's sync start date, which the
          // summary does not separate out - so the sentence says both.
          <li>
            {plural(giving.covered, 'giving line is', 'giving lines are')}{' '}
            already in QuickBooks, or dated before your sync start date.
          </li>
        ) : null}
      </ul>

      {giving.notPosted.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
          <p className="flex items-center gap-2 font-semibold">
            <HiOutlineExclamationCircle size={16} className="shrink-0" />
            {plural(notPostedLines, 'giving line is', 'giving lines are')} on
            days that aren&apos;t in QuickBooks yet:
          </p>
          <ul className="list-disc space-y-0.5 pl-9 pt-1">
            {giving.notPosted.map((day) => (
              <li key={`${day.day}-${day.reason}`}>
                {formatDate(day.day)} — {plural(day.count, 'gift', 'gifts')},{' '}
                {usd(day.net)}: {reasonWords(day.reason)}
              </li>
            ))}
          </ul>
          <p className="pt-2">
            They will wait in the review list. Post those days on{' '}
            <Link
              to={mainRoute.TRANSACTION}
              className="font-semibold underline"
            >
              Daily Giving
            </Link>
            , then press Check again in the review list.
          </p>
        </div>
      ) : null}

      {held.length > 0 ? (
        <div className="rounded-lg border border-gray-200 p-3">
          <p className="font-semibold text-gray-800">
            {plural(held.length, 'line needs', 'lines need')} a look — they will
            wait in the review list.
          </p>
          <ul className="list-disc space-y-0.5 pl-5 pt-1 text-gray-600">
            {held.slice(0, PREVIEW_LIST_LIMIT).map((row) => (
              <li key={row.line}>
                Line {row.line} · {formatDate(row.day)} · {row.source}{' '}
                {row.type.toLowerCase()}
                {row.fundOrSignup ? ` · ${row.fundOrSignup}` : ''} ·{' '}
                {usd(row.net)}: {reasonWords(row.reason)}
              </li>
            ))}
          </ul>
          {held.length > PREVIEW_LIST_LIMIT ? (
            <p className="pt-1 text-gray-500">
              …and {held.length - PREVIEW_LIST_LIMIT} more.
            </p>
          ) : null}
        </div>
      ) : null}

      {entries.length > 0 ? (
        <details className="rounded-lg border border-gray-100 px-3 py-2">
          <summary className="cursor-pointer text-gray-500">
            See the {plural(entries.length, 'entry', 'entries')}
          </summary>
          <EntryTable entries={entries} />
        </details>
      ) : null}
    </div>
  )
}

/** Step 3: what was actually written to QuickBooks, and what was not. */
const ResultStep: FC<{ result: PayoutImportResult }> = ({ result }) => {
  const posted = result.entries.filter((entry) => !entry.error)
  const failed = result.entries.filter((entry) => entry.error)
  const notPostedLines = result.giving.notPosted.reduce(
    (n, day) => n + day.count,
    0,
  )

  return (
    <div className="space-y-3 pt-2 text-sm text-gray-700">
      {posted.length > 0 ? (
        <>
          <p className="flex items-center gap-2 font-semibold text-success">
            <HiOutlineCheckCircle size={18} className="shrink-0" />
            Posted {plural(posted.length, 'entry', 'entries')} to QuickBooks
          </p>
          <EntryTable entries={posted} showQuickBooksId />
        </>
      ) : failed.length === 0 ? (
        <p className="flex items-center gap-2 font-semibold text-success">
          <HiOutlineCheckCircle size={18} className="shrink-0" />
          Saved. There were no new registration payments to post.
        </p>
      ) : null}

      {failed.length > 0 ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700"
        >
          <p className="flex items-center gap-2 font-semibold">
            <HiOutlineExclamationCircle size={18} className="shrink-0" />
            QuickBooks refused {plural(failed.length, 'entry', 'entries')}
          </p>
          <ul className="list-disc space-y-0.5 pl-9 pt-1">
            {failed.map((entry) => (
              <li key={`${entry.day}-${entry.kind}-${entry.docNumber}`}>
                {formatDate(entry.day)} · {entry.docNumber} · {usd(entry.net)}:{' '}
                {entry.error} — will retry on next upload.
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.held.length > 0 ? (
        <p>
          {plural(result.held.length, 'line is', 'lines are')} waiting in the
          review list.
        </p>
      ) : null}
      {notPostedLines > 0 ? (
        <p>
          {plural(notPostedLines, 'giving line is', 'giving lines are')} on days
          not in QuickBooks yet — they are in the review list too.
        </p>
      ) : null}
    </div>
  )
}

const EntryTable: FC<{
  entries: PayoutSummary['entries']
  showQuickBooksId?: boolean
}> = ({ entries, showQuickBooksId }) => (
  <div className="overflow-x-auto pt-2">
    <table className="w-full text-xs">
      <thead className="text-left uppercase tracking-wide text-gray-400">
        <tr>
          <th className="py-1 pr-3">Date</th>
          <th className="py-1 pr-3">Entry</th>
          {showQuickBooksId ? <th className="py-1 pr-3">QuickBooks</th> : null}
          <th className="py-1 pr-3 text-right">Payments</th>
          <th className="py-1 text-right">To clearing</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr
            key={`${entry.day}-${entry.kind}-${entry.docNumber}`}
            className="border-t border-gray-100"
          >
            <td className="py-1 pr-3 whitespace-nowrap">
              {formatDate(entry.day)}
              {entry.kind === 'refund' ? (
                <span className="text-red-600"> · refund</span>
              ) : null}
            </td>
            <td className="py-1 pr-3 font-mono">{entry.docNumber}</td>
            {showQuickBooksId ? (
              <td className="py-1 pr-3 font-mono">
                {entry.qboEntryId ? `#${entry.qboEntryId}` : '—'}
              </td>
            ) : null}
            <td className="py-1 pr-3 text-right tabular-nums">{entry.count}</td>
            <td className="py-1 text-right tabular-nums whitespace-nowrap">
              {usd(entry.net)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const ErrorNote: FC<{ error: PayoutReportError }> = ({ error }) => (
  <div
    role="alert"
    className="mt-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
  >
    <HiOutlineExclamationCircle size={18} className="mt-0.5 shrink-0" />
    <span>
      {error.message}
      {error.status === 409 ? (
        <>
          {' '}
          <Link
            to={mappingLinkFor(error.message)}
            className="font-semibold underline"
          >
            Open Mapping
          </Link>
        </>
      ) : null}
    </span>
  </div>
)

export default PayoutReportUploadModal
