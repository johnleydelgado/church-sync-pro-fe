import { mainRoute, routeSettings } from '@/common/constant/route'
import { MyChurch } from '@/common/api/church'
import { HiBookmark, HiHome } from 'react-icons/hi'

import {
  MdAccountCircle,
  MdChecklist,
  MdIntegrationInstructions,
  MdManageAccounts,
} from 'react-icons/md'
import {
  BiArchive,
  BiCalendarCheck,
  BiCreditCard,
  BiSortDown,
  BiSync,
  BiTransfer,
} from 'react-icons/bi'
import { AiFillProject, AiOutlineCloudSync, AiFillMail } from 'react-icons/ai'
import { FiSettings, FiUsers } from 'react-icons/fi'
import { HiOutlineDocumentText } from 'react-icons/hi'
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
  /** Shown only when this is true for the selected church; the page behind it hides itself too. */
  visible?: (church: MyChurch | null) => boolean
}

const withChurch = (church: MyChurch | null) => !!church

/** The links of a dropdown that the selected church shows the person. */
export const linksFor = (
  links: DropdownLink[] | undefined,
  church: MyChurch | null,
) => links?.filter((l) => !l.visible || l.visible(church))

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
    // Same rule as the Settings tab: owners, and bookkeepers an owner allowed.
    visible: (church) => !!church?.canConnectIntegrations,
  },
  {
    name: 'People',
    link: `${mainRoute.SETTINGS}?tab=people`,
    childrenIcon: <BsPeopleFill size={22} className="ml-2" />,
    visible: withChurch,
  },
  {
    name: 'Projects',
    link: routeSettings.PROJECTS,
    childrenIcon: <AiFillProject size={22} className="ml-2" />,
    visible: withChurch,
  },
  {
    name: 'Email',
    link: routeSettings.SELECT_RECIPIENT_EMAILS,
    childrenIcon: <AiFillMail size={22} className="ml-2" />,
    visible: withChurch,
  },
]

const pages: PageProps[] = [
  // One job per page: Daily Giving is the daily work (what's posted, what's waiting), Clearing
  // is month-end (the balance and the statement). They used to list the same days twice.
  {
    name: 'Daily Giving',
    link: mainRoute.TRANSACTION,
    icon: <BiCalendarCheck size={30} />,
  },
  {
    name: 'Clearing',
    link: mainRoute.DAILY,
    icon: <HiOutlineDocumentText size={30} />,
  },
  {
    name: 'Quick Start',
    link: mainRoute.QUICK_START_QUIDE,
    icon: <MdChecklist size={30} />,
  },
  {
    name: 'Automation',
    link: '/automation',
    icon: <AiOutlineCloudSync size={30} />,
    withDropdown: true,
    dropdownLinks: dropdownArrLinkAutomation,
  },
  {
    name: 'Churches',
    link: mainRoute.CHURCHES,
    icon: <FiUsers size={30} />,
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
