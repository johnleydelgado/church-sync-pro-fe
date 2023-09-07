import { Button } from 'flowbite-react'
import React, { type FC } from 'react'
import { MdChevronRight, MdChevronLeft } from 'react-icons/md'

interface PaginationProps {
  currentPage: number
  onPageChange: (pageNumber: number) => void
  totalPages: number
  itemPerPage: number
}

const PaginationStripe: FC<PaginationProps> = ({
  currentPage,
  onPageChange,
  totalPages,
  itemPerPage,
}) => {
  const pageNumbers = []

  for (
    let i = Math.max(1, currentPage - itemPerPage);
    i <= Math.min(totalPages, currentPage + itemPerPage);
    i++
  ) {
    pageNumbers.push(i)
  }

  return (
    <nav aria-label="Page navigation" className="">
      <ul className="inline-flex items-center -space-x-px">
        {totalPages > 0 ? (
          <li className="pr-4">
            <div
              className="cursor-pointer rounded-2xl p-2 text-gray-500 hover:bg-blue-600 hover:text-white"
              onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
            >
              <MdChevronLeft />
            </div>
          </li>
        ) : null}
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
        {totalPages > 0 ? (
          <li className="pl-4">
            <div
              className="cursor-pointer rounded-2xl p-2 text-gray-500 hover:bg-blue-600 hover:text-white"
              onClick={() =>
                currentPage < totalPages && onPageChange(currentPage + 1)
              }
            >
              <MdChevronRight />
            </div>
          </li>
        ) : null}
      </ul>
    </nav>
  )
}

export default PaginationStripe
