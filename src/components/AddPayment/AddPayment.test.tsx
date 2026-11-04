import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse, readFormData, stubFetch, type SentRequest } from "../../test/fetchStub";
import { renderWithStore } from "../../test/renderWithStore";
import { baseApi } from "../../app/api/baseApi";
import { store } from "../../app/store";
import { ToastProvider } from "../../Context/ToastContext";
import { AddPayment, type EditPaymentTarget } from "./AddPayment";

const answer = (request: SentRequest) => {
  const { url, method } = request;
  if (url.includes("/finance/payment-methods")) return jsonResponse({ success: true, data: [{ id: "m1", name: "Naqd pul" }] });
  if (url.includes("/branches")) return jsonResponse({ success: true, data: [] });
  if (url.includes("/students/s1/groups")) {
    return jsonResponse({ success: true, data: [{ id: "g1", name: "Deep Science", status: "ACTIVE" }] });
  }
  if (method === "POST" && /\/finance\/payments$/.test(url)) return jsonResponse({ success: true, data: { id: "p9" } });
  // The receipt shown after a create is not what these tests are about.
  if (url.includes("/finance/payments/p9")) return jsonResponse({ success: false }, { status: 404 });
  if (method === "PATCH" && /\/finance\/payments\/p1$/.test(url)) return jsonResponse({ success: true, data: { id: "p1" } });
  return jsonResponse({ success: true, data: {} });
};

const writes = (requests: SentRequest[]) => requests.filter((r) => r.method === "POST" || r.method === "PATCH")
  .filter((r) => /\/finance\/payments(\/p1)?$/.test(r.url));

const editTarget = (overrides: Partial<EditPaymentTarget> = {}): EditPaymentTarget => ({
  id: "p1", amount: 1250000, paymentMethodId: "m1", date: "2026-04-15", notes: "First payment",
  studentId: "s1", studentName: "Test Student", groupId: "g1", ...overrides,
});

const renderDrawer = (props: Partial<Parameters<typeof AddPayment>[0]> = {}) => {
  const onClose = vi.fn();
  renderWithStore(
    <ToastProvider>
      <AddPayment
        open
        onClose={onClose}
        lockedStudent={{ id: "s1", name: "Test Student" }}
        branchId="b1"
        {...props}
      />
    </ToastProvider>,
  );
  return { onClose };
};

const amountField = () => screen.getByPlaceholderText("0") as HTMLInputElement;
const typeAmount = (value: string) => fireEvent.change(amountField(), { target: { value } });
const pickMethod = async () => fireEvent.click(await screen.findByText("Naqd pul"));
const submit = () => fireEvent.click(screen.getByRole("button", { name: /^(Submit|Save)$/ }));

beforeEach(() => {
  store.dispatch(baseApi.util.resetApiState());
});

