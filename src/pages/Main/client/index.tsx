import React, { FC, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Button } from '@material-tailwind/react'
import { FiUserPlus } from 'react-icons/fi'
import MainLayout from '@/common/components/main-layout/MainLayout'
import AddUpdateClientModalRegistration from './components/modal'
import { OPEN_MODAL } from '@/redux/common'
import { MODALS_NAME } from '@/common/constant/modal'
import ConfirmDeactivationModal from './components/modalClientDeactivation'
import SearchInput from './components/searchInput'
import FiltersPopover from './components/filtersPopover'
import ClientCard from './components/clientCard'
import {
  useBookkeeperListSidebar,
  useToggleUserActiveStatus,
} from '@/common/hooks/useQueries'
import { RootState } from '@/redux/store'
import Pagination from './components/pagination'
import ClientTableRow from './components/ClientTableRow'
import { ClientBookkeeper } from '@/common/constant/global-interfaces'
import { useQueryClient } from 'react-query'

const ClientManagement: FC = () => {
  const dispatch = useDispatch()
  const { id } = useSelector((state: RootState) => state.common.user)
  const { mutate } = useToggleUserActiveStatus()
  const queryClient = useQueryClient()

  const [selectedClient, setSelectedClient] = useState<ClientBookkeeper | null>(
    null,
  )
  const [statusFilter, setStatusFilter] = useState<string>('') // For filtering by status
  const [sortOrder, setSortOrder] = useState<string>('asc') // For sorting by Church Name
  const [currentPage, setCurrentPage] = useState<number>(1)

  const { data: finalData } = useBookkeeperListSidebar(id, 'bookkeeper')
  const clients = finalData ? finalData.map((a) => a.Client) : []

  // Apply Filters and Sorting
  const filteredAndSortedClients = useMemo(() => {
    let filteredClients = [...clients]

    // Apply status filter
    if (statusFilter) {
      filteredClients = filteredClients.filter((client) =>
        statusFilter === 'active' ? client.isActive : !client.isActive,
      )
    }

    // Apply sorting by Church Name
    filteredClients.sort((a, b) => {
      const nameA = a.churchName.toLowerCase()
      const nameB = b.churchName.toLowerCase()
      if (sortOrder === 'asc') {
        return nameA.localeCompare(nameB)
      } else {
        return nameB.localeCompare(nameA)
      }
    })

    return filteredClients
  }, [clients, statusFilter, sortOrder])

  // Pagination Logic
  const itemsPerPage = 10
  const totalCount = filteredAndSortedClients.length
  const currentClients = filteredAndSortedClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  )

  const handlePageChange = (page: number) => setCurrentPage(page)

  const openNewClientModal = () => {
    dispatch(OPEN_MODAL(MODALS_NAME.modalClientRegistration))
  }

  const openClientDeactivationModal = (client: any) => {
    setSelectedClient(client)
    dispatch(OPEN_MODAL(MODALS_NAME.modalConfirmDeactivation))
  }

  const handleDeactivateAccount = async (userId: number, isActive: boolean) => {
    if (selectedClient) {
      mutate(
        { userId, isActive },
        {
          onSuccess: () => {
            console.log('Mutation successful!')
            queryClient.refetchQueries(['bookkeeperListSidebar', 'bookkeeper'])
          },
          onError: (error) => {
            console.error('Mutation failed:', error)
          },
        },
      )
    }
  }

  return (
    <MainLayout>
      <AddUpdateClientModalRegistration isUpdate />

      <ConfirmDeactivationModal
        onConfirm={() =>
          handleDeactivateAccount(selectedClient?.id || 0, false)
        }
        selectedClient={selectedClient}
      />

      <div className="p-6 h-full">
        <div className="border-b-2 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg text-primary">
              Clients Management
            </h1>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-end items-center gap-4 md:gap-4 w-full">
          <Button
            className="flex items-center gap-2 bg-primary text-white rounded-lg h-10 px-4 sm:w-32 md:w-36"
            onClick={openNewClientModal}
          >
            <FiUserPlus size={18} />
            <span>New Client</span>
          </Button>
          <FiltersPopover
            currentStatus={statusFilter} // Pass the current filter state
            currentSort={sortOrder} // Pass the current sort state
            onStatusChange={(value) => {
              setStatusFilter(value)
              setCurrentPage(1) // Reset to the first page
            }}
            onSortChange={(value) => {
              setSortOrder(value)
              setCurrentPage(1) // Reset to the first page
            }}
          />

          <SearchInput />
        </div>

        <div className="relative overflow-x-auto pt-8 hidden md:block">
          <table className="w-full text-sm text-gray-500 border-separate border-spacing-0">
            <thead className="text-xs text-yellow uppercase bg-white border-y-2 border-yellow">
              <tr className="[&>*]:px-6 [&>*]:py-4">
                <th className="text-left">Church Name</th>
                <th className="text-right">Status</th>
                <th className="text-right">Date Created</th>
                <th className="text-center align-middle">
                  Account Integration
                </th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody className="[&>tr]:border-b [&>tr]:border-yellow">
              {currentClients.map((client, index) => (
                <ClientTableRow
                  key={index}
                  client={client}
                  onDelete={() => openClientDeactivationModal(client)}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4 md:hidden">
          {currentClients.map((client, index) => (
            <ClientCard
              key={index}
              client={client}
              onDelete={() => openClientDeactivationModal(client)}
            />
          ))}
        </div>

        <div className="flex justify-end w-full p-6">
          <Pagination
            currentPage={currentPage}
            totalCount={totalCount}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </MainLayout>
  )
}

export default ClientManagement
