/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import axios from 'axios'
import { faker } from '@faker-js/faker'
import { userRoutes } from '../constant/routes-api'
import { error } from 'console'
import { resizeFile } from '../utils/image.optimizer'
import {
  BankAccountExpensesProps,
  BankAccountProps,
  BookkeeperInfo,
  UserInfo,
} from '@/redux/common'
import { BillingData } from '@/pages/Main/settings/component/Billing'
const { REACT_APP_API_PATH } = process.env

interface ToggleUserActiveStatusParams {
  userId: number
  isActive: boolean
}

export interface UserProps {
  churchName?: string
  firstName?: string
  lastName?: string
  email: string
  password?: string
}

export interface TokensProps {
  access_token_pc?: string
  refresh_token_pc?: string
  access_token_qbo?: string
  refresh_token_qbo?: string
  access_token_stripe?: string
  refresh_token_stripe?: string
  realm_id?: string
  email: string
}

export interface qboSettings {
  fundName: string | null | undefined
  account?: { value: string; label: string }
  class?: { value: string; label: string }
  customer?: { value: string; label: string }
}

export interface qboRegistrationSettings {
  registration: string | null | undefined
  account?: { value: string; label: string }
  class?: { value: string; label: string }
  customer?: { value: string; label: string }
  isActive?: boolean
}

export interface SettingQBOProps {
  email: string
  settingsData?: qboSettings[]
}

export interface SettingRegistrationQBOProps {
  email: string
  settingRegistrationData?: qboRegistrationSettings[]
}

interface Token {
  id?: number
  token_type: 'stripe' | 'qbo' | 'pco' | string
  access_token: string | null
  refresh_token: string | null
  realm_id: string | null
}

export interface UserTokenProps {
  id?: number
  email?: string
  userId?: number
  token_type?: 'stripe' | 'pco' | 'qbo' | string
  access_token?: string
  refresh_token?: string
  realm_id?: string
  // organization_name?: string
  // tokenEntityId?: number
  // isSelected?: boolean
  // isDeleted?: boolean
  // enableEntity?: boolean
  // tokens?: Token[]
}

export const apiCall = axios.create({
  baseURL: REACT_APP_API_PATH,
  headers: {
    'Content-type': 'application/json',
  },
})

const updateUser = async ({ ...rest }: UserProps) => {
  // await axios.get
  const url = userRoutes.updateUser
  try {
    const response = await apiCall.post(url, rest)
    return response.data
  } catch (e: any) {
    return []
  }
}

const createUser = async ({ ...rest }: UserProps) => {
  // await axios.get
  const url = userRoutes.createUser
  try {
    const response = await apiCall.post(url, rest)
    return response.data
  } catch (e: any) {
    return []
  }
}

const addTokenInUser = async ({ ...rest }: TokensProps) => {
  // await axios.get
  const url = userRoutes.addTokenInUser
  try {
    const response = await apiCall.post(url, rest)
    return response.data
  } catch (e: any) {
    return []
  }
}

const createSettings = async ({
  ...rest
}: SettingQBOProps | SettingRegistrationQBOProps) => {
  const url = userRoutes.createSettings
  try {
    const response = await apiCall.post(url, rest)
    return response.data
  } catch (e: any) {
    // Rethrow. This used to return [] on failure, which made a failed save
    // indistinguishable from a successful one - so the mapping page's auto-save
    // reported "Changes saved" for writes that never landed. Every caller runs
    // this through react-query's useMutation, which catches the rejection and
    // surfaces it as isError rather than letting it escape.
    // The backend answers with `{ error }`, other handlers with `{ message }`; read both so
    // the real reason reaches the page instead of the generic fallback.
    throw new Error(
      e?.response?.data?.error ??
        e?.response?.data?.message ??
        'Your mapping could not be saved.',
    )
  }
}

const updateRegisterSettings = async ({
  data,
  email,
}: {
  data: qboRegistrationSettings[] | null
  email: string
}) => {
  const url = userRoutes.updateRegisterSettings
  const obj = JSON.stringify({ email, settingRegistrationData: data })

  try {
    const response = await apiCall.post(url, obj)
    return response.data
  } catch (e: any) {
    throw new Error(e)
  }
}

