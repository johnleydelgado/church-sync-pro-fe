import { pcGetFunds } from '@/common/api/planning-center'
import Loading from '@/common/components/loading/Loading'
import MainLayout from '@/common/components/main-layout/MainLayout'
import React, { FC, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { useSelector } from 'react-redux'

import { QboGetAllQboData, getQboData } from '@/common/api/qbo'
import {
  addUpdateBankCharges,
  addUpdateBankSettings,
  enableAutoSyncSetting,
  getTokenList,
  getUserRelated,
  isUserHaveTokens,
  setStartDataAutomation,
} from '@/common/api/user'

import { Tab } from '@headlessui/react'

import { AccountTokenDataProps } from '@/common/hooks/useGetTokenList'
import Donation from './component/Donation'
import FieldStatus, { FieldSaveStatus } from './component/FieldStatus'
import { failNotification, successNotification } from '@/common/utils/toast'
import { isEmpty } from 'lodash'
import { RootState } from '@/redux/store'
import { selectSelectedChurch, useChurch } from '@/common/hooks/useChurch'
import { BiSortDown } from 'react-icons/bi'
import { AiOutlineCloudSync, AiOutlineUserAdd } from 'react-icons/ai'
import { Link, useSearchParams } from 'react-router-dom'
import { mainRoute, routeSettings } from '@/common/constant/route'
import { Tooltip } from '@material-tailwind/react'
import { MdAppRegistration } from 'react-icons/md'
import { BsQuestionCircle } from 'react-icons/bs'
import { useDispatch, useStore } from 'react-redux'
import {
  BankAccountExpensesProps,
  BankAccountProps,
  OPEN_MODAL,
  setMappingNumber,
  setSelectedBankAccount,
  setSelectedBankExpense,
  setSelectedStartDate,
} from '@/redux/common'
import { MODALS_NAME } from '@/common/constant/modal'
import 'react-datepicker/dist/react-datepicker.css'
import { format, parseISO } from 'date-fns'
import TransactionDateModal from './component/TransactionDateModal'
import Dropdown, { components } from 'react-select'
import DatePicker from 'react-datepicker'
import RegistrationMapping from './component/RegistrationMapping'
import { getStripeList } from '@/common/api/stripe'
import { setReduxStripeData } from '@/redux/stripe'
import { FundAttProps, UserSettingsProps } from '@/common/constant/interfaces'

// import 'react-datepicker/dist/react-datepicker.css'
// import { Value } from 'react-date-picker/dist/cjs/shared/types'

const Input = (props: any) => (
  <components.Input
    {...props}
    inputClassName="outline-none border-none shadow-none focus:ring-transparent"
  />
)

interface AttributesProps {
  color: string
  created_at: string
  default: boolean
  deletable: string
  description: string
  ledger_code: null
  name: string
  updated_at: string
  visibility: string
}

export interface FundProps {
  id?: string
  attributes: AttributesProps
  links: { self: string }
  type: string
  isClick: boolean
  project: string | ''
  description: string | ''
}

interface StartDates {
  startDateDonation: string | null
  startDateRegistration: string | null
}

export interface QboDataSelectProps {
  accounts: { value: string; label: string; type?: string }[]
  classes: { value: string; label: string }[]
  customers: { value: string; label: string; companyName: string }[]
}

interface SettingsProps {}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

const tabSubtitles: Record<string, string> = {
  Donation: 'Giving funds from Planning Center',
  Registration: 'Event and registration payments (from your payout report)',
  Bank: 'Your clearing & fee accounts',
}

const HelpTip: FC<{ text: string }> = ({ text }) => (
  <Tooltip
    content={
      <span className="block max-w-xs text-xs leading-snug">{text}</span>
    }
    placement="top"
  >
    <span className="inline-flex cursor-help text-gray-400 hover:text-gray-600">
      <BsQuestionCircle size={14} />
    </span>
  </Tooltip>
)

/**
 * Where to connect QuickBooks / Planning Center. Only people who may connect this church's
 * integrations get the link; anyone else is told who can.
 */
const ConnectAccountsLink: FC = () => {
  const { church, canConnectIntegrations } = useChurch()
  if (!canConnectIntegrations) {
    return (
      <p className="text-xl pt-4 text-gray-600">
        Ask an owner of {church?.name ?? 'this church'} to connect it
      </p>
    )
  }
  return (
    <Link
      to={routeSettings.INTEGRATIONS}
      className="text-xl pt-4 underline text-blue-400"
    >
      Click Here !
    </Link>
  )
}

/** One of the Bank tab's four dropdowns; each shows its own save status. */
type BankField = 'donation' | 'registration' | 'feeAccount' | 'feeClass'

const Mapping: FC<SettingsProps> = () => {
  const dispatch = useDispatch()
  const { selectedBankAccount, selectedBankExpense } = useSelector(
    (state: RootState) => state.common,
  )

  const reduxStripeData = useSelector(
    (state: RootState) => state.stripeData.reduxStripeData,
  )
  const { email, churchId } = useChurch()
  const mappingNumber = useSelector(
    (item: RootState) => item.common.mappingNumber,
  )

  const queryClient = useQueryClient()

  const [searchParams, setSearchParams] = useSearchParams()
  const [startDates, setStartDates] = useState<StartDates>({
    startDateDonation: null,
    startDateRegistration: null,
  })

  const reTriggerIsUserTokens = useSelector(
    (item: RootState) => item.common.reTriggerIsUserTokens,
  )

  const { mutate } = useMutation<
    unknown,
    unknown,
    {
      email: string
      isAutomationEnable?: boolean
      isAutomationRegistration?: boolean
    }
  >(enableAutoSyncSetting)

  // Mark every cached copy of the settings stale without refetching the page in front of the
  // person, so the next visit - or a switch back to this church - asks the server.
  const markSettingsStale = () =>
    queryClient.invalidateQueries('getUserRelatedSettings', {
      refetchActive: false,
    })

  const [bankStatus, setBankStatus] = useState<
    Partial<Record<BankField, FieldSaveStatus>>
  >({})
  const setFieldStatus = (field: BankField, status: FieldSaveStatus) =>
    setBankStatus((prev) => ({ ...prev, [field]: status }))

  // What the server last confirmed. A failed save puts the fields back to it, so the page never
  // shows a choice as set when QuickBooks postings would not use it.
  const savedBank = useRef<{
    accounts: BankAccountProps[] | null
    expense: BankAccountExpensesProps | null
  }>({ accounts: null, expense: null })

  // react-query v3 still runs a mutation's callbacks after the page unmounts. A late answer
  // touches this page's state and the shared redux bank/fee fields only while this page is up
  // AND the selected church is still the one the save was for - read from the store at that
  // moment, not from this render.
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const store = useStore<RootState>()
  const stillOn = (forChurch: number) =>
    mounted.current && selectSelectedChurch(store.getState())?.id === forChurch

  // A saved value goes into every cached copy of that church's settings, so nothing read from
  // the cache - a remount, the load effect below - can put the pre-save value back over a pick.
  const writeSettingsCache = (
    forChurch: number,
    change: Partial<UserSettingsProps['UserSetting']>,
  ) =>
    queryClient.setQueriesData<UserSettingsProps | undefined>(
      {
        predicate: (q) =>
          q.queryKey[0] === 'getUserRelatedSettings' &&
          q.queryKey[2] === forChurch,
      },
      (old) =>
        old && {
          ...old,
          UserSetting: {
            ...old.UserSetting,
            ...change,
          } as UserSettingsProps['UserSetting'],
        },
    )

  const { mutate: saveBankData } = useMutation<
    unknown,
    Error,
    {
      field: BankField
      churchId: number
      email: string
      data: BankAccountProps[]
    }
  >(({ email, data }) => addUpdateBankSettings({ email, data }), {
    onMutate: ({ field }) => setFieldStatus(field, 'saving'),
    onSuccess: (_, { field, churchId: forChurch, data }) => {
      writeSettingsCache(forChurch, { settingBankData: data })
      if (!stillOn(forChurch)) return
      savedBank.current.accounts = data
      setFieldStatus(field, 'saved')
    },
    onError: (e, { field, churchId: forChurch }) => {
      failNotification({ title: e.message })
      if (!stillOn(forChurch)) return
      setFieldStatus(field, 'error')
      dispatch(setSelectedBankAccount(savedBank.current.accounts))
    },
    // A failed request may still have landed; the next read of these settings asks the server.
    onSettled: (_, error) => {
      if (error) markSettingsStale()
    },
  })

  const { mutate: saveBankCharges } = useMutation<
    unknown,
    Error,
    {
      field: BankField
      churchId: number
      email: string
      data: BankAccountExpensesProps
    }
  >(({ email, data }) => addUpdateBankCharges({ email, data }), {
    onMutate: ({ field }) => setFieldStatus(field, 'saving'),
    onSuccess: (_, { field, churchId: forChurch, data }) => {
      writeSettingsCache(forChurch, { settingBankCharges: data })
      if (!stillOn(forChurch)) return
      savedBank.current.expense = data
      setFieldStatus(field, 'saved')
    },
    onError: (e, { field, churchId: forChurch }) => {
      failNotification({ title: e.message })
      if (!stillOn(forChurch)) return
      setFieldStatus(field, 'error')
      dispatch(setSelectedBankExpense(savedBank.current.expense))
    },
    // A failed request may still have landed; the next read of these settings asks the server.
    onSettled: (_, error) => {
      if (error) markSettingsStale()
    },
  })

  // Each pick builds on what is on screen, so while one save is out the four dropdowns wait: a
  // second pick followed by a failure of the first would leave the screen and server apart.
  const bankSaving = Object.values(bankStatus).includes('saving')

  // "Saved" fades after a moment; "Not saved" stays until that field is picked again.
  useEffect(() => {
    if (!Object.values(bankStatus).includes('saved')) return
    const timer = setTimeout(
      () =>
        setBankStatus((prev) =>
          Object.fromEntries(
            Object.entries(prev).map(([k, v]) => [
              k,
              v === 'saved' ? 'idle' : v,
            ]),
          ),
        ),
      2500,
    )
    return () => clearTimeout(timer)
  }, [bankStatus])

  // to get settings data. Keyed by church, so a switch refills the bank and fee fields below.
  const {
    data: userData,
    refetch: refetchUserData,
    isFetching: isFetchingUserData,
  } = useQuery<UserSettingsProps>(
    ['getUserRelatedSettings', reTriggerIsUserTokens, churchId],
    async () => {
      if (email) {
        const res = await getUserRelated(email)
        return res.data
      }
    },
    {
      enabled: !!churchId,
      staleTime: Infinity,
      // Not behind the person's back: a refetch landing during a save could put the pre-save
      // bank or fee value back over their pick.
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  )

  const {
    data: fundData,
    isLoading,
    isError: fundsFailed,
    isFetching: isFetchingFunds,
    refetch: refetchFunds,
  } = useQuery<FundAttProps[]>(
    // Only what the list depends on: a bank or fee save rewrites the cached settings, and with
    // the whole object in the key that reloaded the funds and blanked the page.
    ['getFunds', churchId, userData?.UserSetting?.settingsData],
    async () => {
      if (!isEmpty(userData?.UserSetting?.settingsData)) {
        if (email) {
          const res = (await pcGetFunds({
            email,
            throwOnError: true,
          })) as FundAttProps[]
          // Apply the filter and return the filtered array
          const filteredFunds = res.filter((a) => {
            // Find fund with matching name and ensure isActive is either true or undefined
            const fundSetting = userData?.UserSetting?.settingsData?.find(
              (b) => b.fundName === a.attributes.name,
            )

            // Show the fund unless it has been explicitly deactivated. A fund added
            // in Planning Center after the mapping was first saved has no entry here
            // yet, and requiring one hid every new fund from this page for good.
            return !fundSetting || fundSetting.isActive !== false
          })

          return filteredFunds // Return the filtered array
        }
      } else {
        const res = (await pcGetFunds({
          email,
          throwOnError: true,
        })) as FundAttProps[]
        return res
      }

      // Return an empty array if no matching data
      return []
    },
    { enabled: !!churchId, staleTime: Infinity },
  )

  const { data: qboData, isLoading: isQboDataLoading } = useQuery(
    useMemo(() => ['getAllQboData', churchId], [churchId]), // Memoize the key
    async () => await getQboData(email),
    { enabled: !!churchId, staleTime: Infinity, refetchOnWindowFocus: false },
  )

  const { data: stripeEvents, isLoading: isStripeEventsLoading } = useQuery<
    { name: string; category: 'stripe' | 'batch'; date: string }[]
  >(
    useMemo(
      () => ['getStripeListInRegistration', churchId, reduxStripeData],
      [churchId, reduxStripeData],
    ), // Stable key
    async () => {
      // If accounts array has elements, use the Redux data
      if (reduxStripeData) {
        const filterData = reduxStripeData.filter((item) => {
          // Include items where isActive is true or undefined
          return item.isActive !== false
        })

        return filterData
      }

      if (email) {
        const fetchedData = await getStripeList({ email }) // Fetch only if needed
        dispatch(setReduxStripeData(fetchedData.data))
        return !isEmpty(fetchedData)
          ? fetchedData.filter((a: any) => a.isActive)
          : []
      }
    },
    {
      refetchOnWindowFocus: false,
      onError: (error) => console.error('Query failed:', error),
    },
  )

  const [isAutomationEnable, setIsAutomationEnable] = useState<boolean>(false)
  const [isAutomationRegistration, setIsAutomationRegistration] =
    useState<boolean>(false)

  const [categories, setCategories] = useState({
    Donation: [],
    Registration: [],
    Bank: [],
  })

  // One value drives both the selected tab and the subtitle under the tabs. They used to read
  // different sources - the tab came from a ?tab= link, the subtitle from the tab remembered last
  // time - so a link to the Registration tab showed the Donation tab's subtitle.
  const tabCount = Object.keys(categories).length
  const tabFromLink = Number(searchParams.get('tab')) - 1 // links number tabs from 1
  const linkedTab =
    Number.isInteger(tabFromLink) && tabFromLink >= 0 && tabFromLink < tabCount
      ? tabFromLink
      : null
  const [selectedTab, setSelectedTab] = useState<number>(
    linkedTab ?? mappingNumber ?? 0,
  )
  useEffect(() => {
    if (linkedTab !== null) setSelectedTab(linkedTab)
  }, [linkedTab])
  // Remember the tab a link opened too, so the next plain visit lands on it.
  useEffect(() => {
    if (selectedTab !== mappingNumber) dispatch(setMappingNumber(selectedTab))
  }, [selectedTab, mappingNumber, dispatch])

  const mutation = useMutation(
    (newData: {
      email: string
      type: 'donation' | 'registration'
      date: string
    }) => setStartDataAutomation(newData.email, newData.type, newData.date),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('setStartDataAutomation')
      },
    },
  )

  const enableDisableAutomation = async (type: 'donation' | 'registration') => {
    if (type === 'donation') {
      await mutate({ email, isAutomationEnable: !isAutomationEnable })
      setIsAutomationEnable(!isAutomationEnable)
    } else {
      await mutate({
        email,
        isAutomationRegistration: !isAutomationRegistration,
      })
      setIsAutomationRegistration(!isAutomationRegistration)
    }

    successNotification({ title: 'Settings successfully saved !' })
  }

  const handleStartDateChange = (
    type: keyof StartDates,
    date: string | undefined,
  ) => {
    if (date) {
      mutation.mutate({
        email,
        type: type === 'startDateDonation' ? 'donation' : 'registration',
        date: format(new Date(date ?? null), 'MM-dd-yyyy'),
      })

      setStartDates((prevStartDates) => ({
        ...prevStartDates,
        [type]: date,
      }))
    }
  }

  const openModalRegistration = () => {
    dispatch(OPEN_MODAL(MODALS_NAME.modalRegistration))
  }

  const donationAccountValue = (type: 'donation' | 'registration') => {
    const donationAccount = selectedBankAccount?.find((a) => a.type === type)
    return donationAccount
      ? {
          label: donationAccount.label,
          value: donationAccount.value,
        }
      : null
  }

  // Each loader below follows only the values it puts on screen. A bank save writes its value into
  // the cached settings object; following the whole object would re-run them all and put loaded
  // auto-sync switches and start dates (changed here without the cache) back on screen.
  const settingsLoaded = !!userData
  const serverSetting = userData?.UserSetting
  const serverBankData = serverSetting?.settingBankData
  const serverBankCharges = serverSetting?.settingBankCharges
  const serverFunds = serverSetting?.settingsData
  const serverAutoSync = serverSetting?.isAutomationEnable
  const serverAutoSyncRegistration = serverSetting?.isAutomationRegistration
  const serverStartRegistration = serverSetting?.startDateAutomationRegistration
  const serverStartFund = serverSetting?.startDateAutomationFund

  // The server's bank and fee choices for this church, or none: an empty setting clears the
  // fields rather than leaving a value persisted from before.
  useEffect(() => {
    if (!settingsLoaded) return
    const accounts = isEmpty(serverBankData) ? null : serverBankData ?? null
    const expense = isEmpty(serverBankCharges)
      ? null
      : serverBankCharges ?? null
    savedBank.current = { accounts, expense }
    dispatch(setSelectedBankAccount(accounts))
    dispatch(setSelectedBankExpense(expense))
  }, [settingsLoaded, serverBankData, serverBankCharges, dispatch])

  // Auto-sync switches and start dates.
  useEffect(() => {
    if (!isEmpty(serverFunds)) {
      setIsAutomationEnable(serverAutoSync || false)
      setIsAutomationRegistration(serverAutoSyncRegistration || false)
    }

    if (!isEmpty(serverStartRegistration)) {
      setStartDates((prevStartDates) => ({
        ...prevStartDates,
        ['startDateRegistration']: serverStartRegistration || null,
      }))
    }

    if (!isEmpty(serverStartFund)) {
      setStartDates((prevStartDates) => ({
        ...prevStartDates,
        ['startDateDonation']: serverStartFund || null,
      }))
    }
  }, [
    serverFunds,
    serverAutoSync,
    serverAutoSyncRegistration,
    serverStartRegistration,
    serverStartFund,
  ])

  // Bank and fee choices are saved where the person makes them, to the church on screen. They
  // used to be saved by effects watching the persisted redux values, which also fired on mount:
  // opening Mapping after a switch saved the previous church's choice into this one.
  const pickBankAccounts = (field: BankField, next: BankAccountProps[]) => {
    if (!churchId) return
    dispatch(setSelectedBankAccount(next))
    saveBankData({ field, churchId, email, data: next })
  }

  const pickBankExpense = (
    field: BankField,
    next: BankAccountExpensesProps,
  ) => {
    if (!churchId) return
    dispatch(setSelectedBankExpense(next))
    saveBankCharges({ field, churchId, email, data: next })
  }

  return (
    <MainLayout>
      <TransactionDateModal />

      {isLoading || isQboDataLoading ? (
        <Loading />
      ) : (
        <div className="bg-white -m-6 p-6 h-full">
          {/* Header */}
          <div className="pb-2">
            <div className="flex flex-col border-b-2 pb-2">
              <div className="flex items-center gap-2">
                <BiSortDown size={28} className="text-blue-400" />
                <span className="font-bold text-lg text-primary">Mapping</span>
              </div>
            </div>
          </div>

          <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
            <div className="flex flex-col">
              <Tab.List className="flex space-x-1 rounded-xl bg-transparent px-4 py-2 w-96">
                {Object.keys(categories).map((category, index: number) => (
                  <div className="flex flex-col" key={category}>
                    <div className="flex items-center">
                      <Tab
                        className={({ selected }) =>
                          classNames(
                            'flex items-center w-full rounded-lg p-2.5 text-sm font-medium leading-5 text-gray-400',
                            selected
                              ? 'bg-yellow shadow text-white'
                              : 'hover:bg-white/[0.12] hover:text-black',
                          )
                        }
                      >
                        {category}
                      </Tab>
                      {index === Object.keys(categories).length - 1 ? null : (
                        <p className="text-gray-400 pl-2"> | </p>
                      )}
                    </div>
                  </div>
                ))}
              </Tab.List>
              <p className="px-4 pb-2 text-xs font-light text-gray-400">
                {tabSubtitles[Object.keys(categories)[selectedTab] || ''] || ''}
              </p>
            </div>

            <Tab.Panels className="mt-2">
              <Tab.Panel
                key={1}
                className={classNames('rounded-xl bg-white p-4 px-8')}
              >
                {fundsFailed ? (
                  <div className="flex flex-col items-center justify-center gap-3 h-96">
                    <p className="text-2xl text-center font-thin">
                      Couldn&apos;t load your funds from Planning Center.
                    </p>
                    <p className="text-center text-sm text-gray-500">
                      This usually clears up within a minute. Nothing has been
                      changed.
                    </p>
                    <button
                      type="button"
                      onClick={() => refetchFunds()}
                      disabled={isFetchingFunds}
                      className="rounded-lg bg-yellow px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                    >
                      {isFetchingFunds ? 'Trying again…' : 'Try again'}
                    </button>
                  </div>
                ) : isEmpty(fundData) ? (
                  <div className="flex flex-col items-center justify-center h-96">
                    <p className="text-2xl text-center font-thin">
                      Please set up your accounts in order to continue with the
                      donation mapping process.
                    </p>
                    <ConnectAccountsLink />
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-4 items-center">
                      <div className="flex flex-col gap-2">
                        <button
                          className="border-[1px] p-4 rounded-lg w-72 flex items-center gap-2 justify-center mb-4 cursor-pointer hover:border-yellow hover:border-1"
                          onClick={() => enableDisableAutomation('donation')}
                        >
                          <AiOutlineCloudSync
                            size={22}
                            color={isAutomationEnable ? 'black' : 'gray'}
                          />
                          <p className="font-thin">
                            Auto-sync is now{' '}
                            {isAutomationEnable ? (
                              <span className="font-medium text-black">on</span>
                            ) : (
                              <span className="font-medium text-red-400">
                                off
                              </span>
                            )}
                          </p>
                          <p className="text-yellow">Donations</p>
                        </button>
                      </div>
                      <div className="flex flex-col gap-1 pb-8">
                        <p className="font-light">Select start date</p>
                        <DatePicker
                          selected={
                            startDates.startDateDonation
                              ? new Date(startDates.startDateDonation)
                              : new Date()
                          }
                          className="rounded-xl border-gray-200 h-88"
                          onChange={(e) =>
                            handleStartDateChange(
                              'startDateDonation',
                              e?.toDateString(),
                            )
                          }
                        />
                      </div>
                    </div>

                    <Donation fundData={fundData || []} userData={userData} />
                  </div>
                )}
              </Tab.Panel>

              <Tab.Panel
                key={2}
                className={classNames('rounded-xl bg-white p-4 px-8')}
              >
                {isEmpty(qboData) ? (
                  <div className="flex flex-col items-center justify-center h-96">
                    <p className="text-2xl text-center font-thin">
                      Please set up your accounts in order to continue with the
                      registration mapping process.
                    </p>
                    <ConnectAccountsLink />
                  </div>
                ) : (
                  // Keyed by the loaded settings: the form reads them once, when it mounts.
                  <RegistrationMapping
                    key={userData?.id ?? 'loading'}
                    userData={userData}
                    qboData={qboData}
                  />
                )}
              </Tab.Panel>

              <Tab.Panel
                key={3}
                className={classNames('rounded-xl bg-white p-4 px-8')}
              >
                {isEmpty(qboData) ? (
                  <div className="flex flex-col items-center justify-center h-96">
                    <p className="text-2xl text-center font-thin">
                      Please set up your accounts in order to continue with the
                      registration mapping process.
                    </p>
                    <ConnectAccountsLink />
                  </div>
                ) : isFetchingUserData ? (
                  // Each pick saves the whole list, built from what is shown. Until this church's
                  // saved choices are in, a pick would save a partial list over them.
                  <Loading />
                ) : !userData ? (
                  <div className="flex flex-col items-center justify-center gap-3 h-96">
                    <p className="text-2xl text-center font-thin">
                      Couldn&apos;t load this church&apos;s settings.
                    </p>
                    <p className="text-center text-sm text-gray-500">
                      Nothing has been changed.
                    </p>
                    <button
                      type="button"
                      onClick={() => refetchUserData()}
                      className="rounded-lg bg-yellow px-4 py-2 text-sm font-medium text-white"
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-relaxed text-gray-600">
                      <p>
                        <span className="font-semibold text-primary">
                          How the daily entry works:
                        </span>{' '}
                        Each day we post one journal entry — we{' '}
                        <span className="font-semibold">credit</span> your
                        revenue accounts (the gross gifts),{' '}
                        <span className="font-semibold">debit</span> the Stripe
                        fees account (Stripe&apos;s processing cut), and{' '}
                        <span className="font-semibold">debit</span> the
                        clearing account for the net amount Stripe will deposit.
                      </p>
                      <p className="pt-2">
                        Example: $699.20 in gifts − $10.58 in fees = $688.62 to
                        the clearing account.
                      </p>
                    </div>
                    <div>
                      <div className={`flex py-4  border-b-[1px] gap-8`}>
                        <div>
                          <p className="font-semibold text-primary pb-4">
                            Donations
                          </p>
                          <div className="flex items-center gap-1 pb-2">
                            <p>Select Clearing Account</p>
                            <HelpTip text="A holding account for money that has left Stripe but hasn't reached your bank yet. Pick (or create in QuickBooks) an account like 'Stripe Clearing' — usually an Other Current Asset." />
                            <span className="ml-2">
                              <FieldStatus
                                status={bankStatus.donation ?? 'idle'}
                              />
                            </span>
                          </div>
                          <Dropdown<{ value: string; label: string } | null>
                            options={qboData?.accounts
                              ?.filter((a: { type: string }) =>
                                [
                                  'Bank',
                                  'Other Current Asset',
                                  'Fixed Asset',
                                  'Other Asset',
                                ].includes(a.type),
                              )
                              .map((a: { value: any; label: any }) => ({
                                value: a.value,
                                label: a.label,
                              }))}
                            placeholder="Select Clearing Account"
                            components={{ Input }}
                            isDisabled={bankSaving}
                            onChange={(val) => {
                              const updatedBankAccounts = (
                                selectedBankAccount || []
                              ).filter((account) => account.type !== 'donation')
                              updatedBankAccounts.push({
                                type: 'donation',
                                label: val?.label || '',
                                value: val?.value || '',
                              })
                              pickBankAccounts('donation', updatedBankAccounts)
                            }}
                            value={donationAccountValue('donation')}
                            className="w-72"
                          />
                        </div>

                        <div>
                          <p className="font-semibold text-primary pb-4">
                            Registration
                          </p>
                          <div className="flex items-center gap-1 pb-2">
                            <p>Select Clearing Account</p>
                            <HelpTip text="A holding account for money that has left Stripe but hasn't reached your bank yet. Pick (or create in QuickBooks) an account like 'Stripe Clearing' — usually an Other Current Asset." />
                            <span className="ml-2">
                              <FieldStatus
                                status={bankStatus.registration ?? 'idle'}
                              />
                            </span>
                          </div>
                          <Dropdown<{ value: string; label: string } | null>
                            options={qboData?.accounts
                              ?.filter((a: { type: string }) =>
                                [
                                  'Bank',
                                  'Other Current Asset',
                                  'Fixed Asset',
                                  'Other Asset',
                                ].includes(a.type),
                              )
                              .map((a: { value: any; label: any }) => ({
                                value: a.value,
                                label: a.label,
                              }))}
                            placeholder="Select Clearing Account"
                            components={{ Input }}
                            isDisabled={bankSaving}
                            onChange={(val) => {
                              const updatedBankAccounts = (
                                selectedBankAccount || []
                              ).filter(
                                (account) => account.type !== 'registration',
                              )
                              updatedBankAccounts.push({
                                type: 'registration',
                                label: val?.label || '',
                                value: val?.value || '',
                              })
                              pickBankAccounts(
                                'registration',
                                updatedBankAccounts,
                              )
                            }}
                            value={donationAccountValue('registration')}
                            className="w-72"
                          />
                        </div>
                      </div>

                      <div className={`flex py-4  border-b-[1px] gap-8`}>
                        <div>
                          <p className="font-semibold text-primary pb-4">
                            Bank Charges
                          </p>
                          <div className="flex gap-8">
                            <div>
                              <div className="flex items-center gap-1 pb-2">
                                <p>Select Account</p>
                                <HelpTip text="Where Stripe's processing fees are recorded as an expense, e.g. 'Merchant Fees' or 'Bank Charges'." />
                                <span className="ml-2">
                                  <FieldStatus
                                    status={bankStatus.feeAccount ?? 'idle'}
                                  />
                                </span>
                              </div>
                              <Dropdown<{ value: string; label: string } | null>
                                options={qboData?.accounts
                                  ?.filter(
                                    (a: { type: string }) =>
                                      a.type === 'Expense',
                                  )
                                  .map((a: { value: any; label: any }) => ({
                                    value: a.value,
                                    label: a.label,
                                  }))}
                                placeholder="Select Account"
                                components={{ Input }}
                                isDisabled={bankSaving}
                                onChange={(val) => {
                                  pickBankExpense('feeAccount', {
                                    account: {
                                      label: val?.label || '',
                                      value: val?.value || '',
                                    },
                                    class: {
                                      // Here, you retain the class information from the current state
                                      label:
                                        selectedBankExpense?.class.label || '',
                                      value:
                                        selectedBankExpense?.class.value || '',
                                    },
                                  })
                                }}
                                value={selectedBankExpense?.account} // Only send the account part to the Dropdown
                                className="w-72"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-1 pb-2">
                                <p>Select Classes</p>
                                <span className="ml-2">
                                  <FieldStatus
                                    status={bankStatus.feeClass ?? 'idle'}
                                  />
                                </span>
                              </div>
                              <Dropdown<{ value: string; label: string } | null>
                                options={qboData?.classes.map(
                                  (a: { value: any; label: any }) => ({
                                    value: a.value,
                                    label: a.label,
                                  }),
                                )}
                                placeholder="Select Classes"
                                components={{ Input }}
                                isDisabled={bankSaving}
                                onChange={(val) => {
                                  pickBankExpense('feeClass', {
                                    account: {
                                      label:
                                        selectedBankExpense?.account.label ||
                                        '',
                                      value:
                                        selectedBankExpense?.account.value ||
                                        '',
                                    },
                                    class: {
                                      label: val?.label || '',
                                      value: val?.value || '',
                                      // Here, you retain the class information from the current state
                                    },
                                  })
                                }}
                                value={selectedBankExpense?.class} // Only send the account part to the Dropdown
                                className="w-72"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="pt-4 text-sm text-gray-500">
                      Each choice is saved as soon as you pick it.
                    </p>
                  </div>
                )}
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </div>
      )}
    </MainLayout>
  )
}

export default Mapping
