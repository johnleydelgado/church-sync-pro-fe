import { toast, type ToastPosition } from 'react-toastify'

const successNotification = ({
  title,
  position = 'top-center',
}: {
  title: string
  position?: ToastPosition
}) =>
  toast.success(title, {
    position: position,
    autoClose: 2000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: false,
    draggable: true,
    progress: undefined,
    theme: 'light',
  })

const failNotification = ({
  title,
  position = 'top-center',
}: {
  title: string
  position?: ToastPosition
}) =>
  toast.error(title, {
    position: position,
    autoClose: 2000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: false,
    draggable: true,
    progress: undefined,
    theme: 'light',
  })

export { successNotification, failNotification }
