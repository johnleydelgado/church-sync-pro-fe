import { pcGetBatches, pcGetFunds } from '@/common/api/planning-center'
import Loading from '@/common/components/loading/Loading'
import MainLayout from '@/common/components/main-layout/MainLayout'
import React, { FC, useEffect, useState } from 'react'
import { useQuery } from 'react-query'
import { useSelector } from 'react-redux'
import { RootState } from '../../../redux/store'
import { isEmpty } from 'lodash'
import { getUserRelated, manualSync } from '@/common/api/user'
import { failNotification, successNotification } from '@/common/utils/toast'
import BatchTable from './component/BatchTable'
import { getStripePayouts, syncStripePayout } from '@/common/api/stripe'
import StripePayoutTable from './component/StripePayoutTable'
import Stripe from 'stripe'
import { FundProps } from '../settings'
import ReactDatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import SelectDateRange from '@/common/components/Select/SelectDateRange'

export interface AttributesProps {
  batch: { id: string; attributes: any }
  donations: [{ donation: object; designation: object; fund: object }]
}

export interface BatchesProps {
  batches: AttributesProps[]
  synchedBatches: [
    { id: string; batchId: string; createdAt: Date; donationId: string },
  ]
}

interface DashboardProps {}

const Dashboard: FC<DashboardProps> = () => {
  const [value, setValue] = useState([new Date(), new Date()])
  const { user } = useSelector((state: RootState) => state.common)
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' })

  const [isBatch, setIsBatch] = useState<boolean>(true)

  const [batchSyncing, setBatchSynching] = useState([
    { batchId: '', trigger: false },
  ])

  const { data, isLoading, refetch, isRefetching } = useQuery<BatchesProps>(
    ['getBatches', dateRange, bookkeeper],
    async () => {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      if (email) return await pcGetBatches(email, dateRange)
      return []
    },
    {
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    },
  )

  const { data: userData } = useQuery(
    ['getUserRelated'],
    async () => {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      if (email) return await getUserRelated(email)
    },
    { staleTime: Infinity, refetchOnWindowFocus: false },
  )

  const {
    data: stripePayoutData,
    isLoading: isLoadingStripePayoutData,
    refetch: refetchStripePayoutData,
    isRefetching: isRefetchingStripePayoutData,
  } = useQuery<Stripe.Charge[]>(
    ['getStripePayouts', bookkeeper],
    async () => {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      if (email) return await getStripePayouts(email)
      return []
    },
    {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    },
  )

  const { data: fundData } = useQuery<FundProps[]>(
    ['getFunds', bookkeeper],
    async () => {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      if (email) return await pcGetFunds({ email })
      return []
    },
    {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    },
  )

  const handleDateChange = (newValue: string | Date) => {
    if (
      Array.isArray(newValue) &&
      newValue.every((item) => item instanceof Date)
    ) {
      setValue(newValue)
    }
  }

  // const handleDrop = (name: string) => {
  //   console.log(`Dropped ${name}`)
  // }

  const triggerSyncBatch = async ({
    dataBatch,
    batchId,
    batchName,
  }: {
    dataBatch: any
    batchId: string
    batchName: string
  }): Promise<void> => {
    const checkifExist = batchSyncing.find((el) => el.batchId === batchId)
    if (!isEmpty(checkifExist)) {
      failNotification({ title: 'Already Synched !' })
      return
    }

    try {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      setBatchSynching((prev) => [...prev, { batchId, trigger: true }])
      const result = await manualSync({ email, dataBatch, batchId })
      if (result.success) {
        successNotification({ title: `Batch: ${batchName} successfully sync` })
        refetch()
      } else {
        failNotification({ title: 'Error' })
      }
    } catch (e) {
      failNotification({ title: 'Error' })
    } finally {
      // setBatchSynching((prevBatchSyncing) => {
      //   const batchIndex = prevBatchSyncing.findIndex(
      //     (batch) => batch.batchId === batchId,
      //   )
      //   if (batchIndex !== -1) {
      //     const updatedBatchSyncing = [...prevBatchSyncing]
      //     updatedBatchSyncing[batchIndex] = {
      //       batchId: batchId,
      //       trigger: false,
      //     }
      //     return updatedBatchSyncing
      //   }
      //   return prevBatchSyncing
      // })
    }
  }

  const triggerSyncStripe = async ({
    stripeData,
    payoutDate,
  }: {
    stripeData: any
    payoutDate: string
  }) => {
    try {
      setBatchSynching((prev) => [
        ...prev,
        { batchId: payoutDate, trigger: true },
      ])
      const filterFundName = fundData?.length
        ? fundData.map((item) => item.attributes.name)
        : []
      await Promise.all(
        stripeData.map(async (a: { description: string }) => {
          const description = a.description
          const regex = /#(\d+)/ // match the #
          const match = description?.match(regex)

          if (match) {
            const donationId = match[1]
            const index = filterFundName?.findIndex((word) =>
              description.includes(word),
            )
            const str = filterFundName[index]
            if (index !== -1) {
              if (str) {
                const response = await syncStripePayout(
                  user.email,
                  String(donationId),
                  String(str),
                  payoutDate,
                )

                if (response === 'success') {
                  successNotification({
                    title: `Stripe payout successfully sync`,
                  })
                  refetch()
                } else {
                  failNotification({ title: 'Error' })
                }
              }
            }
          }
        }),
      )
    } catch (e) {
      failNotification({ title: 'Error' })
    } finally {
      setBatchSynching((prevBatchSyncing) => {
        const batchIndex = prevBatchSyncing.findIndex(
          (batch) => batch.batchId === payoutDate,
        )
        if (batchIndex !== -1) {
          const updatedBatchSyncing = [...prevBatchSyncing]
          updatedBatchSyncing[batchIndex] = {
            batchId: payoutDate,
            trigger: false,
          }
          return updatedBatchSyncing
        }
        return prevBatchSyncing
      })
    }
  }

  return (
    <MainLayout>
      {isLoading ||
      isRefetching ||
      isLoadingStripePayoutData ||
      isRefetchingStripePayoutData ? (
        <Loading />
      ) : (
        <div className="flex h-full gap-4">
          <div className="rounded-lg p-8 bg-white w-screen">
            <div className="justify-between flex w-full">
              <span className="font-medium text-2xl">Transaction History</span>

              {/* <SelectDateRange onChange={handleDateChange} value={value} /> */}
              <div>
                <SelectDateRange
                  setDateRangeVal={setDateRange}
                  dateRangeVal={dateRange}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button
                className={`${
                  isBatch ? 'underline text-green-500' : 'text-gray-400'
                } flex items-center gap-1`}
                onClick={() => setIsBatch(true)}
              >
                <p>Batch</p>
              </button>
              <p> | </p>
              <button
                className={`${
                  !isBatch ? 'underline text-green-500' : 'text-gray-400'
                } flex items-center gap-1`}
                onClick={() => setIsBatch(false)}
              >
                <p>Stripe Payout</p>
              </button>
            </div>
            {/* Table */}
            {isBatch ? (
              <BatchTable
                data={data}
                batchSyncing={batchSyncing}
                triggerSync={triggerSyncBatch}
              />
            ) : !isEmpty(
                userData?.data?.UserSetting.settingRegistrationData,
              ) ? (
              <StripePayoutTable
                data={stripePayoutData}
                triggerSync={triggerSyncStripe}
                batchSyncing={batchSyncing}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-4xl font-thin">
                  Kindly configure your registration mapping within the
                  settings.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </MainLayout>
  )
}

export default Dashboard
