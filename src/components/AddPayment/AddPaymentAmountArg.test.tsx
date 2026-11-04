import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse, stubFetch, type SentRequest } from "../../test/fetchStub";
import { renderWithStore } from "../../test/renderWithStore";
import { baseApi } from "../../app/api/baseApi";
import { store } from "../../app/store";
import { ToastProvider } from "../../Context/ToastContext";
import { AddPayment } from "./AddPayment";

// The wire format of a payment is multipart (every field a string), so what the
// form hands to the mutation is checked here: the amount must be a real number.
const { createPayment, updatePayment } = vi.hoisted(() => ({ createPayment: vi.fn(), updatePayment: vi.fn() }));

vi.mock("../../app/api/financeApi/financeApi", async (importActual) => {
  const actual = await importActual<typeof import("../../app/api/financeApi/financeApi")>();
  return {
    ...actual,
    useCreatePaymentMutation: () => [createPayment, { isLoading: false }],
    useUpdatePaymentMutation: () => [updatePayment, { isLoading: false }],
  };
});

const answer = (request: SentRequest) => {
  if (request.url.includes("/finance/payment-methods")) return jsonResponse({ success: true, data: [{ id: "m1", name: "Naqd pul" }] });
  if (request.url.includes("/students/s1/groups")) return jsonResponse({ success: true, data: [] });
  if (request.url.includes("/finance/payments/p9")) return jsonResponse({ success: false }, { status: 404 });
  return jsonResponse({ success: true, data: [] });
};

const amountField = () => screen.getByPlaceholderText("0") as HTMLInputElement;
const typeAmount = (value: string) => fireEvent.change(amountField(), { target: { value } });
// The button stays disabled while the student's groups load.
const submit = async () => {
  const button = screen.getByRole("button", { name: /^(Submit|Save)$/ }) as HTMLButtonElement;
  await waitFor(() => expect(button.disabled).toBe(false));
  fireEvent.click(button);
};

beforeEach(() => {
  store.dispatch(baseApi.util.resetApiState());
  createPayment.mockReturnValue({ unwrap: () => Promise.resolve({ data: { id: "p9" } }) });
  updatePayment.mockReturnValue({ unwrap: () => Promise.resolve({ data: { id: "p1" } }) });
  stubFetch(answer);
});

describe("AddPayment: the amount handed to the API", () => {
  it("create gets amount 300000 as a number", async () => {
    renderWithStore(
      <ToastProvider>
        <AddPayment open onClose={vi.fn()} lockedStudent={{ id: "s1", name: "Test Student" }} branchId="b1" />
      </ToastProvider>,
    );
    fireEvent.click(await screen.findByText("Naqd pul"));
    typeAmount("300000");
    expect(amountField().value).toBe("300 000");

    await submit();

    await waitFor(() => expect(createPayment).toHaveBeenCalledTimes(1));
    expect(createPayment.mock.calls[0][0].amount).toBe(300000);
    expect(updatePayment).not.toHaveBeenCalled();
  });

  it("update gets the edited amount as a number", async () => {
    renderWithStore(
      <ToastProvider>
        <AddPayment
          open
          onClose={vi.fn()}
          branchId="b1"
          editPayment={{
            id: "p1", amount: 1250000, paymentMethodId: "m1", date: "2026-04-15", notes: null, studentId: "s1", studentName: "Test Student",
          }}
        />
      </ToastProvider>,
    );
    expect(amountField().value).toBe("1 250 000");

    typeAmount("1 750 000");
    await submit();

    await waitFor(() => expect(updatePayment).toHaveBeenCalledTimes(1));
    expect(updatePayment.mock.calls[0][0]).toMatchObject({ id: "p1" });
    expect(updatePayment.mock.calls[0][0].amount).toBe(1750000);
    expect(createPayment).not.toHaveBeenCalled();
  });

  it("an untouched prefilled amount goes out as the stored number", async () => {
    renderWithStore(
      <ToastProvider>
        <AddPayment
          open
          onClose={vi.fn()}
          branchId="b1"
          editPayment={{
            id: "p1", amount: 1250000, paymentMethodId: "m1", date: null, notes: null, studentId: "s1", studentName: "Test Student",
          }}
        />
      </ToastProvider>,
    );

    await submit();

    await waitFor(() => expect(updatePayment).toHaveBeenCalledTimes(1));
    expect(updatePayment.mock.calls[0][0].amount).toBe(1250000);
  });
});
