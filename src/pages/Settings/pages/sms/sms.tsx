import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { MdSms, MdSave, MdClose, MdDelete, MdEdit } from "react-icons/md";
import {
  useAutoSmsSettingsQuery,
  useUpdateAutoSmsSettingMutation,
  useSmsTemplatesQuery,
  useCreateSmsTemplateMutation,
  useUpdateSmsTemplateMutation,
  useDeleteSmsTemplateMutation,
  useSmsConfigQuery,
  useUpdateSmsConfigMutation,
} from "../../../../app/api/smsApi";
import type { AutoSmsSetting, SmsTemplate } from "../../../../app/api/smsApi/types";
import { useToast } from "../../../../Context/ToastContext";
import { extractApiError } from "../../../../utils";
import type { RootState } from "../../../../app/store";

// NOTE: `desc` holds an i18n key (not raw text) because this array is defined
// outside the component and translated at render time via t(v.desc).
const VARIABLES = [
  { key: "(STUDENT)", desc: "settings.sms.variables.student" },
  { key: "(GROUP)", desc: "settings.sms.variables.group" },
  { key: "(SUM)", desc: "settings.sms.variables.sum" },
  { key: "(LC)", desc: "settings.sms.variables.lc" },
  { key: "(TEACHER)", desc: "settings.sms.variables.teacher" },
  { key: "(TIME)", desc: "settings.sms.variables.time" },
  { key: "(ROOM)", desc: "settings.sms.variables.room" },
  { key: "(DAYS)", desc: "settings.sms.variables.days" },
  { key: "(BALANCE)", desc: "settings.sms.variables.balance" },
  { key: "(EX-ID)", desc: "settings.sms.variables.exId" },
  { key: "(HOURS)", desc: "settings.sms.variables.hours" },
  { key: "(COURSE)", desc: "settings.sms.variables.course" },
  { key: "(INDEBTEDNESS)", desc: "settings.sms.variables.indebtedness" },
  { key: "(GROUP INFORMATION)", desc: "settings.sms.variables.groupInformation" },
];

// Presentational-only lookup for known auto-SMS types: label/description are
// UI copy that GET /sms/auto-settings doesn't provide (and per Swagger,
// isn't expected to — only `type`/`isActive`/`template` come from the
// backend). This is NOT a source of business data: the list of types shown,
// and every isActive/template value, come entirely from the backend
// response. A type the backend returns but that isn't in this map still
// renders, using a humanized version of its `type` string as the label.
const AUTO_SMS_TYPE_META: Record<string, { label: string; description: string }> = {
  advance_payment: {
    label: "settings.sms.types.advancePayment.label",
    description: "settings.sms.types.advancePayment.description",
  },
  balance_not_enough: {
    label: "settings.sms.types.balanceNotEnough.label",
    description: "settings.sms.types.balanceNotEnough.description",
  },
  payment_done: {
    label: "settings.sms.types.paymentDone.label",
    description: "settings.sms.types.paymentDone.description",
  },
  student_added: {
    label: "settings.sms.types.studentAdded.label",
    description: "settings.sms.types.studentAdded.description",
  },
  student_birthday: {
    label: "settings.sms.types.studentBirthday.label",
    description: "settings.sms.types.studentBirthday.description",
  },
  absent_attendance: {
    label: "settings.sms.types.absentAttendance.label",
    description: "settings.sms.types.absentAttendance.description",
  },
};

// The backend names auto-SMS types in UPPER_CASE (confirmed live:
// PAYMENT_ADVANCE, PAYMENT_SUCCESS, ...), so lookups are case-insensitive and
// a few synonyms map onto the same label/description.
const AUTO_SMS_TYPE_ALIASES: Record<string, string> = {
  payment_advance: "advance_payment",
  payment_success: "payment_done",
  payment_received: "payment_done",
  balance_low: "balance_not_enough",
  low_balance: "balance_not_enough",
  insufficient_balance: "balance_not_enough",
  student_joined: "student_added",
  group_joined: "student_added",
  new_student: "student_added",
  birthday: "student_birthday",
  attendance_absent: "absent_attendance",
  student_absent: "absent_attendance",
  absent: "absent_attendance",
};

