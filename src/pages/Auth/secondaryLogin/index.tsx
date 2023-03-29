import axios from 'axios'
import React, { FC, useCallback, useEffect, useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { doesSessionExist, signOut } from 'supertokens-web-js/recipe/session'

import LoginButton from './components/LoginButton'
import bgImage from '../../../common/assets/doodle.png'
import pcLogin from '../../../common/assets/planning-center-btn.png'
import qboLogin from '../../../common/assets/qbo_login.png'
import Loading from '../../../common/components/loading/Loading'
import { storage, storageKey } from '../../../common/utils/storage'
import { setThirdPartyTokens } from '../../../redux/common'
import { RootState } from '../../../redux/store'
import checkToken from '@/common/utils/tokenVerification'
import { SlLogout } from 'react-icons/sl'

interface indexProps {}

const SecondaryLogin: FC<indexProps> = () => {
  const subscribed = useRef(false)
  const [loading, setLoading] = useState<boolean>(false)

  const { thirdPartyTokens } = useSelector((state: RootState) => state.common)

  const qboToken = storage.getToken(storageKey.QBQ_ACCESS_TOKEN)
  const pcToken = storage.getToken(storageKey.PC_ACCESS_TOKEN)

  const dispatch = useDispatch()

  const qboLoginHandler = async () => {
    const res = await axios.get('http://localhost:8080/csp/authQB')
    const authUri = res.data
    window.location.href = authUri
  }

  const pcLoginHandler = async () => {
    const res = await axios.get('http://localhost:8080/csp/authPC')
    const authUri = res.data
    window.location.href = authUri
  }

  const loadQbo = useCallback(async () => {
    const url = window.location.href
    const urlParams = new URLSearchParams(window.location.search)
    const realmId = urlParams.get('realmId')

    if (realmId) {
      setLoading(true)
      console.log('realmId', realmId)
      try {
        const res = await axios.post('http://localhost:8080/csp/callBackQBO', {
          url,
        })
        const { access_token, refresh_token, tokenJwt } = res.data
        if (access_token) {
          dispatch(
            setThirdPartyTokens({
              ...thirdPartyTokens,
              qbo_access_token: access_token,
              qbo_refresh_token: refresh_token,
              qbo_realm_id: realmId,
            }),
          )
          storage.setLocalToken(tokenJwt, storageKey.QBQ_ACCESS_TOKEN)
        }
      } catch (e: any) {
        console.log(e)
        // NOTE: create a redirect or history here
      } finally {
        setLoading(false)
      }
    }
  }, [dispatch, thirdPartyTokens])

  const loadPC = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search)
    const hasCode = urlParams.get('code')
    const realmId = urlParams.get('realmId')

    if (hasCode && !realmId) {
      setLoading(true)
      console.log('hasCode', hasCode)
      try {
        const res = await axios.post('http://localhost:8080/csp/callBackPC', {
          code: hasCode,
        })
        console.log(res.data)
        const { access_token, refresh_token, tokenJwt } = res.data
        if (access_token) {
          dispatch(
            setThirdPartyTokens({
              ...thirdPartyTokens,
              PlanningCenter: access_token,
            }),
          )
          storage.setLocalToken(tokenJwt, storageKey.PC_ACCESS_TOKEN)
        }
      } catch (e: any) {
        console.log(e)
        // NOTE: create a redirect or history here
      } finally {
        setLoading(false)
      }
    }
  }, [dispatch, thirdPartyTokens])

  const checkSession = useCallback(async () => {
    const sessionExist = await doesSessionExist()
    if (!sessionExist) window.location.href = '/'
  }, [])

  async function onLogout() {
    await signOut()
    window.location.href = '/'
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const hasCode = urlParams.get('code')
    checkSession()
    if (!subscribed.current && hasCode) {
      loadQbo()
      loadPC()
    }
    return () => {
      subscribed.current = true
    }
  }, [checkSession, loadPC, loadQbo])

  if (!!checkToken(qboToken) && !!checkToken(pcToken)) window.location.reload()

  return (
    <div className="h-screen bg-slate-400">
      <div
        className="h-full flex-grow flex justify-center mx-auto items-center"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundPosition: 'center',
        }}
      >
        <div
          className={`bg-otherGray ${
            loading ? 'h-48' : 'h-fit'
          } w-72 rounded-lg shadow-xl`}
        >
          {loading ? (
            <Loading />
          ) : (
            <div className="flex flex-col justify-center p-4 gap-6">
              <p className="font-montserrat font-medium text-center text-lg">
                QBO and Planning Center
              </p>
              <LoginButton
                loginImage={qboLogin}
                onClick={qboLoginHandler}
                name="Already connected to Qbo"
                isHide={!!checkToken(qboToken)}
              />
              <LoginButton
                loginImage={pcLogin}
                onClick={pcLoginHandler}
                name="Already connected to Planning Center"
                isHide={!!checkToken(pcToken)}
              />
              <button
                className="px-4 py-2 flex gap-4 items-center transform transition-transform hover:scale-105
               rounded-lg bg-red-500 text-white justify-center"
                onClick={onLogout}
              >
                <span className="font-montserrat font-medium">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SecondaryLogin
