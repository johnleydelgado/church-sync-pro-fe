import React, {
  FC,
  Fragment,
  ReactNode,
  RefObject,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link } from 'react-router-dom'
import { Popover, Portal, Transition } from '@headlessui/react'
import {
  HiArrowPath,
  HiCheck,
  HiChevronUpDown,
  HiMagnifyingGlass,
  HiOutlineCog6Tooth,
  HiOutlineExclamationTriangle,
  HiPlus,
} from 'react-icons/hi2'
import { MdChurch } from 'react-icons/md'
import { MyChurch } from '@/common/api/church'
import { mainRoute } from '@/common/constant/route'
import {
  useChurch,
  useMyChurches,
  useSwitchChurch,
} from '@/common/hooks/useChurch'
import AddChurchModal from '@/pages/Main/churches/AddChurchModal'

interface ChurchSwitcherProps {
  /** `sidebar`: the desktop sidebar; its list floats. `drawer`: the mobile menu; its list opens in place. */
  variant?: 'sidebar' | 'drawer'
  /** Sidebar only: the narrow sidebar shows just the church's badge, and the list opens beside it. */
  collapsed?: boolean
}

/** One church as the switcher shows it. */
interface ChurchLine {
  church: MyChurch
  /** Under the name: "Owner", "Bookkeeper · Inactive", "Owner · #12". */
  detail: string
  /** The same, read aloud: "Bookkeeper, Inactive". */
  spoken: string
}

/** More churches than this, and the list gets a search field. */
const SEARCH_ABOVE = 6
/** The floating list: its gap from the card, and the room it leaves above the window's bottom. */
const PANEL_GAP = 8
const WINDOW_MARGIN = 12
/** Everything in the list that Up and Down step through. */
const ITEM = '[data-switcher-item]'

/**
 * A switch remounts the page, and the sidebar and this card with it (MainPage keys the page by
 * church). Whoever switched from the sidebar's card lands back on the new card instead of the top of
 * the page. Kept outside React: the card that sets it is gone by the time the new one reads it.
 */
let refocusAfterSwitch: { churchId: number; at: number } | null = null
const REFOCUS_WITHIN_MS = 10_000

/**
 * The last input was a key press. Module-wide, so a card mounted after a switch still knows. Starts
 * true: a first Tab in from the address bar never reaches the page, and a first click resets it.
 */
let keyboardInput = true

/**
 * Whether to draw focus rings on the card and in the list. Chrome draws :focus-visible on focus
 * that script moves unless the last focus came from the mouse, and Headless UI's button cancels the
 * mousedown that would have recorded it, so after a click the card and the row it focuses would
 * wear keyboard rings. The rings follow the last input instead: a key press shows them, a pointer
 * press hides them.
 */
const useKeyboardInput = () => {
  const [keyboard, setKeyboard] = useState(keyboardInput)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      keyboardInput = true
      setKeyboard(true)
    }
    const onPointer = () => {
      keyboardInput = false
      setKeyboard(false)
    }
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('pointerdown', onPointer, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('pointerdown', onPointer, true)
    }
  }, [])
  return keyboard
}

const roleLabel = (church: MyChurch) =>
  church.role === 'owner' ? 'Owner' : 'Bookkeeper'

const nameKey = (name: string) => name.trim().toLowerCase()

/** By code point, so a name that starts with an emoji keeps it whole. */
const initialOf = (name: string) =>
  (Array.from(name.trim())[0] ?? '').toUpperCase()

/**
 * Two of the person's churches can share a name: the role line tells them apart. When they share
 * the role too (`sameNameAndRole`), the church's number does.
 */
const lineFor = (church: MyChurch, sameNameAndRole = false): ChurchLine => {
  const parts = [
    roleLabel(church),
    church.isActive ? '' : 'Inactive',
    sameNameAndRole ? `#${church.id}` : '',
  ].filter(Boolean)
  return { church, detail: parts.join(' · '), spoken: parts.join(', ') }
}

const linesFor = (churches: MyChurch[]) => {
  const key = (c: MyChurch) => `${nameKey(c.name)}|${c.role}`
  const counts = new Map<string, number>()
  churches.forEach((c) => counts.set(key(c), (counts.get(key(c)) ?? 0) + 1))
  return churches.map((c) => lineFor(c, (counts.get(key(c)) ?? 0) > 1))
}

