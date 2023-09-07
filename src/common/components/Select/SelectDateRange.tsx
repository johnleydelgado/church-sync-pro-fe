/* eslint-disable no-empty-pattern */
import { setSelectedTransactionDate } from '@/redux/common'
import { RootState } from '@/redux/store'
import { format, getMonth, getYear } from 'date-fns'
import { range } from 'lodash'
import React, { FC, useEffect, useState } from 'react'
import ReactDatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { useSelector } from 'react-redux'
import { useDispatch } from 'react-redux'

// import { setDateStartEnd } from '~/redux/common'

interface SelectDateRangeProps {}

const SelectDateRange: FC<SelectDateRangeProps> = ({}) => {
  const dispatch = useDispatch()
  const { selectedTransactionDate } = useSelector(
    (state: RootState) => state.common,
  )

  const years = range(1990, getYear(new Date()) + 1, 1)
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  const Input = ({
    onChange,
    placeholder,
    value,
    isSecure,
    id,
    onClick,
  }: {
    onChange?: any
    placeholder?: string
    value?: any
    isSecure?: boolean
    id?: number
    onClick?: any
  }) => (
    <input
      onChange={onChange}
      placeholder="Select synched date"
      value={value}
      onClick={onClick}
      className="bg-gray-100 rounded-xl p-2 w-60 items-center flex justify-center"
    />
  )

  const onChangeDataHandler = (date: any) => {
    // const formatStartDate = format(date[0] || new Date(), 'yyyy-MM-dd')
    // const formatEndDate = format(date[1] || new Date(), 'yyyy-MM-dd')
    dispatch(
      setSelectedTransactionDate({
        startDate: date[0],
        endDate: date[1],
      }),
    )
  }

  console.log('selectedTransactionDate', selectedTransactionDate)

  return (
    <ReactDatePicker
      selectsRange
      startDate={
        selectedTransactionDate?.startDate
          ? new Date(selectedTransactionDate?.startDate)
          : null
      }
      endDate={
        selectedTransactionDate?.endDate
          ? new Date(selectedTransactionDate?.endDate)
          : null
      }
      onChange={(update: any) => {
        onChangeDataHandler(update)
      }}
      customInput={<Input />}
      isClearable
      renderCustomHeader={({
        date,
        changeYear,
        changeMonth,
        decreaseMonth,
        increaseMonth,
        prevMonthButtonDisabled,
        nextMonthButtonDisabled,
      }) => (
        <div
          style={{
            margin: 10,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {/* <button onClick={decreaseMonth} disabled={prevMonthButtonDisabled}>
            {"<"}
          </button> */}
          <select
            value={getYear(date)}
            onChange={({ target: { value } }) => changeYear(Number(value))}
            className="p-2 bg-white rounded-md m-1"
          >
            {years.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={months[getMonth(date)]}
            className="p-2 bg-white rounded-md m-1"
            onChange={({ target: { value } }) =>
              changeMonth(months.indexOf(value))
            }
          >
            {months.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          {/* <button onClick={increaseMonth} disabled={nextMonthButtonDisabled}>
            {">"}
          </button> */}
        </div>
      )}
    />
  )
}

export default SelectDateRange
