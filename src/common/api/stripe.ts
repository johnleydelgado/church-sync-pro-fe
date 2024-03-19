/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import axios from 'axios'
import { stripeRoutes } from '../constant/routes-api'
import { BankAccountProps } from '@/redux/common'
const { REACT_APP_API_PATH } = process.env

const apiCall = axios.create({
  baseURL: REACT_APP_API_PATH,
  headers: {
    'Content-type': 'application/json',
  },
})

const getStripePayouts = async (
  email: string,
  selectedDate: any,
  page?: number,
  lastObjectId?: any,
) => {
  const url = stripeRoutes.getStripePayouts
  try {
    const response = await apiCall.get(
      url +
        `?email=${email}&selectedDate=${selectedDate}&cPage=${page}&lastObjectId=${lastObjectId}`,
    )
    return response.data.data
  } catch (e) {
    return []
  }
}

// const syncStripePayout = async (
//   email: string | null | undefined,
//   donationId: string,
//   fundName: string,
//   payoutDate: string,
//   bankData: BankAccountProps[] | null,
// ) => {
//   // await axios.get
//   const url = stripeRoutes.syncStripePayout
//   try {
//     const response = await apiCall.get(
//       url +
//         `?email=${email}` +
//         `&donationId=${donationId}` +
//         `&fundName=${fundName}` +
//         `&payoutDate=${payoutDate}` +
//         `&bankData=${bankData}`,
//     )
//     if (response.status === 204) {
//       return response.statusText
//     }
//     const data = response.data.data
//     return data
//   } catch (e: any) {
//     return []
//   }
// }

const syncStripePayout = async ({
  ...rest
}: {
  email: string | null | undefined
  donationId: string
  fundName: string
  payoutDate: string
  bankData: BankAccountProps[] | null
}) => {
  // await axios.get
  const url = stripeRoutes.syncStripePayout
  const data = JSON.stringify({ ...rest })

  try {
    const response = await apiCall.post(url, data)
    return response.data
  } catch (e: any) {
    return []
  }
}

const syncStripePayoutRegistration = async ({
  ...rest
}: {
  email: string | null | undefined
  amount: string
  fundName: string
  payoutDate: string
  bankData: BankAccountProps[] | null
}) => {
  // await axios.get
  const url = stripeRoutes.syncStripePayoutRegistration
  const data = JSON.stringify({ ...rest })

  try {
    const response = await apiCall.post(url, data)
    return response.data
  } catch (e: any) {
    return []
  }
}

const finalSyncStripe = async ({ ...rest }: { data: any }) => {
  // await axios.get
  const url = stripeRoutes.finalSyncStripe
  const data = JSON.stringify({ ...rest })

  try {
    const response = await apiCall.post(url, data)
    return response.data
  } catch (e: any) {
    return e.response.data
  }
}

export {
  getStripePayouts,
  syncStripePayout,
  syncStripePayoutRegistration,
  finalSyncStripe,
}
