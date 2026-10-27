import {
  useLazyStudentGroupsQuery,
  useRemoveStudentFromGroupMutation,
  useUpdateStudentGroupStatusMutation,
} from "../app/api/groupsApi/groupsApi";
import { useDeleteStudentMutation, useUpdateStudentStatusMutation } from "../app/api/studentsApi";
import type { StudentGroupRecord } from "../app/api/groupsApi/types";

export interface ArchiveStudentArgs {
  studentId: string;
  reasonId?: string;
  comment?: string;
}

export interface LeaveGroupArgs extends ArchiveStudentArgs {
  groupId: string;
  // The live membership's id when the caller already has it from its cached
  // GET /student-groups rows; looked up here otherwise.
  studentGroupId?: string;
}

const LIVE_STATUSES = ["PROBATION", "ACTIVE", "FROZEN"] as const;

// The one "remove / archive / delete student" flow shared by Students,
// StudentProfile and SingleGroup.
//
// leaveGroup is the "Current group" outcome: only this group's membership ends.
//
// archiveStudent is the "All groups" outcome:
//  1. PATCH /student-groups/{id}/status INACTIVE with reasonId + reason (the
//     comment) + isAllGroup ends every live group membership; any live
//     membership left over is ended one by one.
//  2. POST /students/{id}/status INACTIVE with the same reasonId + reason
//     (Swagger: records the reason to the student's history) archives the
//     account. That alone is "archive": the student stays on the Archive page.
//
// deleteStudent is the second, separate outcome ("Delete student" in the
// dialog): the same two steps first (so memberships are ended — the backend
// refuses DELETE while any is live — and the reason lands in the student's
// history), then DELETE /students/{id}, which sets status DELETED and takes
// the student off the Archive page too.
export const useArchiveStudent = () => {
  const [fetchMemberships] = useLazyStudentGroupsQuery();
  const [updateStudentGroupStatus] = useUpdateStudentGroupStatusMutation();
  const [removeStudentFromGroup] = useRemoveStudentFromGroupMutation();
  const [updateStudentStatus] = useUpdateStudentStatusMutation();
  const [deleteStudentRequest] = useDeleteStudentMutation();

  const loadLive = async (studentId: string): Promise<StudentGroupRecord[]> => {
    const lists = await Promise.all(
      LIVE_STATUSES.map((status) => fetchMemberships({ studentId, status, limit: 200 }).unwrap()),
    );
    return lists
      .flatMap((r) => r.rows)
      .filter((m) => m.status !== "INACTIVE" && m.status !== "DELETED" && (!m.studentId || m.studentId === studentId));
  };

  // Newest live membership of the student in one group, straight from the
  // backend. A failed lookup throws, so "could not check" is never mistaken for
  // "not a member".
  const findLiveMembershipId = async (groupId: string, studentId: string): Promise<string | undefined> => {
    const { rows } = await fetchMemberships({ groupId, studentId, limit: 20 }).unwrap();
    return rows
      .filter((m) => m.status !== "INACTIVE" && m.status !== "DELETED"
        && (!m.groupId || m.groupId === groupId) && (!m.studentId || m.studentId === studentId))
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))[0]?.id;
  };

  const leaveGroup = async ({ groupId, studentId, studentGroupId, reasonId, comment }: LeaveGroupArgs) => {
    const membershipId = studentGroupId ?? (await findLiveMembershipId(groupId, studentId));
    if (membershipId) {
      await updateStudentGroupStatus({
        id: membershipId,
        status: "INACTIVE",
        reasonId: reasonId || undefined,
        reason: comment?.trim() || undefined,
      }).unwrap();
      return;
    }
    // No live membership: the student is listed only by the group's legacy
    // student relation (a member added through POST /groups/{id}/students/
    // assign never got a /student-groups row) or has already left. DELETE
    // /groups/{id}/students/{studentId} clears the legacy row; its 404 means the
    // backend doesn't see the student in this group, which is the state asked for.
    try {
      await removeStudentFromGroup({ id: groupId, studentId }).unwrap();
    } catch (err) {
      if ((err as { status?: unknown }).status !== 404) throw err;
    }
  };

  const archiveStudent = async ({ studentId, reasonId, comment }: ArchiveStudentArgs) => {
    const note = comment?.trim() || undefined;

    const live = await loadLive(studentId);
    const first = live[0];
    if (first) {
      await updateStudentGroupStatus({
        id: first.id,
        status: "INACTIVE",
        reasonId: reasonId || undefined,
        reason: note,
        isAllGroup: true,
      }).unwrap();
      // Anything isAllGroup didn't end is picked up by a second look — only
      // worth the 3 extra requests when there was more than one membership.
      if (live.length > 1) {
        for (const m of await loadLive(studentId)) {
          await updateStudentGroupStatus({
            id: m.id,
            status: "INACTIVE",
            reasonId: reasonId || undefined,
            reason: note,
          }).unwrap();
        }
      }
    }

    await updateStudentStatus({ id: studentId, status: "INACTIVE", reasonId: reasonId || undefined, reason: note }).unwrap();
  };

  const deleteStudent = async (args: ArchiveStudentArgs) => {
    await archiveStudent(args);
    await deleteStudentRequest(args.studentId).unwrap();
  };

  return { leaveGroup, archiveStudent, deleteStudent };
};
