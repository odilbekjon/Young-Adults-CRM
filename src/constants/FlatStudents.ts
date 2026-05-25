// src/constants/flatStudents.ts
// TEACHERS_DATA dan barcha studentlarni "flat" ko'rinishga o'tkazish

import { TEACHERS_DATA, formatDate } from "./Teachers";

export interface FlatStudent {
  /** Unique key: groupId-studentId */
  uid: string;
  /** Student's own id (group ichidagi) */
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
  /** Mock balance (real loyihada backenddan keladi) */
  balance: number;
}

/** TEACHERS_DATA → FlatStudent[] */
export const buildFlatStudents = (): FlatStudent[] => {
  const result: FlatStudent[] = [];
  const seen = new Set<string>();

  TEACHERS_DATA.forEach((teacher) => {
    teacher.groups.forEach((group) => {
      group.students.forEach((student) => {
        const uid = `${group.id}-${student.id}`;
        // Bir xil uid bo'lsa (turli groupda bir xil id) — skip
        if (seen.has(uid)) return;
        seen.add(uid);

        result.push({
          uid,
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
          teacher: group.teacher,
          teacherId: group.teacherId,
          startDate: group.startDate,
          endDate: group.endDate,
          branch: group.branch ?? teacher.branch,
          room: group.room,
          price: group.price ?? 0,
          balance:
            Math.random() > 0.4
              ? -Math.floor(Math.random() * 300000 + 50000)
              : 0,
        });
      });
    });
  });

  return result;
};

export { formatDate };
