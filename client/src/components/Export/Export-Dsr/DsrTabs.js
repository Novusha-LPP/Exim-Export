import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
// import Dashboard from "./Dashboard";
import "../../../styles/import-dsr.scss";
import { Alert, MenuItem, TextField } from "@mui/material";
import axios from "axios";
import { SelectedYearContext } from "../../../contexts/SelectedYearContext";
// import JobTabs from "./JobTabs";
// import ViewDSR from "./ViewDSR";
// import ImportCreateJob from "./ImportCreateJob";
import CircularProgress from "@mui/material/CircularProgress";
import InfoIcon from "@mui/icons-material/Info";
import IconButton from "@mui/material/IconButton";
import { Tooltip } from "@mui/material";
import { Typography } from "@mui/material";
import Snackbar from "@mui/material/Snackbar";
import useTabs from "../../../customHooks/useTabs";
import { UserContext } from "../../../contexts/UserContext";
import { TabValueContext } from "../../../contexts/TabValueContext";
import ExportJobsTable from "./ExportJobsTable";
import AddExJobs from "./AddExJobs";

function DsrTabs() {
  const { a11yProps, CustomTabPanel } = useTabs();
  const { tabValue, setTabValue } = React.useContext(TabValueContext);
  const { user } = React.useContext(UserContext);
  const [selectedYear, setSelectedYear] = React.useState("");
  const [alt, setAlt] = React.useState(false);
  const [lastJobsDate, setLastJobsDate] = React.useState("");

  const inputRef = React.useRef();

  const handleChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // React.useEffect(() => {
  //   async function getLastJobsDate() {
  //     const res = await axios(
  //       `${import.meta.env.VITE_API_STRING}/get-last-jobs-date`
  //     );
  //     setLastJobsDate(res.data.lastJobsDate);
  //   }
  //   getLastJobsDate();
  // }, [alt]);

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
        {/* <div className="flex-div">
          <div style={{ flex: 1 }}></div>
          {user.role === "Admin" && tabValue === 0 && (
            <>
              {loading ? (
                <CircularProgress />
              ) : (
                <label
                  htmlFor="uploadBtn"
                  className="btn"
                  style={{ marginLeft: "10px", marginTop: "20px" }}
                >
                  Upload Party Data
                </label>
              )}

              <input
                type="file"
                accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                id="uploadBtn"
                name="upload-btn"
                ref={inputRef}
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />

              <Tooltip
                title={
                  <Typography sx={{ fontSize: 16 }}>
                    Jobs last added on {lastJobsDate}
                  </Typography>
                }
              >
                <IconButton aria-label="jobs-info">
                  <InfoIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
        </div> */}
        {/* {error && (
            <Alert 
              severity="error"
              sx={{ marginTop: "10px", marginBottom: "10px" }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )} */}

        <CustomTabPanel value={tabValue} index={0}>
          {/* <Dashboard /> */}
        </CustomTabPanel>
        <CustomTabPanel value={tabValue} index={0}>
          <ExportJobsTable />
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
