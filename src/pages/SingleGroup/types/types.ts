// src/pages/groups/types.ts
import { Student } from "../../../constants/Teachers";

export type GroupStudent = Student & {
  balance?: number;
  archived?: boolean;
  addedAt?: string;
  activatedAt?: string;
  frozenAt?: string;
};

export type RemoveReason =
  | ""
  | "No attendance"
  | "Discipline problem"
  | "Moved to another center"
  | "Parent request"
  | "Other";

export interface StudentCardData {
  id: number;
  uid: string;
  name: string;
  phone: string;
  active: boolean;
  balance?: number;
  addedAt?: string;
  activatedAt?: string;
  frozenAt?: string;
}
