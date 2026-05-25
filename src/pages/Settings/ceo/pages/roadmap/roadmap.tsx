import { useState } from "react";
import { Box, Typography, TextField, Paper } from "@mui/material";

interface Question {
  id: string;
  text: string;
}

interface Section {
  name: string;
  color: string;
  questions: Question[];
}

const sections: Section[] = [
  {
    name: "Marketing",
    color: "#fef9e7",
    questions: [
      { id: "m1", text: "Annual marketing strategy structured" },
      { id: "m2", text: "Every quarter and monthly marketing plans are available" },
      { id: "m3", text: "Used in internet marketing" },
      { id: "m4", text: "Used in offline marketing" },
      { id: "m5", text: "The marketing department has a systematic workflow" },
      { id: "m6", text: "Marketing employees have an organizational structure" },
      { id: "m7", text: "The responsibilities of the marketing department are clearly spelled out" },
      { id: "m8", text: "Marketing employees have clear KPIs" },
      { id: "m9", text: "Automated payment acceptance" },
      { id: "m10", text: "Conversion is measured" },
      { id: "m11", text: "Established work with departing clients" },
      { id: "m12", text: "CRM is used for file management" },
      { id: "m13", text: "Monthly Marketing ROI Budget Measured" },
      { id: "m14", text: "Marketing budget planning is done" },
    ],
  },
  {
    name: "Sales",
    color: "#eaf4ea",
    questions: [
      { id: "s1", text: "There is a sales department" },
      { id: "s2", text: "The work of the sales department is separate from the administrative department" },
      { id: "s3", text: "Call center available" },
      { id: "s4", text: "Call center automated" },
      { id: "s5", text: "Monthly sales plans are available" },
      { id: "s6", text: "The sales department has a bonus / KPI system" },
      { id: "s7", text: "The funnel is controlled through CRM" },
      { id: "s8", text: "Sales scripts available" },
      { id: "s9", text: "There is a system of continuous professional development of managers" },
    ],
  },
  {
    name: "Service",
    color: "#fdecea",
    questions: [
      { id: "sv1", text: "Service department is formed separately" },
      { id: "sv2", text: "The responsibilities of the department employees are clearly spelled out" },
      { id: "sv3", text: "A separate script is made for the section" },
      { id: "sv4", text: "Managed through CRM" },
      { id: "sv5", text: "CJM system established" },
      { id: "sv6", text: "The arrival time of employees to work is monitored" },
      { id: "sv7", text: "There are checklists of functions" },
      { id: "sv8", text: "The workflow is automated" },
      { id: "sv9", text: "There are quality standards for service" },
    ],
  },
  {
    name: "Finance",
    color: "#f0f0f0",
    questions: [
      { id: "f1", text: "Financial timetable" },
      { id: "f2", text: "Costs come with a flat rate" },
      { id: "f3", text: "Work on cost optimization" },
      { id: "f4", text: "Processes are automated" },
      { id: "f5", text: "Budgeting done" },
      { id: "f6", text: "KPI system established" },
    ],
  },
  {
    name: "Administrative",
    color: "#fdf3e7",
    questions: [
      { id: "a1", text: "Search and recruitment of personnel are automated" },
      { id: "a2", text: "Employee responsibilities are spelled out" },
      { id: "a3", text: "All materials are prepared for the adaptation period" },
      { id: "a4", text: "Scheduled appointments and monthly appointments established" },
      { id: "a5", text: "Established daily monitoring of indicators" },
      { id: "a6", text: "All processes are controlled in CRM" },
      { id: "a7", text: "Tracking of assignments is applied" },
      { id: "a8", text: "There is a director's position, the business owner intervenes at the strategy level" },
    ],
  },
];

const MAX_SCORE = 60;

