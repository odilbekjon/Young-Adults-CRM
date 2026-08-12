import { useSelector } from "react-redux";
import type { RootState } from "../app/store";

export const useAuth = () => {
  const token = useSelector((state: RootState) => state.auth.token);
  return { isAuthenticated: !!token, token };
};
