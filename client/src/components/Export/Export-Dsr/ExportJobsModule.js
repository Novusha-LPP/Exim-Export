import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Typography, Button, Box, Paper, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LockIcon from "@mui/icons-material/Lock";
import { UserContext } from "../../../contexts/UserContext";
import useExportJobDetails from "../../../customHooks/useExportJobDetails.js";
import axios from "axios";
import LogisysEditableHeader from "./LogisysEditableHeader.js";
import ExportJobFooter from "./ExportJobFooter.js";

// Tabs for this module
import GeneralTab from "./General/GeneralTab.js";
import ShipmentTab from "./Shipment/ShipmentTab.js";
import ContainerTab from "./Container/ContainerTab.js";
import TrackingCompletedTab from "./Tracking Completed/TrackingCompletedTab.js";
import InvoiceTab from "./Invoices/InvoiceTab.js";
import ProductTab from "./Product/ProductTab.js";
import ESanchitTab from "./E-sanchit/EsanchitTab.js";
import ChargesTab from "./Charges/ChargesTab.js";
import OperationsTab from "./Operations/OperationsTab.jsx";

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

const toUpper = (str) => (str || "").toUpperCase();

function ExportJobsModule() {
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
    setFileSnackbar
  );

  const getInitialTab = () => {
    const tabFromUrl = searchParams.get("tab");
    return tabFromUrl ? parseInt(tabFromUrl) : 0;
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [isLocked, setIsLocked] = useState(false);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [lockedByUser, setLockedByUser] = useState(null);
  const hasLockedRef = useRef(false);

  // Lock the job when the component mounts
  const lockJob = useCallback(async () => {
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
        // Job is locked by someone else
        setLockedByUser(error.response.data.lockedBy);
        setLockDialogOpen(true);
      } else {
        console.error("Error locking job:", error);
      }
    }
  }, [decodedJobNo, user?.username]);

  // Unlock the job
  const unlockJob = useCallback(async () => {
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

    // Cleanup: unlock when component unmounts
    return () => {
      if (hasLockedRef.current) {
        // Use sync version for unmount to ensure it runs
        const unlockSync = async () => {
          try {
            await axios.put(
              `${import.meta.env.VITE_API_STRING}/${encodeURIComponent(decodedJobNo)}/unlock`,
              { username: user?.username }
            );
          } catch (e) {
            // Ignore errors on cleanup
          }
        };
        unlockSync();
      }
    };
  }, [data, loading, decodedJobNo, lockJob]);

  // Handle browser close/refresh - unlock the job
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasLockedRef.current && decodedJobNo && user?.username) {
        // Use sendBeacon for reliable delivery on page unload
        const data = JSON.stringify({ username: user.username });
        navigator.sendBeacon(
          `${import.meta.env.VITE_API_STRING}/${encodeURIComponent(decodedJobNo)}/unlock`,
          new Blob([data], { type: 'application/json' })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [decodedJobNo, user?.username]);

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

  const handleUpdateAndClose = async () => {
    try {
      await formik.submitForm();
      await unlockJob(); // Unlock before navigating away
      navigate("/export-dsr");
    } catch (error) {
      console.error("Error during auto-update on close:", error);
      await unlockJob(); // Still try to unlock even on error
      navigate("/export-dsr");
    }
  };

  const handleLockDialogClose = () => {
    setLockDialogOpen(false);
    navigate("/export-dsr"); // Go back to job list when user acknowledges lock
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

  const isAir = toUpper(formik.values.transportMode) === "AIR";

  return (
    <>
      {/* Lock Dialog - Shows when job is locked by another user */}
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
        />
      </Box>

      <Paper
        sx={{
          margin: { xs: 1, sm: "20px" },
          borderRadius: 3,
          boxShadow: "0 4px 16px rgba(60,72,100,0.11)",
          paddingBottom: "60px", // Add padding to avoid content being hidden behind sticky footer
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
            <Tab label="General" />
            <Tab label="Shipment" />
            {!isAir && <Tab label="Container" />}
            <Tab label="Invoice" />
            <Tab label="Product" />
            <Tab label="ESanchit" />
            <Tab label="Charges" />

            <Tab label="Operations" />
            <Tab label="Tracking Completed" />
          </Tabs>
        </Box>

        {/* Dynamic Content Rendering */}
        {(() => {
          const tabs = [
            {
              label: "General",
              component: (
                <GeneralTab
                  job={data}
                  formik={formik}
                  directories={directories}
                />
              ),
            },
            {
              label: "Shipment",
              component: (
                <ShipmentTab
                  job={data}
                  formik={formik}
                  directories={directories}
                />
              ),
            },
            ...(!isAir
              ? [
                {
                  label: "Container",
                  component: (
                    <ContainerTab
                      job={data}
                      formik={formik}
                      onUpdate={formik.handleSubmit}
                    />
                  ),
                },
              ]
              : []),
            {
              label: "Invoice",
              component: (
                <InvoiceTab formik={formik} directories={directories} />
              ),
            },
            { label: "Product", component: <ProductTab formik={formik} /> },
            { label: "ESanchit", component: <ESanchitTab formik={formik} /> },
            {
              label: "Charges",
              component: <ChargesTab formik={formik} />,
            },

            {
              label: "Operations",
              component: <OperationsTab formik={formik} />,
            },
            {
              label: "Tracking Completed",
              component: <TrackingCompletedTab job={data} formik={formik} />,
            },
          ];

          return (
            <Box sx={{ p: 2 }}>
              {tabs[activeTab] && tabs[activeTab].component}
            </Box>
          );
        })()}

        <ExportJobFooter
          onUpdate={formik.handleSubmit}
          onClose={handleUpdateAndClose}
        />
      </Paper>
    </>
  );
}

export default ExportJobsModule;
