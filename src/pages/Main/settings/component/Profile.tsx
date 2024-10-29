import React, { FC, useEffect, useRef, useState } from 'react'

import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'

import { useDispatch } from 'react-redux'
import {
  Avatar,
  Button,
  Checkbox,
  Input,
  Spinner,
  Typography,
} from '@material-tailwind/react'
import qboIcon from '@/common/assets/qbo-icon.png'
import { capitalAtFirstLetter } from '@/common/utils/helper'
import { useFormik } from 'formik'
import { object } from 'yup'
import * as yup from 'yup'
import { error } from 'console'
import { userUpdate } from '@/common/api/user'
import { setIsQuickStartHide, setUserData } from '@/redux/common'
import { IoMdImages } from 'react-icons/io'
import MainLayout from '@/common/components/main-layout/MainLayout'
import { MdSettings } from 'react-icons/md'
interface AccountProps {}

const TextInput = ({
  title,
  defValue,
  isEditing,
  error,
  onChange,
  isDisabled,
}: {
  title: string
  defValue: string | undefined
  isEditing: boolean
  error?: string
  onChange?: (e: any) => void
  isDisabled?: boolean
}) => (
  <div className="grid grid-cols-2 w-1/3 gap-24 md:gap-12">
    <p className="w-32">{title}</p>
    <div>
      <Input
        className="rounded-md border-green-500 w-96"
        color="black"
        defaultValue={defValue}
        disabled={!isEditing || isDisabled}
        onChange={onChange}
        variant="outlined"
        label={title}
        crossOrigin={undefined}
      />
      {error ? <p className="text-red-600">{error}</p> : null}
    </div>
  </div>
)

const Profile: FC<AccountProps> = ({}) => {
  const dispatch = useDispatch()
  const subscribed = useRef(false)
  const [file, setFile] = useState<File | null>(null)
  const [createObjectURL, setCreateObjectURL] = useState('')
  const [loadingSave, setLoadingSave] = useState<boolean>(false)

  const isQuickStartHide = useSelector(
    (state: RootState) => state.common.isQuickStartHide,
  )

  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)

  const { email, id, role, firstName, lastName, churchName, img_url } =
    useSelector((item: RootState) => item.common.user)

  const [isEditing, setIsEditing] = useState<boolean>(false)
  const formik = useFormik({
    initialValues: {
      firstName: firstName || '',
      lastName: lastName || '',
      churchName:
        role === 'bookkeeper' ? bookkeeper?.churchName || '' : churchName || '',
      email: email || '',
      imageUrl: img_url || '',
    },
    validationSchema: object({
      email: yup.string().email(),
    }),
    onSubmit: async (values) => {
      // forgotPasswordHandler(values.password)
      setLoadingSave(true)
      const data = {
        ...values,
        userId: id || 0,
        file: file || undefined,
        file_name: file?.name,
      }
      try {
        const response = await userUpdate(data)
        setIsEditing(false)
        const imgUrl = response.data.imageUrl || ''
        const finalImgUrl = imgUrl || img_url
        dispatch(
          setUserData({
            ...values,
            id,
            role,
            ...(finalImgUrl ? { img_url: finalImgUrl } : {}),
          }),
        )
      } catch (e: any) {
        console.log('', e)
        setIsEditing(false)
      } finally {
        setLoadingSave(false)
      }
    },
  })

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault()
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0])
      setCreateObjectURL(URL.createObjectURL(event.target.files[0]))
    }
  }

  useEffect(() => {
    if (img_url) {
      formik.setFieldValue('imageUrl', img_url)
    }
  }, [img_url])

  return (
    <MainLayout>
      <div className="-m-6 p-6 h-full">
        {/* Header */}
        <div className="pb-2">
          <div className="flex flex-col border-b-2 pb-2">
            <div className="flex items-center gap-2">
              <MdSettings size={28} className="text-blue-400" />
              <span className="font-bold text-lg text-primary">Settings</span>
            </div>
          </div>
        </div>
        <div className="w-full  flex flex-col bg-white justify-center mt-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:p-4 sm:w-3/6 md:w-3/6 lg:w-full xl:w-1/2  w-full">
            <p className="text-4xl font-bold text-primary">Profile</p>
            <div>
              {isEditing ? (
                <div className="flex gap-4">
                  <Button
                    variant="outlined"
                    className="border-yellow text-yellow rounded-full"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-yellow rounded-full"
                    onClick={() => formik.handleSubmit()}
                  >
                    <div className="flex gap-4 items-center">
                      <p>Save changes</p>
                      {loadingSave ? <Spinner /> : null}
                    </div>
                  </Button>
                </div>
              ) : (
                <Button
                  variant="text"
                  className="text-primary italic"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 py-2 md:p-4 lg:p-4">
            <div className="flex gap-4">
              <div className="flex flex-col gap-4 items-center md:px-4 py-2">
                {formik.values.imageUrl ? (
                  <Avatar src={formik.values.imageUrl} size="xxl" />
                ) : createObjectURL ? (
                  <Avatar
                    className="rounded-t-lg object-cover md:w-auto md:rounded-none md:rounded-l-lg "
                    src={createObjectURL}
                    alt=""
                    size="xxl"
                  />
                ) : (
                  <IoMdImages
                    size={77}
                    className="bg-blue-gray-100 rounded-full p-4"
                  />
                )}
                {/* <Button variant="text">Upload a Photo</Button> */}
                {isEditing ? (
                  <div className="">
                    <input
                      id="file"
                      type="file"
                      name="image"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <label
                      htmlFor="file"
                      className="cursor-pointer text-primary"
                    >
                      <span id="upload-photo-text">Upload Photo</span>
                    </label>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-col gap-4 pt-6">
                <p>
                  {capitalAtFirstLetter(firstName)}{' '}
                  {capitalAtFirstLetter(lastName)}
                </p>
                <p>{email}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 md:pl-10 border-b-[1px] pb-4">
            <p className="text-primary text-lg">Personal Information</p>

            <TextInput
              title="First Name"
              defValue={firstName}
              isEditing={isEditing}
              onChange={(e: any) =>
                formik.setFieldValue('firstName', e.target.value)
              }
            />
            <TextInput
              title="Last Name"
              defValue={lastName}
              isEditing={isEditing}
              onChange={(e: any) =>
                formik.setFieldValue('lastName', e.target.value)
              }
            />
            <TextInput
              title="Church Name"
              defValue={
                role === 'bookkeeper'
                  ? bookkeeper?.churchName || ''
                  : churchName || ''
              }
              isEditing={isEditing}
              onChange={(e: any) =>
                formik.setFieldValue('churchName', e.target.value)
              }
              isDisabled={role === 'bookkeeper'}
            />
            <TextInput
              title="Email"
              defValue={email}
              isEditing={isEditing}
              onChange={(e: any) =>
                formik.setFieldValue('email', e.target.value)
              }
            />
          </div>

          <div className="pl-6">
            <p className="text-primary text-lg pt-6">Quick start settings</p>

            <Checkbox
              id="1"
              color="green"
              label={
                <Typography className="text-gray-600">
                  Disable quick start
                </Typography>
              }
              ripple
              checked={isQuickStartHide}
              onChange={(a) => dispatch(setIsQuickStartHide(!isQuickStartHide))}
              crossOrigin={undefined}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

export default Profile
