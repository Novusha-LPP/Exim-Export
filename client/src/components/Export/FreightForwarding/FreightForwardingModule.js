import React, { useMemo, useState, useEffect, useRef } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Typography, CircularProgress, Tooltip, Box, Button, TextField, FormControl, InputLabel, Select, DialogActions } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import GetAppIcon from "@mui/icons-material/GetApp";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ReceiptIcon from "@mui/icons-material/Receipt";
import { useNavigate } from "react-router-dom";
import CreateFreightEnquiry from "./CreateFreightEnquiry";
import ForwarderDirectory from "./ForwarderDirectory";
import CaptureRates from "./CaptureRates";
import AddExJobs from "../Export-Dsr/AddExJobs";
import FreightBillOfLadingGenerator from "./FreightBillOfLadingGenerator";
import FreightTrackingMap from "./FreightTrackingMap";
import FreightQuotation from "./FreightQuotation";

const THEME = {
  blue: "#16408f",
  border: "#cbd5e1",
  text: "#333",
  textMuted: "#6b7280",
  white: "#ffffff",
  bg: "#fafaff",
};

const s = {
  wrapper: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
    backgroundColor: "#fafaffff",
    padding: "5px 15px",
    minHeight: "100vh",
    color: "#333",
    fontSize: "12px",
  },
  titleCard: {
    backgroundColor: "transparent",
    padding: "8px 0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  toolbar: {
    display: "flex",
    gap: "8px",
    rowGap: "8px",
    alignItems: "center",
    marginBottom: "12px",
    flexWrap: "wrap",
    backgroundColor: "#fff",
    padding: "8px 12px",
    borderRadius: "6px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    border: "1px solid #cbd5e1"
  },
  tabsContainer: {
    display: "flex",
    gap: "5px",
    marginBottom: "12px",
    borderBottom: "1px solid #cbd5e1",
  }
};

