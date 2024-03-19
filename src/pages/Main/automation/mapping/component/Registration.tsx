import Loading from '@/common/components/loading/Loading'
import { RootState } from '@/redux/store'
import React, { FC, Fragment, useEffect, useState } from 'react'
import { useMutation, useQuery } from 'react-query'
import { useSelector } from 'react-redux'
import Dropdown, { components } from 'react-select'
import { isEmpty } from 'lodash'
import {
  SettingRegistrationQBOProps,
  createSettings,
  getUserRelated,
  qboRegistrationSettings,
} from '@/common/api/user'
import { pcHandleRegistrationEvents } from '@/common/api/planning-center'
import { failNotification, successNotification } from '@/common/utils/toast'
import { BqoDataSelectProps } from '../Mapping'
import { Button, IconButton } from '@material-tailwind/react'
import AddUpdateModalRegistration from './AddUpdateModalRegistration'
import { OPEN_MODAL, setSelectedBankAccount } from '@/redux/common'
import { useDispatch } from 'react-redux'
import { BsPlus } from 'react-icons/bs'
import { MODALS_NAME } from '@/common/constant/modal'
import ModalRegistrationActiveInActive from '@/common/components/modal/ModalRegistrationActiveInActive'
import { MdDelete } from 'react-icons/md'
import DeleteModalRegistration from './DeleteModalRegistration'
import ModalCreateUpdateProject from '@/common/components/modal/ModalCreateUpdateProject'

interface RegistrationProps {
  qboData: BqoDataSelectProps | undefined
}

const Input = (props: any) => (
  <components.Input
    {...props}
    inputClassName="outline-none border-none shadow-none focus:ring-transparent"
  />
)

