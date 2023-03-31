import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface thirdPartyTokens {
  qbo_access_token: string | null
  qbo_refresh_token: string | null
  qbo_realm_id: string | null
  PlanningCenter: string | null
}

export interface UserInfo {
  churchName?: string
  firstName?: string
  lastName?: string
  email: string
  isSubscribe?: string
}

interface CommonState {
  openModals: any[]
  isFetching: boolean
  user: UserInfo
  thirdPartyTokens?: thirdPartyTokens
}

const initialState: CommonState = {
  openModals: [],
  isFetching: false,
  user: {
    churchName: '',
    firstName: '',
    lastName: '',
    email: '',
    isSubscribe: '0',
  },
  thirdPartyTokens: {
    qbo_access_token: null,
    qbo_refresh_token: null,
    qbo_realm_id: null,
    PlanningCenter: null,
  },
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
    resetUserData: (state) => {
      state.user = initialState.user
    },
  },
})

// Action creators are generated for each case reducer function
export const {
  OPEN_MODAL,
  CLOSE_MODAL,
  setThirdPartyTokens,
  setUserData,
  resetUserData,
} = common.actions

export default common.reducer
