export type StudentDiscountType = "PERCENTAGE" | "FIXED";
export type StudentDiscountStatus = "ACTIVE" | "INACTIVE" | "EXPIRED";

export interface StudentDiscountsRequest {
  studentId?: string;
  groupId?: string;
  status?: StudentDiscountStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface StudentDiscountRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  groupId: string | null;
  studentGroupId: string | null;
  type: StudentDiscountType;
  value: number;
  startDate: string;
  endDate: string;
  reason: string;
  status: StudentDiscountStatus | string;
}

export interface CreateStudentDiscountRequest {
  studentId: string;
  groupId?: string;
  studentGroupId?: string;
  type: StudentDiscountType;
  value: number;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface UpdateStudentDiscountRequest {
  id: string;
  type?: StudentDiscountType;
  value?: number;
  startDate?: string;
  endDate?: string;
  reason?: string;
  status?: StudentDiscountStatus;
}

export interface StudentDiscountMutationResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}
