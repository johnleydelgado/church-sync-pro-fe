/* eslint-disable no-empty-pattern */
import { format, getMonth, getYear } from 'date-fns'
import { range } from 'lodash'
import React, { FC, useEffect, useState } from 'react'
import ReactDatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { useDispatch } from 'react-redux'

// import { setDateStartEnd } from '~/redux/common'

interface SelectDateRangeProps {
  setDateRangeVal: any
  dateRangeVal: any
}

const SelectDateRange: FC<SelectDateRangeProps> = ({
  setDateRangeVal,
  dateRangeVal,
}) => {
  const [dateRange, setDateRange] = useState([
    dateRangeVal.startDate ? new Date(dateRangeVal.startDate) : null,
    dateRangeVal.endDate ? new Date(dateRangeVal.endDate) : null,
  ])
  const [startDate, endDate] = dateRange

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

  useEffect(() => {
    if (startDate && endDate) {
      const formatStartDate = format(startDate || new Date(), 'yyyy-MM-dd')
      const formatEndDate = format(endDate || new Date(), 'yyyy-MM-dd')
      setDateRangeVal({ startDate: formatStartDate, endDate: formatEndDate })
      // dispatch(
      //   setDateStartEnd({ startDate: formatStartDate, endDate: formatEndDate }),
      // )
    }
  }, [startDate, endDate])

  return (
    <ReactDatePicker
      selectsRange
      startDate={startDate}
      endDate={endDate}
      onChange={(update: any) => {
        setDateRange(update)
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
