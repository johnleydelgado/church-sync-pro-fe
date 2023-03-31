import { FC } from 'react'
import { Link } from 'react-router-dom'
interface NavBarProps {}

const NavBar: FC<NavBarProps> = () => {
  const test = true

  return (
    <nav className="bg-white relative left-0 top-0 right-0 px-2 py-2.5 sm:px-8 flex-1">
      <div className="mx-auto flex flex-wrap items-center justify-end">
        {/* <div className="cursor-pointer hover:bg-slate-200 rounded-md p-4 group">
          <CgMenuLeft className="transform scale-150 sm:scale-0 transition duration-500 group-hover:scale-125" />
        </div> */}
        <div className="flex text-md lg:text-base gap-2 lg:gap-16 h-12">
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
