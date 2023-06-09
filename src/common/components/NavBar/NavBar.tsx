import { capitalAtFirstLetter } from '@/common/utils/helper'
import { RootState } from '@/redux/store'
import {
  Avatar,
  Button,
  Input,
  Menu,
  MenuHandler,
  MenuItem,
  MenuList,
  Typography,
} from '@material-tailwind/react'
import { FC } from 'react'
import { CgProfile } from 'react-icons/cg'
import { MdPerson3 } from 'react-icons/md'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
interface NavBarProps {}

const NavBar: FC<NavBarProps> = () => {
  const { churchName, firstName, lastName } = useSelector(
    (state: RootState) => state.common.user,
  )
  return (
    <nav className="bg-white relative left-0 top-0 right-0 px-2 py-2.5 sm:px-8 flex-shrink h-24">
      <div className="mx-auto flex flex-wrap">
        <div className="flex justify-end w-full">
          <div className="bg-bg-slate-400 flex shadow-md p-4 rounded-2xl items-center justify-center gap-2">
            <div className="rounded-full p-2 bg-gray-400 text-white">
              <MdPerson3 />
            </div>
            <p className="font-normal text-black">
              {capitalAtFirstLetter(firstName)} {capitalAtFirstLetter(lastName)}
            </p>
            {/* <Input
              className="w-full"
              placeholder="Search...."
              variant="outlined"
            /> */}
          </div>
        </div>
      </div>
      {/* <div className="mx-auto flex flex-wrap justify-end"> */}
      {/* <div className="cursor-pointer hover:bg-slate-200 rounded-md p-4 group">
          <CgMenuLeft className="transform scale-150 sm:scale-0 transition duration-500 group-hover:scale-125" />
        </div> */}
      {/* <div className="flex text-md lg:text-base gap-2 lg:gap-16 h-12 w-64 h-full justify-end">
          <Link to="/" className="group">
            <p>Home</p>
            <div className="bg-primary mt-2 ease-in  scale-0 transform h-px  transition  duration-200 group-hover:scale-125" />
          </Link>
          <Link to="/" className="group">
            <p>Automation</p>
            <div className="bg-primary mt-2 ease-in  scale-0 transform h-px  transition  duration-200 group-hover:scale-125" />
          </Link>
          <Link to="/" className="group">
            <p
              className={`transition ease-in-out delay-150 ${
                test ? "" : "group-hover:-translate-y-1 group-hover:scale-110"
              }duration-300`}
            >
              Subscription
            </p>
            <div className="bg-primary mt-2 transform h-px  transition  duration-100 group-hover:scale-125" />
          </Link> 
        </div> */}
      {/* </div> */}
    </nav>
  )
}

export default NavBar
