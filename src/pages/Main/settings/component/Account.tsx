import React, { FC, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useQueryClient } from 'react-query'
import { failNotification, successNotification } from '@/common/utils/toast'
import { deleteUserToken } from '@/common/api/user'
import qboIcon from '@/common/assets/qbo-icon.png'
import pcoIcon from '@/common/assets/pco-icon.png'
import stripeIcon from '@/common/assets/stripe.png'
import { CgSync } from 'react-icons/cg'
import { BiSync } from 'react-icons/bi'
import { useGetTokenList } from '@/common/hooks/useGetTokenList'
import { MY_CHURCHES_KEY, useChurch } from '@/common/hooks/useChurch'
import {
  IntegrationType,
  useConnectIntegration,
} from '@/common/hooks/useConnectIntegration'
import { mainRoute } from '@/common/constant/route'
import ConfirmActionModal from '@/common/components/modal/ConfirmActionModal'
import { MODALS_NAME } from '@/common/constant/modal'
import { OPEN_MODAL } from '@/redux/common'

/** Where QuickBooks / Planning Center / Stripe send the person back to once connected. */
const RETURN_TO = `${mainRoute.SETTINGS}?tab=integrations`

interface AccountProps {}

interface LoadingProps {
  stripeLoading: boolean
  pcoLoading: boolean
  qboLoading: boolean
}

interface Token {
  id?: number
  userId: number
  tokenEntityId: number
  token_type: 'stripe' | 'qbo' | 'pco' | string
  access_token: string | null
  refresh_token: string | null
  realm_id: string | null
  isSelected: boolean
  organization_name: string | null
}

export interface AccountTokenDataProps {
  id: number
  isEnabled: false
  email: string
  tokens: Token[]
  createAt?: string
  updatedAt?: string
}

const Account: FC<AccountProps> = ({}) => {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const { church, canConnectIntegrations } = useChurch()
  const connect = useConnectIntegration()

  // Connections belong to a church; connecting or disconnecting needs the right to do it there.
  const blockedReason = !church
    ? 'Choose a church first. Connections belong to a church.'
    : !canConnectIntegrations
    ? `Only an owner of ${church.name}, or a bookkeeper they allow, can connect or disconnect its accounts.`
    : null

  const [isBtnLoading, setIsBtnLoading] = useState<LoadingProps>({
    stripeLoading: false,
    pcoLoading: false,
    qboLoading: false,
  })

  const { tokenList, refetch } = useGetTokenList()

  const [disconnectTarget, setDisconnectTarget] = useState<{
    id: number | undefined | null
    label: string
  } | null>(null)

  const requestDisconnect = (id: number | undefined | null, label: string) => {
    setDisconnectTarget({ id, label })
    dispatch(OPEN_MODAL(MODALS_NAME.modalConfirmDisconnect))
  }

  const connectHandler = async (
    type: IntegrationType,
    loadingKey: keyof LoadingProps,
  ) => {
    if (!church || !canConnectIntegrations) return
    setIsBtnLoading((s) => ({ ...s, [loadingKey]: true }))
    try {
      // On success the browser is already on its way to the sign-in page; keep the spinner.
      await connect(type, church, RETURN_TO)
    } catch (e: any) {
      failNotification({
        title: e?.message || "Couldn't start connecting. Please try again.",
      })
      setIsBtnLoading((s) => ({ ...s, [loadingKey]: false }))
    }
  }

  // One definition per integration. The three cards were previously ~60 lines of
  // near-identical JSX each, which is how the Stripe card drifted: it kept the
  // fixed h-28 while carrying a longer description, so its Connect button
  // rendered outside the card border.
  const INTEGRATIONS = [
    {
      type: 'qbo' as const,
      name: 'QuickBooks',
      icon: qboIcon,
      loadingKey: 'qboLoading' as const,
      description:
        'Where your journal entries are posted. Church Sync Pro writes your daily giving entry here.',
    },
    {
      type: 'pco' as const,
      name: 'Planning Center',
      icon: pcoIcon,
      loadingKey: 'pcoLoading' as const,
      description:
        'Where your donations come from. Online giving in Planning Center is the source for every entry.',
    },
    {
      type: 'stripe' as const,
      name: 'Stripe',
      icon: stripeIcon,
      loadingKey: 'stripeLoading' as const,
      description:
        'Used to reconcile payouts against your clearing account once the deposit lands.',
    },
  ]

  const hasTokenOfTypes = (types: string[]): boolean => {
    if (tokenList && tokenList[0]) {
      return Boolean(
        tokenList[0].tokens.find((a) => types.includes(a.token_type)),
      )
    }
    return false
  }

  const allConnected = INTEGRATIONS.every((it) => hasTokenOfTypes([it.type]))

  // The token id comes from the selected church's token list; the backend checks the
  // signed-in person may manage that church's integrations before deleting it.
  const deleteToken = async (id: number | undefined | null, label: string) => {
    if (!id) return
    const res = await deleteUserToken(id)
    if (res?.success) {
      successNotification({ title: `${label} disconnected.` })
      refetch()
      queryClient.invalidateQueries(MY_CHURCHES_KEY)
    } else {
      failNotification({
        title:
          res?.message || `Couldn't disconnect ${label}. Please try again.`,
      })
    }
  }

  return (
    <div className="h-full">
      <ConfirmActionModal
        modalName={MODALS_NAME.modalConfirmDisconnect}
        title={`Disconnect ${disconnectTarget?.label || ''}?`}
        body="Your syncs will stop until you reconnect."
        confirmLabel="Disconnect"
        onConfirm={() =>
          deleteToken(disconnectTarget?.id, disconnectTarget?.label || '')
        }
      />

      <div className="h-full">
        <div className="w-full  flex flex-col bg-white lg:px-8 py-4 justify-center mt-2">
          <div className="flex flex-col gap-2 lg:px-4">
            <p className="text-md font-thin">
              {allConnected
                ? 'Your accounts are connected.'
                : 'Before we start, connect your accounts first'}
            </p>
            {blockedReason ? (
              <p className="text-sm text-gray-500">{blockedReason}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-4 pt-4 lg:p-4">
            {INTEGRATIONS.map((it) => {
              const connected = hasTokenOfTypes([it.type])
              const loading = isBtnLoading[it.loadingKey]
              return (
                <div
                  key={it.type}
                  className="flex w-full items-start gap-4 rounded-lg border-2 p-4 text-start lg:w-1/2"
                >
                  <img
                    src={it.icon}
                    alt={it.name}
                    className="h-14 w-14 shrink-0 object-contain"
                  />

                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-primary">{it.name}</p>
                      {connected ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                          <BiSync size={13} />
                          Connected
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                          Not connected
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-normal text-gray-400">
                      {it.description}
                    </p>

                    <div>
                      {connected ? (
                        <button
                          type="button"
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={!!blockedReason}
                          onClick={() =>
                            requestDisconnect(
                              tokenList &&
                                tokenList[0]?.tokens.find(
                                  (a) => a.token_type === it.type,
                                )?.id,
                              it.name,
                            )
                          }
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-md bg-btmColor px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => connectHandler(it.type, it.loadingKey)}
                          disabled={loading || !!blockedReason}
                        >
                          {loading ? <CgSync className="animate-spin" /> : null}
                          {loading ? 'Connecting…' : 'Connect'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Account
