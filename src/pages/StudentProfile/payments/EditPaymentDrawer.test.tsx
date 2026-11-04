import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse, readFormData, stubFetch, type SentRequest } from "../../../test/fetchStub";
import { renderWithStore } from "../../../test/renderWithStore";
import { baseApi } from "../../../app/api/baseApi";
import { store } from "../../../app/store";
import { ToastProvider } from "../../../Context/ToastContext";
import type { PaymentTx } from "./buildTransactions";
import { EditPaymentDrawer } from "./EditPaymentDrawer";

// A payment made on 15 April 2026 that the ledger lists under April.
const payment = (overrides: Partial<PaymentTx> = {}): PaymentTx => ({
  key: "payment-0-0", kind: "payment", date: "2026-04-15T05:00:00+05:00", amount: 170000, groupId: "g1", groupName: "Deep Science",
  comment: "Naqd pul", notes: "First Payment", creator: null, createdAt: null, paymentId: "p1", paymentMethodId: "m1", status: "COMPLETED",
  month: "2026-04", ...overrides,
});

const answer = (request: SentRequest) =>
  request.url.includes("/finance/payment-methods")
    ? jsonResponse({ success: true, data: [{ id: "m1", name: "Naqd pul" }] })
    : jsonResponse({ success: true, data: {} });

const amountField = () => screen.getByPlaceholderText("0") as HTMLInputElement;

const patches = (requests: SentRequest[]) => requests.filter((r) => r.method === "PATCH" && /\/finance\/payments\/p1$/.test(r.url));

const renderDrawer = (tx: PaymentTx = payment()) => {
  const onClose = vi.fn();
  renderWithStore(
    <ToastProvider>
      <EditPaymentDrawer open onClose={onClose} tx={tx} groups={[]} />
    </ToastProvider>,
  );
  return { onClose };
};

beforeEach(() => {
  store.dispatch(baseApi.util.resetApiState());
});

describe("EditPaymentDrawer", () => {
  it("keeps the month the payment counts for: forMonth goes out as that month's first day", async () => {
    const { requests } = stubFetch(answer);
    const { onClose } = renderDrawer();

    fireEvent.change(screen.getByDisplayValue("First Payment"), { target: { value: "corrected note" } });
    fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const [sent] = patches(requests);
    expect(await readFormData(sent)).toEqual([["notes", "corrected note"], ["forMonth", "2026-04-01"]]);
  });

  it("sends only what changed, plus the unchanged month (never the date unless it was edited)", async () => {
    const { requests } = stubFetch(answer);
    const { onClose } = renderDrawer();

    fireEvent.change(amountField(), { target: { value: "200000" } });
    fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const fields = await readFormData(patches(requests)[0]);
    expect(fields).toEqual([["amount", "200000"], ["forMonth", "2026-04-01"]]);
  });

  it("does not send anything when nothing was changed", () => {
    const { requests } = stubFetch(answer);
    renderDrawer();

    fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));

    expect(screen.getByText("Nothing was changed")).toBeTruthy();
    expect(patches(requests)).toHaveLength(0);
  });

  describe("the amount field", () => {
    it("is a numeric-keypad text field and prefills the stored amount grouped", () => {
      stubFetch(answer);
      renderDrawer();

      expect(amountField().type).toBe("text");
      expect(amountField().getAttribute("inputmode")).toBe("numeric");
      expect(amountField().value).toBe("170 000");
    });

    it("prefills millions grouped", () => {
      stubFetch(answer);
      renderDrawer(payment({ amount: 1250000 }));

      expect(amountField().value).toBe("1 250 000");
    });

    it("shows the typed digits grouped and sends them as plain digits", async () => {
      const { requests } = stubFetch(answer);
      const { onClose } = renderDrawer();

      fireEvent.change(amountField(), { target: { value: "300000" } });
      expect(amountField().value).toBe("300 000");
      fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));

      await waitFor(() => expect(onClose).toHaveBeenCalled());
      const fields = await readFormData(patches(requests)[0]);
      expect(fields.find(([name]) => name === "amount")).toEqual(["amount", "300000"]);
    });

    it("takes a grouped / pasted-style value as the same number", async () => {
      const { requests } = stubFetch(answer);
      const { onClose } = renderDrawer();

      fireEvent.change(amountField(), { target: { value: "1 250 000" } });
      expect(amountField().value).toBe("1 250 000");
      fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));

      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect((await readFormData(patches(requests)[0])).find(([name]) => name === "amount")).toEqual(["amount", "1250000"]);
    });

    it("ignores letters, minus and e", () => {
      stubFetch(answer);
      renderDrawer();

      fireEvent.change(amountField(), { target: { value: "-2e5x" } });

      expect(amountField().value).toBe("25");
    });

    it.each([["cleared", ""], ["zero", "0"]])("shows the amount error and sends nothing when the amount is %s", (_label, value) => {
      const { requests } = stubFetch(answer);
      renderDrawer();

      fireEvent.change(amountField(), { target: { value } });
      fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));

      expect(screen.getByText("Enter a valid amount")).toBeTruthy();
      expect(patches(requests)).toHaveLength(0);
    });

    it("Enter in the amount field still saves", async () => {
      const { requests } = stubFetch(answer);
      const { onClose } = renderDrawer();

      fireEvent.change(amountField(), { target: { value: "200000" } });
      fireEvent.keyDown(amountField(), { key: "Enter" });

      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect((await readFormData(patches(requests)[0])).find(([name]) => name === "amount")).toEqual(["amount", "200000"]);
    });

    it("a stored fraction that was not touched is not re-sent rounded", async () => {
      const { requests } = stubFetch(answer);
      const { onClose } = renderDrawer(payment({ amount: 1500.5, notes: "old" }));
      expect(amountField().value).toBe("1 501");

      fireEvent.change(screen.getByDisplayValue("old"), { target: { value: "new" } });
      fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));

      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect((await readFormData(patches(requests)[0])).map(([name]) => name)).not.toContain("amount");
    });
  });
});
