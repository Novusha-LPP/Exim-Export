import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  Box,
  Button,
  Alert,
  Card,
  CardContent,
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
  InputAdornment,
  MenuItem,
  Paper,
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
  Tooltip,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import GroupIcon from "@mui/icons-material/Group";
import ClearIcon from "@mui/icons-material/Clear";
import DateRangeIcon from "@mui/icons-material/DateRange";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { getTradeApis } from "../../../utils/tradeScopeUtil";

// Format date helper: DD.MM.YYYY
function formatDateDisplay(val) {
  if (!val) return "-";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      // Check if already in string dd.mm.yy or similar
      return String(val);
    }
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch (_) {
    return String(val);
  }
}

// Format currency
function formatINR(num) {
  if (num === null || num === undefined || isNaN(Number(num))) return "0";
  return Number(num).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

// Get ISO Date string (YYYY-MM-DD)
function toISODate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CashflowTracker({ mode = "export" }) {
  const isExport = mode === "export";
  const envApi = typeof import.meta !== "undefined" && import.meta.env?.VITE_API_STRING
    ? import.meta.env.VITE_API_STRING
    : typeof process !== "undefined" && (process.env?.VITE_API_STRING || process.env?.REACT_APP_API_STRING)
      ? (process.env.VITE_API_STRING || process.env.REACT_APP_API_STRING)
      : null;

  // Trade Scope: "import" | "export" | "both"
  const [tradeScope, setTradeScope] = useState(
    () => sessionStorage.getItem("cashflow_trade_scope") || mode || "export"
  );

  useEffect(() => {
    sessionStorage.setItem("cashflow_trade_scope", tradeScope);
  }, [tradeScope]);

  const { importApi, exportApi } = useMemo(() => {
    return getTradeApis(envApi, false);
  }, [envApi]);

  const apiBase = tradeScope === "import" ? importApi : exportApi;

  // Filter States - Default to Today
  const todayStr = useMemo(() => toISODate(new Date()), []);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [expenseMadeBy, setExpenseMadeBy] = useState("ALL");
  const [partyName, setPartyName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Data & KPI states
  const [loading, setLoading] = useState(false);
  const [networkError, setNetworkError] = useState(null);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({
    totalAddedBalance: 0,
    totalExpense: 0,
    netBalance: 0,
    currentCashBalance: 0,
  });
  const [teamMembers, setTeamMembers] = useState([
    "ANURAG",
    "DURGESH",
    "KAPIL",
    "BALVIR",
    "KIRIT",
    "PARAS",
  ]);

  // Modal States
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Add Balance Form State
  const [balanceForm, setBalanceForm] = useState({
    amount: "",
    postingDate: todayStr,
    invoiceDate: todayStr,
    jobRefNo: "CASH WITHDRAWAL FROM BANK",
    particular: "CASH WITHDRAWAL FROM BANK",
    expenseMadeBy: "",
    remarks: "",
    tradeType: mode === "import" ? "import" : "export",
  });

  // Add Manual Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    revenue: "",
    postingDate: todayStr,
    invoiceDate: todayStr,
    jobRefNo: "",
    partyName: "",
    chargeHead: "MISCELLANEOUS EXP.",
    particular: "",
    expenseMadeBy: "",
    remarks: "",
    tradeType: mode === "import" ? "import" : "export",
  });

  // New Team Member input
  const [newMemberName, setNewMemberName] = useState("");

  // Quick Date Range Presets
  const applyDatePreset = (preset) => {
    const now = new Date();
    if (preset === "today") {
      const t = toISODate(now);
      setStartDate(t);
      setEndDate(t);
    } else if (preset === "thisMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(toISODate(firstDay));
      setEndDate(toISODate(lastDay));
    } else if (preset === "thisFY") {
      const curMonth = now.getMonth() + 1;
      const startYear = curMonth >= 4 ? now.getFullYear() : now.getFullYear() - 1;
      const fyStart = new Date(startYear, 3, 1);
      const fyEnd = new Date(startYear + 1, 2, 31);
      setStartDate(toISODate(fyStart));
      setEndDate(toISODate(fyEnd));
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  // Fetch Cashflow Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setNetworkError(null);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (expenseMadeBy && expenseMadeBy !== "ALL") params.expenseMadeBy = expenseMadeBy;
      if (partyName) params.partyName = partyName;
      if (searchTerm) params.search = searchTerm;

      if (tradeScope === "both") {
        const [resImport, resExport] = await Promise.allSettled([
          axios.get(`${importApi}/cashflow`, { params, withCredentials: true }),
          axios.get(`${exportApi}/cashflow`, { params, withCredentials: true }),
        ]);

        const importData = resImport.status === "fulfilled" && resImport.value.data?.success ? resImport.value.data : null;
        const exportData = resExport.status === "fulfilled" && resExport.value.data?.success ? resExport.value.data : null;

        const impRows = (importData?.data || []).map((r) => ({ ...r, tradeType: "IMPORT" }));
        const expRows = (exportData?.data || []).map((r) => ({ ...r, tradeType: "EXPORT" }));

        // Combined rows sorted by postingDate ascending
        const combined = [...impRows, ...expRows].sort(
          (a, b) => new Date(a.postingDate) - new Date(b.postingDate)
        );

        setRows(combined);

        const impSummary = importData?.summary || {};
        const expSummary = exportData?.summary || {};

        let totAdded = Number(impSummary.totalAddedBalance || 0) + Number(expSummary.totalAddedBalance || 0);
        let totExp = Number(impSummary.totalExpense || 0) + Number(expSummary.totalExpense || 0);

        if (!impSummary.totalAddedBalance && !expSummary.totalAddedBalance && combined.length > 0) {
          totAdded = 0;
          totExp = 0;
          combined.forEach((r) => {
            totAdded += Number(r.cashWith || 0);
            totExp += Number(r.expAmount || 0);
          });
        }

        const netBalance = totAdded - totExp;
        const currentCashBalance = Number(impSummary.currentCashBalance || 0) + Number(expSummary.currentCashBalance || 0);

        setSummary({
          totalAddedBalance: totAdded,
          totalExpense: totExp,
          netBalance,
          currentCashBalance,
        });

        const m1 = Array.isArray(importData?.teamMembers) ? importData.teamMembers : [];
        const m2 = Array.isArray(exportData?.teamMembers) ? exportData.teamMembers : [];
        const allMembers = [...new Set([...m1, ...m2])].sort();
        if (allMembers.length > 0) setTeamMembers(allMembers);
      } else {
        const targetApi = tradeScope === "export" ? exportApi : importApi;
        const currentTrade = tradeScope === "export" ? "EXPORT" : "IMPORT";
        const res = await axios.get(`${targetApi}/cashflow`, {
          params,
          withCredentials: true,
        });

        if (res.data?.success) {
          const rowsWithTrade = (res.data.data || []).map((r) => ({
            ...r,
            tradeType: r.tradeType || currentTrade,
          }));
          setRows(rowsWithTrade);
          if (res.data.summary) {
            setSummary(res.data.summary);
          }
          if (Array.isArray(res.data.teamMembers) && res.data.teamMembers.length > 0) {
            setTeamMembers(res.data.teamMembers);
          }
        }
      }
    } catch (err) {
      console.error("Error loading cashflow records:", err);
      const isConnRefused = err.code === "ERR_NETWORK" || err.message?.includes("Network Error");
      if (isConnRefused) {
        const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || /^192\.168\./.test(window.location.hostname));
        const targetDesc = isLocal
          ? (tradeScope === "export" ? "Export server on port 9002" : (tradeScope === "import" ? "Import server on port 9006" : "backend servers on port 9002 / 9006"))
          : (tradeScope === "export" ? "Export server" : (tradeScope === "import" ? "Import server" : "Import / Export servers"));
        setNetworkError(`Connection Error: Cannot connect to ${targetDesc}. Please check network connectivity or try again.`);
      } else {
        setNetworkError(err.response?.data?.message || err.message || "Failed to load cashflow data");
      }
    } finally {
      setLoading(false);
    }
  }, [importApi, exportApi, tradeScope, startDate, endDate, expenseMadeBy, partyName, searchTerm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Add Balance Submit
  const handleAddBalanceSubmit = async (e) => {
    e.preventDefault();
    if (!balanceForm.amount || Number(balanceForm.amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    setSubmitting(true);
    try {
      const targetApi = tradeScope === "both"
        ? (balanceForm.tradeType === "import" ? importApi : exportApi)
        : (tradeScope === "import" ? importApi : exportApi);
      const res = await axios.post(`${targetApi}/cashflow/balance`, balanceForm, {
        withCredentials: true,
      });
      if (res.data?.success) {
        setBalanceModalOpen(false);
        setBalanceForm({
          amount: "",
          postingDate: todayStr,
          invoiceDate: todayStr,
          jobRefNo: "CASH WITHDRAWAL FROM BANK",
          particular: "CASH WITHDRAWAL FROM BANK",
          expenseMadeBy: "",
          remarks: "",
          tradeType: tradeScope === "import" ? "import" : "export",
        });
        fetchData();
      } else {
        alert(res.data?.message || "Failed to add balance");
      }
    } catch (err) {
      console.error("Error adding balance:", err);
      alert(err.response?.data?.message || "Error adding balance");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Add Expense Submit
  const handleAddExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) {
      alert("Please enter a valid expense amount");
      return;
    }
    setSubmitting(true);
    try {
      const targetApi = tradeScope === "both"
        ? (expenseForm.tradeType === "import" ? importApi : exportApi)
        : (tradeScope === "import" ? importApi : exportApi);
      const res = await axios.post(`${targetApi}/cashflow/expense`, expenseForm, {
        withCredentials: true,
      });
      if (res.data?.success) {
        setExpenseModalOpen(false);
        setExpenseForm({
          amount: "",
          revenue: "",
          postingDate: todayStr,
          invoiceDate: todayStr,
          jobRefNo: "",
          partyName: "",
          chargeHead: "MISCELLANEOUS EXP.",
          particular: "",
          expenseMadeBy: "",
          remarks: "",
          tradeType: tradeScope === "import" ? "import" : "export",
        });
        fetchData();
      } else {
        alert(res.data?.message || "Failed to add manual expense");
      }
    } catch (err) {
      console.error("Error adding expense:", err);
      alert(err.response?.data?.message || "Error adding manual expense");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Manual Entry
  const handleDeleteEntry = async (id, isBalance, rowTradeType) => {
    const label = isBalance ? "Balance Addition / Cash Withdrawal" : "Manual Expense";
    if (!window.confirm(`Are you sure you want to delete this ${label}?`)) return;
    try {
      const targetApi = (rowTradeType || "").toUpperCase() === "IMPORT" ? importApi : exportApi;
      const res = await axios.delete(`${targetApi}/cashflow/${id}`, {
        withCredentials: true,
      });
      if (res.data?.success) {
        fetchData();
      } else {
        alert(res.data?.message || "Failed to delete entry");
      }
    } catch (err) {
      console.error("Error deleting entry:", err);
      alert(err.response?.data?.message || "Error deleting entry");
    }
  };

  // Team Member Management
  const handleAddMember = async () => {
    if (!newMemberName.trim()) return;
    try {
      const res = await axios.post(
        `${apiBase}/cashflow/team-members`,
        { name: newMemberName.trim().toUpperCase() },
        { withCredentials: true }
      );
      if (res.data?.success && Array.isArray(res.data.data)) {
        setTeamMembers(res.data.data);
        setNewMemberName("");
      }
    } catch (err) {
      console.error("Error adding team member:", err);
      alert(err.response?.data?.message || "Error adding team member");
    }
  };

  const handleRemoveMember = async (name) => {
    if (!window.confirm(`Remove "${name}" from team members?`)) return;
    try {
      const res = await axios.delete(
        `${apiBase}/cashflow/team-members/${encodeURIComponent(name)}`,
        { withCredentials: true }
      );
      if (res.data?.success && Array.isArray(res.data.data)) {
        setTeamMembers(res.data.data);
      }
    } catch (err) {
      console.error("Error removing team member:", err);
      alert(err.response?.data?.message || "Error removing team member");
    }
  };

  // Export to Excel Matching Screenshot Exactly
  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "AlVision Exim";
      workbook.created = new Date();
      const sheet = workbook.addWorksheet("Cashflow", {
        views: [{ showGridLines: true }],
      });

      // Define Columns matching screenshot exactly
      sheet.columns = [
        { header: "TRADE", key: "tradeType", width: 12 },
        { header: "POSTING DATE", key: "postingDate", width: 14 },
        { header: "INVOICE DATE", key: "invoiceDate", width: 14 },
        { header: "JOB REF NO", key: "jobRefNo", width: 26 },
        { header: "IMPORTER/EXPORTER", key: "partyName", width: 24 },
        { header: "CHARGE HEAD", key: "chargeHead", width: 28 },
        { header: "PARTICULAR", key: "particular", width: 38 },
        { header: "EXP AMOUNT", key: "expAmount", width: 15 },
        { header: "REVENUE", key: "revenue", width: 14 },
        { header: "CASH BAL", key: "cashBal", width: 16 },
        { header: "CASH WITH", key: "cashWith", width: 16 },
        { header: "EXPENSE MADE BY", key: "expenseMadeBy", width: 20 },
      ];

      // Format Header Row (Yellow Background #FFFF00, bold, black text, centered borders)
      const headerRow = sheet.getRow(1);
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFFF00" }, // Pure Yellow matching Excel screenshot
        };
        cell.font = {
          name: "Calibri",
          size: 11,
          bold: true,
          color: { argb: "FF000000" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: "FF000000" } },
          left: { style: "thin", color: { argb: "FF000000" } },
          bottom: { style: "medium", color: { argb: "FF000000" } },
          right: { style: "thin", color: { argb: "FF000000" } },
        };
      });

      // Add Data Rows
      rows.forEach((r) => {
        const isWithdrawal = r.isBalanceAddition || (r.jobRefNo || "").includes("CASH WITHDRAWAL");
        const rowData = {
          tradeType: (r.tradeType || (tradeScope === "export" ? "EXPORT" : "IMPORT")).toUpperCase(),
          postingDate: formatDateDisplay(r.postingDate),
          invoiceDate: r.invoiceDate ? formatDateDisplay(r.invoiceDate) : "",
          jobRefNo: r.jobRefNo || "",
          partyName: r.partyName || "",
          chargeHead: r.chargeHead || "",
          particular: r.particular || "",
          expAmount: r.expAmount > 0 ? r.expAmount : "",
          revenue: r.revenue > 0 ? r.revenue : "",
          cashBal: r.cashBal !== undefined ? r.cashBal : "",
          cashWith: r.cashWith > 0 ? r.cashWith : "",
          expenseMadeBy: r.expenseMadeBy || "",
        };

        const addedRow = sheet.addRow(rowData);
        addedRow.height = 20;

        // Apply Styling to cells
        addedRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.font = { name: "Calibri", size: 10 };
          cell.border = {
            top: { style: "thin", color: { argb: "FFD3D3D3" } },
            left: { style: "thin", color: { argb: "FFD3D3D3" } },
            bottom: { style: "thin", color: { argb: "FFD3D3D3" } },
            right: { style: "thin", color: { argb: "FFD3D3D3" } },
          };
          cell.alignment = { vertical: "middle" };

          // Right-align numbers
          if ([7, 8, 9, 10].includes(colNumber)) {
            cell.alignment = { vertical: "middle", horizontal: "right" };
            if (typeof cell.value === "number") {
              cell.numFmt = "#,##0";
            }
          } else if ([1, 2].includes(colNumber)) {
            cell.alignment = { vertical: "middle", horizontal: "center" };
          }

          // Special highlight for CASH WITHDRAWAL FROM BANK row (Blue highlight #00A2E8 in screenshot)
          if (isWithdrawal) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF00A2E8" }, // Distinct bright blue row from screenshot
            };
            cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF000000" } };
          }

          // CASH BAL column (Col 9) gets distinctive Light Green fill (#C6EFCE)
          if (colNumber === 9) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFA8D5A2" }, // Soft green from screenshot
            };
            cell.font = {
              name: "Calibri",
              size: 10,
              bold: true,
              color: { argb: "FF000000" },
            };
          }
        });
      });

      // Generate buffer and trigger download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const fileName = `Cashflow_${startDate || "All"}_to_${endDate || "Today"}.xlsx`;
      saveAs(blob, fileName);
    } catch (err) {
      console.error("Error exporting excel:", err);
      alert("Error exporting Excel file: " + err.message);
    }
  };

  return (
    <Box sx={{ width: "100%", p: 2, backgroundColor: "#f8fafc", minHeight: "85vh" }}>
      {/* Network / Connection Error Banner */}
      {networkError && (
        <Alert
          severity="error"
          sx={{ mb: 1.5, borderRadius: 2 }}
          action={
            <Button color="inherit" size="small" onClick={fetchData}>
              Retry
            </Button>
          }
        >
          {networkError}
        </Alert>
      )}

      {/* Top Header Bar - Balanced & Clean */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
          mb: 1.5,
          backgroundColor: "#fff",
          py: 1,
          px: 2,
          borderRadius: 2,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          border: "1px solid #e2e8f0",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
          <AccountBalanceWalletIcon sx={{ color: "#1976d2", fontSize: 24 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1e293b", fontSize: "16px", lineHeight: 1.2 }}>
              Cashflow Register
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b", fontSize: "11.5px" }}>
              Track cash expenses, withdrawals & real-time balance
            </Typography>
          </Box>
        </Box>

        {/* Action Buttons */}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<AddCircleOutlineIcon sx={{ fontSize: 16 }} />}
            onClick={() => {
              setBalanceForm((prev) => ({
                ...prev,
                tradeType: tradeScope === "import" ? "import" : "export",
              }));
              setBalanceModalOpen(true);
            }}
            sx={{ fontWeight: 600, fontSize: "12px", py: 0.5, px: 1.5, textTransform: "none", boxShadow: "none" }}
          >
            Add Balance
          </Button>

          <Button
            size="small"
            variant="contained"
            color="warning"
            startIcon={<AddCircleOutlineIcon sx={{ fontSize: 16 }} />}
            onClick={() => {
              setExpenseForm((prev) => ({
                ...prev,
                tradeType: tradeScope === "import" ? "import" : "export",
              }));
              setExpenseModalOpen(true);
            }}
            sx={{
              fontWeight: 600,
              fontSize: "12px",
              py: 0.5,
              px: 1.5,
              textTransform: "none",
              boxShadow: "none",
              backgroundColor: "#d97706",
              "&:hover": { backgroundColor: "#b45309" },
            }}
          >
            Add Cash Expense
          </Button>

          <Button
            size="small"
            variant="outlined"
            startIcon={<GroupIcon sx={{ fontSize: 16 }} />}
            onClick={() => setTeamModalOpen(true)}
            sx={{ fontWeight: 600, fontSize: "12px", py: 0.5, px: 1.5, textTransform: "none" }}
          >
            Team ({teamMembers.length})
          </Button>

          <Button
            size="small"
            variant="outlined"
            color="success"
            startIcon={<FileDownloadIcon sx={{ fontSize: 16 }} />}
            onClick={handleExportExcel}
            sx={{ fontWeight: 600, fontSize: "12px", py: 0.5, px: 1.5, textTransform: "none" }}
          >
            Export Excel
          </Button>

          <IconButton size="small" onClick={fetchData} title="Refresh" color="primary" sx={{ p: 0.6 }}>
            <RefreshIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Stack>
      </Box>

      {/* KPI Cards - Balanced Height & Clear Spacing */}
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        {/* Total Added Balance */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 2,
              borderLeft: "4px solid #0284c7",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              border: "1px solid #e2e8f0",
              borderLeftColor: "#0284c7",
            }}
          >
            <CardContent sx={{ py: 1, px: 1.5, "&:last-child": { pb: 1 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.4 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", fontSize: "11px", letterSpacing: "0.4px", textTransform: "uppercase" }}>
                  Total Added Balance
                </Typography>
                <TrendingUpIcon sx={{ color: "#0284c7", fontSize: 18 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#0284c7", fontSize: "18px", lineHeight: 1.2 }}>
                ₹{formatINR(summary.totalAddedBalance)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Expense */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 2,
              borderLeft: "4px solid #dc2626",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              border: "1px solid #e2e8f0",
              borderLeftColor: "#dc2626",
            }}
          >
            <CardContent sx={{ py: 1, px: 1.5, "&:last-child": { pb: 1 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.4 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", fontSize: "11px", letterSpacing: "0.4px", textTransform: "uppercase" }}>
                  Total Expense
                </Typography>
                <TrendingDownIcon sx={{ color: "#dc2626", fontSize: 18 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#dc2626", fontSize: "18px", lineHeight: 1.2 }}>
                ₹{formatINR(summary.totalExpense)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Net Period Cashflow */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 2,
              borderLeft: `4px solid ${summary.netBalance >= 0 ? "#16a34a" : "#ea580c"}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              border: "1px solid #e2e8f0",
              borderLeftColor: summary.netBalance >= 0 ? "#16a34a" : "#ea580c",
            }}
          >
            <CardContent sx={{ py: 1, px: 1.5, "&:last-child": { pb: 1 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.4 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", fontSize: "11px", letterSpacing: "0.4px", textTransform: "uppercase" }}>
                  Period Net Cashflow
                </Typography>
                {summary.netBalance >= 0 ? (
                  <TrendingUpIcon sx={{ color: "#16a34a", fontSize: 18 }} />
                ) : (
                  <TrendingDownIcon sx={{ color: "#ea580c", fontSize: 18 }} />
                )}
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: summary.netBalance >= 0 ? "#16a34a" : "#ea580c",
                  fontSize: "18px",
                  lineHeight: 1.2,
                }}
              >
                ₹{formatINR(summary.netBalance)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Overall Running Cash Balance */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 2,
              borderLeft: "4px solid #0f172a",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderLeftColor: "#0f172a",
            }}
          >
            <CardContent sx={{ py: 1, px: 1.5, "&:last-child": { pb: 1 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.4 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#0f172a", fontSize: "11px", letterSpacing: "0.4px", textTransform: "uppercase" }}>
                  Current Cash Balance
                </Typography>
                <AccountBalanceWalletIcon sx={{ color: "#0f172a", fontSize: 18 }} />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: summary.currentCashBalance >= 0 ? "#16a34a" : "#dc2626",
                  fontSize: "18px",
                  lineHeight: 1.2,
                }}
              >
                ₹{formatINR(summary.currentCashBalance)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Toolbar - Clean, Uncluttered, Standard Heights */}
      <Paper
        sx={{
          p: 1.5,
          mb: 1.5,
          borderRadius: 2,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          border: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          gap: 1.2,
        }}
      >
        {/* Row 1: Trade Controls & Quick Presets */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            {/* Trade Selector: Import, Export, Both */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                size="small"
                variant={tradeScope === "both" ? "contained" : "outlined"}
                onClick={() => setTradeScope(tradeScope === "both" ? (mode || "export") : "both")}
                startIcon={<CompareArrowsIcon sx={{ fontSize: 16 }} />}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "12px",
                  borderRadius: "6px",
                  px: 1.5,
                  py: 0.5,
                  height: 32,
                  ...(tradeScope === "both"
                    ? {
                        background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                        color: "#fff",
                        boxShadow: "0 2px 5px rgba(79, 70, 229, 0.25)",
                      }
                    : {
                        borderColor: "#cbd5e1",
                        color: "#475569",
                        "&:hover": { borderColor: "#4f46e5", color: "#4f46e5" },
                      }),
                }}
              >
                {tradeScope === "both" ? "Combined View" : "Combine (Both)"}
              </Button>

              <FormControl size="small" sx={{ minWidth: 155 }}>
                <Select
                  value={tradeScope}
                  onChange={(e) => setTradeScope(e.target.value)}
                  sx={{
                    height: 32,
                    fontSize: "12px",
                    fontWeight: 600,
                    borderRadius: "6px",
                    backgroundColor: "#fff",
                    "& .MuiSelect-select": {
                      display: "flex",
                      alignItems: "center",
                      gap: 0.8,
                      py: 0.4,
                      px: 1.2,
                    },
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

            <Divider orientation="vertical" flexItem sx={{ height: 20, my: "auto" }} />

            <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>
              Quick Presets:
            </Typography>
            <Chip
              label="Today"
              size="small"
              clickable
              color={startDate === todayStr && endDate === todayStr ? "primary" : "default"}
              onClick={() => applyDatePreset("today")}
              sx={{ height: 26, fontSize: "11.5px", fontWeight: 500 }}
            />
            <Chip
              label="This Month"
              size="small"
              clickable
              onClick={() => applyDatePreset("thisMonth")}
              sx={{ height: 26, fontSize: "11.5px", fontWeight: 500 }}
            />
            <Chip
              label="This FY"
              size="small"
              clickable
              onClick={() => applyDatePreset("thisFY")}
              sx={{ height: 26, fontSize: "11.5px", fontWeight: 500 }}
            />
            <Chip
              label="All Time"
              size="small"
              clickable
              color={!startDate && !endDate ? "primary" : "default"}
              onClick={() => applyDatePreset("all")}
              sx={{ height: 26, fontSize: "11.5px", fontWeight: 500 }}
            />
          </Stack>

          {(startDate || endDate || expenseMadeBy !== "ALL" || partyName || searchTerm) && (
            <Button
              size="small"
              startIcon={<ClearIcon sx={{ fontSize: 15 }} />}
              onClick={() => {
                applyDatePreset("today");
                setExpenseMadeBy("ALL");
                setPartyName("");
                setSearchTerm("");
              }}
              sx={{ textTransform: "none", color: "#64748b", fontSize: "11.5px", py: 0.3, px: 1 }}
            >
              Reset Filters
            </Button>
          )}
        </Box>

        {/* Row 2: Standard Clean Filter Fields */}
        <Grid container spacing={1.5} alignItems="center">
          {/* From Date */}
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              label="From Date"
              type="date"
              size="small"
              fullWidth
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                "& .MuiInputBase-root": { fontSize: "12px" },
              }}
            />
          </Grid>

          {/* To Date */}
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              label="To Date"
              type="date"
              size="small"
              fullWidth
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                "& .MuiInputBase-root": { fontSize: "12px" },
              }}
            />
          </Grid>

          {/* Expense Made By Filter */}
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl fullWidth size="small">
              <Select
                value={expenseMadeBy}
                onChange={(e) => setExpenseMadeBy(e.target.value)}
                displayEmpty
                sx={{
                  fontSize: "12px",
                }}
              >
                <MenuItem value="ALL" sx={{ fontSize: "12px" }}>All Team Members</MenuItem>
                {teamMembers.map((m) => (
                  <MenuItem key={m} value={m} sx={{ fontSize: "12px" }}>
                    {m}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Importer / Exporter */}
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              label="Importer / Exporter"
              placeholder="Search party..."
              size="small"
              fullWidth
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              sx={{
                "& .MuiInputBase-root": { fontSize: "12px" },
              }}
            />
          </Grid>

          {/* Search particular / job */}
          <Grid item xs={12} sm={12} md={2.4}>
            <TextField
              label="Search"
              placeholder="Ref / Particular..."
              size="small"
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#94a3b8", fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiInputBase-root": { fontSize: "12px" },
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Main Ledger Table */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 2,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          maxHeight: "calc(100vh - 275px)",
          border: "1px solid #e2e8f0",
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            {/* Header row with YELLOW background matching screenshot */}
            <TableRow>
              <TableCell sx={{ backgroundColor: "#FFFF00", color: "#000", fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #dcdcdc", py: 0.8, px: 1.2 }}>
                TRADE
              </TableCell>
              <TableCell sx={{ backgroundColor: "#FFFF00", color: "#000", fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #dcdcdc", py: 0.8, px: 1.2 }}>
                POSTING DATE
              </TableCell>
              <TableCell sx={{ backgroundColor: "#FFFF00", color: "#000", fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #dcdcdc", py: 0.8, px: 1.2 }}>
                INVOICE DATE
              </TableCell>
              <TableCell sx={{ backgroundColor: "#FFFF00", color: "#000", fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #dcdcdc", py: 0.8, px: 1.2 }}>
                JOB REF NO
              </TableCell>
              <TableCell sx={{ backgroundColor: "#FFFF00", color: "#000", fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #dcdcdc", py: 0.8, px: 1.2 }}>
                IMPORTER/EXPORTER
              </TableCell>
              <TableCell sx={{ backgroundColor: "#FFFF00", color: "#000", fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #dcdcdc", py: 0.8, px: 1.2 }}>
                CHARGE HEAD
              </TableCell>
              <TableCell sx={{ backgroundColor: "#FFFF00", color: "#000", fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #dcdcdc", py: 0.8, px: 1.2 }}>
                PARTICULAR
              </TableCell>
              <TableCell align="right" sx={{ backgroundColor: "#FFFF00", color: "#000", fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #dcdcdc", py: 0.8, px: 1.2 }}>
                EXP AMOUNT
              </TableCell>
              <TableCell align="right" sx={{ backgroundColor: "#FFFF00", color: "#000", fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #dcdcdc", py: 0.8, px: 1.2 }}>
                REVENUE
              </TableCell>
              <TableCell align="right" sx={{ backgroundColor: "#A8D5A2", color: "#000", fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #dcdcdc", py: 0.8, px: 1.2 }}>
                CASH BAL
              </TableCell>
              <TableCell align="right" sx={{ backgroundColor: "#FFFF00", color: "#000", fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #dcdcdc", py: 0.8, px: 1.2 }}>
                CASH WITH
              </TableCell>
              <TableCell sx={{ backgroundColor: "#FFFF00", color: "#000", fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #dcdcdc", py: 0.8, px: 1.2 }}>
                EXPENSE MADE BY
              </TableCell>
              <TableCell align="center" sx={{ backgroundColor: "#FFFF00", color: "#000", fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #dcdcdc", py: 0.8, px: 1.2 }}>
                ACTIONS
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={13} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                  <Typography variant="body2" sx={{ mt: 1, color: "#64748b" }}>
                    Loading cashflow records...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                    No cashflow records found for the selected filter.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => {
                const isWithdrawal = row.isBalanceAddition || (row.jobRefNo || "").includes("CASH WITHDRAWAL");
                const rowBg = isWithdrawal ? "#00A2E8" : idx % 2 === 0 ? "#ffffff" : "#fbfcfd";
                const rowTextColor = isWithdrawal ? "#000000" : "#1e293b";

                return (
                  <TableRow
                    key={row._id || idx}
                    sx={{
                      backgroundColor: rowBg,
                      "&:hover": { backgroundColor: isWithdrawal ? "#38bdf8" : "#f1f5f9" },
                    }}
                  >
                    {/* TRADE */}
                    <TableCell sx={{ fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #e2e8f0", py: 0.7, px: 1.2 }}>
                      <Chip
                        size="small"
                        label={(row.tradeType || (tradeScope === "export" ? "EXPORT" : "IMPORT")).toUpperCase()}
                        sx={{
                          height: 22, fontSize: "10px",
                          fontWeight: 800,
                          letterSpacing: "0.5px",
                          backgroundColor: (row.tradeType || (tradeScope === "export" ? "EXPORT" : "IMPORT")).toUpperCase() === "EXPORT" ? "#fef3c7" : "#e0f2fe",
                          color: (row.tradeType || (tradeScope === "export" ? "EXPORT" : "IMPORT")).toUpperCase() === "EXPORT" ? "#b45309" : "#0369a1",
                          border: "1px solid",
                          borderColor: (row.tradeType || (tradeScope === "export" ? "EXPORT" : "IMPORT")).toUpperCase() === "EXPORT" ? "#fde68a" : "#bae6fd",
                        }}
                      />
                    </TableCell>

                    {/* Posting Date */}
                    <TableCell sx={{ fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #e2e8f0", py: 0.7, px: 1.2, color: rowTextColor, fontWeight: isWithdrawal ? 700 : 400 }}>
                      {formatDateDisplay(row.postingDate)}
                    </TableCell>

                    {/* Invoice Date */}
                    <TableCell sx={{ fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #e2e8f0", py: 0.7, px: 1.2, color: rowTextColor }}>
                      {row.invoiceDate ? formatDateDisplay(row.invoiceDate) : "-"}
                    </TableCell>

                    {/* JOB REF NO */}
                    <TableCell
                      sx={{
                        fontSize: "11px",
                        fontWeight: isWithdrawal ? 800 : 600,
                        color: isWithdrawal ? "#000" : "#0284c7",
                        border: "1px solid #e2e8f0",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.jobRefNo || "-"}
                    </TableCell>

                    {/* IMPORTER/EXPORTER */}
                    <TableCell sx={{ fontSize: "11px", border: "1px solid #e2e8f0", color: rowTextColor, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.partyName}>
                      {row.partyName || "-"}
                    </TableCell>

                    {/* CHARGE HEAD */}
                    <TableCell sx={{ fontSize: "11px", border: "1px solid #e2e8f0", color: rowTextColor, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.chargeHead}>
                      {row.chargeHead || "-"}
                    </TableCell>

                    {/* PARTICULAR */}
                    <TableCell sx={{ fontSize: "11px", border: "1px solid #e2e8f0", color: rowTextColor, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.particular}>
                      {row.particular || "-"}
                    </TableCell>

                    {/* EXP AMOUNT */}
                    <TableCell align="right" sx={{ fontSize: "11px", fontWeight: 700, color: row.expAmount > 0 ? (isWithdrawal ? "#000" : "#dc2626") : "#94a3b8", border: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>
                      {row.expAmount > 0 ? formatINR(row.expAmount) : "-"}
                    </TableCell>

                    {/* revenue */}
                    <TableCell align="right" sx={{ fontSize: "11px", fontWeight: 600, color: row.revenue > 0 ? "#16a34a" : "#94a3b8", border: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>
                      {row.revenue > 0 ? formatINR(row.revenue) : "-"}
                    </TableCell>

                    {/* CASH BAL (Distinct light green styling from screenshot) */}
                    <TableCell
                      align="right"
                      sx={{
                        fontSize: "11px",
                        fontWeight: 800,
                        backgroundColor: "#c6efce",
                        color: row.cashBal >= 0 ? "#1e4620" : "#842029",
                        border: "1px solid #b8dfbe",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatINR(row.cashBal)}
                    </TableCell>

                    {/* CASH WITH */}
                    <TableCell
                      align="right"
                      sx={{
                        fontSize: "11px",
                        fontWeight: 800,
                        color: row.cashWith > 0 ? "#000" : "#94a3b8",
                        border: "1px solid #e2e8f0",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.cashWith > 0 ? formatINR(row.cashWith) : "-"}
                    </TableCell>

                    {/* EXPENSE MADE BY */}
                    <TableCell sx={{ fontSize: "11px", fontWeight: 600, color: isWithdrawal ? "#000" : "#1e293b", border: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>
                      {row.expenseMadeBy || "-"}
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="center" sx={{ border: "1px solid #e2e8f0", whiteSpace: "nowrap", py: 0.5 }}>
                      {row.source === "manual" ? (
                        <Tooltip title="Delete manual entry">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteEntry(row._id, row.isBalanceAddition, row.tradeType)}
                            sx={{ p: 0.5 }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Linked from Job Charge">
                          <Chip label="Charge" size="small" sx={{ fontSize: "9px", height: "18px" }} />
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* MODAL 1: ADD BALANCE (CASH WITHDRAWAL FROM BANK) */}
      <Dialog open={balanceModalOpen} onClose={() => setBalanceModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "#1e293b" }}>
          Add Balance (Cash Withdrawal)
        </DialogTitle>
        <form onSubmit={handleAddBalanceSubmit}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <Typography variant="body2" sx={{ color: "#64748b" }}>
              Add a bank withdrawal or capital addition. This will reflect in <b>CASH WITH</b> and increase the running <b>CASH BAL</b>.
            </Typography>

            {tradeScope === "both" && (
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
                    Target Account / Database
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#64748b", fontSize: "12px" }}>
                    Select where to record this cash withdrawal:
                  </Typography>
                </Box>
                <RadioGroup
                  row
                  value={balanceForm.tradeType || "export"}
                  onChange={(e) => setBalanceForm({ ...balanceForm, tradeType: e.target.value })}
                >
                  <FormControlLabel
                    value="import"
                    control={<Radio size="small" sx={{ color: "#0284c7", "&.Mui-checked": { color: "#0284c7" } }} />}
                    label={<Typography variant="body2" sx={{ fontWeight: 700, color: "#0284c7", fontSize: "13px" }}>IMPORT</Typography>}
                  />
                  <FormControlLabel
                    value="export"
                    control={<Radio size="small" sx={{ color: "#ea580c", "&.Mui-checked": { color: "#ea580c" } }} />}
                    label={<Typography variant="body2" sx={{ fontWeight: 700, color: "#ea580c", fontSize: "13px" }}>EXPORT</Typography>}
                  />
                </RadioGroup>
              </Box>
            )}

            <TextField
              label="Withdrawal / Added Amount (₹)"
              type="number"
              required
              fullWidth
              value={balanceForm.amount}
              onChange={(e) => setBalanceForm({ ...balanceForm, amount: e.target.value })}
              placeholder="e.g. 800000"
              InputLabelProps={{ shrink: true }}
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Posting Date"
                  type="date"
                  fullWidth
                  value={balanceForm.postingDate}
                  onChange={(e) => setBalanceForm({ ...balanceForm, postingDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Invoice / Cheque Date"
                  type="date"
                  fullWidth
                  value={balanceForm.invoiceDate}
                  onChange={(e) => setBalanceForm({ ...balanceForm, invoiceDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <TextField
              label="Job Ref / Description"
              fullWidth
              value={balanceForm.jobRefNo}
              onChange={(e) => setBalanceForm({ ...balanceForm, jobRefNo: e.target.value })}
              placeholder="CASH WITHDRAWAL FROM BANK"
            />

            <FormControl fullWidth>
              <Select
                value={balanceForm.expenseMadeBy}
                onChange={(e) => setBalanceForm({ ...balanceForm, expenseMadeBy: e.target.value })}
                displayEmpty
              >
                <MenuItem value="">-- Handled / Received By (Optional) --</MenuItem>
                {teamMembers.map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Remarks / Bank Details"
              multiline
              rows={2}
              fullWidth
              value={balanceForm.remarks}
              onChange={(e) => setBalanceForm({ ...balanceForm, remarks: e.target.value })}
              placeholder="Cheque No, Bank Name, UTR etc."
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setBalanceModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary" disabled={submitting}>
              {submitting ? "Adding..." : "Add Balance"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* MODAL 2: ADD MANUAL CASH EXPENSE */}
      <Dialog open={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "#1e293b" }}>
          Add Manual Cash Expense
        </DialogTitle>
        <form onSubmit={handleAddExpenseSubmit}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <Typography variant="body2" sx={{ color: "#64748b" }}>
              Record cash expenses not linked to an existing job charge (e.g. Petrol, Hotel, Courier, Tea, Stationeries).
            </Typography>

            {tradeScope === "both" && (
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
                    Target Account / Database
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#64748b", fontSize: "12px" }}>
                    Select which trade account paid this expense:
                  </Typography>
                </Box>
                <RadioGroup
                  row
                  value={expenseForm.tradeType || "export"}
                  onChange={(e) => setExpenseForm({ ...expenseForm, tradeType: e.target.value })}
                >
                  <FormControlLabel
                    value="import"
                    control={<Radio size="small" sx={{ color: "#0284c7", "&.Mui-checked": { color: "#0284c7" } }} />}
                    label={<Typography variant="body2" sx={{ fontWeight: 700, color: "#0284c7", fontSize: "13px" }}>IMPORT</Typography>}
                  />
                  <FormControlLabel
                    value="export"
                    control={<Radio size="small" sx={{ color: "#ea580c", "&.Mui-checked": { color: "#ea580c" } }} />}
                    label={<Typography variant="body2" sx={{ fontWeight: 700, color: "#ea580c", fontSize: "13px" }}>EXPORT</Typography>}
                  />
                </RadioGroup>
              </Box>
            )}

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Expense Amount (₹)"
                  type="number"
                  required
                  fullWidth
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="500"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Revenue (₹ - Optional)"
                  type="number"
                  fullWidth
                  value={expenseForm.revenue}
                  onChange={(e) => setExpenseForm({ ...expenseForm, revenue: e.target.value })}
                  placeholder="0"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Posting Date"
                  type="date"
                  fullWidth
                  value={expenseForm.postingDate}
                  onChange={(e) => setExpenseForm({ ...expenseForm, postingDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Invoice Date"
                  type="date"
                  fullWidth
                  value={expenseForm.invoiceDate}
                  onChange={(e) => setExpenseForm({ ...expenseForm, invoiceDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Job Ref / Vehicle No"
                  fullWidth
                  value={expenseForm.jobRefNo}
                  onChange={(e) => setExpenseForm({ ...expenseForm, jobRefNo: e.target.value })}
                  placeholder="e.g. VEH NO.2013 / IMP/43"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Importer / Exporter"
                  fullWidth
                  value={expenseForm.partyName}
                  onChange={(e) => setExpenseForm({ ...expenseForm, partyName: e.target.value })}
                  placeholder="e.g. AMMANN / INTAS"
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Charge Head"
                  fullWidth
                  value={expenseForm.chargeHead}
                  onChange={(e) => setExpenseForm({ ...expenseForm, chargeHead: e.target.value })}
                  placeholder="PETROL EXP. / MISC. EXP."
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <Select
                    value={expenseForm.expenseMadeBy}
                    onChange={(e) => setExpenseForm({ ...expenseForm, expenseMadeBy: e.target.value })}
                    displayEmpty
                  >
                    <MenuItem value="">-- Expense Made By --</MenuItem>
                    {teamMembers.map((m) => (
                      <MenuItem key={m} value={m}>
                        {m}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TextField
              label="Particular / Details"
              fullWidth
              required
              value={expenseForm.particular}
              onChange={(e) => setExpenseForm({ ...expenseForm, particular: e.target.value })}
              placeholder="e.g. PETROL EXP - BILL 26258"
            />

            <TextField
              label="Remarks"
              multiline
              rows={2}
              fullWidth
              value={expenseForm.remarks}
              onChange={(e) => setExpenseForm({ ...expenseForm, remarks: e.target.value })}
              placeholder="Optional remarks"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setExpenseModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="warning" disabled={submitting}>
              {submitting ? "Saving..." : "Save Expense"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* MODAL 3: MANAGE TEAM MEMBERS */}
      <Dialog open={teamModalOpen} onClose={() => setTeamModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "#1e293b" }}>
          Manage Expense Team Members
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 2 }}>
            These names appear in the <b>Expense Made By</b> dropdown across Charges and Cashflow.
          </Typography>

          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="New member name..."
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
            />
            <Button variant="contained" onClick={handleAddMember} disabled={!newMemberName.trim()}>
              Add
            </Button>
          </Box>

          <Stack spacing={1} sx={{ maxHeight: 280, overflowY: "auto" }}>
            {teamMembers.map((name) => (
              <Box
                key={name}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  p: 1,
                  px: 1.5,
                  borderRadius: 1,
                  backgroundColor: "#f1f5f9",
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, color: "#1e293b" }}>
                  {name}
                </Typography>
                <IconButton size="small" color="error" onClick={() => handleRemoveMember(name)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTeamModalOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
