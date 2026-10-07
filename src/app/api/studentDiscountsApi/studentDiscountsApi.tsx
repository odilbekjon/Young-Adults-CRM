import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import type {
  CreateStudentDiscountRequest,
  StudentDiscountRecord,
  StudentDiscountMutationResponse,
  StudentDiscountsRequest,
  UpdateStudentDiscountRequest,
} from "./types";

type Row = Record<string, unknown>;

const asRecord = (value: unknown): Row =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : {};

const asString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === "string" && value) return value;
    if (typeof value === "number") return String(value);
    if (value && typeof value === "object") {
      const nested = asRecord(value);
      const name = nested.name ?? nested.fullName ?? nested.id;
      if (typeof name === "string" && name) return name;
    }
  }
  return "";
};

const asId = (value: unknown): string => {
  if (value && typeof value === "object") {
    const id = asRecord(value).id ?? asRecord(value)._id;
    return typeof id === "string" || typeof id === "number" ? String(id) : "";
  }
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
};

const asValue = (raw: unknown): number => {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const value = Number(raw);
    if (Number.isFinite(value)) return value;
  }
  if (raw && typeof raw === "object") {
    const decimal = asRecord(raw);
    if (Array.isArray(decimal.d) && decimal.d.length > 0) {
      const digits = decimal.d.map(Number).join("");
      const exponent = Number(decimal.e);
      const sign = Number(decimal.s) < 0 ? -1 : 1;
      const value = sign * Number(`${digits}e${exponent - digits.length + 1}`);
      if (Number.isFinite(value)) return value;
    }
  }
  throw new Error("Unexpected student discount value");
};

const normalizeRecord = (raw: unknown): StudentDiscountRecord => {
  const row = asRecord(raw);
  const student = asRecord(row.student);
  const id = asString(row.id, row._id);
  const studentId = asId(row.studentId) || asId(student.id);
  const type = String(row.type ?? "").toUpperCase();
  const status = String(row.status ?? "").toUpperCase();
  if (!id || !studentId || (type !== "PERCENTAGE" && type !== "FIXED") || !status) {
    throw new Error("Unexpected student discount record shape");
  }
  return {
    id,
    studentId,
    studentName: asString(row.studentName, student.name, student.fullName),
    studentPhone: asString(row.studentPhone, student.phone),
    groupId: asId(row.groupId) || asId(row.group) || null,
    studentGroupId: asId(row.studentGroupId) || null,
    type,
    value: asValue(row.value),
    startDate: asString(row.startDate).slice(0, 10),
    endDate: asString(row.endDate).slice(0, 10),
    reason: asString(row.reason),
    status,
  };
};

const normalizeList = (raw: unknown): StudentDiscountRecord[] => {
  if (Array.isArray(raw)) return raw.map(normalizeRecord);
  const row = asRecord(raw);
  for (const key of ["data", "studentDiscounts", "discounts", "rows", "items"]) {
    if (Array.isArray(row[key])) return (row[key] as unknown[]).map(normalizeRecord);
  }
  const nested = asRecord(row.data);
  for (const key of ["studentDiscounts", "discounts", "rows", "items"]) {
    if (Array.isArray(nested[key])) return (nested[key] as unknown[]).map(normalizeRecord);
  }
  throw new Error("Unexpected student discounts response shape");
};

const normalizeOne = (raw: unknown): StudentDiscountRecord => {
  let row = asRecord(raw);
  while (row.data && !Array.isArray(row.data) && typeof row.data === "object") {
    row = asRecord(row.data);
  }
  return normalizeRecord(row);
};

const appendFormData = (data: Record<string, string | number | undefined>): FormData => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== "") formData.append(key, String(value));
  });
  return formData;
};

