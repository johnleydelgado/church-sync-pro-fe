import { useQuery } from 'react-query'
import { getTokenList } from '../api/user'
import { useChurch } from './useChurch'
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
  const { email, churchId } = useChurch()

  const {
    data: tokenList,
    refetch,
    isLoading,
    isRefetching,
  } = useQuery<AccountTokenDataProps[]>(
    ['getTokenList', churchId],
    async () => {
      if (email) return await getTokenList(email)
    },
    {
      enabled: !!churchId,
      staleTime: Infinity,
      cacheTime: Infinity,
      refetchOnWindowFocus: false,
    },
  )

  return { tokenList, refetch, isLoading, isRefetching }
}
