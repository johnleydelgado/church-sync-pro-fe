/* eslint-disable react-hooks/exhaustive-deps */
import { pcGetBatches, pcGetFunds } from '@/common/api/planning-center'
import MainLayout from '@/common/components/main-layout/MainLayout'
import { RootState } from '@/redux/store'
import React, { FC, useEffect, useState } from 'react'
import { useQuery } from 'react-query'
import { useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router'
import { AttributesProps, BatchesProps } from '..'
import { format, fromUnixTime, parseISO } from 'date-fns'
import { capitalAtFirstLetter, formatUsd } from '@/common/utils/helper'
import { Table } from 'flowbite-react'
import { IoIosArrowBack } from 'react-icons/io'
import { BiSync } from 'react-icons/bi'
import Stripe from 'stripe'
import {
  finalSyncStripe,
  getStripePayouts,
  syncStripePayout,
  syncStripePayoutRegistration,
} from '@/common/api/stripe'
import { FundProps } from '../../settings'
import Loading from '@/common/components/loading/Loading'
import { getUserRelated } from '@/common/api/user'
import { isEmpty } from 'lodash'
import { deleteQboDeposit } from '@/common/api/qbo'
import { failNotification, successNotification } from '@/common/utils/toast'
import { mainRoute } from '@/common/constant/route'
import { usePagination } from '@/common/context/PaginationProvider'
interface indexProps {}

interface FinalDataProps {
  fund: string
  grossAmount: string
  net: string
  nonGivingIncome: string
  totalFees: string
  payoutDate: string
  item: { amount: string; fee: string; net: string; description: string }
}

interface BatchDataProps {
  amount: number
  created: string
  totalAmount: number
  fundName: string
  payoutDate: string
  type: string
  description?: string
}

interface StripeObj {
  data: any[] // Replace any with the actual type of the items in the array
  grossAmount: number
  net: number
  nonGivingIncome: number
  totalFees: number
  payoutDate: string
}

const formatString = 'M/d/yyyy'

function extractCategory(description: string): string {
  const parts = description.split(' - ').map((part) => part.trim())
  let category = ''

  // Check if the last part contains an amount in parentheses
  if (/\(\$.*\)$/.test(parts[parts.length - 1] ?? '')) {
    // If so, the category is the part immediately before the last
    if (parts.length === 3 && /\(.*\)$/.test(parts[2] ?? '')) {
      category = parts[2]?.replace(/\s*\(.*\)$/, '') ?? ''
    } else {
      category = parts.slice(0, -1).join(' - ')
      category = category.split(' - ').slice(2).join(' - ')
    }
  } else {
    // Otherwise, join all parts after the first two to get the category
    category = parts.slice(2).join(' - ')
  }
  return category
}

const ViewDetails: FC<indexProps> = ({}) => {
  const { payoutDate } = useParams()
  const navigation = useNavigate()
  const [isFetching, setIsFetching] = useState(false)
  const {
    user,
    selectedBankAccount,
    persistPage,
    lastObjectId,
    selectedStartDate,
  } = useSelector((state: RootState) => state.common)

  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const [stripePayoutData, setStripePayoutData] = useState<FinalDataProps[]>()
  const [isSynching, setIsSynching] = useState(false)
  const stripeCurrentData = useSelector(
    (state: RootState) => state.common.stripeCurrentData,
  )

  // Assuming you have access to user.email in the second page
  const { data: fundData, isLoading } = useQuery<FundProps[]>(
    ['getFunds'],
    async () => {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      if (email) return await pcGetFunds({ email })
    },
    {
      staleTime: Infinity, // The data will be considered fresh indefinitely
      refetchOnWindowFocus: false,
    },
  )

  const { data: stripePayoutRes, isLoading: isLoadingStripe } = useQuery<
    StripeObj[]
  >(
    ['getStripePayouts', bookkeeper, selectedStartDate, stripeCurrentData],
    async () => {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email

      if (!isEmpty(stripeCurrentData)) {
        return stripeCurrentData
      }

      if (email) {
        try {
          const payouts = await getStripePayouts(
            email,
            selectedStartDate,
            persistPage,
            lastObjectId,
          )
          return payouts
        } catch (error) {
          console.error('Failed to fetch stripe payouts:', error)
          // Handle the error appropriately
        }
      }

      return []
    },
    {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    },
  )

  const [synchedBatches, setSyncBatches] = useState<
    {
      id: number | null
      batchId: string | null
      createdAt: string | null
      donationId: string | null
    }[]
  >([{ id: null, batchId: null, createdAt: null, donationId: null }])

  // const {
  //   data: batchesData,
  //   isLoading: isLoadingBatchData,
  //   isRefetching: isRefetchingBatchData,
  //   refetch,
  // } = useQuery(
  //   ['getBatchStripeViewDetails'], // Same query key as in the first page
  //   async () => {
  //     const email =
  //       user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
  //     if (email) return await pcGetBatches(email, '', 0)
  //   },
  //   {
  //     staleTime: Infinity, // The data will be considered fresh indefinitely
  //     refetchOnWindowFocus: false,
  //   },
  // )

  const {
    synchedBatches: synchedBatchesF,
    isLoading: isLoadingBatchData,
    isRefetching: isRefetchingBatchData,
    refetch,
  } = usePagination()

  const { data: userData } = useQuery(
    ['getUserRelated'],
    async () => {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      if (email) return await getUserRelated(email)
    },
    { staleTime: Infinity, refetchOnWindowFocus: false },
  )

  const triggerUnSync = async (): Promise<void> => {
    setIsSynching(true)
    try {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      const result = await deleteQboDeposit(email, synchedBatches)
      if (result === 'success') {
        setIsSynching(false)
        successNotification({ title: `Unsynched Successfully` })
        refetch()
      } else {
        setIsSynching(false)
        failNotification({ title: 'Error' })
      }
    } catch (e) {
      setIsSynching(false)
      failNotification({ title: 'Error' })
    }
  }

  const triggerSyncStripe = async () => {
    try {
      setIsSynching(true)
      const filterFundName = fundData?.length
        ? fundData.map((item) => item.attributes.name)
        : []

      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email

      const date = String(fromUnixTime(Number(payoutDate)))
      // Format the date
      const formattedDate = format(new Date(date), formatString)

      if (stripePayoutData) {
        await Promise.all(
          stripePayoutData.map(async (a, indexArr: number) => {
            const description = a.item.description
            const regex = /#(\d+)/ // match the #
            const match = description?.match(regex)
            if (match) {
              const donationId = match[1]
              const index = filterFundName?.findIndex((word) =>
                description.includes(word),
              )
              // const parts = description.split('-')
              const regName = extractCategory(description)

              const fundName = filterFundName[index]

              const registrationFund =
                userData.data.UserSetting.settingRegistrationData.find(
                  (item: any) => item.registration === regName,
                )

              const fundNameRegistration = registrationFund
                ? `${capitalAtFirstLetter(
                    registrationFund?.class?.label || '',
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
                    amount: Number(a.item.amount),
                    created: formattedDate || '',
                    fundName: fundName,
                    payoutDate: formattedDate || '',
                    totalAmount: Number(a.item.amount),
                    type: 'batch',
                  } as BatchDataProps,
                  bankData: selectedBankAccount,
                  fee: a.item.fee,
                }
              } else {
                arr = {
                  ...arr,
                  email,
                  batchData: {
                    amount: Number(a.item.amount),
                    created: formattedDate || '',
                    fundName: fundReg,
                    payoutDate: formattedDate || '',
                    totalAmount: Number(a.item.amount),

                    type: 'registration',
                    description: regName || '',
                  } as BatchDataProps,
                  bankData: selectedBankAccount,
                  fee: a.item.fee,
                }
              }
              return Promise.resolve(arr)
            }

            return Promise.resolve(null)
          }),
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

          // Grouping the updated results by fundName
          const groupedResults = updatedResults.reduce((acc, curr) => {
            const fundName = curr.batchData?.fundName
            const fee = curr.fee || 0

            if (fundName) {
              if (!acc[fundName]) {
                acc[fundName] = []
              }
              acc[fundName].push(curr)
            } else {
              if (!acc['Empty']) {
                acc['Empty'] = []
              }
              acc['Empty'].push(curr)
            }
            // Initialize Charge object if it doesn't exist
            if (!acc['Charge']) {
              acc['Charge'] = [
                {
                  email: curr?.email,
                  batchData: {
                    amount: 0,
                    created: formattedDate || '',
                    fundName: '',
                    payoutDate: formattedDate || '',
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

          const response = await finalSyncStripe({
            data: groupedResults,
          })

          if (response.success) {
            successNotification({
              title: `Stripe payout successfully sync`,
            })
            refetch()
          } else {
            failNotification({ title: response.message })
          }
        })
      }
    } catch (e) {
      setIsSynching(false)
      failNotification({ title: 'Error' })
    } finally {
      setIsSynching(false)
    }
  }

  useEffect(() => {
    const arr = synchedBatchesF
    const date = String(fromUnixTime(Number(payoutDate)))
    if (arr?.length) {
      setSyncBatches(
        arr.filter((item: { id: string; batchId: string; createdAt: string }) =>
          item.batchId.includes(format(new Date(date), formatString)),
        ),
      )
      return
    }
    setSyncBatches([
      {
        id: null,
        batchId: null,
        createdAt: null,
        donationId: null,
      },
    ])
  }, [isLoadingBatchData, isRefetchingBatchData, synchedBatchesF])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsFetching(true)
        const email =
          user?.role === 'bookkeeper'
            ? bookkeeper?.clientEmail || ''
            : user?.email

        if (!email) {
          setIsFetching(false)
          return
        }

        // const stripePayoutRes = await getStripePayouts(
        //   email,
        //   selectedStartDate,
        //   persistPage,
        //   lastObjectId,
        // )
        const date = String(fromUnixTime(Number(payoutDate)))

        const filterFundName = fundData?.length
          ? fundData.map(
              (item: { attributes: { name: any } }) => item.attributes.name,
            )
          : []

        console.log('stripePayoutRes', stripePayoutRes)

        const newStripeObj: StripeObj | undefined = stripePayoutRes
          ? stripePayoutRes.find(
              (item: { payoutDate: string }) =>
                item.payoutDate === format(new Date(date), formatString),
            )
          : undefined

        let data: any[] = []

        if (newStripeObj?.data && Array.isArray(newStripeObj.data)) {
          console.log('Go to if')

          data = await Promise.all(
            newStripeObj.data.map(async (item: any) => {
              try {
                const index = filterFundName?.findIndex((word) =>
                  item.description.includes(word),
                )

                if (index !== -1) {
                  console.log('index', index)

                  const str = filterFundName[index]
                  console.log('fund', str)

                  return {
                    fund: str,
                    grossAmount: newStripeObj.grossAmount,
                    net: newStripeObj.net,
                    nonGivingIncome: newStripeObj.nonGivingIncome,
                    totalFees: newStripeObj.totalFees,
                    payoutDate: newStripeObj.payoutDate,
                    item,
                  }
                } else {
                  const descriptionFinal = extractCategory(item.description)
                  console.log('descriptionFinal', descriptionFinal)

                  const registrationFund =
                    userData.data.UserSetting.settingRegistrationData.find(
                      (settingItem: any) =>
                        settingItem.registration === descriptionFinal,
                    )

                  return {
                    fund: registrationFund
                      ? `${capitalAtFirstLetter(
                          registrationFund?.class?.label || '',
                        )} (${capitalAtFirstLetter(descriptionFinal || '')})`
                      : '',
                    grossAmount: newStripeObj.grossAmount,
                    net: newStripeObj.net,
                    nonGivingIncome: newStripeObj.nonGivingIncome,
                    totalFees: newStripeObj.totalFees,
                    payoutDate: newStripeObj.payoutDate,
                    item,
                  }
                }
              } catch (e) {
                // Log the error or handle it as needed
                console.error('An error occurred:', e)
                return null // or any other value indicating failure
              }
            }),
          )
        }
        setStripePayoutData(data.filter((item) => item !== null))
      } catch (error) {
        console.error('An error occurred:', error)
      } finally {
        setIsFetching(false)
      }
    }

    if (
      !isEmpty(userData?.data?.UserSetting?.settingRegistrationData) &&
      !isEmpty(fundData)
    ) {
      fetchData()
    }
  }, [fundData, userData, isLoadingStripe])

  return (
    <MainLayout>
      <div className="flex flex-col h-full gap-4 font-sans">
        {isLoadingBatchData ||
        isFetching ||
        isRefetchingBatchData ||
        isLoadingStripe ? (
          <Loading />
        ) : (
          <>
            <div className="rounded-lg bg-white h-5/6">
              <div className="flex items-center gap-2">
                <BiSync size={28} className="text-blue-400" />
                <span className="font-bold text-lg text-primary">
                  Stripe Transaction
                </span>
              </div>
              <div className="p-8 flex flex-col gap-16">
                {/* Header */}
                <div className="bg-[#FAB40099] flex items-center -mx-14">
                  <button
                    onClick={() => navigation(mainRoute.TRANSACTION)}
                    className="flex gap-2  items-center transform hover:scale-105 duration-75 ease-linear pr-2"
                  >
                    <IoIosArrowBack size={32} className="text-white" />
                  </button>
                  <div className="flex flex-col gap-2 pl-4 py-2">
                    <span className="font-normal text-xl text-[#1b1b1bcc]">
                      {`Stripe Payout ${stripePayoutData?.[0]?.payoutDate}`}
                    </span>
                    <div>
                      {synchedBatches[0]?.createdAt ? (
                        <div className="flex gap-4">
                          <span className="text-slate-500 font-normal text-sm text-[#1b1b1bcc]">
                            {`Synched Planning Center to QuicBooks Online | Last synched at ${format(
                              parseISO(synchedBatches[0]?.createdAt || ''),
                              "hh:mm aaaa 'on' EEEE MMMM d, yyyy",
                            )} | `}
                          </span>
                          <button
                            className="text-orange-500 flex items-center gap-1"
                            onClick={() => triggerUnSync()}
                          >
                            <BiSync
                              className={`${
                                isSynching ? 'animate-spin' : 'animate-none'
                              }`}
                            />
                            <p className="underline">Remove sync</p>
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-4">
                          <p className="text-[#1b1b1bcc]">Not Sync | </p>
                          <button
                            className="text-primary flex items-center gap-1"
                            onClick={triggerSyncStripe}
                          >
                            <BiSync
                              className={`${
                                isSynching ? 'animate-spin' : 'animate-none'
                              }`}
                            />
                            <p className="underline">Sync</p>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="">
                  <span className="font-normal text-2xl text-yellow">
                    Payout Summary
                  </span>
                  <div className="border-y-[1px] flex justify-between p-8 mt-2 border-yellow bg-[#D9D9D933]">
                    <div className="flex flex-col gap-2">
                      <p className="font-semibold text-gray-500">
                        Total Amount
                      </p>
                      <p className="font-light text-gray-500">
                        {formatUsd(String(stripePayoutData?.[0]?.grossAmount))}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <p className="font-semibold text-gray-500">
                        Non Giving Income
                      </p>
                      <p className="font-light text-gray-500">
                        {formatUsd(
                          String(stripePayoutData?.[0]?.nonGivingIncome),
                        )}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <p className="font-semibold text-gray-500">Stripe fees</p>
                      <p className="font-light text-gray-500">
                        {formatUsd(String(stripePayoutData?.[0]?.totalFees))}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <p className="font-semibold text-gray-500">Net Deposit</p>
                      <p className="font-light text-gray-500 text-center">
                        {formatUsd(String(stripePayoutData?.[0]?.net))}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <p className="font-semibold text-gray-500">
                        No. Of Donations
                      </p>
                      <p className="font-light text-gray-500 text-center">
                        {stripePayoutData?.length}
                      </p>
                    </div>
                  </div>
                </div>

                <Table>
                  <Table.Head className="border-b-2 border-yellow">
                    <Table.HeadCell className="text-yellow">
                      Fund
                    </Table.HeadCell>
                    <Table.HeadCell className="text-yellow">
                      Amount
                    </Table.HeadCell>
                    <Table.HeadCell className="text-yellow">
                      Stripe Fees
                    </Table.HeadCell>
                    <Table.HeadCell className="text-yellow">Net</Table.HeadCell>
                  </Table.Head>
                  <Table.Body className="divide-y">
                    {stripePayoutData?.map((item, index: number) => (
                      <Table.Row
                        className={`${
                          index % 2 === 0
                            ? 'bg-gray-50 dark:bg-gray-800'
                            : 'bg-white dark:bg-gray-900'
                        } border-b border-yellow dark:border-gray-700 [&>*]:px-6 [&>*]:py-4`}
                        key={Math.random()}
                      >
                        <Table.Cell className="whitespace-nowrap font-medium dark:text-white">
                          {item?.fund || ''}
                        </Table.Cell>
                        <Table.Cell>
                          {formatUsd(String(item.item.amount))}
                        </Table.Cell>
                        <Table.Cell>
                          {formatUsd(String(item.item.fee))}
                        </Table.Cell>
                        <Table.Cell>
                          {formatUsd(String(item.item.net))}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}

export default ViewDetails
