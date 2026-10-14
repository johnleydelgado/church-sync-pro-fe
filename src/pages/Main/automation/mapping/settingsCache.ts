import { QueryClient } from 'react-query'
import { UserSettingsProps } from '@/common/constant/interfaces'

type UserSetting = UserSettingsProps['UserSetting']

/**
 * Put a value the server has just saved into every cached copy of one church's settings
 * (`['getUserRelatedSettings', reTrigger, churchId]`), so nothing read from the cache - a
 * remount, a tab switch, a loader effect - can put the pre-save value back over the person's
 * edit.
 *
 * Copies still loading are left alone (no data to change), and so are copies marked stale by a
 * failed save: those will ask the server next time, and a later success must not clear the flag.
 */
export const writeSettingsCache = (
  queryClient: QueryClient,
  churchId: number,
  change: Partial<UserSetting>,
) =>
  queryClient.setQueriesData<UserSettingsProps | undefined>(
    {
      predicate: (q) =>
        q.queryKey[0] === 'getUserRelatedSettings' &&
        q.queryKey[2] === churchId &&
        q.state.data !== undefined &&
        !q.state.isInvalidated,
    },
    (old) =>
      old && {
        ...old,
        UserSetting: { ...old.UserSetting, ...change } as UserSetting,
      },
  )
