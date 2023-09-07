import React, { FC, useEffect, useRef, useState } from 'react'

import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'

import { useDispatch } from 'react-redux'
import { Avatar, Button, Input } from '@material-tailwind/react'
import qboIcon from '@/common/assets/qbo-icon.png'
import { capitalAtFirstLetter } from '@/common/utils/helper'
import { useFormik } from 'formik'
import { object } from 'yup'
import * as yup from 'yup'
import { error } from 'console'
import { userUpdate } from '@/common/api/user'
import { setUserData } from '@/redux/common'
import { IoMdImages } from 'react-icons/io'
interface AccountProps {}

const TextInput = ({
  title,
  defValue,
  isEditing,
  error,
  onChange,
}: {
  title: string
  defValue: string | undefined
  isEditing: boolean
  error?: string
  onChange?: (e: any) => void
}) => (
  <div className="flex gap-8 w-1/3">
    <p className="w-32">{title}</p>
    <div>
      <Input
        className="rounded-l !border-t-blue-gray-200 focus:!border-t-gray-900 w-96"
        color="black"
        defaultValue={defValue}
        disabled={!isEditing}
        labelProps={{
          className: 'before:content-none after:content-none',
        }}
        onChange={onChange}
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

  const { email, id, role, firstName, lastName, churchName, img_url } =
    useSelector((item: RootState) => item.common.user)

  const [isEditing, setIsEditing] = useState<boolean>(false)
  const formik = useFormik({
    initialValues: {
      firstName: firstName || '',
      lastName: lastName || '',
      churchName: churchName || '',
      email: email || '',
      imageUrl: img_url || '',
    },
    validationSchema: object({
      email: yup.string().email(),
    }),
    onSubmit: async (values) => {
      // forgotPasswordHandler(values.password)
      const data = {
        ...values,
        userId: id || 0,
        file: file,
        file_name: file?.name,
      }
      try {
        const response = await userUpdate(data)
        setIsEditing(false)
        const imgUrl = response.data.imageUrl || ''
        dispatch(setUserData({ ...values, id, role, img_url: imgUrl }))
      } catch (e: any) {
        console.log('')
        setIsEditing(false)
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

  return (
    <div className="w-full  flex flex-col bg-white justify-center mt-2">
      <div className="flex items-center justify-between gap-2 p-4 w-2/5">
        <p className="text-4xl font-bold text-[#27A1DB]">Profile</p>
        <div>
          {isEditing ? (
            <div className="flex gap-4">
              <Button
                variant="outlined"
                className="border-[#FAB400] text-[#FAB400] rounded-full"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#FAB400] rounded-full"
                onClick={() => formik.handleSubmit()}
              >
                Save changes
              </Button>
            </div>
          ) : (
            <Button
              variant="text"
              className="text-[#27A1DB] italic"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className="flex gap-4">
          <div className="flex flex-col gap-4 items-center px-4 py-2">
            {createObjectURL ? (
              <Avatar
                className="rounded-t-lg object-cover md:w-auto md:rounded-none md:rounded-l-lg "
                src={createObjectURL}
                alt=""
                size="xxl"
              />
            ) : formik.values.imageUrl ? (
              <Avatar src={formik.values.imageUrl} size="xxl" />
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

                <label htmlFor="file" className="cursor-pointer text-[#27A1DB]">
                  <span id="upload-photo-text">Upload Photo</span>
                </label>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-4 pt-6">
            <p>
              {capitalAtFirstLetter(firstName)} {capitalAtFirstLetter(lastName)}
            </p>
            <p>{email}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 pl-10">
        <p className="text-[#27A1DB] text-lg">Personal Information</p>

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
          defValue={churchName}
          isEditing={isEditing}
          onChange={(e: any) =>
            formik.setFieldValue('churchName', e.target.value)
          }
        />
        <TextInput
          title="Email"
          defValue={email}
          isEditing={isEditing}
          onChange={(e: any) => formik.setFieldValue('email', e.target.value)}
        />
      </div>
    </div>
  )
}

export default Profile
