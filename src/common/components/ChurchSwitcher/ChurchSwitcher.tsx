import React, { FC, ReactNode, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Dropdown, { components } from 'react-select'
import { MyChurch } from '@/common/api/church'
import { mainRoute } from '@/common/constant/route'
import {
  useChurch,
  useMyChurches,
  useSwitchChurch,
} from '@/common/hooks/useChurch'

interface ChurchOption {
  value: number
  label: string
  church: MyChurch
}

interface ChurchSwitcherProps {
  /** `sidebar`: the desktop sidebar. `drawer`: the mobile menu, under the person's name. */
  variant?: 'sidebar' | 'drawer'
  /** Sidebar only: the narrow, icons-only sidebar shows just the avatar and the church's initial. */
  collapsed?: boolean
  /** Sidebar only: shown before the church's name (the person's avatar). */
  avatar?: ReactNode
}

const Input = (props: any) => (
  <components.Input
    {...props}
    inputClassName="outline-none border-none shadow-none focus:ring-transparent"
  />
)

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    background: '#D1FAE580',
    borderRadius: 0,
    borderColor: state.isFocused ? '' : '#D1FAE580',
    boxShadow: null,
    '&:hover': {
      borderColor: state.isFocused ? '' : '#D1FAE580',
    },
  }),
  menu: (base: any) => ({
    ...base,
    borderRadius: 0,
    marginTop: 0,
    backgroundColor: '#D1FAE5',
  }),
  menuList: (base: any) => ({
    ...base,
    backgroundColor: '#D1FAE5',
    padding: 0,
  }),
  singleValue: (base: any) => ({
    ...base,
    color: 'white',
  }),
}

const roleLabel = (church: MyChurch) =>
  church.role === 'owner' ? 'Owner' : 'Bookkeeper'

const nameKey = (name: string) => name.trim().toLowerCase()

/**
 * `sameName`: another of the person's churches has this name, so the role tells them apart.
 * `sameNameAndRole`: one also has the same role, so only the church's number does.
 */
const optionFor = (
  church: MyChurch,
  sameName = false,
  sameNameAndRole = false,
): ChurchOption => {
  const notes = [
    sameName ? roleLabel(church) : '',
    church.isActive ? '' : 'inactive',
  ].filter(Boolean)
  const label = notes.length
    ? `${church.name} (${notes.join(', ')})`
    : church.name
  return {
    value: church.id,
    label: sameNameAndRole ? `${label} · #${church.id}` : label,
    church,
  }
}

/** The church every page works on, and the way to switch to another. */
const ChurchSwitcher: FC<ChurchSwitcherProps> = ({
  variant = 'sidebar',
  collapsed = false,
  avatar,
}) => {
  const { church } = useChurch()
  const { data: churches, isError, isFetching, refetch } = useMyChurches()
  const switchChurch = useSwitchChurch()

  const options = useMemo(() => {
    const list = churches ?? []
    const byName = new Map<string, number>()
    const byNameAndRole = new Map<string, number>()
    const add = (counts: Map<string, number>, key: string) =>
      counts.set(key, (counts.get(key) ?? 0) + 1)
    const sameRoleKey = (c: MyChurch) => `${nameKey(c.name)}|${c.role}`
    list.forEach((c) => {
      add(byName, nameKey(c.name))
      add(byNameAndRole, sameRoleKey(c))
    })
    return list.map((c) =>
      optionFor(
        c,
        (byName.get(nameKey(c.name)) ?? 0) > 1,
        (byNameAndRole.get(sameRoleKey(c)) ?? 0) > 1,
      ),
    )
  }, [churches])
  const value = church
    ? options.find((o) => o.value === church.id) ?? optionFor(church)
    : null

  const isSidebar = variant === 'sidebar'

  if (isSidebar && collapsed) {
    return (
      <div
        className="flex flex-col gap-2 items-center pt-8 w-full"
        title={church?.name}
      >
        {avatar}
        <p className="text-white p-2">
          {church ? church.name.charAt(0).toUpperCase() : null}
        </p>
      </div>
    )
  }

  const nameRow = (content: ReactNode) =>
    isSidebar ? (
      <div className="flex gap-2 items-center px-8 w-full">
        {avatar}
        <div className="p-2">{content}</div>
      </div>
    ) : (
      <div className="px-8 pl-14 w-full">{content}</div>
    )

  if (!church) {
    if (churches && churches.length === 0) {
      return (
        <div className="flex flex-col pb-8">
          {nameRow(
            <Link
              to={mainRoute.CHURCHES}
              className="text-white underline underline-offset-2 hover:text-secondaryYellow"
            >
              No church yet
            </Link>,
          )}
        </div>
      )
    }
    if (isError) {
      return (
        <div className="flex flex-col pb-8">
          {nameRow(
            <div className="flex flex-col gap-1">
              <p className="text-white text-xs" role="alert">
                Couldn&apos;t load your churches.
              </p>
              <button
                type="button"
                className="text-left text-white text-xs underline underline-offset-2 hover:text-secondaryYellow disabled:opacity-60 disabled:no-underline"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                {isFetching ? 'Trying again…' : 'Try again'}
              </button>
            </div>,
          )}
        </div>
      )
    }
    // Loading, or a list that useKeepChurchSelected is about to pick from.
    return (
      <div className="flex flex-col pb-8" aria-busy="true">
        {nameRow(
          <>
            <div className="h-4 w-32 rounded bg-white/20 animate-pulse" />
            <span className="sr-only">Loading your churches</span>
          </>,
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {nameRow(
        <p className="text-white">
          {isSidebar ? church.name.toUpperCase() : church.name}
        </p>,
      )}

      <div className="flex gap-2 items-center px-8 pb-4 pl-14">
        <div className="rounded-lg bg-green-400 p-2 w-2 h-2" />
        <p className="text-white text-xs">{roleLabel(church)}</p>
      </div>

      {options.length > 1 ? (
        <div className="flex flex-col items-center w-full pb-4">
          <Dropdown<ChurchOption>
            aria-label="Switch church"
            options={options}
            value={value}
            components={{ Input }}
            placeholder="Choose a church"
            className="w-full"
            styles={selectStyles}
            onChange={(next) => {
              // Switching clears the church's bank and fee choices, so re-picking the same one must not.
              if (next && next.value !== church.id) switchChurch(next.church)
            }}
          />
        </div>
      ) : null}

      <div className="px-8 pl-14 pb-8">
        <Link
          to={mainRoute.CHURCHES}
          className="text-white text-xs underline underline-offset-2 hover:text-secondaryYellow"
        >
          Manage churches
        </Link>
      </div>
    </div>
  )
}

export default ChurchSwitcher
