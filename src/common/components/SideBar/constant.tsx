import {
  HiChartPie,
  HiInbox,
  HiShoppingBag,
  HiViewBoards,
  HiBookmark,
} from 'react-icons/hi'

interface PageProps {
  name: string
  icon: any
  link: string
}

const pages: PageProps[] = [
  {
    name: 'Transaction',
    link: '/transaction',
    icon: <HiViewBoards size={30} />,
  },
  {
    name: 'Client Toggle',
    link: '/client-toggle',
    icon: <HiBookmark size={30} />,
  },
  {
    name: 'Home',
    link: '/home',
    icon: <HiInbox size={30} />,
  },
  {
    name: 'Automation',
    link: '/automation',
    icon: <HiShoppingBag size={30} />,
  },
  {
    name: 'Settings',
    link: '/settings',
    icon: <HiChartPie size={30} />,
  },
]

export default pages
