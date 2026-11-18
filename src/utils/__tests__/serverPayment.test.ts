import { describe, expect, it } from "vitest";
import { readServerPayment } from "../serverPayment";

describe("readServerPayment", () => {
  it("is null for an object without any of the reminder keys (every role but SUPERADMIN/CEO)", () => {
    expect(readServerPayment({ id: "u1", name: "Teacher" })).toBeNull();
    expect(readServerPayment(null)).toBeNull();
    expect(readServerPayment(undefined)).toBeNull();
    expect(readServerPayment("x")).toBeNull();
  });

  it("reads the flat keys", () => {
    expect(readServerPayment({ isWarning: true, daysLeft: 3, nextPaymentDate: "2026-11-20" })).toEqual({
      isWarning: true, daysLeft: 3, nextPaymentDate: "2026-11-20",
    });
  });

  it("reads the grouped serverPaymentInfo object", () => {
    expect(
      readServerPayment({ serverPaymentInfo: { isWarning: false, daysLeft: 12, nextPaymentDate: "2026-11-20" } }),
    ).toEqual({ isWarning: false, daysLeft: 12, nextPaymentDate: "2026-11-20" });
  });

  it("reads the aliases", () => {
    expect(readServerPayment({ buOgohlantirishmi: true, daysUntilPayment: 1, paymentDate: "2026-11-20T00:00:00.000Z" })).toEqual({
      isWarning: true, daysLeft: 1, nextPaymentDate: "2026-11-20",
    });
  });

  it("treats a missing flag as no warning and a missing day count as unknown", () => {
    expect(readServerPayment({ nextPaymentDate: "2026-11-20" })).toEqual({
      isWarning: false, daysLeft: null, nextPaymentDate: "2026-11-20",
    });
  });
});
