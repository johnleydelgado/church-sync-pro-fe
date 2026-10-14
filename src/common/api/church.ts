import axios from 'axios'
import { churchRoutes } from '../constant/routes-api'

const { REACT_APP_API_PATH } = process.env
const apiCall = axios.create({
  baseURL: REACT_APP_API_PATH,
  headers: { 'Content-type': 'application/json' },
})

/** A church the signed-in person belongs to (`GET /church/mine`). */
export interface MyChurch {
  id: number
  name: string
  isActive: boolean
  role: 'owner' | 'bookkeeper'
  /** Owner, or a bookkeeper an owner allowed to connect integrations. */
  canConnectIntegrations: boolean
  /** Owner. */
  canManagePeople: boolean
  /** The Users row the church's data is filed under. */
  accountUserId: number
  /** What the older endpoints take as `email`. */
  accountEmail: string
  connections: { qbo: boolean; pco: boolean }
}

/** One row of the People tab. */
export interface ChurchPerson {
  memberId: number
  role: 'owner' | 'bookkeeper'
  name: string | null
  /** The login's email, or the invited address. */
  email: string
  status: 'active' | 'invited'
  /** Owners: always true. */
  integrationAccessEnabled: boolean
  isYou: boolean
  /** Only for 'invited' rows, and only when the caller is an owner. */
  inviteLink: string | null
}

export interface InviteResult {
  memberId: number
  /** True: the email already had a login and was added straight away, so there is no link. */
  addedExisting: boolean
  inviteLink: string | null
  /** False when the email could not be sent; the link still works. */
  emailSent: boolean
}

/** The server's own sentence, so the page can show it as is. */
export class ChurchApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ChurchApiError'
    this.status = status
    Object.setPrototypeOf(this, ChurchApiError.prototype)
  }
}

const call = async <T>(p: Promise<any>, fallback: string): Promise<T> => {
  try {
    return (await p).data.data as T
  } catch (e: any) {
    const said = e?.response?.data?.message
    const message =
      typeof said === 'string' && said
        ? said
        : e?.response
        ? fallback
        : // The server was never reached: no status, no body.
          'Could not reach Church Sync Pro. Check your connection and try again.'
    throw new ChurchApiError(message, e?.response?.status)
  }
}

export const getMyChurches = async () => {
  const fallback = 'Could not load your churches.'
  const churches = await call<MyChurch[]>(
    apiCall.get(churchRoutes.mine),
    fallback,
  )
  // Anything but a list (an HTML error page, an old server) is a failure, not "no churches".
  if (!Array.isArray(churches)) throw new ChurchApiError(fallback)
  return churches
}

export const createChurch = (name: string) =>
  call<MyChurch>(
    apiCall.post(churchRoutes.create, { name }),
    'Could not add the church.',
  )

export const updateChurch = (
  churchId: number,
  changes: { name?: string; isActive?: boolean },
) =>
  call<'ok'>(
    apiCall.post(churchRoutes.update, { churchId, ...changes }),
    'Could not update the church.',
  )

export const getChurchPeople = (churchId: number) =>
  call<ChurchPerson[]>(
    apiCall.get(churchRoutes.people, { params: { churchId } }),
    'Could not load the people on this church.',
  )

export const inviteToChurch = (churchId: number, email: string) =>
  call<InviteResult>(
    apiCall.post(churchRoutes.invite, { churchId, email }),
    'Could not send the invite.',
  )

export const setPersonAccess = (
  churchId: number,
  memberId: number,
  integrationAccessEnabled: boolean,
) =>
  call<'ok'>(
    apiCall.post(churchRoutes.access, {
      churchId,
      memberId,
      integrationAccessEnabled,
    }),
    'Could not change their access.',
  )

export const removeFromChurch = (churchId: number, memberId: number) =>
  call<'ok'>(
    apiCall.post(churchRoutes.remove, { churchId, memberId }),
    'Could not remove them.',
  )
