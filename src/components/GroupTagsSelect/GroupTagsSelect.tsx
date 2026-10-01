import { TagsSelect } from "../TagsSelect";

// Multi-select of GROUP-type tags, used by the create/edit group drawers —
// thin wrapper over the generic TagsSelect.
export const GroupTagsSelect = (props: {
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) => <TagsSelect type="GROUP" {...props} />;
