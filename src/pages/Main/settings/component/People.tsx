import React, { FC, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { Dialog, Transition } from '@headlessui/react'
import { Button } from '@material-tailwind/react'
import { Spinner } from 'flowbite-react'
import { AiOutlineUserAdd } from 'react-icons/ai'

import {
  ChurchApiError,
  ChurchPerson,
  getChurchPeople,
  removeFromChurch,
  setPersonAccess,
} from '@/common/api/church'
import { MY_CHURCHES_KEY, useChurch } from '@/common/hooks/useChurch'
import { failNotification, successNotification } from '@/common/utils/toast'
import InvitePersonModal, {
  copyText,
  InviteLinkField,
} from './InvitePersonModal'

const PEOPLE_KEY = 'churchPeople'

/** A 4xx is the server's answer (not on this church, signed out); asking again won't change it. */
const isClientError = (e: unknown) =>
  e instanceof ChurchApiError && (e.status ?? 0) >= 400 && (e.status ?? 0) < 500

/** How a person is named in sentences: their name once they've joined, else the address. */
const who = (p: ChurchPerson) => p.name || p.email

interface AccessSwitchProps {
  on: boolean
  disabled: boolean
  label: string
  onChange: (next: boolean) => void
}

const AccessSwitch: FC<AccessSwitchProps> = ({
  on,
  disabled,
  label,
  onChange,
}) => (
  <div className="flex items-center gap-2">
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        on ? 'bg-success' : 'bg-gray-300'
      } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
    <span className="text-sm text-gray-600">{on ? 'Yes' : 'No'}</span>
  </div>
)

interface RemoveDialogProps {
  person: ChurchPerson | null
  churchName: string
  busy: boolean
  error: string | null
  onConfirm: () => void
  onClose: () => void
}

