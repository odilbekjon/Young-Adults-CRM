import React, { createContext, useContext, useState, useCallback } from "react";
import { TEACHERS_DATA, type Teacher, type Group } from "../../constants/Teachers";
import { buildFlatStudents, type FlatStudent } from "../../constants/FlatStudents";

interface DataContextValue {
  teachers: Teacher[];
  groups: Group[];
  students: FlatStudent[];

  // Teacher actions
  addTeacher: (teacher: Teacher) => void;
  editTeacher: (id: number, data: Partial<Teacher>) => void;
  deleteTeacher: (id: number) => void;

  // Group actions
  addGroup: (group: Group) => void;
  editGroup: (id: number, data: Partial<Group>) => void;
  deleteGroup: (id: number) => void;

  // Student actions
  addStudent: (student: FlatStudent) => void;
  editStudent: (uid: string, data: Partial<FlatStudent>) => void;
  deleteStudent: (uid: string) => void;
  deleteStudents: (uids: string[]) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teachers, setTeachers] = useState<Teacher[]>(TEACHERS_DATA);
  const [students, setStudents] = useState<FlatStudent[]>(() => buildFlatStudents());

  // Derived: all groups from teachers state
  const groups: Group[] = teachers.flatMap((t) => t.groups);

  /* ── Teacher actions ── */
  const addTeacher = useCallback((teacher: Teacher) => {
    setTeachers((prev) => [...prev, teacher]);
  }, []);

  const editTeacher = useCallback((id: number, data: Partial<Teacher>) => {
    setTeachers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...data } : t))
    );
    // Agar teacher nomi o'zgarsa — studentlarda ham yangilaymiz
    if (data.fullName) {
      setStudents((prev) =>
        prev.map((s) => (s.teacherId === id ? { ...s, teacher: data.fullName! } : s))
      );
    }
  }, []);

  const deleteTeacher = useCallback((id: number) => {
    setTeachers((prev) => prev.filter((t) => t.id !== id));
    // Shu teacher guruhlari va o'quvchilarini ham o'chiramiz
    setStudents((prev) => prev.filter((s) => s.teacherId !== id));
  }, []);

  /* ── Group actions ── */
  const addGroup = useCallback((group: Group) => {
    setTeachers((prev) =>
      prev.map((t) =>
        t.id === group.teacherId ? { ...t, groups: [...t.groups, group] } : t
      )
    );
  }, []);

  const editGroup = useCallback((id: number, data: Partial<Group>) => {
    setTeachers((prev) =>
      prev.map((t) => ({
        ...t,
        groups: t.groups.map((g) => (g.id === id ? { ...g, ...data } : g)),
      }))
    );
    // Studentlarda ham guruh ma'lumotlarini yangilaymiz
    setStudents((prev) =>
      prev.map((s) => {
        if (s.groupId !== id) return s;
        return {
          ...s,
          ...(data.name && { groupName: data.name }),
          ...(data.schedule && { groupSchedule: data.schedule }),
          ...(data.badge && { groupBadge: data.badge }),
          ...(data.badgeColor && { groupBadgeColor: data.badgeColor }),
          ...(data.course && { course: data.course }),
          ...(data.teacher && { teacher: data.teacher }),
          ...(data.startDate && { startDate: data.startDate }),
          ...(data.endDate && { endDate: data.endDate }),
          ...(data.room && { room: data.room }),
          ...(data.price !== undefined && { price: data.price }),
        };
      })
    );
  }, []);

  const deleteGroup = useCallback((id: number) => {
    setTeachers((prev) =>
      prev.map((t) => ({ ...t, groups: t.groups.filter((g) => g.id !== id) }))
    );
    setStudents((prev) => prev.filter((s) => s.groupId !== id));
  }, []);

  /* ── Student actions ── */
  const addStudent = useCallback((student: FlatStudent) => {
    setStudents((prev) => [student, ...prev]);
  }, []);

  const editStudent = useCallback((uid: string, data: Partial<FlatStudent>) => {
    setStudents((prev) =>
      prev.map((s) => (s.uid === uid ? { ...s, ...data } : s))
    );
  }, []);

  const deleteStudent = useCallback((uid: string) => {
    setStudents((prev) => prev.filter((s) => s.uid !== uid));
  }, []);

  const deleteStudents = useCallback((uids: string[]) => {
    setStudents((prev) => prev.filter((s) => !uids.includes(s.uid)));
  }, []);

  return (
    <DataContext.Provider value={{
      teachers, groups, students,
      addTeacher, editTeacher, deleteTeacher,
      addGroup, editGroup, deleteGroup,
      addStudent, editStudent, deleteStudent, deleteStudents,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
};