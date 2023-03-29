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

import MainUnAuthPage from './pages/Auth/MainPage'
import { persistor, store } from './redux/store'
function App() {
  const queryClient = new QueryClient()

  SuperTokens.init({
    appInfo: {
      apiDomain: 'http://localhost:8080',
      apiBasePath: '/auth',
      appName: 'church sync pro',
    },
    recipeList: [
      Session.init(),
      ThirdPartyEmailPassword.init(),
      EmailPassword.init(),
    ],
  })

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <DndProvider backend={HTML5Backend}>
            <Router>
              <Routes>
                <Route path="/*" element={<MainUnAuthPage />} />
              </Routes>
            </Router>
          </DndProvider>
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  )
}

export default App
