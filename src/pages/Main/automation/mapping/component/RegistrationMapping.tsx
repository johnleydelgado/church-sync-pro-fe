import React, { FC, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { useSelector } from 'react-redux'
import Dropdown from 'react-select'
import CreatableSelect from 'react-select/creatable'
import { Button } from '@material-tailwind/react'
import { HiOutlineTrash, HiPlus } from 'react-icons/hi'

import {
  PayoutReportError,
  QboChoice,
  RegistrationMappingV2,
  getPayoutSignups,
  setStartDataAutomation,
  updateRegisterSettings,
} from '@/common/api/user'
import { UserSettingsProps } from '@/common/constant/interfaces'
import { failNotification, successNotification } from '@/common/utils/toast'
import { trackSave } from '@/common/utils/pendingSaves'
import { RootState } from '@/redux/store'
import { useChurch } from '@/common/hooks/useChurch'
import type { QboDataSelectProps } from '..'

interface RegistrationMappingProps {
  userData: UserSettingsProps | undefined
  /** The page's QuickBooks lists (`getQboData`). */
  qboData: QboDataSelectProps | undefined
}

type Option = { value: string; label: string }

interface EventRow {
  /** Stable React key; rows have no id of their own. */
  key: number
  signup: string
  account: QboChoice | null
  class: QboChoice | null
}

const EMPTY_MAPPING: RegistrationMappingV2 = {
  version: 2,
  default: { account: null, class: null },
  events: [],
}

const hasValue = (choice: any): choice is QboChoice =>
  !!choice && typeof choice.value === 'string' && choice.value !== ''

/**
 * The saved mapping, or an empty one. `settingRegistrationData` still holds the Stripe-era array
 * for some churches; only the `version: 2` object counts, and anything else reads as nothing set.
 */
const readMapping = (raw: unknown): RegistrationMappingV2 => {
  const data = raw as any
  if (!data || typeof data !== 'object' || Array.isArray(data))
    return EMPTY_MAPPING
  if (data.version !== 2) return EMPTY_MAPPING
  return {
    version: 2,
    default: {
      account: hasValue(data.default?.account) ? data.default.account : null,
      class: hasValue(data.default?.class) ? data.default.class : null,
    },
    events: (Array.isArray(data.events) ? data.events : [])
      .filter((e: any) => typeof e?.signup === 'string' && e.signup.trim())
      .map((e: any) => ({
        signup: e.signup,
        account: hasValue(e.account) ? e.account : null,
        class: hasValue(e.class) ? e.class : null,
      })),
  }
}

/** The column is MM-DD-YYYY (the format the rest of the app writes); a date input wants YYYY-MM-DD. */
const toInputDate = (stored: string | null | undefined) => {
  const us = /^(\d{2})-(\d{2})-(\d{4})$/.exec(stored ?? '')
  if (us) return `${us[3]}-${us[1]}-${us[2]}`
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(stored ?? '')
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : ''
}

const toStoredDate = (input: string) => {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input)
  return iso ? `${iso[2]}-${iso[3]}-${iso[1]}` : ''
}

/** A date input mid-typing can briefly hold year 0002; never save one of those. */
const isPlausibleDate = (input: string) => {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input)
  const year = Number(iso?.[1])
  return !!iso && year >= 2000 && year <= 2099
}

/** Event names match case- and space-insensitively, as the backend matches them. */
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** What the person would save, reduced to what matters, for spotting unsaved changes. */
const fingerprint = (
  account: QboChoice | null,
  cls: QboChoice | null,
  events: Omit<EventRow, 'key'>[],
) =>
  JSON.stringify([
    account?.value ?? null,
    cls?.value ?? null,
    events.map((e) => [
      norm(e.signup),
      e.account?.value ?? null,
      e.class?.value ?? null,
    ]),
  ])

/** The option for a saved choice - with QuickBooks' current name when it still exists. */
const asOption = (choice: QboChoice | null, options: Option[]) =>
  choice
    ? options.find((o) => o.value === choice.value) ?? {
        value: choice.value,
        label: choice.label || choice.value,
      }
    : null

/**
 * Mapping → Registration: where the event and registration payments from Planning Center's
 * payout report go in QuickBooks. A start date (charges before it are left alone), one default
 * income account and class, and optional per-event overrides. Saved together with Save - unlike
 * the Donation tab, nothing here saves itself.
 *
 * The parent keys this component by the loaded settings, and MainPage remounts every page on a
 * church switch, so the form always starts from the selected church's saved mapping.
 */
