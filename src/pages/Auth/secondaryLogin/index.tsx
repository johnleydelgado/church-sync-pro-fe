import axios from 'axios'
import React, { FC, useCallback, useEffect, useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { signOut } from 'supertokens-web-js/recipe/session'
import { storage, storageKey } from '@/common/utils/storage'
import LoginButton from './components/LoginButton'
import bgImage from '../../../common/assets/doodle.png'
import pcLogin from '../../../common/assets/planning-center-btn.png'
import qboLogin from '../../../common/assets/qbo_login.png'
import stripeLogin from '../../../common/assets/stripe.png'

import Loading from '../../../common/components/loading/Loading'
import { resetUserData, setThirdPartyTokens } from '../../../redux/common'
import { RootState } from '../../../redux/store'
import checkToken from '@/common/utils/tokenVerification'
import { doesEmailExistRoute } from '@/common/utils/supertoken'
import { route } from '@/common/constant/route'
import { addTokenInUser } from '@/common/api/user'
import { authApi } from '@/common/api/auth'
const { REACT_APP_API_PATH } = process.env

interface indexProps {}

interface LoadingProps {
  stripeLoading: boolean
  pcoLoading: boolean
  qboLoading: boolean
}

const SecondaryLogin: FC<indexProps> = () => {
  const subscribed = useRef(false)
  const [loading, setLoading] = useState<boolean>(false)

  const { thirdPartyTokens } = useSelector((state: RootState) => state.common)
  const { email } = useSelector((state: RootState) => state.common.user)
  const [isBtnLoading, setIsBtnLoading] = useState<LoadingProps>({
    stripeLoading: false,
    pcoLoading: false,
    qboLoading: false,
  })

  const qboToken = storage.getToken(storageKey.QBQ_ACCESS_TOKEN)
  const pcToken = storage.getToken(storageKey.PC_ACCESS_TOKEN)

  const dispatch = useDispatch()

  const qboLoginHandler = async () => {
    setIsBtnLoading({ ...isBtnLoading, qboLoading: true })
    const authUri = await authApi('authQB')
    window.location.href = authUri
  }

  const pcLoginHandler = async () => {
    setIsBtnLoading({ ...isBtnLoading, pcoLoading: true })
    const authUri = await authApi('authPC')
    window.location.href = authUri
  }

  const stripeLoginHandler = async () => {
    setIsBtnLoading({ ...isBtnLoading, stripeLoading: true })
    const authUri = await authApi('authStripe')
    window.location.href = authUri
  }

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
          await addTokenInUser({
            access_token_qbo: access_token,
            refresh_token_qbo: refresh_token,
            realm_id: realmId,
            email,
          })

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
  }, [dispatch, thirdPartyTokens, email])

  const loadPC = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search)
    const hasCode = urlParams.get('code')
    const realmId = urlParams.get('realmId') //qbo
    const scope = urlParams.get('scope') //stripe

    if (hasCode && !realmId && !scope) {
      setLoading(true)
      console.log('hasCode', hasCode)
      try {
        const res = await axios.post(`${REACT_APP_API_PATH}callBackPC`, {
          code: hasCode,
        })
        const { access_token, refresh_token, tokenJwt } = res.data

        await addTokenInUser({
          access_token_pc: access_token,
          refresh_token_pc: refresh_token,
          email,
        })

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
  }, [dispatch, thirdPartyTokens, email])

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
        const { access_token, refresh_token } = res.data

        await addTokenInUser({
          access_token_stripe: access_token,
          refresh_token_stripe: refresh_token,
          email,
        })

        if (access_token) {
          dispatch(
            setThirdPartyTokens({
              ...thirdPartyTokens,
              stripe_access_token: access_token,
              stripe_refresh_token: refresh_token,
            }),
          )
        }
      } catch (e: any) {
        console.log(e)
        // NOTE: create a redirect or history here
      } finally {
        setLoading(false)
      }
    }
  }, [dispatch, thirdPartyTokens, email])

  const checkSession = useCallback(async () => {
    if (!(await doesEmailExistRoute({ email }))) {
      window.location.href = route.SIGNUP
    }
  }, [email])

  async function onLogout() {
    await signOut()
    dispatch(resetUserData())
    storage.removeToken(storageKey.PC_ACCESS_TOKEN)
    storage.removeToken(storageKey.QBQ_ACCESS_TOKEN)
    window.location.href = route.ROOT
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const hasCode = urlParams.get('code')
    checkSession()
    if (!subscribed.current && hasCode) {
      loadQbo()
      loadPC()
      loadStripe()
    }
    return () => {
      subscribed.current = true
    }
  }, [checkSession, loadPC, loadQbo])

  if (
    !!checkToken(qboToken) &&
    !!checkToken(pcToken) &&
    !!thirdPartyTokens?.stripe_access_token
  ) {
    window.location.reload()
  }

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
                isLoading={isBtnLoading.qboLoading}
              />
              <LoginButton
                loginImage={pcLogin}
                onClick={pcLoginHandler}
                name="Already connected to Planning Center"
                isHide={!!checkToken(pcToken)}
                isLoading={isBtnLoading.pcoLoading}
              />
              <LoginButton
                loginImage={stripeLogin}
                onClick={stripeLoginHandler}
                name="Already connected to Stripe Connect"
                isHide={!!thirdPartyTokens?.stripe_access_token}
                isLoading={isBtnLoading.stripeLoading}
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
