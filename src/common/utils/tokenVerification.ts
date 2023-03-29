import { isExpired } from 'react-jwt'

const checkToken = (token: string | null): boolean => {
  if (token) {
    const isMyTokenExpired = isExpired(token)
    return !isMyTokenExpired
  }
  return false
}

export default checkToken
