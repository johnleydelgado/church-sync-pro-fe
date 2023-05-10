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
}

interface FinalDataProps {
  batches?: {
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
  synchedBatches?:
    | { batchId: string; createdAt: string; id: number }
    | undefined
}

const ViewDetails: FC<indexProps> = ({}) => {
  const { batchId } = useParams()
  const navigation = useNavigate()
  const { user } = useSelector((state: RootState) => state.common)
  const [finalData, setFinalData] = useState<FinalDataProps>({})
  // Assuming you have access to user.email in the second page
  const { data, isLoading } = useQuery(
    ['getBatches'], // Same query key as in the first page
    async () => {
      return await pcGetBatches(user.email)
    },
    {
      staleTime: Infinity, // The data will be considered fresh indefinitely
    },
  )

  useEffect(() => {
    if (!isEmpty(data))
      setFinalData({
        batches: data.batches.find(
          (item: AttributesProps) =>
            item.batch.id === String(batchId) && item.donations,
        ),
        synchedBatches: data.synchedBatches.find(
          (el: any) => el.batchId === String(batchId),
        ),
      })
  }, [data, batchId])

  return (
    <MainLayout>
      {isEmpty(finalData) ? null : (
        <div className="flex flex-col h-full gap-4 font-sans">
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
                  Batch : ({finalData.batches?.batch.attributes.description}) |{' '}
                  {format(
                    parseISO(
                      finalData.batches?.batch.attributes.committed_at || '',
                    ),
                    'M/d/yyyy',
                  )}
                </span>
                <div>
                  {!isEmpty(finalData.synchedBatches) ? (
                    <span className="text-slate-500 font-normal text-sm">
                      {`Synched Planning Center to QuicBooks Online | Last synched at ${format(
                        parseISO(finalData.synchedBatches.createdAt),
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
              {/* Content Header */}
              <div className="">
                <span className="font-normal text-2xl">Batch Summary</span>
                <div className="border-[1px] flex justify-between p-8 mt-2 rounded-lg">
                  <div className="flex flex-col gap-2">
                    <p>Total Amount</p>
                    <p className="font-light text-slate-500">
                      {formatUsd(
                        String(finalData.batches?.batch.attributes.total_cents),
                      )}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <p>No. Of Donations</p>
                    <p className="font-light text-slate-500 text-center">
                      {finalData.batches?.donations.length}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <p>Batch Created Date</p>
                    <p className="font-light text-slate-500">
                      {format(
                        parseISO(
                          finalData.batches?.batch.attributes.created_at || '',
                        ),
                        'M/d/yyyy',
                      )}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <p>Batch Committed Date</p>
                    <p className="font-light text-slate-500">
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
                <Table.Head>
                  <Table.HeadCell>Date</Table.HeadCell>
                  <Table.HeadCell>Amount</Table.HeadCell>
                  <Table.HeadCell>Donor</Table.HeadCell>
                  <Table.HeadCell>Fund</Table.HeadCell>
                  <Table.HeadCell>Payment Method</Table.HeadCell>
                </Table.Head>
                <Table.Body className="divide-y">
                  {finalData.batches?.donations.map((item) => (
                    <Table.Row
                      className="bg-white dark:border-gray-700 dark:bg-gray-800"
                      key={item.donation.id}
                    >
                      <Table.Cell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
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
                      <Table.Cell>Anonymous</Table.Cell>
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
