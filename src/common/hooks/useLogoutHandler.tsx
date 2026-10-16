import { storage, storageKey } from '@/common/utils/storage'
import { useDispatch } from 'react-redux'
import Session from 'supertokens-web-js/recipe/session'
import { toast } from 'react-toastify'
import { resetUserData } from '@/redux/common'
import { persistor } from '@/redux/store'
import {
  flushUnsentEdits,
  hasSavesOnTheirWay,
  hasUnsavedWork,
  leaveWithoutAsking,
  savesSettled,
} from '@/common/utils/pendingSaves'

/**
 * The longest signing out waits for saves on their way before asking. Only fund mapping and
 * Archive saves (createSettings) give up by themselves, after 30s; bank, fee and registration
 * saves have no timeout, so this is what bounds the wait.
 */
const SAVE_WAIT_MS = 30_000

// One sign-out at a time, whichever button started it: a second click while the first waits
// would send the same edits again, show a second notice and ask twice.
let signingOut = false

const useLogoutHandler = () => {
  const dispatch = useDispatch()

  const logoutHandler = async () => {
    if (signingOut) return
    signingOut = true
    // Set once the page is on its way out; until then a later click can start again.
    let leaving = false
    try {
      // Changes not yet saved would go with the session. Send the ones a page is still holding,
      // give saves on their way time to land, and ask before dropping anything that didn't.
      if (hasUnsavedWork()) {
        flushUnsentEdits()
        // Up for as long as the wait lasts, which can be the whole SAVE_WAIT_MS.
        const notice = hasSavesOnTheirWay()
          ? toast.info('Saving your last changes before signing out…', {
              position: 'top-center',
              autoClose: false,
            })
          : null
        await savesSettled(SAVE_WAIT_MS)
        if (notice !== null) toast.dismiss(notice)
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
      // redux-persist writes asynchronously: reloading first could bring the signed-out person's
      // church (and any connection in flight) back for whoever signs in next.
      await persistor.flush().catch(() => undefined)
      // Signing out on purpose: the reload must not ask "Leave site?".
      leaveWithoutAsking()
      leaving = true
      // Redirect the user to the login page or reload the page to update the authentication status
      window.location.reload()
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      if (!leaving) signingOut = false
    }
  }

  return logoutHandler
}

export default useLogoutHandler
