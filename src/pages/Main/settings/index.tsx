import MainLayout from '@/common/components/main-layout/MainLayout'
import React, { FC, useEffect, useState } from 'react'
import { useQuery } from 'react-query'
import { useSelector } from 'react-redux'

import { RootState } from '../../../redux/store'

import { getUserRelated } from '@/common/api/user'

// import { Tab } from '@headlessui/react'

import Account, { AccountTokenDataProps } from './component/Account'
import { successNotification } from '@/common/utils/toast'
import { isEmpty } from 'lodash'
import { MdSettings } from 'react-icons/md'
import { FiDivide } from 'react-icons/fi'
import Profile from './component/Profile'
import Billing from './component/Billing'
import Bookkeeper from './component/Bookkeeper'
import { useSearchParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setTabSettings } from '@/redux/common'
import {
  Tab,
  TabPanel,
  Tabs,
  TabsBody,
  TabsHeader,
} from '@material-tailwind/react'

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

const Settings: FC<SettingsProps> = () => {
  const { user } = useSelector((state: RootState) => state.common)
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const dispatch = useDispatch()

  const { tabSettings } = useSelector((state: RootState) => state.common)
  const [searchParams, setSearchParams] = useSearchParams()

  const tabValue = tabSettings?.account
    ? 'Account Data'
    : tabSettings?.billing
    ? 'Billing Info'
    : tabSettings?.connect
    ? 'Connect Accounts'
    : tabSettings?.bookkeeper
    ? 'Bookkeepers Tab'
    : 'Account Data'

  const tabValue2 = (tabSettings: any) => {
    switch (tabSettings) {
      case '1':
        return 'Account Data'
      case '2':
        return 'Billing Info'
      case '3':
        return 'Connect Accounts'
      case '4':
        return 'Bookkeepers Tab'
      default:
        return 'Account Data'
    }
  }

  const reTriggerIsUserTokens = useSelector(
    (item: RootState) => item.common.reTriggerIsUserTokens,
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

  const [isAutomationEnable, setIsAutomationEnable] = useState<boolean>(false)
  const [activeTab, setActiveTab] = React.useState(tabValue || 'Account Data')
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

  useEffect(() => {
    setActiveTab(tabValue)
  }, [tabSettings])

  // useEffect(() => {
  //   if (searchParams.get('tab')) setActiveTab(tabValue2(searchParams.get('tab')))
  // }, [searchParams])

  return (
    <MainLayout>
      <div className="-m-6 p-6 h-full">
        {/* Header */}
        <div className="pb-2">
          <div className="flex flex-col border-b-2 pb-2">
            <div className="flex items-center gap-2">
              <MdSettings size={28} className="text-blue-400" />
              <span className="font-bold text-lg text-[#27A1DB]">Settings</span>
            </div>
          </div>
        </div>
        <Tabs
          // value={activeTab}
          value={activeTab}
          className="w-full"
        >
          <TabsHeader
            className="bg-transparent w-full md:w-1/2 lg:w-full xl:w-1/2"
            indicatorProps={{
              className: 'bg-[#FAB400] shadow-none rounded-2xl',
            }}
          >
            {categories.map((category, index: number) => (
              <Tab
                key={category}
                value={category}
                onClick={() =>
                  dispatch(
                    setTabSettings({
                      account: category === categories[0],
                      billing: category === categories[1],
                      connect: category === categories[2],
                      bookkeeper: category === categories[3],
                    }),
                  )
                }
                className={
                  activeTab === category
                    ? 'text-white text-md font-medium leading-5 p-4'
                    : 'text-black text-md font-medium leading-5 p-4'
                }
              >
                {category}
              </Tab>
            ))}
          </TabsHeader>
          <TabsBody>
            {/* {categories.map(({ value, desc }) => (
          <TabPanel key={value} value={value}>
            {desc}
          </TabPanel>
        ))} */}

            <TabPanel key={1} value="Account Data">
              <Profile />
            </TabPanel>

            <TabPanel key={2} value="Billing Info">
              <Billing />
            </TabPanel>

            {user.role === 'client' && (
              <TabPanel key={3} value="Connect Accounts">
                <Account />
              </TabPanel>
            )}

            {user.role === 'client' && (
              <TabPanel key={4} value="Bookkeepers Tab">
                <Bookkeeper />
              </TabPanel>
            )}
          </TabsBody>
        </Tabs>
        {/* <Tab.Group
          defaultIndex={
            tabSettings?.account
              ? 0
              : tabSettings?.billing
              ? 1
              : tabSettings?.connect
              ? 2
              : tabSettings?.bookkeeper
              ? 3
              : 0
          }
          onChange={(currentTab) =>
            dispatch(
              setTabSettings({
                account: currentTab === 0,
                billing: currentTab === 1,
                connect: currentTab === 2,
                bookkeeper: currentTab === 3,
              }),
            )
          }
        >
          <div className="flex">
            <Tab.List className="flex space-x-1 rounded-xl bg-transparent px-4 py-2 w-96">
              {categories.map((category, index: number) => (
                <div className="flex items-center" key={category}>
                  <Tab
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
            </Tab.Panel>

            <Tab.Panel key={2}>
              <Billing />
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
        </Tab.Group> */}
      </div>
    </MainLayout>
  )
}

export default Settings
