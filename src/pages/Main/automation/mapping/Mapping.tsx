import { pcGetFunds } from '@/common/api/planning-center'
import Loading from '@/common/components/loading/Loading'
import MainLayout from '@/common/components/main-layout/MainLayout'
import React, { FC, useEffect, useState } from 'react'
import { useMutation, useQuery } from 'react-query'
import { useSelector } from 'react-redux'

import { QboGetAllQboData } from '@/common/api/qbo'
import {
  addUpdateBankCharges,
  addUpdateBankSettings,
  enableAutoSyncSetting,
  getTokenList,
  getUserRelated,
  isUserHaveTokens,
} from '@/common/api/user'

import { Tab } from '@headlessui/react'
import Registration from './component/Registration'

import { AccountTokenDataProps } from './component/Account'
import Donation from './component/Donation'
import { successNotification } from '@/common/utils/toast'
import { isEmpty } from 'lodash'
import { RootState } from '@/redux/store'
import { BiSortDown } from 'react-icons/bi'
import { AiOutlineCloudSync, AiOutlineUserAdd } from 'react-icons/ai'
import { Link, useSearchParams } from 'react-router-dom'
import { mainRoute } from '@/common/constant/route'
import { Button } from '@material-tailwind/react'
import { MdAppRegistration } from 'react-icons/md'
import { useDispatch } from 'react-redux'
import {
  BankAccountExpensesProps,
  BankAccountProps,
  OPEN_MODAL,
  setSelectedBankAccount,
  setSelectedBankExpense,
  setSelectedStartDate,
} from '@/redux/common'
import { MODALS_NAME } from '@/common/constant/modal'
import 'react-datepicker/dist/react-datepicker.css'
import { format, parseISO } from 'date-fns'
import TransactionDateModal from './component/TransactionDateModal'
import Dropdown, { components } from 'react-select'

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

