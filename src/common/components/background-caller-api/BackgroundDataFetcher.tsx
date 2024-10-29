import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { mainRoute } from '@/common/constant/route'
import { setReduxQboData } from '@/redux/qbo'
import { getActiveStripeList, getQboData } from '@/common/api/qbo'
import { RootState } from '@/redux/store'
import { useSelector } from 'react-redux'
import { setReduxStripeData } from '@/redux/stripe'
import { CLOSE_MODAL } from '@/redux/common'
import { MODALS_NAME } from '@/common/constant/modal'

const BackgroundDataFetcher = () => {
  const location = useLocation()
  const dispatch = useDispatch()
  const { user, bookkeeper } = useSelector((state: RootState) => state.common)

  useEffect(() => {
    const fetchData = async () => {
      dispatch(CLOSE_MODAL(MODALS_NAME.subscriptionModal))

      if (location.pathname === mainRoute.AUTOMATION_MAPPING) {
        const fetchedQBOData = await getQboData(user, bookkeeper)

        const fetchedStripeListData = await getActiveStripeList(
          user,
          bookkeeper,
        )
        dispatch(setReduxQboData(fetchedQBOData))
        dispatch(setReduxStripeData(fetchedStripeListData))
      }
    }

    fetchData() // Call the async function inside useEffect
  }, [location, dispatch]) // Include all dependencies

  return null // This component doesn't render any UI
}

export default BackgroundDataFetcher
