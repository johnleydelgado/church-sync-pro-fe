import React, { FC, useEffect } from 'react'
import Session from 'supertokens-web-js/recipe/session'
import { thirdPartySignInAndUp } from 'supertokens-web-js/recipe/thirdpartyemailpassword'

import { route } from '../../../common/constant/route'
interface googleCallbackProps {}

// eslint-disable-next-line no-empty-pattern
const GoogleCallBack: FC<googleCallbackProps> = ({}) => {
  async function handleGoogleCallback() {
    try {
      const response = await thirdPartySignInAndUp()

      if (response.status === 'OK') {
        if (response.createdNewUser) {
          // sign up successful
        } else {
          // sign in successful
        }
        if (response.createdNewUser) window.location.assign(route.SIGNUP)
        else window.location.assign(route.SECONDARY_LOGIN)
      } else {
        // SuperTokens requires that the third party provider
        // gives an email for the user. If that's not the case, sign up / in
        // will fail.

        // As a hack to solve this, you can override the backend functions to create a fake email for the user.

        window.alert(
          'No email provided by social login. Please use another form of login',
        )
        window.location.assign('/') // redirect back to login page
      }
    } catch (err: any) {
      if (err.isSuperTokensGeneralError === true) {
        // this may be a custom error message sent from the API by you.
        window.alert(err.message)
      } else {
        window.alert('Oops! Something went wrong.')
      }
    }
  }
  useEffect(() => {
    handleGoogleCallback()
  }, [])
  return (
    <div className="flex justify-center items-center h-screen bg-white">
      <div className="grid gap-2">
        <div className="flex items-center justify-center ">
          <div className="w-40 h-40 border-t-4 border-b-4 border-green-900 rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  )
}

export default GoogleCallBack
