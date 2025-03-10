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
import { BiSortDown } from 'react-icons/bi'
import { AiOutlineCloudSync, AiOutlineUserAdd } from 'react-icons/ai'
import { Link, useSearchParams } from 'react-router-dom'
import { mainRoute, routeSettings } from '@/common/constant/route'
import { Button } from '@material-tailwind/react'
import { MdAppRegistration } from 'react-icons/md'
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
import Registration from './component/Registration'
import { getStripeList } from '@/common/api/stripe'
import Empty from '@/common/components/empty/Empty'
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

const Mapping: FC<SettingsProps> = () => {
  const dispatch = useDispatch()
  const { user, selectedBankAccount, selectedBankExpense } = useSelector(
    (state: RootState) => state.common,
  )

  const reduxStripeData = useSelector(
    (state: RootState) => state.stripeData.reduxStripeData,
  )
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
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

  const { mutate: saveBankData } = useMutation<
    unknown,
    unknown,
    {
      email: string
      data: BankAccountProps[] | null
    }
  >(addUpdateBankSettings)

  const { mutate: saveBankCharges } = useMutation<
    unknown,
    unknown,
    {
      email: string
      data: BankAccountExpensesProps | null
    }
  >(addUpdateBankCharges)

  // to get settings data
  const { data: userData, refetch: refetchUserData } =
    useQuery<UserSettingsProps>(
      ['getUserRelatedSettings', reTriggerIsUserTokens, bookkeeper],
      async () => {
        const emailF =
          user.role === 'bookkeeper'
            ? bookkeeper?.clientEmail || ''
            : user.email
        if (emailF) {
          const res = await getUserRelated(emailF)
          console.log('go here????', res.data)
          return res.data
        }
      },
      { staleTime: Infinity },
    )

  const { data: fundData, isLoading } = useQuery<FundAttProps[]>(
    ['getFunds', bookkeeper, userData], // Same query key as on the first page
    async () => {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email

      if (!isEmpty(userData?.UserSetting?.settingsData)) {
        if (email) {
          const res = (await pcGetFunds({ email })) as FundAttProps[]
          // Apply the filter and return the filtered array
          const filteredFunds = res.filter((a) => {
            // Find fund with matching name and ensure isActive is either true or undefined
            const fundSetting = userData?.UserSetting?.settingsData?.find(
              (b) => b.fundName === a.attributes.name,
            )

            // Include the fund if it has isActive set to true, or if isActive is undefined or null
            return fundSetting && fundSetting.isActive !== false
          })

          return filteredFunds // Return the filtered array
        }
      } else {
        const res = (await pcGetFunds({ email })) as FundAttProps[]
        return res
      }

      // Return an empty array if no matching data
      return []
    },
    { staleTime: Infinity },
  )

  const { data: qboData, isLoading: isQboDataLoading } = useQuery(
    useMemo(() => ['getAllQboData', bookkeeper], [bookkeeper]), // Memoize the key
    async () => await getQboData(user, bookkeeper),
    { staleTime: Infinity, refetchOnWindowFocus: false },
  )

  const { data: stripeEvents, isLoading: isStripeEventsLoading } = useQuery<
    { name: string; category: 'stripe' | 'batch'; date: string }[]
  >(
    useMemo(
      () => ['getStripeListInRegistration', bookkeeper, reduxStripeData],
      [bookkeeper, reduxStripeData],
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

      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      if (email) {
        console.log('Fetching data from API...')
        const fetchedData = await getStripeList({ email }) // Fetch only if needed
        dispatch(setReduxStripeData(fetchedData.data))
        return !isEmpty(fetchedData)
          ? fetchedData.filter((a: any) => a.isActive)
          : []
      }
    },
    {
      refetchOnWindowFocus: false,
      onSuccess: (data) => console.log('Query succeeded:', data),
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

  useEffect(() => {
    if (user.role === 'client') {
      const newCat = { ...categories }
      setCategories(newCat)
    }
  }, [user])

  const enableDisableAutomation = async (type: 'donation' | 'registration') => {
    const email =
      user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email

    if (type === 'donation') {
      console.log('test', { email, isAutomationEnable: !isAutomationEnable })
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
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
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

  useEffect(() => {
    const save = async () => {
      if (selectedBankAccount) {
        const email =
          user.role === 'bookkeeper'
            ? bookkeeper?.clientEmail || ''
            : user.email
        await saveBankData({ email, data: selectedBankAccount })
      }
    }

    save()
  }, [selectedBankAccount])

  useEffect(() => {
    const save = async () => {
      if (selectedBankExpense) {
        const email =
          user.role === 'bookkeeper'
            ? bookkeeper?.clientEmail || ''
            : user.email
        await saveBankCharges({ email, data: selectedBankExpense })
      }
    }

    save()
  }, [selectedBankExpense])

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

          <Tab.Group
            defaultIndex={
              searchParams.get('tab')
                ? Number(searchParams.get('tab')) - 1
                : mappingNumber ?? 0
            }
            onChange={(index) => dispatch(setMappingNumber(index))}
          >
            <div className="flex">
              <Tab.List className="flex space-x-1 rounded-xl bg-transparent px-4 py-2 w-96">
                {Object.keys(categories).map((category, index: number) => (
                  <div className="flex items-center" key={category}>
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
                ))}
              </Tab.List>
            </div>

            <Tab.Panels className="mt-2">
              <Tab.Panel
                key={1}
                className={classNames('rounded-xl bg-white p-4 px-8')}
              >
                {isEmpty(fundData) ? (
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

                    <Donation fundData={fundData || []} userData={userData} />
                  </div>
                )}
              </Tab.Panel>

              <Tab.Panel
                key={2}
                className={classNames('rounded-xl bg-white p-4 px-8')}
              >
                {isStripeEventsLoading ? (
                  <Loading />
                ) : isEmpty(qboData) ? (
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
                ) : stripeEvents && stripeEvents.length > 0 ? (
                  <div>
                    <div className="flex justify-between">
                      <div className="flex gap-4 items-center">
                        <div className="flex flex-col gap-2">
                          <button
                            className="border-[1px] p-4 rounded-lg w-82 flex items-center gap-2 justify-center mb-4 cursor-pointer hover:border-yellow hover:border-1"
                            onClick={() =>
                              enableDisableAutomation('registration')
                            }
                          >
                            <AiOutlineCloudSync
                              size={22}
                              color={
                                isAutomationRegistration ? 'black' : 'gray'
                              }
                            />
                            <p className="font-thin">
                              Auto-sync is now{' '}
                              {isAutomationRegistration ? (
                                <span className="font-medium text-black">
                                  on
                                </span>
                              ) : (
                                <span className="font-medium text-red-400">
                                  off
                                </span>
                              )}
                            </p>
                            <p className="text-yellow">Registration</p>
                          </button>
                        </div>

                        <div className="flex flex-col gap-1 pb-8">
                          <p className="font-light">Select start date</p>
                          <DatePicker
                            selected={
                              startDates.startDateRegistration
                                ? new Date(startDates.startDateRegistration)
                                : new Date()
                            }
                            className="rounded-xl border-gray-200 h-88"
                            onChange={(e) =>
                              handleStartDateChange(
                                'startDateRegistration',
                                e?.toDateString(),
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <Registration
                      stripeEvents={stripeEvents || []}
                      userData={userData}
                    />
                  </div>
                ) : (
                  <Empty />
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
                ) : (
                  <div>
                    <div>
                      <div className={`flex py-4  border-b-[1px] gap-8`}>
                        <div>
                          <p className="font-semibold text-primary pb-4">
                            Donations
                          </p>
                          <p className="pb-2">Select Bank Account</p>
                          <Dropdown<{ value: string; label: string } | null>
                            options={qboData?.accounts
                              ?.filter(
                                (a: { type: string }) => a.type === 'Bank',
                              )
                              .map((a: { value: any; label: any }) => ({
                                value: a.value,
                                label: a.label,
                              }))}
                            placeholder="Select Bank Account"
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
                              dispatch(
                                setSelectedBankAccount(updatedBankAccounts),
                              )
                            }}
                            value={donationAccountValue('donation')}
                            className="w-72"
                          />
                        </div>

                        <div>
                          <p className="font-semibold text-primary pb-4">
                            Registration
                          </p>
                          <p className="pb-2">Select Bank Account</p>
                          <Dropdown<{ value: string; label: string } | null>
                            options={qboData?.accounts
                              ?.filter(
                                (a: { type: string }) => a.type === 'Bank',
                              )
                              .map((a: { value: any; label: any }) => ({
                                value: a.value,
                                label: a.label,
                              }))}
                            placeholder="Select Bank Account"
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
                              dispatch(
                                setSelectedBankAccount(updatedBankAccounts),
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
                              <p className="pb-2">Select Account</p>
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
                                  dispatch(
                                    setSelectedBankExpense({
                                      account: {
                                        label: val?.label || '',
                                        value: val?.value || '',
                                      },
                                      class: {
                                        // Here, you retain the class information from the current state
                                        label:
                                          selectedBankExpense?.class.label ||
                                          '',
                                        value:
                                          selectedBankExpense?.class.value ||
                                          '',
                                      },
                                    }),
                                  )
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
                                  dispatch(
                                    setSelectedBankExpense({
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
                                    }),
                                  )
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
