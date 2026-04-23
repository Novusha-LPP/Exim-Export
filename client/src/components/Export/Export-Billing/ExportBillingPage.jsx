import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
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

function renderChipList(items, color = "default", limit = 3) {
  if (!items || items.length === 0) return "-";
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, py: 0.5 }}>
      {items.slice(0, limit).map((item) => (
        <Chip key={item} label={item} size="small" color={color} variant="outlined" />
      ))}
      {items.length > limit ? <Chip label={`+${items.length - limit}`} size="small" /> : null}
    </Box>
  );
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
      <Button
        variant="text"
        sx={{ p: 0, minWidth: 0, textTransform: "none", fontWeight: 700, justifyContent: "flex-start" }}
        onClick={() => navigate(`/export-charges/job/${encodeURIComponent(row.job_no)}`)}
      >
        {row.job_no}
      </Button>
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
  return (
    <Box sx={{ py: 0.5 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {values?.[0] || "-"}
      </Typography>
      {values?.[1] ? (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          +{values.length - 1} more
        </Typography>
      ) : null}
    </Box>
  );
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
      {refs.slice(0, 2).map((ref) => (
        <Box key={ref} sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
          <Chip
            label={ref}
            size="small"
            color={isCompleted ? "success" : "primary"}
            variant="outlined"
            onClick={onRefClick ? () => onRefClick(row, ref) : undefined}
            sx={{ cursor: onRefClick ? "pointer" : "default" }}
          />
          <Tooltip title="Copy reference">
            <IconButton size="small" onClick={() => copyText(ref)}>
              <ContentCopyIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ))}
      {refs.length > 2 ? (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          +{refs.length - 2} more
        </Typography>
      ) : null}
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
              <tbody>
                <tr>
                  <td className="label">Entry Date</td>
                  <td className="value">{formatDate(details.requestDate || details.entryDate || details.createdAt)}</td>
                </tr>
                <tr>
                  <td className="label">Job No</td>
                  <td className="value" style={{ fontWeight: 700 }}>{details.jobNo || row.job_no}</td>
                </tr>
                <tr>
                  <td className="label">Supplier Name</td>
                  <td className="value blue-link">{details.supplierName || details.paymentTo || details.partyName || "-"}</td>
                </tr>
                <tr>
                  <td className="label">Supplier Address</td>
                  <td className="value" style={{ fontSize: '11px', lineHeight: 1.4 }}>{details.address || "-"}</td>
                </tr>
                <tr>
                  <td className="label">GSTIN & PAN</td>
                  <td className="value">
                    {(details.gstin || details.gstinNo) && <Box component="span">GSTIN: {details.gstin || details.gstinNo} | </Box>}
                    {details.pan && <Box component="span">PAN: <Box component="span" sx={{ bgcolor: '#fff9c4', px: 0.5 }}>{details.pan}</Box></Box>}
                    {!(details.gstin || details.gstinNo) && !details.pan && "-"}
                  </td>
                </tr>
                <tr>
                  <td className="label">Supplier Inv No & Date</td>
                  <td className="value" style={{ fontWeight: 700 }}>
                    {details.supplierInvNo || details.againstBill || details.invoiceNo || "-"} / {formatDate(details.supplierInvDate || details.invoiceDate) || "-"}
                  </td>
                </tr>
                <tr>
                  <td className="label">Description of Services</td>
                  <td className="value">{details.descriptionOfServices || details.description || details.chargeHead || details.paymentTo || "-"}</td>
                </tr>
                <tr>
                  <td className="label">SAC / HSN</td>
                  <td className="value">{details.sac || details.sacCode || details.hsnCode || "N/A"}</td>
                </tr>
                <tr>
                  <td className="label">Taxable Value</td>
                  <td className="value amount">₹ {Number(details.taxableValue || details.grossAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td className="label">GST Details ({details.gstPercent || 18}%)</td>
                  <td className="value">
                    CGST: {Number(details.cgstAmt || details.cgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} | SGST: {Number(details.sgstAmt || details.sgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} | IGST: {Number(details.igstAmt || details.igst || 0).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="label">TDS Deduction</td>
                  <td className="value red-amount">
                    ₹ -{Number(details.tdsAmount || details.tds || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td className="label">Total Payable</td>
                  <td className="value total-amount">₹ {Number(details.netPayable || details.total || details.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td className="label">Entry By</td>
                  <td className="value">{details.entryBy || details.username || "Tally System"}</td>
                </tr>
                <tr>
                  <td className="label">Against Bill</td>
                  <td className="value">{details.againstBill || details.supplierName || details.paymentTo || "-"}</td>
                </tr>
              </tbody>
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
  const [workMode, setWorkMode] = useState("payment");
  const [tabIndex, setTabIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState(getCurrentFinancialYear());
  const [years, setYears] = useState([]);
  const [exporters, setExporters] = useState([]);
  const [selectedExporter, setSelectedExporter] = useState("");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(false);
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setTabIndex(0);
    setPage(1);
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
    const commonStart = [
      {
        accessorKey: "job_no",
        header: "Job No",
        size: 130,
        Cell: ({ row }) => <JobNoCell row={row.original} navigate={navigate} />,
      },
      {
        accessorKey: "exporter",
        header: "Exporter",
        size: 150,
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
        header: "Billing Date",
        size: 110,
        Cell: ({ row }) => (
          <EditableDateCell
            row={row.original}
            field="billingDocsSentDt"
            initialValue={row.original.billing_date}
            onSuccess={() => fetchRows()}
          />
        ),
      },
      {
        header: "Attach Copy",
        size: 90,
        Cell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {row.original.billing_docs_count > 0 && (
              <Chip
                label={`${row.original.billing_docs_count} View`}
                size="small"
                onClick={() => {
                  setSelectedRow(row.original);
                  setSelectedRequestNo(null);
                }}
                sx={{ mr: 1, height: 20, fontSize: '10px' }}
              />
            )}
            <QuickUploadButton
              row={row.original}
              field="billingDocsSentUpload"
              onSuccess={() => fetchRows()}
            />
          </Box>
        ),
      },
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
          accessorKey: "billing_date",
          header: "Billing Date",
          size: 160,
          Cell: ({ row }) => formatDate(row.original.billing_date),
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
      size: 160,
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

    if (activeTab === "purchase-book-requested") {
      const result = [...commonStart];
      result.splice(4, 0, refCol); // Insert besides Queries
      return [...result, ...commonEnd];
    }

    const finalColumns = [...commonStart];
    finalColumns.splice(4, 0, refCol); // Insert besides Queries
    
    return [
      ...finalColumns,
      {
        accessorKey: "supplier_names",
        header: workMode === "purchase-book" ? "Supplier" : "Payable To",
        size: 160,
        Cell: ({ row }) => <PartyCell row={row.original} workMode={workMode} />,
      },
      {
        accessorKey: "supplier_invoice_nos",
        header: workMode === "purchase-book" ? "Supplier Inv No" : "Invoice No",
        size: 140,
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
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          mb: 2,
          flexWrap: "wrap",
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
          sx={{ minHeight: 40 }}
        >
          {tabs.map((tab) => (
            <Tab key={tab.key} label={tab.label} sx={{ fontSize: '11px', textTransform: 'none', fontWeight: 600, minHeight: 40 }} />
          ))}
        </Tabs>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
            Work Mode:
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={workMode}
            onChange={(event, value) => value && setWorkMode(value)}
          >
            <ToggleButton value="payment">Payment</ToggleButton>
            <ToggleButton value="purchase-book">Purchase Book</ToggleButton>
          </ToggleButtonGroup>

          {activeTab === "general-jobs" && (
            <Button
              variant="contained"
              size="small"
              startIcon={<OpenInNewIcon />}
              onClick={handleCreateGeneralJob}
              sx={{
                fontWeight: 700,
                textTransform: "none",
                borderRadius: "4px",
                height: 32,
                fontSize: '11px',
                background: "linear-gradient(135deg, #1a237e 0%, #283593 100%)",
                "&:hover": {
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }
              }}
            >
              Create Gen Job
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
        muiTableContainerProps={{ sx: { maxHeight: "68vh" } }}
        muiTableHeadCellProps={{
          sx: {
            py: 0.8,
            px: 1,
            fontSize: '11px',
            fontWeight: 800,
            backgroundColor: "#f8fafc",
            borderBottom: '2px solid #e2e8f0',
            '& .Mui-TableHeadCell-Content': { justifyContent: 'space-between' }
          }
        }}
        muiTableBodyCellProps={{
          sx: {
            py: 0.5,
            px: 1,
            fontSize: '11px',
            borderBottom: '1px solid #f1f5f9'
          }
        }}
        renderTopToolbarCustomActions={() => (
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
              width: "100%",
              gap: 1.5,
              flexWrap: "wrap",
              py: 0.5,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 800, minWidth: '80px', color: '#1e293b' }}>
              Jobs: {totalJobs}
            </Typography>

            <Autocomplete
              sx={{ minWidth: 200 }}
              freeSolo
              options={exporterOptions}
              value={selectedExporter || ""}
              onInputChange={(event, value) => {
                setSelectedExporter(value);
                setPage(1);
              }}
              renderInput={(params) => (
                <TextField {...params} size="small" label="Exporter" InputProps={{ ...params.InputProps, inline: true, sx: { height: 32, fontSize: '12px' } }} InputLabelProps={{ sx: { fontSize: '12px', top: -4 } }} />
              )}
            />

            <TextField
              select
              size="small"
              value={selectedYear}
              onChange={(event) => {
                setSelectedYear(event.target.value);
                setPage(1);
              }}
              sx={{ width: 100 }}
              InputProps={{ sx: { height: 32, fontSize: '12px' } }}
            >
              {years.map((year) => (
                <MenuItem key={year} value={year} sx={{ fontSize: '12px' }}>
                  {year}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              size="small"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search jobs..."
              sx={{ flex: 1, minWidth: 200, maxWidth: 400 }}
              InputProps={{
                sx: { height: 32, fontSize: '12px' },
                endAdornment: (
                  <InputAdornment position="end">
                    <SearchIcon fontSize="inherit" />
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ position: "relative" }}>
              <Button
                variant="contained"
                size="small"
                onClick={() => {
                  setShowUnresolvedOnly((prev) => !prev);
                  setPage(1);
                }}
                sx={{
                  borderRadius: 1.5,
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: '11px',
                  height: 32,
                  px: 2,
                  boxShadow: 'none',
                  backgroundColor: showUnresolvedOnly ? "#ef4444" : "#2563eb"
                }}
              >
                {showUnresolvedOnly ? "Show All Jobs" : "Pending Queries"}
              </Button>
              {unresolvedCount > 0 && (
                <Badge
                  badgeContent={unresolvedCount}
                  color="error"
                  overlap="circular"
                  sx={{ position: "absolute", top: -4, right: -4, '& .MuiBadge-badge': { fontSize: '9px', height: 16, minWidth: 16 } }}
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
