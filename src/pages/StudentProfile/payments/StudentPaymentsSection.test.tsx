import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { jsonResponse, stubFetch, type SentRequest } from "../../../test/fetchStub";
import { renderWithStore } from "../../../test/renderWithStore";
import { baseApi } from "../../../app/api/baseApi";
import { store } from "../../../app/store";
import { ToastProvider } from "../../../Context/ToastContext";
import { StudentPaymentsSection } from "./StudentPaymentsSection";

const month = (label: string, date: string) => ({
  month: label,
  debts: [{
    type: "DEBT", amount: 300000, groupId: "g1", groupName: "Deep Science", branchId: null, branchName: null,
    description: `Oylik guruh qarzi (${label})`, date, author: "Tizim (Avtomatik)",
  }],
  payments: [], totalDebt: 300000, totalPaid: 0, monthBalance: -300000, runningBalance: -300000,
});

const answer = (request: SentRequest) => {
  if (request.url.includes("/finance-history")) {
    return jsonResponse({ success: true, data: [month("2026-09", "2026-09-01T00:00:00+05:00"), month("2026-10", "2026-10-01T00:00:00+05:00")] });
  }
  if (request.url.includes("/students/s1/payments")) {
    return jsonResponse({ success: true, data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 1 } });
  }
  return jsonResponse({ success: true, data: [] });
};

const debtPatches = (requests: SentRequest[]) => requests.filter((r) => r.method === "PATCH" && r.url.includes("/finance/debt/"));

beforeEach(() => {
  store.dispatch(baseApi.util.resetApiState());
});

// The whole path: finance-history -> the table's rows -> a row's menu -> the dialog -> PATCH.
describe("StudentPaymentsSection: editing a system charge", () => {
  const openEditFor = async (rowIndex: number) => {
    const menus = await screen.findAllByRole("button", { name: "More actions" });
    expect(menus).toHaveLength(2);
    fireEvent.click(menus[rowIndex]);
    fireEvent.click(await screen.findByRole("menuitem", { name: /edit/i }));
  };

  const saveWith = async (amount: string) => {
    await screen.findByText("Edit amount");
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: amount } });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "agreed discount" } });
    fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));
  };

  it("edits the month of the row that was clicked, not another month", async () => {
    const { requests } = stubFetch(answer);
    renderWithStore(<ToastProvider><StudentPaymentsSection studentId="s1" studentName="Test Student" balance={-600000} /></ToastProvider>);

    // Newest first: row 0 = October, row 1 = September.
    await openEditFor(0);
    await saveWith("250000");
    await waitFor(() => expect(debtPatches(requests)).toHaveLength(1));
    expect(JSON.parse(debtPatches(requests)[0].body)).toEqual({ amount: 250000, reason: "agreed discount", month: "2026-10" });
  });

  it("an older row sends its own month", async () => {
    const { requests } = stubFetch(answer);
    renderWithStore(<ToastProvider><StudentPaymentsSection studentId="s1" studentName="Test Student" balance={-600000} /></ToastProvider>);

    await openEditFor(1);
    await saveWith("200000");
    await waitFor(() => expect(debtPatches(requests)).toHaveLength(1));
    expect(JSON.parse(debtPatches(requests)[0].body).month).toBe("2026-09");
    expect(debtPatches(requests)[0].url).toMatch(/\/finance\/debt\/s1\/g1$/);
  });
});

// Removing / refunding a real payment: DELETE /finance/payments/{id}.
describe("StudentPaymentsSection: removing a payment", () => {
  const withPayment = (ledgerDate: string, recordDate: string) => (request: SentRequest) => {
    if (request.method === "DELETE") return jsonResponse({ success: true });
    if (request.url.includes("/finance-history")) {
      return jsonResponse({
        success: true,
        data: [{
          month: "2026-04", debts: [], totalDebt: 0, totalPaid: 170000, monthBalance: 170000, runningBalance: 170000,
          payments: [{ type: "PAYMENT", amount: 170000, date: ledgerDate, method: "Naqd pul", branchId: null, branchName: null, author: null, receiptUrl: null, notes: null }],
        }],
      });
    }
    if (request.url.includes("/students/s1/payments")) {
      return jsonResponse({
        success: true,
        data: [{ id: "p1", amount: 170000, date: recordDate, status: "COMPLETED", paymentMethod: { id: "m1", name: "Naqd pul" }, group: { id: "g1", name: "Deep Science" } }],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      });
    }
    return jsonResponse({ success: true, data: [] });
  };

  const removeIt = async () => {
    fireEvent.click(await screen.findByRole("button", { name: "More actions" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: /remove/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^Remove$/ }));
  };

  const deletes = (requests: SentRequest[]) => requests.filter((r) => r.method === "DELETE");
  const listLoads = (requests: SentRequest[]) => requests.filter((r) => r.method === "GET" && r.url.includes("/students/s1/payments")).length;

  it("sends DELETE for the payment and reloads the student's payments and balance", async () => {
    const { requests } = stubFetch(withPayment("2026-04-15T05:00:00+05:00", "2026-04-15T00:00:00.000Z"));
    renderWithStore(<ToastProvider><StudentPaymentsSection studentId="s1" studentName="Test Student" balance={0} /></ToastProvider>);

    await removeIt();

    await waitFor(() => expect(deletes(requests)).toHaveLength(1));
    expect(deletes(requests)[0].url).toMatch(/\/finance\/payments\/p1$/);
    expect(deletes(requests)[0].body).toBe("");
    await waitFor(() => expect(listLoads(requests)).toBeGreaterThan(1));
  });

  it("still offers Remove when the ledger and the payment record write the time with different offsets", async () => {
    const { requests } = stubFetch(withPayment("2026-04-16T02:30:00+05:00", "2026-04-15T21:30:00.000Z"));
    renderWithStore(<ToastProvider><StudentPaymentsSection studentId="s1" studentName="Test Student" balance={0} /></ToastProvider>);

    await removeIt();

    await waitFor(() => expect(deletes(requests)).toHaveLength(1));
  });

  it("shows the server's reason and keeps the dialog open when the delete is refused", async () => {
    const refuse = withPayment("2026-04-15T05:00:00+05:00", "2026-04-15T00:00:00.000Z");
    const { requests } = stubFetch((request) =>
      request.method === "DELETE" ? jsonResponse({ success: false, error: "Payment is already refunded", statusCode: 409 }, { status: 409 }) : refuse(request),
    );
    renderWithStore(<ToastProvider><StudentPaymentsSection studentId="s1" studentName="Test Student" balance={0} /></ToastProvider>);

    await removeIt();

    await waitFor(() => expect(screen.getAllByText(/Payment is already refunded/).length).toBeGreaterThan(0));
    expect(deletes(requests)).toHaveLength(1);
    expect(screen.getByText("Remove payment")).toBeTruthy();
  });
});
