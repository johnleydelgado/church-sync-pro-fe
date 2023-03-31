/* eslint-disable @typescript-eslint/no-explicit-any */
import { TextInput, Button } from 'flowbite-react'
import { useFormik } from 'formik'
import { FC, useEffect, useState } from 'react'
import {
  HiOutlineMail,
  HiEye,
  HiOutlineLockClosed,
  HiEyeOff,
} from 'react-icons/hi'
import { BiChurch } from 'react-icons/bi'
import { emailPasswordSignUp } from 'supertokens-web-js/recipe/thirdpartyemailpassword'
import { object } from 'yup'
import * as yup from 'yup'

import bgImage from '../../../common/assets/bg_2.png'
import { sendEmail, shouldLoadRoute } from '@/common/utils/supertoken'
import { failNotification } from '@/common/utils/toast'
import { AiOutlineUser } from 'react-icons/ai'
import { updateUser } from '@/common/api/user'
import { route } from '@/common/constant/route'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'

export const validationSchema = object({
  email: yup.string().required('Email is a required field').email(),
  churchName: yup.string().required('Church Name is a required field'),
  firstName: yup.string().required('First Name is a required field'),
  lastName: yup.string().required('Last Name is a required field'),
  password: yup.string().required('Password is a required field'),
})

export interface UserProps {
  churchName: string
  firstName: string
  lastName: string
  email: string
  password: string
}

interface SignUpProps {}
const SignUp: FC<SignUpProps> = () => {
  const { user } = useSelector((state: RootState) => state.common)

  const initialValues: UserProps = {
    churchName: '',
    firstName: '',
    lastName: '',
    email: user.email,
    password: '',
  }

  const [showPassword, setShowPassword] = useState<boolean>(false)

  const [signUpSuccess, setSignUpSuccess] = useState<boolean>(false)

  async function signUpClicked({
    churchName,
    firstName,
    lastName,
    email,
    password,
  }: UserProps) {
    try {
      const response = await emailPasswordSignUp({
        formFields: [
          { id: 'churchName', value: churchName },
          { id: 'firstName', value: firstName },
          { id: 'lastName', value: lastName },
          { id: 'email', value: email },
          { id: 'password', value: password },
          { id: 'isSubscribe', value: '0' },
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
        // sendEmail()
        setSignUpSuccess(true)
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
    }
  }

  const checkSession = async () => {
    if ((await shouldLoadRoute()) && signUpSuccess) {
      window.location.href = route.SECONDARY_LOGIN
    }
  }

  useEffect(() => {
    checkSession()
  }, [signUpSuccess])

  const formik = useFormik({
    initialValues,
    validationSchema,
    onSubmit: (values) => {
      const { ...rest } = values
      signUpClicked(rest)
    },
  })

  return (
    <div className="h-screen flex flex-col lg:flex-row-reverse lg:bg-white">
      <div
        className="flex-grow m-6"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderTopLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      />
      <div className="p-8 bg-white w-full md:p-24 lg:w-2/6">
        {/*  */}
        <div className="flex flex-col gap-y-4">
          <span className="text-4xl font-serif">Create an account</span>
          <span className="text-md font-serif text-slate-500">
            Let`s get started with your day for Church Sync Pro
          </span>
        </div>

        {/* Divider */}

        <div className="flex flex-col  gap-y-4 pt-4">
          <div className="w-full h-[1px] bg-gray-500" />
        </div>

        {/* FORMS */}

        <form
          className="flex flex-col gap-4 pt-6 [&>*]:text-red-600"
          onSubmit={formik.handleSubmit}
        >
          <TextInput
            id="churchName"
            type="text"
            name="churchName"
            icon={BiChurch}
            placeholder="Church Name"
            className="shadow-sm rounded-lg hover:border-primary focus:border-primary font-light"
            onChange={formik.handleChange}
            value={formik.values.churchName}
            helperText={formik.errors.churchName}
          />
          <TextInput
            id="firstName"
            type="text"
            name="firstName"
            icon={AiOutlineUser}
            placeholder="John"
            className="shadow-sm rounded-lg hover:border-primary focus:border-primary font-light"
            onChange={formik.handleChange}
            value={formik.values.firstName}
            helperText={formik.errors.firstName}
          />
          <TextInput
            id="lastName"
            type="text"
            name="lastName"
            icon={AiOutlineUser}
            placeholder="Doe"
            className="shadow-sm rounded-lg hover:border-primary focus:border-primary font-light"
            onChange={formik.handleChange}
            value={formik.values.lastName}
            helperText={formik.errors.lastName}
          />
          <TextInput
            id="email"
            type="email"
            name="email"
            icon={HiOutlineMail}
            placeholder="johndoe@gmail.com"
            className="shadow-sm rounded-lg hover:border-primary focus:border-primary font-light"
            onChange={formik.handleChange}
            value={formik.values.email}
            disabled={user.email ? true : false}
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
              {showPassword ? <HiEyeOff size={20} /> : <HiEye size={20} />}
            </div>
          </div>

          <Button
            className="bg-primary rounded-md shadow-sm h-12 my-4 hover:bg-slate-600 [&>*]:text-white"
            type="submit"
          >
            Create account
          </Button>
        </form>
      </div>
    </div>
  )
}

export default SignUp
