import { pcHandleRegistrationEvents } from '@/common/api/planning-center'
import { getUserRelated, sendEmailInvitation } from '@/common/api/user'
import Loading from '@/common/components/loading/Loading'
import CommonTextField from '@/common/components/text-input/CommonTextField'
import { MODALS_NAME } from '@/common/constant/modal'
import { useInvalidateQueries } from '@/common/hooks/useInvalidateQueries'
import { capitalAtFirstLetter } from '@/common/utils/helper'
import { successNotification, failNotification } from '@/common/utils/toast'
import { CLOSE_MODAL } from '@/redux/common'
import { RootState } from '@/redux/store'
import { Dialog, Transition } from '@headlessui/react'
import { Button } from '@material-tailwind/react'
import { debounce } from 'lodash'
import React, { FC, Fragment, useState, useEffect } from 'react'
import { MdChurch, MdPeopleAlt } from 'react-icons/md'
import { useQueryClient } from 'react-query'
import { useDispatch, useSelector } from 'react-redux'
import { emailPasswordSignUp } from 'supertokens-web-js/recipe/thirdpartyemailpassword'

interface ModalRegistrationProps {
  refetch?: () => void
  isUpdate?: boolean
  initialData?: {
    churchName: string
    status: 'Active' | 'Inactive'
  }
}

const AddUpdateClientModalRegistration: FC<ModalRegistrationProps> = ({
  refetch,
  isUpdate = false,
  initialData,
}) => {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()

  const [churchName, setChurchName] = useState<string>(
    initialData?.churchName || '',
  )
  const [status, setStatus] = useState<'Active' | 'Inactive'>(
    initialData?.status || 'Active',
  )
  const [isSending, setIsSending] = useState<boolean>(false)
  const user = useSelector((state: RootState) => state.common.user)
  const openModals = useSelector((state: RootState) => state.common.openModals)

  const handleCloseModals = () => {
    dispatch(CLOSE_MODAL(MODALS_NAME.modalClientRegistration))
  }

  const isOpen = openModals.includes(MODALS_NAME.modalClientRegistration)

  const sendEmailInvitationDebounced = debounce(
    (name: string, email: string, clientId: number) => {
      return new Promise<void>((resolve, reject) => {
        sendEmailInvitation(name, email, clientId, true, user.id)
          .then(() => resolve())
          .catch(reject) // Propagate any errors to the caller
      })
    },
    2000,
  )

  const handleAddOrUpdateRegistration = async () => {
    setIsSending(true)
    try {
      if (!churchName) {
        failNotification({ title: 'Church name is required.' })
        return
      }

      const formattedEmail = `${churchName.toLowerCase().replace(/ /g, '-')}-${
        user.email
      }`

      const response = await emailPasswordSignUp({
        formFields: [
          { id: 'churchName', value: churchName },
          { id: 'firstName', value: 'N/A' },
          { id: 'lastName', value: 'N/A' },
          { id: 'email', value: formattedEmail },
          { id: 'password', value: 'csp@2024' },
          { id: 'isSubscribe', value: '0' },
          { id: 'role', value: 'client' },
        ],
      })

      if (response.status === 'FIELD_ERROR') {
        response.formFields.forEach((formField) => {
          failNotification({ title: formField.error })
        })
        return
      }

      const userData = await getUserRelated(formattedEmail)
      const { id: clientId } = userData.data

      await sendEmailInvitationDebounced('N/A', formattedEmail, clientId || 0)
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Invalidate and force refetch of the query
      queryClient.invalidateQueries(['bookkeeperListSidebar', user.role])

      successNotification({
        title: isUpdate
          ? 'Client updated successfully!'
          : 'Client created successfully!',
      })
      handleCloseModals()
    } catch (e) {
      failNotification({ title: 'An error occurred. Please try again.' })
      console.error('Error:', e)
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-8 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-center mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-semibold text-gray-700"
                  >
                    {isUpdate ? 'Update Client' : 'Register New Client'}
                  </Dialog.Title>
                  <MdPeopleAlt size={24} className="text-gray-700" />
                </div>

                <div className="flex flex-col gap-4">
                  <CommonTextField
                    title="Church Name"
                    name="churchName"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setChurchName(e.target.value)
                    }
                    placeholder="Church Name"
                    type="text"
                    value={churchName}
                    icon={MdChurch}
                  />

                  <div>
                    <label className="block text-sm font-bold text-gray-500 mb-2">
                      Status
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700"
                      value={status}
                      onChange={(e) =>
                        setStatus(e.target.value as 'Active' | 'Inactive')
                      }
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="mt-6">
                    {isSending ? (
                      <Loading />
                    ) : (
                      <Button
                        className="w-full bg-primary text-white font-semibold py-2 rounded-md hover:bg-primary-dark transition duration-300"
                        onClick={handleAddOrUpdateRegistration}
                      >
                        {isUpdate ? 'Update' : 'Register'}
                      </Button>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default AddUpdateClientModalRegistration
