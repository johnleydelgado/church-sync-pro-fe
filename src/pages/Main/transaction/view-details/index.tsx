import { pcGetBatches, pcGetFunds } from '@/common/api/planning-center'
import MainLayout from '@/common/components/main-layout/MainLayout'
import { RootState } from '@/redux/store'
import React, { FC, useEffect, useState } from 'react'
import { useQuery } from 'react-query'
import { useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router'
import { AttributesProps, BatchesProps } from '..'
import { isEmpty } from 'lodash'
import { format, parseISO } from 'date-fns'
import { formatUsd } from '@/common/utils/helper'
import { Table } from 'flowbite-react'
import { IoIosArrowBack } from 'react-icons/io'
import { BiSync } from 'react-icons/bi'
import Loading from '@/common/components/loading/Loading'
import { failNotification, successNotification } from '@/common/utils/toast'
import { manualSync } from '@/common/api/user'
import { mainRoute } from '@/common/constant/route'
import { deleteQboDeposit } from '@/common/api/qbo'
import { FundProps } from '../../settings'
import {
  batchDataProps,
  usePagination,
} from '@/common/context/PaginationProvider'
interface indexProps {}

interface dataDonationProps {
  id: string
  attributes: {
    amount_cents: number
    amount_currency: string
    completed_at: string
    created_at: string
    fee_cents: number
    fee_currency: string
    payment_brand: null
    payment_check_dated_at: string | null
    payment_check_number: string | null
    payment_last4: string | null
    payment_method: string
    payment_method_sub: string | null
    payment_status: string
    received_at: string
    refundable: boolean
    refunded: boolean
    updated_at: string
  }
  relationships: {
    person: any
    designations: { data: { type: string; id: string }[] }
  }
  fund: FundProps[]
}

interface DonationProps {
  data: dataDonationProps[]
  included: {
    id: any
    relationships: { fund: { data: { type: string; id: string } } }
  }[]
}

interface SyncBatchesProps {
  batchId: string
  createdAt: string
  id: number
  donationId: string
}

interface FinalDataProps {
  batches: { batch: batchDataProps; donations: any } | undefined
  synchedBatches: SyncBatchesProps[] | undefined
}

const ViewDetails: FC<indexProps> = ({}) => {
  const { batchId } = useParams()
  const navigation = useNavigate()
  const { user, selectedBankAccount } = useSelector(
    (state: RootState) => state.common,
  )
  const [finalData, setFinalData] = useState<FinalDataProps | null>(null)
  const [newData, setNewData] = useState<any>(null)

  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const [isSynching, setIsSynching] = useState(false)

  const { data, synchedBatches, refetch, isLoading, isRefetching } =
    usePagination()

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

  useEffect(() => {
    if (!isEmpty(data)) {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email

      setFinalData({
        batches: data?.find(
          (item: AttributesProps) =>
            item.batch.id === String(batchId) && item.donations,
        ),
        synchedBatches: synchedBatches.filter(
          (el: any) => el.batchId === `${batchId} - ${email}`,
        ),
      })
    }
  }, [data, batchId, synchedBatches])

  useEffect(() => {
    if (!isEmpty(fundData) && !isEmpty(finalData)) {
      const temp = { ...finalData }
      const newFundData = temp.batches?.donations.included.map(
        (a: {
          relationships: { fund: { data: { id: string | undefined } } }
          id: any
        }) => {
          const fData = fundData?.find(
            (x) => x.id === a.relationships.fund.data.id,
          )
          return {
            fundData: fData ? [{ ...fData, designationId: a.id }] : [],
          }
        },
      )

      const newDataArr = temp.batches?.donations.data.map(
        (a: { relationships: { designations: { data: { id: any }[] } } }) => {
          const fundObj = newFundData.find(
            (x: { fundData: { designationId: any }[] }) =>
              x.fundData[0]?.designationId ===
              a.relationships.designations.data[0]?.id,
          )
          return {
            ...a,
            fund: fundObj ? fundObj.fundData : [],
          }
        },
      )

      setNewData({
        ...finalData,
        batches: {
          ...finalData.batches,
          donations: {
            ...finalData.batches?.donations,
            data: newDataArr,
          },
        },
      })
    }
  }, [finalData, fundData])

  const triggerSyncBatch = async ({
    dataBatch,
    batchId,
    batchName,
  }: {
    dataBatch: any
    batchId: string
    batchName: string
  }): Promise<void> => {
    setIsSynching(true)
    try {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      const result = await manualSync({
        email,
        dataBatch,
        realBatchId: `${batchId} - ${email}`,
        batchId: batchId,
        bankData: selectedBankAccount,
      })
      if (result.success) {
        setIsSynching(false)
        successNotification({ title: `Batch: ${batchName} successfully sync` })
        refetch({ force: true })
      } else {
        setIsSynching(false)
        failNotification({ title: 'Error' })
      }
    } catch (e) {
      setIsSynching(false)
      failNotification({ title: 'Error' })
    }
  }

  const triggerUnSync = async (): Promise<void> => {
    setIsSynching(true)
    try {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      const result = await deleteQboDeposit(email, finalData?.synchedBatches)
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

  return (
    <MainLayout>
      {isLoading || isRefetching ? (
        <Loading />
      ) : isEmpty(finalData) ? null : (
        <div className="flex flex-col h-full gap-4 font-sans">
          {/* <button
            onClick={() => navigation(mainRoute.TRANSACTION)}
            className="pb-2 flex gap-2 w-32 items-center transform hover:scale-105 duration-75 ease-linear"
          >
            <IoIosArrowBack />
            <p>Back</p>
          </button> */}
          <div className="rounded-lg bg-white h-5/6">
            <div className="flex items-center gap-2">
              <BiSync size={28} className="text-blue-400" />
              <span className="font-bold text-lg text-[#27A1DB]">
                Transaction
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
                    Batch : ({finalData.batches?.batch.attributes.description})
                    |{' '}
                    {format(
                      parseISO(
                        finalData.batches?.batch.attributes.committed_at || '',
                      ),
                      'M/d/yyyy',
                    )}
                  </span>
                  <div>
                    {!isEmpty(finalData.synchedBatches) ? (
                      <div className="flex gap-4">
                        <span className="text-slate-500 font-normal text-sm text-[#1b1b1bcc]">
                          {finalData &&
                          finalData.synchedBatches &&
                          finalData.synchedBatches.length > 0 &&
                          finalData.synchedBatches[0]?.createdAt
                            ? `Synched Planning Center to QuickBooks Online | Last synched at ${format(
                                parseISO(finalData.synchedBatches[0].createdAt),
                                "hh:mm aaaa 'on' EEEE MMMM d, yyyy",
                              )} | `
                            : // Provide a fallback string or component when synchedBatches is undefined or empty
                              'No sync data available'}
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
                          onClick={() =>
                            triggerSyncBatch({
                              dataBatch: finalData.batches?.batch,
                              batchId: finalData.batches?.batch.id || '',
                              batchName:
                                finalData.batches?.batch.attributes
                                  .description || '',
                            })
                          }
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

              {/* Content Header */}
              <div className="">
                <span className="font-normal text-2xl text-[#FAB400]">
                  Batch Summary
                </span>
                <div className="border-y-[1px] flex justify-between p-8 mt-2 border-[#FAB400] bg-[#D9D9D933]">
                  <div className="flex flex-col gap-2">
                    <p className="font-semibold text-gray-500">Total Amount</p>
                    <p className="font-light text-gray-500">
                      {formatUsd(
                        String(finalData.batches?.batch.attributes.total_cents),
                      )}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="font-semibold text-gray-500">
                      No. Of Donations
                    </p>
                    <p className="font-light text-gray-500 text-center">
                      {finalData.batches?.donations.data.length}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="font-semibold text-gray-500">
                      Batch Created Date
                    </p>
                    <p className="font-light text-gray-500">
                      {format(
                        parseISO(
                          finalData.batches?.batch.attributes.created_at || '',
                        ),
                        'M/d/yyyy',
                      )}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="font-semibold text-gray-500">
                      Batch Committed Date
                    </p>
                    <p className="font-light text-gray-500">
                      {format(
                        parseISO(
                          finalData.batches?.batch.attributes.committed_at ||
                            '',
                        ),
                        'M/d/yyyy',
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* BODY */}
              <Table>
                <Table.Head className="border-b-2 border-[#FAB400]">
                  <Table.HeadCell className="text-[#FAB400]">
                    Date
                  </Table.HeadCell>
                  <Table.HeadCell className="text-[#FAB400]">
                    Amount
                  </Table.HeadCell>
                  <Table.HeadCell className="text-[#FAB400]">
                    Donor
                  </Table.HeadCell>
                  <Table.HeadCell className="text-[#FAB400]">
                    Fund
                  </Table.HeadCell>
                  <Table.HeadCell className="text-[#FAB400]">
                    Payment Method
                  </Table.HeadCell>
                </Table.Head>
                <Table.Body className="divide-y">
                  {newData?.batches.donations.data.map(
                    (item: dataDonationProps, index: number) => (
                      <Table.Row
                        className={`${
                          index % 2 === 0
                            ? 'bg-gray-50 dark:bg-gray-800'
                            : 'bg-white dark:bg-gray-900'
                        } border-b border-[#FAB400] dark:border-gray-700 [&>*]:px-6 [&>*]:py-4`}
                        key={item.id}
                      >
                        <Table.Cell className="whitespace-nowrap font-medium dark:text-white">
                          {format(
                            parseISO(item.attributes.created_at || ''),
                            'M/d/yyyy',
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          {formatUsd(String(item.attributes.amount_cents))}
                        </Table.Cell>
                        {/* <Table.Cell>
                          {item.person?.data.attributes.first_name &&
                          item.person?.data.attributes.last_name
                            ? item.person.data.attributes.first_name +
                              ' ' +
                              item.person.data.attributes.last_name
                            : 'Anonymous'}
                        </Table.Cell> */}
                        <Table.Cell>
                          {item.relationships.person.data ? 'Anonymous' : 'TBH'}
                        </Table.Cell>
                        <Table.Cell>
                          <p
                            className={`p-2 inline rounded-md text-white`}
                            style={{
                              backgroundColor: item.fund[0]?.attributes.color,
                            }}
                          >
                            {item.fund[0]?.attributes.name}
                          </p>
                        </Table.Cell>
                        <Table.Cell>
                          {item.attributes.payment_method}
                        </Table.Cell>
                      </Table.Row>
                    ),
                  )}
                </Table.Body>
              </Table>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}

export default ViewDetails
