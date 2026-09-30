// src/pages/groups/EditGroupDrawer.tsx
import { CSSProperties, useEffect, useMemo, useState } from "react";
import { HiChevronDown } from "react-icons/hi";
import { useTranslation } from "react-i18next";
import { Chip, Stack, CircularProgress, Select, MenuItem, Checkbox, ListItemText } from "@mui/material";
import { RightDrawer } from "../../../components/RightDrawer";
import { inputStyle, labelStyle, submitBtn, cancelBtn } from "../styles";
import { DatePickerField } from "../DatePickerField";
import { TimeSelectField } from "../TimeSelectField";
import { DAYS_PRESETS, classifyDayList, addMonthsToIsoDate, parseTrainingDate } from "../../../utils";
import type { GroupDay, GroupDetail, UpdateGroupRequest } from "../../../app/api/groupsApi/types";

const ALL_DAYS: GroupDay[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

/* ─── Select uslubi (inputStyle asosida, chevron bilan) ─── */
const selectWrapperStyle: CSSProperties = {
  position: "relative",
};

const selectStyle: CSSProperties = {
  ...inputStyle,
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  cursor: "pointer",
  paddingRight: 32,
  width: "100%",
};

const chevronStyle: CSSProperties = {
  position: "absolute",
  right: 12,
  top: "50%",
  transform: "translateY(-50%)",
  pointerEvents: "none",
  color: "#9ca3af",
};

const SelectField = ({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) => (
  <div>
    <label style={labelStyle}>{label}</label>
    <div style={selectWrapperStyle}>
      <select style={selectStyle} value={value} onChange={(e) => onChange(e.target.value)}>
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <HiChevronDown size={16} style={chevronStyle} />
    </div>
  </div>
);

interface EditGroupFormState {
  name: string;
  courseId: string;
  // A group can have more than one teacher (GroupDetail.teachers is an
  // array) — this used to be a single string and silently dropped every
  // teacher but the first on save, permanently losing co-teachers.
  teacherIds: string[];
  roomId: string;
  days: GroupDay[];
  time: string;
  trainingStart: string;
  trainingEnd: string;
}

// GroupDetail.trainingStart/trainingEnd can arrive as a plain "YYYY-MM-DD" or
// as a full ISO datetime ("2026-08-14T00:00:00.000Z" / "...+05:00"). The form
// (and everything sent back in UpdateGroupRequest) always holds plain
// "YYYY-MM-DD": the leading date is read straight from the string — never via
// `new Date()` / `toISOString()`, which would shift the day by the viewer's
// timezone offset.
const toDateOnly = (value?: string | null): string => {
  const p = parseTrainingDate(value);
  if (!p) return "";
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
};

const toFormState = (group: GroupDetail): EditGroupFormState => ({
  name: group.name ?? "",
  courseId: group.courseId ?? "",
  teacherIds: group.teachers?.map((t) => t.id) ?? [],
  roomId: group.roomId ?? "",
  days: group.days ?? [],
  time: group.time ?? "",
  trainingStart: toDateOnly(group.trainingStart),
  trainingEnd: toDateOnly(group.trainingEnd),
});

export const EditGroupDrawer = ({
  group,
  open,
  onClose,
  courses,
  rooms,
  teachers,
  onSave,
  isSaving,
}: {
  group: GroupDetail;
  open: boolean;
  onClose: () => void;
  courses: { id: string; name: string; months?: number | null }[];
  rooms: { id: string; name: string }[];
  teachers: { id: string; name: string }[];
  onSave: (data: Omit<UpdateGroupRequest, "id">) => void;
  isSaving: boolean;
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<EditGroupFormState>(() => toFormState(group));
  const [daysMode, setDaysMode] = useState<string>(() => classifyDayList(group.days ?? []));

  // Har safar drawer ochilganda formani real guruh ma'lumotlari bilan qayta boshlaymiz.
  useEffect(() => {
    if (open) {
      setForm(toFormState(group));
      setDaysMode(classifyDayList(group.days ?? []));
    }
  }, [open, group]);

  const toggleDay = (day: GroupDay) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  };

  // Dropdown options: GET /teachers/select list plus any teacher already on
  // the group that is missing from it (e.g. list still loading or teacher no
  // longer "active") — so a current teacher is always visible and is never
  // silently dropped on save.
  const teacherOptions = useMemo(() => {
    const list = [...teachers];
    (group.teachers ?? []).forEach((gt) => {
      if (!list.some((tc) => tc.id === gt.id)) list.push({ id: gt.id, name: gt.name });
    });
    return list;
  }, [teachers, group.teachers]);

  const DAY_OPTIONS = [
    { value: "Odd days",     label: t("groups.options.days.odd") },
    { value: "Even days",    label: t("groups.options.days.even") },
    { value: "Weekend days", label: t("groups.options.days.weekend") },
    { value: "Every day",    label: t("groups.options.days.every") },
    { value: "Other",        label: t("groups.options.days.other") },
  ];

  // Same Course.months + trainingStart -> trainingEnd auto-calc as Groups.tsx's
  // create/edit drawer, kept consistent here.
  const recalcEndDate = (courseId: string, startDate: string) => {
    if (!startDate) return;
    const months = courses.find((c) => c.id === courseId)?.months;
    if (!months) return;
    const end = addMonthsToIsoDate(startDate, months);
    if (end) setForm((f) => ({ ...f, trainingEnd: end }));
  };

  const handleSubmit = () => {
    onSave({
      name: form.name,
      courseId: form.courseId || undefined,
      teacherIds: form.teacherIds.length ? form.teacherIds : undefined,
      roomId: form.roomId || undefined,
      days: form.days,
      time: form.time || undefined,
      trainingStart: toDateOnly(form.trainingStart) || undefined,
      trainingEnd: toDateOnly(form.trainingEnd) || undefined,
    });
  };

  return (
    <RightDrawer open={open} onClose={onClose} title={t("singleGroup.editGroupDrawer.title")}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <label style={labelStyle}>{t("singleGroup.editGroupDrawer.groupName")}</label>
          <input
            style={inputStyle}
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>

        <SelectField
          label={t("singleGroup.editGroupDrawer.selectCourse")}
          value={form.courseId}
          onChange={(v) => { setForm((f) => ({ ...f, courseId: v })); recalcEndDate(v, form.trainingStart); }}
          options={courses.map((c) => ({ value: c.id, label: c.name }))}
          placeholder={t("singleGroup.editGroupDrawer.selectCourse")}
        />

        <div>
          <label style={labelStyle}>{t("singleGroup.editGroupDrawer.selectTeacher")}</label>
          <div style={selectWrapperStyle}>
            <Select
              multiple
              displayEmpty
              fullWidth
              size="small"
              value={form.teacherIds}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({ ...f, teacherIds: typeof v === "string" ? v.split(",") : v }));
              }}
              renderValue={(selected) =>
                selected.length === 0 ? (
                  <span style={{ color: "#9ca3af" }}>{t("singleGroup.editGroupDrawer.selectTeacher")}</span>
                ) : (
                  <Stack direction="row" flexWrap="wrap" gap={0.5}>
                    {selected.map((id) => (
                      <Chip
                        key={id}
                        size="small"
                        label={teacherOptions.find((tc) => tc.id === id)?.name ?? id}
                      />
                    ))}
                  </Stack>
                )
              }
              MenuProps={{ PaperProps: { style: { maxHeight: 280 } } }}
              sx={{
                fontSize: 13,
                borderRadius: "8px",
                bgcolor: "#fff",
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e0e0e0" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#a0aec0" },
                "& .MuiSelect-select": { py: "7px" },
              }}
            >
              {teacherOptions.length === 0 && (
                <MenuItem disabled sx={{ fontSize: 13 }}>{t("singleGroup.editGroupDrawer.noTeachers")}</MenuItem>
              )}
              {teacherOptions.map((tc) => (
                <MenuItem key={tc.id} value={tc.id} sx={{ fontSize: 13, py: 0.25 }}>
                  <Checkbox size="small" checked={form.teacherIds.includes(tc.id)} sx={{ p: 0.5, mr: 1 }} />
                  <ListItemText primary={tc.name} primaryTypographyProps={{ fontSize: 13 }} />
                </MenuItem>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <SelectField
            label={t("singleGroup.editGroupDrawer.days")}
            value={daysMode}
            onChange={(mode) => {
              setDaysMode(mode);
              if (mode !== "Other") setForm((f) => ({ ...f, days: DAYS_PRESETS[mode] ?? [] }));
            }}
            options={DAY_OPTIONS}
            placeholder={t("singleGroup.editGroupDrawer.selectDays")}
          />
          {daysMode === "Other" && (
            <Stack direction="row" flexWrap="wrap" gap={1} mt={1}>
              {ALL_DAYS.map((day) => (
                <Chip
                  key={day}
                  label={t(`singleGroup.editGroupDrawer.weekdays.${day}`)}
                  size="small"
                  color={form.days.includes(day) ? "primary" : "default"}
                  onClick={() => toggleDay(day)}
                  sx={{ cursor: "pointer" }}
                />
              ))}
            </Stack>
          )}
        </div>

        <SelectField
          label={t("singleGroup.editGroupDrawer.selectRoom")}
          value={form.roomId}
          onChange={(v) => setForm((f) => ({ ...f, roomId: v }))}
          options={rooms.map((r) => ({ value: r.id, label: r.name }))}
          placeholder={t("singleGroup.editGroupDrawer.selectRoom")}
        />

        {/* Tags aren't stored anywhere on the backend Group model — shown as a
            disabled placeholder to match the reference design rather than a
            field that would silently fail to save. */}
        <div>
          <label style={labelStyle}>{t("singleGroup.editGroupDrawer.tags")}</label>
          <div style={{ ...inputStyle, display: "flex", alignItems: "center", color: "#b0b0b0", cursor: "not-allowed", background: "#f9fafb" }}>
            {t("singleGroup.editGroupDrawer.addNewTags")}
          </div>
        </div>

        <div>
          <label style={labelStyle}>{t("singleGroup.editGroupDrawer.lessonStartTime")}</label>
          <TimeSelectField value={form.time} onChange={(time) => setForm((f) => ({ ...f, time }))} />
        </div>

        <div>
          <label style={labelStyle}>{t("singleGroup.editGroupDrawer.groupStartDate")}</label>
          <DatePickerField
            value={form.trainingStart}
            onChange={(iso) => { setForm((f) => ({ ...f, trainingStart: iso })); recalcEndDate(form.courseId, iso); }}
            shortcuts
          />
        </div>
        <div>
          <label style={labelStyle}>{t("singleGroup.editGroupDrawer.groupEndDate")}</label>
          <DatePickerField value={form.trainingEnd} onChange={(iso) => setForm((f) => ({ ...f, trainingEnd: iso }))} />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button style={{ ...submitBtn, opacity: isSaving ? 0.7 : 1 }} onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : t("singleGroup.editGroupDrawer.save")}
          </button>
          <button style={cancelBtn} onClick={onClose} disabled={isSaving}>
            {t("singleGroup.editGroupDrawer.cancel")}
          </button>
        </div>
      </div>
    </RightDrawer>
  );
};

export default EditGroupDrawer;
