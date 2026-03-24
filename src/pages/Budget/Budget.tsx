import { BoldTabs } from "../../components/BoldTabs";
import { Button, Stack } from "@mui/material";
import { GoPlus } from "react-icons/go";
import { Category, Expense, Income } from "./components";

export const Budget = () => {
  return (
    <div className="pt-10 px-4">
      <Stack direction="row" sx={{ pb: 4 }} justifyContent={"space-between"}>
        <BoldTabs
          tabs={[
            {
              label: "Income",
              children: <Income />,
              value: "income",
              leftSideContent: (
                <Button
                  variant="contained"
                  color="inherit"
                  sx={{
                    boxShadow: "none",
                    textTransform: "capitalize",
                    whiteSpace: "nowrap",
                    padding: "12px 24px",
                  }}
                >
                  Date Picker1
                </Button>
              ),
            },
            {
              label: "Category",
              children: <Category />,
              value: "category",
              leftSideContent: (
                <Button
                  startIcon={<GoPlus />}
                  variant="contained"
                  color="primary"
                  sx={{
                    boxShadow: "none",
                    textTransform: "capitalize",
                    whiteSpace: "nowrap",
                    padding: "12px 24px",
                  }}
                >
                  Add New Teacher
                </Button>
              ),
            },
            {
              label: "Expense",
              children: <Expense />,
              value: "expense",
              leftSideContent: (
                <Button
                  variant="contained"
                  color="inherit"
                  sx={{
                    boxShadow: "none",
                    textTransform: "capitalize",
                    whiteSpace: "nowrap",
                    padding: "12px 24px",
                  }}
                >
                  Date Picker3
                </Button>
              ),
            },
          ]}
        />
      </Stack>
    </div>
  );
};
