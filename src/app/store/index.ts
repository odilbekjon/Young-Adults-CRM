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
  // In development RTK walks the whole state and every action's payload after
  // each dispatch to catch mutations and non-serializable values. The RTK Query
  // cache is built by RTK itself and, with the big lists this app caches (3000
  // students, thousands of memberships), checking it made every refetch about
  // 60% slower. Production builds skip these checks anyway.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      immutableCheck: { ignoredPaths: [baseApi.reducerPath] },
      serializableCheck: {
        ignoredPaths: [baseApi.reducerPath],
        ignoredActionPaths: ["payload", "meta.arg", "meta.baseQueryMeta"],
      },
    }).concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
