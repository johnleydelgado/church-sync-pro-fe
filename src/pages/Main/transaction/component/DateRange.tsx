import { usePagination } from '@/common/context/PaginationProvider'
import { setDateRangeTransaction, setStripeCurrentPage } from '@/redux/common'
import { RootState } from '@/redux/store'
import { isEmpty } from 'lodash'
import React, { FC, useEffect } from 'react'
import DatePicker from 'react-datepicker'
import { useSelector } from 'react-redux'
import { useDispatch } from 'react-redux'
import Dropdown, { components } from 'react-select'

interface DateRangeProps {
  type: 'batch' | 'stripe'
}
const Input = (props: any) => (
  <components.Input
    {...props}
    inputClassName="outline-none border-none shadow-none focus:ring-transparent"
  />
)

const customStyles = {
  control: (base: any, state: any) => ({
    ...base,
    background: 'white',
    // match with the menu
    borderRadius: 12,
    // Overwrittes the different states of border
    borderColor: state.isFocused ? '' : 'grey',
    // Removes weird border around container
    boxShadow: state.isFocused ? null : null,
    '&:hover': {
      // Overwrittes the different states of border
      borderColor: state.isFocused ? '' : 'white',
    },
  }),
  valueContainer: (base: any) => ({
    ...base,
    // paddingLeft: 32,
  }),
  menu: (base: any) => ({
    ...base,
    // override border radius to match the box
    borderRadius: 0,
    // kill the gap
    marginTop: 0,
    backgroundColor: 'white',
  }),
  menuList: (base: any, state: any) => ({
    ...base,
    backgroundColor: 'white',
    // kill the white space on first and last option
    padding: 0,
  }),
  singleValue: (base: any, state: any) => ({
    ...base,
    color: 'grey',
  }),
  placeholder: (base: any) => ({
    ...base,
    paddingLeft: 32,
  }),
}

const DateRange: FC<DateRangeProps> = ({ type }) => {
  const dispatch = useDispatch()
  const dateRangeTransaction = useSelector(
    (state: RootState) => state.common.dateRangeTransaction,
  )

  const { setOffset, setCurrentPage } = usePagination()
  const options = [
    { value: 'This Month', label: 'This Month' },
    { value: 'Last Month', label: 'Last Month' },
    { value: 'Last 7 Days', label: 'Last 7 Days' },
    { value: 'Last 30 Days', label: 'Last 30 Days' },
    { value: 'Last 3 Months', label: 'Last 3 Months' },
    { value: 'Last 6 Months', label: 'Last 6 Months' },
    { value: '2024', label: '2024' },
    { value: '2023', label: '2023' },
    { value: '2022', label: '2022' },
    { value: '2021', label: '2021' },
    { value: '2020', label: '2020' },
    { value: '2019', label: '2019' },
    { value: '2018', label: '2018' },
    { value: 'Custom', label: 'Custom' },
  ]

  const handleDateChange = (value: any, dateType: 'startDate' | 'endDate') => {
    setOffset(0)
    setCurrentPage(1)
    dispatch(setStripeCurrentPage(1))
    if (dateRangeTransaction) {
      if (dateType === 'startDate') {
        dispatch(
          setDateRangeTransaction(
            dateRangeTransaction?.map((transaction) =>
              transaction.type === type
                ? { ...transaction, startDate: value }
                : transaction,
            ),
          ),
        )
      } else {
        dispatch(
          setDateRangeTransaction(
            dateRangeTransaction?.map((transaction) =>
              transaction.type === type
                ? { ...transaction, endDate: value }
                : transaction,
            ),
          ),
        )
      }
    }
  }

  const handleDateRangeChange = (value: any) => {
    setOffset(0)
    setCurrentPage(1)
    dispatch(setStripeCurrentPage(1))
    if (dateRangeTransaction) {
      dispatch(
        setDateRangeTransaction(
          dateRangeTransaction?.map((transaction) =>
            transaction.type === type
              ? { ...transaction, dateRange: value }
              : transaction,
          ),
        ),
      )
    }
  }

  const handleClearAll = () => {
    dispatch(setDateRangeTransaction([]))
  }

  useEffect(() => {
    if (dateRangeTransaction) {
      if (dateRangeTransaction?.find((a) => a.type === type)?.type !== type)
        dispatch(
          setDateRangeTransaction([
            ...dateRangeTransaction,
            {
              dateRange: 'This Month',
              isCustom: false,
              startDate: null,
              endDate: null,
              type,
            },
          ]),
        )
    }
  }, [type])

  return (
    <div className="">
      <div className="flex justify-between">
        <p className="font-medium text-lg">FILTERS</p>
        <p
          className="text-yellow-500 underline cursor-pointer"
          onClick={handleClearAll}
        >
          Clear All
        </p>
      </div>
      <div className="border-t-2 pt-4 flex flex-col gap-6">
        <div className="flex flex-col gap-2 w-72">
          <p className="font-bold text-sm text-gray-400">Select Date Range</p>
          <Dropdown<{ value: string; label: string }>
            options={options}
            components={{ Input }}
            styles={customStyles}
            placeholder=" "
            defaultValue={{
              value:
                dateRangeTransaction?.find((a) => a.type === type)?.dateRange ||
                'This Month',
              label:
                dateRangeTransaction?.find((a) => a.type === type)?.dateRange ||
                'This Month',
            }}
            onChange={(e) => handleDateRangeChange(e?.value)}
          />
        </div>

        {!isEmpty(dateRangeTransaction) &&
          dateRangeTransaction?.find((a) => a.type === type)?.dateRange ===
            'Custom' && (
            <div className="flex gap-4">
              <div className="flex flex-col gap-2 ">
                <p className="font-bold text-sm text-gray-400">Start Date</p>
                <DatePicker
                  selected={
                    dateRangeTransaction?.find((a) => a.type === type)
                      ?.startDate
                      ? new Date(
                          dateRangeTransaction?.find((a) => a.type === type)
                            ?.startDate || new Date(),
                        )
                      : new Date()
                  }
                  onChange={(e: any) => handleDateChange(e, 'startDate')}
                  className="rounded-xl border-yellow-300"
                />
              </div>
              <div className="flex flex-col gap-2 ">
                <p className="font-bold text-sm text-gray-400">End Date</p>
                <DatePicker
                  selected={
                    dateRangeTransaction?.find((a) => a.type === type)?.endDate
                      ? new Date(
                          dateRangeTransaction?.find((a) => a.type === type)
                            ?.endDate || new Date(),
                        )
                      : new Date()
                  }
                  onChange={(e: any) => handleDateChange(e, 'endDate')}
                  className="rounded-xl border-yellow-300"
                />
              </div>
            </div>
          )}
      </div>
    </div>
  )
}

export default DateRange
