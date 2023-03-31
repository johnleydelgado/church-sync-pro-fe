import React, { FC } from 'react'
import { Route, Routes } from 'react-router-dom'

import {
  LoginPage,
  SecondaryLoginPage,
  SignUpPage,
  SubscriptionPage,
} from './Auth'
import GoogleCallBack from './Auth/callback/GoogleCallBack'

import PrivateRoute from '@/common/components/Route/PrivateRoute'
import ErrorPage from '@/common/components/Route/ErrorPage'
import { authGuard, unAuthGuard } from '@/common/utils/routeGuards'
import { DashboardPage } from './Main'
import { route } from '@/common/constant/route'

interface indexProps {}

const MainPage: FC<indexProps> = () => {
  return (
    <div className="h-screen bg-slate-400">
      <Routes>
        <Route
          path={route.ROOT}
          element={
            <PrivateRoute Component={LoginPage} guards={[unAuthGuard]} />
          }
        />
        <Route
          path={route.AUTH_GOOGLE}
          element={
            <PrivateRoute Component={GoogleCallBack} guards={[unAuthGuard]} />
          }
        />
        <Route
          path={route.SECONDARY_LOGIN}
          element={
            <PrivateRoute
              Component={SecondaryLoginPage}
              guards={[unAuthGuard]}
            />
          }
        />
        <Route
          path={route.SIGNUP}
          element={
            <PrivateRoute Component={SignUpPage} guards={[unAuthGuard]} />
          }
        />
        <Route
          path={route.SUBSCRIPTION}
          element={
            <PrivateRoute Component={SubscriptionPage} guards={[unAuthGuard]} />
          }
        />
        <Route
          path={route.DASHBOARD}
          element={
            <PrivateRoute Component={DashboardPage} guards={[authGuard]} />
          }
        />
        <Route path="*" element={<ErrorPage />} />
      </Routes>
    </div>
  )
}

export default MainPage
