import { useEffect, useState } from "react";
import { Button, Stack, useTheme } from "@mui/material";
import { Props } from "./types";

export const BoldTabs = ({
  tabs,
  defaultTabIndex,
  contentClassName,
  tabsClassName,
  tabClassName,
}: Props) => {
  const [activeTabIdx, setActiveTabIdx] = useState(defaultTabIndex || 0);
  const theme = useTheme();

  useEffect(() => {
    if (tabs?.length && defaultTabIndex !== undefined) {
      setActiveTabIdx(defaultTabIndex);
    }
  }, [tabs, defaultTabIndex]);

  if (!tabs?.length) {
    return null;
  }

  return (
    <div className="w-full h-full">
      <div
        className={
          "flex items-center justify-between mb-[30px] " + tabsClassName
        }
      >
        <div className="w-full overflow-x-auto no-scrollbar">
          <Stack
            direction="row"
            sx={{
              border: "1px solid",
              borderColor: theme.palette.primary.main,
              borderRadius: "4px",
              overflow: "hidden",
            }}
            className={`flex w-max  ${tabClassName}`}
          >
            {tabs.map((tab, index) => (
              <Button
                key={index}
                onClick={() => setActiveTabIdx(index)}
                variant="contained"
                sx={{
                  textTransform: "none",
                  fontSize: "0.875rem",
                  fontWeight: "bold",
                  lineHeight: "1.5rem",
                  padding: "10px 16px",
                  minWidth: "auto",
                  color:
                    activeTabIdx === index
                      ? "white"
                      : theme.palette.primary.main,
                  borderColor: theme.palette.primary.main,
                  borderRight: tabs.length - 1 === index ? "none" : "1px solid",
                  borderRadius: "0px",
                  backgroundColor:
                    activeTabIdx === index
                      ? theme.palette.primary.main
                      : "white",

                  boxShadow: "none",
                  "&:hover": {
                    backgroundColor:
                      activeTabIdx === index
                        ? theme.palette.primary.main
                        : "white",
                    boxShadow: "none",
                  },
                }}
              >
                {tab.label}
              </Button>
            ))}
          </Stack>
        </div>
        {tabs[activeTabIdx]?.leftSideContent && (
          <>{tabs[activeTabIdx].leftSideContent}</>
        )}
      </div>
      {tabs[activeTabIdx]?.children && (
        <div className={`mt-7 ${contentClassName}`}>
          {tabs[activeTabIdx].children}
        </div>
      )}
    </div>
  );
};
