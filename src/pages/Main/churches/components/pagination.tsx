import { Button } from 'flowbite-react'
import React, { FC } from 'react'
import { MdChevronRight, MdChevronLeft } from 'react-icons/md'

interface PaginationProps {
  currentPage: number
  totalCount: number
  itemsPerPage: number
  onPageChange: (page: number) => void
}

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
            <button
              type="button"
              aria-label="Previous page"
              disabled={currentPage <= 1}
              className="rounded-2xl p-2 text-gray-500 hover:bg-blue-600 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-500"
              onClick={goToPrevPage}
            >
              <MdChevronLeft />
            </button>
          </li>
        )}
        {pageNumbers.map((page) => (
          <li key={page} className="p-1">
            <Button
              color="gray"
              gradientMonochrome={`${page === currentPage ? 'info' : ''}`}
              className="h-8 w-8 rounded-full"
              aria-current={page === currentPage ? 'page' : undefined}
              onClick={() => onPageChange(page)}
            >
              {page}
            </Button>
          </li>
        ))}
        {totalPages > 0 && (
          <li className="pl-4">
            <button
              type="button"
              aria-label="Next page"
              disabled={currentPage >= totalPages}
              className="rounded-2xl p-2 text-gray-500 hover:bg-blue-600 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-500"
              onClick={goToNextPage}
            >
              <MdChevronRight />
            </button>
          </li>
        )}
      </ul>
    </nav>
  )
}

export default Pagination
