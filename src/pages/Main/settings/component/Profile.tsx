import React, { FC, useEffect, useRef, useState } from 'react'

import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'

import { useDispatch } from 'react-redux'
import { Avatar, Button, Input } from '@material-tailwind/react'
import qboIcon from '@/common/assets/qbo-icon.png'
import { capitalAtFirstLetter } from '@/common/utils/helper'
interface AccountProps {}

const TextInput = ({
  title,
  defValue,
  isEditing,
}: {
  title: string
  defValue: string | undefined
  isEditing: boolean
}) => (
  <div className="flex gap-8 w-1/3">
    <p className="w-32">{title}</p>
    <Input
      className="rounded-l !border-t-blue-gray-200 focus:!border-t-gray-900 w-96"
      color="black"
      defaultValue={defValue}
      disabled={!isEditing}
      labelProps={{
        className: 'before:content-none after:content-none',
      }}
    />
  </div>
)

const Profile: FC<AccountProps> = ({}) => {
  const dispatch = useDispatch()
  const subscribed = useRef(false)
  const { email, id, role, firstName, lastName, churchName } = useSelector(
    (item: RootState) => item.common.user,
  )

  const [isEditing, setIsEditing] = useState<boolean>(false)

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
                onClick={() => setIsEditing(false)}
              >
                Save changes
              </Button>
            </div>
          ) : (
            <Button
              variant="text"
              className="text-[#27A1DB]"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className="flex gap-4">
          <div className="flex flex-col gap-4 items-center">
            <Avatar src={qboIcon} size="xxl" />
            <Button variant="text">Upload a Photo</Button>
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
        />
        <TextInput
          title="Last Name"
          defValue={lastName}
          isEditing={isEditing}
        />
        <TextInput
          title="Church Name"
          defValue={churchName}
          isEditing={isEditing}
        />
        <TextInput title="Email" defValue={email} isEditing={isEditing} />
      </div>
    </div>
  )
}

export default Profile
