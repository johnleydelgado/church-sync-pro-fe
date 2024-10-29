import { customerInitialValues, CustomerProps } from '@/common/constant/formik'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { QboDataSelectProps } from '@/pages/Main/settings'

const initialState = {
  reduxQboData: {
    accounts: [],
    classes: [],
    customers: [],
  } as QboDataSelectProps,
  persistedAt: Date.now(),
}

export const qboDataSlice = createSlice({
  name: 'qboData',
  initialState,
  reducers: {
    setReduxQboData: (state, action: PayloadAction<QboDataSelectProps>) => {
      state.reduxQboData = action.payload
      state.persistedAt = Date.now()
    },
    resetReduxQboData(state) {
      state.reduxQboData = {
        accounts: [],
        classes: [],
        customers: [],
      } as QboDataSelectProps // Clear data
      state.persistedAt = Date.now() // Update time to reset expiration
    },
  },
})

// Action creators are generated for each case reducer function
export const { setReduxQboData, resetReduxQboData } = qboDataSlice.actions

export default qboDataSlice.reducer
