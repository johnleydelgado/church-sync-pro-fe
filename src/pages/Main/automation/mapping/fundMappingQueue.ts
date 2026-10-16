import type { Query, QueryClient } from 'react-query'
import { createSettings, qboSettings } from '@/common/api/user'
import { UserSettingsProps } from '@/common/constant/interfaces'
import { writeSettingsCache } from './settingsCache'

/**
 * One save queue per church for its Donation fund mapping, shared by every screen that saves it
 * (the Mapping page's auto-save, Save, Archive and save-on-leave, and the Archive page). Module
 * level, so it outlives the components: a page mounted while an earlier page's save is still
 * on its way starts from that save's list and queues behind it.
 */

/** One save asked for: its list, and the promise that settles when it has been saved or failed. */
export interface PendingFundMappingSave {
  list: qboSettings[]
  done: Promise<void>
}

interface ChurchQueue {
  /** The last save asked for; the next one starts when it settles. */
  chain: Promise<unknown>
  /**
   * The newest save asked for that has not settled yet - set before it is sent, and back to
   * null once it has (saved or failed) if nothing newer was asked for since. Only while it is
   * set does it beat the cached settings: after that the cache holds the server's list, which
   * someone else may have changed since.
   */
  latest: PendingFundMappingSave | null
  /** Saves asked for and not settled yet. */
  unsettled: number
}

const queues = new Map<number, ChurchQueue>()

const queueFor = (churchId: number): ChurchQueue => {
  let queue = queues.get(churchId)
  if (!queue) {
    queue = { chain: Promise.resolve(), latest: null, unsettled: 0 }
    queues.set(churchId, queue)
  }
  return queue
}

const ignore = () => undefined

const isChurchSettings = (churchId: number) => (q: Query) =>
  q.queryKey[0] === 'getUserRelatedSettings' && q.queryKey[2] === churchId

/** The newest save for this church still on its way, or null. */
export const latestFundMapping = (churchId: number) =>
  queues.get(churchId)?.latest ?? null

/** Resolves (never rejects) once every save asked for so far for this church has settled. */
export const fundMappingSettled = (churchId: number) =>
  (queues.get(churchId)?.chain ?? Promise.resolve()).then(ignore, ignore)

/** Whether any church's fund mapping has a save on its way. */
export const hasUnsettledFundMappingSave = () =>
  Array.from(queues.values()).some((q) => q.unsettled > 0)

// Closing or reloading the tab with a save still on its way would drop it: ask first.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    if (!hasUnsettledFundMappingSave()) return
    e.preventDefault()
    e.returnValue = ''
  })
}

/** The fund mapping in a church's settings object, or an empty list. */
export const savedMappingOf = (userData: any): qboSettings[] =>
  Array.isArray(userData?.UserSetting?.settingsData)
    ? userData.UserSetting.settingsData
    : []

/**
 * The church's fund mapping as it stands: the newest save still on its way, else the newest
 * cached copy of its settings. Read it after `fundMappingSettled` for the server's view.
 */
export const currentFundMapping = (
  queryClient: QueryClient,
  churchId: number,
): qboSettings[] => {
  const latest = latestFundMapping(churchId)
  if (latest) return latest.list
  const newest = queryClient
    .getQueryCache()
    .findAll({
      predicate: (q) =>
        isChurchSettings(churchId)(q) && q.state.data !== undefined,
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
  // A ticket per call: compared by identity, so two saves of the same array stay apart.
  const ticket = { list } as PendingFundMappingSave
  queue.latest = ticket
  queue.unsettled += 1

  const run = queue.chain.then(ignore, ignore).then(async () => {
    await createSettings({ email, settingsData: list })
    // A settings fetch that left before this save landed would put the old list back.
    const loadingWithoutData = queryClient.getQueryCache().findAll({
      predicate: (q) =>
        isChurchSettings(churchId)(q) &&
        q.state.isFetching &&
        q.state.data === undefined,
    })
    await queryClient.cancelQueries({ predicate: isChurchSettings(churchId) })
    writeSettingsCache(queryClient, churchId, {
      settingsData:
        list as unknown as UserSettingsProps['UserSetting']['settingsData'],
    })
    // A first load that was cancelled has nothing to show: load it again, after the save.
    if (loadingWithoutData.length > 0) {
      queryClient.refetchQueries({
        predicate: (q) => loadingWithoutData.includes(q),
      })
    }
    if (queue.latest === ticket) queue.latest = null
  })
  ticket.done = run
  queue.chain = run
  run.then(
    () => {
      queue.unsettled -= 1
    },
    () => {
      queue.unsettled -= 1
      if (queue.latest === ticket) queue.latest = null
    },
  )
  return run
}
