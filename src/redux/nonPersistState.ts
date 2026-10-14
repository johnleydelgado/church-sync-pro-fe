import { customerInitialValues, CustomerProps } from '@/common/constant/formik'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface CommonState {
  projectFieldValues: CustomerProps | null
}

const initialState: CommonState = {
  projectFieldValues: null,
}

export const nonPersistState = createSlice({
  name: 'nonPersistState',
  initialState,
  reducers: {
    setProjectFieldValues: (
      state,
      action: PayloadAction<CustomerProps | null>,
    ) => {
      state.projectFieldValues = action.payload
    },
  },
})

// Action creators are generated for each case reducer function
export const { setProjectFieldValues } = nonPersistState.actions

export default nonPersistState.reducer
