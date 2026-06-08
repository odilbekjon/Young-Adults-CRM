/* eslint-disable react-refresh/only-export-components */
// src/Context/BranchContext.tsx
import React, { createContext, useContext, useState } from "react";
import { useData } from "../DataContext";
import type { Group, Teacher } from "../../constants/Teachers";

// ✅ Header import qiladigan type va constant
export type BranchId = string;

// eslint-disable-next-line react-refresh/only-export-components
export const BRANCH_OPTIONS: { value: BranchId; label: string }[] = [
  { value: "all",              label: "All branches" },
  { value: "YA IELTS Campus",  label: "YA IELTS Campus" },
  { value: "Main Campus",      label: "Main Campus" },
  { value: "West Branch",      label: "West Branch" },
];

interface BranchContextValue {
  branch: BranchId;
  setBranch: (b: BranchId) => void;
  branchLabel: string;
  groups: Group[];
  teachers: Teacher[];
}

const BranchContext = createContext<BranchContextValue | null>(null);

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { groups: allGroups, teachers: allTeachers } = useData();
  const [branch, setBranch] = useState<BranchId>("all");

  const groups =
    branch === "all" ? allGroups : allGroups.filter((g) => g.branch === branch);

  const teachers =
    branch === "all" ? allTeachers : allTeachers.filter((t) => t.branch === branch);

  const branchLabel =
    BRANCH_OPTIONS.find((o) => o.value === branch)?.label ?? "All branches";

  return (
    <BranchContext.Provider value={{ branch, setBranch, branchLabel, groups, teachers }}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used inside BranchProvider");
  return ctx;
};