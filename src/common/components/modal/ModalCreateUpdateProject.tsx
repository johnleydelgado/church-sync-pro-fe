import {
  QboGetAllQboData,
  addProject,
  getQboData,
  updateProject,
} from '@/common/api/qbo'
import { customerInitialValues } from '@/common/constant/formik'
import { MODALS_NAME } from '@/common/constant/modal'
import { failNotification, successNotification } from '@/common/utils/toast'
import { QboDataSelectProps } from '@/pages/Main/settings'
import { CLOSE_MODAL } from '@/redux/common'
import { setProjectFieldValues } from '@/redux/nonPersistState'
import { RootState, useAppDispatch } from '@/redux/store'
import { Dialog, Transition } from '@headlessui/react'
import {
  Button,
  Checkbox,
  IconButton,
  Typography,
} from '@material-tailwind/react'
import { Spinner } from 'flowbite-react'
import { useFormik } from 'formik'

import { FC, Fragment, useEffect, useMemo, useState } from 'react'
import { BiPhone } from 'react-icons/bi'
import { FaTimes } from 'react-icons/fa'
import { FcContacts } from 'react-icons/fc'
import { MdContacts } from 'react-icons/md'
import { useQuery } from 'react-query'
import { useDispatch } from 'react-redux'
import { useSelector } from 'react-redux'
import Dropdown, { components } from 'react-select'
import { object } from 'yup'
import * as yup from 'yup'
interface ModalRegistrationProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
}

interface InputProps {
  placeholder: string
  label: string
  w: string
  onChange: any
  value: any
  name: string
  error?: string
  required: boolean
  disabled?: boolean
}

const Input = ({
  placeholder,
  label,
  w,
  onChange,
  value,
  name,
  error,
  required,
  disabled,
}: InputProps) => (
  <div className={`flex flex-col gap-2 ${w}`}>
    <label
      className={`font-extralight text-gray-500 tracking-wide ${
        required ? 'text-black font-normal' : 'text-gray-500'
      }`}
    >
      {label}
    </label>
    <input
      name={name}
      className={`border-gray-300 rounded-md hover:border-green-400 focus:border-green-400 focus:ring-0 font-thin text-gray-500 text-md`}
      id={label}
      type="text"
      placeholder={placeholder}
      onChange={onChange}
      value={value}
      disabled={disabled}
    />
    {error ? (
      <label className="font-extralight text-red-400 tracking-wide text-sm">
        {error}
      </label>
    ) : null}
  </div>
)

const InputD = (props: any) => (
  <components.Input
    {...props}
    inputClassName="outline-none border-none shadow-none focus:ring-transparent"
  />
)

