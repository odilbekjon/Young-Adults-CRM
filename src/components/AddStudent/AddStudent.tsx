import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Box,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  MenuItem,
} from "@mui/material";

type Props = {
  open: boolean;
  onClose: () => void;
};

export const AddStudentDialog = ({ open, onClose } : Props ) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>
        Add new student
      </DialogTitle>

      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          
          {/* Full name */}
          <TextField
            label="Full name"
            placeholder="Enter full name"
            fullWidth
          />

          {/* Date of birth */}
          <TextField
            type="date"
            label="Date of birth"
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          {/* Gender */}
          <Box>
            <Typography fontSize={14} mb={1}>
              Gender
            </Typography>
            <RadioGroup row>
              <FormControlLabel value="male" control={<Radio />} label="Male" />
              <FormControlLabel value="female" control={<Radio />} label="Female" />
            </RadioGroup>
          </Box>

          {/* Phone */}
          <TextField
            label="Phone number"
            placeholder="+998 90 123 45 67"
            fullWidth
          />

          {/* Parent phone */}
          <TextField
            label="Parent phone number"
            placeholder="+998 90 123 45 67"
            fullWidth
          />

          {/* Password */}
          <TextField
            label="Password"
            type="password"
            placeholder="Enter password"
            fullWidth
          />

          {/* Group + Date */}
          <Box display="flex" gap={2}>
            <TextField
              select
              label="Select group"
              fullWidth
            >
              <MenuItem value="frontend">Frontend</MenuItem>
              <MenuItem value="backend">Backend</MenuItem>
            </TextField>

            <TextField
              type="date"
              label="Date from"
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>

          {/* Button */}
          <Button
            variant="contained"
            fullWidth
            sx={{
              mt: 2,
              py: 1.5,
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            Add student
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};