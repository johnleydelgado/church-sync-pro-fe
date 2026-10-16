import type { Query, QueryClient } from 'react-query'
import { UserSettingsProps } from '@/common/constant/interfaces'

type UserSetting = UserSettingsProps['UserSetting']

/** Every cached copy of one church's settings: `['getUserRelatedSettings', reTrigger, churchId]`. */
export const isChurchSettings = (churchId: number) => (q: Query) =>
  q.queryKey[0] === 'getUserRelatedSettings' && q.queryKey[2] === churchId

/**
 * Put a value the server has just saved into every cached copy of one church's settings, so a
 * remount - a tab switch, a return visit - starts from what was saved, not from what was loaded
 * before it. Every writer (bank, fee, fund mapping, registration mapping, Archive) goes through
 * here.
 *
 * 1. Fetches of those settings still on their way are cancelled first. One that left before the
 *    save landed would otherwise put the old value back when it lands - and cancelling reverts a
 *    copy to what it held when its fetch started, so a write made during the fetch would be lost
 *    if it came before the cancel. Cancel first, then write.
 * 2. The value goes into every copy that has data (copies still loading are left alone) with
 *    `setState`, not `setData`: a write is not a read from the server. It doesn't count as a
 *    fetch (`isFetchedAfterMount`, which the Mapping page waits on), and a copy marked stale by a
 *    failed save stays marked - the failed write may have landed, so it must still ask the server.
 * 3. Every cancelled fetch runs again, now reading the server after this save.
 */
export const writeSettingsCache = async (
  queryClient: QueryClient,
  churchId: number,
  change: Partial<UserSetting>,
) => {
  const ofChurch = isChurchSettings(churchId)
  const cache = queryClient.getQueryCache()
  const inFlight = cache.findAll({
    predicate: (q) => ofChurch(q) && q.state.isFetching,
  })
  await queryClient.cancelQueries({ predicate: ofChurch })

  const copies = cache.findAll({
    predicate: (q) => ofChurch(q) && q.state.data !== undefined,
  }) as Query<UserSettingsProps>[]
  copies.forEach((q) => {
    const old = q.state.data as UserSettingsProps
    q.setState({
      ...q.state,
      data: {
        ...old,
        UserSetting: { ...old.UserSetting, ...change } as UserSetting,
      },
    })
  })

  if (inFlight.length > 0) {
    queryClient.refetchQueries({ predicate: (q) => inFlight.includes(q) })
  }
}