// Colours on white are written out as hex: this app's Tailwind palette is Material Tailwind's, which
// has no `sky` (those classes produce nothing) and Material greys (its gray-500 is too pale for text).
// They are Tailwind's own: sky 50 #f0f9ff, 100 #e0f2fe, 500 #0ea5e9, 600 #0284c7, 700 #0369a1,
// 900 #0c4a6e; gray 50 #f9fafb, 100 #f3f4f6, 200 #e5e7eb, 400 #9ca3af, 500 #6b7280, 700 #374151,
// 800 #1f2937.
const RING_ON_BLUE =
  'focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-primary'
const RING_ON_WHITE =
  'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0284c7]'
/** The card and the list: rings only after a key press (see `useKeyboardInput`). */
const ringIf = (keyboard: boolean, ring: string) =>
  `focus:outline-none ${keyboard ? ring : ''}`
/** Plain buttons outside the popover: the browser's own focus-visible is right for them. */
const FOCUS_RING_ON_BLUE = `focus:outline-none ${RING_ON_BLUE}`

type BadgeTone = 'current' | 'other' | 'inactive'

const BADGE_TONE: Record<BadgeTone, string> = {
  // The darker bottom edge makes the tile read as a stamp on the blue, not a flat swatch.
  current:
    'bg-secondaryYellow text-[#5c3d00] shadow-[inset_0_-2px_0_rgba(92,61,0,0.16)]',
  other: 'bg-[#e0f2fe] text-[#0c4a6e]',
  inactive: 'bg-[#f3f4f6] text-[#6b7280]',
}

const BADGE_SIZE = {
  row: 'h-7 w-7 rounded-md text-[13px]',
  card: 'h-[34px] w-[34px] rounded-lg text-[15px]',
  rail: 'h-9 w-9 rounded-lg text-base',
}

/** The church's first letter on a square tile: yellow for the church you're on. */
const ChurchBadge: FC<{
  name: string
  tone: BadgeTone
  size: keyof typeof BADGE_SIZE
}> = ({ name, tone, size }) => (
  <span
    aria-hidden="true"
    className={`flex shrink-0 select-none items-center justify-center font-bold leading-none ${BADGE_SIZE[size]} ${BADGE_TONE[tone]}`}
  >
    {initialOf(name) || <MdChurch className="h-1/2 w-1/2" />}
  </span>
)

/** Where a church's badge would be, for "no church yet": an empty slot with a plus. */
const EmptySlot: FC<{ size: 'card' | 'rail' }> = ({ size }) => (
  <span
    aria-hidden="true"
    className={`flex shrink-0 items-center justify-center rounded-lg border border-dashed border-white/70 text-white ${
      size === 'rail' ? 'h-9 w-9' : 'h-[34px] w-[34px]'
    }`}
  >
    <HiPlus className="h-4 w-4" />
  </span>
)

const CardText: FC<{ title: string; detail: string; fullTitle?: string }> = ({
  title,
  detail,
  fullTitle,
}) => (
  <span className="flex min-w-0 flex-1 flex-col">
    <span
      title={fullTitle}
      className="truncate text-sm font-bold leading-5 text-white"
    >
      {title}
    </span>
    <span className="truncate text-xs leading-4 text-white/85">{detail}</span>
  </span>
)

const SelectorIcon: FC = () => (
  <HiChevronUpDown
    aria-hidden="true"
    className="h-[18px] w-[18px] shrink-0 text-white/75 transition-colors group-hover:text-white"
  />
)

const CARD_SHELL = 'rounded-xl border border-white/35 p-2.5'

const cardClass = (open: boolean, keyboard: boolean) =>
  `group flex w-full items-center gap-3 text-left transition-colors duration-150 hover:bg-white/20 ${CARD_SHELL} ${ringIf(
    keyboard,
    RING_ON_BLUE,
  )} ${open ? 'bg-white/20' : 'bg-white/15'}`

// The badge alone keeps a hairline of the card's border, so it doesn't read as one more yellow
// nav highlight under it; open, the hairline turns solid.
const railClass = (open: boolean, keyboard: boolean) =>
  `rounded-lg ring-offset-2 ring-offset-primary transition-shadow duration-150 ${ringIf(
    keyboard,
    RING_ON_BLUE,
  )} ${
    open ? 'ring-2 ring-white/80' : 'ring-1 ring-white/50 hover:ring-white/80'
  }`

