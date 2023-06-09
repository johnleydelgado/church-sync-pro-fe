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

import bgImage from '../../../common/assets/bg_2.png'
import { shouldLoadRoute } from '@/common/utils/supertoken'
import { failNotification } from '@/common/utils/toast'
import { AiOutlineUser } from 'react-icons/ai'
import { mainRoute, route } from '@/common/constant/route'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import {
  UserSignUpProps,
  signUpValidationSchema,
  signUpInitialValues,
} from '@/common/constant/formik'
import { useDispatch } from 'react-redux'
import { setReTriggerIsUserTokens, setUserData } from '@/redux/common'
import { storageKey } from '@/common/utils/storage'
import {
  checkValidInvitation,
  getUserRelated,
  updateInvitationStatus,
} from '@/common/api/user'
import CommonTextField from '@/common/components/text-input/CommonTextField'
import { useQuery } from 'react-query'
import Loading from '@/common/components/loading/Loading'
import Lottie from 'lottie-react'
import accepted from '@/common/assets/accepted-invation-sucessfully.json'
import { Link } from 'react-router-dom'

interface SignUpProps {}

const delay = (ms: any) => new Promise((res) => setTimeout(res, ms))

const InviteLink: FC<SignUpProps> = () => {
  const reTriggerIsUserTokens = useSelector(
    (item: RootState) => item.common.reTriggerIsUserTokens,
  )
  const urlParams = new URLSearchParams(window.location.search)
  const invitationToken = urlParams.get('invitationToken')
  const bookkeeperEmail = urlParams.get('bookkeeperEmail')

  const { data: isInvitationValid, isLoading: isInvitationLoading } = useQuery(
    ['isInvitationValid'],
    async () => {
      if (bookkeeperEmail)
        return await checkValidInvitation(bookkeeperEmail, invitationToken)
      return false
    },
    {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    },
  )

  const { data: userData } = useQuery(
    ['getUserRelatedBookkeeper', bookkeeperEmail],
    async () => {
      if (bookkeeperEmail) {
        const res = await getUserRelated(bookkeeperEmail)
        return res.data
      }
    },
    { staleTime: Infinity, refetchOnWindowFocus: false },
  )

  const dispatch = useDispatch()

  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [signUpSuccess, setSignUpSuccess] = useState<boolean>(false)
  const [isValid, setIsValid] = useState<boolean>(false)

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
          { id: 'role', value: 'bookkeeper' },
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
        // sendEmail()
        await delay(2000)
        const userData = await getUserRelated(email)
        const { id, role, firstName, lastName, churchName } = userData.data
        await updateInvitationStatus(bookkeeperEmail as string, id)

        dispatch(
          setUserData({ id, role, firstName, lastName, churchName, email }),
        )
        dispatch(setReTriggerIsUserTokens(!reTriggerIsUserTokens))
        setSignUpSuccess(true)
        localStorage.setItem(storageKey.PERSONAL_TOKEN, role)
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
      window.location.reload()
    }
  }

  //   const checkSession = useCallback(async () => {
  //     if ((await shouldLoadRoute({ email: user.email })) && signUpSuccess) {
  //       window.location.href = route.TRANSACTION
  //     }
  //   }, [signUpSuccess, user.email])

  //   useEffect(() => {
  //     checkSession()
  //   }, [checkSession])

  useEffect(() => {
    if (isInvitationValid && isInvitationValid.success) {
      setIsValid(true)
    }
  }, [isInvitationValid])

  useEffect(() => {
    const update = async () => {
      await updateInvitationStatus(bookkeeperEmail as string, userData.id)
    }
    if (userData) update()
  }, [userData])

  const formik = useFormik({
    initialValues: {
      ...signUpInitialValues,
      email: (bookkeeperEmail as string) || '',
    },
    validationSchema: signUpValidationSchema,
    onSubmit: (values) => {
      const { ...rest } = values
      if (!isLoading) signUpClicked(rest)
    },
  })

  return (
    <>
      {isInvitationLoading ? (
        <Loading />
      ) : !isValid ? (
        <p>Error page</p>
      ) : userData ? (
        <div className="flex pt-40 justify-center items-center text-center h-full">
          <div className="flex flex-col gap-4 text-center">
            <p className="text-4xl">
              Thank you for accepting
              <br />
              the invitation to join Church Sync Pro.
            </p>
            <Link className="text-xl font-thin underline text-gray-700" to="/">
              Click this link to continue.
            </Link>
          </div>
          <Lottie animationData={accepted} loop={true} />
        </div>
      ) : (
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
              <span className="text-4xl font-serif text-gray-700">
                Create an account
              </span>
              <span className="text-md font-serif text-slate-500 text-gray-700">
                Let`s get started with your day for Church Sync Pro
              </span>
            </div>

            {/* Divider */}

            <div className="flex flex-col  gap-y-4 pt-4">
              <div className="w-full h-[1px] bg-gray-500" />
            </div>

            {/* FORMS */}

            <form
              className="flex flex-col gap-1 pt-6"
              onSubmit={formik.handleSubmit}
            >
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
                isDisable
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
                className="bg-primary rounded-md shadow-sm h-12 my-4 hover:bg-slate-600 [&>*]:text-white"
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
      )}
    </>
  )
}

export default InviteLink
