export enum AuthStorageKeys {
  ACCESS_TOKEN = "ACCESS_TOKEN",
  REFRESH_TOKEN = "REFRESH_TOKEN",
  ROLE = "ROLE",
  // The signed-in account's id: whose branch and page filters to remember.
  USER_ID = "USER_ID",
  // The calendar day (YYYY-MM-DD, the browser's local one) the session was
  // signed in on: a session is only good for that day (see utils/dailySession).
  LOGIN_DAY = "LOGIN_DAY",
}
