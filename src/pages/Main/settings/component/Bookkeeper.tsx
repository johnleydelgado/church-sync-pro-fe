import React, { FC, useEffect, useRef, useState } from 'react'

import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'

import { useDispatch } from 'react-redux'
import { Avatar, Button, Input } from '@material-tailwind/react'
import qboIcon from '@/common/assets/qbo-icon.png'
import { capitalAtFirstLetter } from '@/common/utils/helper'
import { OPEN_MODAL } from '@/redux/common'
import { MODALS_NAME } from '@/common/constant/modal'
import { useQuery } from 'react-query'
import { bookkeeperList } from '@/common/api/user'
import { format } from 'date-fns'
import Lottie from 'lottie-react'
import empty from '@/common/assets/empty.json'
import { AiOutlineUserAdd } from 'react-icons/ai'
import ModalInvitation from '../../bookkeeper/components/Modal'
import DeleteModal from '../../bookkeeper/components/DeleteModal'
import { setDeleteBookkeeper } from '@/redux/nonPersistState'

interface AccountProps {}

interface BookkeeperProps {
  email: string
  id: number
  createdAt: string
  userId: number | null
  User: { email: string; firstName: string; lastName: string }
}

const Bookkeeper: FC<AccountProps> = ({}) => {
  const dispatch = useDispatch()
  const openModal = () => {
    dispatch(OPEN_MODAL(MODALS_NAME.invitation))
  }

  const openDeleteModal = (id: string, email: string) => {
    dispatch(OPEN_MODAL(MODALS_NAME.deleteBookeeper))
    dispatch(setDeleteBookkeeper({ id, email }))
  }

  const user = useSelector((state: RootState) => state.common.user)

  const { data, refetch, isLoading } = useQuery<BookkeeperProps[]>(
    ['bookkeeperList'],
    async () => {
      const res = await bookkeeperList({ clientId: user?.id })
      return res.data
    },
    { staleTime: Infinity, refetchOnWindowFocus: false },
  )

  return (
    <div className="w-full  flex flex-col bg-white justify-center px-8 mt-2">
      <ModalInvitation refetch={refetch} />
      <DeleteModal refetch={refetch} />
      <div className="flex justify-end mt-4">
        <Button
          variant="outlined"
          className="border-gray-400 text-black flex items-center gap-3 font-thin"
          onClick={openModal}
          disabled={data ? (data?.length > 3 ? true : false) : false}
        >
          <AiOutlineUserAdd size={18} className="text-[#FAB400]" />
          Add new bookkeeper
        </Button>
      </div>
      {data && data.length > 0 ? (
        data.map((a) => (
          <div key={a.id}>
            <div className="flex items-center justify-between gap-2 px-4 pt-4 w-full">
              <div className="flex flex-col">
                <p className="text-md text-[#27A1DB]">{a.email}</p>
                <p className="text-md text-gray-400">
                  Added last {format(new Date(a.createdAt), 'MM/dd/yyyy')}
                </p>
              </div>
              <Button
                variant="text"
                className="text-red-600 mr-32 italic font-normal"
                onClick={() => openDeleteModal(String(a.id), a.email)}
              >
                Remove
              </Button>
            </div>

            {a.userId ? (
              <div className="grid grid-cols-3 px-4 gap-4 border-b-[1px] py-6 border-[#DDDDDD]">
                <div className="col-span-1">
                  <p>
                    {capitalAtFirstLetter(a.User.firstName)}{' '}
                    {capitalAtFirstLetter(a.User.lastName)}
                  </p>
                </div>
                <div className="col-span-2">{a.email}</div>
              </div>
            ) : (
              <div className="flex p-4 justify-center mr-32 border-b-[1px]">
                <p className="font-light font-lato py-4 text-lg">
                  The bookkeeper has been invited, but they have not yet created
                  an account.
                </p>
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="flex flex-col pt-8 items-center h-full">
          <Lottie animationData={empty} loop={true} className="h-64" />
          <div className="flex flex-col gap-4 text-center">
            <p className="text-4xl">No bookkeeper found</p>
            <p className="text-xl font-thin">
              To invite an account just click the add bookkeeper button
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Bookkeeper
