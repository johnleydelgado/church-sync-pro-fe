import { pcGetFunds } from '@/common/api/planning-center'
import Loading from '@/common/components/loading/Loading'
import MainLayout from '@/common/components/main-layout/MainLayout'
import React, { FC, useEffect, useState } from 'react'
import { useMutation, useQuery } from 'react-query'
import { useSelector } from 'react-redux'

import { RootState } from '../../../redux/store'
import '@wojtekmaj/react-daterange-picker/dist/DateRangePicker.css'
import 'react-calendar/dist/Calendar.css'
import { Button, Checkbox, Label } from 'flowbite-react'
import { QboGetAllQboData } from '@/common/api/qbo'
import Dropdown, { components } from 'react-select'
import {
  SettingQBOProps,
  createSettings,
  getUserRelated,
  qboSettings,
} from '@/common/api/user'
import { isEmpty } from 'lodash'
import { failNotification, successNotification } from '@/common/utils/toast'
import { CgKey } from 'react-icons/cg'

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

const Settings: FC<SettingsProps> = () => {
  const { thirdPartyTokens, user } = useSelector(
    (state: RootState) => state.common,
  )

  const { data, isLoading } = useQuery<FundProps[]>(['getFunds'], async () => {
    return await pcGetFunds({
      email: user.email,
    })
  })

  const { data: userData } = useQuery(['getUserRelated'], async () => {
    return await getUserRelated(user.email)
  })

  const { data: qboData, isLoading: isQboDataLoading } =
    useQuery<BqoDataSelectProps>(['getAllQboData'], async () => {
      return await QboGetAllQboData({
        email: user.email,
      })
    })

  const [settingsData, setSettingsData] = useState<qboSettings[]>([])
  const [isAutomationEnable, setIsAutomationEnable] = useState<boolean>(false)

  // create user settings
  const { mutate, isLoading: isSavingSettings } = useMutation<
    unknown,
    unknown,
    SettingQBOProps
  >(createSettings)

  const isAnyKeyMissing = (): boolean => {
    return settingsData.some(
      (item) =>
        item.account === undefined ||
        item.class === undefined ||
        item.customer === undefined ||
        item.fundName === undefined,
    )
  }

  const handleSubmit = async () => {
    if (
      isAnyKeyMissing() ||
      data?.length !== settingsData.length ||
      isEmpty(settingsData)
    ) {
      failNotification({
        title: 'Please fill up all select',
        position: 'bottom-center',
      })
      return
    }

    await mutate({ email: user.email, settingsData, isAutomationEnable })
    successNotification({ title: 'Settings successfully saved !' })
  }

  const selectHandler = ({
    val,
    fundName,
    category,
  }: {
    val: any
    fundName: string | null | undefined
    category: 'account' | 'class' | 'customer'
  }) => {
    const { value, label } = val
    const tempData: qboSettings[] = [...settingsData]

    const index = settingsData.findIndex(
      (item: qboSettings) => item.fundName === fundName,
    )

    if (index === -1) {
      // if the fundName does not exist in the array, push the object into the array
      const newObject: qboSettings = {
        fundName,
        [category.toLowerCase()]: { value, label },
      }
      tempData.push(newObject)
    } else {
      const currentItem = tempData[index] ?? { fundName }
      switch (category) {
        case 'account':
          currentItem.account = { value, label }
          break
        case 'class':
          currentItem.class = { value, label }
          break
        case 'customer':
          currentItem.customer = { value, label }
          break
        default:
          break
      }
    }
    // Update the settingsData state with the modified tempData
    setSettingsData(tempData)
  }

  useEffect(() => {
    if (!isEmpty(userData?.data?.UserSetting)) {
      const data = userData.data.UserSetting.settingsData
      setSettingsData(data)
      setIsAutomationEnable(userData?.data.UserSetting.isAutomationEnable)
    }
  }, [userData])

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
          (option) => option.label === settingsItem?.account?.label,
        )
      case 'class':
        return qboData?.classes?.find(
          (option) => option.label === settingsItem?.class?.label,
        )
      case 'customer':
        return qboData?.customers?.find(
          (option) => option.label === settingsItem?.customer?.label,
        )
      default:
        return undefined
    }
  }

  return (
    <MainLayout>
      {isLoading || isSavingSettings || isQboDataLoading ? (
        <Loading />
      ) : (
        <div className="bg-[#fbfafd] -m-6 p-6">
          <p className="text-4xl pb-8 text-slate-700">Settings</p>
          <div className="flex flex-col gap-2">
            <p className="text-xl text-slate-600">Automatic Transaction</p>
            <div className="flex items-center mb-4">
              <input
                id="default-checkbox"
                type="checkbox"
                value=""
                checked={isAutomationEnable}
                onChange={() => setIsAutomationEnable(!isAutomationEnable)}
                className="w-5 h-5 text-slate-600 bg-gray-100 border-gray-300 rounded"
              />
              <label
                htmlFor="default-checkbox"
                className="ml-2 font-medium text-gray-900 text-xl"
              >
                enable automatic transaction ?
              </label>
            </div>
          </div>
          {data?.map((item, index) => (
            <div
              key={index}
              className={`grid grid-cols-2 gap-2 py-4 ${
                index === data.length - 1 ? '' : 'border-b-[1px]'
              } `}
            >
              <div className="col-span-1 flex flex-col pr-6">
                <p className="font-semibold text-slate-700">
                  {item.attributes.name}
                </p>
                <p className="font-medium text-slate-500 text-sm">
                  {item.attributes.description}
                </p>
              </div>
              {isEmpty(qboData) && isEmpty(item.attributes.name) ? null : (
                <div className="flex flex-col col-span-1 gap-4">
                  {/* Accounts */}
                  <p>Accounts</p>
                  <Dropdown
                    options={qboData?.accounts}
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
                  {/* Classes */}
                  <p>Classes</p>
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
                  />
                  {/* Customers */}
                  <p>Customers</p>
                  <Dropdown
                    options={qboData?.customers}
                    components={{ Input }}
                    onChange={(val) =>
                      selectHandler({
                        val,
                        fundName: item.attributes.name,
                        category: 'customer',
                      })
                    }
                    value={findDefaultValue(item.attributes.name, 'customer')}
                    className="w-72"
                  />
                </div>
              )}
            </div>
          ))}
          <div className="flex justify-end">
            <Button className="bg-green-400" onClick={() => handleSubmit()}>
              Save
            </Button>
          </div>
        </div>
      )}
    </MainLayout>
  )
}

export default Settings
