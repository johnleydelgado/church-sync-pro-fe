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
import { BiSync } from 'react-icons/bi'
import { Link } from 'react-router-dom'
import { mainRoute } from '@/common/constant/route'
import { useDispatch } from 'react-redux'
import { setTabTransaction } from '@/redux/nonPersistState'

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

interface batchDataProps {
  id: string
  link: any
  relationships: any
  type: string
  attributes: {
    committed_at: string
    created_at: string
    description: string
    status: string
    total_cents: number
    total_currency: string
    updated_at: string
  }
}

interface synchedBatchesProps {
  batchId: string
  createdAt: string
  donationId: string
  id: number
}

interface BatchesAndSyncProps {
  batches: { batch: batchDataProps[]; donations: any }
  synchedBatches: synchedBatchesProps[]
  offSetRes?: { next: number; prev: number }
  total_count?: number
}

interface DashboardProps {}

const Dashboard: FC<DashboardProps> = () => {
  const [value, setValue] = useState([new Date(), new Date()])
  const dispatch = useDispatch()
  const { user } = useSelector((state: RootState) => state.common)
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)

  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' })

  const { tabTransaction } = useSelector(
    (state: RootState) => state.nonPersistState,
  )

  const [batchSyncing, setBatchSynching] = useState([
    { batchId: '', trigger: false, realBatchId: '' },
  ])

  // const { data, isLoading, refetch, isRefetching } = useQuery<
  //   BatchesAndSyncProps | undefined
  // >(
  //   ['getBatches', dateRange, bookkeeper],
  //   async () => {
  //     const email =
  //       user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
  //     if (email) return await pcGetBatches(email, dateRange, offSet?.next)
  //     return []
  //   },
  //   {
  //     refetchOnWindowFocus: false,
  //     staleTime: Infinity,
  //   },
  // )

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
      try {
        if (email) return await getStripePayouts(email)
        return []
      } catch (err) {
        return []
      }
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
      setBatchSynching((prev) => [
        ...prev,
        {
          batchId: batchId,
          realBatchId: `${batchId} - ${email}`,
          trigger: true,
        },
      ])
      const result = await manualSync({
        email,
        dataBatch,
        realBatchId: `${batchId} - ${email}`,
        batchId: batchId,
      })
      if (result.success) {
        successNotification({ title: `Batch: ${batchName} successfully sync` })
        // refetch()
      } else {
        failNotification({ title: 'Error' })
      }
    } catch (e) {
      failNotification({ title: 'Error' })
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
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      setBatchSynching((prev) => [
        ...prev,
        {
          batchId: payoutDate,
          trigger: true,
          realBatchId: `${payoutDate} - ${email}`,
        },
      ])
      const filterFundName = fundData?.length
        ? fundData.map((item) => item.attributes.name)
        : []
      await Promise.all(
        stripeData.map(async (a: { description: string }, indexArr: number) => {
          const description = a.description
          const regex = /#(\d+)/ // match the #
          const match = description?.match(regex)

          if (match) {
            const donationId = match[1]
            const index = filterFundName?.findIndex((word) =>
              description.includes(word),
            )

            const email =
              user.role === 'bookkeeper'
                ? bookkeeper?.clientEmail || ''
                : user.email

            const fundName = filterFundName[index]

            if (index !== -1) {
              if (fundName) {
                const response = await syncStripePayout(
                  email,
                  String(donationId),
                  String(fundName),
                  payoutDate,
                )

                // if (indexArr === stripeData.length - 1) {
                //   console.log('This is the last iteration')
                // }

                if (response === 'success') {
                  successNotification({
                    title: `Stripe payout successfully sync`,
                  })
                  // refetch()
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
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      setBatchSynching((prevBatchSyncing) => {
        const batchIndex = prevBatchSyncing.findIndex(
          (batch) => batch.batchId === payoutDate,
        )
        if (batchIndex !== -1) {
          const updatedBatchSyncing = [...prevBatchSyncing]
          updatedBatchSyncing[batchIndex] = {
            batchId: payoutDate,
            trigger: false,
            realBatchId: `${payoutDate} - ${email}`,
          }
          return updatedBatchSyncing
        }
        return prevBatchSyncing
      })
    }
  }

  return (
    <MainLayout>
      {isLoadingStripePayoutData || isRefetchingStripePayoutData ? (
        <Loading />
      ) : (
        <div className="flex h-full gap-4">
          <div className="rounded-lg p-8 bg-white w-screen">
            {/* Header */}
            <div className="pb-2">
              <div className="flex flex-col border-b-2 pb-2">
                <div className="flex items-center gap-2">
                  <BiSync size={28} className="text-blue-400" />
                  <span className="font-bold text-lg text-[#27A1DB]">
                    Transaction History
                  </span>
                </div>

                <div className="flex gap-4">
                  <button
                    className={`${
                      tabTransaction.batch
                        ? 'text-gray-400 font-extrabold'
                        : 'text-gray-400'
                    } flex items-center gap-1`}
                    onClick={() =>
                      dispatch(
                        setTabTransaction({ batch: true, stripe: false }),
                      )
                    }
                  >
                    <p>Batch</p>
                  </button>
                  <p className="text-gray-400"> | </p>
                  <button
                    className={`${
                      !tabTransaction.batch
                        ? 'text-gray-400 font-extrabold'
                        : 'text-gray-400'
                    } flex items-center gap-1`}
                    onClick={() =>
                      dispatch(
                        setTabTransaction({ batch: false, stripe: true }),
                      )
                    }
                  >
                    <p>Stripe Payout</p>
                  </button>
                </div>
              </div>
            </div>

            {/*  */}

            <div className="flex w-full">
              {/* <SelectDateRange onChange={handleDateChange} value={value} /> */}
              {/* <div>
                <SelectDateRange
                  setDateRangeVal={setDateRange}
                  dateRangeVal={dateRange}
                />
              </div> */}
            </div>

            {/* Table */}
            {tabTransaction.batch && userData?.data?.UserSetting ? (
              <BatchTable
                batchSyncing={batchSyncing}
                triggerSync={triggerSyncBatch}
              />
            ) : !isEmpty(
                userData?.data?.UserSetting?.settingRegistrationData,
              ) ? (
              <StripePayoutTable
                triggerSync={triggerSyncStripe}
                batchSyncing={batchSyncing}
              />
            ) : isEmpty(userData?.data?.UserSetting?.settingRegistrationData) &&
              !tabTransaction.batch ? (
              <div className="flex flex-col items-center justify-center h-96">
                <p className="text-2xl text-center font-thin">
                  Kindly configure your registration mapping within the mapping.
                </p>
                <Link
                  to={mainRoute.AUTOMATION_MAPPING + '?tab=1'}
                  className="text-xl pt-4 underline text-blue-400"
                >
                  Click Here !
                </Link>
              </div>
            ) : isEmpty(userData?.data?.UserSetting) && tabTransaction.batch ? (
              <div className="flex flex-col items-center justify-center h-96">
                <p className="text-2xl text-center font-thin">
                  Kindly configure your donation mapping within the mapping.
                </p>
                <Link
                  to={mainRoute.AUTOMATION_MAPPING + '?tab=0'}
                  className="text-xl pt-4 underline text-blue-400"
                >
                  Click Here !
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </MainLayout>
  )
}

export default Dashboard
