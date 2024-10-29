import React, { FC, useEffect, useRef, useState } from 'react'

import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'

import { useDispatch } from 'react-redux'
import { Avatar, Button } from '@material-tailwind/react'
import qboIcon from '@/common/assets/qbo-icon.png'
import { capitalAtFirstLetter } from '@/common/utils/helper'
import { MdSettings } from 'react-icons/md'
import MainLayout from '@/common/components/main-layout/MainLayout'
import * as yup from 'yup'
import { useFormik } from 'formik'
import { addUpdateBilling, viewBilling } from '@/common/api/user'
import { useMutation, useQuery } from 'react-query'
import { Spinner } from 'flowbite-react'
import Loading from '@/common/components/loading/Loading'
import { failNotification } from '@/common/utils/toast'

interface AccountProps {}

interface InputProps {
  placeholder: string
  label: string
  w: string
  onChange: any
  value: any
  name: string
  error?: string
  required: boolean
  disabled?: boolean
}

export type BillingData = {
  name: string
  phone: string
  address: string
  email: string
  zipCode: string
  userId: number
  // Add other properties here
}

const Input = ({
  placeholder,
  label,
  w,
  onChange,
  value,
  name,
  error,
  required,
  disabled,
}: InputProps) => (
  <div className={`flex flex-col gap-2 ${w}`}>
    <label
      className={`font-normal text-gray-500 tracking-wide ${
        required ? 'text-black font-normal' : 'text-gray-500'
      }`}
    >
      {label}
    </label>
    <input
      name={name}
      className={`border-gray-300 rounded-md hover:border-green-400 focus:border-green-400 focus:ring-0 font-normal text-gray-500 text-md`}
      id={label}
      type="text"
      placeholder={placeholder}
      onChange={onChange}
      value={value}
      disabled={disabled}
    />
    {error ? (
      <label className="font-extralight text-red-400 tracking-wide text-sm">
        {error}
      </label>
    ) : null}
  </div>
)