const Input2 = (props: any) => (
  <components.Input
    {...props}
    inputClassName="outline-none border-none shadow-none focus:ring-transparent bg-transparent"
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
      className={isSelected ? 'bg-red-100' : ''}
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

const Registration: FC<RegistrationProps> = ({ qboData }) => {
  const [selectedRegistrationName, setSelectedRegistrationName] = useState<{
    value: string
    label: string
  } | null>(null)

  const [selectRegName, setSelectRegName] = useState<string | null>(null)
  const [selectDeleteRegName, setDeleteSelectRegName] = useState<string | null>(
    null,
  )
  const [selectIsActive, setSelectIsActive] = useState<boolean | null>(false)
  const [selectedRegistration, setSelectedRegistration] = useState<
    qboRegistrationSettings[] | null
  >(null)
  const [openStates, setOpenStates] = useState<Record<number, boolean>>({})

  const dispatch = useDispatch()

  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const openModals = useSelector((state: RootState) => state.common.openModals)
  const [isSave, setIsSave] = useState<boolean>(false)

  const [registrationSettingsData, setRegistrationSettingsData] = useState<
    qboRegistrationSettings[]
  >([])

  const { selectedBankAccount, user } = useSelector(
    (state: RootState) => state.common,
  )

  // Adding a new option at the top of the list
  const modifiedOptionsCustomer = qboData?.customers
    ? [{ value: 'Add Project', label: 'Add Project' }, ...qboData.customers]
    : []

  const reTriggerIsUserTokens = useSelector(
    (item: RootState) => item.common.reTriggerIsUserTokens,
  )

  const { data: userData, refetch: refetchUserData } = useQuery(
    ['getUserRelatedSettings', reTriggerIsUserTokens, bookkeeper],
    async () => {
      const emailF =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      if (emailF) {
        const res = await getUserRelated(emailF)
        console.log('go here????', res.data)
        return res.data
      }
    },
    { staleTime: Infinity },
  )

  // create user settings
  const { mutate, isLoading: isSavingSettings } = useMutation<
    unknown,
    unknown,
    SettingRegistrationQBOProps
  >(createSettings)

  const {
    data: registrationData,
    isLoading: isLoadingRegistration,
    refetch,
    isRefetching,
  } = useQuery(
    ['getRegistration'],
    async () => {
      const id =
        user.role === 'bookkeeper' ? bookkeeper?.clientId || '' : user.id

      if (id) {
        const res = await pcHandleRegistrationEvents({
          action: 'read',
          userId: id,
        })
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

  const handleActiveInActiveRegistration = (
    name: string,
    isActive: boolean,
  ) => {
    if (name) {
      setSelectRegName(name)
      setSelectIsActive(isActive)
      console.log('isActive', isActive)
      const newRegistrations = registrationSettingsData.map((reg) => {
        if (reg.registration === name) {
          return { ...reg, isActive: isActive }
        }
        return reg
      })

      setSelectedRegistration(newRegistrations)
    }
  }

  const handleDeleteRegistration = (name: string | undefined | null) => {
    setDeleteSelectRegName(name ?? '')
  }

  const isAnyKeyMissing = (): boolean => {
    return registrationSettingsData.some(
      (item) => !isEmpty(item) && item.account === undefined,
    )
  }

  const handleSubmit = async () => {
    setIsSave(true)
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
    })

    setTimeout(() => {
      refetchUserData()
      successNotification({ title: 'Settings successfully saved !' })
      setIsSave(false)
    }, 300)
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
    const tempData: qboRegistrationSettings[] = [...registrationSettingsData]

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
    }

    // Update the registrationSettingsData state with the modified tempData
    setRegistrationSettingsData(tempData)
  }

  useEffect(() => {
    if (selectedRegistrationName) {
      const tempData: qboRegistrationSettings[] = [...registrationSettingsData]

      const index = registrationSettingsData.findIndex(
        (item: qboRegistrationSettings) =>
          item.registration === selectedRegistrationName.label,
      )

      if (index === -1) {
        // if the registration does not exist in the array, push the object into the array
        const newObject: qboRegistrationSettings = {
          registration: selectedRegistrationName.label,
          customer: {
            label: selectedRegistrationName.label,
            value: selectedRegistrationName.value,
          },
        }
        setRegistrationSettingsData([...tempData, newObject])
      } else {
        setRegistrationSettingsData(tempData)
      }
    }
  }, [selectedRegistrationName])

  useEffect(() => {
    if (selectDeleteRegName) {
      dispatch(OPEN_MODAL(MODALS_NAME.modalDeleteRegistration))
    }
  }, [selectDeleteRegName])

  // Do I need a return on this to clean up the subscription?

  useEffect(() => {
    if (
      !openModals.includes(MODALS_NAME.registrationActiveInActive) &&
      selectRegName
    ) {
      dispatch(OPEN_MODAL(MODALS_NAME.registrationActiveInActive))
    }
  }, [selectRegName])

  useEffect(() => {
    if (!isEmpty(userData?.UserSetting)) {
      const settingsData = userData.UserSetting?.settingRegistrationData
      setRegistrationSettingsData(settingsData || [])
      // setIsAutomationEnable(userData?.data.UserSetting.isAutomationEnable)
    }
  }, [userData])

  return (
    <div className="">
      {isLoadingRegistration || isSave ? (
        <Loading />
      ) : (
        <Fragment>
          <ModalCreateUpdateProject />
          <ModalRegistrationActiveInActive
            name={selectRegName}
            isActive={selectIsActive}
            registrationSettings={selectedRegistration}
            setSelectRegName={setSelectRegName}
          />
          <DeleteModalRegistration
            name={selectDeleteRegName}
            setSelectRegName={setDeleteSelectRegName}
            refetchUserData={refetchUserData}
            userData={userData}
          />
          <div>
            <div className="flex justify-between">
              <AddUpdateModalRegistration refetch={refetch} />
              {isEmpty(registrationData) ? null : (
                <div>
                  <p>Select Registration</p>
                  <Dropdown
                    options={registrationData}
                    components={{ Input }}
                    onChange={(val: any) => {
                      setSelectedRegistrationName({
                        value: String(val.value),
                        label: String(val.label),
                      })
                    }}
                    className="w-72"
                  />
                </div>
              )}
            </div>

            <div className="pt-4" />

            {isEmpty(qboData)
              ? null
              : registrationSettingsData.map((a, index) => (
                  <div
                    className="relative flex flex-col gap-2 shadow-lg rounded-lg p-8"
                    key={a.registration}
                  >
                    <div className="col-span-1 flex items-center justify-between gap-2 pr-6">
                      <p className="font-semibold text-[#27A1DB]">
                        {a.registration}
                      </p>
                      <button
                        className="flex gap-2 items-center cursor-pointer hover:border-green-400 border-2 border-transparent hover:rounded-md transform hover:scale-105 transition duration-300 p-2"
                        onClick={() => handleDeleteRegistration(a.registration)}
                      >
                        <MdDelete size={22} className="text-red-500" />
                        <p className="text-md text-gray-400">Remove</p>
                      </button>
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
                              registration: a.registration || '',
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
                            a.registration as string,
                            'customer',
                          )}
                          className="w-72"
                          isClearable
                        />
                      </div>
                      <div className="flex gap-2 items-center pt-8">
                        <Dropdown
                          options={[
                            { value: 'active', label: 'Active' },
                            { value: 'inactive', label: 'Inactive' },
                          ]}
                          components={{ Input: Input2 }}
                          value={
                            a.isActive
                              ? { value: 'active', label: 'Active' }
                              : { value: 'inactive', label: 'Inactive' }
                          }
                          onChange={(val) =>
                            handleActiveInActiveRegistration(
                              a.registration as string,
                              val?.value === 'active' ? true : false,
                            )
                          }
                          className="w-32"
                        />
                        <div
                          className={`rounded-xl ml-2 w-3 h-3 border-2 ${
                            a.isActive
                              ? 'border-green-200 bg-green-400'
                              : 'border-gray-300 bg-gray-400'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                ))}

            {isEmpty(registrationData) ? null : (
              <div className="flex justify-end pt-4">
                <Button className="bg-green-400" onClick={() => handleSubmit()}>
                  Save
                </Button>
              </div>
            )}
          </div>
        </Fragment>
      )}
    </div>
  )
}

export default Registration
