import React, { FC, useEffect } from 'react'
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
import {
  authGuard,
  authGuardHaveSettings,
  authGuardHaveToken,
  unAuthGuard,
} from '@/common/utils/routeGuards'
import { mainRoute, route } from '@/common/constant/route'
import {
  AccountTokensPage,
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
import { setIsShowSettings, setIsShowTransaction } from '@/redux/common'

interface indexProps {}

const MainPage: FC<indexProps> = () => {
  const { email } = useSelector((item: RootState) => item.common.user)
  const dispatch = useDispatch()
  const reTriggerIsUserTokens = useSelector(
    (item: RootState) => item.common.reTriggerIsUserTokens,
  )
  const { data: isUserTokens, isLoading } = useQuery(
    ['isUserTokens', email, reTriggerIsUserTokens],
    async () => {
      if (email) return await isUserHaveTokens(email)
      return false
    },
    {
      staleTime: Infinity,
    },
  )

  const { data: userData } = useQuery(
    ['getUserRelated', reTriggerIsUserTokens],
    async () => {
      if (email) return await getUserRelated(email)
    },
    { staleTime: Infinity },
  )

  const sessionCheck = async () => {
    if (await Session.doesSessionExist()) {
      console.log('a')
    } else {
      storage.removeToken(storageKey.TOKENS)
    }
  }
  useEffect(() => {
    if (isUserTokens) {
      storage.setLocalToken(isUserTokens, storageKey.TOKENS)
      dispatch(setIsShowSettings(true))
    } else {
      storage.removeToken(storageKey.TOKENS)
      dispatch(setIsShowSettings(false))
    }
    sessionCheck()
  }, [isUserTokens])

  useEffect(() => {
    if (!isEmpty(userData?.data?.UserSetting)) {
      storage.setLocalToken(userData.data.id, storageKey.SETTINGS)
      dispatch(setIsShowTransaction(true))
    } else {
      storage.removeToken(storageKey.SETTINGS)
      dispatch(setIsShowTransaction(false))
    }
    sessionCheck()
  }, [userData])

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
          path={mainRoute.PCO_QBO_STRIPE}
          element={
            <PrivateRoute Component={AccountTokensPage} guards={[authGuard]} />
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
              guards={[authGuard, authGuardHaveToken, authGuardHaveSettings]}
            />
          }
        />
        <Route
          path={mainRoute.TRANSACTION_VIEWPAGE}
          element={
            <PrivateRoute
              Component={TransactionViewDetailsPage}
              guards={[authGuard, authGuardHaveToken, authGuardHaveSettings]}
            />
          }
        />
        <Route
          path={mainRoute.TRANSACTION_STRIPE_VIEWPAGE}
          element={
            <PrivateRoute
              Component={TransactionStripeViewDetailsPage}
              guards={[authGuard, authGuardHaveToken, authGuardHaveSettings]}
            />
          }
        />
        <Route
          path={mainRoute.SETTINGS}
          element={
            <PrivateRoute
              Component={SettingsPage}
              guards={[authGuard, authGuardHaveToken]}
            />
          }
        />
        <Route path="*" element={<ErrorPage />} />
      </Routes>
    </div>
  )
}

export default MainPage
