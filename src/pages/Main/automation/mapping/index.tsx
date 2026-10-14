import { pcGetFunds } from '@/common/api/planning-center'
import Loading from '@/common/components/loading/Loading'
import MainLayout from '@/common/components/main-layout/MainLayout'
import React, { FC, useEffect, useMemo, useState } from 'react'
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

import { AccountTokenDataProps } from './component/Account'
import Donation from './component/Donation'
import { successNotification } from '@/common/utils/toast'
import { isEmpty } from 'lodash'
import { RootState } from '@/redux/store'
import { useChurch } from '@/common/hooks/useChurch'
import { BiSortDown } from 'react-icons/bi'
import { AiOutlineCloudSync, AiOutlineUserAdd } from 'react-icons/ai'
import { Link, useSearchParams } from 'react-router-dom'
import { mainRoute, routeSettings } from '@/common/constant/route'
import { Button, Tooltip } from '@material-tailwind/react'
import { MdAppRegistration } from 'react-icons/md'
import { BsQuestionCircle } from 'react-icons/bs'
import { useDispatch } from 'react-redux'
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
    content={<span className="block max-w-xs text-xs leading-snug">{text}</span>}
    placement="top"
  >
    <span className="inline-flex cursor-help text-gray-400 hover:text-gray-600">
      <BsQuestionCircle size={14} />
    </span>
  </Tooltip>
)

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

  // The cached settings were read before this save. Mark every copy stale without refetching the
  // page in front of the person, so the next visit - or a switch back to this church - reads
  // what was saved instead of filling the bank fields from the old copy.
  const markSettingsStale = () =>
    queryClient.invalidateQueries('getUserRelatedSettings', {
      refetchActive: false,
    })

  const { mutate: saveBankData } = useMutation<
    unknown,
    unknown,
    {
      email: string
      data: BankAccountProps[] | null
    }
  >(addUpdateBankSettings, { onSettled: markSettingsStale })

  const { mutate: saveBankCharges } = useMutation<
    unknown,
    unknown,
    {
      email: string
      data: BankAccountExpensesProps | null
    }
  >(addUpdateBankCharges, { onSettled: markSettingsStale })

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
    { enabled: !!churchId, staleTime: Infinity },
  )

  const {
    data: fundData,
    isLoading,
    isError: fundsFailed,
    isFetching: isFetchingFunds,
    refetch: refetchFunds,
  } = useQuery<FundAttProps[]>(
    ['getFunds', churchId, userData],
    async () => {
      if (!isEmpty(userData?.UserSetting?.settingsData)) {
        if (email) {
          const res = (await pcGetFunds({ email, throwOnError: true })) as FundAttProps[]
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
        const res = (await pcGetFunds({ email, throwOnError: true })) as FundAttProps[]
        return res
      }

      // Return an empty array if no matching data
      return []
    },
    { staleTime: Infinity },
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

  const handleSaveBankBtn = () => {
    successNotification({ title: 'Settings successfully saved !' })
  }

  useEffect(() => {
    if (!isEmpty(userData?.UserSetting?.settingsData)) {
      setIsAutomationEnable(userData?.UserSetting.isAutomationEnable || false)
      setIsAutomationRegistration(
        userData?.UserSetting.isAutomationRegistration || false,
      )
    }

    if (!isEmpty(userData?.UserSetting?.settingBankData)) {
      dispatch(
        setSelectedBankAccount(userData?.UserSetting?.settingBankData || null),
      )
    }

    if (!isEmpty(userData?.UserSetting?.settingBankCharges)) {
      dispatch(
        setSelectedBankExpense(
          userData?.UserSetting?.settingBankCharges || null,
        ),
      )
    }

    if (!isEmpty(userData?.UserSetting?.startDateAutomationRegistration)) {
      setStartDates((prevStartDates) => ({
        ...prevStartDates,
        ['startDateRegistration']:
          userData?.UserSetting?.startDateAutomationRegistration || null,
      }))
    }

    if (!isEmpty(userData?.UserSetting?.startDateAutomationFund)) {
      setStartDates((prevStartDates) => ({
        ...prevStartDates,
        ['startDateDonation']:
          userData?.UserSetting?.startDateAutomationFund || null,
      }))
    }
  }, [userData])

  // Bank and fee choices are saved where the person makes them, to the church on screen. They
  // used to be saved by effects watching the persisted redux values, which also fired on mount:
  // opening Mapping after a switch saved the previous church's choice into this one.
  const pickBankAccounts = (next: BankAccountProps[]) => {
    dispatch(setSelectedBankAccount(next))
    saveBankData({ email, data: next })
  }

  const pickBankExpense = (next: BankAccountExpensesProps) => {
    dispatch(setSelectedBankExpense(next))
    saveBankCharges({ email, data: next })
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
                    <Link
                      to={routeSettings.INTEGRATIONS}
                      className="text-xl pt-4 underline text-blue-400"
                    >
                      Click Here !
                    </Link>
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

                    {/* Keyed by church: its autosave must never send one church's mapping
                        to another's email when the switch lands on a cached page. */}
                    <Donation
                      key={churchId ?? 'none'}
                      fundData={fundData || []}
                      userData={userData}
                    />
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
                    <Link
                      to={routeSettings.INTEGRATIONS}
                      className="text-xl pt-4 underline text-blue-400"
                    >
                      Click Here !
                    </Link>
                  </div>
                ) : (
                  // Keyed by the church's account: switching church gets a fresh form.
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
                    <Link
                      to={routeSettings.INTEGRATIONS}
                      className="text-xl pt-4 underline text-blue-400"
                    >
                      Click Here !
                    </Link>
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
                        <span className="font-semibold">debit</span> the clearing
                        account for the net amount Stripe will deposit.
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
                          </div>
                          <Dropdown<{ value: string; label: string } | null>
                            options={qboData?.accounts
                              ?.filter((a: { type: string }) =>
                                ['Bank', 'Other Current Asset', 'Fixed Asset', 'Other Asset'].includes(
                                  a.type,
                                ),
                              )
                              .map((a: { value: any; label: any }) => ({
                                value: a.value,
                                label: a.label,
                              }))}
                            placeholder="Select Clearing Account"
                            components={{ Input }}
                            onChange={(val) => {
                              const updatedBankAccounts = (
                                selectedBankAccount || []
                              ).filter((account) => account.type !== 'donation')
                              updatedBankAccounts.push({
                                type: 'donation',
                                label: val?.label || '',
                                value: val?.value || '',
                              })
                              pickBankAccounts(updatedBankAccounts)
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
                          </div>
                          <Dropdown<{ value: string; label: string } | null>
                            options={qboData?.accounts
                              ?.filter((a: { type: string }) =>
                                ['Bank', 'Other Current Asset', 'Fixed Asset', 'Other Asset'].includes(
                                  a.type,
                                ),
                              )
                              .map((a: { value: any; label: any }) => ({
                                value: a.value,
                                label: a.label,
                              }))}
                            placeholder="Select Clearing Account"
                            components={{ Input }}
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
                              pickBankAccounts(updatedBankAccounts)
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
                                onChange={(val) => {
                                  pickBankExpense({
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
                              <p className="pb-2">Select Classes</p>
                              <Dropdown<{ value: string; label: string } | null>
                                options={qboData?.classes.map(
                                  (a: { value: any; label: any }) => ({
                                    value: a.value,
                                    label: a.label,
                                  }),
                                )}
                                placeholder="Select Classes"
                                components={{ Input }}
                                onChange={(val) => {
                                  pickBankExpense({
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
                    <div className="flex justify-end pt-8">
                      <Button
                        className="bg-green-400"
                        onClick={() => handleSaveBankBtn()}
                      >
                        Save
                      </Button>
                    </div>
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
