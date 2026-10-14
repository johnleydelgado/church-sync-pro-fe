import MainLayout from '@/common/components/main-layout/MainLayout'
import React, { FC, useEffect, useState } from 'react'
import { useQuery } from 'react-query'
import { useSelector } from 'react-redux'

import { RootState } from '../../../redux/store'

import { getUserRelated } from '@/common/api/user'
import { useChurch } from '@/common/hooks/useChurch'
import { MyChurch } from '@/common/api/church'

import Account from './component/Account'
import { isEmpty } from 'lodash'
import { MdSettings } from 'react-icons/md'
import Profile from './component/Profile'
import Billing from './component/Billing'
import People from './component/People'
import Projects from './component/Projects'
import Email from './component/Email'
import { useSearchParams } from 'react-router-dom'
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

export interface QboDataSelectProps {
  accounts: { value: string; label: string }[]
  classes: { value: string; label: string }[]
  customers: { value: string; label: string }[]
}

interface TabItem {
  key: string
  label: string
  Component: FC
  /** Whether the tab is shown for the selected church (null: none selected). */
  visible: (church: MyChurch | null) => boolean
}

const always = () => true
const withChurch = (church: MyChurch | null) => !!church

// Tab keys are used as the `?tab=` value so tabs are deep-linkable.
const TABS: TabItem[] = [
  { key: 'profile', label: 'Profile', Component: Profile, visible: always },
  { key: 'billing', label: 'Billing', Component: Billing, visible: always },
  {
    key: 'integrations',
    label: 'Integrations',
    Component: Account,
    // Owners, and bookkeepers an owner allowed to connect integrations.
    visible: (church) => !!church?.canConnectIntegrations,
  },
  { key: 'people', label: 'People', Component: People, visible: withChurch },
  {
    key: 'projects',
    label: 'Projects',
    Component: Projects,
    visible: withChurch,
  },
  { key: 'email', label: 'Email', Component: Email, visible: withChurch },
]

// Older links name a tab that was since replaced.
const TAB_ALIASES: Record<string, string> = { bookkeeper: 'people' }

interface SettingsProps {}

const Settings: FC<SettingsProps> = () => {
  const { church, email, churchId } = useChurch()

  const [searchParams, setSearchParams] = useSearchParams()

  const visibleTabs = TABS.filter((tab) => tab.visible(church))

  const requestedTab = searchParams.get('tab') || ''
  const tabFromUrl = TAB_ALIASES[requestedTab] ?? requestedTab
  // An unknown tab, or one this church doesn't show the person, opens the first visible tab.
  const activeTab = visibleTabs.some((tab) => tab.key === tabFromUrl)
    ? tabFromUrl
    : visibleTabs[0]?.key || 'profile'

  const reTriggerIsUserTokens = useSelector(
    (item: RootState) => item.common.reTriggerIsUserTokens,
  )

  // to get settings data
  const { data: userData } = useQuery(
    ['getUserRelatedSettings', reTriggerIsUserTokens, churchId],
    async () => {
      if (email) {
        const res = await getUserRelated(email)
        return res.data
      }
    },
    { enabled: !!churchId, staleTime: Infinity },
  )

  const [isAutomationEnable, setIsAutomationEnable] = useState<boolean>(false)

  useEffect(() => {
    if (!isEmpty(userData?.UserSetting?.settingsData)) {
      setIsAutomationEnable(userData?.UserSetting.isAutomationEnable)
    }
  }, [userData])

  const handleTabChange = (key: string) => {
    setSearchParams({ tab: key })
  }

  return (
    <MainLayout>
      <div className="-m-6 p-6 h-full">
        {/* Header */}
        <div className="pb-2">
          <div className="flex flex-col border-b-2 pb-2">
            <div className="flex items-center gap-2">
              <MdSettings size={28} className="text-blue-400" />
              <span className="font-bold text-lg text-primary">Settings</span>
            </div>
          </div>
        </div>
        {/* Keyed: material-tailwind's Tabs reads `value` only when it mounts, so a ?tab= change
            (a link, Back, or the tab hiding itself) would otherwise leave the old tab showing. */}
        <Tabs key={activeTab} value={activeTab} className="w-full">
          <TabsHeader
            className="bg-transparent w-full md:w-1/2 lg:w-full xl:w-1/2"
            indicatorProps={{
              className: 'bg-yellow shadow-none rounded-2xl',
            }}
          >
            {visibleTabs.map((tab) => (
              <Tab
                key={tab.key}
                value={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={
                  activeTab === tab.key
                    ? 'text-white text-md font-medium leading-5 p-4'
                    : 'text-black text-md font-medium leading-5 p-4'
                }
              >
                {tab.label}
              </Tab>
            ))}
          </TabsHeader>
          <TabsBody>
            {visibleTabs.map((tab) => {
              const PanelComponent = tab.Component
              return (
                <TabPanel key={tab.key} value={tab.key}>
                  <PanelComponent />
                </TabPanel>
              )
            })}
          </TabsBody>
        </Tabs>
      </div>
    </MainLayout>
  )
}

export default Settings
