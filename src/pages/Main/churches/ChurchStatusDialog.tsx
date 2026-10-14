import React, { FC } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Button } from '@material-tailwind/react'
import { HiOutlineExclamationCircle } from 'react-icons/hi'
import { MyChurch } from '@/common/api/church'

interface ChurchStatusDialogProps {
  /** The church being deactivated or reactivated, or null when nothing is asked. */
  church: MyChurch | null
  saving: boolean
  /** The server's sentence when the change failed; the dialog stays open to try again. */
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}

/** Asks before an owner deactivates (or reactivates) a church. */
const ChurchStatusDialog: FC<ChurchStatusDialogProps> = ({
  church,
  saving,
  error,
  onCancel,
  onConfirm,
}) => {
  // Kept through the closing transition, when `church` is already null.
  const last = React.useRef<MyChurch | null>(church)
  if (church) last.current = church
  const shown = church ?? last.current
  const deactivating = !!shown?.isActive

  return (
    <Transition appear show={!!church} as={React.Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        // Nothing to cancel once the request is out.
        onClose={() => (saving ? undefined : onCancel())}
      >
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
                    className={`mt-0.5 shrink-0 ${
                      deactivating ? 'text-red-500' : 'text-amber-500'
                    }`}
                  />
                  <div>
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold text-primary"
                    >
                      {deactivating
                        ? `Deactivate ${shown?.name ?? ''}?`
                        : `Reactivate ${shown?.name ?? ''}?`}
                    </Dialog.Title>
                    <p className="pt-2 text-sm text-gray-500">
                      {deactivating
                        ? `Deactivating stops the nightly posting for ${
                            shown?.name ?? ''
                          }. People keep access and can reactivate it.`
                        : `Nightly posting picks up again for ${
                            shown?.name ?? ''
                          }, if auto-sync is on.`}
                    </p>
                    {error ? (
                      <p role="alert" className="pt-3 text-sm text-red-600">
                        {error}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6">
                  <Button
                    size="sm"
                    variant="outlined"
                    onClick={onCancel}
                    disabled={saving}
                    className="border-gray-300 normal-case text-gray-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={onConfirm}
                    disabled={saving}
                    className={`normal-case ${
                      deactivating ? 'bg-red-600' : 'bg-primary'
                    }`}
                  >
                    {saving
                      ? 'Saving...'
                      : deactivating
                      ? 'Deactivate'
                      : 'Reactivate'}
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default ChurchStatusDialog
