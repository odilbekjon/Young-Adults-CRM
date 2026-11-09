import type { FreezeStudentGroupRequest } from "../../app/api/groupsApi/types";
import { describeApiError } from "./describeApiError";

type FreezeTrigger = (arg: FreezeStudentGroupRequest) => { unwrap: () => Promise<unknown> };

// A 400/422 from a backend that does not know the `recalculateBalance` field
// yet ("property recalculateBalance should not exist"): the refusal names the
// field, so it is told apart from a real validation error (a bad date...).
export const refusesRecalculateField = (err: unknown): boolean => {
  const status = (err as { status?: unknown } | undefined)?.status;
  return (status === 400 || status === 422) && /recalculateBalance/i.test(describeApiError(err));
};

// POST /student-groups/{id}/freeze, with the dialog's "Recalculate the balance"
// checkbox sent along. The backend has to implement that field (bill only the
// days before startDate); one that rejects it by name must not lose the freeze
// itself, so the freeze is sent again without it. Resolves with whether the
// balance was asked to be recalculated and the backend took it, so the caller
// can warn when it was ticked but could not be honoured.
export const freezeMembership = async (
  freeze: FreezeTrigger,
  request: FreezeStudentGroupRequest,
): Promise<{ recalculateIgnored: boolean }> => {
  try {
    await freeze(request).unwrap();
    return { recalculateIgnored: false };
  } catch (err) {
    if (!request.recalculateBalance || !refusesRecalculateField(err)) throw err;
    await freeze({ ...request, recalculateBalance: undefined }).unwrap();
    return { recalculateIgnored: true };
  }
};
