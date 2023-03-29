/* eslint-disable @typescript-eslint/no-explicit-any */
import { TextInput, Button } from 'flowbite-react'
import { useFormik } from 'formik'
import { FC, useEffect } from 'react'
import { HiOutlineMail, HiLockClosed, HiEye, HiUser } from 'react-icons/hi'
import { signUp } from 'supertokens-web-js/recipe/emailpassword'
import { doesSessionExist } from 'supertokens-web-js/recipe/session'
import { object } from 'yup'
import * as yup from 'yup'

import bgImage from '../../../common/assets/bg_2.png'
import { route } from '@/common/constant/route'

interface FormValueProps {
  name: string
  email: string
  password: string
}

export const validationSchema = object({
  email: yup.string().required().email(),
  name: yup.string().required(),
  password: yup.string().required(),
})

interface SignUpProps {}
const SignUp: FC<SignUpProps> = () => {
  const initialValues: FormValueProps = { name: '', email: '', password: '' }

  async function signUpClicked({ name, email, password }: FormValueProps) {
    try {
      const response = await signUp({
        formFields: [
          { id: 'name', value: name },
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
            window.alert(formField.error)
          } else if (formField.id === 'password') {
            // Password validation failed.
            // Maybe it didn't match the password strength
            window.alert(formField.error)
          } else if (formField.id === 'name') {
            // Password validation failed.
            // Maybe it didn't match the password strength
            window.alert(formField.error)
          }
        })
      } else {
        console.log(response)
        // sign up successful. The session tokens are automatically handled by
        // the frontend SDK.
        window.location.href = route.SECONDARY_LOGIN
      }
    } catch (err: any) {
      console.log('err', err)
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

  const formik = useFormik({
    initialValues,
    validationSchema,
    onSubmit: (values) => {
      const { name, email, password } = values
      signUpClicked({ name, email, password })
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

        {/* divider */}

        <div className="flex flex-col  gap-y-4 pt-8">
          <div className="flex items-center gap-4">
            <div className="w-full h-1 bg-gray-500" style={{ height: 1 }} />
            <span className="text-slate-400">or</span>
            <div className="w-full bg-gray-500" style={{ height: 1 }} />
          </div>
        </div>

        {/* FORMS */}

        <form
          className="flex flex-col gap-4 pt-6"
          onSubmit={formik.handleSubmit}
        >
          <TextInput
            id="name"
            type="text"
            name="name"
            icon={HiUser}
            placeholder="John Doe"
            className="shadow-sm rounded-lg hover:border-primary focus:border-primary font-light"
            onChange={formik.handleChange}
            value={formik.values.name}
            helperText={formik.errors.name}
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
            helperText={formik.errors.email}
          />

          <TextInput
            id="password"
            type="password"
            name="password"
            icon={HiLockClosed}
            rightIcon={HiEye}
            placeholder="*****************"
            className="shadow-sm rounded-lg hover:border-blue-900 font-light"
            onChange={formik.handleChange}
            value={formik.values.password}
            security="false"
            helperText={formik.errors.password}
          />

          <Button
            className="bg-primary rounded-md shadow-sm h-12 my-4 hover:bg-slate-600"
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
