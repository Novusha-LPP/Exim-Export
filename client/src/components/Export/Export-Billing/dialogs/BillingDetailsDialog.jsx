import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import { formatDate, renderChipList } from "../widgets/BillingWidgets";
import logoImage from "../../../../assets/images/logo.jpg";
import { generatePurchaseBookPDF } from "../../../../utils/purchaseBookPrint";
import { generatePaymentRequestPDF } from "../../../../utils/paymentRequestPrint";

export default function BillingDetailsDialog({
  open,
  onClose,
  row,
  requestNo,
  workMode,
  activeTab,
  onSuccess,
}) {
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
        headers: { username: localUser.username || "", "user-role": localUser.role || "" },
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
      entryBy: d["Entry By"] || d.entryBy || d.username || d.requestedBy || "Tally System",
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

  const requests = workMode === "purchase-book" ? row.purchase_books : row.payment_requests;
  const isCompleted =
    activeTab === "payment-completed" ||
    activeTab === "purchase-book-completed" ||
    activeTab === "export-completed-billing";

  let filteredRequests = [];
  if (Array.isArray(requests) && requests.length > 0) {
    if (activeTab === "payment-requested" || activeTab === "purchase-book-requested") {
      filteredRequests = requests.filter((r) => !r.isApproved && !r.isCompleted);
    } else if (activeTab === "payment" || activeTab === "purchase-book") {
      filteredRequests = requests.filter((r) => r.isApproved && !r.isCompleted);
    } else if (isCompleted) {
      filteredRequests = requests.filter((r) => r.isCompleted);
    } else {
      filteredRequests = requests;
    }
  }

  let refs = [];
  let statuses = [];

  if (filteredRequests.length > 0) {
    refs = filteredRequests.map((r) => r.no);
    statuses = [...new Set(filteredRequests.map((r) => r.status).filter(Boolean))];
  } else if (!requests || requests.length === 0) {
    refs = workMode === "purchase-book" ? row.purchase_book_nos : row.payment_request_nos;
    statuses = workMode === "purchase-book" ? row.purchase_book_statuses : row.payment_request_statuses;
  }

  const refTitle = workMode === "purchase-book" ? "Purchase Book" : "Payment Request";

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
      <DialogTitle
        sx={{
          bgcolor: "#1a237e",
          color: "#fff",
          fontWeight: 700,
          py: 1.5,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          {refTitle.toUpperCase()} DETAILS
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.9 }}>
          {requestNo || row.job_no}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {fetchingDetails ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Loading details...
            </Typography>
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
                if (workMode === "payment") {
                  return (
                    <tbody>
                      <tr>
                        <td className="label">Request Date</td>
                        <td className="value">{formatDate(d.entryDate)}</td>
                      </tr>
                      <tr>
                        <td className="label">Job No</td>
                        <td className="value" style={{ fontWeight: 700 }}>
                          {d.jobNo}
                        </td>
                      </tr>
                      <tr>
                        <td className="label">Beneficiary</td>
                        <td className="value blue-link">{d.supplierName}</td>
                      </tr>
                      <tr>
                        <td className="label">Bank Name</td>
                        <td className="value">{details.bankName || "-"}</td>
                      </tr>
                      <tr>
                        <td className="label">Account No</td>
                        <td className="value">{details.accountNo || "-"}</td>
                      </tr>
                      <tr>
                        <td className="label">IFSC Code</td>
                        <td className="value">{details.ifscCode || "-"}</td>
                      </tr>
                      <tr>
                        <td className="label">Transaction Type</td>
                        <td className="value">{details.transactionType || "-"}</td>
                      </tr>
                      <tr>
                        <td className="label">Transfer Mode</td>
                        <td className="value">{details.transferMode || "-"}</td>
                      </tr>
                      <tr>
                        <td className="label">Amount</td>
                        <td className="value total-amount">
                          ₹ {Number(d.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr>
                        <td className="label">Requested By</td>
                        <td className="value">{d.entryBy}</td>
                      </tr>
                      <tr>
                        <td className="label">Against Bill</td>
                        <td className="value">{d.againstBill}</td>
                      </tr>
                    </tbody>
                  );
                }
                return (
                  <tbody>
                    <tr>
                      <td className="label">Entry Date</td>
                      <td className="value">{formatDate(d.entryDate)}</td>
                    </tr>
                    <tr>
                      <td className="label">Job No</td>
                      <td className="value" style={{ fontWeight: 700 }}>
                        {d.jobNo}
                      </td>
                    </tr>
                    <tr>
                      <td className="label">Supplier Name</td>
                      <td className="value blue-link">{d.supplierName}</td>
                    </tr>
                    <tr>
                      <td className="label">Supplier Address</td>
                      <td className="value" style={{ fontSize: "11px", lineHeight: 1.4 }}>
                        {d.address}
                      </td>
                    </tr>
                    <tr>
                      <td className="label">GSTIN & PAN</td>
                      <td className="value">
                        {d.gstin && <Box component="span">GSTIN: {d.gstin} | </Box>}
                        {d.pan && (
                          <Box component="span">
                            PAN:{" "}
                            <Box component="span" sx={{ bgcolor: "#fff9c4", px: 0.5 }}>
                              {d.pan}
                            </Box>
                          </Box>
                        )}
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
                      <td className="value amount">
                        ₹ {Number(d.taxableValue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="label">GST Details ({d.gstPercent}%)</td>
                      <td className="value">
                        CGST: {Number(d.cgst).toLocaleString("en-IN", { minimumFractionDigits: 2 })} | SGST:{" "}
                        {Number(d.sgst).toLocaleString("en-IN", { minimumFractionDigits: 2 })} | IGST:{" "}
                        {Number(d.igst).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="label">TDS Deduction</td>
                      <td className="value red-amount">
                        ₹ -{Number(d.tds).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="label">Total Payable</td>
                      <td className="value total-amount">
                        ₹ {Number(d.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
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
                <Typography
                  variant="overline"
                  sx={{ fontWeight: 700, display: "block", color: "#1565c0", mb: 1 }}
                >
                  CHARGE ATTACHMENTS
                </Typography>
                <Stack direction="row" spacing={1}>
                  {Array.isArray(details.url) ? (
                    details.url.map((u, idx) => (
                      <Chip
                        key={idx}
                        icon={<DescriptionIcon sx={{ fontSize: "14px !important" }} />}
                        label={`View ${idx + 1}`}
                        size="small"
                        clickable
                        component="a"
                        target="_blank"
                        href={u}
                        sx={{ bgcolor: "#fff", border: "1px solid #bbdefb" }}
                      />
                    ))
                  ) : (
                    <Chip
                      icon={<DescriptionIcon sx={{ fontSize: "14px !important" }} />}
                      label="View 1"
                      size="small"
                      clickable
                      component="a"
                      target="_blank"
                      href={details.url}
                      sx={{ bgcolor: "#fff", border: "1px solid #bbdefb" }}
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
              <Box mt={1}>
                {renderChipList(statuses, activeTab.includes("completed") ? "success" : "warning", 6)}
              </Box>
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
                    {[
                      "HDFC BANK",
                      "ICICI BANK",
                      "SBI BANK",
                      "KOTAK BANK",
                      "IDBI BANK",
                      "SOUTH INDIAN BANK",
                      "AXIS BANK",
                      "ODEX VAN",
                      "CASH",
                    ].map((bank) => (
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
                  },
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
        <Box sx={{ display: "flex", gap: 2, flexGrow: 1, justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            color="error"
            size="small"
            disabled={loading}
            onClick={() => {
              if (rejectMode) handleAction("reject");
              else setRejectMode(true);
            }}
            sx={{ fontWeight: "700", px: 2, py: 0.5, fontSize: "12px" }}
          >
            {loading && rejectMode ? "REJECTING..." : "REJECT REQUEST"}
          </Button>
          {isPendingTab || !requestNo ? (
            <Button
              variant="contained"
              color="success"
              size="small"
              disabled={loading}
              onClick={() => handleAction("approve")}
              sx={{ fontWeight: "700", px: 2, py: 0.5, fontSize: "12px" }}
            >
              {loading && !rejectMode ? "APPROVING..." : "APPROVE REQUEST"}
            </Button>
          ) : null}
        </Box>
      </DialogActions>
    </Dialog>
  );
}