const enableAutoSyncSetting = async ({
  email,
  isAutomationEnable,
  isAutomationRegistration,
}: {
  email: string
  isAutomationEnable?: boolean
  isAutomationRegistration?: boolean
}) => {
  // await axios.get
  const url = userRoutes.enableAutoSyncSetting
  const dataJson = JSON.stringify({
    email,
    isAutomationEnable,
    isAutomationRegistration,
  })
  try {
    const response = await apiCall.post(url, dataJson)
    return response.data
  } catch (e: any) {
    return []
  }
}

const addUpdateBankSettings = async ({
  email,
  data,
}: {
  email: string
  data: BankAccountProps[] | null
}) => {
  // await axios.get
  const url = userRoutes.addUpdateBankSettings
  const dataJson = JSON.stringify({
    email,
    data,
  })
  try {
    const response = await apiCall.post(url, dataJson)
    return response.data
  } catch (e: any) {
    return []
  }
}

const addUpdateBilling = async ({
  email,
  data,
}: {
  email: string
  data: BillingData | null
}) => {
  // await axios.get
  const url = userRoutes.addUpdateBilling
  const dataJson = JSON.stringify({
    email,
    data,
  })
  try {
    const response = await apiCall.post(url, dataJson)
    return response.data
  } catch (e: any) {
    return []
  }
}

const viewBilling = async ({ userId }: { userId: number | undefined }) => {
  // await axios.get
  const url = userRoutes.viewBilling
  const dataJson = JSON.stringify({ userId })
  try {
    const response = await apiCall.post(url, dataJson)
    return response.data
  } catch (e: any) {
    return []
  }
}

const addUpdateBankCharges = async ({
  email,
  data,
}: {
  email: string
  data: BankAccountExpensesProps | null
}) => {
  // await axios.get
  const url = userRoutes.addUpdateBankCharges
  const dataJson = JSON.stringify({
    email,
    data,
  })
  try {
    const response = await apiCall.post(url, dataJson)
    return response.data
  } catch (e: any) {
    return []
  }
}

const getUserRelated = async (email: string) => {
  // await axios.get
  const url = userRoutes.getUserRelated
  try {
    const response = await apiCall.get(url + `?email=${email}`)
    return response.data
  } catch (e: any) {
    return []
  }
}

export interface DailyJournalEntryCredit {
  accountRef: string
  amount: number
  /** The account's name, resolved server-side from the church's fund mapping. */
  accountName?: string
}

export interface DailyJournalEntry {
  date: string
  status: 'posted' | 'pending' | 'failed' | string
  gross: number
  fees: number
  net: number
  credits: DailyJournalEntryCredit[]
  memo: string
  batchId: string
}

export interface DailyJournalEntriesData {
  automation: {
    isEnabled: boolean
    lastRunAt: string | null
    lastRunStatus: string | null
  }
  /** Cumulative net CSP has posted to clearing - grows forever, not the live balance. */
  clearingBalance: number
  /** The clearing account's live balance read from QuickBooks; null if unreadable. */
  qboClearingBalance: number | null
  clearingAccountName: string | null
  entries: DailyJournalEntry[]
}

export interface ClearingStatementLine {
  date: string
  gross: number
  fees: number
  refundsGross: number
  refundsFees: number
  net: number
  runningBalance: number
  entries: number
  qboEntryIds: string[]
  batchIds: string[]
}

/** The mid-period switch-over. Dollars. Figures are null when an input could not be read. */
export interface ClearingTransition {
  goLiveDay: string
  balanceAtGoLive: number | null
  snapshotAt: string | null
  postedSinceGoLive: number
  qboBalance: number | null
  released: number | null
  inTransit: number | null
  trueUp: number | null
  truedUpAt: string | null
}

export interface ClearingStatementData {
  month: string
  clearingAccount: { value: string; name: string } | null
  opening: number
  lines: ClearingStatementLine[]
  totals: {
    gross: number
    fees: number
    refundsGross: number
    refundsFees: number
    net: number
  }
  closing: number
  qboBalance: number | null
  difference: number | null
  transition: ClearingTransition | null
  generatedAt: string
}

