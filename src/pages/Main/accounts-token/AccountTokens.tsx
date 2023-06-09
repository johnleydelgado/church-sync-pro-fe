// import {
//   deleteUserToken,
//   getTokenList,
//   updateUserToken,
// } from '@/common/api/user'
// import Empty from '@/common/components/empty/Empty'
// import MainLayout from '@/common/components/main-layout/MainLayout'
// import { failNotification, successNotification } from '@/common/utils/toast'
// import { RootState } from '@/redux/store'
// import { TextInput } from 'flowbite-react'
// import { Button, Checkbox, Radio } from '@material-tailwind/react'
// import { isEmpty } from 'lodash'
// import React, { FC, useEffect, useRef, useState } from 'react'
// import { BiEdit, BiSave } from 'react-icons/bi'
// import { FiDelete } from 'react-icons/fi'
// import { MdDelete } from 'react-icons/md'
// import { useQuery } from 'react-query'
// import { useSelector } from 'react-redux'
// import { Tooltip } from 'react-tooltip'
// import Loading from '@/common/components/loading/Loading'
// import { authApi } from '@/common/api/auth'
// import { useDispatch } from 'react-redux'
// import {
//   setReTriggerIsUserTokens,
//   setSelectedThirdPartyId,
//   setUserData,
// } from '@/redux/common'
// import { useLocation, useNavigate } from 'react-router'

// interface AccountTokensProps {}

// interface Token {
//   id?: number
//   userId: number
//   tokenEntityId: number
//   token_type: 'stripe' | 'qbo' | 'pco' | string
//   access_token: string | null
//   refresh_token: string | null
//   realm_id: string | null
//   isSelected: boolean
//   organization_name: string | null
// }

// export interface AccountTokenDataProps {
//   id: number
//   isEnabled: false
//   email: string
//   tokens: Token[]
//   createAt?: string
//   updatedAt?: string
// }

// interface AccountTokensDataProps {
//   id: number
//   userId: number
//   tokens: Token[]
//   isSelected: boolean
// }

// const AccountTokens: FC<AccountTokensProps> = ({}) => {
//   const dispatch = useDispatch()
//   const subscribed = useRef(false)

//   const { email, id } = useSelector((item: RootState) => item.common.user)
//   const userData = useSelector((item: RootState) => item.common.user)
//   const reTriggerIsUserTokens = useSelector(
//     (item: RootState) => item.common.reTriggerIsUserTokens,
//   )

//   const selectedThirdPartyId = useSelector(
//     (item: RootState) => item.common.selectedThirdPartyId,
//   )

//   const [organizationName, setOrganizationName] = useState<string>('')
//   const [editAccountName, setEditAccountName] = useState({
//     isEditing: false,
//     index: 0,
//   })
//   const [accountTokenData, setAccountTokenData] = useState<
//     AccountTokenDataProps[]
//   >([])

//   const location = useLocation()
//   const history = useNavigate()

//   const { data, refetch, isRefetching } = useQuery<AccountTokenDataProps[]>(
//     ['getTokenList'],
//     async () => {
//       if (email) return await getTokenList(email)
//     },
//     {
//       staleTime: Infinity,
//     },
//   )

//   const qboLoginHandler = async (thirdPartyId: number) => {
//     dispatch(setSelectedThirdPartyId(thirdPartyId))
//     // setIsBtnLoading({ ...isBtnLoading, qboLoading: true })
//     const authUri = await authApi('authQB')
//     window.location.href = authUri
//   }

//   const pcoLoginHandler = async (thirdPartyId: number) => {
//     dispatch(setSelectedThirdPartyId(thirdPartyId))
//     // setIsBtnLoading({ ...isBtnLoading, qboLoading: true })
//     const authUri = await authApi('authPC')
//     window.location.href = authUri
//   }

//   const stripeLoginHandler = async (thirdPartyId: number) => {
//     dispatch(setSelectedThirdPartyId(thirdPartyId))
//     const authUri = await authApi('authStripe')
//     window.location.href = authUri
//   }

//   const editHandler = async (
//     index: number,
//     editing: boolean,
//     tokens: Token[],
//   ) => {
//     if (!editing) {
//       const checkIfOrgExist = data?.find(
//         (i) => i.tokens[0]?.organization_name === organizationName,
//       )

