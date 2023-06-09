/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { FC, useEffect, useState } from 'react'
import { CgArrowLeft, CgChevronDoubleDown } from 'react-icons/cg'
import { HiOutlineLogout } from 'react-icons/hi'
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
import { BiChevronDown, BiChevronUp } from 'react-icons/bi'
import { useQuery } from 'react-query'
import {
  bookkeeperList,
  getTokenList,
  updateUserToken,
} from '@/common/api/user'
import { isEmpty } from 'lodash'
import { failNotification } from '@/common/utils/toast'
import useLogoutHandler from '@/common/hooks/useLogoutHandler'

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
   duration-100 hover:bg-green-400 rounded-md ${
     pathName?.includes(link || '') ? 'bg-green-400' : ''
   }`}
        href="/"
      >
        {icon}
      </a>
    ) : (
      <a
        className={`flex gap-x-8 items-center px-4 py-2 transition transform hover:text-primary
   duration-100 hover:bg-green-400 ${
     pathName?.includes(link || '') ? 'bg-green-400' : ''
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
  const { email, id, role } = useSelector((item: RootState) => item.common.user)
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
      <div className="h-full bg-primary shadow-md sm:flex flex-col gap-4">
        <div
          className={`hidden absolute -right-4 top-10 bg-green-400 rounded-lg -z-10 h-8 w-8 items-center justify-center cursor-pointer transform transition hover:scale-125 sm:flex ${
            !isTrigger ? '' : 'rotate-180'
          }`}
          onClick={() => setIsTrigger(!isTrigger)}
        >
          <CgArrowLeft className="text-white" size={30} />
        </div>
        <div className="flex pt-8 px-8 w-full">
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
          <button
            className="mt-auto transition transform duration-100 hover:bg-green-300 hover:text-primary text-white"
            onClick={handleLogout}
          >
            <div className="flex gap-x-8  p-8 items-center">
              <HiOutlineLogout size={30} />
            </div>
          </button>
        ) : (
          <button
            className="mt-auto transition transform duration-100 hover:bg-green-300 hover:text-primary text-white"
            onClick={handleLogout}
          >
            <div className="flex gap-x-8  p-8 items-center">
              <HiOutlineLogout size={30} />
              <p className="font-thin">Sign Out</p>
            </div>
          </button>
        )}
      </div>
    </aside>
  )
}

export default SideBar
