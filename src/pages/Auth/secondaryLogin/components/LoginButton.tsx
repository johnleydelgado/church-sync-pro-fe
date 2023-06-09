import { Spinner } from 'flowbite-react'
import React, { FC } from 'react'
import { RiCheckboxCircleLine } from 'react-icons/ri'

interface loginButtonProps {
  loginImage: any
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void
  isHide: boolean
  name: string
  isLoading: boolean
}

const LoginButton: FC<loginButtonProps> = ({
  loginImage,
  onClick,
  isHide,
  name,
  isLoading,
}) => {
  return (
    <>
      {isHide ? (
        <div className="bg-slate-200 rounded-md p-4 flex justify-between items-center gap-4 text-center">
          <p className="font-montserrat font-medium text-sm flex-1">{name}</p>
          <RiCheckboxCircleLine className="text-green-400 h-6 w-6" />
        </div>
      ) : (
        <div
          className="relative max-w-xs overflow-hidden bg-cover bg-no-repeat"
          data-te-ripple-init
          data-te-ripple-color="light"
        >
          <div className="flex justify-center">
            {isLoading ? (
              <Spinner className="text-center" />
            ) : (
              <img
                className="w-full h-12 object-contain"
                src={loginImage}
                alt="Stickman"
              />
            )}
          </div>

          <div onClick={onClick}>
            <div
              className="absolute top-0 right-0 bottom-0 left-0 h-full w-full cursor-pointer overflow-hidden bg-fixed opacity-0 transition duration-300 ease-in-out hover:opacity-100"
              style={{ backgroundColor: 'rgba(251, 251, 251, 0.2)' }}
            />
          </div>
        </div>
      )}
    </>
  )
}

export default LoginButton
