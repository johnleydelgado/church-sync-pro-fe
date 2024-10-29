import React, { FC, useEffect, useState } from 'react'
import { BatchesProps } from '..'
import { formatDate, formatUsd } from '@/common/utils/helper'
import { isEmpty } from 'lodash'
import { AiOutlineSync } from 'react-icons/ai'
import { HiCheckCircle } from 'react-icons/hi'
import { Link } from 'react-router-dom'
import Stripe from 'stripe'
import { useQuery } from 'react-query'
import { RootState } from '@/redux/store'
import { useSelector } from 'react-redux'
import { string } from 'yup'
import { getUnixTime } from 'date-fns'
import Empty from '@/common/components/empty/Empty'
import { usePagination } from '@/common/context/PaginationProvider'
import usePaginationStripe from '@/common/hooks/usePaginationStripe'
import PaginationStripe from '@/common/components/pagination/PaginationStripe'
import Loading from '@/common/components/loading/Loading'
import { useDispatch } from 'react-redux'
import { setStripeCurrentPage } from '@/redux/common'

interface BatchTableProps {
  triggerSync: (params: {
    stripeData: any
    payoutDate: string
  }) => Promise<void>
  batchSyncing: any
  amount: number
}

const StripePayoutTable: FC<BatchTableProps> = ({
  triggerSync,
  batchSyncing,
  amount,
}) => {
  const { isLoading, isRefetching, totalItems, setAmount } =
    usePaginationStripe()
  const { synchedBatches, refetch } = usePagination()
  const dispatch = useDispatch()
  const currentPageData = useSelector(
    (state: RootState) => state.common.stripeCurrentData,
  )

  const currentPage = useSelector(
    (state: RootState) => state.common.stripeCurrentPage || 1,
  )

  const isSync = (date: string): boolean => {
    const arr = synchedBatches
    if (arr?.length) {
      const arrDates = arr.reduce(
        (dates: string[], item: { batchId: string }) => {
          const regex = /(\d{1,2}\/\d{1,2}\/\d{4})/ // Match a date in MM/DD/YYYY format
          const match = item.batchId.match(regex)
          if (match && match[1]) {
            const date = match[1]
            dates.push(date)
          }

          return dates
        },
        [],
      )
      return arrDates.includes(date)
    }
    return false
  }

  const syncHandler = async (item: { data: any; payoutDate: any }) => {
    await triggerSync({
      stripeData: item.data,
      payoutDate: item?.payoutDate,
    })
    // refetch()
  }

  useEffect(() => {
    if (amount) {
      setAmount(amount)
    } else {
      setAmount(0)
    }
  }, [amount])

  console.log('totalItems', totalItems)

  return isLoading || isRefetching ? (
    <Loading />
  ) : !isEmpty(currentPageData) ? (
    <div className="relative overflow-x-auto pt-8">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-yellow uppercase bg-white dark:bg-gray-700 border-y-2 border-yellow">
          <tr className="[&>*]:px-6 [&>*]:py-3">
            <th scope="col" className="">
              Payout date
            </th>
            <th scope="col" className="">
              Payout amount
            </th>
            <th scope="col" className="">
              Non-Giving income
            </th>
            <th scope="col" className="">
              Fees
            </th>
            <th scope="col" className="">
              Net income
            </th>
            <th scope="col" className="text-right">
              Status
            </th>
            <th scope="col" className="text-right">
              Information
            </th>
          </tr>
        </thead>
        <tbody className="[&>*]:h-20 text-left">
          {!isEmpty(currentPageData)
            ? currentPageData?.map((item: any, index: number) => (
                <tr
                  className={`${
                    index % 2 === 0
                      ? 'bg-gray-50 dark:bg-gray-800'
                      : 'bg-white dark:bg-gray-900'
                  } border-b border-yellow dark:border-gray-700 [&>*]:px-6 [&>*]:py-4`}
                  key={item.payoutDate}
                >
                  <td className="">
                    <div className="h-10">
                      <p className="p-2 text-left">
                        {item.payoutDate}
                        {/* {formatUsd(String(item.grossAmount))} */}
                      </p>
                    </div>
                  </td>
                  <td className="">
                    <div className="h-10">
                      <p className="p-2 text-left">
                        {formatUsd(String(item.grossAmount))}
                        {/* {formatUsd(String(item.nonGivingIncome))} */}
                      </p>
                    </div>
                  </td>
                  <td className="">
                    <div className="h-10">
                      <p className="p-2 text-left">
                        {formatUsd(String(item.nonGivingIncome))}
                        {/* {formatUsd(String(item.totalFees) || '')} */}
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
                    <div className="flex h-10 justify-end">
                      {isSync(item.payoutDate) ? (
                        <HiCheckCircle className="text-yellow" size={32} />
                      ) : (
                        <button
                          className="mr-2"
                          onClick={() => syncHandler(item)}
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
                        className="p-2 underline text-yellow font-semibold"
                        to={`/transaction/view-page-stripe/${getUnixTime(
                          item.payoutDate
                            ? new Date(item.payoutDate)
                            : new Date(),
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
      <div className="flex flex-1 flex-col items-end justify-end p-6">
        <PaginationStripe
          currentPage={currentPage}
          onPageChange={(val: any) => dispatch(setStripeCurrentPage(val))}
          totalPages={Math.ceil(totalItems / 10)}
          itemPerPage={10}
        />
      </div>
      {/* {Math.ceil(totalItems / 10) > 1 ? (
        <div className="flex flex-1 flex-col items-end justify-end p-6">
          <PaginationStripe
            currentPage={currentPage}
            onPageChange={(val: any) => setCurrentPage(val)}
            totalPages={Math.ceil(totalItems / 10)}
            itemPerPage={10}
          />
        </div> 
      ) : null}*/}
    </div>
  ) : (
    <Empty />
  )
}

export default StripePayoutTable
