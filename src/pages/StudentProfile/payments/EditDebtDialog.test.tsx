import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse, stubFetch, type SentRequest } from "../../../test/fetchStub";
import { renderWithStore } from "../../../test/renderWithStore";
import { baseApi } from "../../../app/api/baseApi";
import { store } from "../../../app/store";
import { ToastProvider } from "../../../Context/ToastContext";
import type { PaymentTx } from "./buildTransactions";
import { EditDebtDialog } from "./EditDebtDialog";

const charge = (overrides: Partial<PaymentTx> = {}): PaymentTx => ({
  key: "system-0-0", kind: "system", date: "2026-09-01T00:00:00+05:00", amount: 300000, groupId: "g1", groupName: "Deep Science",
  comment: null, notes: null, creator: null, createdAt: null, paymentId: null, paymentMethodId: null, status: null, month: "2026-09",
  ...overrides,
});

const debtRequests = (requests: SentRequest[]) => requests.filter((r) => r.method === "PATCH" && r.url.includes("/finance/debt/"));

const renderDialog = (props: { tx?: PaymentTx; mode?: "edit" | "remove" } = {}) => {
  const onClose = vi.fn();
  renderWithStore(
    <ToastProvider>
      <EditDebtDialog open onClose={onClose} tx={props.tx ?? charge()} studentId="s1" mode={props.mode} />
    </ToastProvider>,
  );
  return { onClose };
};

const fill = (amount: string | null, reason: string) => {
  if (amount !== null) fireEvent.change(screen.getByRole("spinbutton"), { target: { value: amount } });
  fireEvent.change(screen.getByRole("textbox"), { target: { value: reason } });
};
const save = (name: RegExp) => fireEvent.click(screen.getByRole("button", { name }));

beforeEach(() => {
  store.dispatch(baseApi.util.resetApiState());
});

describe("EditDebtDialog", () => {
  it("names the month of the edited charge, so the change cannot land on another month", async () => {
    const { requests } = stubFetch(() => jsonResponse({ success: true }));
    const { onClose } = renderDialog();

    fill("250000", "discount");
    save(/^Save$/);

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const [sent] = debtRequests(requests);
    expect(sent.url).toMatch(/\/finance\/debt\/s1\/g1$/);
    expect(JSON.parse(sent.body)).toEqual({ amount: 250000, reason: "discount", month: "2026-09" });
  });

  it("takes the month from the charge's date when the row carries no ledger month", async () => {
    const { requests } = stubFetch(() => jsonResponse({ success: true }));
    renderDialog({ tx: charge({ month: null, date: "2026-03-01T00:00:00+05:00" }) });

    fill("1", "fix");
    save(/^Save$/);

    await waitFor(() => expect(debtRequests(requests)).toHaveLength(1));
    expect(JSON.parse(debtRequests(requests)[0].body).month).toBe("2026-03");
  });

  it("removing a charge sets that month's amount to 0 (and says which month)", async () => {
    const { requests } = stubFetch(() => jsonResponse({ success: true }));
    const { onClose } = renderDialog({ mode: "remove", tx: charge({ month: "2026-10" }) });

    fill(null, "entered by mistake");
    save(/^Remove$/);

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(JSON.parse(debtRequests(requests)[0].body)).toEqual({ amount: 0, reason: "entered by mistake", month: "2026-10" });
  });

  it("retries once with the first day of the month when the server rejects the month's format", async () => {
    const { requests } = stubFetch((request) =>
      JSON.parse(request.body).month === "2026-09"
        ? jsonResponse({ success: false, error: ["month must be a valid ISO 8601 date string"], statusCode: 400 }, { status: 400 })
        : jsonResponse({ success: true }),
    );
    const { onClose } = renderDialog();

    fill("250000", "discount");
    save(/^Save$/);

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(debtRequests(requests).map((r) => JSON.parse(r.body).month)).toEqual(["2026-09", "2026-09-01"]);
  });

  it("does not retry (and shows the server's reason) for any other failure", async () => {
    const { requests } = stubFetch(() => jsonResponse({ success: false, error: "reason is too short", statusCode: 400 }, { status: 400 }));
    const { onClose } = renderDialog();

    fill("250000", "x");
    save(/^Save$/);

    await waitFor(() => expect(screen.getAllByText(/reason is too short/).length).toBeGreaterThan(0));
    expect(debtRequests(requests)).toHaveLength(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("asks for a reason before sending anything", () => {
    const { requests } = stubFetch(() => jsonResponse({ success: true }));
    renderDialog();

    fill("250000", "   ");
    save(/^Save$/);

    expect(screen.getByText("Enter the reason for the change")).toBeTruthy();
    expect(debtRequests(requests)).toHaveLength(0);
  });
});
