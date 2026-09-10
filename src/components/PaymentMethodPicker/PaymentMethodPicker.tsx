import { useState } from "react";
import { useSelector } from "react-redux";
import { FiPlus, FiX, FiEdit2, FiTrash2 } from "react-icons/fi";
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from "@mui/material";
import {
  usePaymentMethodsQuery,
  useCreatePaymentMethodMutation,
  useUpdatePaymentMethodMutation,
  useDeletePaymentMethodMutation,
} from "../../app/api/financeApi";
import { useAllBranchesQuery } from "../../app/api/branchesApi/branchesApi";
import type { PaymentMethod } from "../../app/api/financeApi/types";
import type { RootState } from "../../app/store";

interface PaymentMethodPickerProps {
  value: string;
  onChange: (id: string, method?: PaymentMethod) => void;
  loadingLabel?: string;
  errorLabel?: string;
  addLabel?: string;
}

const inputCls =
  "w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400 bg-white text-gray-800";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

// Real payment methods (GET /finance/payment-methods) rendered as the same
// two-column radio grid used across the app wherever a payment method is
// picked — no hardcoded method list. Includes a quick "+ Add" flow backed by
// POST /finance/payment-methods so a missing method can be created in place.
export const PaymentMethodPicker = ({ value, onChange, loadingLabel, errorLabel, addLabel }: PaymentMethodPickerProps) => {
  const { data, isFetching, isError } = usePaymentMethodsQuery();
  const methods = data ?? [];

  const { data: branchesData } = useAllBranchesQuery();
  const branches = (branchesData?.data ?? []).filter((b) => b.status === "ACTIVE");
  const [createPaymentMethod, { isLoading: isCreating }] = useCreatePaymentMethodMutation();
  const [updatePaymentMethod, { isLoading: isUpdating }] = useUpdatePaymentMethodMutation();
  const [deletePaymentMethod, { isLoading: isDeleting }] = useDeletePaymentMethodMutation();
  const headerBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethod | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isSaving = isCreating || isUpdating;

  // Default to whichever branch is active in the header — still editable.
  const openAddMethod = () => {
    setEditingId(null);
    setName(""); setCode(""); setIsDefault(false);
    setBranchId(headerBranchId ?? "");
    setOpen(true);
  };

  const openEditMethod = (e: React.MouseEvent, m: PaymentMethod) => {
    e.stopPropagation();
    setEditingId(m.id);
    setName(m.name);
    setCode("");
    setIsDefault(false);
    setBranchId("");
    setError(null);
    setOpen(true);
  };

  const close = () => {
    setOpen(false); setEditingId(null);
    setName(""); setCode(""); setIsDefault(false); setBranchId(""); setError(null);
  };

  // Only `name` is required per Swagger for both create and update — code
  // and branchId are optional (an empty branchId makes the method global).
  const handleCreate = async () => {
    setError(null);
    if (!name.trim()) { setError("Enter a name"); return; }
    try {
      if (editingId) {
        const updated = await updatePaymentMethod({
          id: editingId,
          name: name.trim(),
          code: code.trim() || undefined,
          isDefault,
        }).unwrap();
        onChange(updated.id, updated);
      } else {
        const created = await createPaymentMethod({
          name: name.trim(), code: code.trim() || undefined, isDefault, branchId: branchId || undefined,
        }).unwrap();
        onChange(created.id, created);
      }
      close();
    } catch {
      setError(editingId ? "Failed to update the payment method" : "Failed to save the payment method");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deletePaymentMethod(deleteTarget.id).unwrap();
      setDeleteTarget(null);
    } catch {
      setDeleteError("Failed to delete the payment method");
    }
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
        {methods.map((m) => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", flex: 1, minWidth: 0 }}>
              <div
                onClick={() => onChange(m.id, m)}
                style={{
                  width: 18, height: 18, borderRadius: "50%",
                  border: `2px solid ${value === m.id ? "#185FA5" : "#ccc"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", flexShrink: 0,
                  background: value === m.id ? "#185FA5" : "#fff",
                }}
              >
                {value === m.id && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />}
              </div>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
            </label>
            <button
              type="button"
              onClick={(e) => openEditMethod(e, m)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 2, flexShrink: 0 }}
            >
              <FiEdit2 size={12} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setDeleteError(null); setDeleteTarget(m); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 2, flexShrink: 0 }}
            >
              <FiTrash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {isFetching && (
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>{loadingLabel ?? "Loading..."}</div>
      )}
      {isError && (
        <div style={{ fontSize: 12, color: "#d93f4f", marginTop: 6 }}>{errorLabel ?? "Failed to load payment methods"}</div>
      )}

      <button
        type="button"
        onClick={openAddMethod}
        style={{
          marginTop: 10, display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 12, fontWeight: 500, color: "#185FA5", background: "none",
          border: "none", padding: 0, cursor: "pointer",
        }}
      >
        <FiPlus size={13} /> {addLabel ?? "Add payment method"}
      </button>

      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1400, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={close}
        >
          <div
            style={{ background: "#fff", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", width: 320, padding: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>
                {editingId ? "Edit payment method" : (addLabel ?? "Add payment method")}
              </span>
              <button type="button" onClick={close} style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}>
                <FiX size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className={labelCls}>Name</label>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Humo" />
              </div>
              <div>
                <label className={labelCls}>Code</label>
                <input className={inputCls} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="HUMO" />
              </div>
              {/* branchId isn't part of the update payload per Swagger — it's
                  create-only (an empty value makes the method global). */}
              {!editingId && (
                <div>
                  <label className={labelCls}>Branch</label>
                  <select className={inputCls} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                    <option value="">Select</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", cursor: "pointer" }}>
                <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
                Set as default
              </label>

              {error && <div style={{ fontSize: 12, color: "#d93f4f" }}>{error}</div>}

              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={close}
                  style={{ flex: 1, border: "1px solid #e0e0e0", borderRadius: 6, padding: "8px 0", fontSize: 13, color: "#666", background: "#fff", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isSaving}
                  style={{ flex: 1, border: "none", borderRadius: 6, padding: "8px 0", fontSize: 13, fontWeight: 600, color: "#fff", background: "#185FA5", cursor: isSaving ? "default" : "pointer", opacity: isSaving ? 0.7 : 1 }}
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} PaperProps={{ sx: { borderRadius: "14px", width: 360 } }}>
        <DialogTitle sx={{ fontWeight: 600, fontSize: 16 }}>Delete payment method</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: 13 }}>
            Delete "{deleteTarget?.name}"? This cannot be undone.
          </DialogContentText>
          {deleteError && <div style={{ fontSize: 12, color: "#d93f4f", marginTop: 8 }}>{deleteError}</div>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={isDeleting} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button onClick={confirmDelete} disabled={isDeleting} color="error" variant="contained" sx={{ textTransform: "none" }}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
