import type { PaymentProvider } from "../app/api/financeApi/types";

// Payment methods are free-text records from the backend (GET
// /finance/payment-methods), while `provider` on a payment is a fixed enum
// the backend also accepts. There's no id linking the two, so the provider
// is inferred from the method's name — known gateway names map to their
// enum, everything else (Cash, Card, Bank account, Humo, ...) is a manual
// payment.
const NAME_TO_PROVIDER: Record<string, PaymentProvider> = {
  payme: "PAYME",
  click: "CLICK",
  uzum: "UZUM",
  stripe: "STRIPE",
  paypal: "PAYPAL",
};

export const getProviderFromMethodName = (name: string): PaymentProvider =>
  NAME_TO_PROVIDER[name.trim().toLowerCase()] ?? "MANUAL";
