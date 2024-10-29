import React, { FC, useEffect, useMemo, useRef, useState } from 'react'

import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'

import { useDispatch } from 'react-redux'
import {
  Avatar,
  Button,
  IconButton,
  Input,
  Spinner,
} from '@material-tailwind/react'
import qboIcon from '@/common/assets/qbo-icon.png'
import { capitalAtFirstLetter } from '@/common/utils/helper'
import { OPEN_MODAL } from '@/redux/common'
import { MODALS_NAME } from '@/common/constant/modal'
import { useQuery } from 'react-query'
import { bookkeeperList } from '@/common/api/user'
import { format } from 'date-fns'
import Lottie from 'lottie-react'
import empty from '@/common/assets/empty.json'
import { AiOutlineUserAdd } from 'react-icons/ai'
import ModalInvitation from '../../bookkeeper/components/Modal'
import {
  setDeleteBookkeeper,
  setProjectFieldValues,
} from '@/redux/nonPersistState'
import MainLayout from '@/common/components/main-layout/MainLayout'
import { MdSettings } from 'react-icons/md'
import { QboGetAllQboData, findCustomers, getQboData } from '@/common/api/qbo'
import { BiChevronLeft, BiChevronRight } from 'react-icons/bi'
import ModalCreateUpdateProject from '@/common/components/modal/ModalCreateUpdateProject'
import Loading from '@/common/components/loading/Loading'
import { CustomerProps } from '@/common/constant/formik'
import DeleteModal from '../modal/DeleteModal'
import { QboDataSelectProps } from '../../automation/mapping'

interface AccountProps {}

interface BookkeeperProps {
  email: string
  id: number
  createdAt: string
  userId: number | null
  User: { email: string; firstName: string; lastName: string }
}

const mappingPayload = (obj: any): CustomerProps => ({
  email: obj?.PrimaryEmailAddr?.Address || '',
  firstName: obj?.GivenName || '',
  lastName: obj?.FamilyName || '',
  middleName: obj?.MiddleName || '',
  mobileno: obj?.Mobile?.FreeFormNumber || '',
  nameToPrintOnChecks: obj?.PrintOnCheckName || '',
  other: obj?.Notes || '',
  projectName: obj?.CompanyName,
  projectDisplayName: obj?.DisplayName,
  phoneno: obj?.PrimaryPhone?.FreeFormNumber || '',
  webAdd: obj?.WebAddr?.URI,
  parentRef: obj?.ParentRef?.value,
  billWithParent: obj?.BillWithParent || false,
  syncToken: obj?.SyncToken,
})

const ITEMS_PER_PAGE = 5