//       if (!isEmpty(checkIfOrgExist)) {
//         return failNotification({
//           title: 'The organization name is already in use !',
//         })
//       }

//       try {
//         const res = await updateUserToken({
//           organization_name: organizationName,
//           tokens,
//         })
//         if (res) {
//           successNotification({
//             title: 'Organization Name is successfully updated',
//           })
//           refetch()
//         } else {
//           failNotification({ title: res.message })
//         }
//       } catch (e) {
//         failNotification({ title: (e as string) || '' })
//       }
//     }
//     setEditAccountName({ isEditing: editing, index })
//   }

//   const deleteHandler = async (id: number) => {
//     if (id) {
//       try {
//         // setAccountTokenData((prev) => prev.filter((item) => item.id !== id))
//         const res = await updateUserToken({
//           tokenEntityId: id,
//           isDeleted: true,
//         })

//         if (res) {
//           successNotification({
//             title: 'Organization is deleted successfully ',
//           })
//           dispatch(setReTriggerIsUserTokens(!reTriggerIsUserTokens))
//           refetch()
//         } else {
//           failNotification({ title: res.message })
//         }
//       } catch (e) {
//         failNotification({ title: (e as string) || '' })
//       }
//     }
//   }

//   const addAccountHandler = async () => {
//     const checkIfEmptyOrgExist = data?.find(
//       (i) => !i.tokens[0]?.organization_name,
//     )
//     if (isEmpty(checkIfEmptyOrgExist)) {
//       await updateUserToken({
//         email: email,
//         userId: id || 0,
//         organization_name: '',
//       })
//       refetch()
//     } else {
//       failNotification({
//         title:
//           'Unable to add a new account. Please rename one of your existing accounts!',
//       })
//     }
//   }

//   const enableHandler = async (id: number, name: string) => {
//     try {
//       const res = await updateUserToken({
//         email: email,
//         enableEntity: true,
//         tokenEntityId: id,
//       })
//       if (res) {
//         dispatch(setUserData({ ...userData, churchName: name }))
//         successNotification({
//           title: 'Updated Successfully !',
//         })
//         dispatch(setReTriggerIsUserTokens(!reTriggerIsUserTokens))
//         refetch()
//       } else {
//         failNotification({ title: res.message })
//       }
//     } catch (e) {
//       failNotification({
//         title:
//           'Unable to add a new account. Please rename one of your existing accounts!',
//       })
//     }
//   }

//   const deleteToken = async (id: number) => {
//     try {
//       const res = await deleteUserToken(id)

//       if (res.success) {
//         successNotification({
//           title: 'delete token successfully !',
//         })
//         refetch()
//       } else {
//         failNotification({ title: res.data.message })
//       }
//     } catch (e) {
//       failNotification({
//         title: '',
//       })
//     }
//   }

//   useEffect(() => {
//     if (data && !isEmpty(data)) {
//       const temp: AccountTokenDataProps[] = []
//       temp.push(...data)

//       const order = ['pco', 'qbo', 'stripe']

//       temp.forEach((item) => {
//         item.tokens.sort(
//           (a, b) => order.indexOf(a.token_type) - order.indexOf(b.token_type),
//         )
//       })

//       setAccountTokenData(temp)
//     } else {
//       setAccountTokenData([])
//     }
//   }, [data])

//   useEffect(() => {
//     const loadState = async () => {
//       if (location.state) {
//         const { type, access_token, refresh_token, realm_id } = location.state
//         try {
//           const tokenObject = {
//             id: selectedThirdPartyId,
//             token_type: type,
//             access_token,
//             refresh_token,
//             realm_id,
//           }

//           if (type === 'qbo') {
//             tokenObject.realm_id = realm_id
//           }

//           const res = await updateUserToken({
//             tokens: [tokenObject],
//           })

//           if (res) {
//             successNotification({
//               title: 'Sync !',
//             })
//             dispatch(setSelectedThirdPartyId(0))
//             refetch()
//             history(location.pathname, { replace: true })
//           } else {
//             failNotification({ title: res.message })
//           }
//         } catch (e) {
//           failNotification({ title: (e as string) || '' })
//         }
//       }
//     }

