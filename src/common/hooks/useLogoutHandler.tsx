import { storage, storageKey } from '@/common/utils/storage'
import { useDispatch } from 'react-redux'
import Session from 'supertokens-web-js/recipe/session'
import { toast } from 'react-toastify'
import { resetUserData } from '@/redux/common'
import {
  flushUnsentEdits,
  hasSavesOnTheirWay,
  hasUnsavedWork,
  leaveWithoutAsking,
  savesSettled,
} from '@/common/utils/pendingSaves'

/** How long signing out waits for saves on their way: a save request gives up after 30s. */
const SAVE_WAIT_MS = 30_000

const useLogoutHandler = () => {
  const dispatch = useDispatch()

  const logoutHandler = async () => {
    try {
      // Changes not yet saved would go with the session. Send the ones a page is still holding,
      // give saves on their way time to land, and ask before dropping anything that didn't.
      if (hasUnsavedWork()) {
        flushUnsentEdits()
        if (hasSavesOnTheirWay()) {
          toast.info('Saving your last changes before signing out…', {
            position: 'top-center',
            autoClose: 2000,
          })
        }
        await savesSettled(SAVE_WAIT_MS)
        // No session (it expired): nothing more can be saved, so there is nothing to ask.
        if (
          hasUnsavedWork() &&
          (await Session.doesSessionExist()) &&
          !window.confirm(
            "Some of your changes haven't been saved. Sign out anyway? They will be lost.",
          )
        ) {
          return
        }
      }
      await Session.signOut()
      dispatch(resetUserData())
      storage.removeToken(storageKey.PC_ACCESS_TOKEN)
      storage.removeToken(storageKey.QBQ_ACCESS_TOKEN)
      storage.removeToken(storageKey.PERSONAL_TOKEN)
      storage.removeToken(storageKey.TOKENS)
      storage.removeToken(storageKey.SETTINGS)
      // Signing out on purpose: the reload must not ask "Leave site?".
      leaveWithoutAsking()
      // Redirect the user to the login page or reload the page to update the authentication status
      window.location.reload()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return logoutHandler
}

export default useLogoutHandler
