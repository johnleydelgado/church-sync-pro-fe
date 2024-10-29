import { Dialog, Transition } from '@headlessui/react'
import React, { FC, Fragment, useEffect, useState } from 'react'
import {
  PaymentElement,
  Elements,
  useStripe,
  useElements,
  LinkAuthenticationElement,
  CardElement,
} from '@stripe/react-stripe-js'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import { MODALS_NAME } from '@/common/constant/modal'
import { useDispatch } from 'react-redux'
import { CLOSE_MODAL } from '@/redux/common'
import { Button } from '@material-tailwind/react'
import { createPaymentIntent } from '@/common/api/stripe'
import { lowerCase } from 'lodash'
interface modalProps {}

function getBaseUrl() {
  // Destructure the necessary components from window.location
  const { protocol, hostname, port } = window.location

  // Check if the hostname is 'localhost' which is common for development environments
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Include the port if running on localhost, as it's common to run on non-standard ports
    return `${protocol}//${hostname}:${port}`
  }
  // For production environments, typically no port is needed
  return `${protocol}//${hostname}`
}

const SubscriptionModal: FC<
  modalProps & { selectedTitle: string; productPrice: string }
> = ({ selectedTitle, productPrice }) => {
  const handleCloseModals = () => {
    dispatch(CLOSE_MODAL(MODALS_NAME.subscriptionModal))
  }
  const openModals = useSelector((state: RootState) => state.common.openModals)
  const dispatch = useDispatch()
  const stripe = useStripe()
  const elements = useElements()
  const [email, setEmail] = useState('')
  const title = lowerCase(selectedTitle) as
    | 'yearly'
    | 'monthly'
    | 'one time payment'

  const [errorMessage, setErrorMessage] = useState<string | null | undefined>(
    null,
  )

  const handleSubmit = async (event: any) => {
    event.preventDefault()

    if (elements == null || stripe == null) {
      return
    }

    // Trigger form validation and wallet collection
    const isSubscription =
      selectedTitle.toLowerCase().includes('monthly') ||
      selectedTitle.toLowerCase().includes('yearly')

    const paymentType = lowerCase(selectedTitle)
    const baseUrl = getBaseUrl()

    if (stripe && isSubscription) {
      const cardElement = elements?.getElement(CardElement)
      if (!cardElement) {
        return
      }
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: { email },
      })

      if (error) {
        setErrorMessage(error.message)
      } else {
        // Handle success for one-time payments, e.g., redirect or update UI
      }

      // Logic for setup intents (subscriptions)
      const setupRes = await createPaymentIntent({
        email,
        amount: productPrice,
        paymentType,
        paymentMethodId: paymentMethod?.id || '',
      })
      const { clientSecret: setupClientSecret } = setupRes

      if (stripe && setupClientSecret) {
        window.location.replace(baseUrl)
      }
    } else {
      // Logic for payment intents (one-time payments)
      const paymentRes = await createPaymentIntent({
        email,
        amount: productPrice,
        paymentType,
        paymentMethodId: '',
      })
      const { clientSecret } = paymentRes

      if (stripe && clientSecret && elements) {
        const { error: submitError } = await elements.submit()
        if (submitError) {
          setErrorMessage(submitError.message)
          return
        }

        const { error } = await stripe.confirmPayment({
          elements,
          clientSecret,
          confirmParams: {
            return_url: baseUrl,
          },
        })

        if (error) {
          setErrorMessage(error.message)
        } else {
          // Handle success for one-time payments, e.g., redirect or update UI
        }
      }
    }
  }

  if (!stripe && !elements) {
    return <div></div>
  }

  return (
    <Transition
      appear
      show={openModals.includes(MODALS_NAME.subscriptionModal)}
      as={Fragment}
    >
      <Dialog
        as="div"
        className="relative z-10"
        onClose={() => {
          return handleCloseModals()
        }}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-xl font-semibold leading-6 text-gray-900 pb-4"
                >
                  Stripe Payment
                </Dialog.Title>

                <form onSubmit={handleSubmit}>
                  <LinkAuthenticationElement
                    id="link-authentication-element"
                    // Access the email value like so:
                    onChange={(event) => {
                      setEmail(event.value.email)
                    }}
                    className="hide-label"

                    // Prefill the email field like so:
                    // options={{ defaultValues: { email: 'foo@bar.com' } }}
                  />
                  {title === 'one time payment' ? (
                    <PaymentElement id="payment-element" />
                  ) : (
                    <CardElement className="border-gray-200 rounded-md border-[1px] p-4 mt-4" />
                  )}
                  {/* <button type="submit" disabled={!stripe || !elements}>
                    Pay
                  </button> */}
                  <div className="flex items-center justify-end pt-8">
                    <Button type="submit" className="bg-greenText">
                      Pay
                    </Button>
                  </div>
                  {/* Show error message to your customers */}
                  {errorMessage && <div>{errorMessage}</div>}
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default SubscriptionModal