//     if (!subscribed.current) {
//       loadState()
//     }
//     return () => {
//       subscribed.current = true
//     }
//   }, [])

//   return (
//     <MainLayout>
//       <div className="flex h-full gap-4">
//         <div className="rounded-lg p-8 bg-white w-screen">
//           <div className="justify-between flex w-full">
//             <span className="font-medium text-2xl">Account List</span>
//           </div>
//           <div className="flex gap-4 justify-end">
//             <button
//               className="text-green-500 flex items-center gap-1 hover:underline"
//               onClick={() => addAccountHandler()}
//             >
//               <p>Add account +</p>
//             </button>
//           </div>
//           {isRefetching ? (
//             <Loading />
//           ) : !isEmpty(accountTokenData) ? (
//             <div className="relative overflow-x-auto pt-8">
//               <table className="w-full text-sm text-left text-gray-500">
//                 <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700">
//                   <tr className="[&>*]:px-6 [&>*]:py-3">
//                     <th scope="col" className="">
//                       Select
//                     </th>
//                     <th scope="col" className="">
//                       Organization Name
//                     </th>
//                     <th scope="col" className="">
//                       PCO
//                     </th>
//                     <th scope="col" className="">
//                       QBO
//                     </th>
//                     <th scope="col" className="">
//                       STRIPE
//                     </th>
//                     <th scope="col" className="text-right">
//                       Action
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody className="[&>*]:h-20 text-left">
//                   {accountTokenData?.map((item, index) => (
//                     <tr
//                       className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 [&>*]:px-6 [&>*]:py-4"
//                       key={item.id}
//                     >
//                       <td className="">
//                         <div className="h-10">
//                           <Radio
//                             checked={item.isEnabled}
//                             onChange={() =>
//                               enableHandler(
//                                 item.id,
//                                 item.tokens[0]?.organization_name || '',
//                               )
//                             }
//                           />
//                         </div>
//                       </td>
//                       <td className="">
//                         <div className="h-10">
//                           {editAccountName.isEditing &&
//                           editAccountName.index === index ? (
//                             <TextInput
//                               className="pt-2"
//                               onChange={(e) =>
//                                 setOrganizationName(e.target.value)
//                               }
//                             />
//                           ) : (
//                             <p className="p-2">
//                               {item.tokens[0]?.organization_name || 'N/A'}
//                             </p>
//                           )}
//                         </div>
//                       </td>
//                       {item.tokens.map((a) => (
//                         <React.Fragment key={Math.random()}>
//                           {a.token_type === 'pco' ? (
//                             <td className="">
//                               <div className="h-10">
//                                 <p className="p-2">
//                                   {a.token_type === 'pco' && a.refresh_token ? (
//                                     <>
//                                       {editAccountName.isEditing &&
//                                       editAccountName.index === index ? (
//                                         <Button
//                                           className="bg-red-500"
//                                           onClick={() => deleteToken(a.id || 0)}
//                                         >
//                                           LOGOUT PCO
//                                         </Button>
//                                       ) : (
//                                         <Button
//                                           className="bg-[#205ce4]"
//                                           disabled
//                                         >
//                                           PCO logged
//                                         </Button>
//                                       )}
//                                     </>
//                                   ) : (
//                                     <Button
//                                       className="bg-[#205ce4]"
//                                       onClick={() => pcoLoginHandler(a.id || 0)}
//                                     >
//                                       Login to PCO
//                                     </Button>
//                                   )}
//                                 </p>
//                               </div>
//                             </td>
//                           ) : null}

//                           {a.token_type === 'qbo' ? (
//                             <td className="">
//                               <div className="h-10">
//                                 <p className="p-2">
//                                   {a.token_type === 'qbo' && a.refresh_token ? (
//                                     <>
//                                       {editAccountName.isEditing &&
//                                       editAccountName.index === index ? (
//                                         <Button
//                                           className="bg-red-500"
//                                           onClick={() => deleteToken(a.id || 0)}
//                                         >
//                                           LOGOUT QBO
//                                         </Button>
//                                       ) : (
//                                         <Button
//                                           className="bg-[#2ca01c]"
//                                           disabled
//                                         >
//                                           QBO logged
//                                         </Button>
//                                       )}
//                                     </>
//                                   ) : (
//                                     <Button
//                                       className="bg-[#2ca01c]"
//                                       onClick={() => qboLoginHandler(a.id || 0)}
//                                     >
//                                       Login to QBO
//                                     </Button>
//                                   )}
//                                 </p>
//                               </div>
//                             </td>
//                           ) : null}

