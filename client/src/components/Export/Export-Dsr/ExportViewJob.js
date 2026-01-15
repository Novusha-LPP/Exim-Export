import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Typography,
  Button,
  Box,
  Paper,
  Tabs,
  Tab,
  Snackbar,
  Divider,
  Menu,
  MenuItem,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { UserContext } from "../../../contexts/UserContext";
import useExportJobDetails from "../../../customHooks/useExportJobDetails.js";
import ShipmentTab from "./Shipment/ShipmentTab.js";
import axios from "axios";
import FinancialTab from "./Financial/FinancialTab.js";
import GeneralTab from "./General/GeneralTab.js";
import ContainerTab from "./Container/ContainerTab.js";
import InvoiceTab from "./Invoices/InvoiceTab.js";
import ProductTab from "./Product/ProductTab.js";
import TrackingCompletedTab from "./Tracking Completed/TrackingCompletedTab.js";
import ChargesTab from "./Charges/ChargesTab.js";
import ESanchitTab from ".//E-sanchit/EsanchitTab.js";
import ExportChecklistGenerator from "./StandardDocuments/ExportChecklistGenerator.js";
import AnnexureCGenerator from "./StandardDocuments/AnnexureCGenerator.js";
import DateInput from "../../common/DateInput.js";
import OperationsTab from "./Operations/OperationsTab.jsx";
import AutocompleteSelect from "../../common/AutocompleteSelect.js";

// Helper function
const toUpper = (str) => (str || "").toUpperCase();

// Styles object
const styles = {
  field: {
    flex: "1 1 120px",
    minWidth: 110,
    position: "relative",
  },
  label: {
    fontSize: 11,
    color: "#888",
    marginBottom: 2,
  },
  acWrap: {
    position: "relative",
  },
  input: {
    width: "100%",
    padding: "3px 24px 3px 6px",
    border: "1px solid #d6dae2",
    borderRadius: 4,
    fontSize: 13,
    background: "#fff",
    boxSizing: "border-box",
  },
  acIcon: {
    position: "absolute",
    right: 6,
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: 10,
    color: "#888",
    pointerEvents: "none",
  },
  acMenu: {
    position: "absolute",
    top: "calc(100% + 2px)",
    left: 0,
    right: 0,
    maxHeight: 240,
    overflowY: "auto",
    background: "#fff",
    border: "1px solid #d6dae2",
    borderRadius: 4,
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    zIndex: 9999,
  },
  acItem: (active) => ({
    padding: "8px 10px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
    background: active ? "#e3f2fd" : "#fff",
    color: "#111827",
    borderBottom: "1px solid #f0f0f0",
  }),
};

