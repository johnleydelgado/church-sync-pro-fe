import { formatDate } from '@/common/utils/helper'
import React, { FC } from 'react'

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
  return (
    <div className="relative overflow-x-auto pt-8">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700">
          <tr className="[&>*]:px-6 [&>*]:py-3">
            <th scope="col" className="">
              Email
            </th>
            <th scope="col" className="">
              Confirmation Status
            </th>
            <th scope="col" className="flex justify-end">
              Date of Invitation
            </th>
          </tr>
        </thead>
        <tbody className="[&>*]:h-20 text-left">
          {data?.map((item, index) => (
            <tr
              className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 [&>*]:px-6 [&>*]:py-4"
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
                <div className="h-10 flex justify-end">
                  {formatDate(item.createdAt)}
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
