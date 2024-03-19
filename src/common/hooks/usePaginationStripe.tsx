import { RootState } from '@/redux/store'
import { isEmpty } from 'lodash'
import { useEffect, useState } from 'react'
import { useQuery } from 'react-query'
import { useSelector } from 'react-redux'
import Stripe from 'stripe'
import { getStripePayouts } from '../api/stripe'
import { useDispatch } from 'react-redux'
import {
  setLastObjectId,
  setPersistPage,
  setStripeCurrentData,
} from '@/redux/common'
import {
  isLastDayOfMonth,
  isThisMonth,
  isWithinInterval,
  subDays,
  subMonths,
} from 'date-fns'
import { usePagination } from '../context/PaginationProvider'

type dateRangeProps =
  | 'This Month'
  | 'Last Month'
  | 'Last 7 Days'
  | 'Last 30 Days'
  | 'Last 3 Months'
  | 'Last 6 Months'
  | '2024'
  | '2023'
  | '2022'
  | '2021'
  | '2020'
  | '2019'
  | '2018'
  | 'Custom'
  | undefined

const usePaginationStripe = () => {
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const { user, stripeCurrentPage } = useSelector(
    (state: RootState) => state.common,
  )
  const [amount, setAmount] = useState(0)

  const [totalItems, setTotalItems] = useState(0)

  const dispatch = useDispatch()
  const {
    selectedTransactionDate,
    selectedStartDate,
    persistPage,
    lastObjectId,
    dateRangeTransaction,
  } = useSelector((state: RootState) => state.common)

  const {
    data: dataF,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<Stripe.Charge[]>(
    ['getStripePayouts', bookkeeper, selectedStartDate],
    async () => {
      const email =
        user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email

      try {
        if (email)
          return await getStripePayouts(
            email,
            selectedStartDate,
            persistPage,
            lastObjectId,
          )
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

  const startIndex = ((stripeCurrentPage || 1) - 1) * 10
  const endIndex = startIndex + 10
  // @ts-ignore
  const currentPageData: Stripe.Charge[] | [] | undefined = !isEmpty(dataF)
    ? // ? dataF?.slice(startIndex, endIndex)
      dataF
    : []

  useEffect(() => {
    const filterDate: dateRangeProps = dateRangeTransaction?.find(
      (item) => item.type === 'stripe',
    )?.dateRange

    const sDate = dateRangeTransaction?.find(
      (item) => item.type === 'stripe',
    )?.startDate

    const eDate = dateRangeTransaction?.find(
      (item) => item.type === 'stripe',
    )?.endDate

    const email =
      user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email

    if (!isEmpty(currentPageData) && filterDate) {
      let filteredData = currentPageData

      switch (filterDate) {
        case 'This Month':
          filteredData = currentPageData?.filter((item) =>
            isThisMonth(
              // @ts-ignore
              item.payoutDate ? new Date(item.payoutDate) : new Date(),
            ),
          )
          break
        case 'Last Month':
          filteredData = currentPageData?.filter((item) =>
            // @ts-ignore
            isLastDayOfMonth(new Date(item.payoutDate)),
          )
          break
        case 'Last 7 Days':
          filteredData = currentPageData?.filter((item) =>
            // @ts-ignore
            isWithinInterval(new Date(item.payoutDate), {
              start: subDays(new Date(), 7),
              end: new Date(),
            }),
          )
          break
        case 'Last 30 Days':
          filteredData = currentPageData?.filter((item) =>
            // @ts-ignore
            isWithinInterval(new Date(item.payoutDate), {
              start: subDays(new Date(), 30),
              end: new Date(),
            }),
          )
          break
        case 'Last 3 Months':
          filteredData = currentPageData?.filter((item) =>
            // @ts-ignore
            isWithinInterval(new Date(item.payoutDate), {
              start: subMonths(new Date(), 3),
              end: new Date(),
            }),
          )
          break
        case 'Last 6 Months':
          filteredData = currentPageData?.filter((item) =>
            // @ts-ignore
            isWithinInterval(new Date(item.payoutDate), {
              start: subMonths(new Date(), 6),
              end: new Date(),
            }),
          )
          break
        case '2024':
        case '2023':
        case '2022':
        case '2021':
        case '2020':
        case '2019':
        case '2018':
          filteredData = currentPageData?.filter((item) =>
            // @ts-ignore
            isWithinInterval(new Date(item.payoutDate), {
              start: new Date(parseInt(filterDate, 10), 0, 1),
              end: new Date(parseInt(filterDate, 10), 11, 31),
            }),
          )
          break
        case 'Custom':
          filteredData = currentPageData?.filter((item) =>
            // @ts-ignore
            isWithinInterval(new Date(item.payoutDate), {
              start: new Date(sDate ? sDate : new Date()),
              end: new Date(eDate ? eDate : new Date()),
            }),
          )
          break
        default:
          // Add code for default case
          filteredData = currentPageData
      }

      filteredData = filteredData?.slice(startIndex, endIndex)

      if (amount) {
        // @ts-ignore
        const finalFilterData = filteredData?.filter(
          (item: any) => item.grossAmount === amount * 100,
        )
        setTotalItems(finalFilterData?.length || 0)
        dispatch(setStripeCurrentData(finalFilterData))
      } else {
        setTotalItems(dataF?.length || 0)
        dispatch(setStripeCurrentData(filteredData))
      }

      // dispatch(setStripeCurrentData(currentPageData))
    } else if (amount) {
      const finalFilterData = currentPageData
        ?.slice(startIndex, endIndex)
        .filter((item: any) => item.grossAmount === amount * 100)
      setTotalItems(finalFilterData?.length || 0)
      dispatch(setStripeCurrentData(finalFilterData))
    } else {
      setTotalItems(dataF?.length || 0)
      dispatch(
        setStripeCurrentData(currentPageData?.slice(startIndex, endIndex)),
      )
    }
  }, [stripeCurrentPage, isLoading, dateRangeTransaction, amount])

  return {
    currentPageData,
    totalItems,
    isLoading,
    refetch,
    isRefetching,
    setAmount,
  }
}

export default usePaginationStripe
