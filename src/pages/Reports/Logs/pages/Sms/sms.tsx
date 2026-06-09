import {
  Box,
  Typography,
  Chip,
  Button,
  Divider,
} from "@mui/material";
import { FiCircle } from "react-icons/fi";

interface SmsLog {
  id: number;
  message: string;
  quantity: number;
  date: string;
  time: string;
}

const smsLogs: SmsLog[] = [
  {
    id: 1,
    message: "Hurmatli, Muhiddinova Mahliyo! Oxford guruhi uchun to'lovingiz muvaffaqiyatli amalga oshirildi: 270000. Ustoz: Muhiddin Baratov.",
    quantity: 1,
    date: "14.05.2026",
    time: "13:22",
  },
  {
    id: 2,
    message: "Hurmatli, Xolmurodova Lola! Junior Academics guruhi uchun to'lovingiz muvaffaqiyatli amalga oshirildi: 175000. Ustoz: Nodirbek Xurramov.",
    quantity: 1,
    date: "14.05.2026",
    time: "10:57",
  },
  {
    id: 3,
    message: "Hurmatli, Trafimova Natsiya! Success Seekers guruhi uchun to'lovingiz muvaffaqiyatli amalga oshirildi: 250000. Ustoz: Tojimurodov Elchin.",
    quantity: 1,
    date: "14.05.2026",
    time: "10:52",
  },
  {
    id: 4,
    message: "Hurmatli, To'rayev Jasur! Success Seekers guruhi uchun to'lovingiz muvaffaqiyatli amalga oshirildi: 250000. Ustoz: Tojimurodov Elchin.",
    quantity: 1,
    date: "14.05.2026",
    time: "10:52",
  },
  {
    id: 5,
    message: "Hurmatli, O'rolov Davlatbek 2! Junior developers guruhi uchun to'lovingiz muvaffaqiyatli amalga oshirildi: 300000. Ustoz: Odilbek Safarov.",
    quantity: 1,
    date: "14.05.2026",
    time: "10:51",
  },
  {
    id: 6,
    message: "Hurmatli, Tursunmurodova E'zoza Dilshod qizi! Siz o'quv guruhiga qo'shildingiz. O'qituvchi: Khabib Abdullaev O'quv kunlari: Se, Pa, Sha Vaqt: 09:00 Kabinet: 6-xona Sizni Young Adultsda kutamiz!",
    quantity: 1,
    date: "14.05.2026",
    time: "10:47",
  },
  {
    id: 7,
    message: "Hurmatli, Normuhammadov Samir! Bright minds guruhi uchun to'lovingiz muvaffaqiyatli amalga oshirildi: 250000. Ustoz: Khabib Abdullaev.",
    quantity: 1,
    date: "14.05.2026",
    time: "10:44",
  },
  {
    id: 8,
    message: "Hurmatli, G'ulomboyeva Mushtariy! Siz o'quv guruhiga qo'shildingiz. O'qituvchi: Odilbek Safarov O'quv kunlari: Se, Pa, Sha Vaqt: 09:00 Kabinet: 8-xona Sizni Young Adultsda kutamiz!",
    quantity: 1,
    date: "14.05.2026",
    time: "10:33",
  },
  {
    id: 9,
    message: "Hurmatli, Kazakova Farzona! Siz o'quv guruhiga qo'shildingiz. O'qituvchi: Bekhruz Mansurov O'quv kunlari: Se, Pa, Sha Vaqt: 09:00 Kabinet: Room 3 Sizni Young Adultsda kutamiz!",
    quantity: 1,
    date: "14.05.2026",
    time: "10:18",
  },
  {
    id: 10,
    message: "Hurmatli, Sharafiddinova Hadya! Siz o'quv guruhiga qo'shildingiz. O'qituvchi: Bekhruz Mansurov O'quv kunlari: Se, Pa, Sha Vaqt: 09:00 Kabinet: Room 3 Sizni Young Adultsda kutamiz!",
    quantity: 1,
    date: "14.05.2026",
    time: "10:17",
  },
  {
    id: 11,
    message: "Hurmatli, Abdurashidov Muhammadali 2! Siz o'quv guruhiga qo'shildingiz. O'qituvchi: Bekhruz Mansurov O'quv kunlari: Se, Pa, Sha Vaqt: 09:00 Kabinet: Room 3 Sizni Young Adultsda kutamiz!",
    quantity: 1,
    date: "14.05.2026",
    time: "10:17",
  },
];

export const Sms = () => {
  return (
    <Box sx={{ m:5, minHeight: "100vh", bgcolor: "#fff", p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 500, mb: 3, color: "#212121" }}>
        Sent SMS log
      </Typography>

      <Box>
        {smsLogs.map((sms, index) => (
          <Box key={sms.id}>
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 1.5,
                py: 1.5,
              }}
            >
              {/* Circle icon */}
              <Box sx={{ mt: 0.3, flexShrink: 0 }}>
                <FiCircle size={18} color="#9e9e9e" />
              </Box>

              {/* System badge */}
              <Box sx={{ flexShrink: 0, mt: 0.1 }}>
                <Chip
                  label="System"
                  size="small"
                  variant="outlined"
                  sx={{
                    fontSize: "0.75rem",
                    height: 22,
                    borderColor: "#bdbdbd",
                    color: "#555",
                    borderRadius: "4px",
                  }}
                />
              </Box>

              {/* Message */}
              <Typography
                variant="body2"
                sx={{ flex: 1, color: "#212121", lineHeight: 1.6 }}
              >
                {sms.message}
              </Typography>

              {/* SMS quantity button */}
              <Box sx={{ flexShrink: 0, ml: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  disableElevation
                  sx={{
                    bgcolor: "#1a3a5c",
                    color: "#fff",
                    fontSize: "0.75rem",
                    textTransform: "none",
                    borderRadius: "4px",
                    px: 1.5,
                    py: 0.4,
                    whiteSpace: "nowrap",
                    "&:hover": { bgcolor: "#122a45" },
                  }}
                >
                  SMS quantity: {sms.quantity}
                </Button>
              </Box>

              {/* Not info button */}
              <Box sx={{ flexShrink: 0 }}>
                <Button
                  variant="outlined"
                  size="small"
                  disableElevation
                  sx={{
                    fontSize: "0.75rem",
                    textTransform: "none",
                    borderRadius: "4px",
                    px: 1.5,
                    py: 0.4,
                    borderColor: "#bdbdbd",
                    color: "#555",
                    whiteSpace: "nowrap",
                    "&:hover": { borderColor: "#9e9e9e", bgcolor: "transparent" },
                  }}
                >
                  Not info
                </Button>
              </Box>

              {/* Date & Time */}
              <Box
                sx={{
                  flexShrink: 0,
                  textAlign: "right",
                  minWidth: 80,
                }}
              >
                <Typography variant="caption" sx={{ color: "#555", display: "block" }}>
                  {sms.date}
                </Typography>
                <Typography variant="caption" sx={{ color: "#555", display: "block" }}>
                  {sms.time}
                </Typography>
              </Box>
            </Box>
            {index < smsLogs.length - 1 && <Divider />}
          </Box>
        ))}
      </Box>
    </Box>
  );
};