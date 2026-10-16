/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { FC, ReactNode, useState } from 'react'
import { CgArrowLeft } from 'react-icons/cg'
import { HiOutlineLogout } from 'react-icons/hi'
import { useMediaQuery } from 'react-responsive'
import { useLocation } from 'react-router'
import { FaChevronDown, FaChevronUp, FaTimes } from 'react-icons/fa'
import pages, { DropdownLink, linksFor } from './constant'
import { useChurch } from '@/common/hooks/useChurch'
import { useDispatch } from 'react-redux'
import { OPEN_MODAL } from '@/redux/common'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import { IconButton } from '@material-tailwind/react'
import { BiHelpCircle } from 'react-icons/bi'
import { isEmpty } from 'lodash'
import useLogoutHandler from '@/common/hooks/useLogoutHandler'
import { Link } from 'react-router-dom'
import { mainRoute } from '@/common/constant/route'
import { MODALS_NAME } from '@/common/constant/modal'
import HideQuickGuideModal from '../modal/HideQuickGuideModal'
import ChurchSwitcher from '../ChurchSwitcher/ChurchSwitcher'
import PersonBlock from './PersonBlock'

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
  isHide?: boolean
  withDropdown?: boolean
  dropdownLinks?: DropdownLink[]
}

const isRouteActive = (pathName?: string, link?: string) => {
  if (!pathName || !link) return false
  return pathName === link || pathName.startsWith(link + '/')
}

function Accordion({
  title,
  icon,
  dropdownLinks,
  isTrigger,
}: {
  title: string
  icon: ReactNode
  dropdownLinks?: { name: string; link: string; childrenIcon?: any }[]
  isTrigger: boolean
}) {
  const route = useLocation()
  const [expanded, setExpanded] = useState(
    (dropdownLinks || []).some((item) =>
      isRouteActive(route.pathname, item.link),
    ),
  ) // auto expand if the current route matches one of the children

  const toggleExpanded = () => setExpanded((current) => !current)
  return (
    <div className="flex flex-wrap pl-4">
      <div
        className={`flex flex-1 cursor-pointer items-center ${
          isTrigger ? 'px-8' : ''
        }`}
        onClick={toggleExpanded}
      >
        {icon}
        {isTrigger ? null : <p className="pl-4 text-slate-500">{title}</p>}
        <div className="flex flex-1 justify-end pr-3">
          {expanded ? (
            <FaChevronUp size={12} color="white" className="ml-2" />
          ) : (
            <FaChevronDown size={12} color="white" className="ml-2" />
          )}
        </div>
      </div>

      <div
        className={`items-left flex w-full flex-col overflow-hidden pl-6 transition-[max-height] duration-300 ease-out ${
          expanded ? '' : 'max-h-0'
        }`}
      >
        {!dropdownLinks || isEmpty(dropdownLinks)
          ? null
          : dropdownLinks.map((item) => (
              <Link to={`${item.link}`} className="block" key={item.name}>
                <div
                  className={`mt-4 gap-4 flex hover:bg-secondaryYellow  cursor-pointer rounded-md text-left text-slate-400 p-2 items-center ${
                    route.pathname === item.link ? 'bg-secondaryYellow' : ''
                  } ${isTrigger ? 'mr-8' : ''}`}
                >
                  {item.childrenIcon || null}
                  {isTrigger ? null : <span>{item.name}</span>}
                </div>
              </Link>
            ))}
      </div>
    </div>
  )
}

const ItemSideBar = ({
  icon,
  name,
  isTrigger,
  link,
  pathName,
  isHide,
  withDropdown,
  dropdownLinks,
}: ItemSideBarProps) => {
  const dispatch = useDispatch()
  return (
    <>
      {withDropdown ? (
        <Accordion
          title={name}
          icon={icon}
          dropdownLinks={dropdownLinks}
          isTrigger={isTrigger}
        />
      ) : isHide ? null : isTrigger ? (
        <Link
          title={name}
          className={`flex gap-x-4 items-center p-2 transition transform hover:text-primary
       duration-100 hover:bg-secondaryYellow rounded-md ${
         isRouteActive(pathName, link) ? 'bg-secondaryYellow' : ''
       }`}
          to={link || ''}
        >
          {icon}
        </Link>
      ) : link === mainRoute.QUICK_START_QUIDE ? (
        <Link
          className={`flex items-center px-4 py-2 transition transform hover:text-primary
   duration-100 hover:bg-secondaryYellow ${
     isRouteActive(pathName, link)
       ? 'bg-secondaryYellow justify-between'
       : 'gap-x-4'
   } rounded-md`}
          to={link || ''}
        >
          {icon}
          <p className="font-normal">{name}</p>
          {pathName === mainRoute.QUICK_START_QUIDE && (
            <IconButton
              className="bg-transparent text-white shadow-none" // No need for ml-auto here as flex justify-end will take care of it
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                dispatch(OPEN_MODAL(MODALS_NAME.hideQuickGuideModal))
              }}
            >
              <FaTimes size={16} />
            </IconButton>
          )}
        </Link>
      ) : (
        <Link
          className={`flex gap-x-4 items-center px-4 py-2 transition transform hover:text-primary
       duration-100 hover:bg-secondaryYellow ${
         isRouteActive(pathName, link) ? 'bg-secondaryYellow' : ''
       } rounded-md`}
          to={link || ''}
        >
          {icon}
          <p className="font-normal">{name}</p>
        </Link>
      )}
    </>
  )
}

