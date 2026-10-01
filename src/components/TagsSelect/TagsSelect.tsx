import { Checkbox, Chip, ListItemText, MenuItem, Select, Stack } from "@mui/material";
import { useTagsSelectQuery } from "../../app/api/tagsApi";

// Multi-select of tags of one type (GET /tags/select?type=STUDENT|GROUP) —
// tags are managed in Settings > Tags and never hardcoded. The value is the
// list of tag ids sent as `tagIds` on the students / groups create & update
// endpoints.
export const TagsSelect = ({
  type, value, onChange, placeholder = "Add new tags", disabled,
}: {
  type: "STUDENT" | "GROUP";
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) => {
  const { data: tags } = useTagsSelectQuery({ type });
  const options = tags ?? [];

  return (
    <Select
      multiple
      displayEmpty
      fullWidth
      size="small"
      disabled={disabled}
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        onChange(typeof v === "string" ? v.split(",") : v);
      }}
      renderValue={(selected) =>
        selected.length === 0 ? (
          <span style={{ color: "#9ca3af" }}>{placeholder}</span>
        ) : (
          <Stack direction="row" flexWrap="wrap" gap={0.5}>
            {selected.map((id) => (
              <Chip key={id} size="small" label={options.find((tag) => tag.id === id)?.name ?? "…"} />
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
      {options.length === 0 && (
        <MenuItem disabled sx={{ fontSize: 13 }}>No tags</MenuItem>
      )}
      {options.map((tag) => (
        <MenuItem key={tag.id} value={tag.id} sx={{ fontSize: 13, py: 0.25 }}>
          <Checkbox size="small" checked={value.includes(tag.id)} sx={{ p: 0.5, mr: 1 }} />
          <ListItemText primary={tag.name} primaryTypographyProps={{ fontSize: 13 }} />
        </MenuItem>
      ))}
    </Select>
  );
};