const metaFor = (type: string) => {
  const key = type.trim().toLowerCase();
  return AUTO_SMS_TYPE_META[AUTO_SMS_TYPE_ALIASES[key] ?? key];
};

const humanizeType = (type: string) => {
  const words = type.replace(/_/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const Toggle = ({
  enabled,
  disabled,
  onChange,
}: {
  enabled: boolean;
  disabled?: boolean;
  onChange: () => void;
}) => (
  <button
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
      enabled ? "bg-blue-500" : "bg-gray-300"
    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
        enabled ? "translate-x-6" : "translate-x-1"
      }`}
    />
  </button>
);

// Appends the backend's own reason (when it sent one) to a generic message.
const withDetail = (generic: string, err: unknown) => {
  const detail = extractApiError(err);
  return detail ? `${generic}: ${detail}` : generic;
};

export const SettingsSms = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"auto-sms" | "templates" | "config">("auto-sms");
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  const {
    data: autoSettings, isLoading: autoSettingsLoading, isError: autoSettingsError,
  } = useAutoSmsSettingsQuery({ branchId: selectedBranchId ?? "all" });
  const [updateAutoSmsSetting] = useUpdateAutoSmsSettingMutation();
  const [savingType, setSavingType] = useState<string | null>(null);

  const [selectedType, setSelectedType] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedType && autoSettings && autoSettings.length > 0) {
      setSelectedType(autoSettings[0].type);
    }
  }, [autoSettings, selectedType]);

  const selected = autoSettings?.find((s) => s.type === selectedType) ?? null;

  // Editable draft of the selected type's template text; only re-synced when
  // the selection changes (not on every background refetch), so an
  // in-progress edit isn't clobbered by a toggle-triggered cache
  // invalidation for a different row.
  const [draftTemplate, setDraftTemplate] = useState("");
  useEffect(() => {
    setDraftTemplate(selected?.template ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType]);

  const toggleSms = async (item: AutoSmsSetting) => {
    setSavingType(item.type);
    try {
      await updateAutoSmsSetting({ type: item.type, isActive: !item.isActive, template: item.template }).unwrap();
    } catch (err) {
      toast.error(withDetail(t("settings.sms.toast.error"), err));
    } finally {
      setSavingType(null);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selected) return;
    setSavingType(selected.type);
    try {
      await updateAutoSmsSetting({ type: selected.type, isActive: selected.isActive, template: draftTemplate }).unwrap();
      toast.success(t("settings.sms.toast.settingSaved"));
    } catch (err) {
      toast.error(withDetail(t("settings.sms.toast.error"), err));
    } finally {
      setSavingType(null);
    }
  };

  const {
    data: templatesData, isLoading: templatesLoading, isError: templatesError,
  } = useSmsTemplatesQuery();
  const templates = templatesData ?? [];
  const [createSmsTemplate, { isLoading: isCreatingTemplate }] = useCreateSmsTemplateMutation();
  const [updateSmsTemplate, { isLoading: isUpdatingTemplate }] = useUpdateSmsTemplateMutation();
  const [deleteSmsTemplate, { isLoading: isDeletingTemplate }] = useDeleteSmsTemplateMutation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateContent, setTemplateContent] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SmsTemplate | null>(null);

  const isSavingTemplate = isCreatingTemplate || isUpdatingTemplate;

  const openCreateDrawer = () => {
    setEditingTemplate(null);
    setTemplateTitle("");
    setTemplateContent("");
    setDrawerOpen(true);
  };

  const openEditDrawer = (template: SmsTemplate) => {
    setEditingTemplate(template);
    setTemplateTitle(template.title);
    setTemplateContent(template.content);
    setDrawerOpen(true);
  };

  const newSymbolCount = templateContent.length;
  const newSmsCount = newSymbolCount > 0 ? Math.ceil(newSymbolCount / 160) : 0;

  const handleSubmitTemplate = async () => {
    if (!templateTitle.trim() || !templateContent.trim()) return;
    try {
      if (editingTemplate) {
        await updateSmsTemplate({ id: editingTemplate.id, title: templateTitle.trim(), content: templateContent.trim() }).unwrap();
        toast.success(t("settings.sms.toast.templateUpdated"));
      } else {
        await createSmsTemplate({ title: templateTitle.trim(), content: templateContent.trim() }).unwrap();
        toast.success(t("settings.sms.toast.templateCreated"));
      }
      setDrawerOpen(false);
    } catch (err) {
      toast.error(withDetail(t("settings.sms.toast.error"), err));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSmsTemplate(deleteTarget.id).unwrap();
      toast.success(t("settings.sms.toast.templateDeleted"));
    } catch (err) {
      toast.error(withDetail(t("settings.sms.toast.error"), err));
    } finally {
      setDeleteTarget(null);
    }
  };

  // GET/PUT /sms/config — Eskiz provider credentials. GET 400s while nothing
  // is configured yet, so a failed load just leaves the form empty.
  const { data: smsConfig, isError: smsConfigError, error: smsConfigErr } = useSmsConfigQuery(undefined, {
    skip: activeTab !== "config",
  });
  const [updateSmsConfig, { isLoading: isSavingConfig }] = useUpdateSmsConfigMutation();
  const [configForm, setConfigForm] = useState({ email: "", password: "", alias: "" });
  useEffect(() => {
    if (smsConfig) setConfigForm(smsConfig);
  }, [smsConfig]);

  const canSaveConfig = configForm.email.trim() !== "" && configForm.password !== "" && configForm.alias.trim() !== "";
  const handleSaveConfig = async () => {
    if (!canSaveConfig) return;
    try {
      await updateSmsConfig({
        email: configForm.email.trim(),
        password: configForm.password,
        alias: configForm.alias.trim(),
      }).unwrap();
      toast.success(t("settings.sms.config.saved"));
    } catch (err) {
      toast.error(withDetail(t("settings.sms.config.error"), err));
    }
  };

  const exampleText = draftTemplate
    .replace(/\(STUDENT\)/g, "Ibrohim")
    .replace(/\(GROUP\)/g, "Young Adults")
    .replace(/\(LC\)/g, "Young Adults")
    .replace(/\(SUM\)/g, "500 000 UZS")
    .replace(/\(BALANCE\)/g, "0 UZS")
    .replace(/\(TEACHER\)/g, "Sardor")
    .replace(/\(TIME\)/g, "14:00")
    .replace(/\(ROOM\)/g, "101");

  const symbolCount = exampleText.length;
  const smsCount = Math.ceil(symbolCount / 160);
  const selectedMeta = selected ? metaFor(selected.type) : undefined;
  const selectedLabel = selected ? (selectedMeta ? t(selectedMeta.label) : humanizeType(selected.type)) : "";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Page title */}
      <div className="flex items-center gap-2 mb-6">
        <MdSms className="text-2xl text-gray-700" />
        <h1 className="text-2xl font-semibold text-gray-800">{t("settings.sms.title")}</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("auto-sms")}
          className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "auto-sms"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {t("settings.sms.tabs.autoSms")}
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "templates"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {t("settings.sms.tabs.templates")}
        </button>
        <button
          onClick={() => setActiveTab("config")}
          className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "config"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {t("settings.sms.tabs.config")}
        </button>
      </div>

      {/* AUTO-SMS TAB */}
      {activeTab === "auto-sms" && (
        <>
          {autoSettingsError && (
            <p className="text-sm text-red-500 mb-4">{t("settings.sms.loadError")}</p>
          )}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-4 flex flex-col gap-2">
              <h2 className="text-base font-semibold text-gray-700 mb-2">{t("settings.sms.smsTypeHeading")}</h2>
              {autoSettingsLoading ? (
                <p className="text-sm text-gray-400 px-1">…</p>
              ) : (autoSettings ?? []).length === 0 ? (
                !autoSettingsError && (
                  <p className="text-sm text-gray-400 px-1">{t("settings.sms.table.empty")}</p>
                )
              ) : (
                (autoSettings ?? []).map((sms) => {
                  const meta = metaFor(sms.type);
                  return (
                    <div
                      key={sms.type}
                      onClick={() => setSelectedType(sms.type)}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                        selectedType === sms.type
                          ? "border-blue-500 bg-white shadow-sm"
                          : "border-gray-200 bg-white hover:border-blue-300"
                      }`}
                    >
                      <span className="text-sm text-gray-700">{meta ? t(meta.label) : humanizeType(sms.type)}</span>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Toggle
                          enabled={sms.isActive}
                          disabled={savingType === sms.type}
                          onChange={() => toggleSms(sms)}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {selected && (
              <>
                <div className="col-span-5 flex flex-col gap-4">
                  <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                    <h2 className="text-base font-semibold text-gray-700 mb-3">
                      {t("settings.sms.smsTextHeading", { label: selectedLabel })}
                    </h2>
                    <textarea
                      value={draftTemplate}
                      onChange={(e) => setDraftTemplate(e.target.value)}
                      rows={6}
                      className="w-full text-sm text-gray-700 border border-gray-200 rounded-md p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    />
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                    <h2 className="text-base font-semibold text-gray-700 mb-3">
                      {t("settings.sms.exampleHeading")}
                    </h2>
                    <div className="bg-gray-100 rounded-md p-4 text-sm text-gray-600 min-h-[100px]">
                      {exampleText}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {t("settings.sms.symbolsCount", { count: symbolCount, sms: smsCount })}
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveTemplate}
                      disabled={savingType === selected.type}
                      className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-medium px-6 py-2 rounded-md transition-colors"
                    >
                      <MdSave size={16} />
                      {savingType === selected.type ? t("settings.sms.saving") : t("settings.sms.saveButton")}
                    </button>
                  </div>
                </div>

                <div className="col-span-3">
                  <h2 className="text-base font-semibold text-gray-700 mb-3">{t("settings.sms.descriptionHeading")}</h2>
                  <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                    {selectedMeta && <p className="text-sm text-gray-600 mb-4">{t(selectedMeta.description)}</p>}
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">{t("settings.sms.availableVariables")}</h3>
                    <p className="text-xs text-red-500 mb-3">
                      {t("settings.sms.variablesWarningPrefix")}{" "}
                      <span className="font-bold">{t("settings.sms.tabs.autoSms")}</span>
                      {t("settings.sms.variablesWarningSuffix")}
                    </p>
                    <ul className="space-y-1">
                      {VARIABLES.map((v) => (
                        <li key={v.key} className="text-xs text-gray-600">
                          <span className="font-medium text-gray-800">{v.key}</span> - {t(v.desc)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* PROVIDER CONFIG TAB (GET/PUT /sms/config) */}
      {activeTab === "config" && (
        <div className="max-w-xl bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-1">{t("settings.sms.config.title")}</h2>
          <p className="text-sm text-gray-500 mb-5">{t("settings.sms.config.description")}</p>
          {smsConfigError && (
            <p className="text-xs text-amber-600 mb-4">
              {t("settings.sms.config.notConfigured")}
              {extractApiError(smsConfigErr) ? ` (${extractApiError(smsConfigErr)})` : ""}
            </p>
          )}
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">{t("settings.sms.config.email")}</label>
              <input
                type="text"
                value={configForm.email}
                onChange={(e) => setConfigForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full text-sm text-gray-700 border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">{t("settings.sms.config.password")}</label>
              <input
                type="password"
                autoComplete="new-password"
                value={configForm.password}
                onChange={(e) => setConfigForm((p) => ({ ...p, password: e.target.value }))}
                className="w-full text-sm text-gray-700 border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">{t("settings.sms.config.alias")}</label>
              <input
                type="text"
                value={configForm.alias}
                onChange={(e) => setConfigForm((p) => ({ ...p, alias: e.target.value }))}
                className="w-full text-sm text-gray-700 border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSaveConfig}
              disabled={!canSaveConfig || isSavingConfig}
              className="flex items-center gap-2 w-fit bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-medium px-6 py-2 rounded-md transition-colors"
            >
              <MdSave size={16} />
              {isSavingConfig ? t("settings.sms.saving") : t("settings.sms.saveButton")}
            </button>
          </div>
        </div>
      )}

      {/* TEMPLATES TAB */}
      {activeTab === "templates" && (
        <div>
          {/* ADD NEW button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={openCreateDrawer}
              className="bg-[#1b3d5e] hover:bg-[#162f4a] text-white text-sm font-bold px-7 py-2.5 rounded-full tracking-widest uppercase transition-colors shadow"
            >
              {t("settings.sms.addNew")}
            </button>
          </div>

          {templatesError && (
            <p className="text-sm text-red-500 mb-4">{t("settings.sms.loadError")}</p>
          )}

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-sm font-medium text-gray-600 px-5 py-3">
                    {t("settings.sms.table.templatesHeader")}
                  </th>
                  <th className="text-left text-sm font-medium text-gray-600 px-5 py-3 w-32">
                    {t("settings.sms.table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {templatesLoading ? (
                  <tr>
                    <td colSpan={2} className="px-5 py-10 text-center text-sm text-gray-400">
                      …
                    </td>
                  </tr>
                ) : templates.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-5 py-10 text-center text-sm text-gray-400">
                      {t("settings.sms.table.empty")}
                    </td>
                  </tr>
                ) : (
                  templates.map((template) => (
                    <tr key={template.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm text-gray-700">
                        <div className="font-medium text-gray-800">{template.title}</div>
                        <div className="text-gray-500">{template.content}</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => openEditDrawer(template)}
                            title={t("settings.sms.table.edit")}
                            className="text-blue-400 hover:text-blue-600 transition-colors"
                          >
                            <MdEdit size={18} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(template)}
                            title={t("settings.sms.table.delete")}
                            className="text-red-400 hover:text-red-600 transition-colors"
                          >
                            <MdDelete size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RIGHT-SIDE DRAWER (create/edit template) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer panel */}
          <div
            className="relative w-96 bg-white h-full shadow-2xl flex flex-col z-50"
            style={{ animation: "slideInRight 0.25s ease-out" }}
          >
            <style>{`
              @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
              }
            `}</style>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800">
                {editingTemplate ? t("settings.sms.drawer.editTitle") : t("settings.sms.drawer.title")}
              </h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100"
              >
                <MdClose size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 px-6 py-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">{t("settings.sms.drawer.titleLabel")}</label>
                <input
                  type="text"
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  placeholder={t("settings.sms.drawer.titlePlaceholder")}
                  className="w-full text-sm text-gray-700 border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">{t("settings.sms.drawer.label")}</label>
                <textarea
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  rows={6}
                  className="w-full text-sm text-gray-700 border border-gray-300 rounded-md p-3 resize-y focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {t("settings.sms.symbolsCount", { count: newSymbolCount, sms: newSmsCount })}
                </p>
              </div>

              <button
                onClick={handleSubmitTemplate}
                disabled={isSavingTemplate || !templateTitle.trim() || !templateContent.trim()}
                className="bg-[#1b3d5e] hover:bg-[#162f4a] disabled:opacity-60 text-white text-sm font-bold px-7 py-2.5 rounded-full w-fit transition-colors shadow"
              >
                {isSavingTemplate ? t("settings.sms.saving") : t("settings.sms.drawer.submit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-2">{t("settings.sms.confirmDelete.title")}</h2>
            <p className="text-sm text-gray-500 mb-6">{t("settings.sms.confirmDelete.message")}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="text-sm font-medium text-gray-600 hover:text-gray-800 px-4 py-2 rounded-md transition-colors"
              >
                {t("settings.sms.confirmDelete.cancel")}
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeletingTemplate}
                className="bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
              >
                {t("settings.sms.confirmDelete.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
