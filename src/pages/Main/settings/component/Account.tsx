import LoginButton from '@/pages/Auth/secondaryLogin/components/LoginButton'
import pcLogin from '@/common/assets/planning-center-btn.png'
import qboLogin from '@/common/assets/qbo_login.png'
import stripeLogin from '@/common/assets/stripe.png'

import React, { FC, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { failNotification } from '@/common/utils/toast'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import { updateUserToken } from '@/common/api/user'
import { authApi } from '@/common/api/auth'
import { useQuery } from 'react-query'
import { getTokenList } from '@/common/api/user'
import { useDispatch } from 'react-redux'
import { setAccountState } from '@/redux/common'

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

  const { data: tokenList, refetch } = useQuery<AccountTokenDataProps[]>(
    ['getTokenList'],
    async () => {
      const emailLatest =
        role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : email
      if (emailLatest) return await getTokenList(emailLatest)
    },
    {
      staleTime: Infinity,
      cacheTime: Infinity,
    },
  )

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

  useEffect(() => {
    const loadState = async () => {
      if (accountState) {
        const { type, access_token, refresh_token, realm_id } = accountState
        try {
          const tokenObject = {
            email,
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
    <div className="w-full  flex flex-col bg-white shadow-lg rounded-lg p-8 justify-center items-center">
      <div className="flex flex-col gap-2 p-4">
        <p className="text-4xl font-thin">Connect your accounts</p>
        <p className="text-sm font-thin">
          Before you started, connect your pco, qbo and stripes accounts
        </p>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <LoginButton
          loginImage={pcLogin}
          onClick={pcLoginHandler}
          name="Already connected to Planning Center"
          isHide={
            tokenList &&
            tokenList[0]?.tokens.find((a) => a.token_type === 'pco')
              ? true
              : false
          }
          isLoading={isBtnLoading.pcoLoading}
        />
        <LoginButton
          loginImage={qboLogin}
          onClick={qboLoginHandler}
          name="Already connected to Qbo"
          isHide={
            tokenList &&
            tokenList[0]?.tokens.find((a) => a.token_type === 'qbo')
              ? true
              : false
          }
          isLoading={isBtnLoading.qboLoading}
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
          isLoading={isBtnLoading.stripeLoading}
        />
      </div>
    </div>
  )
}

export default Account
