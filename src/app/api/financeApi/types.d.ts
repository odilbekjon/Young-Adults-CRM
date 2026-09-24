export type PaymentProvider = "MANUAL" | "PAYME" | "CLICK" | "UZUM" | "STRIPE" | "PAYPAL";

// PATCH /finance/payments/{id} — confirmed live against the real backend
// (2026-09): a fake id returns {"error":["To'lov topilmadi"]} (404, a real
// "not found" business error, not a route-missing 404), proving this route
// exists even though it wasn't visible in the Swagger screenshots this app
// was otherwise built from. multipart/form-data, same fields as create,
// all optional (partial update).
export interface UpdatePaymentRequest extends Partial<CreatePaymentRequest> {
  id: string;
}

// POST /finance/payments — Swagger'da tasdiqlangan yagona endpoint (multipart/form-data).
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

// GET /finance/chart — response shape fully confirmed via Swagger "Try it
// out" (see FinanceChartResponse below), no defensive guessing needed.
export interface FinanceChartQueryArgs {
  year: number;
  branchId?: string;
}

export interface FinanceChartMonth {
  month: string;
  monthNumber: number;
  totalPayments: number;
  totalExpenses: number;
  totalSalaries: number;
  totalWithdrawals: number;
  netProfit: number;
}

export interface FinanceChartResponse {
  success: boolean;
  data: FinanceChartMonth[];
}

// GET /finance/debtors
export interface DebtorsQueryArgs {
  page?: number;
  limit?: number;
  branchId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  categoryId?: string;
  paymentMethodId?: string;
}

// Backend's exact row envelope for /finance/debtors isn't documented beyond
// the endpoint description ("dynamically computes each student's balance
// across their groups' course prices and entered payments, returns those
// with a debt, sorted largest debt first"); normalizeDebtorRow in
// financeApi.tsx maps plausible field-name variants (flat or nested under
// student/group) into this shape rather than a literal mirror of the raw
// response.
export interface DebtorRow {
  id: string;
  studentId: string | null;
  name: string;
  phone: string;
  groupId: string | null;
  groupName: string;
  balance: number;
  status: string | null;
}

export interface DebtorsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DebtorsResult {
  rows: DebtorRow[];
  meta: DebtorsMeta;
}

// GET /finance/payment-methods
export interface PaymentMethod {
  id: string;
  name: string;
  status?: string;
}

export interface PaymentMethodsResponse {
  success: boolean;
  message?: string;
  data: PaymentMethod[];
}

// POST /finance/payment-methods (multipart/form-data) — only `name` is
// required per Swagger; branchId left empty makes the method global.
export interface CreatePaymentMethodRequest {
  name: string;
  code?: string;
  isDefault?: boolean;
  branchId?: string;
}

export interface CreatePaymentMethodResponse {
  success: boolean;
  message?: string;
  data: PaymentMethod;
}

// PATCH /finance/payment-methods/{id} (multipart/form-data) — all fields
// optional per Swagger; only the ones provided are updated.
export interface UpdatePaymentMethodRequest {
  id: string;
  name?: string;
  code?: string;
  status?: "ACTIVE" | "INACTIVE";
  isDefault?: boolean;
}

// Generic soft-delete response shared by every Finance DELETE endpoint
// (payment-methods, expense-categories, expenses, withdrawals) — none of
// them document a response body beyond a 200/success envelope.
export interface FinanceDeleteResponse {
  success: boolean;
  message?: string;
}

// GET /finance/expense-categories
export interface ExpenseCategory {
  id: string;
  name: string;
  status?: string;
}

export interface ExpenseCategoriesResponse {
  success: boolean;
  message?: string;
  data: ExpenseCategory[];
}

// POST /finance/expense-categories (multipart/form-data) — only `name` is
// required per Swagger; branchId left empty makes the category shared
// across every branch.
export interface CreateExpenseCategoryRequest {
  name: string;
  branchId?: string;
}

export interface CreateExpenseCategoryResponse {
  success: boolean;
  message?: string;
  data: ExpenseCategory;
}

// PATCH /finance/expense-categories/{id} (multipart/form-data) — both
// fields optional per Swagger; only the ones provided are updated.
export interface UpdateExpenseCategoryRequest {
  id: string;
  name?: string;
  status?: "ACTIVE" | "INACTIVE";
}

// POST /finance/expenses (multipart/form-data)
export interface CreateExpenseRequest {
  title: string;
  amount: number;
  categoryId: string;
  paymentMethodId: string;
  branchId: string;
  date?: string;
  notes?: string;
  receiptUrl?: File;
}

