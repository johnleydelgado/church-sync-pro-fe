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
import { createSettings, qboRegistrationSettings } from '@/common/api/user'
import Loading from '@/common/components/loading/Loading'
import { failNotification, successNotification } from '@/common/utils/toast'
import { writeSettingsCache } from '../mapping/settingsCache'
import {
  currentFundMapping,
  fundMappingSettled,
  saveFundMapping,
} from '../mapping/fundMappingQueue'

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

  // The church's settings: the same cached copy the Mapping page reads and writes.
  const { archives, isLoading, refetch, userData, isLoadingUserData } =
    useGetDeactivatedMapping()

  // Stripe-era registrations only; the Donation fund mapping goes through its save queue.
  const { mutateAsync: saveRegistrations, isLoading: isSavingSettings } =
    useMutation<
      unknown,
      unknown,
      {
        churchId: number
        email: string
        settingRegistrationData: qboRegistrationSettings[]
      }
    >(
      // Only the email and the list go to the server.
      ({ email, settingRegistrationData }) =>
        createSettings({ email, settingRegistrationData }),
      {
        onSuccess: (_, { churchId: forChurch, settingRegistrationData }) => {
          // What was saved is what the cache holds.
          writeSettingsCache(queryClient, forChurch, {
            settingRegistrationData,
          } as Partial<UserSettingsProps['UserSetting']>)
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
      if (type === 'batch') {
        // Through the church's fund-mapping queue, from the mapping as it stands once every
        // earlier save for it (say, one the Mapping page sent on the way here) has settled.
        await fundMappingSettled(churchId)
        const updated = currentFundMapping(queryClient, churchId).map((item) =>
          item.fundName === registration ? { ...item, isActive: true } : item,
        )
        await saveFundMapping({ queryClient, churchId, email, list: updated })
      } else {
        // Only the Stripe-era list holds archived registrations. The payout-report mapping is
        // an object and must never be overwritten from here.
        const registrations = userData?.UserSetting?.settingRegistrationData
        if (!Array.isArray(registrations)) return
        await saveRegistrations({
          churchId,
          email,
          settingRegistrationData: registrations.map((item) =>
            item.registration === registration
              ? { ...item, isActive: true }
              : item,
          ) as qboRegistrationSettings[],
        })
      }
      refetch()
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
