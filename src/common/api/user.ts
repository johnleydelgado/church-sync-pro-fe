/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import axios from 'axios'
import { faker } from '@faker-js/faker'
import { userRoutes } from '../constant/routes-api'
import { error } from 'console'
import { resizeFile } from '../utils/image.optimizer'
import { BankAccountExpensesProps, BankAccountProps } from '@/redux/common'
const { REACT_APP_API_PATH } = process.env

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
  // await axios.get
  const url = userRoutes.createSettings
  try {
    const response = await apiCall.post(url, rest)
    return response.data
  } catch (e: any) {
    return []
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
}) => {
  // await axios.get
  const url = userRoutes.manualSync
  const data = JSON.stringify({ ...rest })

  try {
    const response = await apiCall.post(url, data)
    return response.data
  } catch (e: any) {
    return []
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

const sendEmailInvitation = async (
  name: string,
  email: string,
  clientId: number,
) => {
  const url = userRoutes.sendEmailInvitation
  const data = JSON.stringify({ name, emailTo: email, clientId })

  try {
    const response = await apiCall.post(url, data)
    return response.data
  } catch (e: any) {
    return null
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

const updateInvitationStatus = async (email: string, bookkeeperId?: number) => {
  const url = userRoutes.updateInvitationStatus
  const data = JSON.stringify({ email, bookkeeperId })

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
    file: await resizeFile(file),
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

export {
  updateUser,
  createUser,
  addTokenInUser,
  createSettings,
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
  addUpdateBankCharges,
}
