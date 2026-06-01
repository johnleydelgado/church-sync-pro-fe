import { useQueryClient, QueryKey } from 'react-query'

export const useInvalidateQueries = () => {
  const queryClient = useQueryClient()

  /**
   * Invalidate and optionally refetch multiple queries by their keys.
   * @param {QueryKey[]} queryKeys - Array of query keys to invalidate.
   * @param {boolean} [refetch=false] - Whether to refetch after invalidating.
   */
  const invalidateQueries = async (queryKeys: QueryKey[], refetch = false) => {
    for (const key of queryKeys) {
      console.log('Invalidating key:', key)
      await queryClient.invalidateQueries(key)
      if (refetch) {
        console.log('Refetching key:', key)
        await queryClient.refetchQueries(key)
      }
    }
  }

  return { invalidateQueries }
}
