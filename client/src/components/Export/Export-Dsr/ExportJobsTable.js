import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { format, parseISO, isValid } from "date-fns";

// --- Clean Enterprise Styles ---
const s = {
  wrapper: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
    backgroundColor: "#ffffff",
    padding: "10px 20px 20px 20px",
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
    whiteSpace: "nowrap",
  },
  th: {
    backgroundColor: "#f9fafb",
    color: "#374151",
    fontWeight: "700",
    padding: "10px 12px",
    textAlign: "left",
    borderBottom: "1px solid #e5e7eb",
    borderRight: "1px solid #f3f4f6",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  td: {
    padding: "8px 12px",
    borderBottom: "1px solid #f3f4f6",
    borderRight: "1px solid #f9fafb",
    color: "#1f2937",
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
    position: "sticky",
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

// Helper
const safeDate = (val) => {
  if (!val) return "";
  try {
    const date = parseISO(val);
    return isValid(date) ? format(date, "dd/MM/yyyy") : "";
  } catch (e) {
    return "";
  }
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

const ExportJobsTable = () => {
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState("pending");
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

  // --- Fetch Jobs ---
  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_STRING}/export-jobs/api/exports`,
          {
            params: {
              status: activeTab,
              search: searchQuery,
              year: selectedYear === "all" ? "" : selectedYear,
              consignmentType: selectedType,
              branch: selectedBranch,
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

    const timer = setTimeout(fetchJobs, 300);
    return () => clearTimeout(timer);
  }, [
    activeTab,
    searchQuery,
    selectedYear,
    selectedType,
    selectedBranch,
    page,
  ]);

  // Reset page when tab/filters change
  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery, selectedYear, selectedType, selectedBranch]);

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
      if (parts.length > 4) {
        extractedYear = parts[4]; // Last part is year (e.g., "25-26")
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
          `${import.meta.env.VITE_API_STRING}/export-jobs/api/exports`,
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

  // Calculate generated job number for preview
  const getGeneratedJobNo = () => {
    if (!copyForm.branch_code || !copyForm.transportMode || !copyForm.year) {
      return "";
    }

    let sequence = copyForm.manualSequence || suggestedSequence || "00001";

    // Pad sequence to 5 digits if it's a number
    if (/^\d+$/.test(sequence)) {
      sequence = sequence.padStart(5, "0");
    }

    return `${copyForm.branch_code}/EXP/${copyForm.transportMode}/${sequence}/${copyForm.year}`;
  };

  const generatedJobNo = getGeneratedJobNo();

  return (
    <>
      <div style={s.wrapper}>
        <div style={s.container}>
          {/* Title */}
          <div style={s.headerRow}>
            <h1 style={s.pageTitle}>Export Jobs</h1>
          </div>

          {/* Tabs */}
          <div style={s.tabContainer}>
            <button
              style={
                activeTab === "pending" ? { ...s.tab, ...s.activeTab } : s.tab
              }
              onClick={() => setActiveTab("pending")}
            >
              Pending{" "}
              <span
                style={
                  activeTab === "pending"
                    ? { ...s.badge, ...s.activeBadge }
                    : s.badge
                }
              ></span>
            </button>
            <button
              style={
                activeTab === "completed" ? { ...s.tab, ...s.activeTab } : s.tab
              }
              onClick={() => setActiveTab("completed")}
            >
              Completed{" "}
              <span
                style={
                  activeTab === "completed"
                    ? { ...s.badge, ...s.activeBadge }
                    : s.badge
                }
              ></span>
            </button>
            <button
              style={
                activeTab === "cancelled" ? { ...s.tab, ...s.activeTab } : s.tab
              }
              onClick={() => setActiveTab("cancelled")}
            >
              Cancelled{" "}
              <span
                style={
                  activeTab === "cancelled"
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
              <option value="AIR">Air Freight</option>
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

            {/* Search Input */}
            <input
              style={s.input}
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Table */}
          <div style={s.tableContainer}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={{ ...s.th, width: "40px", textAlign: "center" }}>
                    #
                  </th>
                  <th
                    style={{
                      ...s.th,
                      width: "130px",
                      position: "sticky",
                      left: 0,
                      zIndex: 20,
                    }}
                  >
                    Job Number
                  </th>
                  <th style={s.th}>Exporter</th>
                  <th style={s.th}>Consignee</th>
                  <th style={{ ...s.th, width: "60px" }}>Type</th>
                  <th style={s.th}>Date</th>
                  <th style={s.th}>POL</th>
                  <th style={s.th}>POD</th>
                  <th style={s.th}>Country</th>
                  <th style={s.th}>SB No</th>
                  <th style={s.th}>SB Date</th>
                  <th style={{ ...s.th, width: "80px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="11" style={s.message}>
                      Loading data...
                    </td>
                  </tr>
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={s.message}>
                      No jobs found.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job, idx) => (
                    <tr
                      key={job._id || idx}
                      style={s.rowHover}
                      onClick={(e) => handleJobClick(job, e)}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#f0f7ff")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      <td
                        style={{
                          ...s.td,
                          textAlign: "center",
                          color: "#9ca3af",
                        }}
                      >
                        {(page - 1) * LIMIT + idx + 1}
                      </td>

                      {/* Clickable Job Number */}
                      <td
                        style={{
                          ...s.td,
                          fontWeight: "600",
                          color: "#2563eb",
                          position: "sticky",
                          left: 0,
                          backgroundColor: "inherit",
                          zIndex: 5,
                          cursor: "pointer",
                        }}
                        onClick={(e) => handleJobClick(job, e)}
                      >
                        <span style={{ textDecoration: "underline" }}>
                          {job.job_no}
                        </span>
                      </td>

                      <td
                        style={{
                          ...s.td,
                          maxWidth: "220px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={job.exporter}
                      >
                        {job.exporter}
                      </td>
                      <td
                        style={{
                          ...s.td,
                          maxWidth: "220px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={job.consignees[0].consignee_name}
                      >
                        {job.consignees[0].consignee_name || "-"}
                      </td>
                      <td style={s.td}>
                        <span style={s.chip}>{job.consignmentType || "-"}</span>
                      </td>
                      <td style={s.td}>{safeDate(job.job_date)}</td>
                      <td style={s.td}>{job.port_of_origin || "-"}</td>
                      <td style={s.td}>{job.port_of_discharge || "-"}</td>
                      <td style={s.td}>{job.discharge_country || "-"}</td>
                      <td style={s.td}>{job.sb_no || "-"}</td>
                      <td style={s.td}>{safeDate(job.sb_no)}</td>
                      <td style={s.td}>
                        <button
                          className="copy-btn"
                          onClick={(e) => handleCopyJob(job, e)}
                          style={{
                            padding: "4px 8px",
                            backgroundColor: "#10b981",
                            color: "white",
                            border: "none",
                            borderRadius: "3px",
                            fontSize: "11px",
                            cursor: "pointer",
                          }}
                        >
                          Copy
                        </button>
                      </td>
                    </tr>
                  ))
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
    </>
  );
};

export default ExportJobsTable;