function HistoricRatesLookup() {
  const [pol, setPol] = useState("");
  const [pod, setPod] = useState("");
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Searchable dropdown state
  const [polOptions, setPolOptions] = useState([]);
  const [podOptions, setPodOptions] = useState([]);
  const [showPolDropdown, setShowPolDropdown] = useState(false);
  const [showPodDropdown, setShowPodDropdown] = useState(false);
  const [loadingPol, setLoadingPol] = useState(false);
  const [loadingPod, setLoadingPod] = useState(false);

  // References to close dropdowns when clicking outside
  const polRef = useRef(null);
  const podRef = useRef(null);

  const defaultPolPorts = ["MUNDRA", "HAZIRA", "NHAVA SHEVA", "PIPAVAV", "CHENNAI", "KOLKATA"];
  const defaultPodPorts = ["JEBEL ALI", "MONTREAL", "HAMBURG", "ROTTERDAM", "SINGAPORE", "NEW YORK", "FELIXSTOWE"];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (polRef.current && !polRef.current.contains(e.target)) {
        setShowPolDropdown(false);
      }
      if (podRef.current && !podRef.current.contains(e.target)) {
        setShowPodDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch unique POL ports from /ports or /seaPorts or /airPorts
  useEffect(() => {
    if (!pol.trim()) {
      setPolOptions(defaultPolPorts);
      return;
    }
    const fetchPolPorts = async () => {
      setLoadingPol(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_STRING}/ports`, {
          params: { search: pol.trim(), limit: 20 }
        });
        const data = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        const formatted = data.map(p => {
          const code = p.uneceCode || p.unece_code || "";
          const name = p.portName || p.name || "";
          return code ? `(${code.toUpperCase()}) ${name.toUpperCase()}` : name.toUpperCase();
        });
        setPolOptions(formatted);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingPol(false);
      }
    };
    const timer = setTimeout(fetchPolPorts, 200);
    return () => clearTimeout(timer);
  }, [pol]);

  // Fetch unique POD ports from /ports or /seaPorts or /airPorts
  useEffect(() => {
    if (!pod.trim()) {
      setPodOptions(defaultPodPorts);
      return;
    }
    const fetchPodPorts = async () => {
      setLoadingPod(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_STRING}/ports`, {
          params: { search: pod.trim(), limit: 20 }
        });
        const data = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        const formatted = data.map(p => {
          const code = p.uneceCode || p.unece_code || "";
          const name = p.portName || p.name || "";
          return code ? `(${code.toUpperCase()}) ${name.toUpperCase()}` : name.toUpperCase();
        });
        setPodOptions(formatted);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingPod(false);
      }
    };
    const timer = setTimeout(fetchPodPorts, 200);
    return () => clearTimeout(timer);
  }, [pod]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!pol && !pod) {
      alert("Please enter Port of Loading or Destination Port");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_STRING}/export-dsr/historical-freight`, {
        params: { pol, pod }
      });
      if (res.data.success) {
        setRates(res.data.data || []);
      } else {
        setRates([]);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to search historical rates");
      setRates([]);
    } finally {
      setLoading(false);
    }
  };

  const dropDownStyle = {
    position: "absolute",
    top: "100%",
    left: 0,
    width: "100%",
    backgroundColor: "#fff",
    border: "1px solid #cbd5e1",
    borderRadius: "4px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    maxHeight: "200px",
    overflowY: "auto",
    zIndex: 1000,
    marginTop: "4px",
  };

  const dropDownItemStyle = {
    padding: "8px 12px",
    fontSize: "12px",
    cursor: "pointer",
    borderBottom: "1px solid #f1f5f9",
    color: "#334155",
    transition: "background-color 0.15s ease",
  };

  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "14px", color: '#1e293b', mb: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Historic Freight Rates Lookup
      </Typography>
      <form onSubmit={handleSearch} style={{ display: "flex", gap: "12px", alignItems: "flex-end", marginBottom: "20px", flexWrap: "wrap" }}>
        <div ref={polRef} style={{ display: "flex", flexDirection: "column", gap: "4px", position: "relative" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>PORT OF LOADING (POL)</span>
          <input
            value={pol}
            onChange={(e) => {
              setPol(e.target.value);
              setShowPolDropdown(true);
            }}
            onFocus={() => setShowPolDropdown(true)}
            placeholder="Search or select POL..."
            style={{
              height: "34px",
              padding: "0 12px",
              fontSize: "12.5px",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              outline: "none",
              width: "220px",
            }}
            autoComplete="off"
          />
          {showPolDropdown && (polOptions.length > 0 || loadingPol) && (
            <div style={dropDownStyle}>
              {loadingPol ? (
                <div style={{ padding: "8px 12px", fontSize: "12px", color: "#64748b" }}>Searching...</div>
              ) : (
                polOptions.map((opt, idx) => (
                  <div
                    key={idx}
                    style={dropDownItemStyle}
                    onMouseEnter={(e) => e.target.style.backgroundColor = "#eff6ff"}
                    onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                    onMouseDown={() => {
                      setPol(opt);
                      setShowPolDropdown(false);
                    }}
                  >
                    {opt}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <div ref={podRef} style={{ display: "flex", flexDirection: "column", gap: "4px", position: "relative" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>PORT OF DESTINATION (POD)</span>
          <input
            value={pod}
            onChange={(e) => {
              setPod(e.target.value);
              setShowPodDropdown(true);
            }}
            onFocus={() => setShowPodDropdown(true)}
            placeholder="Search or select POD..."
            style={{
              height: "34px",
              padding: "0 12px",
              fontSize: "12.5px",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              outline: "none",
              width: "220px",
            }}
            autoComplete="off"
          />
          {showPodDropdown && (podOptions.length > 0 || loadingPod) && (
            <div style={dropDownStyle}>
              {loadingPod ? (
                <div style={{ padding: "8px 12px", fontSize: "12px", color: "#64748b" }}>Searching...</div>
              ) : (
                podOptions.map((opt, idx) => (
                  <div
                    key={idx}
                    style={dropDownItemStyle}
                    onMouseEnter={(e) => e.target.style.backgroundColor = "#eff6ff"}
                    onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                    onMouseDown={() => {
                      setPod(opt);
                      setShowPodDropdown(false);
                    }}
                  >
                    {opt}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            height: "34px",
            padding: "0 20px",
            backgroundColor: "#16408f",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: "12px",
            transition: "all 0.15s ease",
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? "Searching..." : "Search Rates"}
        </button>
      </form>

      <div style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "4px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
              <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 700, color: "#475569", fontSize: "11px", textTransform: "uppercase" }}>Job No</th>
              <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 700, color: "#475569", fontSize: "11px", textTransform: "uppercase" }}>S/Line</th>
              <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 700, color: "#475569", fontSize: "11px", textTransform: "uppercase" }}>Forwarder</th>
              <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 700, color: "#475569", fontSize: "11px", textTransform: "uppercase" }}>Date</th>
              <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 700, color: "#475569", fontSize: "11px", textTransform: "uppercase" }}>Currency</th>
              <th style={{ textAlign: "right", padding: "10px 16px", fontWeight: 700, color: "#475569", fontSize: "11px", textTransform: "uppercase" }}>Exchange Rate</th>
              <th style={{ textAlign: "right", padding: "10px 16px", fontWeight: 700, color: "#475569", fontSize: "11px", textTransform: "uppercase" }}>Amount</th>
              <th style={{ textAlign: "right", padding: "10px 16px", fontWeight: 700, color: "#475569", fontSize: "11px", textTransform: "uppercase" }}>Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: "30px 16px", textAlign: "center", color: "#64748b" }}>
                  Searching historical rates...
                </td>
              </tr>
            ) : rates.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "30px 16px", textAlign: "center", color: "#64748b" }}>
                  No historical rates found. Enter routing criteria to search.
                </td>
              </tr>
            ) : (
              rates.map((rate, idx) => {
                const getCurrencySymbol = (curr) => {
                  switch (String(curr || "").toUpperCase()) {
                    case "USD": return "$";
                    case "EUR": return "€";
                    case "INR": return "₹";
                    case "GBP": return "£";
                    default: return curr ? `${curr} ` : "";
                  }
                };

                return (
                  <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "10px 16px", fontWeight: 700, color: "#16408f" }}>{rate.jobNo}</td>
                    <td style={{ padding: "10px 16px", color: "#334155" }}>{rate.shippingLine || "-"}</td>
                    <td style={{ padding: "10px 16px", color: "#334155" }}>{rate.forwarder || "-"}</td>
                    <td style={{ padding: "10px 16px", color: "#334155" }}>
                      {rate.date ? (typeof rate.date === "string" ? rate.date : new Date(rate.date).toLocaleDateString("en-GB")) : "-"}
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "3px", backgroundColor: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe" }}>
                        {rate.currency || "INR"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px", textAlign: "right", color: "#64748b" }}>{rate.exchangeRate || "-"}</td>
                    <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "#0f766e" }}>
                      {rate.amountOriginal !== undefined ? `${getCurrencySymbol(rate.currency)}${rate.amountOriginal.toLocaleString()}` : "-"}
                    </td>
                    <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, color: "#1e293b" }}>
                      ₹{rate.amountINR ? rate.amountINR.toLocaleString() : "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocsUploadCell({ row, onUpdate }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [uploading, setUploading] = useState(null);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);

  const handleOpen = (e) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleClose = (e) => {
    if (e) e.stopPropagation();
    setAnchorEl(null);
  };

  const handleUpload = async (e, field) => {
    e.stopPropagation();
    const file = e.target.files[0];
    if (!file) return;

    setUploading(field);
    const formData = new FormData();
    formData.append("files", file);
    formData.append("folderName", `freight-docs/${row.enquiry_no}`);

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_STRING}/upload`, formData);
      const url = res.data.locations[0];

      const updatedDocs = { ...(row.documents || {}), [field]: url };
      const updateRes = await axios.put(`${import.meta.env.VITE_API_STRING}/freight-enquiries/${row._id}`, { documents: updatedDocs });

      if (updateRes.data.success) {
        onUpdate(updateRes.data.data);
      }
    } catch (error) {
      console.error("Upload failed", error);
      alert("Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (e, field) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete this document?`)) return;

    try {
      const updatedDocs = { ...(row.documents || {}) };
      delete updatedDocs[field];

      const updateRes = await axios.put(`${import.meta.env.VITE_API_STRING}/freight-enquiries/${row._id}`, { documents: updatedDocs });

      if (updateRes.data.success) {
        onUpdate(updateRes.data.data);
      }
    } catch (error) {
      console.error("Delete failed", error);
      alert("Delete failed");
    }
  };

  const getDocTypes = (shipmentType) => {
    switch (shipmentType) {
      case "Export-Sea":
        return [
          { label: "INVOICE", field: "invoice" },
          { label: "PACKING LIST", field: "packing_list" },
          { label: "BOOKING", field: "booking_copy" },
          { label: "LEO", field: "leo_copy" },
          { label: "GATE PASS", field: "gate_pass" },
          { label: "HBL", field: "hbl_copy" },
          { label: "MBL", field: "mbl_copy" },
          { label: "AGENT INVOICE", field: "agent_invoice" },
          { label: "OTHER", field: "other_copy" },
        ];
      case "Export-Air":
        return [
          { label: "INVOICE", field: "invoice" },
          { label: "PACKING LIST", field: "packing_list" },
          { label: "BOOKING", field: "booking_copy" },
          { label: "LEO", field: "leo_copy" },
          { label: "GATE PASS", field: "gate_pass" },
          { label: "HAWB", field: "hawb_copy" },
          { label: "MAWB", field: "mawb_copy" },
          { label: "AGENT INVOICE", field: "agent_invoice" },
          { label: "OTHER", field: "other_copy" },
        ];
      case "Import-Sea":
        return [
          { label: "INVOICE", field: "invoice" },
          { label: "PACKING LIST", field: "packing_list" },
          { label: "HBL", field: "hbl_copy" },
          { label: "MBL", field: "mbl_copy" },
          { label: "DO", field: "do_copy" },
          { label: "AGENT INVOICE", field: "agent_invoice" },
          { label: "OTHER", field: "other_copy" },
        ];
      case "Import-Air":
        return [
          { label: "INVOICE", field: "invoice" },
          { label: "PACKING LIST", field: "packing_list" },
          { label: "HAWB", field: "hawb_copy" },
          { label: "MAWB", field: "mawb_copy" },
          { label: "DO", field: "do_copy" },
          { label: "AGENT INVOICE", field: "agent_invoice" },
          { label: "OTHER", field: "other_copy" },
        ];
      default:
        return [
          { label: "INVOICE", field: "invoice" },
          { label: "PACKING LIST", field: "packing_list" },
          { label: "LEO", field: "leo_copy" },
          { label: "BILL OF LADING", field: "bill_of_lading" },
        ];
    }
  };

  const docs = row.documents || {};
  const docTypes = getDocTypes(row.shipment_type);
  const uploadedCount = Object.keys(docs).filter(k => docTypes.some(dt => dt.field === k) && docs[k]).length;

  return (
    <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', justifyContent: 'center' }}>
      <button
        onClick={handleOpen}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: 3,
          border: `1px solid ${uploadedCount > 0 ? '#bfdbfe' : '#cbd5e1'}`,
          backgroundColor: uploadedCount > 0 ? "#eff6ff" : "#fff",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 700,
          color: uploadedCount > 0 ? THEME.blue : "#64748b",
          transition: "all 0.2s"
        }}
      >
        <CloudUploadIcon style={{ fontSize: 14 }} />
        {uploadedCount > 0 ? `Docs (${uploadedCount})` : "Upload Docs"}
      </button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{ style: { maxHeight: 350, width: 220, borderRadius: 3, boxShadow: "0 1px 5px rgba(0,0,0,0.1)", border: '1px solid #cbd5e1' } }}
      >
        <Typography variant="overline" sx={{ px: 2, pt: 1, fontWeight: 800, color: '#64748b', display: 'block', borderBottom: `1px solid #f3f4f6`, mb: 1, letterSpacing: '0.5px' }}>
          SHIPPING / VGM DOCS
        </Typography>

        {row.saved_quotation && (
          <MenuItem
            sx={{ display: "flex", justifyContent: "space-between", py: 1, px: 2, backgroundColor: "#ecfdf5", "&:hover": { backgroundColor: "#d1fae5" } }}
            onClick={(e) => { e.stopPropagation(); setShowQuoteDialog(true); handleClose(e); }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: '#047857' }}>QUOTATION</span>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Tooltip title="View / Print Saved Quotation">
                <IconButton
                  size="small"
                  sx={{ color: "#047857", p: 0.5 }}
                >
                  <DownloadIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </div>
          </MenuItem>
        )}

        {docTypes.map((doc) => (
          <MenuItem
            key={doc.field}
            sx={{ display: "flex", justifyContent: "space-between", py: 1, px: 2, "&:hover": { backgroundColor: "#f8fafc" } }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>{doc.label}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {docs[doc.field] && (
                <Tooltip title="View">
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); window.open(docs[doc.field], "_blank"); }}
                    sx={{ color: "#059669", p: 0.5 }}
                  >
                    <GetAppIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
              {uploading === doc.field ? (
                <CircularProgress size={14} />
              ) : (
                <label style={{ cursor: "pointer", display: 'flex', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                  <input type="file" hidden onChange={(e) => handleUpload(e, doc.field)} />
                  <CloudUploadIcon sx={{ fontSize: 16, color: THEME.blue }} />
                </label>
              )}
              <Tooltip title="Delete Document">
                <span>
                  <IconButton
                    size="small"
                    onClick={(e) => handleDelete(e, doc.field)}
                    sx={{ color: docs[doc.field] ? "#ef4444" : "#e2e8f0", p: 0.5 }}
                    disabled={!docs[doc.field]}
                  >
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </span>
              </Tooltip>
            </div>
          </MenuItem>
        ))}
      </Menu>

      {showQuoteDialog && row.saved_quotation && (
        <Dialog
          open={showQuoteDialog}
          onClose={() => setShowQuoteDialog(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ style: { borderRadius: 6, overflow: "hidden" } }}
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#16408f', color: '#fff', py: 1.5, px: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Saved Quotation - {row.enquiry_no}</Typography>
            <IconButton onClick={() => setShowQuoteDialog(false)} sx={{ color: '#fff' }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 0, backgroundColor: "#f3f4f6" }}>
            <FreightQuotation
              enquiry={row}
              selectedRate={row.saved_quotation}
              onBack={() => setShowQuoteDialog(false)}
              onUpdate={onUpdate}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function FreightForwardingModule() {
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "-";
    if (dateStr.includes("/")) return dateStr;
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr.replace(/-/g, "/");
    if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(dateStr)) return dateStr;
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr.split("-").reverse().join("/");
    }
    
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      }
    } catch (e) {}
    
    return dateStr;
  };

  const [rows, setRows] = useState([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [openDSRDialog, setOpenDSRDialog] = useState(false);
  const [dsrMode, setDsrMode] = useState("Export");
  const [dsrYear, setDsrYear] = useState(() => {
    const today = new Date();
    const month = today.getMonth(); // 0-based
    const year = today.getFullYear();
    if (month < 3) {
      return `${(year - 1).toString().slice(-2)}-${year.toString().slice(-2)}`;
    }
    return `${year.toString().slice(-2)}-${(year + 1).toString().slice(-2)}`;
  });
  const [dsrShipmentType, setDsrShipmentType] = useState("all");
  const [dsrStartDate, setDsrStartDate] = useState("");
  const [dsrEndDate, setDsrEndDate] = useState("");
  const [dsrLoading, setDsrLoading] = useState(false);

  const handleDownloadDSR = async () => {
    setDsrLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/freight-forwarding/generate-dsr`,
        {
          params: {
            year: dsrYear,
            shipment_type: dsrShipmentType,
            startDate: dsrStartDate,
            endDate: dsrEndDate,
            mode: dsrMode
          },
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      link.setAttribute("download", `Freight_Forwarding_${dsrMode}_DSR_${dateStr}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setOpenDSRDialog(false);
    } catch (err) {
      console.error("Error downloading Freight Forwarding DSR:", err);
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          alert(parsed.error || parsed.message || "Failed to download DSR report");
        } catch (e) {
          alert("Failed to download DSR report");
        }
      } else {
        alert(err.response?.data?.error || "Failed to download DSR report");
      }
    } finally {
      setDsrLoading(false);
    }
  };
  const [filters, setFilters] = useState(() => {
    try {
      const saved = localStorage.getItem("ff_filters");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error reading ff_filters:", e);
    }
    return {
      search: "",
      shipment_type: "",
      status: "",
    };
  });
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem("ff_active_tab");
    if (saved === "Forwarders") return "Enquiry";
    if (saved === "Success") return "Pending";
    return saved || "Enquiry";
  });
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [forwarders, setForwarders] = useState([]);
  const [loadingJob, setLoadingJob] = useState(false);
  const [trackingEnquiry, setTrackingEnquiry] = useState(null);

  const [pipelineData, setPipelineData] = useState({});
  const [serverCounts, setServerCounts] = useState({
    Enquiry: 0,
    Rejected: 0,
    Pending: 0,
    "Draft BL": 0,
    SBO: 0,
    Billing: 0,
    "ETA Pending": 0,
    Delivery: 0,
    Completed: 0
  });

  useEffect(() => {
    if (rows.length === 0) return;
    const initialData = {};
    rows.forEach((row) => {
      const jobId = row._id || row.enquiry_no;
      initialData[jobId] = {
        draftUploaded: !!row.documents?.hbl_copy || !!row.documents?.booking_copy || !!row.documents?.draft_bl || !!row.saved_quotation,
        draftApproved: row.draft_bl_approved === true,
        sboDate: row.sailing_date || "",
        agencyBillNo: row.billing_details?.agency_bill_no || "",
        agencyBillDate: row.billing_details?.agency_bill_date || "",
        reimbursementBillNo: row.billing_details?.reimbursement_bill_no || "",
        reimbursementBillDate: row.billing_details?.reimbursement_bill_date || "",
        arrivalDate: row.arrival_date || "",
      };
    });
    setPipelineData(initialData);
  }, [rows]);

  const updatePipelineValue = async (jobId, key, value) => {
    if (key === "draftApproved") {
      try {
        const res = await axios.put(`${import.meta.env.VITE_API_STRING}/freight-enquiries/${jobId}`, { draft_bl_approved: value });
        if (res.data.success) {
          fetchEnquiries(activeTab);
        }
      } catch (err) {
        console.error("Error updating pipeline value:", err);
      }
    }
  };

  const [searchFocused, setSearchFocused] = useState(false);
  const [shipmentTypeFocused, setShipmentTypeFocused] = useState(false);
  const [statusFocused, setStatusFocused] = useState(false);

  const enquiryCount = useMemo(() => rows.filter(r => r.status === "Open").length, [rows]);
  const rejectedCount = useMemo(() => rows.filter(r => r.status === "Rejected").length, [rows]);
  const forwarderCount = useMemo(() => forwarders.length, [forwarders]);

  useEffect(() => {
    fetchForwarders();
  }, []);

  useEffect(() => {
    fetchEnquiries(activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem("ff_active_tab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem("ff_filters", JSON.stringify(filters));
  }, [filters]);

  const fetchEnquiries = async (tabToFetch = activeTab) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_STRING}/freight-enquiries`, {
        params: { tab: tabToFetch }
      });
      if (res.data.success) {
        setRows(res.data.data);
        if (res.data.counts) {
          setServerCounts(res.data.counts);
        }
      }
    } catch (error) {
      console.error("Error fetching enquiries:", error);
    }
  };

  const fetchForwarders = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_STRING}/forwarders`);
      if (res.data.success) setForwarders(res.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // 2. Additional Filters
      const needle = filters.search.trim().toUpperCase();
      const matchSearch =
        !needle ||
        [row.enquiry_no, row.success_no, row.rejected_no, row.organization_name, row.port_of_loading, row.port_of_destination]
          .filter(Boolean)
          .some((field) => field.toUpperCase().includes(needle));
      const matchShipment = !filters.shipment_type || row.shipment_type === filters.shipment_type;
      const matchStatus = !filters.status || row.status === filters.status;
      return matchSearch && matchShipment && matchStatus;
    });
  }, [rows, filters]);

  const handleCreateEnquiry = async (newRow) => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_STRING}/freight-enquiries`, newRow);
      if (res.data.success) {
        setRows((prev) => [res.data.data, ...prev]);
        setOpenCreate(false);
      }
    } catch (error) {
      console.error("Error creating enquiry:", error);
      alert("Failed to create enquiry. Please try again.");
    }
  };

  const navigate = useNavigate();

  const handleUpdateEnquiry = (updated) => {
    setRows(rows.map(r => r._id === updated._id ? updated : r));
    // Only update selectedEnquiry if the dialog is already open for this record
    setSelectedEnquiry(prev => prev?._id === updated._id ? updated : prev);
  };

  const isPipelineTab = ["Pending", "Draft BL", "SBO", "Billing", "ETA Pending", "Delivery", "Completed"].includes(activeTab);

  const handleRowClick = (row) => {
    if (!isPipelineTab) {
      setSelectedEnquiry(row);
    }
  };

  const handleSuccessJobClick = (e, row) => {
    e.stopPropagation();
    const jobNo = row.success_no || row.enquiry_no;
    const encodedJobNo = encodeURIComponent(jobNo);
    navigate(`/freight-forwarding/job/${encodedJobNo}`);
  };

  return (
    <div style={s.wrapper}>
      <Box sx={s.titleCard}>
        <div>
          <Typography sx={{ fontWeight: "700", color: "#111", fontSize: "20px", fontFamily: '"Outfit", sans-serif' }}>
            Freight Forwarding
          </Typography>
        </div>
        <Box sx={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
            onClick={() => {
              setDsrMode("Import");
              setDsrShipmentType("all");
              setOpenDSRDialog(true);
            }}
            sx={{
              borderColor: "#cbd5e1",
              color: "#475569",
              fontWeight: "700",
              textTransform: "none",
              borderRadius: "4px",
              height: 32,
              fontSize: "12px",
              px: 2,
              backgroundColor: "#ffffff",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              "&:hover": { borderColor: "#16408f", color: "#16408f", backgroundColor: "#eff6ff" }
            }}
          >
            Import DSR
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
            onClick={() => {
              setDsrMode("Export");
              setDsrShipmentType("all");
              setOpenDSRDialog(true);
            }}
            sx={{
              borderColor: "#cbd5e1",
              color: "#475569",
              fontWeight: "700",
              textTransform: "none",
              borderRadius: "4px",
              height: 32,
              fontSize: "12px",
              px: 2,
              backgroundColor: "#ffffff",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              "&:hover": { borderColor: "#16408f", color: "#16408f", backgroundColor: "#eff6ff" }
            }}
          >
            Export DSR
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={() => setOpenCreate(true)}
            sx={{
              backgroundColor: "#16408f",
              color: "#ffffff",
              fontWeight: "700",
              textTransform: "none",
              borderRadius: "4px",
              height: 32,
              fontSize: "12px",
              px: 2.5,
              boxShadow: "0 1px 2px rgba(22, 64, 143, 0.2)",
              "&:hover": { backgroundColor: "#19448a" }
            }}
          >
            Create Enquiry
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={s.tabsContainer}>
        {["Enquiry", "Rejected", "Pending", "Draft BL", "SBO", "Billing", "ETA Pending", "Delivery", "Completed", "Historic Rates"].map((tab) => {
          const isActive = activeTab === tab;
          const getCount = () => {
            if (tab === "Enquiry") return serverCounts.Enquiry;
            if (tab === "Rejected") return serverCounts.Rejected;
            if (tab === "Pending") return serverCounts.Pending;
            if (tab === "Draft BL") return serverCounts["Draft BL"];
            if (tab === "SBO") return serverCounts.SBO;
            if (tab === "Billing") return serverCounts.Billing;
            if (tab === "ETA Pending") return serverCounts["ETA Pending"];
            if (tab === "Delivery") return serverCounts.Delivery;
            if (tab === "Completed") return serverCounts.Completed;
            return null;
          };
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: "12.5px",
                fontWeight: isActive ? "700" : "600",
                color: isActive ? "#16408f" : "#64748b",
                borderBottom: isActive ? "3px solid #16408f" : "3px solid transparent",
                backgroundColor: "transparent",
                border: "none",
                outline: "none",
                marginBottom: "-1px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.15s ease"
              }}
            >
              {tab}
              {tab !== "Historic Rates" && (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "10.5px",
                    fontWeight: "800",
                    backgroundColor: isActive ? "#16408f" : "#f1f5f9",
                    color: isActive ? "#ffffff" : "#64748b",
                    marginLeft: "4px",
                    transition: "all 0.15s ease"
                  }}
                >
                  {getCount()}
                </span>
              )}
            </button>
          );
        })}
      </Box>

      {activeTab === "Historic Rates" ? (
        <HistoricRatesLookup />
      ) : (
        <>
          <Box sx={s.toolbar}>
            <input
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search by Enquiry No, Org, Port..."
              style={{
                height: "32px",
                padding: "0 10px",
                fontSize: "12px",
                border: searchFocused
                  ? "1px solid #16408f"
                  : filters.search
                    ? "1px solid #16408f"
                    : "1px solid #cbd5e1",
                borderRadius: "4px",
                outline: "none",
                color: filters.search ? "#16408f" : "#333",
                backgroundColor: filters.search ? "#eff6ff" : "#fff",
                fontWeight: filters.search ? "600" : "normal",
                flex: 1,
                maxWidth: "350px",
                boxShadow: searchFocused
                  ? "0 0 0 3px rgba(22, 64, 143, 0.15)"
                  : "inset 0 1px 2px rgba(0,0,0,0.05)",
                transition: "all 0.15s ease-in-out"
              }}
            />
            <select
              value={filters.shipment_type}
              onChange={(e) => setFilters((prev) => ({ ...prev, shipment_type: e.target.value }))}
              onFocus={() => setShipmentTypeFocused(true)}
              onBlur={() => setShipmentTypeFocused(false)}
              style={{
                height: "32px",
                padding: "0 8px",
                fontSize: "12px",
                border: shipmentTypeFocused
                  ? "1px solid #16408f"
                  : filters.shipment_type
                    ? "1px solid #16408f"
                    : "1px solid #cbd5e1",
                borderRadius: "4px",
                backgroundColor: filters.shipment_type ? "#eff6ff" : "#fff",
                color: filters.shipment_type ? "#16408f" : "#333",
                cursor: "pointer",
                fontWeight: "600",
                outline: "none",
                boxShadow: shipmentTypeFocused
                  ? "0 0 0 3px rgba(22, 64, 143, 0.15)"
                  : "none",
                transition: "all 0.15s ease-in-out"
              }}
            >
              <option value="">All Shipment Types</option>
              <option value="Import-Sea">Import - Sea</option>
              <option value="Export-Sea">Export - Sea</option>
              <option value="Import-Air">Import - Air</option>
              <option value="Export-Air">Export - Air</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              onFocus={() => setStatusFocused(true)}
              onBlur={() => setStatusFocused(false)}
              style={{
                height: "32px",
                padding: "0 8px",
                fontSize: "12px",
                border: statusFocused
                  ? "1px solid #16408f"
                  : filters.status
                    ? "1px solid #16408f"
                    : "1px solid #cbd5e1",
                borderRadius: "4px",
                backgroundColor: filters.status ? "#eff6ff" : "#fff",
                color: filters.status ? "#16408f" : "#333",
                cursor: "pointer",
                fontWeight: "600",
                outline: "none",
                boxShadow: statusFocused
                  ? "0 0 0 3px rgba(22, 64, 143, 0.15)"
                  : "none",
                transition: "all 0.15s ease-in-out"
              }}
            >
              <option value="">All Status</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </Box>

          <Box sx={{
            background: "#fff",
            border: "1px solid #ccccccff",
            borderRadius: "3px",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            marginBottom: "20px"
          }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ background: "linear-gradient(180deg, #1e3a8a 0%, #172554 100%)", color: "#fff", borderBottom: "2px solid #0f172a" }}>
                    {[
                      isPipelineTab ? "Job No" : activeTab === "Rejected" ? "Rejected No" : "Enquiry No",
                      "Shipper / Organization",
                      "Document Info",
                      "Port & Routing",
                      "Container & Cargo",
                      "Transit Dates & Terms",
                      "Actions"
                    ].map((h) => (
                      <th key={h} style={{ textAlign: h === "Actions" ? "center" : "left", padding: "10px 12px", fontWeight: "700", fontSize: "11px", letterSpacing: "0.5px", textTransform: "uppercase", borderRight: "1px solid rgba(255,255,255,0.12)", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length ? (
                    filteredRows.map((row, idx) => (
                      <tr
                        key={row.enquiry_no}
                        style={{
                          borderBottom: "1px solid #e2e8f0",
                          backgroundColor: idx % 2 === 1 ? "#f8fafc" : "#ffffff",
                          cursor: isPipelineTab ? "default" : (loadingJob ? "wait" : "pointer"),
                          opacity: loadingJob ? 0.7 : 1,
                          transition: "background-color 0.15s ease"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = idx % 2 === 1 ? "#f8fafc" : "#ffffff")}
                        onClick={() => !loadingJob && handleRowClick(row)}
                      >
                        {/* Col 1: Job No / Identifiers / Badges */}
                        <td style={{ padding: "10px 12px", verticalAlign: "top", minWidth: "160px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                            {isPipelineTab ? (
                              <span
                                onClick={(e) => handleSuccessJobClick(e, row)}
                                style={{ cursor: "pointer", fontWeight: "800", color: "#1d4ed8", fontSize: "13px" }}
                              >
                                {row.success_no || row.enquiry_no}
                              </span>
                            ) : (
                              <span
                                style={{ fontWeight: "800", color: "#1d4ed8", fontSize: "13px" }}
                              >
                                {activeTab === "Rejected" ? (row.rejected_no || row.enquiry_no) : row.enquiry_no}
                              </span>
                            )}

                            <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "600" }}>
                              Date: {row.enquiry_date}
                            </div>

                            <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
                              {row.source_job_no && (
                                <span style={{ color: "#334155", fontSize: "9px", fontWeight: "700", backgroundColor: "#f1f5f9", padding: "1px 5px", borderRadius: "3px", border: "1px solid #cbd5e1" }}>
                                  Ref: {row.source_job_no}
                                </span>
                              )}
                              {(row.shipment_ref_no || row.bl_details?.shipment_ref_no) && (
                                <span style={{ color: "#0f766e", fontSize: "9px", fontWeight: "700", backgroundColor: "#f0fdfa", padding: "1px 5px", borderRadius: "3px", border: "1px solid #99f6e4" }}>
                                  HBL: {row.shipment_ref_no || row.bl_details?.shipment_ref_no}
                                </span>
                              )}
                            </div>

                            {/* Pill Badges: Shipment Type, Container Size, Consignment Type, Goods Stuffed */}
                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "2px" }}>
                              {row.shipment_type && (
                                <span style={{ fontSize: "9px", fontWeight: "700", padding: "2px 5px", borderRadius: "3px", backgroundColor: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", textTransform: "uppercase" }}>
                                  {row.shipment_type}
                                </span>
                              )}
                              {row.container_size && (
                                <span style={{ fontSize: "9px", fontWeight: "700", padding: "2px 5px", borderRadius: "3px", backgroundColor: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1" }}>
                                  {row.container_size}
                                </span>
                              )}
                              {row.consignment_type && (
                                <span style={{ fontSize: "9px", fontWeight: "700", padding: "2px 5px", borderRadius: "3px", backgroundColor: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1" }}>
                                  {row.consignment_type}
                                </span>
                              )}
                              {row.goods_stuffed && (
                                <span style={{ fontSize: "9px", fontWeight: "700", padding: "2px 5px", borderRadius: "3px", backgroundColor: "#fef3c7", color: "#b45309", border: "1px solid #fde68a" }}>
                                  {row.goods_stuffed}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Col 2: Shipper / Organization */}
                        <td style={{ padding: "10px 12px", verticalAlign: "top", minWidth: "180px", maxWidth: "220px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                            <div style={{ color: "#0f172a", fontWeight: "700", fontSize: "11.5px", lineHeight: "1.3", textTransform: "uppercase" }}>
                              {String(row.shipment_type || "").startsWith("Import")
                                ? (row.consignee_name || row.bl_details?.consignee || row.organization_name || "-")
                                : (row.shipper_name || row.organization_name || "-")}
                            </div>
                            {String(row.shipment_type || "").startsWith("Import") && row.organization_name && row.organization_name !== (row.consignee_name || row.bl_details?.consignee) && (
                              <div style={{ color: "#64748b", fontSize: "10px" }}>
                                <span style={{ fontWeight: "600" }}>Party:</span> {row.organization_name}
                              </div>
                            )}
                            {row.email && (
                              <div style={{ color: "#64748b", fontSize: "10px" }}>
                                {row.email}
                              </div>
                            )}
                            {row.contact_no && (
                              <div style={{ color: "#64748b", fontSize: "10px" }}>
                                {row.contact_no}
                              </div>
                            )}
                            {row.remarks && !row.remarks.toLowerCase().includes("created automatically from export job") && (
                              <div style={{ color: "#475569", fontSize: "9.5px", fontStyle: "italic", marginTop: "2px" }}>
                                {row.remarks}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Col 3: Document Info */}
                        <td style={{ padding: "10px 12px", verticalAlign: "top", minWidth: "160px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "10px" }}>
                            {(row.sb_no || row.bl_details?.sb_no) ? (
                              <div>
                                <span style={{ color: "#64748b", fontWeight: "600" }}>SB No: </span>
                                <span style={{ fontWeight: "700", color: "#0f172a" }}>
                                  {row.sb_no || row.bl_details?.sb_no} {row.sb_date ? `(${formatDateDisplay(row.sb_date)})` : ""}
                                </span>
                              </div>
                            ) : null}
                            {row.mbl_no ? (
                              <div>
                                <span style={{ color: "#64748b", fontWeight: "600" }}>MBL No: </span>
                                <span style={{ fontWeight: "700", color: "#0f172a" }}>
                                  {row.mbl_no} {row.mbl_date ? `(${formatDateDisplay(row.mbl_date)})` : ""}
                                </span>
                              </div>
                            ) : null}
                            {row.hbl_no ? (
                              <div>
                                <span style={{ color: "#64748b", fontWeight: "600" }}>HBL No: </span>
                                <span style={{ fontWeight: "700", color: "#0f172a" }}>
                                  {row.hbl_no} {row.hbl_date ? `(${formatDateDisplay(row.hbl_date)})` : ""}
                                </span>
                              </div>
                            ) : null}
                            {row.egm_no ? (
                              <div>
                                <span style={{ color: "#64748b", fontWeight: "600" }}>EGM: </span>
                                <span style={{ fontWeight: "700", color: "#0f172a" }}>{row.egm_no}</span>
                              </div>
                            ) : null}
                            {!row.sb_no && !row.bl_details?.sb_no && !row.mbl_no && !row.hbl_no && (
                              <span style={{ color: "#94a3b8", fontStyle: "italic" }}>-</span>
                            )}
                          </div>
                        </td>

                        {/* Col 4: Port & Routing */}
                        <td style={{ padding: "10px 12px", verticalAlign: "top", minWidth: "190px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "10px" }}>
                            {(row.place_of_receipt || row.bl_details?.place_of_acceptance) && (
                              <div>
                                <span style={{ color: "#64748b", fontWeight: "600" }}>Receipt: </span>
                                <span style={{ color: "#0f172a", fontWeight: "700" }}>{row.place_of_receipt || row.bl_details?.place_of_acceptance}</span>
                              </div>
                            )}
                            <div>
                              <span style={{ color: "#64748b", fontWeight: "600" }}>POL: </span>
                              <span style={{ color: "#0f172a", fontWeight: "700" }}>{row.port_of_loading || "-"}</span>
                            </div>
                            <div>
                              <span style={{ color: "#64748b", fontWeight: "600" }}>POD: </span>
                              <span style={{ color: "#0f172a", fontWeight: "700" }}>{row.port_of_destination || "-"}</span>
                            </div>
                            {(row.vessel_name || row.bl_details?.vessel_name) && (
                              <div style={{ color: "#1e40af", fontWeight: "700", marginTop: "2px" }}>
                                {row.vessel_name || row.bl_details?.vessel_name} {(row.voyage_no || row.bl_details?.voyage_no) ? `(${row.voyage_no || row.bl_details?.voyage_no})` : ""}
                              </div>
                            )}
                            {row.shipping_line_airline && (
                              <div style={{ color: "#475569", fontSize: "9.5px" }}>
                                {row.shipping_line_airline}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Col 5: Container & Cargo Details */}
                        <td style={{ padding: "10px 12px", verticalAlign: "top", minWidth: "190px", maxWidth: "230px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {/* Inline container badges */}
                            {row.containers && row.containers.length > 0 && (
                              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "2px" }}>
                                {row.containers.map((c, cIdx) => (
                                  <span key={cIdx} style={{ fontSize: "9.5px", fontWeight: "700", fontFamily: "monospace", color: "#1e40af", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", padding: "1px 5px", borderRadius: "3px" }}>
                                    {c.container_number || "CNTR"}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "10px" }}>
                              <div>
                                <span style={{ color: "#64748b", fontWeight: "600" }}>Pkgs: </span>
                                <span style={{ fontWeight: "700", color: "#0f172a" }}>{row.no_packages || "-"} {row.package_unit || ""}</span>
                              </div>
                              <div>
                                <span style={{ color: "#64748b", fontWeight: "600" }}>Gross Wt: </span>
                                <span style={{ fontWeight: "700", color: "#0f172a" }}>{row.gross_weight || "-"} {row.gross_weight_unit || ""}</span>
                              </div>
                              {row.net_weight && (
                                <div>
                                  <span style={{ color: "#64748b", fontWeight: "600" }}>Net Wt: </span>
                                  <span style={{ fontWeight: "700", color: "#0f172a" }}>{row.net_weight} {row.net_weight_unit || ""}</span>
                                </div>
                              )}
                              {row.volume_cbm && (
                                <div>
                                  <span style={{ color: "#64748b", fontWeight: "600" }}>Volume: </span>
                                  <span style={{ fontWeight: "700", color: "#0f172a" }}>{row.volume_cbm} {row.volume_unit || "CBM"}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Col 6: Transit Dates & Terms */}
                        <td style={{ padding: "10px 12px", verticalAlign: "top", minWidth: "170px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "10px" }}>
                            {(row.booking_date || row.bl_details?.booking_date) && (
                              <div>
                                <span style={{ color: "#64748b", fontWeight: "600" }}>Booking: </span>
                                <span style={{ fontWeight: "700", color: "#0f172a" }}>{formatDateDisplay(row.booking_date || row.bl_details?.booking_date)}</span>
                              </div>
                            )}
                            {(row.cut_off_date || row.bl_details?.cut_off_date) && (
                              <div>
                                <span style={{ color: "#64748b", fontWeight: "600" }}>Cut-off: </span>
                                <span style={{ fontWeight: "700", color: "#0f172a" }}>{formatDateDisplay(row.cut_off_date || row.bl_details?.cut_off_date)}</span>
                              </div>
                            )}
                            {(row.sailing_date || row.bl_details?.sailing_date) && (
                              <div>
                                <span style={{ color: "#64748b", fontWeight: "600" }}>ETD: </span>
                                <span style={{ fontWeight: "700", color: "#0f172a" }}>{formatDateDisplay(row.sailing_date || row.bl_details?.sailing_date)}</span>
                              </div>
                            )}
                            {(row.eta_date || row.bl_details?.eta_date) && (
                              <div>
                                <span style={{ color: "#64748b", fontWeight: "600" }}>ETA: </span>
                                <span style={{ fontWeight: "700", color: "#0f172a" }}>{formatDateDisplay(row.eta_date || row.bl_details?.eta_date)}</span>
                              </div>
                            )}
                            {(row.shipment_terms || row.bl_details?.shipment_terms) && (
                              <div style={{ marginTop: "2px" }}>
                                <span style={{ color: "#0f766e", fontWeight: "700", backgroundColor: "#f0fdfa", padding: "1px 5px", borderRadius: "3px", border: "1px solid #99f6e4", fontSize: "9px" }}>
                                  {row.shipment_terms || row.bl_details?.shipment_terms}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Col 7: Actions */}
                        <td style={{ padding: "10px 12px", verticalAlign: "top", textAlign: "center" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                            {activeTab === "Draft BL" && (
                              <Button
                                variant="contained"
                                size="small"
                                color="success"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updatePipelineValue(row._id || row.enquiry_no, "draftApproved", true);
                                }}
                                sx={{
                                  textTransform: "none",
                                  backgroundColor: "#10b981",
                                  fontWeight: 700,
                                  fontSize: "10.5px",
                                  height: "26px",
                                  "&:hover": { backgroundColor: "#059669" },
                                }}
                              >
                                Approve
                              </Button>
                            )}

                            <DocsUploadCell row={row} onUpdate={handleUpdateEnquiry} />

                            {row.status === "Converted" && (
                              <Tooltip title="Track Shipment">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTrackingEnquiry(row);
                                  }}
                                  sx={{
                                    border: "1px solid #e2e8f0",
                                    backgroundColor: "#f8fafc",
                                    color: "#fc8019",
                                    "&:hover": { backgroundColor: "#fff5ec", borderColor: "#fc8019" }
                                  }}
                                >
                                  <LocalShippingIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}

                            {row.shipment_type !== "Import-Air" && row.shipment_type !== "Export-Air" && (
                              <Tooltip title="Generate BL">
                                <span>
                                  <FreightBillOfLadingGenerator enquiry={row}>
                                    <IconButton
                                      size="small"
                                      onClick={(e) => e.stopPropagation()}
                                      sx={{
                                        border: "1px solid #e2e8f0",
                                        backgroundColor: "#f8fafc",
                                        color: "#334155",
                                        "&:hover": { backgroundColor: "#e2e8f0", color: "#0f172a" }
                                      }}
                                    >
                                      <ReceiptIcon fontSize="small" />
                                    </IconButton>
                                  </FreightBillOfLadingGenerator>
                                </span>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ padding: "40px 24px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                        No enquiries found. Click <strong>+ Create Enquiry</strong> to start.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Box>
        </>
      )}

      <Dialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        maxWidth="lg"
        fullWidth
        sx={{ "& .MuiDialog-paper": { borderRadius: "3px", overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8fafc", borderBottom: '1px solid #cbd5e1' }}>
          <Typography sx={{ fontWeight: 600, fontSize: "14px", color: '#1e293b' }}>Create Freight Forwarding Enquiry</Typography>
          <IconButton aria-label="close" onClick={() => setOpenCreate(false)} sx={{ color: '#64748b' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <CreateFreightEnquiry onCreate={handleCreateEnquiry} onClose={() => setOpenCreate(false)} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedEnquiry}
        onClose={() => setSelectedEnquiry(null)}
        maxWidth="md"
        fullWidth
        sx={{ "& .MuiDialog-paper": { borderRadius: "3px", overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8fafc", borderBottom: '1px solid #cbd5e1' }}>
          <Typography sx={{ fontWeight: 600, fontSize: "14px", color: '#1e293b' }}>Enquiry Details - {selectedEnquiry?.enquiry_no}</Typography>
          <IconButton onClick={() => setSelectedEnquiry(null)} sx={{ color: '#64748b' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {selectedEnquiry && (
            <CaptureRates
              enquiry={selectedEnquiry}
              forwarders={forwarders}
              onUpdate={handleUpdateEnquiry}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        fullScreen
      >
        <DialogTitle sx={{ m: 0, p: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#1e293b", color: '#fff' }}>
          <Typography sx={{ fontWeight: 700, fontSize: "15px" }}>Export Job Detail - {selectedJob?.job_no}</Typography>
          <IconButton onClick={() => setSelectedJob(null)} sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {selectedJob && (
            <AddExJobs
              job={selectedJob}
              onClose={() => setSelectedJob(null)}
              onUpdateJob={(updated) => {
                setSelectedJob(updated);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* DSR Report Dialog */}
      <Dialog
        open={openDSRDialog}
        onClose={() => {
          setOpenDSRDialog(false);
          setDsrStartDate("");
          setDsrEndDate("");
        }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ style: { borderRadius: "3px" } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1, borderBottom: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>Freight Forwarding {dsrMode} DSR Report</span>
          <IconButton
            size="small"
            onClick={() => {
              setOpenDSRDialog(false);
              setDsrStartDate("");
              setDsrEndDate("");
            }}
            sx={{ color: "#64748b" }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>

            <FormControl size="small" fullWidth>
              <InputLabel id="dsr-year-label">Financial Year</InputLabel>
              <Select
                labelId="dsr-year-label"
                value={dsrYear}
                label="Financial Year"
                onChange={(e) => setDsrYear(e.target.value)}
                sx={{ borderRadius: "3px", fontSize: "12px" }}
              >
                <MenuItem value="all" style={{ fontSize: "12px" }}>All Years</MenuItem>
                <MenuItem value="26-27" style={{ fontSize: "12px" }}>2026-2027 (26-27)</MenuItem>
                <MenuItem value="25-26" style={{ fontSize: "12px" }}>2025-2026 (25-26)</MenuItem>
                <MenuItem value="24-25" style={{ fontSize: "12px" }}>2024-2025 (24-25)</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel id="dsr-shipment-label">Shipment Type</InputLabel>
              <Select
                labelId="dsr-shipment-label"
                value={dsrShipmentType}
                label="Shipment Type"
                onChange={(e) => setDsrShipmentType(e.target.value)}
                sx={{ borderRadius: "3px", fontSize: "12px" }}
              >
                {dsrMode === "Import" ? (
                  <>
                    <MenuItem value="all" style={{ fontSize: "12px" }}>All Import Shipments</MenuItem>
                    <MenuItem value="Import-Sea" style={{ fontSize: "12px" }}>Import - Sea</MenuItem>
                    <MenuItem value="Import-Air" style={{ fontSize: "12px" }}>Import - Air</MenuItem>
                  </>
                ) : (
                  <>
                    <MenuItem value="all" style={{ fontSize: "12px" }}>All Export Shipments</MenuItem>
                    <MenuItem value="Export-Sea" style={{ fontSize: "12px" }}>Export - Sea</MenuItem>
                    <MenuItem value="Export-Air" style={{ fontSize: "12px" }}>Export - Air</MenuItem>
                  </>
                )}
              </Select>
            </FormControl>

            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                label="Start Date"
                type="date"
                size="small"
                value={dsrStartDate}
                onChange={(e) => setDsrStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                inputProps={{ style: { fontSize: "12px" } }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "3px" } }}
              />
              <TextField
                label="End Date"
                type="date"
                size="small"
                value={dsrEndDate}
                onChange={(e) => setDsrEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                inputProps={{ style: { fontSize: "12px" } }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "3px" } }}
              />
            </Box>

          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 0, borderTop: "1px solid #e2e8f0" }}>
          <Button
            onClick={() => {
              setOpenDSRDialog(false);
              setDsrStartDate("");
              setDsrEndDate("");
            }}
            variant="outlined"
            size="small"
            sx={{
              borderColor: "#cbd5e1",
              color: "#475569",
              textTransform: "none",
              borderRadius: "3px",
              height: 32,
              fontSize: "12px",
              "&:hover": { borderColor: "#94a3b8", backgroundColor: "#f8fafc" }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDownloadDSR}
            variant="contained"
            size="small"
            disabled={dsrLoading}
            sx={{
              backgroundColor: dsrLoading ? "#cbd5e1" : "#16408f",
              textTransform: "none",
              borderRadius: "3px",
              height: 32,
              fontSize: "12px",
              fontWeight: "600",
              "&:hover": { backgroundColor: "#19448a" }
            }}
          >
            {dsrLoading ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "Download Excel"}
          </Button>
        </DialogActions>
      </Dialog>

      {trackingEnquiry && (
        <FreightTrackingMap
          enquiry={trackingEnquiry}
          onUpdate={(updatedRow) => {
            handleUpdateEnquiry(updatedRow);
            setTrackingEnquiry(updatedRow);
          }}
          onClose={() => setTrackingEnquiry(null)}
        />
      )}
    </div>
  );
}

export default FreightForwardingModule;
