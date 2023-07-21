import { TextInput } from 'flowbite-react'
import React, { FC, useState } from 'react'
import { HiEye, HiEyeOff } from 'react-icons/hi'

interface CommonTextFieldProps {
  icon?: any
  onChange: any
  title: string
  value: string
  error?: any
  name: string
  type: string
  placeholder: string
  isPassword?: boolean
  isDisable?: boolean
}

const CommonTextField: FC<CommonTextFieldProps> = ({
  icon,
  onChange,
  title,
  value,
  name,
  error,
  type,
  placeholder,
  isPassword,
  isDisable,
}) => {
  const [showPassword, setShowPassword] = useState<boolean>(false)

  return (
    <div className="w-full relative">
      <p className="text-gray-500 font-normal py-2">{title}</p>
      <TextInput
        id={name}
        type={isPassword && !showPassword ? 'password' : type}
        name={name}
        icon={icon}
        placeholder={placeholder}
        className="shadow-sm rounded-lg hover:border-primary focus:border-primary font-light"
        onChange={onChange}
        value={value}
        disabled={isDisable || false}
      />
      {isPassword ? (
        <div
          className="absolute right-4 top-12 text-gray-600 cursor-pointer hover:bg-blue-900 hover:text-white rounded-full"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? <HiEyeOff size={20} /> : <HiEye size={20} />}
        </div>
      ) : null}

      {error ? <p className="text-red-700 pt-2">{error}</p> : null}
    </div>
  )
}

export default CommonTextField