/** Loading, or a list `useKeepChurchSelected` is about to pick from: the card's shape, pulsing. */
const LoadingCard: FC<{ rail: boolean }> = ({ rail }) =>
  rail ? (
    <div aria-busy="true" className="flex justify-center">
      <span className="h-9 w-9 rounded-lg bg-white/25 motion-safe:animate-pulse" />
      <span className="sr-only">Loading your churches</span>
    </div>
  ) : (
    <div
      aria-busy="true"
      className={`flex w-full items-center gap-3 bg-white/15 ${CARD_SHELL}`}
    >
      <span className="h-[34px] w-[34px] shrink-0 rounded-lg bg-white/25 motion-safe:animate-pulse" />
      <span className="flex h-9 flex-1 flex-col justify-center gap-2">
        <span className="h-3 w-3/4 rounded bg-white/30 motion-safe:animate-pulse" />
        <span className="h-2.5 w-1/3 rounded bg-white/20 motion-safe:animate-pulse" />
      </span>
      <span className="sr-only">Loading your churches</span>
    </div>
  )

/** The list failed and no church is selected: nothing to open, only another try. */
const ErrorCard: FC<{
  rail: boolean
  retrying: boolean
  onRetry: () => void
}> = ({ rail, retrying, onRetry }) =>
  rail ? (
    <div className="flex justify-center">
      <p role="alert" className="sr-only">
        Couldn&apos;t load your churches
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        title="Couldn't load your churches. Try again"
        aria-label={
          retrying ? 'Trying again…' : 'Try loading your churches again'
        }
        className={`flex h-9 w-9 items-center justify-center rounded-lg border border-white/35 bg-white/15 text-white transition-colors hover:bg-white/20 disabled:cursor-default ${FOCUS_RING_ON_BLUE}`}
      >
        <HiArrowPath
          aria-hidden="true"
          className={`h-5 w-5 ${retrying ? 'motion-safe:animate-spin' : ''}`}
        />
      </button>
    </div>
  ) : (
    <div className={`flex w-full items-center gap-3 bg-white/15 ${CARD_SHELL}`}>
      <span
        aria-hidden="true"
        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-white/20 text-white"
      >
        <HiOutlineExclamationTriangle className="h-5 w-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start">
        <span role="alert" className="text-sm font-bold leading-5 text-white">
          Couldn&apos;t load your churches
        </span>
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className={`rounded text-xs leading-5 text-white underline underline-offset-2 hover:text-secondaryYellow disabled:cursor-default disabled:no-underline disabled:opacity-80 ${FOCUS_RING_ON_BLUE}`}
        >
          {retrying ? 'Trying again…' : 'Try again'}
        </button>
      </span>
    </div>
  )

/**
 * Pins the sidebar's floating list to its card: under the card, or beside the sidebar when the
 * sidebar is narrow. Set on the element itself as it mounts, before it paints, and again whenever
 * the window resizes or something under the card scrolls.
 */
const usePinnedPanel = (
  card: RefObject<HTMLElement>,
  side: 'below' | 'beside',
) => {
  const sideRef = useRef(side)
  sideRef.current = side
  const unpin = useRef<(() => void) | null>(null)

  return useCallback(
    (panel: HTMLElement | null) => {
      unpin.current?.()
      unpin.current = null
      if (!panel) return

      const place = () => {
        const anchor = card.current
        if (!anchor) return
        const box = anchor.getBoundingClientRect()
        const beside = sideRef.current === 'beside'
        // Beside the sidebar's edge, not the badge's: the list must clear the whole sidebar.
        const edge =
          anchor.closest('aside')?.getBoundingClientRect().right ?? box.right
        const top = beside ? box.top : box.bottom + PANEL_GAP
        const room = window.innerHeight - top - WINDOW_MARGIN
        panel.style.top = `${Math.round(top)}px`
        panel.style.left = `${Math.round(
          beside ? edge + PANEL_GAP : box.left,
        )}px`
        // A short window squeezes the list, which scrolls; the caption and actions stay.
        panel.style.maxHeight = `${Math.max(160, room)}px`
      }
      // The list scrolling inside itself moves nothing.
      const onScroll = (e: Event) => {
        if (!(e.target instanceof Node && panel.contains(e.target))) place()
      }

      place()
      window.addEventListener('resize', place)
      window.addEventListener('scroll', onScroll, true)
      unpin.current = () => {
        window.removeEventListener('resize', place)
        window.removeEventListener('scroll', onScroll, true)
      }
    },
    [card],
  )
}

