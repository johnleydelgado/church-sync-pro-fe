import { mainRoute } from '@/common/constant/route'
import React, { FC } from 'react'
import { Navigate } from 'react-router-dom'

interface DashboardProps {}

const Dashboard: FC<DashboardProps> = ({}) => {
  return <Navigate to={mainRoute.TRANSACTION} replace />
}

export default Dashboard
