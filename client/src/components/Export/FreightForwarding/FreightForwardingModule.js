import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Typography, CircularProgress, Tooltip, Box, Button } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import GetAppIcon from "@mui/icons-material/GetApp";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import CreateFreightEnquiry from "./CreateFreightEnquiry";
import ForwarderDirectory from "./ForwarderDirectory";
import CaptureRates from "./CaptureRates";
import AddExJobs from "../Export-Dsr/AddExJobs";
import FreightBillOfLadingGenerator from "./FreightBillOfLadingGenerator";

const s = {
  wrapper: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
    backgroundColor: "#fafaffff",
    padding: "5px 15px",
    minHeight: "100vh",
    color: "#333",
  },
  titleCard: {
    backgroundColor: "#fff",
    padding: "12px 18px",
    borderRadius: "8px",
    marginTop: "10px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    border: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  toolbar: {
    display: "flex",
    gap: "10px",
    rowGap: "10px",
    alignItems: "center",
    marginBottom: "12px",
    flexWrap: "wrap",
    backgroundColor: "#fff",
    padding: "8px 12px",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    border: "1px solid #e5e7eb",
  },
  tabsContainer: {
    display: "flex",
    gap: "12px",
    marginBottom: "12px",
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: "2px",
  }
};

const THEME = {
  blue: "#2563eb",
  border: "#e5e7eb",
  text: "#111827",
  textMuted: "#64748b",
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
    <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', justifyContent: 'center' }}>
      <button
        onClick={handleOpen}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: 6,
          border: `1px solid ${uploadedCount > 0 ? '#bfdbfe' : '#e5e7eb'}`,
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
        PaperProps={{ style: { maxHeight: 350, width: 220, borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", border: '1px solid #e5e7eb' } }}
      >
        <Typography variant="overline" sx={{ px: 2, pt: 1, fontWeight: 800, color: '#64748b', display: 'block', borderBottom: `1px solid #f3f4f6`, mb: 1, letterSpacing: '0.5px' }}>
          SHIPPING / VGM DOCS
        </Typography>
        {DOC_TYPES.map((doc) => (
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

  const handleRowClick = (row) => {
    if (activeTab !== "Success") {
      setSelectedEnquiry(row);
    }
  };

  const handleSuccessJobClick = (e, row) => {
    e.stopPropagation();
    const encodedJobNo = encodeURIComponent(row.enquiry_no);
    navigate(`/export-charges/job/${encodedJobNo}`);
  };

  return (
    <div style={s.wrapper}>
      <Box sx={s.titleCard}>
        <div>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#1e293b", fontSize: '18px' }}>
            Freight Forwarding
          </Typography>

        </div>
        <Button
          variant="contained"
          size="small"
          onClick={() => setOpenCreate(true)}
          sx={{
            backgroundColor: "#2563eb",
            fontWeight: 700,
            textTransform: "none",
            borderRadius: "6px",
            height: 32,
            px: 2,
            "&:hover": { backgroundColor: "#1d4ed8", boxShadow: '0 2px 8px rgba(37,99,235,0.2)' }
          }}
        >
          + Create Enquiry
        </Button>
      </Box>

      {/* Tabs */}
      <Box sx={s.tabsContainer}>
        {["Enquiry", "Success", "Rejected", "Forwarders"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 20px",
              borderRadius: "6px 6px 0 0",
              border: "none",
              backgroundColor: activeTab === tab ? "transparent" : "transparent",
              color: activeTab === tab ? "#2563eb" : "#64748b",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
              borderBottom: activeTab === tab ? "3px solid #2563eb" : "3px solid transparent",
              marginBottom: "-2px"
            }}
          >
            {tab}
          </button>
        ))}
      </Box>

      {activeTab !== "Forwarders" ? (
        <>
          <Box sx={s.toolbar}>
            <input
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Search by Enquiry No, Org, Port..."
              style={{
                height: 28,
                border: `1px solid #e2e8f0`,
                borderRadius: 6,
                padding: "0 12px",
                flex: 1,
                maxWidth: 400,
                fontSize: 12,
                backgroundColor: '#f9fafb'
              }}
            />
            <select
              value={filters.shipment_type}
              onChange={(e) => setFilters((prev) => ({ ...prev, shipment_type: e.target.value }))}
              style={{ height: 28, border: `1px solid #e2e8f0`, borderRadius: 6, padding: "0 8px", fontSize: 12, backgroundColor: '#f9fafb', color: '#475569', fontWeight: 600 }}
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
              style={{ height: 28, border: `1px solid #e2e8f0`, borderRadius: 6, padding: "0 8px", fontSize: 12, backgroundColor: '#f9fafb', color: '#475569', fontWeight: 600 }}
            >
              <option value="">All Status</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </Box>

          <Box sx={{ background: "#fff", border: `1px solid #e2e8f0`, borderRadius: "8px", overflow: "hidden", boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ backgroundColor: "#19448aff", color: "#fff" }}>
                    {["Enquiry No", "Date", "Organization", "Shipment", "Booking Info", "POL", "Destination", "Docs Upload", "Status"].map((h) => (
                      <th key={h} style={{ textAlign: h === "Docs Upload" ? "center" : "left", padding: "12px 10px", fontWeight: 700, fontSize: '12px' }}>
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
                          borderBottom: `1px solid #f1f5f9`,
                          cursor: activeTab === "Success" ? "default" : (loadingJob ? "wait" : "pointer"),
                          opacity: loadingJob ? 0.7 : 1,
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        onClick={() => !loadingJob && handleRowClick(row)}
                      >
                        <td style={{ padding: "12px 10px", fontWeight: 700, color: "#2563eb" }}>
                          {activeTab === "Success" ? (
                            <span
                              onClick={(e) => handleSuccessJobClick(e, row)}
                              style={{ cursor: "pointer", textDecoration: "none", borderBottom: '1px dashed #2563eb' }}
                            >
                              {row.enquiry_no}
                            </span>
                          ) : (
                            <span style={{ cursor: "pointer", textDecoration: "none", borderBottom: '1px dashed #2563eb' }}>
                              {row.enquiry_no}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px 10px", color: '#475569' }}>{row.enquiry_date}</td>
                        <td style={{ padding: "12px 10px", color: '#334155', fontWeight: 600 }}>{row.organization_name}</td>
                        <td style={{ padding: "12px 10px", color: '#475569' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, backgroundColor: '#f1f5f9', color: '#64748b', textTransform: 'uppercase' }}>
                            {row.shipment_type}
                          </span>
                        </td>
                        <td style={{ padding: "12px 10px", color: '#475569' }}>{[row.container_size, row.consignment_type, row.goods_stuffed].filter(Boolean).join(" / ") || "-"}</td>
                        <td style={{ padding: "12px 10px", color: '#475569' }}>{row.port_of_loading || "-"}</td>
                        <td style={{ padding: "12px 10px", color: '#475569' }}>{row.port_of_destination || "-"}</td>
                        <td style={{ padding: "12px 10px" }}>
                          <DocsUploadCell row={row} onUpdate={handleUpdateEnquiry} />
                        </td>
                        <td style={{ padding: "12px 10px" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 10px",
                                borderRadius: 4,
                                backgroundColor: row.status === "Converted" ? "#dcfce7" : row.status === "Rejected" ? "#fee2e2" : "#fef3c7",
                                color: row.status === "Converted" ? "#166534" : row.status === "Rejected" ? "#991b1b" : "#92400e",
                                fontWeight: 800,
                                fontSize: 10,
                                textTransform: 'uppercase'
                              }}
                            >
                              {row.status}
                            </span>
                            {row.shipment_type !== "Import-Air" && row.shipment_type !== "Export-Air" && (
                              <FreightBillOfLadingGenerator enquiry={row}>
                                <button
                                  type="button"
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    padding: "3px 10px",
                                    borderRadius: 4,
                                    border: `1px solid #2563eb`,
                                    backgroundColor: "#fff",
                                    color: "#2563eb",
                                    fontSize: 10,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff' }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff' }}
                                >
                                  Generate BL
                                </button>
                              </FreightBillOfLadingGenerator>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} style={{ padding: "40px 24px", textAlign: "center", color: '#64748b', fontSize: 13 }}>
                        No enquiries found. Click <strong>+ Create Enquiry</strong> to start.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Box>
        </>
      ) : (
        <ForwarderDirectory />
      )}

      <Dialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        maxWidth="lg"
        fullWidth
        sx={{ "& .MuiDialog-paper": { borderRadius: "12px", overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8fafc", borderBottom: '1px solid #e2e8f0' }}>
          <Typography sx={{ fontWeight: 800, fontSize: "16px", color: '#1e293b' }}>Create Freight Forwarding Enquiry</Typography>
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
        sx={{ "& .MuiDialog-paper": { borderRadius: "12px", overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8fafc", borderBottom: '1px solid #e2e8f0' }}>
          <Typography sx={{ fontWeight: 800, fontSize: "16px", color: '#1e293b' }}>Enquiry Details - {selectedEnquiry?.enquiry_no}</Typography>
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
    </div>
  );
}

export default FreightForwardingModule;
