import { MODALS_NAME } from '@/common/constant/modal'
import { mainRoute } from '@/common/constant/route'
import { CLOSE_MODAL, setIsQuickStartHide } from '@/redux/common'
import { RootState } from '@/redux/store'
import { Dialog, Transition } from '@headlessui/react'

import React, { FC, Fragment, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router'

interface ModalProps {}

const HideQuickGuideModal: FC<ModalProps> = () => {
  const dispatch = useDispatch()
  const openModals = useSelector((state: RootState) => state.common.openModals)
  const navigate = useNavigate()

  const handleCloseModals = () => {
    dispatch(CLOSE_MODAL(MODALS_NAME.hideQuickGuideModal))
  }

  const isOpen = useMemo(() => {
    return openModals.includes(MODALS_NAME.hideQuickGuideModal)
  }, [openModals])

  const handlerSubmit = () => {
    dispatch(setIsQuickStartHide(true))
    handleCloseModals()
    navigate(mainRoute.TRANSACTION)
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
                  Are you sure you want to hide the Quick Guide?
                </Dialog.Title>
                <div className="text-xs text-gray-400 text-center px-5">
                  <p>
                    This action can be undone by deselecting the &quot;Disable
                    quick start&quot; option in the Settings &gt; Account &gt;
                    Quick start settings.
                  </p>
                </div>

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
                    Proceed
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

export default HideQuickGuideModal
