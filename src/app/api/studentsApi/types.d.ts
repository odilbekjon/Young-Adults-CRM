import type { PaymentRow } from "../financeApi/types";

export interface StudentGroupRef {
  id: string;
  name: string;
}

export interface StudentTeacherRef {
  id: string;
  name: string;
}

export interface StudentBranchRef {
  id: string;
  name: string;
}

// Backend contract ma'lum bo'lgan maydonlar (CreateStudentRequest bilan bir xil
// nomlash) — GET javoblarida bu qo'shimcha maydonlar bo'lishi mumkin, lekin
// tasdiqlanmagan, shu sabab hammasi optional/nullable. UI shu maydonlar mavjud
// bo'lgandagina ko'rsatadi (teachersApi'dagi Teacher.gender/birthdate bilan
// bir xil yondashuv).
export interface StudentExtraFields {
  gender?: StudentGender | null;
  birthdate?: string | null;
  email?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  schoolName?: string | null;
  location?: string | null;
  passport?: string | null;
  telegram?: string | null;
  instagram?: string | null;
  createdAt?: string | null;
}

export interface Student extends StudentExtraFields {
  id: string;
  photo: string | null;
  name: string;
  phone: string;
  balance: number;
  trainingDates: string | null;
  comments: string | null;
  groups: StudentGroupRef[];
  teachers: StudentTeacherRef[];
}

// GET /students/{id} javobi ro'yxatdagidan farq qiladi: groups/teachers o'rniga
// status, groupsStart va branch qaytadi.
export interface StudentDetail extends StudentExtraFields {
  id: string;
  photo?: string | null;
  name: string;
  phone: string;
  balance: number;
  status: string;
  groupsStart: string | null;
  branch: StudentBranchRef[];
  comment: string | null;
}

// `branchId` is sent centrally via the x-branch-id header (baseApi), but
// several other list endpoints in this backend (teachers, student-groups)
// document an *additional*, explicit branchId query param alongside that
// header — teachersApi already sends both. This field lets callers do the
// same for /students once a caller supplies it (see studentsApi.tsx).
//
// `status` (Swagger: "Status bo'yicha filter (ACTIVE/INACTIVE)") is confirmed
// on GET /students itself, distinct from studentsExcel's own StudentExcelStatus
// below — without it the endpoint only returns ACTIVE students, so an
// archived (INACTIVE, via toggleStudentStatus) student silently disappears
// from every list request unless this is explicitly set to "INACTIVE".
export interface studentsRequest {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
  status?: StudentExcelStatus;
}

// GET /students/excel query params — confirmed against Swagger: search,
// status (ACTIVE/INACTIVE), page, limit, branchId. `status` isn't part of
// studentsRequest above since GET /students itself doesn't document it, but
// the excel endpoint does, so it's its own type rather than reusing/widening
// studentsRequest.
export type StudentExcelStatus = "ACTIVE" | "INACTIVE";

export interface StudentsExcelQueryArgs {
  page?: number;
  limit?: number;
  search?: string;
  status?: StudentExcelStatus;
  branchId?: string;
}

