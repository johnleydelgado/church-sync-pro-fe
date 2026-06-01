import React, { useMemo } from 'react'
import { FiEdit, FiXCircle } from 'react-icons/fi'
import { FaChurch } from 'react-icons/fa'
import { format } from 'date-fns'
import { ClientBookkeeper } from '@/common/constant/global-interfaces'

interface ClientCardProps {
  client: ClientBookkeeper
  onDelete: () => void
}

const ClientCard: React.FC<ClientCardProps> = ({ client, onDelete }) => {
  // Determine if the client is disabled (inactive)
  const isDisabled = useMemo(() => !client.isActive, [client.isActive])

  // Generate classNames based on isDisabled
  const cardClasses = useMemo(
    () =>
      `bg-white shadow rounded-lg p-4 ${
        isDisabled ? 'opacity-50 cursor-not-allowed' : ''
      }`,
    [isDisabled],
  )

  return (
    <div className={cardClasses}>
      <div className="flex items-center space-x-3 mb-2">
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
      <p className={`text-sm mb-2 ${isDisabled ? 'text-gray-400' : ''}`}>
        <span className="font-semibold">Status:</span>{' '}
        {client.isActive ? 'Active' : 'Inactive'}
      </p>
      <p className={`text-sm mb-2 ${isDisabled ? 'text-gray-400' : ''}`}>
        <span className="font-semibold">Date Created:</span>{' '}
        {client.createdAt
          ? format(new Date(client.createdAt), 'MMM d, yyyy')
          : 'N/A'}
      </p>
      <div className="flex space-x-4 mt-2">
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
      </div>
    </div>
  )
}

export default ClientCard