//                           {a.token_type === 'stripe' ? (
//                             <td className="">
//                               <div className="h-10">
//                                 <p className="p-2">
//                                   {a.token_type === 'stripe' &&
//                                   a.refresh_token ? (
//                                     <>
//                                       {editAccountName.isEditing &&
//                                       editAccountName.index === index ? (
//                                         <Button
//                                           className="bg-red-500"
//                                           onClick={() => deleteToken(a.id || 0)}
//                                         >
//                                           LOGOUT Stripe
//                                         </Button>
//                                       ) : (
//                                         <Button
//                                           className="bg-[#635bff]"
//                                           disabled
//                                         >
//                                           Stripe logged
//                                         </Button>
//                                       )}
//                                     </>
//                                   ) : (
//                                     <Button
//                                       className="bg-[#635bff]"
//                                       onClick={() =>
//                                         stripeLoginHandler(a.id || 0)
//                                       }
//                                     >
//                                       Login to Stripe
//                                     </Button>
//                                   )}
//                                 </p>
//                               </div>
//                             </td>
//                           ) : null}
//                         </React.Fragment>
//                       ))}
//                       {/* <td className="">
//                         <div className="h-10">
//                           <p className="p-2">
//                             {item.token_type === 'pco' && item.refresh_token ? (
//                               'Sync'
//                             ) : (
//                               <Button className="bg-[#205ce4]">
//                                 Sync to PCO
//                               </Button>
//                             )}
//                           </p>
//                         </div>
//                       </td>
//                       <td className="">
//                         <div className="h-10">
//                           <p className="p-2">
//                             {item.token_type === 'qbo' && item.refresh_token ? (
//                               'Sync'
//                             ) : (
//                               <Button
//                                 className="bg-[#2ca01c]"
//                                 onClick={() =>
//                                   qboLoginHandler(item.organization_name || '')
//                                 }
//                               >
//                                 Sync to QBO
//                               </Button>
//                             )}
//                           </p>
//                         </div>
//                       </td>
//                       <td className="">
//                         <div className="h-10">
//                           <p className="p-2">
//                             {item.token_type === 'stripe' &&
//                             item.refresh_token ? (
//                               'Sync'
//                             ) : (
//                               <Button className="bg-[#635bff]">
//                                 Sync to Stripe
//                               </Button>
//                             )}
//                           </p>
//                         </div>
//                       </td> */}
//                       <td className="">
//                         <div className="h-10 flex justify-end">
//                           <div className="flex justify-between gap-2">
//                             <button
//                               onClick={() =>
//                                 editHandler(
//                                   index,
//                                   !editAccountName.isEditing,
//                                   item.tokens,
//                                 )
//                               }
//                             >
//                               {editAccountName.isEditing &&
//                               editAccountName.index === index ? (
//                                 <BiSave
//                                   size={24}
//                                   className="text-green-600"
//                                   data-tooltip-id="btn"
//                                   data-tooltip-content="Save"
//                                   data-tooltip-place="top"
//                                 />
//                               ) : (
//                                 <BiEdit
//                                   size={24}
//                                   className="text-green-600"
//                                   data-tooltip-id="btn"
//                                   data-tooltip-content="Edit"
//                                   data-tooltip-place="top"
//                                 />
//                               )}

//                               <Tooltip id="btn" />
//                             </button>

//                             <button onClick={() => deleteHandler(item.id)}>
//                               <MdDelete
//                                 size={24}
//                                 className="text-red-600"
//                                 data-tooltip-id="btn"
//                                 data-tooltip-content="Delete"
//                                 data-tooltip-place="top"
//                               />
//                             </button>
//                           </div>
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           ) : (
//             <Empty />
//           )}
//           {/* Table */}
//         </div>
//       </div>
//     </MainLayout>
//   )
// }

// export default AccountTokens

import React, { FC } from 'react'

interface AccountTokensProps {}

const AccountTokens: FC<AccountTokensProps> = ({}) => {
  return <div>AccountTokens</div>
}

export default AccountTokens
