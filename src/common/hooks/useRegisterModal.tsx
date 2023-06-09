import { OPEN_MODAL } from '@/redux/common'
import { useDispatch } from 'react-redux'
import { MODALS_NAME } from '../constant/modal'
import { route } from '../constant/route'
import { useNavigate } from 'react-router'

const useRegisterModal = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const openModal = () => {
    dispatch(OPEN_MODAL(MODALS_NAME.registration))
  }

  const handleEvent = (type: 'bookkeeper' | 'client' | 'google') => {
    if (type === 'bookkeeper') {
      navigate(route.SIGNUP, { state: { type: 'bookkeeper' } })
    } else if (type === 'client') {
      navigate(route.SIGNUP, { state: { type: 'client' } })
    }
  }

  return {
    openModal,
    handleEvent,
  }
}

export default useRegisterModal
