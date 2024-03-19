import React, { FC, useEffect, useRef, useState } from 'react'

import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'

import { useDispatch } from 'react-redux'
import { Button } from '@material-tailwind/react'
import { MdSettings } from 'react-icons/md'
import MainLayout from '@/common/components/main-layout/MainLayout'
import { crudUserEmailPreferences } from '@/common/api/user'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { isEmpty } from 'lodash'
import AddRecipientEmailModal from '../modal/AddRecipientEmailModal'
import { CLOSE_MODAL, OPEN_MODAL } from '@/redux/common'
import { MODALS_NAME } from '@/common/constant/modal'

interface AccountProps {}

interface ItemType {
  type: string
  email: string
}

const Email: FC<AccountProps> = ({}) => {
  const dispatch = useDispatch()
  const user = useSelector((item: RootState) => item.common.user)
  const { email, id } = useSelector((item: RootState) => item.common.user)
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const queryClient = useQueryClient()
  const userId =
    user.role === 'bookkeeper' ? bookkeeper?.clientId || '' : id || ''
  const [emailType, setEmailType] = useState<'new-fund' | 'new-registration'>(
    'new-fund',
  )
  // ...

  const {
    data = [],
    error,
    isLoading,
  } = useQuery(
    ['userEmailPreferences', userId, bookkeeper],
    () => crudUserEmailPreferences(Number(userId)),
    {
      refetchOnWindowFocus: false,
    },
  )

  console.log('userId', userId, bookkeeper)

  const mutation = useMutation(
    (newData: { email: string }) =>
      crudUserEmailPreferences(Number(userId), newData.email, emailType),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('userEmailPreferences')
        handleCloseModals()
      },
    },
  )

  const openModal = (type: 'new-fund' | 'new-registration') => {
    setEmailType(type)
    dispatch(OPEN_MODAL(MODALS_NAME.addRecipientEmail))
  }

  const handleUpdate = (newData: { email: string }) => {
    mutation.mutate(newData)
  }

  const handleCloseModals = () => {
    dispatch(CLOSE_MODAL(MODALS_NAME.addRecipientEmail))
  }

  return (
    <MainLayout>
      <div className="-m-6 p-6 h-full">
        <AddRecipientEmailModal
          sendHandler={handleUpdate}
          handleCloseModals={handleCloseModals}
        />
        {/* Header */}
        <div className="pb-2">
          <div className="flex flex-col border-b-2 pb-2">
            <div className="flex items-center gap-2">
              <MdSettings size={28} className="text-blue-400" />
              <span className="font-bold text-lg text-[#27A1DB]">
                Set Recipient Email Settings
              </span>
            </div>
          </div>
        </div>

        <div className="w-full  flex flex-col bg-white justify-center px-8 mt-2">
          <div className="flex items-center justify-between gap-2 px-4 pt-4 w-full">
            <p className="text-md text-[#27A1DB]">New Fund</p>
            {data.find((item: ItemType) => item.type === 'new-fund')?.email ? (
              <Button
                variant="text"
                className="text-[#27A1DB] mr-32 italic font-normal"
                onClick={() => openModal('new-fund')}
              >
                Edit Recipient Email
              </Button>
            ) : (
              <Button
                variant="text"
                className="text-[#27A1DB] mr-32 italic font-normal"
                onClick={() => openModal('new-fund')}
              >
                Add Recipient Email for New Fund
              </Button>
            )}
          </div>

          {data.find((item: ItemType) => item.type === 'new-fund')?.email && (
            <div className="grid grid-cols-3 px-4 gap-4 border-b-[1px] py-6 border-[#DDDDDD]">
              <div className="flex gap-3">
                <p>Email To : </p>
                <p className="text-md text-[#27A1DB]">
                  {
                    data.find((item: ItemType) => item.type === 'new-fund')
                      ?.email
                  }
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 px-4 pt-4 w-full">
            <p className="text-md text-[#27A1DB]">New Registration</p>
            {data.find((item: ItemType) => item.type === 'new-registration')
              ?.email ? (
              <Button
                variant="text"
                className="text-[#27A1DB] mr-32 italic font-normal"
                onClick={() => openModal('new-registration')}
              >
                Edit Recipient Email
              </Button>
            ) : (
              <Button
                variant="text"
                className="text-[#27A1DB] mr-32 italic font-normal"
                onClick={() => openModal('new-registration')}
              >
                Add Recipient Email for New Registration
              </Button>
            )}
          </div>

          {data.find((item: ItemType) => item.type === 'new-registration')
            ?.email && (
            <div className="grid grid-cols-3 px-4 gap-4 border-b-[1px] py-6 border-[#DDDDDD]">
              <div className="flex gap-3">
                <p>Email To : </p>
                <p className="text-md text-[#27A1DB]">
                  {
                    data.find(
                      (item: ItemType) => item.type === 'new-registration',
                    )?.email
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}

export default Email
