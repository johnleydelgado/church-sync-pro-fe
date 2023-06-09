import React, { FC } from 'react'
import { BatchesProps } from '..'
import { formatDate, formatUsd } from '@/common/utils/helper'
import { isEmpty } from 'lodash'
import { AiOutlineSync } from 'react-icons/ai'
import { HiCheckCircle } from 'react-icons/hi'
import { Link } from 'react-router-dom'
import Empty from '@/common/components/empty/Empty'
import usePagination from '@/common/hooks/usePagination'
import Pagination from '@/common/components/pagination/Pagination'

interface BatchTableProps {
  data: BatchesProps | undefined
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

  const finalData = currentPageData

  return !isEmpty(finalData) ? (
    <div className="relative overflow-x-auto pt-8">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700">
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
            ? finalData.map((item: any) => (
                <tr
                  className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 [&>*]:px-6 [&>*]:py-4"
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
                        {formatUsd(item.batch.attributes.total_cents)}
                      </p>
                    </div>
                  </td>
                  <td className="">
                    <div className="h-10">
                      <p className="p-2 text-left">{item.donations?.length}</p>
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
                          (el: any) => el.batchId === item.batch.id,
                        ),
                      ) ? (
                        <button
                          onClick={() =>
                            triggerSync({
                              dataBatch: item.batch,
                              batchId: item.batch.id,
                              batchName: item.batch.attributes.description,
                            })
                          }
                        >
                          <AiOutlineSync
                            className={`text-slate-400 cursor-pointer ${
                              batchSyncing[0].batchId
                                ? batchSyncing.find(
                                    (bc: { batchId: string }) =>
                                      bc.batchId === item.batch.id,
                                  )?.trigger
                                  ? 'animate-spin'
                                  : 'animate-none'
                                : null
                            }`}
                            size={28}
                          />
                        </button>
                      ) : (
                        <HiCheckCircle className="text-green-500" size={32} />
                      )}
                    </div>
                  </td>
                  <td className="">
                    <div className="h-10 lg:text-center xl:text-right">
                      <Link
                        className="p-2 underline text-green-600"
                        to={`/transaction/view-page/${item.batch.id}`}
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
