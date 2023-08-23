import MainLayout from '@/common/components/main-layout/MainLayout'
import React, { FC } from 'react'
import bgImage from '@/common/assets/home-bg.png'

interface HomeProps {}

const Home: FC<HomeProps> = ({}) => {
  return (
    <MainLayout removePadding removeNavBar>
      <img className="absolute w-full h-full" src={bgImage} alt="" />
    </MainLayout>
  )
}

export default Home