describe("AddPayment: the amount field", () => {
  it("is a numeric-keypad text field (not type=number) with the 0 placeholder", () => {
    stubFetch(answer);
    renderDrawer();

    expect(amountField().type).toBe("text");
    expect(amountField().getAttribute("inputmode")).toBe("numeric");
    expect(amountField().value).toBe("");
  });

  it("shows the typed digits grouped by thousands", () => {
    stubFetch(answer);
    renderDrawer();

    typeAmount("300000");
    expect(amountField().value).toBe("300 000");

    typeAmount("1250000");
    expect(amountField().value).toBe("1 250 000");
  });

  it("ignores letters, minus and e, and drops leading zeros", () => {
    stubFetch(answer);
    renderDrawer();

    typeAmount("-1e5abc");
    expect(amountField().value).toBe("15");

    typeAmount("007");
    expect(amountField().value).toBe("7");
  });

  it("clearing the field empties it", () => {
    stubFetch(answer);
    renderDrawer();
    typeAmount("300000");

    typeAmount("");

    expect(amountField().value).toBe("");
  });

  it("creating a payment sends the amount as plain digits - no spaces ever reach the backend", async () => {
    const { requests } = stubFetch(answer);
    renderDrawer();
    await pickMethod();
    typeAmount("300000");
    expect(amountField().value).toBe("300 000");

    submit();

    await waitFor(() => expect(writes(requests)).toHaveLength(1));
    const [sent] = writes(requests);
    expect(sent.method).toBe("POST");
    const fields = await readFormData(sent);
    expect(fields.find(([name]) => name === "amount")).toEqual(["amount", "300000"]);
    expect(fields.find(([name]) => name === "paymentMethodId")).toEqual(["paymentMethodId", "m1"]);
    expect(fields.find(([name]) => name === "studentId")).toEqual(["studentId", "s1"]);
    expect(fields.some(([, value]) => /[\s\u00a0\u202f]/.test(value))).toBe(false);
  });

  it("Enter in the amount field still submits the payment", async () => {
    const { requests } = stubFetch(answer);
    renderDrawer();
    await pickMethod();
    typeAmount("300000");

    fireEvent.keyDown(amountField(), { key: "Enter" });

    await waitFor(() => expect(writes(requests)).toHaveLength(1));
    expect((await readFormData(writes(requests)[0])).find(([name]) => name === "amount")).toEqual(["amount", "300000"]);
  });

  it.each([["empty", ""], ["zero", "0"], ["only zeros", "000"], ["only junk", "abc"]])(
    "shows the amount error and sends nothing for %s",
    async (_label, value) => {
      const { requests } = stubFetch(answer);
      renderDrawer();
      await pickMethod();
      if (value) typeAmount(value);

      submit();

      expect(await screen.findByText("Enter a valid amount")).toBeTruthy();
      expect(writes(requests)).toHaveLength(0);
    },
  );

  it("the amount error goes away once a valid amount is submitted", async () => {
    const { requests } = stubFetch(answer);
    renderDrawer();
    await pickMethod();
    submit();
    expect(await screen.findByText("Enter a valid amount")).toBeTruthy();

    typeAmount("5000");
    submit();

    await waitFor(() => expect(writes(requests)).toHaveLength(1));
    await waitFor(() => expect(screen.queryByText("Enter a valid amount")).toBeNull());
  });
});

describe("AddPayment: editing a payment", () => {
  it("prefills the stored amount grouped", () => {
    stubFetch(answer);
    renderDrawer({ editPayment: editTarget({ amount: 1250000 }), lockedStudent: undefined });

    expect(amountField().value).toBe("1 250 000");
  });

  it("updating sends the edited amount as plain digits", async () => {
    const { requests } = stubFetch(answer);
    renderDrawer({ editPayment: editTarget({ amount: 1250000 }), lockedStudent: undefined });
    expect(amountField().value).toBe("1 250 000");

    typeAmount("1 300 000");
    expect(amountField().value).toBe("1 300 000");
    submit();

    await waitFor(() => expect(writes(requests)).toHaveLength(1));
    const [sent] = writes(requests);
    expect(sent.method).toBe("PATCH");
    expect((await readFormData(sent)).find(([name]) => name === "amount")).toEqual(["amount", "1300000"]);
  });

  it("saving without touching the amount sends the stored amount unchanged", async () => {
    const { requests } = stubFetch(answer);
    renderDrawer({ editPayment: editTarget({ amount: 1250000 }), lockedStudent: undefined });

    submit();

    await waitFor(() => expect(writes(requests)).toHaveLength(1));
    expect((await readFormData(writes(requests)[0])).find(([name]) => name === "amount")).toEqual(["amount", "1250000"]);
  });

  it("clearing the prefilled amount shows the amount error", async () => {
    const { requests } = stubFetch(answer);
    renderDrawer({ editPayment: editTarget(), lockedStudent: undefined });

    typeAmount("");
    submit();

    expect(await screen.findByText("Enter a valid amount")).toBeTruthy();
    expect(writes(requests)).toHaveLength(0);
  });
});
