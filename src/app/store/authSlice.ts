import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { useStorage } from "../../utils/store/store";
import { isSessionExpired } from "../../utils/dailySession";
import { todayLocalISO } from "../../utils/localDate";
import { recallBranch, rememberBranch } from "../../utils/branchMemory";
import { hasPersistedState, restorePersistedState, stashPersistedState } from "../../hooks/usePersistedState";
import { baseApi } from "../api/baseApi";
import { changeSelectedBranch, clearSelectedBranch, restoreSelectedBranch } from "./branchSlice";
import type { AppDispatch } from "./index";

interface AuthState {
  token: string | null;
  // Persisted the same way as the token (see useStorage) so a page refresh
  // doesn't lose which kind of user is logged in — the student portal's
  // route guards (src/routes/StudentRoute.tsx, ProtectedRoute.tsx) key off
  // this to separate STUDENT-role sessions from staff ones.
  role: string | null;
  // The signed-in account's id — from the login response, or from GET /auth/me
  // for a session that started without it (see adoptSessionUser). It names whose
  // branch (utils/branchMemory) and page filters (usePersistedState) this
  // session reads and remembers.
  userId: string | null;
}

// A session that was signed in on an earlier day is not picked up: the browser is
// opened signed out and the login page comes first (see utils/dailySession). The
// account's page filters are put away first, exactly as a logout would, so it
// finds them again at its next login; its branch is remembered on every change
// already.
const dropSessionFromEarlierDay = () => {
  if (!isSessionExpired()) return;
  const userId = useStorage.getUserId();
  if (userId) stashPersistedState(userId);
  useStorage.removeCredentials();
};
dropSessionFromEarlierDay();

const initialState: AuthState = {
  token: useStorage.getTokens()?.accessToken ?? null,
  role: useStorage.getRole(),
  userId: useStorage.getUserId(),
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
    setUserId: (state, action: PayloadAction<string | null>) => {
      state.userId = action.payload;
    },
  },
});

export const { setToken, setRole, setUserId } = authSlice.actions;
export const authReducer = authSlice.reducer;

// Centralized side effects so the token in localStorage and the token in
// Redux state can never drift apart — every login/logout goes through here.
// The refresh token is deliberately kept out of Redux state (only written to
// localStorage) so it isn't visible in Redux DevTools/inspectable global
// state — only baseApi's reauth wrapper reads it back via useStorage.
export const loginSuccess = (token: string, refreshToken?: string, role?: string, userId?: string) => (dispatch: AppDispatch) => {
  // Every login starts by dropping whatever branch is selected, whoever logs in.
  // The selection is persisted in localStorage and attached to requests centrally
  // (baseApi), so one left behind by an earlier session on this browser - a CEO
  // who picked a branch, a branch this account doesn't own - would otherwise scope
  // (or get refused) the new account's very first requests. It goes before the
  // token is stored so no request can be sent with it.
  dispatch(clearSelectedBranch());
  // Then the account gets back what IT had when it last left this browser: the
  // branch selected in the header (a CEO's "All branches" included - that is
  // simply no selection) and the filters of its pages. Both are kept under the
  // account's own id, so nothing here can come from another account. A remembered
  // branch that no longer exists, or is no longer the account's, is corrected by
  // the header's branch picker as on any page load (Header.tsx); an account with
  // nothing remembered gets its own branch from that picker, as before. A
  // STUDENT's /student-portal/* identity comes purely from the token, and a
  // TEACHER is scoped the same way as staff.
  if (userId) {
    const remembered = recallBranch(userId);
    if (remembered) dispatch(restoreSelectedBranch(remembered));
    restorePersistedState(userId);
  }
  // The session is good for today only; the day is written here and nowhere else,
  // so renewing the access token later never extends it (utils/dailySession).
  useStorage.setLoginDay(todayLocalISO());
  useStorage.setCredentials({ token, refreshToken, role });
  useStorage.setUserId(userId ?? null);
  dispatch(setUserId(userId ?? null));
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

// Records whose session this is once GET /auth/me has named the account, for a
// session that doesn't know yet: one that was already signed in when this was
// released, or a login response that carried no user id. From here on the
// account's branch is remembered like in any other session. A branch that is
// selected right now is taken as the account's current choice; with none
// selected, the branch (and, in a tab that holds no page state, the filters) the
// account left with are brought back - the same thing loginSuccess does when it
// knows the id up front.
export const adoptSessionUser = (userId: string) => (
  dispatch: AppDispatch,
  getState: () => { auth: AuthState; branch: { selectedBranchId: string | null } },
) => {
  if (!userId || !getState().auth.token || getState().auth.userId === userId) return;
  useStorage.setUserId(userId);
  dispatch(setUserId(userId));
  const selected = getState().branch.selectedBranchId;
  if (selected) {
    rememberBranch(userId, selected);
    return;
  }
  if (!hasPersistedState()) restorePersistedState(userId);
  const remembered = recallBranch(userId);
  if (remembered) dispatch(changeSelectedBranch(remembered));
};

export const logout = () => (dispatch: AppDispatch, getState: () => { auth: AuthState }) => {
  // The account's page filters are put away under its id and taken out of this
  // tab, so the same account finds them at its next login and another account
  // doesn't. (Its branch needs nothing here: it is remembered on every change.)
  const userId = getState().auth.userId;
  if (userId) stashPersistedState(userId);
  useStorage.removeCredentials();
  dispatch(setToken(null));
  dispatch(setRole(null));
  dispatch(setUserId(null));
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
