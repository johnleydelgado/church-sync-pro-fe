import { usePagination } from '@/common/context/PaginationProvider'
import { Button } from 'flowbite-react'
import React, { useEffect, type FC } from 'react'
import { MdChevronRight, MdChevronLeft } from 'react-icons/md'

const Pagination = () => {
  const {
    currentPage,
    setCurrentPage,
    totalCount,
    goToNextPage,
    goToPrevPage,
    setOffset,
  } = usePagination()
  const totalPages = Math.ceil(totalCount / 10)

  const pageNumbers = []

  for (
    let i = Math.max(1, currentPage - 2);
    i <= Math.min(totalPages, currentPage + 2);
    i++
  ) {
    pageNumbers.push(i)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    const newOffset = (page - 1) * 10
    setOffset(newOffset)
  }

  console.log('totalCount', totalCount, totalPages)

  return (
    <nav aria-label="Page navigation" className="">
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
              onClick={() => handlePageChange(page)}
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
