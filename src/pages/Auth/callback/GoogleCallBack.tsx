import { createUser } from '@/common/api/user'
import { failNotification } from '@/common/utils/toast'
import { setUserData } from '@/redux/common'
import React, { FC, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import Session from 'supertokens-web-js/recipe/session'
import { thirdPartySignInAndUp } from 'supertokens-web-js/recipe/thirdpartyemailpassword'

import { route } from '../../../common/constant/route'
interface googleCallbackProps {}

// eslint-disable-next-line no-empty-pattern
const GoogleCallBack: FC<googleCallbackProps> = ({}) => {
  const dispatch = useDispatch()

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        const response = await thirdPartySignInAndUp()
        console.log('test', response)
        if (response.status === 'OK') {
          const { email } = response.user
          dispatch(setUserData({ email }))
          if (response.createdNewUser) {
            await createUser({ email })
            window.location.assign(route.SIGNUP)
          } else {
            window.location.assign(route.SECONDARY_LOGIN)
          }
        } else {
          // SuperTokens requires that the third party provider
          // gives an email for the user. If that's not the case, sign up / in
          // will fail.

          // As a hack to solve this, you can override the backend functions to create a fake email for the user.

          failNotification({
            title:
              'No email provided by social login. Please use another form of login',
          })

          window.location.assign('/') // redirect back to login page
        }
      } catch (err: any) {
        console.log('err', err)
        if (err.isSuperTokensGeneralError === true) {
          // this may be a custom error message sent from the API by you.
          failNotification({ title: err.message })
        } else {
          failNotification({ title: 'Oops! Something went wrong.' })
        }
      }
    }
    handleGoogleCallback()
  }, [dispatch])

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
