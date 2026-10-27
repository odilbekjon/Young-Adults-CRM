import { useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  BsTelephone, BsKey, BsPerson, BsEnvelope,
  BsTelegram, BsMortarboard, BsGeoAlt, BsCardText,
} from "react-icons/bs";
import { IoClose } from "react-icons/io5";
import { RightDrawer } from "../common/RightDrawer";
import { useToast } from "../../Context/ToastContext";
import { useCreateStudentMutation, useLazyAllStudentsQuery } from "../../app/api/studentsApi/studentsApi";
import { extractApiError } from "../../utils/extractApiError";
import type { StudentGender } from "../../app/api/studentsApi/types";
import {
  useAllGroupsQuery,
  useAddStudentToGroupMutation,
  useFreezeStudentGroupMutation,
  useLazyStudentGroupsQuery,
} from "../../app/api/groupsApi/groupsApi";
import type { RootState } from "../../app/store";
import { DatePickerField } from "../../pages/SingleGroup/DatePickerField";
import { StudentTagsSelect } from "../StudentTagsSelect";

/* ─── shared styles ─── */
const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 13,
  color: "var(--color-text-primary)",
  outline: "none",
  boxSizing: "border-box",
  background: "var(--color-surface)",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "var(--color-text-primary)",
  marginBottom: 6,
  display: "block",
};

// Local calendar date as YYYY-MM-DD (toISOString() is UTC and lands on the
// previous day for the first hours after midnight in UTC+5).
const todayLocalISO = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/* ─── additional contact fields config (studentsApi maydonlariga mos) ─── */
type AdditionalFieldId = "parentPhone" | "passport" | "parentName" | "email" | "telegram" | "schoolName" | "location" | "instagram";

const ADDITIONAL_FIELDS: {
  id: AdditionalFieldId;
  icon: React.ReactNode;
  labelKey: string;
  inputType: string;
}[] = [
  { id: "parentPhone", icon: <BsTelephone size={16} />, labelKey: "addStudent.additional.phone", inputType: "tel" },
  { id: "passport", icon: <BsKey size={16} />, labelKey: "addStudent.additional.key", inputType: "text" },
  { id: "parentName", icon: <BsPerson size={16} />, labelKey: "addStudent.additional.contact", inputType: "text" },
  { id: "email", icon: <BsEnvelope size={16} />, labelKey: "addStudent.additional.email", inputType: "email" },
  { id: "telegram", icon: <BsTelegram size={16} />, labelKey: "addStudent.additional.telegram", inputType: "text" },
  { id: "schoolName", icon: <BsMortarboard size={16} />, labelKey: "addStudent.additional.education", inputType: "text" },
  { id: "location", icon: <BsGeoAlt size={16} />, labelKey: "addStudent.additional.location", inputType: "text" },
  { id: "instagram", icon: <BsCardText size={16} />, labelKey: "addStudent.additional.card", inputType: "text" },
];

interface AddStudentDrawerProps {
  open: boolean;
  onClose: () => void;
  /** ixtiyoriy: student muvaffaqiyatli qo'shilganda ishga tushadi (masalan, listni yangilash uchun) */
  onSuccess?: () => void;
}

