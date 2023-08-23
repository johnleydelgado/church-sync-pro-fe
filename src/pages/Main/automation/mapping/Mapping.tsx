import { pcGetFunds } from '@/common/api/planning-center'
import Loading from '@/common/components/loading/Loading'
import MainLayout from '@/common/components/main-layout/MainLayout'
import React, { FC, useEffect, useState } from 'react'
import { useMutation, useQuery } from 'react-query'
import { useSelector } from 'react-redux'

import { QboGetAllQboData } from '@/common/api/qbo'
import { components } from 'react-select'
import {
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
import { AiOutlineCloudSync } from 'react-icons/ai'
import { Link, useSearchParams } from 'react-router-dom'
import { mainRoute } from '@/common/constant/route'

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
  accounts: { value: string; label: string }[]
  classes: { value: string; label: string }[]
  customers: { value: string; label: string }[]
}

interface SettingsProps {}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

const Mapping: FC<SettingsProps> = () => {
  const { user } = useSelector((state: RootState) => state.common)
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const [searchParams, setSearchParams] = useSearchParams()

  const reTriggerIsUserTokens = useSelector(
    (item: RootState) => item.common.reTriggerIsUserTokens,
  )

  const { mutate, isLoading: isSavingSettings } = useMutation<
    unknown,
    unknown,
    {
      email: string
      isAutomationEnable?: boolean
      isAutomationRegistration?: boolean
    }
  >(enableAutoSyncSetting)

  const { data: tokenList } = useQuery<AccountTokenDataProps[]>(
    ['getTokenList', bookkeeper],
    async () => {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      if (email) return await getTokenList(email)
    },
    {
      staleTime: Infinity,
      cacheTime: Infinity,
    },
  )

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

  const { data: isUserTokens } = useQuery(
    ['isUserTokens', tokenList, bookkeeper],
    async () => {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email

      if (email) return await isUserHaveTokens(email)
      return false
    },
    {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    },
  )

  const [isAutomationEnable, setIsAutomationEnable] = useState<boolean>(false)
  const [isAutomationRegistration, setIsAutomationRegistration] =
    useState<boolean>(false)

  const [categories, setCategories] = useState({
    Donation: [],
    Registration: [],
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

  useEffect(() => {
    if (!isEmpty(userData?.UserSetting?.settingsData)) {
      setIsAutomationEnable(userData?.UserSetting.isAutomationEnable)
      setIsAutomationRegistration(
        userData?.UserSetting.isAutomationRegistration,
      )
    }
  }, [userData])

  return (
    <MainLayout>
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

          <Tab.Group defaultIndex={searchParams.get('tab') === '1' ? 1 : 0}>
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
                className={classNames(
                  'rounded-xl bg-white p-4 px-8',
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                )}
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
                    <Donation fundData={fundData} userData={userData} />
                  </div>
                )}
              </Tab.Panel>

              <Tab.Panel
                key={2}
                className={classNames(
                  'rounded-xl bg-white p-4 px-8',
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                )}
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
                    <button
                      className="border-[1px] p-4 rounded-lg w-72 flex items-center gap-2 justify-center mb-4 hover:border-yellow-300 hover:border-1"
                      onClick={() => enableDisableAutomation('registration')}
                    >
                      <AiOutlineCloudSync
                        size={22}
                        color={isAutomationRegistration ? 'black' : 'gray'}
                      />
                      <p className="font-thin">
                        turn {isAutomationRegistration ? 'Off' : 'On'} auto-sync
                      </p>
                      <p className="text-[#FAB400]">Registration</p>
                    </button>
                    <Registration qboData={qboData} userData={userData} />
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
