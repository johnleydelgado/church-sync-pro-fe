import { pcGetFunds } from '@/common/api/planning-center'
import Loading from '@/common/components/loading/Loading'
import MainLayout from '@/common/components/main-layout/MainLayout'
import React, { FC, useEffect, useState } from 'react'
import { useQuery } from 'react-query'
import { useSelector } from 'react-redux'
import DateRangePicker from '@wojtekmaj/react-daterange-picker'

import { RootState } from '../../../redux/store'
import '@wojtekmaj/react-daterange-picker/dist/DateRangePicker.css'
import 'react-calendar/dist/Calendar.css'
import Item from './component/Item'
import DroppableCategory from './component/DroppableCategory'

interface AttributesProps {
  color: string
  created_at: string
  default: boolean
  deletable: string
  description: string
  ledger_code: null
  name: string
  updated_at: string
  visibility: string
}

export interface FundProps {
  attributes: AttributesProps
  links: { self: string }
  type: string
  isClick: boolean
  project: string | ''
  description: string | ''
}

interface DashboardProps {}

const Dashboard: FC<DashboardProps> = () => {
  const [value, setValue] = useState([new Date(), new Date()])

  const { data, isLoading } = useQuery<FundProps[]>(['getFunds'], async () => {
    return await pcGetFunds({
      refresh_token: thirdPartyTokens?.PlanningCenter,
    })
  })

  const [modifiedData, setModifiedData] = useState<FundProps[] | null>(null)

  const { thirdPartyTokens } = useSelector((state: RootState) => state.common)

  const handleDateChange = (newValue: string | Date) => {
    if (
      Array.isArray(newValue) &&
      newValue.every((item) => item instanceof Date)
    ) {
      setValue(newValue)
    }
  }

  const handleDrop = (name: string) => {
    console.log(`Dropped ${name}`)
  }

  useEffect(() => {
    if (data) {
      const newData = data.map((item: FundProps) => ({
        ...item,
        isClick: false,
      }))

      setModifiedData(newData)
    }
  }, [data])

  return (
    <MainLayout>
      {isLoading ? (
        <Loading />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-1 h-full gap-4">
          <div className="rounded-lg p-4 bg-white  sm:col-span-2  md:col-span-1">
            <p>PCO Fields</p>
            <div className="flex flex-col gap-4 pt-4">
              {modifiedData?.map((item, index) => (
                <Item
                  data={item}
                  index={index}
                  modifiedData={modifiedData}
                  setModifiedData={setModifiedData}
                  key={Math.random()}
                />
              ))}
            </div>
          </div>
          <div className="rounded-lg p-8 bg-white  sm:col-span-2 md:col-span-3">
            <div className="justify-between flex">
              <span className="font-medium text-2xl">
                Create your Transaction
              </span>
              <DateRangePicker onChange={handleDateChange} value={value} />
            </div>
            {/* Table */}
            <div className="relative overflow-x-auto pt-8">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700">
                  <tr className="[&>*]:px-6 [&>*]:py-3">
                    <th scope="col" className="">
                      Project
                    </th>
                    <th scope="col" className="">
                      Category
                    </th>
                    <th scope="col" className="">
                      Description
                    </th>
                    <th scope="col" className="">
                      Payment Method
                    </th>
                    <th scope="col" className="">
                      Ref
                    </th>
                    <th scope="col" className="">
                      Amount
                    </th>
                    <th scope="col" className="text-right">
                      Class
                    </th>
                  </tr>
                </thead>
                <tbody className="[&>*]:h-20">
                  <DroppableCategory onDrop={handleDrop} />
                  <DroppableCategory onDrop={handleDrop} />
                  <DroppableCategory onDrop={handleDrop} />
                  <DroppableCategory onDrop={handleDrop} />
                  <DroppableCategory onDrop={handleDrop} />
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}

export default Dashboard
