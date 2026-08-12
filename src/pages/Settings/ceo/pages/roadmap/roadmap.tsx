import { useState } from "react";
import { Box, Typography, TextField, Paper } from "@mui/material";
import { useTranslation } from "react-i18next";

interface Question {
  id: string;
}

interface Section {
  key: string;
  color: string;
  questions: Question[];
}

const sections: Section[] = [
  {
    key: "marketing",
    color: "#fef9e7",
    questions: [
      { id: "m1" },
      { id: "m2" },
      { id: "m3" },
      { id: "m4" },
      { id: "m5" },
      { id: "m6" },
      { id: "m7" },
      { id: "m8" },
      { id: "m9" },
      { id: "m10" },
      { id: "m11" },
      { id: "m12" },
      { id: "m13" },
      { id: "m14" },
    ],
  },
  {
    key: "sales",
    color: "#eaf4ea",
    questions: [
      { id: "s1" },
      { id: "s2" },
      { id: "s3" },
      { id: "s4" },
      { id: "s5" },
      { id: "s6" },
      { id: "s7" },
      { id: "s8" },
      { id: "s9" },
    ],
  },
  {
    key: "service",
    color: "#fdecea",
    questions: [
      { id: "sv1" },
      { id: "sv2" },
      { id: "sv3" },
      { id: "sv4" },
      { id: "sv5" },
      { id: "sv6" },
      { id: "sv7" },
      { id: "sv8" },
      { id: "sv9" },
    ],
  },
  {
    key: "finance",
    color: "#f0f0f0",
    questions: [
      { id: "f1" },
      { id: "f2" },
      { id: "f3" },
      { id: "f4" },
      { id: "f5" },
      { id: "f6" },
    ],
  },
  {
    key: "administrative",
    color: "#fdf3e7",
    questions: [
      { id: "a1" },
      { id: "a2" },
      { id: "a3" },
      { id: "a4" },
      { id: "a5" },
      { id: "a6" },
      { id: "a7" },
      { id: "a8" },
    ],
  },
];

const columnKeys = ["section", "question", "score", "result", "instructions"] as const;

const MAX_SCORE = 60;

export const Roadmap = () => {
  const { t } = useTranslation();
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
        <Typography fontWeight={600} fontSize={16}>{t("settings.ceo.roadmap.overallScore")}</Typography>
      </Box>
      <Box sx={{ p: 2 }}>
        <Typography fontSize={13} color="#555">{t("settings.ceo.roadmap.maxScore")}</Typography>
        <Typography fontWeight={600} fontSize={14}>{MAX_SCORE}</Typography>
      </Box>
      <Box sx={{ p: 1.5 }}>
        <Typography fontSize={13} color="#555" mb={0.5}>{t("settings.ceo.roadmap.yourScore")}</Typography>
        <Box sx={{ bgcolor: "#f5c842", borderRadius: 1, py: 0.6, px: 1, textAlign: "center" }}>
          <Typography fontWeight={600} fontSize={14}>{totalScore.toFixed(1)}</Typography>
        </Box>
      </Box>
      <Box />
    </Box>
  );

  return (
    <Box sx={{ p: 3, bgcolor: "#f5f5f5", minHeight: "100vh" }}>
      <Typography variant="h5" fontWeight={400} mb={3}>{t("settings.ceo.roadmap.title")}</Typography>

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
          {columnKeys.map((colKey) => (
            <Box key={colKey} sx={{ px: 2, py: 1.2 }}>
              <Typography fontSize={13} fontWeight={600} color="#333">{t(`settings.ceo.roadmap.table.${colKey}`)}</Typography>
            </Box>
          ))}
        </Box>

        {/* Sections */}
        {sections.map((section) => (
          <Box key={section.key} sx={{ display: "flex", flexDirection: "column" }}>
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
                      {t(`settings.ceo.roadmap.sections.${section.key}.name`)}
                    </Typography>
                  )}
                </Box>

                {/* Question */}
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography fontSize={13} color="#333">{t(`settings.ceo.roadmap.sections.${section.key}.questions.${q.id}`)}</Typography>
                </Box>

                {/* Ball input */}
                <Box sx={{ px: 2, py: 1, display: "flex", justifyContent: "center" }}>
                  <TextField
                    size="small"
                    value={scores[q.id] ?? ""}
                    onChange={(e) => handleScore(q.id, e.target.value)}
                    placeholder={t("settings.ceo.roadmap.scorePlaceholder")}
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
            <Typography fontWeight={600} fontSize={16}>{t("settings.ceo.roadmap.overallScore")}</Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <Typography fontSize={13} color="#555">{t("settings.ceo.roadmap.maxScore")}</Typography>
            <Typography fontWeight={600} fontSize={14}>{MAX_SCORE}</Typography>
          </Box>
          <Box sx={{ p: 1.5 }}>
            <Typography fontSize={13} color="#555" mb={0.5}>{t("settings.ceo.roadmap.yourScore")}</Typography>
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