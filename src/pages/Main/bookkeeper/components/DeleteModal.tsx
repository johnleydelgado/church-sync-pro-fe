import { deleteBookeeper, sendEmailInvitation } from '@/common/api/user'
import Loading from '@/common/components/loading/Loading'
import CommonTextField from '@/common/components/text-input/CommonTextField'
import { MODALS_NAME } from '@/common/constant/modal'
import { capitalAtFirstLetter } from '@/common/utils/helper'
import { failNotification, successNotification } from '@/common/utils/toast'
import { CLOSE_MODAL } from '@/redux/common'
import { RootState } from '@/redux/store'
import { Dialog, Transition } from '@headlessui/react'
import { Button } from '@material-tailwind/react'

import React, { FC, Fragment, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useSelector } from 'react-redux'

interface ModalDeleteProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
  refetch?: any
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const DeleteModal: FC<ModalDeleteProps> = ({ size, refetch }) => {
  const dispatch = useDispatch()
  const [isSending, setIsSending] = useState<boolean>(false)
  const { bookkeeperDeletion } = useSelector(
    (state: RootState) => state.nonPersistState,
  )

  const openModals = useSelector((state: RootState) => state.common.openModals)

  const handleCloseModals = () => {
    dispatch(CLOSE_MODAL(MODALS_NAME.deleteBookeeper))
  }

  const isOpen = openModals.includes(MODALS_NAME.deleteBookeeper)

  const sendHandler = async () => {
    setIsSending(true)

    try {
      await deleteBookeeper(bookkeeperDeletion?.id || '')
      refetch()
      successNotification({ title: 'Bookkeeper Deleted Successfully!' })
      handleCloseModals()
    } catch (e) {
      console.log('e', e)
    } finally {
      setIsSending(false)
    }
  }

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
              <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-xl font-semibold leading-6 text-gray-900 text-center"
                >
                  Delete This Bookkeeper ?
                </Dialog.Title>

                <div className="flex flex-col gap-2">
                  {isSending ? (
                    <Loading />
                  ) : (
                    <div className="flex gap-4 pt-6">
                      <Button
                        className="bg-teal-700 w-1/2"
                        onClick={handleCloseModals}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="bg-red-600 w-1/2"
                        onClick={sendHandler}
                      >
                        Proceed
                      </Button>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default DeleteModal
