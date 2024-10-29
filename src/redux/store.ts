import {
  configureStore,
  combineReducers,
  Middleware,
  AnyAction,
} from '@reduxjs/toolkit'
import { useDispatch } from 'react-redux'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'

import common from './common'
import nonPersistState from './nonPersistState'
import { qboDataSlice, resetReduxQboData } from './qbo'
import { stripeDataSlice, resetReduxStripeData } from './stripe'

// Middleware to check for state expiration
const checkExpirationMiddleware: Middleware = (store) => {
  let hasRun = false // Flag to prevent recursion

  return (next) => (action: AnyAction) => {
    if (hasRun) {
      return next(action) // Prevents recursion
    }

    hasRun = true // Set the flag to prevent recursive calls

    const state = store.getState().qboData
    const stateStripe = store.getState().stripeData

    const currentTime = Date.now()

    const expirationTime = 60 * 60 * 24 * 1000 // 1 day in milliseconds

    // If expired, clear the state
    if (state.persistedAt && currentTime - state.persistedAt > expirationTime) {
      store.dispatch(resetReduxQboData()) // Reset state
    }

    if (
      stateStripe.persistedAt &&
      currentTime - stateStripe.persistedAt > expirationTime
    ) {
      store.dispatch(resetReduxStripeData()) // Reset state
    }

    hasRun = false // Reset the flag after handling action

    return next(action) // Continue with the action
  }
}

const persistConfig = {
  key: 'root',
  storage,
  version: 1,
  whitelist: ['common', 'qboData', 'stripeData'], // persist common and qboData
  blacklist: ['nonPersistState'], // non-persisted reducer
}

const rootReducer = combineReducers({
  common,
  nonPersistState,
  qboData: qboDataSlice.reducer, // include qboData slice
  stripeData: stripeDataSlice.reducer, // include qboData slice
})

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(checkExpirationMiddleware), // add expiration middleware
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export const useAppDispatch = () => useDispatch<AppDispatch>()
