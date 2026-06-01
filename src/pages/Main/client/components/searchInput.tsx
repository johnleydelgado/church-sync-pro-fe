import React from 'react'
import {
  Input,
  Button,
  Popover,
  PopoverContent,
  PopoverHandler,
} from '@material-tailwind/react'
import { FiSearch } from 'react-icons/fi'

const SearchInput = () => (
  <div className="relative w-full md:w-64">
    <Input
      placeholder="Search (e.g By name, email)"
      className="!border-gray-300 bg-white text-gray-500 placeholder:text-gray-500 shadow-lg focus:!border-yellow w-full pr-10"
      crossOrigin={undefined}
    />
    <span className="absolute inset-y-0 right-3 flex items-center text-gray-500">
      <FiSearch size={18} />
    </span>
  </div>
)

export default SearchInput
