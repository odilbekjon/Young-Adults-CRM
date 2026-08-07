// src/pages/groups/EditGroupDrawer.tsx
import { CSSProperties } from "react";
import { HiChevronDown } from "react-icons/hi";
import { useTranslation } from "react-i18next";
import { RightDrawer } from "../../../components/RightDrawer";
import { inputStyle, labelStyle, submitBtn, cancelBtn } from "../styles";
import { TEACHERS_DATA } from "../../../constants/Teachers";
import { defaultCourses } from "../../../constants/CoursesData";

const TEACHERS_LIST = [...new Set(TEACHERS_DATA.map((t) => t.fullName))];

const COURSES = defaultCourses.map((c) => c.name);

const ROOMS = [
  ...new Set(TEACHERS_DATA.flatMap((t) => t.groups.map((g) => g.room))),
];

// NOTE: values kept as-is (used as lookup/match keys against group.days);
// only the displayed label is translated via DAYS_OPTION_LABEL_KEYS.
const DAYS_OPTIONS = [
  "Odd days",
  "Even days",
  "Every day",
];

const DAYS_OPTION_LABEL_KEYS: Record<string, string> = {
  "Odd days": "oddDays",
  "Even days": "evenDays",
  "Every day": "everyDay",
};

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
  defaultValue,
  options,
  placeholder,
  getLabel,
}: {
  label: string;
  defaultValue?: string;
  options: string[];
  placeholder?: string;
  getLabel?: (opt: string) => string;
}) => (
  <div>
    <label style={labelStyle}>{label}</label>
    <div style={selectWrapperStyle}>
      <select style={selectStyle} defaultValue={defaultValue || ""}>
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {getLabel ? getLabel(opt) : opt}
          </option>
        ))}
      </select>
      <HiChevronDown size={16} style={chevronStyle} />
    </div>
  </div>
);

export const EditGroupDrawer = ({
  group, open, onClose,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  group: any;
  open: boolean;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <RightDrawer open={open} onClose={onClose} title={t("singleGroup.editGroupDrawer.title")}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <label style={labelStyle}>{t("singleGroup.editGroupDrawer.groupName")}</label>
          <input style={inputStyle} defaultValue={group.name} type="text" />
        </div>

        <SelectField
          label={t("singleGroup.editGroupDrawer.selectCourse")}
          defaultValue={group.course}
          options={COURSES}
          placeholder={t("singleGroup.editGroupDrawer.selectCourse")}
        />

        <SelectField
          label={t("singleGroup.editGroupDrawer.selectTeacher")}
          defaultValue={group.teacher}
          options={TEACHERS_LIST}
          placeholder={t("singleGroup.editGroupDrawer.selectTeacher")}
        />

        <SelectField
          label={t("singleGroup.editGroupDrawer.days")}
          defaultValue={group.days}
          options={DAYS_OPTIONS}
          placeholder={t("singleGroup.editGroupDrawer.selectDays")}
          getLabel={(opt) => t(`singleGroup.editGroupDrawer.daysOptions.${DAYS_OPTION_LABEL_KEYS[opt]}`)}
        />

        <SelectField
          label={t("singleGroup.editGroupDrawer.selectRoom")}
          defaultValue={group.room}
          options={ROOMS}
          placeholder={t("singleGroup.editGroupDrawer.selectRoom")}
        />

        <div>
          <label style={labelStyle}>{t("singleGroup.editGroupDrawer.priceUzs")}</label>
          <input
            style={inputStyle}
            defaultValue={group.price || ""}
            type="number"
          />
        </div>

        <div>
          <label style={labelStyle}>{t("singleGroup.editGroupDrawer.lessonStartTime")}</label>
          <input
            style={inputStyle}
            type="time"
            defaultValue={group.lessonStartTime}
          />
        </div>

        <div>
          <label style={labelStyle}>{t("singleGroup.editGroupDrawer.groupStartDate")}</label>
          <input style={inputStyle} type="date" defaultValue={group.startDate} />
        </div>
        <div>
          <label style={labelStyle}>{t("singleGroup.editGroupDrawer.groupEndDate")}</label>
          <input style={inputStyle} type="date" defaultValue={group.endDate} />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button style={submitBtn} onClick={onClose}>{t("singleGroup.editGroupDrawer.save")}</button>
          <button style={cancelBtn} onClick={onClose}>{t("singleGroup.editGroupDrawer.cancel")}</button>
        </div>
      </div>
    </RightDrawer>
  );
};

export default EditGroupDrawer;