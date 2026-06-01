import { Button } from 'flowbite-react'
import React, { FC } from 'react'
import { MdChevronRight, MdChevronLeft } from 'react-icons/md'

// Define the props for the Pagination component
interface PaginationProps {
  currentPage: number
  totalCount: number
  itemsPerPage: number
  onPageChange: (page: number) => void
}

// Explicitly type the component as FC<PaginationProps>
const Pagination: FC<PaginationProps> = ({
  currentPage,
  totalCount,
  itemsPerPage,
  onPageChange,
}) => {
  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const pageNumbers = []

  for (
    let i = Math.max(1, currentPage - 2);
    i <= Math.min(totalPages, currentPage + 2);
    i++
  ) {
    pageNumbers.push(i)
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1)
  }

  const goToPrevPage = () => {
    if (currentPage > 1) onPageChange(currentPage - 1)
  }

  return (
    <nav aria-label="Page navigation">
      <ul className="inline-flex items-center -space-x-px">
        {totalPages > 0 && (
          <li className="pr-4">
            <div
              className="cursor-pointer rounded-2xl p-2 text-gray-500 hover:bg-blue-600 hover:text-white"
              onClick={goToPrevPage}
            >
              <MdChevronLeft />
            </div>
          </li>
        )}
        {pageNumbers.map((page) => (
          <li key={page} className="p-1">
            <Button
              color="gray"
              gradientMonochrome={`${page === currentPage ? 'info' : ''}`}
              className="h-8 w-8 rounded-full"
              onClick={() => onPageChange(page)}
            >
              {page}
            </Button>
          </li>
        ))}
        {totalPages > 0 && (
          <li className="pl-4">
            <div
              className="cursor-pointer rounded-2xl p-2 text-gray-500 hover:bg-blue-600 hover:text-white"
              onClick={goToNextPage}
            >
              <MdChevronRight />
            </div>
          </li>
        )}
      </ul>
    </nav>
  )
}

export default Pagination
