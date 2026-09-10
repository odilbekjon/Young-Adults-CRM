import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "../api/baseApi";
import { authReducer } from "./authSlice";
import { branchReducer } from "./branchSlice";

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
    branch: branchReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
