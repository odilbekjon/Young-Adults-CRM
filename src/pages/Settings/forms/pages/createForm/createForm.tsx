// CreateForm.tsx — create/edit a dynamic form through the real /lead-forms API.
// "Lead form" tab = type PUBLIC_LEAD (fixed name + phone fields, lead source),
// "Simple form" tab = type INTERNAL_SURVEY (questions only).
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  Box, Button, FormControl, FormControlLabel,
  MenuItem, Radio, Select, TextField, Typography,
  Paper, IconButton, CircularProgress,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { FiPlus, FiChevronUp, FiChevronDown } from "react-icons/fi";
import { MdClose } from "react-icons/md";
import { useParams, useNavigate } from "react-router-dom";
import {
  useLeadFormForEditQuery,
  useLeadFormFieldsQuery,
  useCreateLeadFormMutation,
  useUpdateLeadFormMutation,
  useCreateLeadFormFieldMutation,
  useUpdateLeadFormFieldMutation,
  useDeleteLeadFormFieldMutation,
} from "../../../../../app/api/leadFormsApi";
import type { LeadFormType } from "../../../../../app/api/leadFormsApi/types";
import { useAllBranchesQuery } from "../../../../../app/api/branchesApi";
import { useAllLeadSourcesQuery } from "../../../../../app/api/leadSourcesApi";
import { useToast } from "../../../../../Context/ToastContext";
import { extractApiError } from "../../../../../utils";
import type { RootState } from "../../../../../app/store";

// ─── Types ────────────────────────────────────────────────────────────────────
type BlockType = "One of the list" | "Short answer" | "Long answer";
interface Answer { id: number; label: string; }
interface Block { id: number; fieldId?: string; type: BlockType; question: string; answers: Answer[]; isRequired: boolean; }
type Kind = "lead" | "simple";

const BLOCK_TYPES: BlockType[] = ["One of the list", "Short answer", "Long answer"];
const BLOCK_TYPE_LABEL_KEYS: Record<BlockType, string> = {
  "One of the list": "settings.forms.createForm.blockTypes.oneOfList",
  "Short answer": "settings.forms.createForm.blockTypes.shortAnswer",
  "Long answer": "settings.forms.createForm.blockTypes.longAnswer",
};
const TEAL = "#4a7fa5";
const TEAL_DARK = "#1a4d6e";

type TFn = (key: string, options?: Record<string, unknown>) => string;

// Swagger documents only "TEXT" as a field type sample. The other two values
// are best guesses — if the backend wants different ones it answers 400 with
// the allowed list (shown in the save toast) and this map is the one place to
// change.
const FIELD_TYPE: Record<BlockType, string> = {
  "One of the list": "SELECT",
  "Short answer": "TEXT",
  "Long answer": "TEXTAREA",
};
const blockTypeFromApi = (type: string): BlockType => {
  if (/SELECT|CHOICE|RADIO|DROPDOWN|LIST/i.test(type)) return "One of the list";
  if (/TEXTAREA|LONG|MULTILINE/i.test(type)) return "Long answer";
  return "Short answer";
};

// The two always-present lead-form questions are stored as real fields that
// map onto the lead's own attributes (`mapsTo`).
const FIXED_FIELDS = [
  { key: "fullName", mapsTo: "name" },
  { key: "phoneNumber", mapsTo: "phone" },
] as const;
const FIXED_MAPS_TO: string[] = FIXED_FIELDS.map((f) => f.mapsTo);

const kindToType = (kind: Kind): LeadFormType => (kind === "lead" ? "PUBLIC_LEAD" : "INTERNAL_SURVEY");

const slugify = (value: string): string =>
  value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "form";
// A random suffix keeps slugs unique when two forms share a title.
const makeSlug = (title: string): string => `${slugify(title)}-${Math.random().toString(36).slice(2, 7)}`;

const defaultBlock = (t: TFn): Block => ({
  id: Date.now(),
  type: "One of the list",
  question: t("settings.forms.createForm.defaultQuestion"),
  answers: [
    { id: 1, label: t("settings.forms.createForm.answerLabel", { number: 1 }) },
    { id: 2, label: t("settings.forms.createForm.answerLabel", { number: 2 }) },
  ],
  isRequired: true,
});

