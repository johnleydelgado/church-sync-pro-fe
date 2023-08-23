import { MODALS_NAME } from '@/common/constant/modal'
import { formatDate } from '@/common/utils/helper'
import { OPEN_MODAL } from '@/redux/common'
import { setDeleteBookkeeper } from '@/redux/nonPersistState'
import React, { FC } from 'react'
import { AiOutlineDelete } from 'react-icons/ai'
import { FiDelete } from 'react-icons/fi'
import { useDispatch } from 'react-redux'

interface Data {
  id: number
  email: string
  inviteAccepted: boolean | null
  createdAt: string
}

interface TableProps {
  data: Data[]
}

const BookkeeperTableList: FC<TableProps> = ({ data }) => {
  const dispatch = useDispatch()
  const openDeleteModal = (id: string, email: string) => {
    dispatch(OPEN_MODAL(MODALS_NAME.deleteBookeeper))
    dispatch(setDeleteBookkeeper({ id, email }))
  }

  return (
    <div className="relative overflow-x-auto pt-8">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-[#FAB400] uppercase bg-white dark:bg-gray-700 border-y-2 border-[#FAB400]">
          <tr className="[&>*]:px-6 [&>*]:py-3">
            <th scope="col" className="">
              Email
            </th>
            <th scope="col" className="">
              Confirmation Status
            </th>
            <th scope="col" className="">
              Date of Invitation
            </th>
            <th scope="col" className="flex justify-end">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="[&>*]:h-20 text-left">
          {data?.map((item, index) => (
            <tr
              className={`${
                index % 2 === 0
                  ? 'bg-gray-50 dark:bg-gray-800'
                  : 'bg-white dark:bg-gray-900'
              } border-b border-[#FAB400] dark:border-gray-700 [&>*]:px-6 [&>*]:py-4`}
              key={item.id}
            >
              <td className="">
                <div className="h-10">{item.email}</div>
              </td>
              <td className="">
                <div className="h-10">
                  {item.inviteAccepted ? (
                    <p className="text-green-500">Accepted</p>
                  ) : (
                    <p className="text-orange-500">Pending</p>
                  )}
                </div>
              </td>
              <td className="">
                <div className="h-10 flex">{formatDate(item.createdAt)}</div>
              </td>
              <td className="">
                <div className="flex justify-end">
                  <button
                    className="group hover:bg-[#FAB400] rounded-2xl p-2"
                    onClick={() => openDeleteModal(String(item.id), item.email)}
                  >
                    <AiOutlineDelete
                      size={20}
                      className={`text-red-600 group-hover:text-white`}
                    />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default BookkeeperTableList
