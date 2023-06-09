import Loading from '@/common/components/loading/Loading'
import MainLayout from '@/common/components/main-layout/MainLayout'
import { mainRoute } from '@/common/constant/route'
import { storage, storageKey } from '@/common/utils/storage'

import { RootState } from '@/redux/store'
import React, { FC, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router'

interface DashboardProps {}

const delay = (ms: number): Promise<void> => {
  return new Promise<void>((res) => setTimeout(res, ms))
}

const Dashboard: FC<DashboardProps> = ({}) => {
  const isShowTransaction = useSelector(
    (state: RootState) => state.common.isShowTransaction,
  )
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const user = useSelector((item: RootState) => item.common.user)

  const settings = storage.getToken(storageKey.SETTINGS)
  const [isLoading, setIsLoading] = useState(false)
  const navigation = useNavigate()

  useEffect(() => {
    const initialize = async () => {
      if (isShowTransaction && settings) {
        setIsLoading(true)
        window.location.reload()
      }
    }
    initialize()
  }, [isShowTransaction, bookkeeper, user])

  return <MainLayout>{isLoading ? <Loading /> : <p>Dashboard</p>}</MainLayout>
}

export default Dashboard
