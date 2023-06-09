import React, { FC } from 'react'
import { BatchesProps } from '..'
import { formatDate, formatUsd } from '@/common/utils/helper'
import { isEmpty } from 'lodash'
import { AiOutlineSync } from 'react-icons/ai'
import { HiCheckCircle } from 'react-icons/hi'
import { Link } from 'react-router-dom'
import Stripe from 'stripe'
import { useQuery } from 'react-query'
import { RootState } from '@/redux/store'
import { pcGetBatches } from '@/common/api/planning-center'
import { useSelector } from 'react-redux'
import { string } from 'yup'
import { getUnixTime } from 'date-fns'
import Empty from '@/common/components/empty/Empty'

interface BatchTableProps {
  data: Stripe.Charge[] | undefined
  triggerSync: (params: {
    stripeData: any
    payoutDate: string
  }) => Promise<void>
  batchSyncing: any
}

const StripePayoutTable: FC<BatchTableProps> = ({
  data,
  triggerSync,
  batchSyncing,
}) => {
  const { user } = useSelector((state: RootState) => state.common)
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)

  const { data: dataBatches } = useQuery<{
    batches: [{ donations: [] }]
    synchedBatches: [{ batchId: string }]
  }>(
    ['getBatches'], // Same query key as in the first page
    async () => {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      if (email) return await pcGetBatches(email)
    },
    {
      staleTime: Infinity, // The data will be considered fresh indefinitely
    },
  )

  const isSync = (date: string): boolean => {
    const arr = dataBatches?.synchedBatches

    if (arr?.length) {
      const arrDates = arr.reduce((dates: string[], item) => {
        const regex = /(\d{1,2}\/\d{1,2}\/\d{4})/ // Match a date in MM/DD/YYYY format
        const match = item.batchId.match(regex)

        if (match && match[1]) {
          const date = match[1]
          dates.push(date)
        }

        return dates
      }, [])
      return arrDates.includes(date)
    }
    return false
  }

  return !isEmpty(data) ? (
    <div className="relative overflow-x-auto pt-8">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700">
          <tr className="[&>*]:px-6 [&>*]:py-3">
            <th scope="col" className="">
              Stripe payout amount
            </th>
            <th scope="col" className="">
              Non-Giving income
            </th>
            <th scope="col" className="">
              Fees
            </th>
            <th scope="col" className="">
              Net Income:
            </th>
            <th scope="col" className="">
              Payout Date
            </th>
            <th scope="col" className="text-right">
              Status
            </th>
            <th scope="col" className="text-right">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="[&>*]:h-20 text-left">
          {!isEmpty(data)
            ? data?.map((item: any) => (
                <tr
                  className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 [&>*]:px-6 [&>*]:py-4"
                  key={item.payoutDate}
                >
                  <td className="">
                    <div className="h-10">
                      <p className="p-2 text-left">
                        {formatUsd(String(item.grossAmount))}
                      </p>
                    </div>
                  </td>
                  <td className="">
                    <div className="h-10">
                      <p className="p-2 text-left">
                        {formatUsd(String(item.nonGivingIncome))}
                      </p>
                    </div>
                  </td>
                  <td className="">
                    <div className="h-10">
                      <p className="p-2 text-left">
                        {formatUsd(String(item.totalFees) || '')}
                      </p>
                    </div>
                  </td>
                  <td className="">
                    <div className="h-10">
                      <p className="p-2 text-left">
                        {formatUsd(String(item.net) || '')}
                      </p>
                    </div>
                  </td>
                  <td className="">
                    <div className="h-10">
                      <p className="p-2 text-left">{item.payoutDate}</p>
                    </div>
                  </td>

                  <td className="">
                    <div className="flex h-10 justify-end">
                      {isSync(item.payoutDate) ? (
                        <HiCheckCircle className="text-green-500" size={32} />
                      ) : (
                        <button
                          className="mr-2"
                          onClick={() =>
                            triggerSync({
                              stripeData: item.data,
                              payoutDate: item.payoutDate,
                            })
                          }
                        >
                          <AiOutlineSync
                            className={`text-slate-400 cursor-pointer ${
                              batchSyncing.find(
                                (bc: { batchId: string }) =>
                                  bc.batchId === item.payoutDate,
                              )?.trigger
                                ? 'animate-spin'
                                : 'animate-none'
                            }`}
                            size={28}
                          />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="">
                    <div className="h-10 lg:text-center xl:text-right">
                      <Link
                        className="p-2 underline text-green-600"
                        to={`/transaction/view-page-stripe/${getUnixTime(
                          new Date(item.payoutDate),
                        )}`}
                      >
                        View Details
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            : null}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty />
  )
}

export default StripePayoutTable
