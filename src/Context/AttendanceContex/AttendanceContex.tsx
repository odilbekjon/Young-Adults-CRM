import { createContext, useContext, useState, ReactNode } from "react";

export type AttVal = "Was" | "Not" | null;
export type AttendanceMap = Record<number, Record<number, AttVal>>;

interface AttendanceContextValue {
  year: number;
  month: number;
  setYear: (y: number) => void;
  setMonth: (m: number) => void;
  attendance: AttendanceMap;
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceMap>>;
}

const AttendanceContext = createContext<AttendanceContextValue | null>(null);

export const AttendanceProvider = ({ children }: { children: ReactNode }) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [attendance, setAttendance] = useState<AttendanceMap>({});

  return (
    <AttendanceContext.Provider
      value={{ year, month, setYear, setMonth, attendance, setAttendance }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendanceContext = () => {
  const ctx = useContext(AttendanceContext);
  if (!ctx) {
    throw new Error(
      "useAttendanceContext AttendanceProvider ichida ishlatilishi kerak"
    );
  }
  return ctx;
};