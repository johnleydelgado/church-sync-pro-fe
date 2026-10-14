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
import { CHURCH_PEOPLE_KEY } from '@/common/hooks/useChurch'
import { successNotification } from '@/common/utils/toast'

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** The older copy command, run on `field` or, without one, on a hidden box made for the purpose. */
const copyBySelecting = (text: string, field?: HTMLInputElement | null) => {
  const previous = document.activeElement as HTMLElement | null
  let box: HTMLTextAreaElement | null = null
  if (field) {
    field.focus()
    field.select()
  } else {
    box = document.createElement('textarea')
    box.value = text
    box.setAttribute('readonly', '')
    box.style.position = 'fixed'
    box.style.top = '0'
    box.style.left = '0'
    box.style.opacity = '0'
    document.body.appendChild(box)
    box.select()
  }
  let copied = false
  try {
    copied = document.execCommand('copy')
  } catch {
    copied = false
  }
  if (box) {
    document.body.removeChild(box)
    previous?.focus()
  }
  return copied
}

/**
 * Copies an invite link and says so. The clipboard API first; where the browser has none (an
 * http page that isn't localhost) or refuses, the older copy command. False when both fail: the
 * caller then shows the link selected, to copy by hand. With `field`, a failure leaves it selected.
 */
export const copyLink = async (
  text: string,
  field?: HTMLInputElement | null,
): Promise<boolean> => {
  let copied = false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      copied = true
    }
  } catch {
    copied = false
  }
  if (!copied) copied = copyBySelecting(text, field)
  if (copied) successNotification({ title: 'Link copied' })
  return copied
}

interface InviteLinkFieldProps {
  link: string
  /** Select the link as soon as it shows: used when it appears because copying failed. */
  selectOnShow?: boolean
  copyButtonRef?: React.Ref<HTMLButtonElement>
}

/**
 * An invite link in a read-only box with a Copy button. Email is unreliable (SendGrid's DNS is
 * broken and Microsoft 365 never receives it), so the link is always there to send by hand.
 */
export const InviteLinkField: FC<InviteLinkFieldProps> = ({
  link,
  selectOnShow = false,
  copyButtonRef,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  // Shown from the start when the box appears because copying already failed.
  const [copyFailed, setCopyFailed] = useState(selectOnShow)

  useEffect(() => {
    if (!selectOnShow) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [selectOnShow])

  const copy = async () => {
    setCopyFailed(!(await copyLink(link, inputRef.current)))
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
          ref={copyButtonRef}
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg bg-yellow px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Copy
        </button>
      </div>
      {copyFailed ? (
        <p role="status" className="pt-1 text-xs text-gray-500">
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

interface InviteRequest {
  churchId: number
  churchName: string
  email: string
  /** Which opening of the dialog asked; an answer for an earlier one is not shown. */
  opening: number
}

/** The answer, with the church it was for: the text never names whichever church is selected now. */
type Invited = InviteResult & { email: string; churchName: string }

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
  const opening = useRef(0)
  const emailRef = useRef<HTMLInputElement>(null)
  const copyRef = useRef<HTMLButtonElement>(null)
  const doneRef = useRef<HTMLButtonElement>(null)

  const invite = useMutation<InviteResult, ChurchApiError, InviteRequest>(
    (req) => inviteToChurch(req.churchId, req.email),
    {
      onMutate: () => setError(null),
      onSuccess: (result, req) => {
        queryClient.invalidateQueries([CHURCH_PEOPLE_KEY, req.churchId])
        if (req.opening !== opening.current) return
        setInvited({ ...result, email: req.email, churchName: req.churchName })
      },
      onError: (e, req) => {
        if (req.opening !== opening.current) return
        setError(e?.message || 'Could not send the invite. Try again.')
        emailRef.current?.focus()
      },
    },
  )

  // The answer replaces the form, so focus would fall to the page: put it on what to do next.
  useEffect(() => {
    if (!invited) return
    if (invited.inviteLink) copyRef.current?.focus()
    else doneRef.current?.focus()
  }, [invited])

  // Cleared once the dialog has faded out, so a reopened one never shows the last link, even
  // for a frame. An invite still in flight from this opening is then ignored.
  const resetAfterClose = () => {
    opening.current += 1
    invite.reset()
    setEmail('')
    setError(null)
    setInvited(null)
  }

  // Not while the invite is in flight: closing then would hide whether it was made.
  const close = () => {
    if (!invite.isLoading) onClose()
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (invite.isLoading) return
    const address = email.trim()
    if (!EMAIL_FORMAT.test(address)) {
      setError("That doesn't look like an email address.")
      return
    }
    invite.mutate({
      churchId,
      churchName,
      email: address,
      opening: opening.current,
    })
  }

  return (
    <Transition
      appear
      show={open}
      as={React.Fragment}
      afterLeave={resetAfterClose}
    >
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
                    {/* Read-only, not disabled, while sending: disabling would drop the focus. */}
                    <input
                      ref={emailRef}
                      id="invite-email"
                      type="email"
                      autoComplete="off"
                      autoFocus
                      value={email}
                      readOnly={invite.isLoading}
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
                      } ${invite.isLoading ? 'bg-gray-50 text-gray-500' : ''}`}
                    />
                    {error ? (
                      <p
                        id="invite-email-error"
                        role="alert"
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
                          {invited.churchName} in their church list.
                        </span>
                      </p>
                    ) : (
                      <>
                        <p className="pt-3 text-sm text-gray-700">
                          {invited.email} has been invited to{' '}
                          {invited.churchName}.
                          {invited.inviteLink
                            ? ' They join by opening this link:'
                            : ''}
                        </p>
                        {invited.inviteLink ? (
                          <div className="pt-3">
                            <InviteLinkField
                              link={invited.inviteLink}
                              copyButtonRef={copyRef}
                            />
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
                        ref={doneRef}
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
