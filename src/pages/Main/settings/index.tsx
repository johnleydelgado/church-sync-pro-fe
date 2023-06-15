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
import Registration from './component/Registration'

import Account, { AccountTokenDataProps } from './component/Account'
import Donation from './component/Donation'
import { successNotification } from '@/common/utils/toast'
import { isEmpty } from 'lodash'

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

  const reTriggerIsUserTokens = useSelector(
    (item: RootState) => item.common.reTriggerIsUserTokens,
  )

  const { mutate, isLoading: isSavingSettings } = useMutation<
    unknown,
    unknown,
    { email: string; isAutomationEnable: boolean }
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

  const [categories, setCategories] = useState({
    Donation: [],
    Registration: [],
  })

  useEffect(() => {
    if (user.role === 'client') {
      const newCat = { ...categories, Account: [] }
      setCategories(newCat)
    }
  }, [user])

  const enableDisableAutomation = async () => {
    const email =
      user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
    await mutate({ email, isAutomationEnable: !isAutomationEnable })
    setIsAutomationEnable(!isAutomationEnable)
    successNotification({ title: 'Settings successfully saved !' })
  }

  useEffect(() => {
    if (!isEmpty(userData?.UserSetting?.settingsData)) {
      setIsAutomationEnable(userData?.UserSetting.isAutomationEnable)
    }
  }, [userData])

  return (
    <MainLayout>
      {isLoading || isQboDataLoading ? (
        <Loading />
      ) : (
        <div className="bg-[#fbfafd] -m-6 p-6 h-full">
          <p className="text-4xl pb-8 text-slate-700">Settings</p>
          <div className="flex flex-col gap-2">
            <p className="text-xl text-slate-600 font-thin">
              Automatic Transaction
            </p>
            <div className="flex items-center mb-4">
              <input
                id="default-checkbox"
                type="checkbox"
                value=""
                checked={isAutomationEnable}
                onChange={() => enableDisableAutomation()}
                className="w-5 h-5 text-slate-600 bg-gray-100 border-gray-300 rounded"
                disabled={isEmpty(userData?.UserSetting) ? true : false}
              />
              <label
                htmlFor="default-checkbox"
                className="ml-2 font-thin text-gray-900 text-xl"
              >
                enable automatic transaction ?
              </label>
            </div>
          </div>
          <Tab.Group>
            <div className="flex justify-center">
              <Tab.List className="flex space-x-1 rounded-xl bg-white px-4 py-2 w-96 shadow-lg">
                {Object.keys(categories).map((category) => (
                  <Tab
                    key={category}
                    disabled={
                      (category === 'Donation' ||
                        category === 'Registration') &&
                      !isUserTokens
                    }
                    className={({ selected }) =>
                      classNames(
                        'w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-gray-600',
                        selected
                          ? 'bg-green-500 shadow text-white'
                          : 'hover:bg-white/[0.12] hover:text-black',
                      )
                    }
                  >
                    {category}
                  </Tab>
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
                <Donation fundData={fundData} userData={userData} />
              </Tab.Panel>

              <Tab.Panel
                key={2}
                className={classNames(
                  'rounded-xl bg-white p-4 px-8',
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                )}
              >
                <Registration
                  qboData={qboData}
                  isAutomationEnable={isAutomationEnable}
                  userData={userData}
                />
              </Tab.Panel>

              {user.role === 'client' && (
                <Tab.Panel key={3}>
                  <Account />
                </Tab.Panel>
              )}
            </Tab.Panels>
          </Tab.Group>
        </div>
      )}
    </MainLayout>
  )
}

export default Settings
