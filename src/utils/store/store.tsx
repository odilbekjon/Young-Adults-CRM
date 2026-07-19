import { AuthStorageKeys } from "../../constants/storageKey";
import { SetCredentialsParams } from "./types";

class Storage {
  public setCredentials({ token }: SetCredentialsParams) {
    if (token) {
      localStorage.setItem(AuthStorageKeys.ACCESS_TOKEN, token);
    }
  }

  public removeCredentials() {
    localStorage.removeItem(AuthStorageKeys.ACCESS_TOKEN);
  }

  public getTokens(): { accessToken: string | null } {
    return {
      accessToken: localStorage.getItem(AuthStorageKeys.ACCESS_TOKEN),
    };
  }
}
export const useStorage = new Storage();
