import React, { FC } from 'react'
import { formatDate, formatUsd } from '@/common/utils/helper'
import { isEmpty } from 'lodash'
import { AiOutlineSync } from 'react-icons/ai'
import { HiCheckCircle } from 'react-icons/hi'
import { Link } from 'react-router-dom'
import Empty from '@/common/components/empty/Empty'
import usePagination from '@/common/hooks/usePagination'
import Pagination from '@/common/components/pagination/Pagination'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'

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
}

interface BatchTableProps {
  data: BatchesAndSyncProps | undefined
  triggerSync: (params: {
    dataBatch: any
    batchId: string
    batchName: string
  }) => Promise<void>
  batchSyncing: any
}

const BatchTable: FC<BatchTableProps> = ({
  data,
  triggerSync,
  batchSyncing,
}) => {
  const {
    currentPageData,
    totalItems,
    setCurrentPage,
    currentPage,
    itemPerPage,
  } = usePagination({ filteredData: data, itemPerPage: 5 })
  const { user } = useSelector((state: RootState) => state.common)
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)

  const email =
    user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
  const finalData = currentPageData
  // extract the logic to a separate function
  const getSyncIconClassName = (batchSyncing: any, batchId: string) => {
    // Return early if batchSyncing is not an array or has less than 2 elements
    if (!Array.isArray(batchSyncing) || batchSyncing.length <= 1) {
      return 'text-slate-400 cursor-pointer'
    }

    // Find the batch object in the array
    const batchObj = batchSyncing.find(
      (bc: { realBatchId: string }) => bc.realBatchId === batchId,
    )

    // Set class name depending on the `trigger` property of the batch object
    const animateClass = batchObj?.trigger ? 'animate-spin' : 'animate-none'

    return `text-slate-400 cursor-pointer ${animateClass}`
  }

  const isButtonDisabled = (batchSyncing: any, batchId: string) => {
    // Return false if batchSyncing is not an array or has less than 2 elements
    if (!Array.isArray(batchSyncing) || batchSyncing.length <= 1) {
      return false
    }

    // Find the batch object in the array
    const batchObj = batchSyncing.find(
      (bc: { batchId: string }) => bc.batchId === batchId,
    )

    // Return the value of `trigger` property of the batch object
    return batchObj?.trigger ? true : false
  }

  console.log('datadata', finalData)

  return !isEmpty(finalData) ? (
    <div className="relative overflow-x-auto pt-8">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-[#FAB400] uppercase bg-white dark:bg-gray-700 border-y-2 border-[#FAB400]">
          <tr className="[&>*]:px-6 [&>*]:py-3">
            <th scope="col" className="">
              Batch Date
            </th>
            <th scope="col" className="">
              Batch Number
            </th>
            <th scope="col" className="">
              Net deposit
            </th>
            <th scope="col" className="">
              Number of debits
            </th>
            <th scope="col" className="">
              Committed Date
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
          {!isEmpty(finalData)
            ? finalData.map(
                (
                  item: { batch: batchDataProps; donations: any },
                  index: number,
                ) => (
                  <tr
                    className={`${
                      index % 2 === 0
                        ? 'bg-gray-50 dark:bg-gray-800'
                        : 'bg-white dark:bg-gray-900'
                    } border-b border-[#FAB400] dark:border-gray-700 [&>*]:px-6 [&>*]:py-4`}
                    key={item.batch.id}
                  >
                    <td className="">
                      <div className="h-10">
                        <p className="p-2 text-left">
                          {formatDate(item.batch.attributes.created_at)}
                        </p>
                      </div>
                    </td>
                    <td className="">
                      <div className="h-10">
                        <p className="p-2 text-left">{item.batch.id}</p>
                      </div>
                    </td>
                    <td className="">
                      <div className="h-10">
                        <p className="p-2 text-left">
                          {formatUsd(String(item.batch.attributes.total_cents))}
                        </p>
                      </div>
                    </td>
                    <td className="">
                      <div className="h-10">
                        <p className="p-2 text-left">
                          {item.donations.data?.length || 0}
                        </p>
                      </div>
                    </td>
                    <td className="">
                      <div className="h-10">
                        <p className="p-2 text-left">
                          {formatDate(item.batch.attributes.committed_at)}
                        </p>
                      </div>
                    </td>
                    <td className="">
                      <div className="flex h-10 justify-end">
                        {isEmpty(
                          data?.synchedBatches.find(
                            (el) =>
                              el.batchId === `${item.batch.id} - ${email}`,
                          ),
                        ) ? (
                          <button
                            onClick={() =>
                              triggerSync({
                                dataBatch: item.batch,
                                batchId: item.batch.id,
                                batchName:
                                  item.batch.attributes.description || '',
                              })
                            }
                            disabled={isButtonDisabled(
                              batchSyncing,
                              item.batch.id,
                            )}
                          >
                            <AiOutlineSync
                              className={getSyncIconClassName(
                                batchSyncing,
                                `${item.batch.id} - ${email}`,
                              )}
                              size={28}
                            />
                          </button>
                        ) : (
                          <HiCheckCircle className="text-[#FAB400]" size={32} />
                        )}
                      </div>
                    </td>
                    <td className="">
                      <div className="h-10 lg:text-center xl:text-right">
                        <Link
                          className="p-2 underline text-[#FAB400] font-semibold"
                          to={`/transaction/view-page/${item.batch.id}`}
                        >
                          View Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ),
              )
            : null}
        </tbody>
      </table>
      {Math.ceil(totalItems / itemPerPage) > 1 ? (
        <div className="flex flex-1 flex-col items-end justify-end p-6">
          <Pagination
            currentPage={currentPage}
            onPageChange={(val) => setCurrentPage(val)}
            totalPages={Math.ceil(totalItems / itemPerPage)}
            itemPerPage={itemPerPage}
          />
        </div>
      ) : null}
    </div>
  ) : (
    <Empty />
  )
}

export default BatchTable
