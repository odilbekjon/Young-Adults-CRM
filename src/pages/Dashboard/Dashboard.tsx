import { Box, Typography, Paper } from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const data = [
  { month: "Jan", payment: 20000000, profit: 12000000 },
  { month: "Feb", payment: 35000000, profit: 21000000 },
  { month: "Mar", payment: 40000000, profit: 28000000 },
  { month: "Apr", payment: 30000000, profit: 19000000 },
  { month: "May", payment: 50000000, profit: 35000000 },
  { month: "Jun", payment: 60000000, profit: 42000000 },
];


export const Dashboard = () => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        pt: 2,
        px: 4,
        pb: 2,
      }}
    >
      {/* ===== PAGE HEADER ===== */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4" fontWeight={700}>
          Dashboard
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Young Adults o‘quv markazi boshqaruv paneli
        </Typography>
      </Box>

      {/* ===== STATS GRID ===== */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: 3,
        }}
      >
        <Paper sx={cardStyle}>
          <Typography variant="body2">Aktiv Talabalar</Typography>
          <Typography variant="h4" fontWeight={700}>
            320
          </Typography>
        </Paper>

        <Paper sx={cardStyle}>
          <Typography variant="body2">Guruhlar</Typography>
          <Typography variant="h4" fontWeight={700}>
            50
          </Typography>
        </Paper>

        <Paper sx={cardStyle}>
          <Typography variant="body2">Qarzdorlar</Typography>
          <Typography variant="h4" fontWeight={700}>
            10
          </Typography>
        </Paper>

        <Paper sx={cardStyle}>
          <Typography variant="body2">Sinov Darsida</Typography>
          <Typography variant="h4" fontWeight={700}>
            10
          </Typography>
        </Paper>

        <Paper sx={cardStyle}>
          <Typography variant="body2">Kurslar</Typography>
          <Typography variant="h4" fontWeight={700}>
            8
          </Typography>
        </Paper>

        <Paper sx={cardStyle}>
          <Typography variant="body2">O‘qituvchilar</Typography>
          <Typography variant="h4" fontWeight={700}>
            12
          </Typography>
        </Paper>

        <Paper sx={cardStyle}>
          <Typography variant="body2">Filiallar</Typography>
          <Typography variant="h4" fontWeight={700}>
            3
          </Typography>
        </Paper>
      </Box>

       <Paper
      sx={{
        mt: 6,
        p: 4,
        borderRadius: 4,
      }}
    >
      <Typography variant="h6" fontWeight={600} mb={3}>
        To‘lovlar va Sof Foyda
      </Typography>

      <Box height={350}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="month" />
            <YAxis />

          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) =>
              new Intl.NumberFormat("uz-UZ").format(Number(value)) + " UZS"
            }
          />

            <Line
              type="monotone"
              dataKey="payment"
              stroke="#facc15"
              strokeWidth={3}
              name="To‘lovlar"
            />

            <Line
              type="monotone"
              dataKey="profit"
              stroke="#22c55e"
              strokeWidth={3}
              name="Sof foyda"
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>

      {/* ===== INFO BLOCK ===== */}
      <Paper
        sx={{
          mt: 6,
          p: 4,
          borderRadius: 4,
          boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
        }}
      >
        <Typography variant="h6" fontWeight={600} mb={1}>
          Bugungi holat
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Bugun 4 ta yangi talaba ro‘yxatdan o‘tdi. 2 ta yangi guruh ish
          boshladi. Dashboard orqali barcha jarayonlarni real vaqt rejimida
          kuzatishingiz mumkin.
        </Typography>
      </Paper>
    </Box>
  );
};

/* ===== CARD STYLE ===== */

const cardStyle = {
  p: 3,
  height: 120,
  borderRadius: 4,
  background: "linear-gradient(135deg,#facc15,#fde68a)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  boxShadow: "0 8px 25px rgba(0,0,0,0.06)",
  transition: "0.25s",
  cursor: "pointer",

  "&:hover": {
    transform: "translateY(-5px)",
    boxShadow: "0 15px 35px rgba(0,0,0,0.1)",
  },
};