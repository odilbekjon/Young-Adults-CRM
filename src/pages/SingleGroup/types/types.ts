// src/pages/groups/types.ts
import { Student } from "../../../constants/Teachers";

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
