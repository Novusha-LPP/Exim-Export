import React, { useState, useEffect, useRef, useContext } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Autocomplete,
  TextField,
  Menu,
  Pagination,
  CircularProgress,
  Checkbox,
  ListItemText,
  Badge,
  Box,
  Button,
  Divider,
  DialogActions,
  ListSubheader,
  Popover,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LockIcon from "@mui/icons-material/Lock"; // Import LockIcon
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import GavelIcon from "@mui/icons-material/Gavel"; // Import GavelIcon
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import { uploadFileToS3 } from "../../../utils/awsFileUpload";
import AddExJobs from "./AddExJobs";
import { formatDate } from "../../../utils/dateUtils";
import { priorityFilter } from "../../../utils/filterUtils";
import ExportChecklistGenerator from "./StandardDocuments/ExportChecklistGenerator";
import ConsignmentNoteGenerator from "./StandardDocuments/ConsignmentNoteGenerator";
import FileCoverGenerator from "./StandardDocuments/FileCoverGenerator";
import ForwardingNoteTharGenerator from "./StandardDocuments/ForwardingNoteTharGenerator";
import AnnexureCGenerator from "./StandardDocuments/AnnexureCGenerator";
import ConcorForwardingNoteGenerator from "./StandardDocuments/ConcorForwardingNoteGenerator.js";
import VGMAuthorizationGenerator from "./StandardDocuments/VGMAuthorizationGenerator";
import FreightCertificateGenerator from "./StandardDocuments/FreightCertificateGenerator";
import BillOfLadingGenerator from "./StandardDocuments/BillOfLadingGenerator";
import { CUSTOM_HOUSE_OPTIONS, getOptionsForBranch } from "../../common/CustomHouseDropdown";
import { UserContext } from "../../../contexts/UserContext";
import SBTrackDialog from "./SBTrackDialog";
import ContainerTrackDialog from "./ContainerTrackDialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShip, faAnchor } from "@fortawesome/free-solid-svg-icons";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import RaiseQueryDialog from "./Queries/RaiseQueryDialog";

const ResponsiveStyles = () => (
  <style>
    {`
      @media (max-width: 1200px) {
        .toolbar-responsive {
          justify-content: flex-start !important;
          flex-wrap: wrap !important;
        }
        .search-container-responsive {
          margin-left: 0 !important;
          width: 100% !important;
        }
        .search-input-responsive {
          flex: 1 !important;
          width: auto !important;
        }
      }

      @media (max-width: 768px) {
        .wrapper-responsive {
          padding: 4px !important;
        }
        .tab-container-responsive {
          overflow-x: auto !important;
          white-space: nowrap !important;
          scrollbar-width: none !important;
          padding-bottom: 4px !important;
        }
        .tab-container-responsive::-webkit-scrollbar {
          display: none !important;
        }
        .toolbar-responsive {
          padding: 6px !important;
          gap: 6px !important;
        }
        .toolbar-responsive > * {
          flex-grow: 1 !important;
          min-width: calc(50% - 6px) !important;
          height: 32px !important;
        }
        .search-container-responsive {
          min-width: 100% !important;
        }
        .table-container-responsive {
          max-height: calc(100vh - 220px) !important;
        }
        .s-td {
          padding: 4px 6px !important;
        }
      }

      @media (max-width: 480px) {
        .toolbar-responsive > * {
          min-width: 100% !important;
        }
        .page-title-responsive {
          font-size: 14px !important;
        }
        .tab-responsive {
          padding: 6px 10px !important;
          font-size: 11px !important;
        }
      }

      /* Custom scrollbar for better look */
      .table-container-responsive::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      .table-container-responsive::-webkit-scrollbar-track {
        background: #f8fafc;
      }
      .table-container-responsive::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 10px;
      }
      .table-container-responsive::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }

      @keyframes pulse-dot {
        0% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
        }
        70% {
          transform: scale(1);
          box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
        }
        100% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
        }
      }
      .flashing-pulse-dot {
        animation: pulse-dot 2s infinite;
      }
    `}
  </style>
);


// --- Clean Enterprise Styles ---
const s = {
  wrapper: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
    backgroundColor: "#fafaffff",
    padding: "5px 15px", // Reduced from 10px 15px
    minHeight: "100vh",
    color: "#333",
    fontSize: "12px",
  },

  container: {
    width: "100%",
    margin: "0 auto",
  },
  headerRow: {
    marginBottom: "5px",
    paddingBottom: "0",
  },
  pageTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#111",
    margin: "0",
  },

  // Tabs
  tabContainer: {
    display: "flex",
    borderBottom: "1px solid #e5e7eb",
    marginBottom: "10px",
  },
  tab: {
    padding: "6px 15px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
    color: "#6b7280",
    borderBottom: "3px solid transparent",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "transparent",
    border: "none",
    outline: "none",
    marginBottom: "-1px",
  },
  activeTab: {
    color: "#2563eb",
    borderBottom: "3px solid #2563eb",
  },
  badge: {
    padding: "1px 6px",
    borderRadius: "10px",
    fontSize: "10px",
    fontWeight: "700",
    backgroundColor: "#f3f4f6",
    color: "#4b5563",
  },
  activeBadge: {
    backgroundColor: "#eff6ff",
    color: "#2563eb",
  },

  // Toolbar
  toolbar: {
    display: "flex",
    gap: "6px",
    rowGap: "8px",
    alignItems: "center",
    marginBottom: "8px",
    flexWrap: "wrap",
    backgroundColor: "#fff",
    padding: "6px 10px",
    borderRadius: "6px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    border: "1px solid #e5e7eb"
  },
  input: {
    height: "28px",
    padding: "0 6px",
    fontSize: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "3px",
    outline: "none",
    color: "#333",
    minWidth: "150px",
  },
  select: {
    height: "28px",
    padding: "0 4px",
    fontSize: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "3px",
    backgroundColor: "#fff",
    color: "#333",
    cursor: "pointer",
    minWidth: "60px",
  },

  // Table
  tableContainer: {
    overflowX: "auto",
    border: "1px solid #ccccccff",
    borderRadius: "3px",
    maxHeight: "700px",
    overflowY: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    fontSize: "11px",
    tableLayout: "auto",
  },
  th: {
    padding: "10px 8px",
    textAlign: "left",
    fontWeight: "700",
    fontSize: "12px",
    color: "#ffffff",
    borderBottom: "2px solid rgba(255,255,255,0.1)",
    borderRight: "1px solid rgba(255,255,255,0.05)",
    whiteSpace: "normal",
    wordBreak: "break-word",
    verticalAlign: "middle",
    top: 0,
    zIndex: 10,
  },
  td: {
    padding: "10px 8px",
    borderBottom: "1px solid #e2e8f0",
    color: "#1e293b",
    whiteSpace: "normal",
    wordBreak: "break-word",
    verticalAlign: "top",
    transition: "all 0.2s ease",
  },
  rowHover: {
    transition: "transform 0.2s, box-shadow 0.2s",
    "&:hover": {
      backgroundColor: "#f8fafc !important",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      zIndex: 2,
    }
  },

  // Clickable job number
  clickableJobNo: {
    fontWeight: "600",
    color: "#2563eb",
    cursor: "pointer",
    textDecoration: "none",
    // position: "sticky",
    left: 0,
    backgroundColor: "inherit",
    zIndex: 5,
    "&:hover": {
      textDecoration: "underline",
    },
  },

  // Chips
  chip: {
    padding: "2px 6px",
    borderRadius: "3px",
    fontSize: "10px",
    fontWeight: "600",
    border: "1px solid #e5e7eb",
    backgroundColor: "#fff",
    display: "inline-block",
  },

  // Pagination Footer
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderTop: "1px solid #e5e7eb",
    marginTop: "10px",
    color: "#6b7280",
    fontSize: "12px",
  },
  btnPage: {
    padding: "5px 12px",
    border: "1px solid #d1d5db",
    backgroundColor: "#fff",
    borderRadius: "3px",
    cursor: "pointer",
    fontSize: "12px",
    color: "#374151",
    marginLeft: "5px",
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
    backgroundColor: "#f9fafb",
  },

  // Loading
  message: {
    padding: "40px",
    textAlign: "center",
    color: "#9ca3af",
    fontStyle: "italic",
  },
};

// Branch Options
const branchOptions = [
  { code: "", label: "All Branches" },
  { code: "BRD", label: "BRD - BARODA" },
  { code: "GIM", label: "GIM - GANDHIDHAM" },
  { code: "HAZ", label: "HAZ - HAZIRA" },
  { code: "AMD", label: "AMD - AHMEDABAD" },
  { code: "COK", label: "COK - COCHIN" },
];

// Transport Mode Options
const transportModeOptions = [
  { value: "SEA", label: "SEA" },
  { value: "AIR", label: "AIR" },
];

const movementTypeOptions = [
  { value: "FCL", label: "FCL" },
  { value: "LCL", label: "LCL" },
  { value: "AIR", label: "AIR" },
];

// --- UI UX Premium Themes ---
const statusThemes = {
  "Pending": { bg: "#f8fafc", border: "#94a3b8", text: "#475569", light: "#f1f5f9" },
  "SB Filed": { bg: "#f0f9ff", border: "#0ea5e9", text: "#0369a1", light: "#e0f2fe" },
  "L.E.O": { bg: "#fff1f2", border: "#f43f5e", text: "#be123c", light: "#ffe4e6" },
  "Container HO": { bg: "#f0fdf4", border: "#22c55e", text: "#15803d", light: "#dcfce7" },
  "File Handover to IATA": { bg: "#f0fdf4", border: "#22c55e", text: "#15803d", light: "#dcfce7" },
  "Rail Out": { bg: "#f5f3ff", border: "#8b5cf6", text: "#6d28d9", light: "#ede9fe" },
  "Departure": { bg: "#f5f3ff", border: "#8b5cf6", text: "#6d28d9", light: "#ede9fe" },
  "Send for Billing": { bg: "#fdf2f8", border: "#ec4899", text: "#be185d", light: "#fce7f3" },
  "Billing Pending": { bg: "#fff7ed", border: "#f59e0b", text: "#b45309", light: "#ffedd5" },
  "Billing Done": { bg: "#f0fdfa", border: "#14b8a6", text: "#0f766e", light: "#ccfbf1" },
  "Completed": { bg: "#f1f5f9", border: "#64748b", text: "#334155", light: "#e2e8f0" },
  "default": { bg: "transparent", border: "#e5e7eb", text: "#374151", light: "#f9fafb" }
};

const getStatusTheme = (statusValue) => {
  return statusThemes[statusValue] || statusThemes["default"];
};

const getStatusColor = (statusValue) => getStatusTheme(statusValue).bg;

const buildShippingLineUrls = (num, containerFirst = "") => ({
  MSC: "https://www.msc.com/en/track-a-shipment",
  "M S C": "https://www.msc.com/en/track-a-shipment",
  "MSC LINE": "https://www.msc.com/en/track-a-shipment",
  "Maersk Line": `https://www.maersk.com/tracking/${num}`,
  "CMA CGM AGENCIES INDIA PVT. LTD": "https://www.cma-cgm.com/ebusiness/tracking/search",
  "Hapag-Lloyd": `https://www.hapag-lloyd.com/en/online-business/track/track-by-booking-solution.html?booking=${num}`,
  "Trans Asia": `http://182.72.192.230/TASFREIGHT/AppTasnet/ContainerTracking.aspx?&containerno=${containerFirst}&booking=${num}`,
  "ONE LINE": "https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking",
  HMM: "https://www.hmm21.com/e-service/general/trackNTrace/TrackNTrace.do",
  HYUNDI: "https://www.hmm21.com/e-service/general/trackNTrace/TrackNTrace.do",
  "Cosco Container Lines": "https://elines.coscoshipping.com/ebusiness/cargotracking",
  COSCO: "https://elines.coscoshipping.com/ebusiness/cargotracking",
  "Unifeeder Agencies India Pvt Ltd": num
    ? `https://www.unifeeder.cargoes.com/tracking?ID=${num.slice(0, 3)}%2F${num.slice(3, 6)}%2F${num.slice(6, 8)}%2F${num.slice(8)}`
    : "#",
  UNIFEEDER: num
    ? `https://www.unifeeder.cargoes.com/tracking?ID=${num.slice(0, 3)}%2F${num.slice(3, 6)}%2F${num.slice(6, 8)}%2F${num.slice(8)}`
    : "#",
});

const getContainerSizeLabel = (value) => {
  const raw = (value || "").toString().toUpperCase().trim();
  if (!raw) return "";
  let label = raw;
  label = label.replace(/HIGH CUBE/g, "HC");
  label = label.replace(/STANDARD/g, "STD");
  label = label.replace(/OPEN TOP/g, "OT");
  label = label.replace(/FLAT RACK/g, "FR");
  label = label.replace(/REEFER/g, "RF");
  return label;
};

const QuickUploadButton = ({ job, field, uploadType = "status", idx = 0, onSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadFileToS3(file, "export_docs");
      const url = result.Location;

      let dotPath = "";
      let currentFiles = [];

      if (uploadType === "toplevel") {
        dotPath = field;
        currentFiles = Array.isArray(job[field]) ? [...job[field]] : [];
      } else if (uploadType === "section") {
        dotPath = `operations.0.${field}.${idx}.images`;
        const ops = job.operations?.[0] || {};
        const section = Array.isArray(ops[field]) ? ops[field] : [];
        const item = section[idx] || {};
        currentFiles = Array.isArray(item.images) ? [...item.images] : [];
      } else if (uploadType === "container") {
        dotPath = `containers.${idx}.${field}`;
        const container = job.containers?.[idx] || {};
        currentFiles = Array.isArray(container[field]) ? [...container[field]] : [];
      } else {
        dotPath = `operations.0.statusDetails.0.${field}`;
        const ops = job.operations?.[0] || {};
        const status = (ops.statusDetails && ops.statusDetails[0]) || {};
        currentFiles = Array.isArray(status[field]) ? [...status[field]] : [];
      }

      const newValue = [...currentFiles, url];

      await axios.patch(
        `${import.meta.env.VITE_API_STRING}/${encodeURIComponent(job.job_no)}/fields`,
        {
          fieldUpdates: [{ field: dotPath, value: newValue }]
        }
      );

      if (onSuccess) onSuccess(url);
    } catch (err) {
      console.error("Quick upload err:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          fileInputRef.current?.click();
        }}
        disabled={uploading}
        style={{ padding: "1px", marginLeft: "2px" }}
        title="Quick Upload Document"
      >
        {uploading ? (
          <CircularProgress size={12} style={{ color: "#16408f" }} />
        ) : (
          <CloudUploadIcon style={{ fontSize: "14px", color: "#16408f" }} />
        )}
      </IconButton>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv,.mp4,application/pdf,image/jpeg,image/png,video/mp4"
        style={{ display: "none" }}
      />
    </>
  );
};

const QuickDeleteButton = ({ job, field, url, uploadType = "status", idx = 0, onSuccess }) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    setDeleting(true);
    try {
      let dotPath = "";
      let currentFiles = [];

      if (uploadType === "toplevel") {
        dotPath = field;
        currentFiles = Array.isArray(job[field]) ? [...job[field]] : [];
      } else if (uploadType === "section") {
        dotPath = `operations.0.${field}.${idx}.images`;
        const ops = job.operations?.[0] || {};
        const section = Array.isArray(ops[field]) ? ops[field] : [];
        const item = section[idx] || {};
        currentFiles = Array.isArray(item.images) ? [...item.images] : [];
      } else if (uploadType === "container") {
        dotPath = `containers.${idx}.${field}`;
        const container = job.containers?.[idx] || {};
        currentFiles = Array.isArray(container[field]) ? [...container[field]] : [];
      } else {
        dotPath = `operations.0.statusDetails.0.${field}`;
        const ops = job.operations?.[0] || {};
        const status = (ops.statusDetails && ops.statusDetails[0]) || {};
        currentFiles = Array.isArray(status[field]) ? [...status[field]] : [];
      }

      const newValue = currentFiles.filter(f => f !== url);

      await axios.patch(
        `${import.meta.env.VITE_API_STRING}/${encodeURIComponent(job.job_no)}/fields`,
        {
          fieldUpdates: [{ field: dotPath, value: newValue }]
        }
      );

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Quick delete err:", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <IconButton
      size="small"
      onClick={(e) => handleDelete(e)}
      disabled={deleting}
      style={{ padding: "1px", marginLeft: "2px" }}
      title="Delete Document"
    >
      {deleting ? (
        <CircularProgress size={12} style={{ color: "#dc2626" }} />
      ) : (
        <DeleteIcon style={{ fontSize: "14px", color: "#dc2626" }} />
      )}
    </IconButton>
  );
};

// Helper to determine current Indian financial year (starts April)
const getCurrentFinancialYear = () => {
  const today = new Date();
  const month = today.getMonth(); // 0-based: 0=Jan, 3=April
  const year = today.getFullYear();
  if (month < 3) {
    return `${(year - 1).toString().slice(-2)}-${year.toString().slice(-2)}`;
  }
  return `${year.toString().slice(-2)}-${(year + 1).toString().slice(-2)}`;
};

