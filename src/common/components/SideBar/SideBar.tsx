/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { FC, useEffect } from 'react'
import { CgArrowLeft } from 'react-icons/cg'
import { HiOutlineLogout } from 'react-icons/hi'
import { useMediaQuery } from 'react-responsive'
import { useLocation } from 'react-router'
import Session from 'supertokens-web-js/recipe/session'

import pages from './constant'
import { storage, storageKey } from '../../utils/storage'

interface SideBarProps {
  isTrigger: boolean
  setIsTrigger: any
}

interface ItemSideBarProps {
  icon: any
  name: string
  isTrigger: boolean
  link?: string
  pathName?: string
}

const ItemSideBar = ({
  icon,
  name,
  isTrigger,
  link,
  pathName,
}: ItemSideBarProps) => (
  <>
    {isTrigger ? (
      <a
        className={`flex gap-x-8 items-center p-2 transition transform hover:text-primary
   duration-100 hover:bg-green-400 rounded-md ${
     pathName === link ? 'bg-green-400' : ''
   }`}
        href="/"
      >
        {icon}
      </a>
    ) : (
      <a
        className={`flex gap-x-8 items-center p-2 transition transform hover:text-primary
   duration-100 hover:bg-green-400 ${
     pathName === link ? 'bg-green-400' : ''
   } rounded-md`}
        href="/"
      >
        {icon}
        <p className="font-thin">{name}</p>
      </a>
    )}
  </>
)

const SideBar: FC<SideBarProps> = ({ isTrigger, setIsTrigger }) => {
  const location = useLocation()
  const isTabletOrMobile = useMediaQuery({ query: '(max-width: 1224px)' })

  useEffect(() => {
    setIsTrigger(() => isTabletOrMobile)
  }, [isTabletOrMobile, setIsTrigger])

  const logoutHandler = async () => {
    try {
      await Session.signOut()
      storage.removeToken(storageKey.PC_ACCESS_TOKEN)
      storage.removeToken(storageKey.QBQ_ACCESS_TOKEN)

      // Redirect the user to the login page or reload the page to update the authentication status
      window.location.reload()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <aside
      className={`fixed h-screen left-0 top-0 z-40 w-0 transform transition-width ease-in duration-300 ${
        isTrigger ? 'w-24' : 'sm:w-64'
      }`}
    >
      <div className="h-full bg-primary shadow-md sm:flex flex-col gap-4">
        <div
          className={`hidden absolute -right-4 top-10 bg-green-400 rounded-lg -z-10 h-8 w-8 items-center justify-center cursor-pointer transform transition hover:scale-125 sm:flex ${
            !isTrigger ? '' : 'rotate-180'
          }`}
          onClick={() => setIsTrigger(!isTrigger)}
        >
          <CgArrowLeft className="text-white" size={30} />
        </div>
        <div className="flex p-8 w-full">
          <p className="text-white p-2">
            {!isTrigger ? 'Church Sync Pro' : 'CSP'}
          </p>
        </div>
        <div
          className={` text-white transform transition-all delay-300 duration-200  ${
            isTrigger ? 'px-4 items-center' : 'px-8'
          } flex flex-col gap-8`}
        >
          {/* <div className="flex gap-x-8 items-center bg-green-400 p-2 rounded-md">
            <HiChartPie size={30} />
            <p className="font-semibold">Pie Chart</p>
          </div> */}
          {pages.map((el) => (
            <ItemSideBar
              {...el}
              isTrigger={isTrigger}
              pathName={location.pathname}
              key={el.name}
            />
          ))}
        </div>
        {isTrigger ? (
          <div
            className="mt-auto transition transform duration-100 hover:bg-green-300 hover:text-primary text-white"
            onClick={logoutHandler}
          >
            <a className="flex gap-x-8  p-8 items-center" href="/">
              <HiOutlineLogout size={30} />
            </a>
          </div>
        ) : (
          <div
            className="mt-auto transition transform duration-100 hover:bg-green-300 hover:text-primary text-white"
            onClick={logoutHandler}
          >
            <a className="flex gap-x-8  p-8 items-center" href="/">
              <HiOutlineLogout size={30} />
              <p className="font-thin">Sign Out</p>
            </a>
          </div>
        )}
      </div>
    </aside>
  )
}

export default SideBar
