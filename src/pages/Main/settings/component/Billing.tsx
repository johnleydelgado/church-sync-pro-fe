import React, { FC, useEffect, useRef, useState } from 'react'

import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'

import { useDispatch } from 'react-redux'
import { Avatar, Button, Input } from '@material-tailwind/react'
import qboIcon from '@/common/assets/qbo-icon.png'
import { capitalAtFirstLetter } from '@/common/utils/helper'
interface AccountProps {}

const TextInput = ({ title }: { title: string }) => (
  <div className="flex gap-8 w-1/3">
    <p className="w-32">{title}</p>
    <Input
      className="rounded-l !border-t-blue-gray-200 focus:!border-t-gray-900 w-96"
      color="black"
      labelProps={{
        className: 'before:content-none after:content-none',
      }}
    />
  </div>
)

const Billing: FC<AccountProps> = ({}) => {
  const dispatch = useDispatch()
  const subscribed = useRef(false)
  const { email, id, role, firstName, lastName } = useSelector(
    (item: RootState) => item.common.user,
  )

  return (
    <div className="w-full  flex flex-col bg-white justify-center px-8 mt-2">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 w-full">
        <p className="text-md text-[#27A1DB]">Billing Contact</p>
        <Button
          variant="text"
          className="text-[#27A1DB] mr-32 italic font-normal"
        >
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-3 px-4 gap-4 border-b-[1px] py-6 border-[#DDDDDD]">
        <div className="col-span-1">
          <p>John Doe</p>
        </div>
        <div className="col-span-2">
          <p>5555-5555-555</p>
        </div>
        <div className="col-span-1">
          <p>609 vicente cruz sampaloc manila</p>
        </div>
        <div className="col-span-2">asdasd@gmail.com</div>
        <div className="col-span-1">
          <p>1009</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-4 pt-4 w-full">
        <p className="text-md text-[#27A1DB]">Payment Information</p>
        <Button
          variant="text"
          className="text-[#27A1DB] mr-32 italic font-normal"
        >
          Edit payment method
        </Button>
      </div>

      <div className="grid grid-cols-1 px-4 gap-4 border-b-[1px] py-6 border-[#DDDDDD]">
        <p>Credit card ******0421 Expires 02/26</p>
        <p>Next billing cycle is on 00/00/00</p>
      </div>

      <div className="flex items-center justify-between gap-2 px-4 pt-4 w-full">
        <p className="text-md text-[#27A1DB]">Subscription plan</p>
        <Button
          variant="text"
          className="text-[#27A1DB] mr-32 italic font-normal"
        >
          Change plan
        </Button>
      </div>

      <div className="grid grid-cols-1 px-4 gap-4 border-b-[1px] py-6 border-[#DDDDDD]">
        <p>12 months</p>
        <p>6.30/ month</p>
      </div>
    </div>
  )
}

export default Billing
