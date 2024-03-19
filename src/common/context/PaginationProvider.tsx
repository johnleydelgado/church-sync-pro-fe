import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from 'react'
import { useQuery } from 'react-query'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import { pcGetBatches } from '../api/planning-center'
import { isEmpty } from 'lodash'

// Define your interfaces here
// ...

interface PaginationContextProps {
  currentPage: number
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
  totalCount: number
  data: { batch: batchDataProps; donations: any }[]
  goToNextPage: () => void
  goToPrevPage: () => void
  synchedBatches: any
  isLoading: boolean
  isRefetching: boolean
  setData: React.Dispatch<React.SetStateAction<any>>
  setOffset: React.Dispatch<React.SetStateAction<number>>
  setAmount: React.Dispatch<React.SetStateAction<number>>
  amount: number
  refetch: any
}

export interface batchDataProps {
  id: string
  link: any
  relationships: any
  type: string
  attributes: {
    committed_at: string
    created_at: string
    description: string
    status: string
    total_cents: number
    total_currency: string
    updated_at: string
  }
}

export interface synchedBatchesProps {
  batchId: string
  createdAt: string
  donationId: string
  id: number
}

interface BatchesAndSyncProps {
  batches: { batch: batchDataProps; donations: any }[]
  synchedBatches: synchedBatchesProps[]
  offSetRes?: { next: number; prev: number }
  total_count?: number
}

const PaginationContext = createContext<PaginationContextProps | null>(null)

export const usePagination = () => {
  const context = useContext(PaginationContext)
  if (!context) {
    throw new Error('usePagination must be used within a PaginationProvider')
  }
  return context
}

interface PaginationProviderProps {
  children: ReactNode
}

export const PaginationProvider: React.FC<PaginationProviderProps> = ({
  children,
}) => {
  const dispatch = useDispatch()
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const { user } = useSelector((state: RootState) => state.common)

  const [currentPage, setCurrentPage] = useState(1)
  const [offset, setOffset] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [amount, setAmount] = useState(0)

  const [data, setData] = useState<{ batch: batchDataProps; donations: any }[]>(
    [],
  )
  const { selectedTransactionDate, selectedStartDate, dateRangeTransaction } =
    useSelector((state: RootState) => state.common)
  const [synchedBatches, setSynchedBatches] = useState<any[]>([])
  const [prevOffset, setPrevOffset] = useState<number | null>(null)
  const [nextOffset, setNextOffset] = useState<number | null>(null)

  const {
    data: dataF,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<BatchesAndSyncProps | undefined>(
    [
      'getBatches',
      bookkeeper,
      offset,
      selectedStartDate,
      dateRangeTransaction,
      amount,
    ],
    async () => {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      const filterDate = dateRangeTransaction?.find(
        (item) => item.type === 'batch',
      )?.dateRange

      const startFilterDate = dateRangeTransaction?.find(
        (item) => item.type === 'batch',
      )?.startDate

      const endFilterDate = dateRangeTransaction?.find(
        (item) => item.type === 'batch',
      )?.endDate

      if (email)
        return await pcGetBatches(
          email,
          selectedStartDate,
          offset || 0,
          filterDate,
          startFilterDate,
          endFilterDate,
          amount,
        )
      return []
    },
    {
      refetchOnWindowFocus: false,
    },
  )

  const goToNextPage = () => {
    if (nextOffset !== null) {
      setCurrentPage((prevPage) => prevPage + 1)
      setOffset(nextOffset)
    }
  }

  const goToPrevPage = () => {
    if (prevOffset !== null) {
      setCurrentPage((prevPage) => prevPage - 1)
      setOffset(prevOffset)
    }
  }

  useEffect(() => {
    setPrevOffset(dataF?.offSetRes?.prev ?? null)
    setNextOffset(dataF?.offSetRes?.next ?? null)
    setTotalCount(dataF?.total_count ?? 0)
    setData(!isEmpty(dataF) ? dataF?.batches : [])
    setSynchedBatches(!isEmpty(dataF) ? dataF?.synchedBatches : [])
  }, [dataF])

  return (
    <PaginationContext.Provider
      value={{
        currentPage,
        setCurrentPage,
        totalCount,
        data,
        goToNextPage,
        goToPrevPage,
        synchedBatches,
        isLoading,
        isRefetching,
        setAmount,
        amount,
        setData,
        setOffset,
        refetch,
      }}
    >
      {children}
    </PaginationContext.Provider>
  )
}
