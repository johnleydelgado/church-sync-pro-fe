import { shouldLoadRoute } from '@/common/utils/supertoken'
import { failNotification } from '@/common/utils/toast'
import { TextInput, Checkbox, Label, Button, Spinner } from 'flowbite-react'
import React, { FC, Fragment, useEffect, useState } from 'react'
import { FcGoogle } from 'react-icons/fc'
import {
  HiOutlineMail,
  HiEye,
  HiOutlineLockClosed,
  HiEyeOff,
} from 'react-icons/hi'
import { useNavigate } from 'react-router'
import { getAuthorisationURLWithQueryParamsAndSetState } from 'supertokens-web-js/recipe/thirdpartyemailpassword'
import { emailPasswordSignIn } from 'supertokens-web-js/recipe/thirdpartyemailpassword'

import bgImage from '../../../common/assets/bg-login.png'
import logo from '../../../common/assets/logo.png'

import { mainRoute, route } from '../../../common/constant/route'
import { useFormik } from 'formik'
import { useDispatch } from 'react-redux'
import { OPEN_MODAL, setBookkeeper, setUserData } from '@/redux/common'
import {
  signInInitialValues,
  signInValidationSchema,
} from '@/common/constant/formik'
import { storageKey } from '@/common/utils/storage'
import { getUserRelated } from '@/common/api/user'
import ModalRegistration from '@/common/components/modal/ModalRegistration'
import { MODALS_NAME } from '@/common/constant/modal'
import useRegisterModal from '@/common/hooks/useRegisterModal'
import { FooterDivider } from 'flowbite-react/lib/esm/components/Footer/FooterDivider'
import { Link } from 'react-router-dom'

interface LoginProps {}
const { REACT_APP_GOOGLE_CALLBACK_URL, REACT_APP_HOST_BE } = process.env

