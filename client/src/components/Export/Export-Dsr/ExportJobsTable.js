import React, { useState, useEffect, useRef, useContext } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LockIcon from "@mui/icons-material/Lock"; // Import LockIcon
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
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

// --- Clean Enterprise Styles ---
const s = {
  wrapper: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
    backgroundColor: "#ffffff",
    padding: "10px 15px", // Responsive padding
    minHeight: "100vh",
    color: "#333",
    fontSize: "12px",
  },

  container: {
    width: "100%",
    margin: "0 auto",
  },
  headerRow: {
    marginBottom: "10px",
    paddingBottom: "0",
  },
  pageTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#111",
    margin: "0",
  },

  // Tabs
  tabContainer: {
    display: "flex",
    borderBottom: "1px solid #e5e7eb",
    marginBottom: "15px",
  },
  tab: {
    padding: "8px 20px",
    cursor: "pointer",
    fontSize: "13px",
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
    gap: "10px",
    alignItems: "center",
    marginBottom: "10px",
    flexWrap: "wrap",
  },
  input: {
    height: "30px",
    padding: "0 8px",
    fontSize: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "3px",
    outline: "none",
    color: "#333",
    minWidth: "200px",
  },
  select: {
    height: "30px",
    padding: "0 24px 0 8px",
    fontSize: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "3px",
    backgroundColor: "#fff",
    color: "#333",
    cursor: "pointer",
    minWidth: "150px",
  },

  // Table
  tableContainer: {
    overflowX: "auto",
    border: "1px solid #ccccccff",
    borderRadius: "3px",
    maxHeight: "600px",
    overflowY: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "11px",
    tableLayout: "auto", // Allow stretching
  },
  th: {
    padding: "8px 6px", // Reduced padding
    textAlign: "left",
    fontWeight: "700",
    fontSize: "13px", // Slightly smaller
    color: "#ffffff",
    borderBottom: "1px solid #dbdbdbff",
    borderRight: "1px solid #dbdbdbff",
    whiteSpace: "normal", // Allow wrapping
    wordBreak: "break-word", // Break long words
    verticalAlign: "top", // Align to top for better readability
    // position: "sticky",
    top: 0,
    zIndex: 10,
  },
  td: {
    padding: "6px 6px", // Reduced padding
    borderBottom: "1px solid #dbdbdbff",
    color: "#1f2937",
    whiteSpace: "normal", // Allow wrapping
    wordBreak: "break-word", // Break long words
    verticalAlign: "top",
    alignItems: "center",
    justifyContent: "center",
  },
  rowHover: {
    cursor: "pointer",
    transition: "background 0.1s",
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

const getStatusColor = (statusValue) => {
  switch (statusValue) {
    // Export Status Mappings
    case "SB Filed":
      return "#e6f3ff"; // Light Blue (Match Custom Clearance?)

    case "L.E.O":
      return "#e8f5e9"; // Light Green (Completed/Approved)
    case "Container HO to Concor":
    case "File Handover to IATA":
      return "#ffffe0"; // Light Yellow
    case "Rail Out":
    case "Departure":
      return "#fbdbffff"; // Honeydew
    case "Billing Pending":
      return "#ffe4e1";
    case "Billing Done":
      return "#ffe4e1"; // Misty rose background
    case "Completed":
      return "#c3ffc8ff"; // Light green

    default:
      return "transparent";
  }
};

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

      const newOperations = JSON.parse(JSON.stringify(job.operations || []));

      if (!newOperations[0]) newOperations[0] = {};

      if (uploadType === "section") {
        if (!Array.isArray(newOperations[0][field])) newOperations[0][field] = [];

        while (newOperations[0][field].length <= idx) {
          newOperations[0][field].push({});
        }

        const currentFiles = Array.isArray(newOperations[0][field][idx].images)
          ? newOperations[0][field][idx].images
          : [];
        newOperations[0][field][idx].images = [...currentFiles, url];
      } else {
        if (!newOperations[0].statusDetails) newOperations[0].statusDetails = [{}];
        if (!newOperations[0].statusDetails[0]) newOperations[0].statusDetails[0] = {};

        const currentFiles = Array.isArray(newOperations[0].statusDetails[0][field])
          ? newOperations[0].statusDetails[0][field]
          : [];
        newOperations[0].statusDetails[0][field] = [...currentFiles, url];
      }

      const payload = { ...job, operations: newOperations };

      await axios.put(
        `${import.meta.env.VITE_API_STRING}/${encodeURIComponent(job.job_no)}`,
        payload
      );

      if (onSuccess) onSuccess(url);
    } catch (err) {
      console.error("Quick upload err:", err);
      // alert("Failed to upload document.");
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

  // State
  const [activeTab, setActiveTab] = useState(savedFilters.activeTab || "Pending");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [page, setPage] = useState(savedFilters.page || 1);
  const [totalRecords, setTotalRecords] = useState(0);
  const LIMIT = 100;

  // Sorting State
  const [sortConfig, setSortConfig] = useState(savedFilters.sortConfig || { key: null, direction: 'asc' });

  // Filters
  const [searchQuery, setSearchQuery] = useState(savedFilters.searchQuery || "");
  const [selectedYear, setSelectedYear] = useState(savedFilters.selectedYear || "");
  const [selectedMovementType, setSelectedMovementType] = useState(savedFilters.selectedType || "");

  // Determine initial branch
  const initialBranch = (() => {
    if (savedFilters.selectedBranch) {
      if (isAdmin || allowedBranches.includes(savedFilters.selectedBranch)) return savedFilters.selectedBranch;
    }
    return allowedBranches.length > 0 ? allowedBranches[0] : "AMD";
  })();

  const [selectedBranch, setSelectedBranch] = useState(initialBranch);
  const [selectedExporterFilter, setSelectedExporterFilter] = useState(savedFilters.selectedExporterFilter || "");
  const [selectedDetailedStatus, setSelectedDetailedStatus] = useState(savedFilters.selectedDetailedStatus || "");
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
    selectedExporterFilter,
    selectedDetailedStatus,
    selectedCustomHouse,
    selectedJobOwner,
    selectedGoodsStuffedAt,
    page,
    sortConfig,
  ]);

  const handleClearFilters = () => {
    setActiveTab("Pending");
    setSearchQuery("");
    setSelectedYear("");
    setSelectedMovementType("");
    setSelectedBranch("AMD");
    setSelectedExporterFilter("");
    setSelectedDetailedStatus("");
    setSelectedCustomHouse("");
    setSelectedJobOwner("");
    setSelectedGoodsStuffedAt("");
    setPage(1);
    setSortConfig({ key: null, direction: 'asc' });
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
  const [selectedExporter, setSelectedExporter] = useState("");
  const [dsrLoading, setDSRLoading] = useState(false);

  // Documents Menu State
  const [docsAnchorEl, setDocsAnchorEl] = useState(null);
  const [selectedDocJob, setSelectedDocJob] = useState(null);

  // SB Track Dialog State
  const [sbTrackOpen, setSbTrackOpen] = useState(false);
  const [sbTrackJob, setSbTrackJob] = useState(null);

  // Container Track Dialog State
  const [containerTrackOpen, setContainerTrackOpen] = useState(false);
  const [containerTrackContainers, setContainerTrackContainers] = useState([]);

  // Fetch Exporters for DSR
  useEffect(() => {
    const fetchExporters = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_STRING}/exporter-list`,
        );
        if (response.data.success) {
          setExporters(response.data.data || []);
        }
      } catch (err) {
        console.error("Error fetching exporters:", err);
      }
    };

    fetchExporters();
  }, []);

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
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/export-dsr/generate-dsr-report`,
        {
          params: { exporter: selectedExporter },
          responseType: "blob",
        },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `DSR_Report_${selectedExporter}_${format(new Date(), "yyyyMMdd")}.xlsx`,
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
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/exports`,
        {
          params: {
            exporter: selectedExporter,
            limit: 5000,
          },
        }
      );
      if (response.data.success) {
        const jobsToExport = response.data.data.jobs || [];
        if (jobsToExport.length === 0) {
          alert("No jobs found for this exporter.");
          return;
        }

        const exportData = jobsToExport.map((job) => {
          const rowData = {};

          // Column 1: Job No
          let jobNoCol = [];
          if (job.job_no) jobNoCol.push(job.job_no);
          if (job.custom_house) jobNoCol.push(job.custom_house);
          if (job.movement_type) jobNoCol.push(job.movement_type);
          rowData["Job No"] = jobNoCol.join(" | ");

          // Column 2: Consignee Name
          let consigneeCol = [];
          if (job.consignees?.[0]?.consignee_name) consigneeCol.push(job.consignees[0].consignee_name);
          else if (job.invoices?.[0]?.consigneeName) consigneeCol.push(job.invoices[0].consigneeName);
          rowData["Consignee Name"] = consigneeCol.join(" | ") || "";

          // Column 3: Invoice
          let invCol = [];
          if (job.invoices && job.invoices.length > 0) {
            job.invoices.forEach(inv => {
              let invStr = [];
              if (inv.invoice_no) invStr.push(inv.invoice_no);
              if (inv.invoice_date) invStr.push(formatDate(inv.invoice_date, "dd-MM-yy"));
              if (inv.invValue && inv.currency) invStr.push(`${inv.currency} ${inv.invValue}`);
              if (invStr.length > 0) invCol.push(invStr.join(", "));
            });
          }
          rowData["Invoice"] = invCol.join(" | ");

          // Column 4: SB / Date
          let sbCol = [];
          if (job.sb_no) sbCol.push(job.sb_no);
          if (job.sb_date) sbCol.push(job.sb_date);
          rowData["SB / Date"] = sbCol.join(" | ");

          // Column 5: Port
          let portCol = [];
          if (job.destination_port) portCol.push(`Dest: ${job.destination_port}`);
          if (job.discharge_port) portCol.push(`Discharge: ${job.discharge_port}`);
          rowData["Port"] = portCol.join(" | ");

          // Column 6: Container
          let contCol = [];
          if (job.total_no_of_pkgs) contCol.push(`Pkgs: ${job.total_no_of_pkgs} ${job.package_unit || ""}`);
          if (job.gross_weight_kg) contCol.push(`G: ${job.gross_weight_kg} kg`);
          if (job.net_weight_kg) contCol.push(`N: ${job.net_weight_kg} kg`);

          if (job.containers && job.containers.length > 0) {
            job.containers.forEach(c => {
              let cStr = [];
              if (c.containerNo) cStr.push(`Cont: ${c.containerNo}`);
              if (c.size) cStr.push(`Size: ${c.size}`);
              if (cStr.length > 0) contCol.push(cStr.join(", "));
            });
          }
          const placeDate = job.operations?.[0]?.statusDetails?.[0]?.containerPlacementDate;
          if (placeDate) contCol.push(`Place: ${formatDate(placeDate, "dd-MM-yy")}`);
          rowData["Container"] = contCol.join(" | ");

          // Column 7: Handover
          let handCol = [];
          const opDetails = job.operations?.[0]?.statusDetails?.[0] || {};
          if (opDetails.handoverForwardingNoteDate) handCol.push(`DHo: ${formatDate(opDetails.handoverForwardingNoteDate, "dd-MM-yy")}`);
          if (opDetails.railOutReachedDate) handCol.push(`Rail: ${formatDate(opDetails.railOutReachedDate, "dd-MM-yy")}`);
          if (opDetails.leoDate) handCol.push(`Leo: ${formatDate(opDetails.leoDate, "dd-MM-yy")}`);
          rowData["Handover"] = handCol.join(" | ");

          // Column 8: Status
          let statusCol = [];
          if (job.statusDetails && job.statusDetails[0]?.status) statusCol.push(job.statusDetails[0].status);
          else if (job.status) statusCol.push(job.status);
          rowData["Status"] = statusCol.join(" | ");

          // Remove entirely empty columns dynamically as per user rule:
          // "IF DHo HAS NO VALUE OR "" THEN DONT SHOW THAT FIELD AT ALL SAME LOGIC FOR ALL FIELDS"
          // We already omit empty fields inside the columns using `if()`, but if the column itself is empty we delete it
          Object.keys(rowData).forEach(key => {
            if (!rowData[key] || rowData[key].trim() === "") {
              delete rowData[key];
            }
          });

          return rowData;
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        var wscols = [
          { wch: 25 }, { wch: 30 }, { wch: 30 },
          { wch: 20 }, { wch: 25 }, { wch: 40 },
          { wch: 25 }, { wch: 15 }
        ];
        worksheet['!cols'] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "DSR Report");

        const dateStr = format(new Date(), "yyyyMMdd");
        XLSX.writeFile(workbook, `Table_DSR_${selectedExporter}_${dateStr}.xlsx`);
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
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/exports`,
        {
          params: {
            status: activeTab,
            search: searchQuery,
            year: selectedYear === "all" ? "" : selectedYear,
            consignmentType: selectedMovementType,
            branch: selectedBranch,
            exporter: selectedExporterFilter,
            detailedStatus: selectedDetailedStatus,
            customHouse: selectedCustomHouse,
            jobOwner: selectedJobOwner, // Added job owner filter
            goods_stuffed_at: selectedGoodsStuffedAt,
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
    selectedGoodsStuffedAt,
    page,
    sortConfig,
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
      navigate(`job/${encodeURIComponent(job.job_no)}`, {
        state: { fromJobList: true },
      });
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
      setCopyError("Financial Year must be in format YY-YY (e.g., 25-26)");
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
    if (job.eSanchitDocuments && Array.isArray(job.eSanchitDocuments)) {
      job.eSanchitDocuments.forEach((doc, idx) => {
        if (doc.fileUrl) {
          let title =
            `eSanchit ${idx + 1}`;

          if (title === "380") title = "Commercial Invoice";

          links.push({ title, url: doc.fileUrl, field: null });
        }
      });
    }

    // 2. Operations Documents
    const ops = job.operations && job.operations[0];
    const status = ops ? (ops.statusDetails && ops.statusDetails[0]) || {} : {};

    const statusFiles = [
      { field: "leoUpload", title: "LEO" },
      { field: "stuffingSheetUpload", title: "Stuffing Sheet" },
      { field: "stuffingPhotoUpload", title: "Stuffing Photo" },
      { field: "eGatePassUpload", title: "Gate Pass" },
      { field: "handoverImageUpload", title: "HO/DOC Copy" },
      { field: "billingDocsSentUpload", title: "Bill Doc Copy" },
    ];

    statusFiles.forEach((f) => {
      const urls = Array.isArray(status[f.field]) ? status[f.field] : [];
      if (urls.length > 0) {
        urls.forEach((url) => {
          if (url) links.push({ title: f.title, url, field: f.field });
        });
      } else {
        links.push({ title: f.title, url: null, field: f.field });
      }
    });

    if (ops) {
      // Other Sections
      const sections = [
        { field: "transporterDetails", title: "Transporter" },
        { field: "bookingDetails", title: "Booking" },
        { field: "weighmentDetails", title: "Weighment" },
      ];

      sections.forEach((s) => {
        if (ops[s.field] && Array.isArray(ops[s.field]) && ops[s.field].length > 0) {
          ops[s.field].forEach((item, index) => {
            const urls = Array.isArray(item.images) ? item.images : [];
            const displayTitle = ops[s.field].length > 1 ? `${s.title} ${index + 1}` : s.title;

            if (urls.length > 0) {
              urls.forEach((url) => {
                if (url) links.push({ title: displayTitle, url, field: s.field, uploadType: "section", idx: index });
              });
            } else {
              links.push({ title: displayTitle, url: null, field: s.field, uploadType: "section", idx: index });
            }
          });
        } else {
          links.push({ title: s.title, url: null, field: s.field, uploadType: "section", idx: 0 });
        }
      });

      // Container Details (Special mention "container img")
      if (ops.containerDetails && Array.isArray(ops.containerDetails)) {
        ops.containerDetails.forEach((cd, idx) => {
          if (Array.isArray(cd.images)) {
            cd.images.forEach((url, i) => {
              if (url) links.push({ title: "container img", url, field: null });
            });
          }
        });
      }
    }

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
      <div style={s.wrapper}>
        <div style={s.container}>
          {/* Title and Count */}
          <div
            style={{
              ...s.headerRow,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={s.pageTitle}>Export Jobs:</h1>
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
                  onClick={() => setOpenAddDialog(true)}
                >
                  + Create Job
                </button>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div style={s.tabContainer}>
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
          </div>

          {/* Filters */}
          <div style={s.toolbar}>
            {/* Year Filter */}
            <select
              style={s.select}
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="">All Years</option>
              <option value="24-25">24-25</option>
              <option value="25-26">25-26</option>
              <option value="26-27">26-27</option>
            </select>

            {/* Movement Type Filter */}
            <select
              style={s.select}
              value={selectedMovementType}
              onChange={(e) => setSelectedMovementType(e.target.value)}
            >
              <option value="">All Movement</option>
              <option value="FCL">FCL</option>
              <option value="LCL">LCL</option>
              <option value="AIR">AIR</option>
            </select>

            {/* Branch Filter */}
            <select
              style={s.select}
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              {filteredBranchOptions.map((branch) => (
                <option key={branch.code} value={branch.code}>
                  {branch.label}
                </option>
              ))}
            </select>

            {/* Job Owner Filter */}
            <select
              style={{ ...s.select, minWidth: "120px" }}
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
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="All Exporters"
                  variant="outlined"
                  sx={{
                    width: 200,
                    "& .MuiInputBase-root": {
                      height: "30px",
                      padding: "0 8px 0 8px !important",
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

            {/* Detailed Status Filter - MUI Select */}
            <FormControl size="small" style={{ minWidth: 180 }}>
              <Select
                value={selectedDetailedStatus}
                onChange={(e) => setSelectedDetailedStatus(e.target.value)}
                displayEmpty
                inputProps={{ "aria-label": "Without label" }}
                sx={{
                  height: 30,
                  fontSize: "12px",
                  "& .MuiSelect-select": {
                    padding: "4px 8px",
                    display: "flex",
                    alignItems: "center",
                  },
                }}
              >
                <MenuItem value="" sx={{ fontSize: "12px" }}>
                  <em>All Detailed Status</em>
                </MenuItem>
                {[
                  "SB Filed",
                  "L.E.O",
                  "Container HO to Concor",
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
                      gap: 1,
                      fontSize: "0.75rem",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: "15px",
                        height: "15px",
                        borderRadius: "50%",
                        backgroundColor: getStatusColor(status),
                        border: "1px solid #666",
                        marginRight: "6px",
                        flexShrink: 0,
                      }}
                    />
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {/* Custom House Filter */}
            <select
              style={s.select}
              value={selectedCustomHouse}
              onChange={(e) => setSelectedCustomHouse(e.target.value)}
            >
              <option value="">All Custom Houses</option>
              {getOptionsForBranch(selectedBranch).map((group) => {
                const filteredItems = group.items.filter(item =>
                  isAdmin || !user?.selected_ports?.length || user.selected_ports.includes(item.value)
                );
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

            {/* Goods Stuffed At Filter */}
            <select
              style={s.select}
              value={selectedGoodsStuffedAt}
              onChange={(e) => setSelectedGoodsStuffedAt(e.target.value)}
            >
              <option value="">All Stuffed At</option>
              <option value="FACTORY">FACTORY</option>
              <option value="DOCK">DOCK</option>
            </select>

            {/* Search Input */}
            <div
              style={{
                display: "flex",
                flex: 1,
                minWidth: "250px", // Ensure it doesn't get too small
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <input
                style={{ ...s.input, minWidth: "200px" }}
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
                    height: "30px",
                    width: "30px",
                    borderRadius: "4px",
                  }}
                >
                  <FilterAltOffIcon sx={{ fontSize: 18, color: "#4b5563" }} />
                </IconButton>
              </Tooltip>
            </div>

          </div>

          {/* Table */}
          <div style={s.tableContainer}>
            <table style={s.table}>
              <colgroup>
                <col style={{ minWidth: "120px" }} />
                <col style={{ minWidth: "80px" }} />
                <col style={{ minWidth: "100px" }} />
                <col style={{ minWidth: "100px" }} />
                <col style={{ minWidth: "90px" }} />
                <col style={{ minWidth: "160px" }} />
                <col style={{ minWidth: "120px" }} />
                <col style={{ minWidth: "85px" }} />
                <col style={{ minWidth: "180px" }} />
                <col style={{ minWidth: "80px" }} />
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
                    style={{ ...s.th, cursor: "pointer", userSelect: "none" }}
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
                  <th style={s.th}>Exporter</th>
                  <th style={s.th}>KYC / Codes</th>
                  <th style={s.th}>Invoice</th>
                  <th style={s.th}>SB / Date</th>
                  <th style={s.th}>Port</th>
                  <th style={s.th}>Container</th>
                  <th style={s.th}>Handover</th>
                  <th style={s.th}>Docs</th>
                  <th style={s.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="10" style={s.message}>
                      Loading jobs...
                    </td>
                  </tr>
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={s.message}>
                      No jobs found.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job, idx) => {
                    const rowBg =
                      getStatusColor(
                        (Array.isArray(job.detailedStatus) && job.detailedStatus.length > 0
                          ? job.detailedStatus[job.detailedStatus.length - 1]
                          : (typeof job.detailedStatus === 'string' && job.detailedStatus) ? job.detailedStatus : job.status) || "",
                      ) || "#ffffff";
                    return (
                      <tr
                        key={job._id || idx}
                        style={{
                          ...s.rowHover,
                          backgroundColor: rowBg,
                          cursor: "default", // Row is no longer clickable as a whole
                        }}
                      // onMouseEnter={(e) =>
                      //   (e.currentTarget.style.backgroundColor = "#eef2ff")
                      // } // Hover highlight
                      // onMouseLeave={(e) =>
                      //   (e.currentTarget.style.backgroundColor = rowBg)
                      // }
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
                        {/* Column 2: Job No */}
                        <td
                          style={{
                            ...s.td,
                            left: 0,
                            backgroundColor: "inherit",

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
                            }}
                          >
                            <div
                              style={{
                                textDecoration: "underline",
                                marginBottom: "2px",
                                fontWeight: "600",
                                color: "#2563eb",
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
                              marginBottom: "4px"
                            }}
                          >
                            {formatDate(job.job_date)}
                          </div>

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
                          {/* ... existing exporter content ... */}
                          <div
                            style={{
                              fontWeight: "600",
                              color: "#111",
                              marginBottom: "2px",
                              maxWidth: "150px", // Prevent stretching
                              wordBreak: "break-word"
                            }}
                          >
                            {job.exporter}
                          </div>
                          {job.consignees?.[0]?.consignee_name
                            ? job.consignees[0].consignee_name.length > 20
                              ? `${job.consignees[0].consignee_name.substring(0, 20)}...`
                              : job.consignees[0].consignee_name
                            : "-"}
                          <div
                            style={{
                              color: "#6b7280",
                              fontSize: "11px",
                              fontStyle: "italic",
                            }}
                          >
                            {job.buyerThirdPartyInfo?.buyer?.name || "-"}
                          </div>

                          {/* Booking No section */}
                          {(() => {
                            const bookings = [];
                            if (Array.isArray(job.operations)) {
                              job.operations.forEach((op) => {
                                if (Array.isArray(op.bookingDetails)) {
                                  op.bookingDetails.forEach((b) => {
                                    if (b.bookingNo && !bookings.includes(b.bookingNo)) {
                                      bookings.push(b.bookingNo);
                                    }
                                  });
                                }
                              });
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

                        {/* NEW Column: KYC / Codes */}
                        <td style={s.td}>
                          <div
                            style={{
                              fontSize: "10px",
                              color: "#000000ff",
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                            }}
                          >
                            {/* IE Code */}
                            {job.ieCode && (
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <div>
                                  <span style={{ fontWeight: "700" }}>
                                    IEC:
                                  </span>{" "}
                                  {job.ieCode}
                                </div>
                                <IconButton
                                  size="small"
                                  onClick={(e) =>
                                    handleCopyText(job.ieCode, e)
                                  }
                                  style={{ padding: 0, marginLeft: 4 }}
                                  title="Copy IEC"
                                >
                                  <ContentCopyIcon style={{ fontSize: 10 }} />
                                </IconButton>
                              </div>
                            )}

                            {/* PAN */}
                            {job.panNo && (
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <div>
                                  <span style={{ fontWeight: "700" }}>
                                    PAN:
                                  </span>{" "}
                                  {job.panNo}
                                </div>
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleCopyText(job.panNo, e)}
                                  style={{ padding: 0, marginLeft: 4 }}
                                  title="Copy PAN"
                                >
                                  <ContentCopyIcon style={{ fontSize: 10 }} />
                                </IconButton>
                              </div>
                            )}

                            {/* GST */}
                            {job.exporter_gstin && (
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <div>
                                  <span style={{ fontWeight: "700" }}>
                                    GST:
                                  </span>{" "}
                                  {job.exporter_gstin}
                                </div>
                                <IconButton
                                  size="small"
                                  onClick={(e) =>
                                    handleCopyText(job.exporter_gstin, e)
                                  }
                                  style={{ padding: 0, marginLeft: 4 }}
                                  title="Copy GST"
                                >
                                  <ContentCopyIcon style={{ fontSize: 10 }} />
                                </IconButton>
                              </div>
                            )}

                            {/* AD Code */}
                            {job.adCode && (
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <div>
                                  <span style={{ fontWeight: "700" }}>AD:</span>{" "}
                                  {job.adCode}
                                </div>
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleCopyText(job.adCode, e)}
                                  style={{ padding: 0, marginLeft: 4 }}
                                  title="Copy AD Code"
                                >
                                  <ContentCopyIcon style={{ fontSize: 10 }} />
                                </IconButton>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Column 4: Invoice */}
                        <td style={s.td}>
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
                              color: "#111",
                              fontSize: "11px",
                              fontWeight: "600",
                            }}
                          >
                            {job.invoices?.[0]?.termsOfInvoice}{" "}
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
                          <div style={{ marginBottom: "6px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px", alignItems: "baseline" }}>
                              <span style={{ fontWeight: "700", fontSize: "11px", color: "#111" }}>Dest:</span>
                              <span style={{ fontSize: "11px", color: "#374151", fontWeight: "600" }}>{job.destination_port || "-"}</span>
                            </div>
                            <div style={{ fontSize: "10px", color: "#6b7280", fontStyle: "italic", paddingLeft: "35px" }}>
                              {job.destination_country || "-"}
                            </div>
                          </div>
                          <div>
                            <div style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px", alignItems: "baseline" }}>
                              <span style={{ fontWeight: "700", fontSize: "11px", color: "#111" }}>Discharge:</span>
                              <span style={{ fontSize: "11px", color: "#374151", fontWeight: "600" }}>{job.port_of_discharge || "-"}</span>

                            </div>
                            <div style={{ fontSize: "10px", color: "#6b7280", fontStyle: "italic", paddingLeft: "60px" }}>
                              {job.discharge_country || "-"}

                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px", alignItems: "baseline" }}>
                              <span style={{ fontWeight: "700", fontSize: "11px", color: "#111" }}>POL:</span>
                              <span style={{ fontSize: "11px", color: "#374151", fontWeight: "600" }}>{job.port_of_loading}</span>
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
                                  gap: "2px",
                                }}
                              >
                                {job.containers
                                  .filter((c) => c.containerNo)
                                  .map((container, index) => {
                                    // const weightShortage = parseFloat(container.weight_shortage) || 0;
                                    // const containerColor = getShortageColor(weightShortage);
                                    // const tooltipText = getShortageText(weightShortage);

                                    return (
                                      <div
                                        key={index}
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "center",
                                        }}
                                      >
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                          <a
                                            href={`https://www.ldb.co.in/ldb/containersearch/39/${container.containerNo}/1726651147706`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                              fontWeight: "bold",
                                              textDecoration: "none",
                                              cursor: "pointer",
                                              fontSize: "11px",
                                              color: "#2563eb",
                                            }}
                                            onMouseOver={(e) =>
                                              (e.target.style.textDecoration = "underline")
                                            }
                                            onMouseOut={(e) =>
                                              (e.target.style.textDecoration = "none")
                                            }
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {container.containerNo}
                                          </a>

                                          {/* Shipping Line Tracking Link */}
                                          {(() => {
                                            const bookingDetail = job.operations?.[0]?.bookingDetails?.[0] || {};
                                            const bookingNo = bookingDetail.bookingNo || "";
                                            const containerFirst = job.containers?.[0]?.containerNo || "";
                                            const urls = buildShippingLineUrls(bookingNo, containerFirst);

                                            let linerRaw = bookingDetail.shippingLineName || job.shipping_line_airline || "";
                                            // Handle cases like "MSC - MSC" by taking the part after " - "
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
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                          <IconButton
                                            size="small"
                                            onClick={(e) =>
                                              handleCopyText(container.containerNo, e)
                                            }
                                            style={{ padding: 0, marginLeft: 4 }}
                                            title="Copy Container No"
                                          >
                                            <ContentCopyIcon
                                              style={{ fontSize: 10 }}
                                            />
                                          </IconButton>
                                          {container.size && <span style={{ fontSize: '10px', marginLeft: 4, color: '#6b7280' }}>| "{container.size}"</span>}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            ) : (
                              <div
                                style={{
                                  fontWeight: "600",
                                  fontSize: "11px",
                                  color: "#374151",
                                }}
                              >
                                -
                              </div>
                            )}
                          </div>
                          <div style={{ color: "#6b7280", fontSize: "10px", marginTop: "4px" }}>
                            <div style={{ fontWeight: "600" }}>
                              {job.total_no_of_pkgs} {job.package_unit}
                            </div>
                            <div>
                              G: {job.gross_weight_kg} kg | N: {job.net_weight_kg} kg
                            </div>
                          </div>
                          <div style={{ color: "#6b7280", fontSize: "10px", marginTop: "2px" }}>
                            <span>Place:</span>{" "}
                            <span style={{ fontWeight: "500" }}>
                              {formatDate(
                                job.operations?.[0]?.statusDetails?.[0]
                                  ?.containerPlacementDate,
                                "dd-MM-yy"
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Column 8: Handover DATE */}
                        <td style={s.td}>
                          <div style={{ marginBottom: "2px", fontSize: "10px" }}>
                            <span style={{ color: "#6b7280" }}>DHo:</span>{" "}
                            <span style={{ fontWeight: "500" }}>
                              {formatDate(
                                job.operations?.[0]?.statusDetails?.[0]
                                  ?.handoverForwardingNoteDate,
                                "dd-MM-yy"
                              )}
                            </span>
                          </div>
                          <div style={{ fontSize: "10px" }}>
                            <span style={{ color: "#6b7280" }}>Rail:</span>{" "}
                            <span style={{ fontWeight: "500" }}>
                              {formatDate(
                                job.operations?.[0]?.statusDetails?.[0]
                                  ?.railOutReachedDate,
                                "dd-MM-yy"
                              )}
                            </span>
                          </div>
                          <div style={{ marginTop: "2px", fontSize: "10px" }}>
                            <span style={{ color: "#6b7280" }}>Leo:</span>{" "}
                            <span style={{ fontWeight: "500" }}>
                              {formatDate(
                                job.operations?.[0]?.statusDetails?.[0]
                                  ?.leoDate,
                                "dd-MM-yy"
                              )}
                            </span>
                          </div>
                          <div style={{ marginTop: "2px", fontSize: "10px" }}>
                            <span style={{ color: "#6b7280" }}>Bill:</span>{" "}
                            <span style={{ fontWeight: "500" }}>
                              {formatDate(
                                job.operations?.[0]?.statusDetails?.[0]
                                  ?.billingDocsSentDt,
                                "dd-MM-yy"
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Column 9: Docs */}
                        <td style={s.td}>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              wordBreak: "break-word",
                              gap: "4px",
                            }}
                          >
                            {getDocumentLinks(job).map((link, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
                                {link.url ? (
                                  <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      fontSize: "10px",
                                      color: "#2563eb",
                                      textDecoration: "underline",
                                      fontWeight: "600",
                                      display: "inline-block",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      maxWidth: "140px",
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    title={link.title}
                                  >
                                    {link.title}
                                  </a>
                                ) : (
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      color: "#9ca3af",
                                      fontWeight: "600",
                                      display: "inline-block",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      maxWidth: "140px",
                                    }}
                                    title={link.title}
                                  >
                                    {link.title}
                                  </span>
                                )}

                                {link.field && (
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <QuickUploadButton
                                      job={job}
                                      field={link.field}
                                      uploadType={link.uploadType || "status"}
                                      idx={link.idx || 0}
                                      onSuccess={(url) => {
                                        setJobs((prevJobs) =>
                                          prevJobs.map((j) => {
                                            if (j._id === job._id) {
                                              const newOps = JSON.parse(JSON.stringify(j.operations || []));
                                              if (!newOps[0]) newOps[0] = {};

                                              if (link.uploadType === "section") {
                                                if (!Array.isArray(newOps[0][link.field])) newOps[0][link.field] = [];
                                                while (newOps[0][link.field].length <= (link.idx || 0)) {
                                                  newOps[0][link.field].push({});
                                                }
                                                const currFiles = Array.isArray(newOps[0][link.field][link.idx || 0].images)
                                                  ? newOps[0][link.field][link.idx || 0].images
                                                  : [];
                                                newOps[0][link.field][link.idx || 0].images = [...currFiles, url];
                                              } else {
                                                if (!newOps[0].statusDetails) newOps[0].statusDetails = [{}];
                                                if (!newOps[0].statusDetails[0]) newOps[0].statusDetails[0] = {};

                                                const currFiles = Array.isArray(newOps[0].statusDetails[0][link.field])
                                                  ? newOps[0].statusDetails[0][link.field]
                                                  : [];
                                                newOps[0].statusDetails[0][link.field] = [...currFiles, url];
                                              }

                                              return { ...j, operations: newOps };
                                            }
                                            return j;
                                          })
                                        );
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Column 10: Status */}
                        <td style={s.td}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <button
                              className="copy-btn"
                              onClick={(e) => handleCopyJob(job, e)}
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "#10b981",
                                color: "white",
                                border: "none",
                                borderRadius: "3px",
                                fontSize: "11px",
                                fontWeight: "600",
                                cursor: "pointer",
                                width: "100%",
                              }}
                            >
                              Copy
                            </button>
                            <button
                              style={{
                                background: "#fff",
                                border: "1.2px solid #1976d2",
                                color: "#1976d2",
                                padding: "3px 8px",
                                borderRadius: 4,
                                fontWeight: 500,
                                fontSize: 11,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "100%",
                              }}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDocJob(job);
                                setDocsAnchorEl(e.currentTarget);
                              }}
                            >
                              Docs
                              <ArrowDropDownIcon sx={{ fontSize: 14, ml: 0.3 }} />
                            </button>
                          </div>
                          <div
                            style={{
                              textAlign: "center",
                              marginTop: "6px",
                              fontSize: "10px",
                              fontWeight: "700",
                              color: "#374151",
                              backgroundColor: "rgba(255,255,255,0.6)",
                              padding: "2px 4px",
                              borderRadius: "4px",
                            }}
                          >
                            {Array.isArray(job.detailedStatus) && job.detailedStatus.length > 0
                              ? job.detailedStatus[job.detailedStatus.length - 1]
                              : (typeof job.detailedStatus === 'string' && job.detailedStatus) ? job.detailedStatus : job.status || "-"}
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
                  placeholder="e.g., 25-26"
                  value={copyForm.year}
                  onChange={(e) =>
                    setCopyForm({ ...copyForm, year: e.target.value })
                  }
                  required
                />
                <div style={modalStyles.infoText}>
                  Format: YY-YY (e.g., 25-26 for 2025-2026)
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
              options={exporters}
              value={selectedExporter || null}
              onChange={(event, newValue) => {
                setSelectedExporter(newValue || "");
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

      {/* Documents Menu */}
      <Menu
        anchorEl={docsAnchorEl}
        open={Boolean(docsAnchorEl)}
        onClose={() => {
          setDocsAnchorEl(null);
          setSelectedDocJob(null);
        }}
      >
        <ExportChecklistGenerator
          jobNo={selectedDocJob?.job_no}
          renderAsIcon={false}
        >
          <MenuItem
            disableRipple
            onClick={() => {
              setDocsAnchorEl(null);
              setSelectedDocJob(null);
            }}
            sx={{ fontSize: 13, minWidth: 150 }}
          >
            Checklist
          </MenuItem>
        </ExportChecklistGenerator>

        <FileCoverGenerator jobNo={selectedDocJob?.job_no}>
          <MenuItem
            disableRipple
            onClick={() => {
              setDocsAnchorEl(null);
              setSelectedDocJob(null);
            }}
            sx={{ fontSize: 13, minWidth: 150 }}
          >
            File Cover
          </MenuItem>
        </FileCoverGenerator>

        <ConsignmentNoteGenerator jobNo={selectedDocJob?.job_no}>
          <MenuItem
            disableRipple
            onClick={() => {
              setDocsAnchorEl(null);
              setSelectedDocJob(null);
            }}
            sx={{ fontSize: 13, minWidth: 150 }}
          >
            Consignment Note
          </MenuItem>
        </ConsignmentNoteGenerator>

        <ForwardingNoteTharGenerator jobNo={selectedDocJob?.job_no}>
          <MenuItem
            disableRipple
            onClick={() => {
              setDocsAnchorEl(null);
              setSelectedDocJob(null);
            }}
            sx={{ fontSize: 13, minWidth: 150 }}
          >
            Forwarding Note (THAR)
          </MenuItem>
        </ForwardingNoteTharGenerator>

        <AnnexureCGenerator jobNo={selectedDocJob?.job_no}>
          <MenuItem
            disableRipple
            onClick={() => {
              setDocsAnchorEl(null);
              setSelectedDocJob(null);
            }}
            sx={{ fontSize: 13, minWidth: 150 }}
          >
            Annexure C
          </MenuItem>
        </AnnexureCGenerator>

        <ConcorForwardingNoteGenerator jobNo={selectedDocJob?.job_no}>
          <MenuItem
            disableRipple
            onClick={() => {
              setDocsAnchorEl(null);
              setSelectedDocJob(null);
            }}
            sx={{ fontSize: 13, minWidth: 150 }}
          >
            Forwarding Note (CONCOR)
          </MenuItem>
        </ConcorForwardingNoteGenerator>

        <VGMAuthorizationGenerator jobNo={selectedDocJob?.job_no}>
          <MenuItem
            disableRipple
            onClick={() => {
              setDocsAnchorEl(null);
              setSelectedDocJob(null);
            }}
            sx={{ fontSize: 13, minWidth: 150 }}
          >
            VGM Authorization
          </MenuItem>
        </VGMAuthorizationGenerator>

        <FreightCertificateGenerator jobNo={selectedDocJob?.job_no}>
          <MenuItem
            disableRipple
            onClick={() => {
              setDocsAnchorEl(null);
              setSelectedDocJob(null);
            }}
            sx={{ fontSize: 13, minWidth: 150 }}
          >
            Freight Certificate
          </MenuItem>
        </FreightCertificateGenerator>

        <BillOfLadingGenerator jobNo={selectedDocJob?.job_no}>
          <MenuItem
            disableRipple
            onClick={() => {
              setDocsAnchorEl(null);
              setSelectedDocJob(null);
            }}
            sx={{ fontSize: 13, minWidth: 150 }}
          >
            Bill of Lading
          </MenuItem>
        </BillOfLadingGenerator>

        <MenuItem
          onClick={() => {
            if (!selectedDocJob) return;
            const downloadUrl = `${import.meta.env.VITE_API_STRING}/generate-sb-file/${selectedDocJob._id}`;
            window.open(downloadUrl, "_blank");
            setDocsAnchorEl(null);
            setSelectedDocJob(null);
          }}
          sx={{
            fontSize: 13,
            minWidth: 150,
            color: "#166534",
            fontWeight: "bold",
            borderTop: "1px solid #eee",
            marginTop: "5px",
            paddingTop: "8px"
          }}
        >
          Export SB Flat File (.sb)
        </MenuItem>
      </Menu>

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
              `${import.meta.env.VITE_API_STRING}/${encodeURIComponent(sbTrackJob.job_no)}`,
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

            // 3. Update job-level fields
            if (updates.egm_no) fullJob.egm_no = updates.egm_no;
            if (updates.egm_date) fullJob.egm_date = updates.egm_date;
            if (updates.drawback_scroll_no) fullJob.drawback_scroll_no = updates.drawback_scroll_no;
            if (updates.drawback_scroll_date) fullJob.drawback_scroll_date = updates.drawback_scroll_date;
            if (updates.rosctl_scroll_no) fullJob.rosctl_scroll_no = updates.rosctl_scroll_no;
            if (updates.rosctl_scroll_date) fullJob.rosctl_scroll_date = updates.rosctl_scroll_date;

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
    </>
  );
};

export default ExportJobsTable;