const ModalCreateUpdateProject: FC<ModalRegistrationProps> = ({ size }) => {
  const dispatch = useDispatch()
  const openModals = useSelector((state: RootState) => state.common.openModals)
  const { projectFieldValues } = useSelector(
    (state: RootState) => state.nonPersistState,
  )
  const [isSubCustomer, setIsSubCustomer] = useState<boolean>(false)

  const handleCloseModals = () => {
    dispatch(setProjectFieldValues(null))
    dispatch(CLOSE_MODAL(MODALS_NAME.projectCU))
    formik.resetForm()
    setIsSubCustomer(false)
  }

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const bookkeeper = useSelector((item: RootState) => item.common.bookkeeper)
  const { user } = useSelector((state: RootState) => state.common)
  const isOpen = openModals.includes(MODALS_NAME.projectCU)

  const {
    data: qboData,
    isLoading: isQboDataLoading,
    refetch,
  } = useQuery(
    useMemo(() => ['getAllQboData', bookkeeper], [bookkeeper]), // Memoize the key
    async () => await getQboData(user, bookkeeper),
    { staleTime: Infinity, refetchOnWindowFocus: false },
  )

  const formik = useFormik({
    initialValues: projectFieldValues || customerInitialValues,
    enableReinitialize: true,
    validationSchema: object({
      firstName: yup.string(),
      middleName: yup.string(),
      lastName: yup.string(),
      projectName: yup.string(),
      projectDisplayName: yup
        .string()
        .required('Project Display Name is a required field'),
      email: yup
        .string()
        .email('Invalid email')
        .matches(
          /.*\.[a-zA-Z]{2,}$/,
          'Email must contain a top-level domain like .com, .net, etc.',
        ),
      phoneno: yup.string(),
      mobileno: yup.string(),
      fax: yup.string(),
      other: yup.string(),
      webAdd: yup.string(),
      nameToPrintOnChecks: yup.string(),
      parentRef: yup.string(),
    }),
    onSubmit: async (values) => {
      // forgotPasswordHandler(values.email)
      try {
        setIsLoading(true)
        const email =
          user.role === 'bookkeeper'
            ? bookkeeper?.clientEmail || ''
            : user.email

        if (!projectFieldValues) {
          await addProject(email, values)
          successNotification({ title: 'Project Successfully Created' })
        } else {
          console.log('obj', values, projectFieldValues)

          await updateProject(email, values)
          successNotification({ title: 'Project Successfully Updated' })
        }

        refetch()
        handleCloseModals()
      } catch (e) {
        if (!projectFieldValues) {
          failNotification({ title: 'Error in creating a project' })
        } else {
          failNotification({ title: 'Error in updating a project' })
        }
      } finally {
        setIsLoading(false)
      }
    },
  })

  useEffect(() => {
    if (projectFieldValues)
      setIsSubCustomer(projectFieldValues?.parentRef ? true : false)
  }, [projectFieldValues])

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-10 overflow-y-auto"
        onClose={() => {
          return handleCloseModals()
        }}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-custom">
          <div className="flex min-h-screen justify-end">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between">
                  {/* This will space out your title and button */}
                  <Dialog.Title
                    as="h3"
                    className="flex-grow text-xl font-semibold leading-6 text-gray-900 text-center pl-10" // This will center the text within the title element
                  >
                    {projectFieldValues ? 'Update Project' : ' Add Project'}
                  </Dialog.Title>
                  <div className="flex justify-end">
                    {' '}
                    {/* This will align the button to the right */}
                    <IconButton
                      className="bg-transparent text-black" // No need for ml-auto here as flex justify-end will take care of it
                      onClick={() => handleCloseModals()}
                    >
                      <FaTimes />
                    </IconButton>
                  </div>
                </div>
                <form
                  className="mt-4 flex flex-col gap-4 shadow-lg p-4"
                  onSubmit={formik.handleSubmit}
                >
                  <div className="flex gap-4 items-center">
                    <MdContacts size={22} className="text-green-500" />
                    <label className="font-semibold text-gray-500 tracking-wide">
                      Name
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-4 py-4">
                    <Input
                      name="firstName"
                      label="First name"
                      placeholder=""
                      w="w-full"
                      onChange={formik.handleChange}
                      value={formik.values.firstName}
                      required={false}
                    />
                    <Input
                      name="middleName"
                      label="Middle name"
                      placeholder=""
                      w="w-full"
                      onChange={formik.handleChange}
                      value={formik.values.middleName}
                      required={false}
                    />
                    <Input
                      name="lastName"
                      label="Last name"
                      placeholder=""
                      w="w-full"
                      onChange={formik.handleChange}
                      value={formik.values.lastName}
                      required={false}
                    />
                    <div className="col-span-3 border-b border-gray-200" />
                  </div>

                  <div className="flex gap-4 items-center">
                    <BiPhone size={22} className="text-green-500" />
                    <label className="font-semibold text-gray-500 tracking-wide">
                      Contact
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-4 py-4">
                    <Input
                      name="projectName"
                      label="Project name *"
                      placeholder=""
                      w="w-full"
                      onChange={(e: any) => {
                        formik.setFieldValue('projectName', e.target.value)
                        formik.setFieldValue(
                          'nameToPrintOnChecks',
                          e.target.value,
                        )
                        formik.setFieldValue(
                          'projectDisplayName',
                          e.target.value,
                        )
                      }}
                      value={formik.values.projectName}
                      required
                    />
                    <Input
                      name="projectDisplayName"
                      label="Project display name *"
                      placeholder=""
                      w="w-full"
                      onChange={(e: any) => {
                        formik.setFieldValue(
                          'projectDisplayName',
                          e.target.value,
                        )
                        // Only update nameToPrintOnChecks if it's not manually changed by the user
                        if (formik.values.projectName) {
                          formik.setFieldValue(
                            'nameToPrintOnChecks',
                            e.target.value,
                          )
                        }
                      }}
                      value={formik.values.projectDisplayName}
                      required
                    />
                    <Input
                      name="email"
                      label="Email"
                      placeholder=""
                      w="w-full"
                      onChange={formik.handleChange}
                      value={formik.values.email}
                      error={formik.errors.email}
                      required={false}
                    />
                    <Input
                      name="phoneno"
                      label="Phone number"
                      placeholder=""
                      w="w-full"
                      onChange={formik.handleChange}
                      value={formik.values.phoneno}
                      required={false}
                    />
                    <Input
                      name="mobileno"
                      label="Mobile number"
                      placeholder=""
                      w="w-full"
                      onChange={formik.handleChange}
                      value={formik.values.mobileno}
                      required={false}
                    />
                    <Input
                      name="other"
                      label="Other"
                      placeholder=""
                      w="w-full"
                      onChange={formik.handleChange}
                      value={formik.values.other}
                      required={false}
                    />
                    <Input
                      name="webAdd"
                      label="Website"
                      placeholder=""
                      w="w-full"
                      onChange={formik.handleChange}
                      value={formik.values.webAdd}
                      required={false}
                    />
                    <Input
                      name="nameToPrintOnChecks"
                      label="Name to print on checks"
                      placeholder=""
                      w="w-full col-span-2"
                      onChange={formik.handleChange}
                      value={formik.values.nameToPrintOnChecks}
                      disabled
                      required={false}
                    />
                    <div className="col-span-3 border-b border-gray-200" />
                    <div className="col-span-3">
                      <Checkbox
                        id="1"
                        color="green"
                        label={
                          <Typography className="text-gray-600">
                            Is a sub cutomer
                          </Typography>
                        }
                        ripple
                        checked={isSubCustomer}
                        onChange={(a) => setIsSubCustomer(!isSubCustomer)}
                        crossOrigin={undefined}
                      />
                    </div>
                    {isSubCustomer ? (
                      <div className="flex flex-col  pl-10 col-span-2 w-3/5">
                        <Dropdown<{ value: string; label: string }>
                          options={qboData?.customers}
                          value={{
                            value: formik.values.parentRef,
                            label:
                              qboData?.customers.find(
                                (a: { value: string }) =>
                                  a.value === formik.values.parentRef,
                              )?.label || '',
                          }}
                          onChange={(e) =>
                            formik.setFieldValue('parentRef', e?.value)
                          }
                        />
                        <Checkbox
                          id="2"
                          color="green"
                          label={
                            <Typography className="text-gray-600">
                              Bill parent customer
                            </Typography>
                          }
                          ripple
                          checked={formik.values.billWithParent}
                          onChange={(a) =>
                            formik.setFieldValue(
                              'billWithParent',
                              !formik.values.billWithParent,
                            )
                          }
                          crossOrigin={undefined}
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="flex gap-4 self-end">
                    <Button
                      className="bg-red-600"
                      onClick={() => handleCloseModals()}
                    >
                      Cancel
                    </Button>
                    <Button className="bg-green-500" type="submit">
                      {isLoading ? <Spinner className="mr-8" /> : null}
                      Save
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

export default ModalCreateUpdateProject
