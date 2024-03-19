/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import axios from 'axios'
import { qboRoutes } from '../constant/routes-api'
import { CustomerProps } from '../constant/formik'
const { REACT_APP_API_PATH } = process.env

const apiCall = axios.create({
  baseURL: REACT_APP_API_PATH,
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
      (account: { value: string; name: string; type?: string }) => ({
        value: account.value,
        label: account.name,
        type: account.type,
      }),
    )
    jsonObject.classes = jsonObject.classes.map(
      (cls: { value: string; name: string }) => ({
        value: cls.value,
        label: cls.name,
      }),
    )
    jsonObject.customers = jsonObject.customers.map(
      (customer: { value: string; name: string; companyName: string }) => ({
        value: customer.value,
        label: customer.name,
        companyName: customer.companyName,
      }),
    )

    return jsonObject
  } catch (e: any) {
    return []
  }
}

const deleteQboDeposit = async (
  email: string | null | undefined,
  synchData: any,
) => {
  // await axios.get
  const url = qboRoutes.deleteQboDeposit
  const dataJson = JSON.stringify({ email, synchData })
  try {
    const response = await apiCall.post(url, dataJson)
    const data = response.data.data
    return data
  } catch (e: any) {
    return []
  }
}

const addProject = async (
  email: string | null | undefined,
  data: CustomerProps,
) => {
  // await axios.get
  const url = qboRoutes.addProject
  const dataJson = JSON.stringify({ email, data })
  try {
    const response = await apiCall.post(url, dataJson)
    const data = response.data.data
    return data
  } catch (e: any) {
    throw new Error(e)
  }
}

const updateProject = async (
  email: string | null | undefined,
  data: CustomerProps,
) => {
  // await axios.get
  const url = qboRoutes.updateProject
  const dataJson = JSON.stringify({ email, data })
  try {
    const response = await apiCall.post(url, dataJson)
    const data = response.data.data
    return data
  } catch (e: any) {
    console.error('Error response:', e.response)
    // Here you can access the specific error message and details
    const errorCode = e.response.data.code
    const errorMessage = e.response.data.message
    const errorData = e.response.data.data
    const errorType = errorData?.Fault?.type
    const detailedMessage = errorData?.Fault?.Error?.[0]?.Message

    // Log detailed error message
    console.error(
      `Error code: ${errorCode}, Message: ${errorMessage}, Type: ${errorType}, Details: ${detailedMessage}`,
    )

    // You can throw a new error with the detailed message or handle it accordingly
    throw { message: detailedMessage || 'Error occured while updating project' }
  }
}

const findCustomers = async (
  email: string | null | undefined,
  Id: string | number,
) => {
  // await axios.get
  const url = qboRoutes.findCustomer
  const dataJson = JSON.stringify({ email, Id })
  try {
    const response = await apiCall.post(url, dataJson)
    const data = response.data.data
    return data
  } catch (e: any) {
    throw new Error(e)
  }
}

export {
  QboGetAllQboData,
  deleteQboDeposit,
  addProject,
  updateProject,
  findCustomers,
}
