import {
  HiChartPie,
  HiInbox,
  HiShoppingBag,
  HiViewBoards,
  HiBookmark,
} from "react-icons/hi";

interface PageProps {
  name: string;
  icon: any;
  link: string;
}

const pages: PageProps[] = [
  {
    name: "Dashboard",
    link: "/dashboard",
    icon: <HiChartPie size={30} />,
  },
  {
    name: "Bookmark",
    link: "/bookmark",
    icon: <HiBookmark size={30} />,
  },
  {
    name: "Inbox",
    link: "/inbox",
    icon: <HiInbox size={30} />,
  },
  {
    name: "Board",
    link: "/board",
    icon: <HiViewBoards size={30} />,
  },
  {
    name: "Shop",
    link: "/shop",
    icon: <HiShoppingBag size={30} />,
  },
  {
    name: "Pie",
    link: "/pie",
    icon: <HiChartPie size={30} />,
  },
];

export default pages;