// Hook for Gateway Port Dropdown
function useGatewayPortDropdown(fieldName, formik) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(formik.values[fieldName] || "");
  const [opts, setOpts] = useState([]);
  const [active, setActive] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const wrapperRef = useRef();
  const keepOpen = useRef(false);
  const apiBase = import.meta.env.VITE_API_STRING;

  // Sync internal query state with formik values when they change externally (e.g. on load)
  useEffect(() => {
    if (!isTyping) {
      setQuery(formik.values[fieldName] || "");
    }
  }, [formik.values[fieldName], isTyping, fieldName]);

  useEffect(() => {
    if (!open) {
      setOpts([]);
      return;
    }

    // When dropdown opens, fetch all options (empty search)
    // Only use query for search if user is actively typing
    const searchVal = isTyping ? (query || "").trim() : "";
    const url = `${apiBase}/gateway-ports/?page=1&status=&type=&search=${encodeURIComponent(
      searchVal
    )}`;

    const t = setTimeout(async () => {
      try {
        const res = await fetch(url);
        const data = await res.json();
        setOpts(
          Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
              ? data
              : []
        );
      } catch {
        setOpts([]);
      }
    }, 220);

    return () => clearTimeout(t);
  }, [open, query, apiBase, isTyping]);

  useEffect(() => {
    function close(e) {
      if (
        !keepOpen.current &&
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target)
      ) {
        setOpen(false);
        setIsTyping(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function select(i) {
    const item = opts[i];
    if (!item) return;

    const value = `${(item.unece_code || "").toUpperCase()} - ${(
      item.name || ""
    ).toUpperCase()}`.trim();
    setQuery(value);
    formik.setFieldValue(fieldName, value);
    setOpen(false);
    setActive(-1);
    setIsTyping(false);
  }

  return {
    wrapperRef,
    open,
    setOpen,
    query,
    setQuery,
    opts,
    active,
    setActive,
    handle: (val) => {
      const v = val.toUpperCase();
      setQuery(v);
      formik.setFieldValue(fieldName, v);
      setOpen(true);
      setIsTyping(true);
    },
    select,
    onInputFocus: () => {
      setOpen(true);
      setActive(-1);
      keepOpen.current = true;
      // Don't set isTyping here - we want to show all options on focus
    },
    onInputBlur: () => {
      setTimeout(() => {
        keepOpen.current = false;
      }, 100);
    },
  };
}

// Gateway Port Dropdown Component
function GatewayPortDropdown({
  fieldName,
  formik,
  placeholder = "ENTER GATEWAY PORT",
}) {
  const d = useGatewayPortDropdown(fieldName, formik);

  const filtered = d.opts.filter((p) => {
    const code = p.unece_code || "";
    const name = p.name || "";
    const haystack = `${code} ${name}`.toUpperCase();
    const needle = (d.query || "").toUpperCase();
    return !needle || haystack.includes(needle);
  });

  return (
    <div style={{ position: "relative" }} ref={d.wrapperRef}>
      <div style={styles.acWrap}>
        <input
          style={styles.input}
          placeholder={placeholder}
          autoComplete="off"
          value={toUpper(d.query)}
          onChange={(e) => d.handle(e.target.value)}
          onFocus={d.onInputFocus}
          onBlur={d.onInputBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (d.open && d.active >= 0) {
                e.preventDefault();
                d.select(d.active);
              } else if (props.onEnter) {
                e.preventDefault();
                props.onEnter();
              }
              return;
            }

            if (!d.open) return;
            if (e.key === "ArrowDown")
              d.setActive((a) =>
                Math.min(filtered.length - 1, a < 0 ? 0 : a + 1)
              );
            else if (e.key === "ArrowUp")
              d.setActive((a) => Math.max(0, a - 1));
            else if (e.key === "Escape") d.setOpen(false);
          }}
        />
        <span style={styles.acIcon}>▼</span>
        {d.open && filtered.length > 0 && (
          <div style={styles.acMenu}>
            {filtered.map((port, i) => (
              <div
                key={port._id || port.unece_code || port.name || i}
                style={styles.acItem(d.active === i)}
                onMouseDown={() => d.select(i)}
                onMouseEnter={() => d.setActive(i)}
              >
                {(port.unece_code || "").toUpperCase()} -{" "}
                {(port.name || "").toUpperCase()}
                {port.port_type && (
                  <span
                    style={{ marginLeft: 6, color: "#667", fontWeight: 400 }}
                  >
                    ({port.port_type.toUpperCase()})
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



// Main Export View Job Component
function LogisysExportViewJob() {
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [fileSnackbar, setFileSnackbar] = useState(false);
  const [exportJobsUsers, setExportJobsUsers] = useState([]);
  const [docsAnchorEl, setDocsAnchorEl] = useState(null);

  const handleDocsMenuOpen = (event) => {
    setDocsAnchorEl(event.currentTarget);
  };

  const handleDocsMenuClose = () => {
    setDocsAnchorEl(null);
  };

  const [directories, setDirectories] = useState({});
  const { jobNo } = useParams();
  const decodedJobNo = decodeURIComponent(jobNo || "");

  const { data, loading, lockError, formik, setData } = useExportJobDetails(
    { job_no: decodedJobNo },
    setFileSnackbar
  );

  const getInitialTab = () => {
    const tabFromUrl = searchParams.get("tab");
    return tabFromUrl ? parseInt(tabFromUrl) : 0;
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

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

  // Lock/Unlock lifecycle
  useEffect(() => {
    if (!decodedJobNo || !user?.username) return;

    const lockJob = async () => {
      try {
        await axios.put(
          `${import.meta.env.VITE_API_STRING}/${encodeURIComponent(
            decodedJobNo
          )}/lock`,
          { username: user.username }
        );
      } catch (err) {
        console.error("Lock error:", err);
      }
    };

    const unlockJob = async () => {
      try {
        await axios.put(
          `${import.meta.env.VITE_API_STRING}/${encodeURIComponent(
            decodedJobNo
          )}/unlock`,
          { username: user.username }
        );
      } catch (err) {
        console.error("Unlock error:", err);
      }
    };

    lockJob();

    return () => {
      unlockJob();
    };
  }, [decodedJobNo, user?.username]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setSearchParams({ tab: newValue.toString() });
  };

  const handleUpdateAndClose = async () => {
    try {
      await formik.submitForm();
      // Use a small delay to ensure visibility of any success snackbars if needed,
      // but since the original onSubmit had a window.close, we can navigate here.
      navigate("/export-dsr");
    } catch (error) {
      console.error("Error during auto-update on close:", error);
      // Still navigate if requested, or maybe stay if there's an error?
      // Usually user expects "Close" to actually close.
      navigate("/export-dsr");
    }
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
      <Box sx={{ mt: 3, mb: 2, mx: 1 }}>
        <LogisysEditableHeader
          formik={formik}
          directories={directories}
          exportJobsUsers={exportJobsUsers}
          onUpdate={formik.handleSubmit}
          onDocsMenuOpen={handleDocsMenuOpen}
        />
      </Box>

      <Paper
        sx={{
          margin: { xs: 1, sm: "20px" },
          borderRadius: 3,
          boxShadow: "0 4px 16px rgba(60,72,100,0.11)",
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
            {toUpper(formik.values.transportMode) !== "AIR" && (
              <Tab label="Container" />
            )}
            <Tab label="Invoice" />
            <Tab label="Product" />
            <Tab label="ESanchit" />
            <Tab label="Charges" />
            <Tab label="Financial" />
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
                  formik={formik}
                  directories={directories}
                  params={params}
                />
              ),
            },
            {
              label: "Shipment",
              component: (
                <ShipmentTab
                  formik={formik}
                  directories={directories}
                  params={params}
                />
              ),
            },
            ...(toUpper(formik.values.transportMode) !== "AIR"
              ? [
                {
                  label: "Container",
                  component: (
                    <ContainerTab
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
                <InvoiceTab
                  formik={formik}
                  directories={directories}
                  params={params}
                />
              ),
            },
            { label: "Product", component: <ProductTab formik={formik} /> },
            { label: "ESanchit", component: <ESanchitTab formik={formik} /> },
            {
              label: "Charges",
              component: <ChargesTab formik={formik} lockError={lockError} />,
            },
            {
              label: "Financial",
              component: <FinancialTab formik={formik} />,
            },
            {
              label: "Operations",
              component: <OperationsTab formik={formik} />,
            },
            {
              label: "Tracking Completed",
              component: <TrackingCompletedTab formik={formik} />,
            },
          ];

          return (
            <Box sx={{ p: 2 }}>
              {tabs[activeTab] && tabs[activeTab].component}
            </Box>
          );
        })()}
        {lockError && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(255, 255, 255, 0.6)",
              backdropFilter: "blur(2px)",
              zIndex: 1500,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              borderRadius: 3,
            }}
          >
            <Paper
              elevation={6}
              sx={{
                p: 4,
                textAlign: "center",
                maxWidth: 400,
                border: "2px solid #d32f2f",
              }}
            >
              <Typography
                variant="h5"
                color="error"
                gutterBottom
                sx={{ fontWeight: 700 }}
              >
                Job Locked
              </Typography>
              <Typography variant="body1" sx={{ mb: 3 }}>
                {lockError}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate("/export-dsr")}
                fullWidth
              >
                Go Back to Job List
              </Button>
            </Paper>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Action Buttons */}
        <Box
          sx={{
            px: 3,
            pb: 3,
            display: "flex",
            gap: 2,
            justifyContent: "flex-end",
          }}
        >
          <Button
            variant="contained"
            onClick={formik.handleSubmit}
            disabled={!!lockError}
            sx={{
              position: "fixed",
              bottom: 25,
              right: 30,
              zIndex: 2000,
              minWidth: 110,
              backgroundColor: "#1565c0",
              color: "#fff",
              fontWeight: "bold",
              borderRadius: "30px",
              padding: "5px 20px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
              "&:hover": {
                backgroundColor: "#0d47a1",
                boxShadow: "0 6px 25px rgba(0,0,0,0.35)",
              },
            }}
          >
            Update Job
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdateAndClose}
            sx={{
              position: "fixed",
              bottom: 25,
              right: 195,
              zIndex: 2000,
              minWidth: 110,
              backgroundColor: "#fff",
              color: "#d32f2f",
              border: "1px solid #d32f2f",
              fontWeight: "bold",
              borderRadius: "30px",
              padding: "5px 20px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.20)",
              "&:hover": {
                backgroundColor: "#fff5f5",
                boxShadow: "0 6px 25px rgba(0,0,0,0.30)",
              },
            }}
          >
            Close
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={fileSnackbar}
        message="Export job updated successfully!"
        autoHideDuration={3000}
        onClose={() => setFileSnackbar(false)}
      />
      <Menu
        anchorEl={docsAnchorEl}
        open={Boolean(docsAnchorEl)}
        onClose={handleDocsMenuClose}
        PaperProps={{
          style: {
            maxHeight: 48 * 4.5,
            width: "20ch",
          },
        }}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <MenuItem onClick={handleDocsMenuClose}>
          <ExportChecklistGenerator jobNo={formik.values.job_no}>
            <Typography variant="body2">Export Checklist</Typography>
          </ExportChecklistGenerator>
        </MenuItem>
        <MenuItem onClick={handleDocsMenuClose}>
          <AnnexureCGenerator data={formik.values}>
            <Typography variant="body2">Annexure C</Typography>
          </AnnexureCGenerator>
        </MenuItem>
      </Menu>
    </>
  );
}

export default LogisysExportViewJob;

// Force reload - Loading Port field added