/** One day of Stripe-processed giving, as Planning Center reports it. Amounts are dollars. */
export interface StripeGivingDay {
  date: string
  donations: number
  gross: number
  fees: number
  net: number
  /** What CSP has done about the day: 'posted', 'failed', or 'pending' when no entry exists yet. */
  status: string
  postedGross: number
  /** Stripe gifts dated this day that have not settled yet (ACH, mostly). Not in `gross`. */
  inTransit: number
  inTransitGross: number
}

export interface StripeGivingByDayData {
  days: StripeGivingDay[]
  orgTimeZone?: string
  /**
   * The church's sync start date as YYYY-MM-DD, or null when they have not set one.
   * Days before it are giving the church has decided not to bring across.
   */
  syncStartDay?: string | null
  from?: string
  to?: string
  /** Set when the church is not set up enough to answer - no PCO token, say. */
  unavailable?: string
}

const getStripeGivingByDay = async (
  email: string,
  from: string,
  to: string,
): Promise<StripeGivingByDayData> => {
  const url = userRoutes.getStripeGivingByDay
  const res = await apiCall.get(
    url + `?email=${encodeURIComponent(email)}&from=${from}&to=${to}`,
  )
  return res.data.data
}

/** One donation inside a day's Stripe giving. Amounts are dollars; `fee` is positive. */
export interface StripeGivingDonation {
  id: string
  receivedAt: string
  completedAt: string | null
  gross: number
  fee: number
  net: number
  paymentMethod: string
  paymentMethodSub: string | null
  paymentStatus: string
  feeCovered: boolean
  designations: { fundName: string; amount: number }[]
}

export interface StripeGivingDayDetail {
  day: string
  orgTimeZone?: string
  donations: StripeGivingDonation[]
  totals?: { gross: number; fees: number; net: number; count: number }
  unavailable?: string
}

const getStripeGivingDayDetail = async (
  email: string,
  day: string,
): Promise<StripeGivingDayDetail> => {
  const url = userRoutes.getStripeGivingDayDetail
  const res = await apiCall.get(
    url + `?email=${encodeURIComponent(email)}&day=${day}`,
  )
  return res.data.data
}

const postStripeGivingDay = async (
  email: string,
  day: string,
): Promise<{
  status: string
  postedDays: string[]
  failedDays: string[]
  reason?: string
}> => {
  const url = userRoutes.postStripeGivingDay
  const res = await apiCall.post(url, JSON.stringify({ email, day }))
  return res.data.data
}

const getClearingStatement = async (
  email: string,
  month: string,
): Promise<ClearingStatementData> => {
  const url = userRoutes.getClearingStatement
  const res = await apiCall.get(
    url + `?email=${encodeURIComponent(email)}&month=${month}`,
  )
  return res.data.data
}

const markTransitionTruedUp = async (
  email: string,
): Promise<{ truedUpAt: string }> => {
  const url = userRoutes.markTransitionTruedUp
  const res = await apiCall.post(url, JSON.stringify({ email }))
  return res.data.data
}

const getDailyJournalEntries = async (
  email: string,
): Promise<DailyJournalEntriesData> => {
  const url = userRoutes.getDailyJournalEntries
  const res = await apiCall.get(url + `?email=${email}`)
  return res.data.data
}

const deleteBookeeper = async (id: string) => {
  const url = '/deleteBookeeper'
  const data = JSON.stringify({ id })
  try {
    const response = await apiCall.post(url, data)
    return response.data.data
  } catch (e: any) {
    throw new Error(e.message)
  }
}

const manualSync = async ({
  ...rest
}: {
  email: string
  dataBatch: any
  batchId: string
  realBatchId: string
  bankData: BankAccountProps[] | null
  donations: any
}) => {
  // await axios.get
  const url = userRoutes.manualSync
  const data = JSON.stringify({ ...rest })

  try {
    const response = await apiCall.post(url, data)
    return response.data
  } catch (e: any) {
    return e?.response?.data ?? null
  }
}

const isUserHaveTokens = async (email: string) => {
  const url = userRoutes.isUserHaveTokens
  const data = JSON.stringify({ email })
  try {
    const response = await apiCall.post(url, data)
    return response.data.data
  } catch (e: any) {
    throw new Error(e.message)
  }
}

