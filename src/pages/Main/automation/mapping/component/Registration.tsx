import { isEmpty } from 'lodash'
import React, { FC, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import Dropdown, { components } from 'react-select'
import { QboGetAllQboData, getQboData } from '@/common/api/qbo'
import { RootState } from '@/redux/store'
import { useSelector } from 'react-redux'
import {
  SettingRegistrationQBOProps,
  createSettings,
  qboRegistrationSettings,
} from '@/common/api/user'
import {
  Button,
  IconButton,
  Popover,
  PopoverContent,
  PopoverHandler,
  Typography,
} from '@material-tailwind/react'
import { failNotification, successNotification } from '@/common/utils/toast'
import { useDispatch } from 'react-redux'
import Loading from '@/common/components/loading/Loading'
import { OPEN_MODAL, setReTriggerIsUserTokens } from '@/redux/common'
import { MODALS_NAME } from '@/common/constant/modal'
import ModalCreateUpdateProject from '@/common/components/modal/ModalCreateUpdateProject'
import { BiArchive, BiDotsHorizontal } from 'react-icons/bi'
import { BsPlus } from 'react-icons/bs'
import { setReduxQboData } from '@/redux/qbo'
import { setReduxStripeData } from '@/redux/stripe'
import colors from '@/common/constant/colors'

interface DonationProps {
  stripeEvents: { name: string; date: string }[] | any[]
  userData: any
}

const Input = (props: any) => (
  <components.Input
    {...props}
    inputClassName="outline-none border-none shadow-none focus:ring-transparent"
  />
)

const Option = (props: any) => {
  const { data, innerRef, innerProps, isSelected } = props

  // Create a dynamic class string based on the option value
  const labelClasses =
    data.value === 'Add Project'
      ? 'font-bold text-green-400'
      : 'font-normal text-current'

  console.log('isSelected', isSelected)
  return (
    <div
      ref={innerRef}
      {...innerProps}
      className={isSelected ? 'bg-blue-100' : ''}
    >
      <components.Option {...props}>
        {/* Apply the dynamic classes to the label */}
        <span className={labelClasses}>{data.label}</span>
        {data.value === 'Add Project' && (
          <IconButton
            className="text-green-500 bg-transparent shadow-none ml-28"
            onClick={(e) => {
              // Prevent the select option from being triggered
              e.stopPropagation()
            }}
            placeholder={undefined}
            onPointerEnterCapture={undefined}
            onPointerLeaveCapture={undefined}
          >
            <BsPlus size={22} />
          </IconButton>
        )}
      </components.Option>
    </div>
  )
}

const delay = (ms: any) => new Promise((res) => setTimeout(res, ms))

const Registration: FC<DonationProps> = ({ stripeEvents, userData }) => {
  const { user, selectedStartDate } = useSelector(
    (state: RootState) => state.common,
  )

  const reduxQboData = useSelector(
    (state: RootState) => state.qboData.reduxQboData,
  )
  const [settingsData, setSettingsData] = useState<qboRegistrationSettings[]>(
    [],
  )
  const [onGoingSaving, setOnGoingSaving] = useState<boolean>(false)
  const [openStates, setOpenStates] = useState<Record<number, boolean>>({})

  const dispatch = useDispatch()
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const reTriggerIsUserTokens = useSelector(
    (item: RootState) => item.common.reTriggerIsUserTokens,
  )
  // create user settings
  // create user settings
  const { mutate, isLoading: isSavingSettings } = useMutation<
    unknown,
    unknown,
    SettingRegistrationQBOProps
  >(createSettings)

  const { data: qboData, isLoading: isQboDataLoading } = useQuery(
    ['getAllQboDataInRegistration', bookkeeper],
    async () => {
      // If accounts array has elements, use the Redux data
      // if (reduxQboData.accounts.length > 0) {
      //   console.log('Returning data from Redux:', reduxQboData)
      //   return reduxQboData
      // }

      console.log('Fetching data from API22...')
      const fetchedData = await getQboData(user, bookkeeper) // Fetch only if needed
      dispatch(setReduxQboData(fetchedData))
      console.log('Fetched data22:', fetchedData)
      return fetchedData
    },
    {
      refetchOnWindowFocus: false,
      onSuccess: (data) => console.log('Query succeeded:', data),
      onError: (error) => console.error('Query failed:', error),
    },
  )
  // Adding a new option at the top of the list
  const modifiedOptionsCustomer = qboData?.customers
    ? [{ value: 'Add Project', label: 'Add Project' }, ...qboData.customers]
    : []

  const selectHandler = ({
    val,
    category,
    registration,
  }: {
    val: any
    category: 'account' | 'class' | 'customer'
    registration: string
  }) => {
    const tempData: qboRegistrationSettings[] = [...settingsData]

    const index = tempData.findIndex(
      (item: qboRegistrationSettings) => item.registration === registration,
    )

    const currentItem = tempData[index]
    if (currentItem) {
      // Check if currentItem is defined
      if (val) {
        // Check if val is defined (i.e., a value has been selected)
        const { value, label } = val

        // Check if the category is 'customer' and the value is 'Add Project'
        if (category === 'customer' && label === 'Add Project') {
          return dispatch(OPEN_MODAL(MODALS_NAME.projectCU))
        }

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

        // currentItem.registration = registration
        // console.log('currentItem', currentItem)
        // tempData.push(currentItem)
      } else {
        // If val is null or undefined (i.e., the clear button has been clicked)
        switch (category) {
          case 'account':
            currentItem.account = undefined
            break
          case 'class':
            currentItem.class = undefined
            break
          case 'customer':
            currentItem.customer = undefined
            break
          default:
            break
        }
      }
    } else {
      const newObject: qboRegistrationSettings = { registration }

      if (val) {
        const { value, label } = val
        newObject[category] = { value, label }
      } else {
        newObject[category] = undefined
      }

      tempData.push(newObject)
    }
    console.log('tempData', tempData)
    // Update the registrationSettingsData state with the modified tempData
    setSettingsData(tempData)
  }

  const isAnyKeyMissing = (): boolean => {
    return settingsData.some(
      (item) => !isEmpty(item) && item.account === undefined,
    )
  }

  const handleSubmit = async () => {
    const nonEmptySettingsData = settingsData.filter((item) => !isEmpty(item))
    const lengthOfNonEmptySettingsData = nonEmptySettingsData.length

    if (
      isAnyKeyMissing() ||
      (settingsData.length !== 0 &&
        (stripeEvents?.length !== lengthOfNonEmptySettingsData ||
          isEmpty(settingsData)))
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
        settingRegistrationData: settingsData,
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
  }

  const findDefaultValue = (
    registrationName: string,
    category: 'account' | 'class' | 'customer',
  ) => {
    const settingsItem = settingsData?.find(
      (item) => item.registration === registrationName,
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

  const deactivateRegistration = async (registration: string) => {
    if (isEmpty(settingsData)) {
      failNotification({ title: 'Please save the settings first' })
      return
    }
    setOnGoingSaving(true)
    const updatedSettingsData = settingsData.map((item) => {
      if (item.registration === registration) {
        // If the registration matches, set `isActive` to `false`.
        return { ...item, isActive: false }
      }
      return item // Otherwise, return the item as is.
    })

    const email =
      user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
    await mutate({
      email,
      settingRegistrationData: updatedSettingsData,
    })
    await delay(2000)
    dispatch(setReduxStripeData([]))
    dispatch(setReTriggerIsUserTokens(!reTriggerIsUserTokens))
    successNotification({ title: 'Archived successfully' })
    setOnGoingSaving(false)
    return ''
  }

  useEffect(() => {
    if (!isEmpty(userData?.UserSetting)) {
      const settingsData = userData.UserSetting?.settingRegistrationData
      setSettingsData(settingsData || [])
      // setIsAutomationEnable(userData?.data.UserSetting.isAutomationEnable)
    }
  }, [userData])

  return (
    <div>
      {isSavingSettings || isQboDataLoading || onGoingSaving ? (
        <Loading />
      ) : (
        <>
          <ModalCreateUpdateProject />
          {stripeEvents?.map(
            (item: { name: string; date: string }, index: number) => (
              <div
                key={index}
                className={`flex flex-col gap-2 py-4 ${
                  index === stripeEvents.length - 1 ? '' : 'border-b-[1px]'
                } `}
              >
                <div className="flex items-center max-w-4xl justify-between pb-2">
                  <p className="font-semibold text-primary">{item.name}</p>

                  <Popover>
                    <PopoverHandler>
                      <button className="self-center">
                        <BiDotsHorizontal
                          size={22}
                          color={colors.secondaryYellow}
                        />
                      </button>
                    </PopoverHandler>
                    <PopoverContent>
                      <button
                        className="flex gap-2 items-center"
                        onClick={() => deactivateRegistration(item.name)}
                      >
                        <BiArchive size={22} color={colors.secondaryYellow} />
                        <Typography>Archive</Typography>
                      </button>
                    </PopoverContent>
                  </Popover>
                </div>
                {isEmpty(qboData) && isEmpty(item) ? null : (
                  <div className="flex items-center gap-4">
                    {/* Accounts */}
                    <div className="flex flex-col gap-2">
                      <p>Accounts</p>
                      <Dropdown
                        options={qboData?.accounts?.filter(
                          (a: { type: string }) =>
                            a.type !== 'Bank' && a.type !== 'Credit Card',
                        )}
                        components={{ Input }}
                        onChange={(val) =>
                          selectHandler({
                            val,
                            registration: item.name,
                            category: 'account',
                          })
                        }
                        value={findDefaultValue(item.name, 'account')}
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
                            registration: item.name,
                            category: 'class',
                          })
                        }
                        value={findDefaultValue(item.name, 'class')}
                        className="w-72"
                        isClearable
                      />
                    </div>
                    {/* Projects */}
                    <div className="flex flex-col gap-2">
                      <p>Projects</p>
                      <Dropdown
                        key={index}
                        options={modifiedOptionsCustomer}
                        components={{ Input, Option }}
                        onChange={(val) => {
                          // If the "Add Project" option is selected, keep the dropdown open and don't change the value
                          if (val?.value === 'Add Project') {
                            setOpenStates((prev) => ({
                              ...prev,
                              [index]: true,
                            }))
                            return dispatch(OPEN_MODAL(MODALS_NAME.projectCU))
                          }

                          selectHandler({
                            val,
                            category: 'customer',
                            registration: item.name || '',
                          })

                          // Close the dropdown
                          setOpenStates((prev) => ({
                            ...prev,
                            [index]: false,
                          }))
                        }}
                        menuIsOpen={openStates[index] as boolean}
                        onMenuOpen={() =>
                          setOpenStates((prev) => ({
                            ...prev,
                            [index]: true,
                          }))
                        }
                        value={findDefaultValue(
                          item.name as string,
                          'customer',
                        )}
                        className="w-72"
                        isClearable
                      />
                    </div>
                  </div>
                )}
              </div>
            ),
          )}
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

export default Registration
