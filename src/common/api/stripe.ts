/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import axios from 'axios'
import { stripeRoutes } from '../constant/routes-api'
const { REACT_APP_API_PATH } = process.env

const apiCall = axios.create({
  baseURL: REACT_APP_API_PATH,
  headers: {
    'Content-type': 'application/json',
  },
})

const getStripePayouts = async (email: string) => {
  const url = stripeRoutes.getStripePayouts
  try {
    const response = await apiCall.get(url + `?email=${email}`)
    console.log('url', url)
    return response.data.data
  } catch (e: any) {
    return []
  }
}

const syncStripePayout = async (
  email: string | null | undefined,
  donationId: string,
  fundName: string,
  payoutDate: string,
) => {
  // await axios.get
  const url = stripeRoutes.syncStripePayout
  try {
    const response = await apiCall.get(
      url +
        `?email=${email}` +
        `&donationId=${donationId}` +
        `&fundName=${fundName}` +
        `&payoutDate=${payoutDate}`,
    )
    console.log('a', response.data)
    const data = response.data.data
    return data
  } catch (e: any) {
    return []
  }
}

export { getStripePayouts, syncStripePayout }
