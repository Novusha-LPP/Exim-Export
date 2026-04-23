import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Typography, CircularProgress, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import GetAppIcon from "@mui/icons-material/GetApp";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import CreateFreightEnquiry from "./CreateFreightEnquiry";
import ForwarderDirectory from "./ForwarderDirectory";
import CaptureRates from "./CaptureRates";
import AddExJobs from "../Export-Dsr/AddExJobs";

const THEME = {
  blue: "#2563eb",
  border: "#e5e7eb",
  text: "#111827",
  textMuted: "#6b7280",
  white: "#ffffff",
  bg: "#fafaff",
};

const DOC_TYPES = [
  { label: "LEO", field: "leo_copy" },
  { label: "INVOICE", field: "invoice" },
  { label: "PACKING LIST", field: "packing_list" },
  { label: "BILL OF LADING", field: "bill_of_lading" },
];

function DocsUploadCell({ row, onUpdate }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [uploading, setUploading] = useState(null);

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

  const docs = row.documents || {};
  const uploadedCount = Object.values(docs).filter(Boolean).length;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        onClick={handleOpen}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "4px 8px",
          borderRadius: 6,
          border: `1px solid ${THEME.border}`,
          backgroundColor: uploadedCount > 0 ? "#eff6ff" : "#fff",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 700,
          color: uploadedCount > 0 ? THEME.blue : THEME.textMuted,
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
        PaperProps={{ style: { maxHeight: 350, width: 220, borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" } }}
      >
        <Typography variant="overline" sx={{ px: 2, fontWeight: 800, color: THEME.textMuted, display: 'block', borderBottom: `1px solid ${THEME.border}`, mb: 1 }}>
          SHIPPING / VGM DOCS
        </Typography>
        {DOC_TYPES.map((doc) => (
          <MenuItem 
            key={doc.field} 
            sx={{ display: "flex", justifyContent: "space-between", py: 0.8, px: 2, borderBottom: `1px solid ${THEME.border}22` }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: THEME.text }}>{doc.label}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
                    sx={{ color: docs[doc.field] ? "#dc2626" : "#e2e8f0", p: 0.5 }}
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
    </div>
  );
}

function FreightForwardingModule() {
  const [rows, setRows] = useState([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    shipment_type: "",
    status: "",
  });
  const [activeTab, setActiveTab] = useState("Enquiry");
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [forwarders, setForwarders] = useState([]);
  const [loadingJob, setLoadingJob] = useState(false);

  useEffect(() => {
    fetchEnquiries();
    fetchForwarders();
  }, []);

  const fetchEnquiries = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_STRING}/freight-enquiries`);
      if (res.data.success) setRows(res.data.data);
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
      // 1. Status Tab Filter
      if (activeTab === "Enquiry" && row.status !== "Open") return false;
      if (activeTab === "Success" && row.status !== "Converted") return false;
      if (activeTab === "Rejected" && row.status !== "Rejected") return false;

      // 2. Additional Filters
      const needle = filters.search.trim().toUpperCase();
      const matchSearch =
        !needle ||
        [row.enquiry_no, row.organization_name, row.port_of_loading, row.port_of_destination]
          .filter(Boolean)
          .some((field) => field.toUpperCase().includes(needle));
      const matchShipment = !filters.shipment_type || row.shipment_type === filters.shipment_type;
      const matchStatus = !filters.status || row.status === filters.status;
      return matchSearch && matchShipment && matchStatus;
    });
  }, [rows, filters, activeTab]);

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

  const handleRowClick = async (row) => {
    if (activeTab === "Success") {
      const encodedJobNo = encodeURIComponent(row.enquiry_no);
      navigate(`/export-charges/job/${encodedJobNo}`);
    } else {
      setSelectedEnquiry(row);
    }
  };

  return (
    <div
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
        backgroundColor: THEME.bg,
        minHeight: "100vh",
        padding: "16px 20px",
      }}
    >
      <div
        style={{
          background: THEME.white,
          border: `1px solid ${THEME.border}`,
          borderRadius: 12,
          padding: "14px 18px",
          marginBottom: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: THEME.text, fontSize: 20 }}>Freight Forwarding Module</h2>
          <p style={{ margin: "3px 0 0", color: THEME.textMuted, fontSize: 12 }}>
            Track enquiries and coordinate with forwarders for best freight rates.
          </p>
        </div>
        <button
          onClick={() => setOpenCreate(true)}
          style={{
            backgroundColor: THEME.blue,
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          + Create Enquiry
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", borderBottom: `1px solid ${THEME.border}`, paddingBottom: "8px" }}>
        {["Enquiry", "Success", "Rejected", "Forwarders"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 20px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: activeTab === tab ? THEME.blue : "transparent",
              color: activeTab === tab ? "#fff" : THEME.textMuted,
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab !== "Forwarders" ? (
        <>
          <div
            style={{
              background: THEME.white,
              border: `1px solid ${THEME.border}`,
              borderRadius: 12,
              padding: "10px 12px",
              marginBottom: 10,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <input
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Search enquiry / organization / ports"
              style={{
                height: 32,
                border: `1px solid ${THEME.border}`,
                borderRadius: 6,
                padding: "0 10px",
                minWidth: 280,
                fontSize: 12,
              }}
            />
            <select
              value={filters.shipment_type}
              onChange={(e) => setFilters((prev) => ({ ...prev, shipment_type: e.target.value }))}
              style={{ height: 32, border: `1px solid ${THEME.border}`, borderRadius: 6, padding: "0 8px" }}
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
              style={{ height: 32, border: `1px solid ${THEME.border}`, borderRadius: 6, padding: "0 8px" }}
            >
              <option value="">All Status</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div style={{ background: "#fff", border: `1px solid ${THEME.border}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: `1px solid ${THEME.border}` }}>
                    {["Enquiry No", "Date", "Organization", "Shipment", "Booking Info", "POL", "Destination", "Docs Upload", "Status"].map((h) => (
                      <th key={h} style={{ textAlign: h === "Docs Upload" ? "center" : "left", padding: "10px", color: THEME.textMuted, fontWeight: 700 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length ? (
                    filteredRows.map((row) => (
                      <tr 
                        key={row.enquiry_no} 
                        style={{ 
                          borderBottom: `1px solid ${THEME.border}`, 
                          cursor: loadingJob ? "wait" : "pointer",
                          opacity: loadingJob ? 0.7 : 1
                        }}
                        onClick={() => !loadingJob && handleRowClick(row)}
                      >
                        <td style={{ padding: "10px", fontWeight: 700, color: THEME.blue }}>
                          <span 
                            style={{ cursor: "pointer", textDecoration: "underline" }}
                          >
                            {row.enquiry_no}
                          </span>
                        </td>
                        <td style={{ padding: "10px" }}>{row.enquiry_date}</td>
                        <td style={{ padding: "10px" }}>{row.organization_name}</td>
                        <td style={{ padding: "10px" }}>{row.shipment_type}</td>
                        <td style={{ padding: "10px" }}>{[row.container_size, row.consignment_type, row.goods_stuffed].filter(Boolean).join(" / ") || "-"}</td>
                        <td style={{ padding: "10px" }}>{row.port_of_loading || "-"}</td>
                        <td style={{ padding: "10px" }}>{row.port_of_destination || "-"}</td>
                        <td style={{ padding: "10px" }}>
                          <DocsUploadCell row={row} onUpdate={handleUpdateEnquiry} />
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: 12,
                              backgroundColor: row.status === "Converted" ? "#ecfdf5" : "#fff7ed",
                              color: row.status === "Converted" ? "#059669" : "#ea580c",
                              fontWeight: 700,
                              fontSize: 11,
                            }}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} style={{ padding: "24px", textAlign: "center", color: THEME.textMuted }}>
                        No enquiries yet. Click <strong>Create Enquiry</strong> to add your first freight enquiry.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <ForwarderDirectory />
      )}

      <Dialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        maxWidth="lg"
        fullWidth
        sx={{ "& .MuiDialog-paper": { borderRadius: "10px" } }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f3f4f6" }}>
          <span style={{ fontWeight: 700, fontSize: "16px" }}>Create Freight Forwarding Enquiry</span>
          <IconButton aria-label="close" onClick={() => setOpenCreate(false)} sx={{ color: (theme) => theme.palette.grey[500] }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <CreateFreightEnquiry onCreate={handleCreateEnquiry} onClose={() => setOpenCreate(false)} />
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!selectedEnquiry}
        onClose={() => setSelectedEnquiry(null)}
        maxWidth="md"
        fullWidth
        sx={{ "& .MuiDialog-paper": { borderRadius: "10px" } }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f3f4f6" }}>
          <span style={{ fontWeight: 700, fontSize: "16px" }}>Enquiry Details - {selectedEnquiry?.enquiry_no}</span>
          <IconButton onClick={() => setSelectedEnquiry(null)}>
            <CloseIcon />
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

      {/* JOB VIEW DIALOG - Specific request for Success tab */}
      <Dialog
        open={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        fullScreen
      >
        <DialogTitle sx={{ m: 0, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f3f4f6" }}>
          <span style={{ fontWeight: 700, fontSize: "16px" }}>Export Job Detail - {selectedJob?.job_no}</span>
          <IconButton onClick={() => setSelectedJob(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {selectedJob && (
            <AddExJobs 
              job={selectedJob} 
              onClose={() => setSelectedJob(null)}
              // Pass required props for internal updates if necessary
              onUpdateJob={(updated) => {
                setSelectedJob(updated);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FreightForwardingModule;
