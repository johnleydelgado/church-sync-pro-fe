/* eslint-disable @typescript-eslint/no-explicit-any */
import { TextInput, Button, Spinner } from 'flowbite-react'
import { useFormik } from 'formik'
import { FC, useCallback, useEffect, useState } from 'react'
import {
  HiOutlineMail,
  HiEye,
  HiOutlineLockClosed,
  HiEyeOff,
} from 'react-icons/hi'
import { BiChurch } from 'react-icons/bi'

import { emailPasswordSignUp } from 'supertokens-web-js/recipe/thirdpartyemailpassword'

import { shouldLoadRoute } from '@/common/utils/supertoken'
import { failNotification } from '@/common/utils/toast'
import { AiOutlineUser } from 'react-icons/ai'
import { route } from '@/common/constant/route'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import {
  UserSignUpProps,
  signUpValidationSchema,
  signUpInitialValues,
} from '@/common/constant/formik'
import { useDispatch } from 'react-redux'
import { setUserData } from '@/redux/common'
import { storageKey } from '@/common/utils/storage'
import { getUserRelated } from '@/common/api/user'
import { useLocation } from 'react-router'
import CommonTextField from '@/common/components/text-input/CommonTextField'

import bgImage from '../../../common/assets/bg-registration.png'
import logo from '../../../common/assets/logo.png'
import bookeeperLogo from '../../../common/assets/bookeeper-logo.png'
import clientLogo from '../../../common/assets/client-logo.png'

interface SignUpProps {}

const delay = (ms: any) => new Promise((res) => setTimeout(res, ms))

