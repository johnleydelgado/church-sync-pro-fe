import React, { FC, FormEvent, useEffect, useRef, useState } from 'react'
import { useQueryClient } from 'react-query'
import { useSelector } from 'react-redux'
import { Dialog, Transition } from '@headlessui/react'
import { Button } from '@material-tailwind/react'
import { MdChurch } from 'react-icons/md'
import { ChurchApiError, MyChurch, createChurch } from '@/common/api/church'
import { MY_CHURCHES_KEY, useSwitchChurch } from '@/common/hooks/useChurch'
import { successNotification } from '@/common/utils/toast'
import { RootState } from '@/redux/store'

interface AddChurchModalProps {
  open: boolean
  onClose: () => void
  /** Runs after the church is created and selected, before the modal closes. */
  onAdded?: (church: MyChurch) => void
}

/**
 * Add a church: one name. The new church is selected straight away, so the next thing the
 * person sees is it, ready to connect. Used by the Churches page and the "no church yet" screen.
 */
const AddChurchModal: FC<AddChurchModalProps> = ({
  open,
  onClose,
  onAdded,
}) => {
  const queryClient = useQueryClient()
  const switchChurch = useSwitchChurch()
  // The same key `useMyChurches` caches the list under.
  const userId = useSelector((s: RootState) => s.common.user?.id)
  const inputRef = useRef<HTMLInputElement>(null)
  // State updates land after a re-render; a quick double click must not create two churches.
  const inFlight = useRef(false)

  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setError(null)
    }
  }, [open])

  const close = () => {
    // Once the request is out, let it finish: it selects the new church when it lands.
    if (!inFlight.current) onClose()
  }

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (inFlight.current) return
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Enter the church name.')
      inputRef.current?.focus()
      return
    }

    inFlight.current = true
    setPending(true)
    setError(null)
    try {
      const created = await createChurch(trimmed)
      // Into the cached list first: the selection is kept pointing at a church in that list, and
      // must not be moved off the new one while the refetch is on its way.
      queryClient.setQueryData<MyChurch[]>([MY_CHURCHES_KEY, userId], (old) => [
        ...(Array.isArray(old) ? old : []).filter((c) => c.id !== created.id),
        created,
      ])
      switchChurch(created)
      queryClient.invalidateQueries(MY_CHURCHES_KEY)
      successNotification({
        title: `${created.name} added. Connect QuickBooks and Planning Center to start.`,
      })
      onAdded?.(created)
      onClose()
    } catch (err) {
      setError(
        err instanceof ChurchApiError && err.message
          ? err.message
          : 'Could not add the church.',
      )
      inputRef.current?.focus()
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }

  return (
    <Transition appear show={open} as={React.Fragment}>
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
                    Add a church
                  </Dialog.Title>
                  <MdChurch size={24} className="text-gray-500" />
                </div>

                <form onSubmit={submit} noValidate className="pt-4">
                  <label
                    htmlFor="add-church-name"
                    className="block pb-2 text-sm text-gray-600"
                  >
                    Church name
                  </label>
                  <input
                    ref={inputRef}
                    id="add-church-name"
                    type="text"
                    autoComplete="off"
                    value={name}
                    disabled={pending}
                    maxLength={255}
                    aria-invalid={!!error}
                    aria-describedby={error ? 'add-church-error' : undefined}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (error) setError(null)
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-1 disabled:bg-gray-50 ${
                      error
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-primary focus:ring-primary'
                    }`}
                  />
                  {error ? (
                    <p
                      id="add-church-error"
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
                      {pending ? 'Adding...' : 'Add church'}
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

export default AddChurchModal
