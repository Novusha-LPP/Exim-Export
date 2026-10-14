import React, { useCallback, useContext, useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { MaterialReactTable } from "material-react-table";
import {
  Autocomplete,
  Badge,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Tooltip,
  Typography,
  FormControl,
  Select,
} from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CloseIcon from "@mui/icons-material/Close";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { uploadFileToS3 } from "../../../utils/awsFileUpload";
import RaiseQueryDialog from "../Export-Dsr/Queries/RaiseQueryDialog";
import logoImage from "../../../assets/images/logo.jpg";
import { UserContext } from "../../../contexts/UserContext";
import SearchIcon from "@mui/icons-material/Search";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DescriptionIcon from "@mui/icons-material/Description";
import { generatePaymentRequestPDF } from "../../../utils/paymentRequestPrint";
import { generatePurchaseBookPDF } from "../../../utils/purchaseBookPrint";
import DateInput from "../../common/DateInput.js";
import { handleDateInput } from "../../../utils/dateUtils.js";
import BillingReportsUtility from "../../Report/BillingReportsUtility";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import VirtualBalanceList from "./VirtualBalanceList";
import CashflowTracker from "./CashflowTracker";


const s = {
  wrapper: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
    backgroundColor: "#fafaffff",
    padding: "5px 15px",
    minHeight: "100vh",
    color: "#333",
    fontSize: "12px",
  },
  toolbar: {
    display: "flex",
    gap: "8px",
    rowGap: "10px",
    alignItems: "center",
    marginBottom: "10px",
    flexWrap: "wrap",
    backgroundColor: "#fff",
    padding: "8px 12px",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    border: "1px solid #e5e7eb",
  }
};

const PAYMENT_TABS = [
  { key: "billing-pending", label: "Billing Pending" },
  { key: "payment-requested", label: "Payment Requested" },
  { key: "payment", label: "Payment" },
  { key: "payment-completed", label: "Payment Completed" },
  { key: "club-jobs", label: "Club Jobs" },
  { key: "export-completed-billing", label: "Export Completed Billing" },
  { key: "cashflow", label: "Cash Flow" },
  { key: "terminal-virtual-balance", label: "Empty-Yards Virtual Balance" },
  { key: "cfs-virtual-balance", label: "CFS-SFSA Virtual Balance" },
];

const PURCHASE_TABS = [
  { key: "billing-pending", label: "Billing Pending" },
  { key: "purchase-book-requested", label: "Purchase Book Requested" },
  { key: "purchase-book", label: "Purchase Book" },
  { key: "purchase-book-completed", label: "Purchase Book Completed" },
  { key: "club-jobs", label: "Club Jobs" },
  { key: "export-completed-billing", label: "Export Completed Billing" },
  { key: "cashflow", label: "Cash Flow" },
  { key: "terminal-virtual-balance", label: "Empty-Yards Virtual Balance" },
  { key: "cfs-virtual-balance", label: "CFS-SFSA Virtual Balance" },
];

import {
  getCurrentFinancialYear,
  formatDate,
  copyText,
  ExpandableChipList,
  renderChipList,
  QuickUploadButton,
  EditableBillingPair,
  EditableDateCell,
  JobNoCell,
  PartyCell,
  RefCell,
} from "./widgets/BillingWidgets";
import BillingDetailsDialog from "./dialogs/BillingDetailsDialog";
import QueryChatDialog from "../Export-Dsr/table/dialogs/QueryChatDialog";

