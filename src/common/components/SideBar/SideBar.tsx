/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { FC, useEffect, useState } from 'react'
import { CgArrowLeft, CgChevronDoubleDown } from 'react-icons/cg'
import { HiOutlineLogout, HiOutlineUserCircle } from 'react-icons/hi'
import { useMediaQuery } from 'react-responsive'
import { useLocation } from 'react-router'
import Session from 'supertokens-web-js/recipe/session'

import pages from './constant'
import { storage, storageKey } from '@/common/utils/storage'
import { useDispatch } from 'react-redux'
import {
  resetUserData,
  setBookkeeper,
  setReTriggerIsUserTokens,
  setUserData,
} from '@/redux/common'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import Dropdown, { components } from 'react-select'
import { Button } from '@material-tailwind/react'
import {
  BiChevronDown,
  BiChevronUp,
  BiHelpCircle,
  BiUser,
} from 'react-icons/bi'
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

const ItemSideBar = ({
  icon,
  name,
  isTrigger,
  link,
  pathName,
  isHide,
}: ItemSideBarProps) => (
  <>
    {isHide ? null : isTrigger ? (
      <a
        className={`flex gap-x-8 items-center p-2 transition transform hover:text-primary
   duration-100 hover:bg-[#FFC107] rounded-md ${
     pathName?.includes(link || '') ? 'bg-[#FFC107]' : ''
   }`}
        href="/"
      >
        {icon}
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

const SideBar: FC<SideBarProps> = ({ isTrigger, setIsTrigger }) => {
  const location = useLocation()
  const isTabletOrMobile = useMediaQuery({ query: '(max-width: 1224px)' })
  const [organizationList, setOrginazationList] = useState([
    { value: '', label: '' },
  ])
  const [showDropdownOrg, setShowDropdownOrg] = useState<boolean>(false)

  const userData = useSelector((item: RootState) => item.common.user)
  const { id, role, firstName, lastName } = useSelector(
    (item: RootState) => item.common.user,
  )
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)

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

  useEffect(() => {
    setIsTrigger(() => isTabletOrMobile)
  }, [isTabletOrMobile, setIsTrigger])

  const logoutHandler = useLogoutHandler()

  const handleLogout = () => {
    logoutHandler()
  }

  const selectOrganizationHandler = async (val: string, churchName: string) => {
    dispatch(setBookkeeper({ clientEmail: val, churchName }))
  }

  useEffect(() => {
    if (!isEmpty(data)) {
      const temp = data?.map((a: any) => {
        return {
          value: String(a.Client.email) || '',
          label: a.Client.churchName,
        }
      })

      if (!isEmpty(temp)) {
        setOrginazationList(temp || [])
        if (!bookkeeper?.churchName) {
          dispatch(
            setBookkeeper({
              clientEmail: temp[0].value,
              churchName: temp[0].label,
            }),
          )
        }
      }
    }
  }, [data])

  return (
    <aside
      className={`fixed h-screen left-0 top-0 z-40 w-0 transform transition-width ease-in duration-300 ${
        isTrigger ? 'w-24' : 'sm:w-64'
      }`}
    >
      <div className="h-full bg-primary shadow-md sm:flex flex-col gap-2">
        <div
          className={`hidden absolute -right-4 top-10 bg-[#FFC107] rounded-lg -z-10 h-8 w-8 items-center justify-center cursor-pointer transform transition hover:scale-125 sm:flex ${
            !isTrigger ? '' : 'rotate-180'
          }`}
          onClick={() => setIsTrigger(!isTrigger)}
        >
          <CgArrowLeft className="text-white" size={30} />
        </div>

        {!isTrigger ? (
          <div className="flex gap-2 items-center pt-8 px-8 w-full">
            <HiOutlineUserCircle size={32} color="white" />
            <p className="text-white p-2">
              {capitalAtFirstLetter(firstName) +
                ' ' +
                capitalAtFirstLetter(lastName)}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 items-center pt-8 w-full">
            <HiOutlineUserCircle size={32} color="white" />
            <p className="text-white p-2">
              {getFirstCharCapital(firstName) +
                ' ' +
                getFirstCharCapital(lastName)}
            </p>
          </div>
        )}

        {!isTrigger ? (
          <div className="flex gap-2 items-center px-8 pl-14">
            <div className="rounded-lg bg-green-400 p-2 w-2 h-2" />
            <p className="text-white text-xs">
              {role === 'client' ? 'Client`s account' : 'Bookkeeper account'}
            </p>
          </div>
        ) : null}

        <div className="flex px-8 w-full py-4 items-center">
          <p className="text-white p-2">
            {!isTrigger ? 'Church Sync Pro' : 'CSP'}
          </p>
        </div>
        {!isEmpty(data) ? (
          <div className="flex flex-col items-center w-full gap-4 pb-8">
            <Button
              className="bg-green-300 bg-opacity-50 w-full rounded-none text-start flex items-center gap-2 justify-between"
              onClick={() => setShowDropdownOrg(!showDropdownOrg)}
            >
              {bookkeeper?.churchName}
              {showDropdownOrg ? (
                <BiChevronUp size={24} />
              ) : (
                <BiChevronDown size={24} />
              )}
            </Button>
            {showDropdownOrg ? (
              <Dropdown
                options={organizationList}
                components={{ Input }}
                placeholder="Search...."
                onChange={(val) => {
                  if (typeof val === 'object' && val !== null) {
                    selectOrganizationHandler(val.value || '', val.label || '')
                  }
                }}
                defaultValue={
                  bookkeeper?.clientEmail
                    ? {
                        value: bookkeeper?.clientEmail,
                        label: bookkeeper?.churchName,
                      }
                    : organizationList[0]
                }
                className="w-11/12"
              />
            ) : null}
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
                el.name === 'Bookkeepers' && userData.role === 'bookkeeper'
              }
            />
          ))}
        </div>
        {isTrigger ? (
          <div className="flex flex-col">
            <button className="mt-auto transition transform duration-100 hover:bg-[#FFC107] hover:text-primary text-white">
              <div className="flex gap-x-8  p-8 items-center">
                <BiHelpCircle size={30} className="group-hover:text-white" />
              </div>
            </button>
            <button
              className="mt-auto transition transform duration-100 hover:bg-[#FFC107] hover:text-primary text-white"
              onClick={handleLogout}
            >
              <div className="flex gap-x-8  p-8 items-center">
                <HiOutlineLogout size={30} className="group-hover:text-white" />
              </div>
            </button>
          </div>
        ) : (
          <div className="flex flex-col justify-end h-full ">
            <button className="group transition transform duration-100 hover:bg-[#FFC107] hover:text-primary text-white">
              <div className="flex gap-x-8  p-8 items-center">
                <BiHelpCircle size={30} className="group-hover:text-white" />
                <p className="font-normal group-hover:text-white">Ask Us</p>
              </div>
            </button>
            <button
              className="group transition transform duration-100 hover:bg-[#FFC107] hover:text-primary text-white"
              onClick={handleLogout}
            >
              <div className="flex gap-x-8  p-8 items-center">
                <HiOutlineLogout size={30} className="group-hover:text-white" />
                <p className="font-normal group-hover:text-white">Log-out</p>
              </div>
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

export default SideBar
