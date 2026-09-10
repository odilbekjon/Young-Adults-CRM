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

// ── /student-groups — each row is one student's membership in one group.
// Its own `id` is distinct from both studentId and groupId, and is what
// freeze/unfreeze/graduate-trial/update/status/delete below all key off —
// confirmed against Swagger, which documents this as a full CRUD resource
// (GET list, GET/{id}, GET/{id}/for-edit, POST, POST/{id}/freeze,
// POST/{id}/unfreeze, POST/{id}/graduate-trial, PATCH/{id},
// PATCH/{id}/status, DELETE/{id}). GET envelopes aren't documented beyond a
// 200 status, so responses are normalized defensively (same approach as
// GroupHistoryEntry/GroupComment above).
export type StudentGroupStatus = "PROBATION" | "ACTIVE" | "FROZEN" | "INACTIVE" | "DELETED";

export interface StudentGroupRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  groupId: string;
  groupName: string;
  status: StudentGroupStatus | string;
  joinedAt: string | null;
  exitedAt: string | null;
  paymentStartDate: string | null;
  customPrice: number | null;
  discountReason: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  // GET /student-groups' Responses section isn't expanded in Swagger (same
  // situation as the rest of this file), so these are modeled defensively —
  // same approach archivesApi/types.d.ts takes for ArchiveRecord. reason/
  // reasonId mirror the field names UpdateStudentGroupStatusRequest already
  // sends when a membership is moved to INACTIVE/DELETED, which is the
  // strongest evidence available for what the read side calls them; verify
  // against a real response and adjust once the schema is confirmed.
  reason: string | null;
  reasonId: string | null;
  comment: string | null;
  processedBy: string | null;
}

export interface StudentGroupsRequest {
  branchId?: string;
  groupId?: string;
  studentId?: string;
  status?: StudentGroupStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface StudentGroupsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StudentGroupsResult {
  rows: StudentGroupRecord[];
  meta: StudentGroupsMeta;
}

// POST /student-groups — adds a student as a brand-new member of a group
// (initial status PROBATION or ACTIVE). Swagger declares the body as
// multipart/form-data; only studentId/groupId are required, the rest are
// optional per-student overrides.
export interface AddStudentToGroupRequest {
  studentId: string;
  groupId: string;
  status?: string;
  joinedAt?: string;
  paymentStartDate?: string;
  customPrice?: number;
  discountReason?: string;
}

export interface AddStudentToGroupResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}

// POST /student-groups/{id}/freeze — {id} is the membership's own id
// (StudentGroupRecord.id), NOT the student id. Swagger: multipart/form-data,
// startDate required.
export interface FreezeStudentGroupRequest {
  id: string;
  startDate: string;
  endDate?: string;
  reason?: string;
}

export interface StudentGroupActionResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}

// PATCH /student-groups/{id} — edits the membership's own fields (dates,
// custom price), distinct from PATCH /student-groups/{id}/status below.
export interface UpdateStudentGroupRequest {
  id: string;
  joinedAt?: string;
  paymentStartDate?: string;
  exitedAt?: string;
  customPrice?: number;
  discountReason?: string;
}

// PATCH /student-groups/{id}/status — Swagger: status is required;
// studentDelete's own description reads "Talabani o'chirish (INACTIVE
// qilish)" — it's a separate flag from `status`, not an alias for it.
export interface UpdateStudentGroupStatusRequest {
  id: string;
  status: StudentGroupStatus;
  reason?: string;
  reasonId?: string;
  isAllGroup?: boolean;
  studentDelete?: boolean;
}

// GET /groups/select — simplified dropdown list, distinct from GET /groups
// (which returns the full Group shape with course/room/teachers/students).
export interface GroupSelectOption {
  id: string;
  name: string;
}

// GET /groups/excel query params (Swagger reference: search, status, page,
// limit, branchId, courseId, teacherId, daysType, startDate, endDate).
// branchId isn't included here — it's already sent on every request via the
// centralized x-branch-id header (see baseApi), so it isn't duplicated here.
export interface GroupsExcelQueryArgs {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
  courseId?: string;
  teacherId?: string;
  daysType?: string;
  startDate?: string;
  endDate?: string;
}
