import React, { FC } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Button } from '@material-tailwind/react'
import { HiOutlineExclamationCircle } from 'react-icons/hi'

import { formatDate } from '@/common/utils/helper'

interface ConfirmPostDialogProps {
  /** The day awaiting confirmation, YYYY-MM-DD, or null when nothing is pending. */
  day: string | null
  /** The church's cutoff, for the sentence explaining why this is being asked. */
  syncStartDay: string | null
  onCancel: () => void
  onConfirm: (day: string) => void
}

/**
 * The one thing standing between a misclick and a month of history landing in QuickBooks.
 *
 * Posting a day before the church's sync start date is allowed - sometimes an old day genuinely
 * needs bringing across - but it is never the thing someone meant to do by reflex, so it is
 * asked about by name and by date rather than merely warned about in a tooltip.
 *
 * Only excluded days reach this. A day inside the church's range posts on the first click.
 */
const ConfirmPostDialog: FC<ConfirmPostDialogProps> = ({
  day,
  syncStartDay,
  onCancel,
  onConfirm,
}) => (
  <Transition appear show={!!day} as={React.Fragment}>
    <Dialog as="div" className="relative z-50" onClose={onCancel}>
      <Transition.Child
        as={React.Fragment}
        enter="ease-out duration-200"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-150"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="fixed inset-0 bg-black bg-opacity-25" />
      </Transition.Child>

      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all">
              <div className="flex items-start gap-3">
                <HiOutlineExclamationCircle
                  size={24}
                  className="mt-0.5 shrink-0 text-amber-500"
                />
                <div>
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-semibold text-primary"
                  >
                    Post a day you excluded?
                  </Dialog.Title>
                  <p className="pt-2 text-sm text-gray-500">
                    {day ? formatDate(day) : ''} is before your sync start date
                    {syncStartDay ? ` of ${formatDate(syncStartDay)}` : ''}, so
                    it was left out on purpose.
                  </p>
                  <p className="pt-2 text-sm text-gray-500">
                    Posting it writes a real journal entry to QuickBooks dated
                    that day.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <Button
                  size="sm"
                  variant="outlined"
                  onClick={onCancel}
                  className="border-gray-300 normal-case text-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => day && onConfirm(day)}
                  className="bg-yellow normal-case"
                >
                  Post anyway
                </Button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </div>
    </Dialog>
  </Transition>
)

export default ConfirmPostDialog