const buildQuery = (args: StudentDiscountsRequest = {}): string => {
  const params = new URLSearchParams();
  if (args.studentId) params.set("studentId", args.studentId);
  if (args.groupId) params.set("groupId", args.groupId);
  if (args.status) params.set("status", args.status);
  if (args.search) params.set("search", args.search);
  params.set("page", String(args.page ?? 1));
  params.set("limit", String(args.limit ?? 10));
  return params.toString();
};

export const studentDiscountsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    studentDiscounts: builder.query<StudentDiscountRecord[], StudentDiscountsRequest | void>({
      query: (args) => {
        const query = buildQuery(args ?? {});
        return {
          url: query ? `${PATHS.STUDENT_DISCOUNTS}?${query}` : PATHS.STUDENT_DISCOUNTS,
          method: "GET",
        };
      },
      transformResponse: normalizeList,
      providesTags: ["studentDiscount"],
    }),
    studentDiscountById: builder.query<StudentDiscountRecord, string>({
      query: (id) => `${PATHS.STUDENT_DISCOUNTS}/${encodeURIComponent(id)}`,
      transformResponse: normalizeOne,
      providesTags: ["studentDiscount"],
    }),
    studentDiscountForEdit: builder.query<StudentDiscountRecord, string>({
      query: (id) => `${PATHS.STUDENT_DISCOUNTS}/${encodeURIComponent(id)}/for-edit`,
      transformResponse: normalizeOne,
      providesTags: ["studentDiscount"],
    }),
    studentDiscountsByGroup: builder.query<StudentDiscountRecord[], string>({
      query: (groupId) => `${PATHS.STUDENT_DISCOUNTS}/group/${encodeURIComponent(groupId)}`,
      transformResponse: normalizeList,
      providesTags: ["studentDiscount"],
    }),
    studentDiscountsByStudent: builder.query<StudentDiscountRecord[], string>({
      query: (studentId) => `${PATHS.STUDENT_DISCOUNTS}/student/${encodeURIComponent(studentId)}`,
      transformResponse: normalizeList,
      providesTags: ["studentDiscount"],
    }),
    createStudentDiscount: builder.mutation<StudentDiscountMutationResponse, CreateStudentDiscountRequest>({
      query: ({ studentId, groupId, studentGroupId, type, value, startDate, endDate, reason }) => ({
        url: PATHS.STUDENT_DISCOUNTS,
        method: "POST",
        body: appendFormData({ studentId, groupId, studentGroupId, type, value, startDate, endDate, reason }),
      }),
      invalidatesTags: ["studentDiscount"],
    }),
    updateStudentDiscount: builder.mutation<StudentDiscountMutationResponse, UpdateStudentDiscountRequest>({
      query: ({ id, ...data }) => ({
        url: `${PATHS.STUDENT_DISCOUNTS}/${encodeURIComponent(id)}`,
        method: "PATCH",
        body: appendFormData(data),
      }),
      invalidatesTags: ["studentDiscount"],
    }),
    toggleStudentDiscount: builder.mutation<StudentDiscountMutationResponse, string>({
      query: (id) => ({
        url: `${PATHS.STUDENT_DISCOUNTS}/${encodeURIComponent(id)}/toggle`,
        method: "PATCH",
      }),
      invalidatesTags: ["studentDiscount"],
    }),
    deleteStudentDiscount: builder.mutation<StudentDiscountMutationResponse, string>({
      query: (id) => ({
        url: `${PATHS.STUDENT_DISCOUNTS}/${encodeURIComponent(id)}`,
        method: "DELETE",
      }),
      invalidatesTags: ["studentDiscount"],
    }),
  }),
});

export const {
  useStudentDiscountsQuery,
  useStudentDiscountByIdQuery,
  useStudentDiscountForEditQuery,
  useStudentDiscountsByGroupQuery,
  useStudentDiscountsByStudentQuery,
  useCreateStudentDiscountMutation,
  useUpdateStudentDiscountMutation,
  useToggleStudentDiscountMutation,
  useDeleteStudentDiscountMutation,
  useLazyStudentDiscountForEditQuery,
} = studentDiscountsApi;
