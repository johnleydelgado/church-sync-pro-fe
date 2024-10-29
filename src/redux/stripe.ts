import { customerInitialValues, CustomerProps } from '@/common/constant/formik'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { QboDataSelectProps } from '@/pages/Main/settings'

const initialState = {
  reduxStripeData: [{ name: '', isActive: true, date: '', category: '' }], // Array of objects with name and date as strings
  persistedAt: Date.now(), // Current timestamp for persisted time
}

export const stripeDataSlice = createSlice({
  name: 'stripeData',
  initialState,
  reducers: {
    setReduxStripeData: (state, action: PayloadAction<any>) => {
      state.reduxStripeData = action.payload
      state.persistedAt = Date.now()
    },
    resetReduxStripeData(state) {
      state.reduxStripeData = [] // Clear data
      state.persistedAt = Date.now() // Update time to reset expiration
    },
  },
})

// Action creators are generated for each case reducer function
export const { setReduxStripeData, resetReduxStripeData } =
  stripeDataSlice.actions

export default stripeDataSlice.reducer
