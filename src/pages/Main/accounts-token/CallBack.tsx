import { updateUserToken } from '@/common/api/user'
import Loading from '@/common/components/loading/Loading'
import { mainRoute } from '@/common/constant/route'
import {
  MY_CHURCHES_KEY,
  useChurch,
  useMyChurches,
  useSwitchChurch,
} from '@/common/hooks/useChurch'
import {
  INTEGRATION_NAME,
  IntegrationType,
  PENDING_CONNECTION_MAX_AGE_MS,
} from '@/common/hooks/useConnectIntegration'
import { successNotification } from '@/common/utils/toast'
import { PendingConnection, setPendingConnection } from '@/redux/common'
import { RootState } from '@/redux/store'
import axios from 'axios'
import React, { FC, useEffect, useRef, useState } from 'react'
import { useQueryClient } from 'react-query'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router'
import { Link } from 'react-router-dom'

const { REACT_APP_API_PATH } = process.env

const COULD_NOT_FINISH = "We couldn't finish connecting"
const LOST_TRACK =
  'We lost track of which church this connection was for. Start again from the Churches page.'
const NOT_FINISHED =
  'Something went wrong while finishing the connection, so the connection may not have been saved. Please go back and try connecting again.'

/**
 * A record from an older build (no `type` / `startedAt`), or one left from a Connect click the
 * person walked away from, can't say which church this return is for.
 */
const isFresh = (p: PendingConnection | null): p is PendingConnection =>
  !!p &&
  !!INTEGRATION_NAME[p.type] &&
  typeof p.startedAt === 'number' &&
  Date.now() - p.startedAt <= PENDING_CONNECTION_MAX_AGE_MS

/** Which service the address says sent the person back: QuickBooks adds `realmId`, Stripe `scope`. */
const serviceInUrl = (params: URLSearchParams): IntegrationType =>
  params.get('realmId') ? 'qbo' : params.get('scope') ? 'stripe' : 'pco'

/** Trades the code in the address for the service's tokens. */
const exchangeCode = (
  type: IntegrationType,
  code: string,
): Promise<{ data: { access_token?: string; refresh_token?: string } }> => {
  if (type === 'qbo') {
    return axios.post(`${REACT_APP_API_PATH}callBackQBO`, {
      url: window.location.href,
    })
  }
  if (type === 'stripe') {
    return axios.post(`${REACT_APP_API_PATH}callBackStripe`, { code })
  }
  return axios.post(`${REACT_APP_API_PATH}callBackPC`, { code })
}

/**
 * Codes this tab has started finishing. A code is single-use, and switching church remounts
 * every page - this one too, if it is still on screen - so a second instance must not finish
 * the same return again.
 */
const handledCodes = new Set<string>()

interface Failure {
  heading: string
  message: string
  backTo: string
  backLabel: string
}

const CallBack: FC = () => {
  const subscribed = useRef(false)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const switchChurch = useSwitchChurch()
  // Persisted state from an older build has no `pendingConnection` key at all.
  const pending = useSelector(
    (state: RootState) => state.common.pendingConnection ?? null,
  )
  const { churchId: selectedId } = useChurch()
  const { data: churches } = useMyChurches()
  // `finish` runs once, from the first render; it reads these when it gets to the end.
  const latest = useRef({ selectedId, churches })
  useEffect(() => {
    latest.current = { selectedId, churches }
  }, [selectedId, churches])
  const [failure, setFailure] = useState<Failure | null>(null)

  const finish = async (record: PendingConnection | null) => {
    // This attempt is over whatever happens next; the next Connect click records its own church.
    if (record) dispatch(setPendingConnection(null))
    if (!isFresh(record)) {
      setFailure({
        heading: COULD_NOT_FINISH,
        message: LOST_TRACK,
        backTo: mainRoute.CHURCHES,
        backLabel: 'Go to Churches',
      })
      return
    }

    const service = INTEGRATION_NAME[record.type]
    const backTo = record.returnTo || mainRoute.CHURCHES
    const fail = (message = NOT_FINISHED) =>
      setFailure({
        heading: COULD_NOT_FINISH,
        message,
        backTo,
        backLabel: 'Back to connect',
      })

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (!code) {
      if (params.get('error')) {
        setFailure({
          heading: 'Connection cancelled',
          message: `You cancelled connecting ${service}. Nothing was saved.`,
          backTo,
          backLabel: 'Back to connect',
        })
        return
      }
      return fail()
    }
    // Never file one service's code as another's.
    if (serviceInUrl(params) !== record.type) {
      return fail(
        `This reply didn't come from ${service}, so nothing was saved. Please go back and try connecting again.`,
      )
    }

    let tokens: { access_token?: string; refresh_token?: string } | undefined
    try {
      tokens = (await exchangeCode(record.type, code)).data
    } catch (e) {
      console.error(e)
      return fail()
    }
    if (!tokens?.access_token) return fail()

    try {
      // Filed under the church's account. The server refuses anyone not allowed to connect
      // integrations for that church, and says so.
      const saved = await updateUserToken({
        email: record.accountEmail,
        userId: record.accountUserId,
        token_type: record.type,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        ...(record.type === 'qbo'
          ? { realm_id: params.get('realmId') || undefined }
          : {}),
      })
      if (!saved) return fail()
    } catch (e: any) {
      console.error(e)
      return fail(e?.message || NOT_FINISHED)
    }

    successNotification({
      title: `${service} connected for ${record.churchName}.`,
    })
    // The connection shows on the church list; replace a fetch that left before it was saved.
    queryClient.invalidateQueries(
      { queryKey: MY_CHURCHES_KEY },
      { cancelRefetch: true },
    )
    queryClient.invalidateQueries('getTokenList')
    queryClient.invalidateQueries('isUserTokens')
    // Leave first - replace, so Back can't land here again with a used code - then land on the
    // church the connection was for, not whichever was picked since. Switching remounts every
    // page; done the other way round it would remount this one (handledCodes covers that too).
    navigate(backTo, { replace: true })
    const now = latest.current
    if (now.selectedId !== record.churchId && Array.isArray(now.churches)) {
      const church = now.churches.find((c) => c.id === record.churchId)
      if (church) switchChurch(church)
    }
  }

  useEffect(() => {
    // Exchange the code once: it is single-use, StrictMode runs effects twice, and a church
    // switch can remount this page while the first instance is finishing.
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      if (handledCodes.has(code)) return
      handledCodes.add(code)
    }
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
            {failure.heading}
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
