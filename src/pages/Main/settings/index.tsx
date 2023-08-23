import { pcGetFunds } from '@/common/api/planning-center'
import Loading from '@/common/components/loading/Loading'
import MainLayout from '@/common/components/main-layout/MainLayout'
import React, { FC, useEffect, useState } from 'react'
import { useMutation, useQuery } from 'react-query'
import { useSelector } from 'react-redux'

import { RootState } from '../../../redux/store'
import { QboGetAllQboData } from '@/common/api/qbo'
import { components } from 'react-select'
import {
  enableAutoSyncSetting,
  getTokenList,
  getUserRelated,
  isUserHaveTokens,
} from '@/common/api/user'

import { Tab } from '@headlessui/react'

import Account, { AccountTokenDataProps } from './component/Account'
import { successNotification } from '@/common/utils/toast'
import { isEmpty } from 'lodash'
import { MdSettings } from 'react-icons/md'
import { FiDivide } from 'react-icons/fi'
import Profile from './component/Profile'
import Billing from './component/Billing'
import Bookkeeper from './component/Bookkeeper'
import { useSearchParams } from 'react-router-dom'

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

const Settings: FC<SettingsProps> = () => {
  const { user } = useSelector((state: RootState) => state.common)
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const [searchParams, setSearchParams] = useSearchParams()
  const reTriggerIsUserTokens = useSelector(
    (item: RootState) => item.common.reTriggerIsUserTokens,
  )

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

  const [categories, setCategories] = useState(
    user.role === 'client'
      ? ['Account Data', 'Billing Info', 'Connect Accounts', 'Bookkeepers Tab']
      : ['Account Data'],
  )

  useEffect(() => {
    if (!isEmpty(userData?.UserSetting?.settingsData)) {
      setIsAutomationEnable(userData?.UserSetting.isAutomationEnable)
    }
  }, [userData])

  return (
    <MainLayout>
      <div className="bg-white -m-6 p-6 h-full">
        {/* Header */}
        <div className="pb-2">
          <div className="flex flex-col border-b-2 pb-2">
            <div className="flex items-center gap-2">
              <MdSettings size={28} className="text-blue-400" />
              <span className="font-bold text-lg text-[#27A1DB]">Settings</span>
            </div>
          </div>
        </div>

        <Tab.Group defaultIndex={searchParams.get('tab') === '3' ? 2 : 0}>
          <div className="flex">
            <Tab.List className="flex space-x-1 rounded-xl bg-transparent px-4 py-2 w-96">
              {categories.map((category, index: number) => (
                <div className="flex items-center" key={category}>
                  <Tab
                    // disabled={
                    //   (category === 'Donation' ||
                    //     category === 'Registration') &&
                    //   !isUserTokens
                    // }
                    className={({ selected }) =>
                      classNames(
                        'flex items-center w-36 justify-center rounded-lg p-2 text-sm font-medium leading-5 text-gray-400',
                        selected
                          ? 'bg-[#FAB400] shadow text-white'
                          : 'hover:bg-white/[0.12] hover:text-black',
                      )
                    }
                  >
                    <p className="text-center">{category}</p>
                  </Tab>
                  {index === Object.keys(categories).length - 1 ? null : (
                    <p className="text-gray-400 p-2"> | </p>
                  )}
                </div>
              ))}
            </Tab.List>
          </div>

          <Tab.Panels>
            <Tab.Panel key={1}>
              <Profile />
              {/* <Donation fundData={fundData} userData={userData} /> */}
            </Tab.Panel>

            <Tab.Panel key={2}>
              <Billing />
              {/* <Registration
                  qboData={qboData}
                  isAutomationEnable={isAutomationEnable}
                  userData={userData}
                /> */}
            </Tab.Panel>

            {user.role === 'client' && (
              <Tab.Panel key={3}>
                <Account />
              </Tab.Panel>
            )}

            {user.role === 'client' && (
              <Tab.Panel key={4}>
                <Bookkeeper />
              </Tab.Panel>
            )}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </MainLayout>
  )
}

export default Settings
