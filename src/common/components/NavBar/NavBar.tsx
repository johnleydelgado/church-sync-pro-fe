import { bookkeeperList } from '@/common/api/user'
import useLogoutHandler from '@/common/hooks/useLogoutHandler'
import { capitalAtFirstLetter } from '@/common/utils/helper'
import { setBookkeeper } from '@/redux/common'
import { RootState } from '@/redux/store'
import { Drawer, IconButton, Navbar } from '@material-tailwind/react'
import { isEmpty } from 'lodash'
import React, { FC, ReactNode, useEffect, useState } from 'react'
import { HiOutlineLogout, HiOutlineUserCircle } from 'react-icons/hi'
import { useQuery } from 'react-query'
import { useDispatch } from 'react-redux'
import { useSelector } from 'react-redux'
import { useMediaQuery } from 'react-responsive'
import { Link, useLocation } from 'react-router-dom'
import Dropdown, { components } from 'react-select'
import { customStyles } from '../SideBar/SideBar'
import { mainRoute } from '@/common/constant/route'
import { BiHelpCircle, BiSortDown } from 'react-icons/bi'
import { FaChevronDown, FaChevronUp, FaTimes } from 'react-icons/fa'
import pages, { DropdownLink } from '../SideBar/constant'
import colors from '@/common/constant/colors'
interface NavBarProps {}

const Input = (props: any) => (
  <components.Input
    {...props}
    inputClassName="outline-none border-none shadow-none focus:ring-transparent"
  />
)

interface ItemSideBarProps {
  icon: any
  name: string
  link?: string
  pathName?: string
  isHide?: boolean
  withDropdown?: boolean
  dropdownLinks?: DropdownLink[]
}

function Accordion({
  title,
  icon,
  dropdownLinks,
}: {
  title: string
  icon: ReactNode
  dropdownLinks?: { name: string; link: string }[]
}) {
  const route = useLocation()
  const [expanded, setExpanded] = useState(
    route.pathname.includes(title.toLocaleLowerCase()),
  ) // auto expand if the route contains a hardware or software string

  const toggleExpanded = () => setExpanded((current) => !current)

  return (
    <div className="flex flex-wrap pl-4">
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

      <div
        className={`items-left flex w-full flex-col overflow-hidden pl-6 transition-[max-height] duration-300 ease-out ${
          expanded ? '' : 'max-h-0'
        }`}
      >
        {!dropdownLinks || isEmpty(dropdownLinks)
          ? null
          : dropdownLinks.map((item) => (
              <div
                key={item.name}
                className={`mt-4 gap-4 flex cursor-pointer rounded-md text-left text-slate-400 p-2 items-center ${
                  route.pathname === item.link ? 'bg-secondaryYellow' : ''
                }`}
              >
                {item.name === 'Mapping' ? (
                  <BiSortDown size={22} className="ml-2" />
                ) : null}
                <Link
                  to={`${item.link}`} //ex. hardware/all
                >
                  {item.name}
                </Link>
              </div>
            ))}
      </div>
    </div>
  )
}

const ItemSideBar = ({
  icon,
  name,
  link,
  pathName,
  isHide,
  withDropdown,
  dropdownLinks,
}: ItemSideBarProps) => (
  <>
    {withDropdown ? (
      <Accordion title={name} icon={icon} dropdownLinks={dropdownLinks} />
    ) : isHide ? null : (
      <a
        className={`flex gap-x-8 items-center px-4 py-2 transition transform hover:text-primary
       duration-100 hover:bg-secondaryYellow ${
         pathName?.includes(link || '') ? 'bg-secondaryYellow' : ''
       } rounded-md`}
        href={link}
      >
        {icon}
        <p className="font-normal">{name}</p>
      </a>
    )}
  </>
)

