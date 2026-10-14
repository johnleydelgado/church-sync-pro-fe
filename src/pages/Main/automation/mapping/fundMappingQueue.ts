import type { QueryClient } from 'react-query'
import { createSettings, qboSettings } from '@/common/api/user'
import { UserSettingsProps } from '@/common/constant/interfaces'
import { writeSettingsCache } from './settingsCache'

/**
 * One save queue per church for its Donation fund mapping, shared by every screen that saves it
 * (the Mapping page's auto-save, Save, Archive and save-on-leave, and the Archive page). Module
 * level, so it outlives the components: a page mounted while an earlier page's save is still
 * on its way starts from that save's list and queues behind it.
 */
interface ChurchQueue {
  /** The last save asked for; the next one starts when it settles. */
  chain: Promise<unknown>
  /**
   * The newest list asked to be saved this session, set before it is sent. Back to null when
   * that save fails and nothing newer was asked for: the cache (the server's list) is then right.
   */
  latest: qboSettings[] | null
}

const queues = new Map<number, ChurchQueue>()

const queueFor = (churchId: number): ChurchQueue => {
  let queue = queues.get(churchId)
  if (!queue) {
    queue = { chain: Promise.resolve(), latest: null }
    queues.set(churchId, queue)
  }
  return queue
}

const ignore = () => undefined

/** The newest list asked to be saved for this church this session, or null. */
export const latestFundMapping = (churchId: number) =>
  queues.get(churchId)?.latest ?? null

/** Resolves (never rejects) once every save asked for so far for this church has settled. */
export const fundMappingSettled = (churchId: number) =>
  (queues.get(churchId)?.chain ?? Promise.resolve()).then(ignore, ignore)

/** The fund mapping in a church's settings object, or an empty list. */
export const savedMappingOf = (userData: any): qboSettings[] =>
  Array.isArray(userData?.UserSetting?.settingsData)
    ? userData.UserSetting.settingsData
    : []

/**
 * The church's fund mapping as it stands: the newest list asked to be saved, else the newest
 * cached copy of its settings. Read it after `fundMappingSettled` for the server's view.
 */
export const currentFundMapping = (
  queryClient: QueryClient,
  churchId: number,
): qboSettings[] => {
  const latest = latestFundMapping(churchId)
  if (latest) return latest
  const newest = queryClient
    .getQueryCache()
    .findAll({
      predicate: (q) =>
        q.queryKey[0] === 'getUserRelatedSettings' &&
        q.queryKey[2] === churchId &&
        q.state.data !== undefined,
    })
    .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt)[0]
  return savedMappingOf(newest?.state.data)
}

/**
 * Save the church's fund mapping after every earlier save for it, then put the saved list into
 * every cached copy of its settings (so the next mount starts from it). Rejects with the
 * server's reason; the caller shows it.
 */
export const saveFundMapping = ({
  queryClient,
  churchId,
  email,
  list,
}: {
  queryClient: QueryClient
  churchId: number
  email: string
  list: qboSettings[]
}): Promise<void> => {
  const queue = queueFor(churchId)
  queue.latest = list
  const run = queue.chain.then(ignore, ignore).then(async () => {
    await createSettings({ email, settingsData: list })
    writeSettingsCache(queryClient, churchId, {
      settingsData:
        list as unknown as UserSettingsProps['UserSetting']['settingsData'],
    })
  })
  queue.chain = run
  run.catch(() => {
    if (queue.latest === list) queue.latest = null
  })
  return run
}
