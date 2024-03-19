/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { FC, ReactNode, useEffect, useState } from 'react'
import { CgArrowLeft, CgChevronDoubleDown } from 'react-icons/cg'
import { HiOutlineLogout, HiOutlineUserCircle } from 'react-icons/hi'
import { useMediaQuery } from 'react-responsive'
import { useLocation } from 'react-router'
import Session from 'supertokens-web-js/recipe/session'
import { FaChevronDown, FaChevronUp, FaTimes } from 'react-icons/fa'
import pages, { DropdownLink } from './constant'
import { storage, storageKey } from '@/common/utils/storage'
import { useDispatch } from 'react-redux'
import {
  OPEN_MODAL,
  resetUserData,
  setBookkeeper,
  setIsQuickStartHide,
  setReTriggerIsUserTokens,
  setUserData,
} from '@/redux/common'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import Dropdown, { components } from 'react-select'
import { Avatar, Button, IconButton } from '@material-tailwind/react'
import { BiHelpCircle } from 'react-icons/bi'
import { useQuery } from 'react-query'
import {
  bookkeeperList,
  getTokenList,
  updateUserToken,
} from '@/common/api/user'
import { isEmpty } from 'lodash'
import { failNotification } from '@/common/utils/toast'
import useLogoutHandler from '@/common/hooks/useLogoutHandler'
import {
  capitalAtFirstLetter,
  getFirstCharCapital,
} from '@/common/utils/helper'
import { Link } from 'react-router-dom'
import { mainRoute } from '@/common/constant/route'
import { IoMdImages } from 'react-icons/io'
import { MODALS_NAME } from '@/common/constant/modal'
import HideQuickGuideModal from '../modal/HideQuickGuideModal'

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
  role?: string
}

interface Token {
  id?: number
  userId: number
  tokenEntityId: number
  token_type: 'stripe' | 'qbo' | 'pco' | string
  access_token: string | null
  refresh_token: string | null
  realm_id: string | null
  isSelected: boolean
  organization_name: string | null
}

interface AccountTokenDataProps {
  id: number
  isEnabled: false
  email: string
  tokens: Token[]
  createAt?: string
  updatedAt?: string
}

const Input = (props: any) => (
  <components.Input
    {...props}
    inputClassName="outline-none border-none shadow-none focus:ring-transparent"
  />
)

export const customStyles = {
  control: (base: any, state: any) => ({
    ...base,
    background: '#D1FAE580',
    // match with the menu
    borderRadius: 0,
    // Overwrittes the different states of border
    borderColor: state.isFocused ? '' : '#D1FAE580',
    // Removes weird border around container
    boxShadow: state.isFocused ? null : null,
    '&:hover': {
      // Overwrittes the different states of border
      borderColor: state.isFocused ? '' : '#D1FAE580',
    },
  }),
  valueContainer: (base: any) => ({
    ...base,
    // paddingLeft: 32,
  }),
  menu: (base: any) => ({
    ...base,
    // override border radius to match the box
    borderRadius: 0,
    // kill the gap
    marginTop: 0,
    backgroundColor: '#D1FAE5',
  }),
  menuList: (base: any, state: any) => ({
    ...base,
    backgroundColor: '#D1FAE5',
    // kill the white space on first and last option
    padding: 0,
  }),
  singleValue: (base: any, state: any) => ({
    ...base,
    color: 'white',
  }),
  placeholder: (base: any) => ({
    ...base,
    paddingLeft: 32,
  }),
}

