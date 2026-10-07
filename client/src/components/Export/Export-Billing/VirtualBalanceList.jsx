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
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Pagination,
  Radio,
  RadioGroup,
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
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { getTradeApis } from "../../utils/tradeScopeUtil";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { uploadFileToS3 } from "../../utils/awsFileUpload";

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
};

export default function VirtualBalanceList({ isJobs = false, balanceType = "terminal" }) {
  const isCfsBalance = balanceType === "cfs";
  const balanceApi = isCfsBalance ? "cfs-virtual-balance" : "virtual-balance";
  const directoryApi = isCfsBalance ? "get-cfs-directory-list" : "get-empty-yard-directory-list";
  const balanceLabel = isCfsBalance ? "CFS-SFSA Virtual Balance" : "Terminal + Empty-Yards Virtual Balance";
  const holderLabel = isCfsBalance ? "CFS-SFSA" : "Terminal + Empty Yard";
  const [entries, setEntries] = useState([]);

  // Trade Scope: "import" | "export" | "both"
  const [tradeScope, setTradeScope] = useState(
    () => sessionStorage.getItem(`vb_trade_scope_${balanceType}`) || "import"
  );

  useEffect(() => {
    sessionStorage.setItem(`vb_trade_scope_${balanceType}`, tradeScope);
  }, [tradeScope, balanceType]);

  const { importApi, exportApi } = React.useMemo(() => {
    return getTradeApis(process.env.REACT_APP_API_STRING, true);
  }, []);
  const apiBase = tradeScope === "export" ? exportApi : importApi;
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState(
    () => sessionStorage.getItem("ib_vb_search") || ""
  );
  const [statusFilter, setStatusFilter] = useState(
    () => sessionStorage.getItem("ib_vb_status") || ""
  );
  const [startDate, setStartDate] = useState(
    () => sessionStorage.getItem("ib_vb_startDate") || ""
  );
  const [endDate, setEndDate] = useState(
    () => sessionStorage.getItem("ib_vb_endDate") || ""
  );
  const [page, setPage] = useState(
    () => Number(sessionStorage.getItem("ib_vb_page")) || 1
  );

  const [totalPages, setTotalPages] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [uploadingRowId, setUploadingRowId] = useState(null);
  const limit = 15;

  // Persist filter states to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("ib_vb_search", search);
  }, [search]);

  useEffect(() => {
    sessionStorage.setItem("ib_vb_status", statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    sessionStorage.setItem("ib_vb_startDate", startDate || "");
  }, [startDate]);

  useEffect(() => {
    sessionStorage.setItem("ib_vb_endDate", endDate || "");
  }, [endDate]);

  useEffect(() => {
    sessionStorage.setItem("ib_vb_page", page.toString());
  }, [page]);

  const [jobsList, setJobsList] = useState([]);
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [jobSearch, setJobSearch] = useState("");
  const [jobsLoading, setJobsLoading] = useState(false);
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
    tradeType: "IMPORT",
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
  const isFirstSearch = React.useRef(true);
  useEffect(() => {
    if (isFirstSearch.current) {
      isFirstSearch.current = false;
      return;
    }
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
      if (tradeScope === "both") {
        const [resImport, resExport] = await Promise.allSettled([
          axios.get(`${importApi}/${balanceApi}`, {
            params: {
              page: 1,
              limit: 1000,
              search: debouncedSearch,
              status: statusFilter,
              startDate,
              endDate,
            },
          }),
          axios.get(`${exportApi}/${balanceApi}`, {
            params: {
              page: 1,
              limit: 1000,
              search: debouncedSearch,
              status: statusFilter,
              startDate,
              endDate,
            },
          }),
        ]);

        const impRaw = resImport.status === "fulfilled" && resImport.value.data?.success ? resImport.value.data.data : null;
        const expRaw = resExport.status === "fulfilled" && resExport.value.data?.success ? resExport.value.data.data : null;

        const impEntries = (Array.isArray(impRaw) ? impRaw : (impRaw?.entries || [])).map((e) => ({ ...e, tradeType: "IMPORT" }));
        const expEntries = (Array.isArray(expRaw) ? expRaw : (expRaw?.entries || [])).map((e) => ({ ...e, tradeType: "EXPORT" }));

        const combined = [...impEntries, ...expEntries].sort(
          (a, b) => new Date(b.createdAt || b.paymentDate || 0) - new Date(a.createdAt || a.paymentDate || 0)
        );

        const totalCount = combined.length;
        const totalP = Math.max(1, Math.ceil(totalCount / limit));
        const pageEntries = combined.slice((page - 1) * limit, page * limit);

        setEntries(pageEntries);
        setTotal(totalCount);
        setTotalPages(totalP);
      } else {
        const targetApi = tradeScope === "export" ? exportApi : importApi;
        const currentTrade = tradeScope === "export" ? "EXPORT" : "IMPORT";
        const res = await axios.get(`${targetApi}/${balanceApi}`, {
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
          const rawData = res.data.data;
          const entriesData = (Array.isArray(rawData) ? rawData : (rawData?.entries || [])).map((e) => ({
            ...e,
            tradeType: e.tradeType || currentTrade,
          }));
          const totalCount = res.data.pagination?.totalRecords ?? rawData?.total ?? entriesData.length;
          const totalP = res.data.pagination?.totalPages ?? rawData?.totalPages ?? 1;

          setEntries(entriesData);
          setTotal(totalCount);
          setTotalPages(totalP);
        }
      }
    } catch (err) {
      console.error("Error fetching virtual balances:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter, startDate, endDate, balanceApi, tradeScope, importApi, exportApi]);

  const handleInlineFileUpload = async (e, rowId) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingRowId(rowId);
    try {
      const result = await uploadFileToS3(file, "import_docs");
      const targetEntry = entries.find((e) => e._id === rowId);
      const targetApi = targetEntry?.tradeType === "EXPORT" ? exportApi : importApi;
      const res = await axios.put(`${targetApi}/${balanceApi}/${rowId}`, {
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
      let exportRows = [];
      const XLSX = await import("xlsx");

      if (tradeScope === "both") {
        const [resImport, resExport] = await Promise.allSettled([
          axios.get(`${importApi}/${balanceApi}`, {
            params: { page: 1, limit: 1000000, search: debouncedSearch, status: statusFilter, startDate, endDate },
          }),
          axios.get(`${exportApi}/${balanceApi}`, {
            params: { page: 1, limit: 1000000, search: debouncedSearch, status: statusFilter, startDate, endDate },
          }),
        ]);
        const impRaw = resImport.status === "fulfilled" && resImport.value.data?.success ? resImport.value.data.data : null;
        const expRaw = resExport.status === "fulfilled" && resExport.value.data?.success ? resExport.value.data.data : null;
        const impEntries = (Array.isArray(impRaw) ? impRaw : (impRaw?.entries || [])).map((e) => ({ ...e, tradeType: "IMPORT" }));
        const expEntries = (Array.isArray(expRaw) ? expRaw : (expRaw?.entries || [])).map((e) => ({ ...e, tradeType: "EXPORT" }));
        exportRows = [...impEntries, ...expEntries].sort(
          (a, b) => new Date(b.createdAt || b.paymentDate || 0) - new Date(a.createdAt || a.paymentDate || 0)
        );
      } else {
        const targetApi = tradeScope === "export" ? exportApi : importApi;
        const res = await axios.get(`${targetApi}/${balanceApi}`, {
          params: { page: 1, limit: 1000000, search: debouncedSearch, status: statusFilter, startDate, endDate },
        });
        if (res.data.success) {
          const rawData = res.data.data;
          exportRows = (Array.isArray(rawData) ? rawData : (rawData?.entries || [])).map((e) => ({
            ...e,
            tradeType: tradeScope.toUpperCase(),
          }));
        }
      }

      if (exportRows.length > 0) {
        const dataToExport = exportRows.map((row) => ({
          "TRADE": row.tradeType || (tradeScope === "export" ? "EXPORT" : "IMPORT"),
          "Create Date": row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-IN") : "-",
          "Ref No": row.referenceNo || "",
          [`${holderLabel} Name`]: row.cfsName || "",
          "Job No": row.jobNo || "",
          "Importer / Exporter Name": cleanPartyName(row.partyName) || "",
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
        XLSX.utils.book_append_sheet(workbook, worksheet, balanceLabel);
        
        const maxLen = {};
        dataToExport.forEach((row) => {
          Object.keys(row).forEach((key) => {
            const val = String(row[key]);
            maxLen[key] = Math.max(maxLen[key] || 10, val.length);
          });
        });
        worksheet["!cols"] = Object.keys(maxLen).map((key) => ({ wch: maxLen[key] + 3 }));

        XLSX.writeFile(workbook, `${balanceLabel.replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`);
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
        if (isCfsBalance) {
          const res = await axios.get(`${importApi}/${directoryApi}`);
          if (Array.isArray(res.data)) {
            setCfsList(res.data.map((i) => ({ ...i, directorySource: "CFS" })));
          }
        } else {
          // Fetch BOTH Terminal Directory (/get-cfs-list) AND Empty Yard Directory (/get-empty-yard-directory-list)
          const [termRes, eyRes] = await Promise.all([
            axios.get(`${importApi}/get-cfs-list`).catch(() => ({ data: [] })),
            axios.get(`${importApi}/get-empty-yard-directory-list`).catch(() => ({ data: [] })),
          ]);
          const termData = Array.isArray(termRes.data)
            ? termRes.data.map((i) => ({ ...i, directorySource: "Terminal" }))
            : [];
          const eyData = Array.isArray(eyRes.data)
            ? eyRes.data.map((i) => ({ ...i, directorySource: "Empty Yard" }))
            : [];

          const mergedMap = new Map();
          [...eyData, ...termData].forEach((item) => {
            const key = (item.name || "").trim().toUpperCase();
            if (key && !mergedMap.has(key)) {
              mergedMap.set(key, item);
            }
          });
          const mergedList = Array.from(mergedMap.values()).sort((a, b) =>
            (a.name || "").localeCompare(b.name || "")
          );
          setCfsList(mergedList);
        }
        // Directory loaded successfully


      } catch (err) {
        console.error("Error fetching CFS list:", err);
      }
    };
    fetchCfs();
  }, [isCfsBalance, directoryApi, importApi]);

  const activeJobsApi = formOpen
    ? ((formValues.tradeType || "").toUpperCase() === "EXPORT" ? exportApi : importApi)
    : apiBase;

  // Fetch Jobs list - server-side search as user types
  useEffect(() => {
    const controller = new AbortController();
    const fetchJobs = async () => {
      setJobsLoading(true);
      try {
        const res = await axios.get(`${activeJobsApi}/${balanceApi}/jobs`, {
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
  }, [jobSearch, balanceApi, activeJobsApi]);

  // Handle jobNo blur to auto-fill exporter name
  const handleJobNoBlur = async () => {
    const jobNo = formValues.jobNo.trim();
    if (!jobNo) return;
    setPartyLoading(true);
    try {
      const lookupApi = formValues.tradeType === "EXPORT" ? exportApi : (tradeScope === "export" ? exportApi : importApi);
      const res = await axios.get(`${lookupApi}/${balanceApi}/job-details/${encodeURIComponent(jobNo)}`);
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
      const targetApi = (row.tradeType === "EXPORT" ? exportApi : importApi) || apiBase;
      const res = await axios.put(`${targetApi}/${balanceApi}/${row._id}`, {
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
      const result = await uploadFileToS3(file, "import_docs");
      setFormValues((prev) => ({ ...prev, fileUrl: result.Location }));
    } catch (err) {
      console.error("File upload error:", err);
      alert("Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  };

  // Delete virtual balance
  const handleDelete = async (id, rowTrade) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    try {
      const targetApi = (rowTrade || "").toUpperCase() === "EXPORT" ? exportApi : importApi;
      const res = await axios.delete(`${targetApi}/${balanceApi}/${id}`);
      if (res.data.success) {
        fetchEntries();
      }
    } catch (err) {
      console.error("Error deleting entry:", err);
    }
  };

  // Helper: fetch job details (partyName, branchCode, customHouse, mode) for a single job number
  const fetchJobDetails = async (jobNo, entryTrade) => {
    try {
      const targetApi = (entryTrade === "EXPORT" ? exportApi : importApi) || apiBase;
      const res = await axios.get(
        `${targetApi}/${balanceApi}/job-details/${encodeURIComponent(jobNo)}`
      );
      if (res.data.success) {
        return {
          jobNo,
          partyName: res.data.partyName || "",
          branchCode: res.data.branchCode || "",
          customHouse: res.data.customHouse || "",
          mode: res.data.mode || "",
        };
      }
    } catch (err) {
      console.error("Job details lookup error:", err);
    }
    return { jobNo, partyName: "", branchCode: "", customHouse: "", mode: "" };
  };

  // Helper: sanitize partyName to remove any "JOB_NO: " prefixes and deduplicate
  const cleanPartyName = (partyName) => {
    if (!partyName || typeof partyName !== "string") return "";
    const lines = partyName
      .split(/[\r\n]+/)
      .map((line) => {
        const trimmed = line.trim();
        const colonIdx = trimmed.indexOf(":");
        if (colonIdx !== -1) {
          return trimmed.slice(colonIdx + 1).trim();
        }
        return trimmed;
      })
      .filter(Boolean);
    return [...new Set(lines)].join("\n");
  };

  // Helper: rebuild partyName display string from selectedJobs array (unique clean party names only)
  const buildPartyNameString = (jobs) => {
    const names = jobs
      .map((v) => cleanPartyName(v.partyName))
      .filter(Boolean);
    return [...new Set(names)].join("\n");
  };

  // Open form
  const handleOpenForm = async (entry = null) => {
    if (entry) {
      setEditId(entry._id);
      const entryTrade = (entry.tradeType || (tradeScope === "export" ? "EXPORT" : "IMPORT")).toUpperCase();
      setFormValues({
        cfsName: entry.cfsName,
        jobNo: entry.jobNo,
        partyName: cleanPartyName(entry.partyName) || "",
        amountPaid: entry.amountPaid,
        utr: entry.utr || "",
        fromBank: entry.fromBank || "",
        remarks: entry.remarks || "",
        status: entry.status || "unpaid",
        fileUrl: entry.fileUrl || "",
        tradeType: entryTrade,
      });

      // Parse jobNo string and fetch job details from server for each job
      const jobString = entry.jobNo || "";
      const jobNos = jobString.split(",").map((j) => j.trim()).filter(Boolean);
      const initialSelected = await Promise.all(
        jobNos.map(async (jobNo) => {
          const inList = jobsList.find((j) => j.jobNo === jobNo || (j.jobSeq && j.jobSeq === jobNo));
          if (inList && (inList.partyName || inList.branchCode)) {
            return {
              ...inList,
              partyName: cleanPartyName(inList.partyName),
            };
          }
          const details = await fetchJobDetails(jobNo, entryTrade);
          return {
            ...details,
            partyName: cleanPartyName(details?.partyName),
          };
        })
      );
      setSelectedJobs(initialSelected);
      setFormValues((prev) => ({
        ...prev,
        partyName: buildPartyNameString(initialSelected) || cleanPartyName(entry.partyName) || "",
      }));
    } else {
      setEditId(null);
      const defaultTrade = tradeScope === "export" ? "EXPORT" : "IMPORT";
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
        tradeType: defaultTrade,
      });
      setSelectedJobs([]);
    }
    setFormOpen(true);
  };

  // Save entry
  const handleSaveForm = async () => {
    const { cfsName, amountPaid } = formValues;
    if (!cfsName || !amountPaid) {
      alert(`Please fill ${holderLabel} Name and Amount Paid.`);
      return;
    }

    const jobNoString = selectedJobs
      .map((j) => (typeof j === "string" ? j.trim().toUpperCase() : (j.jobNo || "").trim().toUpperCase()))
      .filter(Boolean)
      .join(", ");

    const payload = { ...formValues, jobNo: jobNoString };

    try {
      const targetApi = (formValues.tradeType === "EXPORT" ? exportApi : importApi) || apiBase;
      if (editId) {
        await axios.put(`${targetApi}/${balanceApi}/${editId}`, payload);
      } else {
        await axios.post(`${targetApi}/${balanceApi}`, payload);
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
      const targetApi = (entry.tradeType === "EXPORT" ? exportApi : importApi) || apiBase;
      const res = await axios.get(`${targetApi}/${balanceApi}/job-purchase-books`, {
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

  const pbTotal = comparePbList.reduce((sum, item) => sum + ((item.total || 0) - (item.tds || 0)), 0);

  return (
    <Box sx={{ p: 2, backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
      {/* Top Filter and Search Bar */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        sx={{
          mb: 1.5,
          p: 1.5,
          backgroundColor: "#fff",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          alignItems: "center",
        }}
      >
        <TextField
          size="small"
          placeholder={`Search reference, job, ${holderLabel.toLowerCase()}...`}
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

        {/* Trade Scope Control: Import / Export / Both */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            variant={tradeScope === "both" ? "contained" : "outlined"}
            onClick={() => {
              setTradeScope(tradeScope === "both" ? "import" : "both");
              setPage(1);
            }}
            startIcon={<CompareArrowsIcon sx={{ fontSize: 16 }} />}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              fontSize: "12px",
              borderRadius: "6px",
              px: 1.5,
              py: 0.6,
              whiteSpace: "nowrap",
              ...(tradeScope === "both"
                ? {
                    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                    color: "#fff",
                    boxShadow: "0 2px 6px rgba(79, 70, 229, 0.3)",
                  }
                : {
                    borderColor: "#cbd5e1",
                    color: "#475569",
                    "&:hover": { borderColor: "#4f46e5", color: "#4f46e5" },
                  }),
            }}
          >
            {tradeScope === "both" ? "Combined" : "Combine (Both)"}
          </Button>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Trade</InputLabel>
            <Select
              value={tradeScope}
              label="Trade"
              onChange={(e) => {
                setTradeScope(e.target.value);
                setPage(1);
              }}
              sx={{
                height: 40,
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "6px",
                backgroundColor: "#fff",
              }}
            >
              <MenuItem value="import" sx={{ fontSize: "12px", fontWeight: 600 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#0284c7", mr: 1, display: "inline-block" }} />
                Import Only
              </MenuItem>
              <MenuItem value="export" sx={{ fontSize: "12px", fontWeight: 600 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#ea580c", mr: 1, display: "inline-block" }} />
                Export Only
              </MenuItem>
              <MenuItem value="both" sx={{ fontSize: "12px", fontWeight: 700, color: "#4f46e5" }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#7c3aed", mr: 1, display: "inline-block" }} />
                Both (Combined)
              </MenuItem>
            </Select>
          </FormControl>
        </Stack>

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
            + Add {balanceLabel}
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
          maxHeight: "calc(100vh - 230px)",
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={s.headerCell}>TRADE</TableCell>
              <TableCell sx={s.headerCell}>Create Date</TableCell>
              <TableCell sx={s.headerCell}>Ref No</TableCell>
              <TableCell sx={s.headerCell}>{holderLabel} Name</TableCell>
              <TableCell sx={s.headerCell}>Job No</TableCell>
              <TableCell sx={s.headerCell}>{tradeScope === "export" ? "Exporter Name" : tradeScope === "both" ? "Importer / Exporter" : "Importer Name"}</TableCell>
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
                <TableCell colSpan={isCfsBalance ? 21 : 18} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} sx={{ color: "#1e3a8a" }} />
                  <Typography variant="body2" sx={{ mt: 1, color: "text.secondary", fontWeight: 500 }}>
                    Loading virtual balances...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isCfsBalance ? 21 : 18} align="center" sx={{ py: 6, color: "text.secondary" }}>
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
                  <TableCell sx={{ fontSize: "11px", whiteSpace: "nowrap" }}>
                    <Chip
                      size="small"
                      label={(row.tradeType || (tradeScope === "export" ? "EXPORT" : "IMPORT")).toUpperCase()}
                      sx={{
                        height: 20,
                        fontSize: "9.5px",
                        fontWeight: 800,
                        letterSpacing: "0.5px",
                        backgroundColor: (row.tradeType || (tradeScope === "export" ? "EXPORT" : "IMPORT")).toUpperCase() === "EXPORT" ? "#fef3c7" : "#e0f2fe",
                        color: (row.tradeType || (tradeScope === "export" ? "EXPORT" : "IMPORT")).toUpperCase() === "EXPORT" ? "#b45309" : "#0369a1",
                        border: "1px solid",
                        borderColor: (row.tradeType || (tradeScope === "export" ? "EXPORT" : "IMPORT")).toUpperCase() === "EXPORT" ? "#fde68a" : "#bae6fd",
                      }}
                    />
                  </TableCell>
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
                  <TableCell sx={{ color: "#475569", fontSize: "11.5px", whiteSpace: "pre-line" }}>
                    {cleanPartyName(row.partyName) || "-"}
                  </TableCell>
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
                          onClick={() => handleDelete(row._id, row.tradeType)}
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
          {editId ? `Edit ${balanceLabel} Entry` : `Create ${balanceLabel} Entry`}
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 2 }}>
          <Grid container spacing={2.5} sx={{ pt: 2 }}>
            {tradeScope === "both" && (
              <Grid item xs={12}>
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: "#f8fafc",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                      Target Trade Account
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#64748b", fontSize: "12px" }}>
                      {editId ? "Trade account for this entry:" : "Select database to store this balance entry:"}
                    </Typography>
                  </Box>
                  {editId ? (
                    <Chip
                      label={(formValues.tradeType || "IMPORT").toUpperCase()}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        bgcolor: (formValues.tradeType || "IMPORT").toUpperCase() === "EXPORT" ? "#ea580c" : "#0284c7",
                        color: "#fff",
                        px: 1,
                      }}
                    />
                  ) : (
                    <RadioGroup
                      row
                      value={(formValues.tradeType || "IMPORT").toUpperCase()}
                      onChange={(e) => {
                        const newTrade = e.target.value;
                        setFormValues((prev) => ({ ...prev, tradeType: newTrade }));
                        setSelectedJobs([]);
                        setJobSearch("");
                      }}
                    >
                      <FormControlLabel
                        value="IMPORT"
                        control={<Radio size="small" sx={{ color: "#0284c7", "&.Mui-checked": { color: "#0284c7" } }} />}
                        label={<Typography variant="body2" sx={{ fontWeight: 700, color: "#0284c7", fontSize: "13px" }}>IMPORT</Typography>}
                      />
                      <FormControlLabel
                        value="EXPORT"
                        control={<Radio size="small" sx={{ color: "#ea580c", "&.Mui-checked": { color: "#ea580c" } }} />}
                        label={<Typography variant="body2" sx={{ fontWeight: 700, color: "#ea580c", fontSize: "13px" }}>EXPORT</Typography>}
                      />
                    </RadioGroup>
                  )}
                </Box>
              </Grid>
            )}

            <Grid item xs={12}>
              <Autocomplete
                size="small"
                options={cfsList}
                getOptionLabel={(option) => (typeof option === "string" ? option : option.name || "")}
                freeSolo
                onInputChange={(event, newInputValue, reason) => {
                  if (reason === "input") setFormValues((prev) => ({ ...prev, cfsName: newInputValue }));
                }}
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props;
                  const name = typeof option === "string" ? option : option.name;
                  const source = typeof option === "object" ? (option.directorySource || option.sourceLabel) : null;
                  return (
                    <li key={key || name} {...optionProps}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                        <Typography variant="body2">{name}</Typography>
                        {source && (
                          <Chip
                            label={source}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: "10px",
                              fontWeight: 600,
                              bgcolor: source === "Terminal" ? "#e0f2fe" : "#fef3c7",
                              color: source === "Terminal" ? "#0369a1" : "#92400e",
                              ml: 1,
                            }}
                          />
                        )}
                      </Box>
                    </li>
                  );
                }}
                value={cfsList.find((c) => (c.name || "").trim().toUpperCase() === (formValues.cfsName || "").trim().toUpperCase()) || formValues.cfsName || null}
                onChange={(event, newValue) => {
                  const val = typeof newValue === "string" ? newValue : (newValue?.name || "");
                  setFormValues((prev) => ({ ...prev, cfsName: val }));
                }}
                renderInput={(params) => <TextField {...params} label={`${holderLabel} *`} />}
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
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const isString = typeof option === "string";
                    const jobNo = isString ? option : option.jobNo;
                    const branch = !isString ? option.branchCode : "";
                    const modeCustom = !isString ? (option.mode || option.customHouse) : "";
                    const details = [branch, modeCustom].filter(Boolean).join(" | ");
                    const label = details ? `${jobNo} (${details})` : jobNo;
                    const { key, ...tagProps } = getTagProps({ index });
                    return (
                      <Chip
                        key={key || index}
                        size="small"
                        label={label}
                        sx={{ fontWeight: 600, bgcolor: "#e2e8f0", color: "#1e293b", mr: 0.5 }}
                        {...tagProps}
                      />
                    );
                  })
                }
                renderOption={(props, option) => {
                  const isString = typeof option === "string";
                  const jobNo = isString ? option : option.jobNo;
                  const branch = !isString ? option.branchCode : "";
                  const mode = !isString ? option.mode : "";
                  const customHouse = !isString ? option.customHouse : "";
                  const partyName = !isString ? option.partyName : "";

                  const details = [branch, mode, customHouse].filter(Boolean).join(" • ");
                  const { key, ...optionProps } = props;

                  return (
                    <li key={key || jobNo} {...optionProps}>
                      <Box sx={{ display: "flex", flexDirection: "column", width: "100%", py: 0.5 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                            {jobNo}
                          </Typography>
                          {details && (
                            <Chip
                              label={details}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: "10px",
                                fontWeight: 700,
                                bgcolor: "#e0e7ff",
                                color: "#3730a3",
                                borderRadius: "4px",
                              }}
                            />
                          )}
                        </Box>
                        {partyName && (
                          <Typography variant="caption" sx={{ color: "#64748b", mt: 0.2 }}>
                            — {partyName}
                          </Typography>
                        )}
                      </Box>
                    </li>
                  );
                }}
                isOptionEqualToValue={(option, value) => {
                  const optJobNo = typeof option === "string" ? option : option.jobNo;
                  const valJobNo = typeof value === "string" ? value : value.jobNo;
                  return optJobNo === valJobNo || (option.jobSeq && option.jobSeq === valJobNo);
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

                      if (typeof item !== "string" && (item.partyName || item.branchCode)) {
                        return {
                          jobNo,
                          partyName: cleanPartyName(item.partyName) || "",
                          branchCode: item.branchCode || "",
                          customHouse: item.customHouse || "",
                          mode: item.mode || "",
                        };
                      }

                      // Try jobsList cache first
                      const inList = jobsList.find((j) => j.jobNo === jobNo);
                      if (inList && (inList.partyName || inList.branchCode)) return inList;

                      // Fallback: fetch from server
                      const details = await fetchJobDetails(jobNo, formValues.tradeType);
                      const cleanDetails = {
                        ...details,
                        partyName: cleanPartyName(details?.partyName),
                      };
                      if (details && (details.partyName || details.branchCode)) {
                        setJobsList((prev) => [...prev, cleanDetails]);
                      }
                      return cleanDetails;
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
                    placeholder="Type to search job no, branch, mode, party..."
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
                ListboxProps={{ style: { maxHeight: "250px" } }}
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
                label="Importer Name(s)"
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
              {balanceLabel} Comparison Dashboard
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
                            <TableCell sx={{ fontWeight: 750 }}>₹ {Number((pb.total || 0) - (pb.tds || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
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
