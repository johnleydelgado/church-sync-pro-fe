/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import axios from 'axios'
const { REACT_APP_API_PATH } = process.env

const apiCall = axios.create({
  baseURL: REACT_APP_API_PATH,
  headers: {
    'Content-type': 'application/json',
  },
})

const authApi = async (url: string) => {
  // await axios.get
  try {
    const response = await apiCall.get(url)
    return response.data
  } catch (e: any) {
    return []
  }
}

export { authApi }
