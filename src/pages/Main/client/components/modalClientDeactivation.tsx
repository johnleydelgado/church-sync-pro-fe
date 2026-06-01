// ConfirmDeactivationModal.tsx
import React, { FC, Fragment, useMemo } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Button } from '@material-tailwind/react'
import { useDispatch, useSelector } from 'react-redux'
import { MODALS_NAME } from '@/common/constant/modal'
import { CLOSE_MODAL } from '@/redux/common'
import { RootState } from '@/redux/store'

interface ConfirmDeactivationModalProps {
  onConfirm: () => void // Callback function to proceed with deactivation
  selectedClient: any // Accept the selected client as a prop
}

const ConfirmDeactivationModal: FC<ConfirmDeactivationModalProps> = ({
  onConfirm,
  selectedClient,
}) => {
  const dispatch = useDispatch()
  const openModals = useSelector((state: RootState) => state.common.openModals)
  const handleCloseModals = () => {
    dispatch(CLOSE_MODAL(MODALS_NAME.modalConfirmDeactivation))
  }

  const isOpen = useMemo(
    () => openModals.includes(MODALS_NAME.modalConfirmDeactivation),
    [openModals],
  )

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={handleCloseModals}>
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
                  className="text-xl font-semibold text-gray-700"
                >
                  Are you sure you want to deactivate this client account?
                </Dialog.Title>

                {/* Display the selected client information */}
                {selectedClient && (
                  <p className="text-gray-500 mt-4">
                    Deactivating account for:{' '}
                    <strong>{selectedClient.name}</strong>
                  </p>
                )}

                <div className="mt-6 flex gap-4">
                  <Button
                    className="w-full bg-gray-300 text-gray-700 font-semibold py-2 rounded-md hover:bg-gray-400 transition duration-300"
                    onClick={handleCloseModals}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="w-full bg-red-600 text-white font-semibold py-2 rounded-md hover:bg-red-700 transition duration-300"
                    onClick={() => {
                      onConfirm()
                      handleCloseModals()
                    }}
                  >
                    Proceed
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default ConfirmDeactivationModal
