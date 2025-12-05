import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { format, parseISO, isValid } from "date-fns";

// --- Clean Enterprise Styles ---
const s = {
  wrapper: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
    backgroundColor: "#ffffff",
    padding: "10px 20px 20px 20px",
    minHeight: "100vh",
    color: "#333",
    fontSize: "12px",
  },
  container: {
    width: "100%",
    margin: "0 auto",
  },
  headerRow: {
    marginBottom: "10px",
    paddingBottom: "0",
  },
  pageTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#111",
    margin: "0",
  },
  
  // Tabs
  tabContainer: {
    display: "flex",
    borderBottom: "1px solid #e5e7eb",
    marginBottom: "15px",
  },
  tab: {
    padding: "8px 20px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    color: "#6b7280",
    borderBottom: "3px solid transparent",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "transparent",
    border: "none",
    outline: "none",
    marginBottom: "-1px",
  },
  activeTab: {
    color: "#2563eb",
    borderBottom: "3px solid #2563eb",
  },
  badge: {
    padding: "1px 6px",
    borderRadius: "10px",
    fontSize: "10px",
    fontWeight: "700",
    backgroundColor: "#f3f4f6",
    color: "#4b5563",
  },
  activeBadge: {
    backgroundColor: "#eff6ff",
    color: "#2563eb",
  },

  // Toolbar
  toolbar: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    marginBottom: "10px",
  },
  input: {
    height: "30px",
    padding: "0 8px",
    fontSize: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "3px",
    outline: "none",
    color: "#333",
    minWidth: "200px",
  },
  select: {
    height: "30px",
    padding: "0 24px 0 8px",
    fontSize: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "3px",
    backgroundColor: "#fff",
    color: "#333",
    cursor: "pointer",
  },
  
  // Table
  tableContainer: {
    overflowX: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: "3px",
    maxHeight: "600px",
    overflowY: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
    whiteSpace: "nowrap",
  },
  th: {
    backgroundColor: "#f9fafb",
    color: "#374151",
    fontWeight: "700",
    padding: "10px 12px",
    textAlign: "left",
    borderBottom: "1px solid #e5e7eb",
    borderRight: "1px solid #f3f4f6",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  td: {
    padding: "8px 12px",
    borderBottom: "1px solid #f3f4f6",
    borderRight: "1px solid #f9fafb",
    color: "#1f2937",
  },
  rowHover: {
    cursor: "pointer",
    transition: "background 0.1s",
  },
  
  // Chips
  chip: {
    padding: "2px 6px",
    borderRadius: "3px",
    fontSize: "10px",
    fontWeight: "600",
    border: "1px solid #e5e7eb",
    backgroundColor: "#fff",
    display: "inline-block",
  },
  
  // Pagination Footer
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderTop: "1px solid #e5e7eb",
    marginTop: "10px",
    color: "#6b7280",
    fontSize: "12px",
  },
  btnPage: {
    padding: "5px 12px",
    border: "1px solid #d1d5db",
    backgroundColor: "#fff",
    borderRadius: "3px",
    cursor: "pointer",
    fontSize: "12px",
    color: "#374151",
    marginLeft: "5px",
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
    backgroundColor: "#f9fafb",
  },
  
  // Loading
  message: { padding: "40px", textAlign: "center", color: "#9ca3af", fontStyle: "italic" }
};

// Helper
const safeDate = (val) => {
  if (!val) return "";
  try {
    const date = parseISO(val);
    return isValid(date) ? format(date, "dd/MM/yyyy") : "";
  } catch (e) { return ""; }
};

