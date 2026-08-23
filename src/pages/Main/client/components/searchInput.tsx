import React from 'react'
import { Input } from '@material-tailwind/react'
import { FiSearch } from 'react-icons/fi'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
}

const SearchInput: React.FC<SearchInputProps> = ({ value, onChange }) => (
  <div className="relative w-full md:w-64">
    <Input
      placeholder="Search (e.g By name, email)"
      className="!border-gray-300 bg-white text-gray-500 placeholder:text-gray-500 shadow-lg focus:!border-yellow w-full pr-10"
      crossOrigin={undefined}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        onChange(e.target.value)
      }
    />
    <span className="absolute inset-y-0 right-3 flex items-center text-gray-500">
      <FiSearch size={18} />
    </span>
  </div>
)

export default SearchInput