const getTokenList = async (email: string) => {
  const url = userRoutes.getTokenList
  const data = JSON.stringify({ email })
  try {
    const response = await apiCall.post(url, data)
    return response.data.data
  } catch (e: any) {
    throw new Error(e.message)
  }
}

const updateUserToken = async (tokenData: UserTokenProps) => {
  const url = userRoutes.updateUserToken
  const data = JSON.stringify(tokenData)

  try {
    const response = await apiCall.post(url, data)
    return response.data.data
  } catch (e: any) {
    return null
  }
}

const deleteUserToken = async (id: number) => {
  const url = userRoutes.deleteUserToken
  const data = JSON.stringify({ id })

  try {
    const response = await apiCall.post(url, data)
    return response.data
  } catch (e: any) {
    return null
  }
}

// A bookkeeper adding a church. Done through the backend rather than the browser
// sign-up API: that API sets the NEW user's session cookies, so the bookkeeper's tab
// would silently carry on as the church. Throws on failure (409 = church exists).
const createClientChurch = async (churchName: string, bookkeeperId: number) => {
  const url = userRoutes.createClientChurch
  const response = await apiCall.post(
    url,
    JSON.stringify({ churchName, bookkeeperId }),
  )
  return response.data.data as { clientId: number; email: string }
}

const sendEmailInvitation = async (
  name: string,
  email: string,
  clientId: number,
  createdByBk = false,
  bookkeeperId?: number | undefined,
) => {
  const url = userRoutes.sendEmailInvitation

  // Conditionally include bookkeeperId if it exists
  const data = JSON.stringify({
    name,
    emailTo: email,
    clientId,
    createdByBk,
    ...(bookkeeperId ? { bookkeeperId } : {}), // Add bookkeeperId if it is defined
  })

  try {
    const response = await apiCall.post(url, data)
    return response.data
  } catch (e: any) {
    // Callers must be able to tell a failure from a send, so return the server's
    // reason rather than a bare null that reads as "nothing to report".
    return {
      success: false,
      message: e?.response?.data?.message ?? 'Request failed',
    }
  }
}

const sendPasswordReset = async (email: string) => {
  const url = userRoutes.sendPasswordReset
  const data = JSON.stringify({ email })

  const response = await apiCall.post(url, data)
  if (!response.data.success) {
    throw new Error(response.data.data)
  }
  return response.data
}

const resetPassword = async (
  email: string,
  token: string,
  password: string,
) => {
  const url = userRoutes.resetPassword
  const data = JSON.stringify({ email, token, password })

  try {
    const response = await apiCall.post(url, data)

    // Check if the API call was successful
    if (response.status === 200) {
      if (!response.data.success) {
        throw new Error(response.data.data)
      }
      return response.data
    } else {
      throw new Error(`API returned status code ${response.status}`)
    }
  } catch (e: any) {
    // Differentiate network errors from API errors
    if (e.response) {
      throw new Error(`API Error: ${e.response.data.data || 'Unknown error'}`)
    } else if (e.request) {
      // The request was made but no response was received
      throw new Error('Network Error: No response from server')
    } else {
      throw new Error(`Error: ${e.message}`)
    }
  }
}

const checkValidInvitation = async (
  email: string | null,
  invitationToken: string | null,
) => {
  const url = userRoutes.checkValidInvitation
  const data = JSON.stringify({ email, invitationToken })

  try {
    if (email && invitationToken) {
      const response = await apiCall.post(url, data)
      return response.data
    }
    return []
  } catch (e: any) {
    return null
  }
}

interface bookkeeperListParams {
  clientId?: number
  bookkeeperId?: number
}

const bookkeeperList = async ({
  clientId,
  bookkeeperId,
}: bookkeeperListParams) => {
  const url = userRoutes.bookkeeperList
  const data = JSON.stringify({ clientId, bookkeeperId })

  try {
    if (clientId || bookkeeperId) {
      const response = await apiCall.post(url, data)
      return response.data
    }
    return []
  } catch (e: any) {
    return null
  }
}