function Accordion({
  title,
  icon,
  dropdownLinks,
  isTrigger,
  role,
}: {
  title: string
  icon: ReactNode
  dropdownLinks?: { name: string; link: string; childrenIcon?: any }[]
  isTrigger: boolean
  role?: string
}) {
  const route = useLocation()
  const [expanded, setExpanded] = useState(
    route.pathname.includes(title.toLocaleLowerCase()),
  ) // auto expand if the route contains a hardware or software string

  const toggleExpanded = () => setExpanded((current) => !current)

  return (
    <div className="flex flex-wrap pl-4">
      {isTrigger ? null : (
        <div
          className="flex flex-1 cursor-pointer items-center"
          onClick={toggleExpanded}
        >
          {icon}
          <p className="pl-8 text-slate-500">{title}</p>
          <div className="flex flex-1 justify-end">
            {expanded ? (
              <FaChevronUp size={12} color="white" className="ml-2" />
            ) : (
              <FaChevronDown size={12} color="white" className="ml-2" />
            )}
          </div>
        </div>
      )}

      <div
        className={`items-left flex w-full flex-col overflow-hidden pl-6 transition-[max-height] duration-300 ease-out ${
          expanded ? '' : 'max-h-0'
        }`}
      >
        {!dropdownLinks || isEmpty(dropdownLinks)
          ? null
          : dropdownLinks.map((item) => {
              if (role === 'bookkeeper' && item.name === 'Bookkeeper') {
                return null
              }

              return (
                <Link to={`${item.link}`} className="block" key={item.name}>
                  <div
                    className={`mt-4 gap-4 flex hover:bg-[#FFC107]  cursor-pointer rounded-md text-left text-slate-400 p-2 items-center ${
                      route.pathname === item.link ? 'bg-[#FFC107]' : ''
                    } ${isTrigger ? 'mr-8' : ''}`}
                  >
                    {item.childrenIcon || null}
                    {isTrigger ? null : (
                      <Link
                        to={`${item.link}`} //ex. hardware/all
                      >
                        {item.name}
                      </Link>
                    )}
                  </div>
                </Link>
              )
            })}
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
  role,
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
          role={role}
        />
      ) : isHide ? null : isTrigger ? (
        <a
          className={`flex gap-x-8 items-center p-2 transition transform hover:text-primary
       duration-100 hover:bg-[#FFC107] rounded-md ${
         pathName?.includes(link || '') ? 'bg-[#FFC107]' : ''
       }`}
          href={link}
        >
          {icon}
        </a>
      ) : link === mainRoute.QUICK_START_QUIDE ? (
        <a
          className={`flex gap-x-8 items-center px-4 py-2 transition transform hover:text-primary
   duration-100 hover:bg-[#FFC107] ${
     pathName?.includes(link || '') ? 'bg-[#FFC107]' : ''
   } rounded-md`}
          href={link}
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
              <FaTimes size={18} />
            </IconButton>
          )}
        </a>
      ) : (
        <a
          className={`flex gap-x-8 items-center px-4 py-2 transition transform hover:text-primary
       duration-100 hover:bg-[#FFC107] ${
         pathName?.includes(link || '') ? 'bg-[#FFC107]' : ''
       } rounded-md`}
          href={link}
        >
          {icon}
          <p className="font-normal">{name}</p>
        </a>
      )}
    </>
  )
}

