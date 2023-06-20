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
import { formatUsd } from '@/common/utils/helper'
import { Table } from 'flowbite-react'
import { IoIosArrowBack } from 'react-icons/io'
import { BiSync } from 'react-icons/bi'
import Stripe from 'stripe'
import { getStripePayouts } from '@/common/api/stripe'
import { FundProps } from '../../settings'
import Loading from '@/common/components/loading/Loading'
import { getUserRelated } from '@/common/api/user'
import { isEmpty } from 'lodash'
interface indexProps {}

interface FinalDataProps {
  fund: string
  grossAmount: string
  net: string
  nonGivingIncome: string
  totalFees: string
  payoutDate: string
  item: { amount: string; fee: string; net: string }
}

const formatString = 'M/d/yyyy'

const ViewDetails: FC<indexProps> = ({}) => {
  const { payoutDate } = useParams()
  const navigation = useNavigate()
  const { user } = useSelector((state: RootState) => state.common)
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const [stripePayoutData, setStripePayoutData] = useState<FinalDataProps[]>()
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

  const [synchedBatches, setSyncBatches] = useState<{
    id: number | null
    batchId: string | null
    createdAt: string | null
    donationId: string | null
  }>({ id: null, batchId: null, createdAt: null, donationId: null })

  const { data: batchesData, isLoading: isLoadingBatchData } = useQuery(
    ['getBatches'], // Same query key as in the first page
    async () => {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      if (email) return await pcGetBatches(email)
    },
    {
      staleTime: Infinity, // The data will be considered fresh indefinitely
      refetchOnWindowFocus: false,
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

  // const {
  //   data: stripePayoutData,
  //   isLoading: isLoadingStripePayoutData,
  //   refetch: refetchStripePayoutData,
  //   isRefetching: isRefetchingStripePayoutData,
  // } = useQuery<FinalDataProps[]>(
  //   ['getStripePayouts'],
  //   async () => {
  //     const email =
  //       user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
  //     const stripePayoutRes = await getStripePayouts(email)
  //     const date = String(fromUnixTime(Number(payoutDate)))
  //     console.log('stripePayoutRes', stripePayoutRes)
  //     console.log('fundData', fundData)

  //     const filterFundName = fundData?.length
  //       ? fundData.map((item) => item.attributes.name)
  //       : []
  //     const newStripeObj = stripePayoutRes.find(
  //       (item: any) => item.payoutDate === format(new Date(date), formatString),
  //     )

  //     return await Promise.all(
  //       newStripeObj.data.map((item: any) => {
  //         const index = filterFundName?.findIndex((word) =>
  //           item.description.includes(word),
  //         )
  //         if (index !== -1) {
  //           const str = filterFundName[index]
  //           return {
  //             fund: str,
  //             grossAmount: newStripeObj.grossAmount,
  //             net: newStripeObj.net,
  //             nonGivingIncome: newStripeObj.nonGivingIncome,
  //             totalFees: newStripeObj.totalFees,
  //             payoutDate: newStripeObj.payoutDate,
  //             item,
  //           }
  //         } else {
  //           const parts = item.description.split(' - ')
  //           const registrationFund =
  //             userData.data.UserSetting.settingRegistrationData.find(
  //               (item: any) => item.registration === parts[2] || parts[1],
  //             )
  //           return {
  //             fund: `${
  //               registrationFund.class.label + ' ' + (parts[2] || parts[1])
  //             }`,
  //             grossAmount: newStripeObj.grossAmount,
  //             net: newStripeObj.net,
  //             nonGivingIncome: newStripeObj.nonGivingIncome,
  //             totalFees: newStripeObj.totalFees,
  //             payoutDate: newStripeObj.payoutDate,
  //             item,
  //           }
  //         }
  //       }),
  //     )
  //   },
  //   {
  //     staleTime: Infinity, // The data will be considered fresh indefinitely
  //     refetchOnWindowFocus: false,
  //   },
  // )

  useEffect(() => {
    const arr = batchesData?.synchedBatches
    const date = String(fromUnixTime(Number(payoutDate)))
    if (arr?.length) {
      setSyncBatches(
        arr.find((item: { id: string; batchId: string; createdAt: string }) =>
          item.batchId.includes(format(new Date(date), formatString)),
        ),
      )
      return
    }
    setSyncBatches({
      id: null,
      batchId: null,
      createdAt: null,
      donationId: null,
    })
  }, [isLoadingBatchData])

  useEffect(() => {
    const fetchData = async () => {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      const stripePayoutRes = await getStripePayouts(email)
      const date = String(fromUnixTime(Number(payoutDate)))

      const filterFundName = fundData?.length
        ? fundData.map((item) => item.attributes.name)
        : []
      const newStripeObj = stripePayoutRes.find(
        (item: any) => item.payoutDate === format(new Date(date), formatString),
      )

      const data = await Promise.all(
        newStripeObj.data.map((item: any) => {
          const index = filterFundName?.findIndex((word) =>
            item.description.includes(word),
          )

          if (index !== -1) {
            const str = filterFundName[index]
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
            const parts = item.description.split(' - ')
            const registrationFund =
              userData.data.UserSetting.settingRegistrationData.find(
                (item: any) => item.registration === parts[2] || parts[1],
              )
            return {
              fund: `${
                registrationFund.class.label + ' ' + (parts[2] || parts[1])
              }`,
              grossAmount: newStripeObj.grossAmount,
              net: newStripeObj.net,
              nonGivingIncome: newStripeObj.nonGivingIncome,
              totalFees: newStripeObj.totalFees,
              payoutDate: newStripeObj.payoutDate,
              item,
            }
          }
        }),
      )

      setStripePayoutData(data)
    }
    if (
      !isEmpty(userData?.data?.UserSetting.settingRegistrationData) &&
      !isEmpty(fundData)
    ) {
      fetchData()
    }
  }, [fundData, userData])

  // console.log('stripePayoutData', stripePayoutData)
  console.log('stripePayoutData', stripePayoutData)
  return (
    <MainLayout>
      <div className="flex flex-col h-full gap-4 font-sans">
        {isLoadingBatchData ? (
          <Loading />
        ) : (
          <>
            <button
              onClick={() => navigation(-1)}
              className="pb-2 flex gap-2 w-32 items-center transform hover:scale-105 duration-75 ease-linear"
            >
              <IoIosArrowBack />
              <p>Back</p>
            </button>
            <div className="rounded-lg bg-white h-5/6">
              <div className="p-8 flex flex-col gap-16">
                {/* Header */}
                <div className="flex flex-col gap-2">
                  <span className="font-normal text-2xl">
                    {`Stripe Payout ${stripePayoutData?.[0]?.payoutDate}`}
                  </span>
                  <div>
                    {synchedBatches?.createdAt ? (
                      <span className="text-slate-500 font-normal text-sm">
                        {`Synched Planning Center to QuicBooks Online | Last synched at ${format(
                          parseISO(synchedBatches.createdAt || ''),
                          "hh:mm aaaa 'on' EEEE MMMM d, yyyy",
                        )}`}
                      </span>
                    ) : (
                      <div className="flex gap-4">
                        <p>Not Sync | </p>
                        <button className="text-green-600 flex items-center gap-1">
                          <BiSync />
                          <p className="underline">Sync</p>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="">
                  <span className="font-normal text-2xl">Payout Summary</span>
                  <div className="border-[1px] flex justify-between p-8 mt-2 rounded-lg">
                    <div className="flex flex-col gap-2">
                      <p>Total Amount</p>
                      <p className="font-light text-slate-500">
                        {formatUsd(String(stripePayoutData?.[0]?.grossAmount))}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <p>No. Of Donations</p>
                      <p className="font-light text-slate-500 text-center">
                        {stripePayoutData?.length}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <p>Stripe total fees</p>
                      <p className="font-light text-slate-500">
                        {formatUsd(String(stripePayoutData?.[0]?.totalFees))}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <p>Non Giving Income</p>
                      <p className="font-light text-slate-500">
                        {formatUsd(
                          String(stripePayoutData?.[0]?.nonGivingIncome),
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <Table>
                  <Table.Head>
                    <Table.HeadCell>Fund</Table.HeadCell>
                    <Table.HeadCell>Amount</Table.HeadCell>
                    <Table.HeadCell>Stripe Fees</Table.HeadCell>
                    <Table.HeadCell>Net</Table.HeadCell>
                  </Table.Head>
                  <Table.Body className="divide-y">
                    {stripePayoutData?.map((item) => (
                      <Table.Row
                        className="bg-white dark:border-gray-700 dark:bg-gray-800"
                        key={Math.random()}
                      >
                        <Table.Cell className="whitespace-nowrap font-medium text-gray-900 dark:text-white ">
                          {item.fund}
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