const SideBar: FC<SideBarProps> = ({ isTrigger, setIsTrigger }) => {
  const location = useLocation()
  const { church } = useChurch()
  const isTabletOrMobile = useMediaQuery({ query: '(max-width: 767px)' })
  const isQuickStartHide = useSelector(
    (state: RootState) => state.common.isQuickStartHide,
  )

  // useEffect(() => {
  //   setIsTrigger(() => isTabletOrMobile)
  // }, [isTabletOrMobile, setIsTrigger])

  const logoutHandler = useLogoutHandler()

  const handleLogout = () => {
    logoutHandler()
  }

  return (
    <>
      {isTabletOrMobile ? null : (
        // <aside
        //   className={`fixed h-full left-0 top-0 z-40 w-0 transform transition-width ease-in duration-300 overflow-y-auto ${
        //     isTrigger ? 'w-24' : 'sm:w-64'
        //   }`}
        // >
        <aside
          className={`fixed h-full bg-primary left-0 top-0 z-40 w-0 transform transition-width ease-in duration-300 ${
            isTrigger ? 'w-24' : 'sm:w-64'
          }`}
        >
          <HideQuickGuideModal />
          <div className="min-h-screen h-full bg-primary sm:flex flex-col gap-2 overflow-y-custom">
            <div
              className={`hidden absolute top-10 right-0 bg-secondaryYellow rounded-lg h-8 w-8 items-center justify-center cursor-pointer transform transition translate-x-[50%] hover:scale-125 sm:flex ${
                !isTrigger ? '' : 'rotate-180'
              }`}
              onClick={() => setIsTrigger(!isTrigger)}
            >
              <CgArrowLeft className="text-white" size={30} />
            </div>

            <div
              className={`flex ${
                !isTrigger ? 'px-8' : 'px-5'
              } w-full pt-2 items-center`}
            >
              <p className="text-white p-2 text-xl">
                {!isTrigger ? 'Church Sync Pro' : 'CSP'}
              </p>
            </div>

            {/* Clear of the collapse toggle that sits on the sidebar's edge above it. */}
            <div className={isTrigger ? 'pt-4 pb-6' : 'px-6 pt-4 pb-6'}>
              <ChurchSwitcher variant="sidebar" collapsed={isTrigger} />
            </div>

            <div
              className={` text-white transform transition-all delay-300 duration-200  ${
                isTrigger ? 'px-4 items-center' : 'px-6'
              } flex flex-col gap-8`}
            >
              {pages.map((el) => (
                <ItemSideBar
                  {...el}
                  dropdownLinks={linksFor(el.dropdownLinks, church)}
                  isTrigger={isTrigger}
                  pathName={location.pathname}
                  key={el.name}
                  isHide={isQuickStartHide && el.link === '/quick-start-guide'}
                />
              ))}
            </div>
            {isTrigger ? (
              <div className="flex flex-col">
                <Link
                  to={mainRoute.ASK_US}
                  className={`mt-auto transition transform duration-100 hover:bg-secondaryYellow hover:text-primary text-white ${
                    location.pathname === '/ask-us'
                      ? 'bg-secondaryYellow'
                      : 'bg-transparent'
                  }`}
                >
                  <div className="flex gap-x-8  p-8 items-center">
                    <BiHelpCircle
                      size={30}
                      className="group-hover:text-white"
                    />
                  </div>
                </Link>
                <div className="mx-4 border-t border-white/20" />
                <PersonBlock collapsed />
                <button
                  title="Log-out"
                  className="mt-auto transition transform duration-100 hover:bg-red-500/20 text-red-300 hover:text-red-200"
                  onClick={handleLogout}
                >
                  <div className="flex gap-x-8  p-8 items-center">
                    <HiOutlineLogout size={30} />
                  </div>
                </button>
              </div>
            ) : (
              <div className="flex flex-col justify-end h-full">
                <Link
                  to={mainRoute.ASK_US}
                  className={`group transition transform duration-100 hover:bg-secondaryYellow hover:text-primary text-white ${
                    location.pathname === '/ask-us'
                      ? 'bg-secondaryYellow'
                      : 'bg-transparent'
                  }`}
                >
                  <div className="flex gap-x-8  p-8 py-4 items-center">
                    <BiHelpCircle
                      size={30}
                      className="group-hover:text-white"
                    />
                    <p className="font-normal group-hover:text-white">Ask Us</p>
                  </div>
                </Link>
                <div className="mx-8 border-t border-white/20" />
                <PersonBlock />
                <button
                  className="group transition transform duration-100 hover:bg-red-500/20 text-red-300 hover:text-red-200"
                  onClick={handleLogout}
                >
                  <div className="flex gap-x-8  p-8 py-4 pb-8 items-center">
                    <HiOutlineLogout size={30} />
                    <p className="font-normal">Log-out</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </aside>
      )}
    </>
  )
}

export default SideBar
