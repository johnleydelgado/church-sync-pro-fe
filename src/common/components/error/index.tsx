import useLogoutHandler from '@/common/hooks/useLogoutHandler'

export default function AuthenticationError() {
  const logoutHandler = useLogoutHandler()

  const handleLogout = () => {
    logoutHandler()
  }
  return (
    <>
      <div className="flex h-screen items-center justify-center bg-green-800">
        <div id="error-page" className="mx-auto flex flex-col gap-4">
          <h1 className="text-2xl font-bold text-white lg:text-8xl">Oops!</h1>
          <p className="text-3xl text-white">
            Authentication has expired. Please log in again to continue
            accessing the system.!
          </p>
          <div className="mt-4">
            <button
              onClick={handleLogout}
              className="rounded-md bg-white px-5 py-2 hover:bg-gray-100"
            >
              Go to login
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
