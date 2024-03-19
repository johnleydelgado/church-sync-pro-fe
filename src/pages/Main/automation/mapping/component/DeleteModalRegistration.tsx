import {
  SettingRegistrationQBOProps,
  createSettings,
  getUserRelated,
} from '@/common/api/user'
import Loading from '@/common/components/loading/Loading'
import { MODALS_NAME } from '@/common/constant/modal'
import { failNotification, successNotification } from '@/common/utils/toast'
import { CLOSE_MODAL } from '@/redux/common'
import { RootState } from '@/redux/store'
import { Dialog, Transition } from '@headlessui/react'

import { FC, Fragment, useState } from 'react'

import { useMutation, useQuery } from 'react-query'
import { useDispatch } from 'react-redux'
import { useSelector } from 'react-redux'

interface ModalRegistrationProps {
  name?: string | null
  setSelectRegName: any
  refetchUserData: any
  userData: any
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const DeleteModalRegistration: FC<ModalRegistrationProps> = ({
  name,
  setSelectRegName,
  refetchUserData,
  userData,
}) => {
  const dispatch = useDispatch()
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const [isSubmit, setIsSubmit] = useState<boolean>(false)
  const user = useSelector((state: RootState) => state.common.user)
  const openModals = useSelector((state: RootState) => state.common.openModals)
  const reTriggerIsUserTokens = useSelector(
    (item: RootState) => item.common.reTriggerIsUserTokens,
  )

  const handleCloseModals = () => {
    setSelectRegName('')
    dispatch(CLOSE_MODAL(MODALS_NAME.modalDeleteRegistration))
    setIsSubmit(false)
  }

  const isOpen = openModals.includes(MODALS_NAME.modalDeleteRegistration)

  // const { data: userData } = useQuery(
  //   ['getUserRelatedSettings', reTriggerIsUserTokens, bookkeeper],
  //   async () => {
  //     const emailF =
  //       user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
  //     if (emailF) {
  //       const res = await getUserRelated(emailF)
  //       return res.data
  //     }
  //   },
  //   { staleTime: Infinity },
  // )

  const { mutate, isLoading: isSavingSettings } = useMutation<
    unknown,
    unknown,
    SettingRegistrationQBOProps
  >(createSettings)

  const handlerSubmit = async () => {
    try {
      setIsSubmit(true)
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email

      const filteredRegistrations =
        userData?.UserSetting?.settingRegistrationData?.filter(
          (registration: any) => registration.registration !== name,
        )

      console.log(
        'filteredRegistrations',
        userData?.UserSetting?.settingRegistrationData,
        filteredRegistrations,
        name,
      )
      await mutate({
        email,
        settingRegistrationData: filteredRegistrations,
      })

      successNotification({ title: 'Deleted successfully !' })
    } catch (e) {
      handleCloseModals()
      failNotification({
        title: 'Deletion error',
      })
    } finally {
      setTimeout(() => {
        refetchUserData()
        handleCloseModals()
      }, 300)
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
                <Dialog.Title className="text-md font-semibold leading-6 text-gray-600 text-center">
                  {`Do You Want to Delete This Event / Registration ? `}
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
                    {isSubmit ? <Loading /> : 'Proceed'}
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

export default DeleteModalRegistration
