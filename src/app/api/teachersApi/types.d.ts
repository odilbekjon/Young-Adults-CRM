export interface TeacherBranchRef {
  id: string;
  name: string;
}

export type TeacherGender = "MALE" | "FEMALE";

export type TeacherStatus = "ACTIVE" | "INACTIVE";

export interface Teacher {
  id: string;
  name: string;
  photo: string | null;
  email: string | null;
  phone: string | null;
  gender: TeacherGender | null;
  birthdate: string | null;
  specialization: string | null;
  experience: number | null;
  salary: number | null;
  status: TeacherStatus | string;
  branches: TeacherBranchRef[];
  createdAt?: string;
  updatedAt?: string;
}

export interface teachersRequest {
  page?: number;
  limit?: number;
  search?: string;
  status?: TeacherStatus;
  branchId?: string;
}

// GET /teachers/select — simplified dropdown list used when opening a new
// group and choosing its teacher(s), distinct from GET /teachers (which
// returns the full paginated Teacher shape for the management page).
// Swagger documents branchId as a required query param here (unlike the
// optional one on GET /teachers) — same "UUID or 'all'" convention.
export interface TeacherSelectOption {
  id: string;
  name: string;
}

export interface TeachersSelectRequest {
  branchId: string;
}

// Backend ba'zan ro'yxatni tekis massiv, ba'zan {data: [...], meta} ko'rinishida
// qaytarishi mumkin — groupsResponse/studentsResponse bilan bir xil shakl.
export interface teachersResponse {
  success: boolean;
  message: string;
  data: Teacher[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface teacherByIdResponse {
  success: boolean;
  message: string;
  data: Teacher;
}

// GET /teachers/{id}/for-edit — tahrirlash formasi uchun alohida endpoint;
// aniq javob strukturasi Swagger'da ochilmagan, shu sabab GET /teachers/{id}
// bilan bir xil Teacher shaklini kutamiz.
export interface teacherForEditResponse {
  success: boolean;
  message: string;
  data: Teacher;
}

export interface CreateTeacherRequest {
  name: string;
  photo?: File;
  gender?: TeacherGender;
  birthdate?: string;
  email?: string;
  phone?: string;
  password?: string;
  specialization?: string;
  experience?: number;
  salary?: number;
  branchIds?: string[];
}

export interface UpdateTeacherRequest extends Partial<Omit<CreateTeacherRequest, "name">> {
  id: string;
  name?: string;
}

export interface TeacherResponse {
  success: boolean;
  message: string;
  data: Teacher;
}

export interface DeleteTeacherResponse {
  success: boolean;
  message: string;
}

export interface ToggleTeacherStatusResponse {
  success: boolean;
  message?: string;
  data?: Teacher;
}

// Backend's exact envelope for GET /teachers/{id}/history isn't documented
// beyond a 200 status, so this is our normalized shape (see normalizeHistory
// in teachersApi.tsx) rather than a literal mirror of the raw response.
export interface TeacherHistoryEntry {
  id: string;
  type: string;
  detail: string;
  createdAt: string;
  actor: string | null;
}
