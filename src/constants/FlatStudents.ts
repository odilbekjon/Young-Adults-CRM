// src/constants/FlatStudents.ts

import { TEACHERS_DATA } from "./Teachers";
import type { Student, StudentDetail } from "../app/api/studentsApi/types";

export interface FlatStudent {
  uid: string;
  id: number;
  name: string;
  phone: string;
  active: boolean;
  groupId: number;
  groupName: string;
  groupSchedule: string;
  groupBadge: string;
  groupBadgeColor: "blue" | "green" | "amber";
  course: string;
  teacher: string;
  teacherId: number;
  startDate: string;
  endDate: string;
  branch: string;
  room: string;
  price: number;
  balance: number;
  comment?: string;
  photo?: string | null;
  gender?: "MALE" | "FEMALE" | null;
  birthdate?: string | null;
  parentPhone?: string | null;
  address?: string | null;
  createdAt?: string | null;
  groupsCount?: number;
}

export const buildFlatStudents = (): FlatStudent[] => {
  const result: FlatStudent[] = [];

  TEACHERS_DATA.forEach((teacher) => {
    teacher.groups.forEach((group) => {
      group.students.forEach((student) => {
        result.push({
          uid: `${group.id}-${student.id}`,
          id: student.id,
          name: student.name,
          phone: student.phone,
          active: student.active,
          groupId: group.id,
          groupName: group.name,
          groupSchedule: group.schedule,
          groupBadge: group.badge,
          groupBadgeColor: group.badgeColor,
          course: group.course,
          teacher: teacher.fullName,
          teacherId: teacher.id,
          startDate: group.startDate,
          endDate: group.endDate,
          branch: group.branch ?? "",
          room: group.room,
          price: group.price ?? 0,
          balance: 0,
        });
      });
    });
  });

  return result;
};

// Ro'yxat (allStudents) va bitta o'quvchi (studentById) endpointlari turli shakl
// qaytaradi: ro'yxatda `groups`/`teachers`, bittada `status`/`groupsStart`/`branch` bor.
export const mapApiStudentToFlat = (s: Student | StudentDetail): FlatStudent => {
  const group = "groups" in s ? s.groups?.[0] : undefined;
  const teacher = "teachers" in s ? s.teachers?.[0] : undefined;
  const branchName = "branch" in s ? s.branch[0]?.name ?? "" : "";
  const active = "status" in s ? s.status === "ACTIVE" : true;
  const comment = "comments" in s ? s.comments : "comment" in s ? s.comment : null;
  const groupsStart = "groupsStart" in s ? s.groupsStart : null;
  return {
    uid: s.id,
    id: 0,
    name: s.name,
    phone: s.phone,
    active,
    groupId: 0,
    groupName: group?.name ?? "—",
    groupSchedule: "",
    groupBadge: group?.name ?? "—",
    groupBadgeColor: "blue",
    course: group?.name ?? "—",
    teacher: teacher?.name ?? "—",
    teacherId: 0,
    startDate: groupsStart ?? "",
    endDate: "",
    branch: branchName,
    room: "",
    price: 0,
    balance: s.balance,
    comment: comment ?? undefined,
    photo: "photo" in s ? s.photo : undefined,
    gender: s.gender ?? undefined,
    birthdate: s.birthdate ?? undefined,
    parentPhone: s.parentPhone ?? undefined,
    address: s.location ?? undefined,
    createdAt: s.createdAt ?? undefined,
    groupsCount: "groups" in s ? s.groups?.length ?? 0 : undefined,
  };
};

export const formatDate = (d: string): string => {
  if (!d) return "—";
  // Backend timestamps are sometimes date-only ("2026-06-12") and sometimes
  // full ISO datetimes ("2026-06-12T05:00:00.000Z") — take only the date
  // part before splitting, otherwise the time/zone suffix leaks into the
  // "day" segment (e.g. "12T05:00:00.000Z.06.2026").
  const [y, m, day] = d.slice(0, 10).split("-");
  if (!y || !m || !day) return "—";
  return `${day}.${m}.${y}`;
};

// "Added at" kabi uzun formatdagi sanalar uchun (masalan "August 11, 2026").
export const formatLongDate = (d?: string | null, locale = "en-GB"): string => {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
};
