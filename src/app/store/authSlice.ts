import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { useStorage } from "../../utils/store/store";
import { baseApi } from "../api/baseApi";
import { clearSelectedBranch } from "./branchSlice";
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
  // Every login starts with no branch selected, whoever logs in. The selection
  // is persisted in localStorage and attached to requests centrally (baseApi),
  // so one left behind by an earlier session on this browser - a CEO who picked
  // a branch, a branch this account doesn't own - would otherwise scope (or get
  // refused) the new account's very first requests, GET /auth/me included. It
  // goes before the token is stored so no request can be sent with it. Staff
  // then get their own branch from the header's branch picker (Header.tsx); a
  // STUDENT's /student-portal/* identity comes purely from the token, and a
  // TEACHER is scoped the same way as staff.
  dispatch(clearSelectedBranch());
  useStorage.setCredentials({ token, refreshToken, role });
  dispatch(setToken(token));
  if (role) dispatch(setRole(role));
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
  // The next login on this browser may be a different account, and a branch that
  // was selected here is not necessarily one it owns (see loginSuccess).
  dispatch(clearSelectedBranch());
  // Otherwise a cached /auth/me, /auth/sidebar, or any other query from this
  // session lingers in the store and can flash stale data (or a previous
  // account's data) for whoever logs in next on this same browser tab —
  // same reasoning changeSelectedBranch (branchSlice.ts) already applies
  // when the active branch changes.
  dispatch(baseApi.util.resetApiState());
};
