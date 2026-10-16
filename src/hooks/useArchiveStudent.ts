import {
  useLazyStudentGroupsQuery,
  useUpdateStudentGroupStatusMutation,
} from "../app/api/groupsApi/groupsApi";
import { useUpdateStudentStatusMutation } from "../app/api/studentsApi";
import type { StudentGroupRecord } from "../app/api/groupsApi/types";

export interface ArchiveStudentArgs {
  studentId: string;
  reasonId?: string;
  comment?: string;
}

const LIVE_STATUSES = ["PROBATION", "ACTIVE", "FROZEN"] as const;

// The one "delete student" (= archive) flow shared by Students, StudentProfile
// and SingleGroup:
//
//  1. PATCH /student-groups/{id}/status INACTIVE with reasonId + reason (the
//     comment) + isAllGroup ends every live group membership; any live
//     membership left over is ended one by one.
//  2. POST /students/{id}/status INACTIVE with the same reasonId + reason
//     (Swagger: records the reason to the student's history) archives the
//     account. A real DELETE /students/{id} is NOT used: it sets status
//     DELETED and hides the student entirely, instead of moving them to the
//     Archive page.
export const useArchiveStudent = () => {
  const [fetchMemberships] = useLazyStudentGroupsQuery();
  const [updateStudentGroupStatus] = useUpdateStudentGroupStatusMutation();
  const [updateStudentStatus] = useUpdateStudentStatusMutation();

  const loadLive = async (studentId: string): Promise<StudentGroupRecord[]> => {
    const lists = await Promise.all(
      LIVE_STATUSES.map((status) => fetchMemberships({ studentId, status, limit: 200 }).unwrap()),
    );
    return lists
      .flatMap((r) => r.rows)
      .filter((m) => m.status !== "INACTIVE" && m.status !== "DELETED" && (!m.studentId || m.studentId === studentId));
  };

  const archiveStudent = async ({ studentId, reasonId, comment }: ArchiveStudentArgs) => {
    const note = comment?.trim() || undefined;

    const first = (await loadLive(studentId))[0];
    if (first) {
      await updateStudentGroupStatus({
        id: first.id,
        status: "INACTIVE",
        reasonId: reasonId || undefined,
        reason: note,
        isAllGroup: true,
      }).unwrap();
      for (const m of await loadLive(studentId)) {
        await updateStudentGroupStatus({
          id: m.id,
          status: "INACTIVE",
          reasonId: reasonId || undefined,
          reason: note,
        }).unwrap();
      }
    }

    await updateStudentStatus({ id: studentId, status: "INACTIVE", reasonId: reasonId || undefined, reason: note }).unwrap();
  };

  return { archiveStudent };
};
