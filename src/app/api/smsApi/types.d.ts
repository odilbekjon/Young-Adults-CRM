// GET /sms/auto-settings — "Barcha Avto-SMS sozlamalarini olish (yoki yo'q
// bo'lsa yaratish)": har bir avto-SMS turi uchun standart qatorni qaytaradi
// (yo'q bo'lsa backend o'zi yaratadi). Har bir qatorning to'liq shakli
// Swagger'da faqat PATCH /sms/auto-settings/{type} body'si orqali ma'lum
// ({isActive, template}) — shu sabab list elementini path bilan bog'lovchi
// `type` maydoni ham qo'shilgan (studentsApi/teachersApi'dagi *Ref pattern
// bilan bir xil ehtiyotkorlik).
export interface AutoSmsSetting {
  type: string;
  isActive: boolean;
  template: string;
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
