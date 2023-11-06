import { pcGetFunds } from '@/common/api/planning-center'
import Loading from '@/common/components/loading/Loading'
import MainLayout from '@/common/components/main-layout/MainLayout'
import React, { FC, useState } from 'react'
import { useQuery } from 'react-query'
import { useSelector } from 'react-redux'
import { RootState } from '../../../redux/store'
import { isEmpty } from 'lodash'
import { getUserRelated, manualSync } from '@/common/api/user'
import { failNotification, successNotification } from '@/common/utils/toast'
import BatchTable from './component/BatchTable'
import {
  finalSyncStripe,
  getStripePayouts,
  syncStripePayout,
  syncStripePayoutRegistration,
} from '@/common/api/stripe'
import StripePayoutTable from './component/StripePayoutTable'
import Stripe from 'stripe'
import { FundProps } from '../settings'

import { BiSync } from 'react-icons/bi'
import { Link } from 'react-router-dom'
import { mainRoute } from '@/common/constant/route'
import { useDispatch } from 'react-redux'
import { setTabTransaction } from '@/redux/nonPersistState'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { setSelectedStartDate } from '@/redux/common'
import { capitalAtFirstLetter } from '@/common/utils/helper'

interface BatchDataProps {
  amount: number
  created: string
  totalAmount: number
  fundName: string
  payoutDate: string
  type: string
}

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
  const dispatch = useDispatch()
  const { user, selectedStartDate, selectedBankAccount, selectedBankExpense } =
    useSelector((state: RootState) => state.common)
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)

  const { tabTransaction } = useSelector(
    (state: RootState) => state.nonPersistState,
  )

  const [batchSyncing, setBatchSynching] = useState([
    { batchId: '', trigger: false, realBatchId: '' },
  ])

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

  const handleDateChange = (value: any) => {
    // If you are only interested in single date selections, you could check if value is an instance of Date
    if (value instanceof Date) {
      dispatch(setSelectedStartDate(value))
    }
    // if value is an array, it's a date range. You might want to handle it differently
    else if (Array.isArray(value)) {
      // handle date range
    }
    // if value is null, the date selection was cleared
    else if (value === null) {
      dispatch(setSelectedStartDate(null))
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
        bankData: selectedBankAccount,
      })
      if (result.success) {
        successNotification({ title: `Batch: ${batchName} successfully sync` })
        setBatchSynching((prev) =>
          prev.map((item) =>
            item.batchId === batchId ? { ...item, trigger: false } : item,
          ),
        )
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
      console.log('stripeData', stripeData)

      await Promise.all(
        stripeData.map(
          (a: {
            description: string
            fund: string
            net: number
            amount: number
            fee: number
          }) => {
            const description = a.description
            const regex = /#(\d+)/
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

              const parts = description.split('-')

              const regName = parts[parts.length - 1]?.trim() || ''

              const fundName = filterFundName[index]

              const registrationFund =
                userData.data.UserSetting.settingRegistrationData.find(
                  (item: any) => item.registration === regName,
                )

              const fundNameRegistration = registrationFund
                ? `${capitalAtFirstLetter(
                    registrationFund.class.label || '',
                  )} (${capitalAtFirstLetter(regName || '')})`
                : ''

              const fundReg =
                filterFundName?.find((word) =>
                  fundNameRegistration
                    .toLowerCase()
                    .includes(word.toLowerCase()),
                ) ||
                registrationFund?.class?.label ||
                ''

              let arr = {}
              if (index !== -1) {
                arr = {
                  ...arr,
                  email,
                  batchData: {
                    amount: a.amount,
                    created: payoutDate,
                    fundName: fundName,
                    payoutDate: payoutDate,
                    totalAmount: a.amount,
                    type: 'batch',
                  } as BatchDataProps,
                  bankData: selectedBankAccount,
                  fee: a.fee,
                }
              } else {
                arr = {
                  ...arr,
                  email,
                  batchData: {
                    amount: a.amount,
                    created: payoutDate,
                    fundName: fundReg,
                    payoutDate: payoutDate,
                    totalAmount: a.amount,
                    type: 'registration',
                  } as BatchDataProps,
                  bankData: selectedBankAccount,
                  fee: a.fee,
                }
              }
              return Promise.resolve(arr)
            }

            return Promise.resolve(null)
          },
        ),
      ).then(async (results: any[]) => {
        // Calculate fund totals and update results in one pass
        const updatedResults = results.map((item) => {
          const fundName = item.batchData?.fundName
          if (fundName) {
            const fundTotal = results.reduce((acc, curr) => {
              return curr.batchData?.fundName === fundName
                ? acc + curr.batchData.totalAmount
                : acc
            }, 0)

            return {
              ...item,
              batchData: {
                ...item.batchData,
                totalAmount: fundTotal,
              },
            }
          }
          return item
        })
        console.log('results: ', results)

        // Grouping the updated results by fundName
        const groupedResults = updatedResults.reduce((acc, curr) => {
          const fundName = curr.batchData?.fundName
          const fee = curr.fee || 0

          if (fundName) {
            if (!acc[fundName]) {
              acc[fundName] = []
            }
            acc[fundName].push(curr)
          }
          // Initialize Charge object if it doesn't exist
          if (!acc['Charge']) {
            acc['Charge'] = [
              {
                email: curr?.email,
                batchData: {
                  amount: 0,
                  created: payoutDate,
                  fundName: '',
                  payoutDate: payoutDate,
                  totalAmount: 0,
                  type: 'registration',
                  totalFee: 0,
                } as BatchDataProps,
                bankData: selectedBankAccount,
              },
            ]
          }

          // Accumulate fees in Charge object
          acc['Charge'][0].batchData.totalFee += fee

          return acc
        }, {})
        console.log('groupedResults', groupedResults)

        const response = await finalSyncStripe({
          data: groupedResults,
        })

        if (response.success) {
          successNotification({
            title: `Stripe payout successfully sync`,
          })
        } else {
          failNotification({ title: 'Error' })
        }
      })
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

            <div className="flex flex-col w-full gap-2">
              <p className="font-bold text-lg text-gray-400">
                Select start date
              </p>
              <DatePicker
                selected={
                  selectedStartDate ? new Date(selectedStartDate) : null
                }
                onChange={handleDateChange}
                className="rounded-xl border-yellow-300"
              />
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
