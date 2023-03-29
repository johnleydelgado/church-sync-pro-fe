import { TextInput, Checkbox, Label, Button } from 'flowbite-react'
import React, { FC, useEffect } from 'react'
import { FcGoogle } from 'react-icons/fc'
import { FiFacebook } from 'react-icons/fi'
import { HiOutlineMail, HiLockClosed, HiEye } from 'react-icons/hi'
import { doesSessionExist } from 'supertokens-web-js/recipe/session'
import { getAuthorisationURLWithQueryParamsAndSetState } from 'supertokens-web-js/recipe/thirdpartyemailpassword'

import bgImage from '../../../common/assets/bg_1.png'
import { route } from '../../../common/constant/route'

interface LoginProps {}
const Login: FC<LoginProps> = () => {
  async function googleSignInClicked() {
    try {
      const authUrl = await getAuthorisationURLWithQueryParamsAndSetState({
        providerId: 'google',

        // This is where Google should redirect the user back after login or error.
        // This URL goes on the Google's dashboard as well.
        authorisationURL: 'http://localhost:3000/auth/callback/google',
      })

      /*
        Example value of authUrl: https://accounts.google.com/o/oauth2/v2/auth/oauthchooseaccount?scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email&access_type=offline&include_granted_scopes=true&response_type=code&client_id=1060725074195-kmeum4crr01uirfl2op9kd5acmi9jutn.apps.googleusercontent.com&state=5a489996a28cafc83ddff&redirect_uri=https%3A%2F%2Fsupertokens.io%2Fdev%2Foauth%2Fredirect-to-app&flowName=GeneralOAuthFlow
        */
      // we redirect the user to google for auth.
      window.location.assign(authUrl)
    } catch (err: any) {
      if (err.isSuperTokensGeneralError === true) {
        // this may be a custom error message sent from the API by you.
        window.alert(err.message)
      } else {
        window.alert('Oops! Something went wrong.')
      }
    }
  }

  const checkSession = async () => {
    const sessionExist = await doesSessionExist()
    if (sessionExist) window.location.href = route.SECONDARY_LOGIN
  }

  useEffect(() => {
    checkSession()
  }, [])

  return (
    <div className="h-screen flex flex-col lg:flex-row lg:bg-white">
      <div
        className="flex-grow m-6"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderTopRightRadius: 32,
          borderBottomLeftRadius: 32,
        }}
      />
      <div className="p-8 bg-white w-full md:p-24 lg:w-2/6">
        {/*  */}
        <div className="flex flex-col gap-y-4">
          <span className="text-4xl font-serif">Log in to Church Sync Pro</span>
          <span className="text-md font-serif text-slate-500">
            Welcome back! login with your data that you entered during
            registration
          </span>
        </div>

        {/*  Social*/}
        <div className="flex flex-col  gap-y-4 pt-8">
          <div
            className="flex justify-center items-center w-full rounded-xl shadow-lg p-4 cursor-pointer hover:bg-slate-200"
            onClick={googleSignInClicked}
          >
            <FcGoogle size={32} className="mr-4" />
            <span className="text-md font-serif text-slate-700">
              Login or Sig up with google
            </span>
          </div>

          {/* <div className="flex justify-center items-center w-full rounded-xl shadow-lg p-4 cursor-pointer hover:bg-slate-200">
            <FiFacebook size={32} className="mr-4 text-cyan-700" />
            <span className="text-md font-serif text-slate-700">
              Login or Sig up with facebook
            </span>
          </div> */}
        </div>

        {/* divider */}

        <div className="flex flex-col  gap-y-4 pt-8">
          <div className="flex items-center gap-4">
            <div className="w-full h-1 bg-gray-500" style={{ height: 1 }} />
            <span className="text-slate-400">or</span>
            <div className="w-full bg-gray-500" style={{ height: 1 }} />
          </div>
        </div>

        {/* FORMS */}
        <form className="flex flex-col gap-4 pt-6">
          <TextInput
            id="email"
            type="email"
            icon={HiOutlineMail}
            placeholder="johndoe@gmail.com"
            className="shadow-sm rounded-lg hover:border-primary focus:border-primary font-light"
            required
          />

          <TextInput
            id="password"
            type="password"
            icon={HiLockClosed}
            rightIcon={HiEye}
            placeholder="*****************"
            className="shadow-sm rounded-lg hover:border-blue-900 font-light"
            required
            security="false"
          />

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Checkbox id="remember" className="p-2" />
              <Label htmlFor="remember">
                <p className="text-slate-600 font-light text-sm">Remember me</p>
              </Label>
            </div>
            <span className="text-slate-600 text-sm underline cursor-pointer">
              Forget your password ?
            </span>
          </div>

          <Button
            className="bg-primary rounded-md shadow-sm h-12 my-4 hover:bg-slate-600"
            type="submit"
          >
            LOGIN
          </Button>

          {/* <div className="flex gap-1 justify-center">
            <span className="text-slate-600 text-sm">Dont have account?</span>
            <span className="text-slate-600 text-sm underline cursor-pointer">
              Register
            </span>
          </div> */}
        </form>
      </div>
    </div>
  )
}

export default Login
