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
import ConfirmActionModal from '@/common/components/modal/ConfirmActionModal'
import { MODALS_NAME } from '@/common/constant/modal'
import { OPEN_MODAL } from '@/redux/common'

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

  const [disconnectTarget, setDisconnectTarget] = useState<{
    id: number | undefined | null
    label: string
  } | null>(null)

  const requestDisconnect = (
    id: number | undefined | null,
    label: string,
  ) => {
    setDisconnectTarget({ id, label })
    dispatch(OPEN_MODAL(MODALS_NAME.modalConfirmDisconnect))
  }

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

  // One definition per integration. The three cards were previously ~60 lines of
  // near-identical JSX each, which is how the Stripe card drifted: it kept the
  // fixed h-28 while carrying a longer description, so its Connect button
  // rendered outside the card border.
  const INTEGRATIONS = [
    {
      type: 'qbo',
      name: 'QuickBooks',
      icon: qboIcon,
      loadingKey: 'qboLoading' as const,
      onConnect: qboLoginHandler,
      description:
        'Where your journal entries are posted. Church Sync Pro writes your daily giving entry here.',
    },
    {
      type: 'pco',
      name: 'Planning Center',
      icon: pcoIcon,
      loadingKey: 'pcoLoading' as const,
      onConnect: pcLoginHandler,
      description:
        'Where your donations come from. Online giving in Planning Center is the source for every entry.',
    },
    {
      type: 'stripe',
      name: 'Stripe',
      icon: stripeIcon,
      loadingKey: 'stripeLoading' as const,
      onConnect: stripeLoginHandler,
      description:
        'Used to reconcile payouts against your clearing account once the deposit lands.',
    },
  ]

  const hasTokenOfTypes = (types: string[]): boolean => {
    if (tokenList && tokenList[0]) {
      return Boolean(
        tokenList[0].tokens.find((a) => types.includes(a.token_type)),
      )
    }
    return false
  }

  const allConnected = INTEGRATIONS.every((it) => hasTokenOfTypes([it.type]))

  const deleteToken = async (id: number | undefined | null) => {
    try {
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
    <div className="h-full">
      <ConfirmActionModal
        modalName={MODALS_NAME.modalConfirmDisconnect}
        title={`Disconnect ${disconnectTarget?.label || ''}?`}
        body="Your syncs will stop until you reconnect."
        confirmLabel="Disconnect"
        onConfirm={() => deleteToken(disconnectTarget?.id)}
      />

      <div className="h-full">
        <div className="w-full  flex flex-col bg-white lg:px-8 py-4 justify-center mt-2">
          <div className="flex flex-col gap-2 lg:px-4">
            <p className="text-md font-thin">
              {allConnected
                ? 'Your accounts are connected.'
                : 'Before we start, connect your accounts first'}
            </p>
          </div>

          <div className="flex flex-col gap-4 pt-4 lg:p-4">
            {INTEGRATIONS.map((it) => {
              const connected = hasTokenOfTypes([it.type])
              const loading = isBtnLoading[it.loadingKey]
              return (
                <div
                  key={it.type}
                  className="flex w-full items-start gap-4 rounded-lg border-2 p-4 text-start lg:w-1/2"
                >
                  <img
                    src={it.icon}
                    alt={it.name}
                    className="h-14 w-14 shrink-0 object-contain"
                  />

                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-primary">{it.name}</p>
                      {connected ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                          <BiSync size={13} />
                          Connected
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                          Not connected
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-normal text-gray-400">
                      {it.description}
                    </p>

                    <div>
                      {connected ? (
                        <button
                          type="button"
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                          onClick={() =>
                            requestDisconnect(
                              tokenList &&
                                tokenList[0]?.tokens.find(
                                  (a) => a.token_type === it.type,
                                )?.id,
                              it.name,
                            )
                          }
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-md bg-btmColor px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={it.onConnect}
                          disabled={loading}
                        >
                          {loading ? <CgSync className="animate-spin" /> : null}
                          {loading ? 'Connecting…' : 'Connect'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

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
    </div>
  )
}

export default Account
