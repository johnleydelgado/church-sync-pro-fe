import MainLayout from '@/common/components/main-layout/MainLayout'
import React, { FC, useMemo, useState } from 'react'
import { BiArchive, BiArchiveOut } from 'react-icons/bi'
import useGetDeactivatedMapping from './hooks/useGetDeactivatedMapping'
import { Typography } from '@material-tailwind/react'
import { Tab } from '@headlessui/react'
import ArchiveTable from './archive-table'
import { QueryClient, useMutation, useQuery } from 'react-query'
import { UserSettingsProps } from '@/common/constant/interfaces'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import {
  SettingRegistrationQBOProps,
  createSettings,
  getUserRelated,
  getUserRelatedSettings,
} from '@/common/api/user'
import Loading from '@/common/components/loading/Loading'

interface indexProps {}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

const Index: FC<indexProps> = ({}) => {
  const [categories, setCategories] = useState({
    Donation: [],
    Registration: [],
  })

  const { bookkeeper, user } = useSelector((item: RootState) => item.common)

  const [isLoadingTrigger, setIsLoadingTrigger] = useState<boolean>(false)

  const reTriggerIsUserTokens = useSelector(
    (item: RootState) => item.common.reTriggerIsUserTokens,
  )

  const { archives, isLoading, refetch } = useGetDeactivatedMapping()

  const { mutate, isLoading: isSavingSettings } = useMutation<
    unknown,
    unknown,
    SettingRegistrationQBOProps
  >(
    createSettings, // Mutation function to create settings
    {
      onSuccess: () => {
        // Re-trigger the query when the mutation is successful
        refetch()
      },
    },
  )

  const { data: userData, isLoading: isLoadingUserData } =
    useQuery<UserSettingsProps>(
      useMemo(
        () => [
          'getUserRelatedSettingsArchive',
          reTriggerIsUserTokens,
          bookkeeper,
        ],
        [reTriggerIsUserTokens, bookkeeper],
      ),
      async () => {
        // Assuming getUserRelated is an asynchronous function
        const result = await getUserRelatedSettings(user, bookkeeper)
        return result.data
      },
      { staleTime: Infinity },
    )
  const activateRegistrationOrDonation = async (
    registration: string,
    type: 'stripe' | 'batch',
  ) => {
    setIsLoadingTrigger(true)
    try {
      const updatedSettingsData = userData?.UserSetting?.settingsData?.map(
        (item) => {
          if (item.fundName === registration && type === 'batch') {
            return { ...item, isActive: true } // Set isActive to true for 'batch'
          }
          return item
        },
      )

      const updatedSettingRegistrationData =
        userData?.UserSetting?.settingRegistrationData?.map((item) => {
          if (item.registration === registration && type === 'stripe') {
            return { ...item, isActive: true } // Set isActive to true for 'stripe'
          }
          return item
        })

      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email

      // Condition to update the correct data field based on 'type'
      const mutationData =
        type === 'batch'
          ? { email, settingsData: updatedSettingsData }
          : { email, settingRegistrationData: updatedSettingRegistrationData }

      await mutate(mutationData) // Update the correct data based on 'type
    } catch (error) {
      console.error('Error in activating registration:', error)
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
