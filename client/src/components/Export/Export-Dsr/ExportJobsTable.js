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
  ListSubheader,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LockIcon from "@mui/icons-material/Lock"; // Import LockIcon
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
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
        onClick={() => fileInputRef.current?.click()}
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
        style={{ display: "none" }}
      />
    </>
  );
};

const QuickDeleteButton = ({ job, field, url, uploadType = "status", idx = 0, onSuccess }) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
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
      onClick={handleDelete}
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

const ExportJobsTable = () => {
  const { user } = useContext(UserContext);
  const isAdmin = user?.role === "Admin";

  // Filter Branch Options based on User Permissions
  const allowedBranches = isAdmin ? [] : (user?.selected_branches || []);
  const filteredBranchOptions = branchOptions.filter(b =>
    isAdmin || b.code === "" || allowedBranches.includes(b.code)
  );

  const navigate = useNavigate();

  const FILTER_STORAGE_KEY = "export_jobs_filters";
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

  // Determine if it's the export operation module early
  const isOperationModule = window.location.pathname.startsWith("/export-operation");
  const isChargesModule = window.location.pathname.startsWith("/export-charges");

  // State
  const [activeTab, setActiveTab] = useState(() => {
    const saved = savedFilters.activeTab || "Pending";
    if (isOperationModule && (saved === "Completed" || saved === "Billing Ready")) return "Op Completed";
    if (isChargesModule && !["Pending", "Completed"].includes(saved)) return "Pending";
    if (!isOperationModule && !isChargesModule && (saved === "Op Completed" || saved === "Billing Ready")) return "Completed";
    if (!isOperationModule && isChargesModule && (saved === "Op Completed" || saved === "Billing Ready")) return "Completed";
    return saved;
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
        const res = await axios.post(`${import.meta.env.VITE_API_STRING}/queries/jobs-status`, {
          jobNos,
          currentModule: currentModuleForQueries
        });
        if (res.data.success) {
          setJobQueriesStatus(res.data.data);
        }
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
  const [sortConfig, setSortConfig] = useState(savedFilters.sortConfig || { key: null, direction: 'asc' });

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
    setSortConfig({ key: null, direction: 'asc' });

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

  // Create Job Dialog State
  const [openAddDialog, setOpenAddDialog] = useState(false);

  // DSR Report Dialog State
  const [openDSRDialog, setOpenDSRDialog] = useState(false);
  const [exporters, setExporters] = useState([]);
  const [selectedExporter, setSelectedExporter] = useState("All Exporters");
  const [dsrYear, setDsrYear] = useState(getCurrentFinancialYear());
  const [dsrOnlyPending, setDsrOnlyPending] = useState(false);
  const [dsrLoading, setDSRLoading] = useState(false);

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

  // Query Dialog State
  const [queryDialogOpen, setQueryDialogOpen] = useState(false);
  const [queryDialogJob, setQueryDialogJob] = useState(null);

  // Query Chat Dialog State (Yellow button - view replies)
  const [queryChatOpen, setQueryChatOpen] = useState(false);
  const [queryChatJob, setQueryChatJob] = useState(null);
  const [queryChatData, setQueryChatData] = useState([]);
  const [queryChatLoading, setQueryChatLoading] = useState(false);
  const [queryChatReply, setQueryChatReply] = useState("");
  const [queryChatSending, setQueryChatSending] = useState(false);

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
            onlyPending: dsrOnlyPending
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
              if (c.type) contCol.push(`Size: ${c.type}`);
            });
          }
          const placeDate = job.operations?.[0]?.statusDetails?.[0]?.containerPlacementDate;
          if (placeDate) contCol.push(`Place: ${formatDate(placeDate, "dd-MM-yy")}`);
          rowData["Container"] = contCol.join("\n");

          // Column 7: Handover
          let handCol = [];
          const opDetails = job.operations?.[0]?.statusDetails?.[0] || {};
          const outLbl = opDetails.railRoad === "road" ? "Road Out" : "Rail Out";
          const reachedLbl = opDetails.railRoad === "road" ? "Road Rch" : "Rail Rch";

          if (opDetails.leoDate) handCol.push(`Leo: ${formatDate(opDetails.leoDate, "dd-MM-yy")}`);
          if (opDetails.handoverForwardingNoteDate) handCol.push(`DHo: ${formatDate(opDetails.handoverForwardingNoteDate, "dd-MM-yy")}`);
          if (opDetails.handoverConcorTharSanganaRailRoadDate) handCol.push(`${outLbl}: ${formatDate(opDetails.handoverConcorTharSanganaRailRoadDate, "dd-MM-yy")}`);
          if (opDetails.railOutReachedDate) handCol.push(`${reachedLbl}: ${formatDate(opDetails.railOutReachedDate, "dd-MM-yy")}`);
          if (opDetails.billingDocsSentDt) handCol.push(`Bill: ${formatDate(opDetails.billingDocsSentDt, "dd-MM-yy")}`);

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

    return `${copyForm.branch_code}/${sequence}/${copyForm.year}`;
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
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  style={{
                    ...s.btnPrimary,
                    padding: "8px 20px",
                    height: "auto",
                    backgroundColor: "#fff",
                    color: "#2563eb",
                    border: "1px solid #2563eb",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "13px",
                  }}
                  onClick={() => setOpenDSRDialog(true)}
                >
                  Download DSR Report
                </button>
                <button
                  style={{
                    ...s.btnPrimary,
                    padding: "8px 20px",
                    height: "auto",
                    backgroundColor: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "13px",
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
              style={{ ...s.select, width: "80px" }}
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
              style={{ ...s.select, width: "100px" }}
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
              style={{ ...s.select, width: "110px" }}
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
              style={{ ...s.select, width: "140px" }}
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
              style={{ ...s.select, width: "100px" }}
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
              style={{ ...s.select, width: "110px" }}
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
                      backgroundColor: "#fff",
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#d1d5db",
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
                {[
                  "Pending",
                  "SB Filed",
                  "L.E.O",
                  "Container HO",
                  "File Handover to IATA",
                  "Rail Out",
                  "Departure",
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
              style={{ ...s.select, width: "100px" }}
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
                style={{ ...s.input, width: "160px", minWidth: "130px", padding: "0 4px" }}
                placeholder="Search by Job No, Exporter, Consignee..."
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
                <col style={{ minWidth: "200px" }} />
                <col style={{ minWidth: "110px" }} />
                <col style={{ minWidth: "100px" }} />
                <col style={{ minWidth: "90px" }} />
                <col style={{ minWidth: "160px" }} />
                <col style={{ minWidth: "160px" }} />
                <col style={{ minWidth: "125px" }} />
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
                    Job No / Owner
                    {sortConfig.key === 'job_no' && (
                      <span style={{ marginLeft: "5px", fontSize: "10px" }}>
                        {sortConfig.direction === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                  <th style={{ ...s.th, width: "28%", minWidth: "200px" }}>Exporter</th>
                  <th style={{ ...s.th, width: "10%", minWidth: "95px" }}>Invoice</th>
                  <th style={{ ...s.th, width: "6%", minWidth: "65px" }}>SB / Date</th>
                  <th style={{ ...s.th, width: "12%", minWidth: "140px" }}>Port</th>
                  <th style={{ ...s.th, width: "10%", minWidth: "110px" }}>Container</th>
                  <th style={{ ...s.th, width: "10%", minWidth: "110px" }}>Handover</th>
                  <th style={{ ...s.th, width: "7%", minWidth: "75px" }}>Docs</th>
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
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={s.message}>
                      No jobs found.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job, idx) => {
                    const currentStatus = (Array.isArray(job.detailedStatus) && job.detailedStatus.length > 0
                      ? job.detailedStatus[job.detailedStatus.length - 1]
                      : (typeof job.detailedStatus === 'string' && job.detailedStatus) ? job.detailedStatus : job.status) || "";
                    const theme = getStatusTheme(currentStatus);

                    return (
                      <tr
                        key={job._id || idx}
                        style={{
                          backgroundColor: theme.bg,
                          borderLeft: `4px solid ${theme.border}`,
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
                            backgroundColor: job.operational_lock ? "#fffebccc" : "inherit",
                            position: "sticky",
                            cursor: "pointer", // Make the whole cell look clickable
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
                                color: "#1e40af",
                                fontSize: "12px",
                                letterSpacing: "0.2px",
                                whiteSpace: "nowrap"
                              }}
                            >
                              {job.job_no}
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
                                width: "fit-content"
                              }}
                            >
                              REF: {job.exporter_ref_no}
                            </div>
                          )}

                          <div
                            style={{
                              marginTop: "2px",
                              padding: "2px 6px",
                              width: "fit-content",
                              borderRadius: "3px",
                              fontSize: "10px",
                              fontWeight: "600",
                              color: "#030303ff",
                            }}
                          >
                            {job.custom_house || "-"}
                          </div>
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
                              fontWeight: "700",
                              color: "rgba(0,0,0,0.85)",
                              fontSize: "12px",
                              marginBottom: "4px",
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
                          <div style={{ fontSize: "10px", color: "#475569", display: "flex", flexDirection: "column", gap: "2px" }}>
                            {job.consignees?.[0]?.consignee_name && (
                              <div style={{ display: "flex", gap: "4px", alignItems: "baseline" }}>
                                <span style={{ fontWeight: "700", color: "#94a3b8", fontSize: "9px" }}>CONS:</span>
                                <span style={{ color: "#334155", fontWeight: "500" }}>
                                  {job.consignees[0].consignee_name.length > 35
                                    ? `${job.consignees[0].consignee_name.substring(0, 35)}...`
                                    : job.consignees[0].consignee_name}
                                </span>
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
                                  fontWeight: "600",
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
                        </td>

                        {/* Column 6: Port */}
                        <td style={s.td}>
                          <div style={{ marginBottom: "6px", display: "flex", flexDirection: "column", gap: "1px" }}>
                            <div style={{ display: "flex", gap: "6px", alignItems: "baseline" }}>
                              <span style={{ fontWeight: "800", fontSize: "9px", color: "#94a3b8", width: "35px" }}>DEST</span>
                              <span style={{ fontSize: "11px", color: "#1e293b", fontWeight: "700" }}>{job.destination_port || "-"}</span>
                            </div>
                            <div style={{ fontSize: "10px", color: "#64748b", fontStyle: "italic", paddingLeft: "41px" }}>
                              {job.destination_country || "-"}
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                            <div style={{ display: "flex", gap: "6px", alignItems: "baseline" }}>
                              <span style={{ fontWeight: "800", fontSize: "9px", color: "#94a3b8", width: "35px" }}>POL</span>
                              <span style={{ fontSize: "11px", color: "#1e293b", fontWeight: "700" }}>{job.port_of_loading || "-"}</span>
                            </div>
                            <div style={{ display: "flex", gap: "6px", alignItems: "baseline" }}>
                              <span style={{ fontWeight: "800", fontSize: "9px", color: "#94a3b8", width: "35px" }}>DISCH</span>
                              <span style={{ fontSize: "11px", color: "#1e293b", fontWeight: "700" }}>{job.port_of_discharge || "-"}</span>
                            </div>
                          </div>
                        </td>

                        {/* Column 7: Container Placement */}
                        <td style={s.td}>
                          <div style={{ marginBottom: "2px" }}>
                            {job.containers && job.containers.length > 0 ? (
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
                                {job.containers
                                  .filter((c) => c.containerNo)
                                  .map((container, index) => (
                                    <div
                                      key={index}
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
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4px", flexWrap: "wrap" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                          <a
                                            href={`https://www.ldb.co.in/ldb/containersearch/39/${container.containerNo}/1726651147706`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                              fontWeight: "800",
                                              textDecoration: "none",
                                              cursor: "pointer",
                                              fontSize: "11px",
                                              color: "#2563eb",
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

                                        {container.type && (
                                          <span style={{ fontSize: '9px', color: '#445566', fontWeight: "900", backgroundColor: "#e2e8f0", padding: "1px 4px", borderRadius: "3px" }}>
                                            {container.type.toUpperCase()}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <div style={{ fontWeight: "600", color: "#94a3b8" }}>-</div>
                            )}
                          </div>
                          <div style={{ color: "#475569", fontSize: "10px", marginTop: "6px", backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "4px" }}>
                            <div style={{ fontWeight: "800", color: "#1e293b", marginBottom: "2px" }}>
                              {job.total_no_of_pkgs} {job.package_unit}
                            </div>
                            <div style={{ fontSize: "9px" }}>
                              <span style={{ fontWeight: "700" }}>G:</span> {job.gross_weight_kg} kg | <span style={{ fontWeight: "700" }}>N:</span> {job.net_weight_kg} kg
                            </div>
                          </div>
                        </td>

                        {/* Column 8: Handover DATE */}
                        <td style={s.td}>
                          {(() => {
                            const opDetails = job.operations?.[0]?.statusDetails?.[0] || {};
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
                                <div style={{ fontSize: "10px", display: "flex", justifyContent: "space-between" }}>
                                  <span style={{ color: "#64748b", fontWeight: "700", fontSize: "9px" }}>{outLbl.toUpperCase()}</span>
                                  <span style={{ fontWeight: "600", color: "#1e293b" }}>{formatDate(opDetails.handoverConcorTharSanganaRailRoadDate, "dd-MM-yy")}</span>
                                </div>
                                <div style={{ fontSize: "10px", display: "flex", justifyContent: "space-between" }}>
                                  <span style={{ color: "#64748b", fontWeight: "700", fontSize: "9px" }}>{reachedLbl.toUpperCase()}</span>
                                  <span style={{ fontWeight: "600", color: "#1e293b" }}>{formatDate(opDetails.railOutReachedDate, "dd-MM-yy")}</span>
                                </div>
                                <div style={{ fontSize: "10px", display: "flex", justifyContent: "space-between" }}>
                                  <span style={{ color: "#64748b", fontWeight: "700", fontSize: "9px" }}>BILL</span>
                                  <span style={{ fontWeight: "600", color: "#1e293b" }}>{formatDate(opDetails.billingDocsSentDt, "dd-MM-yy")}</span>
                                </div>

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
                                          const resp = await axios.get(
                                            `${import.meta.env.VITE_API_STRING}/queries`,
                                            { params: { job_no: job.job_no } }
                                          );
                                          const queriesFetched = resp.data?.data?.queries || resp.data?.data || [];
                                          setQueryChatData(queriesFetched);

                                          if (queriesFetched.length > 0) {
                                            axios.put(`${import.meta.env.VITE_API_STRING}/queries/mark-seen`, {
                                              queryIds: queriesFetched.map(q => q._id)
                                            }).catch(console.error);

                                            setJobQueriesStatus(prev => ({
                                              ...prev,
                                              [job.job_no]: { ...prev[job.job_no], hasUnseen: false }
                                            }));
                                          }
                                        } catch (err) {
                                          console.error(err);
                                          setQueryChatData([]);
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
                                formatDate(job.operations?.[0]?.statusDetails?.[0]?.billingDocsSentDt) || job.status
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
              Showing {jobs.length} of {totalRecords} Records
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
        onClose={() => setOpenDSRDialog(false)}
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
              onClick={() => setOpenDSRDialog(false)}
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
        onClose={() => { setQueryChatOpen(false); setQueryChatJob(null); setQueryChatData([]); setQueryChatReply(""); }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "10px", overflow: "hidden" } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb", py: 1.2, px: 2, background: "#f59e0b", color: "#fff" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Queries &amp; Replies</div>
            {queryChatJob?.job_no && <div style={{ fontSize: 11, opacity: 0.85 }}>Job: {queryChatJob.job_no}</div>}
          </div>
          <IconButton onClick={() => { setQueryChatOpen(false); setQueryChatJob(null); setQueryChatData([]); setQueryChatReply(""); }} size="small" sx={{ color: "#fff" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: "flex", flexDirection: "column", height: 420 }}>
          {queryChatLoading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1, color: "#9ca3af" }}>Loading...</div>
          ) : queryChatData.length === 0 ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1, color: "#9ca3af", fontStyle: "italic", fontSize: 13 }}>No queries raised for this job yet.</div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              {queryChatData.map((q, qi) => (
                <div key={q._id || qi} style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                  {/* Query header */}
                  <div style={{ background: q.status === "resolved" ? "#dcfce7" : q.status === "rejected" ? "#fee2e2" : "#fef3c7", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 12, color: "#111" }}>{q.raisedByName || q.raisedBy}</span>
                      <span style={{ fontSize: 10, color: "#6b7280", marginLeft: 6 }}>{q.raisedFromModule} → {q.targetModule}</span>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: q.status === "resolved" ? "#22c55e" : q.status === "rejected" ? "#ef4444" : "#f59e0b", color: "#fff", textTransform: "uppercase" }}>{q.status}</span>
                  </div>
                  {/* Query message */}
                  <div style={{ padding: "8px 12px", fontSize: 12, color: "#374151", background: "#fff", borderBottom: q.replies?.length ? "1px solid #f3f4f6" : "none" }}>
                    <div style={{ fontWeight: 600, fontSize: 11, color: "#6b7280", marginBottom: 2 }}>{q.subject}</div>
                    {q.message}
                    <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>{new Date(q.createdAt).toLocaleString()}</div>
                  </div>
                  {/* Replies */}
                  {q.replies && q.replies.map((r, ri) => (
                    <div key={r._id || ri} style={{ padding: "6px 12px 6px 24px", fontSize: 12, borderBottom: "1px solid #f9fafb", background: ri % 2 === 0 ? "#f9fafb" : "#fff" }}>
                      <span style={{ fontWeight: 600, color: "#2563eb" }}>{r.repliedByName || r.repliedBy}: </span>
                      <span style={{ color: "#374151" }}>{r.message}</span>
                      <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{new Date(r.repliedAt).toLocaleString()}</div>
                    </div>
                  ))}
                  {/* Quick reply box for open queries */}
                  {q.status === "open" && (
                    <div style={{ display: "flex", gap: 6, padding: "6px 12px", background: "#fafafa", borderTop: "1px solid #e5e7eb" }}>
                      <input
                        type="text"
                        placeholder="Type a reply..."
                        value={queryChatReply}
                        onChange={(e) => setQueryChatReply(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter" && queryChatReply.trim()) {
                            setQueryChatSending(true);
                            try {
                              await axios.post(`${import.meta.env.VITE_API_STRING}/queries/${q._id}/reply`, {
                                message: queryChatReply.trim(),
                                repliedBy: user?.username || "unknown",
                                repliedByName: user?.fullName || user?.username || "Unknown",
                                fromModule: currentModuleForQueries,
                              });
                              // Refresh
                              const resp = await axios.get(`${import.meta.env.VITE_API_STRING}/queries`, { params: { job_no: queryChatJob.job_no } });
                              setQueryChatData(resp.data?.data?.queries || resp.data?.data || []);
                              setQueryChatReply("");
                            } catch (err) { console.error(err); }
                            finally { setQueryChatSending(false); }
                          }
                        }}
                        style={{ flex: 1, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, outline: "none" }}
                      />
                      <button
                        onClick={async () => {
                          if (!queryChatReply.trim()) return;
                          setQueryChatSending(true);
                          try {
                            await axios.post(`${import.meta.env.VITE_API_STRING}/queries/${q._id}/reply`, {
                              message: queryChatReply.trim(),
                              repliedBy: user?.username || "unknown",
                              repliedByName: user?.fullName || user?.username || "Unknown",
                              fromModule: currentModuleForQueries,
                            });
                            const resp = await axios.get(`${import.meta.env.VITE_API_STRING}/queries`, { params: { job_no: queryChatJob.job_no } });
                            setQueryChatData(resp.data?.data?.queries || resp.data?.data || []);
                            setQueryChatReply("");
                          } catch (err) { console.error(err); }
                          finally { setQueryChatSending(false); }
                        }}
                        disabled={queryChatSending}
                        style={{ padding: "6px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                      >
                        {queryChatSending ? "..." : "Send"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
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
              <MenuItem onClick={handleGenDocsClose} style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>CHECKLIST</MenuItem>
            </ExportChecklistGenerator>

            <FileCoverGenerator jobNo={selectedGenDocJob?.job_no}>
              <MenuItem onClick={handleGenDocsClose} style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>FILE COVER</MenuItem>
            </FileCoverGenerator>

            {(selectedGenDocJob?.custom_house?.toUpperCase().includes("SACHANA")) && (
              <ConsignmentNoteGenerator jobNo={selectedGenDocJob?.job_no}>
                <MenuItem onClick={handleGenDocsClose} style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>FORWARDING NOTE (SACHANA)</MenuItem>
              </ConsignmentNoteGenerator>
            )}

            {(selectedGenDocJob?.custom_house?.toUpperCase().includes("THAR")) && (
              <ForwardingNoteTharGenerator jobNo={selectedGenDocJob?.job_no}>
                <MenuItem onClick={handleGenDocsClose} style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>FORWARDING NOTE (THAR)</MenuItem>
              </ForwardingNoteTharGenerator>
            )}

            {(selectedGenDocJob?.custom_house?.toUpperCase().includes("SABARMATI") || selectedGenDocJob?.custom_house?.toUpperCase().includes("CONCOR")) && (
              <ConcorForwardingNoteGenerator jobNo={selectedGenDocJob?.job_no}>
                <MenuItem onClick={handleGenDocsClose} style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>FORWARDING NOTE (CONCOR)</MenuItem>
              </ConcorForwardingNoteGenerator>
            )}

            {(!selectedGenDocJob?.custom_house?.toUpperCase().includes("ACC") &&
              !selectedGenDocJob?.custom_house?.toUpperCase().includes("AIRPORT") &&
              !selectedGenDocJob?.custom_house?.toUpperCase().includes("AIR CARGO") &&
              selectedGenDocJob?.transportMode !== "AIR") && (
                <>
                  <AnnexureCGenerator jobNo={selectedGenDocJob?.job_no}>
                    <MenuItem onClick={handleGenDocsClose} style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>ANNEXURE C</MenuItem>
                  </AnnexureCGenerator>
                  <VGMAuthorizationGenerator jobNo={selectedGenDocJob?.job_no}>
                    <MenuItem onClick={handleGenDocsClose} style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>VGM AUTHORIZATION</MenuItem>
                  </VGMAuthorizationGenerator>
                  <FreightCertificateGenerator jobNo={selectedGenDocJob?.job_no}>
                    <MenuItem onClick={handleGenDocsClose} style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>FREIGHT CERTIFICATE</MenuItem>
                  </FreightCertificateGenerator>
                  <BillOfLadingGenerator jobNo={selectedGenDocJob?.job_no}>
                    <MenuItem onClick={handleGenDocsClose} style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>BILL OF LADING</MenuItem>
                  </BillOfLadingGenerator>
                </>
              )}

            <MenuItem
              onClick={() => {
                if (!selectedGenDocJob) return;
                const downloadUrl = `${import.meta.env.VITE_API_STRING}/generate-sb-file/${selectedGenDocJob._id}`;
                window.open(downloadUrl, "_blank");
                handleGenDocsClose();
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
    </>
  );
};

export default ExportJobsTable;
