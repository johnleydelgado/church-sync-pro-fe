import MainLayout from '@/common/components/main-layout/MainLayout'
import React, { FC, useMemo, useState } from 'react'
import { BiArchive, BiArchiveOut } from 'react-icons/bi'
import useGetDeactivatedMapping from './hooks/useGetDeactivatedMapping'
import { Typography } from '@material-tailwind/react'
import { Tab } from '@headlessui/react'
import ArchiveTable from './archive-table'
import { useMutation, useQueryClient } from 'react-query'
import { UserSettingsProps } from '@/common/constant/interfaces'
import { useChurch } from '@/common/hooks/useChurch'
import {
  createSettings,
  qboRegistrationSettings,
  qboSettings,
} from '@/common/api/user'
import Loading from '@/common/components/loading/Loading'
import { failNotification, successNotification } from '@/common/utils/toast'
import { writeSettingsCache } from '../mapping/settingsCache'

interface indexProps {}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

const Index: FC<indexProps> = ({}) => {
  const [categories, setCategories] = useState({
    Donation: [],
    Registration: [],
  })

  const { email, churchId } = useChurch()
  const queryClient = useQueryClient()

  const [isLoadingTrigger, setIsLoadingTrigger] = useState<boolean>(false)

  // The church's settings: the same cached copy the Mapping page reads and writes, so the list
  // saved here always starts from the newest mapping, and each reactivation from the last one.
  const { archives, isLoading, refetch, userData, isLoadingUserData } =
    useGetDeactivatedMapping()

  const { mutateAsync, isLoading: isSavingSettings } = useMutation<
    unknown,
    unknown,
    {
      churchId: number
      email: string
      settingsData?: qboSettings[]
      settingRegistrationData?: qboRegistrationSettings[]
    }
  >(
    // Only the email and the list go to the server.
    ({ email, settingsData, settingRegistrationData }) =>
      createSettings(
        settingsData
          ? { email, settingsData }
          : { email, settingRegistrationData },
      ),
    {
      onSuccess: (
        _,
        { churchId: forChurch, settingsData, settingRegistrationData },
      ) => {
        // What was saved is what the cache holds: the next reactivation, and the Mapping page,
        // start from it.
        writeSettingsCache(
          queryClient,
          forChurch,
          (settingsData
            ? { settingsData }
            : { settingRegistrationData }) as Partial<
            UserSettingsProps['UserSetting']
          >,
        )
        refetch()
      },
    },
  )

  const activateRegistrationOrDonation = async (
    registration: string,
    type: 'stripe' | 'batch',
  ) => {
    if (!churchId) return
    setIsLoadingTrigger(true)
    try {
      const updatedSettingsData = userData?.UserSetting?.settingsData?.map(
        (item) => {
          if (item.fundName === registration && type === 'batch') {
            return { ...item, isActive: true } // Set isActive to true for 'batch'
          }
          return item
        },
      ) as qboSettings[] | undefined

      // Only the Stripe-era list holds archived registrations. The payout-report mapping is an
      // object: calling .map on it threw here, which also stopped funds being re-activated.
      const registrations = userData?.UserSetting?.settingRegistrationData
      const updatedSettingRegistrationData = Array.isArray(registrations)
        ? (registrations.map((item) => {
            if (item.registration === registration && type === 'stripe') {
              return { ...item, isActive: true } // Set isActive to true for 'stripe'
            }
            return item
          }) as qboRegistrationSettings[])
        : undefined
      // Nothing to re-activate, and the mapping object must never be overwritten from here.
      if (type === 'stripe' && !updatedSettingRegistrationData) return
      if (type === 'batch' && !updatedSettingsData) return

      await mutateAsync(
        type === 'batch'
          ? { churchId, email, settingsData: updatedSettingsData }
          : {
              churchId,
              email,
              settingRegistrationData: updatedSettingRegistrationData,
            },
      )
      successNotification({ title: `${registration} is active again.` })
    } catch (error: any) {
      failNotification({
        title: error?.message || `Couldn't reactivate ${registration}.`,
      })
    } finally {
      setIsLoadingTrigger(false) // Always set loading to false in the end
    }
  }

  return (
    <MainLayout>
      <div className="bg-white -m-6 p-6 h-full">
        {/* Header */}
        <div className="pb-2">
          <div className="flex flex-col border-b-2 pb-2">
            <div className="flex items-center gap-2">
              <BiArchive size={28} className="text-blue-400" />
              <span className="font-bold text-lg text-primary">Archive</span>
            </div>
          </div>
        </div>

        <Tab.Group

        // onChange={(index) => dispatch(setMappingNumber(index))}
        >
          <div className="flex">
            <Tab.List className="flex space-x-1 rounded-xl bg-transparent px-4 py-2 w-96">
              {Object.keys(categories).map((category, index: number) => (
                <div className="flex items-center" key={category}>
                  <Tab
                    className={({ selected }) =>
                      classNames(
                        'flex items-center w-full rounded-lg p-2.5 text-sm font-medium leading-5 text-gray-400',
                        selected
                          ? 'bg-yellow shadow text-white'
                          : 'hover:bg-white/[0.12] hover:text-black',
                      )
                    }
                  >
                    {category}
                  </Tab>
                  {index === Object.keys(categories).length - 1 ? null : (
                    <p className="text-gray-400 pl-2"> | </p>
                  )}
                </div>
              ))}
            </Tab.List>
          </div>

          <Tab.Panels className="mt-2">
            {isLoadingUserData ||
            isSavingSettings ||
            isLoading ||
            isLoadingTrigger ? (
              <Loading /> // Show loading spinner or animation if needed
            ) : (
              <>
                <Tab.Panel
                  key={1}
                  className={classNames('rounded-xl bg-white p-4 px-8')}
                >
                  <ArchiveTable
                    archives={archives}
                    type="batch"
                    activateRegistrationHandler={activateRegistrationOrDonation}
                  />
                </Tab.Panel>

                <Tab.Panel
                  key={2}
                  className={classNames('rounded-xl bg-white p-4 px-8')}
                >
                  <ArchiveTable
                    archives={archives}
                    type="stripe"
                    activateRegistrationHandler={activateRegistrationOrDonation}
                  />
                </Tab.Panel>
              </>
            )}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </MainLayout>
  )
}

export default Index
