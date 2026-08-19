export type PaymentProvider = "MANUAL" | "PAYME" | "CLICK" | "UZUM" | "STRIPE" | "PAYPAL";

// POST /finance/payments — Swagger'da tasdiqlangan yagona endpoint (multipart/form-data).
// GET/PUT/DELETE hozircha backend contract'ida tasdiqlanmagan, shu sabab bu yerda yo'q.
export interface CreatePaymentRequest {
  amount: number;
  paymentMethodId: string;
  studentId: string;
  branchId: string;
  groupId?: string;
  date?: string;
  notes?: string;
  receiptUrl?: File;
  provider?: PaymentProvider;
  transactionId?: string;
  metadata?: string;
}

// Backend javob shakli GET orqali tasdiqlanmagani uchun so'rov maydonlariga
// asoslangan taxminiy shakl — studentsApi/groupsApi'dagi *Response patterniga mos.
export interface Payment {
  id: string;
  amount: number;
  paymentMethodId: string;
  studentId: string;
  branchId: string;
  groupId: string | null;
  date: string | null;
  notes: string | null;
  receiptUrl: string | null;
  provider: PaymentProvider | null;
  transactionId: string | null;
  createdAt?: string;
}

export interface PaymentResponse {
  success: boolean;
  message?: string;
  data: Payment;
}