// Backend `data` ni to'g'ridan-to'g'ri massiv qilib qaytaradi (RoomsResponse/CoursesResponse
// bilan bir xil shakl); sahifalash meta'si hozircha kelmayapti, shu sabab optional.
export interface studentsResponse {
  success: boolean;
  message: string;
  data: Student[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface studentByIdResponse {
  success: boolean;
  message: string;
  data: StudentDetail;
}

export type StudentGender = "MALE" | "FEMALE";

export interface CreateStudentRequest {
  name: string;
  password?: string;
  photo?: string;
  gender?: StudentGender;
  birthdate?: string;
  email?: string;
  phone?: string;
  parentName?: string;
  parentPhone?: string;
  schoolName?: string;
  location?: string;
  passport?: string;
  telegram?: string;
  instagram?: string;
  branchIds?: string[];
}

export interface UpdateStudentRequest extends Partial<Omit<CreateStudentRequest, "name" | "password">> {
  id: string;
  name?: string;
  password?: string;
}

export interface StudentResponse {
  success: boolean;
  message: string;
  data: StudentDetail;
}

export interface DeleteStudentResponse {
  success: boolean;
  message: string;
}

// PATCH /students/{id}/toggle-status — Swagger: "Talaba holatini (status)
// ACTIVE va INACTIVE oralig'ida tezkor o'zgartirish", no request body (just
// the {id} path param). This is the dedicated "archive" action: it flips
// status to INACTIVE (or back to ACTIVE if already archived) WITHOUT
// removing the student, distinct from DELETE /students/{id} below which
// permanently deletes the record.
export interface ToggleStudentStatusResponse {
  success?: boolean;
  message?: string;
  data?: StudentDetail;
}

// POST /students/{id}/transfer-branch — Swagger: application/json body
// {newBranchId, reason}. Unlike sending branchIds through updateStudent
// (which overwrites the branch list), this dedicated endpoint properly
// transfers the student: it ends their group memberships in the old branch
// and moves them to the new one while keeping their balance intact.
export interface TransferStudentBranchRequest {
  id: string;
  newBranchId: string;
  reason?: string;
}

export interface TransferStudentBranchResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}

// GET /students/{id}/groups — "Talabaning hozirda o'qiyotgan, muzlatilgan va
// faol barcha guruhlar ro'yxati" (every group membership the student has,
// regardless of status). Response envelope/fields confirmed directly against
// the live API (Swagger documents only a bare 200, no schema): {success,
// data: [{id, name, courseName, status, paymentStartDate, joinedAt, exitedAt,
// customPrice, trainingStart, trainingEnd, teachers: [{id, name}]}]}. `id`
// here is the student-group membership id (same resource PATCH
// /student-groups/{id} etc. key off), not the group's own id.
export interface StudentGroupMembershipTeacher {
  id: string;
  name: string;
}

export interface StudentGroupMembership {
  id: string;
  name: string;
  courseName: string | null;
  status: string;
  paymentStartDate: string | null;
  joinedAt: string | null;
  exitedAt: string | null;
  customPrice: number | null;
  trainingStart: string | null;
  trainingEnd: string | null;
  teachers: StudentGroupMembershipTeacher[];
}

export interface StudentGroupMembershipsResponse {
  success: boolean;
  data: StudentGroupMembership[];
}

// POST /students/{id}/status — Swagger: "Talaba profil holatini ACTIVE,
// INACTIVE, FROZEN, DEBTOR holatlariga o'tkazadi va sababini tarixga
// yozadi" (changes the student's account-wide status and records the
// reason to their history), application/json body. Distinct from
// toggleStudentStatus (PATCH .../toggle-status, a blind ACTIVE<->INACTIVE
// flip with no reason) — this is the endpoint to use whenever a reason
// needs to be attached (e.g. archiving from SingleGroup's remove dialog).
export type StudentStatusValue = "ACTIVE" | "INACTIVE" | "FROZEN" | "DEBTOR";

export interface UpdateStudentStatusRequest {
  id: string;
  status: StudentStatusValue;
  reason?: string;
  paymentEndDate?: string;
}

export interface UpdateStudentStatusResponse {
  success?: boolean;
  message?: string;
  data?: StudentDetail;
}

// GET /students/{id}/comments — "Admin va ustozlar tomonidan talaba haqida
// qoldirilgan ichki eslatmalar va izohlar" (internal notes/remarks left
// about the student). Read-only: Swagger documents no POST for this
// resource anywhere in the API, so there is currently no way for this app
// to create a new entry here (see AddNoteModal).
export interface StudentComment {
  id: string;
  text: string;
  author: string | null;
  createdAt: string;
}

// GET /students/{id}/history — "Talaba bo'yicha sodir bo'lgan barcha
// voqealar xronologiyasi (status o'zgarishi, guruhga qo'shilish va h.k)".
// Envelope/fields aren't documented beyond a bare 200, so normalized
// defensively the same way groupsApi's normalizeHistory is.
export interface StudentHistoryEntry {
  id: string;
  type: string;
  detail: string;
  createdAt: string;
  actor: string | null;
}

// GET /students/{id}/sms-history — "Bitta talabaga yuborilgan barcha SMS
// xabarlar tarixini olish". Envelope/fields aren't documented beyond a bare
// 200, so normalized defensively.
export interface StudentSmsEntry {
  id: string;
  text: string;
  status: string | null;
  createdAt: string;
}

export interface StudentSmsHistoryRequest {
  id: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
  branchId?: string;
}

// GET /students/{id}/payments — "Talabaning to'lovlar tarixi va moliyaviy
// balansi": the student's own payment registry plus their totals
// (totalPaid/totalCharged/balance/totalDebt). Distinct from GET
// /finance/payments (the whole branch's registry, previously the only way
// this app could list a single student's payments — by name-searching that
// list client-side, which risked mixing up same-named students).
export interface StudentPaymentsRequest {
  id: string;
  page?: number;
  limit?: number;
  groupId?: string;
  paymentMethodId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface StudentPaymentsSummary {
  totalPaid: number;
  totalCharged: number;
  balance: number;
  totalDebt: number;
}

export interface StudentPaymentsResult {
  rows: PaymentRow[];
  summary: StudentPaymentsSummary;
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// GET /students/{id}/finance-history — confirmed live against the real
// backend (2026-09), and a completely different shape than previously
// assumed here: each month carries its own `debts` (system-generated
// monthly group charges) and `payments` (real payments) arrays, not a
// single flat charged/paid/balance row. This is the real source for a
// combined "system vs payment" transaction ledger (AUTH_ROLE_DOCS-style
// reference design), not just a monthly summary.
export interface StudentFinanceHistoryDebtEntry {
  type: "DEBT";
  amount: number;
  groupId: string | null;
  groupName: string | null;
  branchId: string | null;
  branchName: string | null;
  description: string | null;
  date: string;
  author: string | null;
}

export interface StudentFinanceHistoryPaymentEntry {
  type: "PAYMENT";
  amount: number;
  date: string;
  method: string | null;
  branchId: string | null;
  branchName: string | null;
  author: string | null;
  receiptUrl: string | null;
  notes: string | null;
}

export interface StudentFinanceHistoryEntry {
  month: string;
  debts: StudentFinanceHistoryDebtEntry[];
  payments: StudentFinanceHistoryPaymentEntry[];
  totalDebt: number;
  totalPaid: number;
  monthBalance: number;
  runningBalance: number;
}

// A debt (system charge) and a payment, flattened into one chronological
// row shape for the combined transactions table — built client-side from
// StudentFinanceHistoryEntry.debts/payments (see normalizeFinanceTransactions
// in studentsApi.tsx). Payment rows carry a real `paymentId` (from GET
// /students/{id}/payments, matched by amount+date) so Print/Edit/Remove can
// target the real payment record; debt rows have no backing record to edit.
export interface StudentFinanceTransaction {
  key: string;
  type: "DEBT" | "PAYMENT";
  date: string;
  amount: number;
  groupName: string | null;
  methodOrDescription: string | null;
  notes: string | null;
  author: string | null;
  // Only set for a PAYMENT row matched against the real payments list —
  // that's the one place with a precise entry timestamp (finance-history's
  // own payment entries only carry a `date`, no time-of-entry), the actual
  // paymentMethodId (vs. just the method's display name), and the
  // studentId/studentName EditPaymentTarget needs to open the edit form.
  createdAt: string | null;
  paymentId: string | null;
  paymentMethodId: string | null;
  studentId: string | null;
  studentName: string | null;
}
