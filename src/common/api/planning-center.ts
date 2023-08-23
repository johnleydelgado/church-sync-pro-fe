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

const pcGetFunds = async ({ email }: { email: string | null | undefined }) => {
  // await axios.get
  const url = pcRoutes.getFunds
  try {
    const response = await apiCall.get(url + `?email=${email}`)
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
    return []
  }
}

const pcGetBatches = async (
  email: string | null | undefined,
  dateRange?: any,
) => {
  // await axios.get
  const url = pcRoutes.getBatches
  const dataJson = JSON.stringify({ email, dateRange })
  try {
    const response = await apiCall.post(url, dataJson)
    console.log('a', response.data)
    const data = response.data.data
    return data
  } catch (e: any) {
    return []
  }
}

const pcGetRegistrationEvents = async (email: string | null | undefined) => {
  // await axios.get
  const url = pcRoutes.getRegistrationEvents
  try {
    const response = await apiCall.get(url + `?email=${email}`)
    console.log('aaaa', response)
    const data = response.data.data.map((item: any) => {
      return {
        value: item.value || '',
        label: item.name || '',
      }
    })
    return data
  } catch (e: any) {
    return []
  }
}

export { pcGetFunds, pcGetBatches, pcGetRegistrationEvents }
