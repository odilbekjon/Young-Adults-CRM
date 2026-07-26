// src/pages/groups/EditGroupDrawer.tsx
import { CSSProperties } from "react";
import { HiChevronDown } from "react-icons/hi";
import { RightDrawer } from "../../../components/RightDrawer";
import { inputStyle, labelStyle, submitBtn, cancelBtn } from "../styles";
import { TEACHERS_DATA } from "../../../constants/Teachers";
import { defaultCourses } from "../../../constants/CoursesData";

const TEACHERS_LIST = [...new Set(TEACHERS_DATA.map((t) => t.fullName))];

const COURSES = defaultCourses.map((c) => c.name);

const ROOMS = [
  ...new Set(TEACHERS_DATA.flatMap((t) => t.groups.map((g) => g.room))),
];

const DAYS_OPTIONS = [
  "Odd days",
  "Even days",
  "Every day",
];

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
}: {
  label: string;
  defaultValue?: string;
  options: string[];
  placeholder?: string;
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
            {opt}
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
}) => (
  <RightDrawer open={open} onClose={onClose} title="Edit Group">
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <label style={labelStyle}>Group name</label>
        <input style={inputStyle} defaultValue={group.name} type="text" />
      </div>

      <SelectField
        label="Select course"
        defaultValue={group.course}
        options={COURSES}
        placeholder="Select course"
      />

      <SelectField
        label="Select teacher"
        defaultValue={group.teacher}
        options={TEACHERS_LIST}
        placeholder="Select teacher"
      />

      <SelectField
        label="Days"
        defaultValue={group.days}
        options={DAYS_OPTIONS}
        placeholder="Select days"
      />

      <SelectField
        label="Select room"
        defaultValue={group.room}
        options={ROOMS}
        placeholder="Select room"
      />

      <div>
        <label style={labelStyle}>Price (UZS)</label>
        <input
          style={inputStyle}
          defaultValue={group.price || ""}
          type="number"
        />
      </div>

      <div>
        <label style={labelStyle}>Lesson start time</label>
        <input
          style={inputStyle}
          type="time"
          defaultValue={group.lessonStartTime}
        />
      </div>

      <div>
        <label style={labelStyle}>Group start date</label>
        <input style={inputStyle} type="date" defaultValue={group.startDate} />
      </div>
      <div>
        <label style={labelStyle}>Group end date</label>
        <input style={inputStyle} type="date" defaultValue={group.endDate} />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button style={submitBtn} onClick={onClose}>Save</button>
        <button style={cancelBtn} onClick={onClose}>Cancel</button>
      </div>
    </div>
  </RightDrawer>
);

export default EditGroupDrawer;