export interface CreateExpenseResponse {
  success: boolean;
  message?: string;
  data: unknown;
}

// Shared query args + meta for the paginated finance list endpoints
// (expenses, payments registry, withdrawals) — same shape as DebtorsQueryArgs.
export interface FinanceListQueryArgs {
  page?: number;
  limit?: number;
  branchId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  categoryId?: string;
  paymentMethodId?: string;
}

export interface FinanceListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// GET /finance/expenses — row shape isn't confirmed beyond the endpoint
// description, so it's read from a few plausible field-name variants
// (same defensive approach as DebtorRow).
export interface ExpenseRow {
  id: string;
  amount: number;
  categoryId: string | null;
  categoryName: string;
  paymentMethodId: string | null;
  paymentMethodName: string;
  branchId: string | null;
  date: string | null;
  description: string;
  createdBy: string | null;
  createdAt?: string;
}

export interface ExpensesResult {
  rows: ExpenseRow[];
  meta: FinanceListMeta;
}

// GET /finance/payments — the full payments registry (list), distinct from
// the single POST /finance/payments mutation above.
export interface PaymentRow {
  id: string;
  amount: number;
  studentId: string | null;
  studentName: string;
  studentPhone: string;
  groupId: string | null;
  groupName: string;
  paymentMethodId: string | null;
  paymentMethodName: string;
  branchId: string | null;
  date: string | null;
  notes: string;
  createdBy: string | null;
  createdAt?: string;
  // Not documented in Swagger beyond DELETE /finance/payments/{id}'s own
  // description ("marks the payment REFUNDED"), which confirms payments do
  // carry a status field — read defensively; null on a backend that doesn't
  // return it, in which case the row is treated as a normal completed
  // payment (the overwhelmingly common case) rather than assuming a value.
  status: string | null;
}

export interface PaymentsListResult {
  rows: PaymentRow[];
  meta: FinanceListMeta;
}

// GET /finance/payments/{id} — description confirms this includes receipt
// info ("chek ma'lumotlarini qaytaradi") beyond the list registry row, but
// the exact field name isn't shown in Swagger beyond that description, so
// `checkNumber`/`branchName` are read defensively (see normalizePaymentDetail).
// teacherName/coursePrice/balance are the same kind of defensive read — the
// Invoice settings preview (Settings > General > Invoice) already has
// unused i18n labels for Balance/Group/Course price/Teacher, confirming the
// receipt is meant to carry them; they're null when the backend doesn't
// return them rather than guessed.
export interface PaymentDetail extends PaymentRow {
  receiptUrl: string | null;
  checkNumber: string | null;
  branchName: string | null;
  teacherName: string | null;
  coursePrice: number | null;
  balance: number | null;
}

// GET /finance/stats
export interface FinanceStats {
  totalIncomeThisMonth: number;
  totalExpensesThisMonth: number;
  totalSalariesThisMonth: number;
  netProfitThisMonth: number;
}

// POST /finance/withdrawals — cashbox withdrawal / dividend payout
export interface CreateWithdrawalRequest {
  recipientName: string;
  amount: number;
  paymentMethodId: string;
  branchId: string;
  date?: string;
  reason?: string;
}

export interface CreateWithdrawalResponse {
  success: boolean;
  message?: string;
  data: unknown;
}

// GET /finance/withdrawals
export interface WithdrawalRow {
  id: string;
  amount: number;
  branchId: string | null;
  date: string | null;
  comment: string;
  createdBy: string | null;
  createdAt?: string;
}

export interface WithdrawalsResult {
  rows: WithdrawalRow[];
  meta: FinanceListMeta;
}

// GET /finance/debtors/total and GET /finance/expenses/total — both take the
// same filter set as their respective list endpoints (see DebtorsQueryArgs /
// FinanceListQueryArgs) and return a single aggregate sum. Backend's exact
// envelope isn't documented beyond a 200, so the field is read defensively
// (same approach as FinanceStats).
export interface FinanceTotalResult {
  total: number;
}

// GET /finance/debtors/{studentId}/receipt — "student's full current debt
// and payment balance, for printing". Row shape isn't documented beyond the
// description, so it's read defensively from plausible field-name variants,
// same approach as DebtorRow/PaymentDetail.
export interface DebtorReceipt {
  studentId: string | null;
  name: string;
  phone: string;
  groupName: string;
  balance: number;
  branchName: string | null;
  createdAt?: string;
}
