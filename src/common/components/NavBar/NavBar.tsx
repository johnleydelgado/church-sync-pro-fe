import { RootState } from '@/redux/store'
import {
  Avatar,
  Button,
  Menu,
  MenuHandler,
  MenuItem,
  MenuList,
  Typography,
} from '@material-tailwind/react'
import { FC } from 'react'
import { CgProfile } from 'react-icons/cg'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
interface NavBarProps {}

const NavBar: FC<NavBarProps> = () => {
  const { churchName } = useSelector((state: RootState) => state.common.user)
  return (
    <nav className="bg-white relative left-0 top-0 right-0 px-2 py-2.5 sm:px-8 flex-shrink h-18">
      <div className="mx-auto flex flex-wrap justify-end">
        {/* <div className="cursor-pointer hover:bg-slate-200 rounded-md p-4 group">
          <CgMenuLeft className="transform scale-150 sm:scale-0 transition duration-500 group-hover:scale-125" />
        </div> */}
        <div className="flex text-md lg:text-base gap-2 lg:gap-16 h-12 w-64 h-full justify-end">
          <Menu
            animate={{
              mount: { y: 0 },
              unmount: { y: 25 },
            }}
          >
            <MenuHandler>
              <div className="flex flex-col items-center gap-1">
                <CgProfile size={32} />
                <div>
                  {/* <Typography variant="h6">Candice Wu</Typography> */}
                  <Typography
                    variant="small"
                    color="gray"
                    className="font-normal"
                  >
                    {churchName ? churchName : 'N/A'}
                  </Typography>
                </div>
              </div>
            </MenuHandler>
            <MenuList className="py-2">
              <MenuItem>Menu Item 1</MenuItem>
              <MenuItem>Menu Item 2</MenuItem>
              <MenuItem>Menu Item 3</MenuItem>
            </MenuList>
          </Menu>
          {/* <Link to="/" className="group">
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
          </Link> */}
        </div>
      </div>
    </nav>
  )
}

export default NavBar
