import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { authApi } from '@/common/api/auth'
import { MyChurch } from '@/common/api/church'
import { setPendingConnection } from '@/redux/common'
import { persistor } from '@/redux/store'

const START = { qbo: 'authQB', pco: 'authPC', stripe: 'authStripe' } as const
const NAME = {
  qbo: 'QuickBooks',
  pco: 'Planning Center',
  stripe: 'Stripe',
} as const

export type IntegrationType = keyof typeof START

/** authApi hands back the sign-in address, or [] when the call failed. */
const isUrl = (v: unknown): v is string =>
  typeof v === 'string' && /^https?:\/\//i.test(v)

/**
 * Remember which church the connection is for, then go to QuickBooks / Planning Center / Stripe.
 * `CallBack` reads it on the way back and files the connection under that church's account.
 * Throws (with a sentence to show) when the sign-in address can't be fetched.
 */
export const useConnectIntegration = () => {
  const dispatch = useDispatch()
  return useCallback(
    async (type: IntegrationType, church: MyChurch, returnTo: string) => {
      dispatch(
        setPendingConnection({
          churchId: church.id,
          accountEmail: church.accountEmail,
          accountUserId: church.accountUserId,
          returnTo,
        }),
      )
      // redux-persist writes to localStorage asynchronously; leaving the page before it has
      // would come back with no record of which church this was for.
      await persistor.flush()
      const authUri = await authApi(START[type])
      if (!isUrl(authUri)) {
        dispatch(setPendingConnection(null))
        throw new Error(
          `Couldn't start connecting ${NAME[type]}. Please try again.`,
        )
      }
      window.location.href = authUri
    },
    [dispatch],
  )
}
