/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import axios from 'axios'
import { faker } from '@faker-js/faker'
import { pcRoutes } from '../constant/routes-api'
const BASE_PATH = 'http://localhost:8080/csp/'

const apiCall = axios.create({
  baseURL: BASE_PATH,
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

export { pcGetFunds }
