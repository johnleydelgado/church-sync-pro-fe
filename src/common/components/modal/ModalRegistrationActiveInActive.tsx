import {
  getUserRelated,
  qboRegistrationSettings,
  updateRegisterSettings,
} from '@/common/api/user'
import { MODALS_NAME } from '@/common/constant/modal'
import { CLOSE_MODAL } from '@/redux/common'
import { RootState } from '@/redux/store'
import { Dialog, Transition } from '@headlessui/react'

import React, { FC, Fragment, useEffect, useMemo } from 'react'
import { useMutation, useQuery } from 'react-query'
import { useDispatch } from 'react-redux'
import { useSelector } from 'react-redux'
import Loading from '../loading/Loading'

interface ModalRegistrationProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
  name?: string | null
  isActive?: boolean | null
  registrationSettings: qboRegistrationSettings[] | null
  setSelectRegName: any
}

const ModalRegistrationActiveInActive: FC<ModalRegistrationProps> = ({
  size,
  name,
  isActive,
  registrationSettings,
  setSelectRegName,
}) => {
  const dispatch = useDispatch()
  const openModals = useSelector((state: RootState) => state.common.openModals)
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const user = useSelector((item: RootState) => item.common.user)
  const reTriggerIsUserTokens = useSelector(
    (item: RootState) => item.common.reTriggerIsUserTokens,
  )

  const { data: userData, refetch } = useQuery(
    ['getUserRelatedSettings', reTriggerIsUserTokens, bookkeeper],
    async () => {
      const emailF =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      if (emailF) {
        const res = await getUserRelated(emailF)
        return res.data
      }
    },
    { staleTime: Infinity },
  )

  const handleCloseModals = () => {
    dispatch(CLOSE_MODAL(MODALS_NAME.registrationActiveInActive))
  }

  const {
    mutate,
    isLoading: isSavingSettings,
    isSuccess,
  } = useMutation<
    unknown,
    unknown,
    {
      data: qboRegistrationSettings[] | null
      email: string
    }
  >(updateRegisterSettings)
  const isOpen = useMemo(() => {
    return openModals.includes(MODALS_NAME.registrationActiveInActive)
  }, [openModals])

  const handlerSubmit = () => {
    const email =
      user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
    mutate({ data: registrationSettings, email })
    handleCloseModals()
    setSelectRegName(null)
  }

  useEffect(() => {
    if (isSuccess) {
      // handleCloseModals()
      refetch()
    }
  }, [isSuccess])

  const renderWarningMessage = () => {
    if (!isActive) {
      return (
        <>
          <br />
          <br />
          <p className="text-red-600">
            Please note that all related donations and transactions will no
            longer be displayed for this registration.
          </p>
        </>
      )
    }
    return null
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-10"
        onClose={() => handleCloseModals()}
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
              enterTo="opacity-100 scale-125"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title className="text-md font-semibold leading-6 text-gray-600 text-center">
                  {`Do You Want to ${
                    isActive ? 'Activate' : 'Deactivate'
                  } This Registration for “${name}” ?`}
                  {renderWarningMessage()}
                </Dialog.Title>

                <div className="mt-8 flex gap-4 justify-center">
                  <button
                    type="button"
                    className="justify-center rounded-md border border-transparent bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 w-20"
                    onClick={() => handleCloseModals()}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="justify-center rounded-md border border-transparent bg-green-400 text-sm font-semibold text-white hover:bg-green-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 w-20"
                    onClick={() => handlerSubmit()}
                  >
                    {isSavingSettings ? <Loading /> : 'Proceed'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default ModalRegistrationActiveInActive
