import Loading from '@/common/components/loading/Loading'
import { mainRoute, routeSettings } from '@/common/constant/route'
import { setAccountState } from '@/redux/common'
import axios from 'axios'
import React, { FC, useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router'

interface CallBackProps {}
const { REACT_APP_API_PATH } = process.env

const CallBack: FC<CallBackProps> = ({}) => {
  const subscribed = useRef(false)
  const navigate = useNavigate()
  const [loading, setLoading] = useState<boolean>(false)
  const dispatch = useDispatch()

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
        if (access_token) {
          dispatch(
            setAccountState({
              type: 'qbo',
              access_token,
              refresh_token,
              realm_id: realmId,
            }),
          )
          navigate(routeSettings.INTEGRATIONS)
        }
      } catch (e: any) {
        console.log(e)
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
        if (access_token) {
          dispatch(
            setAccountState({ type: 'pco', access_token, refresh_token }),
          )
          navigate(routeSettings.INTEGRATIONS)
        }
      } catch (e: any) {
        console.log(e)
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
        if (access_token) {
          dispatch(
            setAccountState({ type: 'stripe', access_token, refresh_token }),
          )
          navigate(routeSettings.INTEGRATIONS)
        }
      } catch (e: any) {
        console.log(e)
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

  if (loading) return <Loading />

  return <div />
}

export default CallBack