// ─── Shared field card ────────────────────────────────────────────────────────
const FixedFieldCard = ({ index, label }: { index: number; label: string }) => (
  <Paper variant="outlined" sx={{ borderRadius: 2, mb: 1.5, overflow: "hidden", border: "1px solid #e0e0e0" }}>
    <Box sx={{ px: 2, py: 1, backgroundColor: "#fff", borderBottom: "1px solid #f0f0f0" }}>
      <Typography sx={{ fontWeight: 600, color: "#555", fontSize: "0.85rem" }}>{index}</Typography>
    </Box>
    <Box sx={{ px: 2.5, py: 1.8 }}>
      <Typography sx={{ fontWeight: 600, fontSize: "0.95rem", color: "#1a1a2e" }}>
        <span style={{ color: "red", marginRight: 6 }}>*</span>{label}
      </Typography>
    </Box>
  </Paper>
);

// ─── Form editor (controlled — state is owned by CreateForm) ──────────────────
interface FormEditorProps {
  kind: Kind;
  isEdit: boolean;
  title: string; setTitle: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  successMessage: string; setSuccessMessage: (v: string) => void;
  branch: string; setBranch: (v: string) => void;
  sourceId: string; setSourceId: (v: string) => void;
  blocks: Block[]; setBlocks: React.Dispatch<React.SetStateAction<Block[]>>;
  onMoveBlock: (index: number, direction: -1 | 1) => void;
}

