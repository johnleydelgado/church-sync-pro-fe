import { MODALS_NAME } from '@/common/constant/modal'
import { CLOSE_MODAL } from '@/redux/common'
import { RootState } from '@/redux/store'
import { Dialog, Transition } from '@headlessui/react'

import React, { FC, Fragment } from 'react'
import { useDispatch } from 'react-redux'
import { useSelector } from 'react-redux'

interface ModalRegistrationProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
  handleEventBookkeeper: any
  handleEventClient: any
  disabledOutsideClick?: boolean
}

const ModalRegistration: FC<ModalRegistrationProps> = ({
  size,
  handleEventBookkeeper,
  handleEventClient,
  disabledOutsideClick = false,
}) => {
  const dispatch = useDispatch()
  const openModals = useSelector((state: RootState) => state.common.openModals)
  const handleCloseModals = () => {
    dispatch(CLOSE_MODAL(MODALS_NAME.registration))
    dispatch(CLOSE_MODAL(MODALS_NAME.registrationWithGoogle))
  }

  const handleOpenBK = () => {
    if (openModals.includes(MODALS_NAME.registration)) {
      handleEventBookkeeper()
    }
    handleCloseModals()
  }

  const handleOpenCL = () => {
    if (openModals.includes(MODALS_NAME.registration)) {
      handleEventClient()
    }
    handleCloseModals()
  }

  const isOpen =
    openModals.includes(MODALS_NAME.registration) ||
    openModals.includes(MODALS_NAME.registrationWithGoogle)

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-10"
        onClose={() => {
          if (disabledOutsideClick) {
            return {}
          }
          return handleCloseModals()
        }}
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-xl font-semibold leading-6 text-gray-900"
                >
                  Please select your user type:
                </Dialog.Title>

                <div className="mt-8 flex flex-col gap-4">
                  <button
                    type="button"
                    className="justify-center rounded-md border h-[62px] border-transparent bg-blue-100 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    onClick={handleOpenBK}
                  >
                    Bookkeeper
                  </button>

                  <button
                    type="button"
                    className="justify-center rounded-md border h-[62px] border-transparent bg-green-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    onClick={handleOpenCL}
                  >
                    Client
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

export default ModalRegistration
