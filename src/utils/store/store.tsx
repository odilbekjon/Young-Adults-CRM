import { AuthStorageKeys } from "../../constants/storageKey";
import { SetCredentialsParams } from "./types";

class Storage {
  public setCredentials({ token, refreshToken, role }: SetCredentialsParams) {
    if (token) {
      localStorage.setItem(AuthStorageKeys.ACCESS_TOKEN, token);
    }
    if (refreshToken) {
      localStorage.setItem(AuthStorageKeys.REFRESH_TOKEN, refreshToken);
    }
    // Only written when explicitly provided (e.g. at login) — the 401
    // refresh flow calls setCredentials with just {token, refreshToken}
    // and must not wipe out the role that was stored at login time.
    if (role) {
      localStorage.setItem(AuthStorageKeys.ROLE, role);
    }
  }

  public removeCredentials() {
    localStorage.removeItem(AuthStorageKeys.ACCESS_TOKEN);
    localStorage.removeItem(AuthStorageKeys.REFRESH_TOKEN);
    localStorage.removeItem(AuthStorageKeys.ROLE);
  }

  public getTokens(): { accessToken: string | null; refreshToken: string | null } {
    return {
      accessToken: localStorage.getItem(AuthStorageKeys.ACCESS_TOKEN),
      refreshToken: localStorage.getItem(AuthStorageKeys.REFRESH_TOKEN),
    };
  }

  public getRole(): string | null {
    return localStorage.getItem(AuthStorageKeys.ROLE);
  }
}
export const useStorage = new Storage();
