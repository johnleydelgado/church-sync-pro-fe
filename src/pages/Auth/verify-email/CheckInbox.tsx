import { Button, Spinner } from 'flowbite-react'
import { FC, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Session from 'supertokens-web-js/recipe/session'

import { route } from '@/common/constant/route'
import { sendEmail } from '@/common/utils/supertoken'

import bgImage from '../../../common/assets/bg-registration.png'

// Shown after sign-up, and after a login by an account that has not confirmed its email
// yet. The session exists (it is what lets "Resend" work) but PERSONAL_TOKEN is not set,
// so every private route still bounces to the login page.
const CheckInbox: FC = () => {
  const location = useLocation()
  const email: string | undefined = location.state?.email
  const [sending, setSending] = useState(false)

  const resend = async () => {
    setSending(true)
    try {
      await sendEmail()
    } finally {
      setSending(false)
    }
  }

  const backToLogin = async () => {
    await Session.signOut()
    window.location.href = route.ROOT
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
              <p className="text-2xl">Check your inbox</p>
              <div className="border-[0.5px] w-52" />
              <p className="text-slate-700">
                We sent a confirmation link to{' '}
                <span className="font-semibold">
                  {email ?? 'your email address'}
                </span>
                . Open it to finish creating your account.
              </p>
              <p className="text-sm text-slate-500">
                Nothing there? Check your spam folder, or send it again.
              </p>
              <Button
                className="bg-btmColor rounded-md shadow-sm h-12 w-full hover:bg-slate-600 [&>*]:text-white"
                onClick={resend}
                disabled={sending}
              >
                {sending ? <Spinner className="mr-8" /> : <p>Resend email</p>}
              </Button>
              <button
                type="button"
                className="text-sm text-slate-600 underline"
                onClick={backToLogin}
              >
                Back to sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckInbox
