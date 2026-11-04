import { useMemo } from "react";
import { useAllBranchesQuery } from "../app/api/branchesApi/branchesApi";
import type { MeUserBranchRef } from "../app/api/authApi/types";
import { useAuth } from "./useAuth";

interface BranchLike {
  id: string;
  name: string;
  status?: string;
}

// The branches named on the signed-in account (GET /auth/me), active ones only.
export const activeOwnBranches = (userBranches?: readonly MeUserBranchRef[] | null): BranchLike[] =>
  (userBranches ?? []).flatMap((ref) => (ref.branch?.status === "ACTIVE" ? [ref.branch] : []));

// The branches a user may work in - the same rule the header's branch picker
// lists: only a SUPERADMIN / CEO-position account sees every (active) branch;
// everyone else is limited to the branches of their own account. Those come with
// their names from GET /auth/me; GET /branches (which not every role may read)
// is only the fallback, filtered by the account's branchIds.
export const pickAccessibleBranches = ({
  isCeo,
  allBranches,
  ownBranches,
  branchIds,
}: {
  isCeo: boolean;
  allBranches: readonly BranchLike[];
  ownBranches: readonly BranchLike[];
  branchIds: readonly string[];
}): BranchLike[] => {
  const active = allBranches.filter((b) => b.status === "ACTIVE");
  if (isCeo) return active;
  return ownBranches.length > 0 ? [...ownBranches] : active.filter((b) => branchIds.includes(b.id));
};

// Branches for a "which branch" picker inside a form (the header uses the same
// rule through pickAccessibleBranches).
export const useAccessibleBranches = (): { branches: { id: string; name: string }[]; isLoading: boolean } => {
  const { isCeo, user, branchIds } = useAuth();
  const { data, isLoading } = useAllBranchesQuery(undefined, { refetchOnMountOrArgChange: false });
  const allBranches = data?.data;
  const userBranches = user?.branches;
  const branches = useMemo(
    () =>
      pickAccessibleBranches({
        isCeo,
        allBranches: allBranches ?? [],
        ownBranches: activeOwnBranches(userBranches),
        branchIds,
      }).map(({ id, name }) => ({ id, name })),
    [isCeo, allBranches, userBranches, branchIds],
  );
  return { branches, isLoading };
};
