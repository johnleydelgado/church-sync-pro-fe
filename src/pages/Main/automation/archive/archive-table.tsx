import React, { FC } from 'react'
import { Archive } from './hooks/useGetDeactivatedMapping'
import { BiArchiveOut } from 'react-icons/bi'
import { Typography } from '@material-tailwind/react'
import Empty from '@/common/components/empty/Empty'
import { UserSettingsProps } from '@/common/constant/interfaces'
import colors from '@/common/constant/colors'

interface ArchiveTableProps {
  archives: Archive[]
  type: 'stripe' | 'batch'
  activateRegistrationHandler: (
    registration: string,
    type: 'stripe' | 'batch',
  ) => void
}

const ArchiveTable: FC<ArchiveTableProps> = ({
  archives,
  type,
  activateRegistrationHandler,
}) => {
  if (!archives.some((item) => item.category === type)) {
    return <Empty />
  }

  return (
    <div className="relative overflow-x-auto pt-8">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-yellow uppercase bg-white dark:bg-gray-700 border-y-2 border-yellow">
          <tr className="[&>*]:px-6 [&>*]:py-3">
            <th scope="col" className="">
              Name
            </th>
            <th scope="col" className="">
              Date
            </th>
            <th scope="col" className="text-right">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="[&>*]:h-20 text-left">
          {archives
            .filter((item) => item.category === type)
            .map((item, index) => (
              <tr
                className={`bg-white dark:bg-gray-900 border-b border-yellow dark:border-gray-700`}
                key={index}
              >
                <td className="">
                  <Typography className="p-2 text-left">{item.name}</Typography>
                </td>

                <td className="">
                  <Typography className="p-2 text-left">{item.name}</Typography>
                </td>

                <td className="">
                  <div className="flex justify-end">
                    <button
                      className="flex flex-col gap-2 items-center"
                      onClick={() =>
                        activateRegistrationHandler(item.name, type)
                      }
                    >
                      <BiArchiveOut size={22} color={colors.secondaryYellow} />
                      <Typography>Activate</Typography>
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

export default ArchiveTable