const SideBar: FC<SideBarProps> = ({ isTrigger, setIsTrigger }) => {
  const location = useLocation()
  const isTabletOrMobile = useMediaQuery({ query: '(max-width: 767px)' })
  const [organizationList, setOrginazationList] = useState([
    { value: '', label: '' },
  ])

  const userData = useSelector((item: RootState) => item.common.user)
  const { id, role, img_url, churchName } = useSelector(
    (item: RootState) => item.common.user,
  )
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const isQuickStartHide = useSelector(
    (state: RootState) => state.common.isQuickStartHide,
  )

  const reTriggerIsUserTokens = useSelector(
    (item: RootState) => item.common.reTriggerIsUserTokens,
  )

  const { isShowSettings, isShowTransaction } = useSelector(
    (state: RootState) => state.common,
  )

  const dispatch = useDispatch()
  const { data, refetch } = useQuery(
    ['bookkeeperListSidebar', role],
    async () => {
      if (id && role === 'bookkeeper') {
        const res = await bookkeeperList({ bookkeeperId: id })
        return res.data
      }
    },
    { staleTime: Infinity },
  )
  // useEffect(() => {
  //   setIsTrigger(() => isTabletOrMobile)
  // }, [isTabletOrMobile, setIsTrigger])

  const logoutHandler = useLogoutHandler()

  const handleLogout = () => {
    logoutHandler()
  }

  const selectOrganizationHandler = async (val: string, churchName: string) => {
    const filterData = data.find((a: any) => String(a.Client.email) === val)
    if (bookkeeper)
      dispatch(
        setBookkeeper({
          ...bookkeeper,
          clientEmail: val,
          role: 'bookkeeper',
          churchName,
          ...(filterData && { clientId: filterData.clientId }),
        }),
      )
  }

  useEffect(() => {
    if (!isEmpty(data)) {
      const temp = data?.map((a: any) => {
        return {
          value: String(a.Client.email) || '',
          label: a.Client.churchName,
          clientId: a.Client.id,
          bookkeeperIntegrationAccessEnabled:
            a.bookkeeperIntegrationAccessEnabled,
        }
      })

      if (!isEmpty(temp)) {
        setOrginazationList(temp || [])
        if (!bookkeeper?.churchName) {
          dispatch(
            setBookkeeper({
              clientEmail: temp[0].value,
              churchName: temp[0].label,
              clientId: temp[0].clientId,
              bookkeeperIntegrationAccessEnabled:
                temp[0].bookkeeperIntegrationAccessEnabled,
            }),
          )
        }
      }
    }
  }, [data])

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
          <div className="min-h-screen h-full bg-primary sm:flex flex-col gap-2 sidebar">
            <div
              className={`hidden absolute top-10 right-0 bg-[#FFC107] rounded-lg h-8 w-8 items-center justify-center cursor-pointer transform transition translate-x-[50%] hover:scale-125 sm:flex ${
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

            {!isTrigger ? (
              <div className="flex gap-2 items-center px-8 w-full">
                {img_url ? (
                  <Avatar src={img_url} size="lg" className="mb-4" />
                ) : (
                  <HiOutlineUserCircle size={32} color="white" />
                )}
                <p className="text-white p-2">
                  {role === 'bookkeeper'
                    ? bookkeeper?.churchName
                    : churchName?.toUpperCase() || 'Church Name'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 items-center pt-8 w-full">
                {img_url ? (
                  <Avatar src={img_url} size="lg" />
                ) : (
                  <HiOutlineUserCircle size={32} color="white" />
                )}
                <p className="text-white p-2">
                  {getFirstCharCapital(
                    role === 'bookkeeper'
                      ? bookkeeper?.churchName
                      : churchName?.toUpperCase() || 'Church Name',
                  )}
                </p>
              </div>
            )}

            {!isTrigger ? (
              <div className="flex gap-2 items-center px-8 pb-8 pl-14">
                <div className="rounded-lg bg-green-400 p-2 w-2 h-2" />
                <p className="text-white text-xs">
                  {role === 'client'
                    ? 'Client`s account'
                    : 'Bookkeeper account'}
                </p>
              </div>
            ) : null}

            {!isEmpty(data) ? (
              <div className="flex flex-col items-center w-full gap-4 pb-8">
                <Dropdown
                  options={organizationList}
                  components={{ Input }}
                  placeholder="Search...."
                  className="w-full"
                  onChange={(val) => {
                    if (typeof val === 'object' && val !== null) {
                      selectOrganizationHandler(
                        val.value || '',
                        val.label || '',
                      )
                    }
                  }}
                  styles={customStyles}
                  defaultValue={
                    bookkeeper?.clientEmail
                      ? {
                          value: bookkeeper?.clientEmail,
                          label: bookkeeper?.churchName,
                        }
                      : organizationList[0]
                  }
                />
              </div>
            ) : null}

            <div
              className={` text-white transform transition-all delay-300 duration-200  ${
                isTrigger ? 'px-4 items-center' : 'px-8'
              } flex flex-col gap-8`}
            >
              {pages.map((el) => (
                <ItemSideBar
                  {...el}
                  isTrigger={isTrigger}
                  pathName={location.pathname}
                  key={el.name}
                  isHide={
                    (el.name === 'Bookkeepers' &&
                      userData.role === 'bookkeeper') ||
                    (isQuickStartHide && el.link === '/quick-start-guide')
                  }
                  role={role}
                />
              ))}
            </div>
            {isTrigger ? (
              <div className="flex flex-col">
                <Link
                  to={mainRoute.ASK_US}
                  className={`mt-auto transition transform duration-100 hover:bg-[#FFC107] hover:text-primary text-white bg-[${
                    location.pathname === '/ask-us' ? '#FFC107' : ''
                  }]`}
                >
                  <div className="flex gap-x-8  p-8 items-center">
                    <BiHelpCircle
                      size={30}
                      className="group-hover:text-white"
                    />
                  </div>
                </Link>
                <button
                  className="mt-auto transition transform duration-100 hover:bg-[#FFC107] hover:text-primary text-white"
                  onClick={handleLogout}
                >
                  <div className="flex gap-x-8  p-8 items-center">
                    <HiOutlineLogout
                      size={30}
                      className="group-hover:text-white"
                    />
                  </div>
                </button>
              </div>
            ) : (
              <div className="flex flex-col justify-end h-full">
                <Link
                  to={mainRoute.ASK_US}
                  className={`group transition transform duration-100 hover:bg-[#FFC107] hover:text-primary text-white bg-[${
                    location.pathname === '/ask-us' ? '#FFC107' : ''
                  }]`}
                >
                  <div className="flex gap-x-8  p-8 py-4 items-center">
                    <BiHelpCircle
                      size={30}
                      className="group-hover:text-white"
                    />
                    <p className="font-normal group-hover:text-white">Ask Us</p>
                  </div>
                </Link>
                <button
                  className="group transition transform duration-100 hover:bg-[#FFC107] hover:text-primary text-white"
                  onClick={handleLogout}
                >
                  <div className="flex gap-x-8  p-8 py-4 pb-8 items-center">
                    <HiOutlineLogout
                      size={30}
                      className="group-hover:text-white"
                    />
                    <p className="font-normal group-hover:text-white">
                      Log-out
                    </p>
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
