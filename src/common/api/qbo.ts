/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import axios from 'axios'
import { faker } from '@faker-js/faker'
import { pcRoutes, qboRoutes } from '../constant/routes-api'
import { GroupBase, OptionsOrGroups } from 'react-select'
const BASE_PATH = 'http://localhost:8080/csp/'

const apiCall = axios.create({
  baseURL: BASE_PATH,
  headers: {
    'Content-type': 'application/json',
  },
})

type OptionType = { value: string; label: string; name: string }

const QboGetAllQboData = async ({ email }: { email: string }) => {
  // await axios.get
  const url = qboRoutes.getAllQboData
  try {
    const response = await apiCall.post(url, { email })
    const jsonObject = response.data.data
    jsonObject.accounts = jsonObject.accounts.map(
      (account: { value: string; name: string }) => ({
        value: account.value,
        label: account.name,
      }),
    )
    jsonObject.classes = jsonObject.classes.map(
      (cls: { value: string; name: string }) => ({
        value: cls.value,
        label: cls.name,
      }),
    )
    jsonObject.customers = jsonObject.customers.map(
      (customer: { value: string; name: string }) => ({
        value: customer.value,
        label: customer.name,
      }),
    )

    return jsonObject
  } catch (e: any) {
    return []
  }
}

export { QboGetAllQboData }
