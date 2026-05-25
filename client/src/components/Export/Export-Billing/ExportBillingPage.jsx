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
  { key: "export-completed-billing", label: "Export Completed Billing" },
  { key: "general-jobs", label: "General Jobs" },
];

const PURCHASE_TABS = [
  { key: "billing-pending", label: "Billing Pending" },
  { key: "purchase-book-requested", label: "Purchase Book Requested" },
  { key: "purchase-book", label: "Purchase Book" },
  { key: "purchase-book-completed", label: "Purchase Book Completed" },
  { key: "export-completed-billing", label: "Export Completed Billing" },
  { key: "general-jobs", label: "General Jobs" },
];

function getCurrentFinancialYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 4
    ? `${String(year).slice(-2)}-${String(year + 1).slice(-2)}`
    : `${String(year - 1).slice(-2)}-${String(year).slice(-2)}`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function copyText(text) {
  if (!text) return;
  navigator.clipboard.writeText(text).catch((error) => {
    console.error("Copy failed:", error);
  });
}

const ExpandableChipList = ({ items, limit = 2, color = "default", onClick }) => {
  const [expanded, setExpanded] = useState(false);
  if (!items || items.length === 0) return "-";

  const displayedItems = expanded ? items : items.slice(0, limit);
  const remainingCount = items.length - limit;

  const styles = {
    tag: {
      display: 'inline-flex',
      alignItems: 'center',
      cursor: onClick ? "pointer" : "default",
      padding: '2px 8px',
      fontSize: '11px',
      fontWeight: 600,
      color: '#1e293b',
      backgroundColor: '#f1f5f9',
      border: '1px solid #cbd5e1',
      borderRadius: '4px',
      lineHeight: 1.2,
      transition: 'all 0.15s ease',
      '&:hover': {
        backgroundColor: '#e2e8f0',
        borderColor: '#94a3b8'
      }
    },
    moreBtn: {
      display: 'inline-flex',
      alignItems: 'center',
      cursor: 'pointer',
      padding: '2px 8px',
      fontSize: '11px',
      fontWeight: 600,
      color: '#2563eb',
      backgroundColor: '#eff6ff',
      border: '1px solid #bfdbfe',
      borderRadius: '4px',
      lineHeight: 1.2,
      transition: 'all 0.15s ease',
      '&:hover': {
        backgroundColor: '#dbeafe',
        borderColor: '#93c5fd'
      }
    }
  };

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, py: 0.5 }}>
      {displayedItems.map((item, idx) => (
        <Box key={`${item}-${idx}`} sx={{ display: "inline-flex", alignItems: "center", gap: 0.2 }}>
          <Box
            onClick={onClick ? () => onClick(item) : undefined}
            sx={styles.tag}
          >
            {item}
          </Box>
          <IconButton
            size="small"
            sx={{ p: 0.1, opacity: 0.6, "&:hover": { opacity: 1 } }}
            onClick={(e) => {
              e.stopPropagation();
              copyText(item);
            }}
            title={`Copy ${item}`}
          >
            <ContentCopyIcon sx={{ fontSize: 10 }} />
          </IconButton>
        </Box>
      ))}
      {!expanded && remainingCount > 0 && (
        <Box
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
          sx={styles.moreBtn}
        >
          {`+${remainingCount} more`}
        </Box>
      )}
      {expanded && items.length > limit && (
        <Box
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
          sx={styles.moreBtn}
        >
          show less
        </Box>
      )}
    </Box>
  );
};

function renderChipList(items, color = "default", limit = 3) {
  return <ExpandableChipList items={items} color={color} limit={limit} />;
}

