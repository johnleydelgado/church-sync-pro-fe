import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { mainRoute } from '@/common/constant/route'
import { setReduxQboData } from '@/redux/qbo'
import { getActiveStripeList, getQboData } from '@/common/api/qbo'
import { setReduxStripeData } from '@/redux/stripe'
import { CLOSE_MODAL } from '@/redux/common'
import { MODALS_NAME } from '@/common/constant/modal'
import { useChurch } from '@/common/hooks/useChurch'

const BackgroundDataFetcher = () => {
  const location = useLocation()
  const dispatch = useDispatch()
  const { email, churchId } = useChurch()

  useEffect(() => {
    // Set when the route or church changes again before the answers arrive: a late answer
    // belongs to the church being left and must not overwrite the new one's lists.
    let cancelled = false

    const fetchData = async () => {
      dispatch(CLOSE_MODAL(MODALS_NAME.subscriptionModal))

      // No church, nothing to load - and nothing to clear the shared lists with.
      if (!churchId) return

      if (
        location.pathname === mainRoute.AUTOMATION_MAPPING ||
        location.pathname === mainRoute.TRANSACTION ||
        location.pathname.startsWith('/transaction/view-page-stripe')
      ) {
        const fetchedQBOData = await getQboData(email)

        const fetchedStripeListData = await getActiveStripeList(email)
        if (cancelled) return
        dispatch(setReduxQboData(fetchedQBOData))
        dispatch(setReduxStripeData(fetchedStripeListData))
      }
    }

    fetchData() // Call the async function inside useEffect
    return () => {
      cancelled = true
    }
    // churchId: a switch reloads the selected church's QuickBooks and Stripe lists.
  }, [location, churchId]) // eslint-disable-line react-hooks/exhaustive-deps

  return null // This component doesn't render any UI
}

export default BackgroundDataFetcher
