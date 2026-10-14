import { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useQuery } from 'react-query'
import isEqual from 'lodash/isEqual'
import { RootState } from '@/redux/store'
import { resetChurchScopedState, setSelectedChurch } from '@/redux/common'
import { getMyChurches, MyChurch } from '@/common/api/church'

export const MY_CHURCHES_KEY = 'myChurches'

/** Every church the signed-in person belongs to. */
export const useMyChurches = () => {
  const userId = useSelector((s: RootState) => s.common.user?.id)
  return useQuery([MY_CHURCHES_KEY, userId], getMyChurches, {
    enabled: !!userId,
    staleTime: 60_000,
  })
}

/** The church every page works on. `email` is its account's email, which the older endpoints take. */
export const useChurch = () => {
  // `?? null`: a browser that ran an older build has no `selectedChurch` key at all.
  const church = useSelector((s: RootState) => s.common.selectedChurch) ?? null
  return {
    church,
    churchId: church?.id ?? null,
    email: church?.accountEmail ?? '',
    accountUserId: church?.accountUserId ?? null,
    canConnectIntegrations: !!church?.canConnectIntegrations,
    canManagePeople: !!church?.canManagePeople,
  }
}

export const useSwitchChurch = () => {
  const dispatch = useDispatch()
  return useCallback(
    (next: MyChurch | null) => {
      // Bank and fee choices are per church; never carry one church's into another's Mapping page.
      dispatch(resetChurchScopedState())
      dispatch(setSelectedChurch(next))
    },
    [dispatch],
  )
}

/** Keeps the selection pointing at a church the person still belongs to, with up-to-date rights. */
export const useKeepChurchSelected = () => {
  const dispatch = useDispatch()
  const selected =
    useSelector((s: RootState) => s.common.selectedChurch) ?? null
  const { data: churches } = useMyChurches()
  const switchChurch = useSwitchChurch()
  useEffect(() => {
    if (!churches) return
    const current = churches.find((c) => c.id === selected?.id)
    if (current) {
      // Same church: refresh its name, rights and connections without clearing anything.
      if (!isEqual(current, selected)) dispatch(setSelectedChurch(current))
      return
    }
    switchChurch(churches.find((c) => c.isActive) ?? churches[0] ?? null)
  }, [churches]) // eslint-disable-line react-hooks/exhaustive-deps
}
