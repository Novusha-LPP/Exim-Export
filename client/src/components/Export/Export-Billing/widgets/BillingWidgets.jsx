import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Box,
  Button,
  IconButton,
  CircularProgress,
  Typography,
  Stack,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { uploadFileToS3 } from "../../../../utils/awsFileUpload";
import DateInput from "../../../common/DateInput.js";
import { handleDateInput } from "../../../../utils/dateUtils.js";

export function getCurrentFinancialYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 4
    ? `${String(year).slice(-2)}-${String(year + 1).slice(-2)}`
    : `${String(year - 1).slice(-2)}-${String(year).slice(-2)}`;
}

export function formatDate(value) {
  if (!value) return "-";

  const str = String(value).trim();
  const dmyRegex = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[\s,]+(\d{1,2}):(\d{1,2}))?/;
  const match = str.match(dmyRegex);

  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    const hour = match[4];
    const minute = match[5];
    if (hour && minute) {
      return `${day}/${month}/${year}, ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    }
    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year}, ${hour}:${minute}`;
}

export function copyText(text) {
  if (!text) return;
  navigator.clipboard.writeText(text).catch((error) => {
    console.error("Copy failed:", error);
  });
}

export const ExpandableChipList = ({ items, limit = 2, color = "default", onClick }) => {
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

export function renderChipList(items, color = "default", limit = 3) {
  return <ExpandableChipList items={items} color={color} limit={limit} />;
}

export const QuickUploadButton = ({ row, field, onSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadFileToS3(file, "export_docs");
      const url = result.Location;

      const dotPath = `operations.0.statusDetails.0.${field}`;
      const localUser = JSON.parse(localStorage.getItem("exim_user") || "{}");

      await axios.patch(
        `${import.meta.env.VITE_API_STRING}/${encodeURIComponent(row.job_no)}/fields`,
        {
          fieldUpdates: [{ field: dotPath, value: [url] }]
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
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv,.mp4,.webm,.ogg,.mov,.avi,.mkv,application/pdf,image/jpeg,image/png,video/*"
        style={{ display: "none" }}
      />
    </>
  );
};

export const EditableBillingPair = ({
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

  const isFreightForwarding =
    Boolean(row?.isFreightForwarding) ||
    String(row?.job_no || "").toUpperCase().startsWith("FF") ||
    String(row?.job_no || "").toUpperCase().includes("FF-") ||
    String(row?.job_no || "").toUpperCase().includes("/FF/") ||
    String(row?.job_type || "").toLowerCase().includes("freight") ||
    String(row?.detailedStatus || "").toLowerCase().includes("freight");

  const hasChanges =
    agencyNo !== (initialAgencyNo || "") ||
    agencyDate !== (initialAgencyDate || "") ||
    (!isFreightForwarding && (
      reimbursementNo !== (initialReimbursementNo || "") ||
      reimbursementDate !== (initialReimbursementDate || "")
    ));

  const handleSave = async () => {
    if (!hasChanges) return;

    const isAgencyEmpty = !agencyNo.trim() && !agencyDate.trim();
    const isAgencyFilled = agencyNo.trim() && agencyDate.trim();
    if (!isAgencyEmpty && !isAgencyFilled) {
      alert(`Please enter both Bill No and Bill Date for the ${isFreightForwarding ? "Bill" : "Agency Bill"}!`);
      return;
    }

    if (!isFreightForwarding) {
      const isReimbursementEmpty = !reimbursementNo.trim() && !reimbursementDate.trim();
      const isReimbursementFilled = reimbursementNo.trim() && reimbursementDate.trim();
      if (!isReimbursementEmpty && !isReimbursementFilled) {
        alert("Please enter both Bill No and Bill Date for the Reimbursement Bill!");
        return;
      }
    }

    setLoading(true);
    try {
      const localUser = JSON.parse(localStorage.getItem("exim_user") || "{}");
      const fieldUpdates = [
        { field: noPathAgency, value: agencyNo.trim() },
        { field: datePathAgency, value: agencyDate.trim() }
      ];
      if (!isFreightForwarding) {
        fieldUpdates.push(
          { field: noPathReimbursement, value: reimbursementNo.trim() },
          { field: datePathReimbursement, value: reimbursementDate.trim() }
        );
      }
      await axios.patch(
        `${import.meta.env.VITE_API_STRING}/${encodeURIComponent(row.job_no)}/fields`,
        {
          fieldUpdates
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
        <CircularProgress size={16} sx={{ color: '#2563eb' }} />
      );
    }

    if (showSavedMsg) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#16a34a' }} />
          <Typography sx={{ fontSize: '9px', color: '#16a34a', fontWeight: 700, letterSpacing: '0.3px' }}>SAVED</Typography>
        </Box>
      );
    }

    if (!hasChanges) return null;

    return (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <button
          onClick={handleSave}
          title="Save (Enter)"
          style={{
            border: 'none',
            background: '#16a34a',
            color: '#fff',
            borderRadius: '4px',
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold',
            padding: 0
          }}
        >
          ✓
        </button>
        <button
          onClick={handleCancel}
          title="Cancel (Esc)"
          style={{
            border: 'none',
            background: '#dc2626',
            color: '#fff',
            borderRadius: '4px',
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold',
            padding: 0
          }}
        >
          ✕
        </button>
      </Box>
    );
  };

  const fieldStyle = {
    padding: '3px 6px',
    fontSize: '11px',
    border: '1px solid transparent',
    borderRadius: '4px',
    outline: 'none',
    width: '80px',
    height: '26px',
    boxSizing: 'border-box',
    transition: 'all 0.15s ease',
    backgroundColor: '#f1f5f9',
    color: '#1e293b',
  };

  const fieldFocusHandlers = {
    onFocus: (e) => {
      e.target.style.borderColor = '#93c5fd';
      e.target.style.backgroundColor = '#fff';
      e.target.style.boxShadow = '0 0 0 2px rgba(59,130,246,0.12)';
    },
    onBlur: (e) => {
      e.target.style.borderColor = 'transparent';
      e.target.style.backgroundColor = '#f1f5f9';
      e.target.style.boxShadow = 'none';
    },
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Typography
          sx={{
            fontSize: '9.5px',
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            minWidth: isFreightForwarding ? '26px' : '40px'
          }}
        >
          {isFreightForwarding ? "Bill" : "Agcy"}
        </Typography>
        <input
          type="text"
          value={agencyNo}
          onChange={(e) => setAgencyNo(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="Bill No"
          style={fieldStyle}
          {...fieldFocusHandlers}
        />
        <input
          type="text"
          value={agencyDate}
          onChange={(e) => setAgencyDate(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="dd-mm-yyyy"
          style={fieldStyle}
          {...fieldFocusHandlers}
        />
        {isFreightForwarding && renderActionButtons()}
      </Box>

      {!isFreightForwarding && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Typography
            sx={{
              fontSize: '9.5px',
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
              minWidth: '40px'
            }}
          >
            Reimb
          </Typography>
          <input
            type="text"
            value={reimbursementNo}
            onChange={(e) => setReimbursementNo(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Bill No"
            style={fieldStyle}
            {...fieldFocusHandlers}
          />
          <input
            type="text"
            value={reimbursementDate}
            onChange={(e) => setReimbursementDate(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="dd-mm-yyyy"
            style={fieldStyle}
            {...fieldFocusHandlers}
          />
          {renderActionButtons()}
        </Box>
      )}
    </Box>
  );
};

export const EditableDateCell = ({ row, field, initialValue, onSuccess }) => {
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

export function JobNoCell({ row, navigate, activeTab, onSuccess }) {
  const displayNo = (row.is_club_job_parent && row.tally_club_ref_no) ? row.tally_club_ref_no : row.job_no;
  const [rejecting, setRejecting] = useState(false);

  const handleReject = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to reject job ${row.job_no} from billing?`)) return;

    setRejecting(true);
    try {
      const localUser = JSON.parse(localStorage.getItem("exim_user") || "{}");
      await axios.patch(
        `${import.meta.env.VITE_API_STRING}/${encodeURIComponent(row.job_no)}/fields`,
        {
          fieldUpdates: [
            { field: "send_for_billing", value: false },
            { field: "send_for_billing_date", value: null }
          ]
        },
        { headers: { username: localUser.username || "" } }
      );
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Reject error:", err);
      alert(err.response?.data?.message || "Failed to reject job");
    } finally {
      setRejecting(false);
    }
  };

  const showReject = row.send_for_billing === true && (activeTab === "billing-pending" || activeTab === "club-jobs");

  return (
    <Box sx={{ py: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {row.parent_club_job && (
          <span style={{ color: "#9ca3af", fontWeight: "bold", marginRight: "4px" }}>↳</span>
        )}
        <Button
          variant="text"
          sx={{ p: 0, minWidth: 0, textTransform: "none", fontWeight: 700, justifyContent: "flex-start", fontSize: '11px' }}
          onClick={() => {
            const path = row.job_no?.startsWith("FF")
              ? `/freight-forwarding/job/${encodeURIComponent(row.job_no)}`
              : `/export-charges/job/${encodeURIComponent(row.job_no)}`;
            navigate(path, { state: { from: "/export-billing" } });
          }}
        >
          {displayNo}
        </Button>
        {row.is_club_job_parent && (
          <span style={{ fontSize: "9px", background: "#dbeafe", color: "#1e40af", padding: "1px 4px", borderRadius: "4px", fontWeight: "bold" }}>CLUB</span>
        )}
        <IconButton
          size="small"
          sx={{ p: 0.2, opacity: 0.6, "&:hover": { opacity: 1 } }}
          onClick={(e) => {
            e.stopPropagation();
            copyText(displayNo);
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
      {showReject && (
        <Button
          variant="outlined"
          color="error"
          size="small"
          sx={{
            mt: 0.5,
            py: 0.1,
            px: 0.8,
            fontSize: '9px',
            textTransform: 'none',
            minWidth: 0,
            lineHeight: 1.2,
            borderColor: '#fca5a5',
            color: '#dc2626',
            '&:hover': {
              backgroundColor: '#fef2f2',
              borderColor: '#ef4444'
            }
          }}
          onClick={handleReject}
          disabled={rejecting}
        >
          {rejecting ? "Rejecting..." : "Reject"}
        </Button>
      )}
    </Box>
  );
}

export function PartyCell({ row, workMode }) {
  const values = workMode === "purchase-book" ? row.supplier_names : row.supplier_names;
  return <ExpandableChipList items={values} limit={1} />;
}

export function RefCell({ row, workMode, activeTab, onRefClick }) {
  const isCompleted =
    activeTab === "payment-completed" ||
    activeTab === "purchase-book-completed" ||
    activeTab === "export-completed-billing";

  const requests = workMode === "purchase-book" ? row.purchase_books : row.payment_requests;

  let filteredRequests = [];
  if (Array.isArray(requests) && requests.length > 0) {
    if (activeTab === "payment-requested" || activeTab === "purchase-book-requested") {
      filteredRequests = requests.filter(r => !r.isApproved && !r.isCompleted);
    } else if (activeTab === "payment" || activeTab === "purchase-book") {
      filteredRequests = requests.filter(r => r.isApproved && !r.isCompleted);
    } else if (isCompleted) {
      filteredRequests = requests.filter(r => r.isCompleted);
    } else {
      filteredRequests = requests;
    }
  }

  let displayRefs = [];
  let displayStatuses = [];

  if (filteredRequests.length > 0) {
    displayRefs = filteredRequests.map(r => r.no);
    displayStatuses = [...new Set(filteredRequests.map(r => r.status).filter(Boolean))];
  } else if (!requests || requests.length === 0) {
    displayRefs = workMode === "purchase-book" ? row.purchase_book_nos : row.payment_request_nos;
    displayStatuses = workMode === "purchase-book" ? row.purchase_book_statuses : row.payment_request_statuses;
  }

  if (!displayRefs?.length) return "-";

  return (
    <Stack spacing={0.5} sx={{ py: 0.5 }}>
      <ExpandableChipList
        items={displayRefs}
        limit={2}
        color={isCompleted ? "success" : "primary"}
        onClick={onRefClick ? (ref) => onRefClick(row, ref) : undefined}
      />
      {displayStatuses?.length ? (
        <Typography variant="caption" sx={{ color: isCompleted ? "success.main" : "warning.main", fontWeight: 600 }}>
          {displayStatuses.join(", ")}
        </Typography>
      ) : null}
    </Stack>
  );
}
