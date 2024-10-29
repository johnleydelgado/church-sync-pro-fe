import React, { FC, useEffect, useMemo, useRef, useState } from 'react'
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Typography,
  Button,
} from '@material-tailwind/react'
import { Link } from 'react-router-dom'
import logo from '../../common/assets/logo.png'
import items, { Item } from './constant'
import SubscriptionModal from './modal'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { CLOSE_MODAL, OPEN_MODAL } from '@/redux/common'
import { useDispatch } from 'react-redux'
import { MODALS_NAME } from '@/common/constant/modal'
import { CardItem } from './card'
const { REACT_APP_STRIPE_PUB_KEY } = process.env

interface planProps {}

const Plan: FC<planProps> = ({}) => {
  //   const stripePromise = useMemo(
  //     () => loadStripe('pk_test_6pRNASCoBOKtIshFeQd4XMUh'),
  //     [],
  //   )

  const [stripePromise, setStripePromise] = useState<any>(null)
  const [selectedTitle, setSelectedTitle] = useState<string>('')
  const [selectedAmount, setSelectedAmount] = useState<string>('')
  const [isOpen, setIsOpen] = useState<boolean>(false)

  const dispatch = useDispatch()
  const options = {
    mode: 'payment',
    amount: 1099,
    currency: 'usd',
  }

  const openModal = (title: string, amount: string) => {
    setSelectedTitle(title)
    setSelectedAmount(amount)
    dispatch(OPEN_MODAL(MODALS_NAME.subscriptionModal))
  }

  useEffect(() => {
    async function setupStripe() {
      try {
        const stripe = await loadStripe(REACT_APP_STRIPE_PUB_KEY || '')
        setStripePromise(stripe)
        // Initialize or do something with Stripe here
      } catch (error) {
        console.error('Error setting up Stripe:', error)
      }
    }

    setupStripe()
  }, [])

  return (
    <>
      {stripePromise && (
        <Elements
          stripe={stripePromise}
          options={{ ...options, mode: 'subscription' }}
        >
          <SubscriptionModal
            selectedTitle={selectedTitle}
            productPrice={selectedAmount}
          />
        </Elements>
      )}
      <section className="bg-white h-screen font-lato font-thin flex flex-col">
        <nav className="bg-white px-2 py-2.5 sm:px-4">
          <div className="container mx-auto flex flex-wrap items-center justify-between">
            <a className="flex">
              <img src={logo} className="mr-3 h-6 sm:h-9" alt="Logo" />
            </a>
            <button
              className="inline-flex items-center p-2 ml-3 text-sm text-gray-500 rounded-lg sm:hidden"
              onClick={() => setIsOpen(!isOpen)}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16m-7 6h7"
                />
              </svg>
            </button>
            <div
              className={`w-full sm:flex sm:items-center sm:w-auto ${
                isOpen ? 'block' : 'hidden'
              }`}
            >
              <div className="flex flex-col sm:flex-row gap-10 mt-4 sm:mt-0">
                <Link to="/" className="font-medium text-center">
                  Home
                </Link>
                <Link to="/" className="font-medium text-center">
                  Features
                </Link>
                <Link to="/" className="font-medium text-center">
                  Pricing
                  <div
                    className="bg-primary mt-2 w-full"
                    style={{ height: 1 }}
                  />
                </Link>
              </div>
              <div className="flex flex-col sm:flex-row space-x-0 sm:space-x-4 mt-4 sm:mt-0 items-center">
                <Link to="/" className="font-normal text-center">
                  Log In
                </Link>
                <Link
                  to="/"
                  className="font-medium border-primary border-2 rounded-xl p-2 text-center"
                >
                  Try it for free
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <div className="h-72 mx-auto flex justify-center items-center">
          <span className="font-semibold text-6xl text-primary">
            Subscriptions plan
          </span>
        </div>

        <div className="flex flex-col lg:flex-row justify-center gap-8 p-8 lg:-mt-20 transition-all duration-300 ease-linear items-center">
          {items.map((item, index) => (
            <CardItem
              key={index}
              index={index}
              item={item}
              buyNow={() => openModal(item.title, item.price)}
              className={`transition-transform duration-300 hover:z-10 ease-in-out ${
                index !== 1
                  ? 'lg:hover:scale-125'
                  : 'lg:scale-110 lg:hover:scale-125'
              }`}
            />
          ))}
        </div>
      </section>
    </>
  )
}

export default Plan
