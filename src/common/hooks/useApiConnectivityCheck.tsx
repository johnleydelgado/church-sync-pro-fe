import { useEffect, useState } from 'react'
import axios from 'axios'
import { apiCall } from '../api/user'

const useApiConnectivityCheck = (timeout = 5000) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)

  useEffect(() => {
    const checkConnectivity = async () => {
      try {
        const response = await apiCall.get('/healthCheck')
        setIsConnected(response.status === 200)
      } catch (error) {
        console.error(`API connectivity issue: ${error}`)
        setIsConnected(false)
      }
    }

    checkConnectivity()
  }, [timeout])

  return { isConnected }
}

export default useApiConnectivityCheck
