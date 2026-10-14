import React from 'react'
import {
  Button,
  Popover,
  PopoverContent,
  PopoverHandler,
} from '@material-tailwind/react'
import { FiFilter } from 'react-icons/fi'

export type StatusFilter = '' | 'active' | 'inactive'

interface FiltersPopoverProps {
  currentStatus: StatusFilter
  onStatusChange: (value: StatusFilter) => void
}

/**
 * Status only. The list keeps the server's order (active churches first, then by name), so the
 * Clients page's name sort is not carried over: sorting by name alone would mix inactive churches
 * in with the active ones.
 */
const FiltersPopover: React.FC<FiltersPopoverProps> = ({
  currentStatus,
  onStatusChange,
}) => (
  <Popover
    animate={{
      mount: { scale: 1, y: 0 },
      unmount: { scale: 0, y: 25 },
    }}
    placement="bottom"
  >
    <PopoverHandler>
      <Button className="flex items-center justify-center gap-2 bg-yellow text-white rounded-lg h-10 px-4 w-full md:w-36 normal-case">
        <FiFilter size={20} />
        <span>
          {currentStatus === 'active'
            ? 'Active'
            : currentStatus === 'inactive'
            ? 'Inactive'
            : 'Filters'}
        </span>
      </Button>
    </PopoverHandler>
    <PopoverContent className="w-72 p-4 z-20">
      <header className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-700">Filters</h3>
        <button
          type="button"
          className="text-yellow-500 underline text-sm"
          onClick={() => onStatusChange('')}
        >
          Clear
        </button>
      </header>

      <div className="mb-2">
        <label
          htmlFor="church-status-filter"
          className="block text-sm font-bold text-gray-500 mb-2"
        >
          Status
        </label>
        <select
          id="church-status-filter"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700"
          value={currentStatus}
          onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
        >
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
    </PopoverContent>
  </Popover>
)

export default FiltersPopover
