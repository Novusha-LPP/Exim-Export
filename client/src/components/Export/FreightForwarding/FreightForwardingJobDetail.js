import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Typography,
  Button,
  Box,
  Paper,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Grid
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LockIcon from "@mui/icons-material/Lock";
import { UserContext } from "../../../contexts/UserContext.jsx";
import useExportJobDetails from "../../../customHooks/useExportJobDetails.js";
import axios from "axios";
import ExportJobFooter from "../Export-Dsr/ExportJobFooter.js";
import ChargesTab from "../Export-Dsr/Charges/ChargesTab.js";

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
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

function FreightForwardingJobDetail() {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [fileSnackbar, setFileSnackbar] = useState(false);
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

  // Auto-lock check
  useEffect(() => {
    if (data && !loading) {
      if (isLocked) {
        setIsEditable(true);
      } else {
        setIsEditable(false);
      }
    }
  }, [data, loading, isLocked]);

  // Lock the job on mount
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

  useEffect(() => {
    if (data && !loading && decodedJobNo) {
      lockJob();
    }

    return () => {
      if (hasLockedRef.current && decodedJobNo && user?.username) {
        const url = `${import.meta.env.VITE_API_STRING}/${encodeURIComponent(decodedJobNo)}/unlock`;
        const payload = JSON.stringify({ username: user.username });
        const blob = new Blob([payload], { type: 'application/json' });
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

  const handleClose = async () => {
    await unlockJob();
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/freight-forwarding");
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setSearchParams({ tab: newValue.toString() });
  };

  const handleLockDialogClose = () => {
    setLockDialogOpen(false);
    navigate("/freight-forwarding");
  };

  // Helper function to render a standard text input cell
  const renderInputBox = (label, name, disabled = false) => {
    const isNested = name.includes(".");
    let value = "";
    if (isNested) {
      const parts = name.split(".");
      if (parts.length === 3) {
        // e.g. consignees.0.consignee_name
        const arrayName = parts[0];
        const index = parseInt(parts[1]);
        const key = parts[2];
        value = formik.values[arrayName]?.[index]?.[key] || "";
      } else {
        value = formik.values[parts[0]]?.[parts[1]] || "";
      }
    } else {
      value = formik.values[name] || "";
    }

    return (
      <Box sx={{
        border: "1px solid #cbd5e1",
        p: "6px 8px",
        display: "flex",
        flexDirection: "column",
        backgroundColor: disabled || !isEditable ? "#f8fafc" : "#fff",
        minHeight: "52px",
        boxSizing: "border-box"
      }}>
        <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, fontSize: "9px", textTransform: "uppercase", mb: 0.5, letterSpacing: "0.2px" }}>
          {label}
        </Typography>
        <input
          name={name}
          type="text"
          value={value}
          onChange={formik.handleChange}
          disabled={disabled || !isEditable}
          style={{
            border: "none",
            outline: "none",
            fontSize: "11px",
            fontWeight: "600",
            color: disabled || !isEditable ? "#64748b" : "#1e293b",
            width: "100%",
            backgroundColor: "transparent",
            fontFamily: "inherit"
          }}
        />
      </Box>
    );
  };

  // Helper function to render combined value + unit inputs (e.g., Gross Weight + Unit)
  const renderCombinedBox = (label, nameVal, nameUnit, disabled = false) => {
    return (
      <Box sx={{
        border: "1px solid #cbd5e1",
        p: "6px 8px",
        display: "flex",
        flexDirection: "column",
        backgroundColor: disabled || !isEditable ? "#f8fafc" : "#fff",
        minHeight: "52px",
        boxSizing: "border-box"
      }}>
        <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, fontSize: "9px", textTransform: "uppercase", mb: 0.5, letterSpacing: "0.2px" }}>
          {label}
        </Typography>
        <div style={{ display: "flex", gap: "4px", width: "100%", alignItems: "center" }}>
          <input
            name={nameVal}
            type="text"
            value={formik.values[nameVal] || ""}
            onChange={formik.handleChange}
            disabled={disabled || !isEditable}
            placeholder="Value"
            style={{
              border: "none",
              outline: "none",
              fontSize: "11px",
              fontWeight: "600",
              color: "#1e293b",
              flex: 1,
              backgroundColor: "transparent",
              fontFamily: "inherit"
            }}
          />
          <span style={{ color: "#cbd5e1", fontSize: "12px", fontWeight: "300" }}>|</span>
          <input
            name={nameUnit}
            type="text"
            value={formik.values[nameUnit] || ""}
            onChange={formik.handleChange}
            disabled={disabled || !isEditable}
            placeholder="Unit"
            style={{
              border: "none",
              outline: "none",
              fontSize: "11px",
              fontWeight: "600",
              color: "#64748b",
              width: "45px",
              backgroundColor: "transparent",
              fontFamily: "inherit",
              textAlign: "right"
            }}
          />
        </div>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <Typography variant="h6" color="primary" sx={{ fontSize: "14px", fontWeight: 600 }}>
          Loading freight job details...
        </Typography>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 6 }}>
        <Typography variant="h6" color="error" sx={{ fontSize: "14px", fontWeight: 600 }}>
          Freight job not found
        </Typography>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/freight-forwarding")}
          sx={{ mt: 2, backgroundColor: "#16408f", borderRadius: "3px", fontSize: "12px", textTransform: "none" }}
        >
          Back to List
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
        PaperProps={{ sx: { borderRadius: "3px" } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'warning.main', fontSize: "16px", fontWeight: 700 }}>
          <LockIcon /> Job Locked
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: "13px" }}>
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
              sx={{ borderRadius: "3px", textTransform: "none", fontSize: "12px" }}
            >
              Release My Session
            </Button>
          )}
          <Button
            onClick={handleLockDialogClose}
            variant="contained"
            sx={{ backgroundColor: "#16408f", borderRadius: "3px", textTransform: "none", fontSize: "12px" }}
          >
            Go Back
          </Button>
        </DialogActions>
      </Dialog>

      {/* Header Panel */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: "3px", border: "1px solid #cbd5e1", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleClose}
              startIcon={<ArrowBackIcon />}
              sx={{
                borderColor: "#cbd5e1",
                color: "#475569",
                borderRadius: "3px",
                textTransform: "none",
                fontSize: "12px",
                height: "30px",
                "&:hover": { borderColor: "#94a3b8", backgroundColor: "#f8fafc" }
              }}
            >
              Back
            </Button>
            <Box>
              <Typography sx={{ fontWeight: 700, color: "#1e293b", fontSize: "16px" }}>
                {formik.values.job_no || decodedJobNo}
              </Typography>
              <Typography variant="body2" sx={{ color: "#64748b", fontSize: "12px" }}>
                Importer/Exporter: <strong>{formik.values.exporter || "N/A"}</strong> | Mode: <strong>{formik.values.consignmentType || "N/A"}</strong>
              </Typography>
            </Box>
          </Box>
          <Box>
            <span style={{
              display: "inline-block",
              padding: "3px 8px",
              borderRadius: "3px",
              border: "1px solid #10b981",
              backgroundColor: "#f0fdf4",
              color: "#10b981",
              fontWeight: 700,
              fontSize: "10px",
              textTransform: "uppercase"
            }}>
              CONVERTED
            </span>
          </Box>
        </Box>
      </Paper>

      {/* Main Tabs Container */}
      <Paper sx={{ borderRadius: "3px", border: "1px solid #cbd5e1", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", pb: "60px" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2, pt: 1 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              "& .MuiTab-root": {
                minWidth: 100,
                fontSize: "12px",
                fontWeight: "600",
                textTransform: "none",
                color: "#6b7280",
                padding: "6px 15px",
                "&.Mui-selected": {
                  color: "#16408f"
                }
              },
              "& .MuiTabs-indicator": {
                backgroundColor: "#16408f",
                height: "3px"
              }
            }}
          >
            <Tab label="Other Details" />
            <Tab label="Charges" />
          </Tabs>
        </Box>

        {/* Tab panel: Other Details */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ border: "1.5px solid #e2e8f0", borderRadius: "4px", overflow: "hidden", backgroundColor: "#f8fafc", p: 1.5 }}>
            
            {/* Row 1 */}
            <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("Shipment No.", "job_no", true)}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("dt (Shipment Date)", "job_date")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderCombinedBox("Gross Wt./Unit", "gross_weight_kg", "gross_weight_unit")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("Movement Type", "movement_type")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("Shipper Name", "shipper")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("Vessel", "vessel_name")}
              </Grid>
            </Grid>

            {/* Row 2 */}
            <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("Booking No.", "booking_no")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("dt (Booking Date)", "booking_date")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderCombinedBox("Chg. Wt./Unit", "chargeable_weight", "chargeable_weight_unit")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("Place of Receipt", "place_of_receipt")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("Consignee Name", "consignees.0.consignee_name")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("Voyage", "voyage_no")}
              </Grid>
            </Grid>

            {/* Row 3 */}
            <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("Consol No.", "consol_no")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("dt (Consol Date)", "consol_date")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderCombinedBox("Volume/Unit", "volume_cbm", "volume_unit")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("Loading Port", "port_of_loading")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("Booking Thru", "booking_thru")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("ETA (Dest)", "eta_date")}
              </Grid>
            </Grid>

            {/* Row 4 */}
            <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("BL No", "mbl_no")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("dt (BL Date)", "mbl_date")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderCombinedBox("No of Pkgs", "total_no_of_pkgs", "package_unit")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("Discharge Port", "port_of_discharge")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("Sales Person", "sales_person")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("ETD", "sailing_date")}
              </Grid>
            </Grid>

            {/* Row 5 */}
            <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("HBL No", "hbl_no")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("dt (HBL Date)", "hbl_date")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("Volume Weight", "volume_weight")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("Delivery", "place_of_delivery")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("Shipping line", "shipping_line_airline")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("Freight Type", "freight_type")}
              </Grid>
            </Grid>

            {/* Row 6 */}
            <Grid container spacing={0.5}>
              <Grid item xs={12} md={4} sm={6}>
                {renderInputBox("Shipment Terms", "shipment_terms")}
              </Grid>
              <Grid item xs={12} md={4} sm={6}>
                {renderInputBox("Cargo Type", "cargo_type")}
              </Grid>
              <Grid item xs={12} md={4} sm={12}>
                {renderInputBox("Container Qty & Type", "container_qty_type")}
              </Grid>
            </Grid>

          </Box>
        </TabPanel>

        {/* Tab panel: Charges */}
        <TabPanel value={activeTab} index={1}>
          <ChargesTab job={data} formik={formik} isEditable={isEditable} />
        </TabPanel>

        {/* Footer actions */}
        <ExportJobFooter
          onUpdate={formik.handleSubmit}
          onClose={handleClose}
          isJobCanceled={formik.values.isJobCanceled}
          isAdmin={user?.role === "Admin"}
        />
      </Paper>

      {/* Success Snackbar */}
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
            borderRadius: "3px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            fontWeight: 600,
            fontSize: "12px",
            alignItems: "center"
          }}
        >
          Freight Job updated successfully!
        </Alert>
      </Snackbar>
    </>
  );
}

export default FreightForwardingJobDetail;