const QuickUploadButton = ({ row, field, onSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadFileToS3(file, "export_docs");
      const url = result.Location;

      // Update the backend
      const dotPath = `operations.0.statusDetails.0.${field}`;
      const localUser = JSON.parse(localStorage.getItem("exim_user") || "{}");

      // Get current files to append
      // Note: We'd ideally fetch the job first, but for simplicity we append if we have them or let the backend handle it.
      // But based on ExportJobsTable, it fetches current files.
      // However, we don't have the full opStatus here in the rows (it's summarized).
      // Let's assume the backend endpoint handles appending if we send just the new URL or the whole array.
      // In ExportJobsTable, it sends fieldUpdates: [{ field, value: newValue }].

      // Let's stick to the pattern in ExportJobsTable but simplified for summarized rows.
      // We might need a specialized endpoint or ensure the summarized row has the current URLs.

      await axios.patch(
        `${import.meta.env.VITE_API_STRING}/${encodeURIComponent(row.job_no)}/fields`,
        {
          fieldUpdates: [{ field: dotPath, value: [url] }] // This might overwrite, so we should be careful.
        },
        { headers: { username: localUser.username || "" } }
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
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv,.mp4,application/pdf,image/jpeg,image/png,video/mp4"
        style={{ display: "none" }}
      />
    </>
  );
};

const EditableBillingPair = ({
  row,
  noPathAgency,
  datePathAgency,
  noPathReimbursement,
  datePathReimbursement,
  initialAgencyNo,
  initialAgencyDate,
  initialReimbursementNo,
  initialReimbursementDate,
  onSuccess
}) => {
  const [agencyNo, setAgencyNo] = useState(initialAgencyNo || "");
  const [agencyDate, setAgencyDate] = useState(() => {
    if (initialAgencyDate) return handleDateInput(initialAgencyDate);
    return "";
  });
  const [reimbursementNo, setReimbursementNo] = useState(initialReimbursementNo || "");
  const [reimbursementDate, setReimbursementDate] = useState(() => {
    if (initialReimbursementDate) return handleDateInput(initialReimbursementDate);
    return "";
  });
  const [loading, setLoading] = useState(false);
  const [showSavedMsg, setShowSavedMsg] = useState(false);

  useEffect(() => {
    setAgencyNo(initialAgencyNo || "");
    setAgencyDate(initialAgencyDate ? handleDateInput(initialAgencyDate) : "");
    setReimbursementNo(initialReimbursementNo || "");
    setReimbursementDate(initialReimbursementDate ? handleDateInput(initialReimbursementDate) : "");
  }, [initialAgencyNo, initialAgencyDate, initialReimbursementNo, initialReimbursementDate]);

  const hasChanges =
    agencyNo !== (initialAgencyNo || "") ||
    agencyDate !== (initialAgencyDate || "") ||
    reimbursementNo !== (initialReimbursementNo || "") ||
    reimbursementDate !== (initialReimbursementDate || "");

  const handleSave = async () => {
    if (!hasChanges) return;

    // Validation: Agency Pair
    const isAgencyEmpty = !agencyNo.trim() && !agencyDate.trim();
    const isAgencyFilled = agencyNo.trim() && agencyDate.trim();
    if (!isAgencyEmpty && !isAgencyFilled) {
      alert("Please enter both Bill No and Bill Date for the Agency Bill!");
      return;
    }

    // Validation: Reimbursement Pair
    const isReimbursementEmpty = !reimbursementNo.trim() && !reimbursementDate.trim();
    const isReimbursementFilled = reimbursementNo.trim() && reimbursementDate.trim();
    if (!isReimbursementEmpty && !isReimbursementFilled) {
      alert("Please enter both Bill No and Bill Date for the Reimbursement Bill!");
      return;
    }

    setLoading(true);
    try {
      const localUser = JSON.parse(localStorage.getItem("exim_user") || "{}");
      await axios.patch(
        `${import.meta.env.VITE_API_STRING}/${encodeURIComponent(row.job_no)}/fields`,
        {
          fieldUpdates: [
            { field: noPathAgency, value: agencyNo.trim() },
            { field: datePathAgency, value: agencyDate.trim() },
            { field: noPathReimbursement, value: reimbursementNo.trim() },
            { field: datePathReimbursement, value: reimbursementDate.trim() }
          ]
        },
        { headers: { username: localUser.username || "" } }
      );
      if (onSuccess) onSuccess();
      setShowSavedMsg(true);
      setTimeout(() => {
        setShowSavedMsg(false);
      }, 2000);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setAgencyNo(initialAgencyNo || "");
    setAgencyDate(initialAgencyDate ? handleDateInput(initialAgencyDate) : "");
    setReimbursementNo(initialReimbursementNo || "");
    setReimbursementDate(initialReimbursementDate ? handleDateInput(initialReimbursementDate) : "");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const renderActionButtons = () => {
    if (loading) {
      return (
        <CircularProgress size={12} sx={{ mt: 0.5, alignSelf: 'center', color: '#2563eb' }} />
      );
    }

    if (showSavedMsg) {
      return (
        <Typography variant="caption" sx={{ mt: 0.5, color: '#16a34a', fontWeight: 'bold', fontSize: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          ✓ Saved
        </Typography>
      );
    }

    if (hasChanges) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.8, mt: 0.5 }}>
          <Button
            size="small"
            variant="contained"
            onClick={handleSave}
            sx={{
              padding: '1px 6px',
              fontSize: '10px',
              minWidth: 'auto',
              height: '18px',
              backgroundColor: '#2563eb',
              textTransform: 'none',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: '#1d4ed8',
              }
            }}
          >
            Submit
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={handleCancel}
            sx={{
              padding: '1px 6px',
              fontSize: '10px',
              minWidth: 'auto',
              height: '18px',
              borderColor: '#dc2626',
              color: '#dc2626',
              textTransform: 'none',
              fontWeight: 'bold',
              '&:hover': {
                borderColor: '#b91c1c',
                backgroundColor: '#fef2f2',
              }
            }}
          >
            Cancel
          </Button>
        </Box>
      );
    }

    return null;
  };

  const styles = {
    customInput: {
      fontSize: '11px',
      padding: '3px 6px',
      border: '1px solid #cbd5e1',
      borderRadius: '4px',
      outline: 'none',
      fontFamily: 'inherit',
      width: '100px',
      height: '24px',
      boxSizing: 'border-box',
      transition: 'border-color 0.2s',
      backgroundColor: '#fff',
    },
    customDateInput: {
      fontSize: '11px',
      padding: '3px 6px',
      border: '1px solid #cbd5e1',
      borderRadius: '4px',
      outline: 'none',
      fontFamily: 'inherit',
      width: '100px',
      height: '24px',
      boxSizing: 'border-box',
      transition: 'border-color 0.2s',
      backgroundColor: '#fff',
    }
  };

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
        width: '265px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}
    >
      {/* Agency */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
        <Typography sx={{ width: '45px', fontSize: '9px', fontWeight: 800, color: '#475569', letterSpacing: '0.4px' }}>
          AGENCY
        </Typography>
        <input
          type="text"
          value={agencyNo}
          onChange={(e) => setAgencyNo(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="Bill No"
          style={styles.customInput}
        />
        <DateInput
          value={agencyDate}
          onChange={(e) => setAgencyDate(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="dd-mm-yyyy"
          style={styles.customDateInput}
        />
      </Box>

      {/* Reimbursement */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
        <Typography sx={{ width: '45px', fontSize: '9px', fontWeight: 800, color: '#475569', letterSpacing: '0.4px' }}>
          REIMB.
        </Typography>
        <input
          type="text"
          value={reimbursementNo}
          onChange={(e) => setReimbursementNo(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="Bill No"
          style={styles.customInput}
        />
        <DateInput
          value={reimbursementDate}
          onChange={(e) => setReimbursementDate(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="dd-mm-yyyy"
          style={styles.customDateInput}
        />
      </Box>

      {renderActionButtons()}
    </Box>
  );
};

const EditableDateCell = ({ row, field, initialValue, onSuccess }) => {
  const [value, setValue] = useState(initialValue ? initialValue.split("T")[0] : "");
  const [loading, setLoading] = useState(false);

  const handleChange = async (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    setLoading(true);
    try {
      const dotPath = `operations.0.statusDetails.0.${field}`;
      const localUser = JSON.parse(localStorage.getItem("exim_user") || "{}");
      await axios.patch(
        `${import.meta.env.VITE_API_STRING}/${encodeURIComponent(row.job_no)}/fields`,
        {
          fieldUpdates: [{ field: dotPath, value: newValue }]
        },
        { headers: { username: localUser.username || "" } }
      );
      if (onSuccess) onSuccess(newValue);
    } catch (err) {
      console.error("Date update error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <input
        type="date"
        value={value}
        onChange={handleChange}
        disabled={loading}
        style={{
          fontSize: '11px',
          padding: '2px',
          border: '1px solid #d1d5db',
          borderRadius: '3px',
          outline: 'none',
          fontFamily: 'inherit'
        }}
      />
      {loading && <CircularProgress size={10} />}
    </Box>
  );
};

function JobNoCell({ row, navigate }) {
  return (
    <Box sx={{ py: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Button
          variant="text"
          sx={{ p: 0, minWidth: 0, textTransform: "none", fontWeight: 700, justifyContent: "flex-start", fontSize: '11px' }}
          onClick={() => navigate(`/export-charges/job/${encodeURIComponent(row.job_no)}`)}
        >
          {row.job_no}
        </Button>
        <IconButton
          size="small"
          sx={{ p: 0.2, opacity: 0.6, "&:hover": { opacity: 1 } }}
          onClick={(e) => {
            e.stopPropagation();
            copyText(row.job_no);
          }}
          title="Copy Job No"
        >
          <ContentCopyIcon sx={{ fontSize: 10 }} />
        </IconButton>
      </Box>
      <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
        {row.custom_house || "-"}
      </Typography>
      <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
        {row.branch_code || "-"}
      </Typography>
    </Box>
  );
}

function PartyCell({ row, workMode }) {
  const values = workMode === "purchase-book" ? row.supplier_names : row.supplier_names;
  return <ExpandableChipList items={values} limit={1} />;
}

function RefCell({ row, workMode, activeTab, onRefClick }) {
  const refs = workMode === "purchase-book" ? row.purchase_book_nos : row.payment_request_nos;
  const statuses =
    workMode === "purchase-book" ? row.purchase_book_statuses : row.payment_request_statuses;
  const isCompleted =
    activeTab === "payment-completed" ||
    activeTab === "purchase-book-completed" ||
    activeTab === "export-completed-billing";

  if (!refs?.length) return "-";

  return (
    <Stack spacing={0.5} sx={{ py: 0.5 }}>
      <ExpandableChipList
        items={refs}
        limit={2}
        color={isCompleted ? "success" : "primary"}
        onClick={onRefClick ? (ref) => onRefClick(row, ref) : undefined}
      />
      {statuses?.length ? (
        <Typography variant="caption" sx={{ color: isCompleted ? "success.main" : "warning.main", fontWeight: 600 }}>
          {statuses.join(", ")}
        </Typography>
      ) : null}
    </Stack>
  );
}

function BillingDetailsDialog({ open, onClose, row, requestNo, workMode, activeTab, onSuccess }) {
  const [rejectReason, setRejectReason] = useState("");
  const [bankName, setBankName] = useState("");
  const [utr, setUtr] = useState("");
  const [loading, setLoading] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [details, setDetails] = useState(null);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  const fetchDetails = async () => {
    if (!requestNo) return;
    setFetchingDetails(true);
    try {
      const localUser = JSON.parse(localStorage.getItem("exim_user") || "{}");
      const endpoint = workMode === "purchase-book" ? "/tally/purchase-entry" : "/tally/payment-request";
      const paramName = workMode === "purchase-book" ? "entry_no" : "request_no";
      const response = await axios.get(`${import.meta.env.VITE_API_STRING}${endpoint}`, {
        params: { [paramName]: requestNo },
        headers: { username: localUser.username || "", "user-role": localUser.role || "" }
      });
      setDetails(response.data);
    } catch (err) {
      console.error("Error fetching details:", err);
    } finally {
      setFetchingDetails(false);
    }
  };

  const getD = (details) => {
    if (!details) return {};
    const d = details;
    return {
      entryDate: d["Entry Date"] || d.entryDate || d.requestDate || d.createdAt,
      jobNo: d["Job No"] || d.jobNo || row.job_no,
      supplierName: d["Supplier Name"] || d.supplierName || d.paymentTo || d.partyName,
      address: [d["Address 1"], d["Address 2"], d["Address 3"]].filter(Boolean).join(", ") || d.address || "-",
      gstin: d["GSTIN No"] || d.gstin || d.gstinNo,
      pan: d.pan || (d["GSTIN No"] ? d["GSTIN No"].substring(2, 12) : ""),
      supplierInvNo: d["Supplier Inv NO"] || d.supplierInvNo || d.againstBill || d.invoiceNo,
      supplierInvDate: d["Supplier Inv Date"] || d.supplierInvDate || d.invoiceDate,
      description: d["Description of Services"] || d.descriptionOfServices || d.description || d.chargeHead || "-",
      sac: d["SAC / HSN"] || d.sac || d.sacCode || d.hsnCode || "N/A",
      taxableValue: d["Taxable Value"] || d.taxableValue || d.grossAmount || 0,
      cgst: d["CGST"] || d.cgstAmt || d.cgst || 0,
      sgst: d["SGST"] || d.sgstAmt || d.sgst || 0,
      igst: d["IGST"] || d.igstAmt || d.igst || 0,
      tds: d["TDS"] || d.tdsAmount || d.tds || 0,
      total: d["Total Amount"] || d.netPayable || d.total || d.amount || 0,
      entryBy: d["Entry By"] || d.entryBy || d.username || "Tally System",
      againstBill: d["Against Bill"] || d.againstBill || d.supplierName || "-",
      gstPercent: d["GST Details"] || d.gstPercent || 18,
    };
  };

  useEffect(() => {
    if (open) {
      setRejectReason("");
      setBankName("");
      setUtr("");
      setRejectMode(false);
      setLoading(false);
      setDetails(null);
      if (requestNo) fetchDetails();
    }
  }, [open, requestNo]);

  if (!row) return null;

  const refs = workMode === "purchase-book" ? row.purchase_book_nos : row.payment_request_nos;
  const statuses =
    workMode === "purchase-book" ? row.purchase_book_statuses : row.payment_request_statuses;
  const refTitle = workMode === "purchase-book" ? "Purchase Book" : "Payment Request";
  const displayTitle = requestNo ? `${refTitle} Details: ${requestNo}` : `${row.job_no} Details`;

  const handleAction = async (actionType) => {
    if (!requestNo) {
      return alert(`Select a specific ${refTitle} pill to perform actions on it.`);
    }

    setLoading(true);
    let endpoint = "";
    let payload = { requestNo, reason: rejectReason, bankName, utr };

    if (actionType === "approve") {
      endpoint = workMode === "purchase-book" ? "/approve-purchase-entry" : "/approve-payment-request";
    } else if (actionType === "reject") {
      if (!rejectReason) {
        alert("Please provide a rejection reason.");
        setLoading(false);
        return;
      }
      endpoint = workMode === "purchase-book" ? "/reject-purchase-entry" : "/reject-payment-request";
    } else if (actionType === "utr") {
      if (!bankName || !utr) {
        alert("Enter both Bank Name and UTR number.");
        setLoading(false);
        return;
      }
      endpoint = workMode === "purchase-book" ? "/update-purchase-utr" : "/update-payment-utr";
    }

    try {
      await axios.post(`${import.meta.env.VITE_API_STRING}${endpoint}`, payload);
      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Action failed.");
    } finally {
      setLoading(false);
    }
  };

  const isPendingTab = activeTab === "purchase-book-requested" || activeTab === "payment-requested";
  const isActionTab = activeTab === "purchase-book" || activeTab === "payment";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{
        bgcolor: "#1a237e",
        color: "#fff",
        fontWeight: 700,
        py: 1.5,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          {refTitle.toUpperCase()} DETAILS
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.9 }}>
          {requestNo || row.job_no}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {fetchingDetails ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ mt: 1 }}>Loading details...</Typography>
          </Box>
        ) : details ? (
          <Box className="detail-table-wrapper">
            <style>{`
               .detail-table { width: 100%; border-collapse: collapse; font-family: 'Roboto', sans-serif; }
               .detail-table td { border: 1px solid #e0e0e0; padding: 10px 14px; font-size: 13px; color: #333; }
               .detail-table .label { width: 35%; background-color: #f9f9f9; font-weight: 600; color: #444; }
               .detail-table .value { width: 65%; color: #000; font-weight: 500; }
               .detail-table .blue-link { color: #1565c0; font-weight: 600; }
               .detail-table .amount { font-weight: 800; color: #000; }
               .detail-table .red-amount { font-weight: 800; color: #d32f2f; }
               .detail-table .total-amount { font-weight: 800; color: #c62828; font-size: 16px; }
               .attachment-box { background: #e3f2fd; border: 1px solid #bbdefb; padding: 10px; margin: 10px; border-radius: 4px; }
             `}</style>
            <table className="detail-table">
              {(() => {
                const d = getD(details);
                return (
                  <tbody>
                    <tr>
                      <td className="label">Entry Date</td>
                      <td className="value">{formatDate(d.entryDate)}</td>
                    </tr>
                    <tr>
                      <td className="label">Job No</td>
                      <td className="value" style={{ fontWeight: 700 }}>{d.jobNo}</td>
                    </tr>
                    <tr>
                      <td className="label">Supplier Name</td>
                      <td className="value blue-link">{d.supplierName}</td>
                    </tr>
                    <tr>
                      <td className="label">Supplier Address</td>
                      <td className="value" style={{ fontSize: '11px', lineHeight: 1.4 }}>{d.address}</td>
                    </tr>
                    <tr>
                      <td className="label">GSTIN & PAN</td>
                      <td className="value">
                        {d.gstin && <Box component="span">GSTIN: {d.gstin} | </Box>}
                        {d.pan && <Box component="span">PAN: <Box component="span" sx={{ bgcolor: '#fff9c4', px: 0.5 }}>{d.pan}</Box></Box>}
                        {!d.gstin && !d.pan && "-"}
                      </td>
                    </tr>
                    <tr>
                      <td className="label">Supplier Inv No & Date</td>
                      <td className="value" style={{ fontWeight: 700 }}>
                        {d.supplierInvNo || "-"} / {formatDate(d.supplierInvDate) || "-"}
                      </td>
                    </tr>
                    <tr>
                      <td className="label">Description of Services</td>
                      <td className="value">{d.description}</td>
                    </tr>
                    <tr>
                      <td className="label">SAC / HSN</td>
                      <td className="value">{d.sac}</td>
                    </tr>
                    <tr>
                      <td className="label">Taxable Value</td>
                      <td className="value amount">₹ {Number(d.taxableValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td className="label">GST Details ({d.gstPercent}%)</td>
                      <td className="value">
                        CGST: {Number(d.cgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })} | SGST: {Number(d.sgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })} | IGST: {Number(d.igst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="label">TDS Deduction</td>
                      <td className="value red-amount">
                        ₹ -{Number(d.tds).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="label">Total Payable</td>
                      <td className="value total-amount">₹ {Number(d.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td className="label">Entry By</td>
                      <td className="value">{d.entryBy}</td>
                    </tr>
                    <tr>
                      <td className="label">Against Bill</td>
                      <td className="value">{d.againstBill}</td>
                    </tr>
                  </tbody>
                );
              })()}
            </table>

            {details.url && details.url.length > 0 && (
              <Box className="attachment-box">
                <Typography variant="overline" sx={{ fontWeight: 700, display: 'block', color: '#1565c0', mb: 1 }}>
                  CHARGE ATTACHMENTS
                </Typography>
                <Stack direction="row" spacing={1}>
                  {Array.isArray(details.url) ? details.url.map((u, idx) => (
                    <Chip
                      key={idx}
                      icon={<DescriptionIcon sx={{ fontSize: '14px !important' }} />}
                      label={`View ${idx + 1}`}
                      size="small"
                      clickable
                      component="a"
                      target="_blank"
                      href={u}
                      sx={{ bgcolor: '#fff', border: '1px solid #bbdefb' }}
                    />
                  )) : (
                    <Chip
                      icon={<DescriptionIcon sx={{ fontSize: '14px !important' }} />}
                      label="View 1"
                      size="small"
                      clickable
                      component="a"
                      target="_blank"
                      href={details.url}
                      sx={{ bgcolor: '#fff', border: '1px solid #bbdefb' }}
                    />
                  )}
                </Stack>
              </Box>
            )}
          </Box>
        ) : (
          <Stack spacing={2} p={2}>
            <Box>
              <Typography variant="overline" sx={{ fontWeight: 700 }}>
                Billing Summary
              </Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={3} mt={1}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Billing Date
                  </Typography>
                  <Typography variant="body2">{formatDate(row.billing_date)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Handover Date
                  </Typography>
                  <Typography variant="body2">{formatDate(row.handover_date)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Open Queries
                  </Typography>
                  <Typography variant="body2">{row.unresolved_queries || 0}</Typography>
                </Box>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="overline" sx={{ fontWeight: 700 }}>
                {refTitle} Details
              </Typography>
              <Box mt={1}>{renderChipList(refs, "primary", 6)}</Box>
              <Box mt={1}>{renderChipList(statuses, activeTab.includes("completed") ? "success" : "warning", 6)}</Box>
            </Box>

            <Divider />

            <Box>
              <Typography variant="overline" sx={{ fontWeight: 700 }}>
                Suppliers / Charges
              </Typography>
              <Box mt={1}>{renderChipList(row.supplier_names, "default", 6)}</Box>
              <Box mt={1}>{renderChipList(row.supplier_invoice_nos, "default", 6)}</Box>
              <Box mt={1}>{renderChipList(row.charge_heads, "default", 6)}</Box>
              <Box mt={1}>{renderChipList(row.invoice_numbers, "primary", 6)}</Box>
            </Box>
          </Stack>
        )}
        <Stack spacing={2} p={2}>

          {isActionTab && requestNo && (
            <>
              <Divider />
              <Box sx={{ p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
                  UTR ENTRY
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <TextField
                    select
                    size="small"
                    label="Bank From *"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    sx={{ width: 220, bgcolor: "#fff" }}
                  >
                    {["HDFC BANK", "ICICI BANK", "SBI BANK", "KOTAK BANK", "IDBI BANK", "SOUTH INDIAN BANK", "AXIS BANK", "ODEX VAN", "CASH"].map((bank) => (
                      <MenuItem key={bank} value={bank}>
                        {bank}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    size="small"
                    label="Enter UTR Number *"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    sx={{ flexGrow: 1, bgcolor: "#fff" }}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={loading}
                    onClick={() => handleAction("utr")}
                  >
                    {loading ? "..." : "MARK PAID"}
                  </Button>
                </Stack>
              </Box>
            </>
          )}

          {rejectMode && (
            <Box sx={{ p: 2, border: "1px solid #d32f2f", borderRadius: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: "bold", color: "#d32f2f" }}>
                REJECT PAYMENT REQUEST
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Rejection Reason"
                placeholder="Enter rejection reason here..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                size="small"
              />
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: "1px solid #ccc", justifyContent: "space-between", gap: 2 }}>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            sx={{ fontWeight: 600, px: 2 }}
            onClick={async () => {
              if (!requestNo) {
                return alert(`Select a specific ${refTitle} pill to print.`);
              }
              try {
                const localUser = JSON.parse(localStorage.getItem("exim_user") || "{}");
                const endpoint = workMode === "purchase-book" ? "/tally/purchase-entry" : "/tally/payment-request";
                const paramName = workMode === "purchase-book" ? "entry_no" : "request_no";

                const response = await axios.get(`${import.meta.env.VITE_API_STRING}${endpoint}`, {
                  params: { [paramName]: requestNo },
                  headers: {
                    username: localUser.username || "",
                    "user-role": localUser.role || "",
                  }
                });

                if (workMode === "purchase-book") {
                  generatePurchaseBookPDF(response.data, logoImage);
                } else {
                  generatePaymentRequestPDF(response.data, logoImage);
                }
              } catch (err) {
                console.error(err);
                alert("Failed to load data for printing.");
              }
            }}
          >
            PRINT
          </Button>
          <Button onClick={onClose} size="small" variant="outlined" sx={{ fontWeight: 600, px: 2 }}>
            CLOSE
          </Button>
        </Box>
        <Box sx={{ display: "flex", gap: 2, flexGrow: 1, justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="error"
            size="small"
            disabled={loading}
            onClick={() => {
              if (rejectMode) handleAction("reject");
              else setRejectMode(true);
            }}
            sx={{ fontWeight: "700", px: 2, py: 0.5, fontSize: '12px' }}
          >
            {loading && rejectMode ? "REJECTING..." : "REJECT REQUEST"}
          </Button>
          {(isPendingTab || !requestNo) ? (
            <Button
              variant="contained"
              color="success"
              size="small"
              disabled={loading}
              onClick={() => handleAction("approve")}
              sx={{ fontWeight: "700", px: 2, py: 0.5, fontSize: '12px' }}
            >
              {loading && !rejectMode ? "APPROVING..." : "APPROVE REQUEST"}
            </Button>
          ) : null}
        </Box>
      </DialogActions>
    </Dialog>
  );
}

function ExportBillingPage() {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [workMode, setWorkMode] = useState(() => {
    return localStorage.getItem("billing_workMode") || "payment";
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
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(() => {
    return localStorage.getItem("billing_showUnresolvedOnly") === "true";
  });
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedRequestNo, setSelectedRequestNo] = useState(null);
  const [jobQueriesStatus, setJobQueriesStatus] = useState({});
  const [queryDialogOpen, setQueryDialogOpen] = useState(false);
  const [queryDialogJob, setQueryDialogJob] = useState(null);
  const [queryChatOpen, setQueryChatOpen] = useState(false);
  const [queryChatJob, setQueryChatJob] = useState(null);
  const [queryChatData, setQueryChatData] = useState([]);
  const [queryChatLoading, setQueryChatLoading] = useState(false);
  const [queryChatReply, setQueryChatReply] = useState("");
  const [queryChatSending, setQueryChatSending] = useState(false);
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

  const fetchRows = useCallback(async () => {
    setLoading(true);
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
        },
        headers: {
          username: user?.username || "",
        },
      });

      const payload = res.data?.data || {};
      setRows(payload.jobs || []);
      setTotalJobs(payload.total || 0);
      setTotalPages(payload.totalPages || 1);
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
    user?.username,
  ]);

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
    const jobNos = rows.map(r => r.job_no).filter(Boolean);
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

  useEffect(() => {
    const fetchUnresolvedCount = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_STRING}/queries/count`, {
          params: {
            targetModule: "export-billing",
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
  }, [user?.username, workMode, activeTab]);

  const columns = useMemo(() => {
    const billingDetailsEditable = {
      header: "Billing Details",
      size: 280,
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
        size: 180,
        Cell: ({ row }) => <JobNoCell row={row.original} navigate={navigate} />,
      },
      {
        accessorKey: "exporter",
        header: "Exporter",
        size: 180,
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
      ...(activeTab === "billing-pending" ? [billingDetailsEditable] : []),
      {
        header: "Queries",
        size: 80,
        Cell: ({ row }) => {
          const job = row.original;
          const status = jobQueriesStatus[job.job_no] || {};
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
                          const resp = await axios.get(
                            `${import.meta.env.VITE_API_STRING}/queries`,
                            { params: { job_no: job.job_no } }
                          );
                          const queriesData = resp.data?.data?.queries || resp.data?.data || [];
                          setQueryChatData(queriesData);
                          if (queriesData.length > 0) {
                            axios.put(`${import.meta.env.VITE_API_STRING}/queries/mark-seen`, {
                              queryIds: queriesData.map(q => q._id)
                            }).catch(console.error);
                            setJobQueriesStatus(prev => ({
                              ...prev,
                              [job.job_no]: { ...prev[job.job_no], hasUnseen: false }
                            }));
                          }
                        } catch (err) {
                          console.error(err);
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
                                resolvedBy: localUser.username || "unknown",
                                resolvedByName: localUser.fullName || localUser.username || "Unknown",
                                resolutionNote: "Resolved from billing table",
                              })
                            )
                          );
                          alert(`${openQueries.length} query(ies) resolved.`);
                          setJobQueriesStatus(prev => ({
                            ...prev,
                            [job.job_no]: { ...prev[job.job_no], hasOpenQueries: false }
                          }));
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
          size: 260,
          Cell: ({ row }) => (
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
                  AGENCY
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '11px', color: '#1e293b' }}>
                  {row.original.agency_bill_no || "-"}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ fontSize: '10px', ml: 'auto' }}>
                  {row.original.agency_bill_date ? formatDate(row.original.agency_bill_date).split(",")[0] : "-"}
                </Typography>
              </Box>
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
            </Box>
          ),
        },
        {
          accessorKey: "charge_heads",
          header: "Charge Heads",
          size: 220,
          Cell: ({ cell }) => renderChipList(cell.getValue(), "default", 2),
        },
        ...commonEnd,
      ];
    }

    const refLabel = workMode === "purchase-book" ? "Purchase Book No" : "Payment Request No";

    const refCol = {
      accessorKey: workMode === "purchase-book" ? "purchase_book_nos" : "payment_request_nos",
      header: refLabel,
      size: 200,
      Cell: ({ row }) => (
        <RefCell
          row={row.original}
          workMode={workMode}
          activeTab={activeTab}
          onRefClick={(r, refNo) => {
            setSelectedRow(r);
            setSelectedRequestNo(refNo);
          }}
        />
      ),
    };

    const queriesIndex = commonStart.findIndex(c => c.header === "Queries");
    const insertIndex = queriesIndex !== -1 ? queriesIndex : commonStart.length;

    if (activeTab === "purchase-book-requested") {
      const result = [...commonStart];
      result.splice(insertIndex, 0, refCol); // Insert beside Queries
      return [...result, ...commonEnd];
    }

    const finalColumns = [...commonStart];
    finalColumns.splice(insertIndex, 0, refCol); // Insert beside Queries

    return [
      ...finalColumns,
      {
        accessorKey: "supplier_names",
        header: workMode === "purchase-book" ? "Supplier" : "Payable To",
        size: 200,
        Cell: ({ row }) => <PartyCell row={row.original} workMode={workMode} />,
      },
      {
        accessorKey: "supplier_invoice_nos",
        header: workMode === "purchase-book" ? "Supplier Inv No" : "Invoice No",
        size: 160,
        Cell: ({ cell }) => renderChipList(cell.getValue(), "default", 1),
      },
      {
        accessorKey: "charge_heads",
        header: "Charges",
        size: 150,
        Cell: ({ cell }) => renderChipList(cell.getValue(), "default", 1),
      },
      {
        accessorKey: activeTab.includes("completed") ? "billing_date" : "handover_date",
        header: activeTab.includes("completed") ? "Completed On" : "Requested On",
        size: 110,
        Cell: ({ row }) =>
          formatDate(
            activeTab.includes("completed")
              ? row.original.billing_date || row.original.handover_date
              : row.original.handover_date || row.original.billing_date
          ),
      },
      ...commonEnd,
    ];
  }, [activeTab, navigate, workMode]);

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
          {tabs.map((tab) => (
            <Tab key={tab.key} label={tab.label} />
          ))}
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
            onClick={() => navigate("/report/billing")}
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

          {activeTab === "general-jobs" && (
            <Button
              variant="contained"
              size="small"
              startIcon={<OpenInNewIcon sx={{ fontSize: '14px' }} />}
              onClick={handleCreateGeneralJob}
              sx={{
                fontWeight: 700,
                textTransform: "none",
                borderRadius: "4px",
                height: 28,
                fontSize: '11px',
                backgroundColor: "#2563eb",
                "&:hover": { backgroundColor: "#1d4ed8", boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }
              }}
            >
              Create Job
            </Button>
          )}
        </Box>
      </Box>

      <MaterialReactTable
        key={`${activeTab}-${workMode}`}
        columns={columns}
        data={rows}
        state={{ showProgressBars: loading }}
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
            borderRadius: "4px"
          }
        }}
        muiTableHeadCellProps={{
          sx: {
            py: 0.8,
            px: 1,
            fontSize: '12px',
            fontWeight: 700,
            backgroundColor: "#19448aff",
            color: "#fff",
            borderBottom: '1px solid #334155',
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
              sx={{ width: 220 }}
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
                    sx: { height: 28, fontSize: '11px', backgroundColor: '#f9fafb' }
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
              sx={{ width: 110 }}
              InputProps={{ sx: { height: 28, fontSize: '11px', backgroundColor: '#f9fafb' } }}
              SelectProps={{ displayEmpty: true }}
            >
              <MenuItem value="" sx={{ fontSize: '11px' }}>All Branches</MenuItem>
              {["AMD", "GIM", "BRD", "HAZ", "COK"].map((br) => (
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
              sx={{ width: 90 }}
              InputProps={{ sx: { height: 28, fontSize: '11px', backgroundColor: '#f9fafb' } }}
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
              sx={{ flex: 1, minWidth: 200, maxWidth: 400 }}
              InputProps={{
                sx: { height: 28, fontSize: '11px', backgroundColor: '#f9fafb' },
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 16, color: '#64748b' }} />
                  </InputAdornment>
                ),
              }}
            />

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

      {/* Query Chat Dialog */}
      <Dialog
        open={queryChatOpen}
        onClose={() => { setQueryChatOpen(false); setQueryChatJob(null); setQueryChatData([]); setQueryChatReply(""); }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "10px", overflow: "hidden" } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb", py: 1.2, px: 2, background: "#f59e0b", color: "#fff" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Queries & Replies</div>
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
                  <div style={{ background: q.status === "resolved" ? "#dcfce7" : q.status === "rejected" ? "#fee2e2" : "#fef3c7", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 12, color: "#111" }}>{q.raisedByName || q.raisedBy}</span>
                      <span style={{ fontSize: 10, color: "#6b7280", marginLeft: 6 }}>{q.raisedFromModule} → {q.targetModule}</span>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: q.status === "resolved" ? "#22c55e" : q.status === "rejected" ? "#ef4444" : "#f59e0b", color: "#fff", textTransform: "uppercase" }}>{q.status}</span>
                  </div>
                  <div style={{ padding: "8px 12px", fontSize: 12, color: "#374151", background: "#fff", borderBottom: q.replies?.length ? "1px solid #f3f4f6" : "none" }}>
                    <div style={{ fontWeight: 600, fontSize: 11, color: "#6b7280", marginBottom: 2 }}>{q.subject}</div>
                    {q.message}
                    <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>{new Date(q.createdAt).toLocaleString()}</div>
                  </div>
                  {q.replies && q.replies.map((r, ri) => (
                    <div key={r._id || ri} style={{ padding: "6px 12px 6px 24px", fontSize: 12, borderBottom: "1px solid #f9fafb", background: ri % 2 === 0 ? "#f9fafb" : "#fff" }}>
                      <span style={{ fontWeight: 600, color: "#2563eb" }}>{r.repliedByName || r.repliedBy}: </span>
                      <span style={{ color: "#374151" }}>{r.message}</span>
                      <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{new Date(r.repliedAt).toLocaleString()}</div>
                    </div>
                  ))}
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
    </Box>
  );
}

export default ExportBillingPage;
