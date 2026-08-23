import { updateUserToken } from '@/common/api/user'
import Loading from '@/common/components/loading/Loading'
import { mainRoute, route, routeSettings } from '@/common/constant/route'
import { setAccountState } from '@/redux/common'
import { RootState } from '@/redux/store'
import axios from 'axios'
import React, { FC, useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router'
import { Link } from 'react-router-dom'

interface CallBackProps {}
const { REACT_APP_API_PATH } = process.env

const CallBack: FC<CallBackProps> = ({}) => {
  const subscribed = useRef(false)
  const navigate = useNavigate()
  const [loading, setLoading] = useState<boolean>(false)
  const [hasError, setHasError] = useState<boolean>(false)
  const dispatch = useDispatch()
  const { role } = useSelector((state: RootState) => state.common.user)
  const { clientEmail, clientId } = useSelector(
    (state: RootState) => state.common.selectdClient,
  )

  const loadQbo = useCallback(async () => {
    const url = window.location.href
    const urlParams = new URLSearchParams(window.location.search)
    const realmId = urlParams.get('realmId')
    if (realmId) {
      setLoading(true)
      try {
        const res = await axios.post(`${REACT_APP_API_PATH}callBackQBO`, {
          url,
        })
        const { access_token, refresh_token, tokenJwt } = res.data
        if (access_token && role === 'client') {
          dispatch(
            setAccountState({
              type: 'qbo',
              access_token,
              refresh_token,
              realm_id: realmId,
            }),
          )
          navigate(routeSettings.INTEGRATIONS)
        } else {
          const tokenObject = {
            email: clientEmail,
            token_type: 'qbo',
            access_token,
            refresh_token,
            realm_id: realmId,
            userId: clientId,
          }

          const res = await updateUserToken({
            ...tokenObject,
          })

          if (res) {
            //
          } else {
            // failNotification({ title: res.message })
          }
          navigate(mainRoute.CLIENT_LIST)
        }
      } catch (e: any) {
        console.log(e)
        setHasError(true)
        // NOTE: create a redirect or history here
      } finally {
        setLoading(false)
      }
    }
  }, [])

  const loadPC = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search)
    const hasCode = urlParams.get('code')
    const realmId = urlParams.get('realmId') //qbo
    const scope = urlParams.get('scope') //stripe

    if (hasCode && !realmId && !scope) {
      setLoading(true)
      try {
        const res = await axios.post(`${REACT_APP_API_PATH}callBackPC`, {
          code: hasCode,
        })
        const { access_token, refresh_token, tokenJwt } = res.data
        if (access_token && role === 'client') {
          dispatch(
            setAccountState({ type: 'pco', access_token, refresh_token }),
          )
          navigate(routeSettings.INTEGRATIONS)
        } else {
          const tokenObject = {
            email: clientEmail,
            token_type: 'pco',
            access_token,
            refresh_token,
            userId: clientId,
          }

          const res = await updateUserToken({
            ...tokenObject,
          })

          if (res) {
            //
          } else {
            // failNotification({ title: res.message })
          }
          navigate(mainRoute.CLIENT_LIST)
        }
      } catch (e: any) {
        console.log(e)
        setHasError(true)
        // NOTE: create a redirect or history here
      } finally {
        setLoading(false)
      }
    }
  }, [])

  const loadStripe = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search)
    const hasCode = urlParams.get('code')
    const scope = urlParams.get('scope') //stripe

    if (hasCode && scope) {
      setLoading(true)
      try {
        const res = await axios.post(`${REACT_APP_API_PATH}callBackStripe`, {
          code: hasCode,
        })
        const { access_token, refresh_token, tokenJwt } = res.data
        if (access_token && role === 'client') {
          dispatch(
            setAccountState({ type: 'stripe', access_token, refresh_token }),
          )
          navigate(routeSettings.INTEGRATIONS)
        } else {
          const tokenObject = {
            email: clientEmail,
            token_type: 'stripe',
            access_token,
            refresh_token,
            userId: clientId,
          }

          const res = await updateUserToken({
            ...tokenObject,
          })

          if (res) {
            //
          } else {
            // failNotification({ title: res.message })
          }
          navigate(mainRoute.CLIENT_LIST)
        }
      } catch (e: any) {
        console.log(e)
        setHasError(true)
        // NOTE: create a redirect or history here
      } finally {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const hasCode = urlParams.get('code')
    if (!subscribed.current && hasCode) {
      loadQbo()
      loadPC()
      loadStripe()
    }
    return () => {
      subscribed.current = true
    }
  }, [])

  if (hasError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 font-lato px-6">
        <div className="w-full max-w-md flex flex-col items-center text-center gap-4 bg-white shadow-xl rounded-2xl p-10">
          <h1 className="font-medium text-2xl text-gray-800">
            We couldn&apos;t finish connecting
          </h1>
          <p className="text-gray-500">
            Something went wrong while finishing the connection. Please go back
            and try connecting your account again.
          </p>
          <Link
            to={role === 'client' ? routeSettings.INTEGRATIONS : route.SECONDARY_LOGIN}
            className="bg-yellow rounded-full shadow-sm h-12 mt-4 flex justify-center items-center hover:bg-slate-600 [&>*]:text-white px-8"
          >
            <p>Back to connect</p>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <Loading />
      <p className="font-lato text-gray-500">Finishing connection…</p>
    </div>
  )
}

export default CallBack
