import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BsTelephone, BsKey, BsPerson, BsEnvelope,
  BsTelegram, BsMortarboard, BsGeoAlt, BsCardText,
} from "react-icons/bs";
import { MdCalendarToday } from "react-icons/md";
import { IoClose } from "react-icons/io5";
import { RightDrawer } from "../common/RightDrawer";
import { useData } from "../../Context/DataContext";
import { useToast } from "../../Context/ToastContext";
import { useCreateStudentMutation } from "../../app/api/studentsApi/studentsApi";
import type { StudentGender } from "../../app/api/studentsApi/types";

/* ─── shared styles ─── */
const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #e0e0e0",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 13,
  color: "#1a1a1a",
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "#1a1a1a",
  marginBottom: 6,
  display: "block",
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
  const { groups } = useData();
  const toast = useToast();
  const [createStudent, { isLoading: isSaving }] = useCreateStudentMutation();

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<StudentGender | "">("");
  const [comment, setComment] = useState("");
  const [showGroupField, setShowGroupField] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [group, setGroup] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

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
    setComment(""); setGroup(""); setPassword(""); setError(null);
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

    try {
      await createStudent({
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
      }).unwrap();
      toast.success(t("addStudent.toast.created"));
      onSuccess?.();
      handleClose();
    } catch {
      setError(t("addStudent.errors.save"));
      toast.error(t("addStudent.errors.save"));
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
              color: "#555", fontWeight: 500,
            }}>+998</div>
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
          <div style={{ position: "relative" }}>
            <MdCalendarToday size={14} style={{
              position: "absolute", left: 12, top: "50%",
              transform: "translateY(-50%)", color: "#aaa", pointerEvents: "none",
            }} />
            <input
              type="date"
              style={{ ...inputStyle, paddingLeft: 34, color: dob ? "#1a1a1a" : "#aaa" }}
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>
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
                    border: `2px solid ${gender === g ? "#185FA5" : "#ccc"}`,
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
          <label style={{ ...labelStyle, color: "#888", fontWeight: 400 }}>{t("addStudent.additionalContacts")}</label>
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
                  background: openFields[field.id] ? "#eaf3fc" : "#fff",
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
                  border: "1px solid #e0e0e0", borderRadius: 8,
                  padding: "0 6px 0 12px", background: "#fff",
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
                      background: "transparent", color: "#9ca3af", cursor: "pointer",
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
            style={{ fontSize: 13, color: "#555", cursor: "pointer", userSelect: "none" }}
          >
            {t("addStudent.addToGroup")}
          </span>
          {showGroupField && (
            <select
              style={{ ...inputStyle, marginTop: 8, appearance: "none" }}
              value={group}
              onChange={(e) => setGroup(e.target.value)}
            >
              <option value="">{t("addStudent.selectGroup")}</option>
              {groups.map((g) => (
                <option key={g.id} value={String(g.id)}>{g.name} — {g.schedule}</option>
              ))}
            </select>
          )}
        </div>

        {/* Set password */}
        <div>
          <span
            onClick={() => setShowPasswordField((p) => !p)}
            style={{ fontSize: 13, color: "#555", cursor: "pointer", userSelect: "none" }}
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

        {/* Submit */}
        <div style={{ marginTop: 4 }}>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            style={{
              background: "#4a7aaa", color: "#fff", border: "none",
              borderRadius: 20, padding: "11px 32px",
              fontSize: 14, fontWeight: 600, cursor: isSaving ? "default" : "pointer",
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            {isSaving ? t("addStudent.saving") : t("addStudent.submit")}
          </button>
        </div>
      </div>
    </RightDrawer>
  );
};