const Projects: FC<AccountProps> = ({}) => {
  const dispatch = useDispatch()
  const [searchTerm, setSearchTerm] = useState<string>('')
  const openModal = () => {
    dispatch(OPEN_MODAL(MODALS_NAME.invitation))
  }

  // const openDeleteModal = () => {
  //   dispatch(OPEN_MODAL(MODALS_NAME.deleteBookeeper))
  //   // dispatch(setDeleteBookkeeper({ id, email }))
  // }

  const user = useSelector((state: RootState) => state.common.user)
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const { projectFieldValues } = useSelector(
    (state: RootState) => state.nonPersistState,
  )
  const [currentPage, setCurrentPage] = useState<number>(1)

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const [isEditLoading, setEditLoading] = useState<boolean>(false)
  const [isRemoveLoading, setRemoveLoading] = useState<boolean>(false)

  const [editingCustomerId, setEditingCustomerId] = useState<number | string>(
    '',
  )

  const { data, refetch, isLoading } = useQuery<BookkeeperProps[]>(
    ['bookkeeperList'],
    async () => {
      const res = await bookkeeperList({ clientId: user?.id })
      return res.data
    },
    { staleTime: Infinity, refetchOnWindowFocus: false },
  )

  const {
    data: qboData,
    isLoading: isQboDataLoading,
    refetch: refetchQboData,
  } = useQuery<QboDataSelectProps>(
    useMemo(() => ['getAllQboData', bookkeeper], [bookkeeper]), // Memoize the key
    async () => await getQboData(user, bookkeeper),
    { staleTime: Infinity, refetchOnWindowFocus: false },
  )

  // Check if qboData.customers is defined and is an array
  const customers =
    qboData && Array.isArray(qboData.customers) ? qboData.customers : []

  // Filter customers based on search term
  const filteredAccounts = customers.filter((customer) =>
    customer.label.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Calculate total pages based on filtered customers
  const totalPages = Math.ceil(filteredAccounts?.length / ITEMS_PER_PAGE)

  // Get the current page of filtered customers
  const paginatedData = filteredAccounts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  )

  const handleCreateProjectSelection = () => {
    dispatch(OPEN_MODAL(MODALS_NAME.projectCU))
  }

  const openDeleteModal = async (Id: number | string) => {
    setRemoveLoading(true)
    setEditingCustomerId(Id)
    const email =
      user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
    try {
      const result = await findCustomers(email, Id)
      const payload = mappingPayload(result)
      const obj = {
        ...payload,
        Id: Number(Id) || 0,
        SyncToken: payload.syncToken
          ? String(Number(payload.syncToken) + 1)
          : '',
      }
      if (result) {
        dispatch(setProjectFieldValues(obj))
      }
      setRemoveLoading(false)
    } catch (error) {
      setRemoveLoading(true)
      console.log('error', error)
    }
  }

  const editHandler = async (Id: number | string) => {
    setEditLoading(true)
    setEditingCustomerId(Id)
    const email =
      user.role === 'bookkeeper' ? bookkeeper?.clientEmail || '' : user.email
    try {
      const result = await findCustomers(email, Id)
      const payload = mappingPayload(result)
      const obj = {
        ...payload,
        Id: Number(Id) || 0,
        SyncToken: payload.syncToken
          ? String(Number(payload.syncToken) + 1)
          : '',
      }
      if (result) {
        dispatch(setProjectFieldValues(obj))
      } else {
        setEditLoading(false)
        console.log('error', result.error)
      }
    } catch (error) {
      setEditLoading(false)
      console.log('error', error)
    }
  }

  useEffect(() => {
    if (projectFieldValues) {
      setEditLoading(false)

      const modalType = isEditLoading
        ? MODALS_NAME.projectCU
        : isRemoveLoading
        ? MODALS_NAME.deleteProject
        : null
      if (modalType) {
        dispatch(OPEN_MODAL(modalType))
      }
    }
  }, [projectFieldValues, isEditLoading, isRemoveLoading])

  return (
    <MainLayout>
      <div className="-m-6 p-6 h-full">
        {/* Header */}
        <div className="pb-2">
          <div className="flex flex-col border-b-2 pb-2">
            <div className="flex items-center gap-2">
              <MdSettings size={28} className="text-blue-400" />
              <span className="font-bold text-lg text-primary">Settings</span>
            </div>
          </div>
        </div>

        {isQboDataLoading ? (
          <Loading />
        ) : (
          <div className="w-full  flex flex-col bg-white justify-center px-8 mt-2">
            <ModalCreateUpdateProject />
            <DeleteModal refetch={refetchQboData} />
            <div className="flex justify-between mt-4">
              <div className="w-72">
                <Input
                  label="Search Projects"
                  color="teal"
                  onChange={(e) => {
                    setSearchTerm(e.target.value) // Update search term
                    setCurrentPage(1) // Reset to first page on search change
                  }}
                  crossOrigin={undefined}
                />
              </div>

              <Button
                variant="outlined"
                className="border-gray-400 text-black flex items-center gap-3 font-thin"
                onClick={handleCreateProjectSelection}
                disabled={data ? (data?.length > 3 ? true : false) : false}
              >
                <AiOutlineUserAdd size={18} className="text-yellow" />
                Add new project
              </Button>
            </div>
            {qboData && qboData.customers?.length > 0 ? (
              paginatedData?.map((a) => (
                <div key={a.value}>
                  <div className="flex items-center justify-between gap-2 px-4 pt-4 w-full">
                    <div className="flex flex-col">
                      <p className="text-md text-primary">{a.label}</p>
                      <p className="text-md text-gray-400">
                        {a.companyName || 'N/A'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex gap-2 items-center">
                        {editingCustomerId === a.value && isEditLoading ? (
                          <Spinner color="green" />
                        ) : (
                          ''
                        )}
                        <Button
                          variant="text"
                          className="text-green-600 italic font-normal"
                          onClick={() => editHandler(a.value)}
                        >
                          Edit
                        </Button>
                      </div>

                      <div className="flex gap-2 items-center">
                        {editingCustomerId === a.value && isRemoveLoading ? (
                          <Spinner color="green" />
                        ) : (
                          ''
                        )}
                        <Button
                          variant="text"
                          className="text-red-600 italic font-normal"
                          onClick={() => openDeleteModal(a.value)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 px-4 gap-4 border-b-[1px] py-6 border-[#DDDDDD]" />
                </div>
              ))
            ) : (
              <div className="flex flex-col pt-8 items-center h-full">
                <Lottie animationData={empty} loop={true} className="h-64" />
                <div className="flex flex-col gap-4 text-center">
                  <p className="text-4xl">No Project found</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-8 justify-center my-4">
              {/* Prev Button */}
              <IconButton
                disabled={currentPage === 1}
                className="text-white bg-white"
                onClick={() => handlePageChange(currentPage - 1)}
              >
                <BiChevronLeft size={22} className="text-green-600" />
              </IconButton>

              {/* Current Page and Total Pages */}
              {searchTerm === '' && ( // Only show pagination when not searching
                <p className="block font-sans text-base antialiased font-normal leading-relaxed text-gray-700">
                  Page <strong className="text-gray-900">{currentPage}</strong>{' '}
                  of{' '}
                  <strong className="text-gray-900">
                    {totalPages}{' '}
                    {/* Use totalPages which is calculated from filteredAccounts */}
                  </strong>
                </p>
              )}

              {/* Next Button */}
              <IconButton
                disabled={currentPage === totalPages || searchTerm !== ''}
                className="text-white bg-white"
                onClick={() => handlePageChange(currentPage + 1)}
              >
                <BiChevronRight size={22} className="text-green-600" />
              </IconButton>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}

export default Projects
