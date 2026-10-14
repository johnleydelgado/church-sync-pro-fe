import React, { FC } from 'react'
import { FaChurch } from 'react-icons/fa'
import { MyChurch } from '@/common/api/church'
import { SelectedBadge, StatusPill, roleLabel } from './components/churchBits'

interface ChurchCardProps {
  church: MyChurch
  isSelected: boolean
  onOpen: () => void
  onPeople: () => void
  /** Owners only (`canManagePeople`). */
  onRename?: () => void
}

/** One church on a phone: who you are on it, whether it is active, and the way in. */
const ChurchCard: FC<ChurchCardProps> = ({
  church,
  isSelected,
  onOpen,
  onPeople,
  onRename,
}) => (
  <div
    className={`rounded-lg p-4 shadow ${
      church.isActive ? 'bg-white' : 'bg-gray-50'
    }`}
  >
    <div className="flex items-start gap-3">
      <FaChurch size={32} className="shrink-0 text-gray-400" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={`text-sm font-medium ${
              church.isActive ? 'text-gray-800' : 'text-gray-400'
            }`}
          >
            {church.name}
          </p>
          {isSelected ? <SelectedBadge /> : null}
        </div>
        <p className="text-xs text-gray-500">{roleLabel(church)}</p>
      </div>
      <StatusPill isActive={church.isActive} />
    </div>
    <div className="mt-4 flex gap-3 text-sm font-medium">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${church.name}`}
        className="flex-1 rounded-lg bg-primary px-3 py-2 text-white hover:opacity-90"
      >
        Open
      </button>
      <button
        type="button"
        onClick={onPeople}
        aria-label={`People on ${church.name}`}
        className="flex-1 rounded-lg border border-primary px-3 py-2 text-primary"
      >
        People
      </button>
    </div>
    {onRename ? (
      <button
        type="button"
        onClick={onRename}
        aria-label={`Rename ${church.name}`}
        className="mt-3 text-sm font-medium text-primary hover:underline"
      >
        Rename
      </button>
    ) : null}
  </div>
)

export default ChurchCard
