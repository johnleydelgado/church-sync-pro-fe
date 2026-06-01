import { useMutation, useQuery, useQueryClient } from 'react-query'
import { bookkeeperList, toggleUserActiveStatusApi } from '../api/user'
import { BookkeeperInvite } from '../constant/global-interfaces'

/**
 * Custom hook to fetch bookkeeper list data.
 * @param {string} id - The bookkeeper ID.
 * @param {string} role - The role of the user.
 * @returns {Object} - Contains `data` and `refetch` from the query.
 */
const useBookkeeperListSidebar = (
  id: number | undefined,
  role: string | undefined,
) => {
  return useQuery<BookkeeperInvite[]>(
    ['bookkeeperListSidebar', role],
    async (): Promise<BookkeeperInvite[]> => {
      console.log('Query function executed', id, role) // Log to confirm function execution

      if (id && role === 'bookkeeper') {
        console.log('Fetching bookkeeperList with id:', id) // Log to confirm condition

        const res = await bookkeeperList({ bookkeeperId: id })
        console.log('API response data:', res.data) // Log API response to confirm data

        return res.data as BookkeeperInvite[]
      }

      console.log('Returning empty array as fallback') // Log when returning empty array
      return []
    },
    { staleTime: 0 }, // Ensures data is always considered stale for refetching
  )
}

const useToggleUserActiveStatus = () => {
  const queryClient = useQueryClient() // To invalidate or refetch relevant queries after mutation

  return useMutation(
    async ({ userId, isActive }: { userId: number; isActive: boolean }) => {
      console.log('Mutation triggered with:', userId, isActive) // Log for debugging
      const res = await toggleUserActiveStatusApi({ userId, isActive })
      console.log('API response data:', res) // Log API response to confirm data
      return res
    },
    {
      onSuccess: (data, variables) => {
        console.log('Mutation succeeded with:', data) // Log success response

        // Invalidate or refetch related queries here
        queryClient.invalidateQueries('userList') // Adjust to your query key
      },
      onError: (error: any) => {
        console.error('Mutation failed with error:', error) // Log error
      },
    },
  )
}

export { useBookkeeperListSidebar, useToggleUserActiveStatus }
