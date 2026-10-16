import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { authApi } from '@/common/api/auth'
import { MyChurch } from '@/common/api/church'
import { setPendingConnection } from '@/redux/common'
import { persistor } from '@/redux/store'

const START = { qbo: 'authQB', pco: 'authPC' } as const
/** What each service is called in sentences. */
export const INTEGRATION_NAME = {
  qbo: 'QuickBooks',
  pco: 'Planning Center',
} as const

export type IntegrationType = keyof typeof START

/** A pending connection older than this is treated as missing: the person walked away from it. */
export const PENDING_CONNECTION_MAX_AGE_MS = 30 * 60 * 1000

/** authApi hands back the sign-in address, or [] when the call failed. */
const isUrl = (v: unknown): v is string =>
  typeof v === 'string' && /^https?:\/\//i.test(v)

/**
 * The sign-in address must carry this click's state: a server that dropped it (say, an older
 * backend during a deploy) would send the person through the whole sign-in only to be refused here.
 */
const carriesState = (uri: string, nonce: string) => {
  try {
    return new URL(uri).searchParams.get('state') === nonce
  } catch (e) {
    return false
  }
}

/** 16 random bytes as 32 lowercase hex characters: the OAuth `state` for one Connect click. */
const newNonce = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')

/**
 * Remember which church the connection is for, then go to QuickBooks / Planning Center.
 * `CallBack` reads it on the way back and files the connection under that church's account,
 * but only when the service hands back the same one-time `state` this click sent.
 * Throws (with a sentence to show) when the sign-in address can't be fetched.
 */
export const useConnectIntegration = () => {
  const dispatch = useDispatch()
  return useCallback(
    async (type: IntegrationType, church: MyChurch, returnTo: string) => {
      const nonce = newNonce()
      dispatch(
        setPendingConnection({
          type,
          churchId: church.id,
          churchName: church.name,
          accountEmail: church.accountEmail,
          accountUserId: church.accountUserId,
          returnTo,
          nonce,
          startedAt: Date.now(),
        }),
      )
      // redux-persist writes to localStorage asynchronously; leaving the page before it has
      // would come back with no record of which church this was for, or of the state it sent.
      await persistor.flush()
      // The server puts the state into the sign-in address; the service sends it back as is.
      const authUri = await authApi(`${START[type]}?state=${nonce}`)
      if (!isUrl(authUri) || !carriesState(authUri, nonce)) {
        dispatch(setPendingConnection(null))
        throw new Error(
          `Couldn't start connecting ${INTEGRATION_NAME[type]}. Please try again.`,
        )
      }
      window.location.href = authUri
    },
    [dispatch],
  )
}
