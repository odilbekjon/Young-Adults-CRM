import { useSelector } from "react-redux";
import { useTeachersSelectQuery } from "../app/api/teachersApi";
import type { RootState } from "../app/store";
import { useAuth } from "./useAuth";

// The teachers a group form may pick (GET /teachers/select, which needs a
// branch). That is the branch chosen in the header; while none is chosen yet,
// "all" is only the CEO's shortcut. Everyone else is scoped to their own
// branches (see Header's BranchDropdown), so until the header has settled on one
// they ask for their own first branch rather than for "all" — otherwise the
// picker came back empty for staff and nothing in the form said why.
export const useTeacherOptions = (options?: { skip?: boolean }) => {
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);
  const { isCeo, branchIds } = useAuth();
  const branchId = selectedBranchId ?? (isCeo ? "all" : branchIds[0] ?? "all");

  const { data, isLoading, isFetching, isError, refetch } = useTeachersSelectQuery({ branchId }, { skip: options?.skip });
  return { teachers: data ?? [], isLoading: isLoading || isFetching, isError, refetch };
};