export const AddStudent = ({ open, onClose, onSuccess }: AddStudentDrawerProps) => {
  const { t } = useTranslation();
  const toast = useToast();
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);
  const [createStudent, { isLoading: isSaving }] = useCreateStudentMutation();
  const [fetchStudents] = useLazyAllStudentsQuery();
  const { data: groupsData, isFetching: isGroupsLoading, isError: isGroupsError } = useAllGroupsQuery(
    { page: 1, limit: 100 },
    { skip: !open }
  );
  const [addStudentToGroup, { isLoading: isAssigning }] = useAddStudentToGroupMutation();
  const [freezeStudentGroup] = useFreezeStudentGroupMutation();
  const [fetchNewMembership] = useLazyStudentGroupsQuery();
  const groups = groupsData?.data ?? [];

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<StudentGender | "">("");
  const [comment, setComment] = useState("");
  const [showGroupField, setShowGroupField] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [group, setGroup] = useState("");
  const [joinedAt, setJoinedAt] = useState(todayLocalISO());
  const [password, setPassword] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Names of existing students who already use the entered phone. Several
  // students may share one number, so this only warns once: while it is set,
  // the next submit skips the check and creates the student ("Create anyway").
  const [duplicateNames, setDuplicateNames] = useState<string[]>([]);

  // har bir additional field uchun ochiq/yopiqligi
  const [openFields, setOpenFields] = useState<Record<AdditionalFieldId, boolean>>({
    parentPhone: false, passport: false, parentName: false, email: false,
    telegram: false, schoolName: false, location: false, instagram: false,
  });
  // har bir additional field uchun kiritilgan qiymat
  const [additionalValues, setAdditionalValues] = useState<Record<AdditionalFieldId, string>>({
    parentPhone: "", passport: "", parentName: "", email: "",
    telegram: "", schoolName: "", location: "", instagram: "",
  });

  const toggleField = (id: AdditionalFieldId) => {
    setOpenFields((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const closeField = (id: AdditionalFieldId) => {
    setOpenFields((prev) => ({ ...prev, [id]: false }));
    setFieldValue(id, "");
  };

  const setFieldValue = (id: AdditionalFieldId, value: string) => {
    setAdditionalValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleClose = () => {
    setPhone(""); setName(""); setDob(""); setGender("");
    setComment(""); setGroup(""); setJoinedAt(todayLocalISO()); setPassword(""); setTagIds([]); setError(null); setDuplicateNames([]);
    setShowGroupField(false); setShowPasswordField(false);
    setOpenFields({
      parentPhone: false, passport: false, parentName: false, email: false,
      telegram: false, schoolName: false, location: false, instagram: false,
    });
    setAdditionalValues({
      parentPhone: "", passport: "", parentName: "", email: "",
      telegram: "", schoolName: "", location: "", instagram: "",
    });
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);
    const fullPhone = phone ? `+998${phone.replace(/\D/g, "")}` : "";

    if (!name.trim()) { setError(t("addStudent.errors.name")); return; }
    if (!fullPhone && !additionalValues.email.trim()) { setError(t("addStudent.errors.contact")); return; }
    if (!selectedBranchId) { setError(t("addStudent.errors.branch")); return; }

    if (fullPhone && duplicateNames.length === 0) {
      try {
        // Server-side search by the phone's last 9 digits (no country code /
        // formatting), then an exact compare of those digits on the few hits
        // — instead of reading the branch's whole roster on every create.
        const key = fullPhone.replace(/\D/g, "").slice(-9);
        const found = await fetchStudents({ page: 1, limit: 20, search: key, branchId: selectedBranchId }).unwrap();
        const same = found.data.filter((s) => (s.phone ?? "").replace(/\D/g, "").slice(-9) === key);
        if (same.length > 0) {
          setDuplicateNames(same.map((s) => s.name));
          return;
        }
      } catch {
        // The check is only a courtesy — if it can't run, creating goes ahead.
      }
    }

    try {
      const created = await createStudent({
        name: name.trim(),
        password: password.trim() || undefined,
        phone: fullPhone || undefined,
        email: additionalValues.email.trim() || undefined,
        gender: gender || undefined,
        birthdate: dob || undefined,
        parentName: additionalValues.parentName.trim() || undefined,
        parentPhone: additionalValues.parentPhone.trim() || undefined,
        schoolName: additionalValues.schoolName.trim() || undefined,
        location: additionalValues.location.trim() || undefined,
        passport: additionalValues.passport.trim() || undefined,
        telegram: additionalValues.telegram.trim() || undefined,
        instagram: additionalValues.instagram.trim() || undefined,
        // POST /students `description` (Swagger: the student's general note) -
        // the Comment field of this form.
        description: comment.trim() || undefined,
        // Without this, the backend enrolled the new student in every branch
        // instead of just the one currently active in the header.
        branchIds: [selectedBranchId],
        tagIds: tagIds.length ? tagIds : undefined,
      }).unwrap();

      if (showGroupField && group) {
        try {
          // POST /student-groups (not POST /groups/{id}/students/assign):
          // confirmed live (see the same note in SingleGroup's
          // handleAddStudentSubmit) that the assign endpoint never creates a
          // /student-groups row, silently breaking freeze/unfreeze/
          // status-change for every student added through it. Starts on
          // PROBATION, then is immediately frozen — same "added → frozen,
          // staff activates later" flow SingleGroup's own Add student modal
          // uses, so a student added from here isn't treated as active
          // (and billed) before anyone meant it to be.
          await addStudentToGroup({ studentId: created.data.id, groupId: group, status: "PROBATION", joinedAt: joinedAt || todayLocalISO() }).unwrap();
          try {
            const membership = await fetchNewMembership({ groupId: group, studentId: created.data.id, limit: 1 }).unwrap();
            const newMembershipId = membership.rows[0]?.id;
            if (newMembershipId) {
              await freezeStudentGroup({
                id: newMembershipId,
                startDate: joinedAt || todayLocalISO(),
              }).unwrap();
            }
          } catch {
            // Non-fatal — the student is still added to the group, just not
            // frozen; staff can freeze/activate them manually from there.
          }
          toast.success(t("addStudent.toast.created"));
        } catch {
          toast.error(t("addStudent.toast.groupAssignFailed"));
        }
      } else {
        toast.success(t("addStudent.toast.created"));
      }

      onSuccess?.();
      handleClose();
    } catch (err) {
      const detail = extractApiError(err);
      const message = detail ? `${t("addStudent.errors.save")}: ${detail}` : t("addStudent.errors.save");
      setError(message);
      toast.error(message);
    }
  };

  return (
    <RightDrawer open={open} onClose={handleClose} title={t("addStudent.title")}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

        {/* Phone */}
        <div>
          <label style={labelStyle}>{t("addStudent.phone")}</label>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{
              ...inputStyle, width: 72, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--color-text-secondary)", fontWeight: 500,
            }}>+998</div>
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setDuplicateNames([]); }}
              placeholder="90 123 45 67"
              type="tel"
            />
          </div>
        </div>

        {/* Name */}
        <div>
          <label style={labelStyle}>{t("addStudent.name")}</label>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {/* Date of birth */}
        <div>
          <label style={labelStyle}>{t("addStudent.dob")}</label>
          <DatePickerField value={dob} onChange={setDob} />
        </div>

        {/* Gender */}
        <div>
          <label style={labelStyle}>{t("addStudent.gender")}</label>
          <div style={{ display: "flex", gap: 24 }}>
            {(["MALE", "FEMALE"] as const).map((g) => (
              <label key={g} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <div
                  onClick={() => setGender(g)}
                  style={{
                    width: 18, height: 18, borderRadius: "50%",
                    border: `2px solid ${gender === g ? "#185FA5" : "var(--color-border)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", flexShrink: 0,
                  }}
                >
                  {gender === g && <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#185FA5" }} />}
                </div>
                {g === "MALE" ? t("addStudent.male") : t("addStudent.female")}
              </label>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label style={labelStyle}>{t("addStudent.comment")}</label>
          <textarea
            style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        {/* Additional contacts */}
        <div>
          <label style={{ ...labelStyle, color: "var(--color-text-muted)", fontWeight: 400 }}>{t("addStudent.additionalContacts")}</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {ADDITIONAL_FIELDS.map((field) => (
              <button
                key={field.id}
                type="button"
                title={t(field.labelKey)}
                onClick={() => toggleField(field.id)}
                style={{
                  width: 40, height: 40,
                  border: `1.5px solid ${openFields[field.id] ? "#185FA5" : "#c5d8ec"}`,
                  borderRadius: "50%",
                  background: openFields[field.id] ? "var(--color-primary-surface)" : "var(--color-surface)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: openFields[field.id] ? "#185FA5" : "#4a7aaa",
                  transition: "background 0.15s, border-color 0.15s",
                }}
              >
                {field.icon}
              </button>
            ))}
          </div>

          {/* ochilgan additional inputlar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            {ADDITIONAL_FIELDS.filter((f) => openFields[f.id]).map((field) => (
              <div key={field.id}>
                <label style={labelStyle}>{t(field.labelKey)}</label>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  border: "1px solid var(--color-border)", borderRadius: 8,
                  padding: "0 6px 0 12px", background: "var(--color-surface)",
                }}>
                  <span style={{ color: "#4a7aaa", display: "flex", flexShrink: 0 }}>{field.icon}</span>
                  <input
                    style={{ flex: 1, border: "none", outline: "none", fontSize: 13, padding: "10px 0", background: "transparent", fontFamily: "inherit" }}
                    type={field.inputType}
                    value={additionalValues[field.id]}
                    onChange={(e) => setFieldValue(field.id, e.target.value)}
                    placeholder={t(field.labelKey)}
                  />
                  <button
                    type="button"
                    onClick={() => closeField(field.id)}
                    title={t("addStudent.removeField")}
                    style={{
                      width: 22, height: 22, borderRadius: "50%", border: "none",
                      background: "transparent", color: "var(--color-text-muted)", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}
                  >
                    <IoClose size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add to group */}
        <div>
          <span
            onClick={() => setShowGroupField((p) => !p)}
            style={{ fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer", userSelect: "none" }}
          >
            {t("addStudent.addToGroup")}
          </span>
          {showGroupField && (
            <>
              <select
                style={{ ...inputStyle, marginTop: 8, appearance: "none" }}
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                disabled={isGroupsLoading}
              >
                <option value="">
                  {isGroupsLoading
                    ? t("addStudent.groupLoading")
                    : t("addStudent.selectGroup")}
                </option>
                {!isGroupsLoading && groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}{g.time ? ` — ${g.time}` : ""}
                  </option>
                ))}
              </select>
              <div style={{ marginTop: 12 }}>
                <label style={labelStyle}>{t("students.addToGroup.joinedAt")}</label>
                <DatePickerField value={joinedAt} onChange={setJoinedAt} />
              </div>
              {isGroupsError && (
                <div style={{ fontSize: 12, color: "#d93f4f", marginTop: 6 }}>
                  {t("addStudent.groupError")}
                </div>
              )}
              {!isGroupsLoading && !isGroupsError && groups.length === 0 && (
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
                  {t("addStudent.noGroups")}
                </div>
              )}
            </>
          )}
        </div>

        {/* Tags — sent as tagIds */}
        <div>
          <label style={labelStyle}>{t("addStudent.tags", { defaultValue: "Tags" })}</label>
          <StudentTagsSelect value={tagIds} onChange={setTagIds} placeholder={t("addStudent.tagsPlaceholder", { defaultValue: "Add new tags" })} />
        </div>

        {/* Set password */}
        <div>
          <span
            onClick={() => setShowPasswordField((p) => !p)}
            style={{ fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer", userSelect: "none" }}
          >
            {t("addStudent.setPassword")}
          </span>
          {showPasswordField && (
            <input
              type="password"
              style={{ ...inputStyle, marginTop: 8 }}
              placeholder={t("addStudent.passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </div>

        {error && (
          <div style={{ fontSize: 13, color: "#d93f4f" }}>{error}</div>
        )}

        {duplicateNames.length > 0 && (
          <div style={{ fontSize: 13, color: "#b45309", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: "10px 12px" }}>
            {t("addStudent.duplicatePhone", { names: duplicateNames.join(", ") })}
          </div>
        )}

        {/* Submit */}
        <div style={{ marginTop: 4 }}>
          <button
            onClick={handleSubmit}
            disabled={isSaving || isAssigning}
            style={{
              background: "#4a7aaa", color: "#fff", border: "none",
              borderRadius: 20, padding: "11px 32px",
              fontSize: 14, fontWeight: 600, cursor: isSaving || isAssigning ? "default" : "pointer",
              opacity: isSaving || isAssigning ? 0.7 : 1,
            }}
          >
            {isSaving || isAssigning ? t("addStudent.saving") : duplicateNames.length > 0 ? t("addStudent.createAnyway") : t("addStudent.submit")}
          </button>
        </div>
      </div>
    </RightDrawer>
  );
};
