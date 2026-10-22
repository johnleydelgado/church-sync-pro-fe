import { useQuery } from 'react-query'

import {
  PayoutReportError,
  PayoutStatus,
  getPayoutReportStatus,
} from '@/common/api/user'
import { useChurch } from '@/common/hooks/useChurch'

/**
 * The selected church's payout-report status: last upload, what needs review, and whether the
 * setup lets a file in. The Payout reports card and the in-transit section share one query.
 */
export const usePayoutStatus = () => {
  const { email, churchId } = useChurch()
  return useQuery<PayoutStatus | null, PayoutReportError>(
    ['payoutReportStatus', churchId],
    async () => (email ? await getPayoutReportStatus(email) : null),
    {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      enabled: !!churchId,
      retry: false,
    },
  )
}