/** The sidebar's list goes to a portal: the sidebar scrolls, and would clip a list wider than itself. */
const PanelLayer: FC<{ floating: boolean; children: ReactNode }> = ({
  floating,
  children,
}) => (floating ? <Portal>{children}</Portal> : <>{children}</>)

const OPEN_BELOW = {
  enter: 'transition duration-150 ease-out',
  enterFrom: 'opacity-0 motion-safe:-translate-y-1',
  enterTo: 'opacity-100 translate-y-0',
  leave: 'transition duration-100 ease-in',
  leaveFrom: 'opacity-100',
  leaveTo: 'opacity-0',
}

const OPEN_BESIDE = {
  ...OPEN_BELOW,
  enterFrom: 'opacity-0 motion-safe:-translate-x-1',
  enterTo: 'opacity-100 translate-x-0',
}

const OPEN_IN_PLACE = {
  enter: 'transition-opacity duration-150 ease-out',
  enterFrom: 'opacity-0',
  enterTo: 'opacity-100',
  leave: 'transition-opacity duration-100 ease-in',
  leaveFrom: 'opacity-100',
  leaveTo: 'opacity-0',
}

const PANEL_SHELL =
  'flex flex-col rounded-xl border border-[#e5e7eb] bg-white p-2 shadow-lg focus:outline-none'

const rowClass = (current: boolean, keyboard: boolean) =>
  `flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${ringIf(
    keyboard,
    RING_ON_WHITE,
  )} ${current ? 'bg-[#f0f9ff]' : 'hover:bg-[#f3f4f6]'}`

const actionClass = (keyboard: boolean) =>
  `flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-[#f3f4f6] ${ringIf(
    keyboard,
    RING_ON_WHITE,
  )}`

interface PanelBodyProps {
  /** `null`: the list hasn't loaded. */
  lines: ChurchLine[] | null
  currentId: number | null
  /** The person is on no church: only Add church and Manage churches. */
  actionsOnly: boolean
  failed: boolean
  retrying: boolean
  /** Draw focus rings: the last input was a key press. */
  keyboard: boolean
  onRetry: () => void
  onChoose: (church: MyChurch) => void
  onAdd: () => void
  onManage: () => void
}

