// src/constants/FlatStudents.ts

import { TEACHERS_DATA } from "./Teachers";

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

export const formatDate = (d: string): string => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
};
