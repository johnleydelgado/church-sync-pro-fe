import React, { FC, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'

import {
  LoginPage,
  SecondaryLoginPage,
  SignUpGooglePage,
  SignUpPage,
  SubscriptionPage,
} from './Auth'
import GoogleCallBack from './Auth/callback/GoogleCallBack'

import PrivateRoute from '@/common/components/Route/PrivateRoute'
import ErrorPage from '@/common/components/Route/ErrorPage'
import {
  authGuard,
  authGuardHaveSettings,
  authGuardHaveToken,
  authProceedToTransaction,
  unAuthGuard,
} from '@/common/utils/routeGuards'
import { mainRoute, route } from '@/common/constant/route'
import {
  AccountTokensPage,
  DashboardPage,
  SettingsPage,
  TransactionPage,
  TransactionStripeViewDetailsPage,
  TransactionViewDetailsPage,
} from './Main'
import Session from 'supertokens-web-js/recipe/session'
import { useQueries, useQuery } from 'react-query'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import { getUserRelated, isUserHaveTokens } from '@/common/api/user'
import { storage, storageKey } from '@/common/utils/storage'
import Loading from '@/common/components/loading/Loading'
import 'react-tooltip/dist/react-tooltip.css'
import CallBack from './Main/accounts-token/CallBack'
import { isEmpty } from 'lodash'
import { useDispatch } from 'react-redux'
import {
  setIsShowSettings,
  setIsShowTransaction,
  setUserData,
} from '@/redux/common'
import Bookkeeper from './Main/bookkeeper/Bookkeeper'
import useLogoutHandler from '@/common/hooks/useLogoutHandler'
import InviteLink from './Main/invite-link/InviteLink'
import useApiConnectivityCheck from '@/common/hooks/useApiConnectivityCheck'

interface indexProps {}

const MainPage: FC<indexProps> = () => {
  const { email } = useSelector((item: RootState) => item.common.user)
  const user = useSelector((item: RootState) => item.common.user)
  // const { isConnected } = useApiConnectivityCheck()
  const location = useLocation()
  const personalToken = storage.getToken(storageKey.PERSONAL_TOKEN)
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)

  const dispatch = useDispatch()
  const logoutHandler = useLogoutHandler()

  const handleLogout = () => {
    logoutHandler()
  }
  const reTriggerIsUserTokens = useSelector(
    (item: RootState) => item.common.reTriggerIsUserTokens,
  )

  // const { data: isUserTokens, isLoading } = useQuery(
  //   ['isUserTokens', email, reTriggerIsUserTokens],
  //   async () => {
  //     const emailF =
  //       user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
  //     if (emailF) return await isUserHaveTokens(emailF)
  //     return false
  //   },
  //   {
  //     staleTime: Infinity,
  //     refetchOnWindowFocus: false,
  //   },
  // )
  const { data: userData, isLoading } = useQuery(
    ['getUserRelatedDashboard', user, bookkeeper],
    async () => {
      const emailF =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      if (emailF) {
        console.log('refetch here ?')
        const res = await getUserRelated(emailF)
        return res.data
      }
    },
    {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      enabled: !!user && !!bookkeeper, // Only run query if `user` and `bookkeeper` are truthy
    },
  )

  const sessionCheck = async () => {
    if (await Session.doesSessionExist()) {
      console.log('a')
    } else {
      handleLogout()
      console.log('yyyy')
      // handleLogout()
    }
  }

  // useEffect(() => {
  //   if (isUserTokens) {
  //     storage.setLocalToken(isUserTokens, storageKey.TOKENS)
  //     dispatch(setIsShowSettings(true))
  //   } else {
  //     storage.removeToken(storageKey.TOKENS)
  //     dispatch(setIsShowSettings(false))
  //   }
  //   sessionCheck()
  // }, [isUserTokens])

  useEffect(() => {
    if (!isEmpty(userData?.UserSetting)) {
      console.log('user', userData)
      storage.setLocalToken(userData?.id, storageKey.SETTINGS)
      dispatch(setIsShowTransaction(true))
    } else {
      storage.removeToken(storageKey.SETTINGS)
      dispatch(setIsShowTransaction(false))
    }
    // dispatch(
    //   setUserData({
    //     ...user,
    //     firstName: userData?.firstName,
    //     lastName: userData?.lastName,
    //   }),
    // )
  }, [userData])

  useEffect(() => {
    // if (!isConnected && personalToken) {
    //   handleLogout()
    // // }
    // sessionCheck()
    if (personalToken) {
      sessionCheck()
    }
  }, [personalToken])

  // useEffect(() => {
  //   refetch()
  // }, [reTriggerIsUserTokens])

  if (isLoading) return <Loading />

  return (
    <div className="h-screen bg-slate-100">
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
          path={route.INVITE_LINK}
          element={
            <PrivateRoute Component={InviteLink} guards={[unAuthGuard]} />
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
          path={route.SIGNUP_GOOGLE}
          element={
            <PrivateRoute Component={SignUpGooglePage} guards={[unAuthGuard]} />
          }
        />
        <Route
          path={route.SUBSCRIPTION}
          element={
            <PrivateRoute Component={SubscriptionPage} guards={[unAuthGuard]} />
          }
        />
        {/* <Route
          path={mainRoute.PCO_QBO_STRIPE}
          element={
            <PrivateRoute Component={AccountTokensPage} guards={[authGuard]} />
          }
        /> */}
        <Route
          path={mainRoute.DASHBOARD}
          element={
            <PrivateRoute
              Component={DashboardPage}
              guards={[authGuard, authProceedToTransaction]}
            />
          }
        />
        <Route
          path={mainRoute.BOOKKEEPER}
          element={
            <PrivateRoute
              Component={Bookkeeper}
              guards={[authGuard, authGuardHaveSettings]}
            />
          }
        />
        <Route
          path={mainRoute.PCO_QBO_STRIPE_SYNC}
          element={<PrivateRoute Component={CallBack} guards={[authGuard]} />}
        />
        <Route
          path={mainRoute.TRANSACTION}
          element={
            <PrivateRoute
              Component={TransactionPage}
              guards={[authGuard, authGuardHaveSettings]}
              // guards={[authGuard]}
            />
          }
        />
        <Route
          path={mainRoute.TRANSACTION_VIEWPAGE}
          element={
            <PrivateRoute
              Component={TransactionViewDetailsPage}
              guards={[authGuard, authGuardHaveSettings]}
            />
          }
        />
        <Route
          path={mainRoute.TRANSACTION_STRIPE_VIEWPAGE}
          element={
            <PrivateRoute
              Component={TransactionStripeViewDetailsPage}
              guards={[authGuard, authGuardHaveSettings]}
            />
          }
        />
        <Route
          path={mainRoute.SETTINGS}
          element={
            <PrivateRoute Component={SettingsPage} guards={[authGuard]} />
          }
        />
        <Route path="*" element={<ErrorPage />} />
      </Routes>
    </div>
  )
}

export default MainPage
