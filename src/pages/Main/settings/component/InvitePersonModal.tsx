import React, { FC, useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from 'react-query'
import { Dialog, Transition } from '@headlessui/react'
import { Button } from '@material-tailwind/react'
import { Spinner } from 'flowbite-react'
import {
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
} from 'react-icons/hi'

import {
  ChurchApiError,
  InviteResult,
  inviteToChurch,
} from '@/common/api/church'
import { successNotification } from '@/common/utils/toast'

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Puts `text` on the clipboard. False when the browser has no clipboard API (an http page that
 * isn't localhost) or refuses; the caller then shows the text selected so it can be copied by hand.
 */
export const copyText = async (text: string): Promise<boolean> => {
  try {
    if (!navigator.clipboard?.writeText) return false
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

interface InviteLinkFieldProps {
  link: string
  /** Select the link as soon as it shows: used when it appears because copying failed. */
  selectOnShow?: boolean
}

/**
 * An invite link in a read-only box with a Copy button. Email is unreliable (SendGrid's DNS is
 * broken and Microsoft 365 never receives it), so the link is always there to send by hand.
 */
export const InviteLinkField: FC<InviteLinkFieldProps> = ({
  link,
  selectOnShow = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [copyFailed, setCopyFailed] = useState(false)

  const selectLink = () => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }

  useEffect(() => {
    if (!selectOnShow) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [selectOnShow])

  const copy = async () => {
    if (await copyText(link)) {
      setCopyFailed(false)
      successNotification({ title: 'Link copied' })
      return
    }
    // No clipboard API: select the text and try the older copy command on the selection.
    selectLink()
    let copied = false
    try {
      copied = document.execCommand('copy')
    } catch {
      copied = false
    }
    if (copied) {
      setCopyFailed(false)
      successNotification({ title: 'Link copied' })
    } else {
      setCopyFailed(true)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          readOnly
          value={link}
          onFocus={(e) => e.target.select()}
          aria-label="Invite link"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700 focus:border-primary focus:ring-0"
        />
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg bg-yellow px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Copy
        </button>
      </div>
      {copyFailed || selectOnShow ? (
        <p className="pt-1 text-xs text-gray-500">
          Your browser didn&apos;t let us copy it. The link is selected: press
          Ctrl+C (Cmd+C on a Mac) to copy it.
        </p>
      ) : null}
    </div>
  )
}

interface InvitePersonModalProps {
  open: boolean
  churchId: number
  churchName: string
  onClose: () => void
}

type Invited = InviteResult & { email: string }

/**
 * Invite someone to a church as a bookkeeper. A person who already has a login is added straight
 * away; anyone else gets a link, shown here to copy whether or not the email went out.
 */
const InvitePersonModal: FC<InvitePersonModalProps> = ({
  open,
  churchId,
  churchName,
  onClose,
}) => {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  // Under the input rather than a toast: "already on this church" has to stay readable.
  const [error, setError] = useState<string | null>(null)
  const [invited, setInvited] = useState<Invited | null>(null)

  // Every opening starts clean: the last person's link must never be the one shown.
  useEffect(() => {
    if (open) {
      setEmail('')
      setError(null)
      setInvited(null)
    }
  }, [open])

  const invite = useMutation<InviteResult, ChurchApiError, string>(
    (address) => inviteToChurch(churchId, address),
    {
      onMutate: () => setError(null),
      onSuccess: (result, address) => {
        setInvited({ ...result, email: address })
        queryClient.invalidateQueries(['churchPeople', churchId])
      },
      onError: (e) =>
        setError(e?.message || 'Could not send the invite. Try again.'),
    },
  )

  // Not while the invite is in flight: closing then would hide whether it was made.
  const close = () => {
    if (!invite.isLoading) onClose()
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const address = email.trim()
    if (!EMAIL_FORMAT.test(address)) {
      setError("That doesn't look like an email address.")
      return
    }
    invite.mutate(address)
  }

  return (
    <Transition appear show={open} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={close}>
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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-semibold text-primary"
                >
                  {invited
                    ? invited.addedExisting
                      ? 'Added'
                      : 'Invite ready'
                    : `Invite someone to ${churchName}`}
                </Dialog.Title>

                {!invited ? (
                  <form onSubmit={submit} noValidate>
                    <p className="pt-2 text-sm text-gray-600">
                      They&apos;ll join as a bookkeeper. If they already have a
                      Church Sync Pro login, they&apos;re added straight away.
                      Otherwise you&apos;ll get a link to send them.
                    </p>
                    <label
                      htmlFor="invite-email"
                      className="block pt-4 text-sm font-medium text-gray-700"
                    >
                      Their email
                    </label>
                    <input
                      id="invite-email"
                      type="email"
                      autoComplete="off"
                      autoFocus
                      value={email}
                      disabled={invite.isLoading}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (error) setError(null)
                      }}
                      placeholder="name@example.com"
                      aria-invalid={!!error}
                      aria-describedby={
                        error ? 'invite-email-error' : undefined
                      }
                      className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:ring-0 ${
                        error
                          ? 'border-red-400 focus:border-red-500'
                          : 'border-gray-300 focus:border-primary'
                      }`}
                    />
                    {error ? (
                      <p
                        id="invite-email-error"
                        className="pt-1 text-sm text-red-600"
                      >
                        {error}
                      </p>
                    ) : null}

                    <div className="flex items-center justify-end gap-3 pt-6">
                      <Button
                        size="sm"
                        variant="outlined"
                        type="button"
                        onClick={close}
                        disabled={invite.isLoading}
                        className="border-gray-300 normal-case text-gray-600"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        type="submit"
                        disabled={invite.isLoading || !email.trim()}
                        className="flex items-center gap-2 bg-yellow normal-case"
                      >
                        {invite.isLoading ? (
                          <>
                            <Spinner size="sm" />
                            Inviting…
                          </>
                        ) : (
                          'Invite'
                        )}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div>
                    {invited.addedExisting ? (
                      <p className="flex gap-2 pt-3 text-sm text-gray-700">
                        <HiOutlineCheckCircle
                          size={20}
                          className="shrink-0 text-green-600"
                        />
                        <span>
                          {invited.email} already has a Church Sync Pro login,
                          so they&apos;ve been added. They&apos;ll see{' '}
                          {churchName} in their church list.
                        </span>
                      </p>
                    ) : (
                      <>
                        <p className="pt-3 text-sm text-gray-700">
                          {invited.email} has been invited to {churchName}.
                          {invited.inviteLink
                            ? ' They join by opening this link:'
                            : ''}
                        </p>
                        {invited.inviteLink ? (
                          <div className="pt-3">
                            <InviteLinkField link={invited.inviteLink} />
                          </div>
                        ) : null}
                        {invited.emailSent ? (
                          <p className="pt-3 text-sm text-gray-600">
                            We&apos;ve emailed them this link. If it
                            doesn&apos;t arrive, send it yourself.
                          </p>
                        ) : (
                          <p className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                            <HiOutlineExclamationCircle
                              size={20}
                              className="shrink-0"
                            />
                            <span>
                              The email didn&apos;t go out. Copy the link and
                              send it to them.
                            </span>
                          </p>
                        )}
                      </>
                    )}

                    <div className="flex items-center justify-end pt-6">
                      <Button
                        size="sm"
                        onClick={onClose}
                        className="bg-yellow normal-case"
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default InvitePersonModal
