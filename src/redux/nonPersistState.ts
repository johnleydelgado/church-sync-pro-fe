import { customerInitialValues, CustomerProps } from '@/common/constant/formik'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface BookkeeperInfo {
  id: string
  email: string
}

interface CommonState {
  bookkeeperDeletion: BookkeeperInfo | null
  projectFieldValues: CustomerProps | null
}

const initialState: CommonState = {
  bookkeeperDeletion: {
    id: '',
    email: '',
  },
  projectFieldValues: null,
}

export const nonPersistState = createSlice({
  name: 'nonPersistState',
  initialState,
  reducers: {
    setDeleteBookkeeper: (state, action: PayloadAction<BookkeeperInfo>) => {
      state.bookkeeperDeletion = action.payload
    },
    setProjectFieldValues: (
      state,
      action: PayloadAction<CustomerProps | null>,
    ) => {
      state.projectFieldValues = action.payload
    },
  },
})

// Action creators are generated for each case reducer function
export const { setDeleteBookkeeper, setProjectFieldValues } =
  nonPersistState.actions

export default nonPersistState.reducer
