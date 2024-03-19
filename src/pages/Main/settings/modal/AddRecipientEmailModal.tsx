import { sendEmailInvitation } from '@/common/api/user'
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
import { FiUserPlus } from 'react-icons/fi'
import { HiOutlineMail } from 'react-icons/hi'
import { useDispatch } from 'react-redux'
import { useSelector } from 'react-redux'

interface ModalRegistrationProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
  sendHandler: any
  handleCloseModals: any
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const AddRecipientEmailModal: FC<ModalRegistrationProps> = ({
  size,
  sendHandler,
  handleCloseModals,
}) => {
  const dispatch = useDispatch()
  const [email, setEmail] = useState<string>('')
  const [isSending, setIsSending] = useState<boolean>(false)
  const user = useSelector((state: RootState) => state.common.user)
  const openModals = useSelector((state: RootState) => state.common.openModals)
  const { firstName, lastName } = useSelector(
    (state: RootState) => state.common.user,
  )

  const isOpen = openModals.includes(MODALS_NAME.addRecipientEmail)

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
                <div className="flex justify-between px-4 items-center">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-semibold leading-6 text-btmColor"
                  >
                    Add recipient email
                  </Dialog.Title>
                  <FiUserPlus className="text-btmColor" size={30} />
                </div>

                <div className="flex flex-col gap-2">
                  <CommonTextField
                    name="email"
                    onChange={(e: any) => setEmail(e.target.value)}
                    placeholder="type e-mail here"
                    title=""
                    type="text"
                    value={email}
                    icon={HiOutlineMail}
                  />
                  {isSending ? (
                    <Loading />
                  ) : (
                    <Button
                      className="text-btmColor underline underline-offset-8 text-xl tracking-wider"
                      onClick={() => sendHandler({ email })}
                      variant="text"
                    >
                      Send
                    </Button>
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

export default AddRecipientEmailModal
