import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "../app/api/baseApi";
import { authReducer } from "../app/store/authSlice";
import { branchReducer } from "../app/store/branchSlice";

// A store wired like the real one (src/app/store) but fresh for each test, so
// RTK Query's cache never leaks from one test into the next.
export const createTestStore = () =>
  configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      auth: authReducer,
      branch: branchReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false, immutableCheck: false }).concat(baseApi.middleware),
  });

export type TestStore = ReturnType<typeof createTestStore>;
