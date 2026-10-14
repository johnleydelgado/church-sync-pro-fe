import React, { FC, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import Dropdown from 'react-select'
import { Spinner } from 'flowbite-react'
import {
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineRefresh,
} from 'react-icons/hi'

import { getQboData } from '@/common/api/qbo'
import {
  PayoutRecheckResult,
  PayoutReportError,
  PayoutResolveRequest,
  PayoutResolveResult,
  PayoutReview as PayoutReviewData,
  PayoutReviewRow,
  getPayoutReview,
  recheckPayoutGiving,
  resolvePayoutRow,
} from '@/common/api/user'
import { mainRoute } from '@/common/constant/route'
import { formatDate } from '@/common/utils/helper'
import { failNotification, successNotification } from '@/common/utils/toast'
import { RootState } from '@/redux/store'
import { useChurch } from '@/common/hooks/useChurch'
import { PAYOUT_REVIEW_ID, plural, reasonWords, usd } from './payoutCopy'

type Option = { value: string; label: string }

/** The lists the Mapping page loads from QuickBooks (`getQboData`); only these two are used here. */
interface QboLists {
  accounts?: { value: string; label: string; type?: string }[]
  classes?: { value: string; label: string }[]
}

// Resolving a row can post to QuickBooks, so the statement and balance move as well as the list.
const CHANGED_BY_RESOLVE = [
  'payoutReview',
  'payoutReportStatus',
  'getClearingStatement',
  'getDailyJournalEntries',
]

const cents = (dollars: number) => Math.round(dollars * 100)

/**
 * Why CSP cannot post a held line itself, or null when it can. The server refuses these too
 * (the amounts must add up, and a refund that returns a fee has no known accounting); saying so
 * up front beats offering a button that can only fail.
 */
const whyNotPostable = (row: PayoutReviewRow): string | null => {
  if (
    row.reason === 'amounts_do_not_add_up' ||
    cents(row.gross) - cents(row.fee) !== cents(row.net)
  )
    return "The amounts don't add up, so CSP can't post this line. Record it in QuickBooks yourself, then mark it handled."
  if (row.reason === 'refund_with_fee' || (row.gross < 0 && row.fee !== 0))
    return "CSP can't post a refund that returns a fee. Record it in QuickBooks yourself, then mark it handled."
  if (cents(row.gross) === 0) return 'There is no amount to post.'
  return null
}

const ActionButton: FC<{
  onClick: () => void
  disabled?: boolean
  primary?: boolean
  children: React.ReactNode
}> = ({ onClick, disabled, primary, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
      primary
        ? 'border-yellow bg-yellow text-white hover:opacity-90'
        : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
    }`}
  >
    {children}
  </button>
)

/** One mutation per row, so each row shows its own progress and its own error. */
const useResolveRow = (email: string) => {
  const queryClient = useQueryClient()
  return useMutation<
    PayoutResolveResult,
    PayoutReportError,
    PayoutResolveRequest
  >((request) => resolvePayoutRow(email, request), {
    onSuccess: (result, request) => {
      successNotification({
        title:
          request.action === 'dismiss'
            ? 'Marked as handled outside CSP'
            : request.action === 'mark_posted'
            ? 'Marked as posted'
            : `Posted to QuickBooks${
                result?.docNumber ? ` as ${result.docNumber}` : ''
              }${result?.qboEntryId ? ` (#${result.qboEntryId})` : ''}`,
      })
      CHANGED_BY_RESOLVE.forEach((key) => queryClient.invalidateQueries(key))
    },
    onError: (e) => {
      failNotification({ title: e.message })
    },
  })
}

/** Date, what the line is, how much, and why it is here. */
const RowSummary: FC<{ row: PayoutReviewRow; reason: string | null }> = ({
  row,
  reason,
}) => (
  <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1">
    <div className="min-w-0">
      <p
        className="text-sm font-medium text-gray-800"
        title={row.description ?? undefined}
      >
        {formatDate(row.day)} ·{' '}
        {row.fundOrSignup || row.description || 'No description'}
      </p>
      <p className="text-xs text-gray-500">
        {[
          `${row.source} ${row.type.toLowerCase()}`,
          row.name,
          typeof row.line === 'number' ? `line ${row.line}` : '',
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      {reason ? (
        <p className="pt-1 text-xs font-medium text-amber-700">
          {reasonWords(reason)}
        </p>
      ) : null}
    </div>
    <div className="text-right">
      <p className="text-sm font-semibold tabular-nums text-primary">
        {usd(row.gross)}
      </p>
      {Number(row.fee) ? (
        <p className="text-xs tabular-nums text-gray-400">
          fee {usd(row.fee)} · net {usd(row.net)}
        </p>
      ) : null}
    </div>
  </div>
)

/** "Handled outside CSP": the line is never recorded by CSP, and the note says why. */
const NotePanel: FC<{
  busy: boolean
  onCancel: () => void
  onSave: (note: string) => void
}> = ({ busy, onCancel, onSave }) => {
  const [note, setNote] = useState('')
  return (
    <div className="mt-3 rounded-lg bg-slate-50 p-4">
      <label className="block text-xs font-semibold text-gray-500">
        How was it handled? (required)
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm font-normal text-gray-700"
          placeholder="e.g. Recorded by hand in QuickBooks, journal no. 1043"
        />
      </label>
      <p className="pt-1 text-xs text-gray-400">
        CSP won&apos;t record this line. The note stays with it.
      </p>
      <div className="flex gap-2 pt-3">
        <ActionButton
          primary
          disabled={busy || !note.trim()}
          onClick={() => onSave(note.trim())}
        >
          {busy ? <Spinner size="xs" /> : null}
          Mark as handled
        </ActionButton>
        <ActionButton disabled={busy} onClick={onCancel}>
          Cancel
        </ActionButton>
      </div>
    </div>
  )
}

/** "Code it": choose where a held line goes, then post it on its own. */
const CodeItPanel: FC<{
  row: PayoutReviewRow
  busy: boolean
  onCancel: () => void
  onPost: (account: Option, cls: Option | null) => void
}> = ({ row, busy, onCancel, onPost }) => {
  const { email, churchId } = useChurch()

  // Same query (and cache) as the Mapping page.
  const { data: qboData, isLoading } = useQuery<QboLists | undefined>(
    ['getAllQboData', churchId],
    async () => await getQboData(email),
    { enabled: !!churchId, staleTime: Infinity, refetchOnWindowFocus: false },
  )

  const accounts = useMemo<Option[]>(
    () =>
      (qboData?.accounts ?? [])
        .filter((a) => a.type !== 'Bank' && a.type !== 'Credit Card')
        .map((a) => ({ value: a.value, label: a.label })),
    [qboData],
  )
  const classes = useMemo<Option[]>(
    () =>
      (qboData?.classes ?? []).map((c) => ({ value: c.value, label: c.label })),
    [qboData],
  )

  // undefined = untouched, so the import's own suggestion (the row's account and class, when it
  // had one) shows until the person picks something else - including "no class".
  const [account, setAccount] = useState<Option | null | undefined>()
  const [cls, setCls] = useState<Option | null | undefined>()
  const chosenAccount =
    account === undefined
      ? accounts.find((a) => a.value === row.accountRef) ?? null
      : account
  const chosenClass =
    cls === undefined
      ? classes.find((c) => c.value === row.classRef) ?? null
      : cls

  return (
    <div className="mt-3 rounded-lg bg-slate-50 p-4">
      <p className="text-sm text-gray-600">
        {row.gross > 0
          ? `Posts a journal entry dated ${formatDate(row.day)}: ${usd(
              row.gross,
            )} to the account you choose${
              row.fee ? `, ${usd(row.fee)} to Stripe fees` : ''
            }, ${usd(row.net)} to Clearing.`
          : `Posts a refund entry dated ${formatDate(row.day)}: ${usd(
              -row.gross,
            )} back out of the account you choose and out of Clearing.`}
      </p>
      {isLoading ? (
        <p className="flex items-center gap-2 pt-3 text-sm text-gray-500">
          <Spinner size="sm" />
          Loading your QuickBooks accounts…
        </p>
      ) : accounts.length === 0 ? (
        <p className="pt-3 text-sm text-red-600">
          Couldn&apos;t load your QuickBooks accounts. Check QuickBooks is
          connected, then try again.
        </p>
      ) : (
        <div className="flex flex-wrap gap-4 pt-3">
          <div className="w-72">
            <p className="pb-1 text-xs font-semibold text-gray-500">Account</p>
            <Dropdown<Option, false>
              options={accounts}
              value={chosenAccount}
              onChange={(v) => setAccount(v ?? null)}
              placeholder="Choose an account"
              isDisabled={busy}
            />
          </div>
          <div className="w-72">
            <p className="pb-1 text-xs font-semibold text-gray-500">
              Class (optional)
            </p>
            <Dropdown<Option, false>
              options={classes}
              value={chosenClass}
              onChange={(v) => setCls(v ?? null)}
              placeholder="No class"
              isClearable
              isDisabled={busy}
            />
          </div>
        </div>
      )}
      <div className="flex gap-2 pt-3">
        <ActionButton
          primary
          disabled={busy || !chosenAccount}
          onClick={() => chosenAccount && onPost(chosenAccount, chosenClass)}
        >
          {busy ? <Spinner size="xs" /> : null}
          Post to QuickBooks
        </ActionButton>
        <ActionButton disabled={busy} onClick={onCancel}>
          Cancel
        </ActionButton>
      </div>
    </div>
  )
}

/**
 * "Mark posted", for a posting that was interrupted: QuickBooks may have the entry even though
 * CSP never heard back, so the person checks and gives its number - CSP must not post it twice.
 */
const MarkPostedPanel: FC<{
  row: PayoutReviewRow
  busy: boolean
  onCancel: () => void
  onSave: (qboEntryId: string) => void
}> = ({ row, busy, onCancel, onSave }) => {
  const [entry, setEntry] = useState('')
  return (
    <div className="mt-3 rounded-lg bg-slate-50 p-4">
      <p className="text-sm text-gray-600">
        Look in QuickBooks for a journal entry dated {formatDate(row.day)} with
        a memo starting &ldquo;Church Sync Pro - PCO Registrations&rdquo;. If
        it&apos;s there, enter its number.
      </p>
      <label className="block pt-3 text-xs font-semibold text-gray-500">
        QuickBooks entry number
        <input
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          className="mt-1 block w-48 rounded-md border border-gray-300 px-2 py-1.5 text-sm font-normal text-gray-700"
          placeholder="e.g. 30012"
        />
      </label>
      <p className="pt-1 text-xs text-gray-400">
        The number after txnId= in the entry&apos;s web address.
      </p>
      <div className="flex gap-2 pt-3">
        <ActionButton
          primary
          disabled={busy || !entry.trim()}
          onClick={() => onSave(entry.trim())}
        >
          {busy ? <Spinner size="xs" /> : null}
          Mark posted
        </ActionButton>
        <ActionButton disabled={busy} onClick={onCancel}>
          Cancel
        </ActionButton>
      </div>
    </div>
  )
}

/** "Post now", only once the person has confirmed QuickBooks has no entry for it. */
const PostNowPanel: FC<{
  row: PayoutReviewRow
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}> = ({ row, busy, onCancel, onConfirm }) => (
  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
    <p className="font-semibold">QuickBooks has no entry for this?</p>
    <p className="pt-1">
      Posting writes a new journal entry dated {formatDate(row.day)}. If
      QuickBooks already has it, the money is recorded twice — use Mark posted
      instead.
    </p>
    <div className="flex gap-2 pt-3">
      <ActionButton primary disabled={busy} onClick={onConfirm}>
        {busy ? <Spinner size="xs" /> : null}
        Yes, post it
      </ActionButton>
      <ActionButton disabled={busy} onClick={onCancel}>
        Cancel
      </ActionButton>
    </div>
  </div>
)

type Panel = 'code' | 'dismiss' | 'mark_posted' | 'post_now' | null

/** A held line, or a posting that was interrupted. */
const NeedsCodingRow: FC<{ row: PayoutReviewRow; email: string }> = ({
  row,
  email,
}) => {
  const [panel, setPanel] = useState<Panel>(null)
  const [done, setDone] = useState(false)
  const resolve = useResolveRow(email)
  const interrupted = row.status === 'posting_interrupted'
  const notPostable = interrupted ? null : whyNotPostable(row)

  const send = (request: PayoutResolveRequest) =>
    resolve.mutate(request, {
      // The row leaves the list when it refetches; until then, no second click.
      onSuccess: () => {
        setPanel(null)
        setDone(true)
      },
    })

  return (
    <li className="py-4">
      <RowSummary
        row={row}
        reason={interrupted ? 'posting_interrupted' : row.reason}
      />

      {done ? (
        <p className="flex items-center gap-1.5 pt-2 text-xs font-semibold text-success">
          <HiOutlineCheckCircle size={16} />
          Done
        </p>
      ) : panel === 'code' ? (
        <CodeItPanel
          row={row}
          busy={resolve.isLoading}
          onCancel={() => setPanel(null)}
          onPost={(account, cls) =>
            send({ id: row.id, action: 'post', account, class: cls })
          }
        />
      ) : panel === 'dismiss' ? (
        <NotePanel
          busy={resolve.isLoading}
          onCancel={() => setPanel(null)}
          onSave={(note) => send({ id: row.id, action: 'dismiss', note })}
        />
      ) : panel === 'mark_posted' ? (
        <MarkPostedPanel
          row={row}
          busy={resolve.isLoading}
          onCancel={() => setPanel(null)}
          onSave={(qboEntryId) =>
            send({ id: row.id, action: 'mark_posted', qboEntryId })
          }
        />
      ) : panel === 'post_now' ? (
        <PostNowPanel
          row={row}
          busy={resolve.isLoading}
          onCancel={() => setPanel(null)}
          onConfirm={() => send({ id: row.id, action: 'post_now' })}
        />
      ) : interrupted ? (
        <div className="flex flex-wrap gap-2 pt-2">
          <ActionButton onClick={() => setPanel('mark_posted')}>
            Mark posted
          </ActionButton>
          <ActionButton onClick={() => setPanel('post_now')}>
            Post now
          </ActionButton>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {notPostable ? null : (
            <ActionButton primary onClick={() => setPanel('code')}>
              Code it
            </ActionButton>
          )}
          <ActionButton onClick={() => setPanel('dismiss')}>
            Handled outside CSP
          </ActionButton>
          {notPostable ? (
            <p className="w-full text-xs text-gray-500">{notPostable}</p>
          ) : null}
        </div>
      )}

      {resolve.isError && !done ? (
        <p className="pt-2 text-xs text-red-600">{resolve.error.message}</p>
      ) : null}
    </li>
  )
}

/** One gift whose day isn't (fully) in QuickBooks. Only "handled outside CSP" applies to it alone. */
const GivingRow: FC<{ row: PayoutReviewRow; email: string }> = ({
  row,
  email,
}) => {
  const [dismissing, setDismissing] = useState(false)
  const [done, setDone] = useState(false)
  const resolve = useResolveRow(email)

  return (
    <li className="py-3">
      <RowSummary row={row} reason={row.reason} />
      {done ? (
        <p className="flex items-center gap-1.5 pt-2 text-xs font-semibold text-success">
          <HiOutlineCheckCircle size={16} />
          Done
        </p>
      ) : dismissing ? (
        <NotePanel
          busy={resolve.isLoading}
          onCancel={() => setDismissing(false)}
          onSave={(note) =>
            resolve.mutate(
              { id: row.id, action: 'dismiss', note },
              {
                onSuccess: () => {
                  setDismissing(false)
                  setDone(true)
                },
              },
            )
          }
        />
      ) : (
        <div className="pt-2">
          <ActionButton onClick={() => setDismissing(true)}>
            Handled outside CSP
          </ActionButton>
        </div>
      )}
      {resolve.isError && !done ? (
        <p className="pt-2 text-xs text-red-600">{resolve.error.message}</p>
      ) : null}
    </li>
  )
}

/**
 * The giving lines of one day. Grouped because the fix is usually per day - post it on Daily
 * Giving, then Check again - and a busy unposted day can hold dozens of gifts.
 */
const GivingDay: FC<{
  day: string
  rows: PayoutReviewRow[]
  email: string
}> = ({ day, rows, email }) => {
  const [open, setOpen] = useState(false)
  // Number(): `+` would concatenate an amount that arrived as a string.
  const gross = rows.reduce((sum, row) => sum + Number(row.gross), 0)
  const net = rows.reduce((sum, row) => sum + Number(row.net), 0)
  const reasons = rows
    .map((row) => row.reason ?? '')
    .filter((reason, i, all) => reason && all.indexOf(reason) === i)
  // Daily Giving is where a day gets posted; it can't help a gift Planning Center doesn't list.
  const postOnDailyGiving = rows.some(
    (row) =>
      row.reason === 'day_not_posted' || row.reason === 'day_partly_posted',
  )

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800">
            {formatDate(day)} · {plural(rows.length, 'gift', 'gifts')}
          </p>
          {reasons.length ? (
            <p className="pt-1 text-xs font-medium text-amber-700">
              {reasons.map((reason) => reasonWords(reason)).join(' · ')}
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums text-primary">
            {usd(gross)}
          </p>
          <p className="text-xs tabular-nums text-gray-400">net {usd(net)}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 pt-2 text-sm">
        {postOnDailyGiving ? (
          <Link
            to={mainRoute.TRANSACTION}
            className="font-semibold text-blue-400 underline"
          >
            Post it on Daily Giving
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="text-gray-500 underline"
        >
          {open ? 'Hide the gifts' : 'Show the gifts'}
        </button>
      </div>
      {open ? (
        <ul className="mt-3 divide-y divide-gray-100 rounded-lg bg-slate-50 px-4">
          {rows.map((row) => (
            <GivingRow key={row.id} row={row} email={email} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

/**
 * The review list under the payout-report card: every line CSP did not record on its own. A
 * line stays until it is posted or someone marks it handled - Matt's rule is that no dollar in a
 * payout passes quietly. Hidden entirely when there is nothing to review.
 */
const PayoutReview: FC<{ email: string }> = ({ email }) => {
  const queryClient = useQueryClient()

  const { data, error } = useQuery<PayoutReviewData | null, PayoutReportError>(
    ['payoutReview', email],
    async () => (email ? await getPayoutReview(email) : null),
    {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      enabled: !!email,
      retry: false,
    },
  )

  const recheck = useMutation<PayoutRecheckResult, PayoutReportError>(
    async () => recheckPayoutGiving(email),
    {
      onSuccess: (result) => {
        successNotification({
          title:
            result.nowCovered > 0
              ? `${plural(
                  result.nowCovered,
                  'giving line is',
                  'giving lines are',
                )} in QuickBooks now; ${result.stillNotPosted} still not`
              : `Checked ${plural(
                  result.checked,
                  'giving line',
                  'giving lines',
                )}: none are in QuickBooks yet`,
        })
        queryClient.invalidateQueries('payoutReview')
        queryClient.invalidateQueries('payoutReportStatus')
      },
      onError: (e) => {
        failNotification({ title: e.message })
      },
    },
  )

  // Interrupted postings first: QuickBooks may already hold them, which is the most urgent thing
  // here to check. (Each list defaults to empty: this renders on every visit to the page, and
  // there is no error boundary above it.)
  const needsCoding = useMemo(
    () => [...(data?.postingInterrupted ?? []), ...(data?.held ?? [])],
    [data],
  )
  const givingDays = useMemo(() => {
    const byDay: Record<string, PayoutReviewRow[]> = {}
    for (const row of data?.givingNotPosted ?? []) {
      const rows = byDay[row.day] ?? []
      rows.push(row)
      byDay[row.day] = rows
    }
    return Object.keys(byDay)
      .sort()
      .map((day) => ({ day, rows: byDay[day] ?? [] }))
  }, [data])
  const givingLines = data?.givingNotPosted?.length ?? 0

  if (error) {
    return (
      <p
        id={PAYOUT_REVIEW_ID}
        className="flex items-center gap-2 pt-4 text-sm text-red-600 print:hidden"
      >
        <HiOutlineExclamationCircle size={16} />
        {error.message}
      </p>
    )
  }
  if (!needsCoding.length && !givingLines) return null

  return (
    <div
      id={PAYOUT_REVIEW_ID}
      className="mt-4 scroll-mt-4 rounded-xl border border-amber-200 p-6 print:hidden"
    >
      <h3 className="text-base font-bold text-primary">Review list</h3>
      <p className="max-w-2xl pt-1 text-sm text-gray-500">
        Lines from your payout reports that CSP didn&apos;t record on its own.
        Each one stays here until it is posted or marked as handled.
      </p>

      {needsCoding.length > 0 ? (
        <div className="pt-5">
          <h4 className="text-sm font-semibold text-gray-800">
            Needs coding{' '}
            <span className="font-normal text-gray-400">
              ({needsCoding.length})
            </span>
          </h4>
          <ul className="divide-y divide-gray-100">
            {needsCoding.map((row) => (
              <NeedsCodingRow key={row.id} row={row} email={email} />
            ))}
          </ul>
        </div>
      ) : null}

      {givingLines > 0 ? (
        <div className="pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-gray-800">
              Giving not in QuickBooks yet{' '}
              <span className="font-normal text-gray-400">({givingLines})</span>
            </h4>
            <ActionButton
              onClick={() => recheck.mutate()}
              disabled={recheck.isLoading}
            >
              {recheck.isLoading ? (
                <Spinner size="xs" />
              ) : (
                <HiOutlineRefresh size={14} />
              )}
              Check again
            </ActionButton>
          </div>
          <p className="max-w-2xl pt-1 text-xs text-gray-500">
            Giving in your payout that CSP hasn&apos;t posted yet. Post those
            days on Daily Giving, then press Check again.
          </p>
          <ul className="divide-y divide-gray-100">
            {givingDays.map(({ day, rows }) => (
              <GivingDay key={day} day={day} rows={rows} email={email} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export default PayoutReview
