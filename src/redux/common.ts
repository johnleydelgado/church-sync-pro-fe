import { createSlice } from "@reduxjs/toolkit";

export interface thirdPartyTokens {
  qbo_access_token: string | null;
  qbo_refresh_token: string | null;
  qbo_realm_id: string | null;
  PlanningCenter: string | null;
}

interface CommonState {
  openModals: any[];
  isFetching: boolean;
  thirdPartyTokens?: thirdPartyTokens;
}

const initialState: CommonState = {
  openModals: [],
  isFetching: false,
  thirdPartyTokens: {
    qbo_access_token: null,
    qbo_refresh_token: null,
    qbo_realm_id: null,
    PlanningCenter: null,
  },
};

export const common = createSlice({
  name: "common",
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
          : [...state.openModals, action.payload];
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
          : state.openModals;
    },
    setThirdPartyTokens: (state, action) => {
      state.thirdPartyTokens = action.payload;
      // state.isSyncing = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { OPEN_MODAL, CLOSE_MODAL, setThirdPartyTokens } = common.actions;

export default common.reducer;
