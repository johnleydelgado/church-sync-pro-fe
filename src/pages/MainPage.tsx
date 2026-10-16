import React, { FC, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import {
  ForgotPasswordPage,
  LoginPage,
  ResetPasswordPage,
  SignUpGooglePage,
  SignUpPage,
  SubscriptionPage,
} from './Auth'
import GoogleCallBack from './Auth/callback/GoogleCallBack'
import CheckInbox from './Auth/verify-email/CheckInbox'
import VerifyEmail from './Auth/verify-email/VerifyEmail'

import PrivateRoute from '@/common/components/Route/PrivateRoute'
import ErrorPage from '@/common/components/Route/ErrorPage'
import {
  authGuard,
  authGuardHaveSettings,
  authGuardHaveToken,
  authProceedToTransaction,
  unAuthGuard,
} from '@/common/utils/routeGuards'
import { mainRoute, route, routeSettings } from '@/common/constant/route'
import {
  AccountTokensPage,
  AutomationArchivePage,
  AutomationMappingPage,
  DailyJournalEntriesPage,
  DashboardPage,
  SettingsPage,
  SubscriptionPlanPage,
  TransactionPage,
  TransactionStripeViewDetailsPage,
  TransactionViewDetailsPage,
} from './Main'
import Session from 'supertokens-web-js/recipe/session'
import { useQueries, useQuery } from 'react-query'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import { getUserRelated } from '@/common/api/user'
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
import useLogoutHandler from '@/common/hooks/useLogoutHandler'
import InviteLink from './Main/invite-link/InviteLink'
import {
  useChurch,
  useKeepChurchSelected,
  useMyChurches,
} from '@/common/hooks/useChurch'
import AskUs from './Main/ask-us/AskUs'
import Home from './Main/home/Home'
import QuickStartGuide from './Main/quick-start-guide/QuickStartGuide'
import ChurchesPage from './Main/churches'
import MainLayout from '@/common/components/main-layout/MainLayout'
import NoChurchYet from '@/common/components/NoChurchYet'
import BackgroundDataFetcher from '@/common/components/background-caller-api/BackgroundDataFetcher'

interface indexProps {}

/**
 * Pages that work on a church. Someone on no church sees NoChurchYet there instead. The rest -
 * Churches and Settings, sign-in, the invite link, the connect callback, Ask Us - work without one.
 */
const NEEDS_CHURCH = [
  mainRoute.DASHBOARD,
  mainRoute.HOME,
  mainRoute.QUICK_START_QUIDE,
  mainRoute.TRANSACTION,
  mainRoute.DAILY,
  mainRoute.AUTOMATION,
]

const MainPage: FC<indexProps> = () => {
  // const { isConnected } = useApiConnectivityCheck()
  const location = useLocation()
  const personalToken = storage.getToken(storageKey.PERSONAL_TOKEN)
  const { church, churchId, email, accountUserId } = useChurch()
  const {
    data: churches,
    isLoading: isLoadingChurches,
    isError: churchesFailed,
    isFetching: isFetchingChurches,
    error: churchesError,
    refetch: refetchChurches,
  } = useMyChurches()

  const dispatch = useDispatch()
  const logoutHandler = useLogoutHandler()
  // The one place the selected church is kept in step with `GET /church/mine`.
  useKeepChurchSelected()

  const handleLogout = () => {
    logoutHandler()
  }
  const reTriggerIsUserTokens = useSelector(
    (item: RootState) => item.common.reTriggerIsUserTokens,
  )

  const { data: userData, isLoading } = useQuery(
    ['getUserRelatedDashboard', churchId, reTriggerIsUserTokens],
    async () => {
      if (email) {
        const res = await getUserRelated(email)
        return res.data
      }
    },
    {
      refetchOnWindowFocus: false,
      enabled: !!churchId,
    },
  )

  // QuickBooks and Planning Center both connected for the selected church. The server's
  // isUserHaveTokens counted three connections, Stripe's among them; CSP connects only these two.
  const isUserTokens = !!church?.connections?.qbo && !!church?.connections?.pco

  const sessionCheck = async () => {
    if (await Session.doesSessionExist()) {
      // session exists
    } else {
      handleLogout()
    }
  }

  useEffect(() => {
    if (!isEmpty(userData?.UserSetting) && isUserTokens && accountUserId) {
      // The church's account, not the signed-in person: the settings belong to the church.
      storage.setLocalToken(String(accountUserId), storageKey.SETTINGS)
      dispatch(setIsShowTransaction(true))
    } else {
      storage.removeToken(storageKey.SETTINGS)
      dispatch(setIsShowTransaction(false))
    }
  }, [userData, isUserTokens, accountUserId])

  useEffect(() => {
    // if (!isConnected && personalToken) {
    //   handleLogout()
    // // }
    // sessionCheck()
    if (personalToken) {
      sessionCheck()
    }
  }, [personalToken])

  // Signed in, nothing selected yet, and the church list is loading (or loaded and about to be
  // picked from): hold the pages back so none of them mounts with an empty church email.
  // A list that loaded empty does not block; the pages show their own "no church" state.
  const waitingForChurch =
    !!personalToken &&
    !church &&
    (isLoadingChurches || (Array.isArray(churches) && churches.length > 0))
  // The list failed and there is nothing to fall back on.
  const churchesUnavailable =
    !!personalToken && !church && churchesFailed && !Array.isArray(churches)

  if (churchesUnavailable) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-screen bg-slate-100 px-4">
        <p className="text-2xl text-center font-thin">
          {churchesError instanceof Error && churchesError.message
            ? churchesError.message
            : 'Could not load your churches.'}
        </p>
        <p className="text-center text-sm text-gray-500">
          Nothing has been changed.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => refetchChurches()}
            disabled={isFetchingChurches}
            className="rounded-lg bg-yellow px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isFetchingChurches ? 'Trying again…' : 'Try again'}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  if (isLoading || waitingForChurch) return <Loading />

  // The list loaded and the person is on no church: a page that needs one says so, with a way to
  // add one. The sidebar stays, so Churches and Settings are a click away.
  const onNoChurch =
    !!personalToken &&
    Array.isArray(churches) &&
    churches.length === 0 &&
    NEEDS_CHURCH.some(
      (path) =>
        location.pathname === path || location.pathname.startsWith(`${path}/`),
    )
  if (onNoChurch) {
    return (
      <div className="h-screen bg-slate-100">
        <MainLayout>
          <NoChurchYet />
        </MainLayout>
      </div>
    )
  }

  return (
    // Keyed by church: a switch remounts every page, so no form, debounced save or local state
    // started for one church can carry on under another. Refreshing the same church keeps the key.
    <div className="h-screen bg-slate-100" key={churchId ?? 'none'}>
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
          element={<PrivateRoute Component={InviteLink} guards={[]} />}
        />
        <Route
          path={route.FORGOT_PASSWORD}
          element={<PrivateRoute Component={ForgotPasswordPage} guards={[]} />}
        />
        <Route
          path={route.RESET_PASSWORD}
          element={<PrivateRoute Component={ResetPasswordPage} guards={[]} />}
        />
        <Route
          path={route.CHECK_INBOX}
          element={<PrivateRoute Component={CheckInbox} guards={[]} />}
        />
        <Route
          path={route.VERIFY_EMAIL}
          element={<PrivateRoute Component={VerifyEmail} guards={[]} />}
        />
        <Route
          path={route.SUBSCRIPTION_PLAN}
          element={
            <PrivateRoute Component={SubscriptionPlanPage} guards={[]} />
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
            <PrivateRoute Component={DashboardPage} guards={[authGuard]} />
          }
        />
        <Route
          path={mainRoute.AUTOMATION_MAPPING}
          element={
            <PrivateRoute
              Component={AutomationMappingPage}
              guards={[authGuard]}
            />
          }
        />
        <Route
          path={mainRoute.AUTOMATION_ARCHIVE}
          element={
            <PrivateRoute
              Component={AutomationArchivePage}
              guards={[authGuard]}
            />
          }
        />
        <Route
          path={mainRoute.PCO_QBO_STRIPE_SYNC}
          element={<PrivateRoute Component={CallBack} guards={[authGuard]} />}
        />
        <Route
          path={mainRoute.DAILY}
          element={
            <PrivateRoute
              Component={DailyJournalEntriesPage}
              guards={[authGuard]}
            />
          }
        />
        <Route
          path={mainRoute.TRANSACTION}
          element={
            <PrivateRoute
              Component={TransactionPage}
              guards={[authGuard]}
              // guards={[authGuard]}
            />
          }
        />
        <Route
          path={mainRoute.HOME}
          element={<PrivateRoute Component={Home} guards={[authGuard]} />}
        />
        <Route
          path={mainRoute.TRANSACTION_VIEWPAGE}
          element={
            <PrivateRoute
              Component={TransactionViewDetailsPage}
              guards={[authGuard]}
            />
          }
        />
        <Route
          path={mainRoute.TRANSACTION_STRIPE_VIEWPAGE}
          element={
            <PrivateRoute
              Component={TransactionStripeViewDetailsPage}
              guards={[authGuard]}
            />
          }
        />
        <Route
          path={mainRoute.CHURCHES}
          element={
            <PrivateRoute Component={ChurchesPage} guards={[authGuard]} />
          }
        />
        {/* The Clients page became Churches */}
        <Route
          path={mainRoute.CLIENT_LIST}
          element={<Navigate to={mainRoute.CHURCHES} replace />}
        />
        <Route
          path={mainRoute.SETTINGS}
          element={
            <PrivateRoute Component={SettingsPage} guards={[authGuard]} />
          }
        />
        {/* Legacy standalone settings routes redirect into the tabbed Settings page */}
        <Route
          path={routeSettings.ACCOUNT_DATA}
          element={<Navigate to={`${mainRoute.SETTINGS}?tab=profile`} replace />}
        />
        <Route
          path={routeSettings.BILLING_INFO}
          element={<Navigate to={`${mainRoute.SETTINGS}?tab=billing`} replace />}
        />
        <Route
          path={routeSettings.INTEGRATIONS}
          element={
            <Navigate to={`${mainRoute.SETTINGS}?tab=integrations`} replace />
          }
        />
        <Route
          path={routeSettings.BOOKKEEPER}
          element={<Navigate to={`${mainRoute.SETTINGS}?tab=people`} replace />}
        />
        <Route
          path={routeSettings.PROJECTS}
          element={
            <Navigate to={`${mainRoute.SETTINGS}?tab=projects`} replace />
          }
        />
        <Route
          path={routeSettings.SELECT_RECIPIENT_EMAILS}
          element={<Navigate to={`${mainRoute.SETTINGS}?tab=email`} replace />}
        />
        <Route
          path={mainRoute.ASK_US}
          element={<PrivateRoute Component={AskUs} guards={[authGuard]} />}
        />
        <Route
          path={mainRoute.QUICK_START_QUIDE}
          element={
            <PrivateRoute Component={QuickStartGuide} guards={[authGuard]} />
          }
        />
        <Route path="*" element={<ErrorPage />} />
      </Routes>
    </div>
  )
}

export default MainPage
