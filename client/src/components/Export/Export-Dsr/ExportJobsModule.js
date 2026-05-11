import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Typography, Button, Box, Paper, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar, Alert } from "@mui/material";
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

const getMilestones = (isAir) => [
  "SB Filed",
  "L.E.O",
  isAir ? "File Handover to IATA" : "Container HO",
  isAir ? "Departure" : "Rail Out",
  "Billing Pending",
  "Billing Done",
];

const getMandatoryNames = (isAir) =>
  new Set(["SB Filed", "L.E.O", "Billing Pending"]);

const ALL_SYSTEM_MILESTONES = new Set([
  "SB Filed",
  "L.E.O",
  "File Handover to IATA",
  "Container HO",
  "Departure",
  "Rail Out",
  "Billing Pending",
  "Billing Done",
]);

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
  const hasLockedRef = useRef(false);

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
      if (hasLockedRef.current && decodedJobNo && user?.username) {
        const url = `${import.meta.env.VITE_API_STRING}/${encodeURIComponent(decodedJobNo)}/unlock`;
        const data = JSON.stringify({ username: user.username });
        
        // Use sendBeacon for unmount - it's more reliable for "fire and forget" on exit
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
        
        hasLockedRef.current = false;
        setIsLocked(false);
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
          `${import.meta.env.VITE_API_STRING}/directory/names`
        );
        setDirectories({
          exporterNames: response.data.data || [],
          importers: [],
          banks: [],
        });
      } catch (error) {
        console.error("Error fetching directory names:", error);
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

  // 🔑 GLOBAL SYNC: Initialize and Update Milestones & Detailed Status
  // This ensures that even if user never clicks "Tracking Completed" tab,
  // the milestones and detailedStatus are correctly derived from source data.
  const milestonesInitializedRef = useRef(false);

  useEffect(() => {
    if (loading || !formik.values) return;

    const ms = formik.values.milestones || [];
    const isAir = toUpper(formik.values.transportMode) === "AIR";
    const currentBaseMilestones = getMilestones(isAir);
    const currentMandatory = getMandatoryNames(isAir);
    const currentModeNames = new Set(currentBaseMilestones);

    // 1. Initialization / Mode Switch Logic
    const isMissingRequired = !currentBaseMilestones.every((name) =>
      ms.some((m) => m.milestoneName === name)
    );
    const hasInvalidSystem = ms.some(
      (m) =>
        ALL_SYSTEM_MILESTONES.has(m.milestoneName) &&
        !currentModeNames.has(m.milestoneName)
    );

    if (!milestonesInitializedRef.current || isMissingRequired || hasInvalidSystem) {
      // Determine if we are loading real data from server
      const hasRealData = ms.length > 0 && ms.some((m) => m._id);

      if (!milestonesInitializedRef.current && ms.length === 0 && !hasRealData) {
        const defaults = currentBaseMilestones.map((name) => ({
          milestoneName: name,
          actualDate: "",
          isCompleted: false,
          isMandatory: currentMandatory.has(name),
          completedBy: "",
          remarks: "",
        }));
        formik.setFieldValue("milestones", defaults);
        milestonesInitializedRef.current = true;
      } else {
        // Logic for Merging / switching modes
        const byName = new Map(ms.map((m) => [m.milestoneName, m]));
        const basePart = currentBaseMilestones.map((name) => {
          const existing = byName.get(name);
          return (
            existing || {
              milestoneName: name,
              actualDate: "",
              isCompleted: false,
              isMandatory: currentMandatory.has(name),
              completedBy: "",
              remarks: "",
            }
          );
        });
        const extras = ms.filter((m) => {
          const name = m.milestoneName;
          if (!name || currentModeNames.has(name)) return false;
          if (ALL_SYSTEM_MILESTONES.has(name)) return false;
          return true;
        });

        const unified = [...basePart, ...extras];
        // Only update if actually different to avoid loops
        if (JSON.stringify(ms) !== JSON.stringify(unified)) {
          formik.setFieldValue("milestones", unified);
        }
        milestonesInitializedRef.current = true;
      }
      return;
    }

    // 2. Data Sync Logic (Source fields -> Milestones)
    const op = formik.values.operations?.[0]?.statusDetails?.[0] || {};
    const sbDate = formik.values.sb_date;

    const getSource = (name) => {
      if (name === "SB Filed") return { val: sbDate, isDoc: false };
      if (name === "L.E.O") return { val: op.leoDate, isDoc: false };
      if (name === "Container HO" || name === "File Handover to IATA") {
        const docs = op.handoverImageUpload;
        const dateVal = op.handoverForwardingNoteDate || op.handoverConcorTharSanganaRailRoadDate || "";
        const hasDocs = (Array.isArray(docs) && docs.length > 0) || !!dateVal;
        return { val: dateVal, isDoc: true, hasDoc: hasDocs };
      }
      if (name === "Rail Out" || name === "Departure") return { val: op.railOutReachedDate, isDoc: false };
      return null;
    };

    let changed = false;
    const syncedMilestones = ms.map((m) => {
      const source = getSource(m.milestoneName);
      if (!source) return m;

      let updates = {};
      if (source.isDoc) {
        if (source.hasDoc) {
          if (!m.isCompleted) updates.isCompleted = true;
          if (source.val && m.actualDate !== source.val) updates.actualDate = source.val;
        } else if (m.isCompleted) {
          updates.isCompleted = false;
          updates.actualDate = "";
        }
      } else {
        if (source.val) {
          if (!m.isCompleted) updates.isCompleted = true;
          if (m.actualDate !== source.val) updates.actualDate = source.val;
        } else if (m.isCompleted) {
          updates.isCompleted = false;
          updates.actualDate = "";
        }
      }

      if (Object.keys(updates).length > 0) {
        changed = true;
        return { ...m, ...updates };
      }
      return m;
    });

    if (changed) {
      formik.setFieldValue("milestones", syncedMilestones);
    }

    // 3. Detailed Status Logic (Derived from highest completed milestone)
    const completed = syncedMilestones.filter(m => m.isCompleted);
    const lastCompleted = completed.length > 0 ? completed[completed.length - 1].milestoneName : "";
    if (formik.values.detailedStatus !== lastCompleted) {
      formik.setFieldValue("detailedStatus", lastCompleted);
    }
  }, [
    loading,
    formik.values.sb_date,
    formik.values.operations,
    formik.values.transportMode,
    formik.values.milestones,
    formik.values.detailedStatus
  ]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setSearchParams({ tab: newValue.toString() });
  };

  const handleClose = async () => {
    try {
      await unlockJob(); // Unlock before navigating away
      window.close();
      navigate("/export-dsr");
    } catch (error) {
      console.error("Error during close:", error);
      await unlockJob(); // Still try to unlock even on error
      window.close();
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
                  // A slight delay to ensure server processed unlock
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
                  isEditable={isEditable}
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
                  isEditable={isEditable}
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
                      isEditable={isEditable}
                    />
                  ),
                },
              ]
              : []),
            {
              label: "Invoice",
              component: (
                <InvoiceTab formik={formik} directories={directories} isEditable={isEditable} />
              ),
            },
            { label: "Product", component: <ProductTab formik={formik} isEditable={isEditable} /> },
            { label: "ESanchit", component: <ESanchitTab formik={formik} isEditable={isEditable} /> },
            {
              label: "Charges",
              component: <ChargesTab job={data} formik={formik} isEditable={isEditable} />,
            },

            {
              label: "Operations",
              component: <OperationsTab formik={formik} isEditable={isEditable} />,
            },
            {
              label: "Tracking Completed",
              component: <TrackingCompletedTab job={data} formik={formik} isAdmin={user?.role === "Admin"} isEditable={isEditable} />,
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

export default ExportJobsModule;
