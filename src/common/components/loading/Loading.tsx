import React, { FC } from 'react'
import Lottie from 'lottie-react'
import groovyWalkAnimation from '../../assets/9131-loading-green.json'
interface LoadingProps {}

const Loading: FC<LoadingProps> = () => {
  return (
    <div className="flex justify-center items-center h-full">
      <Lottie animationData={groovyWalkAnimation} loop={true} />
    </div>
  )
}

export default Loading
