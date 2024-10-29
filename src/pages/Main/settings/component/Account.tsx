import LoginButton from '@/pages/Auth/secondaryLogin/components/LoginButton'
import pcLogin from '@/common/assets/planning-center-btn.png'
import qboLogin from '@/common/assets/qbo_login.png'
import stripeLogin from '@/common/assets/stripe.png'

import React, { FC, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { failNotification, successNotification } from '@/common/utils/toast'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import { deleteUserToken, updateUserToken } from '@/common/api/user'
import { authApi } from '@/common/api/auth'
import { useQuery } from 'react-query'
import { getTokenList } from '@/common/api/user'
import { useDispatch } from 'react-redux'
import { setAccountState } from '@/redux/common'
import qboIcon from '@/common/assets/qbo-icon.png'
import pcoIcon from '@/common/assets/pco-icon.png'
import stripeIcon from '@/common/assets/stripe.png'
import { CgSync } from 'react-icons/cg'
import { BiSync } from 'react-icons/bi'
import { useGetTokenList } from '@/common/hooks/useGetTokenList'
import MainLayout from '@/common/components/main-layout/MainLayout'
import { MdSettings } from 'react-icons/md'

interface AccountProps {}

interface LoadingProps {
  stripeLoading: boolean
  pcoLoading: boolean
  qboLoading: boolean
}

interface Token {
  id?: number
  userId: number
  tokenEntityId: number
  token_type: 'stripe' | 'qbo' | 'pco' | string
  access_token: string | null
  refresh_token: string | null
  realm_id: string | null
  isSelected: boolean
  organization_name: string | null
}

export interface AccountTokenDataProps {
  id: number
  isEnabled: false
  email: string
  tokens: Token[]
  createAt?: string
  updatedAt?: string
}

const Account: FC<AccountProps> = ({}) => {
  const dispatch = useDispatch()
  const subscribed = useRef(false)
  const { email, id, role } = useSelector((item: RootState) => item.common.user)
  const accountState = useSelector(
    (item: RootState) => item.common.accountState,
  )
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)

  const [isBtnLoading, setIsBtnLoading] = useState<LoadingProps>({
    stripeLoading: false,
    pcoLoading: false,
    qboLoading: false,
  })

  const { tokenList, refetch } = useGetTokenList()

  const qboLoginHandler = async () => {
    setIsBtnLoading({ ...isBtnLoading, qboLoading: true })
    const authUri = await authApi('authQB')
    window.location.href = authUri
    // window.open(authUri)
  }
  const pcLoginHandler = async () => {
    setIsBtnLoading({ ...isBtnLoading, pcoLoading: true })
    const authUri = await authApi('authPC')
    window.location.href = authUri
  }
  const stripeLoginHandler = async () => {
    setIsBtnLoading({ ...isBtnLoading, stripeLoading: true })
    const authUri = await authApi('authStripe')
    window.location.href = authUri
  }

  const hasTokenOfTypes = (types: string[]): boolean => {
    if (tokenList && tokenList[0]) {
      return Boolean(
        tokenList[0].tokens.find((a) => types.includes(a.token_type)),
      )
    }
    return false
  }

  const deleteToken = async (id: number | undefined | null) => {
    try {
      console.log('test', id)
      if (id) {
        const res = await deleteUserToken(id)

        if (res.success) {
          successNotification({
            title: 'delete token successfully !',
          })
          refetch()
        } else {
          failNotification({ title: res.data.message })
        }
      }
    } catch (e) {
      failNotification({
        title: '',
      })
    }
  }

  useEffect(() => {
    const loadState = async () => {
      if (accountState) {
        const { type, access_token, refresh_token, realm_id } = accountState
        try {
          const emailLatest =
            role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : email
          const tokenObject = {
            email: emailLatest,
            token_type: type,
            access_token,
            refresh_token,
            realm_id,
            userId: id,
          }

          if (type === 'qbo') {
            tokenObject.realm_id = realm_id
          }
          const res = await updateUserToken({
            ...tokenObject,
          })

          if (res) {
            // successNotification({
            //   title: 'Sync !',
            // })
            // dispatch(setSelectedThirdPartyId(0))
            refetch()
            // history(location.pathname, { replace: true })
          } else {
            failNotification({ title: res.message })
          }
        } catch (e) {
          failNotification({ title: (e as string) || '' })
        } finally {
          dispatch(setAccountState(null))
        }
      }
    }

    if (!subscribed.current) {
      loadState()
    }
    return () => {
      subscribed.current = true
    }
  }, [])

  return (
    <MainLayout>
      <div className="-m-6 p-6 h-full">
        {/* Header */}
        <div className="pb-2">
          <div className="flex flex-col border-b-2 pb-2">
            <div className="flex items-center gap-2">
              <MdSettings size={28} className="text-blue-400" />
              <span className="font-bold text-lg text-primary">Settings</span>
            </div>
          </div>
        </div>

        <div className="w-full  flex flex-col bg-white lg:px-8 py-4 justify-center mt-2">
          <div className="flex flex-col gap-2 lg:px-4">
            <p className="text-md font-thin">
              Before we start, connect your accounts first
            </p>
          </div>

          <div className="flex flex-col gap-4 pt-4 lg:p-4">
            <button
              className="border-2 w-full lg:w-1/2 h-28 p-4 rounded-lg text-start flex gap-4"
              onClick={(e) => {
                if (!hasTokenOfTypes(['qbo'])) {
                  qboLoginHandler()
                } else {
                  e.stopPropagation()
                }
              }}
            >
              <img src={qboIcon} className="h-full w=full" />
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 items-center">
                  {hasTokenOfTypes(['qbo']) ? (
                    <div className="border-2 rounded-lg border-btmColor">
                      <BiSync className="text-btmColor" />
                    </div>
                  ) : null}
                  <p className="text-greenText">
                    {hasTokenOfTypes(['qbo'])
                      ? 'Synced with Quick Books'
                      : 'Click to sync with Quick Books'}
                  </p>
                </div>

                <p
                  className={`${
                    hasTokenOfTypes(['qbo'])
                      ? 'underline italic font-normal text-btmColor cursor-pointer'
                      : 'text-gray-400 text-sm font-normal'
                  } `}
                  onClick={() =>
                    deleteToken(
                      tokenList &&
                        tokenList[0]?.tokens.find((a) => a.token_type === 'qbo')
                          ?.id,
                    )
                  }
                >
                  {hasTokenOfTypes(['qbo'])
                    ? 'Click to log-out'
                    : 'QuickBooks accounting software helps you manage your cash flow and gets you tax ready with expense tracking, custom invoices, financial reports and more.'}
                </p>
              </div>
            </button>

            <button
              className="border-2 w-full lg:w-1/2 h-28 p-4 rounded-lg text-start flex gap-4"
              onClick={(e) => {
                if (!hasTokenOfTypes(['pco'])) {
                  pcLoginHandler()
                } else {
                  e.stopPropagation()
                }
              }}
            >
              <img src={pcoIcon} className="h-full w=full" />
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 items-center">
                  {hasTokenOfTypes(['pco']) ? (
                    <div className="border-2 rounded-lg border-btmColor">
                      <BiSync className="text-btmColor" />
                    </div>
                  ) : null}
                  <p className="text-greenText">
                    {hasTokenOfTypes(['pco'])
                      ? 'Synced with Planning Center'
                      : 'Click to sync with Planning Center'}
                  </p>
                </div>

                <p
                  className={`${
                    hasTokenOfTypes(['pco'])
                      ? 'underline italic font-normal text-btmColor cursor-pointer'
                      : 'text-gray-400 text-sm font-normal'
                  } `}
                  onClick={() =>
                    deleteToken(
                      tokenList &&
                        tokenList[0]?.tokens.find((a) => a.token_type === 'pco')
                          ?.id,
                    )
                  }
                >
                  {hasTokenOfTypes(['pco'])
                    ? 'Click to log-out'
                    : ' Planning Center is a set of software tools to help you organize information, coordinate events, communicate with your team, and connect with your congregation.'}
                </p>
              </div>
            </button>

            <button
              className="border-2 w-full lg:w-1/2 h-28 p-4 rounded-lg text-start flex gap-4"
              onClick={(e) => {
                if (!hasTokenOfTypes(['stripe'])) {
                  stripeLoginHandler()
                } else {
                  e.stopPropagation()
                }
              }}
            >
              <img src={stripeIcon} className="h-full w=full" />
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 items-center">
                  {hasTokenOfTypes(['stripe']) ? (
                    <div className="border-2 rounded-lg border-btmColor">
                      <BiSync className="text-btmColor" />
                    </div>
                  ) : null}

                  <p className="text-greenText">
                    {hasTokenOfTypes(['stripe'])
                      ? 'Synced with Stripe'
                      : 'Click to sync with Stripe'}
                  </p>
                </div>
                <p
                  className={`${
                    hasTokenOfTypes(['stripe'])
                      ? 'underline italic font-normal text-btmColor cursor-pointer'
                      : 'text-gray-400 text-sm font-normal'
                  } `}
                  onClick={() =>
                    deleteToken(
                      tokenList &&
                        tokenList[0]?.tokens.find(
                          (a) => a.token_type === 'stripe',
                        )?.id,
                    )
                  }
                >
                  {hasTokenOfTypes(['stripe'])
                    ? 'Click to log-out'
                    : 'Stripe’s software and APIs to accept payments, send payouts, and anage their businesses online.'}
                </p>
              </div>
            </button>
            {/* <LoginButton
          loginImage={qboLogin}
          onClick={qboLoginHandler}
          name="Already connected to Qbo"
          isHide={
            tokenList &&
            tokenList[0]?.tokens.find((a) => a.token_type === 'qbo')
              ? true
              : false
          }
          logoutHandler={() =>
            deleteToken(
              tokenList &&
                tokenList[0]?.tokens.find((a) => a.token_type === 'qbo')?.id,
            )
          }
          isLoading={isBtnLoading.qboLoading || isLoading || isRefetching}
        />
        <LoginButton
          loginImage={stripeLogin}
          onClick={stripeLoginHandler}
          name="Already connected to Stripe Connect"
          isHide={
            tokenList &&
            tokenList[0]?.tokens.find((a) => a.token_type === 'stripe')
              ? true
              : false
          }
          isLoading={isBtnLoading.stripeLoading || isLoading || isRefetching}
          logoutHandler={() =>
            deleteToken(
              tokenList &&
                tokenList[0]?.tokens.find((a) => a.token_type === 'stripe')?.id,
            )
          }
        /> */}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

export default Account
