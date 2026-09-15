import { isEmpty } from 'lodash'
import React, { FC, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from 'react-query'
import Dropdown, { components } from 'react-select'
import { QboGetAllQboData, getQboData } from '@/common/api/qbo'
import { RootState } from '@/redux/store'
import { useSelector } from 'react-redux'
import { SettingQBOProps, createSettings, qboSettings } from '@/common/api/user'
import {
  Button,
  IconButton,
  Popover,
  PopoverContent,
  PopoverHandler,
  Tooltip,
  Typography,
} from '@material-tailwind/react'
import { failNotification, successNotification } from '@/common/utils/toast'
import { useDispatch } from 'react-redux'
import Loading from '@/common/components/loading/Loading'
import { OPEN_MODAL, setReTriggerIsUserTokens } from '@/redux/common'
import { QboDataSelectProps } from '..'
import { MODALS_NAME } from '@/common/constant/modal'
import ModalCreateUpdateProject from '@/common/components/modal/ModalCreateUpdateProject'
import { BsPlus, BsQuestionCircle } from 'react-icons/bs'
import { HiCheck, HiOutlineExclamationCircle } from 'react-icons/hi'
import { Spinner } from 'flowbite-react'
import { BiArchiveIn, BiDotsHorizontal } from 'react-icons/bi'
import { FundAttProps } from '@/common/constant/interfaces'
import colors from '@/common/constant/colors'

interface DonationProps {
  fundData: FundAttProps[]
  userData: any
}

const Input = (props: any) => (
  <components.Input
    {...props}
    inputClassName="outline-none border-none shadow-none focus:ring-transparent"
  />
)

const Option = (props: any) => {
  const { data, innerRef, innerProps, isSelected } = props

  // Create a dynamic class string based on the option value
  const labelClasses =
    data.value === 'Add Project'
      ? 'font-bold text-green-400'
      : 'font-normal text-current'

  return (
    <div
      ref={innerRef}
      {...innerProps}
      className={isSelected ? 'bg-blue-100' : ''}
    >
      <components.Option {...props}>
        {/* Apply the dynamic classes to the label */}
        <span className={labelClasses}>{data.label}</span>
        {data.value === 'Add Project' && (
          <IconButton
            className="text-green-500 bg-transparent shadow-none ml-28"
            onClick={(e) => {
              // Prevent the select option from being triggered
              e.stopPropagation()
            }}
          >
            <BsPlus size={22} />
          </IconButton>
        )}
      </components.Option>
    </div>
  )
}

const delay = (ms: any) => new Promise((res) => setTimeout(res, ms))

const HelpTip: FC<{ text: string }> = ({ text }) => (
  <Tooltip
    content={<span className="block max-w-xs text-xs leading-snug">{text}</span>}
    placement="top"
  >
    <span className="inline-flex cursor-help text-gray-400 hover:text-gray-600">
      <BsQuestionCircle size={14} />
    </span>
  </Tooltip>
)

/**
 * Auto-save status for one dropdown.
 *
 * Shown beside the field's own label rather than inside the control: react-select already owns
 * that space with its clear and chevron indicators, and a spinner there shifts them around as it
 * appears. The label row is empty and sits directly above the field, so the status is adjacent to
 * what the person just changed without moving anything.
 *
 * "Saved" is deliberately transient. A tick that never leaves stops being read after the first
 * time; one that fades says "that landed" and then gets out of the way. A failure does NOT fade -
 * unsaved work is the one thing here worth interrupting for.
 */
type FieldSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const FieldStatus: FC<{ status: FieldSaveStatus }> = ({ status }) => {
  if (status === 'idle') return null

  if (status === 'saving') {
    return (
      <span
        className="flex items-center gap-1 text-xs font-normal text-gray-400"
        role="status"
        aria-live="polite"
      >
        <Spinner size="sm" className="h-3 w-3" />
        Saving
      </span>
    )
  }

  if (status === 'saved') {
    return (
      <span
        className="flex items-center gap-1 text-xs font-normal text-success"
        role="status"
        aria-live="polite"
      >
        <HiCheck size={14} />
        Saved
      </span>
    )
  }

  return (
    <span
      className="flex items-center gap-1 text-xs font-medium text-red-500"
      role="alert"
    >
      <HiOutlineExclamationCircle size={14} />
      Not saved
    </span>
  )
}

/** Identifies one dropdown: a fund plus which of its three fields. */
const fieldKey = (fundName: string | null | undefined, category: string) =>
  `${fundName ?? ''}::${category}`

const Donation: FC<DonationProps> = ({ fundData, userData }) => {
  const { user, selectedStartDate } = useSelector(
    (state: RootState) => state.common,
  )
  const [settingsData, setSettingsData] = useState<qboSettings[]>([])
  const [onGoingSaving, setOnGoingSaving] = useState<boolean>(false)
  // Which dropdowns have an edit that has not reached the server yet, and which just landed.
  // Tracking them per field is what lets the status sit next to the control the person touched
  // instead of only at the bottom of a page that may be several funds long.
  const [pendingFields, setPendingFields] = useState<Set<string>>(new Set())
  const [justSavedFields, setJustSavedFields] = useState<Set<string>>(new Set())
  const [saveError, setSaveError] = useState<string | null>(null)
  // Skips the save that would otherwise fire when the saved mapping is first loaded in.
  const hasLoadedSettings = React.useRef(false)
  const [openStates, setOpenStates] = useState<Record<number, boolean>>({})

  const dispatch = useDispatch()
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const reTriggerIsUserTokens = useSelector(
    (item: RootState) => item.common.reTriggerIsUserTokens,
  )

  // create user settings
  const { mutate, mutateAsync, isLoading: isSavingSettings } = useMutation<
    unknown,
    unknown,
    SettingQBOProps
  >(createSettings)

  const { data: qboData, isLoading: isQboDataLoading } = useQuery(
    useMemo(() => ['getAllQboData', bookkeeper], [bookkeeper]), // Memoize the key
    async () => await getQboData(user, bookkeeper),
    { staleTime: Infinity, refetchOnWindowFocus: false },
  )

  // Adding a new option at the top of the list
  const modifiedOptionsCustomer = qboData?.customers
    ? [{ value: 'Add Project', label: 'Add Project' }, ...qboData.customers]
    : []

  const email =
    user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email

  const selectHandler = ({
    val,
    fundName,
    category,
  }: {
    val: any
    fundName: string | null | undefined
    category: 'account' | 'class' | 'customer'
  }) => {
    const tempData: qboSettings[] = [...settingsData]

    const index = tempData.findIndex(
      (item: qboSettings) => item.fundName === fundName,
    )

    if (index !== -1) {
      const currentItem = tempData[index]

      if (currentItem) {
        // Check if currentItem is defined
        if (val) {
          const { value, label } = val
          currentItem[category] = { value, label }
        } else {
          currentItem[category] = undefined
        }
      }
    } else {
      const newObject: qboSettings = { fundName }

      if (val) {
        const { value, label } = val
        newObject[category] = { value, label }
      } else {
        newObject[category] = undefined
      }

      tempData.push(newObject)
    }

    setSettingsData(tempData)

    // Mark this exact dropdown as in-flight straight away, so the spinner appears on the
    // control the person just used rather than after the debounce has elapsed.
    const key = fieldKey(fundName, category)
    setPendingFields((prev) => new Set(prev).add(key))
    setJustSavedFields((prev) => {
      if (!prev.has(key)) return prev
      const next = new Set(prev)
      next.delete(key)
      return next
    })
    setSaveError(null)
  }

  /** The status to show beside one dropdown's label. */
  const statusFor = (
    fundName: string | null | undefined,
    category: string,
  ): FieldSaveStatus => {
    const key = fieldKey(fundName, category)
    if (pendingFields.has(key)) return saveError ? 'error' : 'saving'
    if (justSavedFields.has(key)) return 'saved'
    return 'idle'
  }

  const isAnyKeyMissing = (): boolean => {
    return settingsData.some(
      (item) => !isEmpty(item) && item.account === undefined,
    )
  }

  const handleSubmit = async () => {
    const nonEmptySettingsData = settingsData.filter((item) => !isEmpty(item))
    const lengthOfNonEmptySettingsData = nonEmptySettingsData.length

    if (
      isAnyKeyMissing() ||
      (settingsData.length !== 0 &&
        (fundData?.length !== lengthOfNonEmptySettingsData ||
          isEmpty(settingsData)))
    ) {
      failNotification({
        title: 'Please fill up all select',
        position: 'bottom-center',
      })
      return
    }

    try {
      setOnGoingSaving(true)

      await mutate({
        email,
        settingsData,
      })
      await delay(2000)
      dispatch(setReTriggerIsUserTokens(!reTriggerIsUserTokens))
      successNotification({ title: 'Settings successfully saved !' })
      setOnGoingSaving(false)
    } catch (e) {
      // no-op
    }

    // dispatch(setReTriggerIsUserTokens(!reTriggerIsUserTokens))
  }

  const findDefaultValue = (
    fundName: string,
    category: 'account' | 'class' | 'customer',
  ) => {
    const settingsItem = settingsData.find(
      (item: any) => item.fundName === fundName,
    )

    switch (category) {
      case 'account':
        return qboData?.accounts?.find(
          (option: { label: string | undefined }) =>
            option.label === settingsItem?.account?.label,
        )
      case 'class':
        return qboData?.classes?.find(
          (option: { label: string | undefined }) =>
            option.label === settingsItem?.class?.label,
        )
      case 'customer':
        return qboData?.customers?.find(
          (option: { label: string | undefined }) =>
            option.label === settingsItem?.customer?.label,
        )
      default:
        return undefined
    }
  }

  const deactivateFund = async (fundName: string) => {
    if (isEmpty(settingsData)) {
      failNotification({ title: 'Please save the settings first' })
      return
    }

    setOnGoingSaving(true)
    const updatedSettingsData = settingsData.map((item) => {
      if (item.fundName === fundName) {
        // If the registration matches, set `isActive` to `false`.
        return { ...item, isActive: false }
      }
      return item // Otherwise, return the item as is.
    })

    await mutate({
      email,
      settingsData: updatedSettingsData,
    })
    await delay(2000)
    dispatch(setReTriggerIsUserTokens(!reTriggerIsUserTokens))
    successNotification({ title: 'Archived successfully' })
    setOnGoingSaving(false)
    return ''
  }

  useEffect(() => {
    if (!isEmpty(userData?.UserSetting?.settingsData)) {
      const settingsData = userData.UserSetting.settingsData
      setSettingsData(settingsData)
    }
  }, [userData])

  /**
   * Save the mapping as it is edited.
   *
   * Deliberately saves PARTIAL mappings, unlike the Save button, which refuses until every fund
   * on the page has an account. Mapping a church with a dozen funds is not one sitting, and
   * losing the work because the last fund is undecided is the behaviour this replaces.
   *
   * Debounced so picking an account, then a class, then a customer is one write rather than
   * three, and the status is shown inline - a toast on every dropdown would be unbearable.
   */
  useEffect(() => {
    if (!hasLoadedSettings.current) {
      // The first run is the saved mapping arriving, not a user edit.
      if (settingsData.length > 0) hasLoadedSettings.current = true
      return
    }
    if (!email || settingsData.length === 0) return

    const timer = setTimeout(async () => {
      // Snapshot what this write covers. More edits can land while it is in flight, and those
      // must stay pending rather than being marked saved by a request that did not include them.
      const inFlight = new Set(pendingFields)
      try {
        // mutateAsync, not mutate: mutate returns void, so the old `await mutate(...)` resolved
        // immediately and reported success before the request had even been sent.
        await mutateAsync({ email, settingsData })
        setPendingFields((prev) => {
          const next = new Set(prev)
          inFlight.forEach((k) => next.delete(k))
          return next
        })
        setJustSavedFields((prev) => {
          const next = new Set(prev)
          inFlight.forEach((k) => next.add(k))
          return next
        })
        setSaveError(null)
      } catch (e: any) {
        // The fields stay pending, so their status flips to "Not saved" and the work is
        // visibly still outstanding. Typing is never interrupted.
        setSaveError(e?.message ?? 'Your mapping could not be saved.')
      }
    }, 1200)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsData, email])

  /**
   * Retire each "Saved" tick a couple of seconds after it appears.
   *
   * Without this the page slowly fills with green ticks that nobody reads any more, and the one
   * field that is genuinely still saving is lost among them.
   */
  useEffect(() => {
    if (justSavedFields.size === 0) return
    const timer = setTimeout(() => setJustSavedFields(new Set()), 2500)
    return () => clearTimeout(timer)
  }, [justSavedFields])

  return (
    <div>
      {/* Deliberately not `isSavingSettings`: that fires on auto-save too, and blanking the
          whole mapping behind a spinner every time a dropdown changes is unusable. The button
          path sets `onGoingSaving`; auto-save shows its status inline instead. */}
      {isQboDataLoading || onGoingSaving ? (
        <Loading />
      ) : (
        <>
          <ModalCreateUpdateProject />
          {fundData?.map((item, index: number) => (
            <div
              key={index}
              className={`flex flex-col gap-2 max-w-4xl py-4 ${
                index === fundData.length - 1 ? '' : 'border-b-[1px]'
              } `}
            >
              <div className="flex items-center  justify-between pb-2">
                <div className="col-span-1 flex flex-col pr-6">
                  <p className="font-semibold text-primary">
                    {item.attributes.name}
                  </p>
                  <p className="font-normal text-gray-400 text-sm">
                    {item.attributes.description}
                  </p>
                </div>

                <Popover>
                  <PopoverHandler>
                    <button className="self-center">
                      <BiDotsHorizontal
                        size={22}
                        color={colors.secondaryYellow}
                      />
                    </button>
                  </PopoverHandler>
                  <PopoverContent>
                    <button
                      className="flex gap-2 items-center"
                      onClick={() => deactivateFund(item.attributes.name)}
                    >
                      <BiArchiveIn size={22} color={colors.secondaryYellow} />
                      <Typography>Archive</Typography>
                    </button>
                  </PopoverContent>
                </Popover>
              </div>

              {isEmpty(qboData) && isEmpty(item.attributes.name) ? null : (
                <div className="flex items-center gap-4">
                  {/* Accounts */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1">
                      <p>Accounts</p>
                      <HelpTip text="The QuickBooks income account this fund's gifts are credited to, e.g. 'Tithes & Offerings'." />
                      <FieldStatus
                        status={statusFor(item.attributes.name, 'account')}
                      />
                    </div>
                    <Dropdown
                      options={qboData?.accounts?.filter(
                        (a: { type: string }) =>
                          a.type !== 'Bank' && a.type !== 'Credit Card',
                      )}
                      components={{ Input }}
                      onChange={(val) =>
                        selectHandler({
                          val,
                          fundName: item.attributes.name,
                          category: 'account',
                        })
                      }
                      value={findDefaultValue(item.attributes.name, 'account')}
                      className="w-72"
                    />
                  </div>
                  {/* Classes */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1">
                      <p>Classes (optional)</p>
                      <HelpTip text="Optional QuickBooks class for tracking. Leave blank if you don't use classes." />
                      <FieldStatus
                        status={statusFor(item.attributes.name, 'class')}
                      />
                    </div>
                    <Dropdown
                      options={qboData?.classes}
                      components={{ Input }}
                      onChange={(val) =>
                        selectHandler({
                          val,
                          fundName: item.attributes.name,
                          category: 'class',
                        })
                      }
                      value={findDefaultValue(item.attributes.name, 'class')}
                      className="w-72"
                      isClearable
                    />
                  </div>
                  {/* Projects */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1">
                      <p>Customer / Project (optional)</p>
                      <HelpTip text="Optional QuickBooks customer/project to tag this fund. Leave blank if unsure." />
                      <FieldStatus
                        status={statusFor(item.attributes.name, 'customer')}
                      />
                    </div>
                    <Dropdown
                      key={index}
                      options={modifiedOptionsCustomer}
                      components={{ Input, Option }}
                      onChange={(val) => {
                        // If the "Add Project" option is selected, keep the dropdown open and don't change the value
                        if (val?.value === 'Add Project') {
                          setOpenStates((prev) => ({ ...prev, [index]: true }))
                          return dispatch(OPEN_MODAL(MODALS_NAME.projectCU))
                        }

                        selectHandler({
                          val,
                          fundName: item.attributes.name,
                          category: 'customer',
                        })

                        // Close the dropdown
                        setOpenStates((prev) => ({ ...prev, [index]: false }))
                      }}
                      menuIsOpen={openStates[index] as boolean}
                      onMenuOpen={() =>
                        setOpenStates((prev) => ({ ...prev, [index]: true }))
                      }
                      className="w-72"
                      isClearable
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
          {/* Sticky, because a mapping can run several screens long: a status pinned to the
              bottom of the document is out of sight exactly when someone edits the top of it. */}
          <div className="sticky bottom-0 -mx-2 flex items-center justify-end gap-3 border-t border-gray-100 bg-white/95 px-2 py-3 backdrop-blur">
            {saveError ? (
              <span
                className="flex items-center gap-1.5 text-sm font-medium text-red-500"
                role="alert"
              >
                <HiOutlineExclamationCircle size={16} />
                {saveError} Your changes are still here — press Save to retry.
              </span>
            ) : pendingFields.size > 0 ? (
              <span
                className="flex items-center gap-1.5 text-sm font-light text-gray-500"
                role="status"
                aria-live="polite"
              >
                <Spinner size="sm" className="h-3.5 w-3.5" />
                Saving…
              </span>
            ) : justSavedFields.size > 0 ? (
              <span
                className="flex items-center gap-1.5 text-sm font-light text-success"
                role="status"
                aria-live="polite"
              >
                <HiCheck size={16} />
                All changes saved
              </span>
            ) : null}
            <Button className="bg-green-400" onClick={() => handleSubmit()}>
              Save
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

export default Donation
