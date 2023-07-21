import { RootState } from '@/redux/store'
import { useQuery } from 'react-query'
import { useSelector } from 'react-redux'
import { getTokenList } from '../api/user'
// ... other imports

interface Token {
  id?: number
  userId: number
  tokenEntityId: number
  token_type: 'stripe' | 'qbo' | 'pco' | string
  access_token: string | null
  refresh_token: string | null
  realm_id: string | null
  isSelected: boolean
  organization_name: string | null
}

export interface AccountTokenDataProps {
  id: number
  isEnabled: false
  email: string
  tokens: Token[]
  createAt?: string
  updatedAt?: string
}

export const useGetTokenList = () => {
  const { email, id, role } = useSelector((item: RootState) => item.common.user)
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)

  const {
    data: tokenList,
    refetch,
    isLoading,
    isRefetching,
  } = useQuery<AccountTokenDataProps[]>(
    ['getTokenList'],
    async () => {
      const emailLatest =
        role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : email
      if (emailLatest) return await getTokenList(emailLatest)
    },
    {
      staleTime: Infinity,
      cacheTime: Infinity,
      refetchOnWindowFocus: false,
    },
  )

  return { tokenList, refetch, isLoading, isRefetching }
}
