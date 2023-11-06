import React, { FC, ReactNode, useState } from 'react'

import NavBar from '../NavBar/NavBar'
import SideBar from '../SideBar/SideBar'
import { useMediaQuery } from 'react-responsive'

interface MainLayoutProps {
  children: ReactNode
  removePadding?: boolean
  removeNavBar?: boolean
}

const MainLayout: FC<MainLayoutProps> = ({
  children,
  removePadding = false,
  removeNavBar = false,
}) => {
  const [isTrigger, setIsTrigger] = useState(false)
  const isTabletOrMobile = useMediaQuery({ query: '(max-width: 767px)' })

  return (
    <div className="font-lato h-screen font-medium bg-slate-100 flex flex-col">
      {removeNavBar ? null : <NavBar />}
      <SideBar isTrigger={isTrigger} setIsTrigger={setIsTrigger} />
      <div
        className={`transform duration-200 delay-150 h-full bg-white ${
          removePadding ? '' : 'px-6 pb-6'
        } flex-1 ${isTabletOrMobile ? `ml-0` : isTrigger ? `ml-24` : 'ml-64'}`}
      >
        {children}
      </div>
    </div>
  )
}

export default MainLayout
