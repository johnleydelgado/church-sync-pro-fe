import { getStripePayouts } from '@/common/api/stripe'
import Loading from '@/common/components/loading/Loading'
import { RootState } from '@/redux/store'
import React, { FC, useEffect, useState } from 'react'
import { useMutation, useQuery } from 'react-query'
import { useSelector } from 'react-redux'
import Dropdown, { components } from 'react-select'
import { BqoDataSelectProps } from '..'
import { isEmpty } from 'lodash'
import {
  SettingRegistrationQBOProps,
  createSettings,
  qboRegistrationSettings,
} from '@/common/api/user'
import { pcGetRegistrationEvents } from '@/common/api/planning-center'
import { failNotification, successNotification } from '@/common/utils/toast'
import { Button } from 'flowbite-react'

interface RegistrationProps {
  qboData: BqoDataSelectProps | undefined
  isAutomationEnable: boolean
  userData: any
}

const Input = (props: any) => (
  <components.Input
    {...props}
    inputClassName="outline-none border-none shadow-none focus:ring-transparent"
  />
)

const Registration: FC<RegistrationProps> = ({
  qboData,
  isAutomationEnable,
  userData,
}) => {
  const [selectedRegistrationName, setSelectedRegistrationName] =
    useState<string>('')
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)

  const [registrationSettingsData, setRegistrationSettingsData] = useState<
    qboRegistrationSettings[]
  >([])

  const { thirdPartyTokens, user } = useSelector(
    (state: RootState) => state.common,
  )

  // create user settings
  const { mutate, isLoading: isSavingSettings } = useMutation<
    unknown,
    unknown,
    SettingRegistrationQBOProps
  >(createSettings)

  // const {
  //   data: stripePayoutData,
  //   isLoading: isLoadingStripePayoutData,
  //   refetch: refetchStripePayoutData,
  //   isRefetching: isRefetchingStripePayoutData,
  // } = useQuery(
  //   ['getStripeRegistration'],
  //   async () => {
  //     const stripePayoutRes = await getStripePayouts(user.email)
  //     const result = stripePayoutRes.reduce((acc: any, item: any) => {
  //       const filteredDescriptions = item.data
  //         .map((x: any) => {
  //           const parts = x.description.split(' - ')
  //           if (x.description.includes('Registration')) {
  //             return parts[2] || parts[1]
  //           }
  //         })
  //         .filter((description: any) => description !== undefined)

  //       return acc.concat(filteredDescriptions)
  //     }, [])
  //     return result.map((item: any) => {
  //       return { value: item, label: item }
  //     })
  //   },
  //   { staleTime: Infinity },
  // )

  const { data: registrationData, isLoading: isLoadingRegistration } = useQuery(
    ['getRegistration'],
    async () => {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      if (email) {
        const res = await pcGetRegistrationEvents(email)
        return res
      }
    },
    { staleTime: Infinity },
  )

  const findDefaultValue = (
    registrationName: string,
    category: 'account' | 'class' | 'customer',
  ) => {
    const settingsItem = registrationSettingsData.find(
      (item) => item.registration === registrationName,
    )

    console.log(
      'registrationSettingsData',
      registrationSettingsData,
      registrationName,
    )

    switch (category) {
      case 'account':
        console.log(
          qboData?.accounts?.find(
            (option) => option.label === settingsItem?.account?.label,
          ),
        )
        return qboData?.accounts?.find(
          (option) => option.label === settingsItem?.account?.label,
        )
      case 'class':
        console.log(
          qboData?.classes?.find(
            (option) => option.label === settingsItem?.class?.label,
          ),
        )
        return qboData?.classes?.find(
          (option) => option.label === settingsItem?.class?.label,
        )
      case 'customer':
        console.log(
          qboData?.customers?.find(
            (option) => option.label === settingsItem?.customer?.label,
          ),
        )
        return qboData?.customers?.find(
          (option) => option.label === settingsItem?.customer?.label,
        )
      default:
        return undefined
    }
  }

  const isAnyKeyMissing = (): boolean => {
    return registrationSettingsData.some(
      (item) =>
        item.account === undefined ||
        item.class === undefined ||
        item.customer === undefined ||
        item.registration === undefined,
    )
  }

  const handleSubmit = async () => {
    const email =
      user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
    if (isAnyKeyMissing() || isEmpty(registrationSettingsData)) {
      failNotification({
        title: 'Please fill up all select',
        position: 'bottom-center',
      })
      return
    }

    await mutate({
      email,
      settingRegistrationData: registrationSettingsData,
      isAutomationEnable,
    })
    successNotification({ title: 'Settings successfully saved !' })
  }

  const selectHandler = ({
    val,
    category,
    registration,
  }: {
    val: any
    category: 'account' | 'class' | 'customer'
    registration: string
  }) => {
    const { value, label } = val

    const tempData: qboRegistrationSettings[] = [...registrationSettingsData]

    const index = registrationSettingsData.findIndex(
      (item: qboRegistrationSettings) => item.registration === registration,
    )

    const currentItem = tempData[index]
    if (currentItem) {
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

    setRegistrationSettingsData(tempData)
  }

  useEffect(() => {
    if (selectedRegistrationName) {
      const tempData: qboRegistrationSettings[] = [...registrationSettingsData]

      const index = registrationSettingsData.findIndex(
        (item: qboRegistrationSettings) =>
          item.registration === selectedRegistrationName,
      )

      if (index === -1) {
        // if the registration does not exist in the array, push the object into the array
        const newObject: qboRegistrationSettings = {
          registration: selectedRegistrationName,
        }
        tempData.push(newObject)
      }
      setRegistrationSettingsData(tempData)
    }
  }, [selectedRegistrationName])

  useEffect(() => {
    if (!isEmpty(userData?.UserSetting)) {
      const settingsData = userData.UserSetting.settingRegistrationData
      setRegistrationSettingsData(settingsData || [])
      // setIsAutomationEnable(userData?.data.UserSetting.isAutomationEnable)
    }
  }, [userData])

  return (
    <div className="">
      {isLoadingRegistration ? (
        <Loading />
      ) : (
        <div>
          <p>Select Registration</p>
          <Dropdown
            options={registrationData}
            components={{ Input }}
            onChange={(val: any) =>
              setSelectedRegistrationName(String(val.value))
            }
            // value={findDefaultValue(item.attributes.name, 'account')}
            className="w-72"
          />

          <div className="pt-4" />

          {isEmpty(qboData)
            ? null
            : registrationSettingsData.map((a) => (
                <div className="flex flex-col gap-2 py-4" key={a.registration}>
                  <div className="col-span-1 flex flex-col pr-6">
                    <p className="font-semibold text-[#27A1DB]">
                      {a.registration}
                    </p>
                  </div>
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
                            category: 'account',
                            registration: a.registration || '',
                          })
                        }
                        value={findDefaultValue(
                          a.registration as string,
                          'account',
                        )}
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
                            category: 'class',
                            registration: a.registration || '',
                          })
                        }
                        value={findDefaultValue(
                          a.registration as string,
                          'class',
                        )}
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
                            category: 'customer',
                            registration: a.registration || '',
                          })
                        }
                        value={findDefaultValue(
                          a.registration as string,
                          'customer',
                        )}
                        className="w-72"
                      />
                    </div>
                  </div>
                </div>
              ))}

          <div className="flex justify-end">
            <Button className="bg-green-400" onClick={() => handleSubmit()}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Registration
