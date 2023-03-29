import React, { FC, useState } from 'react'
import { AiFillCaretLeft } from 'react-icons/ai'
interface DropdownProps {}

const DropdownItem = ({ title }: { title: string }) => {
  const [showDropdownList, setShowDropdownList] = useState<boolean>(false)
  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          className="inline-flex w-full justify-between gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          id="menu-button"
          aria-expanded="true"
          aria-haspopup="true"
          onClick={() => setShowDropdownList(!showDropdownList)}
        >
          {title}
          <svg
            className="-mr-1 h-5 w-5 text-gray-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div
        className={`absolute right-0 z-10 mt-2 w-full origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none ${
          showDropdownList ? 'visible' : 'invisible'
        }`}
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="menu-button"
      >
        <div
          className="flex flex-col [&>*]:bg-green-400 [&>*]:m-2 [&>*]:rounded-md text-white text-center"
          role="none"
        >
          <a
            href="#"
            className="block px-4 py-2 text-sm"
            role="menuitem"
            id="menu-item-0"
          >
            1
          </a>
          <a
            href="#"
            className="block px-4 py-2 text-sm"
            role="menuitem"
            id="menu-item-1"
          >
            2
          </a>
          <a
            href="#"
            className="block px-4 py-2 text-sm"
            role="menuitem"
            id="menu-item-2"
          >
            2
          </a>
        </div>
      </div>
    </div>
  )
}

const ItemSetting: FC<DropdownProps> = ({}) => {
  return (
    <div className="bg-primary p-4 z-50 rounded-md grid grid-cols-2 gap-2 w-72 absolute -right-80 top-0">
      <AiFillCaretLeft className="absolute top-4 -left-4 " size={20} />
      <DropdownItem title="Account" />
      <DropdownItem title="Class" />
      <DropdownItem title="Location" />
      <DropdownItem title="Project" />
      <DropdownItem title="Tag" />
      <DropdownItem title="DR Acct" />
    </div>
  )
}

export default ItemSetting
