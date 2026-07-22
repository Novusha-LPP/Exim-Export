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
import DateInput from "../../common/DateInput.js";

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
  const isImport = String(formik.values?.shipment_type || "").startsWith("Import");

  // Auto-lock check
  useEffect(() => {
    if (data && !loading) {
      const isSentForBilling = formik.values?.send_for_billing === true;
      const isAdmin = user?.role === "Admin";

      if (isLocked) {
        if (isSentForBilling && !isAdmin) {
          setIsEditable(false);
        } else {
          setIsEditable(true);
        }
      } else {
        setIsEditable(false);
      }
    }
  }, [data, loading, isLocked, formik.values?.send_for_billing, user?.role]);

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
    setSearchParams({ tab: newValue.toString() }, { replace: true });
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

  // Helper function to render a custom date picker input cell
  const renderDateInputBox = (label, name, disabled = false) => {
    const isNested = name.includes(".");
    let value = "";
    if (isNested) {
      const parts = name.split(".");
      if (parts.length === 3) {
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
        <DateInput
          name={name}
          value={value}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          disabled={disabled || !isEditable}
          style={{
            border: "none",
            outline: "none",
            fontSize: "11px",
            fontWeight: "600",
            color: disabled || !isEditable ? "#64748b" : "#1e293b",
            width: "100%",
            backgroundColor: "transparent",
            fontFamily: "inherit",
            padding: 0
          }}
        />
      </Box>
    );
  };

  // Helper to convert dd-MM-yyyy to DD-MMM-YYYY (e.g., 22-06-2026 → 22-JUN-2026)
  const MONTH_ABBR = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const formatToMonthName = (dateStr) => {
    if (!dateStr) return "";
    // Already in DD-MMM-YYYY format
    if (/^\d{2}-[A-Z]{3}-\d{4}$/i.test(dateStr)) return dateStr.toUpperCase();
    // Parse dd-MM-yyyy or dd/MM/yyyy
    const parts = dateStr.split(/[-/.]/);
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const monthIdx = parseInt(parts[1], 10) - 1;
      const year = parts[2];
      if (monthIdx >= 0 && monthIdx < 12 && year.length === 4) {
        return `${day}-${MONTH_ABBR[monthIdx]}-${year}`;
      }
    }
    return dateStr;
  };

  const renderBLDateInputBox = (label, name, disabled = false) => {
    const isNested = name.includes(".");
    let value = "";
    if (isNested) {
      const parts = name.split(".");
      if (parts.length === 3) {
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

    const handleBLDateChange = (e) => {
      const rawValue = e.target.value;
      // Convert to DD-MMM-YYYY format
      const formatted = formatToMonthName(rawValue);
      formik.handleChange({
        target: {
          name: e.target.name,
          value: formatted,
        }
      });
    };

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
        <DateInput
          name={name}
          value={value}
          onChange={handleBLDateChange}
          onBlur={(e) => {
            // Also format on blur in case user typed manually
            const formatted = formatToMonthName(e.target.value);
            if (formatted !== e.target.value) {
              formik.handleChange({
                target: {
                  name,
                  value: formatted,
                }
              });
            }
            formik.handleBlur(e);
          }}
          disabled={disabled || !isEditable}
          style={{
            border: "none",
            outline: "none",
            fontSize: "11px",
            fontWeight: "600",
            color: disabled || !isEditable ? "#64748b" : "#1e293b",
            width: "100%",
            backgroundColor: "transparent",
            fontFamily: "inherit",
            padding: 0
          }}
        />
      </Box>
    );
  };

  const renderTextAreaBox = (label, name, rows = 3, disabled = false) => {
    const isNested = name.includes(".");
    let value = "";
    if (isNested) {
      const parts = name.split(".");
      if (parts.length === 3) {
        value = formik.values[parts[0]]?.[parts[1]]?.[parts[2]] || "";
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
        minHeight: "72px",
        boxSizing: "border-box"
      }}>
        <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, fontSize: "9px", textTransform: "uppercase", mb: 0.5, letterSpacing: "0.2px" }}>
          {label}
        </Typography>
        <textarea
          name={name}
          rows={rows}
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
            fontFamily: "inherit",
            resize: "vertical"
          }}
        />
      </Box>
    );
  };

  const renderSelectBox = (label, name, options, disabled = false) => {
    const isNested = name.includes(".");
    let value = "";
    if (isNested) {
      const parts = name.split(".");
      if (parts.length === 3) {
        value = formik.values[parts[0]]?.[parts[1]]?.[parts[2]] || "";
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
        <select
          name={name}
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
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Box>
    );
  };

  const calculateRowCbm = (row) => {
    const l = parseFloat(row.length) || 0;
    const b = parseFloat(row.breadth) || 0;
    const h = parseFloat(row.height) || 0;
    const qty = parseFloat(row.no_packages) || 0;
    const uom = row.uom || "cm";

    let cbm = 0;
    if (uom === "cm") {
      cbm = (l * b * h * qty) / 1000000;
    } else if (uom === "inch") {
      cbm = (l * b * h * qty) * 0.000016387064;
    } else if (uom === "m") {
      cbm = (l * b * h * qty);
    } else if (uom === "ft") {
      cbm = (l * b * h * qty) * 0.028316846592;
    }
    return parseFloat(cbm.toFixed(4));
  };

  const handleDimensionChange = (index, field, value) => {
    const updatedDimensions = [...(formik.values.dimensions || [])];
    const row = { ...updatedDimensions[index], [field]: value };
    row.calculated_cbm = calculateRowCbm(row);
    updatedDimensions[index] = row;
    formik.setFieldValue("dimensions", updatedDimensions);
  };

  const handleAddDimensionRow = () => {
    const updatedDimensions = [...(formik.values.dimensions || [])];
    updatedDimensions.push({
      length: "",
      breadth: "",
      height: "",
      uom: "cm",
      no_packages: "",
      net_weight: "",
      gross_weight: "",
      calculated_cbm: 0
    });
    formik.setFieldValue("dimensions", updatedDimensions);
  };

  const handleRemoveDimensionRow = (index) => {
    const updatedDimensions = (formik.values.dimensions || []).filter((_, i) => i !== index);
    if (updatedDimensions.length === 0) {
      updatedDimensions.push({
        length: "",
        breadth: "",
        height: "",
        uom: "cm",
        no_packages: "",
        net_weight: "",
        gross_weight: "",
        calculated_cbm: 0
      });
    }
    formik.setFieldValue("dimensions", updatedDimensions);
  };

  const handleContainerChange = (index, field, value) => {
    const updatedContainers = [...(formik.values.containers || [])];
    updatedContainers[index] = {
      ...updatedContainers[index],
      [field]: value.toUpperCase()
    };
    formik.setFieldValue("containers", updatedContainers);
  };

  const handleAddContainerRow = () => {
    const updatedContainers = [...(formik.values.containers || [])];
    updatedContainers.push({
      containerNo: "",
      customSealNo: "",
      shippingLineSealNo: ""
    });
    formik.setFieldValue("containers", updatedContainers);
  };

  const handleRemoveContainerRow = (index) => {
    const updatedContainers = (formik.values.containers || []).filter((_, i) => i !== index);
    if (updatedContainers.length === 0) {
      updatedContainers.push({
        containerNo: "",
        customSealNo: "",
        shippingLineSealNo: ""
      });
    }
    formik.setFieldValue("containers", updatedContainers);
  };

  const totalVolumeCbm = React.useMemo(() => {
    return (formik.values.dimensions || []).reduce((acc, row) => acc + (row.calculated_cbm || 0), 0);
  }, [formik.values.dimensions]);

  const totalGrossWeight = React.useMemo(() => {
    return (formik.values.dimensions || []).reduce((acc, row) => acc + (parseFloat(row.gross_weight) || 0), 0);
  }, [formik.values.dimensions]);

  const totalNetWeight = React.useMemo(() => {
    return (formik.values.dimensions || []).reduce((acc, row) => acc + (parseFloat(row.net_weight) || 0), 0);
  }, [formik.values.dimensions]);

  const totalPackages = React.useMemo(() => {
    return (formik.values.dimensions || []).reduce((acc, row) => acc + (parseInt(row.no_packages) || 0), 0);
  }, [formik.values.dimensions]);

  const hasGridRows = React.useMemo(() => {
    const dims = formik.values.dimensions || [];
    if (dims.length > 1) return true;
    if (dims.length === 1) {
      const r = dims[0];
      return !!(r.length || r.breadth || r.height || r.net_weight || r.gross_weight || r.no_packages);
    }
    return false;
  }, [formik.values.dimensions]);

  const finalPackages = React.useMemo(() => {
    if (formik.values.is_manual_cbm && !hasGridRows) {
      return parseInt(formik.values.total_no_of_pkgs) || 0;
    }
    return totalPackages;
  }, [formik.values.is_manual_cbm, hasGridRows, totalPackages, formik.values.total_no_of_pkgs]);

  const finalNetWeight = React.useMemo(() => {
    if (formik.values.is_manual_cbm && !hasGridRows) {
      return parseFloat(formik.values.net_weight_kg) || 0;
    }
    return totalNetWeight;
  }, [formik.values.is_manual_cbm, hasGridRows, totalNetWeight, formik.values.net_weight_kg]);

  const finalGrossWeight = React.useMemo(() => {
    if (formik.values.is_manual_cbm && !hasGridRows) {
      return parseFloat(formik.values.gross_weight_kg) || 0;
    }
    return totalGrossWeight;
  }, [formik.values.is_manual_cbm, hasGridRows, totalGrossWeight, formik.values.gross_weight_kg]);

  const finalVolumeCbm = React.useMemo(() => {
    if (formik.values.is_manual_cbm) {
      return parseFloat(formik.values.volume_cbm) || 0;
    }
    return totalVolumeCbm;
  }, [formik.values.is_manual_cbm, formik.values.volume_cbm, totalVolumeCbm]);

  const volumetricWeight = React.useMemo(() => {
    const isAir = formik.values.shipment_type && formik.values.shipment_type.includes("Air");
    const factor = isAir ? 167 : 1000;
    return finalVolumeCbm * factor;
  }, [finalVolumeCbm, formik.values.shipment_type]);

  const chargeableWeight = React.useMemo(() => {
    return Math.max(finalGrossWeight, volumetricWeight);
  }, [finalGrossWeight, volumetricWeight]);

  useEffect(() => {
    if (!isEditable) return;
    if (!formik.values.is_manual_cbm) {
      formik.setFieldValue("total_no_of_pkgs", finalPackages > 0 ? String(finalPackages) : "");
      formik.setFieldValue("net_weight_kg", finalNetWeight > 0 ? String(parseFloat(finalNetWeight.toFixed(3))) : "");
      formik.setFieldValue("gross_weight_kg", finalGrossWeight > 0 ? String(parseFloat(finalGrossWeight.toFixed(3))) : "");
      formik.setFieldValue("volume_cbm", finalVolumeCbm > 0 ? String(parseFloat(finalVolumeCbm.toFixed(4))) : "");
      formik.setFieldValue("chargeable_weight", chargeableWeight > 0 ? String(parseFloat(chargeableWeight.toFixed(3))) : "");
    } else if (hasGridRows) {
      formik.setFieldValue("total_no_of_pkgs", finalPackages > 0 ? String(finalPackages) : "");
      formik.setFieldValue("net_weight_kg", finalNetWeight > 0 ? String(parseFloat(finalNetWeight.toFixed(3))) : "");
      formik.setFieldValue("gross_weight_kg", finalGrossWeight > 0 ? String(parseFloat(finalGrossWeight.toFixed(3))) : "");
      formik.setFieldValue("volume_cbm", finalVolumeCbm > 0 ? String(parseFloat(finalVolumeCbm.toFixed(4))) : "");
      formik.setFieldValue("chargeable_weight", chargeableWeight > 0 ? String(parseFloat(chargeableWeight.toFixed(3))) : "");
    }
  }, [finalPackages, finalNetWeight, finalGrossWeight, finalVolumeCbm, chargeableWeight, formik.values.is_manual_cbm, hasGridRows, isEditable]);

  const gridStyles = {
    table: {
      width: "100%",
      borderCollapse: "collapse",
      marginTop: "6px",
      marginBottom: "6px",
    },
    th: {
      textAlign: "left",
      padding: "6px 8px",
      fontSize: "10px",
      fontWeight: 700,
      color: "#ffffff",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      borderBottom: "2px solid #cbd5e1",
      backgroundColor: "#16408f",
    },
    td: {
      padding: "4px 8px",
      borderBottom: "1px solid #cbd5e1",
      verticalAlign: "middle",
    },
    input: {
      width: "100%",
      height: "26px",
      border: "1px solid #cbd5e1",
      borderRadius: "3px",
      padding: "0 6px",
      fontSize: "11px",
      boxSizing: "border-box",
      outline: "none"
    },
    select: {
      width: "100%",
      height: "26px",
      border: "1px solid #cbd5e1",
      borderRadius: "3px",
      padding: "0 4px",
      fontSize: "11px",
      boxSizing: "border-box",
      outline: "none",
      backgroundColor: "#fff"
    },
    btnAddRow: {
      backgroundColor: "#10b981",
      color: "#fff",
      padding: "0 10px",
      height: "24px",
      borderRadius: "3px",
      border: "none",
      fontWeight: 600,
      cursor: "pointer",
      fontSize: "11px",
    },
    btnDanger: {
      backgroundColor: "#ef4444",
      color: "#fff",
      padding: "0 10px",
      height: "24px",
      borderRadius: "3px",
      border: "none",
      fontWeight: 600,
      cursor: "pointer",
      fontSize: "10px",
    },
    calcField: {
      height: "26px",
      padding: "0 6px",
      fontSize: "11px",
      border: "1px solid #cbd5e1",
      borderRadius: "3px",
      backgroundColor: "#f1f5f9",
      width: "100%",
      boxSizing: "border-box",
      color: "#334155",
      display: "flex",
      alignItems: "center",
      fontWeight: "bold",
    }
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
                Importer/Exporter: <strong>{isImport ? (formik.values.consignees?.[0]?.consignee_name || "N/A") : (formik.values.shipper || formik.values.exporter || "N/A")}</strong> | Mode: <strong>{formik.values.consignmentType || "N/A"}</strong>
                {formik.values.bl_details?.shipment_ref_no && (
                  <>
                    {" | "}Ref No: <strong>{formik.values.bl_details.shipment_ref_no}</strong>
                  </>
                )}
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
            <Tab label="BL Instructions" />
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
                {renderDateInputBox("dt (Shipment Date)", "job_date")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderCombinedBox("Gross Wt./Unit", "gross_weight_kg", "gross_weight_unit")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("Movement Type", "movement_type")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox(isImport ? "Shipper Name (Exporter)" : "Shipper Name (Exporter) *", "shipper")}
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
                {renderDateInputBox("dt (Booking Date)", "booking_date")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderCombinedBox("Chg. Wt./Unit", "chargeable_weight", "chargeable_weight_unit")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("Place of Receipt", "place_of_receipt")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox(isImport ? "Consignee Name (Importer) *" : "Consignee Name (Importer)", "consignees.0.consignee_name")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("Voyage", "voyage_no")}
              </Grid>
            </Grid>

            {/* Row 3 */}
            <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
              <Grid item xs={12} md={3} sm={6}>
                {renderCombinedBox("Volume/Unit", "volume_cbm", "volume_unit")}
              </Grid>
              <Grid item xs={12} md={3} sm={6}>
                {renderInputBox("Loading Port", "port_of_loading")}
              </Grid>
              <Grid item xs={12} md={3} sm={6}>
                {renderInputBox("Booking Thru", "booking_thru")}
              </Grid>
              <Grid item xs={12} md={3} sm={6}>
                {renderInputBox("Shipment Ref. No.", "bl_details.shipment_ref_no")}
              </Grid>
            </Grid>

            {/* Pipeline Stages & Timeline Tracking Dates */}
            <Box
              sx={{
                border: "1.5px solid #3b82f6",
                borderRadius: "6px",
                backgroundColor: "#eff6ff",
                p: 2,
                mb: 2,
                boxShadow: "0 1px 3px rgba(59, 130, 246, 0.08)",
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 800,
                  fontSize: "11px",
                  color: "#1d4ed8",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  mb: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#3b82f6" }}></span>
                Pipeline & Timeline Tracking (Key Date Triggers)
              </Typography>
              <Grid container spacing={0.5}>
                <Grid item xs={12} md={2} sm={4}>
                  {renderDateInputBox("ETD (Departure)", "sailing_date")}
                </Grid>
                <Grid item xs={12} md={2} sm={4}>
                  {renderDateInputBox("ETA (Dest)", "eta_date")}
                </Grid>
                <Grid item xs={12} md={2} sm={4}>
                  {renderDateInputBox("Cut off Date", "cut_off_date")}
                </Grid>
                <Grid item xs={12} md={2} sm={4}>
                  {renderDateInputBox("Final Arrival Date", "arrival_date")}
                </Grid>
                <Grid item xs={12} md={2} sm={4}>
                  {renderDateInputBox("Final Delivery Date", "final_delivery_date")}
                </Grid>
                <Grid item xs={12} md={2} sm={4}>
                  {renderInputBox("Reason for Delay", "delay_reason")}
                </Grid>
              </Grid>
            </Box>

            {/* Row 4 */}
            <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("BL No", "mbl_no")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderDateInputBox("dt (BL Date)", "mbl_date")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderCombinedBox("No of Pkgs", "total_no_of_pkgs", "package_unit")}
              </Grid>
              <Grid item xs={12} md={3} sm={6}>
                {renderInputBox("Discharge Port", "port_of_discharge")}
              </Grid>
              <Grid item xs={12} md={3} sm={6}>
                {renderInputBox("Sales Person", "sales_person")}
              </Grid>
            </Grid>

            {/* Row 5 */}
            <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("HBL No", "hbl_no")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderDateInputBox("dt (HBL Date)", "hbl_date")}
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
            <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
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

            {/* Row 7: Organization basics & contact info */}
            <Grid container spacing={0.5} sx={{ mb: 1.5 }}>
              <Grid item xs={12} md={2} sm={4}>
                {renderSelectBox("Shipment Type", "shipment_type", [
                  { label: "SELECT", value: "" },
                  { label: "Import-Sea", value: "Import-Sea" },
                  { label: "Export-Sea", value: "Export-Sea" },
                  { label: "Import-Air", value: "Import-Air" },
                  { label: "Export-Air", value: "Export-Air" }
                ])}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("Container Size", "container_size")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderSelectBox("Consignment Type", "consignmentType", [
                  { label: "SELECT", value: "" },
                  { label: "LCL", value: "LCL" },
                  { label: "FCL", value: "FCL" },
                  { label: "AIR", value: "AIR" }
                ])}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderSelectBox("Goods Stuffed", "goods_stuffed", [
                  { label: "SELECT", value: "" },
                  { label: "FACTORY STUFFED", value: "FACTORY STUFFED" },
                  { label: "DOCK STUFFED", value: "DOCK STUFFED" }
                ])}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("Contact No", "contact_no")}
              </Grid>
              <Grid item xs={12} md={2} sm={4}>
                {renderInputBox("Email", "email")}
              </Grid>
            </Grid>

            {/* Dimensions & Weight Grid Section */}
            <Box sx={{ mt: 2, mb: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontSize: "11px", fontWeight: 700, color: "#374151", textTransform: "uppercase" }}>
                    Dimensions & Weight Grid
                  </Typography>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, color: "#16408f", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      name="is_manual_cbm"
                      checked={formik.values.is_manual_cbm || false}
                      onChange={(e) => {
                        formik.setFieldValue("is_manual_cbm", e.target.checked);
                      }}
                      disabled={!isEditable}
                      style={{ cursor: "pointer" }}
                    />
                    Manual CBM
                  </label>
                </Box>
                {isEditable && (
                  <button
                    type="button"
                    style={gridStyles.btnAddRow}
                    onClick={handleAddDimensionRow}
                  >
                    + Add Row
                  </button>
                )}
              </Box>

              {formik.values.is_manual_cbm && (
                <div style={{
                  display: "flex",
                  gap: "10px",
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "4px",
                  padding: "8px 12px",
                  marginBottom: "8px",
                  flexWrap: "wrap"
                }}>
                  <div style={{ flex: 1, minWidth: "140px", display: "flex", flexDirection: "column" }}>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#1e40af" }}>
                      Manual Net Weight (Kg) {hasGridRows && <span style={{ fontSize: "10px", color: "#6b7280" }}>(Row Sum)</span>}
                    </label>
                    <input
                      type="number"
                      name="net_weight_kg"
                      disabled={hasGridRows || !isEditable}
                      style={{ ...gridStyles.input, backgroundColor: hasGridRows || !isEditable ? "#f1f5f9" : "#fff" }}
                      value={formik.values.net_weight_kg || ""}
                      onChange={formik.handleChange}
                      placeholder="Enter Total Net Wt"
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: "140px", display: "flex", flexDirection: "column" }}>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#1e40af" }}>
                      Manual Gross Weight (Kg) {hasGridRows && <span style={{ fontSize: "10px", color: "#6b7280" }}>(Row Sum)</span>}
                    </label>
                    <input
                      type="number"
                      name="gross_weight_kg"
                      disabled={hasGridRows || !isEditable}
                      style={{ ...gridStyles.input, backgroundColor: hasGridRows || !isEditable ? "#f1f5f9" : "#fff" }}
                      value={formik.values.gross_weight_kg || ""}
                      onChange={formik.handleChange}
                      placeholder="Enter Total Gross Wt"
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: "140px", display: "flex", flexDirection: "column" }}>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#1e40af" }}>
                      Manual No of Packages {hasGridRows && <span style={{ fontSize: "10px", color: "#6b7280" }}>(Row Sum)</span>}
                    </label>
                    <input
                      type="number"
                      name="total_no_of_pkgs"
                      disabled={hasGridRows || !isEditable}
                      style={{ ...gridStyles.input, backgroundColor: hasGridRows || !isEditable ? "#f1f5f9" : "#fff" }}
                      value={formik.values.total_no_of_pkgs || ""}
                      onChange={formik.handleChange}
                      placeholder="Enter Total Packages"
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: "140px", display: "flex", flexDirection: "column" }}>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#1e40af" }}>
                      Manual Volume (CBM)
                    </label>
                    <input
                      type="number"
                      name="volume_cbm"
                      disabled={!isEditable}
                      style={{ ...gridStyles.input, backgroundColor: !isEditable ? "#f1f5f9" : "#fff" }}
                      value={formik.values.volume_cbm || ""}
                      onChange={formik.handleChange}
                      placeholder="Enter Total CBM"
                    />
                  </div>
                </div>
              )}

              <Box sx={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "3px" }}>
                <table style={gridStyles.table}>
                  <thead>
                    <tr>
                      <th style={gridStyles.th}>Length</th>
                      <th style={gridStyles.th}>Breadth</th>
                      <th style={gridStyles.th}>Height</th>
                      <th style={gridStyles.th}>UOM</th>
                      <th style={gridStyles.th}>No Packages</th>
                      <th style={gridStyles.th}>Net Wt (Kg)</th>
                      <th style={gridStyles.th}>Gross Wt (Kg)</th>
                      <th style={gridStyles.th}>Calculated CBM</th>
                      {isEditable && <th style={{ ...gridStyles.th, width: "50px", textAlign: "center" }}>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(formik.values.dimensions || []).map((row, index) => (
                      <tr key={index}>
                        <td style={gridStyles.td}>
                          <input
                            type="number"
                            disabled={!isEditable}
                            style={gridStyles.input}
                            value={row.length || ""}
                            onChange={(e) => handleDimensionChange(index, "length", e.target.value)}
                            placeholder="L"
                          />
                        </td>
                        <td style={gridStyles.td}>
                          <input
                            type="number"
                            disabled={!isEditable}
                            style={gridStyles.input}
                            value={row.breadth || ""}
                            onChange={(e) => handleDimensionChange(index, "breadth", e.target.value)}
                            placeholder="B"
                          />
                        </td>
                        <td style={gridStyles.td}>
                          <input
                            type="number"
                            disabled={!isEditable}
                            style={gridStyles.input}
                            value={row.height || ""}
                            onChange={(e) => handleDimensionChange(index, "height", e.target.value)}
                            placeholder="H"
                          />
                        </td>
                        <td style={gridStyles.td}>
                          <select
                            disabled={!isEditable}
                            style={gridStyles.select}
                            value={row.uom || "cm"}
                            onChange={(e) => handleDimensionChange(index, "uom", e.target.value)}
                          >
                            <option value="cm">cm</option>
                            <option value="inch">inch</option>
                            <option value="m">m</option>
                            <option value="ft">ft</option>
                          </select>
                        </td>
                        <td style={gridStyles.td}>
                          <input
                            type="number"
                            disabled={!isEditable}
                            style={gridStyles.input}
                            value={row.no_packages || ""}
                            onChange={(e) => handleDimensionChange(index, "no_packages", e.target.value)}
                            placeholder="Pkgs"
                          />
                        </td>
                        <td style={gridStyles.td}>
                          <input
                            type="number"
                            disabled={!isEditable}
                            style={gridStyles.input}
                            value={row.net_weight || ""}
                            onChange={(e) => handleDimensionChange(index, "net_weight", e.target.value)}
                            placeholder="Net weight"
                          />
                        </td>
                        <td style={gridStyles.td}>
                          <input
                            type="number"
                            disabled={!isEditable}
                            style={gridStyles.input}
                            value={row.gross_weight || ""}
                            onChange={(e) => handleDimensionChange(index, "gross_weight", e.target.value)}
                            placeholder="Gross weight"
                          />
                        </td>
                        <td style={gridStyles.td}>
                          <div style={gridStyles.calcField}>
                            {row.calculated_cbm ? row.calculated_cbm.toFixed(4) : "0.0000"}
                          </div>
                        </td>
                        {isEditable && (
                          <td style={{ ...gridStyles.td, textAlign: "center" }}>
                            <button
                              type="button"
                              style={gridStyles.btnDanger}
                              onClick={() => handleRemoveDimensionRow(index)}
                            >
                              Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Box>

            {/* Container Details Section */}
            <Box sx={{ mt: 3, mb: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontSize: "11px", fontWeight: 700, color: "#374151", textTransform: "uppercase" }}>
                  Container Details
                </Typography>
                {isEditable && (
                  <button
                    type="button"
                    style={gridStyles.btnAddRow}
                    onClick={handleAddContainerRow}
                  >
                    + Add More
                  </button>
                )}
              </Box>

              <Box sx={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "3px" }}>
                <table style={gridStyles.table}>
                  <thead>
                    <tr>
                      <th style={gridStyles.th}>Container No.</th>
                      <th style={gridStyles.th}>Custom Seal</th>
                      <th style={gridStyles.th}>Line Seal</th>
                      {isEditable && <th style={{ ...gridStyles.th, width: "50px", textAlign: "center" }}>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(formik.values.containers || []).map((cRow, index) => (
                      <tr key={index}>
                        <td style={gridStyles.td}>
                          <input
                            type="text"
                            disabled={!isEditable}
                            style={gridStyles.input}
                            value={cRow.containerNo || ""}
                            onChange={(e) => handleContainerChange(index, "containerNo", e.target.value)}
                            placeholder="Container No"
                          />
                        </td>
                        <td style={gridStyles.td}>
                          <input
                            type="text"
                            disabled={!isEditable}
                            style={gridStyles.input}
                            value={cRow.customSealNo || ""}
                            onChange={(e) => handleContainerChange(index, "customSealNo", e.target.value)}
                            placeholder="Custom Seal"
                          />
                        </td>
                        <td style={gridStyles.td}>
                          <input
                            type="text"
                            disabled={!isEditable}
                            style={gridStyles.input}
                            value={cRow.shippingLineSealNo || ""}
                            onChange={(e) => handleContainerChange(index, "shippingLineSealNo", e.target.value)}
                            placeholder="Line Seal"
                          />
                        </td>
                        {isEditable && (
                          <td style={{ ...gridStyles.td, textAlign: "center" }}>
                            <button
                              type="button"
                              style={gridStyles.btnDanger}
                              onClick={() => handleRemoveContainerRow(index)}
                            >
                              Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Box>

            {/* Summary calculations block */}
            <div style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              backgroundColor: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "4px",
              padding: "8px 10px",
              marginBottom: "8px",
              marginTop: "12px"
            }}>
              <div style={{ flex: "1 1 100px", display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "9px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Total Packages</span>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#111827" }}>{finalPackages}</span>
                  <input
                    name="package_unit"
                    value={formik.values.package_unit || ""}
                    onChange={formik.handleChange}
                    disabled={!isEditable}
                    style={{ width: "45px", height: "18px", fontSize: "9.5px", fontWeight: 600, padding: "0 3px", border: "1px solid #cbd5e1", borderRadius: "2px", outline: "none", backgroundColor: !isEditable ? "#f1f5f9" : "#fff" }}
                    placeholder="Unit"
                  />
                </div>
              </div>
              <div style={{ flex: "1 1 100px", display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "9px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Total Net Wt</span>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#111827" }}>{finalNetWeight.toFixed(2)}</span>
                  <input
                    name="net_weight_unit"
                    value={formik.values.net_weight_unit || ""}
                    onChange={formik.handleChange}
                    disabled={!isEditable}
                    style={{ width: "35px", height: "18px", fontSize: "9.5px", fontWeight: 600, padding: "0 3px", border: "1px solid #cbd5e1", borderRadius: "2px", outline: "none", backgroundColor: !isEditable ? "#f1f5f9" : "#fff" }}
                    placeholder="Unit"
                  />
                </div>
              </div>
              <div style={{ flex: "1 1 100px", display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "9px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Total Gross Wt</span>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#111827" }}>{finalGrossWeight.toFixed(2)}</span>
                  <input
                    name="gross_weight_unit"
                    value={formik.values.gross_weight_unit || ""}
                    onChange={formik.handleChange}
                    disabled={!isEditable}
                    style={{ width: "35px", height: "18px", fontSize: "9.5px", fontWeight: 600, padding: "0 3px", border: "1px solid #cbd5e1", borderRadius: "2px", outline: "none", backgroundColor: !isEditable ? "#f1f5f9" : "#fff" }}
                    placeholder="Unit"
                  />
                </div>
              </div>
              <div style={{ flex: "1 1 100px", display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "9px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Total Volume</span>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#16408f" }}>{finalVolumeCbm.toFixed(4)}</span>
                  <input
                    name="volume_unit"
                    value={formik.values.volume_unit || ""}
                    onChange={formik.handleChange}
                    disabled={!isEditable}
                    style={{ width: "40px", height: "18px", fontSize: "9.5px", fontWeight: 600, padding: "0 3px", border: "1px solid #cbd5e1", borderRadius: "2px", outline: "none", backgroundColor: !isEditable ? "#f1f5f9" : "#fff" }}
                    placeholder="Unit"
                  />
                </div>
              </div>
              <div style={{ flex: "1 1 100px", display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "9px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>
                  Volumetric Wt ({formik.values.shipment_type && formik.values.shipment_type.includes("Air") ? "Air: 1:167" : "Sea: 1:1000"})
                </span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#4b5563", marginTop: "2px" }}>
                  {volumetricWeight.toFixed(2)} {formik.values.gross_weight_unit || "KG"}
                </span>
              </div>
              <div style={{ flex: "1 1 130px", display: "flex", flexDirection: "column", borderLeft: "2px solid #16408f", paddingLeft: "10px" }}>
                <span style={{ fontSize: "9px", fontWeight: 700, color: "#16408f", textTransform: "uppercase" }}>Chargeable Weight</span>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 800, color: "#16408f" }}>{chargeableWeight.toFixed(2)}</span>
                  <input
                    name="chargeable_weight_unit"
                    value={formik.values.chargeable_weight_unit || ""}
                    onChange={formik.handleChange}
                    disabled={!isEditable}
                    style={{ width: "35px", height: "18px", fontSize: "9.5px", fontWeight: 600, padding: "0 3px", border: "1px solid #cbd5e1", borderRadius: "2px", outline: "none", backgroundColor: !isEditable ? "#f1f5f9" : "#fff" }}
                    placeholder="Unit"
                  />
                </div>
              </div>
            </div>

            {/* Remarks Textarea */}
            <Box sx={{ mt: 2 }}>
              {renderTextAreaBox("Remarks", "remarks", 3)}
            </Box>

          </Box>
        </TabPanel>

        {/* Tab panel: BL Instructions */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ border: "1.5px solid #e2e8f0", borderRadius: "4px", overflow: "hidden", backgroundColor: "#f8fafc", p: 1.5 }}>
            <Typography variant="h6" sx={{ fontSize: "13px", fontWeight: 700, color: "#16408f", mb: 1.5, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Bill of Lading Instructions
            </Typography>
            <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
              <Grid item xs={12}>
                {renderTextAreaBox("Consignor (Exporter)", "bl_details.consignor", 3)}
              </Grid>
            </Grid>
            <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
              <Grid item xs={12}>
                {renderTextAreaBox("Consignee (Name & Address)", "bl_details.consignee", 3)}
              </Grid>
            </Grid>
            <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
              <Grid item xs={12}>
                {renderTextAreaBox("Notify Address (Leave blank if Same as Consignee)", "bl_details.notify_party", 3)}
              </Grid>
            </Grid>
            
            <Typography variant="subtitle2" sx={{ fontSize: "11px", fontWeight: 700, color: "#475569", mt: 1.5, mb: 1, textTransform: "uppercase" }}>
              Transport Details
            </Typography>
            <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
              <Grid item xs={12} md={4}>
                {renderInputBox("Vessel & Voyage No.", "bl_details.vessel_name")}
              </Grid>
              <Grid item xs={12} md={2}>
                {renderSelectBox("Mode of Transport", "bl_details.mode_of_transport", [
                  { label: "SEA", value: "SEA" },
                  { label: "AIR", value: "AIR" },
                  { label: "ROAD", value: "ROAD" }
                ])}
              </Grid>
              <Grid item xs={12} md={3}>
                {renderInputBox("Route / Transshipment", "bl_details.route_transshipment")}
              </Grid>
              <Grid item xs={12} md={3}>
                {renderInputBox("Place of Acceptance", "bl_details.place_of_acceptance")}
              </Grid>
            </Grid>

            <Typography variant="subtitle2" sx={{ fontSize: "11px", fontWeight: 700, color: "#475569", mt: 1.5, mb: 1, textTransform: "uppercase" }}>
              Cargo Details
            </Typography>
            <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
              <Grid item xs={12} md={6}>
                {renderTextAreaBox("Container No (s)", "bl_details.container_numbers", 2)}
              </Grid>
              <Grid item xs={12} md={6}>
                {renderTextAreaBox("Marks & Numbers", "bl_details.marks_numbers", 2)}
              </Grid>
            </Grid>
            <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
              <Grid item xs={12} md={4}>
                {renderInputBox("Number and kind of packages", "bl_details.packages_description")}
              </Grid>
              <Grid item xs={12} md={8}>
                {renderTextAreaBox("General Description of Goods", "bl_details.description_of_goods", 3)}
              </Grid>
            </Grid>
            <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
              <Grid item xs={12} md={3}>
                {renderInputBox("HSN Code", "bl_details.hsn_code")}
              </Grid>
              <Grid item xs={12} md={3}>
                {renderInputBox("Gross Weight", "bl_details.gross_weight")}
              </Grid>
              <Grid item xs={12} md={3}>
                {renderInputBox("Measurement", "bl_details.measurement")}
              </Grid>
              <Grid item xs={12} md={3}>
                {renderInputBox("Freight Amount", "bl_details.freight_amount")}
              </Grid>
            </Grid>
            <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
              <Grid item xs={12} md={4}>
                {renderInputBox("No. of MTD (Originals)", "bl_details.no_of_originals")}
              </Grid>
              <Grid item xs={12} md={4}>
                {renderInputBox("Place of Issue", "bl_details.place_of_issue")}
              </Grid>
              <Grid item xs={12} md={4}>
                {renderBLDateInputBox("Date of Issue", "sailing_date")}
              </Grid>
            </Grid>
            <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
              <Grid item xs={12}>
                {renderTextAreaBox("Agent Details", "bl_details.agent_details", 3)}
              </Grid>
            </Grid>
            <Grid container spacing={0.5}>
              <Grid item xs={12}>
                {renderTextAreaBox("Other Particulars (If any)", "bl_details.other_particulars", 2)}
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Tab panel: Charges */}
        <TabPanel value={activeTab} index={1}>
          <ChargesTab job={data} formik={formik} isEditable={isEditable || (formik.values?.send_for_billing && isLocked)} />
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
