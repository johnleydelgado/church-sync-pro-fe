import MainLayout from '@/common/components/main-layout/MainLayout'
import React, { FC } from 'react'
import Lottie from 'lottie-react'
import empty from '@/common/assets/empty.json'
import { useDispatch } from 'react-redux'
import { OPEN_MODAL } from '@/redux/common'
import { MODALS_NAME } from '@/common/constant/modal'
import ModalInvitation from './components/Modal'
import { useQuery } from 'react-query'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import { bookkeeperList } from '@/common/api/user'
import { isEmpty } from 'lodash'
import BookkeeperTableList from './components/Table'
import Loading from '@/common/components/loading/Loading'
interface BookkeeperProps {}

const Bookkeeper: FC<BookkeeperProps> = ({}) => {
  const dispatch = useDispatch()
  const openModal = () => {
    dispatch(OPEN_MODAL(MODALS_NAME.invitation))
  }
  const user = useSelector((state: RootState) => state.common.user)

  const { data, refetch, isLoading } = useQuery(
    ['bookkeeperList'],
    async () => {
      const res = await bookkeeperList({ clientId: user?.id })
      return res.data
    },
    { staleTime: Infinity, refetchOnWindowFocus: false },
  )

  return (
    <MainLayout>
      <ModalInvitation refetch={refetch} />
      <div className="flex h-full gap-4">
        <div className="rounded-lg p-8 bg-white w-screen">
          <div className="justify-between flex w-full">
            <span className="font-medium text-2xl">Bookkeeper List</span>
          </div>
          <div className="flex gap-4 justify-end">
            <button
              className={`${
                data?.length > 3 ? 'text-green-300' : 'text-green-500'
              } flex items-center gap-1 hover:underline`}
              onClick={openModal}
              disabled={data?.length > 3 ? true : false}
            >
              <p>Add bookkeeper +</p>
            </button>
          </div>

          {isLoading ? (
            <Loading />
          ) : isEmpty(data) ? (
            <div className="flex flex-col pt-48 items-center h-full">
              <Lottie animationData={empty} loop={true} className="h-96" />
              <div className="flex flex-col gap-4 text-center">
                <p className="text-4xl">No bookkeeper found</p>
                <p className="text-xl font-thin">
                  To invite an account just click the add bookkeeper button
                </p>
              </div>
            </div>
          ) : (
            <BookkeeperTableList data={data} />
          )}
        </div>
      </div>
    </MainLayout>
  )
}

export default Bookkeeper
