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
  // Confirmed against Swagger's CreateCourseDto/UpdateCourseDto (POST/PATCH
  // /courses) — writable there, and read back here the same way every other
  // resource in this app mirrors its own write fields on read (course list/
  // detail response envelope isn't independently documented beyond a bare
  // 200, so these are optional/nullable like the rest of Course's undocumented
  // fields already are).
  code?: string | null;
  months?: number | null;
  lessonDuration?: number | null;
  lessonsPerMonth?: number | null;
  description?: string | null;
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
  code?: string;
  months?: number;
  lessonDuration?: number;
  lessonsPerMonth?: number;
  description?: string;
}

export interface UpdateCourseRequest {
  id: string;
  name?: string;
  price?: number;
  branchId?: string;
  code?: string;
  months?: number;
  lessonDuration?: number;
  lessonsPerMonth?: number;
  description?: string;
}

export interface DeleteCourseResponse {
  success: boolean;
  message: string;
}

export interface ToggleCourseStatusResponse {
  success: boolean;
  message: string;
  data?: Course;
}
