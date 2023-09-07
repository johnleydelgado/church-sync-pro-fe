import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { number, string } from 'yup'

export interface thirdPartyTokens {
  qbo_access_token: string | null
  qbo_refresh_token: string | null
  qbo_realm_id: string | null
  PlanningCenter: string | null
  stripe_access_token: string | null
  stripe_refresh_token: string | null
}

export interface UserInfo {
  id?: number
  churchName?: string
  firstName?: string
  lastName?: string
  email: string
  isSubscribe?: string
  role?: 'bookkeeper' | 'client' | string
  img_url?: string
}

export interface BookkeeperInfo {
  clientEmail: string
  clientId?: number
  churchName: string
}

interface transactionDateProps {
  startDate: Date | null
  endDate: Date | null
}

interface CommonState {
  openModals: any[]
  isFetching: boolean
  user: UserInfo
  thirdPartyTokens?: thirdPartyTokens
  selectedThirdPartyId: number
  reTriggerIsUserTokens: boolean
  isShowSettings: boolean
  isShowTransaction: boolean
  bookkeeper: BookkeeperInfo | null
  accountState: {
    type: string
    access_token: string
    refresh_token: string
    realm_id?: string
  } | null
  selectedTransactionDate: transactionDateProps
}

const initialState: CommonState = {
  openModals: [],
  isFetching: false,
  user: {
    id: 0,
    churchName: '',
    firstName: '',
    lastName: '',
    email: '',
    isSubscribe: '0',
    role: '',
    img_url: '',
  },
  thirdPartyTokens: {
    qbo_access_token: null,
    qbo_refresh_token: null,
    qbo_realm_id: null,
    PlanningCenter: null,
    stripe_access_token: null,
    stripe_refresh_token: null,
  },
  selectedThirdPartyId: 0,
  reTriggerIsUserTokens: false,
  isShowSettings: false,
  isShowTransaction: false,
  bookkeeper: {
    clientEmail: '',
    clientId: 0,
    churchName: '',
  },
  accountState: null,
  selectedTransactionDate: { startDate: null, endDate: null },
}

export const common = createSlice({
  name: 'common',
  initialState,
  reducers: {
    /**
     * OPEN_MODAL
     * @param {string} action.payload - name of modal to be opened
     * @returns {string[]} array of name of modals that should be opened
     */
    OPEN_MODAL: (state, action) => {
      state.openModals =
        state.openModals.filter((x) => x === action.payload).length > 0
          ? state.openModals
          : [...state.openModals, action.payload]
    },
    /**
     * CLOSE_MODAL
     * @param {string} action.payload - name of modal to be closed
     * @returns {string[]} array of name of modals without the payload
     */
    CLOSE_MODAL: (state, action) => {
      state.openModals =
        state.openModals.filter((x) => x === action.payload).length > 0
          ? state.openModals.filter((x) => x !== action.payload)
          : state.openModals
    },
    setThirdPartyTokens: (state, action) => {
      state.thirdPartyTokens = action.payload
    },
    setUserData: (state, action: PayloadAction<UserInfo>) => {
      state.user = action.payload
    },
    setSelectedThirdPartyId: (state, action) => {
      state.selectedThirdPartyId = action.payload
    },
    setReTriggerIsUserTokens: (state, action: PayloadAction<boolean>) => {
      state.reTriggerIsUserTokens = action.payload
    },
    setIsShowSettings: (state, action: PayloadAction<boolean>) => {
      state.isShowSettings = action.payload
    },
    setIsShowTransaction: (state, action: PayloadAction<boolean>) => {
      state.isShowTransaction = action.payload
    },
    setAccountState: (state, action) => {
      state.accountState = action.payload
    },
    setBookkeeper: (state, action: PayloadAction<BookkeeperInfo>) => {
      state.bookkeeper = action.payload
    },
    resetUserData: (state) => {
      state.user = initialState.user
      state.selectedThirdPartyId = initialState.selectedThirdPartyId
      state.thirdPartyTokens = initialState.thirdPartyTokens
      state.bookkeeper = initialState.bookkeeper
      state.selectedTransactionDate = initialState.selectedTransactionDate
    },
    setSelectedTransactionDate: (
      state,
      action: PayloadAction<transactionDateProps>,
    ) => {
      state.selectedTransactionDate = action.payload
    },
  },
})

// Action creators are generated for each case reducer function
export const {
  OPEN_MODAL,
  CLOSE_MODAL,
  setThirdPartyTokens,
  setUserData,
  setSelectedThirdPartyId,
  setReTriggerIsUserTokens,
  setIsShowSettings,
  setIsShowTransaction,
  resetUserData,
  setAccountState,
  setBookkeeper,
  setSelectedTransactionDate,
} = common.actions

export default common.reducer
