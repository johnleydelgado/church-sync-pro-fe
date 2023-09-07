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

const formatString = 'M/d/yyyy'

const ViewDetails: FC<indexProps> = ({}) => {
  const { payoutDate } = useParams()
  const navigation = useNavigate()
  const [isFetching, setIsFetching] = useState(false)
  const { user } = useSelector((state: RootState) => state.common)
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const [stripePayoutData, setStripePayoutData] = useState<FinalDataProps[]>()
  const [isSynching, setIsSynching] = useState(false)

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

      if (stripePayoutData)
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

              const fundReg = filterFundName?.find((word) =>
                a.fund.toLowerCase().includes(word.toLowerCase()),
              )

              const fundName = filterFundName[index]
              let response = ''

              if (index !== -1) {
                if (fundName) {
                  response = await syncStripePayout(
                    email,
                    String(donationId),
                    String(fundReg),
                    formattedDate || '',
                  )
                  console.log(
                    'fundName',
                    email,
                    String(donationId),
                    String(fundReg),
                    formattedDate || '',
                  )
                }
              } else {
                response = await syncStripePayoutRegistration(
                  email,
                  String(a.item.net),
                  String(fundReg),
                  formattedDate || '',
                )
              }

              if (response === 'success') {
                successNotification({
                  title: `Stripe payout successfully sync`,
                })
                refetch()
              } else {
                // failNotification({ title: 'Error' })
              }
            }
          }),
        )
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
  }, [isLoadingBatchData, isRefetchingBatchData])

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

        const stripePayoutRes = await getStripePayouts(email)
        const date = String(fromUnixTime(Number(payoutDate)))

        const filterFundName = fundData?.length
          ? fundData.map(
              (item: { attributes: { name: any } }) => item.attributes.name,
            )
          : []

        const newStripeObj = stripePayoutRes.find(
          (item: { payoutDate: string }) =>
            item.payoutDate === format(new Date(date), formatString),
        )

        let data: any[] = []

        if (newStripeObj?.data && Array.isArray(newStripeObj.data)) {
          data = await Promise.all(
            newStripeObj.data.map((item: any) => {
              const index = filterFundName?.findIndex((word: any) =>
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
                    (item: any) => item.registration === (parts[2] || parts[1]),
                  )

                return {
                  fund: registrationFund
                    ? `${capitalAtFirstLetter(
                        registrationFund.class.label || '',
                      )} (${capitalAtFirstLetter(parts[2] || parts[1] || '')})`
                    : '',
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
        }

        setStripePayoutData(data)
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
  }, [fundData, userData])

  return (
    <MainLayout>
      <div className="flex flex-col h-full gap-4 font-sans">
        {isLoadingBatchData || isFetching || isRefetchingBatchData ? (
          <Loading />
        ) : (
          <>
            <div className="rounded-lg bg-white h-5/6">
              <div className="flex items-center gap-2">
                <BiSync size={28} className="text-blue-400" />
                <span className="font-bold text-lg text-[#27A1DB]">
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
                            className="text-[#27A1DB] flex items-center gap-1"
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
                  <span className="font-normal text-2xl text-[#FAB400]">
                    Payout Summary
                  </span>
                  <div className="border-y-[1px] flex justify-between p-8 mt-2 border-[#FAB400] bg-[#D9D9D933]">
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
                        No. Of Donations
                      </p>
                      <p className="font-light text-gray-500 text-center">
                        {stripePayoutData?.length}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <p className="font-semibold text-gray-500">
                        Stripe total fees
                      </p>
                      <p className="font-light text-gray-500">
                        {formatUsd(String(stripePayoutData?.[0]?.totalFees))}
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
                  </div>
                </div>

                <Table>
                  <Table.Head className="border-b-2 border-[#FAB400]">
                    <Table.HeadCell className="text-[#FAB400]">
                      Fund
                    </Table.HeadCell>
                    <Table.HeadCell className="text-[#FAB400]">
                      Amount
                    </Table.HeadCell>
                    <Table.HeadCell className="text-[#FAB400]">
                      Stripe Fees
                    </Table.HeadCell>
                    <Table.HeadCell className="text-[#FAB400]">
                      Net
                    </Table.HeadCell>
                  </Table.Head>
                  <Table.Body className="divide-y">
                    {stripePayoutData?.map((item, index: number) => (
                      <Table.Row
                        className={`${
                          index % 2 === 0
                            ? 'bg-gray-50 dark:bg-gray-800'
                            : 'bg-white dark:bg-gray-900'
                        } border-b border-[#FAB400] dark:border-gray-700 [&>*]:px-6 [&>*]:py-4`}
                        key={Math.random()}
                      >
                        <Table.Cell className="whitespace-nowrap font-medium dark:text-white">
                          {item.fund || ''}
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