export const Roadmap = () => {
  const [scores, setScores] = useState<Record<string, string>>({});

  const handleScore = (id: string, val: string) => {
    const num = parseFloat(val);
    if (val === "" || (!isNaN(num) && num >= 0 && num <= 10)) {
      setScores((prev) => ({ ...prev, [id]: val }));
    }
  };

  const totalScore = Object.values(scores).reduce((acc, v) => {
    const n = parseFloat(v);
    return acc + (isNaN(n) ? 0 : n);
  }, 0);

  const ScoreHeader = () => (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "80px 1fr 180px 180px 1fr",
        bgcolor: "#cdd5e8",
        borderRadius: "4px 4px 0 0",
        mb: 0,
      }}
    >
      <Box />
      <Box sx={{ p: 2 }}>
        <Typography fontWeight={600} fontSize={16}>Overall score</Typography>
      </Box>
      <Box sx={{ p: 2 }}>
        <Typography fontSize={13} color="#555">Maximum Score:</Typography>
        <Typography fontWeight={600} fontSize={14}>{MAX_SCORE}</Typography>
      </Box>
      <Box sx={{ p: 1.5 }}>
        <Typography fontSize={13} color="#555" mb={0.5}>Your score:</Typography>
        <Box sx={{ bgcolor: "#f5c842", borderRadius: 1, py: 0.6, px: 1, textAlign: "center" }}>
          <Typography fontWeight={600} fontSize={14}>{totalScore.toFixed(1)}</Typography>
        </Box>
      </Box>
      <Box />
    </Box>
  );

  return (
    <Box sx={{ p: 3, bgcolor: "#f5f5f5", minHeight: "100vh" }}>
      <Typography variant="h5" fontWeight={400} mb={3}>Audit</Typography>

      <Paper elevation={0} variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        {/* Top score header */}
        <ScoreHeader />

        {/* Column headers */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "80px 1fr 180px 180px 1fr",
            borderBottom: "1px solid #e0e0e0",
            bgcolor: "#fff",
          }}
        >
          {["Section", "Question", "Ball (max. score 10)", "Result", "Instructions"].map((col) => (
            <Box key={col} sx={{ px: 2, py: 1.2 }}>
              <Typography fontSize={13} fontWeight={600} color="#333">{col}</Typography>
            </Box>
          ))}
        </Box>

        {/* Sections */}
        {sections.map((section) => (
          <Box key={section.name} sx={{ display: "flex", flexDirection: "column" }}>
            {section.questions.map((q, qi) => (
              <Box
                key={q.id}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "80px 1fr 180px 180px 1fr",
                  borderBottom: "1px solid #eeeeee",
                  minHeight: 48,
                  alignItems: "center",
                }}
              >
                {/* Section label — only on first row, spans all rows via relative positioning */}
                <Box
                  sx={{
                    bgcolor: section.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    alignSelf: "stretch",
                    borderRight: "1px solid #e0e0e0",
                  }}
                >
                  {qi === Math.floor(section.questions.length / 2) && (
                    <Typography
                      fontSize={12}
                      fontWeight={500}
                      color="#555"
                      sx={{
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                        letterSpacing: 1,
                        userSelect: "none",
                      }}
                    >
                      {section.name}
                    </Typography>
                  )}
                </Box>

                {/* Question */}
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography fontSize={13} color="#333">{q.text}</Typography>
                </Box>

                {/* Ball input */}
                <Box sx={{ px: 2, py: 1, display: "flex", justifyContent: "center" }}>
                  <TextField
                    size="small"
                    value={scores[q.id] ?? ""}
                    onChange={(e) => handleScore(q.id, e.target.value)}
                    placeholder="0"
                    inputProps={{
                      style: { textAlign: "center", fontSize: 13, width: 50 },
                      min: 0,
                      max: 10,
                    }}
                    sx={{
                      width: 70,
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": { borderColor: "#ddd" },
                      },
                    }}
                  />
                </Box>

                {/* Result cell */}
                <Box sx={{ bgcolor: section.color, alignSelf: "stretch" }} />

                {/* Instructions */}
                <Box sx={{ px: 2 }} />
              </Box>
            ))}
          </Box>
        ))}

        {/* Bottom score footer */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "80px 1fr 180px 180px 1fr",
            bgcolor: "#cdd5e8",
            borderTop: "1px solid #bbb",
          }}
        >
          <Box />
          <Box sx={{ p: 2 }}>
            <Typography fontWeight={600} fontSize={16}>Overall score</Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <Typography fontSize={13} color="#555">Maximum Score:</Typography>
            <Typography fontWeight={600} fontSize={14}>{MAX_SCORE}</Typography>
          </Box>
          <Box sx={{ p: 1.5 }}>
            <Typography fontSize={13} color="#555" mb={0.5}>Your score:</Typography>
            <Box sx={{ bgcolor: "#f5c842", borderRadius: 1, py: 0.6, px: 1, textAlign: "center" }}>
              <Typography fontWeight={600} fontSize={14}>{totalScore.toFixed(1)}</Typography>
            </Box>
          </Box>
          <Box />
        </Box>
      </Paper>
    </Box>
  );
};