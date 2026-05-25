import { useState, useRef } from "react";
import {
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  Button,
  Paper,
  Divider,
} from "@mui/material";
import { FiUpload } from "react-icons/fi";

import logo from "../../../../../../assets/logo_ya_black.png";

interface InvoiceSettings {
  hideLogo: boolean;
  hideImageField: boolean;
  hideTextField: boolean;
  hideCheckNumber: boolean;
  hideCompany: boolean;
  hideBranch: boolean;
  hideStudent: boolean;
  hidePhone: boolean;
  hideBalance: boolean;
  hideGroup: boolean;
  hideCoursePrice: boolean;
  hideTeacher: boolean;
  hideType: boolean;
  hidePaymentAmount: boolean;
  hideDate: boolean;
  hideCreator: boolean;
  hideTime: boolean;
}

const defaultSettings: InvoiceSettings = {
  hideLogo: false,
  hideImageField: false,
  hideTextField: false,
  hideCheckNumber: false,
  hideCompany: false,
  hideBranch: false,
  hideStudent: false,
  hidePhone: false,
  hideBalance: false,
  hideGroup: false,
  hideCoursePrice: false,
  hideTeacher: false,
  hideType: false,
  hidePaymentAmount: false,
  hideDate: false,
  hideCreator: false,
  hideTime: false,
};

