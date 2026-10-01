import { TagsSelect } from "../TagsSelect";

// Multi-select of STUDENT-type tags, shared by the Add student form and both
// Edit student drawers — thin wrapper over the generic TagsSelect.
export const StudentTagsSelect = (props: {
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) => <TagsSelect type="STUDENT" {...props} />;
