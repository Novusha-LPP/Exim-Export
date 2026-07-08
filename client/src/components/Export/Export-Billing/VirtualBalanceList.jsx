import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionIcon from "@mui/icons-material/Description";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import SearchIcon from "@mui/icons-material/Search";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { uploadFileToS3 } from "../../../utils/awsFileUpload";

const BANKS = [
  "HDFC BANK",
  "ICICI BANK",
  "SBI BANK",
  "KOTAK BANK",
  "IDBI BANK",
  "SOUTH INDIAN BANK",
  "AXIS BANK",
  "ODEX VAN",
  "CASH",
];

const s = {
  headerCell: {
    backgroundColor: "#1e3a8a",
    color: "#fff",
    fontWeight: 700,
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    py: 1.5,
  },
  card: {
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
    border: "1px solid #e2e8f0",
  },
  btnPrimary: {
    bgcolor: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
    color: "#fff",
    fontWeight: 700,
    textTransform: "none",
    boxShadow: "0 4px 10px rgba(30, 58, 138, 0.25)",
    transition: "all 0.2s ease-in-out",
    "&:hover": {
      transform: "translateY(-1px)",
      boxShadow: "0 6px 14px rgba(30, 58, 138, 0.35)",
    },
  },
};

export default function VirtualBalanceList({ isJobs = false }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [uploadingRowId, setUploadingRowId] = useState(null);
  const limit = 15;

  const [jobsList, setJobsList] = useState([]);
  const [selectedJobs, setSelectedJobs] = useState([]);
  const localUser = JSON.parse(localStorage.getItem("exim_user") || "{}");
  const isBillingTeam = localUser.role === "Billing" || localUser.role === "Admin";

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formValues, setFormValues] = useState({
    cfsName: "",
    jobNo: "",
    partyName: "",
    amountPaid: "",
    utr: "",
    fromBank: "",
    remarks: "",
    status: "unpaid",
    fileUrl: "",
  });
  const [cfsList, setCfsList] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [partyLoading, setPartyLoading] = useState(false);

  // Comparison Popup state
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareData, setCompareData] = useState(null);
  const [comparePbList, setComparePbList] = useState([]);
  const [compareLoading, setCompareLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch virtual balance entries
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_STRING}/virtual-balance`, {
        params: {
          page,
          limit,
          search: debouncedSearch,
          status: statusFilter,
          startDate,
          endDate,
        },
      });
      if (res.data.success) {
        setEntries(res.data.data.entries);
        setTotal(res.data.data.total);
        setTotalPages(res.data.data.totalPages);
      }
    } catch (err) {
      console.error("Error fetching virtual balances:", err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, startDate, endDate]);

  const handleInlineFileUpload = async (e, rowId) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingRowId(rowId);
    try {
      const result = await uploadFileToS3(file, "export_docs");
      const res = await axios.put(`${import.meta.env.VITE_API_STRING}/virtual-balance/${rowId}`, {
        fileUrl: result.Location,
      });
      if (res.data.success) {
        fetchEntries();
      }
    } catch (err) {
      console.error("Inline file upload error:", err);
      alert("Failed to upload file");
    } finally {
      setUploadingRowId(null);
    }
  };

  const handleExportExcel = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_STRING}/virtual-balance`, {
        params: {
          page: 1,
          limit: 1000000,
          search: debouncedSearch,
          status: statusFilter,
          startDate,
          endDate,
        },
      });
      if (res.data.success && Array.isArray(res.data.data.entries)) {
        const XLSX = await import("xlsx");
        
        const dataToExport = res.data.data.entries.map((row) => ({
          "Create Date": row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-IN") : "-",
          "Ref No": row.referenceNo || "",
          "Terminal Name": row.cfsName || "",
          "Job No": row.jobNo || "",
          "Exporter Name": row.partyName || "",
          "Opening Bal": row.openingBalance || 0,
          "Amt Paid": row.amountPaid || 0,
          "Available Bal": row.availableBalance || 0,
          "Spent Amt": row.spentAmount || 0,
          "Remaining Bal": row.remainingBalance || 0,
          "UTR": row.utr || "",
          "Paid From": row.fromBank || "",
          "Status": row.status ? row.status.toUpperCase() : "UNPAID",
          "Payment Date": row.paymentDate ? new Date(row.paymentDate).toLocaleDateString("en-IN") : "-",
          "Remarks": row.remarks || "",
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Virtual Balance");
        
        const maxLen = {};
        dataToExport.forEach((row) => {
          Object.keys(row).forEach((key) => {
            const val = String(row[key]);
            maxLen[key] = Math.max(maxLen[key] || 10, val.length);
          });
        });
        worksheet["!cols"] = Object.keys(maxLen).map((key) => ({ wch: maxLen[key] + 3 }));

        XLSX.writeFile(workbook, `Virtual_Balance_${new Date().toISOString().split("T")[0]}.xlsx`);
      }
    } catch (err) {
      console.error("Excel export error:", err);
      alert("Failed to export Excel");
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Fetch CFS list
  useEffect(() => {
    const fetchCfs = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_STRING}/terminalCodes`, {
          params: { limit: 1000 },
        });
        if (res.data.success && Array.isArray(res.data.data)) {
          setCfsList(res.data.data);
        }
      } catch (err) {
        console.error("Error fetching CFS list:", err);
      }
    };
    fetchCfs();
  }, []);

  const [jobSearch, setJobSearch] = useState("");
  const [jobsLoading, setJobsLoading] = useState(false);

  // Fetch Jobs list - server-side search as user types
  useEffect(() => {
    const controller = new AbortController();
    const fetchJobs = async () => {
      setJobsLoading(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_STRING}/virtual-balance/jobs`, {
          params: { search: jobSearch },
          signal: controller.signal,
        });
        if (res.data.success && Array.isArray(res.data.data)) {
          setJobsList(res.data.data);
        }
      } catch (err) {
        if (!axios.isCancel(err)) console.error("Error fetching jobs list:", err);
      } finally {
        setJobsLoading(false);
      }
    };
    const timer = setTimeout(fetchJobs, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [jobSearch]);


  // Handle jobNo blur to auto-fill exporter name
  const handleJobNoBlur = async () => {
    const jobNo = formValues.jobNo.trim();
    if (!jobNo) return;
    setPartyLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_STRING}/virtual-balance/job-details/${encodeURIComponent(jobNo)}`);
      if (res.data.success) {
        setFormValues((prev) => ({ ...prev, partyName: res.data.partyName }));
      }
    } catch (err) {
      console.error("Error looking up job:", err);
    } finally {
      setPartyLoading(false);
    }
  };

  // Toggle status
  const handleToggleStatus = async (row) => {
    const newStatus = row.status === "paid" ? "unpaid" : "paid";
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_STRING}/virtual-balance/${row._id}`, {
        status: newStatus,
      });
      if (res.data.success) {
        fetchEntries();
      }
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const result = await uploadFileToS3(file, "export_docs");
      setFormValues((prev) => ({ ...prev, fileUrl: result.Location }));
    } catch (err) {
      console.error("File upload error:", err);
      alert("Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  };

  // Delete virtual balance
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    try {
      const res = await axios.delete(`${import.meta.env.VITE_API_STRING}/virtual-balance/${id}`);
      if (res.data.success) {
        fetchEntries();
      }
    } catch (err) {
      console.error("Error deleting entry:", err);
    }
  };

  // Helper: fetch party name for a single job number
  const fetchPartyNameForJob = async (jobNo) => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_STRING}/virtual-balance/job-details/${encodeURIComponent(jobNo)}`
      );
      if (res.data.success && res.data.partyName) return res.data.partyName;
    } catch (err) {
      console.error("Party name lookup error:", err);
    }
    return "";
  };

  // Helper: rebuild partyName display string from selectedJobs array
  const buildPartyNameString = (jobs) => {
    const lines = jobs
      .filter((v) => v.partyName)
      .map((v) => `${v.jobNo}: ${v.partyName}`);
    return lines.join("\n");
  };

  // Open form
  const handleOpenForm = async (entry = null) => {
    if (entry) {
      setEditId(entry._id);
      setFormValues({
        cfsName: entry.cfsName,
        jobNo: entry.jobNo,
        partyName: entry.partyName || "",
        amountPaid: entry.amountPaid,
        utr: entry.utr || "",
        fromBank: entry.fromBank || "",
        remarks: entry.remarks || "",
        status: entry.status || "unpaid",
        fileUrl: entry.fileUrl || "",
      });

      // Parse jobNo string and fetch partyNames from server for each job
      const jobString = entry.jobNo || "";
      const jobNos = jobString.split(",").map((j) => j.trim()).filter(Boolean);
      const initialSelected = await Promise.all(
        jobNos.map(async (jobNo) => {
          const inList = jobsList.find((j) => j.jobNo === jobNo);
          const partyName = (inList && inList.partyName)
            ? inList.partyName
            : await fetchPartyNameForJob(jobNo);
          return { jobNo, partyName };
        })
      );
      setSelectedJobs(initialSelected);
      setFormValues((prev) => ({
        ...prev,
        partyName: buildPartyNameString(initialSelected),
      }));
    } else {
      setEditId(null);
      setFormValues({
        cfsName: "",
        jobNo: "",
        partyName: "",
        amountPaid: "",
        utr: "",
        fromBank: "",
        remarks: "",
        status: "unpaid",
        fileUrl: "",
      });
      setSelectedJobs([]);
    }
    setFormOpen(true);
  };

  // Save entry
  const handleSaveForm = async () => {
    const { cfsName, amountPaid } = formValues;
    if (!cfsName || !amountPaid) {
      alert("Please fill CFS Name and Amount Paid.");
      return;
    }

    const jobNoString = selectedJobs
      .map((j) => (typeof j === "string" ? j.trim().toUpperCase() : (j.jobNo || "").trim().toUpperCase()))
      .filter(Boolean)
      .join(", ");

    const payload = {
      ...formValues,
      jobNo: jobNoString,
    };

    try {
      if (editId) {
        await axios.put(`${import.meta.env.VITE_API_STRING}/virtual-balance/${editId}`, payload);
      } else {
        await axios.post(`${import.meta.env.VITE_API_STRING}/virtual-balance`, payload);
      }
      setFormOpen(false);
      fetchEntries();
    } catch (err) {
      console.error("Error saving virtual balance:", err);
    }
  };

  // Open comparison details
  const handleOpenCompare = async (entry) => {
    setCompareData(entry);
    setCompareOpen(true);
    setCompareLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_STRING}/virtual-balance/job-purchase-books`, {
        params: {
          jobNo: entry.jobNo,
          cfsName: entry.cfsName,
        },
      });
      if (res.data.success) {
        setComparePbList(res.data.data);
      }
    } catch (err) {
      console.error("Error loading comparison details:", err);
    } finally {
      setCompareLoading(false);
    }
  };

  const pbTotal = comparePbList.reduce((sum, item) => sum + (item.netAmount !== undefined && item.netAmount !== null ? item.netAmount : ((item.total || 0) - (item.tds || 0))), 0);

  return (
    <Box sx={{ p: 2, backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
      {/* Top Filter and Search Bar */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{
          mb: 3,
          p: 2,
          backgroundColor: "#fff",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          alignItems: "center",
        }}
      >
        <TextField
          size="small"
          placeholder="Search reference, job, cfs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: "text.secondary", mr: 1, fontSize: 18 }} />,
          }}
          sx={{ width: 220, "& .MuiOutlinedInput-root": { borderRadius: "6px" } }}
        />

        <FormControl size="small" sx={{ width: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            sx={{ borderRadius: "6px" }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="unpaid">Unpaid</MenuItem>
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="From Date"
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setPage(1);
          }}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 130, "& .MuiOutlinedInput-root": { borderRadius: "6px" } }}
        />

        <TextField
          size="small"
          label="To Date"
          type="date"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setPage(1);
          }}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 130, "& .MuiOutlinedInput-root": { borderRadius: "6px" } }}
        />

        <Stack direction="row" spacing={1.5} sx={{ ml: "auto !important" }}>
          <Button
            variant="outlined"
            onClick={handleExportExcel}
            sx={{
              color: "#1e3a8a",
              borderColor: "#1e3a8a",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: "6px",
              "&:hover": {
                borderColor: "#1d4ed8",
                backgroundColor: "#eff6ff",
              },
            }}
          >
            Export Excel
          </Button>

          <Button
            variant="contained"
            sx={{
              background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
              color: "#fff",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: "6px",
              boxShadow: "0 4px 10px rgba(30, 58, 138, 0.2)",
              "&:hover": {
                background: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)",
              },
            }}
            onClick={() => handleOpenForm()}
          >
            + Add Virtual Balance
          </Button>
        </Stack>
      </Stack>

      {/* Main Table */}
      <TableContainer
        sx={{
          bgcolor: "#fff",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
          border: "1px solid #e2e8f0",
          maxHeight: 650,
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={s.headerCell}>Create Date</TableCell>
              <TableCell sx={s.headerCell}>Ref No</TableCell>
              <TableCell sx={s.headerCell}>Terminal Name</TableCell>
              <TableCell sx={s.headerCell}>Job No</TableCell>
              <TableCell sx={s.headerCell}>Exporter Name</TableCell>
              <TableCell sx={s.headerCell}>Opening Bal</TableCell>
              <TableCell sx={s.headerCell}>Amt Paid</TableCell>
              <TableCell sx={s.headerCell}>Available Bal</TableCell>
              <TableCell sx={s.headerCell}>Spent Amt</TableCell>
              <TableCell sx={s.headerCell}>Remaining Bal</TableCell>
              <TableCell sx={s.headerCell}>UTR</TableCell>
              <TableCell sx={s.headerCell}>Paid From</TableCell>
              <TableCell sx={s.headerCell}>Status</TableCell>
              <TableCell sx={s.headerCell}>Payment Date</TableCell>
              <TableCell sx={s.headerCell}>Doc</TableCell>
              <TableCell sx={s.headerCell}>Remarks</TableCell>
              <TableCell sx={s.headerCell} align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={17} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} sx={{ color: "#1e3a8a" }} />
                  <Typography variant="body2" sx={{ mt: 1, color: "text.secondary", fontWeight: 500 }}>
                    Loading virtual balances...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={17} align="center" sx={{ py: 6, color: "text.secondary" }}>
                  No virtual balance entries found.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((row) => (
                <TableRow
                  key={row._id}
                  hover
                  sx={{
                    "&:hover": { backgroundColor: "#f8fafc" },
                    transition: "background-color 0.2s ease",
                  }}
                >
                  <TableCell sx={{ color: "#475569" }}>
                    {row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-IN") : "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="text"
                      onClick={() => handleOpenCompare(row)}
                      sx={{
                        p: 0,
                        minWidth: 0,
                        textTransform: "none",
                        fontWeight: 700,
                        color: "#2563eb",
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      {row.referenceNo}
                    </Button>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "#1e293b" }}>{row.cfsName}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#475569" }}>{row.jobNo}</TableCell>
                  <TableCell sx={{ color: "#475569", fontSize: "11.5px" }}>{row.partyName || "-"}</TableCell>
                  <TableCell sx={{ color: row.openingBalance < 0 ? "#dc2626" : "#16a34a", fontWeight: 700 }}>
                    ₹ {Number(row.openingBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, color: "#0f172a" }}>
                    ₹ {Number(row.amountPaid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell sx={{ color: row.availableBalance < 0 ? "#dc2626" : "#1e3a8a", fontWeight: 800 }}>
                    ₹ {Number(row.availableBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell sx={{ color: "#be123c", fontWeight: 700 }}>
                    ₹ {Number(row.spentAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell sx={{ color: row.remainingBalance < 0 ? "#dc2626" : "#15803d", fontWeight: 800 }}>
                    ₹ {Number(row.remainingBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell sx={{ fontFamily: "monospace", color: "#334155" }}>{row.utr || "-"}</TableCell>
                  <TableCell sx={{ color: "#64748b" }}>{row.fromBank || "-"}</TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Checkbox
                        size="small"
                        checked={row.status === "paid"}
                        onChange={() => handleToggleStatus(row)}
                        color="success"
                        sx={{ p: 0.5 }}
                      />
                      <Chip
                        label={row.status === "paid" ? "Paid" : "Unpaid"}
                        size="small"
                        icon={row.status === "paid" ? <CheckCircleOutlineIcon style={{ fontSize: 12 }} /> : <AccessTimeIcon style={{ fontSize: 12 }} />}
                        color={row.status === "paid" ? "success" : "warning"}
                        variant="outlined"
                        sx={{ fontSize: "10px", height: "20px", fontWeight: 700 }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ color: "#475569" }}>
                    {row.paymentDate ? new Date(row.paymentDate).toLocaleDateString("en-IN") : "-"}
                  </TableCell>
                  <TableCell>
                    {uploadingRowId === row._id ? (
                      <CircularProgress size={16} />
                    ) : (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {row.fileUrl ? (
                          <>
                            <Tooltip title="View Attachment" arrow>
                              <IconButton
                                size="small"
                                component="a"
                                href={row.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{
                                  color: "#1e3a8a",
                                  backgroundColor: "#eff6ff",
                                  "&:hover": { backgroundColor: "#dbeafe" },
                                }}
                              >
                                <DescriptionIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Change Attachment" arrow>
                              <IconButton
                                size="small"
                                component="label"
                                sx={{
                                  color: "#475569",
                                  backgroundColor: "#f1f5f9",
                                  "&:hover": { backgroundColor: "#e2e8f0" },
                                }}
                              >
                                <CloudUploadIcon sx={{ fontSize: 14 }} />
                                <input
                                  type="file"
                                  hidden
                                  onChange={(e) => handleInlineFileUpload(e, row._id)}
                                />
                              </IconButton>
                            </Tooltip>
                          </>
                        ) : (
                          <Tooltip title="Upload Document" arrow>
                            <IconButton
                              size="small"
                              component="label"
                              sx={{
                                color: "#1e3a8a",
                                backgroundColor: "#eff6ff",
                                "&:hover": { backgroundColor: "#dbeafe" },
                              }}
                            >
                              <CloudUploadIcon sx={{ fontSize: 15 }} />
                              <input
                                type="file"
                                hidden
                                onChange={(e) => handleInlineFileUpload(e, row._id)}
                              />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    )}
                  </TableCell>
                  <TableCell
                    sx={{
                      maxWidth: 150,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "#64748b",
                    }}
                  >
                    {row.remarks || "-"}
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenForm(row)}
                        sx={{ color: "#4f46e5", "&:hover": { backgroundColor: "#eceff1" } }}
                      >
                        <EditIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                      {isBillingTeam && (
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(row._id)}
                          sx={{ color: "#dc2626", "&:hover": { backgroundColor: "#fee2e2" } }}
                        >
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {totalPages > 1 && (
        <Stack direction="row" justifyContent="center" sx={{ mt: 3 }}>
          <Pagination count={totalPages} page={page} onChange={(e, val) => setPage(val)} color="primary" />
        </Stack>
      )}

      {/* Add / Edit Dialog */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "12px" } }}
      >
        <DialogTitle sx={{ bgcolor: "#1e3a8a", color: "#fff", fontWeight: 700, px: 3, py: 2 }}>
          {editId ? "Edit Virtual Balance Entry" : "Create Virtual Balance Entry"}
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 2 }}>
          <Grid container spacing={2.5} sx={{ pt: 2 }}>
            <Grid item xs={12}>
              <Autocomplete
                size="small"
                options={cfsList.map((cfs) => cfs.name)}
                value={formValues.cfsName || null}
                onChange={(event, newValue) => {
                  setFormValues((prev) => ({ ...prev, cfsName: newValue || "" }));
                }}
                renderInput={(params) => <TextField {...params} label="CFS (Terminal) *" />}
                ListboxProps={{ style: { maxHeight: "250px" } }}
              />
            </Grid>

            <Grid item xs={12}>
              <Autocomplete
                multiple
                freeSolo
                size="small"
                loading={jobsLoading}
                options={jobsList}
                filterOptions={(x) => x}
                getOptionLabel={(option) => {
                  if (typeof option === "string") return option;
                  return option.jobNo || "";
                }}
                renderOption={(props, option) => (
                  <li {...props} key={typeof option === "string" ? option : option.jobNo}>
                    <span style={{ fontWeight: 700 }}>{typeof option === "string" ? option : option.jobNo}</span>
                    {typeof option !== "string" && option.partyName && (
                      <span style={{ marginLeft: 8, color: "#64748b", fontSize: "11px" }}>— {option.partyName}</span>
                    )}
                  </li>
                )}
                isOptionEqualToValue={(option, value) => {
                  const optJobNo = typeof option === "string" ? option : option.jobNo;
                  const valJobNo = typeof value === "string" ? value : value.jobNo;
                  return optJobNo === valJobNo;
                }}
                value={selectedJobs}
                onInputChange={(event, inputVal, reason) => {
                  if (reason === "input") setJobSearch(inputVal);
                }}
                onChange={async (event, newValue) => {
                  const updatedValue = await Promise.all(
                    newValue.map(async (item) => {
                      const jobNo = typeof item === "string"
                        ? item.trim().toUpperCase()
                        : (item.jobNo || "").trim().toUpperCase();

                      if (!jobNo) return null;

                      // If already has partyName, keep it
                      const existingPartyName = typeof item !== "string" ? item.partyName : "";
                      if (existingPartyName) return { jobNo, partyName: existingPartyName };

                      // Try jobsList cache first
                      const inList = jobsList.find((j) => j.jobNo === jobNo);
                      if (inList && inList.partyName) return { jobNo, partyName: inList.partyName };

                      // Fallback: fetch from server
                      const partyName = await fetchPartyNameForJob(jobNo);
                      const resolved = { jobNo, partyName };
                      if (partyName) setJobsList((prev) => [...prev, resolved]);
                      return resolved;
                    })
                  );
                  const filtered = updatedValue.filter(Boolean);
                  setSelectedJobs(filtered);
                  setFormValues((prev) => ({
                    ...prev,
                    partyName: buildPartyNameString(filtered),
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Job Number(s)"
                    placeholder="Type to search..."
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {jobsLoading && <CircularProgress size={14} />}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                ListboxProps={{ style: { maxHeight: "220px" } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                size="small"
                fullWidth
                disabled
                multiline
                minRows={1}
                maxRows={4}
                label="Exporter Name(s)"
                value={formValues.partyName}
                helperText={selectedJobs.length > 1 ? `${selectedJobs.length} jobs selected` : ""}
                InputProps={{
                  endAdornment: partyLoading && <CircularProgress size={16} />,
                }}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                size="small"
                fullWidth
                type="number"
                label="Amount Paid *"
                value={formValues.amountPaid}
                onChange={(e) => setFormValues((p) => ({ ...p, amountPaid: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                size="small"
                fullWidth
                label="UTR Number"
                value={formValues.utr}
                onChange={(e) => setFormValues((p) => ({ ...p, utr: e.target.value }))}
              />
            </Grid>

            <Grid item xs={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>Paid From Bank</InputLabel>
                <Select
                  value={formValues.fromBank}
                  label="Paid From Bank"
                  onChange={(e) => setFormValues((p) => ({ ...p, fromBank: e.target.value }))}
                >
                  {BANKS.map((b) => (
                    <MenuItem key={b} value={b}>
                      {b}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formValues.status}
                  label="Status"
                  onChange={(e) => setFormValues((p) => ({ ...p, status: e.target.value }))}
                >
                  <MenuItem value="unpaid">Unpaid</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                size="small"
                fullWidth
                multiline
                rows={2}
                label="Remarks"
                value={formValues.remarks}
                onChange={(e) => setFormValues((p) => ({ ...p, remarks: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                  disabled={uploadingFile}
                  sx={{ textTransform: "none", fontWeight: 600, borderColor: "#1e3a8a", color: "#1e3a8a" }}
                >
                  {uploadingFile ? "Uploading..." : "Upload Receipt / Document"}
                  <input type="file" hidden onChange={handleFileUpload} />
                </Button>
                {formValues.fileUrl && (
                  <Chip
                    icon={<AttachFileIcon />}
                    label="Attachment Attached"
                    color="success"
                    variant="outlined"
                    size="small"
                    onDelete={() => setFormValues((p) => ({ ...p, fileUrl: "" }))}
                  />
                )}
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setFormOpen(false)} variant="outlined" sx={{ textTransform: "none", borderRadius: "6px" }}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveForm}
            variant="contained"
            sx={{
              textTransform: "none",
              borderRadius: "6px",
              bgcolor: "#1e3a8a",
              "&:hover": { bgcolor: "#1d4ed8" },
            }}
          >
            Save Entry
          </Button>
        </DialogActions>
      </Dialog>

      {/* Comparison Dashboard Popup */}
      <Dialog
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: "16px" } }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)",
            color: "#fff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 3,
            py: 2.5,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AccountBalanceWalletIcon />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Virtual Balance Comparison Dashboard
            </Typography>
          </Stack>
          <IconButton size="small" onClick={() => setCompareOpen(false)} sx={{ color: "#fff" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {compareData && (
            <Box>
              {/* Summary Cards */}
              <Grid container spacing={3} sx={{ my: 1 }}>
                <Grid item xs={12} md={4}>
                  <Card
                    sx={{
                      bgcolor: "#f0f4ff",
                      border: "1px solid #dbeafe",
                      borderRadius: "12px",
                      boxShadow: "none",
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="overline" sx={{ fontWeight: 800, color: "#1e40af", display: "block", mb: 0.5 }}>
                        Deposit Breakdown
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#475569", display: "flex", justifyContent: "space-between" }}>
                        <span>Opening Bal:</span> <strong>₹ {Number(compareData.openingBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#475569", display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                        <span>Amt Paid:</span> <strong>+ ₹ {Number(compareData.amountPaid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#1e3a8a", display: "flex", justifyContent: "space-between" }}>
                        <span>Available Bal:</span> <span>₹ {Number(compareData.availableBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card
                    sx={{
                      bgcolor: "#fff1f2",
                      border: "1px solid #ffe4e6",
                      borderRadius: "12px",
                      boxShadow: "none",
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="overline" sx={{ fontWeight: 800, color: "#be123c", display: "block", mb: 0.5 }}>
                        Purchase Books Filed
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: "#9f1239" }}>
                        ₹ {Number(compareData.spentAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748b", display: "block", mt: 1 }}>
                        Supplier: {compareData.cfsName}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  {(() => {
                    const diff = Number(compareData.remainingBalance || 0);
                    const isPositive = diff >= 0;
                    return (
                      <Card
                        sx={{
                          bgcolor: isPositive ? "#f0fdf4" : "#fff7ed",
                          border: isPositive ? "1px solid #dcfce7" : "1px solid #ffedd5",
                          borderRadius: "12px",
                          boxShadow: "none",
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Typography
                            variant="overline"
                            sx={{ fontWeight: 800, color: isPositive ? "#15803d" : "#c2410c", display: "block", mb: 0.5 }}
                          >
                            Remaining Balance
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 800, color: isPositive ? "#166534" : "#9a3412" }}>
                            ₹ {Number(diff).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </Typography>
                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
                            {isPositive ? (
                              <CheckCircleIcon sx={{ fontSize: 14, color: "#16a34a" }} />
                            ) : (
                              <CancelIcon sx={{ fontSize: 14, color: "#dc2626" }} />
                            )}
                            <Typography variant="caption" sx={{ fontWeight: 700, color: isPositive ? "#15803d" : "#c2410c" }}>
                              {isPositive ? "Surplus Deposit" : "Limit Exceeded"}
                            </Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </Grid>
              </Grid>

              {/* Progress Utilization Bar */}
              {compareData.availableBalance !== 0 && (
                <Box sx={{ my: 3, p: 2, bgcolor: "#f8fafc", borderRadius: "10px", border: "1px solid #f1f5f9" }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: "#475569" }}>
                      Deposit Utilization Progress
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: "#1e3a8a" }}>
                      {Math.min(100, Math.round(((compareData.spentAmount || 0) / (compareData.availableBalance || 1)) * 100))}% Utilized
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, Math.max(0, ((compareData.spentAmount || 0) / (compareData.availableBalance || 1)) * 100))}
                    color={(compareData.spentAmount || 0) > (compareData.availableBalance || 0) ? "error" : "primary"}
                    sx={{ height: 10, borderRadius: 5, backgroundColor: "#e2e8f0" }}
                  />
                </Box>
              )}

              <Divider sx={{ my: 3 }} />

              {/* Purchase Book Details Table */}
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: "#334155" }}>
                Matching Purchase Book Details (Job: {compareData.jobNo})
              </Typography>

              {compareLoading ? (
                <Box sx={{ p: 4, textAlign: "center" }}>
                  <CircularProgress size={24} sx={{ color: "#1e3a8a" }} />
                  <Typography variant="body2" sx={{ mt: 1 }}>Loading purchase books...</Typography>
                </Box>
              ) : comparePbList.length === 0 ? (
                <Box
                  sx={{
                    p: 4,
                    bgcolor: "#f8fafc",
                    borderRadius: "10px",
                    textAlign: "center",
                    border: "1px dashed #cbd5e1",
                  }}
                >
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
                    No purchase book charges filed under supplier "{compareData.cfsName}" for this job.
                  </Typography>
                </Box>
              ) : (
                <TableContainer
                  sx={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                    maxHeight: 250,
                  }}
                >
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ bgcolor: "#f1f5f9", fontWeight: 700, fontSize: "11.5px" }}>Entry No</TableCell>
                        <TableCell sx={{ bgcolor: "#f1f5f9", fontWeight: 700, fontSize: "11.5px" }}>Supplier Inv No & Date</TableCell>
                        <TableCell sx={{ bgcolor: "#f1f5f9", fontWeight: 700, fontSize: "11.5px" }}>Charge Category</TableCell>
                        <TableCell sx={{ bgcolor: "#f1f5f9", fontWeight: 700, fontSize: "11.5px" }}>Taxable Value</TableCell>
                        <TableCell sx={{ bgcolor: "#f1f5f9", fontWeight: 700, fontSize: "11.5px" }}>GST</TableCell>
                        <TableCell sx={{ bgcolor: "#f1f5f9", fontWeight: 700, fontSize: "11.5px" }}>TDS</TableCell>
                        <TableCell sx={{ bgcolor: "#f1f5f9", fontWeight: 700, fontSize: "11.5px" }}>Net Payable</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {comparePbList.map((pb) => {
                        const gstSum = (pb.cgstAmt || 0) + (pb.sgstAmt || 0) + (pb.igstAmt || 0);
                        return (
                          <TableRow key={pb._id} hover>
                            <TableCell sx={{ fontWeight: 600, color: "#1e3a8a" }}>{pb.entryNo}</TableCell>
                            <TableCell>{pb.supplierInvNo || "-"} / {pb.supplierInvDate || "-"}</TableCell>
                            <TableCell>
                              <Chip
                                label={pb.chargeHeadCategory || "N/A"}
                                size="small"
                                sx={{ height: 18, fontSize: 10 }}
                              />
                            </TableCell>
                            <TableCell>₹ {Number(pb.taxableValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell>₹ {Number(gstSum).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell sx={{ color: "#be123c" }}>₹ -{Number(pb.tds || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell sx={{ fontWeight: 750 }}>₹ {Number(pb.netAmount !== undefined && pb.netAmount !== null ? pb.netAmount : ((pb.total || 0) - (pb.tds || 0))).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setCompareOpen(false)}
            variant="contained"
            sx={{
              textTransform: "none",
              borderRadius: "6px",
              bgcolor: "#1e3a8a",
              "&:hover": { bgcolor: "#1d4ed8" },
            }}
          >
            Close Dashboard
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
