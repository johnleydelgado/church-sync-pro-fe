import './App.css'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Provider } from 'react-redux'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { PersistGate } from 'redux-persist/integration/react'
import SuperTokens from 'supertokens-web-js'
import EmailPassword from 'supertokens-web-js/recipe/emailpassword'
import Session from 'supertokens-web-js/recipe/session'
import ThirdPartyEmailPassword from 'supertokens-web-js/recipe/thirdpartyemailpassword'
import EmailVerification from 'supertokens-web-js/recipe/emailverification'
import { ToastContainer } from 'react-toastify'
import { ThemeProvider } from '@material-tailwind/react'
import MainUnAuthPage from './pages/MainPage'
import { persistor, store } from './redux/store'
import { useEffect, useMemo } from 'react'
import { PaginationProvider } from './common/context/PaginationProvider'
const { REACT_APP_HOST_BE, REACT_APP_GOOGLE_CALLBACK_URL } = process.env

import 'react-toastify/dist/ReactToastify.css'
import BackgroundDataFetcher from './common/components/background-caller-api/BackgroundDataFetcher'
import { loadStripe } from '@stripe/stripe-js'

function App() {
  const queryClient = new QueryClient()
  const stripePromise = useMemo(
    () => loadStripe('pk_test_6pRNASCoBOKtIshFeQd4XMUh'),
    [],
  )

  const options = {
    mode: 'payment',
    amount: 1099,
    currency: 'usd',
  }
  SuperTokens.init({
    appInfo: {
      apiDomain: REACT_APP_HOST_BE as string,
      apiBasePath: '/auth',
      appName: 'church sync pro',
    },
    recipeList: [
      Session.init(),
      ThirdPartyEmailPassword.init(),
      EmailPassword.init(),
    ],
  })

  const secretValue = useMemo(() => {
    const cachedValue = localStorage.getItem('secretValue')
    if (cachedValue) {
      // setIsLoading(false);
      return cachedValue
    }
    return null
  }, [])

  useEffect(() => {
    const cachedValue = localStorage.getItem('secretValue')
    if (secretValue === null) {
      console.log('does it goes here ?', cachedValue)
      const fetchSecret = async () => {
        // const client = new SecretManagerServiceClient();
        // const [version] = await client.accessSecretVersion({
        //   name: 'projects/YOUR_PROJECT_ID/secrets/YOUR_SECRET_NAME/versions/latest',
        // });
        // const value = version.payload.data.toString();
        localStorage.setItem('secretValue', 'test')
        // setIsLoading(false);
      }
      fetchSecret()
    } else {
      // setIsLoading(false);
    }
  }, [secretValue])

  console.log(REACT_APP_GOOGLE_CALLBACK_URL, REACT_APP_HOST_BE)

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <DndProvider backend={HTML5Backend}>
              <PaginationProvider>
                <Router>
                  <BackgroundDataFetcher />
                  <Routes>
                    <Route path="/*" element={<MainUnAuthPage />} />
                  </Routes>
                </Router>
              </PaginationProvider>
              <ToastContainer />
            </DndProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  )
}

export default App
