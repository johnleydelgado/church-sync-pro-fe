import React, { FC } from 'react'
import { HiCheck, HiOutlineExclamationCircle } from 'react-icons/hi'
import { Spinner } from 'flowbite-react'

/**
 * Auto-save status for one dropdown.
 *
 * Shown beside the field's own label rather than inside the control: react-select already owns
 * that space with its clear and chevron indicators, and a spinner there shifts them around as it
 * appears. The label row is empty and sits directly above the field, so the status is adjacent to
 * what the person just changed without moving anything.
 *
 * "Saved" is deliberately transient. A tick that never leaves stops being read after the first
 * time; one that fades says "that landed" and then gets out of the way. A failure does NOT fade -
 * unsaved work is the one thing here worth interrupting for.
 */
export type FieldSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const FieldStatus: FC<{ status: FieldSaveStatus }> = ({ status }) => {
  if (status === 'idle') return null

  if (status === 'saving') {
    return (
      <span
        className="flex items-center gap-1 text-xs font-normal text-gray-400"
        role="status"
        aria-live="polite"
      >
        <Spinner size="sm" className="h-3 w-3" />
        Saving
      </span>
    )
  }

  if (status === 'saved') {
    return (
      <span
        className="flex items-center gap-1 text-xs font-normal text-success"
        role="status"
        aria-live="polite"
      >
        <HiCheck size={14} />
        Saved
      </span>
    )
  }

  return (
    <span
      className="flex items-center gap-1 text-xs font-medium text-red-500"
      role="alert"
    >
      <HiOutlineExclamationCircle size={14} />
      Not saved
    </span>
  )
}

export default FieldStatus
