// src/pages/groups/EditGroupDrawer.tsx
import { RightDrawer } from "../../../components/RightDrawer";
import { inputStyle, labelStyle, submitBtn, cancelBtn } from "../styles";

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
      {[
        { label: "Group name", defaultValue: group.name },
        { label: "Course", defaultValue: group.course },
        { label: "Teacher", defaultValue: group.teacher },
        { label: "Branch", defaultValue: group.branch || "" },
        { label: "Price (UZS)", defaultValue: group.price || "", type: "number" },
        { label: "Room", defaultValue: group.room || "" },
      ].map(({ label, defaultValue, type }) => (
        <div key={label}>
          <label style={labelStyle}>{label}</label>
          <input style={inputStyle} defaultValue={defaultValue} type={type || "text"} />
        </div>
      ))}
      <div>
        <label style={labelStyle}>Start date</label>
        <input style={inputStyle} type="date" defaultValue={group.startDate} />
      </div>
      <div>
        <label style={labelStyle}>End date</label>
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