// src/pages/groups/EditGroupDrawer.tsx
import { CSSProperties, useEffect, useRef, useState } from "react";
import { HiChevronDown } from "react-icons/hi";
import { useTranslation } from "react-i18next";
import { Chip, Stack, CircularProgress } from "@mui/material";
import { RightDrawer } from "../../../components/RightDrawer";
import { inputStyle, labelStyle, submitBtn, cancelBtn } from "../styles";
import { DatePickerField } from "../DatePickerField";
import { TimeSelectField } from "../TimeSelectField";
import { DAYS_PRESETS, classifyDayList, addMonthsToIsoDate, toIsoDatePart } from "../../../utils";
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

const toFormState = (group: GroupDetail): EditGroupFormState => ({
  name: group.name ?? "",
  courseId: group.courseId ?? "",
  teacherIds: group.teachers?.map((t) => t.id) ?? [],
  roomId: group.roomId ?? "",
  days: group.days ?? [],
  time: group.time ?? "",
  // The backend returns these as full ISO datetimes (e.g.
  // "2026-08-14T05:00:00+05:00") — DatePickerField expects a plain
  // "YYYY-MM-DD", and passing the raw value through garbled the displayed
  // date and broke the calendar's selected-day highlighting.
  trainingStart: toIsoDatePart(group.trainingStart),
  trainingEnd: toIsoDatePart(group.trainingEnd),
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
  const wasOpen = useRef(open);

  // Formani faqat drawer YOPIQ -> OCHIQ holatga o'tganda real guruh
  // ma'lumotlari bilan qayta boshlaymiz — har bir `group` obyekti yangilanishida
  // emas. SingleGroup "Tahrirlash" tugmasi bosilganda ikkita so'rov birga
  // ketadi: darhol mavjud bo'lgan GET /groups/{id} natijasi (to'liq `teachers`
  // massivi bilan) va parallel ravishda lazy GET /groups/{id}/for-edit. Ikkinchisi
  // hal bo'lganda `group` prop'i yangilanadi — agar effekt shu paytda ham
  // qayta ishga tushsa va for-edit javobi tanlangan o'qituvchi(lar)ni boshqacha
  // shaklda qaytarsa (yoki umuman qaytarmasa), forma drawer ochiq turgan
  // holatda jimgina tozalanib, "o'qituvchi tanlash" bo'sh/tanlanmagan ko'rinardi.
  useEffect(() => {
    if (open && !wasOpen.current) {
      setForm(toFormState(group));
      setDaysMode(classifyDayList(group.days ?? []));
    }
    wasOpen.current = open;
  }, [open, group]);

  const toggleDay = (day: GroupDay) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  };

  const toggleTeacher = (teacherId: string) => {
    setForm((f) => ({
      ...f,
      teacherIds: f.teacherIds.includes(teacherId)
        ? f.teacherIds.filter((id) => id !== teacherId)
        : [...f.teacherIds, teacherId],
    }));
  };

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
      trainingStart: form.trainingStart || undefined,
      trainingEnd: form.trainingEnd || undefined,
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
          <Stack direction="row" flexWrap="wrap" gap={1} mt={0.5}>
            {teachers.map((tc) => (
              <Chip
                key={tc.id}
                label={tc.name}
                size="small"
                color={form.teacherIds.includes(tc.id) ? "primary" : "default"}
                onClick={() => toggleTeacher(tc.id)}
                sx={{ cursor: "pointer" }}
              />
            ))}
          </Stack>
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
