/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import axios from 'axios'
import { faker } from '@faker-js/faker'
import { pcRoutes } from '../constant/routes-api'
const { REACT_APP_API_PATH } = process.env

const apiCall = axios.create({
  baseURL: REACT_APP_API_PATH,
  headers: {
    'Content-type': 'application/json',
  },
})

const pcGetFunds = async ({
  email,
  throwOnError = false,
}: {
  email: string | null | undefined
  // The Mapping page needs to know the call failed: an empty list there reads as "set up your
  // accounts", which sends a church to reconnect over a passing Planning Center hiccup. The old
  // payout views still treat [] as "no funds yet".
  throwOnError?: boolean
}) => {
  const url = pcRoutes.getFunds
  try {
    const response = await apiCall.get(url + `?email=${encodeURIComponent(email ?? '')}`)
    const data = response.data.data.map((item: any) => {
      return {
        ...item,
        isClick: false,
        project: faker.lorem.word(),
        description: faker.lorem.word(),
      }
    })
    return data
  } catch (e: any) {
    if (throwOnError) {
      throw new Error(
        e?.response
          ? "Planning Center didn't return your funds."
          : 'Could not reach Church Sync Pro.',
      )
    }
    return []
  }
}

const pcGetBatches = async (
  email: string | null | undefined,
  dateRange?: any,
  offset?: number,
  filterDate?: any,
  startFilterDate?: any,
  endFilterDate?: any,
  amount?: number,
) => {
  // await axios.get
  const url = pcRoutes.getBatches
  const dataJson = JSON.stringify({
    email,
    dateRange,
    offset,
    filterDate,
    startFilterDate,
    endFilterDate,
    amount,
  })
  try {
    const response = await apiCall.post(url, dataJson)
    console.log('a', response.data)
    const data = response.data.data
    return data
  } catch (e: any) {
    return []
  }
}

const pcHandleRegistrationEvents = async ({
  action,
  name,
  userId,
  registrationId,
}: {
  action: 'create' | 'read' | 'update'
  name?: string
  userId: number
  registrationId?: string
}) => {
  // await axios.get
  const url = pcRoutes.handleRegistrationEvents
  const dataJson = JSON.stringify({ action, name, userId, registrationId })
  try {
    const response = await apiCall.post(url, dataJson)
    if (action === 'read') {
      const data = response.data.data.map((item: any) => {
        return {
          value: item.name || '',
          label: item.name || '',
        }
      })
      return data
    }

    return true
  } catch (e: any) {
    return []
  }
}

export { pcGetFunds, pcGetBatches, pcHandleRegistrationEvents }