const SignUp: FC<SignUpProps> = () => {
  const { user } = useSelector((state: RootState) => state.common)
  const location = useLocation()
  // const userType = location.state?.type || 'bookkeeper'
  const [userType, setUserType] = useState<'bookkeeper' | 'client'>('client')
  const dispatch = useDispatch()

  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [signUpSuccess, setSignUpSuccess] = useState<boolean>(false)

  async function signUpClicked({
    churchName,
    firstName,
    lastName,
    email,
    password,
  }: UserSignUpProps) {
    setIsLoading(true)
    try {
      const response = await emailPasswordSignUp({
        formFields: [
          { id: 'churchName', value: churchName },
          { id: 'firstName', value: firstName },
          { id: 'lastName', value: lastName },
          { id: 'email', value: email },
          { id: 'password', value: password },
          { id: 'isSubscribe', value: '0' },
          { id: 'role', value: userType },
        ],
      })

      console.log('response', response)

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
          } else if (formField.id === 'firstName') {
            // Password validation failed.
            // Maybe it didn't match the password strength
            failNotification({ title: formField.error })
          } else if (formField.id === 'lastName') {
            // Password validation failed.
            // Maybe it didn't match the password strength
            failNotification({ title: formField.error })
          } else if (formField.id === 'churchName') {
            // Password validation failed.
            // Maybe it didn't match the password strength
            failNotification({ title: formField.error })
          }
        })
      } else {
        const { user: userDataF } = response
        // sendEmail()
        await delay(2000)
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
        setSignUpSuccess(true)
        window.location.reload()
      }
    } catch (err: any) {
      console.log('err', err)
      // failNotification({ title: err })
      if (err.isSuperTokensGeneralError === true) {
        // this may be a custom error message sent from the API by you.
        failNotification({ title: err.message })
      } else {
        failNotification({ title: 'Oops! Something went wrong.' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const userTypeHandler = (type: 'bookkeeper' | 'client') => {
    setUserType(type)
  }

  const checkSession = useCallback(async () => {
    if ((await shouldLoadRoute({ email: user.email })) && signUpSuccess) {
      window.location.href = route.TRANSACTION
    }
  }, [signUpSuccess, user.email])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  const formik = useFormik({
    initialValues: { ...signUpInitialValues, email: user.email },
    validationSchema: signUpValidationSchema,
    onSubmit: (values) => {
      const { ...rest } = values
      if (!isLoading) signUpClicked(rest)
    },
  })

  return (
    // <div className="h-screen flex flex-col lg:flex-row-reverse lg:bg-white">
    //   <div
    //     className="flex-grow m-6"
    //     style={{
    //       backgroundImage: `url(${bgImage})`,
    //       backgroundSize: 'cover',
    //       backgroundPosition: 'center',
    //       borderTopLeftRadius: 32,
    //       borderBottomRightRadius: 32,
    //     }}
    //   />
    //   <div className="p-8 bg-white w-full md:p-24 lg:w-2/6">
    //     {/*  */}
    //     <div className="flex flex-col gap-y-4">
    //       <span className="text-4xl font-serif text-gray-700">
    //         Create an account
    //       </span>
    //       <span className="text-md font-serif text-slate-500 text-gray-700">
    //         Let`s get started with your day for Church Sync Pro
    //       </span>
    //     </div>

    //     {/* Divider */}

    //     <div className="flex flex-col  gap-y-4 pt-4">
    //       <div className="w-full h-[1px] bg-gray-500" />
    //     </div>

    //     {/* FORMS */}

    //     <form
    //       className="flex flex-col gap-1 pt-6"
    //       onSubmit={formik.handleSubmit}
    //     >
    //       {userType === 'client' ? (
    //         <CommonTextField
    //           error={formik.errors.churchName}
    //           icon={BiChurch}
    //           name="churchName"
    //           onChange={formik.handleChange}
    //           placeholder=""
    //           title="Church Name"
    //           type="text"
    //           value={formik.values.churchName}
    //         />
    //       ) : null}

    //       <CommonTextField
    //         error={formik.errors.firstName}
    //         icon={AiOutlineUser}
    //         name="firstName"
    //         onChange={formik.handleChange}
    //         placeholder="John"
    //         title="First Name"
    //         type="text"
    //         value={formik.values.firstName}
    //       />

    //       <CommonTextField
    //         error={formik.errors.lastName}
    //         icon={AiOutlineUser}
    //         name="lastName"
    //         onChange={formik.handleChange}
    //         placeholder="Doe"
    //         title="Last Name"
    //         type="text"
    //         value={formik.values.lastName}
    //       />

    //       <CommonTextField
    //         error={formik.errors.email}
    //         icon={HiOutlineMail}
    //         name="email"
    //         onChange={formik.handleChange}
    //         placeholder="johndoe@gmail.com"
    //         title="Email"
    //         type="text"
    //         value={formik.values.email}
    //       />

    //       <CommonTextField
    //         error={formik.errors.password}
    //         icon={HiOutlineLockClosed}
    //         name="password"
    //         onChange={formik.handleChange}
    //         placeholder="*********"
    //         title="Password"
    //         type="text"
    //         value={formik.values.password}
    //         isPassword
    //       />

    //       <Button
    //         className="bg-primary rounded-md shadow-sm h-12 my-4 hover:bg-slate-600 [&>*]:text-white"
    //         type="submit"
    //       >
    //         {isLoading ? <Spinner className="mr-8" /> : <p>Create account</p>}
    //       </Button>
    //     </form>
    //   </div>
    // </div>
    <div className="h-full flex font-lato">
      <div
        className="flex-grow"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div
          style={{ backgroundColor: 'rgba(251, 251, 251, 0.5)' }}
          className="w-[520px] h-5/6 overflow-auto absolute top-1/2 transform -translate-y-1/2 right-28 shadow-2xl rounded-3xl"
        >
          <div className="flex flex-col gap-2 p-12 items-center">
            {/* <div
            className="flex justify-center group items-center cursor-pointer hover:bg-btmColor rounded-xl p-4"
            onClick={googleSignInClicked}
          >
            {googleLoading ? <Spinner className="mr-8" /> : null}
            <FcGoogle size={48} className="mr-4" />
            <span className="text-md font-thin text-slate-700 group-hover:text-white group-hover:font-normal">
              Login or Sig up with google
            </span>
          </div> */}
            <p>Create an account</p>
            <div className="border-[0.5px] w-52" />
            <p className="font-thin text-xl pb-2">Select your user type</p>
            <div className="flex gap-12">
              <button
                className={`flex flex-col items-center transform transition-transform hover:scale-105 rounded-md p-6 ${
                  userType === 'client' ? 'bg-blue-gray-50' : ''
                }`}
                onClick={() => userTypeHandler('client')}
              >
                <img src={clientLogo} className="h-20 w-20" />
                <p>Client</p>
              </button>
              <button
                className={`flex flex-col items-center transform transition-transform hover:scale-105 rounded-md p-6 ${
                  userType === 'bookkeeper' ? 'bg-blue-gray-50' : ''
                }`}
                onClick={() => userTypeHandler('bookkeeper')}
              >
                <img src={bookeeperLogo} className="h-20 w-20" />
                <p>Bookkeeper</p>
              </button>
            </div>
            {/* FORMS */}
            <form
              className="flex flex-col gap-1 pt-6 w-80"
              onSubmit={formik.handleSubmit}
            >
              {userType === 'client' ? (
                <CommonTextField
                  error={formik.errors.churchName}
                  icon={BiChurch}
                  name="churchName"
                  onChange={formik.handleChange}
                  placeholder=""
                  title="Church Name"
                  type="text"
                  value={formik.values.churchName}
                />
              ) : null}

              <CommonTextField
                error={formik.errors.firstName}
                icon={AiOutlineUser}
                name="firstName"
                onChange={formik.handleChange}
                placeholder="John"
                title="First Name"
                type="text"
                value={formik.values.firstName}
              />

              <CommonTextField
                error={formik.errors.lastName}
                icon={AiOutlineUser}
                name="lastName"
                onChange={formik.handleChange}
                placeholder="Doe"
                title="Last Name"
                type="text"
                value={formik.values.lastName}
              />

              <CommonTextField
                error={formik.errors.email}
                icon={HiOutlineMail}
                name="email"
                onChange={formik.handleChange}
                placeholder="johndoe@gmail.com"
                title="Email"
                type="text"
                value={formik.values.email}
              />

              <CommonTextField
                error={formik.errors.password}
                icon={HiOutlineLockClosed}
                name="password"
                onChange={formik.handleChange}
                placeholder="*********"
                title="Password"
                type="text"
                value={formik.values.password}
                isPassword
              />

              <Button
                className="bg-btmColor rounded-md shadow-sm h-12 my-4 hover:bg-slate-600 [&>*]:text-white"
                type="submit"
              >
                {isLoading ? (
                  <Spinner className="mr-8" />
                ) : (
                  <p>Create account</p>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignUp
