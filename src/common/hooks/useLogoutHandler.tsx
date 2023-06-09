import { storage, storageKey } from '@/common/utils/storage'
import { useDispatch } from 'react-redux'
import Session from 'supertokens-web-js/recipe/session'
import { resetUserData } from '@/redux/common'
import { useEffect } from 'react'

const useLogoutHandler = () => {
  const dispatch = useDispatch()

  const logoutHandler = async () => {
    try {
      await Session.signOut()
      dispatch(resetUserData())
      storage.removeToken(storageKey.PC_ACCESS_TOKEN)
      storage.removeToken(storageKey.QBQ_ACCESS_TOKEN)
      storage.removeToken(storageKey.PERSONAL_TOKEN)
      storage.removeToken(storageKey.TOKENS)
      storage.removeToken(storageKey.SETTINGS)
      // Redirect the user to the login page or reload the page to update the authentication status
      window.location.reload()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return logoutHandler
}

export default useLogoutHandler
