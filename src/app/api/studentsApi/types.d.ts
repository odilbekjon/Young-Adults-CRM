export interface StudentGroupRef {
  id: string;
  name: string;
}

export interface StudentTeacherRef {
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

export interface studentsRequest {
  page?: number;
  limit?: number;
}

export interface studentsResponse {
  success: boolean;
  message: string;
  data: {
    data: Student[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface studentByIdResponse {
  success: boolean;
  message: string;
  data: Student;
}
