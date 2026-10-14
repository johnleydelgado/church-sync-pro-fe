import type { Query, QueryClient } from 'react-query'
import { UserSettingsProps } from '@/common/constant/interfaces'

type UserSetting = UserSettingsProps['UserSetting']

/**
 * Put a value the server has just saved into every cached copy of one church's settings
 * (`['getUserRelatedSettings', reTrigger, churchId]`), so a remount - a tab switch, a return
 * visit - starts from what was saved, not from what was loaded before it.
 *
 * Copies still loading (no data yet) are left alone. Copies marked stale by a failed save are
 * written too, and then marked stale again: writing data clears the flag, and those copies must
 * still ask the server next time (the failed write may have landed). `invalidate()` only sets
 * the flag; it does not refetch.
 */
export const writeSettingsCache = (
  queryClient: QueryClient,
  churchId: number,
  change: Partial<UserSetting>,
) => {
  const isThisChurch = (q: Query) =>
    q.queryKey[0] === 'getUserRelatedSettings' &&
    q.queryKey[2] === churchId &&
    q.state.data !== undefined
  const stale = queryClient
    .getQueryCache()
    .findAll({ predicate: (q) => isThisChurch(q) && q.state.isInvalidated })
  const written = queryClient.setQueriesData<UserSettingsProps | undefined>(
    { predicate: isThisChurch },
    (old) =>
      old && {
        ...old,
        UserSetting: { ...old.UserSetting, ...change } as UserSetting,
      },
  )
  stale.forEach((q) => q.invalidate())
  return written
}
