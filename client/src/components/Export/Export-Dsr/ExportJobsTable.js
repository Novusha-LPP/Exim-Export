import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import axios from "axios";
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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddExJobs from "./AddExJobs";
import { formatDate } from "../../../utils/dateUtils";

// --- Clean Enterprise Styles ---
const s = {
  wrapper: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
    backgroundColor: "#ffffff",
    padding: "0 20px 20px 20px", // ⬅️ reduced
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
    border: "1px solid #e5e7eb",
    borderRadius: "3px",
    maxHeight: "600px",
    overflowY: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
    tableLayout: "fixed", // Enforce fixed widths
  },
  th: {
    padding: "8px 6px", // Reduced padding
    textAlign: "left",
    fontWeight: "700",
    fontSize: "13px", // Slightly smaller
    color: "#000000",
    borderBottom: "1px solid #e5e7eb",
    borderRight: "1px solid #f3f4f6",
    whiteSpace: "normal", // Allow wrapping
    wordBreak: "break-word", // Break long words
    verticalAlign: "top", // Align to top for better readability
    // position: "sticky",
    top: 0,
    zIndex: 10,
  },
  td: {
    padding: "6px 6px", // Reduced padding
    borderBottom: "1px solid #f3f4f6",
    borderRight: "1px solid #f9fafb",
    color: "#1f2937",
    whiteSpace: "normal", // Allow wrapping
    wordBreak: "break-word", // Break long words
    verticalAlign: "top",
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
    case "SB Receipt":
      return "#f0e6ff"; // Light Purple (Match BE Noted?)
    case "L.E.O":
      return "#e8f5e9"; // Light Green (Completed/Approved)
    case "Container HO to Concor":
    case "File Handover to IATA":
      return "#ffffe0"; // Light Yellow
    case "Rail Out":
    case "Departure":
      return "#fbdbffff"; // Honeydew
    case "Ready for Billing":
      return "#ffe4e1"; // Misty rose
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

const ExportJobsTable = () => {
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState("Pending");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const LIMIT = 20;

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedType, setSelectedMovementType] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedExporterFilter, setSelectedExporterFilter] = useState("");
  const [selectedDetailedStatus, setSelectedDetailedStatus] = useState("");
  const [selectedCustomHouse, setSelectedCustomHouse] = useState("");
  const [selectedJobOwner, setSelectedJobOwner] = useState("");
  const [customHouses, setCustomHouses] = useState([]); // Re-added customHouses state
  const [jobOwnersList, setJobOwnersList] = useState([]); // Stores fetched users for Job Owner dropdown

  // Fetch Job Owners (Users)
  // Fetch Job Owners (Users)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_STRING}/export-jobs-module-users`
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

  // Create Job Dialog State
  const [openAddDialog, setOpenAddDialog] = useState(false);

  // DSR Report Dialog State
  const [openDSRDialog, setOpenDSRDialog] = useState(false);
  const [exporters, setExporters] = useState([]);
  const [selectedExporter, setSelectedExporter] = useState("");
  const [dsrLoading, setDSRLoading] = useState(false);

  // Fetch Exporters for DSR
  useEffect(() => {
    const fetchExporters = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_STRING}/exporter-list`
        );
        if (response.data.success) {
          setExporters(response.data.data || []);
        }
      } catch (err) {
        console.error("Error fetching exporters:", err);
      }
    };

    fetchExporters();
  }, [openDSRDialog]);

  // Fetch Custom Houses list
  useEffect(() => {
    const fetchCustomHouses = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_STRING}/custom-house-list`
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
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `DSR_Report_${selectedExporter}_${format(new Date(), "yyyyMMdd")}.xlsx`
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
            consignmentType: selectedType,
            branch: selectedBranch,
            exporter: selectedExporterFilter,
            detailedStatus: selectedDetailedStatus,
            customHouse: selectedCustomHouse,
            jobOwner: selectedJobOwner, // Added job owner filter
            page: page,
            limit: LIMIT,
          },
        }
      );
      if (response.data.success) {
        setJobs(response.data.data.jobs || []);
        setTotalRecords(
          response.data.data.total ||
          response.data.data.pagination?.totalCount ||
          0
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
    selectedType,
    selectedBranch,
    selectedExporterFilter,
    selectedDetailedStatus,
    selectedCustomHouse,
    selectedJobOwner,
    page,
  ]);

  // Reset page when tab/filters change
  useEffect(() => {
    setPage(1);
  }, [
    activeTab,
    searchQuery,
    selectedYear,
    selectedType,
    selectedBranch,
    selectedExporterFilter,
    selectedDetailedStatus,
    selectedCustomHouse,
    selectedJobOwner,
  ]);

  const handleJobClick = (job, e) => {
    // Check if the click was on the Copy button
    if (e.target.closest(".copy-btn")) {
      return; // Don't navigate if copy button was clicked
    }

    const jobNo = job.job_no;
    if (jobNo) {
      navigate(`job/${encodeURIComponent(jobNo)}`, {
        state: { fromJobList: true },
      });
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
          }
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
        }
      );

      if (response.data.success) {
        // Success - close modal and refresh jobs list
        setShowCopyModal(false);
        setCopySourceJob(null);

        // Refresh the jobs list
        const refreshResponse = await axios.get(
          `${import.meta.env.VITE_API_STRING}/api/exports`,
          {
            params: {
              status: activeTab,
              page: page,
              limit: LIMIT,
            },
          }
        );

        if (refreshResponse.data.success) {
          setJobs(refreshResponse.data.data.jobs || []);
          setTotalRecords(
            refreshResponse.data.data.total ||
            refreshResponse.data.data.pagination?.totalCount ||
            0
          );
        }

        // Show success message
        alert(
          `Job copied successfully! New job number: ${response.data.job.job_no}`
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
            "This job number already exists. Please use a different sequence."
          );
        } else if (error.response.status === 404) {
          setCopyError(
            error.response.data.message ||
            "Source job not found. Please refresh and try again."
          );
        } else if (error.response.status === 400) {
          setCopyError(
            error.response.data.message ||
            "Invalid input. Please check your entries."
          );
        } else {
          setCopyError(
            error.response.data.message ||
            "Error copying job. Please try again."
          );
        }
      } else {
        setCopyError("Network error. Please check your connection.");
      }
    } finally {
      setCopyLoading(false);
    }
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
              <h1 style={s.pageTitle}>Export Jobs</h1>
              <span
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
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
              <option value="25-26">25-26</option>
              <option value="26-27">26-27</option>
            </select>

            {/* Movement Type Filter */}
            <select
              style={s.select}
              value={selectedType}
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
              {branchOptions.map((branch) => (
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
            <select
              style={s.select}
              value={selectedExporterFilter}
              onChange={(e) => setSelectedExporterFilter(e.target.value)}
            >
              <option value="">All Exporters</option>
              {exporters.map((exp, i) => (
                <option key={i} value={exp}>
                  {exp}
                </option>
              ))}
            </select>

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
                  "SB Receipt",
                  "L.E.O",
                  "Container HO to Concor",
                  "File Handover to IATA",
                  "Rail Out",
                  "Departure",
                  "Ready for Billing",
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
              {customHouses.map((ch, i) => (
                <option key={i} value={ch}>
                  {ch}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div
              style={{
                display: "flex",
                flex: 1,
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <input
                style={{ ...s.input, minWidth: "250px" }}
                placeholder="Search by Job No, Exporter, Consignee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {/* <button
                style={{
                  padding: "0 15px",
                  height: "30px",
                  backgroundColor: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: "3px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
                onClick={() => setOpenDSRDialog(true)}
              >
                Download DSR
              </button> */}
            </div>
          </div>

          {/* Table */}
          <div style={s.tableContainer}>
            <table style={s.table}>
              <colgroup>
                <col style={{ width: "150px" }} /> {/* Job No + Owner */}
                <col style={{ width: "150px" }} /> {/* Exporter */}
                <col style={{ width: "140px" }} /> {/* NEW: KYC/Codes */}
                <col style={{ width: "110px" }} /> {/* Invoice */}
                <col style={{ width: "80px" }} /> {/* SB */}
                <col style={{ width: "80px" }} /> {/* Pkgs */}
                <col style={{ width: "100px" }} /> {/* Port */}
                <col style={{ width: "100px" }} /> {/* Placement */}
                <col style={{ width: "80px" }} /> {/* Handover */}
                <col style={{ width: "60px" }} /> {/* Action */}
              </colgroup>
              <thead>
                <tr>
                  <th style={s.th}>Job No / Owner</th>
                  <th style={s.th}>Exporter</th>
                  <th style={s.th}>KYC / Codes</th>
                  <th style={s.th}>Invoice</th>
                  <th style={s.th}>SB / Date</th>
                  <th style={s.th}>No. of Pkgs</th>
                  <th style={s.th}>Destination</th>
                  <th style={s.th}>Plac’t / Container</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Action</th>
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
                        job.detailedStatus?.[0] || job.status || ""
                      ) || "#ffffff";
                    return (
                      <tr
                        key={job._id || idx}
                        style={{
                          ...s.rowHover,
                          backgroundColor: rowBg,
                        }}
                        onClick={(e) => handleJobClick(job, e)}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = "#eef2ff")
                        } // Hover highlight
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor = rowBg)
                        }
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
                            // ... existing styles
                            left: 0,
                            backgroundColor: "inherit",
                            zIndex: 5,
                            cursor: "pointer",
                          }}
                          onClick={(e) => handleJobClick(job, e)}
                        >
                          {/* ... Job No ... */}
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
                          {/* ... Date ... */}
                          <div
                            style={{
                              color: "#32363dff",
                              fontSize: "11px",
                              fontWeight: "normal",
                            }}
                          >
                            {formatDate(job.job_date)}
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
                                  //fontStyle: "italic",
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
                            }}
                          >
                            {job.exporter}
                          </div>
                          <div style={{ color: "#4b5563", fontSize: "11px" }}>
                            {job.consignees?.[0]?.consignee_name || "-"}
                          </div>
                          <div
                            style={{
                              color: "#6b7280",
                              fontSize: "11px",
                              fontStyle: "italic",
                            }}
                          >
                            {job.buyerThirdPartyInfo?.buyer?.name || "-"}
                          </div>
                        </td>

                        {/* NEW Column: KYC / Codes */}
                        <td style={s.td}>
                          <div style={{ fontSize: "10px", color: "#000000ff" }}>
                            {job.ieCode && (
                              <div style={{ marginBottom: "4px" }}>
                                <span
                                  style={{
                                    color: "#0a0a0aff",
                                    fontWeight: "700",
                                  }}
                                >
                                  IEC:
                                </span>{" "}
                                {job.ieCode}
                              </div>
                            )}
                            {job.panNo && (
                              <div style={{ marginBottom: "4px" }}>
                                <span
                                  style={{
                                    color: "#000000ff",
                                    fontWeight: "700",
                                  }}
                                >
                                  PAN:
                                </span>{" "}
                                {job.panNo}
                              </div>
                            )}
                            {job.exporter_gstin && (
                              <div style={{ marginBottom: "4px" }}>
                                <span
                                  style={{
                                    color: "#000000ff",
                                    fontWeight: "700",
                                  }}
                                >
                                  GST:
                                </span>{" "}
                                {job.exporter_gstin}
                              </div>
                            )}
                            {job.adCode && (
                              <div style={{ marginBottom: "4px" }}>
                                <span
                                  style={{
                                    color: "#000000ff",
                                    fontWeight: "700",
                                  }}
                                >
                                  AD:
                                </span>{" "}
                                {job.adCode}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Column 4: Invoice */}
                        <td style={s.td}>
                          <div
                            style={{ fontWeight: "600", marginBottom: "2px" }}
                          >
                            {job.invoices?.[0]?.invoiceNumber || "-"}
                          </div>
                          <div style={{ color: "#4b5563", fontSize: "11px" }}>
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
                              fontWeight: "600",
                              color: "#b91c1c",
                              marginBottom: "2px",
                            }}
                          >
                            {job.sb_no || "-"}
                          </div>
                          <div style={{ color: "#4b5563", fontSize: "11px" }}>
                            {formatDate(job.sb_date)}
                          </div>
                        </td>

                        {/* Column 6: No. of Pkgs */}
                        <td style={s.td}>
                          <div
                            style={{ fontWeight: "600", marginBottom: "2px" }}
                          >
                            {job.total_no_of_pkgs} {job.package_unit}
                          </div>
                          <div style={{ color: "#4b5563", fontSize: "11px" }}>
                            G: {job.gross_weight_kg} kg
                          </div>
                          <div style={{ color: "#4b5563", fontSize: "11px" }}>
                            N: {job.net_weight_kg} kg
                          </div>
                        </td>

                        {/* Column 7: Port of destination */}
                        <td style={s.td}>
                          <div
                            style={{ fontWeight: "600", marginBottom: "2px" }}
                          >
                            {job.destination_port ||
                              job.port_of_discharge ||
                              "-"}
                          </div>
                          <div style={{ color: "#4b5563", fontSize: "11px" }}>
                            {job.destination_country ||
                              job.discharge_country ||
                              "-"}
                          </div>
                        </td>

                        {/* Column 8: Container Placement */}
                        <td style={s.td}>
                          <div style={{ marginBottom: "2px" }}>
                            {job.containers && job.containers.length > 0 ? (
                              <div
                                style={{
                                  fontWeight: "600",
                                  fontSize: "11px",
                                  color: "#374151",
                                }}
                              >
                                {job.containers
                                  .map((c) => c.containerNo)
                                  .filter(Boolean)
                                  .map((containerNo, index, array) => (
                                    <React.Fragment key={index}>
                                      {containerNo}
                                      {/* Add line break after every 2 containers, except the last one */}
                                      {index < array.length - 1 &&
                                        (index + 1) % 2 === 0 ? (
                                        <br />
                                      ) : index < array.length - 1 ? (
                                        ", "
                                      ) : null}
                                    </React.Fragment>
                                  ))}
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
                          <div style={{ color: "#6b7280", fontSize: "11px" }}>
                            <span style={{ fontSize: "10px" }}>Place:</span>{" "}
                            {formatDate(
                              job.operations?.[0]?.statusDetails?.[0]
                                ?.containerPlacementDate
                            )}
                          </div>
                        </td>

                        {/* Column 9: Handover DATE */}
                        <td style={s.td}>
                          <div style={{ marginBottom: "2px" }}>
                            <span
                              style={{ color: "#6b7280", fontSize: "10px" }}
                            >
                              {job.transportMode === "AIR" ||
                                job.consignmentType === "LCL"
                                ? "File:"
                                : "Fwd:"}
                            </span>{" "}
                            {formatDate(
                              job.operations?.[0]?.statusDetails?.[0]
                                ?.hoToConsoleDate
                            )}
                          </div>
                          <div>
                            <span
                              style={{ color: "#6b7280", fontSize: "10px" }}
                            >
                              Rail:
                            </span>{" "}
                            {formatDate(
                              job.operations?.[0]?.statusDetails?.[0]
                                ?.railOutReachedDate
                            )}
                          </div>
                        </td>

                        {/* Column 10: Copy Action */}
                        <td style={s.td}>
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
                          <div
                            style={{
                              textAlign: "center",
                              marginTop: "6px",
                              fontSize: "10px",
                              fontWeight: "700",
                              color: "#374151",
                              backgroundColor: "rgba(255,255,255,0.6)", // Slight overlay for readability
                              padding: "2px 4px",
                              borderRadius: "4px",
                            }}
                          >
                            {/* Use detailedStatus array first item or fallback */}
                            {Array.isArray(job.detailedStatus) &&
                              job.detailedStatus.length > 0
                              ? job.detailedStatus[0]
                              : job.status || "-"}
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
            <div>
              <button
                style={
                  page === 1 ? { ...s.btnPage, ...s.btnDisabled } : s.btnPage
                }
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </button>
              <span style={{ margin: "0 10px" }}>
                Page {page} of {totalPages || 1}
              </span>
              <button
                style={
                  page >= totalPages
                    ? { ...s.btnPage, ...s.btnDisabled }
                    : s.btnPage
                }
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Copy Job Modal */}
      {showCopyModal && copySourceJob && (
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
      )}
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
            <select
              style={{ ...s.select, width: "100%", height: "35px" }}
              value={selectedExporter}
              onChange={(e) => setSelectedExporter(e.target.value)}
            >
              <option value="">-- Choose Exporter --</option>
              {exporters.map((exp, i) => (
                <option key={i} value={exp}>
                  {exp}
                </option>
              ))}
            </select>
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
    </>
  );
};

export default ExportJobsTable;
