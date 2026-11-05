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
// A branch whose status the response leaves out is taken as active - only an
// explicit INACTIVE/DELETED/... excludes it - so a /auth/me that omits the field
// can't leave a branch director without any branch.
export const activeOwnBranches = (userBranches?: readonly MeUserBranchRef[] | null): BranchLike[] =>
  (userBranches ?? []).flatMap((ref) => {
    const status = (ref.branch?.status ?? "").trim().toUpperCase();
    return ref.branch?.id && (status === "" || status === "ACTIVE") ? [ref.branch] : [];
  });

// The branches a user may work in - the same rule the header's branch picker
// lists: only a SUPERADMIN / CEO-position account sees every (active) branch;
// everyone else is limited to the branches of their own account. Those come with
// their names from GET /auth/me; GET /branches (which not every role may read)
// is only the fallback, filtered by the account's branchIds.
//
// `idsOnlyFallback` is the last resort for an account that has branchIds but whose
// branches can be named by neither source (GET /auth/me lists none and GET /branches
// is refused or doesn't know them): they are still offered, under a generic name, so
// such an account never ends up on "no branch" while it has one. It is left off
// while GET /branches is still loading.
export const pickAccessibleBranches = ({
  isCeo,
  allBranches,
  ownBranches,
  branchIds,
  idsOnlyFallback = false,
}: {
  isCeo: boolean;
  allBranches: readonly BranchLike[];
  ownBranches: readonly BranchLike[];
  branchIds: readonly string[];
  idsOnlyFallback?: boolean;
}): BranchLike[] => {
  const active = allBranches.filter((b) => b.status === "ACTIVE");
  if (isCeo) return active;
  if (ownBranches.length > 0) return [...ownBranches];
  const listed = active.filter((b) => branchIds.includes(b.id));
  if (listed.length > 0 || !idsOnlyFallback) return listed;
  const unknownIds = branchIds.filter((id) => !allBranches.some((b) => b.id === id));
  return unknownIds.map((id, i) => ({ id, name: unknownIds.length > 1 ? `Branch ${i + 1}` : "Branch", status: "ACTIVE" }));
};

export type BranchSelectionFix = { type: "select"; id: string; name: string } | { type: "clear" } | null;

// What the header's branch picker must do about the branch currently selected
// (persisted in localStorage and sent as x-branch-id with every request):
//   - a CEO may select anything that exists; a selection GET /branches doesn't know
//     (a deleted branch, one from another backend) is cleared back to "All branches"
//   - anyone else works inside one of their own branches: a selection that is not
//     one of theirs - none yet, or left over from an earlier session on this
//     browser - becomes their first branch, and is never left in place just because
//     GET /branches happens to list it
//   - an account that is known (or failed to load) but has no branch at all - once
//     GET /branches, the fallback that may still name its branches, has answered -
//     keeps no selection, since whatever is selected can't be theirs
//   - while the account is still loading nothing changes, so a valid choice
//     survives a page reload
// `listedBranchIds` (CEO only) is undefined until GET /branches has answered.
export const resolveBranchSelection = ({
  isCeo,
  accountLoaded,
  accountFailed,
  branchListSettled,
  selectedBranchId,
  accessible,
  listedBranchIds,
}: {
  isCeo: boolean;
  accountLoaded: boolean;
  accountFailed: boolean;
  branchListSettled: boolean;
  selectedBranchId: string | null;
  accessible: readonly { id: string; name: string }[];
  listedBranchIds?: ReadonlySet<string>;
}): BranchSelectionFix => {
  if (isCeo) {
    return selectedBranchId && listedBranchIds && !listedBranchIds.has(selectedBranchId) ? { type: "clear" } : null;
  }
  if (accessible.length > 0) {
    if (accessible.some((b) => b.id === selectedBranchId)) return null;
    return { type: "select", id: accessible[0].id, name: accessible[0].name };
  }
  return selectedBranchId && branchListSettled && (accountLoaded || accountFailed) ? { type: "clear" } : null;
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
        idsOnlyFallback: !isLoading,
      }).map(({ id, name }) => ({ id, name })),
    [isCeo, allBranches, userBranches, branchIds, isLoading],
  );
  return { branches, isLoading };
};
