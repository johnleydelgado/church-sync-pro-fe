import { mainRoute } from '@/common/constant/route'
import React, { FC } from 'react'
import { Navigate } from 'react-router-dom'

interface HomeProps {}

const Home: FC<HomeProps> = ({}) => {
  return <Navigate to={mainRoute.DAILY} replace />
}

export default Home
