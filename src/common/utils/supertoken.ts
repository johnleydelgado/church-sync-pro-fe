import Session from 'supertokens-web-js/recipe/session'
import { EmailVerificationClaim } from 'supertokens-web-js/recipe/emailverification'
import { sendVerificationEmail } from 'supertokens-web-js/recipe/emailverification'
import { doesEmailExist } from 'supertokens-web-js/recipe/emailpassword'
import { failNotification, successNotification } from './toast'

async function shouldLoadRoute({ email }: { email: string }): Promise<boolean> {
  if (await Session.doesSessionExist()) {
    // const userId = await Session.getUserId()
    const isEmailExist = await doesEmailExist({ email })
    const validationErrors = await Session.validateClaims()
    if (validationErrors.length === 0 && isEmailExist.doesExist) {
      // user has verified their email address
      return true
    } else {
      for (const err of validationErrors) {
        if (err.validatorId === EmailVerificationClaim.id) {
          // email is not verified
        }
      }
    }
  }
  // a session does not exist, or email is not verified
  return false
}

async function doesEmailExistRoute({
  email,
}: {
  email: string
}): Promise<boolean> {
  // const userId = await Session.getUserId()
  const isEmailExist = await doesEmailExist({ email })
  if (isEmailExist.doesExist) {
    // user has verified their email address
    return true
  }
  return false
}

async function sendEmail() {
  try {
    const response = await sendVerificationEmail()
    if (response.status === 'EMAIL_ALREADY_VERIFIED_ERROR') {
      // This can happen if the info about email verification in the session was outdated.
      // Redirect the user to the home page
      window.location.assign('/')
    } else {
      // email was sent successfully.
      successNotification({
        title: 'Please check your email and click the link in it',
      })
    }
  } catch (err: any) {
    if (err.isSuperTokensGeneralError === true) {
      // this may be a custom error message sent from the API by you.
      failNotification({ title: err.message })
    } else {
      failNotification({ title: 'Oops! Something went wrong.' })
    }
  }
}

export { shouldLoadRoute, sendEmail, doesEmailExistRoute }
