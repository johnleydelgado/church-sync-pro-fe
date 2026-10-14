import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { stat } from 'fs'
import { number, string } from 'yup'
import type { MyChurch } from '@/common/api/church'

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
  bookkeeperIntegrationAccessEnabled?: boolean
  role?: string
}

interface transactionDateProps {
  startDate: Date | null
  endDate: Date | null
}

export interface BankAccountProps {
  type: 'donation' | 'registration'
  value: string
  label: string
}

export interface BankAccountExpensesProps {
  account: {
    value: string
    label: string
  }
  class: {
    value: string
    label: string
  }
}

export interface SelectedClient {
  clientEmail: string
  clientId?: number
}

/** The church a QuickBooks / Planning Center connect was started for, kept across the redirect. */
export interface PendingConnection {
  /** Which service the person was sent to. */
  type: 'qbo' | 'pco' | 'stripe'
  churchId: number
  churchName: string
  accountEmail: string
  accountUserId: number
  returnTo: string
  /** Date.now() when Connect was clicked; an old record is treated as missing. */
  startedAt: number
}

interface DateRangeTransactionProps {
  type: 'batch' | 'stripe'
  dateRange:
    | 'This Month'
    | 'Last Month'
    | 'Last 7 Days'
    | 'Last 30 Days'
    | 'Last 3 Months'
    | 'Last 6 Months'
    | '2024'
    | '2023'
    | '2022'
    | '2021'
    | '2020'
    | '2019'
    | '2018'
    | 'Custom'
    | undefined
  isCustom: boolean
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
  selectedStartDate: Date | null
  tabSettings: {
    account: boolean
    billing: boolean
    connect: boolean
    bookkeeper: boolean
  }
  selectedBankAccount: BankAccountProps[] | null
  selectedBankExpense: BankAccountExpensesProps | null
  isQuickStartHide: boolean
  mappingNumber: number
  persistPage: number
  tabTransaction: { batch: boolean; stripe: boolean }
  lastObjectId: any
  stripeCurrentData: any
  stripeCurrentPage: number
  dateRangeTransaction: DateRangeTransactionProps[]
  integrationTo: 'client' | 'bookkeeper'
  selectdClient: SelectedClient
  /**
   * The church every page works on. Read it as `?? null`: a browser that ran an older build
   * gets its persisted `common` back whole, without this key.
   */
  selectedChurch: MyChurch | null
  pendingConnection: PendingConnection | null
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
  selectedStartDate: null,
  tabSettings: {
    account: true,
    billing: false,
    connect: false,
    bookkeeper: false,
  },
  selectedBankAccount: null,
  selectedBankExpense: null,
  isQuickStartHide: false,
  mappingNumber: 0,
  persistPage: 1,
  tabTransaction: { batch: true, stripe: false },
  lastObjectId: '',
  stripeCurrentData: [],
  stripeCurrentPage: 1,
  dateRangeTransaction: [
    {
      dateRange: undefined,
      isCustom: false,
      startDate: null,
      endDate: null,
      type: 'batch',
    },
  ],
  integrationTo: 'client',
  selectdClient: {
    clientEmail: '',
    clientId: 0,
  },
  selectedChurch: null,
  pendingConnection: null,
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
    CLOSE_ALL_MODALS: (state) => {
      state.openModals = []
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
      state.selectedBankAccount = initialState.selectedBankAccount
      state.selectedBankExpense = initialState.selectedBankExpense
      state.dateRangeTransaction = initialState.dateRangeTransaction
      state.selectedChurch = initialState.selectedChurch
      state.pendingConnection = initialState.pendingConnection
      // state.selectedStartDate = initialState.selectedStartDate
    },
    setSelectedTransactionDate: (
      state,
      action: PayloadAction<transactionDateProps>,
    ) => {
      state.selectedTransactionDate = action.payload
    },
    setSelectedStartDate: (state, action: PayloadAction<Date | null>) => {
      state.selectedStartDate = action.payload
    },
    setTabSettings: (
      state,
      action: PayloadAction<{
        account: boolean
        billing: boolean
        connect: boolean
        bookkeeper: boolean
      }>,
    ) => {
      state.tabSettings = action.payload
    },
    setSelectedBankAccount: (
      state,
      action: PayloadAction<BankAccountProps[] | null>,
    ) => {
      state.selectedBankAccount = action.payload
    },
    setSelectedBankExpense: (
      state,
      action: PayloadAction<BankAccountExpensesProps | null>,
    ) => {
      state.selectedBankExpense = action.payload
    },
    setIsQuickStartHide: (state, action: PayloadAction<boolean>) => {
      state.isQuickStartHide = action.payload
    },
    setMappingNumber: (state, action: PayloadAction<number>) => {
      state.mappingNumber = action.payload
    },
    setPersistPage: (state, action: PayloadAction<number>) => {
      state.persistPage = action.payload
    },
    setTabTransaction: (
      state,
      action: PayloadAction<{ batch: boolean; stripe: boolean }>,
    ) => {
      state.tabTransaction = action.payload
    },
    setLastObjectId: (state, action: PayloadAction<any>) => {
      state.lastObjectId = action.payload
    },
    setStripeCurrentData: (state, action: PayloadAction<any>) => {
      state.stripeCurrentData = action.payload
    },
    setStripeCurrentPage: (state, action: PayloadAction<number>) => {
      state.stripeCurrentPage = action.payload
    },
    setDateRangeTransaction: (
      state,
      action: PayloadAction<DateRangeTransactionProps[]>,
    ) => {
      state.dateRangeTransaction = action.payload
    },
    setIntegrationTo: (
      state,
      action: PayloadAction<'client' | 'bookkeeper'>,
    ) => {
      state.integrationTo = action.payload
    },
    setSelectedClient: (state, action: PayloadAction<SelectedClient>) => {
      state.selectdClient = action.payload
    },
    setSelectedChurch: (state, action: PayloadAction<MyChurch | null>) => {
      state.selectedChurch = action.payload
    },
    setPendingConnection: (
      state,
      action: PayloadAction<PendingConnection | null>,
    ) => {
      state.pendingConnection = action.payload
    },
    /**
     * Everything here belongs to one church; put it back when the church changes. Bank and fee
     * choices, and the legacy batch / Stripe payout views' data, cursor, page, start date and
     * date filter.
     */
    resetChurchScopedState: (state) => {
      state.selectedBankAccount = null
      state.selectedBankExpense = null
      state.stripeCurrentData = initialState.stripeCurrentData
      state.lastObjectId = initialState.lastObjectId
      state.persistPage = initialState.persistPage
      state.selectedStartDate = initialState.selectedStartDate
      state.dateRangeTransaction = initialState.dateRangeTransaction
    },
  },
})

// Action creators are generated for each case reducer function
export const {
  OPEN_MODAL,
  CLOSE_MODAL,
  CLOSE_ALL_MODALS,
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
  setSelectedStartDate,
  setTabSettings,
  setSelectedBankAccount,
  setSelectedBankExpense,
  setIsQuickStartHide,
  setMappingNumber,
  setPersistPage,
  setTabTransaction,
  setLastObjectId,
  setStripeCurrentData,
  setStripeCurrentPage,
  setDateRangeTransaction,
  setIntegrationTo,
  setSelectedClient,
  setSelectedChurch,
  setPendingConnection,
  resetChurchScopedState,
} = common.actions

export default common.reducer
