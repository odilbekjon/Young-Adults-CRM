import { useSelector } from "react-redux";
import type { RootState } from "../app/store";

export const useAuth = () => {
  const token = useSelector((state: RootState) => state.auth.token);
  const role = useSelector((state: RootState) => state.auth.role);
  const isStudent = role?.toUpperCase() === "STUDENT";
  return { isAuthenticated: !!token, token, role, isStudent };
};
