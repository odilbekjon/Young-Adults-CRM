import {
  useLazyStudentGroupsQuery,
  useUpdateStudentGroupStatusMutation,
} from "../app/api/groupsApi/groupsApi";
import { useDeleteStudentMutation } from "../app/api/studentsApi";
import type { StudentGroupRecord } from "../app/api/groupsApi/types";

export interface ArchiveStudentArgs {
  studentId: string;
  reasonId?: string;
  comment?: string;
}

const LIVE_STATUSES = ["PROBATION", "ACTIVE", "FROZEN"] as const;

// The one "delete student" flow shared by Students, StudentProfile and
// SingleGroup:
//
//  1. PATCH /student-groups/{id}/status INACTIVE with reasonId + reason (the
//     comment) + isAllGroup ends every live group membership and records the
//     reason and comment. Any live membership left over is ended one by one.
//  2. DELETE /students/{id} (Swagger: "Talabani tizimdan xavfsiz tarzda
//     butunlay o'chiradi. Agar talabaning faol guruhlari mavjud bo'lsa
//     xatolik qaytaradi") — which is why step 1 must clear the memberships
//     first.
export const useArchiveStudent = () => {
  const [fetchMemberships] = useLazyStudentGroupsQuery();
  const [updateStudentGroupStatus] = useUpdateStudentGroupStatusMutation();
  const [deleteStudent] = useDeleteStudentMutation();

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

    await deleteStudent(studentId).unwrap();
  };

  return { archiveStudent };
};
