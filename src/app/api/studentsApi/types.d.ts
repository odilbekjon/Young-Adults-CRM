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
export interface studentsRequest {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
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
