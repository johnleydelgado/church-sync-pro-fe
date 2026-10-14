import React, { FC, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from 'react-query'
import { Button } from '@material-tailwind/react'
import { FiPlus } from 'react-icons/fi'
import { HiOutlineOfficeBuilding } from 'react-icons/hi'
import MainLayout from '@/common/components/main-layout/MainLayout'
import { ChurchApiError, MyChurch, updateChurch } from '@/common/api/church'
import { mainRoute } from '@/common/constant/route'
import {
  MY_CHURCHES_KEY,
  useChurch,
  useMyChurches,
  useSwitchChurch,
} from '@/common/hooks/useChurch'
import { useConnectIntegration } from '@/common/hooks/useConnectIntegration'
import { failNotification, successNotification } from '@/common/utils/toast'
import AddChurchModal from './AddChurchModal'
import ChurchCard from './ChurchCard'
import ChurchRow from './ChurchRow'
import ChurchStatusDialog from './ChurchStatusDialog'
import RenameChurchModal from './RenameChurchModal'
import { ChurchIntegration } from './components/churchBits'
import FiltersPopover, { StatusFilter } from './components/filtersPopover'
import Pagination from './components/pagination'
import SearchInput from './components/searchInput'

const ITEMS_PER_PAGE = 10

/** Every church the signed-in person works on: add one, connect it, open it, deactivate it. */
const ChurchesPage: FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {
    data: churches,
    isLoading,
    isIdle,
    isError,
    error,
    isFetching,
    refetch,
  } = useMyChurches()
  const { churchId: selectedId } = useChurch()
  const switchChurch = useSwitchChurch()
  const connectIntegration = useConnectIntegration()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [addOpen, setAddOpen] = useState(false)
  const [starting, setStarting] = useState<{
    churchId: number
    type: ChurchIntegration
  } | null>(null)
  const [statusTarget, setStatusTarget] = useState<MyChurch | null>(null)
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [renameTarget, setRenameTarget] = useState<MyChurch | null>(null)

  // Back from the sign-in page with the browser's Back button: this page comes out of the
  // back/forward cache as it was left, with its Connect button still spinning.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setStarting(null)
    }
    window.addEventListener('pageshow', onShow)
    return () => window.removeEventListener('pageshow', onShow)
  }, [])

  const list = useMemo(
    () => (Array.isArray(churches) ? churches : []),
    [churches],
  )

  // The server's order is kept: active churches first, then by name.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return list.filter(
      (c) =>
        (statusFilter === '' || (statusFilter === 'active') === c.isActive) &&
        (!term || c.name.toLowerCase().includes(term)),
    )
  }, [list, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  // A deactivation under the Active filter can shrink the list past the page being shown.
  const page = Math.min(currentPage, totalPages)
  const pageItems = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  )

  const loading = (isLoading || isIdle) && !Array.isArray(churches)
  const failed = isError && !Array.isArray(churches)
  const isEmpty = !loading && !failed && list.length === 0

  /** Make it the selected church (unless it already is), then go there. */
  const goTo = (church: MyChurch, to: string) => {
    // Switching clears the church's bank and fee choices, so re-picking the same one must not.
    if (church.id !== selectedId) switchChurch(church)
    navigate(to)
  }

  const connect = async (church: MyChurch, type: ChurchIntegration) => {
    if (starting) return
    setStarting({ churchId: church.id, type })
    try {
      // On success the browser is already leaving for the sign-in page; keep the spinner.
      await connectIntegration(type, church, mainRoute.CHURCHES)
    } catch (e: any) {
      failNotification({
        title: e?.message || "Couldn't start connecting. Please try again.",
      })
      setStarting(null)
    }
  }

  const askToggleActive = (church: MyChurch) => {
    setStatusError(null)
    setStatusTarget(church)
  }

  const confirmToggleActive = async () => {
    if (!statusTarget || statusSaving) return
    const church = statusTarget
    const isActive = !church.isActive
    setStatusSaving(true)
    setStatusError(null)
    try {
      await updateChurch(church.id, { isActive })
    } catch (e) {
      setStatusError(
        e instanceof ChurchApiError && e.message
          ? e.message
          : 'Could not update the church.',
      )
      setStatusSaving(false)
      return
    }
    // The change is saved; the list catches up in the background (with its own retries).
    setStatusSaving(false)
    setStatusTarget(null)
    successNotification({
      title: isActive
        ? `${church.name} is active again.`
        : `${church.name} is deactivated. Nightly posting is off for it.`,
    })
    // A fetch already on its way may have left before the change; replace it.
    queryClient.invalidateQueries(
      { queryKey: MY_CHURCHES_KEY },
      { cancelRefetch: true },
    )
  }

  const resetToFirstPage = () => setCurrentPage(1)

  const actionsFor = (church: MyChurch) => ({
    church,
    isSelected: church.id === selectedId,
    onOpen: () => goTo(church, mainRoute.TRANSACTION),
    onPeople: () => goTo(church, `${mainRoute.SETTINGS}?tab=people`),
    // Owners rename; the server refuses anyone else.
    onRename: church.canManagePeople
      ? () => setRenameTarget(church)
      : undefined,
  })

  const addButton = (
    <Button
      className="flex items-center justify-center gap-2 bg-primary text-white rounded-lg h-10 px-4 normal-case"
      onClick={() => setAddOpen(true)}
    >
      <FiPlus size={18} />
      <span>Add church</span>
    </Button>
  )

  const renderBody = () => {
    if (loading) {
      return (
        <div role="status">
          <span className="sr-only">Loading churches</span>
          <div className="hidden md:block pt-8" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="mb-3 h-12 w-full animate-pulse rounded bg-gray-200"
              />
            ))}
          </div>
          <div className="space-y-4 pt-6 md:hidden" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-28 w-full animate-pulse rounded-lg bg-gray-200"
              />
            ))}
          </div>
        </div>
      )
    }

    if (failed) {
      return (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-gray-700">
            {error instanceof Error && error.message
              ? error.message
              : 'Could not load your churches.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-lg bg-yellow px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isFetching ? 'Trying again…' : 'Try again'}
          </button>
        </div>
      )
    }

    if (isEmpty) {
      return (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <HiOutlineOfficeBuilding size={40} className="text-gray-300" />
          <p className="max-w-md text-gray-700">
            You&apos;re not on a church yet. Add one, or ask a church&apos;s
            owner to invite you.
          </p>
          {addButton}
        </div>
      )
    }

    if (filtered.length === 0) {
      return (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-gray-500">No churches match.</p>
          <button
            type="button"
            className="text-sm text-primary underline"
            onClick={() => {
              setSearch('')
              setStatusFilter('')
              resetToFirstPage()
            }}
          >
            Show all churches
          </button>
        </div>
      )
    }

    return (
      <>
        <div className="relative hidden overflow-x-auto pt-8 md:block">
          <table className="w-full border-separate border-spacing-0 text-sm text-gray-500">
            <thead className="border-y-2 border-yellow bg-white text-xs uppercase text-yellow">
              <tr className="[&>*]:px-6 [&>*]:py-4">
                <th scope="col" className="text-left">
                  Church
                </th>
                <th scope="col" className="text-left">
                  QuickBooks
                </th>
                <th scope="col" className="text-left">
                  Planning Center
                </th>
                <th scope="col" className="text-left">
                  Status
                </th>
                <th scope="col" className="text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="[&>tr>td]:border-b [&>tr>td]:border-gray-100">
              {pageItems.map((church) => (
                <ChurchRow
                  key={church.id}
                  {...actionsFor(church)}
                  starting={
                    starting?.churchId === church.id ? starting.type : null
                  }
                  connectBusy={!!starting}
                  onConnect={(type) => connect(church, type)}
                  onToggleActive={
                    church.canManagePeople
                      ? () => askToggleActive(church)
                      : undefined
                  }
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4 pt-6 md:hidden">
          {pageItems.map((church) => (
            <ChurchCard key={church.id} {...actionsFor(church)} />
          ))}
        </div>

        {totalPages > 1 ? (
          <div className="flex w-full justify-end p-6">
            <Pagination
              currentPage={page}
              totalCount={filtered.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        ) : null}
      </>
    )
  }

  return (
    <MainLayout>
      <AddChurchModal open={addOpen} onClose={() => setAddOpen(false)} />
      <RenameChurchModal
        church={renameTarget}
        onClose={() => setRenameTarget(null)}
      />
      <ChurchStatusDialog
        church={statusTarget}
        saving={statusSaving}
        error={statusError}
        onCancel={() => setStatusTarget(null)}
        onConfirm={confirmToggleActive}
      />

      <div className="h-full p-6">
        <div className="mb-6 flex flex-col gap-4 border-b-2 pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-lg font-bold text-primary">Churches</h1>
            <p className="pt-1 text-sm text-gray-500">
              Every church you work on. Pick one in the sidebar to work on it.
            </p>
          </div>
          {/* An empty list shows its own Add church button; one is enough. */}
          {isEmpty ? null : addButton}
        </div>

        {!loading && !failed && list.length > 0 ? (
          <div className="flex w-full flex-col items-center gap-4 md:flex-row md:justify-end">
            <FiltersPopover
              currentStatus={statusFilter}
              onStatusChange={(value) => {
                setStatusFilter(value)
                resetToFirstPage()
              }}
            />
            <SearchInput
              value={search}
              placeholder="Search by church name"
              onChange={(value) => {
                setSearch(value)
                resetToFirstPage()
              }}
            />
          </div>
        ) : null}

        {renderBody()}
      </div>
    </MainLayout>
  )
}

export default ChurchesPage
