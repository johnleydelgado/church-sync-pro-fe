import { mainRoute } from '@/common/constant/route'
import { HiBookmark, HiHome } from 'react-icons/hi'

import { MdManageAccounts } from 'react-icons/md'
import { BiSync, BiTransfer } from 'react-icons/bi'
import { AiOutlineCloudSync } from 'react-icons/ai'
import { FiSettings } from 'react-icons/fi'
import {
  authGuardHaveToken,
  authGuardHaveSettings,
} from '@/common/utils/routeGuards'

interface PageProps {
  name: string
  icon: any
  link: string
  isHide?: boolean
  withDropdown?: boolean
  dropdownLinks?: DropdownLink[]
}

export interface DropdownLink {
  name: string
  link: string
}

export const dropdownArrLinkAutomation: DropdownLink[] = [
  {
    name: 'Mapping',
    link: mainRoute.AUTOMATION_MAPPING,
  },
]

const pages: PageProps[] = [
  {
    name: 'Home',
    link: '/home',
    icon: <HiHome size={30} />,
  },
  {
    name: 'Transaction',
    link: '/transaction',
    icon: <BiSync size={30} />,
  },
  {
    name: 'Automation',
    link: '/automation',
    icon: <AiOutlineCloudSync size={30} />,
    withDropdown: true,
    dropdownLinks: dropdownArrLinkAutomation,
  },
  {
    name: 'Settings',
    link: '/settings',
    icon: <FiSettings size={30} />,
  },
]

export default pages
