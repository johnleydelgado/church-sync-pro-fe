/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import axios from 'axios'
import { faker } from '@faker-js/faker'
import { userRoutes } from '../constant/routes-api'
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
  isAutomationEnable: boolean
}

export interface SettingRegistrationQBOProps {
  email: string
  settingRegistrationData?: qboRegistrationSettings[]
  isAutomationEnable: boolean
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
  organization_name?: string
  tokenEntityId?: number
  isSelected?: boolean
  isDeleted?: boolean
  enableEntity?: boolean
  tokens?: Token[]
}

const apiCall = axios.create({
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

const manualSync = async ({
  ...rest
}: {
  email: string
  dataBatch: any
  batchId: string
}) => {
  // await axios.get
  const url = userRoutes.manualSync
  try {
    const response = await apiCall.post(url, rest)
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
    return null
  }
}

const getTokenList = async (email: string) => {
  const url = userRoutes.getTokenList
  const data = JSON.stringify({ email })
  try {
    const response = await apiCall.post(url, data)
    return response.data.data
  } catch (e: any) {
    return null
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
}
