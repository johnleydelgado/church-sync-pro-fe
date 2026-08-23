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
      {/* Unconstrained, the animation grows to fill the parent and pushes the
          message far below the fold on tall, mostly-empty pages. */}
      <Lottie
        animationData={lottieAnimation}
        loop={true}
        className="max-h-72 w-full max-w-md"
      />
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
