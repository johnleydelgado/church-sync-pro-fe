import { sendEmailInvitation } from '@/common/api/user'
import Loading from '@/common/components/loading/Loading'
import CommonTextField from '@/common/components/text-input/CommonTextField'
import { MODALS_NAME } from '@/common/constant/modal'
import { capitalAtFirstLetter } from '@/common/utils/helper'
import { failNotification, successNotification } from '@/common/utils/toast'
import { CLOSE_MODAL, setSelectedStartDate } from '@/redux/common'
import { RootState } from '@/redux/store'
import { Dialog, Transition } from '@headlessui/react'
import { Button } from '@material-tailwind/react'

import React, { FC, Fragment, useState } from 'react'
import { FiUserPlus } from 'react-icons/fi'
import { HiOutlineMail } from 'react-icons/hi'
import { useDispatch } from 'react-redux'
import { useSelector } from 'react-redux'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { range } from 'lodash'
import { getMonth, getYear } from 'date-fns'

interface ModalRegistrationProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
  refetch?: any
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const TransactionDateModal: FC<ModalRegistrationProps> = ({
  size,
  refetch,
}) => {
  const dispatch = useDispatch()
  const [email, setEmail] = useState<string>('')
  const [isSending, setIsSending] = useState<boolean>(false)
  const user = useSelector((state: RootState) => state.common.user)
  const openModals = useSelector((state: RootState) => state.common.openModals)
  const { firstName, lastName } = useSelector(
    (state: RootState) => state.common.user,
  )
  const { selectedStartDate } = useSelector((state: RootState) => state.common)

  const [selectDateIsFocus, setSelectDateIsFocus] = useState<boolean>(false)

  const handleCloseModals = () => {
    dispatch(CLOSE_MODAL(MODALS_NAME.transactionDate))
  }

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

  const isOpen = openModals.includes(MODALS_NAME.transactionDate)

  const handleDateChange = (value: any) => {
    // If you are only interested in single date selections, you could check if value is an instance of Date
    if (value instanceof Date) {
      dispatch(setSelectedStartDate(value))
    }
    // if value is an array, it's a date range. You might want to handle it differently
    else if (Array.isArray(value)) {
      // handle date range
    }
    // if value is null, the date selection was cleared
    else if (value === null) {
      dispatch(setSelectedStartDate(null))
    }
  }

  console.log('fagasdas', isOpen)

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-10"
        onClose={() => console.log('')}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={`w-full max-w-md h-[470px] transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all`}
              >
                <div className="flex flex-col items-center gap-6 pt-2">
                  <div className="flex items-center">
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-semibold leading-6 text-btmColor"
                    >
                      What date would you like to sync ?
                    </Dialog.Title>
                  </div>

                  <div className="flex flex-col gap-2 items-center">
                    <DatePicker
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
                          <button
                            onClick={decreaseMonth}
                            disabled={prevMonthButtonDisabled}
                            className="px-4"
                          >
                            {'<'}
                          </button>
                          <select
                            value={getYear(date)}
                            onChange={({ target: { value } }) =>
                              changeYear(Number(value))
                            }
                          >
                            {years.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>

                          <select
                            value={months[getMonth(date)]}
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

                          <button
                            onClick={increaseMonth}
                            disabled={nextMonthButtonDisabled}
                            className="px-4"
                          >
                            {'>'}
                          </button>
                        </div>
                      )}
                      selected={
                        selectedStartDate ? new Date(selectedStartDate) : null
                      }
                      onChange={handleDateChange}
                      onCalendarOpen={() => setSelectDateIsFocus(true)}
                      placeholderText="Select date here..."
                      className="rounded-xl border-yellow-300"
                      popperPlacement="bottom"
                      inline
                    />

                    <Button
                      className="text-btmColor underline underline-offset-8 text-xl tracking-wider pb-4"
                      onClick={handleCloseModals}
                      variant="text"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default TransactionDateModal
