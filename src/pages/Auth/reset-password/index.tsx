import { shouldLoadRoute } from '@/common/utils/supertoken'
import { failNotification } from '@/common/utils/toast'
import { TextInput, Checkbox, Label, Button, Spinner } from 'flowbite-react'
import React, { FC, Fragment, useEffect, useState } from 'react'
import {
  HiEye,
  HiEyeOff,
  HiOutlineLockClosed,
  HiOutlineMail,
} from 'react-icons/hi'
import { useNavigate } from 'react-router'

import bgImage from '../../../common/assets/bg-login.png'
import logo from '../../../common/assets/logo.png'

import { mainRoute, route } from '../../../common/constant/route'
import { useFormik } from 'formik'
import { useDispatch } from 'react-redux'

import { resetPassword, sendPasswordReset } from '@/common/api/user'

import { object } from 'yup'
import * as yup from 'yup'
interface ResetPasswordProps {}
const { REACT_APP_GOOGLE_CALLBACK_URL, REACT_APP_HOST_BE } = process.env

const ResetPassword: FC<ResetPasswordProps> = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [showPassword2, setShowPassword2] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const urlParams = new URLSearchParams(window.location.search)
  const token = urlParams.get('token')
  const email = urlParams.get('email')

  const formik = useFormik({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validationSchema: object({
      password: yup.string().required('Password is a required field !'),
      confirmPassword: yup
        .string()
        .oneOf([yup.ref('password'), ''], 'Passwords must match'),
    }),
    onSubmit: (values) => {
      forgotPasswordHandler(values.password)
    },
  })

  const forgotPasswordHandler = async (password: string) => {
    setIsLoading(true)
    try {
      await resetPassword(email || '', token || '', password)
      navigate(route.ROOT)
    } catch (e: any) {
      failNotification({ title: e.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
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
            className="w-[520px]  absolute top-1/2 transform -translate-y-1/2 right-28 shadow-2xl rounded-3xl"
          >
            <div className="flex flex-col gap-8 p-12 items-center">
              <img src={logo} alt="" />
              <p className="text-lg font-bold text-gray-500">Reset Password</p>
              <div className="border-[0.5px] w-52 -mt-6" />

              {/* FORMS */}
              <form
                className="flex flex-col gap-4 [&>*]:text-red-600 w-72"
                onSubmit={formik.handleSubmit}
              >
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
                    placeholder="enter new password"
                    className="shadow-sm rounded-lg hover:border-blue-900 font-light w-full"
                    onChange={formik.handleChange}
                    value={formik.values.password}
                    security="false"
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

                {formik.errors.password ? (
                  <p>{formik.errors.password}</p>
                ) : null}

                <div
                  className={`${
                    formik.values.password ? 'flex' : 'block'
                  } w-full relative`}
                >
                  <TextInput
                    id="confirmPassword"
                    type={`${showPassword2 ? 'text' : 'password'}`}
                    name="confirmPassword"
                    icon={HiOutlineLockClosed}
                    placeholder="confirm new password"
                    className="shadow-sm rounded-lg hover:border-blue-900 font-light w-full"
                    onChange={formik.handleChange}
                    value={formik.values.confirmPassword}
                    security="false"
                  />
                  <div
                    className="absolute right-2 top-2 text-slate-600 cursor-pointer p-1 hover:bg-blue-900 hover:text-white rounded-full"
                    onClick={() => setShowPassword2(!showPassword2)}
                  >
                    {showPassword2 ? (
                      <HiEyeOff size={20} className="text-blue-gray-600" />
                    ) : (
                      <HiEye size={20} className="text-blue-gray-600" />
                    )}
                  </div>
                </div>
                {formik.errors.confirmPassword ? (
                  <p>{formik.errors.confirmPassword}</p>
                ) : null}

                <Button
                  className="bg-btmColor rounded-md shadow-sm h-12 my-4 hover:bg-slate-600 [&>*]:text-white"
                  type="submit"
                >
                  {isLoading ? <Spinner className="mr-8" /> : null}
                  Submit
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
