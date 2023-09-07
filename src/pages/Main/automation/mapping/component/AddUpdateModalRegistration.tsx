import { pcHandleRegistrationEvents } from '@/common/api/planning-center'
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
import { AiOutlineFileText } from 'react-icons/ai'
import { FiUserPlus } from 'react-icons/fi'
import { HiOutlineMail } from 'react-icons/hi'
import { MdAppRegistration } from 'react-icons/md'
import { useDispatch } from 'react-redux'
import { useSelector } from 'react-redux'

interface ModalRegistrationProps {
  refetch?: any
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const AddUpdateModalRegistration: FC<ModalRegistrationProps> = ({
  refetch,
}) => {
  const dispatch = useDispatch()
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const [name, setName] = useState<string>('')
  const [isSending, setIsSending] = useState<boolean>(false)
  const user = useSelector((state: RootState) => state.common.user)
  const openModals = useSelector((state: RootState) => state.common.openModals)

  const handleCloseModals = () => {
    dispatch(CLOSE_MODAL(MODALS_NAME.modalRegistration))
  }

  const isOpen = openModals.includes(MODALS_NAME.modalRegistration)

  const handleAddRegistration = async () => {
    setIsSending(true)

    try {
      const id =
        user.role === 'bookkeeper' ? bookkeeper?.clientId || '' : user.id
      if (id && name) {
        const res = await pcHandleRegistrationEvents({
          action: 'create',
          userId: id,
          name,
        })
        refetch()
        successNotification({ title: 'registration created successfully !' })
        return res
      }
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between px-2 items-center">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-semibold leading-6 text-btmColor"
                  >
                    Add Registration Name
                  </Dialog.Title>
                  <MdAppRegistration size={18} className="text-btmColor" />
                </div>

                <div className="flex flex-col gap-2">
                  <CommonTextField
                    name="email"
                    onChange={(e: any) => setName(e.target.value)}
                    placeholder="type your registration name"
                    title=""
                    type="text"
                    value={name}
                    icon={AiOutlineFileText}
                  />
                  {isSending ? (
                    <Loading />
                  ) : (
                    <Button
                      className="text-btmColor underline underline-offset-8 text-xl tracking-wider"
                      onClick={handleAddRegistration}
                      variant="text"
                    >
                      Save
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

export default AddUpdateModalRegistration
