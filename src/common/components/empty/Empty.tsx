import React, { FC } from 'react'
import lottieAnimation from '../../assets/data_not_found.json'
import Lottie from 'lottie-react'
interface EmptyProps {
  message?: string
  action?: React.ReactNode
}

const Empty: FC<EmptyProps> = ({ message, action }) => {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6">
      <Lottie animationData={lottieAnimation} loop={true} />
      {message ? (
        <p className="text-center text-lg font-medium text-slate-500">
          {message}
        </p>
      ) : null}
      {action ? <div className="flex justify-center">{action}</div> : null}
    </div>
  )
}

export default Empty
