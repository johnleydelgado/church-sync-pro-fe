import React, { FC, useMemo, useState } from 'react'
import { FiEdit, FiXCircle } from 'react-icons/fi'
import { FaChurch, FaCheckCircle } from 'react-icons/fa' // Checkmark icon
import { format } from 'date-fns'
import qboIcon from '@/common/assets/qbo-icon.png'
import pcoIcon from '@/common/assets/pco-icon.png'
import stripeIcon from '@/common/assets/stripe.png'
import { ClientBookkeeper } from '@/common/constant/global-interfaces'
import { authApi } from '@/common/api/auth'
import { useDispatch } from 'react-redux'
import { setSelectedClient } from '@/redux/common'

interface ClientTableRowProps {
  client: ClientBookkeeper
  onDelete: () => void
}

interface LoadingProps {
  stripeLoading: boolean
  pcoLoading: boolean
  qboLoading: boolean
}

const ClientTableRow: FC<ClientTableRowProps> = ({ client, onDelete }) => {
  const isDisabled = useMemo(() => !client.isActive, [client.isActive])
  const [isBtnLoading, setIsBtnLoading] = useState<LoadingProps>({
    stripeLoading: false,
    pcoLoading: false,
    qboLoading: false,
  })
  const dispatch = useDispatch()

  const selectClientHandler = () => {
    dispatch(
      setSelectedClient({ clientEmail: client.email, clientId: client.id }),
    )
  }
  const qboLoginHandler = async () => {
    setIsBtnLoading({ ...isBtnLoading, qboLoading: true })
    selectClientHandler()
    const authUri = await authApi('authQB')
    window.location.href = authUri
  }

  const pcLoginHandler = async () => {
    setIsBtnLoading({ ...isBtnLoading, pcoLoading: true })
    selectClientHandler()
    const authUri = await authApi('authPC')
    window.location.href = authUri
  }
  const stripeLoginHandler = async () => {
    setIsBtnLoading({ ...isBtnLoading, stripeLoading: true })
    selectClientHandler()
    const authUri = await authApi('authStripe')
    window.location.href = authUri
  }

  // Check if the client has tokens for QBO, Stripe, or PCO
  const hasQboToken = client.tokens?.some((token) => token.token_type === 'qbo')
  const hasStripeToken = client.tokens?.some(
    (token) => token.token_type === 'stripe',
  )
  const hasPcoToken = client.tokens?.some((token) => token.token_type === 'pco')

  return (
    <tr
      className={`${isDisabled ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'}`}
    >
      <td className="px-6 py-4">
        <div className="flex items-center space-x-3">
          {client.img_url ? (
            <img
              src={client.img_url}
              alt={client.churchName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <FaChurch size={40} className="text-gray-400" />
          )}
          <div>
            <p
              className={`text-sm font-medium ${
                isDisabled ? 'text-gray-400' : ''
              }`}
            >
              {client.churchName}
            </p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <p className={isDisabled ? 'text-gray-400' : ''}>
          {client.isActive ? 'Active' : 'Inactive'}
        </p>
      </td>
      <td className="px-6 py-4 text-right">
        <p className={isDisabled ? 'text-gray-400' : ''}>
          {client.createdAt
            ? format(new Date(client.createdAt), 'MMM d, yyyy')
            : 'N/A'}
        </p>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex justify-center items-center space-x-3">
          {/* QBO Button */}
          <button
            onClick={hasQboToken ? undefined : qboLoginHandler}
            disabled={isDisabled}
            className={isDisabled ? 'cursor-not-allowed opacity-50' : ''}
          >
            {hasQboToken ? (
              <FaCheckCircle size={24} className="text-green-500" />
            ) : (
              <img src={qboIcon} alt="QuickBooks" className="w-6 h-6" />
            )}
          </button>

          {/* PCO Button */}
          <button
            onClick={hasPcoToken ? undefined : pcLoginHandler}
            disabled={isDisabled}
            className={isDisabled ? 'cursor-not-allowed opacity-50' : ''}
          >
            {hasPcoToken ? (
              <FaCheckCircle size={24} className="text-green-500" />
            ) : (
              <img src={pcoIcon} alt="Planning Center" className="w-6 h-6" />
            )}
          </button>

          {/* Stripe Button */}
          <button
            onClick={hasStripeToken ? undefined : stripeLoginHandler}
            disabled={isDisabled}
            className={isDisabled ? 'cursor-not-allowed opacity-50' : ''}
          >
            {hasStripeToken ? (
              <FaCheckCircle size={24} className="text-green-500" />
            ) : (
              <img src={stripeIcon} alt="Stripe" className="w-6 h-6" />
            )}
          </button>
        </div>
      </td>
      <td className="px-6 py-4 text-right space-x-3">
        <button
          className={`text-primary ${
            isDisabled
              ? 'cursor-not-allowed opacity-50'
              : 'hover:text-secondary'
          }`}
          aria-label="Edit"
          disabled={isDisabled}
        >
          <FiEdit size={20} />
        </button>
        <button
          className={`text-red-500 ${
            isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:text-red-700'
          }`}
          aria-label="Remove"
          onClick={isDisabled ? undefined : onDelete}
          disabled={isDisabled}
        >
          <FiXCircle size={20} />
        </button>
      </td>
    </tr>
  )
}

export default ClientTableRow
