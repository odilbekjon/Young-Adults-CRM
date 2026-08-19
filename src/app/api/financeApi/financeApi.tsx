import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import { CreatePaymentRequest, PaymentResponse } from "./types";

const appendPaymentFormData = (formData: FormData, data: Partial<CreatePaymentRequest>) => {
    const { receiptUrl, ...rest } = data;
    (Object.keys(rest) as (keyof typeof rest)[]).forEach((key) => {
        const value = rest[key];
        if (value !== undefined && value !== null) formData.append(key, String(value));
    });
    if (receiptUrl) formData.append("receiptUrl", receiptUrl);
};

export const financeApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        createPayment: builder.mutation<PaymentResponse, CreatePaymentRequest>({
            query: (data) => {
                const formData = new FormData();
                appendPaymentFormData(formData, data);
                return {
                    url: PATHS.PAYMENTS,
                    method: "POST",
                    body: formData,
                };
            },
            invalidatesTags: ["payment", "student", "group"],
        }),
    })
})

export const {
    useCreatePaymentMutation,
} = financeApi;