const Login: FC<LoginProps> = () => {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const dispatch = useDispatch()
  const [googleLoading, setGoogleLoading] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)

  async function googleSignInClicked() {
    setGoogleLoading(true)

    if (!googleLoading) {
      try {
        const authUrl = await getAuthorisationURLWithQueryParamsAndSetState({
          providerId: 'google',
          // This is where Google should redirect the user back after login or error.
          // This URL goes on the Google's dashboard as well.
          authorisationURL: REACT_APP_GOOGLE_CALLBACK_URL as string,
        })
        /*
          Example value of authUrl: https://accounts.google.com/o/oauth2/v2/auth/oauthchooseaccount?scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email&access_type=offline&include_granted_scopes=true&response_type=code&client_id=1060725074195-kmeum4crr01uirfl2op9kd5acmi9jutn.apps.googleusercontent.com&state=5a489996a28cafc83ddff&redirect_uri=https%3A%2F%2Fsupertokens.io%2Fdev%2Foauth%2Fredirect-to-app&flowName=GeneralOAuthFlow
          */
        // we redirect the user to google for auth.
        window.location.assign(authUrl)
      } catch (err: any) {
        if (err.isSuperTokensGeneralError === true) {
          // this may be a custom error message sent from the API by you.
          failNotification({ title: err.message })
        } else {
          failNotification({ title: 'Oops! Something went wrong.' })
        }
      } finally {
        setGoogleLoading(false)
      }
    }
  }

  const { openModal, handleEvent } = useRegisterModal()

  async function signInClicked({
    email,
    password,
  }: {
    email: string
    password: string
  }) {
    setLoading(true)
    try {
      const response = await emailPasswordSignIn({
        formFields: [
          { id: 'email', value: email },
          { id: 'password', value: password },
        ],
      })
      if (response.status === 'FIELD_ERROR') {
        // one of the input formFields failed validaiton
        response.formFields.forEach((formField) => {
          if (formField.id === 'email') {
            // Email validation failed (for example incorrect email syntax),
            // or the email is not unique.
            failNotification({ title: formField.error })
          } else if (formField.id === 'password') {
            // Password validation failed.
            // Maybe it didn't match the password strength
            failNotification({ title: formField.error })
          }
          setLoading(false)
        })
      } else if (response.status === 'WRONG_CREDENTIALS_ERROR') {
        // one of the input formFields failed validaiton
        failNotification({ title: 'Please check email or password !' })
        setLoading(false)
      } else {
        const userData = await getUserRelated(email)
        console.log('userData', userData)
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
        // dispatch(setBookkeeper({clientEmail:}))
        setLoading(false)
        localStorage.setItem(storageKey.PERSONAL_TOKEN, role)
        window.location.href = mainRoute.TRANSACTION
        // window.location.href = route.SECONDARY_LOGIN
      }
    } catch (err: any) {
      console.log('err', err)
      if (err.isSuperTokensGeneralError === true) {
        failNotification({ title: err.message })
      } else {
        failNotification({ title: 'Oops! Something went wrong.' })
      }
      setLoading(false)
    }
  }

  const formik = useFormik({
    initialValues: signInInitialValues,
    validationSchema: signInValidationSchema,
    onSubmit: (values) => {
      const { ...rest } = values
      signInClicked(rest)
    },
  })

  return (
    // <div className="h-screen flex flex-col lg:flex-row lg:bg-white">
    //   <ModalRegistration
    //     size="xs"
    //     handleEventBookkeeper={() => handleEvent('bookkeeper')}
    //     handleEventClient={() => handleEvent('client')}
    //   />
    //   <div
    //     className="flex-grow m-6"
    //     style={{
    //       backgroundImage: `url(${bgImage})`,
    //       backgroundSize: 'cover',
    //       backgroundPosition: 'center',
    //       borderTopRightRadius: 32,
    //       borderBottomLeftRadius: 32,
    //     }}
    //   />
    //   <div className="p-8 bg-white w-full md:p-24 lg:w-2/6">
    //     {/*  */}
    //     <div className="flex flex-col gap-y-4">
    //       <span className="text-4xl font-serif">Log in to Church Sync Pro</span>
    //       <span className="text-md font-serif text-slate-500">
    //         Welcome back! login with your data that you entered during
    //         registration
    //       </span>
    //     </div>

    //     {/*  Social*/}
    //     <div className="flex flex-col  gap-y-4 pt-8">
    //       <div
    //         className="flex justify-center items-center w-full rounded-xl shadow-lg p-4 cursor-pointer hover:bg-slate-200"
    //         onClick={googleSignInClicked}
    //       >
    //         {googleLoading ? <Spinner className="mr-8" /> : null}
    //         <FcGoogle size={32} className="mr-4" />
    //         <span className="text-md font-serif text-slate-700">
    //           Login or Sig up with google
    //         </span>
    //       </div>

    //       {/* <div className="flex justify-center items-center w-full rounded-xl shadow-lg p-4 cursor-pointer hover:bg-slate-200">
    //         <FiFacebook size={32} className="mr-4 text-cyan-700" />
    //         <span className="text-md font-serif text-slate-700">
    //           Login or Sig up with facebook
    //         </span>
    //       </div> */}
    //     </div>

    //     {/* divider */}

    //     <div className="flex flex-col  gap-y-4 pt-8">
    //       <div className="flex items-center gap-4">
    //         <div className="w-full h-1 bg-gray-500" style={{ height: 1 }} />
    //         <span className="text-slate-400">or</span>
    //         <div className="w-full bg-gray-500" style={{ height: 1 }} />
    //       </div>
    //     </div>

    //     {/* FORMS */}
    //     <form
    //       className="flex flex-col gap-4 pt-6 [&>*]:text-red-600"
    //       onSubmit={formik.handleSubmit}
    //     >
    //       <TextInput
    //         id="email"
    //         type="email"
    //         icon={HiOutlineMail}
    //         placeholder="johndoe@gmail.com"
    //         className="shadow-sm rounded-lg hover:border-primary focus:border-primary font-light"
    //         onChange={formik.handleChange}
    //         value={formik.values.email}
    //         helperText={formik.errors.email}
    //       />

    //       <div
    //         className={`${
    //           formik.values.password ? 'flex' : 'block'
    //         } w-full relative`}
    //       >
    //         <TextInput
    //           id="password"
    //           type={`${showPassword ? 'text' : 'password'}`}
    //           name="password"
    //           icon={HiOutlineLockClosed}
    //           placeholder="*****************"
    //           className="shadow-sm rounded-lg hover:border-blue-900 font-light w-full"
    //           onChange={formik.handleChange}
    //           value={formik.values.password}
    //           security="false"
    //           helperText={formik.errors.password}
    //         />
    //         <div
    //           className="absolute right-2 top-2 text-slate-600 cursor-pointer p-1 hover:bg-blue-900 hover:text-white rounded-full"
    //           onClick={() => setShowPassword(!showPassword)}
    //         >
    //           {showPassword ? (
    //             <HiEyeOff size={20} className="text-blue-gray-600" />
    //           ) : (
    //             <HiEye size={20} className="text-blue-gray-600" />
    //           )}
    //         </div>
    //       </div>

    //       <div className="flex justify-between items-center">
    //         <div className="flex items-center gap-2">
    //           <Checkbox id="remember" className="p-2" />
    //           <Label htmlFor="remember">
    //             <p className="text-slate-600 font-light text-sm">Remember me</p>
    //           </Label>
    //         </div>
    //         <span className="text-gray-800 text-sm underline cursor-pointer">
    //           Forget your password ?
    //         </span>
    //       </div>

    //       <Button
    //         className="bg-primary rounded-md shadow-sm h-12 my-4 hover:bg-slate-600 [&>*]:text-white"
    //         type="submit"
    //       >
    //         LOGIN
    //       </Button>

    //       <div className="flex gap-1 justify-center">
    //         <span className="text-gray-600 text-sm">Dont have account?</span>
    //         <span
    //           className="text-gray-800 text-sm underline cursor-pointer"
    //           onClick={openModal}
    //         >
    //           Register
    //         </span>
    //       </div>
    //     </form>
    //   </div>
    // </div>
    <div className="h-screen flex font-lato">
      <div
        className="flex-grow"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="flex w-full h-full justify-end items-center">
          <div
            style={{ backgroundColor: 'rgba(251, 251, 251, 0.8)' }}
            className="sm:w-96 xs:w-96 md:w-[520px] h-[632px] shadow-2xl rounded-3xl m-4 sm:mr-12"
          >
            <div className="flex flex-col gap-8 p-12 items-center">
              <img src={logo} alt="" />
              <div
                className="flex justify-center group items-center cursor-pointer hover:bg-btmColor rounded-xl p-2"
                onClick={googleSignInClicked}
              >
                {googleLoading ? <Spinner className="mr-8" /> : null}
                <FcGoogle size={48} className="mr-4" />
                <span className="text-md font-thin text-slate-700 group-hover:text-white group-hover:font-normal">
                  Login or Sig up with google
                </span>
              </div>
              <div className="border-[0.5px] w-52 -mt-6" />

              {/* FORMS */}
              <form
                className="flex flex-col gap-4 [&>*]:text-red-600 w-72"
                onSubmit={formik.handleSubmit}
              >
                <TextInput
                  id="email"
                  type="email"
                  icon={HiOutlineMail}
                  placeholder="johndoe@gmail.com"
                  className="shadow-sm rounded-lg hover:border-primary focus:border-primary font-light"
                  onChange={formik.handleChange}
                  value={formik.values.email}
                  helperText={formik.errors.email}
                />

                <div
                  className={`${
                    formik.values.password ? 'flex' : 'block'
                  } w-full relative`}
                >
                  <TextInput
                    id="password"
                    type={`${showPassword ? 'text' : 'password'}`}
                    name="password"
                    icon={HiOutlineLockClosed}
                    placeholder="*****************"
                    className="shadow-sm rounded-lg hover:border-blue-900 font-light w-full"
                    onChange={formik.handleChange}
                    value={formik.values.password}
                    security="false"
                    helperText={formik.errors.password}
                  />
                  <div
                    className="absolute right-2 top-2 text-slate-600 cursor-pointer p-1 hover:bg-blue-900 hover:text-white rounded-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <HiEyeOff size={20} className="text-blue-gray-600" />
                    ) : (
                      <HiEye size={20} className="text-blue-gray-600" />
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Checkbox id="remember" className="p-2" />
                    <Label htmlFor="remember">
                      <p className="text-slate-600 font-light text-sm">
                        Remember me
                      </p>
                    </Label>
                  </div>
                  <Link
                    to={route.FORGOT_PASSWORD}
                    className="text-gray-800 text-sm cursor-pointer italic"
                  >
                    Forget your password ?
                  </Link>
                </div>

                <Button
                  className="bg-btmColor rounded-md shadow-sm h-12 my-4 hover:bg-slate-600 [&>*]:text-white"
                  type="submit"
                >
                  {loading ? <Spinner className="mr-8" /> : null}
                  LOGIN
                </Button>

                <div className="flex gap-1 justify-center">
                  <span className="text-gray-600 text-sm italic">
                    Dont have account?
                  </span>
                  <Link
                    to="/signup"
                    className="text-gray-800 text-sm italic cursor-pointer"
                  >
                    Register
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
