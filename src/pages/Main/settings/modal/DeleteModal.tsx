import { updateProject } from '@/common/api/qbo'
import { deleteBookeeper, sendEmailInvitation } from '@/common/api/user'
import Loading from '@/common/components/loading/Loading'
import CommonTextField from '@/common/components/text-input/CommonTextField'
import { MODALS_NAME } from '@/common/constant/modal'
import { capitalAtFirstLetter } from '@/common/utils/helper'
import { failNotification, successNotification } from '@/common/utils/toast'
import { CLOSE_MODAL } from '@/redux/common'
import { setProjectFieldValues } from '@/redux/nonPersistState'
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
  const { projectFieldValues } = useSelector(
    (state: RootState) => state.nonPersistState,
  )
  const { user } = useSelector((state: RootState) => state.common)
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)

  const openModals = useSelector((state: RootState) => state.common.openModals)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const handleCloseModals = () => {
    dispatch(setProjectFieldValues(null))
    dispatch(CLOSE_MODAL(MODALS_NAME.deleteProject))
  }

  const isOpen = openModals.includes(MODALS_NAME.deleteProject)

  const sendHandler = async () => {
    setIsLoading(true)
    const email =
      user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email

    try {
      if (projectFieldValues) {
        await updateProject(email, { ...projectFieldValues, active: false })
        successNotification({ title: 'Project Deleted Successfully!' })
        handleCloseModals()
        refetch()
      }
    } catch (e: any) {
      failNotification({ title: e.message })
    } finally {
      setIsLoading(false)
    }
  }

  console.log('isLoading', isLoading)

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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg leading-6 font-medium text-gray-900"
                >
                  Project Deletion
                </Dialog.Title>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete this project ?
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
                    onClick={() => sendHandler()}
                  >
                    {isLoading ? <Loading /> : 'Proceed'}
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

export default DeleteModal
