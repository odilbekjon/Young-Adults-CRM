// GET /sms/auto-settings — "Barcha Avto-SMS sozlamalarini olish (yoki yo'q
// bo'lsa yaratish)": har bir avto-SMS turi uchun standart qatorni qaytaradi
// (yo'q bo'lsa backend o'zi yaratadi). Har bir qatorning to'liq shakli
// Swagger'da faqat PATCH /sms/auto-settings/{type} body'si orqali ma'lum
// ({isActive, template}) — shu sabab list elementini path bilan bog'lovchi
// `type` maydoni ham qo'shilgan (studentsApi/teachersApi'dagi *Ref pattern
// bilan bir xil ehtiyotkorlik).
export interface AutoSmsSetting {
  id?: string;
  branchId?: string | null;
  type: string;
  isActive: boolean;
  template: string;
}

// GET /sms/auto-settings — confirmed live (2026-09-24) that a `branchId`
// query param is actually required, unlike most endpoints where the
// x-branch-id header alone is enough — omitting it 400s with "So'rov
// ma'lumotlari noto'g'ri" ("request data invalid") even though nothing else
// about the request is wrong. The literal string "all" is accepted (same
// convention as teachersApi's teachersSelect) when no specific branch is
// selected.
export interface AutoSmsSettingsRequest {
  branchId: string;
}

export interface AutoSmsSettingsResponse {
  success: boolean;
  message?: string;
  data: AutoSmsSetting[];
}

// PATCH /sms/auto-settings/{type} — Swagger'da tasdiqlangan JSON body.
export interface UpdateAutoSmsSettingRequest {
  type: string;
  isActive: boolean;
  template: string;
}

export interface UpdateAutoSmsSettingResponse {
  success: boolean;
  message?: string;
  data?: AutoSmsSetting;
}

export interface SmsTemplate {
  id: string;
  title: string;
  content: string;
}

export interface SmsTemplatesResponse {
  success: boolean;
  message?: string;
  data: SmsTemplate[];
}

export interface SmsTemplateResponse {
  success: boolean;
  message?: string;
  data: SmsTemplate;
}

// POST /sms/templates — Swagger'da tasdiqlangan JSON body: {title, content}.
export interface CreateSmsTemplateRequest {
  title: string;
  content: string;
}

// PATCH /sms/templates/{id} — bir xil {title, content} body.
export interface UpdateSmsTemplateRequest extends CreateSmsTemplateRequest {
  id: string;
}

export interface DeleteSmsTemplateResponse {
  success: boolean;
  message?: string;
}

// POST /sms/send/students — Swagger: application/json {studentIds (required),
// text?, templateId?}. Either `text` or `templateId` is presumably needed
// for the backend to have anything to send, but only studentIds is marked
// required, so that's the only field enforced client-side too.
export interface SendSmsToStudentsRequest {
  studentIds: string[];
  text?: string;
  templateId?: string;
}

export interface SendSmsToStudentsResponse {
  success?: boolean;
  message?: string;
}

// POST /sms/send/teachers — Swagger: application/json {teacherIds (required),
// text?, templateId?}; same shape as the students endpoint.
export interface SendSmsToTeachersRequest {
  teacherIds: string[];
  text?: string;
  templateId?: string;
}

export interface SendSmsToTeachersResponse {
  success?: boolean;
  message?: string;
}

// GET /sms/history — query: search, status, page, limit, branchId, role.
// Confirmed live: {success, message, data: {data: [...], total, ...}} where a
// row is {id, userId, phone, message, status ("FAILED" ...), providerError,
// createdAt, branchId, user: {id, name, role}}. The envelope's pagination
// fields aren't fully visible in Swagger, so they are read defensively.
export interface SmsHistoryRequest {
  search?: string;
  status?: string;
  role?: string;
  branchId?: string;
  page?: number;
  limit?: number;
}

export interface SmsHistoryRow {
  id: string;
  phone: string;
  message: string;
  status: string;
  providerError: string | null;
  createdAt: string;
  userName: string;
  userRole: string;
}

export interface SmsHistoryResult {
  rows: SmsHistoryRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// GET/PUT /sms/config — the Eskiz.uz provider credentials ("Eskiz SMS
// sozlamalari"): PUT body {email, password, alias}. GET's response shape is
// undocumented (it 400s while nothing is configured), so it is read
// defensively.
export interface SmsConfig {
  email: string;
  password: string;
  alias: string;
}