function FormEditor({
  kind, isEdit, title, setTitle, description, setDescription, successMessage, setSuccessMessage,
  branch, setBranch, sourceId, setSourceId, blocks, setBlocks, onMoveBlock,
}: FormEditorProps) {
  const { t } = useTranslation();
  const isLead = kind === "lead";
  const { data: branchesData } = useAllBranchesQuery();
  // GET /branches includes soft-deleted/deactivated branches — filtered to
  // ACTIVE only for this picker, same convention as Header's branch dropdown.
  const branches = (branchesData?.data ?? []).filter((b) => b.status === "ACTIVE");
  const { data: sourcesData } = useAllLeadSourcesQuery();
  const sources = sourcesData?.data ?? [];

  const addBlock = () => setBlocks((prev) => [...prev, { ...defaultBlock(t), id: Date.now() }]);
  const removeBlock = (id: number) => setBlocks((prev) => prev.filter((b) => b.id !== id));
  const updateBlock = (id: number, patch: Partial<Block>) =>
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const addAnswer = (blockId: number) =>
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? { ...b, answers: [...b.answers, { id: Date.now(), label: t("settings.forms.createForm.answerLabel", { number: b.answers.length + 1 }) }] }
          : b
      )
    );
  const removeAnswer = (blockId: number, answerId: number) =>
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, answers: b.answers.filter((a) => a.id !== answerId) } : b))
    );
  const updateAnswer = (blockId: number, answerId: number, label: string) =>
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, answers: b.answers.map((a) => (a.id === answerId ? { ...a, label } : a)) } : b
      )
    );

  const fixedLabels = FIXED_FIELDS.map((f) => t(`settings.forms.createForm.fixedFields.${f.key}`));
  const fixedCount = isLead ? fixedLabels.length : 0;

  const selectSx = {
    backgroundColor: "#fff",
    borderRadius: 1.5,
    fontSize: "0.9rem",
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e0e0e0" },
  };
  const inputSx = { mb: 1.5, backgroundColor: "#fff", borderRadius: 1.5, "& .MuiOutlinedInput-root": { borderRadius: 1.5 } };

  const Preview = () => (
    <Paper elevation={0} sx={{ p: 4, borderRadius: 3, backgroundColor: "#fff", border: "1px solid #eee" }}>
      <Typography variant="h6" sx={{ mb: description ? 1 : 3, color: title ? "#1a1a2e" : "#aaa", fontWeight: 600, fontSize: "1.1rem" }}>
        {title || t("settings.forms.createForm.placeholders.formName")}
      </Typography>
      {description && <Typography sx={{ mb: 3, fontSize: "0.85rem", color: "#666" }}>{description}</Typography>}

      {isLead && fixedLabels.map((label, i) => (
        <Box key={label} sx={{ mb: 2.5 }}>
          <Typography sx={{ mb: 0.8, fontSize: "0.85rem", color: "#333" }}>
            {label}<span style={{ color: "red", marginLeft: 4 }}>*</span>
          </Typography>
          <TextField fullWidth size="small" variant="outlined" disabled defaultValue={i === 1 ? "+998" : ""} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1 } }} />
        </Box>
      ))}

      {blocks.map((block) => (
        <Box key={block.id} sx={{ mb: 2.5 }}>
          <Typography sx={{ mb: 1, fontSize: "0.85rem", color: "#333" }}>
            {block.question}{block.isRequired && <span style={{ color: "red", marginLeft: 4 }}>*</span>}
          </Typography>
          {block.type === "One of the list" && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              {block.answers.map((a) => (
                <FormControlLabel
                  key={a.id}
                  value={a.label}
                  control={<Radio size="small" sx={{ color: "#ccc", p: 0.5 }} />}
                  label={<Typography sx={{ fontSize: "0.85rem", color: "#555" }}>{a.label}</Typography>}
                />
              ))}
            </Box>
          )}
          {block.type === "Short answer" && <TextField size="small" fullWidth variant="outlined" disabled />}
          {block.type === "Long answer" && <TextField size="small" fullWidth multiline rows={3} variant="outlined" disabled />}
        </Box>
      ))}

      <Button
        variant="contained"
        sx={{ mt: 1, backgroundColor: TEAL, borderRadius: "50px", px: 3, textTransform: "none", fontSize: "0.85rem", boxShadow: "none", "&:hover": { backgroundColor: TEAL_DARK, boxShadow: "none" } }}
      >
        {t("settings.forms.createForm.actions.submit")}
      </Button>
    </Paper>
  );

  return (
    <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
      {/* ── Left editor ── */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <TextField
          fullWidth size="small" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder={t("settings.forms.createForm.placeholders.formName")} sx={inputSx}
        />
        <TextField
          fullWidth size="small" multiline minRows={2} value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder={t("settings.forms.createForm.placeholders.description", { defaultValue: "Description (optional)" })} sx={inputSx}
        />

        {/* Branch can only be chosen when the form is created (PATCH can't change it). */}
        <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
          <Select
            value={branch} onChange={(e) => setBranch(e.target.value)} displayEmpty disabled={isEdit}
            renderValue={(v) => v ? (branches.find((b) => b.id === v)?.name ?? v) : <span style={{ color: "#aaa" }}>{t("settings.forms.createForm.placeholders.selectBranch")}</span>}
            sx={selectSx}
          >
            {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
          </Select>
        </FormControl>

        {isLead && (
          <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
            <Select
              value={sourceId} onChange={(e) => setSourceId(e.target.value)} displayEmpty
              renderValue={(v) => v ? (sources.find((s) => s.id === v)?.name ?? v) : <span style={{ color: "#aaa" }}>{t("settings.forms.createForm.placeholders.leadsSources")}</span>}
              sx={selectSx}
            >
              <MenuItem value=""><em>—</em></MenuItem>
              {sources.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </Select>
          </FormControl>
        )}

        <TextField
          fullWidth size="small" value={successMessage} onChange={(e) => setSuccessMessage(e.target.value)}
          placeholder={t("settings.forms.createForm.placeholders.successMessage", { defaultValue: "Message shown after submitting (optional)" })}
          sx={{ ...inputSx, mb: 2 }}
        />

        {isLead && fixedLabels.map((label, i) => <FixedFieldCard key={label} index={i + 1} label={label} />)}

        {blocks.map((block, idx) => (
          <Paper key={block.id} variant="outlined" sx={{ borderRadius: 2, mb: 1.5, overflow: "hidden", border: "1px solid #e0e0e0" }}>
            <Box sx={{ display: "flex", alignItems: "center", px: 2, py: 1, gap: 2, backgroundColor: "#fff", borderBottom: "1px solid #f0f0f0" }}>
              <Typography sx={{ fontWeight: 600, color: "#555", minWidth: 20, fontSize: "0.85rem" }}>
                {fixedCount + idx + 1}
              </Typography>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <Select
                  value={block.type}
                  onChange={(e) => updateBlock(block.id, { type: e.target.value as BlockType })}
                  sx={{ fontSize: "0.85rem", "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e0e0e0" } }}
                >
                  {BLOCK_TYPES.map((bt) => <MenuItem key={bt} value={bt} sx={{ fontSize: "0.85rem" }}>{t(BLOCK_TYPE_LABEL_KEYS[bt])}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControlLabel
                sx={{ m: 0 }}
                control={<input type="checkbox" checked={block.isRequired} onChange={(e) => updateBlock(block.id, { isRequired: e.target.checked })} />}
                label={<Typography sx={{ fontSize: "0.8rem", color: "#666", ml: 0.5 }}>{t("settings.forms.createForm.required", { defaultValue: "Required" })}</Typography>}
              />
              <Box sx={{ flex: 1 }} />
              <IconButton size="small" onClick={() => onMoveBlock(idx, -1)} disabled={idx === 0} sx={{ color: "#aaa" }}>
                <FiChevronUp size={15} />
              </IconButton>
              <IconButton size="small" onClick={() => onMoveBlock(idx, 1)} disabled={idx === blocks.length - 1} sx={{ color: "#aaa" }}>
                <FiChevronDown size={15} />
              </IconButton>
              <IconButton size="small" onClick={() => removeBlock(block.id)} sx={{ color: "#aaa" }}>
                <MdClose size={15} />
              </IconButton>
            </Box>

            <Box sx={{ p: 2.5 }}>
              <TextField
                fullWidth size="small" value={block.question}
                onChange={(e) => updateBlock(block.id, { question: e.target.value })}
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  startAdornment: block.isRequired ? <span style={{ color: "red", marginRight: 6, fontWeight: 700 }}>*</span> : undefined,
                  style: { fontWeight: 600, fontSize: "0.95rem" },
                }}
                sx={{ mb: block.type === "One of the list" ? 1.5 : 0 }}
              />

              {block.type === "One of the list" && (
                <Box>
                  {block.answers.map((answer) => (
                    <Box key={answer.id} sx={{ display: "flex", alignItems: "center", mb: 0.8 }}>
                      <Radio size="small" disabled sx={{ color: "#ccc", p: 0.5 }} />
                      <TextField
                        size="small" value={answer.label}
                        onChange={(e) => updateAnswer(block.id, answer.id, e.target.value)}
                        variant="standard"
                        InputProps={{ disableUnderline: true, style: { fontSize: "0.9rem" } }}
                        sx={{ ml: 0.5, flex: 1 }}
                      />
                      {block.answers.length > 1 && (
                        <IconButton size="small" onClick={() => removeAnswer(block.id, answer.id)} sx={{ color: "#ccc" }}>
                          <MdClose size={13} />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                  <Button
                    size="small" variant="contained" startIcon={<FiPlus size={13} />} onClick={() => addAnswer(block.id)}
                    sx={{ mt: 1, backgroundColor: TEAL_DARK, borderRadius: "50px", textTransform: "none", boxShadow: "none", fontSize: "0.8rem", px: 2, "&:hover": { backgroundColor: TEAL, boxShadow: "none" } }}
                  >
                    {t("settings.forms.createForm.actions.addAnswer")}
                  </Button>
                </Box>
              )}
            </Box>
          </Paper>
        ))}

        <Button
          variant="contained" startIcon={<FiPlus size={15} />} onClick={addBlock}
          sx={{ backgroundColor: TEAL_DARK, borderRadius: "50px", textTransform: "none", boxShadow: "none", px: 3, py: 1, fontSize: "0.85rem", mt: 0.5, "&:hover": { backgroundColor: TEAL, boxShadow: "none" } }}
        >
          {t("settings.forms.createForm.actions.addBlock")}
        </Button>
      </Box>

      {/* ── Right preview ── */}
      <Box sx={{ width: 560, flexShrink: 0 }}>
        <Preview />
      </Box>
    </Box>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export const CreateForm = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const headerBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  // Tab 0 = Simple form (INTERNAL_SURVEY), tab 1 = Lead form (PUBLIC_LEAD).
  // An existing form's type can't be changed, so its tab is set from the
  // loaded form and locked.
  const [tab, setTab] = useState<number>(isEdit ? -1 : 0);
  const kind: Kind = tab === 0 ? "simple" : "lead";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  // Default to whichever branch is active in the header for a new form —
  // editing an existing form loads its real branch below. "all" isn't a branch.
  const [branch, setBranch] = useState(isEdit || headerBranchId === "all" ? "" : headerBranchId ?? "");
  const [sourceId, setSourceId] = useState("");
  const [blocks, setBlocks] = useState<Block[]>(() => (isEdit ? [] : [defaultBlock(t)]));
  const [originalFieldIds, setOriginalFieldIds] = useState<string[]>([]);
  // Fixed name/phone fields that already exist on the form being edited.
  const [existingFixedCount, setExistingFixedCount] = useState(0);
  // After the form row is created but a later step fails, a retry must update
  // that row instead of creating a duplicate.
  const [savedId, setSavedId] = useState<string | undefined>(undefined);
  const [fixedCreated, setFixedCreated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: formForEditData, isLoading: formLoading } = useLeadFormForEditQuery(id ?? "", { skip: !id });
  const { data: fieldsData, isLoading: fieldsLoading } = useLeadFormFieldsQuery(id ?? "", { skip: !id });

  const [createLeadForm] = useCreateLeadFormMutation();
  const [updateLeadForm] = useUpdateLeadFormMutation();
  const [createLeadFormField] = useCreateLeadFormFieldMutation();
  const [updateLeadFormField] = useUpdateLeadFormFieldMutation();
  const [deleteLeadFormField] = useDeleteLeadFormFieldMutation();

  useEffect(() => {
    if (!formForEditData) return;
    const f = formForEditData.data;
    setTitle(f.title);
    setDescription(f.description ?? "");
    setSuccessMessage(f.successMessage ?? "");
    setBranch(f.branchId ?? "");
    setSourceId(f.sourceId ?? "");
    setTab(f.type === "INTERNAL_SURVEY" ? 0 : 1);
  }, [formForEditData]);

  useEffect(() => {
    // /fields is preferred; the embedded list of GET /lead-forms/{id}/for-edit
    // is the fallback.
    const fields = fieldsData?.data ?? formForEditData?.data.fields;
    if (!fields) return;
    const fixed = fields.filter((f) => f.mapsTo && FIXED_MAPS_TO.includes(f.mapsTo));
    const rest = fields.filter((f) => !fixed.includes(f));
    setExistingFixedCount(fixed.length);
    setBlocks(
      rest.map((f, i) => ({
        id: Date.now() + i,
        fieldId: f.id,
        type: blockTypeFromApi(f.type),
        question: f.label,
        answers: f.options.map((o, oi) => ({ id: Date.now() + i * 100 + oi, label: o })),
        isRequired: f.isRequired,
      }))
    );
    setOriginalFieldIds(rest.map((f) => f.id));
  }, [fieldsData, formForEditData]);

  const moveBlock = (index: number, direction: -1 | 1) => {
    setBlocks((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error(t("settings.forms.createForm.toast.nameRequired"));
      return;
    }
    setIsSaving(true);
    try {
      let formId = id ?? savedId;
      const isLead = kind === "lead";
      if (formId) {
        // PATCH takes title/description/slug/status/successMessage/sourceId;
        // the slug is left alone so already-shared links keep working.
        await updateLeadForm({
          id: formId,
          title: title.trim(),
          description,
          successMessage,
          sourceId: isLead && sourceId ? sourceId : undefined,
        }).unwrap();
      } else {
        const res = await createLeadForm({
          title: title.trim(),
          description: description.trim() || undefined,
          slug: makeSlug(title),
          type: kindToType(kind),
          targetAudience: "ALL",
          branchId: branch || undefined,
          sourceId: isLead && sourceId ? sourceId : undefined,
          successMessage: successMessage.trim() || undefined,
        }).unwrap();
        formId = res.data.id;
        setSavedId(formId);
      }

      // The two fixed lead fields are only created together with the form.
      let fixedCount = isEdit ? existingFixedCount : 0;
      if (isLead && !isEdit && !fixedCreated) {
        for (const [i, f] of FIXED_FIELDS.entries()) {
          await createLeadFormField({
            formId,
            label: t(`settings.forms.createForm.fixedFields.${f.key}`),
            type: "TEXT",
            isRequired: true,
            order: i,
            mapsTo: f.mapsTo,
          }).unwrap();
        }
        setFixedCreated(true);
      }
      if (isLead && !isEdit) fixedCount = FIXED_FIELDS.length;

      const currentFieldIds = new Set(blocks.filter((b) => b.fieldId).map((b) => b.fieldId as string));
      for (const existingId of originalFieldIds) {
        if (!currentFieldIds.has(existingId)) {
          await deleteLeadFormField({ formId, fieldId: existingId }).unwrap();
        }
      }
      setOriginalFieldIds((prev) => prev.filter((fid) => currentFieldIds.has(fid)));

      // Order comes from `order` on each field (the reorder endpoint's body
      // isn't documented): fixed fields first, then the blocks as arranged.
      for (const [idx, block] of blocks.entries()) {
        const payload = {
          label: block.question,
          type: FIELD_TYPE[block.type],
          options: block.type === "One of the list" ? block.answers.map((a) => a.label) : undefined,
          isRequired: block.isRequired,
          order: fixedCount + idx,
        };
        if (block.fieldId) {
          await updateLeadFormField({ formId, fieldId: block.fieldId, ...payload }).unwrap();
        } else {
          const created = await createLeadFormField({ formId, ...payload }).unwrap();
          // Remember the new id so a retry after a later failure updates the
          // field instead of creating it twice.
          setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, fieldId: created.data.id } : b)));
          setOriginalFieldIds((prev) => [...prev, created.data.id]);
        }
      }

      toast.success(isEdit ? t("settings.forms.createForm.toast.updated") : t("settings.forms.createForm.toast.created"));
      navigate("/settings/forms/list");
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.forms.createForm.toast.error");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    } finally {
      setIsSaving(false);
    }
  };

  const tabSx = {
    cursor: isEdit ? "default" : "pointer",
    flex: 1,
    textAlign: "center" as const,
    py: 1.2,
    fontSize: "0.9rem",
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    border: "1px solid #d0d5dd",
    userSelect: "none" as const,
    transition: "all 0.15s",
  };

  const isLoadingExisting = isEdit && (formLoading || fieldsLoading || tab === -1);

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f0f2f5", p: 3, fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header row */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 3 }}>
        <Box sx={{ display: "flex", flex: 1, border: "1px solid #d0d5dd", borderRadius: "6px", overflow: "hidden" }}>
          <Box
            onClick={() => { if (!isEdit) setTab(0); }}
            sx={{
              ...tabSx,
              borderRight: "1px solid #d0d5dd",
              borderRadius: "5px 0 0 5px",
              backgroundColor: tab === 0 ? "#fff" : "#fafafa",
              color: tab === 0 ? TEAL_DARK : "#666",
              fontWeight: tab === 0 ? 700 : 500,
              borderColor: tab === 0 ? TEAL_DARK : "transparent",
              borderWidth: tab === 0 ? 2 : 1,
            }}
          >
            {t("settings.forms.createForm.tabs.simpleForm")}
          </Box>
          <Box
            onClick={() => { if (!isEdit) setTab(1); }}
            sx={{
              ...tabSx,
              borderRadius: "0 5px 5px 0",
              backgroundColor: tab === 1 ? "#fff" : "#fafafa",
              color: tab === 1 ? TEAL_DARK : "#666",
              fontWeight: tab === 1 ? 700 : 500,
              borderColor: tab === 1 ? TEAL_DARK : "transparent",
              borderWidth: tab === 1 ? 2 : 1,
            }}
          >
            {t("settings.forms.createForm.tabs.leadForm")}
          </Box>
        </Box>

        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving || isLoadingExisting}
          sx={{ backgroundColor: TEAL_DARK, borderRadius: "50px", textTransform: "none", fontWeight: 600, px: 4, py: 1.2, boxShadow: "none", whiteSpace: "nowrap", fontSize: "0.9rem", "&:hover": { backgroundColor: TEAL, boxShadow: "none" } }}
        >
          {isSaving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : (isEdit ? t("settings.forms.createForm.actions.update") : t("settings.forms.createForm.actions.save"))}
        </Button>
      </Box>

      {isLoadingExisting ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
      ) : (
        <FormEditor
          kind={kind} isEdit={isEdit}
          title={title} setTitle={setTitle}
          description={description} setDescription={setDescription}
          successMessage={successMessage} setSuccessMessage={setSuccessMessage}
          branch={branch} setBranch={setBranch}
          sourceId={sourceId} setSourceId={setSourceId}
          blocks={blocks} setBlocks={setBlocks}
          onMoveBlock={moveBlock}
        />
      )}
    </Box>
  );
};
