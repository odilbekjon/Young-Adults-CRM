export type StatusType = "Active" | "Archive" | "Completed";

export interface Student {
  id: number;
  name: string;
  phone: string;
  active: boolean;
}

export interface Group {
  id: number;
  name: string;
  course: string;
  teacher: string;
  days: string;
  lessonStartTime: string;
  room: string;
  roomCapacity?: number;
  price?: number;
  students: number;
  studentList?: Student[];
  status: StatusType;
  tags: string[];
  startDate: string;
  endDate: string;
  branch?: string;
}
