import { isEmpty } from 'lodash'
import React, { FC, useEffect, useState } from 'react'
import { useMutation, useQuery } from 'react-query'
import Dropdown, { components } from 'react-select'
import { QboGetAllQboData } from '@/common/api/qbo'
import { RootState } from '@/redux/store'
import { useSelector } from 'react-redux'
import { SettingQBOProps, createSettings, qboSettings } from '@/common/api/user'
import { Button } from '@material-tailwind/react'
import { failNotification, successNotification } from '@/common/utils/toast'
import { useDispatch } from 'react-redux'
import Loading from '@/common/components/loading/Loading'
import { OPEN_MODAL, setReTriggerIsUserTokens } from '@/redux/common'
import { BqoDataSelectProps } from '../Mapping'
import { MODALS_NAME } from '@/common/constant/modal'

interface DonationProps {
  fundData: any
  userData: any
}

const Input = (props: any) => (
  <components.Input
    {...props}
    inputClassName="outline-none border-none shadow-none focus:ring-transparent"
  />
)
const delay = (ms: any) => new Promise((res) => setTimeout(res, ms))

const Donation: FC<DonationProps> = ({ fundData, userData }) => {
  const { user, selectedStartDate } = useSelector(
    (state: RootState) => state.common,
  )
  const [settingsData, setSettingsData] = useState<qboSettings[]>([])
  const [onGoingSaving, setOnGoingSaving] = useState<boolean>(false)

  const dispatch = useDispatch()
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const reTriggerIsUserTokens = useSelector(
    (item: RootState) => item.common.reTriggerIsUserTokens,
  )
  // create user settings
  const { mutate, isLoading: isSavingSettings } = useMutation<
    unknown,
    unknown,
    SettingQBOProps
  >(createSettings)

  const { data: qboData, isLoading: isQboDataLoading } =
    useQuery<BqoDataSelectProps>(
      ['getAllQboData', bookkeeper],
      async () => {
        const email =
          user.role === 'bookkeeper'
            ? bookkeeper?.clientEmail || ''
            : user.email
        console.log('email is:', email)
        if (email) return await QboGetAllQboData({ email })
      },
      { refetchOnWindowFocus: false },
    )

  const selectHandler = ({
    val,
    fundName,
    category,
  }: {
    val: any
    fundName: string | null | undefined
    category: 'account' | 'class' | 'customer'
  }) => {
    const tempData: qboSettings[] = [...settingsData]

    const index = tempData.findIndex(
      (item: qboSettings) => item.fundName === fundName,
    )

    if (index !== -1) {
      const currentItem = tempData[index]

      if (currentItem) {
        // Check if currentItem is defined
        if (val) {
          const { value, label } = val
          currentItem[category] = { value, label }
        } else {
          currentItem[category] = undefined
        }
      }
    } else {
      const newObject: qboSettings = { fundName }

      if (val) {
        const { value, label } = val
        newObject[category] = { value, label }
      } else {
        newObject[category] = undefined
      }

      tempData.push(newObject)
    }

    setSettingsData(tempData)
  }

  const isAnyKeyMissing = (): boolean => {
    return settingsData.some(
      (item) =>
        item.account === undefined ||
        item.class === undefined ||
        item.fundName === undefined,
    )
  }

  const handleSubmit = async () => {
    if (
      isAnyKeyMissing() ||
      fundData?.length !== settingsData.length ||
      isEmpty(settingsData)
    ) {
      failNotification({
        title: 'Please fill up all select',
        position: 'bottom-center',
      })
      return
    }
    try {
      setOnGoingSaving(true)
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      await mutate({
        email,
        settingsData,
      })
      await delay(2000)
      dispatch(setReTriggerIsUserTokens(!reTriggerIsUserTokens))
      successNotification({ title: 'Settings successfully saved !' })
      if (!selectedStartDate) {
        dispatch(OPEN_MODAL(MODALS_NAME.transactionDate))
      }
      setOnGoingSaving(false)
    } catch (e) {
      console.log('test')
    }

    // dispatch(setReTriggerIsUserTokens(!reTriggerIsUserTokens))
  }

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
          (option: { label: string | undefined }) =>
            option.label === settingsItem?.account?.label,
        )
      case 'class':
        return qboData?.classes?.find(
          (option: { label: string | undefined }) =>
            option.label === settingsItem?.class?.label,
        )
      case 'customer':
        return qboData?.customers?.find(
          (option: { label: string | undefined }) =>
            option.label === settingsItem?.customer?.label,
        )
      default:
        return undefined
    }
  }

  useEffect(() => {
    if (!isEmpty(userData?.UserSetting?.settingsData)) {
      const settingsData = userData.UserSetting.settingsData
      setSettingsData(settingsData)
    }
  }, [userData])

  return (
    <div>
      {isSavingSettings || isQboDataLoading || onGoingSaving ? (
        <Loading />
      ) : (
        <>
          {fundData?.map((item: any, index: number) => (
            <div
              key={index}
              className={`flex flex-col gap-2 py-4 ${
                index === fundData.length - 1 ? '' : 'border-b-[1px]'
              } `}
            >
              <div className="col-span-1 flex flex-col pr-6">
                <p className="font-semibold text-[#27A1DB]">
                  {item.attributes.name}
                </p>
                <p className="font-normal text-gray-400 text-sm">
                  {item.attributes.description}
                </p>
              </div>
              {isEmpty(qboData) && isEmpty(item.attributes.name) ? null : (
                <div className="flex items-center gap-4">
                  {/* Accounts */}
                  <div className="flex flex-col gap-2">
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
                  </div>
                  {/* Classes */}
                  <div className="flex flex-col gap-2">
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
                  </div>
                  {/* Projects */}
                  <div className="flex flex-col gap-2">
                    <p>Projects</p>
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
                      isClearable
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="flex justify-end">
            <Button className="bg-green-400" onClick={() => handleSubmit()}>
              Save
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

export default Donation