export interface BqoDataSelectProps {
  accounts: { value: string; label: string; type?: string }[]
  classes: { value: string; label: string }[]
  customers: { value: string; label: string }[]
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
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)

  const [searchParams, setSearchParams] = useSearchParams()

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

  const { data: fundData, isLoading } = useQuery<FundProps[]>(
    ['getFunds', bookkeeper], // Same query key as in the first page

    async () => {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      if (email) return await pcGetFunds({ email })
    },
    { staleTime: Infinity },
  )

  // to get settings data
  const { data: userData } = useQuery(
    ['getUserRelatedSettings', reTriggerIsUserTokens, bookkeeper],
    async () => {
      const emailF =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      if (emailF) {
        const res = await getUserRelated(emailF)
        return res.data
      }
    },
    { staleTime: Infinity },
  )
  const { data: qboData, isLoading: isQboDataLoading } =
    useQuery<BqoDataSelectProps>(
      ['getAllQboData', bookkeeper],
      async () => {
        const email =
          user.role === 'bookkeeper'
            ? bookkeeper?.clientEmail || ''
            : user.email
        console.log('aa', email)
        if (email)
          return await QboGetAllQboData({
            email: email,
          })
      },
      { staleTime: Infinity, refetchOnWindowFocus: false },
    )

  const [isAutomationEnable, setIsAutomationEnable] = useState<boolean>(false)
  const [isAutomationRegistration, setIsAutomationRegistration] =
    useState<boolean>(false)

  const [categories, setCategories] = useState({
    Donation: [],
    Registration: [],
    Bank: [],
  })

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

  useEffect(() => {
    if (!isEmpty(userData?.UserSetting?.settingsData)) {
      setIsAutomationEnable(userData?.UserSetting.isAutomationEnable)
      setIsAutomationRegistration(
        userData?.UserSetting.isAutomationRegistration,
      )
    }

    if (!isEmpty(userData?.UserSetting?.settingBankData)) {
      dispatch(setSelectedBankAccount(userData?.UserSetting?.settingBankData))
    }

    if (!isEmpty(userData?.UserSetting?.settingBankCharges)) {
      dispatch(
        setSelectedBankExpense(userData?.UserSetting?.settingBankCharges),
      )
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
                <span className="font-bold text-lg text-[#27A1DB]">
                  Mapping
                </span>
              </div>
            </div>
          </div>

          <Tab.Group
            defaultIndex={
              searchParams.get('tab') ? Number(searchParams.get('tab')) - 1 : 0
            }
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
                            ? 'bg-[#FAB400] shadow text-white'
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
                      to={mainRoute.SETTINGS + '?tab=3'}
                      className="text-xl pt-4 underline text-blue-400"
                    >
                      Click Here !
                    </Link>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center">
                      <button
                        className="border-[1px] p-4 rounded-lg w-72 flex items-center gap-2 justify-center mb-4 cursor-pointer hover:border-yellow-300 hover:border-1"
                        onClick={() => enableDisableAutomation('donation')}
                      >
                        <AiOutlineCloudSync
                          size={22}
                          color={isAutomationEnable ? 'black' : 'gray'}
                        />
                        <p className="font-thin">
                          turn {isAutomationEnable ? 'Off' : 'On'} auto-sync
                        </p>
                        <p className="text-[#FAB400]">Donations</p>
                      </button>
                    </div>

                    <Donation fundData={fundData} userData={userData} />
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
                      to={mainRoute.SETTINGS + '?tab=3'}
                      className="text-xl pt-4 underline text-blue-400"
                    >
                      Click Here !
                    </Link>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center pb-4">
                      <div>
                        <button
                          className="border-[1px] p-4 rounded-lg w-72 flex items-center gap-2 justify-center hover:border-yellow-300 hover:border-1"
                          onClick={() =>
                            enableDisableAutomation('registration')
                          }
                        >
                          <AiOutlineCloudSync
                            size={22}
                            color={isAutomationRegistration ? 'black' : 'gray'}
                          />
                          <p className="font-thin">
                            turn {isAutomationRegistration ? 'Off' : 'On'}{' '}
                            auto-sync
                          </p>
                          <p className="text-[#FAB400]">Registration</p>
                        </button>
                      </div>

                      <Button
                        variant="outlined"
                        className="border-gray-400 text-black flex items-center gap-3 font-thin"
                        onClick={openModalRegistration}
                      >
                        <MdAppRegistration
                          size={18}
                          className="text-[#FAB400]"
                        />
                        Add new registration
                      </Button>
                    </div>

                    <Registration qboData={qboData} userData={userData} />
                  </div>
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
                      to={mainRoute.SETTINGS + '?tab=3'}
                      className="text-xl pt-4 underline text-blue-400"
                    >
                      Click Here !
                    </Link>
                  </div>
                ) : (
                  <div>
                    <div className={`flex py-4  border-b-[1px] gap-8`}>
                      <div>
                        <p className="font-semibold text-[#27A1DB] pb-4">
                          Donations
                        </p>
                        <p className="pb-2">Select Bank Account</p>
                        <Dropdown<{ value: string; label: string } | null>
                          options={qboData?.accounts
                            ?.filter((a) => a.type === 'Bank')
                            .map((a) => ({
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
                        <p className="font-semibold text-[#27A1DB] pb-4">
                          Registration
                        </p>
                        <p className="pb-2">Select Bank Account</p>
                        <Dropdown<{ value: string; label: string } | null>
                          options={qboData?.accounts
                            ?.filter((a) => a.type === 'Bank')
                            .map((a) => ({
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
                        <p className="font-semibold text-[#27A1DB] pb-4">
                          Bank Expenses
                        </p>
                        <div className="flex gap-8">
                          <div>
                            <p className="pb-2">Select Account</p>
                            <Dropdown<{ value: string; label: string } | null>
                              options={qboData?.accounts
                                ?.filter((a) => a.type === 'Expense')
                                .map((a) => ({
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
                                        selectedBankExpense?.class.label || '',
                                      value:
                                        selectedBankExpense?.class.value || '',
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
                              options={qboData?.classes.map((a) => ({
                                value: a.value,
                                label: a.label,
                              }))}
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
