import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { baseApi } from "../api/baseApi";
import type { AppDispatch } from "./index";

const SELECTED_BRANCH_STORAGE_KEY = "selectedBranchId";

interface BranchState {
  selectedBranchId: string | null;
}

const initialState: BranchState = {
  selectedBranchId: localStorage.getItem(SELECTED_BRANCH_STORAGE_KEY) || null,
};

const branchSlice = createSlice({
  name: "branch",
  initialState,
  reducers: {
    setSelectedBranchId: (state, action: PayloadAction<string | null>) => {
      state.selectedBranchId = action.payload;
    },
  },
});

export const { setSelectedBranchId } = branchSlice.actions;
export const branchReducer = branchSlice.reducer;

// Persists the active branch and resets the whole RTK Query cache so every
// mounted page refetches its data scoped to the newly selected branch
// instead of continuing to show the previous branch's cached results.
export const changeSelectedBranch = (branchId: string | null) => (dispatch: AppDispatch) => {
  if (branchId) {
    localStorage.setItem(SELECTED_BRANCH_STORAGE_KEY, branchId);
  } else {
    localStorage.removeItem(SELECTED_BRANCH_STORAGE_KEY);
  }
  dispatch(setSelectedBranchId(branchId));
  dispatch(baseApi.util.resetApiState());
};
