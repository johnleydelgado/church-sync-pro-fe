import { Link } from "react-router-dom";
export default function ErrorPage() {
  return (
    <>
      <div className="flex justify-center items-center h-screen bg-green-800">
        <div id="error-page" className="flex flex-col gap-4 mx-auto">
          <h1 className="lg:text-8xl font-bold text-2xl text-white">Oops!</h1>
          <p className="text-3xl text-white">404 page not found !</p>
          <div className="mt-4">
            <Link
              to="/"
              className="px-5 py-2 bg-white rounded-md hover:bg-gray-100"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
