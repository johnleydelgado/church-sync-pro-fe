import { getStripeList } from '@/common/api/stripe'
import { getUserRelated } from '@/common/api/user'
import { UserSettingsProps } from '@/common/constant/interfaces'
import { RootState } from '@/redux/store'
import React, { FC, useEffect, useMemo, useState } from 'react'
import { useQuery } from 'react-query'
import { useDispatch } from 'react-redux'
import { useSelector } from 'react-redux'

export interface Archive {
  name: string
  category: 'stripe' | 'batch'
  isActive?: boolean
}

const useGetDeactivatedMapping = () => {
  const [archives, setArchives] = useState<Archive[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const reduxStripeData = useSelector(
    (state: RootState) => state.stripeData.reduxStripeData,
  )

  const { user, bookkeeper, reTriggerIsUserTokens } = useSelector(
    (state: RootState) => state.common,
  )

  const { data: userData, refetch: refetchUserData } =
    useQuery<UserSettingsProps>(
      ['getUserRelatedSettings', reTriggerIsUserTokens, bookkeeper],
      async () => {
        const emailF =
          user.role === 'bookkeeper'
            ? bookkeeper?.clientEmail || ''
            : user.email
        if (emailF) {
          const res = await getUserRelated(emailF)
          return res.data
        }
      },
      { staleTime: Infinity },
    )

  const {
    data: stripeEvents,
    isLoading: isStripeEventsLoading,
    isRefetching: isStripeEventsRefetch,
    refetch,
  } = useQuery<Archive[]>(
    ['getStripeListInactiveRegistration', reduxStripeData, userData],
    async () => {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      if (email && userData?.UserSetting) {
        const filteredDataFromRegistration =
          userData?.UserSetting?.settingRegistrationData
            ?.filter((a) => a.isActive === false) // Include only if isActive is false
            .map((a): Archive => {
              return {
                name: a.registration,
                category: 'stripe',
                // Add other required properties
              }
            }) || []

        // Get filtered data from settingsData
        const filteredDataFromSettings =
          userData?.UserSetting?.settingsData
            ?.filter((a) => a.isActive === false) // Include only if isActive is false
            .map((a): Archive => {
              return {
                name: a.fundName,
                category: 'batch',
                // Add other required properties
              }
            }) || []

        // Combine the two filtered arrays into one
        const combinedFilteredData: Archive[] = [
          ...filteredDataFromRegistration,
          ...filteredDataFromSettings,
        ]

        return combinedFilteredData || [] // Return the filtered data or an empty array if no matches
      }
      return []
    },
    {
      refetchOnWindowFocus: false,
      onSuccess: (data) => console.log('Query succeeded:', data),
      onError: (error) => console.error('Query failed:', error),
    },
  )

  useEffect(() => {
    if (stripeEvents && stripeEvents?.length > 0) {
      setArchives(stripeEvents)
    } else {
      setArchives([])
    }
  }, [stripeEvents])

  useEffect(() => {
    setIsLoading(isStripeEventsLoading || isStripeEventsRefetch) // Reflects both loading and refetching
  }, [isStripeEventsLoading, isStripeEventsRefetch])

  return { archives, isLoading, refetch: refetchUserData }
}

export default useGetDeactivatedMapping