const RegistrationMapping: FC<RegistrationMappingProps> = ({
  userData,
  qboData,
}) => {
  const queryClient = useQueryClient()
  const { selectedBankAccount, selectedBankExpense } = useSelector(
    (state: RootState) => state.common,
  )
  const { email, churchId } = useChurch()

  const settings = userData?.UserSetting
  const saved = useMemo(
    () => readMapping(settings?.settingRegistrationData),
    [settings?.settingRegistrationData],
  )
  const savedStartDate = toInputDate(settings?.startDateAutomationRegistration)

  const nextKey = useRef(0)
  const [startDate, setStartDate] = useState(savedStartDate)
  const [defaultAccount, setDefaultAccount] = useState<QboChoice | null>(
    saved.default.account,
  )
  const [defaultClass, setDefaultClass] = useState<QboChoice | null>(
    saved.default.class,
  )
  const [events, setEvents] = useState<EventRow[]>(() =>
    saved.events.map((e) => ({ ...e, key: nextKey.current++ })),
  )
  // Problems are pointed out once Save has been tried, not while a row is still being filled.
  const [attempted, setAttempted] = useState(false)

  const accountOptions = useMemo<Option[]>(
    () =>
      (qboData?.accounts ?? [])
        .filter((a) => a.type !== 'Bank' && a.type !== 'Credit Card')
        .map((a) => ({ value: a.value, label: a.label })),
    [qboData],
  )
  const classOptions = useMemo<Option[]>(
    () =>
      (qboData?.classes ?? []).map((c) => ({ value: c.value, label: c.label })),
    [qboData],
  )

  const { data: signups } = useQuery<string[], PayoutReportError>(
    ['payoutSignups', churchId],
    async () => (email ? await getPayoutSignups(email) : []),
    {
      enabled: !!churchId,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: false,
    },
  )

  // The Bank tab edits these (and saves them as it goes), so its live values come first.
  const feeAccount =
    selectedBankExpense?.account?.label ||
    settings?.settingBankCharges?.account?.label ||
    ''
  const bankSlots = selectedBankAccount ?? settings?.settingBankData ?? []
  const clearingAccount =
    bankSlots.find((b) => b?.type === 'registration' && b?.value)?.label ||
    bankSlots.find((b) => b?.type === 'donation' && b?.value)?.label ||
    ''

  const rowErrors = events.map((row, i) => {
    if (!row.signup.trim()) return 'Choose or type the event name.'
    if (!row.account) return 'Choose an income account for this event.'
    if (
      events.findIndex((other) => norm(other.signup) === norm(row.signup)) !== i
    )
      return 'This event is already listed above.'
    return null
  })
  const startDateError = startDate
    ? isPlausibleDate(startDate)
      ? null
      : "That date doesn't look right."
    : savedStartDate
    ? 'Choose a start date.'
    : null
  const invalid = !!startDateError || rowErrors.some(Boolean)

  const dirty =
    startDate !== savedStartDate ||
    fingerprint(defaultAccount, defaultClass, events) !==
      fingerprint(saved.default.account, saved.default.class, saved.events)

  // Counted until it settles (pendingSaves): closing the tab asks first, signing out waits for it.
  const save = useMutation<void, Error>(() => trackSave(saveMapping()), {
    onSuccess: () => {
      successNotification({ title: 'Registration mapping saved' })
      setAttempted(false)
    },
    onError: (e) => {
      failNotification({ title: e.message })
    },
    // Settled: the accounts can be saved while the start date is refused, and the form
    // should then show only the date as unsaved.
    onSettled: () => {
      queryClient.invalidateQueries('getUserRelatedSettings')
      // Whether a payout report can be uploaded depends on this setup.
      queryClient.invalidateQueries('payoutReportStatus')
    },
  })

  async function saveMapping() {
    const mapping: RegistrationMappingV2 = {
      version: 2,
      default: { account: defaultAccount, class: defaultClass },
      events: events.map((e) => ({
        signup: e.signup.trim(),
        account: e.account,
        class: e.class,
      })),
    }
    await updateRegisterSettings({ email, data: mapping })
    if (startDate && startDate !== savedStartDate) {
      try {
        await setStartDataAutomation(
          email,
          'registration',
          toStoredDate(startDate),
        )
      } catch (e: any) {
        throw new Error(
          `The accounts were saved, but the start date wasn't: ${
            e?.message ?? 'unknown error'
          }`,
        )
      }
    }
  }

  const onSave = () => {
    setAttempted(true)
    if (invalid || !email) return
    save.mutate()
  }

  const updateRow = (key: number, change: Partial<EventRow>) =>
    setEvents((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...change } : row)),
    )

  const toChoice = (option: Option | null): QboChoice | null =>
    option ? { value: option.value, label: option.label } : null

  return (
    <div className="max-w-4xl">
      <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-relaxed text-gray-600">
        <p>
          <span className="font-semibold text-primary">How it works:</span>{' '}
          upload Planning Center&apos;s payout report on the Clearing page, and
          CSP records each event or registration payment in QuickBooks, dated
          the day it was charged, in the income account chosen below. Refunds
          are taken back out the same way.
        </p>
        <p className="pt-2">
          Stripe fees go to{' '}
          {feeAccount ? (
            <span className="font-semibold">{feeAccount}</span>
          ) : (
            'your fee account (not set yet)'
          )}{' '}
          and the rest to{' '}
          {clearingAccount ? (
            <span className="font-semibold">{clearingAccount}</span>
          ) : (
            'your clearing account (not set yet)'
          )}{' '}
          — change them on the Bank tab.
        </p>
      </div>

      {/* Start date */}
      <div className="border-b pb-6">
        <label className="block">
          <span className="font-semibold text-primary">
            Record registrations charged on or after
          </span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-2 block rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
        </label>
        <p className="pt-1 text-sm text-gray-500">
          Earlier charges are left alone, even when they appear in a later
          report. Required before you can upload a payout report.
        </p>
        {attempted && startDateError ? (
          <p className="pt-1 text-sm text-red-600">{startDateError}</p>
        ) : null}
      </div>

      {/* Default account */}
      <div className="border-b py-6">
        <p className="font-semibold text-primary">Default income account</p>
        <p className="pb-3 text-sm text-gray-500">
          Used for every event that has no line of its own below. Required
          before you can upload a payout report.
        </p>
        <div className="flex flex-wrap gap-4">
          <div className="w-72">
            <p className="pb-1 text-sm">Account</p>
            <Dropdown<Option, false>
              options={accountOptions}
              value={asOption(defaultAccount, accountOptions)}
              onChange={(v) => setDefaultAccount(toChoice(v))}
              placeholder="Choose an income account"
              isClearable
            />
          </div>
          <div className="w-72">
            <p className="pb-1 text-sm">Class (optional)</p>
            <Dropdown<Option, false>
              options={classOptions}
              value={asOption(defaultClass, classOptions)}
              onChange={(v) => setDefaultClass(toChoice(v))}
              placeholder="No class"
              isClearable
            />
          </div>
        </div>
      </div>

      {/* Per-event overrides */}
      <div className="py-6">
        <p className="font-semibold text-primary">Per-event overrides</p>
        <p className="pb-3 text-sm text-gray-500">
          Optional. Give an event its own account or class. Event names come
          from the payout reports you have uploaded; you can also type one.
        </p>

        {events.length > 0 ? (
          <div className="space-y-4">
            {events.map((row, i) => {
              const taken = events
                .filter((other) => other.key !== row.key)
                .map((other) => norm(other.signup))
              const eventOptions = (signups ?? [])
                .filter((name) => !taken.includes(norm(name)))
                .map((name) => ({ value: name, label: name }))
              const error = attempted ? rowErrors[i] : null
              return (
                <div key={row.key}>
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="w-72">
                      <p className="pb-1 text-sm">Event</p>
                      <CreatableSelect<Option, false>
                        options={eventOptions}
                        value={
                          row.signup
                            ? { value: row.signup, label: row.signup }
                            : null
                        }
                        onChange={(v) =>
                          updateRow(row.key, { signup: v?.value ?? '' })
                        }
                        formatCreateLabel={(input) => `Use "${input}"`}
                        placeholder="Choose or type an event"
                        isClearable
                      />
                    </div>
                    <div className="w-64">
                      <p className="pb-1 text-sm">Account</p>
                      <Dropdown<Option, false>
                        options={accountOptions}
                        value={asOption(row.account, accountOptions)}
                        onChange={(v) =>
                          updateRow(row.key, { account: toChoice(v) })
                        }
                        placeholder="Choose an account"
                      />
                    </div>
                    <div className="w-56">
                      <p className="pb-1 text-sm">Class (optional)</p>
                      <Dropdown<Option, false>
                        options={classOptions}
                        value={asOption(row.class, classOptions)}
                        onChange={(v) =>
                          updateRow(row.key, { class: toChoice(v) })
                        }
                        placeholder="No class"
                        isClearable
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setEvents((rows) =>
                          rows.filter((other) => other.key !== row.key),
                        )
                      }
                      className="mb-1.5 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-red-600"
                      aria-label={`Remove ${row.signup || 'this event'}`}
                    >
                      <HiOutlineTrash size={16} />
                      Remove
                    </button>
                  </div>
                  {error ? (
                    <p className="pt-1 text-sm text-red-600">{error}</p>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() =>
            setEvents((rows) => [
              ...rows,
              {
                key: nextKey.current++,
                signup: '',
                account: null,
                class: null,
              },
            ])
          }
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-400 hover:underline"
        >
          <HiPlus size={16} />
          Add event
        </button>
      </div>

      <div className="flex items-center justify-end gap-3 border-t pt-6">
        {attempted && invalid ? (
          <span className="text-sm text-red-600">
            Fix the fields marked in red, then save.
          </span>
        ) : dirty ? (
          <span className="text-sm text-gray-500">Unsaved changes</span>
        ) : null}
        <Button
          className="bg-green-400"
          onClick={onSave}
          disabled={save.isLoading}
        >
          {save.isLoading ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

export default RegistrationMapping
