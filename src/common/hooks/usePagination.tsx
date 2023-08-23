import { isEmpty } from 'lodash'
import { useEffect, useState } from 'react'

interface PaginationProps {
  filteredData: any
  itemPerPage?: number
}

const usePagination = ({ filteredData, itemPerPage = 10 }: PaginationProps) => {
  const [currentPage, setCurrentPage] = useState<number>(1)
  const startIndex = (currentPage - 1) * itemPerPage
  const endIndex = startIndex + itemPerPage
  const currentPageData =
    !isEmpty(filteredData) && filteredData?.batches.slice(startIndex, endIndex)
  const totalItems = filteredData?.batches?.length || 0

  return {
    currentPageData,
    currentPage,
    setCurrentPage,
    totalItems,
    itemPerPage,
  }
}

export default usePagination
