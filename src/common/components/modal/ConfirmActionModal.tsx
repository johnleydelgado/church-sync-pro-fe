// ConfirmActionModal.tsx
import React, { FC, Fragment, useMemo } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Button } from '@material-tailwind/react'
import { useDispatch, useSelector } from 'react-redux'
import { CLOSE_MODAL } from '@/redux/common'
import { RootState } from '@/redux/store'

interface ConfirmActionModalProps {
  modalName: string // The MODALS_NAME identifier that toggles this modal
  title: string
  body: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void // Callback that runs the destructive action on confirm
}

const ConfirmActionModal: FC<ConfirmActionModalProps> = ({
  modalName,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
}) => {
  const dispatch = useDispatch()
  const openModals = useSelector((state: RootState) => state.common.openModals)

  const handleCloseModals = () => {
    dispatch(CLOSE_MODAL(modalName))
  }

  const isOpen = useMemo(
    () => openModals.includes(modalName),
    [openModals, modalName],
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
                  {title}
                </Dialog.Title>

                <p className="text-gray-500 mt-4">{body}</p>

                <div className="mt-6 flex gap-4">
                  <Button
                    className="w-full bg-gray-300 text-gray-700 font-semibold py-2 rounded-md hover:bg-gray-400 transition duration-300"
                    onClick={handleCloseModals}
                  >
                    {cancelLabel}
                  </Button>
                  <Button
                    className="w-full bg-red-600 text-white font-semibold py-2 rounded-md hover:bg-red-700 transition duration-300"
                    onClick={() => {
                      onConfirm()
                      handleCloseModals()
                    }}
                  >
                    {confirmLabel}
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

export default ConfirmActionModal