const NavBar: FC<NavBarProps> = () => {
  const isTabletOrMobile = useMediaQuery({ query: '(max-width: 767px)' })
  const dispatch = useDispatch()
  const [openNav, setOpenNav] = useState(false)
  const { id, role, firstName, lastName } = useSelector(
    (item: RootState) => item.common.user,
  )
  const userData = useSelector((item: RootState) => item.common.user)

  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)

  const { data } = useQuery(
    ['bookkeeperListSidebar', role],
    async () => {
      if (id && role === 'bookkeeper') {
        const res = await bookkeeperList({ bookkeeperId: id })
        return res.data
      }
    },
    { staleTime: Infinity },
  )
  const [organizationList, setOrginazationList] = useState([
    { value: '', label: '' },
  ])
  const logoutHandler = useLogoutHandler()

  const handleLogout = () => {
    logoutHandler()
  }

  const selectOrganizationHandler = async (val: string, churchName: string) => {
    if (bookkeeper)
      dispatch(setBookkeeper({ ...bookkeeper, clientEmail: val, churchName }))
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
    <React.Fragment>
      <Navbar
        className={`sticky top-0 z-10 ${
          isTabletOrMobile ? 'h-max' : 'h-10'
        } max-w-full rounded-none py-2 px-4 lg:px-8 lg:py-4 mb-2 shadow-none`}
      >
        <IconButton
          variant="text"
          className="ml-auto h-6 w-6 text-inherit hover:bg-transparent focus:bg-transparent active:bg-transparent lg:hidden text-black"
          ripple={false}
          onClick={() => setOpenNav(!openNav)}
        >
          {openNav ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              className="h-6 w-6"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </IconButton>
      </Navbar>

      <Drawer open={openNav} onClose={() => console.log('')}>
        <div className="h-full bg-primary shadow-md flex flex-col gap-2 overflow-y-auto">
          <div className={`flex px-8 w-full pt-2 items-center justify-between`}>
            <p className="text-white p-2 text-xl">Church Sync Pro</p>
            <IconButton
              className="text-white bg-transparent"
              onClick={() => setOpenNav(false)}
            >
              <FaTimes size={22} />
            </IconButton>
          </div>

          <div className="flex gap-2 items-center px-8 w-full">
            <HiOutlineUserCircle size={32} color="white" />
            <p className="text-white p-2">
              {capitalAtFirstLetter(firstName) +
                ' ' +
                capitalAtFirstLetter(lastName)}
            </p>
          </div>

          <div className="flex gap-2 items-center px-8 pb-8 pl-14">
            <div className="rounded-lg bg-green-400 p-2 w-2 h-2" />
            <p className="text-white text-xs">
              {role === 'client' ? 'Client`s account' : 'Bookkeeper account'}
            </p>
          </div>

          {!isEmpty(data) ? (
            <div className="flex flex-col items-center w-full gap-4 pb-8">
              <Dropdown
                options={organizationList}
                components={{ Input }}
                placeholder="Search...."
                className="w-full"
                onChange={(val) => {
                  if (typeof val === 'object' && val !== null) {
                    selectOrganizationHandler(val.value || '', val.label || '')
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
            className={`text-white transform transition-all delay-300 duration-200 px-8 flex flex-col gap-8`}
          >
            {pages.map((el) => (
              <ItemSideBar
                {...el}
                pathName={location.pathname}
                key={el.name}
                isHide={
                  el.name === 'Bookkeepers' && userData.role === 'bookkeeper'
                }
              />
            ))}
          </div>
          <div className="flex flex-col justify-end h-full">
            <Link
              to={mainRoute.ASK_US}
              className={`group transition transform duration-100 hover:bg-secondaryYellow hover:text-primary text-white bg-[${
                location.pathname === '/ask-us' ? colors.secondaryYellow : ''
              }]`}
            >
              <div className="flex gap-x-8  p-8 items-center">
                <BiHelpCircle size={30} className="group-hover:text-white" />
                <p className="font-normal group-hover:text-white">Ask Us</p>
              </div>
            </Link>
            <button
              className="group transition transform duration-100 hover:bg-secondaryYellow hover:text-primary text-white"
              onClick={handleLogout}
            >
              <div className="flex gap-x-8  p-8 items-center">
                <HiOutlineLogout size={30} className="group-hover:text-white" />
                <p className="font-normal group-hover:text-white">Log-out</p>
              </div>
            </button>
          </div>
        </div>
      </Drawer>
    </React.Fragment>
  )
}

export default NavBar
