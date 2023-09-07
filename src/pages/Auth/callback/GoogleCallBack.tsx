import { createUser, getUserRelated } from '@/common/api/user'
import { failNotification } from '@/common/utils/toast'
import { setUserData } from '@/redux/common'
import React, { FC, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import Session from 'supertokens-web-js/recipe/session'
import { thirdPartySignInAndUp } from 'supertokens-web-js/recipe/thirdpartyemailpassword'

import { route } from '../../../common/constant/route'
import { storageKey } from '@/common/utils/storage'
interface googleCallbackProps {}

// eslint-disable-next-line no-empty-pattern
const GoogleCallBack: FC<googleCallbackProps> = ({}) => {
  const dispatch = useDispatch()

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        console.log('go here ?')
        const response = await thirdPartySignInAndUp()
        console.log('test', response)
        if (response.status === 'OK') {
          const { email } = response.user
          if (response.createdNewUser) {
            await createUser({ email })
            const userData = await getUserRelated(email)
            dispatch(setUserData({ email, id: userData.data.id || 0 }))
            // localStorage.setItem(storageKey.PERSONAL_TOKEN, email)
            window.location.assign(route.SIGNUP)
          } else {
            const userData = await getUserRelated(email)
            const { id, role, firstName, lastName, churchName, img_url } =
              userData.data
            dispatch(
              setUserData({
                id,
                role,
                firstName,
                lastName,
                churchName,
                email,
                img_url,
              }),
            )
            localStorage.setItem(storageKey.PERSONAL_TOKEN, role)
            window.location.assign(route.TRANSACTION)
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
