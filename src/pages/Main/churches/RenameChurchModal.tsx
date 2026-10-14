import React, { FC, FormEvent, useEffect, useRef, useState } from 'react'
import { useQueryClient } from 'react-query'
import { Dialog, Transition } from '@headlessui/react'
import { Button } from '@material-tailwind/react'
import { MdChurch } from 'react-icons/md'
import { ChurchApiError, MyChurch, updateChurch } from '@/common/api/church'
import { MY_CHURCHES_KEY } from '@/common/hooks/useChurch'
import { successNotification } from '@/common/utils/toast'

interface RenameChurchModalProps {
  /** The church being renamed; null keeps the dialog closed. */
  church: MyChurch | null
  onClose: () => void
}

/** Rename a church (owners). The sidebar, Profile and every list pick the new name up. */
const RenameChurchModal: FC<RenameChurchModalProps> = ({ church, onClose }) => {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  // State updates land after a re-render; a quick double click must not send two renames.
  const inFlight = useRef(false)

  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (church) {
      setName(church.name)
      setError(null)
    }
  }, [church])

  const close = () => {
    // Once the request is out, let it finish: closing would hide its answer.
    if (!inFlight.current) onClose()
  }

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!church || inFlight.current) return
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Enter the church name.')
      inputRef.current?.focus()
      return
    }
    if (trimmed === church.name) {
      onClose()
      return
    }

    inFlight.current = true
    setPending(true)
    setError(null)
    try {
      await updateChurch(church.id, { name: trimmed })
    } catch (err) {
      // A duplicate name among the person's churches comes back as the server's sentence.
      setError(
        err instanceof ChurchApiError && err.message
          ? err.message
          : 'Could not rename the church.',
      )
      inFlight.current = false
      setPending(false)
      inputRef.current?.focus()
      return
    }
    inFlight.current = false
    setPending(false)
    onClose()
    successNotification({ title: `Renamed to ${trimmed}.` })
    // A list fetch already on its way may have left before the rename; replace it.
    queryClient.invalidateQueries(
      { queryKey: MY_CHURCHES_KEY },
      { cancelRefetch: true },
    )
  }

  return (
    <Transition appear show={!!church} as={React.Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={close}
        initialFocus={inputRef}
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
                <div className="flex items-center justify-between">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-semibold text-primary"
                  >
                    Rename church
                  </Dialog.Title>
                  <MdChurch
                    size={24}
                    className="text-gray-500"
                    aria-hidden="true"
                  />
                </div>

                <form onSubmit={submit} noValidate className="pt-4">
                  <label
                    htmlFor="rename-church-name"
                    className="block pb-2 text-sm text-gray-600"
                  >
                    Church name
                  </label>
                  <input
                    ref={inputRef}
                    id="rename-church-name"
                    type="text"
                    autoComplete="off"
                    value={name}
                    // Not `disabled`: a disabled input drops focus, and a server error puts it back here.
                    readOnly={pending}
                    maxLength={255}
                    aria-invalid={!!error}
                    aria-describedby={error ? 'rename-church-error' : undefined}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (error) setError(null)
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-1 read-only:bg-gray-50 ${
                      error
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-primary focus:ring-primary'
                    }`}
                  />
                  {error ? (
                    <p
                      id="rename-church-error"
                      role="alert"
                      className="pt-2 text-sm text-red-600"
                    >
                      {error}
                    </p>
                  ) : null}

                  <div className="flex justify-end gap-3 pt-6">
                    <Button
                      type="button"
                      size="sm"
                      variant="outlined"
                      onClick={close}
                      disabled={pending}
                      className="border-gray-300 normal-case text-gray-600"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={pending}
                      className="bg-primary normal-case"
                    >
                      {pending ? 'Renaming…' : 'Rename'}
                    </Button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default RenameChurchModal
