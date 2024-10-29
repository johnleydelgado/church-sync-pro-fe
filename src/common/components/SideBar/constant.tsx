import { mainRoute, routeSettings } from '@/common/constant/route'
import { HiBookmark, HiHome } from 'react-icons/hi'

import {
  MdAccountCircle,
  MdChecklist,
  MdIntegrationInstructions,
  MdManageAccounts,
} from 'react-icons/md'
import {
  BiArchive,
  BiCreditCard,
  BiSortDown,
  BiSync,
  BiTransfer,
} from 'react-icons/bi'
import { AiFillProject, AiOutlineCloudSync, AiFillMail } from 'react-icons/ai'
import { FiSettings } from 'react-icons/fi'
import {
  authGuardHaveToken,
  authGuardHaveSettings,
} from '@/common/utils/routeGuards'
import { BsPeopleFill, BsProjector, BsProjectorFill } from 'react-icons/bs'

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
  childrenIcon?: any
}

export const dropdownArrLinkAutomation: DropdownLink[] = [
  {
    name: 'Mapping',
    link: mainRoute.AUTOMATION_MAPPING,
    childrenIcon: <BiSortDown size={22} className="ml-2" />,
  },
  {
    name: 'Archive',
    link: mainRoute.AUTOMATION_ARCHIVE,
    childrenIcon: <BiArchive size={22} className="ml-2" />,
  },
]

export const dropdownArrLinkSettings: DropdownLink[] = [
  {
    name: 'Account',
    link: routeSettings.ACCOUNT_DATA,
    childrenIcon: <MdAccountCircle size={22} className="ml-2" />,
  },
  {
    name: 'Billing',
    link: routeSettings.BILLING_INFO,
    childrenIcon: <BiCreditCard size={22} className="ml-2" />,
  },
  {
    name: 'Integrations',
    link: routeSettings.INTEGRATIONS,
    childrenIcon: <MdIntegrationInstructions size={22} className="ml-2" />,
  },
  {
    name: 'Bookkeeper',
    link: routeSettings.BOOKKEEPER,
    childrenIcon: <BsPeopleFill size={22} className="ml-2" />,
  },
  {
    name: 'Projects',
    link: routeSettings.PROJECTS,
    childrenIcon: <AiFillProject size={22} className="ml-2" />,
  },
  {
    name: 'Email',
    link: routeSettings.SELECT_RECIPIENT_EMAILS,
    childrenIcon: <AiFillMail size={22} className="ml-2" />,
  },
]

const pages: PageProps[] = [
  {
    name: 'Quick Start',
    link: mainRoute.QUICK_START_QUIDE,
    icon: <MdChecklist size={30} />,
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
    withDropdown: true,
    dropdownLinks: dropdownArrLinkSettings,
  },
]

export default pages
