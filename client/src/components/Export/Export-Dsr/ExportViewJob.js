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
import ExportChecklistGenerator from "./Checklist/ExportChecklistGenerator.js";

function SimpleSelect({ name, value, options, onChange }) {
  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      style={{
        height: 28,
        width: "98%",
        borderRadius: 4,
        border: "1px solid #d6dae2",
        fontSize: 13,
        background: "#fff",
        padding: "2px 7px",
      }}
    >
      {options.map((opt) => (
        <option value={opt.value} key={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

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
  const wrapperRef = useRef();
  const apiBase = import.meta.env.VITE_API_STRING;
  const keepOpen = useRef(false);

  useEffect(() => {
    setQuery(formik.values[fieldName] || "");
  }, [formik.values[fieldName], fieldName]);

  useEffect(() => {
    if (!open) {
      setOpts([]);
      return;
    }

    const searchVal = (query || "").trim();
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
  }, [open, query, apiBase]);

  useEffect(() => {
    function close(e) {
      if (
        !keepOpen.current &&
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target)
      ) {
        setOpen(false);
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
    },
    select,
    onInputFocus: () => {
      setOpen(true);
      setActive(-1);
      keepOpen.current = true;
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
            if (!d.open) return;
            if (e.key === "ArrowDown")
              d.setActive((a) =>
                Math.min(filtered.length - 1, a < 0 ? 0 : a + 1)
              );
            else if (e.key === "ArrowUp")
              d.setActive((a) => Math.max(0, a - 1));
            else if (e.key === "Enter" && d.active >= 0) {
              e.preventDefault();
              d.select(d.active);
            } else if (e.key === "Escape") d.setOpen(false);
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

const LogisysEditableHeader = ({ formik, onUpdate, directories }) => {
  const [snackbar, setSnackbar] = useState(false);
  const { user } = useContext(UserContext);
  const isNewJob = !formik.values.job_no;

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text || "");
    setSnackbar(true);
    setTimeout(() => setSnackbar(false), 2000);
  };

  const shipperOpts = (directories?.exporters || []).map((exp) => ({
    label: `${exp.organization} (${exp.registrationDetails?.ieCode || ""})`,
    value: exp.organization,
  }));

  return (
    <div
      style={{
        marginBottom: 20,
        background: "linear-gradient(90deg, #f7fafc 85%, #e3f2fd 100%)",
        border: "1px solid #e3e7ee",
        borderRadius: 8,
        boxShadow: "0 2px 6px 0 rgba(60,72,100,0.08)",
        padding: "17px 23px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 2,
        }}
      >
        <div style={{ fontWeight: 700, color: "#1565c0", fontSize: 15 }}>
          Export Job
        </div>
      </div>
      <div
        style={{ borderBottom: "1px solid #e9ecef", margin: "8px 0 12px" }}
      />

      {/* ROWS */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px 18px",
          alignItems: "flex-end",
        }}
      >
        {/* Job Number */}
        <div style={{ flex: "1 1 210px", minWidth: 120 }}>
          <div style={{ fontSize: 11, color: "#888" }}>Job Number</div>
          {isNewJob ? (
            <input
              style={{
                width: "97%",
                padding: "3px 6px",
                border: "1px solid #d6dae2",
                borderRadius: 4,
                fontSize: 12,
                background: "#fff",
              }}
              name="job_no"
              value={formik.values.job_no}
              onChange={formik.handleChange}
              placeholder="Auto-generated if empty"
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#eef4fa",
                border: "1px solid #e0e0e0",
                borderRadius: 4,
                padding: "2px 9px",
                fontSize: 12,
              }}
            >
              <span>{formik.values.job_no}</span>
              <button
                title="Copy"
                onClick={() => handleCopyText(formik.values.job_no)}
                style={{
                  background: "none",
                  border: "none",
                  marginLeft: 8,
                  cursor: "pointer",
                  fontSize: 15,
                  color: "#666",
                }}
              >
                📋
              </button>
            </div>
          )}
        </div>

        {/* Job Date */}
        <div style={{ flex: "1 1 110px", minWidth: 100 }}>
          <div style={{ fontSize: 11, color: "#888" }}>Job Date</div>
          <input
            name="job_date"
            type="date"
            value={formik.values.job_date}
            onChange={formik.handleChange}
            style={{
              width: "98%",
              padding: "3px 6px",
              border: "1px solid #d6dae2",
              borderRadius: 4,
              background: "#fff",
              fontSize: 13,
            }}
          />
        </div>

        {/* SB No */}
        <div style={{ flex: "1 1 90px", minWidth: 80 }}>
          <div style={{ fontSize: 11, color: "#888" }}>SB No</div>
          <input
            name="sb_no"
            value={formik.values.sb_no}
            onChange={formik.handleChange}
            style={{
              width: "97%",
              padding: "3px 6px",
              border: "1px solid #d6dae2",
              borderRadius: 4,
              fontSize: 13,
              background: "#fff",
            }}
          />
        </div>

        {/* SB Date */}
        <div style={{ flex: "1 1 150px", minWidth: 120 }}>
          <div style={{ fontSize: 11, color: "#888" }}>SB Date</div>
          <input
            name="sb_date"
            type="datetime-local"
            value={formik.values.sb_date}
            onChange={formik.handleChange}
            style={{
              width: "97%",
              padding: "3px 6px",
              border: "1px solid #d6dae2",
              borderRadius: 4,
              fontSize: 13,
              background: "#fff",
            }}
          />
        </div>

        {/* Job Owner */}
        <div style={{ flex: "1 1 110px", minWidth: 90 }}>
          <div style={{ fontSize: 11, color: "#888" }}>Job Owner</div>
          <input
            name="job_owner"
            value={formik.values.job_owner}
            onChange={formik.handleChange}
            style={{
              width: "96%",
              padding: "3px 6px",
              border: "1px solid #d6dae2",
              borderRadius: 4,
              background: "#fff",
              fontSize: 13,
            }}
          />
        </div>

        {/* Shipper */}
        <div style={{ flex: "1 1 170px", minWidth: 130 }}>
          <div style={{ fontSize: 11, color: "#888" }}>Shipper</div>
          <input
            name="shipper"
            list="shipper-list"
            value={formik.values.shipper}
            onChange={formik.handleChange}
            style={{
              width: "98%",
              padding: "3px 6px",
              border: "1px solid #d6dae2",
              borderRadius: 4,
              fontSize: 13,
              background: "#fff",
            }}
          />
          <datalist id="shipper-list">
            {shipperOpts.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </datalist>
        </div>

        {/* Transport Mode */}
        <div style={{ flex: "1 1 100px", minWidth: 80 }}>
          <div style={{ fontSize: 11, color: "#888" }}>Transport Mode</div>
          <SimpleSelect
            name="transportMode"
            value={formik.values.transportMode}
            options={[
              { value: "Sea", label: "Sea" },
              { value: "Air", label: "Air" },
            ]}
            onChange={formik.handleChange}
          />
        </div>

        {/* Custom House - Now with Gateway Port Dropdown */}
        <div style={{ flex: "1 1 120px", minWidth: 110 }}>
          <div style={{ fontSize: 11, color: "#888" }}>Custom House</div>
          <GatewayPortDropdown
            fieldName="custom_house"
            formik={formik}
            placeholder="Select Custom House"
          />
        </div>

        {/* Loading Port */}
        <div style={{ flex: "1 1 120px", minWidth: 110 }}>
          <div style={{ fontSize: 11, color: "#888" }}>Loading Port</div>
          <GatewayPortDropdown
            fieldName="port_of_loading"
            formik={formik}
            placeholder="Select Loading Port"
          />
        </div>

        {/* Consignment Type */}
        <div style={{ flex: "1 1 120px", minWidth: 100 }}>
          <div style={{ fontSize: 11, color: "#888" }}>Consignment Type</div>
          <SimpleSelect
            name="consignmentType"
            value={formik.values.consignmentType}
            options={[
              { value: "FCL", label: "FCL" },
              { value: "LCL", label: "LCL" },
              { value: "Break Bulk", label: "Break Bulk" },
            ]}
            onChange={formik.handleChange}
          />
        </div>

        {/* SB Type */}
        <div style={{ flex: "1 1 120px", minWidth: 100 }}>
          <div style={{ fontSize: 11, color: "#888" }}>SB Type</div>
          <SimpleSelect
            name="sb_type"
            value={formik.values.sb_type}
            options={[
              { value: "", label: "All" },
              { value: "White - Free/DEEC", label: "White - Free/DEEC" },
              { value: "Green - Drawback", label: "Green - Drawback" },
              { value: "Green - RODTEP", label: "Green - RODTEP" },
              { value: "Blue - DEPB", label: "Blue - DEPB" },
              { value: "Yellow - Dutiable", label: "Yellow - Dutiable" },
              { value: "Pink - ExBond", label: "Pink - ExBond" },
              { value: "SEZ - Regular", label: "SEZ - Regular" },
              { value: "SEZ - ExBond", label: "SEZ - ExBond" },
              {
                value: "SEZ - DTA Procurement",
                label: "SEZ - DTA Procurement",
              },
              { value: "Red", label: "Red" },
            ]}
            onChange={formik.handleChange}
          />
        </div>

        {/* Standard Documents Button */}
        <div
          style={{
            flex: "1 1 105px",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            minWidth: 25,
          }}
        >
          <button
            style={{
              background: "#fff",
              border: "1.2px solid #1976d2",
              color: "#1976d2",
              marginLeft: 7,
              padding: "3px 12px",
              borderRadius: 4,
              fontWeight: 500,
              fontSize: 12,
              cursor: "pointer",
            }}
            type="button"
          >
            Standard Documents
          </button>
        </div>
      </div>

      {snackbar && (
        <div
          style={{
            background: "#1976d2",
            color: "#fff",
            padding: "3px 16px",
            fontSize: 13,
            position: "fixed",
            right: 20,
            top: 76,
            borderRadius: 4,
          }}
        >
          Copied to clipboard
        </div>
      )}
    </div>
  );
};

// Tab Panel Component
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`logisys-tabpanel-${index}`}
      aria-labelledby={`logisys-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
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

  const [directories, setDirectories] = useState({});
  const { jobNo } = useParams();
  const decodedJobNo = decodeURIComponent(jobNo || "");

  const { data, loading, formik, setData } = useExportJobDetails(
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

    fetchDirectories();
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setSearchParams({ tab: newValue.toString() });
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
          onUpdate={formik.handleSubmit}
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
            <Tab label="Container" />
            <Tab label="Invoice" />
            <Tab label="Product" />
            <Tab label="ESanchit" />
            <Tab label="Charges" />
            <Tab label="Financial" />
            <Tab label="Tracking Completed" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <GeneralTab
            formik={formik}
            directories={directories}
            params={params}
          />
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          <ShipmentTab
            formik={formik}
            directories={directories}
            params={params}
          />
        </TabPanel>
        <TabPanel value={activeTab} index={2}>
          <ContainerTab formik={formik} />
        </TabPanel>
        <TabPanel value={activeTab} index={3}>
          <InvoiceTab
            formik={formik}
            directories={directories}
            params={params}
          />
        </TabPanel>
        <TabPanel value={activeTab} index={4}>
          <ProductTab formik={formik} />
        </TabPanel>
        <TabPanel value={activeTab} index={5}>
          <ESanchitTab formik={formik} />
        </TabPanel>
        <TabPanel value={activeTab} index={6}>
          <ChargesTab formik={formik} />
        </TabPanel>
        <TabPanel value={activeTab} index={7}>
          <FinancialTab formik={formik} />
        </TabPanel>
        <TabPanel value={activeTab} index={8}>
          <TrackingCompletedTab formik={formik} />
        </TabPanel>

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
            size="small"
            onClick={formik.handleSubmit}
            sx={{ minWidth: 120 }}
          >
            Update Job
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="error"
            sx={{ minWidth: 90 }}
            onClick={() => navigate("/export-dsr")}
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
      <ExportChecklistGenerator jobNo={formik.values.job_no} />
    </>
  );
}

export default LogisysExportViewJob;
