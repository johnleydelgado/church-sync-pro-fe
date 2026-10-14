import React, { FC } from 'react'
import { Spinner } from 'flowbite-react'
import { MyChurch } from '@/common/api/church'
import { INTEGRATION_NAME } from '@/common/hooks/useConnectIntegration'

export type ChurchIntegration = 'qbo' | 'pco'

export const roleLabel = (church: MyChurch) =>
  church.role === 'owner' ? 'Owner' : 'Bookkeeper'

export const SelectedBadge: FC = () => (
  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
    Selected
  </span>
)

export const StatusPill: FC<{ isActive: boolean }> = ({ isActive }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
      isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
    }`}
  >
    {isActive ? 'Active' : 'Inactive'}
  </span>
)

interface IntegrationStatusProps {
  church: MyChurch
  type: ChurchIntegration
  /** This button's connection is on its way to the sign-in page. */
  starting: boolean
  /** Another Connect click is already on its way; one at a time. */
  disabled: boolean
  onConnect: () => void
}

/** "Connected", a Connect button for those allowed to connect, or "Not connected". */
export const IntegrationStatus: FC<IntegrationStatusProps> = ({
  church,
  type,
  starting,
  disabled,
  onConnect,
}) => {
  if (church.connections?.[type]) {
    return (
      <span className="text-sm font-medium text-green-700">
        Connected <span aria-hidden="true">&#10003;</span>
      </span>
    )
  }
  if (church.canConnectIntegrations) {
    return (
      <button
        type="button"
        onClick={onConnect}
        disabled={disabled || starting}
        aria-busy={starting}
        aria-label={`Connect ${INTEGRATION_NAME[type]} for ${church.name}`}
        className="inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-1 text-sm font-medium text-primary hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-primary"
      >
        {starting ? <Spinner size="sm" className="h-3 w-3" /> : null}
        {starting ? 'Connecting…' : 'Connect'}
      </button>
    )
  }
  return <span className="text-sm text-gray-400">Not connected</span>
}
