import React, { FC } from 'react'
import lottieAnimation from '../../assets/data_not_found.json'
import Lottie from 'lottie-react'
interface EmptyProps {}

const Empty: FC<EmptyProps> = ({}) => {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      {/* <p className="text-4xl font-bold text-slate-500">Data not found</p> */}
      <Lottie animationData={lottieAnimation} loop={true} />
    </div>
  )
}

export default Empty