const ExportJobsTable = () => {
  const navigate = useNavigate();
  
  // State
  const [activeTab, setActiveTab] = useState("pending");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const LIMIT = 20; // Fixed limit per request

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedType, setSelectedMovementType] = useState("");



  // --- Fetch Jobs ---
  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_STRING}/export-jobs/api/exports`, {
          params: {
            status: activeTab,
            search: searchQuery,
            year: selectedYear === "all" ? "" : selectedYear,
            movement_type: selectedType,
            page: page,      // Current Page
            limit: LIMIT,    // 30 records
          },
        });
        if (response.data.success) {
          setJobs(response.data.data.jobs || []);
          // Assuming API returns total count for pagination calculation
          setTotalRecords(response.data.data.total || response.data.data.pagination?.totalCount || 0);
        }
      } catch (err) {
        console.error(err);
        setJobs([]);
        setTotalRecords(0);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchJobs, 300);
    return () => clearTimeout(timer);
  }, [activeTab, searchQuery, selectedYear, selectedType, page]); // Refetch when page changes

  // Reset page when tab/filters change
  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery, selectedYear, selectedType]);

  const handleView = (job) => {
    const jobNo = job.job_no
  if (jobNo) {
    navigate(`job/${encodeURIComponent(jobNo)}`,  {
      state: { fromJobList: true },
    });
    }
  };

  const totalPages = Math.ceil(totalRecords / LIMIT);

  return (
    <div style={s.wrapper}>
      <div style={s.container}>
        
        {/* Title */}
        <div style={s.headerRow}>
          <h1 style={s.pageTitle}>Export Jobs</h1>
        </div>

        {/* Tabs */}
        <div style={s.tabContainer}>
          <button 
            style={activeTab === 'pending' ? {...s.tab, ...s.activeTab} : s.tab}
            onClick={() => setActiveTab('pending')}
          >
            Pending <span style={activeTab === 'pending' ? {...s.badge, ...s.activeBadge} : s.badge}></span>
          </button>
          <button 
            style={activeTab === 'completed' ? {...s.tab, ...s.activeTab} : s.tab}
            onClick={() => setActiveTab('completed')}
          >
            Completed <span style={activeTab === 'completed' ? {...s.badge, ...s.activeBadge} : s.badge}></span>
          </button>
          <button 
            style={activeTab === 'cancelled' ? {...s.tab, ...s.activeTab} : s.tab}
            onClick={() => setActiveTab('cancelled')}
          >
            Cancelled <span style={activeTab === 'cancelled' ? {...s.badge, ...s.activeBadge} : s.badge}></span>
          </button>
        </div>

        {/* Filters */}
        <div style={s.toolbar}>
          <select style={s.select} value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
            <option value="">All Years</option>
            <option value="25-26">25-26</option>
            <option value="26-27">26-27</option>
          </select>

          <select style={s.select} value={selectedType} onChange={e => setSelectedMovementType(e.target.value)}>
            <option value="">All Movement</option>
            <option value="FCL">FCL</option>
            <option value="LCL">LCL</option>
            <option value="AIR">Air Freight</option>
          </select>

          <input 
            style={s.input}
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Table */}
        <div style={s.tableContainer}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={{...s.th, width: '40px', textAlign: 'center'}}>#</th>
                <th style={{...s.th, width: '130px', position: 'sticky', left: 0, zIndex: 20}}>Job Number</th>
                <th style={s.th}>Exporter</th>
                <th style={s.th}>Consignee</th>
                <th style={{...s.th, width: '60px'}}>Type</th>
                <th style={s.th}>Invoice No</th>
                <th style={s.th}>Date</th>
                <th style={s.th}>POL</th>
                <th style={s.th}>POD</th>
                <th style={s.th}>Country</th>
                <th style={s.th}>SB No</th>
                <th style={s.th}>SB Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="12" style={s.message}>Loading data...</td></tr>
              ) : jobs.length === 0 ? (
                <tr><td colSpan="12" style={s.message}>No jobs found.</td></tr>
              ) : (
                jobs.map((job, idx) => (
                  <tr 
                    key={job._id || idx} 
                    style={s.rowHover}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f0f7ff"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    onClick={() => handleView(job)}
                  >
                    <td style={{...s.td, textAlign: 'center', color: '#9ca3af'}}>{(page - 1) * LIMIT + idx + 1}</td>
                    
                    {/* Sticky 1st Col */}
                    <td style={{...s.td, fontWeight: '600', color: '#2563eb', position: 'sticky', left: 0, backgroundColor: 'inherit', zIndex: 5}}>
                      {job.job_no}
                    </td>
                    
                    <td style={{...s.td, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis'}} title={job.exporter_name}>
                      {job.exporter_name}
                    </td>
                    <td style={{...s.td, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis'}} title={job.consignee_name}>
                      {job.consignee_name || '-'}
                    </td>
                    <td style={s.td}>
                      <span style={s.chip}>{job.movement_type || '-'}</span>
                    </td>
                    <td style={s.td}>{job.commercial_invoice_number || '-'}</td>
                    <td style={s.td}>{safeDate(job.job_date)}</td>
                    <td style={s.td}>{job.port_of_origin || '-'}</td>
                    <td style={s.td}>{job.port_of_discharge || '-'}</td>
                    <td style={s.td}>{job.country_of_final_destination || '-'}</td>
                    <td style={s.td}>{job.sb_no || '-'}</td>
                    <td style={s.td}>{safeDate(job.sb_no)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div style={s.footer}>
          <div>
            Showing {jobs.length} of {totalRecords} Records
          </div>
          <div>
            <button 
              style={page === 1 ? {...s.btnPage, ...s.btnDisabled} : s.btnPage}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Prev
            </button>
            <span style={{margin: "0 10px"}}>
              Page {page} of {totalPages || 1}
            </span>
            <button 
              style={page >= totalPages ? {...s.btnPage, ...s.btnDisabled} : s.btnPage}
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ExportJobsTable;
