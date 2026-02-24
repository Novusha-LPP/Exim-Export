import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { formatDate } from "../../../utils/dateUtils";
import useExportExcelUpload from "../../../customHooks/useExportExcelUpload";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { Dialog, DialogTitle, DialogContent, IconButton, Snackbar, Alert } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddExJobs from "./AddExJobs";
import { useNavigate } from "react-router-dom";

// ─── Theme Colors (matches Job Tab: white bg, blue accents) ───────────────────
const THEME = {
  blue:      "#2563eb",
  blueSoft:  "#eff6ff",
  blueHover: "#1d4ed8",
  amber:     "#f59e0b",
  amberSoft: "#fffbeb",
  green:     "#10b981",
  greenSoft: "#ecfdf5",
  red:       "#ef4444",
  redSoft:   "#fef2f2",
  text:      "#111827",
  textMuted: "#6b7280",
  border:    "#e5e7eb",
  bg:        "#f3f4f6",
  white:     "#ffffff",
};

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── Custom Tooltip for Bar Chart ─────────────────────────────────────────────
const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: `1px solid ${THEME.border}`,
      borderRadius: 6, padding: "8px 12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12,
    }}>
      <div style={{ fontWeight: 700, color: THEME.text, marginBottom: 4 }}>{label}</div>
      <div style={{ color: THEME.blue }}>{payload[0].value} Jobs</div>
    </div>
  );
};

