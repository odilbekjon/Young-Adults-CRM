export type GroupDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

// Backend stores course price as a range/tier structure on read (Decimal.js
// serialization), but accepts a plain number on write — same shape as
// coursesApi's CoursePrice.
export interface GroupCoursePrice {
  s: number;
  e: number;
  d: number[];
}

export interface GroupCourse {
  id: string;
  name: string;
  price: GroupCoursePrice;
  branchId: string;
  status: string;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupRoom {
  id: string;
  name: string;
  capacity: number;
  branchId: string;
  status: string;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupPersonRef {
  id: string;
  name: string;
  role: string;
  photo: string | null;
  phone: string;
}

export interface Group {
  id: string;
  name: string;
  status: string;
  courseId: string;
  roomId: string | null;
  days: GroupDay[];
  time: string | null;
  weekOfStudy: string | null;
  trainingStart: string | null;
  trainingEnd: string | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  course: GroupCourse;
  room: GroupRoom | null;
  daysType: "EVEN" | "ODD" | string;
  teachers: GroupPersonRef[];
  students: GroupPersonRef[];
}

export interface groupsRequest {
  page?: number;
  limit?: number;
}

export interface groupsResponse {
  success: boolean;
  data: Group[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface GroupResponse {
  success: boolean;
  message?: string;
  data: Group;
}

// GET /groups/{id} ro'yxatdagidan farqli, tekislangan shaklda qaytadi:
// course/room ichma-ich obyekt o'rniga courseName/coursePrice/roomName/roomCapacity
// to'g'ridan-to'g'ri Group darajasida keladi.
export interface GroupDetail {
  id: string;
  name: string;
  status?: string;
  courseId: string;
  courseName: string;
  coursePrice: GroupCoursePrice;
  daysType: "EVEN" | "ODD" | string;
  days?: GroupDay[];
  time: string | null;
  weekOfStudy?: string | null;
  roomId: string | null;
  roomName: string | null;
  roomCapacity: number | null;
  trainingStart: string | null;
  trainingEnd: string | null;
  teachers: GroupPersonRef[];
  students?: GroupPersonRef[];
  createdAt?: string;
  updatedAt?: string;
}

export interface GroupDetailResponse {
  success: boolean;
  message?: string;
  data: GroupDetail;
}

export interface CreateGroupRequest {
  name: string;
  courseId: string;
  roomId?: string;
  days?: GroupDay[];
  time?: string;
  weekOfStudy?: string;
  trainingStart?: string;
  trainingEnd?: string;
  teacherIds?: string[];
  studentIds?: string[];
}

export interface UpdateGroupRequest extends Partial<Omit<CreateGroupRequest, "name" | "courseId">> {
  id: string;
  name?: string;
  courseId?: string;
}

export interface DeleteGroupResponse {
  success: boolean;
  message?: string;
}

export interface AssignStudentsRequest {
  id: string;
  studentIds: string[];
}

export interface AssignStudentsResponse {
  success: boolean;
  message?: string;
}

export interface RemoveStudentFromGroupRequest {
  id: string;
  studentId: string;
}

export interface RemoveStudentFromGroupResponse {
  success: boolean;
  message?: string;
}

export interface TransferStudentRequest {
  id: string;
  studentId: string;
  newGroupId: string;
  reason?: string;
}

export interface TransferStudentResponse {
  success: boolean;
  message?: string;
}

// Backend's exact envelope for /groups/{id}/history isn't documented beyond
// a 200 status, so this is our normalized shape (see normalizeHistory in
// groupsApi.tsx) rather than a literal mirror of the raw response.
export interface GroupHistoryEntry {
  id: string;
  type: string;
  studentId: string | null;
  studentName: string | null;
  studentPhone: string | null;
  detail: string;
  createdAt: string;
  actor: string | null;
}

// Backend's exact envelope for /groups/{id}/comments isn't documented beyond
// a 200 status, so this is our normalized shape (see normalizeComments in
// groupsApi.tsx) rather than a literal mirror of the raw response.
export interface GroupComment {
  id: string;
  text: string;
  author: string | null;
  createdAt: string;
}

export interface AssignTeachersRequest {
  id: string;
  teacherIds: string[];
}

export interface AssignTeachersResponse {
  success: boolean;
  message?: string;
}

export interface RemoveTeacherFromGroupRequest {
  id: string;
  teacherId: string;
}

export interface RemoveTeacherFromGroupResponse {
  success: boolean;
  message?: string;
}

export interface UpdateGroupStatusRequest {
  id: string;
  status: string;
}

export interface UpdateGroupStatusResponse {
  success: boolean;
  message?: string;
  data?: Group;
}

export interface ToggleGroupStatusResponse {
  success: boolean;
  message?: string;
  data?: Group;
}