const PulseOverviewHover = ({ exporter }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchPulse = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_STRING}/export-analytics/pulse`, {
          params: { exporter }
        });
        if (active && response.data.success) {
          setSummary(response.data.summary);
        }
      } catch (error) {
        console.error("Pulse fetch error in hover overview:", error);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchPulse();
    return () => { active = false; };
  }, [exporter]);

  if (loading || !summary) {
    return (
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '200px', bgcolor: '#0b0f19', color: '#94a3b8', borderRadius: '8px', border: '1px solid #1e293b' }}>
        <CircularProgress size={16} sx={{ color: '#f87171', mr: 1.5 }} />
        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>FETCHING OVERVIEW...</span>
      </Box>
    );
  }

  const getSeverity = (title, value) => {
    if (title === "CREATED TODAY") {
      return value > 0 ? 'green' : 'amber';
    }
    return value === 0 ? 'green' : value <= 10 ? 'amber' : 'red';
  };

  const getSeverityColor = (severity) => {
    if (severity === 'green') return '#10b981';
    if (severity === 'amber') return '#f59e0b';
    return '#ef4444';
  };

  const getSeverityBg = (severity) => {
    if (severity === 'green') return 'rgba(16, 185, 129, 0.1)';
    if (severity === 'amber') return 'rgba(245, 158, 11, 0.1)';
    return 'rgba(239, 68, 68, 0.1)';
  };

  const getSeverityGlow = (severity) => {
    if (severity === 'green') return '#34d399';
    if (severity === 'amber') return '#fbbf24';
    return '#f87171';
  };

  const getStatusLabel = (severity) => {
    if (severity === 'green') return '🏆 ALL CLEAR';
    if (severity === 'amber') return '⚡ PENDING';
    return '🚨 ACTION REQUIRED';
  };

  const metrics = [
    { title: "TOTAL PENDING JOBS", value: summary.totalPending },
    { title: "HANDOVER PENDING", value: summary.handover },
    { title: "BILLING PENDING", value: summary.billing },
    { title: "OPERATIONS PENDING", value: summary.ops },
    { title: "CREATED TODAY", value: summary.createdToday },
  ];

  return (
    <Box sx={{
      p: 2.5,
      bgcolor: '#0a0f1d',
      borderRadius: '12px',
      border: '1px solid #1e293b',
      boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
      width: '450px',
      fontFamily: '"Outfit", "Roboto", sans-serif'
    }}>
      <Box sx={{ mb: 2, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#f3f4f6', letterSpacing: '1px', mb: 0.2 }}>
          ALVISION — PULSE OVERVIEW
        </Typography>
        <Typography sx={{ fontSize: '10px', color: '#64748b', letterSpacing: '0.5px' }}>
          Real-time monitoring across all modules
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
        {metrics.map((m, idx) => {
          const severity = getSeverity(m.title, m.value);
          const color = getSeverityColor(severity);
          const bg = getSeverityBg(severity);
          const glow = getSeverityGlow(severity);
          
          const gridColumn = idx === 4 ? 'span 2' : 'span 1';

          return (
            <Box key={m.title} sx={{
              gridColumn,
              p: 1.5,
              bgcolor: 'rgba(17, 24, 39, 0.7)',
              borderRadius: '8px',
              border: `1.5px solid rgba(30, 41, 59, 0.5)`,
              borderTop: `3px solid ${color}`,
              boxShadow: `0 4px 15px rgba(0, 0, 0, 0.25)`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Typography sx={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px', mb: 0.8, textAlign: 'center' }}>
                {m.title}
              </Typography>
              <Typography sx={{
                fontSize: '28px',
                fontWeight: 900,
                color: glow,
                textShadow: `0 0 10px ${color}40`,
                lineHeight: 1,
                mb: 1
              }}>
                {m.value}
              </Typography>
              <Box sx={{
                px: 1,
                py: 0.2,
                bgcolor: bg,
                borderRadius: '4px',
                border: `1px solid ${color}30`
              }}>
                <Typography sx={{ fontSize: '7.5px', fontWeight: 700, color, letterSpacing: '0.3px' }}>
                  {getStatusLabel(severity)}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

const ExportJobsTable = () => {
  const { user } = useContext(UserContext);
  const isAdmin = user?.role === "Admin";
  const [pulseAnchorEl, setPulseAnchorEl] = useState(null);
  const pulseOpen = Boolean(pulseAnchorEl);

  const handlePulseHover = (event) => {
    setPulseAnchorEl(event.currentTarget);
  };

  const handlePulseClose = () => {
    setPulseAnchorEl(null);
  };

  const getFilterSelectStyle = (isNotDefault, widthVal) => ({
    ...s.select,
    width: widthVal,
    ...(isNotDefault ? {
      backgroundColor: "#eff6ff",
      borderColor: "#3b82f6",
      color: "#1e40af",
      fontWeight: "600"
    } : {})
  });

  // Filter Branch Options based on User Permissions
  const allowedBranches = isAdmin ? [] : (user?.selected_branches || []);
  const filteredBranchOptions = branchOptions.filter(b =>
    isAdmin || b.code === "" || allowedBranches.includes(b.code)
  );

  const navigate = useNavigate();

  // Determine active module path prefixes
  const isOperationModule = window.location.pathname.startsWith("/export-operation");
  const isChargesModule = window.location.pathname.startsWith("/export-charges");

  const getModuleSuffix = () => {
    if (isOperationModule) return "operation";
    if (window.location.pathname.startsWith("/export-documentation")) return "documentation";
    if (window.location.pathname.startsWith("/export-esanchit")) return "esanchit";
    if (isChargesModule) return "charges";
    return "dsr";
  };

  const FILTER_STORAGE_KEY = `export_jobs_filters_${getModuleSuffix()}`;
  const savedFilters = (() => {
    try {
      const saved = localStorage.getItem(FILTER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  })();

  const isInitialMount = useRef(true);
  const isInitialSave = useRef(true);

  // State
  const [activeTab, setActiveTab] = useState(() => {
    const saved = savedFilters.activeTab || "Pending";
    if (isOperationModule) {
      const allowedOpsTabs = ["Pending", "Op Completed", "Completed"];
      if (allowedOpsTabs.includes(saved)) return saved;
      if (saved === "Completed" || saved === "Billing Ready") return "Op Completed";
      return "Pending";
    }
    if (isChargesModule) {
      const allowedChargesTabs = ["Pending", "Completed", "General Jobs", "Freight Forwarding"];
      if (allowedChargesTabs.includes(saved)) return saved;
      return "Pending";
    }
    // Default module (Jobs, Documentation, ESanchit)
    const allowedDefaultTabs = ["Pending", "Booking Pending", "Handover Pending", "Billing Pending", "club-jobs", "Completed", "Cancelled"];
    if (allowedDefaultTabs.includes(saved)) return saved;
    if (saved === "Op Completed" || saved === "Billing Ready") return "Completed";
    return "Pending";
  });
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Queries status for individual jobs
  const currentModuleForQueries = window.location.pathname.startsWith("/export-operation")
    ? "export-operation"
    : window.location.pathname.startsWith("/export-documentation")
      ? "export-documentation"
      : window.location.pathname.startsWith("/export-esanchit")
        ? "export-esanchit"
        : window.location.pathname.startsWith("/export-charges")
          ? "export-charges"
          : "export-dsr";

  const [jobQueriesStatus, setJobQueriesStatus] = useState({});
  const [onlyPendingQueries, setOnlyPendingQueries] = useState(savedFilters.onlyPendingQueries || false);
  const [unresolvedCount, setUnresolvedCount] = useState(0);

  const sortedJobs = React.useMemo(() => {
    return [...jobs].sort((a, b) => {
      const aHasQuery = jobQueriesStatus[a.job_no]?.hasOpenClientQueries ? 1 : 0;
      const bHasQuery = jobQueriesStatus[b.job_no]?.hasOpenClientQueries ? 1 : 0;
      return bHasQuery - aHasQuery;
    });
  }, [jobs, jobQueriesStatus]);

  useEffect(() => {
    const fetchUnresolvedCount = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_STRING}/queries/count`, {
          params: {
            targetModule: currentModuleForQueries,
            status: "open",
          },
          headers: {
            username: user?.username || "",
          },
        });
        setUnresolvedCount(res.data?.count || 0);
      } catch (error) {
        setUnresolvedCount(0);
      }
    };

    fetchUnresolvedCount();
    // Refresh every minute
    const interval = setInterval(fetchUnresolvedCount, 60000);
    return () => clearInterval(interval);
  }, [user?.username, currentModuleForQueries]);

  useEffect(() => {
    const jobNos = jobs.map(j => j.job_no).filter(Boolean);
    if (jobNos.length === 0) {
      setJobQueriesStatus({});
      return;
    }
    const fetchStats = async () => {
      try {
        const [internalRes, clientRes] = await Promise.all([
          axios.post(`${import.meta.env.VITE_API_STRING}/queries/jobs-status`, {
            jobNos,
            currentModule: currentModuleForQueries
          }),
          axios.post(`${import.meta.env.VITE_API_STRING}/client-queries/jobs-status`, {
            jobNos,
            isClient: false
          }).catch(() => ({ data: { success: false } }))
        ]);

        const combined = {};
        jobNos.forEach(j => {
          combined[j] = {
            hasQueries: false,
            hasUnseen: false,
            hasOpenQueries: false,
            hasOpenClientQueries: false
          };
        });

        if (internalRes.data?.success) {
          const data = internalRes.data.data;
          Object.keys(data).forEach(j => {
            if (data[j].hasQueries) combined[j].hasQueries = true;
            if (data[j].hasOpenQueries) combined[j].hasOpenQueries = true;
            if (data[j].hasUnseen) combined[j].hasUnseen = true;
          });
        }

        if (clientRes.data?.success) {
          const data = clientRes.data.data;
          Object.keys(data).forEach(j => {
            if (data[j].hasQueries) combined[j].hasQueries = true;
            if (data[j].hasOpenQueries) {
              combined[j].hasOpenQueries = true;
              combined[j].hasOpenClientQueries = true;
            }
            if (data[j].hasUnseen) combined[j].hasUnseen = true;
          });
        }

        setJobQueriesStatus(combined);
      } catch (e) {
        console.error("Failed to fetch query stats:", e);
      }
    };
    fetchStats();
  }, [jobs, currentModuleForQueries]);

  // Pagination State
  const [page, setPage] = useState(savedFilters.page || 1);
  const [totalRecords, setTotalRecords] = useState(0);
  const LIMIT = 100;

  // Sorting State
  const [sortConfig, setSortConfig] = useState(savedFilters.sortConfig || { key: 'createdAt', direction: 'desc' });

  // Filters
  const [searchQuery, setSearchQuery] = useState(savedFilters.searchQuery || "");
  const [selectedYear, setSelectedYear] = useState(savedFilters.selectedYear || "26-27");
  const [selectedMovementType, setSelectedMovementType] = useState(savedFilters.selectedType || "");

  // Determine initial branch
  const initialBranch = (() => {
    if (savedFilters.selectedBranch) {
      if (isAdmin || allowedBranches.includes(savedFilters.selectedBranch)) return savedFilters.selectedBranch;
    }
    // If no saved filter, return "All branches"
    return "";
  })();

  const [selectedBranch, setSelectedBranch] = useState(initialBranch);
  const [selectedMonth, setSelectedMonth] = useState(savedFilters.selectedMonth || "");
  const [selectedExporterFilter, setSelectedExporterFilter] = useState(savedFilters.selectedExporterFilter || "");
  const [selectedDetailedStatus, setSelectedDetailedStatus] = useState(Array.isArray(savedFilters.selectedDetailedStatus) ? savedFilters.selectedDetailedStatus : savedFilters.selectedDetailedStatus ? [savedFilters.selectedDetailedStatus] : []);
  const [selectedCustomHouse, setSelectedCustomHouse] = useState(savedFilters.selectedCustomHouse || "");
  const [selectedJobOwner, setSelectedJobOwner] = useState(savedFilters.selectedJobOwner || "");
  const [selectedGoodsStuffedAt, setSelectedGoodsStuffedAt] = useState(savedFilters.selectedGoodsStuffedAt || "");
  const [customHouses, setCustomHouses] = useState([]); // Re-added customHouses state
  const [jobOwnersList, setJobOwnersList] = useState([]); // Stores fetched users for Job Owner dropdown

  // --- DSC Signing Menu State ---
  const [signAnchorEl, setSignAnchorEl] = useState(null);
  const [selectedSignJob, setSelectedSignJob] = useState(null);
  const [signingLoading, setSigningLoading] = useState(false);
  const [checkingDsc, setCheckingDsc] = useState(false);
  const [dscPinModalOpen, setDscPinModalOpen] = useState(false);
  const [dscPin, setDscPin] = useState("");
  const [initDscLoading, setInitDscLoading] = useState(false);

  const handleSignClick = async (e, job) => {
    e.stopPropagation();
    setSelectedSignJob(job);
    const target = e.currentTarget;

    setCheckingDsc(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_STRING}/signer/status`);
      if (res.data && res.data.dongle === 'connected') {
        // Already initialized
        setSignAnchorEl(target);
      } else {
        // Not initialized, ask for PIN
        setDscPinModalOpen(true);
        setDscPin("");
      }
    } catch (err) {
      console.error("Failed to check DSC status", err);
      // Fallback: Just open the modal in case server is acting weird but might still init
      setDscPinModalOpen(true);
    } finally {
      setCheckingDsc(false);
    }
  };

  const handleInitDsc = async () => {
    if (!dscPin) return alert("Please enter the DSC PIN.");
    setInitDscLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_STRING}/signer/init-dsc`, { pin: dscPin });
      if (res.data && res.data.status === 'ok') {
        setDscPinModalOpen(false);
        alert("DSC Initialized Successfully!");
        // We can't automatically open the menu here because we lost the event target reference, 
        // but the user can click Sign again, or we can just tell them it's ready.
        // Actually, we could save the target in state. Let's just ask them to click sign again.
      } else {
        alert(res.data?.error || "Failed to initialize DSC");
      }
    } catch (err) {
      alert(err.response?.data?.error || "Error connecting to local signer");
    } finally {
      setInitDscLoading(false);
    }
  };

  const handleSignClose = () => {
    setSignAnchorEl(null);
  };

  // General Job Modal
  const [generalJobModalOpen, setGeneralJobModalOpen] = useState(false);
  const [generalJobForm, setGeneralJobForm] = useState({
    exporter: "",
    exporter_address: "",
    gstin: "",
    panNo: ""
  });
  const [organizations, setOrganizations] = useState([]);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [isDirectoriesLoading, setIsDirectoriesLoading] = useState(false);
  const directoryRef = useRef(null);

  // Fetch Directories for General Job Autocomplete
  useEffect(() => {
    if (!generalJobModalOpen) return;
    const fetchOrgs = async () => {
      try {
        setIsDirectoriesLoading(true);
        const response = await axios.get(`${import.meta.env.VITE_API_STRING}/directory`, {
          params: { limit: 2000 }
        });
        if (response.data.success) {
          setOrganizations(response.data.data || []);
        }
      } catch (err) {
        console.error("Error fetching directories:", err);
      } finally {
        setIsDirectoriesLoading(false);
      }
    };
    fetchOrgs();
  }, [generalJobModalOpen]);

  // Click outside for directory dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (directoryRef.current && !directoryRef.current.contains(e.target)) {
        setShowOrgDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  // Fetch Job Owners (Users)
  // Fetch Job Owners (Users)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_STRING}/export-jobs-module-users`,
        );
        if (response.data.success) {
          setJobOwnersList(response.data.data);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
    fetchUsers();
  }, []);

  const getOwnerName = (username) => {
    if (!username) return null;
    const user = jobOwnersList.find((u) => u.username === username);
    return user ? user.fullName : username;
  };

  // Gate In modal states (only for operation module)
  const [gateInModalOpen, setGateInModalOpen] = useState(false);
  const [gateInJobs, setGateInJobs] = useState([]);
  const [gateInLoading, setGateInLoading] = useState(false);

  const handleOpenGateInJobs = async () => {
    setGateInModalOpen(true);
    setGateInLoading(true);
    try {
      const resp = await axios.get(
        `${import.meta.env.VITE_API_STRING}/operation-pending-jobs?gateInTenDays=true`
      );
      if (resp.data.success) {
        setGateInJobs(resp.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGateInLoading(false);
    }
  };

  // Persist filters effect
  useEffect(() => {
    if (isInitialSave.current) {
      isInitialSave.current = false;
      return;
    }
    const filtersToSave = {
      activeTab,
      searchQuery,
      selectedYear,
      selectedType: selectedMovementType,
      selectedBranch,
      selectedMonth,
      selectedExporterFilter,
      selectedDetailedStatus,
      selectedCustomHouse,
      selectedJobOwner,
      selectedGoodsStuffedAt,
      page,
      sortConfig,
    };
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filtersToSave));
  }, [
    activeTab,
    searchQuery,
    selectedYear,
    selectedMovementType,
    selectedBranch,
    selectedMonth,
    selectedExporterFilter,
    selectedDetailedStatus,
    selectedCustomHouse,
    selectedJobOwner,
    selectedGoodsStuffedAt,
    page,
    sortConfig,
    onlyPendingQueries,
  ]);

  const handleClearFilters = () => {
    setActiveTab("Pending");
    setSearchQuery("");
    setSelectedYear("26-27");
    setSelectedMovementType("");
    // Branch filter is NOT cleared per user request
    setSelectedMonth("");
    setSelectedExporterFilter("");
    // Detailed Status filter is NOT cleared if it has multiple selections per user request
    if (!Array.isArray(selectedDetailedStatus) || selectedDetailedStatus.length <= 1) {
      setSelectedDetailedStatus([]);
    }
    setSelectedCustomHouse("");
    setSelectedJobOwner("");
    setSelectedGoodsStuffedAt("");
    setPage(1);
    setSortConfig({ key: 'createdAt', direction: 'desc' });

    // Clear storage but immediate re-save will happen via useEffect for selectedBranch
    localStorage.removeItem(FILTER_STORAGE_KEY);
  };

  // Copy Modal State
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceJob, setCopySourceJob] = useState(null);
  const [copyForm, setCopyForm] = useState({
    branch_code: "",
    transportMode: "SEA",
    year: "",
    manualSequence: "",
  });
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [suggestedSequence, setSuggestedSequence] = useState("");
  const isCopyingRef = useRef(false);

  useEffect(() => {
    const fetchNextSeq = async () => {
      if (showCopyModal && copyForm.branch_code && copyForm.transportMode && copyForm.year) {
        try {
          const response = await axios.post(
            `${import.meta.env.VITE_API_STRING}/jobs/suggest-sequence`,
            {
              branch_code: copyForm.branch_code,
              transportMode: copyForm.transportMode,
              year: copyForm.year,
            },
          );

          if (response.data.success) {
            setSuggestedSequence(response.data.suggestedSequence);
          }
        } catch (error) {
          console.error("Error getting suggested sequence dynamically:", error);
        }
      } else {
        setSuggestedSequence("");
      }
    };
    fetchNextSeq();
  }, [showCopyModal, copyForm.branch_code, copyForm.transportMode, copyForm.year]);

  // Create Job Dialog State
  const [openAddDialog, setOpenAddDialog] = useState(false);

  // DSR Report Dialog State
  const [openDSRDialog, setOpenDSRDialog] = useState(false);
  const [exporters, setExporters] = useState([]);
  const [selectedExporter, setSelectedExporter] = useState("All Exporters");
  const [dsrYear, setDsrYear] = useState(getCurrentFinancialYear());
  const [dsrOnlyPending, setDsrOnlyPending] = useState(false);
  const [dsrLoading, setDSRLoading] = useState(false);
  const [dsrStartDate, setDsrStartDate] = useState("");
  const [dsrEndDate, setDsrEndDate] = useState("");

  // Documents Expand/Collapse State
  const [expandedDocs, setExpandedDocs] = useState({});
  const toggleDocs = (e, id) => {
    e.stopPropagation();
    setExpandedDocs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Documents Menu State (Uploaded Docs)
  const [docsAnchorEl, setDocsAnchorEl] = useState(null);
  const [selectedDocJob, setSelectedDocJob] = useState(null);

  const handleDocsClick = (event, job) => {
    event.stopPropagation();
    setDocsAnchorEl(event.currentTarget);
    setSelectedDocJob(job);
  };

  const handleDocsClose = () => {
    setDocsAnchorEl(null);
    setSelectedDocJob(null);
  };

  // Generated Documents Menu State
  const [genDocsAnchorEl, setGenDocsAnchorEl] = useState(null);
  const [selectedGenDocJob, setSelectedGenDocJob] = useState(null);

  const handleGenDocsClick = (event, job) => {
    event.stopPropagation();
    setGenDocsAnchorEl(event.currentTarget);
    setSelectedGenDocJob(job);
  };

  const handleGenDocsClose = () => {
    setGenDocsAnchorEl(null);
    setSelectedGenDocJob(null);
  };

  // SB Track Dialog State
  const [sbTrackOpen, setSbTrackOpen] = useState(false);
  const [sbTrackJob, setSbTrackJob] = useState(null);

  // Container Track Dialog State
  const [containerTrackOpen, setContainerTrackOpen] = useState(false);
  const [containerTrackContainers, setContainerTrackContainers] = useState([]);
  const [expandedContainers, setExpandedContainers] = useState({});

  const toggleContainers = (e, id) => {
    e.stopPropagation();
    setExpandedContainers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Query Dialog State
  const [queryDialogOpen, setQueryDialogOpen] = useState(false);
  const [queryDialogJob, setQueryDialogJob] = useState(null);

  // Query Chat Dialog State (Yellow button - view replies)
  const [queryChatOpen, setQueryChatOpen] = useState(false);
  const [queryChatJob, setQueryChatJob] = useState(null);
  const [queryChatData, setQueryChatData] = useState([]);
  const [clientQueryChatData, setClientQueryChatData] = useState([]);
  const [queryChatLoading, setQueryChatLoading] = useState(false);
  const [queryChatReply, setQueryChatReply] = useState("");
  const [clientQueryChatReply, setClientQueryChatReply] = useState("");
  const [queryChatSending, setQueryChatSending] = useState(false);
  const [activeChatTab, setActiveChatTab] = useState("client");
  const [activeQueryIndex, setActiveQueryIndex] = useState(0);
  const chatEndRef = useRef(null);

  // Fetch Filtered Exporters based on other criteria
  useEffect(() => {
    const fetchFilteredExporters = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_STRING}/filtered-exporters`,
          {
            params: {
              status: activeTab,
              year: selectedYear === "all" ? "" : selectedYear,
              consignmentType: selectedMovementType,
              branch: selectedBranch,
              detailedStatus: selectedDetailedStatus,
              customHouse: selectedCustomHouse,
              month: selectedMonth,
              goods_stuffed_at: selectedGoodsStuffedAt,
              jobOwner: selectedJobOwner,
            },
          }
        );
        if (response.data.success) {
          setExporters(response.data.data || []);
        }
      } catch (err) {
        console.error("Error fetching filtered exporters:", err);
      }
    };

    const timer = setTimeout(fetchFilteredExporters, 300);
    return () => clearTimeout(timer);
  }, [
    activeTab,
    selectedYear,
    selectedMovementType,
    selectedBranch,
    selectedDetailedStatus,
    selectedCustomHouse,
    selectedJobOwner,
    selectedMonth,
    selectedGoodsStuffedAt,
  ]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (queryChatOpen) {
      const timer = setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [queryChatOpen, queryChatData, clientQueryChatData, activeChatTab, activeQueryIndex]);

  // Fetch Custom Houses list
  useEffect(() => {
    const fetchCustomHouses = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_STRING}/custom-house-list`,
        );
        if (response.data.success) {
          setCustomHouses(response.data.data || []);
        }
      } catch (err) {
        console.error("Error fetching custom houses:", err);
      }
    };
    fetchCustomHouses();
  }, []);

  const handleDownloadDSR = async () => {
    if (!selectedExporter) {
      alert("Please select an exporter");
      return;
    }
    setDSRLoading(true);
    try {
      const isAll = selectedExporter === "All Exporters";
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/export-dsr/generate-dsr-report`,
        {
          params: {
            exporter: isAll ? "All" : selectedExporter,
            year: dsrYear,
            onlyPending: dsrOnlyPending,
            startDate: dsrStartDate,
            endDate: dsrEndDate
          },
          responseType: "blob",
        },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const fileName = isAll
        ? `DSR_Report_All_Exporters_${format(new Date(), "yyyyMMdd")}.xlsx`
        : `DSR_Report_${selectedExporter}_${format(new Date(), "yyyyMMdd")}.xlsx`;
      link.setAttribute(
        "download",
        fileName,
      );
      document.body.appendChild(link);
      link.click();
      setOpenDSRDialog(false);
    } catch (err) {
      console.error("Error downloading DSR:", err);
      alert("Failed to download DSR report");
    } finally {
      setDSRLoading(false);
    }
  };

  const handleDownloadTableDSR = async () => {
    if (!selectedExporter) {
      alert("Please select an exporter");
      return;
    }
    setDSRLoading(true);
    try {
      const isAll = selectedExporter === "All Exporters";
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/exports`,
        {
          params: {
            exporter: isAll ? "all" : selectedExporter,
            year: dsrYear,
            status: dsrOnlyPending ? "Pending" : "all",
            limit: 5000,
            startDate: dsrStartDate,
            endDate: dsrEndDate
          },
        }
      );
      if (response.data.success) {
        const jobsToExport = response.data.data.jobs || [];
        if (jobsToExport.length === 0) {
          alert(`No jobs found for ${isAll ? "all exporters" : "this exporter"}.`);
          return;
        }

        const exportData = jobsToExport.map((job) => {
          const rowData = {};

          // Column 1: Job No
          let jobNoCol = [];
          if (job.job_no) jobNoCol.push(job.job_no);
          if (job.exporter_ref_no) jobNoCol.push(`Ref: ${job.exporter_ref_no}`);
          if (job.custom_house) jobNoCol.push(job.custom_house);
          if (job.consignmentType) jobNoCol.push(job.consignmentType);
          rowData["Job No"] = jobNoCol.join("\n");
          rowData["Exporter"] = job.exporter || "";

          // Column 2: Consignee Name
          let consigneeCol = [];
          if (job.consignees?.[0]?.consignee_name) consigneeCol.push(job.consignees[0].consignee_name);
          else if (job.invoices?.[0]?.consigneeName) consigneeCol.push(job.invoices[0].consigneeName);
          rowData["Consignee Name"] = consigneeCol.join("\n") || "";

          // Column 3: Invoice
          let invCol = [];
          if (job.invoices && job.invoices.length > 0) {
            job.invoices.forEach(inv => {
              if (inv.invoiceNumber) invCol.push(inv.invoiceNumber);
              if (inv.invoiceDate) invCol.push(formatDate(inv.invoiceDate, "dd-MM-yy"));
              if (inv.invoiceValue && inv.currency) invCol.push(`${inv.currency} ${inv.invoiceValue}`);
            });
          }
          rowData["Invoice"] = invCol.join("\n");

          // Column 4: SB / Date
          let sbCol = [];
          if (job.sb_no) sbCol.push(job.sb_no);
          if (job.sb_date) sbCol.push(job.sb_date);
          rowData["SB / Date"] = sbCol.join("\n");

          // Column 5: Port
          let portCol = [];
          if (job.destination_port) portCol.push(`Dest: ${job.destination_port}`);
          if (job.destination_country) portCol.push(job.destination_country);
          if (job.port_of_discharge) portCol.push(`Discharge: ${job.port_of_discharge}`);
          if (job.discharge_country) portCol.push(job.discharge_country);
          if (job.port_of_loading) portCol.push(`POL: ${job.port_of_loading}`);
          rowData["Port"] = portCol.join("\n");

          // Column 6: Container
          let contCol = [];
          if (job.total_no_of_pkgs) contCol.push(`Pkgs: ${job.total_no_of_pkgs} ${job.package_unit || ""}`);
          if (job.gross_weight_kg) contCol.push(`G: ${job.gross_weight_kg} kg`);
          if (job.net_weight_kg) contCol.push(`N: ${job.net_weight_kg} kg`);

          if (job.containers && job.containers.length > 0) {
            job.containers.forEach(c => {
              if (c.containerNo) contCol.push(`Cont: ${c.containerNo}`);
              if (c.type) contCol.push(`Size: ${getContainerSizeLabel(c.type)}`);
            });
          }
          const placeDate = job.operations?.[0]?.statusDetails?.[0]?.containerPlacementDate;
          if (placeDate) contCol.push(`Place: ${formatDate(placeDate, "dd-MM-yy")}`);
          rowData["Container"] = contCol.join("\n");

          // Column 7: Handover
          let handCol = [];
          const opDetails = job.operations?.[0]?.statusDetails?.[0] || {};
          const isLcl = job.consignmentType === "LCL";
          const isAir = job.transportMode?.toUpperCase() === "AIR" || job.job_no?.toUpperCase().includes("/AIR/");
          const showRailRoad = !isLcl && !isAir;
          const outLbl = opDetails.railRoad === "road" ? "Road Out" : "Rail Out";
          const reachedLbl = opDetails.railRoad === "road" ? "Road Rch" : "Rail Rch";

          if (opDetails.leoDate) handCol.push(`Leo: ${formatDate(opDetails.leoDate, "dd-MM-yy")}`);
          if (opDetails.handoverForwardingNoteDate) handCol.push(`DHo: ${formatDate(opDetails.handoverForwardingNoteDate, "dd-MM-yy")}`);
          if (showRailRoad) {
            if (opDetails.handoverConcorTharSanganaRailRoadDate) handCol.push(`${outLbl}: ${formatDate(opDetails.handoverConcorTharSanganaRailRoadDate, "dd-MM-yy")}`);
            if (opDetails.railOutReachedDate) handCol.push(`${reachedLbl}: ${formatDate(opDetails.railOutReachedDate, "dd-MM-yy")}`);
          }
          if (opDetails.billing_details?.agency_bill_date || opDetails.billing_details?.reimbursement_bill_date) {
            const agencyDate = opDetails.billing_details.agency_bill_date ? formatDate(opDetails.billing_details.agency_bill_date, "dd-MM-yy") : "";
            const reimbursementDate = opDetails.billing_details.reimbursement_bill_date ? formatDate(opDetails.billing_details.reimbursement_bill_date, "dd-MM-yy") : "";
            const displayDates = [agencyDate, reimbursementDate].filter(Boolean).join(" & ");
            handCol.push(`Bill: ${displayDates}`);
          } else if (opDetails.billingDocsSentDt) {
            handCol.push(`Bill: ${formatDate(opDetails.billingDocsSentDt, "dd-MM-yy")}`);
          }

          rowData["Handover"] = handCol.join("\n");

          // Column 8: Status
          let statusCol = [];
          const statusValue = (Array.isArray(job.detailedStatus) && job.detailedStatus.length > 0
            ? job.detailedStatus[job.detailedStatus.length - 1]
            : (typeof job.detailedStatus === 'string' && job.detailedStatus) ? job.detailedStatus : job.status) || "-";
          statusCol.push(statusValue);
          rowData["Status"] = statusCol.join("\n");

          // We also attach raw status for color reference (removed later if needed, but it helps below)
          rowData["_StatusColorRef"] = statusValue;

          // Remove entirely empty columns dynamically as per user rule:
          Object.keys(rowData).forEach(key => {
            if (key !== "_StatusColorRef" && (!rowData[key] || rowData[key].trim() === "")) {
              delete rowData[key];
            }
          });

          return rowData;
        });
        // Use ExcelJS
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("DSR Report");

        // Define columns based on our structure map
        worksheet.columns = [
          { header: "Job No", key: "Job No", width: 25 },
          { header: "Exporter", key: "Exporter", width: 30 },
          { header: "Consignee Name", key: "Consignee Name", width: 30 },
          { header: "Invoice", key: "Invoice", width: 30 },
          { header: "SB / Date", key: "SB / Date", width: 15 },
          { header: "Port", key: "Port", width: 25 },
          { header: "Container", key: "Container", width: 30 },
          { header: "Handover", key: "Handover", width: 20 },
          { header: "Status", key: "Status", width: 20 },
        ];

        // Format Headers
        worksheet.getRow(1).eachCell((cell) => {
          cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF2C5AA0" }, // Custom Blue
          };
          cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
          cell.border = {
            top: { style: "thin" }, left: { style: "thin" },
            bottom: { style: "thin" }, right: { style: "thin" }
          };
        });

        // Add Data Rows and Format
        exportData.forEach((rowObj) => {
          const newRow = worksheet.addRow(rowObj);

          // Apply styling to all cells in the row
          newRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.alignment = { vertical: "top", horizontal: "left", wrapText: true };
            cell.border = {
              top: { style: "thin" }, left: { style: "thin" },
              bottom: { style: "thin" }, right: { style: "thin" }
            };

            // Apply background color if available
            if (rowObj["_StatusColorRef"]) {
              const colorHex = getStatusColor(rowObj["_StatusColorRef"]).replace("#", "");
              if (colorHex !== "transparent") {
                let finalHex = colorHex;
                if (finalHex.length === 8) finalHex = finalHex.substring(0, 6); // RRGGBBAA -> RRGGBB
                if (finalHex.length === 4) finalHex = finalHex.substring(0, 3);
                // Standardize to 6 chars ARGB for exceljs (opaque)
                if (finalHex.length === 6) {
                  cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FF" + finalHex }
                  };
                }
              }
            }
          });
        });

        // Export file
        const buffer = await workbook.xlsx.writeBuffer();
        const dateStr = format(new Date(), "yyyyMMdd");
        saveAs(new Blob([buffer]), `Table_DSR_${selectedExporter}_${dateStr}.xlsx`);
        setOpenDSRDialog(false);
      } else {
        alert("Failed to fetch jobs data");
      }
    } catch (err) {
      console.error(err);
      alert("Error generating table DSR report");
    } finally {
      setDSRLoading(false);
    }
  };

  // --- Fetch Jobs ---
  const fetchJobs = async () => {
    setLoading(true);
    try {
      let endpoint = `${import.meta.env.VITE_API_STRING}/exports`;
      if (isOperationModule) {
        endpoint = `${import.meta.env.VITE_API_STRING}/operation-jobs`;
      } else if (isChargesModule) {
        endpoint = `${import.meta.env.VITE_API_STRING}/charges-jobs`;
      }

      // Removed global-search-jobs override to enable normal tab-specific search


      const response = await axios.get(
        endpoint,
        {
          params: {
            status: activeTab,
            search: searchQuery,
            year: selectedYear === "all" ? "" : selectedYear,
            consignmentType: selectedMovementType,
            branch: selectedBranch,
            exporter: selectedExporterFilter,
            detailedStatus: selectedDetailedStatus,
            pendingQueries: onlyPendingQueries,
            customHouse: selectedCustomHouse,
            month: selectedMonth,
            goods_stuffed_at: selectedGoodsStuffedAt,
            jobOwner: selectedJobOwner,
            page: page,
            limit: LIMIT,
            sortKey: sortConfig.key,
            sortOrder: sortConfig.direction,
          },
        },
      );
      if (response.data.success) {
        setJobs(response.data.data.jobs || []);
        setTotalRecords(
          response.data.data.total ||
          response.data.data.pagination?.totalCount ||
          0,
        );
      }
    } catch (err) {
      console.error(err);
      setJobs([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGeneralJob = () => {
    setGeneralJobForm({
      exporter: "",
      exporter_address: "",
      gstin: "",
      panNo: ""
    });
    setGeneralJobModalOpen(true);
  };

  const handleGeneralJobSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!generalJobForm.exporter) {
      alert("Exporter name is required");
      return;
    }
    const yearToUse = (selectedYear === "all" || !selectedYear) ? getCurrentFinancialYear() : selectedYear;
    try {
      setLoading(true);
      const res = await axios.post(`${import.meta.env.VITE_API_STRING}/create-general-job`, {
        ...generalJobForm,
        year: yearToUse
      });
      if (res.data.success) {
        alert(`Job Created: ${res.data.data.job_no}`);
        setGeneralJobModalOpen(false);
        fetchJobs();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to create general job.");
    } finally {
      setLoading(false);
    }
  };

  const handleDirectorySelect = (org) => {
    let address = org.address || "";
    const panNo = org.registrationDetails?.panNo || "";
    let gstin = "";

    if (org.branchInfo && org.branchInfo.length > 0) {
      const branch = org.branchInfo[0];
      gstin = branch.gstNo || branch.gstin || "";
      if (!address) {
        address = branch.address || "";
        const cityState = [branch.city, branch.state, branch.postalCode].filter(Boolean).join(", ");
        if (cityState) {
          address = address ? `${address}\n${cityState}` : cityState;
        }
      }
    }

    setGeneralJobForm({
      exporter: org.organization.toUpperCase(),
      exporter_address: address.toUpperCase(),
      gstin: gstin.toUpperCase(),
      panNo: panNo.toUpperCase()
    });
    setShowOrgDropdown(false);
  };

  useEffect(() => {
    const timer = setTimeout(fetchJobs, 300);
    return () => clearTimeout(timer);
  }, [
    activeTab,
    searchQuery,
    selectedYear,
    selectedMovementType,
    selectedBranch,
    selectedExporterFilter,
    selectedDetailedStatus,
    selectedCustomHouse,
    selectedJobOwner,
    selectedMonth,
    selectedGoodsStuffedAt,
    page,
    sortConfig,
    onlyPendingQueries,
  ]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Reset page when tab/filters change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setPage(1);
  }, [
    activeTab,
    searchQuery,
    selectedYear,
    selectedMovementType,
    selectedBranch,
    selectedExporterFilter,
    selectedDetailedStatus,
    selectedCustomHouse,
    selectedJobOwner,
    selectedMonth,
    selectedGoodsStuffedAt,
  ]);

  // Reset Custom House filter when branch changes (to clear invalid selection)
  useEffect(() => {
    if (selectedBranch && selectedCustomHouse) {
      // Check if current custom house belongs to the selected branch
      const branchOptions = getOptionsForBranch(selectedBranch);
      const validHouses = branchOptions.flatMap(g => g.items.map(i => i.value));
      if (!validHouses.includes(selectedCustomHouse)) {
        setSelectedCustomHouse(""); // Reset if not valid for this branch
      }
    }
  }, [selectedBranch]);

  const handleJobClick = (job, e) => {
    // Determine if the click was on the Job No column (specifically the text or cell)
    // Now we rely on the specific cell's onClick, so this row-level handler might be removed or updated
    // The user wants "only open job if user clicks on this column else dont"
    // So we basically disable the row click here or make it do nothing if not targeting specific elements?
    // Actually, we will remove onClick from the TR entirely in the JSX.
  };

  const navigateToJob = (job, e) => {
    e.stopPropagation();
    if (job.isLocked) {
      if (!window.confirm("Do you wanna open this locked job?")) {
        return;
      }
    }
    if (job.job_no) {
      // Determine base path for navigation
      const currentPath = window.location.pathname;
      let targetPath = `job/${encodeURIComponent(job.job_no)}`;

      if (currentPath.includes("export-dsr")) {
        targetPath = `/export-dsr/job/${encodeURIComponent(job.job_no)}`;
      } else if (currentPath.includes("export-operation")) {
        targetPath = `/export-operation/job/${encodeURIComponent(job.job_no)}`;
      } else if (currentPath.includes("export-documentation")) {
        targetPath = `/export-documentation/job/${encodeURIComponent(job.job_no)}`;
      } else if (currentPath.includes("export-esanchit")) {
        targetPath = `/export-esanchit/job/${encodeURIComponent(job.job_no)}`;
      } else if (currentPath.includes("export-charges")) {
        targetPath = `/export-charges/job/${encodeURIComponent(job.job_no)}`;
      }

      // Open in new window
      const url = `${window.location.origin}${targetPath}`;
      window.open(url, `job_${job.job_no.replace(/[^a-zA-Z0-9]/g, '_')}`, "width=1400,height=900,scrollbars=yes,resizable=yes");
    }
  };

  const handleCopyText = (text, e) => {
    e.stopPropagation();
    if (text) {
      navigator.clipboard.writeText(text);
      // Could show a snackbar here
    }
  };

  const handleSBTrack = (job, e) => {
    e.stopPropagation();
    if (job.sb_no && job.sb_date && job.custom_house) {
      setSbTrackJob(job);
      setSbTrackOpen(true);
    }
  };

  const handleCopyJob = async (job, e) => {
    e.stopPropagation(); // Prevent row click

    setCopySourceJob(job);

    // Extract year from job number if available
    let extractedYear = "";
    if (job.job_no) {
      const parts = job.job_no.split("/");
      if (parts.length >= 3) {
        extractedYear = parts[parts.length - 1]; // Last part is year (e.g., "25-26")
      }
    }

    // Extract branch from job number if available
    let extractedBranch = "";
    if (job.job_no) {
      const parts = job.job_no.split("/");
      if (parts.length > 0) {
        extractedBranch = parts[0]; // First part is branch (e.g., "AMD")
      }
    }

    // Get suggested next sequence
    let nextSequence = "";
    if (extractedBranch && extractedYear) {
      try {
        // Call backend to get suggested sequence
        const response = await axios.post(
          `${import.meta.env.VITE_API_STRING}/jobs/suggest-sequence`,
          {
            branch_code: extractedBranch,
            transportMode: job.transportMode || "SEA",
            year: extractedYear,
          },
        );

        if (response.data.success) {
          nextSequence = response.data.suggestedSequence;
        }
      } catch (error) {
        console.error("Error getting suggested sequence:", error);
      }
    }

    // Set form with extracted values or defaults
    setCopyForm({
      branch_code: extractedBranch || job.branch_code || "",
      transportMode: job.transportMode || "SEA",
      year: extractedYear || "",
      manualSequence: "",
    });

    setSuggestedSequence(nextSequence);
    setShowCopyModal(true);
    setCopyError("");
  };

  const handleCopySubmit = async () => {
    if (!copySourceJob) return;

    // Validate required fields
    if (!copyForm.branch_code) {
      setCopyError("Branch Code is required");
      return;
    }

    if (!copyForm.transportMode) {
      setCopyError("Transport Mode is required");
      return;
    }

    if (!copyForm.year) {
      setCopyError("Financial Year is required");
      return;
    }

    // Validate year format
    if (!/^\d{2}-\d{2}$/.test(copyForm.year)) {
      setCopyError("Financial Year must be in format YY-YY (e.g., 26-27)");
      return;
    }

    if (isCopyingRef.current) return;
    isCopyingRef.current = true;

    setCopyLoading(true);
    setCopyError("");

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_STRING}/jobs/copy-export-job`,
        {
          sourceJobNo: copySourceJob.job_no,
          branch_code: copyForm.branch_code,
          transportMode: copyForm.transportMode,
          year: copyForm.year,
          manualSequence: copyForm.manualSequence || "",
        },
      );

      if (response.data.success) {
        // Success - close modal and refresh jobs list
        setShowCopyModal(false);
        setCopySourceJob(null);

        // Refresh the jobs list
        const refreshResponse = await axios.get(
          `${import.meta.env.VITE_API_STRING}/exports`,
          {
            params: {
              status: activeTab,
              page: page,
              limit: LIMIT,
            },
          },
        );

        if (refreshResponse.data.success) {
          setJobs(refreshResponse.data.data.jobs || []);
          setTotalRecords(
            refreshResponse.data.data.total ||
            refreshResponse.data.data.pagination?.totalCount ||
            0,
          );
        }

        // Show success message
        alert(
          `Job copied successfully! New job number: ${response.data.job.job_no}`,
        );

        // Optionally navigate to the new job
        // navigate(`job/${encodeURIComponent(response.data.job.job_no)}`);
      }
    } catch (error) {
      console.error("Error copying job:", error);

      if (error.response) {
        if (error.response.status === 409) {
          setCopyError(
            error.response.data.message ||
            "This job number already exists. Please use a different sequence.",
          );
        } else if (error.response.status === 404) {
          setCopyError(
            error.response.data.message ||
            "Source job not found. Please refresh and try again.",
          );
        } else if (error.response.status === 400) {
          setCopyError(
            error.response.data.message ||
            "Invalid input. Please check your entries.",
          );
        } else {
          setCopyError(
            error.response.data.message ||
            "Error copying job. Please try again.",
          );
        }
      } else {
        setCopyError("Network error. Please check your connection.");
      }
    } finally {
      setCopyLoading(false);
      isCopyingRef.current = false;
    }
  };

  // --- DSC Signing Handler ---
  const handleSignFlatFile = async () => {
    if (!selectedSignJob) return;
    const job = selectedSignJob;
    handleSignClose();

    if (!window.confirm(`Sign Flat-file for job ${job.job_no} using DSC?`)) return;

    setSigningLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_STRING}/signer/sign-now`,
        { jobId: job._id },
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${job.job_no}_${job.sb_no || 'SB'}.sb`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      alert("Flat-file signed and downloaded successfully!");
      fetchJobs();
    } catch (err) {
      console.error("Error signing flat-file:", err);
      alert("Failed to sign flat-file. Ensure Java Signer is running.");
    } finally {
      setSigningLoading(false);
    }
  };

  const handleSignESanchit = async (doc = null) => {
    if (!selectedSignJob) return;
    const job = selectedSignJob;
    handleSignClose();

    const esanchitDocs = job.eSanchitDocuments?.filter(d => d.fileUrl) || [];

    if (esanchitDocs.length === 0) {
      alert("No e-Sanchit documents found for this job.");
      return;
    }

    // If doc is not provided, and there are multiple, maybe sign the first one or alert
    const targetDoc = doc || esanchitDocs[0];

    if (!window.confirm(`Sign e-Sanchit PDF (${targetDoc.icegateFileName || 'Document'}) for job ${job.job_no}?`)) return;

    setSigningLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_STRING}/signer/sign-esanchit`,
        {
          jobId: job._id,
          fileUrl: targetDoc.fileUrl,
          fileName: targetDoc.icegateFileName || `${job.job_no}_esanchit.pdf`
        },
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', targetDoc.icegateFileName || `${job.job_no}_signed.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      alert("e-Sanchit document signed and downloaded successfully!");
      fetchJobs();
    } catch (err) {
      console.error("Error signing e-Sanchit:", err);
      alert("Failed to sign e-Sanchit document. Ensure Java Signer is running.");
    } finally {
      setSigningLoading(false);
    }
  };

  const handleSignDSC = async (job, e) => {
    // Legacy handler replaced by menu
    handleSignClick(e, job);
  };

  const getDocumentLinks = (job) => {
    const links = [];

    // 1. eSanchit Documents
    if (job.eSanchitDocuments && Array.isArray(job.eSanchitDocuments) && job.eSanchitDocuments.some(d => d.fileUrl)) {
      links.push({ title: "ESANCHIT DOCUMENTS", isHeader: true });
      job.eSanchitDocuments.forEach((doc, idx) => {
        if (doc.fileUrl) {
          links.push({ title: `ESANCHIT ${idx + 1}`, url: doc.fileUrl, field: null });
        }
      });
    }

    // 2. Operations Documents by Category
    const ops = job.operations && job.operations[0];
    const status = ops ? (ops.statusDetails && ops.statusDetails[0]) || {} : {};

    const categories = [
      {
        name: "1. SHIPPING/PORT DOCS",
        files: [
          { field: "leoUpload", title: "LEO", source: "status" },
          { field: "eGatePassUpload", title: "GATE PASS", source: "status" },
          { field: "booking_copy", title: "BOOKING", source: "toplevel" },
          { field: "forwardingNoteDocUpload", title: "FORWARDING NOTE", source: "status" },
          { field: "clpUpload", title: "CONTAINER LOAD PLAN (CLP)", source: "status" },
          { field: "completionCopyUpload", title: "COMPLETION COPY", source: "status" },
          { field: "movementCopyUpload", title: "MOVEMENT COPY", source: "status" },
          { field: "shippingInstructionsUpload", title: "SHIPPING INSTRUCTIONS", source: "status" },
          { field: "handoverImageUpload", title: "HO/DOC COPY", source: "status" },
        ]
      },
      {
        name: "2. VGM / ODEX DOCS",
        files: [
          { field: "manualVgmUpload", title: "MANUAL VGM", source: "status" },
          { field: "odexVgmUpload", title: "ODEX VGM", source: "status" },
          { field: "odexEsbUpload", title: "ODEX ESB", source: "status" },
          { field: "odexForm13Upload", title: "ODEX FORM 13", source: "status" },
          { field: "form13CopyUpload", title: "FORM-13 COPY", source: "status" },
          { field: "cmaForwardingNoteUpload", title: "CMA FORWARDING NOTE", source: "status" },
        ]
      },
      {
        name: "3. CONTAINER & CARGO",
        files: [
          { field: "images", title: "CONTAINER DOOR PHOTO", source: "container" },
          { field: "stuffingPhotoUpload", title: "STUFFING PHOTO", source: "status" },
          { field: "transporterDetails", title: "CARTING PHOTO", source: "section" },
        ]
      },
      {
        name: "4. OPERATIONAL DOCS",
        files: [
          { field: "weighmentImages", title: "WEIGHMENT SLIP", source: "container" },
          { field: "stuffingSheetUpload", title: "STUFFING SHEET", source: "status" },
        ]
      },
      {
        name: "5. BILLING & OTHERS",
        files: [
          { field: "billingDocsSentUpload", title: "BILL DOC COPY", source: "status" },
          { field: "otherDocUpload", title: "OTHER DOC", source: "status" },
        ]
      }
    ];

    categories.forEach(cat => {
      links.push({ title: cat.name, isHeader: true });
      cat.files.forEach(f => {
        if (f.source === "container") {
          const containers = job.containers || [];
          if (containers.length === 0) {
            links.push({ title: f.title, url: null, field: f.field, uploadType: "container", idx: 0 });
          } else {
            containers.forEach((c, cIdx) => {
              const urls = Array.isArray(c[f.field]) ? c[f.field] : [];
              const cNo = c.containerNo || c.container_no || `#${cIdx + 1}`;
              const displayTitle = containers.length > 1 ? `${f.title} (${cNo})` : f.title;
              if (urls.length > 0) {
                urls.forEach(url => {
                  if (url) links.push({ title: displayTitle, url, field: f.field, uploadType: "container", idx: cIdx });
                });
              } else {
                links.push({ title: displayTitle, url: null, field: f.field, uploadType: "container", idx: cIdx });
              }
            });
          }
        } else if (f.source === "section") {
          const sectionData = ops ? ops[f.field] || [] : [];
          if (sectionData.length === 0) {
            links.push({ title: f.title, url: null, field: f.field, uploadType: "section", idx: 0 });
          } else {
            sectionData.forEach((sItem, sIdx) => {
              const urls = Array.isArray(sItem.images) ? sItem.images : [];
              const sName = sItem.transporterName || sItem.name || `${sIdx + 1}`;
              const displayTitle = sectionData.length > 1 ? `${f.title} (${sName})` : f.title;
              if (urls.length > 0) {
                urls.forEach(url => {
                  if (url) links.push({ title: displayTitle, url, field: f.field, uploadType: "section", idx: sIdx });
                });
              } else {
                links.push({ title: displayTitle, url: null, field: f.field, uploadType: "section", idx: sIdx });
              }
            });
          }
        } else if (f.source === "toplevel") {
          const urls = Array.isArray(job[f.field]) ? job[f.field] : [];
          if (urls.length > 0) {
            urls.forEach(url => {
              if (url) links.push({ title: f.title, url, field: f.field, uploadType: "toplevel" });
            });
          } else {
            links.push({ title: f.title, url: null, field: f.field, uploadType: "toplevel" });
          }
        } else {
          // source === "status"
          const urls = Array.isArray(status[f.field]) ? status[f.field] : [];
          if (urls.length > 0) {
            urls.forEach(url => {
              if (url) links.push({ title: f.title, url, field: f.field, uploadType: "status" });
            });
          } else {
            links.push({ title: f.title, url: null, field: f.field, uploadType: "status" });
          }
        }
      });
    });

    return links;
  };

  const totalPages = Math.ceil(totalRecords / LIMIT);

  // Copy Modal Styles
  const modalStyles = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    },
    modal: {
      backgroundColor: "white",
      borderRadius: "8px",
      padding: "20px",
      width: "500px",
      maxWidth: "90%",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    },
    modalHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
      borderBottom: "1px solid #e5e7eb",
      paddingBottom: "10px",
    },
    modalTitle: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#111",
      margin: 0,
    },
    closeButton: {
      background: "none",
      border: "none",
      fontSize: "20px",
      cursor: "pointer",
      color: "#6b7280",
      padding: 0,
    },
    formGroup: {
      marginBottom: "15px",
    },
    label: {
      display: "block",
      marginBottom: "5px",
      fontSize: "12px",
      fontWeight: "600",
      color: "#374151",
    },
    errorText: {
      color: "#dc2626",
      fontSize: "11px",
      marginTop: "5px",
    },
    successText: {
      color: "#10b981",
      fontSize: "11px",
      marginTop: "5px",
    },
    buttonGroup: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "10px",
      marginTop: "20px",
    },
    cancelButton: {
      padding: "8px 16px",
      backgroundColor: "#f3f4f6",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "12px",
      color: "#374151",
    },
    submitButton: {
      padding: "8px 16px",
      backgroundColor: "#10b981",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "12px",
      color: "white",
      fontWeight: "600",
    },
    disabledButton: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    infoText: {
      fontSize: "11px",
      color: "#6b7280",
      marginTop: "5px",
      fontStyle: "italic",
    },
    generatedJobNo: {
      backgroundColor: "#f3f4f6",
      padding: "8px",
      borderRadius: "4px",
      fontSize: "12px",
      fontFamily: "monospace",
      marginTop: "5px",
      border: "1px solid #d1d5db",
    },
  };

  const getGeneratedJobNo = () => {
    if (!copyForm.branch_code || !copyForm.year) {
      return "";
    }

    let sequence = copyForm.manualSequence || suggestedSequence || "00001";

    // Pad sequence to 5 digits if it's a number
    if (/^\d+$/.test(sequence)) {
      sequence = sequence.padStart(5, "0");
    }

    const isAir = copyForm.transportMode?.toUpperCase() === "AIR";
    const isSea = copyForm.transportMode?.toUpperCase() === "SEA" || !isAir;
    const prefix = isAir ? "EXP/AIR" : (isSea ? "EXP/SEA" : "EXP");

    return `${copyForm.branch_code}/${prefix}/${sequence}/${copyForm.year}`;
  };

  const generatedJobNo = getGeneratedJobNo();

  return (
    <>
      <ResponsiveStyles />
      <div style={s.wrapper} className="wrapper-responsive">
        <div style={s.container}>
          {/* Title and Count */}
          <div
            className="header-row-responsive"
            style={{
              ...s.headerRow,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={s.pageTitle} className="page-title-responsive">Export Jobs:</h1>
              <span
                style={{
                  fontSize: "20px",
                  color: "#000000ff",
                  backgroundColor: "#f3f4f6",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontWeight: 600,
                }}
              >
                {totalRecords}
              </span>
            </div>
            {/* Action Buttons - Only for Export - Jobs */}
            {window.location.pathname.startsWith("/export-dsr") && (
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <div
                  onMouseEnter={handlePulseHover}
                  onMouseLeave={handlePulseClose}
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <button
                    style={{
                      ...s.btnPrimary,
                      padding: "8px 15px",
                      backgroundColor: "#0f172a",
                      color: "#fda4af",
                      border: "1.5px solid rgba(244, 63, 94, 0.4)",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: "700",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 0 10px rgba(244, 63, 94, 0.15)",
                      transition: "all 0.2s ease",
                      height: "32px",
                      boxSizing: "border-box"
                    }}
                  >
                    <span 
                      className="flashing-pulse-dot"
                      style={{ 
                        width: "8px", 
                        height: "8px", 
                        borderRadius: "50%", 
                        backgroundColor: "#ef4444", 
                        boxShadow: "0 0 8px #ef4444",
                        display: "inline-block"
                      }} 
                    />
                    Pulse
                  </button>
                </div>

                <Popover
                  id="mouse-over-popover"
                  sx={{
                    pointerEvents: 'none',
                  }}
                  open={pulseOpen}
                  anchorEl={pulseAnchorEl}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                  }}
                  onClose={handlePulseClose}
                  disableRestoreFocus
                  PaperProps={{
                    style: {
                      background: 'transparent',
                      boxShadow: 'none',
                      border: 'none',
                    },
                  }}
                >
                  <PulseOverviewHover exporter={selectedExporterFilter} />
                </Popover>

                <button
                  style={{
                    ...s.btnPrimary,
                    padding: "8px 20px",
                    backgroundColor: "#fff",
                    color: "#2563eb",
                    border: "1px solid #2563eb",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "13px",
                    height: "32px",
                    boxSizing: "border-box"
                  }}
                  onClick={() => setOpenDSRDialog(true)}
                >
                  Download DSR Report
                </button>
                <button
                  style={{
                    ...s.btnPrimary,
                    padding: "8px 20px",
                    backgroundColor: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "13px",
                    height: "32px",
                    boxSizing: "border-box"
                  }}
                  className="create-btn-responsive"
                  onClick={() => setOpenAddDialog(true)}
                >
                  + Create Job
                </button>
              </div>
            )}

            {/* Gate In Pending Button - Only for Export Operation module */}
            {isOperationModule && (
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  style={{
                    ...s.btnPrimary,
                    padding: "8px 20px",
                    height: "auto",
                    backgroundColor: "#f59e0b",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "13px",
                  }}
                  onClick={handleOpenGateInJobs}
                >
                  Gate In Pending
                </button>
              </div>
            )}
            {isChargesModule && activeTab === "General Jobs" && (
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  style={{
                    ...s.btnPrimary,
                    padding: "8px 20px",
                    height: "auto",
                    backgroundColor: "#1a237e",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "13px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                  }}
                  onClick={handleCreateGeneralJob}
                >
                  + Create Gen Job
                </button>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div style={s.tabContainer} className="tab-container-responsive">
            <button
              style={
                activeTab === "Pending" ? { ...s.tab, ...s.activeTab } : s.tab
              }
              onClick={() => setActiveTab("Pending")}
            >
              Pending{" "}
              <span
                style={
                  activeTab === "Pending"
                    ? { ...s.badge, ...s.activeBadge }
                    : s.badge
                }
              ></span>
            </button>
            {!isOperationModule && !isChargesModule && (
              <button
                style={
                  activeTab === "Booking Pending" ? { ...s.tab, ...s.activeTab } : s.tab
                }
                onClick={() => setActiveTab("Booking Pending")}
              >
                Booking Pending{" "}
                <span
                  style={
                    activeTab === "Booking Pending"
                      ? { ...s.badge, ...s.activeBadge }
                      : s.badge
                  }
                ></span>
              </button>
            )}
            {!isOperationModule && !isChargesModule && (
              <button
                style={
                  activeTab === "Handover Pending" ? { ...s.tab, ...s.activeTab } : s.tab
                }
                onClick={() => setActiveTab("Handover Pending")}
              >
                Handover Pending{" "}
                <span
                  style={
                    activeTab === "Handover Pending"
                      ? { ...s.badge, ...s.activeBadge }
                      : s.badge
                  }
                ></span>
              </button>
            )}
            {!isOperationModule && !isChargesModule && (
              <button
                style={
                  activeTab === "Billing Pending" ? { ...s.tab, ...s.activeTab } : s.tab
                }
                onClick={() => setActiveTab("Billing Pending")}
              >
                Billing Pending{" "}
                <span
                  style={
                    activeTab === "Billing Pending"
                      ? { ...s.badge, ...s.activeBadge }
                      : s.badge
                  }
                ></span>
              </button>
            )}
            {isOperationModule && (
              <button
                style={
                  activeTab === "Op Completed" ? { ...s.tab, ...s.activeTab } : s.tab
                }
                onClick={() => setActiveTab("Op Completed")}
              >
                Op Completed{" "}
                <span
                  style={
                    activeTab === "Op Completed"
                      ? { ...s.badge, ...s.activeBadge }
                      : s.badge
                  }
                ></span>
              </button>
            )}
            {!isOperationModule && !isChargesModule && (
              <button
                style={
                  activeTab === "club-jobs" ? { ...s.tab, ...s.activeTab } : s.tab
                }
                onClick={() => setActiveTab("club-jobs")}
              >
                Club Jobs
              </button>
            )}
            <button
              style={
                activeTab === "Completed" ? { ...s.tab, ...s.activeTab } : s.tab
              }
              onClick={() => setActiveTab("Completed")}
            >
              Completed{" "}
              <span
                style={
                  activeTab === "Completed"
                    ? { ...s.badge, ...s.activeBadge }
                    : s.badge
                }
              ></span>
            </button>
            {isChargesModule && (
              <>
                <button
                  style={
                    activeTab === "General Jobs" ? { ...s.tab, ...s.activeTab } : s.tab
                  }
                  onClick={() => setActiveTab("General Jobs")}
                >
                  General Jobs
                </button>
                <button
                  style={
                    activeTab === "Freight Forwarding" ? { ...s.tab, ...s.activeTab } : s.tab
                  }
                  onClick={() => setActiveTab("Freight Forwarding")}
                >
                  Freight Forwarding
                </button>
              </>
            )}
            {!isOperationModule && !isChargesModule && (
              <button
                style={
                  activeTab === "Cancelled" ? { ...s.tab, ...s.activeTab } : s.tab
                }
                onClick={() => setActiveTab("Cancelled")}
              >
                Cancelled{" "}
                <span
                  style={
                    activeTab === "Cancelled"
                      ? { ...s.badge, ...s.activeBadge }
                      : s.badge
                  }
                ></span>
              </button>
            )}
          </div>

          {/* Filters */}
          <div style={s.toolbar} className="toolbar-responsive">
            {/* Year Filter */}
            <select
              style={getFilterSelectStyle(selectedYear !== "26-27", "80px")}
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="">All Years</option>
              {["26-27", "25-26", "24-25", "23-24", "22-23", "21-22"].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            {/* Month Filter */}
            <select
              style={getFilterSelectStyle(selectedMonth !== "", "100px")}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">All Months</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="weekly">Weekly</option>
              {[
                { v: "1", l: "January" }, { v: "2", l: "February" }, { v: "3", l: "March" },
                { v: "4", l: "April" }, { v: "5", l: "May" }, { v: "6", l: "June" },
                { v: "7", l: "July" }, { v: "8", l: "August" }, { v: "9", l: "September" },
                { v: "10", l: "October" }, { v: "11", l: "November" }, { v: "12", l: "December" }
              ].map(m => (
                <option key={m.v} value={m.v}>{m.l}</option>
              ))}
            </select>

            {/* Branch Filter */}
            <select
              style={getFilterSelectStyle(selectedBranch !== "", "110px")}
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              {filteredBranchOptions.map((branch) => (
                <option key={branch.code} value={branch.code}>
                  {branch.label}
                </option>
              ))}
            </select>

            {/* Custom House Filter */}
            <select
              style={getFilterSelectStyle(selectedCustomHouse !== "", "140px")}
              value={selectedCustomHouse}
              onChange={(e) => setSelectedCustomHouse(e.target.value)}
            >
              <option value="">All Custom Houses</option>
              {getOptionsForBranch(selectedBranch).map((group) => {
                const combinedRestrictions = [
                  ...(user?.selected_ports || []),
                  ...(user?.selected_icd_codes || [])
                ].map(r => String(r).toUpperCase());

                const filteredItems = group.items.filter(item => {
                  const itemValue = String(item.value).toUpperCase();
                  const itemCode = String(item.code).toUpperCase();

                  return isAdmin ||
                    combinedRestrictions.length === 0 ||
                    combinedRestrictions.includes(itemValue) ||
                    combinedRestrictions.some(r => r === itemCode || r.startsWith(`${itemCode} -`));
                });
                if (filteredItems.length === 0) return null;
                return (
                  <optgroup key={group.group} label={group.group}>
                    {filteredItems.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>

            {/* Movement Type Filter */}
            <select
              style={getFilterSelectStyle(selectedMovementType !== "", "100px")}
              value={selectedMovementType}
              onChange={(e) => setSelectedMovementType(e.target.value)}
            >
              <option value="">All Movement</option>
              {movementTypeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* Job Owner Filter */}
            <select
              style={getFilterSelectStyle(selectedJobOwner !== "", "110px")}
              value={selectedJobOwner}
              onChange={(e) => setSelectedJobOwner(e.target.value)}
            >
              <option value="">All Job Owners</option>
              {jobOwnersList.map((user) => (
                <option key={user.id || user._id} value={user.username}>
                  {user.fullName}
                </option>
              ))}
            </select>

            {/* Exporter Filter */}
            {/* Exporter Filter */}
            <Autocomplete
              size="small"
              options={exporters}
              value={selectedExporterFilter || null}
              onChange={(event, newValue) => {
                setSelectedExporterFilter(newValue || "");
              }}
              filterOptions={(options, { inputValue }) =>
                priorityFilter(options, inputValue)
              }
              renderOption={(props, option) => (
                <li {...props} style={{ fontSize: "13px", padding: "4px 10px", minHeight: "auto" }}>
                  {option}
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="All Exporters"
                  variant="outlined"
                  sx={{
                    width: 190,
                    "& .MuiInputBase-root": {
                      padding: "0 4px 0 4px !important",
                      height: "30px",
                      fontSize: "12px",
                      backgroundColor: selectedExporterFilter ? "#eff6ff" : "#fff",
                      color: selectedExporterFilter ? "#1e40af" : "inherit",
                      fontWeight: selectedExporterFilter ? "600" : "normal",
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: selectedExporterFilter ? "#3b82f6" : "#d1d5db",
                    },
                  }}
                />
              )}
            />

            {/* Detailed Status Filter - MUI Select Multi-Select */}
            <FormControl size="small" style={{ width: 140, minWidth: 140 }}>
              <Select
                multiple
                value={selectedDetailedStatus}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedDetailedStatus(typeof value === 'string' ? value.split(',') : value);
                  setPage(1);
                }}
                displayEmpty
                renderValue={(selected) => {
                  if (selected.length === 0) {
                    return <em style={{ fontSize: "12px", color: "#6b7280" }}>All Detailed Status</em>;
                  }
                  return (
                    <div style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: "12px"
                    }}>
                      {selected.join(", ")}
                    </div>
                  );
                }}
                inputProps={{ "aria-label": "Without label" }}
                sx={{
                  height: 28,
                  fontSize: "12px",
                  backgroundColor: selectedDetailedStatus.length > 0 ? "#eff6ff" : "#fff",
                  color: selectedDetailedStatus.length > 0 ? "#1e40af" : "inherit",
                  fontWeight: selectedDetailedStatus.length > 0 ? "600" : "normal",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: selectedDetailedStatus.length > 0 ? "#3b82f6" : "#d1d5db",
                  },
                  "& .MuiSelect-select": {
                    padding: "4px 4px",
                    display: "flex",
                    alignItems: "center",
                    overflow: 'hidden'
                  },
                }}
              >
                <MenuItem disabled value="" sx={{ fontSize: "12px" }}>
                  <em>All Detailed Status</em>
                </MenuItem>
                <MenuItem
                  sx={{
                    justifyContent: "space-between",
                    backgroundColor: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    "&:hover": { backgroundColor: "#f1f5f9" },
                    py: 1,
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDetailedStatus([
                        "Pending", "SB Filed", "L.E.O", "Container HO", "File Handover to IATA", "Rail Out", "Departure", "Send for Billing", "Billing Pending", "Billing Done"
                      ]);
                      setPage(1);
                    }}
                    style={{ background: "none", border: "none", color: "#2563eb", fontSize: "11px", fontWeight: "800", cursor: "pointer", padding: "4px 8px" }}
                  >
                    Select All
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDetailedStatus([]);
                      setPage(1);
                    }}
                    style={{ background: "none", border: "none", color: "#ef4444", fontSize: "11px", fontWeight: "800", cursor: "pointer", padding: "4px 8px" }}
                  >
                    Clear All
                  </button>
                </MenuItem>
                {[
                  "Pending",
                  "SB Filed",
                  "L.E.O",
                  "Container HO",
                  "File Handover to IATA",
                  "Rail Out",
                  "Departure",
                  "Send for Billing",
                  "Billing Pending",
                  "Billing Done",
                ].map((status) => (
                  <MenuItem
                    key={status}
                    value={status}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0,
                      fontSize: "0.75rem",
                      py: 0,
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={selectedDetailedStatus.indexOf(status) > -1}
                      sx={{ p: 0.5 }}
                    />
                    <span
                      style={{
                        display: "inline-block",
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        backgroundColor: getStatusColor(status),
                        border: "1px solid #666",
                        marginRight: "8px",
                        flexShrink: 0,
                      }}
                    />
                    <ListItemText
                      primary={status}
                      primaryTypographyProps={{ fontSize: '12px' }}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Goods Stuffed At Filter */}
            <select
              style={getFilterSelectStyle(selectedGoodsStuffedAt !== "", "100px")}
              value={selectedGoodsStuffedAt}
              onChange={(e) => setSelectedGoodsStuffedAt(e.target.value)}
            >
              <option value="">All Stuffed At</option>
              <option value="FACTORY">FACTORY</option>
              <option value="DOCK">DOCK</option>
            </select>

            <Box sx={{ position: "relative", display: "inline-flex" }}>
              <button
                onClick={() => {
                  setOnlyPendingQueries(!onlyPendingQueries);
                  setPage(1);
                }}
                style={{
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "0 5px",
                  borderRadius: "4px",
                  border: "1px solid",
                  backgroundColor: onlyPendingQueries ? "#fee2e2" : "#f3f4f6",
                  borderColor: onlyPendingQueries ? "#ef4444" : "#d1d5db",
                  color: onlyPendingQueries ? "#dc2626" : "#4b5563",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s"
                }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  backgroundColor: onlyPendingQueries ? "#dc2626" : "#9ca3af"
                }} />
                Pending Qs
              </button>
              {unresolvedCount > 0 && (
                <Badge
                  badgeContent={unresolvedCount}
                  color="error"
                  sx={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    '& .MuiBadge-badge': {
                      fontSize: '9px',
                      height: 16,
                      minWidth: 16,
                      transform: 'translate(40%, -40%)'
                    }
                  }}
                />
              )}
            </Box>

            {/* Search Input */}
            <div
              className="search-container-responsive"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: "5px",
                marginLeft: "auto" // Push to right if space permits
              }}
            >
              <input
                className="search-input-responsive"
                style={{
                  ...s.input,
                  width: "160px",
                  minWidth: "130px",
                  padding: "0 4px",
                  backgroundColor: searchQuery ? "#eff6ff" : "#fff",
                  borderColor: searchQuery ? "#3b82f6" : "#d1d5db",
                  color: searchQuery ? "#1e40af" : "#333",
                  fontWeight: searchQuery ? "600" : "normal",
                }}
                placeholder="Search by Job No, Exporter, Port of Discharge..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Tooltip title="Clear All Filters">
                <IconButton
                  onClick={handleClearFilters}
                  size="small"
                  sx={{
                    backgroundColor: "#f3f4f6",
                    "&:hover": { backgroundColor: "#e5e7eb" },
                    height: "28px",
                    width: "28px",
                    borderRadius: "4px",
                  }}
                >
                  <FilterAltOffIcon sx={{ fontSize: 18, color: "#4b5563" }} />
                </IconButton>
              </Tooltip>
            </div>

          </div>

          {/* Table */}
          <div style={s.tableContainer} className="table-container-responsive">
            <table style={s.table}>
              <colgroup>
                <col style={{ minWidth: "175px" }} />
                <col style={{ minWidth: "180px" }} />
                <col style={{ minWidth: "110px" }} />
                <col style={{ minWidth: "100px" }} />
                <col style={{ minWidth: "130px" }} />
                <col style={{ minWidth: "130px" }} />
                <col style={{ minWidth: "160px" }} />
                <col style={{ minWidth: "80px" }} />
                <col style={{ minWidth: "85px" }} />
              </colgroup>
              <thead>
                <tr
                  style={{
                    background:
                      "linear-gradient(135deg, #2c5aa0 0%, #1e3a6f 100%)",
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                  }}
                >
                  <th
                    style={{ ...s.th, width: "12%", minWidth: "110px", cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort('job_no')}
                    title="Click to sort by Job Number"
                  >
                    Job No
                    {sortConfig.key === 'job_no' && (
                      <span style={{ marginLeft: "5px", fontSize: "10px" }}>
                        {sortConfig.direction === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                  <th style={{ ...s.th, width: "18%", minWidth: "170px" }}>Exporter</th>
                  <th style={{ ...s.th, width: "10%", minWidth: "95px" }}>Invoice</th>
                  <th style={{ ...s.th, width: "8%", minWidth: "65px" }}>SB No</th>
                  <th style={{ ...s.th, width: "16%", minWidth: "150px" }}>Port</th>
                  <th style={{ ...s.th, width: "16%", minWidth: "170px" }}>Container</th>
                  <th style={{ ...s.th, width: "3%", minWidth: "40px" }}>Handover</th>
                  <th style={{ ...s.th, width: "4%", minWidth: "60px" }}>Docs</th>
                  <th style={{ ...s.th, width: "5%", minWidth: "65px", textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" style={s.message}>
                      Loading jobs...
                    </td>
                  </tr>
                ) : sortedJobs.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={s.message}>
                      No jobs found.
                    </td>
                  </tr>
                ) : (
                  jobs.reduce((acc, job) => {
                    acc.push(job);
                    if (job.subRows && job.subRows.length > 0) {
                      acc.push(...job.subRows.map(subJob => ({ ...subJob, isSubRow: true })));
                    }
                    return acc;
                  }, []).map((job, idx) => {
                    const currentStatus = (Array.isArray(job.detailedStatus) && job.detailedStatus.length > 0
                      ? job.detailedStatus[job.detailedStatus.length - 1]
                      : (typeof job.detailedStatus === 'string' && job.detailedStatus) ? job.detailedStatus : job.status) || "";
                    const theme = getStatusTheme(currentStatus);

                    return (
                      <tr
                        key={job._id || idx}
                        style={{
                          backgroundColor: job.isSubRow ? "#f1f5f9" : theme.bg,
                          borderLeft: `4px solid ${job.isSubRow ? "#94a3b8" : theme.border}`,
                          cursor: "default",
                          transition: "all 0.2s ease",
                        }}
                        className="table-row-hover job-row-glow"
                      >
                        {/* <td
                        style={{
                          ...s.td,
                          textAlign: "center",
                          color: "#9ca3af",
                        }}
                      >
                        {(page - 1) * LIMIT + idx + 1}
                      </td> */}

                        {/* Column 2: Job No */}
                        <td
                          style={{
                            ...s.td,
                            left: 0,
                            backgroundColor: jobQueriesStatus[job.job_no]?.hasOpenClientQueries
                              ? "#fee2e2"
                              : job.operational_lock
                              ? "#f7f6d3cc"
                              : "inherit",
                            position: "sticky",
                            cursor: "pointer", // Make the whole cell look clickable
                            paddingLeft: job.parent_club_job && activeTab === "club-jobs" ? "24px" : "15px"
                          }}
                          onClick={(e) => navigateToJob(job, e)} // Click anywhere in cell navigates
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: "4px"
                            }}
                          >
                            <div
                              style={{
                                fontWeight: "800",
                                color: jobQueriesStatus[job.job_no]?.hasOpenClientQueries ? "#dc2626" : "#1e40af",
                                fontSize: "12px",
                                letterSpacing: "0.2px",
                                whiteSpace: "nowrap"
                              }}
                            >
                              {job.parent_club_job && activeTab === "club-jobs" && (
                                <span style={{ color: "#9ca3af", fontWeight: "bold" }}>↳</span>
                              )}
                              <div
                                style={{
                                  fontWeight: "800",
                                  color: "#1e40af",
                                  fontSize: "12px",
                                  letterSpacing: "0.2px",
                                  whiteSpace: "nowrap"
                                }}
                              >
                                {job.job_no}
                              </div>
                              {job.is_club_job_parent && (
                                <span style={{ fontSize: "9px", background: "#dbeafe", color: "#1e40af", padding: "1px 4px", borderRadius: "4px", fontWeight: "bold" }}>CLUB</span>
                              )}
                            </div>
                            {job.isLocked && (
                              <Tooltip title="Job is Locked">
                                <LockIcon style={{ fontSize: 14, color: "#dc2626", marginLeft: 4 }} />
                              </Tooltip>
                            )}
                            <IconButton
                              size="small"
                              onClick={(e) => handleCopyText(job.job_no, e)}
                              style={{ padding: 2 }}
                              title="Copy Job No"
                            >
                              <ContentCopyIcon style={{ fontSize: 12 }} />
                            </IconButton>
                          </div>

                          <div
                            style={{
                              color: "#32363dff",
                              fontSize: "10px",
                              fontWeight: "normal",
                              marginBottom: "4px",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {formatDate(job.job_date)}
                          </div>
                          {job.exporter_ref_no && job.exporter_ref_no !== (job.invoices?.[0]?.invoiceNumber || job.invoices?.[0]?.invoiceNo) && (
                            <div
                              style={{
                                color: "#111",
                                fontSize: "10px",
                                fontWeight: "700",
                                marginBottom: "4px",
                                backgroundColor: "#f3f4f6",
                                padding: "2px 4px",
                                borderRadius: "3px",
                                width: "fit-content",
                                display: "flex",
                                alignItems: "center",
                                gap: "2px",
                              }}
                            >
                                REF: {job.exporter_ref_no}
                              <IconButton
                                size="small"
                                onClick={(e) => handleCopyText(job.exporter_ref_no, e)}
                                style={{ padding: 0, marginLeft: 1, color: "#6b7280" }}
                                title="Copy Ref No"
                              >
                                <ContentCopyIcon style={{ fontSize: 9 }} />
                              </IconButton>
                            </div>
                          )}

                          {job.custom_house && (
                            <div
                              style={{
                                marginTop: "2px",
                                display: "flex",
                                alignItems: "center",
                                gap: "2px"
                              }}
                            >
                              <div
                                style={{
                                  padding: "2px 6px",
                                  borderRadius: "3px",
                                  fontSize: "10px",
                                  fontWeight: "600",
                                  color: "#030303ff",
                                  backgroundColor: "#f3f4f6",
                                  width: "fit-content",
                                }}
                              >
                                {job.custom_house}
                              </div>
                              <IconButton
                                size="small"
                                onClick={(e) => handleCopyText(job.custom_house, e)}
                                style={{ padding: 2 }}
                                title="Copy Custom House"
                              >
                                <ContentCopyIcon style={{ fontSize: 9, color: "#6b7280" }} />
                              </IconButton>
                            </div>
                          )}
                          <div
                            style={{
                              display: "flex",
                              gap: "5px",
                              alignItems: "center",
                              marginTop: "6px",
                            }}
                          >
                            {/* Consignment Type */}
                            <div
                              style={{
                                padding: "2px 6px",
                                background: "#f3f4f6",
                                border: "1px solid #e5e7eb",
                                borderRadius: "3px",
                                fontSize: "10px",
                                fontWeight: "600",
                                color: "#030303ff",
                              }}
                            >
                              {job.consignmentType || "-"}
                            </div>

                            {/* Job Owner */}
                            {job.job_owner && (
                              <div
                                style={{
                                  padding: "2px 6px",
                                  background: "#f3f4f6",
                                  border: "1px solid #e5e7eb",
                                  borderRadius: "3px",
                                  fontSize: "10px",
                                  fontWeight: "600",
                                  color: "#030303ff",
                                }}
                              >
                                {getOwnerName(job.job_owner)}
                              </div>
                            )}
                          </div>

                        </td>

                        {/* Column 3: Exporter */}
                        <td style={s.td}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "4px",
                              marginBottom: "4px",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: "700",
                                color: "rgba(0,0,0,0.85)",
                                fontSize: "12px",
                                lineHeight: "1.3",
                              }}
                            >
                              {job.exporter}
                              {job.exporter_branch_name && job.exporter_branch_name.toLowerCase() !== "main" && (
                                <span style={{ fontWeight: "500", color: "#64748b", fontSize: "10px" }}>
                                  {` (${job.exporter_branch_name})`}
                                </span>
                              )}
                            </div>
                            <IconButton
                              size="small"
                              onClick={(e) => handleCopyText(job.exporter, e)}
                              style={{ padding: 2, flexShrink: 0 }}
                              title="Copy Exporter"
                            >
                              <ContentCopyIcon style={{ fontSize: 11, color: "#6b7280" }} />
                            </IconButton>
                          </div>
                          {/* IE Code below exporter name */}
                          {job.ieCode && (
                            <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "4px", fontWeight: "600", display: "flex", alignItems: "center", gap: "2px" }}>
                              IE: {job.ieCode}
                              <IconButton
                                size="small"
                                onClick={(e) => handleCopyText(job.ieCode, e)}
                                style={{ padding: 0, marginLeft: 2 }}
                                title="Copy IE Code"
                              >
                                <ContentCopyIcon style={{ fontSize: 9, color: "#94a3b8" }} />
                              </IconButton>
                            </div>
                          )}
                          <div style={{ fontSize: "10px", color: "#475569", display: "flex", flexDirection: "column", gap: "2px" }}>
                            {job.consignees?.[0]?.consignee_name && (
                              <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                                <span style={{ fontWeight: "700", color: "#94a3b8", fontSize: "9px" }}>CONS:</span>
                                <span style={{ color: "#334155", fontWeight: "500", fontSize: "10px" }}>
                                  {job.consignees[0].consignee_name.length > 35
                                    ? `${job.consignees[0].consignee_name.substring(0, 35)}...`
                                    : job.consignees[0].consignee_name}
                                </span>
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleCopyText(job.consignees[0].consignee_name, e)}
                                  style={{ padding: 0, marginLeft: 2 }}
                                  title="Copy Consignee"
                                >
                                  <ContentCopyIcon style={{ fontSize: 9, color: "#94a3b8" }} />
                                </IconButton>
                              </div>
                            )}

                            {job.buyerThirdPartyInfo?.buyer?.name && (
                              <div style={{ display: "flex", gap: "4px", alignItems: "baseline" }}>
                                <span style={{ fontWeight: "700", color: "#94a3b8", fontSize: "9px" }}>3rd PARTY:</span>
                                <span style={{ color: "#64748b", fontStyle: "italic" }}>
                                  {job.buyerThirdPartyInfo.buyer.name.length > 30
                                    ? `${job.buyerThirdPartyInfo.buyer.name.substring(0, 25)}...`
                                    : job.buyerThirdPartyInfo.buyer.name}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Booking No section */}
                          {(() => {
                            const bookings = [];
                            if (job.booking_no) {
                              bookings.push(job.booking_no);
                            }

                            if (bookings.length > 0) {
                              const firstBooking = bookings[0];
                              return (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    marginTop: "4px",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: "700",
                                      color: "#4b5563",
                                    }}
                                  >
                                    Bk No:
                                  </span>
                                  <span
                                    style={{ fontSize: "10px", color: "#1f2937" }}
                                  >
                                    {firstBooking}
                                  </span>
                                  <IconButton
                                    size="small"
                                    onClick={(e) =>
                                      handleCopyText(firstBooking, e)
                                    }
                                    style={{ padding: 0 }}
                                    title="Copy Booking No"
                                  >
                                    <ContentCopyIcon
                                      style={{ fontSize: 10, color: "#6b7280" }}
                                    />
                                  </IconButton>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </td>



                        {/* Column 4: Invoice */}
                        <td style={{ ...s.td, backgroundColor: job.financial_lock ? "#c6f6d5" : "inherit" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: "600",
                                marginBottom: "2px",
                              }}
                            >
                              {job.invoices?.[0]?.invoiceNumber || "-"}
                            </div>
                            {job.invoices?.[0]?.invoiceNumber && (
                              <IconButton
                                size="small"
                                onClick={(e) =>
                                  handleCopyText(
                                    job.invoices?.[0]?.invoiceNumber,
                                    e
                                  )
                                }
                                style={{ padding: 2 }}
                                title="Copy Invoice No"
                              >
                                <ContentCopyIcon style={{ fontSize: 12 }} />
                              </IconButton>
                            )}
                          </div>
                          <div style={{ color: "#4b5563", fontSize: "10px" }}>
                            {formatDate(job.invoices?.[0]?.invoiceDate)}
                          </div>
                          <div
                            style={{
                              color: "#1e293b",
                              fontSize: "11px",
                              fontWeight: "800",
                              marginTop: "4px",
                              backgroundColor: "rgba(0,0,0,0.03)",
                              padding: "2px 4px",
                              borderRadius: "4px",
                              display: "inline-block"
                            }}
                          >
                            <span style={{ color: "#64748b", fontWeight: "600" }}>{job.invoices?.[0]?.termsOfInvoice}</span>{" "}
                            {job.invoices?.[0]?.currency}{" "}
                            {job.invoices?.[0]?.invoiceValue?.toLocaleString()}
                          </div>
                        </td>

                        {/* Column 5: SB */}
                        <td style={s.td}>
                          {!(job.isGeneralJob || job.exporter === "GENERAL JOB") ? (
                            <>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                }}
                              >
                                <Tooltip title={job.sb_no && job.sb_date && job.custom_house ? "Click to track SB on ICEGATE" : ""}>
                                  <div
                                    style={{
                                      fontWeight: "800",
                                      fontSize: "13px",
                                      color: job.sb_no && job.sb_date && job.custom_house ? "#2563eb" : "#b91c1c",
                                      marginBottom: "2px",
                                      cursor: job.sb_no && job.sb_date && job.custom_house ? "pointer" : "default",
                                      textDecoration: job.sb_no && job.sb_date && job.custom_house ? "underline" : "none",
                                    }}
                                    onClick={(e) => job.sb_no && job.sb_date && job.custom_house && handleSBTrack(job, e)}
                                  >
                                    {job.sb_no || "-"}
                                  </div>
                                </Tooltip>
                                <div style={{ display: "flex", alignItems: "center" }}>
                                  {job.sb_no && job.sb_date && job.custom_house && (
                                    <Tooltip title="Track on ICEGATE">
                                      <IconButton
                                        size="small"
                                        onClick={(e) => handleSBTrack(job, e)}
                                        style={{ padding: 2 }}
                                      >
                                        <TrackChangesIcon style={{ fontSize: 12, color: "#2563eb" }} />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  {job.sb_no && (
                                    <IconButton
                                      size="small"
                                      onClick={(e) => handleCopyText(job.sb_no, e)}
                                      style={{ padding: 2 }}
                                      title="Copy SB No"
                                    >
                                      <ContentCopyIcon style={{ fontSize: 12 }} />
                                    </IconButton>
                                  )}
                                </div>
                              </div>
                              <div style={{ color: "#4b5563", fontSize: "10px" }}>
                                {formatDate(job.sb_date)}
                              </div>
                            </>
                          ) : (
                            <div style={{ color: "#94a3b8", fontSize: "10px" }}>N/A</div>
                          )}
                        </td>

                        {/* Column 6: Port */}
                        <td style={s.td}>
                          {!(job.isGeneralJob || job.exporter === "GENERAL JOB") ? (
                            <>
                              <div style={{ marginBottom: "6px", display: "flex", flexDirection: "column", gap: "1px" }}>
                                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                  <span style={{ fontWeight: "800", fontSize: "9px", color: "#94a3b8", width: "35px" }}>DEST</span>
                                  <span style={{ fontSize: "11px", color: "#1e293b", fontWeight: "700" }}>{job.destination_port || "-"}</span>
                                  {job.destination_port && (
                                    <IconButton
                                      size="small"
                                      onClick={(e) => handleCopyText(job.destination_port, e)}
                                      style={{ padding: 0, marginLeft: 2 }}
                                      title="Copy Destination Port"
                                    >
                                      <ContentCopyIcon style={{ fontSize: 9, color: "#94a3b8" }} />
                                    </IconButton>
                                  )}
                                </div>
                                <div style={{ fontSize: "10px", color: "#64748b", fontStyle: "italic", paddingLeft: "41px" }}>
                                  {job.destination_country || "-"}
                                </div>
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                  <span style={{ fontWeight: "800", fontSize: "9px", color: "#94a3b8", width: "35px" }}>POL</span>
                                  <span style={{ fontSize: "11px", color: "#1e293b", fontWeight: "700" }}>{job.port_of_loading || "-"}</span>
                                  {job.port_of_loading && (
                                    <IconButton
                                      size="small"
                                      onClick={(e) => handleCopyText(job.port_of_loading, e)}
                                      style={{ padding: 0, marginLeft: 2 }}
                                      title="Copy Port of Loading"
                                    >
                                      <ContentCopyIcon style={{ fontSize: 9, color: "#94a3b8" }} />
                                    </IconButton>
                                  )}
                                </div>
                                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                  <span style={{ fontWeight: "800", fontSize: "9px", color: "#94a3b8", width: "35px" }}>DISCH</span>
                                  <span style={{ fontSize: "11px", color: "#1e293b", fontWeight: "700" }}>{job.port_of_discharge || "-"}</span>
                                  {job.port_of_discharge && (
                                    <IconButton
                                      size="small"
                                      onClick={(e) => handleCopyText(job.port_of_discharge, e)}
                                      style={{ padding: 0, marginLeft: 2 }}
                                      title="Copy Port of Discharge"
                                    >
                                      <ContentCopyIcon style={{ fontSize: 9, color: "#94a3b8" }} />
                                    </IconButton>
                                  )}
                                </div>
                              </div>
                            </>
                          ) : (
                            <div style={{ color: "#94a3b8", fontSize: "10px" }}>N/A</div>
                          )}
                        </td>

                        {/* Column 7: Container Placement */}
                        <td style={s.td}>
                          {!(job.isGeneralJob || job.exporter === "GENERAL JOB") ? (
                            <div style={{ marginBottom: "2px" }}>
                              {job.containers && job.containers.length > 0 ? (
                                (() => {
                                  const validContainers = job.containers.filter((c) => c.containerNo);
                                  const containerKey = job._id || job.job_no || idx;
                                  const isExpanded = !!expandedContainers[containerKey];
                                  const visibleContainers = isExpanded ? validContainers : validContainers.slice(0, 3);
                                  const hiddenCount = Math.max(validContainers.length - 3, 0);

                                  if (validContainers.length === 0) {
                                    return <div style={{ fontWeight: "600", color: "#94a3b8" }}>-</div>;
                                  }

                                  return (
                                    <div
                                      style={{
                                        fontWeight: "600",
                                        fontSize: "11px",
                                        color: "#374151",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "3px",
                                      }}
                                    >
                                      {visibleContainers.map((container, index) => (
                                        <div
                                          key={`${container.containerNo}-${index}`}
                                          style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            backgroundColor: "rgba(37, 99, 235, 0.05)",
                                            padding: "2px 4px",
                                            borderRadius: "6px",
                                            marginBottom: "4px",
                                            border: "1px solid rgba(37, 99, 235, 0.1)"
                                          }}
                                        >
                                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", flexWrap: "nowrap" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1, minWidth: 0 }}>
                                              <a
                                                href={`https://www.ldb.co.in/ldb/containersearch/39/${container.containerNo}/1726651147706`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                  display: "inline-block",
                                                  fontWeight: "800",
                                                  textDecoration: "none",
                                                  cursor: "pointer",
                                                  fontSize: "11px",
                                                  color: "#2563eb",
                                                  whiteSpace: "nowrap",
                                                }}
                                                onMouseOver={(e) => (e.target.style.textDecoration = "underline")}
                                                onMouseOut={(e) => (e.target.style.textDecoration = "none")}
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                {container.containerNo}
                                              </a>

                                              {/* Shipping Line Tracking Link */}
                                              {(() => {
                                                const bookingNo = job.booking_no || "";
                                                const containerFirst = job.containers?.[0]?.containerNo || "";
                                                const urls = buildShippingLineUrls(bookingNo, containerFirst);

                                                let linerRaw = job.shipping_line_airline || "";
                                                let liner = linerRaw.includes(" - ") ? linerRaw.split(" - ").pop().trim() : linerRaw.trim();

                                                const matchKey = Object.keys(urls).find(key => liner.toUpperCase().includes(key.toUpperCase()));
                                                const url = matchKey ? urls[matchKey] : "#";

                                                if (liner && url !== "#") {
                                                  return (
                                                    <Tooltip title={`Track on ${liner}`}>
                                                      <a
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{ display: 'flex', alignItems: 'center' }}
                                                      >
                                                        <FontAwesomeIcon icon={faShip} style={{ fontSize: 10, color: "#2563eb" }} />
                                                      </a>
                                                    </Tooltip>
                                                  );
                                                }
                                                return null;
                                              })()}

                                              {/* CONCOR Container Track Button */}
                                              {job.custom_house?.toUpperCase().includes("ICD") && (
                                                <Tooltip title="Track on CONCOR India">
                                                  <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setContainerTrackContainers(job.containers || []);
                                                      setContainerTrackOpen(true);
                                                    }}
                                                    style={{ padding: 0, marginLeft: 2 }}
                                                  >
                                                    <FontAwesomeIcon icon={faAnchor} style={{ fontSize: 10, color: "#7c3aed" }} />
                                                  </IconButton>
                                                </Tooltip>
                                              )}

                                              <IconButton
                                                size="small"
                                                onClick={(e) => handleCopyText(container.containerNo, e)}
                                                style={{ padding: 0, marginLeft: 2 }}
                                                title="Copy Container No"
                                              >
                                                <ContentCopyIcon style={{ fontSize: 10, color: "#64748b" }} />
                                              </IconButton>
                                            </div>
                                          </div>
                                          {/* Container type shown below the container no */}
                                          {container.type && (
                                            <div style={{ marginTop: "2px" }}>
                                              <span style={{ fontSize: '9px', color: '#445566', fontWeight: "900", backgroundColor: "#e2e8f0", padding: "1px 6px", borderRadius: "3px", display: "inline-block" }}>
                                                {getContainerSizeLabel(container.type)}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                      {hiddenCount > 0 && (
                                        <button
                                          type="button"
                                          onClick={(e) => toggleContainers(e, containerKey)}
                                          style={{
                                            alignSelf: "flex-start",
                                            border: isExpanded ? "none" : "1px solid #f59e0b",
                                            background: isExpanded ? "transparent" : "#fff7ed",
                                            color: isExpanded ? "#475569" : "#b45309",
                                            fontSize: "10px",
                                            fontWeight: "700",
                                            cursor: "pointer",
                                            padding: isExpanded ? "2px 0" : "3px 8px",
                                            borderRadius: "999px",
                                          }}
                                        >
                                          {isExpanded ? "Show less" : `Show ${hiddenCount} more`}
                                        </button>
                                      )}
                                    </div>
                                  );
                                })()
                              ) : (
                                <div style={{ fontWeight: "600", color: "#94a3b8" }}>-</div>
                              )}
                            </div>
                          ) : (
                            <div style={{ color: "#94a3b8", fontSize: "10px" }}>N/A</div>
                          )}
                          {!(job.isGeneralJob || job.exporter === "GENERAL JOB") && (
                            <div style={{ color: "#475569", fontSize: "10px", marginTop: "6px", backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "4px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "2px", fontWeight: "800", color: "#1e293b", marginBottom: "2px" }}>
                                <span>{job.total_no_of_pkgs} {job.package_unit}</span>
                                {job.total_no_of_pkgs && (
                                  <IconButton size="small" onClick={(e) => handleCopyText(`${job.total_no_of_pkgs} ${job.package_unit || ""}`.trim(), e)} style={{ padding: 0 }} title="Copy No of Packages">
                                    <ContentCopyIcon style={{ fontSize: 9, color: "#94a3b8" }} />
                                  </IconButton>
                                )}
                              </div>
                              <div style={{ fontSize: "9px", display: "flex", alignItems: "center", gap: "4px" }}>
                                <span style={{ fontWeight: "700" }}>G:</span>
                                <span>{job.gross_weight_kg} kg</span>
                                {job.gross_weight_kg && (
                                  <IconButton size="small" onClick={(e) => handleCopyText(String(job.gross_weight_kg), e)} style={{ padding: 0 }} title="Copy Gross Weight">
                                    <ContentCopyIcon style={{ fontSize: 8, color: "#94a3b8" }} />
                                  </IconButton>
                                )}
                                <span style={{ color: "#cbd5e1" }}>|</span>
                                <span style={{ fontWeight: "700" }}>N:</span>
                                <span>{job.net_weight_kg} kg</span>
                                {job.net_weight_kg && (
                                  <IconButton size="small" onClick={(e) => handleCopyText(String(job.net_weight_kg), e)} style={{ padding: 0 }} title="Copy Net Weight">
                                    <ContentCopyIcon style={{ fontSize: 8, color: "#94a3b8" }} />
                                  </IconButton>
                                )}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Column 8: Handover DATE */}
                        <td style={s.td}>
                          {!(job.isGeneralJob || job.exporter === "GENERAL JOB") && (
                            <>
                              {(() => {
                                const opDetails = job.operations?.[0]?.statusDetails?.[0] || {};
                                const isLcl = job.consignmentType === "LCL";
                                const isAir = job.transportMode?.toUpperCase() === "AIR" || job.job_no?.toUpperCase().includes("/AIR/");
                                const showRailRoad = !isLcl && !isAir;
                                const outLbl = opDetails.railRoad === "road" ? "Road Out" : "Rail Out";
                                const reachedLbl = opDetails.railRoad === "road" ? "Road Rch" : "Rail Rch";

                                return (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                    <div style={{ fontSize: "10px", display: "flex", justifyContent: "space-between" }}>
                                      <span style={{ color: "#64748b", fontWeight: "700", fontSize: "9px" }}>LEO</span>
                                      <span style={{ fontWeight: "600", color: "#1e293b" }}>{formatDate(opDetails.leoDate, "dd-MM-yy")}</span>
                                    </div>
                                    <div style={{ fontSize: "10px", display: "flex", justifyContent: "space-between" }}>
                                      <span style={{ color: "#64748b", fontWeight: "700", fontSize: "9px" }}>DHO</span>
                                      <span style={{ fontWeight: "600", color: "#1e293b" }}>{formatDate(opDetails.handoverForwardingNoteDate, "dd-MM-yy")}</span>
                                    </div>
                                    {showRailRoad && (
                                      <>
                                        <div style={{ fontSize: "10px", display: "flex", justifyContent: "space-between" }}>
                                          <span style={{ color: "#64748b", fontWeight: "700", fontSize: "9px" }}>{outLbl.toUpperCase()}</span>
                                          <span style={{ fontWeight: "600", color: "#1e293b" }}>{formatDate(opDetails.handoverConcorTharSanganaRailRoadDate, "dd-MM-yy")}</span>
                                        </div>
                                        <div style={{ fontSize: "10px", display: "flex", justifyContent: "space-between" }}>
                                          <span style={{ color: "#64748b", fontWeight: "700", fontSize: "9px" }}>{reachedLbl.toUpperCase()}</span>
                                          <span style={{ fontWeight: "600", color: "#1e293b" }}>{formatDate(opDetails.railOutReachedDate, "dd-MM-yy")}</span>
                                        </div>
                                      </>
                                    )}
                                    {opDetails.billing_details?.agency_bill_date ? (
                                      <div style={{ fontSize: "10px", display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: "#64748b", fontWeight: "700", fontSize: "9px" }}>BILL (A)</span>
                                        <span style={{ fontWeight: "600", color: "#1e293b" }}>{formatDate(opDetails.billing_details.agency_bill_date, "dd-MM-yy")}</span>
                                      </div>
                                    ) : null}
                                    {opDetails.billing_details?.reimbursement_bill_date ? (
                                      <div style={{ fontSize: "10px", display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: "#64748b", fontWeight: "700", fontSize: "9px" }}>BILL (R)</span>
                                        <span style={{ fontWeight: "600", color: "#1e293b" }}>{formatDate(opDetails.billing_details.reimbursement_bill_date, "dd-MM-yy")}</span>
                                      </div>
                                    ) : null}
                                    {!opDetails.billing_details?.agency_bill_date && !opDetails.billing_details?.reimbursement_bill_date && opDetails.billingDocsSentDt ? (
                                      <div style={{ fontSize: "10px", display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: "#64748b", fontWeight: "700", fontSize: "9px" }}>BILL</span>
                                        <span style={{ fontWeight: "600", color: "#1e293b" }}>{formatDate(opDetails.billingDocsSentDt, "dd-MM-yy")}</span>
                                      </div>
                                    ) : null}

                                    {job.vgm_done && (
                                      <div style={{ marginTop: "4px", backgroundColor: "#ecfdf5", border: "1px solid #10b981", borderRadius: "4px", padding: "2px 4px", fontSize: "9px", color: "#065f46" }}>
                                        <span style={{ fontWeight: "800" }}>VGM:</span> {formatDate(job.vgm_date, "dd-MM-yy")}
                                      </div>
                                    )}
                                    {job.form13_done && (
                                      <div style={{ marginTop: "2px", backgroundColor: "#f0f9ff", border: "1px solid #0ea5e9", borderRadius: "4px", padding: "2px 4px", fontSize: "9px", color: "#0369a1" }}>
                                        <span style={{ fontWeight: "800" }}>F13:</span> {formatDate(job.form13_date, "dd-MM-yy")}
                                      </div>
                                    )}
                                    {job.shipping_bill_done && (
                                      <div style={{ marginTop: "2px", backgroundColor: "#fef2f8", border: "1px solid #f43f5e", borderRadius: "4px", padding: "2px 4px", fontSize: "9px", color: "#9f1239" }}>
                                        <span style={{ fontWeight: "800" }}>SB DONE:</span> {formatDate(job.shipping_bill_done_date, "dd-MM-yy")}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </>
                          )}
                          {(job.isGeneralJob || job.exporter === "GENERAL JOB") && <div style={{ color: "#94a3b8", fontSize: "10px" }}>-</div>}
                        </td>

                        <td style={s.td}>
                          <Button
                            size="small"
                            onClick={(e) => handleDocsClick(e, job)}
                            endIcon={<ArrowDropDownIcon style={{ fontSize: '14px' }} />}
                            style={{
                              fontSize: "10px",
                              padding: "1px 6px",
                              textTransform: "none",
                              backgroundColor: "#f8fafc",
                              border: "1px solid #cbd5e1",
                              color: "#475569",
                              borderRadius: "4px",
                              fontWeight: "600",
                              minWidth: '70px'
                            }}
                          >
                            Files
                          </Button>
                        </td>

                        <td style={{ ...s.td, backgroundColor: job.financial_lock ? "#ecfdf5" : "inherit", minWidth: '100px' }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <button
                              onClick={(e) => handleSignDSC(job, e)}
                              disabled={(signingLoading || checkingDsc) && selectedSignJob?._id === job._id}
                              style={{
                                padding: "6px 12px",
                                backgroundColor: ((signingLoading || checkingDsc) && selectedSignJob?._id === job._id) ? "#cbd5e1" : "#9333ea",
                                color: "white",
                                border: "none",
                                borderRadius: "3px",
                                fontSize: "11px",
                                fontWeight: "600",
                                cursor: ((signingLoading || checkingDsc) && selectedSignJob?._id === job._id) ? "not-allowed" : "pointer",
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "4px"
                              }}
                              title="Sign with DSC"
                            >
                              {((signingLoading || checkingDsc) && selectedSignJob?._id === job._id) ? (
                                <CircularProgress size={12} color="inherit" />
                              ) : (
                                <GavelIcon style={{ fontSize: 12 }} />
                              )}
                              {((signingLoading || checkingDsc) && selectedSignJob?._id === job._id) ? (checkingDsc ? "Checking..." : "Signing...") : "Sign"}
                            </button>

                            <button
                              className="copy-btn"
                              onClick={(e) => handleCopyJob(job, e)}
                              style={{
                                padding: "4px 8px",
                                backgroundColor: "#10b981",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: "700",
                                cursor: "pointer",
                                width: "100%",
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                              }}
                            >
                              Copy
                            </button>
                            <Button
                              size="small"
                              onClick={(e) => handleGenDocsClick(e, job)}
                              endIcon={<ArrowDropDownIcon style={{ fontSize: '14px' }} />}
                              style={{
                                fontSize: "10px",
                                padding: "1px 6px",
                                textTransform: "none",
                                backgroundColor: "#eff6ff",
                                border: "1px solid #3b82f6",
                                color: "#2563eb",
                                borderRadius: "4px",
                                fontWeight: "700",
                                width: "100%",
                                minHeight: '24px'
                              }}
                            >
                              Docs
                            </Button>
                            {/* Query Traffic Light: Red=Raise, Yellow=View, Green=Resolved */}
                            <div style={{ display: "flex", gap: "6px", justifyContent: "center", width: "100%", flexWrap: "wrap", margin: "4px 0" }}>
                              {/* RED - Raise Query */}
                              <Tooltip title="Raise a query" arrow>
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQueryDialogJob(job);
                                    setQueryDialogOpen(true);
                                  }}
                                  style={{
                                    width: 18, height: 18, borderRadius: "50%",
                                    backgroundColor: "#ef4444", cursor: "pointer",
                                    border: "2px solid #dc2626",
                                    opacity: (jobQueriesStatus[job.job_no]?.hasQueries && !jobQueriesStatus[job.job_no]?.hasOpenQueries) ? 0.5 : 1,
                                    filter: (jobQueriesStatus[job.job_no]?.hasQueries && !jobQueriesStatus[job.job_no]?.hasOpenQueries) ? "grayscale(0.6)" : "none",
                                    flexShrink: 0,
                                    transition: "transform 0.15s",
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.25)"}
                                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                                />
                              </Tooltip>
                              {/* YELLOW - View Queries/Replies */}
                              {jobQueriesStatus[job.job_no]?.hasQueries && (
                                <>
                                  <Tooltip title="View queries & replies" arrow>
                                    <div
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        setQueryChatJob(job);
                                        setQueryChatOpen(true);
                                        setQueryChatLoading(true);
                                        try {
                                          const [resp, clientResp] = await Promise.all([
                                            axios.get(
                                              `${import.meta.env.VITE_API_STRING}/queries`,
                                              { params: { job_no: job.job_no } }
                                            ),
                                            axios.get(
                                              `${import.meta.env.VITE_API_STRING}/client-queries`,
                                              { params: { job_no: job.job_no } }
                                            ).catch(() => ({ data: { queries: [] } }))
                                          ]);

                                          const queriesFetched = resp.data?.data?.queries || resp.data?.data || [];
                                          const clientQueriesFetched = clientResp.data?.queries || [];
                                          setQueryChatData(queriesFetched);
                                          setClientQueryChatData(clientQueriesFetched);
                                          setActiveQueryIndex(0);
                                          if (clientQueriesFetched.length > 0) {
                                            setActiveChatTab("client");
                                          } else if (queriesFetched.length > 0) {
                                            setActiveChatTab("internal");
                                          } else {
                                            setActiveChatTab("client");
                                          }

                                          if (queriesFetched.length > 0) {
                                            axios.put(`${import.meta.env.VITE_API_STRING}/queries/mark-seen`, {
                                              queryIds: queriesFetched.map(q => q._id)
                                            }).catch(console.error);
                                          }

                                          if (clientQueriesFetched.length > 0) {
                                            axios.put(`${import.meta.env.VITE_API_STRING}/client-queries/mark-seen`, {
                                              queryIds: clientQueriesFetched.map(q => q._id),
                                              isClient: false
                                            }).catch(console.error);
                                          }

                                          setJobQueriesStatus(prev => ({
                                            ...prev,
                                            [job.job_no]: { ...prev[job.job_no], hasUnseen: false }
                                          }));
                                        } catch (err) {
                                          console.error(err);
                                          setQueryChatData([]);
                                          setClientQueryChatData([]);
                                        } finally {
                                          setQueryChatLoading(false);
                                        }
                                      }}
                                      style={{
                                        width: 18, height: 18, borderRadius: "50%",
                                        backgroundColor: "#f59e0b", cursor: "pointer",
                                        border: "2px solid #d97706",
                                        opacity: (jobQueriesStatus[job.job_no]?.hasQueries && !jobQueriesStatus[job.job_no]?.hasOpenQueries) ? 0.5 : 1,
                                        filter: (jobQueriesStatus[job.job_no]?.hasQueries && !jobQueriesStatus[job.job_no]?.hasOpenQueries) ? "grayscale(0.6)" : "none",
                                        flexShrink: 0,
                                        position: "relative",
                                        transition: "transform 0.15s",
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.25)"}
                                      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                                    >
                                      {jobQueriesStatus[job.job_no]?.hasUnseen && (
                                        <div style={{
                                          position: "absolute", top: -4, right: -4,
                                          width: 8, height: 8, borderRadius: "50%",
                                          backgroundColor: "#dc2626", border: "1px solid #fff"
                                        }} />
                                      )}
                                    </div>
                                  </Tooltip>
                                  {/* GREEN - Resolve */}
                                  <Tooltip title="Mark queries resolved" arrow>
                                    <div
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!window.confirm(`Mark all open queries for ${job.job_no} as resolved?`)) return;
                                        try {
                                          const resp = await axios.get(
                                            `${import.meta.env.VITE_API_STRING}/queries`,
                                            { params: { job_no: job.job_no, status: "open" } }
                                          );
                                          const openQueries = resp.data?.data?.queries || resp.data?.data || [];
                                          if (openQueries.length === 0) {
                                            alert("No open queries for this job.");
                                            return;
                                          }
                                          await Promise.all(
                                            openQueries.map(q =>
                                              axios.put(`${import.meta.env.VITE_API_STRING}/queries/${q._id}/resolve`, {
                                                resolvedBy: user?.username || "unknown",
                                                resolvedByName: user?.fullName || user?.username || "Unknown",
                                                resolutionNote: "Resolved from job table",
                                              })
                                            )
                                          );
                                          alert(`${openQueries.length} query(ies) resolved.`);

                                          // Optionally update local stats manually or just trigger a refresh
                                          setJobQueriesStatus(prev => ({
                                            ...prev,
                                            [job.job_no]: { ...prev[job.job_no], hasUnseen: false }
                                          }));
                                        } catch (err) {
                                          console.error(err);
                                          alert("Failed to resolve queries.");
                                        }
                                      }}
                                      style={{
                                        width: 18, height: 18, borderRadius: "50%",
                                        backgroundColor: "#22c55e", cursor: "pointer",
                                        border: "2px solid #16a34a",
                                        opacity: (jobQueriesStatus[job.job_no]?.hasQueries && !jobQueriesStatus[job.job_no]?.hasOpenQueries) ? 0.5 : 1,
                                        filter: (jobQueriesStatus[job.job_no]?.hasQueries && !jobQueriesStatus[job.job_no]?.hasOpenQueries) ? "grayscale(0.6)" : "none",
                                        flexShrink: 0,
                                        transition: "transform 0.15s",
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.25)"}
                                      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                                    />
                                  </Tooltip>
                                </>
                              )}
                            </div>
                          </div>
                          <div
                            style={{
                              textAlign: "center",
                              marginTop: "8px",
                              fontSize: "10px",
                              fontWeight: "800",
                              color: theme.text,
                              backgroundColor: theme.bg,
                              border: `1px solid ${theme.border}`,
                              padding: "4px 2px",
                              borderRadius: "6px",
                              textTransform: "uppercase",
                              letterSpacing: "0.4px",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                            }}
                          >
                            {(isChargesModule && activeTab === "Completed")
                              ? (
                                (() => {
                                  const bd = job.operations?.[0]?.statusDetails?.[0]?.billing_details;
                                  const docsDt = job.operations?.[0]?.statusDetails?.[0]?.billingDocsSentDt;
                                  if (bd?.agency_bill_date && bd?.reimbursement_bill_date) {
                                    return `${formatDate(bd.agency_bill_date)} & ${formatDate(bd.reimbursement_bill_date)}`;
                                  }
                                  return formatDate(bd?.agency_bill_date || bd?.reimbursement_bill_date || docsDt) || job.status;
                                })()
                              )
                              : (Array.isArray(job.detailedStatus) && job.detailedStatus.length > 0
                                ? job.detailedStatus[job.detailedStatus.length - 1]
                                : (typeof job.detailedStatus === 'string' && job.detailedStatus) ? job.detailedStatus : job.status || "-")}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div style={s.footer}>
            <div>
              Showing {sortedJobs.length} of {totalRecords} Records
            </div>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, value) => setPage(value)}
              shape="rounded"
              color="primary"
              showFirstButton
              showLastButton
              size="small"
            />
          </div>
        </div>
      </div >

      {/* Copy Job Modal */}
      {
        showCopyModal && copySourceJob && (
          <div style={modalStyles.overlay}>
            <div style={modalStyles.modal}>
              <div style={modalStyles.modalHeader}>
                <h3 style={modalStyles.modalTitle}>Copy Export Job</h3>
                <button
                  style={modalStyles.closeButton}
                  onClick={() => {
                    setShowCopyModal(false);
                    setCopySourceJob(null);
                    setCopyError("");
                  }}
                >
                  ×
                </button>
              </div>

              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Source Job Number</label>
                <input
                  style={s.input}
                  type="text"
                  value={copySourceJob.job_no}
                  readOnly
                  disabled
                />
                <div style={modalStyles.infoText}>
                  All data from this job will be copied (except SB details)
                </div>
              </div>

              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Branch Code *</label>
                <select
                  style={s.select}
                  value={copyForm.branch_code}
                  onChange={(e) =>
                    setCopyForm({ ...copyForm, branch_code: e.target.value })
                  }
                  required
                >
                  <option value="">Select Branch</option>
                  {branchOptions
                    .filter((branch) => branch.code !== "")
                    .map((branch) => (
                      <option key={branch.code} value={branch.code}>
                        {branch.label}
                      </option>
                    ))}
                </select>
              </div>

              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Transport Mode *</label>
                <select
                  style={s.select}
                  value={copyForm.transportMode}
                  onChange={(e) =>
                    setCopyForm({ ...copyForm, transportMode: e.target.value })
                  }
                  required
                >
                  {transportModeOptions.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Financial Year *</label>
                <input
                  style={s.input}
                  type="text"
                  placeholder="e.g., 26-27"
                  value={copyForm.year}
                  onChange={(e) =>
                    setCopyForm({ ...copyForm, year: e.target.value })
                  }
                  required
                />
                <div style={modalStyles.infoText}>
                  Format: YY-YY (e.g., 26-27 for 2026-2027)
                </div>
              </div>

              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>
                  Manual Sequence (Optional)
                </label>
                <input
                  style={s.input}
                  type="text"
                  placeholder="Leave empty for auto-sequence"
                  value={copyForm.manualSequence}
                  onChange={(e) =>
                    setCopyForm({ ...copyForm, manualSequence: e.target.value })
                  }
                />
                {suggestedSequence && !copyForm.manualSequence && (
                  <div style={modalStyles.infoText}>
                    Suggested next sequence: {suggestedSequence}
                  </div>
                )}
              </div>

              {generatedJobNo && (
                <div style={modalStyles.formGroup}>
                  <label style={modalStyles.label}>Generated Job Number:</label>
                  <div style={modalStyles.generatedJobNo}>{generatedJobNo}</div>
                </div>
              )}

              {copyError && <div style={modalStyles.errorText}>{copyError}</div>}

              <div style={modalStyles.buttonGroup}>
                <button
                  style={modalStyles.cancelButton}
                  onClick={() => {
                    setShowCopyModal(false);
                    setCopySourceJob(null);
                    setCopyError("");
                  }}
                >
                  Cancel
                </button>
                <button
                  style={
                    copyLoading
                      ? {
                        ...modalStyles.submitButton,
                        ...modalStyles.disabledButton,
                      }
                      : modalStyles.submitButton
                  }
                  onClick={handleCopySubmit}
                  disabled={
                    copyLoading ||
                    !copyForm.branch_code ||
                    !copyForm.transportMode ||
                    !copyForm.year
                  }
                >
                  {copyLoading ? "Copying..." : "Copy Job"}
                </button>
              </div>
            </div>
          </div>
        )
      }
      {/* Add Job Dialog */}
      <Dialog
        open={openAddDialog}
        onClose={() => setOpenAddDialog(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          style: {
            borderRadius: "8px",
            backgroundColor: "#f0f2f5",
          },
        }}
      >
        <DialogTitle
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "15px 20px",
            borderBottom: "1px solid #e5e7eb",
            backgroundColor: "#fff",
            fontSize: "16px",
            fontWeight: "700",
          }}
        >
          <span>Create New Export Job</span>
          <IconButton
            edge="end"
            color="inherit"
            onClick={() => setOpenAddDialog(false)}
            aria-label="close"
            size="small"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent style={{ padding: 0 }}>
          <AddExJobs
            onJobCreated={() => {
              setOpenAddDialog(false);
              fetchJobs();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* DSR Report Dialog */}
      <Dialog
        open={openDSRDialog}
        onClose={() => {
          setOpenDSRDialog(false);
          setDsrStartDate("");
          setDsrEndDate("");
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle
          style={{
            borderBottom: "1px solid #e5e7eb",
            fontSize: "16px",
            fontWeight: "700",
          }}
        >
          Download DSR Report
        </DialogTitle>
        <DialogContent style={{ padding: "20px" }}>
          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "#374151",
                marginBottom: "5px",
              }}
            >
              Select Exporter
            </label>
            <Autocomplete
              size="small"
              options={["All Exporters", ...exporters]}
              value={selectedExporter || "All Exporters"}
              onChange={(event, newValue) => {
                setSelectedExporter(newValue || "All Exporters");
              }}
              filterOptions={(options, { inputValue }) =>
                priorityFilter(options, inputValue)
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="-- Choose Exporter --"
                  variant="outlined"
                  sx={{
                    width: "100%",
                    "& .MuiInputBase-root": {
                      fontSize: "12px",
                    },
                  }}
                />
              )}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "#374151",
                marginBottom: "5px",
              }}
            >
              Select Year
            </label>
            <select
              style={{
                ...s.select,
                width: "100%",
                height: "35px",
              }}
              value={dsrYear}
              onChange={(e) => setDsrYear(e.target.value)}
            >
              <option value="">All Years</option>
              <option value="26-27">26-27</option>
              <option value="25-26">25-26</option>
              <option value="24-25">24-25</option>
              <option value="23-24">23-24</option>
              <option value="22-23">22-23</option>
              <option value="21-22">21-22</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "5px",
                }}
              >
                From Date
              </label>
              <input
                type="date"
                style={{
                  width: "100%",
                  height: "35px",
                  padding: "5px 10px",
                  fontSize: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  outline: "none",
                }}
                value={dsrStartDate}
                onChange={(e) => setDsrStartDate(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "5px",
                }}
              >
                To Date
              </label>
              <input
                type="date"
                style={{
                  width: "100%",
                  height: "35px",
                  padding: "5px 10px",
                  fontSize: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  outline: "none",
                }}
                value={dsrEndDate}
                onChange={(e) => setDsrEndDate(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              id="dsr-only-pending"
              checked={dsrOnlyPending}
              onChange={(e) => setDsrOnlyPending(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <label
              htmlFor="dsr-only-pending"
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "#374151",
                cursor: "pointer",
              }}
            >
              Only Pending Jobs
            </label>
          </div>
          <div
            style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}
          >
            <button
              style={{ ...modalStyles.cancelButton, padding: "8px 20px" }}
              onClick={() => {
                setOpenDSRDialog(false);
                setDsrStartDate("");
                setDsrEndDate("");
              }}
            >
              Cancel
            </button>
            <button
              style={{
                ...modalStyles.submitButton,
                padding: "8px 20px",
                backgroundColor: dsrLoading ? "#cbd5e1" : "#2563eb",
              }}
              onClick={handleDownloadTableDSR}
              disabled={dsrLoading}
            >
              {dsrLoading ? "Generating..." : "Download Table DSR"}
            </button>
            <button
              style={{
                ...modalStyles.submitButton,
                padding: "8px 20px",
                backgroundColor: dsrLoading ? "#cbd5e1" : "#059669",
              }}
              onClick={handleDownloadDSR}
              disabled={dsrLoading}
            >
              {dsrLoading ? "Generating..." : "Download Excel"}
            </button>
          </div>
        </DialogContent>
      </Dialog>


      {/* SB Track Dialog */}
      <SBTrackDialog
        open={sbTrackOpen}
        onClose={() => {
          setSbTrackOpen(false);
          setSbTrackJob(null);
        }}
        sbNo={sbTrackJob?.sb_no}
        sbDate={sbTrackJob?.sb_date}
        customHouse={sbTrackJob?.custom_house}
        onUpdateStatus={async (updates) => {
          if (!sbTrackJob || !updates) return;

          try {
            // 1. Fetch current job data
            const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
            const headers = { username: user.username || "unknown" };

            const response = await axios.get(
              `${import.meta.env.VITE_API_STRING}/get-export-job/${encodeURIComponent(sbTrackJob.job_no)}`,
              { headers }
            );

            let fullJob = null;
            if (response.data) {
              if (response.data.success && response.data.data) {
                fullJob = response.data.data;
              } else if (response.data.job_no || response.data._id) {
                fullJob = response.data;
              }
            }

            if (!fullJob) {
              console.error("Failed to fetch job for update");
              return;
            }

            // 2. Update status details
            let operations = fullJob.operations || [];
            if (operations.length === 0) {
              operations = [{ statusDetails: [{}] }];
            }

            const op = operations[0];
            const statusDetails = op.statusDetails || [{}];
            const currentStatus = statusDetails[0] || {};

            // Merge valid updates only
            const newStatus = { ...currentStatus };
            if (updates.goodsRegistrationDate) newStatus.goodsRegistrationDate = updates.goodsRegistrationDate;
            if (updates.goodsReportDate) newStatus.goodsReportDate = updates.goodsReportDate;
            if (updates.leoDate) newStatus.leoDate = updates.leoDate;

            const newOperations = [...operations];
            newOperations[0] = {
              ...op,
              statusDetails: [newStatus]
            };

            // 3. Update fields
            if (updates.egm_no) fullJob.egm_no = updates.egm_no;
            if (updates.egm_date) fullJob.egm_date = updates.egm_date;

            // Auto-populate Container and Seal no if exactly one container is present
            if (updates.container_no || updates.seal_no) {
              if (!fullJob.containers || fullJob.containers.length === 0) {
                fullJob.containers = [{}];
              }
              if (fullJob.containers.length === 1) {
                if (updates.container_no) fullJob.containers[0].containerNo = updates.container_no;
                if (updates.seal_no) fullJob.containers[0].sealNo = updates.seal_no;
              }
            }

            // Update drawback fields (now inside drawbackDetailsSchema within products of invoices)
            if (updates.drawback_scroll_no || updates.drawback_scroll_date || updates.rosctl_scroll_no || updates.rosctl_scroll_date) {
              if (fullJob.invoices && fullJob.invoices.length > 0) {
                const firstInv = fullJob.invoices[0];
                if (firstInv.products && firstInv.products.length > 0) {
                  const firstProd = firstInv.products[0];
                  if (!firstProd.drawbackDetails || firstProd.drawbackDetails.length === 0) {
                    firstProd.drawbackDetails = [{}];
                  }
                  const firstDbk = firstProd.drawbackDetails[0];
                  if (updates.drawback_scroll_no) firstDbk.drawback_scroll_no = updates.drawback_scroll_no;
                  if (updates.drawback_scroll_date) firstDbk.drawback_scroll_date = updates.drawback_scroll_date;
                  if (updates.rosctl_scroll_no) firstDbk.rosctl_scroll_no = updates.rosctl_scroll_no;
                  if (updates.rosctl_scroll_date) firstDbk.rosctl_scroll_date = updates.rosctl_scroll_date;
                }
              }
            }

            // 4. PUT Update
            const payload = { ...fullJob, operations: newOperations };

            await axios.put(
              `${import.meta.env.VITE_API_STRING}/${encodeURIComponent(sbTrackJob.job_no)}`,
              payload,
              { headers }
            );

            // Refresh table to show changes? Dates might not be visible in table but good to refresh.
            fetchJobs();
            // alert("Job updated with ICEGATE dates!"); // Optional feedback

          } catch (err) {
            console.error("Error updating job from SB Track:", err);
          }
        }}
      />

      {/* Container Track Dialog */}
      <ContainerTrackDialog
        open={containerTrackOpen}
        onClose={() => {
          setContainerTrackOpen(false);
          setContainerTrackContainers([]);
        }}
        containers={containerTrackContainers}
      />

      {/* Gate In Pending Jobs Modal */}
      <Dialog
        open={gateInModalOpen}
        onClose={() => setGateInModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Gate In Pending (&le; 10 Days)</DialogTitle>
        <DialogContent>
          {gateInLoading ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
              Loading jobs...
            </div>
          ) : gateInJobs.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
              No pending Gate In jobs within the last 10 days found.
            </div>
          ) : (
            <div
              style={{ border: "1px solid #e0e0e0", borderRadius: "4px", overflow: "hidden" }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead style={{ backgroundColor: "#f5f5f5" }}>
                  <tr>
                    <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #e0e0e0" }}>Job No</th>
                    <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #e0e0e0" }}>SB No</th>
                    <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #e0e0e0" }}>Exporter</th>
                    <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #e0e0e0" }}>Gate In Date</th>
                    <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #e0e0e0" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {gateInJobs.map((j, i) => (
                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #e0e0e0" }}>
                      <td style={{ padding: "8px" }}>{j.job_no}</td>
                      <td style={{ padding: "8px" }}>{j.sb_no}</td>
                      <td style={{ padding: "8px" }}>{j.exporter}</td>
                      <td style={{ padding: "8px" }}>{j.gateInDate}</td>
                      <td style={{ padding: "8px" }}>
                        <button
                          style={{
                            padding: "4px 10px",
                            backgroundColor: "#fff",
                            color: "#2563eb",
                            border: "1px solid #2563eb",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px"
                          }}
                          onClick={() => {
                            setGateInModalOpen(false);
                            navigate(`/export-operation/job/${encodeURIComponent(j.job_no)}`);
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Raise Query Dialog */}
      <RaiseQueryDialog
        open={queryDialogOpen}
        onClose={() => {
          setQueryDialogOpen(false);
          setQueryDialogJob(null);
        }}
        job={queryDialogJob}
        onQueryRaised={() => {
          console.log("Query raised successfully");
        }}
      />

      {/* Query Chat Dialog (Yellow - view replies) */}
      <Dialog
        open={queryChatOpen}
        onClose={() => { setQueryChatOpen(false); setQueryChatJob(null); setQueryChatData([]); setClientQueryChatData([]); setQueryChatReply(""); setClientQueryChatReply(""); }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "12px", overflow: "hidden" } }}
      >
        {(() => {
          const getChatDateString = (dateStr) => {
            if (!dateStr) return "";
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return "";
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);
            if (d.toDateString() === today.toDateString()) return "Today";
            if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
            return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          };

          const getChatTimeString = (dateStr) => {
            if (!dateStr) return "";
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return "";
            return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
          };

          const activeQuery = activeChatTab === "client" 
            ? clientQueryChatData[activeQueryIndex] 
            : queryChatData[activeQueryIndex];

          const activeQueriesList = activeChatTab === "client" ? clientQueryChatData : queryChatData;

          const chatMessages = [];
          if (activeQuery) {
            chatMessages.push({
              id: "original",
              senderName: activeChatTab === "client" 
                ? (activeQuery.client_name || "Client") 
                : (activeQuery.raisedByName || activeQuery.raisedBy),
              senderEmail: activeChatTab === "client" ? activeQuery.client_email : "",
              senderUsername: activeChatTab === "client" ? activeQuery.client_username : "",
              message: activeQuery.message,
              subject: activeQuery.subject,
              createdAt: activeQuery.createdAt,
              align: activeChatTab === "client" 
                ? "left" 
                : (activeQuery.raisedBy === user?.username ? "right" : "left"),
              isReply: false,
              senderType: activeChatTab === "client" ? "client" : "admin"
            });

            if (activeQuery.replies) {
              activeQuery.replies.forEach((r, ri) => {
                chatMessages.push({
                  id: r._id || `reply-${ri}`,
                  senderName: r.repliedByName || r.repliedBy,
                  senderEmail: r.email || "",
                  senderUsername: r.username || "",
                  message: r.message,
                  createdAt: r.repliedAt,
                  align: activeChatTab === "client"
                    ? (r.senderType === "client" ? "left" : "right")
                    : (r.repliedBy === user?.username ? "right" : "left"),
                  isReply: true,
                  senderType: r.senderType || "admin"
                });
              });
            }
          }

          const handleSendClientReply = async () => {
            if (!clientQueryChatReply.trim() || !activeQuery) return;
            setQueryChatSending(true);
            try {
              await axios.put(`${import.meta.env.VITE_API_STRING}/client-queries/${activeQuery._id}/reply`, {
                message: clientQueryChatReply.trim(),
                repliedBy: user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : (user?.username || "Admin"),
                senderType: "admin",
                email: user?.email || "",
                username: user?.username || "",
              });
              const resp = await axios.get(`${import.meta.env.VITE_API_STRING}/client-queries`, { params: { job_no: queryChatJob.job_no } });
              setClientQueryChatData(resp.data?.queries || []);
              setClientQueryChatReply("");
            } catch (err) {
              console.error(err);
            } finally {
              setQueryChatSending(false);
            }
          };

          const handleSendInternalReply = async () => {
            if (!queryChatReply.trim() || !activeQuery) return;
            setQueryChatSending(true);
            try {
              await axios.post(`${import.meta.env.VITE_API_STRING}/queries/${activeQuery._id}/reply`, {
                message: queryChatReply.trim(),
                repliedBy: user?.username || "unknown",
                repliedByName: user?.fullName || user?.username || "Unknown",
                fromModule: currentModuleForQueries,
              });
              const resp = await axios.get(`${import.meta.env.VITE_API_STRING}/queries`, { params: { job_no: queryChatJob.job_no } });
              setQueryChatData(resp.data?.data?.queries || resp.data?.data || []);
              setQueryChatReply("");
            } catch (err) {
              console.error(err);
            } finally {
              setQueryChatSending(false);
            }
          };

          return (
            <>
              {/* Blue Dialog Header */}
              <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e62d4", py: 1.5, px: 3, background: "#1e62d4", color: "#fff" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>Queries &amp; Replies</div>
                  {queryChatJob?.job_no && <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>Job: {queryChatJob.job_no}</div>}
                </div>
                <IconButton onClick={() => { setQueryChatOpen(false); setQueryChatJob(null); setQueryChatData([]); setClientQueryChatData([]); setQueryChatReply(""); setClientQueryChatReply(""); }} size="small" sx={{ color: "#fff" }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </DialogTitle>

              {/* Tabs selector if both exist */}
              {queryChatData.length > 0 && clientQueryChatData.length > 0 && (
                <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", backgroundColor: "#f3f4f6" }}>
                  <button
                    onClick={() => { setActiveChatTab("client"); setActiveQueryIndex(0); }}
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      border: "none",
                      borderBottom: activeChatTab === "client" ? "3px solid #1e62d4" : "none",
                      backgroundColor: activeChatTab === "client" ? "#fff" : "transparent",
                      color: activeChatTab === "client" ? "#1e62d4" : "#4b5563",
                      fontWeight: "700",
                      fontSize: "13px",
                      cursor: "pointer",
                      outline: "none"
                    }}
                  >
                    Client Queries ({clientQueryChatData.length})
                  </button>
                  <button
                    onClick={() => { setActiveChatTab("internal"); setActiveQueryIndex(0); }}
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      border: "none",
                      borderBottom: activeChatTab === "internal" ? "3px solid #1e62d4" : "none",
                      backgroundColor: activeChatTab === "internal" ? "#fff" : "transparent",
                      color: activeChatTab === "internal" ? "#1e62d4" : "#4b5563",
                      fontWeight: "700",
                      fontSize: "13px",
                      cursor: "pointer",
                      outline: "none"
                    }}
                  >
                    Internal Queries ({queryChatData.length})
                  </button>
                </div>
              )}

              {/* Thread Pills Row if multiple threads in active tab */}
              {activeQueriesList.length > 1 && (
                <div style={{ display: "flex", gap: "8px", padding: "8px 12px", borderBottom: "1px solid #e5e7eb", backgroundColor: "#f9fafb", overflowX: "auto", whiteSpace: "nowrap" }}>
                  {activeQueriesList.map((q, idx) => (
                    <button
                      key={q._id || idx}
                      onClick={() => setActiveQueryIndex(idx)}
                      style={{
                        padding: "4px 12px",
                        borderRadius: "16px",
                        border: "1px solid",
                        borderColor: activeQueryIndex === idx ? "#1e62d4" : "#d1d5db",
                        backgroundColor: activeQueryIndex === idx ? "#eff6ff" : "#fff",
                        color: activeQueryIndex === idx ? "#1e62d4" : "#374151",
                        fontWeight: "600",
                        fontSize: "11px",
                        cursor: "pointer",
                        outline: "none",
                        transition: "all 0.15s"
                      }}
                    >
                      {q.subject ? (q.subject.length > 22 ? `${q.subject.substring(0, 20)}...` : q.subject) : `Query ${idx + 1}`}
                    </button>
                  ))}
                </div>
              )}

              <DialogContent sx={{ p: 0, display: "flex", flexDirection: "column", height: 500, backgroundColor: "#efeae2" }}>
                {queryChatLoading ? (
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", flex: 1, color: "#6b7280" }}>
                    <CircularProgress size={28} sx={{ color: "#1e62d4", mb: 1 }} />
                    <span style={{ fontSize: "13px", fontWeight: "500" }}>Loading conversation...</span>
                  </div>
                ) : activeQueriesList.length === 0 ? (
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1, color: "#9ca3af", fontStyle: "italic", fontSize: 13 }}>
                    No queries raised for this job yet.
                  </div>
                ) : (
                  <>
                    {/* Client Info Banner */}
                    {activeQuery && (
                      <div style={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        padding: "10px 16px",
                        margin: "12px 12px 6px 12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                        flexShrink: 0
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          {/* Avatar Circle */}
                          <div style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            backgroundColor: activeChatTab === "client" ? "#3f51b5" : "#009688",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "700",
                            fontSize: "15px"
                          }}>
                            {activeChatTab === "client" 
                              ? (activeQuery.client_name ? activeQuery.client_name[0].toUpperCase() : "C")
                              : (activeQuery.raisedByName ? activeQuery.raisedByName[0].toUpperCase() : (activeQuery.raisedBy ? activeQuery.raisedBy[0].toUpperCase() : "I"))
                            }
                          </div>
                          
                          {/* Info Text */}
                          <div>
                            <div style={{ fontWeight: "700", fontSize: "13.5px", color: "#1f2937" }}>
                              {activeChatTab === "client" 
                                ? (activeQuery.client_name || activeQuery.client_id || "Client")
                                : (activeQuery.raisedByName || activeQuery.raisedBy || "Internal User")
                              }
                            </div>
                            <div style={{ fontSize: "11px", color: "#6b7280" }}>
                              {activeChatTab === "client"
                                ? (activeQuery.client_email || "no-email@client.com")
                                : `Module: ${activeQuery.raisedFromModule} → ${activeQuery.targetModule}`
                              }
                            </div>
                          </div>
                        </div>
                        
                        {/* Right Pill and Button */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{
                            fontSize: "10px",
                            fontWeight: "800",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            textTransform: "uppercase",
                            backgroundColor: activeQuery.status === "resolved" ? "#dcfce7" : activeQuery.status === "rejected" ? "#fee2e2" : "#fef3c7",
                            color: activeQuery.status === "resolved" ? "#166534" : activeQuery.status === "rejected" ? "#991b1b" : "#92400e",
                            border: `1px solid ${activeQuery.status === 'resolved' ? '#bbf7d0' : activeQuery.status === 'rejected' ? '#fecaca' : '#ffe4e6'}`
                          }}>
                            {activeQuery.status}
                          </span>
                          
                          {/* Resolve Button */}
                          {activeChatTab === "client" && activeQuery.status === "open" && (
                            <button
                              onClick={async () => {
                                if (window.confirm("Are you sure you want to resolve this client query?")) {
                                  setQueryChatSending(true);
                                  try {
                                    await axios.put(`${import.meta.env.VITE_API_STRING}/client-queries/${activeQuery._id}/resolve`, {
                                      resolvedBy: user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : (user?.username || "Admin"),
                                    });
                                    const resp = await axios.get(`${import.meta.env.VITE_API_STRING}/client-queries`, { params: { job_no: queryChatJob.job_no } });
                                    setClientQueryChatData(resp.data?.queries || []);
                                  } catch (err) { console.error(err); }
                                  finally { setQueryChatSending(false); }
                                }
                              }}
                              disabled={queryChatSending}
                              style={{
                                padding: "4px 10px",
                                backgroundColor: "#22c55e",
                                color: "#fff",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: "700",
                                cursor: "pointer",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                              }}
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Messages Scrollable Body */}
                    <div style={{
                      flex: 1,
                      overflowY: "auto",
                      padding: "10px 16px 16px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px"
                    }}>
                      {chatMessages.map((msg, index) => {
                        const showDateSeparator = index === 0 || 
                          getChatDateString(chatMessages[index - 1].createdAt) !== getChatDateString(msg.createdAt);
                          
                        return (
                          <React.Fragment key={msg.id}>
                            {showDateSeparator && (
                              <div style={{ display: "flex", justifyContent: "center", margin: "6px 0" }}>
                                <span style={{
                                  backgroundColor: "#e1f3fd",
                                  color: "#1c2d3a",
                                  padding: "4px 12px",
                                  borderRadius: "8px",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  boxShadow: "0 1px 1px rgba(0,0,0,0.05)"
                                }}>
                                  {getChatDateString(msg.createdAt)}
                                </span>
                              </div>
                            )}
                            
                            <div style={{
                              display: "flex",
                              justifyContent: msg.align === "right" ? "flex-end" : "flex-start",
                              width: "100%"
                            }}>
                              <div style={{
                                maxWidth: "75%",
                                backgroundColor: msg.align === "right" ? "#e7ffdb" : "#ffffff",
                                borderRadius: msg.align === "right" ? "12px 0px 12px 12px" : "0px 12px 12px 12px",
                                padding: "8px 12px",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
                                position: "relative"
                              }}>
                                {/* Sender header info */}
                                <div style={{
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  color: msg.align === "right" ? "#15803d" : "#3f51b5",
                                  marginBottom: "3px"
                                }}>
                                  {msg.senderName} {msg.senderEmail ? `(${msg.senderEmail})` : ""} {msg.senderUsername ? `[${msg.senderUsername}]` : ""}
                                </div>
                                
                                {/* Subject Header */}
                                {msg.subject && !msg.isReply && (
                                  <div style={{
                                    fontWeight: "700",
                                    fontSize: "12px",
                                    color: "#1a237e",
                                    marginBottom: "4px",
                                    borderBottom: "1px solid #f0f2f5",
                                    paddingBottom: "2px"
                                  }}>
                                    Subject: {msg.subject}
                                  </div>
                                )}
                                
                                {/* Message text */}
                                <div style={{
                                  fontSize: "13px",
                                  color: "#1f2937",
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word"
                                }}>
                                  {msg.message}
                                </div>
                                
                                {/* Timestamp / double ticks */}
                                <div style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "flex-end",
                                  gap: "4px",
                                  marginTop: "4px"
                                }}>
                                  <span style={{ fontSize: "10px", color: "#6b7280" }}>
                                    {getChatTimeString(msg.createdAt)}
                                  </span>
                                  {msg.align === "right" && (
                                    <span style={{ color: "#34b7f1", fontSize: "12px", fontWeight: "700", lineHeight: 1 }}>
                                      ✓✓
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Bottom reply input area */}
                    {activeQuery && activeQuery.status === "open" ? (
                      <div style={{
                        backgroundColor: "#f0f2f5",
                        padding: "10px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        borderTop: "1px solid #e5e7eb",
                        flexShrink: 0
                      }}>
                        {/* Smile Emoji Icon */}
                        <button
                          type="button"
                          title="Add Emoji"
                          style={{
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                            padding: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#6b7280"
                          }}
                        >
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                            <line x1="9" y1="9" x2="9.01" y2="9"></line>
                            <line x1="15" y1="9" x2="15.01" y2="9"></line>
                          </svg>
                        </button>

                        {/* Rounded Pill Textfield */}
                        <div style={{
                          backgroundColor: "#fff",
                          borderRadius: "24px",
                          padding: "6px 16px",
                          display: "flex",
                          alignItems: "center",
                          flex: 1,
                          boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                        }}>
                          <input
                            type="text"
                            placeholder="Type your reply here..."
                            value={activeChatTab === "client" ? clientQueryChatReply : queryChatReply}
                            onChange={(e) => {
                              if (activeChatTab === "client") {
                                setClientQueryChatReply(e.target.value);
                              } else {
                                setQueryChatReply(e.target.value);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !queryChatSending) {
                                if (activeChatTab === "client") {
                                  handleSendClientReply();
                                } else {
                                  handleSendInternalReply();
                                }
                              }
                            }}
                            style={{
                              border: "none",
                              outline: "none",
                              width: "100%",
                              fontSize: "13px",
                              color: "#374151"
                            }}
                          />
                          
                          {/* Attachment Icon */}
                          <button
                            type="button"
                            title="Attach file"
                            style={{
                              border: "none",
                              background: "none",
                              cursor: "pointer",
                              padding: "4px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#6b7280",
                              marginLeft: "8px"
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                            </svg>
                          </button>
                        </div>

                        {/* Send Button */}
                        <button
                          onClick={() => {
                            if (activeChatTab === "client") {
                              handleSendClientReply();
                            } else {
                              handleSendInternalReply();
                            }
                          }}
                          disabled={queryChatSending || (activeChatTab === "client" ? !clientQueryChatReply.trim() : !queryChatReply.trim())}
                          style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "50%",
                            backgroundColor: "#00a884",
                            border: "none",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            opacity: (queryChatSending || (activeChatTab === "client" ? !clientQueryChatReply.trim() : !queryChatReply.trim())) ? 0.6 : 1,
                            transition: "all 0.15s",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.15)"
                          }}
                        >
                          {queryChatSending ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="22" y1="2" x2="11" y2="13"></line>
                              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        backgroundColor: "#d1fae5",
                        color: "#065f46",
                        padding: "10px",
                        textAlign: "center",
                        fontWeight: "700",
                        fontSize: "13px",
                        borderTop: "1px solid #a7f3d0",
                        flexShrink: 0
                      }}>
                        This query has been marked as RESOLVED.
                      </div>
                    )}
                  </>
                )}
              </DialogContent>
            </>
          );
        })()}
      </Dialog>

      {/* 1. UPLOADED DOCUMENTS MENU */}
      <Menu
        anchorEl={docsAnchorEl}
        open={Boolean(docsAnchorEl)}
        onClose={handleDocsClose}
        PaperProps={{
          style: {
            maxHeight: 450,
            width: '220px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '4px 0'
          },
        }}
      >
        {selectedDocJob && (() => {
          const links = getDocumentLinks(selectedDocJob);
          if (links.length === 0) return <MenuItem disabled style={{ fontSize: '13px' }}>No uploaded documents</MenuItem>;

          return links.map((link, idx) => {
            if (link.isHeader) {
              return (
                <ListSubheader key={idx} style={{
                  lineHeight: '22px',
                  backgroundColor: '#f8fafc',
                  color: '#0369a1',
                  fontWeight: '800',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  {link.title}
                </ListSubheader>
              );
            }

            return (
              <MenuItem
                key={idx}
                style={{
                  padding: '2px 12px',
                  minHeight: '30px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid #f1f5f9'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
                  {link.url ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        fontSize: '13px',
                        color: '#2563eb',
                        textDecoration: 'none',
                        fontWeight: '600',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {link.title}
                    </a>
                  ) : (
                    <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
                      {link.title}
                    </span>
                  )}
                </div>

                <div onClick={(e) => e.stopPropagation()} style={{ marginLeft: '8px', display: 'flex', alignItems: 'center' }}>
                  {link.url && (
                    <QuickDeleteButton
                      job={selectedDocJob}
                      field={link.field}
                      url={link.url}
                      uploadType={link.uploadType || "status"}
                      idx={link.idx || 0}
                      onSuccess={() => {
                        setJobs((prevJobs) =>
                          prevJobs.map((j) => {
                            if (j._id === selectedDocJob._id) {
                              const updatedJob = JSON.parse(JSON.stringify(j));
                              if (link.uploadType === "toplevel") {
                                updatedJob[link.field] = updatedJob[link.field].filter(u => u !== link.url);
                              } else if (link.uploadType === "section") {
                                updatedJob.operations[0][link.field][link.idx].images = updatedJob.operations[0][link.field][link.idx].images.filter(u => u !== link.url);
                              } else if (link.uploadType === "container") {
                                updatedJob.containers[link.idx][link.field] = updatedJob.containers[link.idx][link.field].filter(u => u !== link.url);
                              } else {
                                updatedJob.operations[0].statusDetails[0][link.field] = updatedJob.operations[0].statusDetails[0][link.field].filter(u => u !== link.url);
                              }
                              setSelectedDocJob(updatedJob);
                              return updatedJob;
                            }
                            return j;
                          })
                        );
                      }}
                    />
                  )}
                  <QuickUploadButton
                    job={selectedDocJob}
                    field={link.field}
                    uploadType={link.uploadType || "status"}
                    idx={link.idx || 0}
                    onSuccess={(url) => {
                      setJobs((prevJobs) =>
                        prevJobs.map((j) => {
                          if (j._id === selectedDocJob._id) {
                            const updatedJob = JSON.parse(JSON.stringify(j));
                            if (link.uploadType === "toplevel") {
                              if (!Array.isArray(updatedJob[link.field])) updatedJob[link.field] = [];
                              updatedJob[link.field].push(url);
                            } else if (link.uploadType === "section") {
                              if (!Array.isArray(updatedJob.operations[0][link.field])) updatedJob.operations[0][link.field] = [];
                              if (!updatedJob.operations[0][link.field][link.idx]) updatedJob.operations[0][link.field][link.idx] = { images: [] };
                              if (!Array.isArray(updatedJob.operations[0][link.field][link.idx].images)) updatedJob.operations[0][link.field][link.idx].images = [];
                              updatedJob.operations[0][link.field][link.idx].images.push(url);
                            } else if (link.uploadType === "container") {
                              if (!updatedJob.containers[link.idx]) updatedJob.containers[link.idx] = {};
                              if (!Array.isArray(updatedJob.containers[link.idx][link.field])) updatedJob.containers[link.idx][link.field] = [];
                              updatedJob.containers[link.idx][link.field].push(url);
                            } else {
                              if (!updatedJob.operations[0].statusDetails[0]) updatedJob.operations[0].statusDetails[0] = {};
                              if (!Array.isArray(updatedJob.operations[0].statusDetails[0][link.field])) updatedJob.operations[0].statusDetails[0][link.field] = [];
                              updatedJob.operations[0].statusDetails[0][link.field].push(url);
                            }
                            setSelectedDocJob(updatedJob);
                            return updatedJob;
                          }
                          return j;
                        })
                      );
                    }}
                  />
                </div>
              </MenuItem>
            );
          });
        })()}
      </Menu>

      {/* 2. GENERATED DOCUMENTS MENU */}
      <Menu
        anchorEl={genDocsAnchorEl}
        open={Boolean(genDocsAnchorEl)}
        onClose={handleGenDocsClose}
        PaperProps={{
          style: {
            maxHeight: 450,
            width: '170px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '4px 0'
          },
        }}
      >
        {selectedGenDocJob && (() => (
          <>
            <ListSubheader style={{
              lineHeight: '22px',
              backgroundColor: '#f1f5f9',
              color: '#1e293b',
              fontWeight: '800',
              fontSize: '10px',
              textTransform: 'uppercase',
              borderBottom: '1px solid #e2e8f0',
              letterSpacing: '0.05em'
            }}>
            </ListSubheader>

            <ExportChecklistGenerator jobNo={selectedGenDocJob?.job_no} renderAsIcon={false}>
              <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>CHECKLIST</MenuItem>
            </ExportChecklistGenerator>

            <FileCoverGenerator jobNo={selectedGenDocJob?.job_no}>
              <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>FILE COVER</MenuItem>
            </FileCoverGenerator>

            {(selectedGenDocJob?.custom_house?.toUpperCase().includes("SACHANA")) && (
              <ConsignmentNoteGenerator jobNo={selectedGenDocJob?.job_no}>
                <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>FORWARDING NOTE (SACHANA)</MenuItem>
              </ConsignmentNoteGenerator>
            )}

            {(selectedGenDocJob?.custom_house?.toUpperCase().includes("THAR")) && (
              <ForwardingNoteTharGenerator jobNo={selectedGenDocJob?.job_no}>
                <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>FORWARDING NOTE (THAR)</MenuItem>
              </ForwardingNoteTharGenerator>
            )}

            {(selectedGenDocJob?.custom_house?.toUpperCase().includes("SABARMATI") || selectedGenDocJob?.custom_house?.toUpperCase().includes("CONCOR")) && (
              <ConcorForwardingNoteGenerator jobNo={selectedGenDocJob?.job_no}>
                <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>FORWARDING NOTE (CONCOR)</MenuItem>
              </ConcorForwardingNoteGenerator>
            )}

            {(!selectedGenDocJob?.custom_house?.toUpperCase().includes("ACC") &&
              !selectedGenDocJob?.custom_house?.toUpperCase().includes("AIRPORT") &&
              !selectedGenDocJob?.custom_house?.toUpperCase().includes("AIR CARGO") &&
              selectedGenDocJob?.transportMode !== "AIR") && (
                <>
                  <AnnexureCGenerator jobNo={selectedGenDocJob?.job_no}>
                    <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>ANNEXURE C</MenuItem>
                  </AnnexureCGenerator>
                  <VGMAuthorizationGenerator jobNo={selectedGenDocJob?.job_no}>
                    <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>VGM AUTHORIZATION</MenuItem>
                  </VGMAuthorizationGenerator>
                  <FreightCertificateGenerator jobNo={selectedGenDocJob?.job_no}>
                    <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>FREIGHT CERTIFICATE</MenuItem>
                  </FreightCertificateGenerator>
                  <BillOfLadingGenerator jobNo={selectedGenDocJob?.job_no}>
                    <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>BILL OF LADING</MenuItem>
                  </BillOfLadingGenerator>
                </>
              )}

            <MenuItem
              onClick={(e) => {
                e.stopPropagation();
                if (!selectedGenDocJob) return;
                const downloadUrl = `${import.meta.env.VITE_API_STRING}/generate-sb-file/${selectedGenDocJob._id}`;
                window.open(downloadUrl, "_blank");
              }}
              style={{
                fontSize: '12px',
                minHeight: '34px',
                padding: '4px 12px',
                color: '#166534',
                fontWeight: 'bold',
                backgroundColor: '#f0fdf4',
                borderBottom: '2px solid #bbf7d0'
              }}
            >
              EXPORT SB FLAT FILE (.SB)
            </MenuItem>
          </>
        ))()}
      </Menu>

      {/* CREATE GENERAL JOB DIALOG */}
      <Dialog
        open={generalJobModalOpen}
        onClose={() => setGeneralJobModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          style: { borderRadius: '12px', padding: '8px', overflow: 'visible' }
        }}
      >
        <DialogTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '800', fontSize: '16px', color: '#1e293b' }}>
          CREATE GENERAL JOB
          <IconButton onClick={() => setGeneralJobModalOpen(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers style={{ overflow: 'visible' }}>
          <Box sx={{ py: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box ref={directoryRef}>
              <InputLabel style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>EXPORTER NAME *</InputLabel>
              <Autocomplete
                options={organizations}
                getOptionLabel={(option) => typeof option === 'string' ? option : (option.organization || "")}
                loading={isDirectoriesLoading}
                freeSolo
                value={generalJobForm.exporter}
                disablePortal
                // Ensure popover appears over the dialog
                PopperProps={{
                  style: { zIndex: 10001 }
                }}
                onInputChange={(event, newInputValue) => {
                  setGeneralJobForm(prev => ({ ...prev, exporter: newInputValue.toUpperCase() }));
                }}
                onChange={(event, value) => {
                  if (typeof value === 'object' && value !== null) {
                    handleDirectorySelect(value);
                  } else if (typeof value === 'string') {
                    setGeneralJobForm(prev => ({ ...prev, exporter: value.toUpperCase() }));
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search from directory or type name..."
                    fullWidth
                    variant="outlined"
                    size="small"
                    InputProps={{
                      ...params.InputProps,
                      style: { fontSize: '13px', fontWeight: '600' }
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <MenuItem {...props} key={option._id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px' }}>
                    <div style={{ fontWeight: '700', fontSize: '12px', color: '#1e293b' }}>{option.organization.toUpperCase()}</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>
                      {option.registrationDetails?.panNo && `PAN: ${option.registrationDetails.panNo}`}
                      {option.registrationDetails?.ieCode && ` | IE: ${option.registrationDetails.ieCode}`}
                    </div>
                  </MenuItem>
                )}
              />
            </Box>

            <Box>
              <InputLabel style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>EXPORTER ADDRESS</InputLabel>
              <TextField
                fullWidth
                multiline
                rows={2}
                variant="outlined"
                size="small"
                value={generalJobForm.exporter_address}
                onChange={(e) => setGeneralJobForm(prev => ({ ...prev, exporter_address: e.target.value.toUpperCase() }))}
                inputProps={{ style: { fontSize: '12px', fontWeight: '600' } }}
              />
            </Box>

            <Box style={{ display: 'flex', gap: '15px' }}>
              <Box style={{ flex: 1 }}>
                <InputLabel style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>GST NO</InputLabel>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  value={generalJobForm.gstin}
                  onChange={(e) => setGeneralJobForm(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                  inputProps={{ style: { fontSize: '12px', fontWeight: '600' } }}
                />
              </Box>
              <Box style={{ flex: 1 }}>
                <InputLabel style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>PAN NO</InputLabel>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  value={generalJobForm.panNo}
                  onChange={(e) => setGeneralJobForm(prev => ({ ...prev, panNo: e.target.value.toUpperCase() }))}
                  inputProps={{ style: { fontSize: '12px', fontWeight: '600' } }}
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: '#f8fafc', borderRadius: '0 0 12px 12px' }}>
          <Button
            onClick={() => setGeneralJobModalOpen(false)}
            style={{ color: '#64748b', fontWeight: '700', fontSize: '12px' }}
          >
            CANCEL
          </Button>
          <Button
            onClick={handleGeneralJobSubmit}
            variant="contained"
            disabled={loading || !generalJobForm.exporter}
            style={{
              backgroundColor: '#2563eb',
              color: '#fff',
              borderRadius: '8px',
              fontWeight: '800',
              fontSize: '12px',
              padding: '8px 24px',
              boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
            }}
          >
            {loading ? <CircularProgress size={16} color="inherit" /> : "CREATE JOB"}
          </Button>
        </div>
      </Dialog>

      {/* DSC PIN INITIALIZATION MODAL */}
      <Dialog open={dscPinModalOpen} onClose={() => setDscPinModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle style={{ padding: '16px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '16px', fontWeight: '600' }}>
          Initialize DSC Token
        </DialogTitle>
        <DialogContent style={{ padding: '24px' }}>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
            The local Java Signer is running but the DSC token is not initialized. Please enter your DSC PIN to unlock the token.
          </p>
          <div className="form-group">
            <label>DSC PIN</label>
            <input
              type="password"
              className="form-control"
              value={dscPin}
              onChange={(e) => setDscPin(e.target.value)}
              placeholder="Enter PIN (e.g. 12345678)"
            />
          </div>
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setDscPinModalOpen(false)} style={{ color: '#64748b' }}>
            Cancel
          </Button>
          <Button
            onClick={handleInitDsc}
            disabled={initDscLoading}
            variant="contained"
            style={{ backgroundColor: '#9333ea', color: 'white', textTransform: 'none', fontWeight: '600' }}
          >
            {initDscLoading ? "Initializing..." : "Unlock DSC"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 3. SIGNING MENU (DSC) */}
      <Menu
        anchorEl={signAnchorEl}
        open={Boolean(signAnchorEl)}
        onClose={handleSignClose}
        PaperProps={{
          style: {
            width: '180px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '4px 0'
          },
        }}
      >
        <ListSubheader style={{ lineHeight: '24px', backgroundColor: '#f8fafc', color: '#9333ea', fontWeight: '800', fontSize: '10px' }}>
          DSC SIGNING OPTIONS
        </ListSubheader>

        <MenuItem
          onClick={handleSignFlatFile}
          style={{ fontSize: '12px', fontWeight: '600', padding: '8px 16px' }}
        >
          <GavelIcon style={{ fontSize: 14, marginRight: 8, color: '#9333ea' }} />
          Sign Flat-file (.sb)
        </MenuItem>

        <MenuItem
          onClick={() => handleSignESanchit()}
          disabled={!selectedSignJob?.eSanchitDocuments?.some(d => d.fileUrl)}
          style={{ fontSize: '12px', fontWeight: '600', padding: '8px 16px' }}
        >
          <CloudUploadIcon style={{ fontSize: 14, marginRight: 8, color: '#2563eb' }} />
          Sign e-Sanchit PDF
        </MenuItem>

        {selectedSignJob?.eSanchitDocuments?.filter(d => d.fileUrl).length > 1 && (
          <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 4, paddingTop: 4 }}>
            {selectedSignJob.eSanchitDocuments.filter(d => d.fileUrl).map((doc, i) => (
              <MenuItem
                key={i}
                onClick={() => handleSignESanchit(doc)}
                style={{ fontSize: '10px', padding: '4px 20px', color: '#64748b' }}
              >
                └ {doc.icegateFileName || `Doc ${i + 1}`}
              </MenuItem>
            ))}
          </div>
        )}
      </Menu>
    </>
  );
};

export default ExportJobsTable;
