import { OPEN_MODAL } from '@/redux/common'
import { useDispatch } from 'react-redux'
import { MODALS_NAME } from '../constant/modal'
import { route } from '../constant/route'
import { useNavigate } from 'react-router'
import { useState } from 'react'

const useGoogleRegisterModal = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [type, setType] = useState<string>('')

  const openModal = () => {
    dispatch(OPEN_MODAL(MODALS_NAME.registration))
  }

  const handleEvent = (type: 'bookkeeper' | 'client' | 'google') => {
    setType(type)
  }

  return {
    openModal,
    handleEvent,
    type,
  }
}

export default useGoogleRegisterModal
