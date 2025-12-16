  import * as React from "react";
  import Tabs from "@mui/material/Tabs";
  import Tab from "@mui/material/Tab";
  import Box from "@mui/material/Box";
  // import Dashboard from "./Dashboard";
  import "../../../styles/import-dsr.scss";
  import { SelectedYearContext } from "../../../contexts/SelectedYearContext";
  // import JobTabs from "./JobTabs";
  // import ViewDSR from "./ViewDSR";
  // import ImportCreateJob from "./ImportCreateJob";
  import useTabs from "../../../customHooks/useTabs";
  import { TabValueContext } from "../../../contexts/TabValueContext";
  import ExportJobsTable from "./ExportJobsTable";
  import AddExJobs from "./AddExJobs";

  function DsrTabs() {
    const { a11yProps, CustomTabPanel } = useTabs();
    const { tabValue, setTabValue } = React.useContext(TabValueContext);
    const [selectedYear, setSelectedYear] = React.useState("");

    const handleChange = (event, newValue) => {
      setTabValue(newValue);
    };

    return (
      <SelectedYearContext.Provider value={{ selectedYear, setSelectedYear }}>
        <Box sx={{ width: "100%" }}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={tabValue}
              onChange={handleChange}
              aria-label="basic tabs example"
            >
              [{/* <Tab label="Dashboard" {...a11yProps(0)} key={0} />, */}
              <Tab label="Jobs" {...a11yProps(2)} key={0} />,
              {/* <Tab label="View DSR" {...a11yProps(3)} key={2} /> */}
              <Tab label="New Job" {...a11yProps(4)} key={1} />
              ,]
            </Tabs>
          </Box>
          <CustomTabPanel value={tabValue} index={0}>
            <ExportJobsTable />
          </CustomTabPanel>
          <CustomTabPanel value={tabValue} index={0}>
            {/* <Dashboard /> */}
          </CustomTabPanel>

          <CustomTabPanel value={tabValue} index={2}>
            {/* <ViewDSR /> */}
          </CustomTabPanel>
          <CustomTabPanel value={tabValue} index={1}>
            <AddExJobs />
          </CustomTabPanel>
        </Box>
      </SelectedYearContext.Provider>
    );
  }

  export default React.memo(DsrTabs);
