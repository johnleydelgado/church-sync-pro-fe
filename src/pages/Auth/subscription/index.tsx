import React, { FC } from "react";
import { FcCheckmark } from "react-icons/fc";
import { Link } from "react-router-dom";
interface indexProps {}

const index: FC<indexProps> = () => {
  return (
    <section className="bg-white h-screen font-montserrat font-thin flex flex-col">
      <nav className="bg-white px-2 py-2.5 sm:px-4">
        <div className="mx-auto flex flex-wrap items-center justify-between">
          <a className="flex">
            <img
              src="https://flowbite.com/docs/images/logo.svg"
              className="mr-3 h-6 sm:h-9"
              alt="Flowbite Logo"
            />
            <span className="self-center whitespace-nowrap text-xl font-semibold dark:text-white">
              Church Sync Pro
            </span>
          </a>
          <div className="flex gap-10">
            <Link to="/">
              <p>Home</p>
            </Link>
            <Link to="/">
              <p>Features</p>
            </Link>
            <Link to="/">
              <p>Pricing</p>
              <div className="bg-primary mt-2" style={{ height: 1 }} />
            </Link>
          </div>
          <div className="flex space-x-4 items-center">
            <Link to="/" className="font-thin">
              <p>Log In</p>
            </Link>
            <Link
              to="/"
              className="font-medium border-primary border-2 rounded-xl p-2 text-sm"
            >
              <p>Try it for free</p>
            </Link>
          </div>
        </div>
      </nav>
      <div className="h-72 mx-auto flex justify-center items-center">
        <span className="font-semibold text-6xl text-primary">
          Subscriptions plan
        </span>
      </div>

      <div className="flex-1 flex justify-center gap-8 p-8 -mt-20">
        <div
          className="rounded-xl shadow-lg h-full w-72 border-2 border-slate-200
          p-8 transform transition duration-100 hover:scale-105 cursor-pointer"
        >
          <div className="flex justify-between item">
            <div>
              <p className="font-semibold text-xl">Free</p>
              <p className="font-medium text-sm text-gray-500">
                For Individuals
              </p>
            </div>
            <p className="font-semibold text-4xl">$ 0</p>
          </div>
          <div className="flex gap-4 pt-6 items-center">
            <FcCheckmark />
            <span>Neque porro quisquam est</span>
          </div>
          <div className="flex gap-4 pt-6 items-center">
            <FcCheckmark />
            <span>Neque porro quisquam est</span>
          </div>
        </div>

        <div
          className="rounded-xl shadow-lg h-full w-72 border-2 border-slate-200
          p-8 transform transition duration-100 hover:scale-105 cursor-pointer"
        >
          <div className="flex justify-between item">
            <div>
              <p className="font-semibold text-xl">Team</p>
              <p className="font-medium text-sm text-gray-500">
                For Individuals
              </p>
            </div>
            <p className="font-semibold text-4xl">$ 100</p>
          </div>
          <div className="flex gap-4 pt-6 items-center">
            <FcCheckmark />
            <span>Neque porro quisquam est</span>
          </div>
          <div className="flex gap-4 pt-6 items-center">
            <FcCheckmark />
            <span>Neque porro quisquam est</span>
          </div>
          <div className="flex gap-4 pt-6 items-center">
            <FcCheckmark />
            <span>Neque porro quisquam est</span>
          </div>
        </div>

        <div
          className="rounded-xl shadow-lg h-full w-72 border-2 border-slate-200
          p-8 transform transition duration-100 hover:scale-105 cursor-pointer"
        >
          <div className="flex justify-between item">
            <div>
              <p className="font-semibold text-xl">Enterprise</p>
              <p className="font-medium text-sm text-gray-500">
                For Individuals
              </p>
            </div>
            <p className="font-semibold text-4xl">$ 3k</p>
          </div>
          <div className="flex gap-4 pt-6 items-center">
            <FcCheckmark />
            <span>Neque porro quisquam est</span>
          </div>
          <div className="flex gap-4 pt-6 items-center">
            <FcCheckmark />
            <span>Neque porro quisquam est</span>
          </div>
          <div className="flex gap-4 pt-6 items-center">
            <FcCheckmark />
            <span>Neque porro quisquam est</span>
          </div>
          <div className="flex gap-4 pt-6 items-center">
            <FcCheckmark />
            <span>Neque porro quisquam est</span>
          </div>
          <div className="flex gap-4 pt-6 items-center">
            <FcCheckmark />
            <span>Neque porro quisquam est</span>
          </div>
        </div>
      </div>
      {/* <Navbar fluid>
        <Navbar.Brand to="/navbars">
          <img
            src="https://flowbite.com/docs/images/logo.svg"
            className="mr-3 h-6 sm:h-9"
            alt="Flowbite Logo"
          />
          <span className="self-center whitespace-nowrap text-xl font-semibold dark:text-white">
            Flowbite
          </span>
        </Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse className="">
          <Navbar.Link href="/navbars" active>
            Home
          </Navbar.Link>
          <Navbar.Link to="/navbars">About</Navbar.Link>
          <Navbar.Link href="/navbars">Services</Navbar.Link>
          <Navbar.Link href="/navbars">Pricing</Navbar.Link>
          <Navbar.Link href="/navbars">Contact</Navbar.Link>
        </Navbar.Collapse>
      </Navbar> */}
    </section>
  );
};

export default index;
