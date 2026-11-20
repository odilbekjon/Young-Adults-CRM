import { describe, expect, it, vi } from "vitest";
import { isSessionExpired, watchSessionDay } from "./dailySession";
import { createTestStore } from "../test/testStore";
import { jsonResponse, stubFetch } from "../test/fetchStub";
import { loginSuccess } from "../app/store/authSlice";
import { authApi } from "../app/api/authApi";
import { groupsApi } from "../app/api/groupsApi";
import { useStorage } from "./store/store";

// A signed-in session is good for one calendar day (the browser's local one): the
// first time the CRM is opened on a later day, the login page comes first.

// Only Date is faked, so RTK Query's own timers keep running.
const at = (day: number, hour: number, minute = 0) => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, day, hour, minute));
};

describe("isSessionExpired", () => {
  it("is false in a browser nobody is signed in", () => {
    at(20, 9);
    expect(isSessionExpired()).toBe(false);
  });

  it("is false for the rest of the day the session was signed in on, even past 24 hours of work", () => {
    at(20, 6);
    createTestStore().dispatch(loginSuccess("tok", "ref", "ADMIN", "u-1") as never);

    at(20, 23, 59);
    expect(isSessionExpired()).toBe(false);
  });

  it("turns true at the next midnight, whether the session is 10 minutes or 23 hours old", () => {
    at(20, 23, 50);
    createTestStore().dispatch(loginSuccess("tok", "ref", "ADMIN", "u-1") as never);
    at(21, 0, 1);
    expect(isSessionExpired()).toBe(true);

    at(20, 9);
    createTestStore().dispatch(loginSuccess("tok", "ref", "ADMIN", "u-1") as never);
    at(21, 8);
    expect(isSessionExpired()).toBe(true);
  });

  it("stays true after days away", () => {
    at(20, 9);
    createTestStore().dispatch(loginSuccess("tok", "ref", "ADMIN", "u-1") as never);
    at(27, 9);
    expect(isSessionExpired()).toBe(true);
  });

  it("is not extended by renewing the access token", () => {
    at(20, 9);
    createTestStore().dispatch(loginSuccess("tok", "ref", "ADMIN", "u-1") as never);

    at(21, 9);
    // what baseApi stores after POST /auth/refresh
    useStorage.setCredentials({ token: "renewed", refreshToken: "ref-2" });

    expect(isSessionExpired()).toBe(true);
  });

  it("takes a session signed in before this limit existed as started today", () => {
    at(20, 9);
    localStorage.setItem("ACCESS_TOKEN", "tok");
    localStorage.setItem("REFRESH_TOKEN", "ref");

    expect(isSessionExpired()).toBe(false);
    expect(localStorage.getItem("LOGIN_DAY")).toBe("2026-11-20");
    at(21, 9);
    expect(isSessionExpired()).toBe(true);
  });

  it("a new login the next day starts a new day", () => {
    at(20, 9);
    createTestStore().dispatch(loginSuccess("tok", "ref", "ADMIN", "u-1") as never);
    at(21, 9);
    expect(isSessionExpired()).toBe(true);

    createTestStore().dispatch(loginSuccess("tok-2", "ref-2", "ADMIN", "u-1") as never);
    expect(isSessionExpired()).toBe(false);
  });
});

describe("the first request of a new day", () => {
  it("is not sent: the session ends and the app is signed out", async () => {
    at(20, 9);
    const store = createTestStore();
    store.dispatch(loginSuccess("tok", "ref", "ADMIN", "u-1") as never);
    const { requests } = stubFetch(() => jsonResponse({ data: [] }));

    await store.dispatch(groupsApi.endpoints.groupsSelect.initiate());
    expect(requests).toHaveLength(1);

    at(21, 8);
    await store.dispatch(groupsApi.endpoints.groupsSelect.initiate(undefined, { forceRefetch: true }));

    expect(requests).toHaveLength(1);
    expect(store.getState().auth.token).toBeNull();
    expect(localStorage.getItem("ACCESS_TOKEN")).toBeNull();
    expect(localStorage.getItem("REFRESH_TOKEN")).toBeNull();
    expect(localStorage.getItem("LOGIN_DAY")).toBeNull();
  });

  it("does not hold back the login itself", async () => {
    at(20, 9);
    createTestStore().dispatch(loginSuccess("tok", "ref", "ADMIN", "u-1") as never);
    at(21, 8);
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ success: true, data: { token: "t" } }));

    await store.dispatch(authApi.endpoints.login.initiate({ identifier: "a@b.uz", password: "secret1" }));

    expect(requests).toHaveLength(1);
    expect(requests[0].url.endsWith("/auth/login")).toBe(true);
  });
});

describe("watchSessionDay", () => {
  it("signs out a tab that is brought back on a later day", () => {
    at(20, 9);
    createTestStore().dispatch(loginSuccess("tok", "ref", "ADMIN", "u-1") as never);
    const onExpired = vi.fn();
    const stop = watchSessionDay(onExpired);

    window.dispatchEvent(new Event("focus"));
    expect(onExpired).not.toHaveBeenCalled();

    at(21, 8);
    window.dispatchEvent(new Event("focus"));
    expect(onExpired).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new Event("visibilitychange"));
    expect(onExpired).toHaveBeenCalledTimes(2);

    stop();
    window.dispatchEvent(new Event("focus"));
    expect(onExpired).toHaveBeenCalledTimes(2);
  });
});

// The browser is opened (the module is loaded) the morning after the session was
// signed in on.
describe("opening the app on a later day", () => {
  const openApp = async () => {
    vi.resetModules();
    return import("../app/store/authSlice");
  };

  it("starts signed out, with the credentials gone", async () => {
    at(20, 9);
    createTestStore().dispatch(loginSuccess("tok", "ref", "SUPERADMIN", "u-1") as never);
    expect(localStorage.getItem("ACCESS_TOKEN")).toBe("tok");

    at(21, 8);
    const { authReducer } = await openApp();

    expect(authReducer(undefined, { type: "@@init" })).toEqual({ token: null, role: null, userId: null });
    expect(localStorage.getItem("ACCESS_TOKEN")).toBeNull();
    expect(localStorage.getItem("REFRESH_TOKEN")).toBeNull();
    expect(localStorage.getItem("ROLE")).toBeNull();
  });

  it("puts the account's page filters away, so it finds them at its next login", async () => {
    at(20, 9);
    createTestStore().dispatch(loginSuccess("tok", "ref", "SUPERADMIN", "u-1") as never);
    sessionStorage.setItem("ya-crm:state:groups:filters", '"A"');

    at(21, 8);
    await openApp();

    expect(sessionStorage.getItem("ya-crm:state:groups:filters")).toBeNull();
    expect(localStorage.getItem("ya-crm:saved-state:u-1")).toContain("groups:filters");
  });

  it("keeps a session of the same day signed in", async () => {
    at(20, 9);
    createTestStore().dispatch(loginSuccess("tok", "ref", "SUPERADMIN", "u-1") as never);

    at(20, 18);
    const { authReducer } = await openApp();

    expect(authReducer(undefined, { type: "@@init" })).toEqual({ token: "tok", role: "SUPERADMIN", userId: "u-1" });
  });
});
