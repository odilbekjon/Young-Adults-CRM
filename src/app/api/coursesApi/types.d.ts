export interface CourseBranch {
  id: string;
  name: string;
  address: string;
  status: string;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

// Backend stores price as a range/tier structure on read, but accepts a
// plain number on write (see Create/UpdateCourseRequest below).
export interface CoursePrice {
  s: number;
  e: number;
  d: number[];
}

export interface Course {
  id: string;
  name: string;
  price: CoursePrice;
  branchId: string;
  status: string;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  branch: CourseBranch;
}

export interface CoursesResponse {
  success: boolean;
  message: string;
  data: Course[];
}

export interface CourseResponse {
  success: boolean;
  message: string;
  data: Course;
}

export interface CreateCourseRequest {
  name: string;
  price?: number;
  branchId: string;
}

export interface UpdateCourseRequest {
  id: string;
  name?: string;
  price?: number;
  branchId?: string;
}

export interface DeleteCourseResponse {
  success: boolean;
  message: string;
}