const Invoice = () => {
  const [settings, setSettings] = useState<InvoiceSettings>(defaultSettings);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (key: keyof InvoiceSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleSave = () => {
    console.log("Saved settings:", settings);
  };

  const handleCancel = () => {
    setSettings(defaultSettings);
    setFileName("");
  };

  const checkboxItems: { key: keyof InvoiceSettings; label: string }[] = [
    { key: "hideLogo", label: "Hide: Logo" },
    { key: "hideImageField", label: "Hide: Image fild" },
    { key: "hideTextField", label: "Hide: Text fild" },
    { key: "hideCheckNumber", label: "Hide: Check number" },
    { key: "hideCompany", label: "Hide: Company" },
    { key: "hideBranch", label: "Hide: Branch" },
    { key: "hideStudent", label: "Hide: Student" },
    { key: "hidePhone", label: "Hide: Phone" },
    { key: "hideBalance", label: "Hide: Balance" },
    { key: "hideGroup", label: "Hide: Group" },
    { key: "hideCoursePrice", label: "Hide: Course price" },
    { key: "hideTeacher", label: "Hide: Teacher" },
    { key: "hideType", label: "Hide: Type" },
    { key: "hidePaymentAmount", label: "Hide: Payment amount" },
    { key: "hideDate", label: "Hide: Date" },
    { key: "hideCreator", label: "Hide: Creator" },
    { key: "hideTime", label: "Hide: Time" },
  ];

  return (
    <Box sx={{ p: 3, }}>
      <Typography variant="h6" fontWeight={600} mb={3}>
        Invoice
      </Typography>

      <Box sx={{ display: "flex", gap: 30, alignItems: "flex-start" }}>
        <Box sx={{ flex: 1, minWidth: 280 }}>
          {checkboxItems.map((item) => (
            <Box key={item.key}>
              {item.key === "hideImageField" && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    my: 1,
                    ml: 4,
                  }}
                >
                  <Box
                    sx={{
                      flex: 1,
                      border: "1px solid #ccc",
                      borderRadius: "4px 0 0 4px",
                      px: 1.5,
                      py: 0.6,
                      fontSize: 13,
                      color: fileName ? "#333" : "#999",
                      bgcolor: "#fff",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fileName || "No file chosen"}
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => fileInputRef.current?.click()}
                    startIcon={<FiUpload size={14} />}
                    sx={{
                      borderRadius: "0 4px 4px 0",
                      textTransform: "none",
                      fontSize: 13,
                      px: 2,
                      borderLeft: "none",
                      minWidth: 90,
                      height: 36,
                    }}
                  >
                    Browse
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    onChange={handleFileChange}
                  />
                </Box>
              )}

              <FormControlLabel
                control={
                  <Checkbox
                    checked={settings[item.key]}
                    onChange={() => handleChange(item.key)}
                    size="small"
                    sx={{ py: 0.3 }}
                  />
                }
                label={
                  <Typography fontSize={14}>{item.label}</Typography>
                }
                sx={{ display: "flex", ml: 0 }}
              />
            </Box>
          ))}

          <Box sx={{ display: "flex", gap: 1.5, mt: 3 }}>
            <Button
              variant="contained"
              onClick={handleSave}
              sx={{
                textTransform: "none",
                bgcolor: "#1976d2",
                px: 3,
                fontWeight: 500,
              }}
            >
              Save
            </Button>
            <Button
              variant="outlined"
              onClick={handleCancel}
              sx={{
                textTransform: "none",
                color: "#555",
                borderColor: "#ccc",
                px: 3,
                fontWeight: 500,
              }}
            >
              Cancel
            </Button>
          </Box>
        </Box>

        <Box sx={{ flexShrink: 0, width: 220 }}>
          <Paper
            elevation={3}
            sx={{
              borderRadius: 3,
              overflow: "hidden",
              border: "1px solid #e0e0e0",
              position: "relative",
              "&::before": {
                content: '""',
                display: "block",
                height: 8,
                background:
                  "repeating-linear-gradient(90deg, #e0e0e0 0px, #e0e0e0 8px, transparent 8px, transparent 16px)",
              },
              "&::after": {
                content: '""',
                display: "block",
                height: 8,
                background:
                  "repeating-linear-gradient(90deg, #e0e0e0 0px, #e0e0e0 8px, transparent 8px, transparent 16px)",
              },
            }}
          >
            <Box sx={{ px: 2.5, pt: 2, pb: 2 }}>
              {!settings.hideLogo && (
                <Box sx={{ mb: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <img className="block mx-auto" src={logo} width={100} height={100} alt="Young Adults Logo" />
                  </Box>
                </Box>
              )}

              {/* Image field */}
              {!settings.hideImageField && (
                <Box
                  sx={{
                    width: "100%",
                    height: 30,
                    border: "1px solid #ddd",
                    borderRadius: 1,
                    mb: 1.5,
                    bgcolor: "#fafafa",
                  }}
                />
              )}

              <Divider sx={{ mb: 1 }} />

              {/* Invoice fields */}
              <Box sx={{ "& > *": { mb: 0.3 } }}>
                {!settings.hideCheckNumber && (
                  <PreviewRow label="Check number:" value="№12345" />
                )}
                {!settings.hideCompany && (
                  <PreviewRow label="Company:" value="Young Adults" />
                )}
                {!settings.hideBranch && (
                  <PreviewRow label="Branch:" value="YA IELTS Campus" />
                )}
                {!settings.hideStudent && (
                  <PreviewRow label="Student:" value="Student Name" />
                )}
                {!settings.hidePhone && (
                  <PreviewRow label="Phone:" value="+998901234567" />
                )}
                {!settings.hideBalance && (
                  <PreviewRow label="Balance:" value="1,000 UZS" />
                )}
                {!settings.hideGroup && (
                  <PreviewRow label="Group:" value="Group Name" />
                )}
                {!settings.hideCoursePrice && (
                  <PreviewRow label="Course price:" value="200,000 UZS" />
                )}
                {!settings.hideTeacher && (
                  <PreviewRow label="Teacher:" value="Teacher Name" />
                )}
                {!settings.hideType && (
                  <PreviewRow label="Type:" value="Cash" />
                )}
                {!settings.hidePaymentAmount && (
                  <PreviewRow label="Payment amount:" value="200,000 UZS" />
                )}
                {!settings.hideDate && (
                  <PreviewRow label="Date:" value="01.01.2025" />
                )}
              </Box>

              {/* Creator / Time */}
              {(!settings.hideCreator || !settings.hideTime) && (
                <Box sx={{ mt: 1.5 }}>
                  {!settings.hideCreator && (
                    <PreviewRow label="Creator:" value="Admin Name" small />
                  )}
                  {!settings.hideTime && (
                    <PreviewRow
                      label="Time:"
                      value="01.01.2025 10:00"
                      small
                    />
                  )}
                </Box>
              )}
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

const PreviewRow = ({
  label,
  value,
  small = false,
}: {
  label: string;
  value: string;
  small?: boolean;
}) => (
  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
    <Typography
      sx={{
        fontSize: small ? 9 : 10,
        fontWeight: 600,
        color: "#333",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontSize: small ? 9 : 10,
        color: "#555",
      }}
    >
      {value}
    </Typography>
  </Box>
);

export default Invoice;