import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { useStorage } from "../../utils/store/store";
import { baseApi } from "../api/baseApi";
import { normalizeRole } from "../../utils/permissions";
import { changeSelectedBranch } from "./branchSlice";
import type { AppDispatch } from "./index";

interface AuthState {
  token: string | null;
  // Persisted the same way as the token (see useStorage) so a page refresh
  // doesn't lose which kind of user is logged in — the student portal's
  // route guards (src/routes/StudentRoute.tsx, ProtectedRoute.tsx) key off
  // this to separate STUDENT-role sessions from staff ones.
  role: string | null;
}

const initialState: AuthState = {
  token: useStorage.getTokens()?.accessToken ?? null,
  role: useStorage.getRole(),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setToken: (state, action: PayloadAction<string | null>) => {
      state.token = action.payload;
    },
    setRole: (state, action: PayloadAction<string | null>) => {
      state.role = action.payload;
    },
  },
});

export const { setToken, setRole } = authSlice.actions;
export const authReducer = authSlice.reducer;

// Centralized side effects so the token in localStorage and the token in
// Redux state can never drift apart — every login/logout goes through here.
// The refresh token is deliberately kept out of Redux state (only written to
// localStorage) so it isn't visible in Redux DevTools/inspectable global
// state — only baseApi's reauth wrapper reads it back via useStorage.
export const loginSuccess = (token: string, refreshToken?: string, role?: string) => (dispatch: AppDispatch) => {
  useStorage.setCredentials({ token, refreshToken, role });
  dispatch(setToken(token));
  if (role) dispatch(setRole(role));
  // A STUDENT-role session must never inherit a branch some earlier staff
  // session on this same browser had selected — /student-portal/* endpoints
  // take no branchId/studentId of their own (identity comes purely from the
  // token), but x-branch-id is still attached to every request centrally
  // (baseApi), so a stale selection could otherwise scope their own data to
  // the wrong branch.
  // Same for TEACHER: their header has no branch picker (see Header.tsx), so
  // a branch left selected by an earlier admin session would silently keep
  // scoping their requests with no way to change it.
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "STUDENT" || normalizedRole === "TEACHER") {
    dispatch(changeSelectedBranch(null));
  }
};

// Corrects the persisted role when GET /auth/me reports a different one than
// what was stored at login (see useAuth) — writes both storage and Redux.
export const syncRole = (role: string) => (dispatch: AppDispatch, getState: () => { auth: AuthState }) => {
  const token = getState().auth.token;
  if (token) useStorage.setCredentials({ token, role });
  dispatch(setRole(role));
};

export const logout = () => (dispatch: AppDispatch) => {
  useStorage.removeCredentials();
  dispatch(setToken(null));
  dispatch(setRole(null));
  // Otherwise a cached /auth/me, /auth/sidebar, or any other query from this
  // session lingers in the store and can flash stale data (or a previous
  // account's data) for whoever logs in next on this same browser tab —
  // same reasoning changeSelectedBranch (branchSlice.ts) already applies
  // when the active branch changes.
  dispatch(baseApi.util.resetApiState());
};
