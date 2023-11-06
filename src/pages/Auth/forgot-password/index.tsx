import { shouldLoadRoute } from '@/common/utils/supertoken'
import { failNotification } from '@/common/utils/toast'
import { TextInput, Checkbox, Label, Button, Spinner } from 'flowbite-react'
import React, { FC, Fragment, useEffect, useState } from 'react'
import { HiOutlineMail } from 'react-icons/hi'
import { useNavigate } from 'react-router'

import bgImage from '../../../common/assets/bg-login.png'
import logo from '../../../common/assets/logo.png'

import { mainRoute, route } from '../../../common/constant/route'
import { useFormik } from 'formik'
import { useDispatch } from 'react-redux'

import { sendPasswordReset } from '@/common/api/user'

import { object } from 'yup'
import * as yup from 'yup'
interface LoginProps {}
const { REACT_APP_GOOGLE_CALLBACK_URL, REACT_APP_HOST_BE } = process.env

const ForgotPassword: FC<LoginProps> = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const formik = useFormik({
    initialValues: {
      email: '',
    },
    validationSchema: object({
      email: yup.string().required('Email is a required field !').email(),
    }),
    onSubmit: (values) => {
      forgotPasswordHandler(values.email)
    },
  })

  const forgotPasswordHandler = async (email: string) => {
    setIsLoading(true)
    try {
      await sendPasswordReset(email)
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
            className="sm:w-96 xs:w-96 md:w-[520px] shadow-2xl rounded-3xl m-4 sm:mr-12"
          >
            <div className="flex flex-col gap-8 p-12 items-center">
              <img src={logo} alt="" />
              <p className="text-lg font-bold text-gray-500">Forget Password</p>
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
                  placeholder="Type your e-mail here"
                  className="shadow-sm rounded-lg hover:border-primary focus:border-primary font-light"
                  onChange={formik.handleChange}
                  value={formik.values.email}
                  helperText={formik.errors.email}
                />

                <Button
                  className="bg-btmColor rounded-md shadow-sm h-12 my-4 hover:bg-slate-600 [&>*]:text-white"
                  type="submit"
                >
                  {isLoading ? <Spinner className="mr-8" /> : null}
                  FORGOT PASSWORD
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