// ─── Custom Tooltip for Pie Chart ─────────────────────────────────────────────
const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{
      background: "#fff", border: `1px solid ${THEME.border}`,
      borderRadius: 6, padding: "8px 12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12,
    }}>
      <div style={{ fontWeight: 700, color: THEME.text }}>{d.name}</div>
      <div style={{ color: d.payload.color }}>{d.value} jobs ({d.payload.pct}%)</div>
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, color, softColor, icon }) => (
  <div style={{
    background: THEME.white,
    borderRadius: 8,
    padding: "18px 20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    border: `1px solid ${THEME.border}`,
    borderTop: `3px solid ${color}`,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 0,
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {title}
      </span>
      <span style={{
        width: 32, height: 32, borderRadius: 8,
        background: softColor, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16,
      }}>
        {icon}
      </span>
    </div>
    <div style={{ fontSize: 34, fontWeight: 800, color, lineHeight: 1 }}>
      {value?.toLocaleString?.() ?? value}
    </div>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────
const ExportDashboard = () => {
  const [exporters, setExporters]   = useState([]);
  const [stats, setStats]           = useState({ total: 0, pending: 0, completed: 0, cancelled: 0 });
  const [monthlyData, setMonthlyData] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const {
    handleFileUpload,
    snackbar,
    loading: uploadLoading,
    error: uploadError,
    setError: setUploadError,
    progress,
    uploadStats,
  } = useExportExcelUpload(inputRef, () => {
    setRefreshTrigger((p) => p + 1);
    setLastUpdated(new Date());
  });

  const [filters, setFilters] = useState({
    year: "", movementType: "", branch: "", exporter: "", status: "",
  });

  // Fetch exporters list
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_STRING}/exporter-list`)
      .then((res) => { if (res.data.success) setExporters(res.data.data || []); })
      .catch(console.error);
  }, []);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_STRING}/dashboard-stats`, {
          params: {
            year: filters.year === "all" ? "" : filters.year,
            consignmentType: filters.movementType,
            branch: filters.branch,
            exporter: filters.exporter,
          },
        });
        if (res.data.success) {
          const { total, pending, completed, cancelled, monthlyTrend } = res.data.data;
          setStats({ total, pending, completed, cancelled });

          // Build 12-month array. If no year filter, sum same months across years.
          const trend = Array(12).fill(0).map((_, i) => {
            const targetMonth = i + 1;
            let count = 0;
            
            monthlyTrend.forEach((m) => {
              const mMonth = typeof m._id === "object" ? m._id.month : m._id;
              if (mMonth === targetMonth) {
                count += (m.count || 0);
              }
            });

            return { name: MONTH_NAMES[i], jobs: count };
          });
          setMonthlyData(trend);
        }
      } catch (err) {
        console.error(err);
      }
    };
    const timer = setTimeout(fetchStats, 300);
    return () => clearTimeout(timer);
  }, [filters, refreshTrigger]);

  // Fetch recent jobs
  useEffect(() => {
    const fetchRecentJobs = async () => {
      setLoadingJobs(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_STRING}/exports`, {
          params: {
            status: filters.status || "all",
            search: searchQuery,
            year: filters.year === "all" ? "" : filters.year,
            consignmentType: filters.movementType,
            branch: filters.branch,
            exporter: filters.exporter,
            limit: 5, // Limit to recent 5
            sortKey: "createdAt",
            sortOrder: "desc"
          },
        });
        if (res.data.success) {
          setRecentJobs(res.data.data.jobs || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingJobs(false);
      }
    };
    const timer = setTimeout(fetchRecentJobs, 300);
    return () => clearTimeout(timer);
  }, [filters, searchQuery, refreshTrigger]);

  const handleFilter = (key, val) =>
    setFilters((prev) => ({ ...prev, [key]: val }));

  // Pie data — values directly from server (fixed bugs TC_EXP_002, TC_DASH_002)
  const rawPieData = [
    { name: "Active / Pending", value: stats.pending,   color: THEME.amber },
    { name: "Completed",        value: stats.completed, color: THEME.green },
    { name: "Cancelled",        value: stats.cancelled, color: THEME.red   },
  ].filter((d) => d.value > 0);

  const totalPieValue = rawPieData.reduce((acc, cur) => acc + cur.value, 0) || 1;
  const pieData = rawPieData.map((d) => ({
    ...d, pct: ((d.value / totalPieValue) * 100).toFixed(1),
  }));

  // Search-filtered monthly data (TC_DASH_003 suggestion — filter months by label)
  const filteredMonthlyData = searchQuery
    ? monthlyData.filter((m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : monthlyData;

  const inProgress = stats.total - stats.pending - stats.completed - stats.cancelled;

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
      backgroundColor: THEME.bg,
      padding: "16px 20px",
      minHeight: "100vh",
      color: THEME.text,
      fontSize: 13,
    }}>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .dash-btn:hover { background-color: ${THEME.blueHover} !important; }
        .dash-input:focus { border-color: ${THEME.blue} !important; outline: none !important; box-shadow: 0 0 0 2px rgba(37,99,235,0.15) !important; }
        .dash-select:focus { border-color: ${THEME.blue} !important; outline: none !important; }
        .stat-card-hover:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important; transition: all 0.2s; }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        background: THEME.white,
        borderRadius: 8,
        padding: "14px 20px",
        marginBottom: 16,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        border: `1px solid ${THEME.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: THEME.text, margin: 0 }}>
            Export Overview
          </h1>
          <p style={{ fontSize: 11, color: THEME.textMuted, margin: "2px 0 0" }}>
            Real-time summary of all export jobs
          </p>
        </div>

        {/* Right side: Upload button + timestamp — fixed alignment (TC_EXP_011, TC_EXP_013) */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {/* Upload Feedback */}
          {uploadLoading && progress.total > 0 && (
            <span style={{ fontSize: 11, color: THEME.textMuted }}>
              {progress.current}/{progress.total} chunks
            </span>
          )}
          {snackbar && uploadStats && (
            <span style={{ fontSize: 11, color: THEME.green, fontWeight: 600, background: THEME.greenSoft, padding: "3px 8px", borderRadius: 4 }}>
              ✅ {uploadStats.count} records in {uploadStats.timeTaken}s
            </span>
          )}

          {/* Unified Action Box (TC_EXP_011, TC_EXP_013) */}
          <div style={{
            display: "flex", alignItems: "center", gap: 0,
            background: THEME.white, borderRadius: 8,
            border: `1px solid ${THEME.border}`,
            overflow: "hidden",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}>
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "flex-end",
              padding: "6px 14px",
              fontSize: 10, color: THEME.textMuted, lineHeight: 1.2,
              backgroundColor: "#f9fafb",
              borderRight: `1px solid ${THEME.border}`,
            }}>
              <span style={{ fontWeight: 700, color: THEME.text, textTransform: "uppercase", fontSize: 8, letterSpacing: "0.02em" }}>Last Updated</span>
              <span style={{ fontWeight: 600, color: THEME.blue }}>{formatDate(lastUpdated)} {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
            </div>
            
            <button
              id="dashboard-upload-btn"
              className="dash-btn"
              onClick={() => !uploadLoading && inputRef.current?.click()}
              disabled={uploadLoading}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 16px",
                backgroundColor: uploadLoading ? "#f3f4f6" : THEME.white,
                color: uploadLoading ? THEME.textMuted : THEME.blue,
                border: "none",
                cursor: uploadLoading ? "not-allowed" : "pointer",
                fontSize: 12, fontWeight: 700,
                transition: "all 0.15s",
              }}
            >
              {uploadLoading ? (
                <>
                  <span style={{
                    width: 12, height: 12, border: "2px solid #3b82f6",
                    borderTopColor: "transparent", borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.8s linear infinite",
                  }} />
                  <span style={{ color: THEME.textMuted }}>Uploading...</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 16 }}>📊</span> 
                  <span>Import Excel</span>
                </>
              )}
            </button>
          </div>
            <input
              type="file"
              ref={inputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.csv,.xml,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/xml,application/xml"
              style={{ display: "none" }}
            />
          </div>
        </div>

      {/* ── Filters Row ── */}
      <div style={{
        background: THEME.white,
        borderRadius: 8,
        padding: "14px 20px",
        marginBottom: 16,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        border: `1px solid ${THEME.border}`,
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        alignItems: "flex-end",
      }}>

         <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "2 1 200px", minWidth: 180 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: THEME.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Search
          </label>
          <input
            id="dashboard-search"
            className="dash-input"
            type="text"
            placeholder="Job No, Exporter…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              height: 34, padding: "0 10px", fontSize: 12,
              border: `1px solid ${THEME.border}`, borderRadius: 5,
              background: "#fff", color: THEME.text,
              transition: "border-color 0.15s",
            }}
          />
        </div>

        {[
    
          {
            key: "year", label: "Year",
            options: [
              { value: "", label: "All Time" },
              { value: "24-25", label: "2024-2025" },
              { value: "25-26", label: "2025-2026" },
              { value: "26-27", label: "2026-2027" },
            ],
          },
          {
            key: "movementType", label: "Type",
            options: [
              { value: "", label: "All Types" },
              { value: "FCL", label: "FCL" },
              { value: "LCL", label: "LCL" },
              { value: "AIR", label: "AIR" },
            ],
          },
          {
            key: "branch", label: "Branch",
            options: [
              { value: "", label: "All Branches" },
              { value: "BRD", label: "Baroda" },
              { value: "GIM", label: "Gandhidham" },
              { value: "HAZ", label: "Hazira" },
              { value: "AMD", label: "Ahmedabad" },
              { value: "COK", label: "Cochin" },
            ],
          },
        ].map(({ key, label, options }) => (
          <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 140px", minWidth: 130 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: THEME.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {label}
            </label>
            <select
              id={`dashboard-filter-${key}`}
              className="dash-select"
              value={filters[key]}
              onChange={(e) => handleFilter(key, e.target.value)}
              style={{
                height: 34, padding: "0 8px", fontSize: 12,
                border: `1px solid ${THEME.border}`, borderRadius: 5,
                background: "#fff", color: THEME.text,
                cursor: "pointer",
              }}
            >
              {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        ))}

        {/* Exporter dropdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "2 1 180px", minWidth: 160 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: THEME.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Exporter
          </label>
          <select
            id="dashboard-filter-exporter"
            className="dash-select"
            value={filters.exporter}
            onChange={(e) => handleFilter("exporter", e.target.value)}
            style={{
              height: 34, padding: "0 8px", fontSize: 12,
              border: `1px solid ${THEME.border}`, borderRadius: 5,
              background: "#fff", color: THEME.text,
              cursor: "pointer",
            }}
          >
            <option value="">All Exporters</option>
            {exporters.map((exp, i) => <option key={i} value={exp}>{exp}</option>)}
          </select>
        </div>

        {/* Clear Filters */}
        <button
          id="dashboard-clear-filters"
          onClick={() => { setFilters({ year: "", movementType: "", branch: "", exporter: "" }); setSearchQuery(""); }}
          style={{
            height: 34, padding: "0 12px", fontSize: 11, fontWeight: 600,
            border: `1px solid ${THEME.border}`, borderRadius: 5,
            background: "#fff", color: THEME.textMuted, cursor: "pointer",
            whiteSpace: "nowrap", alignSelf: "flex-end",
          }}
        >
          ✕ Clear
        </button>
      </div>

      {/* ── Quick Statistics Cards — 4 on one row (TC_DASH_002 fix) ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 14,
        marginBottom: 16,
      }}>
        <div className="stat-card-hover" style={{ transition: "all 0.2s" }}>
          <StatCard
            title="Total Jobs"
            value={stats.total}
            color={THEME.blue}
            softColor={THEME.blueSoft}
            icon="📋"
          />
        </div>
        <div className="stat-card-hover" style={{ transition: "all 0.2s" }}>
          <StatCard
            title="Active / Pending"
            value={stats.pending}
            color={THEME.amber}
            softColor={THEME.amberSoft}
            icon="⏳"
          />
        </div>
        <div className="stat-card-hover" style={{ transition: "all 0.2s" }}>
          <StatCard
            title="Completed"
            value={stats.completed}
            color={THEME.green}
            softColor={THEME.greenSoft}
            icon="✅"
          />
        </div>
        <div className="stat-card-hover" style={{ transition: "all 0.2s" }}>
          <StatCard
            title="Cancelled"
            value={stats.cancelled}
            color={THEME.red}
            softColor={THEME.redSoft}
            icon="❌"
          />
        </div>
      </div>

      {/* ── Charts Row ── (TC_EXP_014 fix: even spacing) */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.6fr 1fr",
        gap: 14,
      }}>

        {/* Monthly Bar Chart (TC_EXP_006 fix: shows all 12 months) */}
        <div style={{
          background: THEME.white,
          borderRadius: 8,
          padding: "20px 20px 16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          border: `1px solid ${THEME.border}`,
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: THEME.text, margin: 0 }}>Monthly Job Volume</h3>
              <p style={{ fontSize: 11, color: THEME.textMuted, margin: "3px 0 0" }}>All 12 months of the year</p>
            </div>
            <span style={{
              fontSize: 11, backgroundColor: THEME.blueSoft, color: THEME.blue,
              padding: "3px 10px", borderRadius: 20, fontWeight: 600,
            }}>
              Total: {monthlyData.reduce((a, m) => a + m.jobs, 0)}
            </span>
          </div>
          <div style={{ height: 280, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={THEME.blue} stopOpacity={0.1}/>
                    <stop offset="95%" stopColor={THEME.blue} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={THEME.border} />
                <XAxis
                  dataKey="name"
                  axisLine={false} tickLine={false}
                  tick={{ fill: THEME.textMuted, fontSize: 11, fontWeight: 500 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false} tickLine={false}
                  tick={{ fill: THEME.textMuted, fontSize: 11, fontWeight: 500 }}
                  allowDecimals={false}
                />
                <Tooltip 
                  content={<BarTooltip />} 
                  cursor={{ stroke: THEME.blue, strokeWidth: 1, strokeDasharray: "4 4" }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="jobs" 
                  stroke={THEME.blue} 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorJobs)"
                  activeDot={{ r: 6, strokeWidth: 0, fill: THEME.blue }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Donut Chart (TC_EXP_005 fix: values match stats cards) */}
        <div style={{
          background: THEME.white,
          borderRadius: 8,
          padding: "20px 20px 16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          border: `1px solid ${THEME.border}`,
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: THEME.text, margin: 0 }}>Job Status Distribution</h3>
            <p style={{ fontSize: 11, color: THEME.textMuted, margin: "3px 0 0" }}>
              {totalPieValue} total classified jobs
            </p>
          </div>

          {pieData.length > 0 ? (
            <>
              <div style={{ height: 200, width: "100%" }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={82}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend rows */}
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                {pieData.map((item, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "6px 10px", borderRadius: 6,
                    backgroundColor: item.color + "12", // ~7% opacity
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: item.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: THEME.textMuted }}>{item.name}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        backgroundColor: item.color + "20",
                        color: item.color,
                        padding: "1px 6px", borderRadius: 10,
                      }}>
                        {item.pct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: THEME.textMuted }}>
              No job data available
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Jobs List (TC_DASH_009) ── */}
      <div style={{
        marginTop: 16,
        background: THEME.white,
        borderRadius: 8,
        padding: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        border: `1px solid ${THEME.border}`,
      }}>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: THEME.text, margin: 0 }}>Recent Jobs</h3>
          <p style={{ fontSize: 11, color: THEME.textMuted, margin: "3px 0 0" }}>Latest 5 jobs matching criteria</p>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: THEME.bg, borderBottom: `2px solid ${THEME.border}` }}>
                <th style={{ padding: "10px", textAlign: "left", color: THEME.textMuted, fontWeight: 700 }}>Job</th>
                <th style={{ padding: "10px", textAlign: "left", color: THEME.textMuted, fontWeight: 700 }}>Status</th>
                <th style={{ padding: "10px", textAlign: "left", color: THEME.textMuted, fontWeight: 700 }}>Date</th>
                <th style={{ padding: "10px", textAlign: "left", color: THEME.textMuted, fontWeight: 700 }}>Exporter</th>
                <th style={{ padding: "10px", textAlign: "right", color: THEME.textMuted, fontWeight: 700 }}>Value</th>
                <th style={{ padding: "10px", textAlign: "center", color: THEME.textMuted, fontWeight: 700 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingJobs ? (
                <tr>
                  <td colSpan="6" style={{ padding: "20px", textAlign: "center", color: THEME.textMuted }}>Loading...</td>
                </tr>
              ) : recentJobs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: "20px", textAlign: "center", color: THEME.textMuted }}>No recent jobs found.</td>
                </tr>
              ) : (
                recentJobs.map((job) => (
                  <tr key={job._id} style={{ borderBottom: `1px solid ${THEME.border}`, transition: "background 0.2s" }} className="dash-row-hover">
                    <td style={{ padding: "12px 10px", fontWeight: 600, color: THEME.blue }}>{job.job_no}</td>
                    <td style={{ padding: "12px 10px" }}>
                      <span style={{
                        padding: "3px 8px", borderRadius: 12, fontSize: 10, fontWeight: 600,
                        background: (job.status || "Pending").toLowerCase() === "completed" ? THEME.greenSoft :
                                    (job.status || "Pending").toLowerCase() === "cancelled" ? THEME.redSoft : THEME.amberSoft,
                        color: (job.status || "Pending").toLowerCase() === "completed" ? THEME.green :
                               (job.status || "Pending").toLowerCase() === "cancelled" ? THEME.red : THEME.amber,
                      }}>
                        {job.status || "Pending"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 10px", color: THEME.text }}>{formatDate(job.createdAt)}</td>
                    <td style={{ padding: "12px 10px", color: THEME.text, maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{job.exporter}</td>
                    <td style={{ padding: "12px 10px", color: THEME.text, textAlign: "right", fontWeight: 500 }}>{job.invoice_value ? `${job.currency || ''} ${job.invoice_value}` : "-"}</td>
                    <td style={{ padding: "12px 10px", textAlign: "center" }}>
                      <button
                        onClick={() => navigate(`/export-dsr/job/${encodeURIComponent(job.job_no)}`)}
                        style={{
                          padding: "4px 12px", background: THEME.blueSoft, color: THEME.blue,
                          border: "none", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: 600,
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <style>{`.dash-row-hover:hover { background-color: #f9fafb; }`}</style>
        </div>
      </div>

      {/* Manual Job Creation Dialog */}
      <Dialog
        open={isAddJobOpen}
        onClose={() => setIsAddJobOpen(false)}
        maxWidth="lg"
        fullWidth
        sx={{ "& .MuiDialog-paper": { borderRadius: "10px" } }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f3f4f6" }}>
          <span style={{ fontWeight: 700, fontSize: "16px" }}>Manual Job Creation</span>
          <IconButton aria-label="close" onClick={() => setIsAddJobOpen(false)} sx={{ color: (theme) => theme.palette.grey[500] }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <AddExJobs onClose={() => setIsAddJobOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Global Snackbars for Dashboard */}
      <Snackbar
        open={!!uploadError}
        autoHideDuration={6000}
        onClose={() => setUploadError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setUploadError(null)} severity="error" sx={{ width: "100%", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          {uploadError}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default ExportDashboard;
