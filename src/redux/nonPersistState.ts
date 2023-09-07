import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface BookkeeperInfo {
  id: string
  email: string
}

interface CommonState {
  bookkeeperDeletion: BookkeeperInfo | null
  tabTransaction: { batch: boolean; stripe: boolean }
}

const initialState: CommonState = {
  bookkeeperDeletion: {
    id: '',
    email: '',
  },
  tabTransaction: { batch: true, stripe: false },
}

export const nonPersistState = createSlice({
  name: 'nonPersistState',
  initialState,
  reducers: {
    setDeleteBookkeeper: (state, action: PayloadAction<BookkeeperInfo>) => {
      state.bookkeeperDeletion = action.payload
    },
    setTabTransaction: (
      state,
      action: PayloadAction<{ batch: boolean; stripe: boolean }>,
    ) => {
      state.tabTransaction = action.payload
    },
  },
})

// Action creators are generated for each case reducer function
export const { setDeleteBookkeeper, setTabTransaction } =
  nonPersistState.actions

export default nonPersistState.reducer