function ExportBillingPage() {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [workMode, setWorkMode] = useState(() => {
    const saved = localStorage.getItem("billing_workMode");
    return saved && saved !== "virtual-balance" ? saved : "payment";
  });
  const [tabIndex, setTabIndex] = useState(() => {
    const saved = localStorage.getItem("billing_tabIndex");
    return saved !== null ? parseInt(saved, 10) : 0;
  });
  const [searchQuery, setSearchQuery] = useState(() => {
    return localStorage.getItem("billing_searchQuery") || "";
  });
  const [debouncedSearch, setDebouncedSearch] = useState(() => {
    return localStorage.getItem("billing_searchQuery") || "";
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    return localStorage.getItem("billing_selectedYear") || getCurrentFinancialYear();
  });
  const [years, setYears] = useState([getCurrentFinancialYear()]);
  const [exporters, setExporters] = useState([]);
  const [selectedExporter, setSelectedExporter] = useState(() => {
    return localStorage.getItem("billing_selectedExporter") || "";
  });
  const [selectedBranch, setSelectedBranch] = useState(() => {
    return localStorage.getItem("billing_selectedBranch") || "";
  });
  const [downloadExcelDialogOpen, setDownloadExcelDialogOpen] = useState(false);
  const [downloadStartDate, setDownloadStartDate] = useState("");
  const [downloadEndDate, setDownloadEndDate] = useState("");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tabCounts, setTabCounts] = useState({});
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(() => {
    return localStorage.getItem("billing_showUnresolvedOnly") === "true";
  });
  const [jobTypeFilter, setJobTypeFilter] = useState("all"); // "all" | "gen" | "freight"
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedRequestNo, setSelectedRequestNo] = useState(null);
  const [jobQueriesStatus, setJobQueriesStatus] = useState({});
  const [expandedRows, setExpandedRows] = useState({});
  const [reportsHubOpen, setReportsHubOpen] = useState(false);
  const [queryDialogOpen, setQueryDialogOpen] = useState(false);
  const [queryDialogJob, setQueryDialogJob] = useState(null);
  const [queryChatOpen, setQueryChatOpen] = useState(false);
  const [queryChatJob, setQueryChatJob] = useState(null);
  const [queryChatData, setQueryChatData] = useState([]);
  const [queryChatLoading, setQueryChatLoading] = useState(false);
  const [queryChatReply, setQueryChatReply] = useState("");
  const [queryChatSending, setQueryChatSending] = useState(false);
  const [clientQueryChatData, setClientQueryChatData] = useState([]);
  const [clientQueryChatReply, setClientQueryChatReply] = useState("");
  const [activeChatTab, setActiveChatTab] = useState("internal"); // "client" | "internal"
  const [activeQueryIndex, setActiveQueryIndex] = useState(0);
  const chatEndRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (queryChatOpen) {
      const timer = setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [queryChatOpen, queryChatData, clientQueryChatData, activeChatTab, activeQueryIndex]);
  const currentModuleForQueries = "export-billing";
  const limit = 50;

  const tabs = workMode === "purchase-book" ? PURCHASE_TABS : PAYMENT_TABS;
  const activeTab = tabs[tabIndex]?.key || tabs[0].key;

  const prevWorkMode = useRef(workMode);

  useEffect(() => {
    localStorage.setItem("billing_workMode", workMode);
  }, [workMode]);

  useEffect(() => {
    localStorage.setItem("billing_tabIndex", tabIndex);
  }, [tabIndex]);

  useEffect(() => {
    localStorage.setItem("billing_searchQuery", searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    localStorage.setItem("billing_selectedYear", selectedYear);
  }, [selectedYear]);

  useEffect(() => {
    localStorage.setItem("billing_selectedExporter", selectedExporter);
  }, [selectedExporter]);

  useEffect(() => {
    localStorage.setItem("billing_selectedBranch", selectedBranch);
  }, [selectedBranch]);

  useEffect(() => {
    localStorage.setItem("billing_showUnresolvedOnly", showUnresolvedOnly);
  }, [showUnresolvedOnly]);


  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (prevWorkMode.current !== workMode) {
      setTabIndex(0);
      setPage(1);
      prevWorkMode.current = workMode;
    }
  }, [workMode]);

  useEffect(() => {
    setExpandedRows({});
  }, [tabIndex, workMode]);

  useEffect(() => {
    // Replace dynamic year fetching with static financial years
    const currentFY = getCurrentFinancialYear();
    const [y1, y2] = currentFY.split('-').map(Number);

    // Generate last few financial years
    const lastYears = [];
    for (let i = 0; i < 4; i++) {
      const start = y1 - i;
      const end = y2 - i;
      lastYears.push(`${String(start).padStart(2, '0')}-${String(end).padStart(2, '0')}`);
    }
    setYears(lastYears);

    if (!lastYears.includes(selectedYear) && lastYears.length > 0) {
      setSelectedYear(lastYears[0]);
    }
  }, []);

  useEffect(() => {
    const fetchExporters = async () => {
      if (!selectedYear) return;
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_STRING}/get-exporter-list/${selectedYear}`
        );
        setExporters(res.data || []);
      } catch (error) {
        console.error("Error fetching exporters:", error);
        setExporters([]);
      }
    };
    fetchExporters();
  }, [selectedYear]);

  const fetchTabCounts = useCallback(async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_STRING}/export-jobs-tab-counts`, {
        params: {
          module: "billing",
          workMode,
          search: debouncedSearch,
          exporter: selectedExporter || "",
          branch: selectedBranch || "",
          year: selectedYear || "",
          unresolvedOnly: showUnresolvedOnly,
          jobTypeFilter: jobTypeFilter,
        },
        headers: {
          username: user?.username || "",
        },
      });
      if (res.data.success) {
        setTabCounts(res.data.data || {});
      }
    } catch (error) {
      console.error("Error fetching billing tab counts:", error);
    }
  }, [
    workMode,
    debouncedSearch,
    selectedExporter,
    selectedBranch,
    selectedYear,
    showUnresolvedOnly,
    jobTypeFilter,
    user?.username,
  ]);

  const fetchRows = useCallback(async () => {
    if (activeTab === "terminal-virtual-balance" || activeTab === "cfs-virtual-balance") {
      return;
    }
    setLoading(true);
    fetchTabCounts();
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_STRING}/export-billing-jobs`, {
        params: {
          workMode,
          tab: activeTab,
          page,
          limit,
          search: debouncedSearch,
          exporter: selectedExporter || "",
          branch: selectedBranch || "",
          year: selectedYear || "",
          unresolvedOnly: showUnresolvedOnly,
          jobTypeFilter: "",
        },
        headers: {
          username: user?.username || "",
        },
      });

      const payload = res.data?.data || {};
      setRows(payload.jobs || []);
      setTotalJobs(payload.total || 0);
      setTotalPages(payload.totalPages || 1);
      if (payload.pendingQueriesCount !== undefined) {
        setUnresolvedCount(payload.pendingQueriesCount);
      }
    } catch (error) {
      console.error("Error fetching export billing rows:", error);
      setRows([]);
      setTotalJobs(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [
    workMode,
    activeTab,
    page,
    debouncedSearch,
    selectedExporter,
    selectedBranch,
    selectedYear,
    showUnresolvedOnly,
    jobTypeFilter,
    user?.username,
    fetchTabCounts,
  ]);

  const handleDownloadExcel = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_STRING}/export-billing-jobs`, {
        params: {
          workMode,
          tab: activeTab,
          page: 1,
          limit: 100000,
          search: debouncedSearch,
          exporter: selectedExporter || "",
          branch: selectedBranch || "",
          year: selectedYear || "",
          unresolvedOnly: showUnresolvedOnly,
          jobTypeFilter: "",
          startDate: downloadStartDate,
          endDate: downloadEndDate,
        },
        headers: {
          username: user?.username || "",
        },
      });

      const allJobs = res.data?.data?.jobs || [];
      if (allJobs.length === 0) {
        alert("No jobs found to download.");
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Jobs");

      worksheet.columns = [
        { header: "Job No", key: "job_no", width: 25 },
        { header: "Exporter Name", key: "exporter", width: 35 },
        { header: "Booking No & Shipping Bill No", key: "booking_and_sb", width: 35 },
        { header: "Sent for Billing Date", key: "send_for_billing_date", width: 25 },
      ];

      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1A237E" },
        };
        cell.alignment = { vertical: "middle", horizontal: "left" };
      });

      allJobs.forEach((job) => {
        const bookingNo = job.booking_no || "-";
        const sbNo = job.sb_no || "-";
        
        let bookingSbVal = "";
        if (bookingNo !== "-" && sbNo !== "-") {
          bookingSbVal = `Booking: ${bookingNo} | SB: ${sbNo}`;
        } else if (bookingNo !== "-") {
          bookingSbVal = `Booking: ${bookingNo}`;
        } else if (sbNo !== "-") {
          bookingSbVal = `SB: ${sbNo}`;
        } else {
          bookingSbVal = "-";
        }

        worksheet.addRow({
          job_no: job.job_no || "",
          exporter: job.exporter || "",
          booking_and_sb: bookingSbVal,
          send_for_billing_date: job.send_for_billing_date ? formatDate(job.send_for_billing_date) : "-",
        });
      });

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.eachCell((cell) => {
            cell.alignment = { vertical: "middle", horizontal: "left" };
            cell.border = {
              top: { style: "thin", color: { argb: "FFE0E0E0" } },
              left: { style: "thin", color: { argb: "FFE0E0E0" } },
              bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
              right: { style: "thin", color: { argb: "FFE0E0E0" } },
            };
          });
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const tabNameClean = activeTab.replace(/-+/g, "_");
      const filename = `Jobs_${tabNameClean}_${new Date().toISOString().split("T")[0]}.xlsx`;
      saveAs(new Blob([buffer]), filename);
    } catch (err) {
      console.error("Excel download error:", err);
      alert("Failed to download excel report");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGeneralJob = async () => {
    if (!window.confirm(`Create a new General Job for year ${selectedYear}?`)) return;
    try {
      setLoading(true);
      const res = await axios.post(`${import.meta.env.VITE_API_STRING}/create-general-job`, {
        year: selectedYear
      }, {
        headers: { username: user?.username || "" }
      });
      if (res.data.success) {
        alert(`Job Created: ${res.data.data.job_no}`);
        fetchRows();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create general job.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    const jobNos = [];
    rows.forEach(r => {
      if (r.job_no) jobNos.push(r.job_no);
      if (r.subRows && Array.isArray(r.subRows)) {
        r.subRows.forEach(child => {
          if (child.job_no) jobNos.push(child.job_no);
        });
      }
    });

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
  }, [rows]);



  const columns = useMemo(() => {
    const billingDocsCol = {
      header: "Billing Docs",
      size: 110,
      Cell: ({ row }) => {
        const docList = row.original.billingDocsSentUpload || [];
        const docDate = row.original.billingDocsSentDt || "";

        // Helper to get filename or short name from URL
        const getDocLabel = (url, index) => {
          try {
            const decoded = decodeURIComponent(url);
            const fileName = decoded.substring(decoded.lastIndexOf('/') + 1);
            if (fileName.length > 25) {
              return `${fileName.substring(0, 22)}...`;
            }
            return fileName || `Doc ${index + 1}`;
          } catch (e) {
            return `Doc ${index + 1}`;
          }
        };

        if (docList.length === 0 && !docDate) {
          return <div style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "11px" }}>No Docs</div>;
        }

        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, py: 0.5 }}>
            {docDate && (
              <Typography sx={{ fontSize: "10.5px", fontWeight: 600, color: "#475569" }}>
                Sent: {docDate}
              </Typography>
            )}
            {docList.length > 0 ? (
              <FormControl size="small" fullWidth sx={{ minWidth: 110 }}>
                <Select
                  value=""
                  displayEmpty
                  onChange={(e) => {
                    const url = e.target.value;
                    if (url) {
                      window.open(url, "_blank");
                    }
                  }}
                  sx={{
                    height: 24,
                    fontSize: "10.5px",
                    fontWeight: 500,
                    "& .MuiSelect-select": {
                      py: 0,
                      px: 1,
                      display: "flex",
                      alignItems: "center"
                    }
                  }}
                  renderValue={() => `View Docs (${docList.length})`}
                >
                  <MenuItem disabled value="" sx={{ fontSize: "11px" }}>
                    Select Document to Open
                  </MenuItem>
                  {docList.map((url, idx) => (
                    <MenuItem key={idx} value={url} sx={{ fontSize: "11px" }}>
                      {getDocLabel(url, idx)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Typography sx={{ fontSize: "10px", color: "#64748b", fontStyle: "italic" }}>
                No Doc files
              </Typography>
            )}
          </Box>
        );
      }
    };

    const billingDetailsEditable = {
      header: "Billing Details",
      size: 220,
      Cell: ({ row }) => (
        <EditableBillingPair
          key={`${row.original.job_no}-billing_details`}
          row={row.original}
          noPathAgency="operations.0.statusDetails.0.billing_details.agency_bill_no"
          datePathAgency="operations.0.statusDetails.0.billing_details.agency_bill_date"
          noPathReimbursement="operations.0.statusDetails.0.billing_details.reimbursement_bill_no"
          datePathReimbursement="operations.0.statusDetails.0.billing_details.reimbursement_bill_date"
          initialAgencyNo={row.original.agency_bill_no}
          initialAgencyDate={row.original.agency_bill_date}
          initialReimbursementNo={row.original.reimbursement_bill_no}
          initialReimbursementDate={row.original.reimbursement_bill_date}
          onSuccess={() => fetchRows()}
        />
      ),
    };

    const commonStart = [
      {
        accessorKey: "job_no",
        header: "Job No",
        size: 130,
        Cell: ({ row }) => (
          <JobNoCell
            row={row.original}
            navigate={navigate}
            activeTab={activeTab}
            onSuccess={() => fetchRows()}
          />
        ),
      },
      {
        accessorKey: "exporter",
        header: "Exporter",
        size: 130,
        Cell: ({ row }) => (
          <Box sx={{ py: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '11px' }}>
              {row.original.exporter || "-"}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: '10px' }}>
              {row.original.consignment_type || "-"}
            </Typography>
          </Box>
        ),
      },
      {
        header: "Doc Info",
        size: 160,
        Cell: ({ row }) => {
          const r = row.original;
          const items = [
            r.sb_no ? { label: "SB", value: r.sb_no, date: r.sb_date } : null,
            r.hbl_no ? { label: "HBL", value: r.hbl_no, date: r.hbl_date } : null,
            r.mbl_no ? { label: "MBL", value: r.mbl_no, date: r.mbl_date } : null,
            r.booking_no ? { label: "BKG", value: r.booking_no, date: null } : null,
          ].filter(Boolean);

          if (!items.length) {
            return <Typography sx={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>-</Typography>;
          }

          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '3px', py: 0.3 }}>
              {items.map((item, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Typography sx={{
                    fontSize: '8.5px', fontWeight: 800, color: '#64748b',
                    letterSpacing: '0.4px', width: '26px', flexShrink: 0
                  }}>
                    {item.label}:
                  </Typography>
                  <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                    {item.value}
                    {item.date && (
                      <span style={{ color: '#64748b', fontWeight: 500, fontSize: '9px', marginLeft: '2px' }}>
                        ({formatDate(item.date).split(',')[0]})
                      </span>
                    )}
                  </Typography>
                  <IconButton
                    size="small"
                    sx={{ p: 0.1, opacity: 0.5, '&:hover': { opacity: 1 } }}
                    onClick={(e) => { e.stopPropagation(); copyText(item.value); }}
                    title={`Copy ${item.label} No`}
                  >
                    <ContentCopyIcon sx={{ fontSize: 9 }} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          );
        },
      },
      ...((activeTab === "billing-pending" || activeTab === "club-jobs") ? [billingDetailsEditable] : []),

      {
        header: "Queries",
        size: 60,
        Cell: ({ row }) => {
          const job = row.original;
          const getJobStatus = (jNo) => jobQueriesStatus[jNo] || {};

          // Collect parent and child job numbers
          const jobNos = [job.job_no];
          if (job.subRows && Array.isArray(job.subRows)) {
            job.subRows.forEach(child => {
              if (child.job_no) jobNos.push(child.job_no);
            });
          }

          // Combine statuses
          const status = { hasQueries: false, hasOpenQueries: false, hasUnseen: false };
          jobNos.forEach(jNo => {
            const js = getJobStatus(jNo);
            if (js.hasQueries) status.hasQueries = true;
            if (js.hasOpenQueries) status.hasOpenQueries = true;
            if (js.hasUnseen) status.hasUnseen = true;
          });

          const isDull = status.hasQueries && !status.hasOpenQueries;

          return (
            <Box sx={{ display: "flex", gap: 0.8, justifyContent: "center", alignItems: "center" }}>
              {/* RED - Raise Query */}
              <Tooltip title="Raise a query" arrow>
                <Box
                  onClick={(e) => {
                    e.stopPropagation();
                    setQueryDialogJob(job);
                    setQueryDialogOpen(true);
                  }}
                  sx={{
                    width: 14, height: 14, borderRadius: "50%",
                    backgroundColor: "#ef4444", cursor: "pointer",
                    border: "1.5px solid #dc2626",
                    opacity: isDull ? 0.5 : 1,
                    filter: isDull ? "grayscale(0.6)" : "none",
                    transition: "transform 0.1s",
                    "&:hover": { transform: "scale(1.2)" }
                  }}
                />
              </Tooltip>
              {/* YELLOW - View Queries/Replies */}
              {status.hasQueries && (
                <>
                  <Tooltip title="View queries & replies" arrow>
                    <Box
                      onClick={async (e) => {
                        e.stopPropagation();
                        setQueryChatJob(job);
                        setQueryChatOpen(true);
                        setQueryChatLoading(true);
                        try {
                          const queryJobNos = [job.job_no];
                          if (job.subRows && Array.isArray(job.subRows)) {
                            job.subRows.forEach(child => {
                              if (child.job_no) queryJobNos.push(child.job_no);
                            });
                          }
                          const [resp, clientResp] = await Promise.all([
                            axios.get(
                              `${import.meta.env.VITE_API_STRING}/queries`,
                              { params: { job_no: queryJobNos.join(",") } }
                            ),
                            axios.get(
                              `${import.meta.env.VITE_API_STRING}/client-queries`,
                              { params: { job_no: queryJobNos.join(",") } }
                            ).catch(() => ({ data: { queries: [] } }))
                          ]);
                          
                          const queriesData = resp.data?.data?.queries || resp.data?.data || [];
                          const clientQueriesFetched = clientResp.data?.queries || [];
                          setQueryChatData(queriesData);
                          setClientQueryChatData(clientQueriesFetched);
                          setActiveQueryIndex(0);
                          if (clientQueriesFetched.length > 0) {
                            setActiveChatTab("client");
                          } else if (queriesData.length > 0) {
                            setActiveChatTab("internal");
                          } else {
                            setActiveChatTab("client");
                          }

                          if (queriesData.length > 0) {
                            axios.put(`${import.meta.env.VITE_API_STRING}/queries/mark-seen`, {
                              queryIds: queriesData.map(q => q._id)
                            }).catch(console.error);
                          }
                          if (clientQueriesFetched.length > 0) {
                            axios.put(`${import.meta.env.VITE_API_STRING}/client-queries/mark-seen`, {
                              queryIds: clientQueriesFetched.map(q => q._id),
                              isClient: false
                            }).catch(console.error);
                          }
                            
                          setJobQueriesStatus(prev => {
                            const updated = { ...prev };
                            queryJobNos.forEach(jNo => {
                              if (updated[jNo]) {
                                updated[jNo] = { ...updated[jNo], hasUnseen: false };
                              }
                            });
                            return updated;
                          });
                        } catch (err) {
                          console.error(err);
                          setQueryChatData([]);
                          setClientQueryChatData([]);
                        } finally {
                          setQueryChatLoading(false);
                        }
                      }}
                      sx={{
                        width: 14, height: 14, borderRadius: "50%",
                        backgroundColor: "#f59e0b",
                        cursor: "pointer",
                        border: "1.5px solid #d97706",
                        position: "relative",
                        opacity: isDull ? 0.5 : 1,
                        filter: isDull ? "grayscale(0.6)" : "none",
                        transition: "transform 0.1s",
                        "&:hover": { transform: "scale(1.2)" }
                      }}
                    >
                      {status.hasUnseen && (
                        <Box sx={{
                          position: "absolute", top: -3, right: -3,
                          width: 6, height: 6, borderRadius: "50%",
                          backgroundColor: "#dc2626", border: "1px solid #fff"
                        }} />
                      )}
                    </Box>
                  </Tooltip>
                  {/* GREEN - Resolve */}
                  <Tooltip title="Mark queries resolved" arrow>
                    <Box
                      onClick={async (e) => {
                        e.stopPropagation();
                        const localUser = JSON.parse(localStorage.getItem("exim_user") || "{}");
                        
                        const queryJobNos = [job.job_no];
                        if (job.subRows && Array.isArray(job.subRows)) {
                          job.subRows.forEach(child => {
                            if (child.job_no) queryJobNos.push(child.job_no);
                          });
                        }

                        if (!window.confirm(`Mark all open queries for ${job.is_club_job_parent ? 'this club job' : job.job_no} as resolved?`)) return;
                        try {
                          const resp = await axios.get(
                            `${import.meta.env.VITE_API_STRING}/queries`,
                            { params: { job_no: queryJobNos.join(","), status: "open" } }
                          );
                          const openQueries = resp.data?.data?.queries || resp.data?.data || [];
                          if (openQueries.length === 0) {
                            alert("No open queries for this job.");
                            return;
                          }
                          await Promise.all(
                            openQueries.map(q =>
                              axios.put(`${import.meta.env.VITE_API_STRING}/queries/${q._id}/resolve`, {
                                resolvedBy: localUser.username || "unknown",
                                resolvedByName: localUser.fullName || localUser.username || "Unknown",
                                resolutionNote: "Resolved from billing table",
                              })
                            )
                          );
                          alert(`${openQueries.length} query(ies) resolved.`);
                          fetchRows();
                           
                          setJobQueriesStatus(prev => {
                            const updated = { ...prev };
                            queryJobNos.forEach(jNo => {
                              if (updated[jNo]) {
                                updated[jNo] = { ...updated[jNo], hasOpenQueries: false };
                              }
                            });
                            return updated;
                          });
                        } catch (err) {
                          console.error(err);
                          alert("Failed to resolve queries.");
                        }
                      }}
                      sx={{
                        width: 14, height: 14, borderRadius: "50%",
                        backgroundColor: "#22c55e", cursor: "pointer",
                        border: "1.5px solid #16a34a",
                        opacity: isDull ? 0.5 : 1,
                        filter: isDull ? "grayscale(0.6)" : "none",
                        transition: "transform 0.1s",
                        "&:hover": { transform: "scale(1.2)" }
                      }}
                    />
                  </Tooltip>
                </>
              )}
            </Box>
          );
        }
      },
    ];

    const commonEnd = [];

    if (activeTab === "export-completed-billing") {
      return [
        ...commonStart,
        {
          accessorKey: "invoice_numbers",
          header: "Invoices",
          size: 170,
          Cell: ({ cell }) => renderChipList(cell.getValue(), "primary", 2),
        },
        {
          accessorKey: "container_summary",
          header: "Containers",
          size: 220,
          Cell: ({ cell }) => renderChipList(cell.getValue(), "default", 2),
        },
        {
          header: "Billing Details",
          size: 200,
          Cell: ({ row }) => {
            const isFF = Boolean(row.original?.isFreightForwarding) ||
              String(row.original?.job_no || "").toUpperCase().startsWith("FF") ||
              String(row.original?.job_no || "").toUpperCase().includes("FF-") ||
              String(row.original?.job_no || "").toUpperCase().includes("/FF/") ||
              String(row.original?.job_type || "").toLowerCase().includes("freight") ||
              String(row.original?.detailedStatus || "").toLowerCase().includes("freight");

            return (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.8,
                  p: 0.8,
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  backgroundColor: '#f8fafc',
                  width: '240px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                  <Typography sx={{ width: '45px', fontSize: '9px', fontWeight: 800, color: '#475569', letterSpacing: '0.4px' }}>
                    {isFF ? 'BILL' : 'AGENCY'}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '11px', color: '#1e293b' }}>
                    {row.original.agency_bill_no || "-"}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ fontSize: '10px', ml: 'auto' }}>
                    {row.original.agency_bill_date ? formatDate(row.original.agency_bill_date).split(",")[0] : "-"}
                  </Typography>
                </Box>
                {!isFF && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                    <Typography sx={{ width: '45px', fontSize: '9px', fontWeight: 800, color: '#475569', letterSpacing: '0.4px' }}>
                      REIMB.
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '11px', color: '#1e293b' }}>
                      {row.original.reimbursement_bill_no || "-"}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: '10px', ml: 'auto' }}>
                      {row.original.reimbursement_bill_date ? formatDate(row.original.reimbursement_bill_date).split(",")[0] : "-"}
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          },
        },
        {
          accessorKey: "send_for_billing_date",
          header: "Sent to Billing Date",
          size: 110,
          Cell: ({ row }) => (
            <div style={{ fontWeight: "600", color: "#4b5563" }}>
              {formatDate(row.original.send_for_billing_date)}
            </div>
          ),
        },
        billingDocsCol,
        {
          accessorKey: "charge_heads",
          header: "Charge Heads",
          size: 110,
          Cell: ({ cell }) => renderChipList(cell.getValue(), "default", 2),
        },
        ...commonEnd,
      ];
    }

    const showSentToBillingDate = activeTab === "billing-pending" || activeTab === "club-jobs";

    const refLabel = showSentToBillingDate
      ? "Sent to Billing Date"
      : (workMode === "purchase-book" ? "Purchase Book No" : "Payment Request No");

    const refCol = {
      accessorKey: showSentToBillingDate
        ? "send_for_billing_date"
        : (workMode === "purchase-book" ? "purchase_book_nos" : "payment_request_nos"),
      header: refLabel,
      size: showSentToBillingDate ? 110 : 140,
      Cell: ({ row }) => {
        if (showSentToBillingDate) {
          const val = row.original.send_for_billing_date;
          return (
            <div style={{ fontWeight: "600", color: "#4b5563" }}>
              {formatDate(val)}
            </div>
          );
        }
        return (
          <RefCell
            row={row.original}
            workMode={workMode}
            activeTab={activeTab}
            onRefClick={(r, refNo) => {
              setSelectedRow(r);
              setSelectedRequestNo(refNo);
            }}
          />
        );
      },
    };

    const queriesIndex = commonStart.findIndex(c => c.header === "Queries");
    const insertIndex = queriesIndex !== -1 ? queriesIndex : commonStart.length;

    if (activeTab === "purchase-book-requested") {
      const result = [...commonStart];
      result.splice(insertIndex, 0, refCol); // Insert beside Queries
      result.splice(insertIndex + 1, 0, billingDocsCol); // Insert beside Queries
      return [...result, ...commonEnd];
    }

    const finalColumns = [...commonStart];
    finalColumns.splice(insertIndex, 0, refCol); // Insert beside Queries
    finalColumns.splice(insertIndex + 1, 0, billingDocsCol); // Insert beside Queries

    return [
      ...finalColumns,
      {
        accessorKey: "container_summary",
        header: "Container No",
        size: 140,
        Cell: ({ cell }) => renderChipList(cell.getValue(), "default", 2),
      },
      {
        accessorKey: "supplier_invoice_nos",
        header: workMode === "purchase-book" ? "Supplier Inv No" : "Invoice No",
        size: 110,
        Cell: ({ cell }) => renderChipList(cell.getValue(), "default", 1),
      },
      {
        accessorKey: "charge_heads",
        header: "Charges",
        size: 110,
        Cell: ({ cell }) => renderChipList(cell.getValue(), "default", 1),
      },
      {
        accessorKey: activeTab.includes("completed") ? "billing_date" : "handover_date",
        header: activeTab.includes("completed") ? "Completed On" : "Requested On",
        size: 90,
        Cell: ({ row }) =>
          formatDate(
            activeTab.includes("completed")
              ? row.original.billing_date || row.original.handover_date
              : row.original.handover_date || row.original.billing_date
          ),
      },
      ...commonEnd,
    ];
  }, [activeTab, navigate, workMode, jobQueriesStatus, fetchRows]);

  const exporterOptions = useMemo(
    () => [...new Set((exporters || []).map((item) => item.exporter).filter(Boolean))],
    [exporters]
  );

  return (
    <Box sx={s.wrapper}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          mb: 1.5,
          flexWrap: "wrap",
          borderBottom: "1px solid #e5e7eb",
          pb: 0.5
        }}
      >
        <Tabs
          value={tabIndex}
          onChange={(event, value) => {
            setTabIndex(value);
            setPage(1);
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 40,
            '& .MuiTabs-indicator': { backgroundColor: '#2563eb', height: 3 },
            '& .MuiTab-root': {
              fontSize: '12px',
              textTransform: 'none',
              fontWeight: 600,
              minHeight: 40,
              color: '#64748b',
              '&.Mui-selected': { color: '#2563eb' }
            }
          }}
        >
          {tabs.map((tab) => {
            const count = tabCounts[tab.key];
            const label = count !== undefined ? `${tab.label} (${count})` : tab.label;
            return <Tab key={tab.key} label={label} />;
          })}
        </Tabs>
 
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", fontSize: '11px', letterSpacing: '0.5px' }}>
            WORK MODE:
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={workMode}
            onChange={(event, value) => value && setWorkMode(value)}
            sx={{ height: 28, '& .MuiToggleButton-root': { py: 0, px: 2, fontSize: '10px', fontWeight: 700 } }}
          >
            <ToggleButton value="payment">PAYMENT</ToggleButton>
            <ToggleButton value="purchase-book">PURCHASE BOOK</ToggleButton>
          </ToggleButtonGroup>

          <Button
            variant="outlined"
            size="small"
            startIcon={<AssessmentIcon sx={{ fontSize: '16px' }} />}
            onClick={() => setReportsHubOpen(true)}
            sx={{
              fontWeight: 700,
              textTransform: "none",
              borderRadius: "4px",
              height: 28,
              fontSize: '11px',
              color: "#1a237e",
              borderColor: "#1a237e",
              "&:hover": { 
                borderColor: "#0d47a1", 
                backgroundColor: "rgba(26, 35, 126, 0.04)" 
              }
            }}
          >
            REPORTS HUB
          </Button>


        </Box>
      </Box>

      {activeTab === "cashflow" ? (
        <CashflowTracker mode="export" />
      ) : activeTab === "terminal-virtual-balance" ? (
        <VirtualBalanceList balanceType="terminal" />
      ) : activeTab === "cfs-virtual-balance" ? (
        <VirtualBalanceList balanceType="cfs" />
      ) : (
        <>
          <MaterialReactTable
            key={`${activeTab}-${workMode}`}
        columns={columns}
        data={rows}
        state={{ showProgressBars: loading, expanded: expandedRows }}
        onExpandedChange={setExpandedRows}
        enableExpanding={true}
        getSubRows={(row) => row.subRows}
        enableColumnActions={false}
        enableColumnFilters={false}
        enableDensityToggle={false}
        enableFullScreenToggle={false}
        enablePagination={false}
        enableStickyHeader
        initialState={{ density: "compact" }}
        muiTableContainerProps={{
          sx: {
            maxHeight: "72vh",
            border: "1px solid #cbd5e1",
            borderRadius: "4px",
            overflowX: "hidden"
          }
        }}
        displayColumnDefOptions={{
          'mrt-row-expand': {
            size: 10,
          }
        }}
        muiExpandButtonProps={{
          size: 'small',
          sx: {
            p: 0,
            minWidth: '18px',
            width: '18px',
            height: '18px',
            color: '#64748b',
            '&.Mui-disabled': { color: '#94a3b8', opacity: 0.7 },
            '& .MuiSvgIcon-root': { fontSize: '16px' },
          }
        }}
        // muiExpandAllButtonProps={{
        //   size: 'small',
        //   sx: {
        //     p: 0,
        //     minWidth: '18px',
        //     width: '18px',
        //     height: '18px',
        //     '& .MuiSvgIcon-root': { fontSize: '16px' },
        //        color: '#fff !important'
        //   }
        // }}
        muiTableHeadCellProps={{
          sx: {
            py: 0.8,
            px: 1,
            fontSize: '12px',
            fontWeight: 700,
            background: "linear-gradient(135deg, #2c5aa0 0%, #1e3a6f 100%)",
            color: "#fff",
            '& .Mui-TableHeadCell-Content': { justifyContent: 'space-between' },
            '& .Mui-TableHeadCell-Content-Labels': { color: '#fff' },
            '& .Mui-TableHeadCell-Content-Wrapper': { color: '#fff' },
            '& svg': { color: '#fff !important' }
          }
        }}
        muiTableBodyCellProps={{
          sx: {
            py: 1.2,
            px: 1,
            fontSize: '11.5px',
            borderBottom: '1px solid #f1f5f9',
            color: '#334155'
          }
        }}
        muiTableBodyRowProps={{
          sx: {
            '&:hover': {
              backgroundColor: '#f8fafc',
              transition: 'background-color 0.2s'
            }
          }
        }}
        renderTopToolbarCustomActions={() => (
          <Box sx={s.toolbar}>
            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: '80px', pr: 1.5, borderRight: '1px solid #e5e7eb' }}>
              <Typography variant="body2" sx={{ fontWeight: 800, color: '#1e293b', fontSize: '13px' }}>
                Jobs: {totalJobs}
              </Typography>
            </Box>

            <Autocomplete
              sx={{
                width: 220,
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: selectedExporter ? '#3b82f6' : '#cbd5e1'
                }
              }}
              freeSolo
              options={exporterOptions}
              value={selectedExporter || ""}
              onInputChange={(event, value) => {
                setSelectedExporter(value);
                setPage(1);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder="Filter Exporter"
                  InputProps={{
                    ...params.InputProps,
                    sx: {
                      height: 28,
                      fontSize: '11px',
                      backgroundColor: selectedExporter ? '#eff6ff' : '#f9fafb',
                      color: selectedExporter ? '#1e40af' : 'inherit',
                      fontWeight: selectedExporter ? 600 : 'normal'
                    }
                  }}
                />
              )}
            />

            <TextField
              select
              size="small"
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setPage(1);
              }}
              sx={{
                width: 110,
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: selectedBranch ? '#3b82f6' : '#cbd5e1'
                }
              }}
              InputProps={{
                sx: {
                  height: 28,
                  fontSize: '11px',
                  backgroundColor: selectedBranch ? '#eff6ff' : '#f9fafb',
                  color: selectedBranch ? '#1e40af' : 'inherit',
                  fontWeight: selectedBranch ? 600 : 'normal'
                }
              }}
              SelectProps={{ displayEmpty: true }}
            >
              <MenuItem value="" sx={{ fontSize: '11px' }}>All Branches</MenuItem>
              {["AMD", "GIM", "BRD", "HAZ", "COK", "GEN", "FREIGHT"].map((br) => (
                <MenuItem key={br} value={br} sx={{ fontSize: '11px' }}>
                  {br}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              value={selectedYear}
              onChange={(event) => {
                setSelectedYear(event.target.value);
                setPage(1);
              }}
              sx={{
                width: 90,
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: selectedYear !== getCurrentFinancialYear() ? '#3b82f6' : '#cbd5e1'
                }
              }}
              InputProps={{
                sx: {
                  height: 28,
                  fontSize: '11px',
                  backgroundColor: selectedYear !== getCurrentFinancialYear() ? '#eff6ff' : '#f9fafb',
                  color: selectedYear !== getCurrentFinancialYear() ? '#1e40af' : 'inherit',
                  fontWeight: selectedYear !== getCurrentFinancialYear() ? 600 : 'normal'
                }
              }}
            >
              {years.map((year) => (
                <MenuItem key={year} value={year} sx={{ fontSize: '11px' }}>
                  {year}
                </MenuItem>
              ))}
            </TextField>




            <TextField
              size="small"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search Job No, Ref..."
              sx={{
                flex: 1,
                minWidth: 200,
                maxWidth: 400,
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: searchQuery ? '#3b82f6' : '#cbd5e1'
                }
              }}
              InputProps={{
                sx: {
                  height: 28,
                  fontSize: '11px',
                  backgroundColor: searchQuery ? '#eff6ff' : '#f9fafb',
                  color: searchQuery ? '#1e40af' : 'inherit',
                  fontWeight: searchQuery ? 600 : 'normal'
                },
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 16, color: searchQuery ? '#1e40af' : '#64748b' }} />
                  </InputAdornment>
                ),
              }}
            />

            <Button
              variant="outlined"
              size="small"
              onClick={() => setDownloadExcelDialogOpen(true)}
              disabled={loading}
              sx={{
                borderRadius: '6px',
                textTransform: "none",
                fontWeight: 700,
                fontSize: '11px',
                height: 28,
                px: 1.5,
                color: "#16408f",
                borderColor: "#16408f",
                "&:hover": {
                  backgroundColor: "#eff6ff",
                  borderColor: "#16408f"
                }
              }}
              startIcon={<CloudDownloadIcon sx={{ fontSize: 14 }} />}
            >
              Download Excel
            </Button>

            <Box sx={{ position: "relative", ml: 'auto' }}>
              <Button
                variant="contained"
                size="small"
                onClick={() => {
                  setShowUnresolvedOnly((prev) => !prev);
                  setPage(1);
                }}
                sx={{
                  borderRadius: '6px',
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: '11px',
                  height: 28,
                  px: 2,
                  boxShadow: 'none',
                  backgroundColor: showUnresolvedOnly ? "#ef4444" : "#2563eb",
                  "&:hover": { backgroundColor: showUnresolvedOnly ? "#dc2626" : "#1d4ed8" }
                }}
              >
                {showUnresolvedOnly ? "Showing Pending" : "View Pending Queries"}
              </Button>
              {unresolvedCount > 0 && (
                <Badge
                  badgeContent={unresolvedCount}
                  color="error"
                  overlap="circular"
                  sx={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    '& .MuiBadge-badge': {
                      fontSize: '9px',
                      height: 16,
                      minWidth: 16,
                      border: '2px solid #fff'
                    }
                  }}
                />
              )}
            </Box>
          </Box>
        )}
      />

          <Box display="flex" justifyContent="center" alignItems="center" mt={2}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(event, value) => setPage(value)}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        </>
      )}

      <BillingDetailsDialog
        open={Boolean(selectedRow)}
        onClose={() => {
          setSelectedRow(null);
          setSelectedRequestNo(null);
        }}
        row={selectedRow}
        requestNo={selectedRequestNo}
        workMode={workMode}
        activeTab={activeTab}
        onSuccess={() => {
          setSelectedRow(null);
          setSelectedRequestNo(null);
          fetchRows();
        }}
      />

      <RaiseQueryDialog
        open={queryDialogOpen}
        onClose={() => {
          setQueryDialogOpen(false);
          setQueryDialogJob(null);
        }}
        job={queryDialogJob}
        onQueryRaised={() => {
          fetchRows();
        }}
      />

      {/* Query Chat Dialog (Yellow - view replies) */}
      {/* Query Chat Dialog */}
      <QueryChatDialog
        queryChatOpen={queryChatOpen}
        setQueryChatOpen={setQueryChatOpen}
        queryChatJob={queryChatJob}
        setQueryChatJob={setQueryChatJob}
        queryChatData={queryChatData}
        setQueryChatData={setQueryChatData}
        clientQueryChatData={clientQueryChatData}
        setClientQueryChatData={setClientQueryChatData}
        queryChatReply={queryChatReply}
        setQueryChatReply={setQueryChatReply}
        clientQueryChatReply={clientQueryChatReply}
        setClientQueryChatReply={setClientQueryChatReply}
        activeChatTab={activeChatTab}
        setActiveChatTab={setActiveChatTab}
        activeQueryIndex={activeQueryIndex}
        setActiveQueryIndex={setActiveQueryIndex}
        queryChatSending={queryChatSending}
        setQueryChatSending={setQueryChatSending}
        queryChatLoading={queryChatLoading}
        chatEndRef={chatEndRef}
        currentModuleForQueries={currentModuleForQueries}
        user={user}
      />

      <Dialog
        open={reportsHubOpen}
        onClose={() => setReportsHubOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: "12px", overflow: "hidden" } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb", py: 1.5, px: 3, background: "#19448aff", color: "#fff" }}>
          <Typography sx={{ fontWeight: 700, fontSize: "15px" }}>Billing Reports Hub</Typography>
          <IconButton onClick={() => setReportsHubOpen(false)} size="small" sx={{ color: "#fff" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <BillingReportsUtility isDialog={true} onClose={() => setReportsHubOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={downloadExcelDialogOpen}
        onClose={() => setDownloadExcelDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: "12px", overflow: "hidden" } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb", py: 1.5, px: 3, background: "#19448aff", color: "#fff" }}>
          <Typography sx={{ fontWeight: 700, fontSize: "15px" }}>Download Excel Options</Typography>
          <IconButton onClick={() => setDownloadExcelDialogOpen(false)} size="small" sx={{ color: "#fff" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="body2" sx={{ mb: 2, color: "#4b5563", fontSize: "12px", lineHeight: 1.5 }}>
            Select a <strong>"Sent for Billing"</strong> date range. If a completed job's sent-for-billing date falls within this range, it will be included in the Excel. Leave empty to download all matching jobs.
          </Typography>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              type="date"
              label="From Date"
              size="small"
              value={downloadStartDate}
              onChange={(e) => setDownloadStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              type="date"
              label="To Date"
              size="small"
              value={downloadEndDate}
              onChange={(e) => setDownloadEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, borderTop: "1px solid #e5e7eb", pt: 1.5, justifyContent: "space-between" }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setDownloadStartDate("");
              setDownloadEndDate("");
            }}
            sx={{ fontWeight: 600 }}
          >
            Reset
          </Button>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setDownloadExcelDialogOpen(false)}
              sx={{ fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              color="primary"
              onClick={() => {
                setDownloadExcelDialogOpen(false);
                handleDownloadExcel();
              }}
              sx={{ fontWeight: 600, background: "#19448aff" }}
            >
              Download
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ExportBillingPage;