const updateInvitationStatus = async (
  email: string,
  invitationToken?: string | null,
) => {
  const url = userRoutes.updateInvitationStatus
  // The backend requires the token: it is the only credential the invitee has
  // before their session exists. It derives the user id from the email itself.
  const data = JSON.stringify({ email, invitationToken })

  try {
    if (email) {
      const response = await apiCall.post(url, data)
      return response.data
    }
    return []
  } catch (e: any) {
    return null
  }
}

const crudUserEmailPreferences = async (
  userId: number,
  email?: string,
  type?: string,
) => {
  const url = userRoutes.crudUserEmailPreferences
  const data = JSON.stringify({ userId, email, type })

  try {
    if (userId) {
      const response = await apiCall.post(url, data)
      console.log('response', response)
      return response.data.data
    }
    return []
  } catch (e: any) {
    return e.message || 'An error occurred'
  }
}

const setStartDataAutomation = async (
  email?: string,
  type?: 'donation' | 'registration',
  date?: string,
) => {
  const url = userRoutes.setStartDataAutomation
  const data = JSON.stringify({ date, email, type })

  if (!email) throw new Error('No account to save the start date against.')

  try {
    const response = await apiCall.post(url, data)
    return response.data.data
  } catch (e: any) {
    // Rethrow. This used to return the error message as if it were a result, so a rejected
    // save was indistinguishable from a successful one at every call site.
    throw new Error(
      e?.response?.data?.error ??
        e?.response?.data?.message ??
        'The start date could not be saved.',
    )
  }
}

const userUpdate = async ({
  email,
  firstName,
  lastName,
  churchName,
  userId,
  file = undefined,
  file_name = '',
}: {
  email: string
  firstName: string
  lastName: string
  churchName: string
  userId: number
  file?: any
  file_name?: string
}) => {
  const url = userRoutes.userUpdate
  const data = JSON.stringify({
    email,
    firstName,
    lastName,
    churchName,
    userId,
    file: file ? await resizeFile(file) : '',
    file_name,
  })

  console.log('aaa', data)

  try {
    if (email) {
      const response = await apiCall.post(url, data)
      return response.data
    }
    return []
  } catch (e: any) {
    throw new Error(e.message)
  }
}

const getUserRelatedSettings = async (
  user: UserInfo,
  bookkeeper: BookkeeperInfo | null,
) => {
  const email =
    user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
  if (email) {
    return await getUserRelated(email)
  }
  return []
}

/**
 * Calls the toggleUserActiveStatus API to update the isActive status of a user.
 * @param {ToggleUserActiveStatusParams} params - The userId and isActive status.
 * @returns {Promise<any>} - API response or null in case of error.
 */
const toggleUserActiveStatusApi = async ({
  userId,
  isActive,
}: ToggleUserActiveStatusParams) => {
  const url = userRoutes.toggleUserActiveStatus // Define the API endpoint in your route constants
  const data = JSON.stringify({ userId, isActive })

  try {
    if (userId && typeof isActive === 'boolean') {
      const response = await apiCall.post(url, data)
      return response.data
    }
    return null
  } catch (e: any) {
    console.error('Error calling toggleUserActiveStatus API:', e.message)
    return null
  }
}

export {
  createClientChurch,
  updateUser,
  createUser,
  addTokenInUser,
  createSettings,
  updateRegisterSettings,
  getUserRelated,
  manualSync,
  isUserHaveTokens,
  getTokenList,
  updateUserToken,
  deleteUserToken,
  sendEmailInvitation,
  sendPasswordReset,
  resetPassword,
  checkValidInvitation,
  bookkeeperList,
  updateInvitationStatus,
  enableAutoSyncSetting,
  deleteBookeeper,
  userUpdate,
  addUpdateBankSettings,
  addUpdateBilling,
  viewBilling,
  addUpdateBankCharges,
  crudUserEmailPreferences,
  setStartDataAutomation,
  getUserRelatedSettings,
  toggleUserActiveStatusApi,
  getDailyJournalEntries,
  getClearingStatement,
  markTransitionTruedUp,
  getStripeGivingByDay,
  postStripeGivingDay,
  getStripeGivingDayDetail,
}
