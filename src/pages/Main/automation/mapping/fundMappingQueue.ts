import type { QueryClient } from 'react-query'
import { createSettings, getUserRelated, qboSettings } from '@/common/api/user'
import { UserSettingsProps } from '@/common/constant/interfaces'
import { trackSave } from '@/common/utils/pendingSaves'
import { writeSettingsCache } from './settingsCache'

/**
 * One save queue per church for its Donation fund mapping, shared by every screen that saves it
 * (the Mapping page's auto-save, Save, Archive and save-on-leave, and the Archive page). Module
 * level, so it outlives the components: a page mounted while an earlier page's save is still
 * on its way starts from that save's list and queues behind it.
 *
 * Saves send the whole list. Nothing here can stop a form left open while someone else edits
 * the same church from saving over their change: that needs versioned saves on the server.
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
   * set does it beat the cached settings: after that the cache holds the server's list as of
   * this tab's last save or fetch, and the server's own list wins (the Mapping page reads it
   * whenever it opens).
   */
  latest: PendingFundMappingSave | null
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

/** The newest save for this church still on its way, or null. */
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

  const run = queue.chain.then(ignore, ignore).then(async () => {
    await createSettings({ email, settingsData: list })
    // Cancels settings fetches still on their way, writes the list, then runs them again.
    await writeSettingsCache(queryClient, churchId, {
      settingsData:
        list as unknown as UserSettingsProps['UserSetting']['settingsData'],
    })
    if (queue.latest === ticket) queue.latest = null
  })
  ticket.done = run
  queue.chain = run
  // Counted from now until it settles: closing the tab or signing out waits for it (pendingSaves).
  trackSave(run)
  run.catch(() => {
    if (queue.latest === ticket) queue.latest = null
  })
  return run
}

/** The fund to reactivate isn't in the church's mapping on the server. */
export class FundNotInMappingError extends Error {
  constructor(fundName: string) {
    super(`${fundName} is no longer in this church's fund mapping.`)
    this.name = 'FundNotInMappingError'
    Object.setPrototypeOf(this, FundNotInMappingError.prototype)
  }
}

interface ReactivateFundArgs {
  queryClient: QueryClient
  churchId: number
  email: string
  fundName: string
}

const readAndReactivate = async ({
  queryClient,
  churchId,
  email,
  fundName,
}: ReactivateFundArgs) => {
  await fundMappingSettled(churchId)
  const res = await getUserRelated(email)
  if (!res?.data) {
    throw new Error(
      "Couldn't read this church's fund mapping, so nothing was changed. Please try again.",
    )
  }
  const current = savedMappingOf(res.data)
  if (!current.some((item) => item.fundName === fundName)) {
    throw new FundNotInMappingError(fundName)
  }
  await saveFundMapping({
    queryClient,
    churchId,
    email,
    list: current.map((item) =>
      item.fundName === fundName ? { ...item, isActive: true } : item,
    ),
  })
}

/**
 * Reactivate an archived fund (the Archive page). Waits for every earlier save for the church -
 * say, one the Mapping page sent on the way here - then reads the mapping from the server, not
 * from the cache (a cached copy may predate someone else's change), and saves it back through
 * the queue with the fund active. Never saves a list without the fund, or an empty one.
 *
 * Counted from the click until it settles (pendingSaves), not only once the save is sent:
 * closing the tab or signing out while the mapping is still being read asks first, or waits.
 */
export const reactivateFund = (args: ReactivateFundArgs): Promise<void> =>
  trackSave(readAndReactivate(args))
