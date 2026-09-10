import { useState } from "react";
import {
  Drawer,
  TextField,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import {
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiMapPin,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";
import { useTranslation } from "react-i18next";
import {
  useAllBranchesQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useDeleteBranchMutation,
} from "../../../../../app/api/branchesApi/branchesApi";
import type { Branch } from "../../../../../app/api/branchesApi/types";
import { useToast } from "../../../../../Context/ToastContext";
import { extractApiError } from "../../../../../utils";

export const Branches = () => {
  const { t } = useTranslation();
  const toast = useToast();

  const { data, isLoading, isError, refetch, isFetching } = useAllBranchesQuery();
  const [createBranch, { isLoading: isCreating }] = useCreateBranchMutation();
  const [updateBranch, { isLoading: isUpdating }] = useUpdateBranchMutation();
  const [deleteBranch, { isLoading: isDeleting }] = useDeleteBranchMutation();

  const branches = data?.data ?? [];

  const [tab, setTab] = useState<"faol" | "arxiv">("faol");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingId(null);
    setName("");
    setAddress("");
    setErrors({});
    setSaveError(null);
    setModalOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditingId(branch.id);
    setName(branch.name);
    setAddress(branch.address);
    setErrors({});
    setSaveError(null);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const openDeleteConfirm = (branch: Branch) => {
    setDeleteError(null);
    setDeleteTarget(branch);
  };

  const closeDeleteConfirm = () => {
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBranch(deleteTarget.id).unwrap();
      setDeleteTarget(null);
      toast.success(t("settings.ceo.branches.toast.deleted"));
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.ceo.branches.deleteConfirm.error");
      const message = detail ? `${generic}: ${detail}` : generic;
      setDeleteError(message);
      toast.error(message);
    }
  };

  const validate = () => {
    const newErrors: { [k: string]: string } = {};
    if (!name.trim()) newErrors.name = t("settings.ceo.branches.form.errors.name");
    if (!address.trim()) newErrors.address = t("settings.ceo.branches.form.errors.address");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaveError(null);

    try {
      if (editingId) {
        await updateBranch({ id: editingId, name, address }).unwrap();
        toast.success(t("settings.ceo.branches.toast.updated"));
      } else {
        await createBranch({ name, address }).unwrap();
        toast.success(t("settings.ceo.branches.toast.created"));
      }
      setModalOpen(false);
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.ceo.branches.form.errors.save");
      const message = detail ? `${generic}: ${detail}` : generic;
      setSaveError(message);
      toast.error(message);
    }
  };

  const visibleBranches = branches.filter((b) =>
    tab === "faol" ? b.status === "ACTIVE" : b.status !== "ACTIVE"
  );

  const isSaving = isCreating || isUpdating;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm m-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-gray-900">{t("settings.ceo.branches.title")}</h1>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            aria-label={t("settings.ceo.branches.refresh")}
            disabled={isFetching}
          >
            <FiRefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>

        <Button
          onClick={openCreateModal}
          startIcon={<FiPlus size={18} />}
          sx={{
            textTransform: "none",
            backgroundColor: "#FBBF24",
            color: "#1F2937",
            borderRadius: "10px",
            paddingX: "18px",
            paddingY: "10px",
            fontWeight: 600,
            boxShadow: "none",
            "&:hover": { backgroundColor: "#F5B301", boxShadow: "none" },
          }}
          variant="contained"
        >
          {t("settings.ceo.branches.addBranch")}
        </Button>
      </div>

      {/* Tabs */}
      <div className="mt-5 inline-flex rounded-xl bg-amber-50 p-1">
        <button
          type="button"
          onClick={() => setTab("faol")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "faol"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {t("settings.ceo.branches.tabs.active")}
        </button>
        <button
          type="button"
          onClick={() => setTab("arxiv")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "arxiv"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {t("settings.ceo.branches.tabs.archived")}
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="mt-8 flex justify-center py-10">
          <CircularProgress size={28} />
        </div>
      )}

      {/* Error state */}
      {!isLoading && isError && (
        <div className="mt-8 py-10 text-center text-sm text-red-500">
          {t("settings.ceo.branches.loadError")}
        </div>
      )}

      {/* Cards */}
      {!isLoading && !isError && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleBranches.map((branch) => (
            <div
              key={branch.id}
              className="rounded-xl border border-amber-100 bg-amber-50/60 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">
                  {branch.name}
                </span>
                <div className="flex items-center gap-3 text-gray-400">
                  <button
                    type="button"
                    onClick={() => openDeleteConfirm(branch)}
                    className="hover:text-red-500 transition-colors"
                    aria-label={t("settings.ceo.branches.delete")}
                  >
                    <FiTrash2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(branch)}
                    className="hover:text-gray-700 transition-colors"
                    aria-label={t("settings.ceo.branches.edit")}
                  >
                    <FiEdit2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-3 rounded-lg bg-white p-3">
                <div className="flex items-center gap-2 text-sm">
                  <FiMapPin size={14} className="text-gray-400" />
                  <span className="text-amber-600">{branch.address}</span>
                </div>
              </div>
            </div>
          ))}

          {visibleBranches.length === 0 && (
            <div className="col-span-full py-10 text-center text-sm text-gray-400">
              {tab === "faol" ? t("settings.ceo.branches.emptyActive") : t("settings.ceo.branches.emptyArchived")}
            </div>
          )}
        </div>
      )}

      {/* O'ng tomondan chiqadigan panel */}
      <Drawer
        anchor="right"
        open={modalOpen}
        onClose={closeModal}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 420 },
            padding: "24px",
            borderTopLeftRadius: "16px",
            borderBottomLeftRadius: "16px",
          },
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingId ? t("settings.ceo.branches.form.editTitle") : t("settings.ceo.branches.addBranch")}
          </h2>
          <button
            type="button"
            onClick={closeModal}
            className="text-gray-400 hover:text-gray-600"
            aria-label={t("settings.ceo.branches.close")}
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-800">
              {t("settings.ceo.branches.form.name")} <span className="text-red-500">*</span>
            </label>
            <TextField
              fullWidth
              size="small"
              placeholder={t("settings.ceo.branches.form.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "10px",
                  "&.Mui-focused fieldset": { borderColor: "#F5B301" },
                },
              }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-800">
              {t("settings.ceo.branches.form.address")} <span className="text-red-500">*</span>
            </label>
            <TextField
              fullWidth
              size="small"
              placeholder={t("settings.ceo.branches.form.addressPlaceholder")}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              error={!!errors.address}
              helperText={errors.address}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "10px",
                  "&.Mui-focused fieldset": { borderColor: "#F5B301" },
                },
              }}
            />
          </div>

          {saveError && (
            <div className="text-sm text-red-500">{saveError}</div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5">
          <Button
            onClick={closeModal}
            variant="outlined"
            disabled={isSaving}
            sx={{
              textTransform: "none",
              borderRadius: "10px",
              borderColor: "#E5E7EB",
              color: "#374151",
              paddingX: "18px",
              "&:hover": { borderColor: "#D1D5DB", backgroundColor: "#F9FAFB" },
            }}
          >
            {t("settings.ceo.branches.form.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={isSaving}
            startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{
              textTransform: "none",
              backgroundColor: "#FBBF24",
              color: "#1F2937",
              borderRadius: "10px",
              paddingX: "18px",
              fontWeight: 600,
              boxShadow: "none",
              "&:hover": { backgroundColor: "#F5B301", boxShadow: "none" },
            }}
          >
            {t("settings.ceo.branches.form.save")}
          </Button>
        </div>
      </Drawer>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onClose={closeDeleteConfirm}
        PaperProps={{ sx: { borderRadius: "14px", width: 380 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {t("settings.ceo.branches.deleteConfirm.title")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("settings.ceo.branches.deleteConfirm.message", { name: deleteTarget?.name ?? "" })}
          </DialogContentText>
          {deleteError && (
            <div className="mt-3 text-sm text-red-500">{deleteError}</div>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={closeDeleteConfirm}
            variant="outlined"
            disabled={isDeleting}
            sx={{
              textTransform: "none",
              borderRadius: "10px",
              borderColor: "#E5E7EB",
              color: "#374151",
              paddingX: "18px",
              "&:hover": { borderColor: "#D1D5DB", backgroundColor: "#F9FAFB" },
            }}
          >
            {t("settings.ceo.branches.form.cancel")}
          </Button>
          <Button
            onClick={confirmDelete}
            variant="contained"
            color="error"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{
              textTransform: "none",
              borderRadius: "10px",
              paddingX: "18px",
              fontWeight: 600,
              boxShadow: "none",
            }}
          >
            {t("settings.ceo.branches.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