const Billing: FC<AccountProps> = ({}) => {
  const dispatch = useDispatch()
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const { email, id, role, firstName, lastName } = useSelector(
    (item: RootState) => item.common.user,
  )

  const [isEdit, setIsEdit] = useState(false)

  const user = useSelector((item: RootState) => item.common.user)

  const { mutate, isLoading } = useMutation<
    unknown,
    unknown,
    {
      email: string
      data: BillingData | null
    }
  >(addUpdateBilling, {
    onSuccess: (data: any) => {
      // Handle success
      // For example, you can update the form values:
      console.log('data', data.data)
      formik.setValues({
        name: data?.data?.name ?? '',
        phone: data?.data?.phone ?? '',
        address: data?.data?.address ?? '',
        email: data?.data?.email ?? '',
        zipCode: data?.data?.zipCode ?? '',
        // Add other values here
      })
      refetch()
    },
  })

  const {
    data: billingData,
    refetch,
    isLoading: isLoadingBilling,
    isRefetching,
  } = useQuery(
    ['getBillingData', bookkeeper?.clientId],
    async () => {
      const userId =
        user.role === 'bookkeeper' ? bookkeeper?.clientId || '' : id
      if (userId) {
        const res = await viewBilling({ userId })
        console.log('go here????', res.data)
        return res.data
      }
    },
    { staleTime: Infinity },
  )

  const initialValues = {
    name: billingData?.name ?? '',
    phone: billingData?.phone ?? '',
    address: billingData?.address ?? '',
    email: billingData?.email ?? '',
    zipCode: billingData?.zipCode ?? '',
    // Add other initial values here
  }

  const validationSchema = yup.object({
    name: yup.string().required('Name is required'),
    phone: yup.string().required('Phone is required'),
    address: yup.string().required('Address is required'),
    email: yup.string().email('Invalid email').required('Email is required'),
    zipCode: yup.string().required('Zip Code is required'),
    // Add other validations here
  })

  const formik = useFormik({
    initialValues: initialValues,
    validationSchema: validationSchema,
    onSubmit: (values) => {
      // Handle form submission
      const userId = user.role === 'bookkeeper' ? bookkeeper?.clientId || 0 : id
      const fValues = { ...values, userId: userId || 0 }
      mutate({ email: fValues.email, data: fValues })
      setIsEdit(false)
    },
  })

  useEffect(() => {
    if (billingData) {
      formik.setValues({
        name: billingData.name,
        phone: billingData.phone,
        address: billingData.address,
        email: billingData.email,
        zipCode: billingData.zipCode,
      })
    }
  }, [billingData])

  useEffect(() => {
    if (formik.isSubmitting && formik.errors) {
      failNotification({ title: 'Please check and fill up all fields .' })
    }
  }, [formik.isSubmitting])

  return (
    <MainLayout>
      {isRefetching || isLoadingBilling ? (
        <Loading />
      ) : (
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

          <div className="w-full  flex flex-col bg-white justify-center px-8 mt-2">
            <div className="flex items-center justify-between gap-2 px-4 py-4 w-full ">
              <p className="text-md text-primary">Billing Contact</p>
              {!billingData && (
                <Button
                  variant="text"
                  className="text-primary mr-32 italic font-normal"
                >
                  Add
                </Button>
              )}
            </div>

            {billingData && !isEdit ? (
              <div className="border-y-[1px]">
                <div className="col-span-1 flex justify-end">
                  <Button
                    variant="text"
                    className="text-primary italic font-normal"
                    onClick={() => setIsEdit(true)}
                  >
                    Edit
                  </Button>
                </div>
                <div className="grid grid-cols-3 px-4 gap-4 py-6 border-[#DDDDDD]">
                  <div className="col-span-1">
                    <label className="font-normal text-gray-500 tracking-wide">
                      Name
                    </label>
                    <p>{billingData?.name || 'N/a'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="font-normal text-gray-500 tracking-wide">
                      Phone
                    </label>
                    <p>{billingData?.phone || 'N/a'}</p>
                  </div>
                  <div className="col-span-1">
                    <label className="font-normal text-gray-500 tracking-wide">
                      Address
                    </label>
                    <p>{billingData?.address || 'N/a'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="font-normal text-gray-500 tracking-wide">
                      Email
                    </label>
                    <p>{billingData?.email || 'N/a'}</p>
                  </div>
                  <div className="col-span-1">
                    <label className="font-normal text-gray-500 tracking-wide">
                      Zip Code
                    </label>
                    <p>{billingData?.zipCode || 'N/a'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <form
                className="grid grid-cols-3 px-4 gap-4 py-6 border-[#DDDDDD]"
                onSubmit={formik.handleSubmit}
              >
                <div className="col-span-1">
                  <Input
                    name="name"
                    label="Name"
                    placeholder=""
                    w="w-full"
                    onChange={formik.handleChange}
                    value={formik.values.name}
                    required={false}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    name="phone"
                    label="Phone"
                    placeholder=""
                    w="w-full"
                    onChange={formik.handleChange}
                    value={formik.values.phone}
                    required={false}
                  />
                </div>
                <div className="col-span-1">
                  <Input
                    name="address"
                    label="Address"
                    placeholder=""
                    w="w-full"
                    onChange={formik.handleChange}
                    value={formik.values.address}
                    required={false}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    name="email"
                    label="Email"
                    placeholder=""
                    w="w-full"
                    onChange={formik.handleChange}
                    value={formik.values.email}
                    required={false}
                  />
                </div>
                <div className="col-span-1">
                  <Input
                    name="zipCode"
                    label="Zip Code"
                    placeholder=""
                    w="w-full"
                    onChange={formik.handleChange}
                    value={formik.values.zipCode}
                    required={false}
                  />
                </div>

                <div className="col-span-3 flex justify-end space-x-4">
                  <Button
                    className="bg-red-600"
                    onClick={() => setIsEdit(false)}
                  >
                    Cancel
                  </Button>
                  <Button className="bg-green-500" type="submit">
                    {isLoading ? <Spinner className="mr-8" /> : null}
                    Save
                  </Button>
                </div>
              </form>
            )}

            {/* 
          <div className="flex items-center justify-between gap-2 px-4 pt-4 w-full">
            <p className="text-md text-primary">Payment Information</p>
            <Button
              variant="text"
              className="text-primary mr-32 italic font-normal"
            >
              Edit payment method
            </Button>
          </div>

          <div className="grid grid-cols-1 px-4 gap-4 border-b-[1px] py-6 border-[#DDDDDD]">
            <p>Credit card ******0421 Expires 02/26</p>
            <p>Next billing cycle is on 00/00/00</p>
          </div>

          <div className="flex items-center justify-between gap-2 px-4 pt-4 w-full">
            <p className="text-md text-primary">Subscription plan</p>
            <Button
              variant="text"
              className="text-primary mr-32 italic font-normal"
            >
              Change plan
            </Button>
          </div>

          <div className="grid grid-cols-1 px-4 gap-4 border-b-[1px] py-6 border-[#DDDDDD]">
            <p>12 months</p>
            <p>6.30/ month</p>
          </div> */}
          </div>
        </div>
      )}
    </MainLayout>
  )
}

export default Billing
