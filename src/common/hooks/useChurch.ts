import { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useQuery } from 'react-query'
import isEqual from 'lodash/isEqual'
import { RootState } from '@/redux/store'
import { resetChurchScopedState, setSelectedChurch } from '@/redux/common'
import { resetReduxQboData } from '@/redux/qbo'
import { resetReduxStripeData } from '@/redux/stripe'
import { ChurchApiError, getMyChurches, MyChurch } from '@/common/api/church'

export const MY_CHURCHES_KEY = 'myChurches'
/** `[CHURCH_PEOPLE_KEY, churchId]`: the People tab's list for one church. */
export const CHURCH_PEOPLE_KEY = 'churchPeople'

/**
 * The selected church, or null. Read it only through this: a browser that ran an older build
 * gets its persisted `common` back whole, without a `selectedChurch` key, so it is `undefined`.
 */
export const selectSelectedChurch = (s: RootState): MyChurch | null =>
  s.common.selectedChurch ?? null

/** A 4xx is the server's answer (signed out, not allowed); asking again won't change it. */
const isClientError = (e: unknown) =>
  e instanceof ChurchApiError && (e.status ?? 0) >= 400 && (e.status ?? 0) < 500

/** Every church the signed-in person belongs to. */
export const useMyChurches = () => {
  const userId = useSelector((s: RootState) => s.common.user?.id)
  return useQuery([MY_CHURCHES_KEY, userId], getMyChurches, {
    enabled: !!userId,
    staleTime: 60_000,
    retry: (failureCount, error) => !isClientError(error) && failureCount < 3,
  })
}

/** The church every page works on. `email` is its account's email, which the older endpoints take. */
export const useChurch = () => {
  const church = useSelector(selectSelectedChurch)
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
      // Bank and fee choices are per church; never carry one church's into another's Mapping
      // page. Runs on EVERY switch, the first selection included: a browser coming from the
      // email-era build still holds the last client's choices in persisted state.
      dispatch(resetChurchScopedState())
      // The QuickBooks and Stripe lists cached for the last church; the new one's are loaded
      // by BackgroundDataFetcher.
      dispatch(resetReduxQboData())
      dispatch(resetReduxStripeData())
      dispatch(setSelectedChurch(next))
    },
    [dispatch],
  )
}

/** Keeps the selection pointing at a church the person still belongs to, with up-to-date rights. */
export const useKeepChurchSelected = () => {
  const dispatch = useDispatch()
  const selected = useSelector(selectSelectedChurch)
  const { data: churches } = useMyChurches()
  const switchChurch = useSwitchChurch()
  useEffect(() => {
    // Not loaded yet, or a body that isn't a list: keep what is selected.
    if (!Array.isArray(churches)) return
    const current = churches.find((c) => c.id === selected?.id)
    if (current) {
      // Same church: refresh its name, rights and connections without clearing anything.
      if (!isEqual(current, selected)) dispatch(setSelectedChurch(current))
      return
    }
    switchChurch(churches.find((c) => c.isActive) ?? churches[0] ?? null)
  }, [churches]) // eslint-disable-line react-hooks/exhaustive-deps
}
