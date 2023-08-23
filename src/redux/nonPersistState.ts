import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface BookkeeperInfo {
  id: string
  email: string
}

interface CommonState {
  bookkeeperDeletion: BookkeeperInfo | null
}

const initialState: CommonState = {
  bookkeeperDeletion: {
    id: '',
    email: '',
  },
}

export const nonPersistState = createSlice({
  name: 'nonPersistState',
  initialState,
  reducers: {
    setDeleteBookkeeper: (state, action: PayloadAction<BookkeeperInfo>) => {
      state.bookkeeperDeletion = action.payload
    },
  },
})

// Action creators are generated for each case reducer function
export const { setDeleteBookkeeper } = nonPersistState.actions

export default nonPersistState.reducer
