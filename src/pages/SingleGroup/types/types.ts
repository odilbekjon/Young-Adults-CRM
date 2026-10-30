// src/pages/groups/types.ts
import { Student } from "../../../constants/Teachers";
import type { StudentGroupStatus } from "../../../app/api/groupsApi/types";

export type GroupStudent = Student & {
  balance?: number;
  archived?: boolean;
  addedAt?: string;
  activatedAt?: string;
  frozenAt?: string;
};

export interface StudentCardData {
  id: number;
  uid: string;
  name: string;
  phone: string;
  active: boolean;
  /** The student's own status in THIS group (their membership) — what the
   * card's status chip shows; undefined when no source named it. */
  groupStatus?: StudentGroupStatus;
  /** Real account status (ACTIVE/INACTIVE/FROZEN/DEBTOR) from GET
   * /students/{id} once it resolves — undefined during the brief pre-fetch
   * window, when `active` above is the only signal available yet. */
  status?: string;
  balance?: number;
  addedAt?: string;
  activatedAt?: string;
  frozenAt?: string;
  /** Date this student joined THIS group (their /student-groups membership joinedAt), distinct from addedAt (account creation) */
  joinedAt?: string;
  /** Student.comment from GET /students/{id} — read-only, there is no backend endpoint to write it from this app */
  note?: string;
}
