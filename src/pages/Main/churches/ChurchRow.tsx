import React, { FC } from 'react'
import { FaChurch } from 'react-icons/fa'
import { MyChurch } from '@/common/api/church'
import {
  ChurchIntegration,
  IntegrationStatus,
  SelectedBadge,
  StatusPill,
  roleLabel,
} from './components/churchBits'

export interface ChurchActionsProps {
  church: MyChurch
  isSelected: boolean
  /** Which of this church's Connect buttons is on its way to the sign-in page, if any. */
  starting: ChurchIntegration | null
  /** A Connect click (for any church) is already on its way. */
  connectBusy: boolean
  onConnect: (type: ChurchIntegration) => void
  onOpen: () => void
  onPeople: () => void
  /** Owners only (`canManagePeople`); the page passes nothing to anyone else. */
  onToggleActive?: () => void
  /** Owners only, like `onToggleActive`. */
  onRename?: () => void
}

/** One church in the desktop table. */
const ChurchRow: FC<ChurchActionsProps> = ({
  church,
  isSelected,
  starting,
  connectBusy,
  onConnect,
  onOpen,
  onPeople,
  onToggleActive,
  onRename,
}) => {
  const muted = !church.isActive

  return (
    <tr className={muted ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'}>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <FaChurch
            size={32}
            className={`shrink-0 ${muted ? 'text-gray-300' : 'text-gray-400'}`}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={`text-sm font-medium ${
                  muted ? 'text-gray-400' : 'text-gray-800'
                }`}
              >
                {church.name}
              </p>
              {isSelected ? <SelectedBadge /> : null}
            </div>
            <p className="text-xs text-gray-500">{roleLabel(church)}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <IntegrationStatus
          church={church}
          type="qbo"
          starting={starting === 'qbo'}
          disabled={connectBusy}
          onConnect={() => onConnect('qbo')}
        />
      </td>
      <td className="px-6 py-4">
        <IntegrationStatus
          church={church}
          type="pco"
          starting={starting === 'pco'}
          disabled={connectBusy}
          onConnect={() => onConnect('pco')}
        />
      </td>
      <td className="px-6 py-4">
        <StatusPill isActive={church.isActive} />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-4 text-sm font-medium">
          <button
            type="button"
            onClick={onOpen}
            aria-label={`Open ${church.name}`}
            className="rounded-lg bg-primary px-3 py-1 text-white hover:opacity-90"
          >
            Open
          </button>
          <button
            type="button"
            onClick={onPeople}
            aria-label={`People on ${church.name}`}
            className="text-primary hover:underline"
          >
            People
          </button>
          {onRename ? (
            <button
              type="button"
              onClick={onRename}
              aria-label={`Rename ${church.name}`}
              className="text-primary hover:underline"
            >
              Rename
            </button>
          ) : null}
          {onToggleActive ? (
            <button
              type="button"
              onClick={onToggleActive}
              aria-label={`${church.isActive ? 'Deactivate' : 'Reactivate'} ${
                church.name
              }`}
              className={
                church.isActive
                  ? 'text-red-600 hover:underline'
                  : 'text-green-700 hover:underline'
              }
            >
              {church.isActive ? 'Deactivate' : 'Reactivate'}
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  )
}

export default ChurchRow
