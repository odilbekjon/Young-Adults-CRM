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

export interface Student {
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
export interface StudentDetail {
  id: string;
  name: string;
  phone: string;
  balance: number;
  status: string;
  groupsStart: string | null;
  branch: StudentBranchRef[];
  comment: string | null;
}

export interface studentsRequest {
  page?: number;
  limit?: number;
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
