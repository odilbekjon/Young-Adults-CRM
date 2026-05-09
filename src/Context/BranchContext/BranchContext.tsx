// src/Context/BranchContext.tsx

import React, { createContext, useContext, useState, useMemo } from "react";
import { TEACHERS_DATA, ALL_GROUPS } from "../../constants/Teachers";
import type { Teacher, Group, Student } from "../../constants/Teachers";

export type BranchId = "all" | "ielts" | "yangi" | "istiqlol";

interface BranchOption {
  value: BranchId;
  label: string;
  /** constants/Teachers dagi branch string bilan mos */
  match: string | null;
}

export const BRANCH_OPTIONS: BranchOption[] = [
  { value: "all",      label: "All branches",       match: null },
  { value: "ielts",    label: "YA IELTS Campus",    match: "YA IELTS Campus" },
  { value: "yangi",    label: "Main Campus",        match: "Main Campus" },
  { value: "istiqlol", label: "West Branch",        match: "West Branch" },
];

interface BranchContextValue {
  branch: BranchId;
  setBranch: (b: BranchId) => void;
  branchLabel: string;

  // filtered data – istalgan sahifada ishlatish mumkin
  teachers: Teacher[];
  groups: Group[];
  students: Student[];

  // Dashboard stats
  stats: {
    activeStudents: number;
    groups: number;
    debtors: number;
    trialStudents: number;
    courses: number;
    teachers: number;
    branches: number;
  };
}

const BranchContext = createContext<BranchContextValue | null>(null);

export const BranchProvider = ({ children }: { children: React.ReactNode }) => {
  const [branch, setBranch] = useState<BranchId>("all");

  const value = useMemo<BranchContextValue>(() => {
    const option = BRANCH_OPTIONS.find((o) => o.value === branch)!;

    const teachers: Teacher[] =
      option.match === null
        ? TEACHERS_DATA
        : TEACHERS_DATA.filter((t) => t.branch === option.match);

    const groups: Group[] =
      option.match === null
        ? ALL_GROUPS
        : ALL_GROUPS.filter((g) => g.branch === option.match);

    const students: Student[] = groups.flatMap((g) => g.students);

    const stats = {
      activeStudents: students.filter((s) => s.active).length,
      groups: groups.length,
      debtors: 0,          // real loyihada API dan keladi
      trialStudents: 0,    // real loyihada API dan keladi
      courses: [...new Set(groups.map((g) => g.course))].length,
      teachers: teachers.length,
      branches: option.match === null ? BRANCH_OPTIONS.length - 1 : 1,
    };

    return {
      branch,
      setBranch,
      branchLabel: option.label,
      teachers,
      groups,
      students,
      stats,
    };
  }, [branch]);

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
};

/** Har qanday sahifada ishlatish uchun hook */
export const useBranch = () => {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used inside BranchProvider");
  return ctx;
};