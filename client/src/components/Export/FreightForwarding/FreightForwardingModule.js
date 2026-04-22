import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
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
    setSelectedEnquiry(updated);
  };

  const handleRowClick = async (row) => {
    // Priority: Use enquiry_no for navigation if in Success tab as requested by user
    // Fallback to source_job_no or remarks-based job_no
    let jobNo = row.enquiry_no;
    
    if (activeTab === "Success") {
      const encodedJobNo = encodeURIComponent(jobNo);
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
                    {["Enquiry No", "Date", "Organization", "Shipment", "Booking Info", "POL", "Destination", "Source Job", "Status"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "10px", color: THEME.textMuted, fontWeight: 700 }}>
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
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEnquiry(row);
                            }}
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
                        <td style={{ padding: "10px", fontWeight: 600 }}>{row.source_job_no || "-"}</td>
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
