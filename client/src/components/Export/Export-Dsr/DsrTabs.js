import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Badge from "@mui/material/Badge";
import axios from "axios";
import { SelectedYearContext } from "../../../contexts/SelectedYearContext";
import { useLocation } from "react-router-dom";
import useTabs from "../../../customHooks/useTabs";
import { TabValueContext } from "../../../contexts/TabValueContext";
import ExportDashboard from "./ExportDashboard";
import ExportJobsTable from "./ExportJobsTable";
import QueriesPanel from "./Queries/QueriesPanel";

function DsrTabs() {
  const { a11yProps, CustomTabPanel } = useTabs();
  const location = useLocation();
  const { tabValue, setTabValue } = React.useContext(TabValueContext);
  const [selectedYear, setSelectedYear] = React.useState("");
  const [queryBadgeCount, setQueryBadgeCount] = React.useState(0);

  // Determine current module for query badge
  const currentModule = React.useMemo(() => {
    const pathname = location.pathname;
    if (pathname.startsWith("/export-operation")) return "export-operation";
    if (pathname.startsWith("/export-documentation")) return "export-documentation";
    if (pathname.startsWith("/export-esanchit")) return "export-esanchit";
    if (pathname.startsWith("/export-charges")) return "export-charges";
    return "export-dsr";
  }, [location.pathname]);

  // Show tabs for all modules, allowing Queries tab access
  const showTabs = React.useMemo(() => {
    const pathname = location.pathname;
    return pathname.startsWith("/export-");
  }, [location.pathname]);

  // Fetch unseen query count for badge
  const fetchQueryCount = React.useCallback(async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_STRING}/queries/count`,
        { params: { targetModule: currentModule, status: "open" } }
      );
      if (res.data.success) {
        setQueryBadgeCount(res.data.count);
      }
    } catch (err) {
      // non-critical
    }
  }, [currentModule]);

  React.useEffect(() => {
    fetchQueryCount();
    const interval = setInterval(fetchQueryCount, 60000); // poll every 60s
    return () => clearInterval(interval);
  }, [fetchQueryCount]);

  // Clear badge when user clicks on the Queries tab
  const handleChange = (event, newValue) => {
    setTabValue(newValue);
    if (newValue === 2) {
      setQueryBadgeCount(0);
    }
  };

  return (
    <SelectedYearContext.Provider value={{ selectedYear, setSelectedYear }}>
      {showTabs ? (
        <Box sx={{ width: "100%" }}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={tabValue}
              onChange={handleChange}
              aria-label="export dsr tabs"
            >
              <Tab label="Dashboard" {...a11yProps(0)} key={0} />
              <Tab label="Jobs" {...a11yProps(1)} key={1} />
              <Tab
                label={
                  <Badge
                    badgeContent={queryBadgeCount}
                    color="error"
                    max={99}
                    sx={{
                      "& .MuiBadge-badge": {
                        fontSize: "10px",
                        height: "18px",
                        minWidth: "18px",
                        right: -8,
                        top: -2,
                      },
                    }}
                  >
                    <span style={{ paddingRight: queryBadgeCount > 0 ? "10px" : 0 }}>
                      Queries
                    </span>
                  </Badge>
                }
                {...a11yProps(2)}
                key={2}
              />
            </Tabs>
          </Box>
          <CustomTabPanel value={tabValue} index={0}>
            <ExportDashboard />
          </CustomTabPanel>
          <CustomTabPanel value={tabValue} index={1}>
            <ExportJobsTable />
          </CustomTabPanel>
          <CustomTabPanel value={tabValue} index={2}>
            <QueriesPanel />
          </CustomTabPanel>
        </Box>
      ) : (
        <ExportJobsTable />
      )}
    </SelectedYearContext.Provider>
  );
}

export default React.memo(DsrTabs);
