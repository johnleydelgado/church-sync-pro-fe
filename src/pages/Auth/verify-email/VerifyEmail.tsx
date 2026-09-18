import { Button, Spinner } from 'flowbite-react'
import { FC, useEffect, useState } from 'react'
import { verifyEmail } from 'supertokens-web-js/recipe/emailverification'
import Session from 'supertokens-web-js/recipe/session'

import { route } from '@/common/constant/route'

import bgImage from '../../../common/assets/bg-registration.png'

type State = 'verifying' | 'verified' | 'invalid' | 'error'

// The target of the link in the verification email. The SDK reads ?token= from the URL
// itself. No session is needed to consume the token, so this works in any browser.
const VerifyEmail: FC = () => {
  const [state, setState] = useState<State>('verifying')

  useEffect(() => {
    let cancelled = false
    verifyEmail()
      .then((r) => {
        if (cancelled) return
        setState(r.status === 'OK' ? 'verified' : 'invalid')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const goToLogin = async () => {
    // A session may exist from the sign-up tab; drop it so login starts clean and
    // the fresh session carries the verified claim.
    try {
      await Session.signOut()
    } catch {
      // no session - fine
    }
    window.location.href = route.ROOT
  }

  const copy: Record<State, { title: string; body: string }> = {
    verifying: { title: 'Confirming your email…', body: '' },
    verified: {
      title: 'Email confirmed',
      body: 'Your account is ready. Sign in to get started.',
    },
    invalid: {
      title: 'This link has expired',
      body: 'Sign in and we will send you a fresh confirmation link.',
    },
    error: {
      title: 'Something went wrong',
      body: 'Please try the link again, or sign in to request a new one.',
    },
  }

  return (
    <div className="h-screen flex font-lato">
      <div
        className="flex-grow"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="flex w-full h-full justify-end items-center">
          <div
            style={{ backgroundColor: 'rgba(251, 251, 251, 0.8)' }}
            className="sm:w-96 xs:w-96 md:w-[520px] shadow-2xl rounded-3xl m-4 sm:mr-12"
          >
            <div className="flex flex-col gap-4 p-12 items-center text-center">
              <p className="text-2xl">{copy[state].title}</p>
              <div className="border-[0.5px] w-52" />
              {state === 'verifying' ? (
                <Spinner />
              ) : (
                <>
                  <p className="text-slate-700">{copy[state].body}</p>
                  <Button
                    className="bg-btmColor rounded-md shadow-sm h-12 w-full hover:bg-slate-600 [&>*]:text-white"
                    onClick={goToLogin}
                  >
                    <p>Go to sign in</p>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VerifyEmail
