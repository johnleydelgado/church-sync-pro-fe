import { updateUserToken } from '@/common/api/user'
import Loading from '@/common/components/loading/Loading'
import { mainRoute } from '@/common/constant/route'
import { MY_CHURCHES_KEY } from '@/common/hooks/useChurch'
import { PendingConnection, setPendingConnection } from '@/redux/common'
import { RootState } from '@/redux/store'
import axios from 'axios'
import React, { FC, useEffect, useRef, useState } from 'react'
import { useQueryClient } from 'react-query'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router'
import { Link } from 'react-router-dom'

const { REACT_APP_API_PATH } = process.env

const LOST_TRACK =
  'We lost track of which church this connection was for. Start again from the Churches page.'
const NOT_FINISHED =
  'Something went wrong while finishing the connection, so nothing was saved. Please go back and try connecting again.'

interface Returned {
  token_type: 'qbo' | 'pco' | 'stripe'
  realm_id?: string
  /** Trades the code in the address for the service's tokens. */
  exchange: () => Promise<{
    data: { access_token?: string; refresh_token?: string }
  }>
}

/**
 * Which service sent the person back. All three send `code`; QuickBooks adds `realmId`, Stripe
 * adds `scope`, Planning Center neither. No code means they cancelled or the service refused.
 */
const readReturn = (): Returned | null => {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const realmId = params.get('realmId')
  if (!code) return null
  if (realmId) {
    return {
      token_type: 'qbo',
      realm_id: realmId,
      exchange: () =>
        axios.post(`${REACT_APP_API_PATH}callBackQBO`, {
          url: window.location.href,
        }),
    }
  }
  if (params.get('scope')) {
    return {
      token_type: 'stripe',
      exchange: () =>
        axios.post(`${REACT_APP_API_PATH}callBackStripe`, { code }),
    }
  }
  return {
    token_type: 'pco',
    exchange: () => axios.post(`${REACT_APP_API_PATH}callBackPC`, { code }),
  }
}

interface Failure {
  message: string
  backTo: string
  backLabel: string
}

const CallBack: FC = () => {
  const subscribed = useRef(false)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  // Persisted state from an older build has no `pendingConnection` key at all.
  const pending = useSelector(
    (state: RootState) => state.common.pendingConnection ?? null,
  )
  const [failure, setFailure] = useState<Failure | null>(null)

  const finish = async (to: PendingConnection | null) => {
    if (!to) {
      setFailure({
        message: LOST_TRACK,
        backTo: mainRoute.CHURCHES,
        backLabel: 'Go to Churches',
      })
      return
    }
    // This attempt is over whatever happens next; the next Connect click records its own church.
    dispatch(setPendingConnection(null))
    const fail = () =>
      setFailure({
        message: NOT_FINISHED,
        backTo: to.returnTo || mainRoute.CHURCHES,
        backLabel: 'Back to connect',
      })

    const returned = readReturn()
    if (!returned) return fail()
    try {
      const { data } = await returned.exchange()
      if (!data?.access_token) return fail()
      // The backend files it under the church's account, and refuses (null here) anyone not
      // allowed to connect integrations for that church.
      const saved = await updateUserToken({
        email: to.accountEmail,
        userId: to.accountUserId,
        token_type: returned.token_type,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        ...(returned.realm_id ? { realm_id: returned.realm_id } : {}),
      })
      if (!saved) return fail()
    } catch (e) {
      console.log(e)
      return fail()
    }

    queryClient.invalidateQueries(MY_CHURCHES_KEY)
    queryClient.invalidateQueries('getTokenList')
    queryClient.invalidateQueries('isUserTokens')
    // Replace: Back must not land here again with a code that has already been used.
    navigate(to.returnTo, { replace: true })
  }

  useEffect(() => {
    // Exchange the code once: it is single-use, and StrictMode runs effects twice.
    if (!subscribed.current) finish(pending)
    return () => {
      subscribed.current = true
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (failure) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 font-lato px-6">
        <div className="w-full max-w-md flex flex-col items-center text-center gap-4 bg-white shadow-xl rounded-2xl p-10">
          <h1 className="font-medium text-2xl text-gray-800">
            We couldn&apos;t finish connecting
          </h1>
          <p className="text-gray-500">{failure.message}</p>
          <Link
            to={failure.backTo}
            className="bg-yellow rounded-full shadow-sm h-12 mt-4 flex justify-center items-center hover:bg-slate-600 [&>*]:text-white px-8"
          >
            <p>{failure.backLabel}</p>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <Loading />
      <p className="font-lato text-gray-500">Finishing connection…</p>
    </div>
  )
}

export default CallBack
