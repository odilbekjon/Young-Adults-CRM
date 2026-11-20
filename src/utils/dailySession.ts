import { useStorage } from "./store/store";
import { toLocalISODate } from "./localDate";

// A signed-in session is good for ONE calendar day: whoever signed in today is
// asked to sign in again the first time they open the CRM on a later day.
//
// The refresh token (see baseApi) keeps an expired access token alive without the
// user noticing, so on its own a session would last for as long as the backend lets
// the refresh token live - days. This is the day limit on top of that: the day is
// stamped at login (authSlice.loginSuccess) and never renewed by a token refresh.
// The day is the browser's LOCAL calendar day (Tashkent for the staff), so the
// limit falls at their midnight, not at UTC's.
//
// This is a limit for the people at the keyboard, not a security boundary: it lives
// in the browser. Making the backend refuse the refresh token after the day is
// over is what actually enforces it.

// Whether the stored session was signed in on an earlier day than today. A browser
// with no session is never "expired". A session with no day on record (signed in
// before this limit existed) is taken as started today, so a release does not sign
// everybody out in the middle of their work; it is asked tomorrow like the rest.
export const isSessionExpired = (now: Date = new Date()): boolean => {
  const { accessToken, refreshToken } = useStorage.getTokens();
  if (!accessToken && !refreshToken) return false;
  const today = toLocalISODate(now);
  const signedInOn = useStorage.getLoginDay();
  if (!signedInOn) {
    useStorage.setLoginDay(today);
    return false;
  }
  return signedInOn !== today;
};

// Calls `onExpired` when the page comes back into view (the tab is shown again or
// the window gets focus) and the session is from an earlier day - the way a tab
// left open overnight finds out in the morning. Returns the way to stop watching.
export const watchSessionDay = (onExpired: () => void): (() => void) => {
  const check = () => {
    if (isSessionExpired()) onExpired();
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") check();
  };
  window.addEventListener("focus", check);
  document.addEventListener("visibilitychange", onVisibilityChange);
  return () => {
    window.removeEventListener("focus", check);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
};
