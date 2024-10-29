import { isEmpty } from 'lodash'
import React, { FC, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from 'react-query'
import Dropdown, { components } from 'react-select'
import { QboGetAllQboData, getQboData } from '@/common/api/qbo'
import { RootState } from '@/redux/store'
import { useSelector } from 'react-redux'
import { SettingQBOProps, createSettings, qboSettings } from '@/common/api/user'
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
import { QboDataSelectProps } from '..'
import { MODALS_NAME } from '@/common/constant/modal'
import ModalCreateUpdateProject from '@/common/components/modal/ModalCreateUpdateProject'
import { BsPlus } from 'react-icons/bs'
import { BiArchiveIn, BiDotsHorizontal } from 'react-icons/bi'
import { FundAttProps } from '@/common/constant/interfaces'
import colors from '@/common/constant/colors'

interface DonationProps {
  fundData: FundAttProps[]
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
          >
            <BsPlus size={22} />
          </IconButton>
        )}
      </components.Option>
    </div>
  )
}

const delay = (ms: any) => new Promise((res) => setTimeout(res, ms))

const Donation: FC<DonationProps> = ({ fundData, userData }) => {
  const { user, selectedStartDate } = useSelector(
    (state: RootState) => state.common,
  )
  const [settingsData, setSettingsData] = useState<qboSettings[]>([])
  const [onGoingSaving, setOnGoingSaving] = useState<boolean>(false)
  const [openStates, setOpenStates] = useState<Record<number, boolean>>({})

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

  const { data: qboData, isLoading: isQboDataLoading } = useQuery(
    useMemo(() => ['getAllQboData', bookkeeper], [bookkeeper]), // Memoize the key
    async () => await getQboData(user, bookkeeper),
    { staleTime: Infinity, refetchOnWindowFocus: false },
  )

  // Adding a new option at the top of the list
  const modifiedOptionsCustomer = qboData?.customers
    ? [{ value: 'Add Project', label: 'Add Project' }, ...qboData.customers]
    : []

  const email =
    user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email

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
      (item) => !isEmpty(item) && item.account === undefined,
    )
  }

  const handleSubmit = async () => {
    const nonEmptySettingsData = settingsData.filter((item) => !isEmpty(item))
    const lengthOfNonEmptySettingsData = nonEmptySettingsData.length

    if (
      isAnyKeyMissing() ||
      (settingsData.length !== 0 &&
        (fundData?.length !== lengthOfNonEmptySettingsData ||
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

  const deactivateFund = async (fundName: string) => {
    if (isEmpty(settingsData)) {
      failNotification({ title: 'Please save the settings first' })
      return
    }

    setOnGoingSaving(true)
    const updatedSettingsData = settingsData.map((item) => {
      if (item.fundName === fundName) {
        // If the registration matches, set `isActive` to `false`.
        return { ...item, isActive: false }
      }
      return item // Otherwise, return the item as is.
    })

    await mutate({
      email,
      settingsData: updatedSettingsData,
    })
    await delay(2000)
    dispatch(setReTriggerIsUserTokens(!reTriggerIsUserTokens))
    successNotification({ title: 'Archived successfully' })
    setOnGoingSaving(false)
    return ''
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
          <ModalCreateUpdateProject />
          {fundData?.map((item, index: number) => (
            <div
              key={index}
              className={`flex flex-col gap-2 max-w-4xl py-4 ${
                index === fundData.length - 1 ? '' : 'border-b-[1px]'
              } `}
            >
              <div className="flex items-center  justify-between pb-2">
                <div className="col-span-1 flex flex-col pr-6">
                  <p className="font-semibold text-primary">
                    {item.attributes.name}
                  </p>
                  <p className="font-normal text-gray-400 text-sm">
                    {item.attributes.description}
                  </p>
                </div>

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
                      onClick={() => deactivateFund(item.attributes.name)}
                    >
                      <BiArchiveIn size={22} color={colors.secondaryYellow} />
                      <Typography>Archive</Typography>
                    </button>
                  </PopoverContent>
                </Popover>
              </div>

              {isEmpty(qboData) && isEmpty(item.attributes.name) ? null : (
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
                          setOpenStates((prev) => ({ ...prev, [index]: true }))
                          return dispatch(OPEN_MODAL(MODALS_NAME.projectCU))
                        }

                        selectHandler({
                          val,
                          fundName: item.attributes.name,
                          category: 'customer',
                        })

                        // Close the dropdown
                        setOpenStates((prev) => ({ ...prev, [index]: false }))
                      }}
                      menuIsOpen={openStates[index] as boolean}
                      onMenuOpen={() =>
                        setOpenStates((prev) => ({ ...prev, [index]: true }))
                      }
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
