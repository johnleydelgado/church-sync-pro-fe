import { pcGetBatches } from '@/common/api/planning-center'
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
interface indexProps {}

interface DonationProps {
  donation: {
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
  }
  fund: {
    id: string
    attributes: {
      color: string
      created_at: string
      default: boolean
      deletable: boolean
      description: string | null
      ledger_code: string | null
      name: string
      updated_at: string
      visibility: string
    }
  }
  person: {
    data: {
      attributes: {
        first_name: string
        last_name: string
      }
    }
  }
}

interface SyncBatchesProps {
  batchId: string
  createdAt: string
  id: number
  donationId: string
}

interface FinalDataProps {
  batches: {
    batch: {
      type: string
      id: string
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
    donations: DonationProps[]
  }
  synchedBatches: SyncBatchesProps[] | undefined
}

const ViewDetails: FC<indexProps> = ({}) => {
  const { batchId } = useParams()
  const navigation = useNavigate()
  const { user } = useSelector((state: RootState) => state.common)
  const [finalData, setFinalData] = useState<FinalDataProps | null>(null)
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const [isSynching, setIsSynching] = useState(false)
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' })

  // Assuming you have access to user.email in the second page
  const { data, isLoading, refetch, isRefetching } = useQuery(
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

  useEffect(() => {
    if (!isEmpty(data))
      setFinalData({
        batches: data.batches.find(
          (item: AttributesProps) =>
            item.batch.id === String(batchId) && item.donations,
        ),
        synchedBatches: data.synchedBatches.filter(
          (el: any) => el.batchId === String(batchId),
        ),
      })
  }, [data, batchId])

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
      const result = await manualSync({ email, dataBatch, batchId })
      if (result.success) {
        setIsSynching(false)
        successNotification({ title: `Batch: ${batchName} successfully sync` })
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

  const triggerUnSync = async (): Promise<void> => {
    setIsSynching(true)
    try {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      console.log('email, syncId, depositId', email, finalData?.synchedBatches)
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
                      {finalData.batches?.donations?.length}
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
                  {finalData.batches?.donations.map((item, index: number) => (
                    <Table.Row
                      className={`${
                        index % 2 === 0
                          ? 'bg-gray-50 dark:bg-gray-800'
                          : 'bg-white dark:bg-gray-900'
                      } border-b border-[#FAB400] dark:border-gray-700 [&>*]:px-6 [&>*]:py-4`}
                      key={item.donation.id}
                    >
                      <Table.Cell className="whitespace-nowrap font-medium dark:text-white">
                        {format(
                          parseISO(item.donation.attributes.received_at || ''),
                          'M/d/yyyy',
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        {formatUsd(
                          String(item.donation.attributes.amount_cents),
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        {item.person?.data.attributes.first_name &&
                        item.person?.data.attributes.last_name
                          ? item.person.data.attributes.first_name +
                            ' ' +
                            item.person.data.attributes.last_name
                          : 'Anonymous'}
                      </Table.Cell>
                      <Table.Cell>
                        <p
                          className={`p-2 inline rounded-md text-white`}
                          style={{
                            backgroundColor: item.fund.attributes.color,
                          }}
                        >
                          {item.fund.attributes.name}
                        </p>
                      </Table.Cell>
                      <Table.Cell>
                        {item.donation.attributes.payment_method}
                      </Table.Cell>
                    </Table.Row>
                  ))}
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
