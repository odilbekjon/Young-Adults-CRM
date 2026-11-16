// The branch each account had selected in the header when it last worked on this
// browser, so signing in again opens the same branch instead of the default
// ("All branches" for a CEO, the first own branch for everyone else).
//
// It is kept per ACCOUNT id on purpose. The live selection (branchSlice) is sent
// as x-branch-id with every request and is wiped at every login and logout so one
// account never inherits another's branch; this memory only ever hands a branch
// back to the account that picked it.
const STORAGE_KEY = "ya-crm:lastBranch";
// A CEO's deliberate "All branches" - told apart from "nothing remembered".
const ALL_BRANCHES = "all";

const readAll = (): Record<string, string> => {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return typeof stored === "object" && stored !== null && !Array.isArray(stored) ? (stored as Record<string, string>) : {};
  } catch {
    return {};
  }
};

// `branchId` null = "All branches".
export const rememberBranch = (userId: string, branchId: string | null): void => {
  if (!userId) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readAll(), [userId]: branchId ?? ALL_BRANCHES }));
  } catch {
    /* storage unavailable - the branch just isn't remembered */
  }
};

// The branch id the account last had selected; null when that was "All
// branches"; undefined when nothing is remembered for it.
export const recallBranch = (userId: string): string | null | undefined => {
  const stored = userId ? readAll()[userId] : undefined;
  if (typeof stored !== "string" || stored === "") return undefined;
  return stored === ALL_BRANCHES ? null : stored;
};