/** What the open card shows: your churches, then Add church and Manage churches. */
const PanelBody: FC<PanelBodyProps> = ({
  lines,
  currentId,
  actionsOnly,
  failed,
  retrying,
  keyboard,
  onRetry,
  onChoose,
  onAdd,
  onManage,
}) => {
  const captionId = useId()
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const currentRef = useRef<HTMLButtonElement>(null)

  const searchable = !!lines && lines.length > SEARCH_ABOVE
  const term = query.trim().toLowerCase()
  const shown =
    lines && term
      ? lines.filter((l) => l.church.name.toLowerCase().includes(term))
      : lines

  // Opened: start where the person acts first, the search field or else the church they're on.
  // This runs before the panel's own focus-on-open, which then leaves focus where it is.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'nearest' })
    const first = rootRef.current?.querySelector<HTMLElement>(ITEM)
    ;(searchRef.current ?? currentRef.current ?? first)?.focus()
  }, [])

  // Up and Down step through the search field, the churches and the actions; Home and End jump.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
    // In the search field, Home and End move the caret.
    if (e.target === searchRef.current && (e.key === 'Home' || e.key === 'End'))
      return
    const items = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>(ITEM),
    )
    if (!items.length) return
    e.preventDefault()
    const at = items.indexOf(document.activeElement as HTMLElement)
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
        ? items.length - 1
        : e.key === 'ArrowDown'
        ? Math.min(at + 1, items.length - 1)
        : Math.max(at - 1, 0)
    items[next]?.focus()
  }

  const list = () => {
    if (shown && shown.length) {
      return (
        <ul
          role="list"
          aria-labelledby={captionId}
          // Six rows, then it scrolls.
          className="max-h-[298px] min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain"
        >
          {shown.map(({ church, detail, spoken }) => {
            const current = church.id === currentId
            const tone: BadgeTone = current
              ? 'current'
              : church.isActive
              ? 'other'
              : 'inactive'
            return (
              <li key={church.id}>
                <button
                  ref={current ? currentRef : undefined}
                  type="button"
                  data-switcher-item
                  aria-current={current ? 'true' : undefined}
                  aria-label={`${church.name}, ${spoken}`}
                  onClick={() => onChoose(church)}
                  className={rowClass(current, keyboard)}
                >
                  <ChurchBadge name={church.name} tone={tone} size="row" />
                  <span className="min-w-0 flex-1">
                    <span
                      title={church.name}
                      className={`block truncate text-sm leading-5 ${
                        church.isActive ? 'text-[#1f2937]' : 'text-[#6b7280]'
                      }`}
                    >
                      {church.name}
                    </span>
                    {/* gray-500 for inactive churches too: gray-400 on white is too faint to read. */}
                    <span className="block truncate text-xs leading-4 text-[#6b7280]">
                      {detail}
                    </span>
                  </span>
                  {current ? (
                    <HiCheck
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-[#0369a1]"
                    />
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      )
    }
    if (shown) {
      return (
        <p role="status" className="px-2 py-3 text-sm text-[#6b7280]">
          No churches match &ldquo;{query.trim()}&rdquo;
        </p>
      )
    }
    if (failed) {
      return (
        <div className="px-2 pb-1">
          <p role="alert" className="text-sm text-[#374151]">
            Couldn&apos;t load your churches.
          </p>
          <button
            type="button"
            data-switcher-item
            onClick={onRetry}
            disabled={retrying}
            className={`mt-1 rounded text-sm font-bold text-[#0369a1] hover:underline disabled:cursor-default disabled:text-[#9ca3af] disabled:no-underline ${ringIf(
              keyboard,
              RING_ON_WHITE,
            )}`}
          >
            {retrying ? 'Trying again…' : 'Try again'}
          </button>
        </div>
      )
    }
    return (
      <div aria-busy="true" className="px-2">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-2.5 py-1.5">
            <span className="h-7 w-7 shrink-0 rounded-md bg-[#f3f4f6] motion-safe:animate-pulse" />
            <span className="flex-1 space-y-1.5">
              <span className="block h-2.5 w-2/3 rounded bg-[#f3f4f6] motion-safe:animate-pulse" />
              <span className="block h-2 w-1/3 rounded bg-[#f3f4f6] motion-safe:animate-pulse" />
            </span>
          </div>
        ))}
        <span className="sr-only">Loading your churches</span>
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      onKeyDown={onKeyDown}
      className="flex min-h-0 flex-1 flex-col"
    >
      {actionsOnly ? null : (
        <>
          <p id={captionId} className="px-2 pb-1.5 pt-1 text-xs text-[#6b7280]">
            Your churches
          </p>
          {searchable ? (
            <div className="px-1 pb-2">
              <div className="relative">
                <HiMagnifyingGlass
                  aria-hidden="true"
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]"
                />
                <input
                  ref={searchRef}
                  type="search"
                  data-switcher-item
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter takes the first match, so "gra" then Enter is a switch - but only once
                    // something is typed: the field has focus as soon as the list opens, and a
                    // stray Enter there must not switch church.
                    if (e.key !== 'Enter' || e.nativeEvent.isComposing || !term)
                      return
                    e.preventDefault()
                    const first = shown?.[0]
                    if (first) onChoose(first.church)
                  }}
                  placeholder="Find a church"
                  aria-label="Find a church"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-lg border border-[#e5e7eb] bg-[#f9fafb] py-1.5 pl-8 pr-2 text-sm text-[#1f2937] placeholder:text-[#9ca3af] focus:border-[#0ea5e9] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]"
                />
              </div>
            </div>
          ) : null}
          {list()}
        </>
      )}

      <div
        className={actionsOnly ? '' : 'mt-1.5 border-t border-[#f3f4f6] pt-1.5'}
      >
        <button
          type="button"
          data-switcher-item
          onClick={onAdd}
          className={`${actionClass(keyboard)} text-[#0369a1]`}
        >
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center"
          >
            <HiPlus className="h-4 w-4" />
          </span>
          Add church
        </button>
        <Link
          to={mainRoute.CHURCHES}
          data-switcher-item
          onClick={onManage}
          className={`${actionClass(keyboard)} text-[#374151]`}
        >
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center"
          >
            <HiOutlineCog6Tooth className="h-4 w-4 text-[#6b7280]" />
          </span>
          Manage churches
        </Link>
      </div>
    </div>
  )
}

/**
 * The church every page works on, as one card that opens the list of your churches. The same for
 * owners and bookkeepers, with one church or many.
 */
const ChurchSwitcher: FC<ChurchSwitcherProps> = ({
  variant = 'sidebar',
  collapsed = false,
}) => {
  const { church, churchId } = useChurch()
  const { data, isError, isFetching, refetch } = useMyChurches()
  const switchChurch = useSwitchChurch()
  const keyboard = useKeyboardInput()
  const [adding, setAdding] = useState(false)
  const cardRef = useRef<HTMLButtonElement>(null)

  const floating = variant === 'sidebar'
  const rail = floating && collapsed
  const churches = Array.isArray(data) ? data : null
  const lines = useMemo(
    () => (churches ? linesFor(churches) : null),
    [churches],
  )
  const pinPanel = usePinnedPanel(cardRef, rail ? 'beside' : 'below')

  useEffect(() => {
    const handoff = refocusAfterSwitch
    if (!floating || !handoff || handoff.churchId !== churchId) return
    refocusAfterSwitch = null
    if (Date.now() - handoff.at < REFOCUS_WITHIN_MS) cardRef.current?.focus()
  }, [floating, churchId])

  const noChurch = !church && churches?.length === 0
  if (!church && !noChurch) {
    return isError && !churches ? (
      <ErrorCard rail={rail} retrying={isFetching} onRetry={() => refetch()} />
    ) : (
      <LoadingCard rail={rail} />
    )
  }

  const current = church
    ? lines?.find((l) => l.church.id === church.id) ?? lineFor(church)
    : null
  const label = current
    ? `Switch church. Current: ${current.church.name}, ${current.spoken}`
    : 'No church yet. Add a church or manage churches'

  const handOffFocus = (id: number) => {
    if (floating) refocusAfterSwitch = { churchId: id, at: Date.now() }
  }

  const choose = (next: MyChurch, close: () => void) => {
    close()
    // Switching clears the church's bank and fee choices, so re-picking the same one must not.
    if (next.id === churchId) return
    handOffFocus(next.id)
    switchChurch(next)
  }

  return (
    <>
      <Popover className={rail ? 'flex justify-center' : 'w-full'}>
        {({ open, close }) => (
          <>
            <Popover.Button
              ref={cardRef}
              aria-label={label}
              aria-haspopup="dialog"
              title={rail ? current?.church.name ?? 'No church yet' : undefined}
              className={
                rail ? railClass(open, keyboard) : cardClass(open, keyboard)
              }
            >
              {rail ? (
                current ? (
                  <ChurchBadge
                    name={current.church.name}
                    tone="current"
                    size="rail"
                  />
                ) : (
                  <EmptySlot size="rail" />
                )
              ) : current ? (
                <>
                  <ChurchBadge
                    name={current.church.name}
                    tone="current"
                    size="card"
                  />
                  <CardText
                    title={current.church.name}
                    fullTitle={current.church.name}
                    detail={current.detail}
                  />
                  <SelectorIcon />
                </>
              ) : (
                <>
                  <EmptySlot size="card" />
                  <CardText title="No church yet" detail="Get started" />
                  <SelectorIcon />
                </>
              )}
            </Popover.Button>

            <PanelLayer floating={floating}>
              <Transition
                as={Fragment}
                {...(rail
                  ? OPEN_BESIDE
                  : floating
                  ? OPEN_BELOW
                  : OPEN_IN_PLACE)}
              >
                <Popover.Panel
                  focus
                  ref={floating ? pinPanel : undefined}
                  role="dialog"
                  aria-label="Switch church"
                  className={
                    floating
                      ? `fixed z-50 w-72 ${PANEL_SHELL}`
                      : `mt-2 w-full ${PANEL_SHELL}`
                  }
                >
                  <PanelBody
                    lines={lines}
                    currentId={churchId}
                    actionsOnly={noChurch}
                    failed={isError && !churches}
                    retrying={isFetching}
                    keyboard={keyboard}
                    onRetry={() => refetch()}
                    onChoose={(next) => choose(next, close)}
                    onAdd={() => {
                      close()
                      setAdding(true)
                    }}
                    onManage={() => close()}
                  />
                </Popover.Panel>
              </Transition>
            </PanelLayer>
          </>
        )}
      </Popover>

      <AddChurchModal
        open={adding}
        onClose={() => setAdding(false)}
        onAdded={(added) => handOffFocus(added.id)}
      />
    </>
  )
}

export default ChurchSwitcher