/** Stays open while the removal runs, so a refusal ("A church needs at least one owner.") is read in place. */
const RemoveDialog: FC<RemoveDialogProps> = ({
  person,
  churchName,
  busy,
  error,
  onConfirm,
  onClose,
}) => {
  // Keeps the words on screen while the dialog fades out after `person` is cleared.
  const last = useRef<ChurchPerson | null>(person)
  if (person) last.current = person
  const shown = person ?? last.current

  const close = () => {
    if (!busy) onClose()
  }

  const invited = shown?.status === 'invited'
  const title = !shown
    ? ''
    : invited
    ? `Withdraw the invite to ${shown.email}?`
    : shown.isYou
    ? `Remove yourself from ${churchName}?`
    : `Remove ${who(shown)} from ${churchName}?`
  const body = !shown
    ? ''
    : invited
    ? `They won't be added to ${churchName}. You can invite them again later.`
    : shown.isYou
    ? `You'll no longer see ${churchName}. Another owner can invite you back.`
    : `They'll no longer see ${churchName} or its data. You can invite them again later.`

  return (
    <Transition appear show={!!person} as={React.Fragment}>
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-semibold text-gray-800"
                >
                  {title}
                </Dialog.Title>
                <p className="pt-2 text-sm text-gray-600">{body}</p>
                {error ? (
                  <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </p>
                ) : null}
                <div className="flex items-center justify-end gap-3 pt-6">
                  <Button
                    size="sm"
                    variant="outlined"
                    onClick={close}
                    disabled={busy}
                    className="border-gray-300 normal-case text-gray-600"
                  >
                    {error ? 'Close' : 'Cancel'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={onConfirm}
                    disabled={busy}
                    className="flex items-center gap-2 bg-red-600 normal-case"
                  >
                    {busy ? (
                      <>
                        <Spinner size="sm" />
                        Removing…
                      </>
                    ) : invited ? (
                      'Withdraw invite'
                    ) : (
                      'Remove'
                    )}
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

/**
 * Settings, People: who is on the selected church. Owners invite (with a link to copy, because
 * email doesn't always arrive), decide which bookkeepers may connect QuickBooks and Planning
 * Center, and remove people. Everyone else sees the list read-only.
 */
const People: FC = () => {
  const queryClient = useQueryClient()
  const { church, churchId, canManagePeople } = useChurch()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removing, setRemoving] = useState<ChurchPerson | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)
  // The row whose link is shown in a box because the browser wouldn't copy it.
  const [linkShownFor, setLinkShownFor] = useState<number | null>(null)

  const {
    data: people,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<ChurchPerson[], ChurchApiError>(
    [PEOPLE_KEY, churchId],
    () => getChurchPeople(churchId as number),
    {
      enabled: !!churchId,
      retry: (failureCount, e) => !isClientError(e) && failureCount < 3,
    },
  )

  const access = useMutation<
    'ok',
    ChurchApiError,
    { churchId: number; person: ChurchPerson; enabled: boolean }
  >(
    ({ churchId: id, person, enabled }) =>
      setPersonAccess(id, person.memberId, enabled),
    {
      onSuccess: (_, { churchId: id, person, enabled }) => {
        // Show the new state now rather than flick back until the refetch lands.
        queryClient.setQueryData<ChurchPerson[] | undefined>(
          [PEOPLE_KEY, id],
          (old) =>
            Array.isArray(old)
              ? old.map((p) =>
                  p.memberId === person.memberId
                    ? { ...p, integrationAccessEnabled: enabled }
                    : p,
                )
              : old,
        )
        queryClient.invalidateQueries([PEOPLE_KEY, id])
        queryClient.invalidateQueries(MY_CHURCHES_KEY)
        const name = who(person)
        successNotification({
          title: enabled
            ? `${name} can now connect QuickBooks & Planning Center`
            : `${name} can no longer connect QuickBooks & Planning Center`,
        })
      },
      onError: (e) => {
        failNotification({ title: e.message })
      },
    },
  )

  const remove = useMutation<
    'ok',
    ChurchApiError,
    { churchId: number; person: ChurchPerson }
  >(({ churchId: id, person }) => removeFromChurch(id, person.memberId), {
    onMutate: () => setRemoveError(null),
    onSuccess: (_, { churchId: id, person }) => {
      setRemoving(null)
      // Leaving a church: the church list drops it and the selection moves on. Refetching this
      // church's people would only fail now that you're not on it.
      if (!person.isYou) queryClient.invalidateQueries([PEOPLE_KEY, id])
      queryClient.invalidateQueries(MY_CHURCHES_KEY)
      successNotification({
        title:
          person.status === 'invited'
            ? `Invite to ${person.email} withdrawn`
            : person.isYou
            ? `You've left ${church?.name ?? 'the church'}`
            : `${who(person)} removed`,
      })
    },
    onError: (e) => setRemoveError(e.message),
  })

  if (!church || !churchId) {
    return (
      <div className="px-8 py-10 text-center text-gray-600">
        Pick a church in the sidebar first.
      </div>
    )
  }

  const copyInviteLink = async (p: ChurchPerson) => {
    if (!p.inviteLink) return
    if (await copyText(p.inviteLink)) {
      setLinkShownFor(null)
      successNotification({ title: 'Link copied' })
    } else {
      // No clipboard here: show the link selected so it can be copied by hand.
      setLinkShownFor(p.memberId)
    }
  }

  const askToRemove = (p: ChurchPerson) => {
    setRemoveError(null)
    setRemoving(p)
  }

  const list = Array.isArray(people) ? people : []
  const columns = canManagePeople ? 5 : 4

  return (
    <div className="flex w-full flex-col bg-white px-8 pt-2">
      <div className="flex flex-wrap items-start justify-between gap-4 pt-4">
        <div>
          <h2 className="text-lg font-semibold text-primary">
            People on {church.name}
          </h2>
          {!canManagePeople ? (
            <p className="pt-1 text-sm text-gray-500">
              Only an owner of {church.name} can invite or remove people.
            </p>
          ) : null}
        </div>
        {canManagePeople ? (
          <Button
            variant="outlined"
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-2 border-gray-400 font-normal normal-case text-black"
          >
            <AiOutlineUserAdd size={18} className="text-yellow" />
            Invite someone
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : isError && !people ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-xl font-thin">
            Couldn&apos;t load the people on {church.name}.
          </p>
          {error?.message ? (
            <p className="text-sm text-gray-500">{error.message}</p>
          ) : null}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-lg bg-yellow px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isFetching ? 'Trying again…' : 'Try again'}
          </button>
        </div>
      ) : list.length === 0 ? (
        <div className="py-16 text-center text-gray-600">
          <p className="text-xl font-thin">No one is on {church.name} yet.</p>
          {canManagePeople ? (
            <p className="pt-2 text-sm">
              Use Invite someone to add a bookkeeper.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto pt-6">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-4 font-medium">Person</th>
                <th className="py-2 pr-4 font-medium">Role</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">
                  Can connect QuickBooks &amp; Planning Center
                </th>
                {canManagePeople ? (
                  <th className="py-2 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const joined = p.status === 'active'
                const heading = joined && p.name ? p.name : p.email
                const switching =
                  access.isLoading &&
                  access.variables?.person.memberId === p.memberId
                return (
                  <React.Fragment key={p.memberId}>
                    <tr className="border-b border-gray-100 align-middle">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-gray-800">
                          {heading}
                          {p.isYou ? (
                            <span className="font-normal text-gray-500">
                              {' '}
                              (you)
                            </span>
                          ) : null}
                        </p>
                        {heading !== p.email ? (
                          <p className="text-gray-500">{p.email}</p>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {p.role === 'owner' ? 'Owner' : 'Bookkeeper'}
                      </td>
                      <td className="py-3 pr-4">
                        {joined ? (
                          <span className="text-gray-700">Active</span>
                        ) : (
                          <span className="text-amber-700">
                            Invited, hasn&apos;t joined yet
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {p.role === 'owner' ? (
                          <span className="text-gray-700">Always</span>
                        ) : (
                          <AccessSwitch
                            on={
                              switching && access.variables
                                ? access.variables.enabled
                                : p.integrationAccessEnabled
                            }
                            disabled={!canManagePeople || access.isLoading}
                            label={`${heading} can connect QuickBooks & Planning Center`}
                            onChange={(enabled) =>
                              access.mutate({
                                churchId,
                                person: p,
                                enabled,
                              })
                            }
                          />
                        )}
                      </td>
                      {canManagePeople ? (
                        <td className="py-3">
                          <div className="flex items-center justify-end gap-4 whitespace-nowrap">
                            {!joined && p.inviteLink ? (
                              <button
                                type="button"
                                onClick={() => copyInviteLink(p)}
                                className="font-medium text-primary hover:underline"
                              >
                                Copy invite link
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => askToRemove(p)}
                              disabled={remove.isLoading}
                              className="font-medium text-red-600 hover:underline disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                    {linkShownFor === p.memberId && p.inviteLink ? (
                      <tr className="border-b border-gray-100">
                        <td colSpan={columns} className="pb-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <InviteLinkField
                                link={p.inviteLink}
                                selectOnShow
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setLinkShownFor(null)}
                              className="pt-2 text-sm text-gray-500 hover:underline"
                            >
                              Hide
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {canManagePeople ? (
        <InvitePersonModal
          open={inviteOpen}
          churchId={churchId}
          churchName={church.name}
          onClose={() => setInviteOpen(false)}
        />
      ) : null}
      <RemoveDialog
        person={removing}
        churchName={church.name}
        busy={remove.isLoading}
        error={removeError}
        onConfirm={() =>
          removing && remove.mutate({ churchId, person: removing })
        }
        onClose={() => setRemoving(null)}
      />
    </div>
  )
}

export default People
