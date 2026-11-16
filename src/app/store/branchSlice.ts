import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { baseApi } from "../api/baseApi";
import { rememberBranch } from "../../utils/branchMemory";
import type { AppDispatch, RootState } from "./index";

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
export const changeSelectedBranch = (branchId: string | null) => (dispatch: AppDispatch, getState: () => RootState) => {
  // Storage always follows the request, so the two can't drift apart.
  if (branchId) {
    localStorage.setItem(SELECTED_BRANCH_STORAGE_KEY, branchId);
  } else {
    localStorage.removeItem(SELECTED_BRANCH_STORAGE_KEY);
  }
  // The signed-in account's choice is also remembered under its own id, so its
  // next login on this browser opens the same branch (see utils/branchMemory).
  const userId = getState().auth.userId;
  if (userId) rememberBranch(userId, branchId);
  // Choosing the branch that is already active changes nothing - don't throw the
  // whole cache away (and refetch every page) for it.
  if (getState().branch.selectedBranchId === branchId) return;
  dispatch(setSelectedBranchId(branchId));
  dispatch(baseApi.util.resetApiState());
};

// Selects a branch for a session that is only just starting (a login handing the
// account its remembered branch back, see authSlice): nothing is cached yet, so
// the query cache is left alone, and the branch is already the remembered one.
export const restoreSelectedBranch = (branchId: string) => (dispatch: AppDispatch) => {
  localStorage.setItem(SELECTED_BRANCH_STORAGE_KEY, branchId);
  dispatch(setSelectedBranchId(branchId));
};

// Forgets the selected branch (state and storage) without touching the query
// cache - for a login or logout, where the session's data is dropped (or was
// never loaded) anyway. A branch picked in an earlier session on this browser
// belongs to that account: it must never be carried into the next one, whose
// requests would otherwise name a branch it may not own. What the account itself
// had selected is not lost: it stays remembered under the account's id.
export const clearSelectedBranch = () => (dispatch: AppDispatch) => {
  localStorage.removeItem(SELECTED_BRANCH_STORAGE_KEY);
  dispatch(setSelectedBranchId(null));
};
