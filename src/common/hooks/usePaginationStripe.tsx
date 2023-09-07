import { RootState } from '@/redux/store'
import { isEmpty } from 'lodash'
import { useState } from 'react'
import { useQuery } from 'react-query'
import { useSelector } from 'react-redux'
import Stripe from 'stripe'
import { getStripePayouts } from '../api/stripe'

const usePaginationStripe = () => {
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const { user } = useSelector((state: RootState) => state.common)

  const {
    data: dataF,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<Stripe.Charge[]>(
    ['getStripePayouts', bookkeeper],
    async () => {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
      try {
        if (email) return await getStripePayouts(email)
        return []
      } catch (err) {
        return []
      }
    },
    {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    },
  )

  console.log('dataF', dataF)

  const [currentPage, setCurrentPage] = useState<number>(1)
  const startIndex = (currentPage - 1) * 10
  const endIndex = startIndex + 10
  const currentPageData: Stripe.Charge[] | [] | undefined = !isEmpty(dataF)
    ? dataF?.slice(startIndex, endIndex)
    : []
  const totalItems = dataF?.length || 0

  return {
    currentPageData,
    currentPage,
    setCurrentPage,
    totalItems,
    isLoading,
    refetch,
    isRefetching,
  }
}

export default usePaginationStripe
