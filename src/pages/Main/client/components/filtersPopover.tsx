import React from 'react'
import {
  Button,
  Popover,
  PopoverContent,
  PopoverHandler,
} from '@material-tailwind/react'
import { FiFilter } from 'react-icons/fi'

interface FiltersPopoverProps {
  onStatusChange: (value: string) => void
  onSortChange: (value: string) => void
  currentStatus: string // Current status filter
  currentSort: string // Current sort order
}

const FiltersPopover: React.FC<FiltersPopoverProps> = ({
  onStatusChange,
  onSortChange,
  currentStatus,
  currentSort,
}) => (
  <Popover
    animate={{
      mount: { scale: 1, y: 0 },
      unmount: { scale: 0, y: 25 },
    }}
    placement="bottom"
  >
    <PopoverHandler>
      <Button className="flex items-center gap-2 bg-yellow text-white rounded-lg h-10 px-4 w-full sm:w-32 md:w-36">
        <FiFilter size={20} />
        <span>Filters</span>
      </Button>
    </PopoverHandler>
    <PopoverContent className="w-72 p-4">
      <header className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-700">Filters</h3>
        <button
          className="text-yellow-500 underline text-sm"
          onClick={() => {
            onStatusChange('')
            onSortChange('asc')
          }}
        >
          Clear All
        </button>
      </header>

      {/* Status Filter */}
      <div className="mb-4">
        <label className="block text-sm font-bold text-gray-500 mb-2">
          Status
        </label>
        <select
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700"
          value={currentStatus} // Set the current selected value
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Sort by Church Name */}
      <div className="mb-4">
        <label className="block text-sm font-bold text-gray-500 mb-2">
          Sort by Church Name
        </label>
        <select
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700"
          value={currentSort} // Set the current selected value
          onChange={(e) => onSortChange(e.target.value)}
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>
    </PopoverContent>
  </Popover>
)

export default FiltersPopover
