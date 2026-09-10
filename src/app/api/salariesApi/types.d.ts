// Swagger documents every /salaries endpoint's parameters and request bodies,
// but never expands the Responses section (each shows only "200 / No links"),
// so the response shapes below are normalized defensively — the same approach
// archivesApi and reportsApi already take in this project. The endpoint
// descriptions do pin down several field names (periodYear, periodMonth,
// teacherId, status: DRAFT|PUBLISHED|PAID), so those are read first.
//
// `x-lang` and `x-branch-id` are sent centrally by baseApi's prepareHeaders.

export type PayrollStatus = "DRAFT" | "PUBLISHED" | "PAID";

export interface PayrollsRequest {
  page?: number;
  limit?: number;
  year?: number;
  month?: number;
  status?: PayrollStatus;
  branchId?: string;
}

export interface PayrollRow {
  id: string;
  teacherId: string;
  teacherName: string;
  periodYear: number | null;
  periodMonth: number | null;
  status: string;
  totalAmount: number;
  paidAmount: number;
  branchName: string;
}

export interface PayrollsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PayrollsResult {
  rows: PayrollRow[];
  meta: PayrollsMeta;
}

// GET /salaries/payrolls/{id} — "har bir guruh va talaba kesimida hisoblangan
// summani, qatnashgan darslar soni, qoldirilgan darslar va hisoblash
// formulasini batafsil ko'rsatadi".
export interface PayrollDetailItem {
  id: string;
  groupName: string;
  studentName: string;
  lessons: number | null;
  attended: number | null;
  missed: number | null;
  rate: number | null;
  amount: number;
  calcSetting: string;
  salaryType: string;
  formula: string;
}

export interface PayrollDetail extends PayrollRow {
  items: PayrollDetailItem[];
}

// GET /salaries/settings — "Standart global stavkalar, O'qituvchiga xos,
// Kursga xos, Guruhga xos yoki Talabaga xos individual sozlamalar".
export interface SalarySetting {
  id: string;
  calcSetting: string;
  salaryType: string;
  amount: number | string;
  courseName: string;
  groupName: string;
  teacherName: string;
  studentName: string;
  createdBy: string;
  updatedAt: string;
}

// GET /salaries/teacher/{teacherId} — the teacher's own published/paid
// payroll history, for the Teacher Profile salary tab.
export interface TeacherSalaryRow {
  id: string;
  periodYear: number | null;
  periodMonth: number | null;
  status: string;
  totalAmount: number;
  paidAmount: number;
  paidAt: string;
}

// POST /salaries/calculate — multipart/form-data: year* and month* are
// required, branchId optional (or "all").
export interface CalculateSalariesRequest {
  year: number;
  month: number;
  branchId?: string;
}

// POST /salaries/payrolls/{id}/pay — multipart/form-data. paidAmount is
// optional: "bo'sh bo'lsa jami hisoblangan summa olinadi".
export interface PayPayrollRequest {
  id: string;
  paymentMethodId: string;
  paidAmount?: number;
}

export interface SalaryMutationResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}
