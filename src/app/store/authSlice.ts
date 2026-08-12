import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { useStorage } from "../../utils/store/store";
import type { AppDispatch } from "./index";

interface AuthState {
  token: string | null;
}

const initialState: AuthState = {
  token: useStorage.getTokens()?.accessToken ?? null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setToken: (state, action: PayloadAction<string | null>) => {
      state.token = action.payload;
    },
  },
});

export const { setToken } = authSlice.actions;
export const authReducer = authSlice.reducer;

// Centralized side effects so the token in localStorage and the token in
// Redux state can never drift apart — every login/logout goes through here.
export const loginSuccess = (token: string) => (dispatch: AppDispatch) => {
  useStorage.setCredentials({ token });
  dispatch(setToken(token));
};

export const logout = () => (dispatch: AppDispatch) => {
  useStorage.removeCredentials();
  dispatch(setToken(null));
};
