import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Typography, Button, Box, Paper, Tabs, Tab, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LockIcon from "@mui/icons-material/Lock";
import { UserContext } from "../../../contexts/UserContext";
import useExportJobDetails from "../../../customHooks/useExportJobDetails.js";
import axios from "axios";
import LogisysEditableHeader from "./LogisysEditableHeader.js";
import ExportJobFooter from "./ExportJobFooter.js";

// Tabs for this module
import ESanchitTab from "./E-sanchit/EsanchitTab.js";

// Tab Panel Component
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

function ExportEsanchitModule() {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [fileSnackbar, setFileSnackbar] = useState(false);
  const [exportJobsUsers, setExportJobsUsers] = useState([]);
  const [directories, setDirectories] = useState({});
  const { jobNo } = useParams();
  const decodedJobNo = decodeURIComponent(jobNo || "");

  const { data, loading, formik, lockError } = useExportJobDetails(
    { job_no: decodedJobNo },
    setFileSnackbar,
    navigate
  );

  const getInitialTab = () => {
    const tabFromUrl = searchParams.get("tab");
    return tabFromUrl ? parseInt(tabFromUrl) : 0;
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [isLocked, setIsLocked] = useState(false);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [lockedByUser, setLockedByUser] = useState(null);
  const [isEditable, setIsEditable] = useState(false);
  const hasLockedRef = React.useRef(false);

  const isNewJob = !data?.job_no;

  // Auto-lock when SB Date is present (unless manually unlocked)
  useEffect(() => {
    if (data && !loading && isLocked) {
      if (formik.values.sb_date && !isNewJob) {
        setIsEditable(false);
      } else {
        setIsEditable(true);
      }
    } else {
      setIsEditable(false);
    }
  }, [formik.values.sb_date, data, loading, isLocked, isNewJob]);

  // Lock the job when the component mounts
  const lockJob = React.useCallback(async () => {
    if (!decodedJobNo || !user?.username || hasLockedRef.current) return;

    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API_STRING}/${encodeURIComponent(decodedJobNo)}/lock`,
        { username: user.username }
      );
      if (response.data.message === "Job locked successfully") {
        setIsLocked(true);
        hasLockedRef.current = true;
      }
    } catch (error) {
      if (error.response?.status === 423) {
        setLockedByUser(error.response.data.lockedBy);
        setLockDialogOpen(true);
      } else {
        console.error("Error locking job:", error);
      }
    }
  }, [decodedJobNo, user?.username]);

  // Unlock the job
  const unlockJob = React.useCallback(async () => {
    if (!decodedJobNo || !user?.username || !hasLockedRef.current) return;

    try {
      await axios.put(
        `${import.meta.env.VITE_API_STRING}/${encodeURIComponent(decodedJobNo)}/unlock`,
        { username: user.username }
      );
      hasLockedRef.current = false;
      setIsLocked(false);
    } catch (error) {
      console.error("Error unlocking job:", error);
    }
  }, [decodedJobNo, user?.username]);

  // Lock job when data is loaded and unlock on unmount
  useEffect(() => {
    if (data && !loading && decodedJobNo) {
      lockJob();
    }

    return () => {
      if (hasLockedRef.current && decodedJobNo && user?.username) {
        const url = `${import.meta.env.VITE_API_STRING}/${encodeURIComponent(decodedJobNo)}/unlock`;
        const data = JSON.stringify({ username: user.username });
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
        hasLockedRef.current = false;
        setIsLocked(false);
      }
    };
  }, [data, loading, decodedJobNo, lockJob]);

  // Handle lock error from useExportJobDetails
  useEffect(() => {
    if (lockError) {
      const match = lockError.match(/locked by (.+)/i);
      if (match) {
        setLockedByUser(match[1]);
        setLockDialogOpen(true);
      }
    }
  }, [lockError]);


  // Fetch directories and users
  useEffect(() => {
    const fetchDirectories = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_STRING}/directory`
        );
        setDirectories({
          exporters: response.data.data || response.data,
          importers: [],
          banks: [],
        });
      } catch (error) {
        console.error("Error fetching directories:", error);
      }
    };

    const fetchExportJobsUsers = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_STRING}/export-jobs-module-users`
        );
        if (response.ok) {
          const data = await response.json();
          setExportJobsUsers(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching export-jobs module users:", error);
      }
    };

    fetchDirectories();
    fetchExportJobsUsers();
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setSearchParams({ tab: newValue.toString() });
  };

  const handleClose = async () => {
    await unlockJob();
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/export-esanchit");
    }
  };

  const handleLockDialogClose = () => {
    setLockDialogOpen(false);
    navigate("/export-esanchit");
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <Typography variant="h6" color="primary">
          Loading export job details...
        </Typography>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          mt: 6,
        }}
      >
        <Typography variant="h6" color="error">
          Export job not found
        </Typography>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/export-dsr")}
          sx={{ mt: 2 }}
        >
          Back to Export List
        </Button>
      </Box>
    );
  }

  return (
    <>
      <Dialog
        open={lockDialogOpen}
        onClose={handleLockDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'warning.main' }}>
          <LockIcon /> Job Locked
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            This job is currently being edited by <strong>{lockedByUser}</strong>.
            <br /><br />
            To prevent data conflicts, only one user can edit a job at a time.
            Please try again later or contact {lockedByUser} to release the job.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          {(lockedByUser || "").toLowerCase() === (user?.username || "").toLowerCase() && (
            <Button
              onClick={async () => {
                try {
                  await axios.put(
                    `${import.meta.env.VITE_API_STRING}/${encodeURIComponent(decodedJobNo)}/unlock`,
                    { username: user.username }
                  );
                  setLockDialogOpen(false);
                  hasLockedRef.current = false;
                  setTimeout(() => lockJob(), 500);
                } catch (error) {
                  console.error("Error force-unlocking:", error);
                }
              }}
              color="warning"
              variant="outlined"
            >
              Release My Session
            </Button>
          )}
          <Button onClick={handleLockDialogClose} variant="contained" color="primary">
            Go Back to Job List
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ mt: 3, mb: 2, mx: 1 }}>
        <LogisysEditableHeader
          formik={formik}
          directories={directories}
          exportJobsUsers={exportJobsUsers}
          onUpdate={formik.handleSubmit}
          isEditable={isEditable}
          setIsEditable={setIsEditable}
        />
      </Box>

      <Paper
        sx={{
          margin: { xs: 1, sm: "20px" },
          borderRadius: 3,
          boxShadow: "0 4px 16px rgba(60,72,100,0.11)",
          paddingBottom: "60px",
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2, pt: 1 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              "& .MuiTab-root": {
                minWidth: 80,
                fontSize: "0.85rem",
                fontWeight: 500,
                padding: "4px 10px",
                borderRadius: 2,
                textTransform: "none",
              },
              mb: 0,
            }}
          >
            <Tab label="ESanchit" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <ESanchitTab job={data} formik={formik} id="checklist-generator" isEditable={isEditable} />
        </TabPanel>

        <ExportJobFooter
          onUpdate={formik.handleSubmit}
          onClose={handleClose}
          isJobCanceled={formik.values.isJobCanceled}
          isAdmin={user?.role === "Admin"}
        />
      </Paper>

      <Snackbar
        open={fileSnackbar}
        autoHideDuration={4000}
        onClose={() => setFileSnackbar(false)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{ mt: 2, mr: 2, zIndex: 9999 }}
      >
        <Alert
          onClose={() => setFileSnackbar(false)}
          severity="success"
          variant="filled"
          sx={{
            width: "100%",
            borderRadius: "8px",
            boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
            fontWeight: 500,
            fontSize: "0.95rem",
            alignItems: "center"
          }}
        >
          Job updated successfully!
        </Alert>
      </Snackbar>
    </>
  );
}

export default ExportEsanchitModule;
