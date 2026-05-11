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
import { Dialog, DialogTitle, DialogContent, IconButton, Snackbar, Alert, Tooltip as MuiTooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import RefreshIcon from "@mui/icons-material/Refresh";
import BarChartIcon from "@mui/icons-material/BarChart";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import AddExJobs from "./AddExJobs";
import { useNavigate } from "react-router-dom";

// ─── Theme Colors (matches Job Tab: white bg, blue accents) ───────────────────
const THEME = {
  blue: "#2563eb",
  blueSoft: "#eff6ff",
  blueHover: "#1d4ed8",
  amber: "#f59e0b",
  amberSoft: "#fffbeb",
  green: "#10b981",
  greenSoft: "#ecfdf5",
  red: "#ef4444",
  redSoft: "#fef2f2",
  text: "#111827",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  bg: "#fafaffff",
  white: "#ffffff",
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
    borderRadius: 12,
    padding: "14px 16px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
    border: `1px solid ${THEME.border}`,
    display: "flex",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
    flex: 1,
  }}>
    <div style={{
      width: 40, height: 40, borderRadius: 10,
      background: softColor, display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 20, flexShrink: 0,
    }}>
      {icon}
    </div>
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: THEME.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
        {title}
      </span>
      <div style={{ fontSize: 24, fontWeight: 800, color: THEME.text, lineHeight: 1.1 }}>
        {value?.toLocaleString?.() ?? value}
      </div>
    </div>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────
const ExportDashboard = () => {
  const [exporters, setExporters] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, cancelled: 0 });
  const [monthlyData, setMonthlyData] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [chartType, setChartType] = useState("area"); // "area" or "bar"

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
    year: "26-27", movementType: "", branch: "", exporter: "", status: "",
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

          // Build 12-month array following Financial Year (Apr to Mar)
          const FY_MONTH_ORDER = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
          const trend = FY_MONTH_ORDER.map((targetMonth) => {
            let count = 0;

            monthlyTrend.forEach((m) => {
              const mMonth = typeof m._id === "object" ? m._id.month : m._id;
              if (mMonth === targetMonth) {
                count += (m.count || 0);
              }
            });

            return { name: MONTH_NAMES[targetMonth - 1], jobs: count };
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
    { name: "Active / Pending", value: stats.pending, color: THEME.amber },
    { name: "Completed", value: stats.completed, color: THEME.green },
    { name: "Cancelled", value: stats.cancelled, color: THEME.red },
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
        borderRadius: 12,
        padding: "12px 20px",
        marginBottom: 16,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        border: `1px solid ${THEME.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: THEME.text, margin: 0 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 11, color: THEME.textMuted, margin: "1px 0 0" }}>
            Welcome back, Export Team
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right", fontSize: 10, color: THEME.textMuted }}>
            <span style={{ fontWeight: 700, color: THEME.text, textTransform: "uppercase", fontSize: 8 }}>Last Updated</span>
            <div style={{ fontWeight: 600, color: THEME.blue }}>{formatDate(lastUpdated)} {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}</div>
          </div>

          <button
            className="dash-btn"
            onClick={() => setRefreshTrigger(p => p + 1)}
            style={{
              padding: "8px", borderRadius: 8, border: `1px solid ${THEME.border}`,
              background: THEME.white, cursor: "pointer", display: "flex"
            }}
          >
            <RefreshIcon sx={{ fontSize: 18, color: THEME.textMuted }} />
          </button>

          <button
            className="dash-btn"
            onClick={() => navigate("/export-analytics")}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 14px",
              backgroundColor: "#f8fafc",
              color: THEME.blue,
              border: `1px solid ${THEME.blue}`,
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 12, fontWeight: 700,
              transition: "all 0.15s",
            }}
          >
            Operational Analytics
          </button>

          <button
            id="dashboard-upload-btn"
            className="dash-btn"
            onClick={() => !uploadLoading && inputRef.current?.click()}
            disabled={uploadLoading}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 14px",
              backgroundColor: uploadLoading ? "#f3f4f6" : THEME.blue,
              color: THEME.white,
              border: "none",
              borderRadius: 8,
              cursor: uploadLoading ? "not-allowed" : "pointer",
              fontSize: 12, fontWeight: 700,
              transition: "all 0.15s",
            }}
          >
            {uploadLoading ? "..." : "Import Jobs"}
          </button>

          <input
            type="file"
            ref={inputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls,.csv,.xml"
            style={{ display: "none" }}
          />
        </div>
      </div>

      {/* ── Filters Row ── */}
      <div style={{
        background: THEME.white,
        borderRadius: 12,
        padding: "10px 20px",
        marginBottom: 16,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        border: `1px solid ${THEME.border}`,
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center",
      }}>

        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: "2 1 200px", minWidth: 150 }}>
          <label style={{ fontSize: 9, fontWeight: 700, color: THEME.textMuted, textTransform: "uppercase" }}>
            Search
          </label>
          <input
            id="dashboard-search"
            className="dash-input"
            type="text"
            placeholder="Filter chart/Jobs…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              height: 30, padding: "0 10px", fontSize: 11,
              border: `1px solid ${THEME.border}`, borderRadius: 6,
              background: "#f9fafb", color: THEME.text,
            }}
          />
        </div>

        {[
          {
            key: "year", label: "Year",
            options: [
              { value: "", label: "All Time" },
              { value: "26-27", label: "26-27" },
              { value: "25-26", label: "25-26" },
              { value: "24-25", label: "24-25" },
              { value: "23-24", label: "23-24" },
              { value: "22-23", label: "22-23" },
              { value: "21-22", label: "21-22" },
            ],
          },
          {
            key: "movementType", label: "Type",
            options: [
              { value: "", label: "All" },
              { value: "FCL", label: "FCL" },
              { value: "LCL", label: "LCL" },
              { value: "AIR", label: "AIR" },
            ],
          },
          {
            key: "branch", label: "Branch",
            options: [
              { value: "", label: "All" },
              { value: "BRD", label: "Baroda" },
              { value: "GIM", label: "Gandhidham" },
              { value: "HAZ", label: "Hazira" },
              { value: "AMD", label: "Ahmedabad" },
              { value: "COK", label: "Cochin" },
            ],
          },
        ].map(({ key, label, options }) => (
          <div key={key} style={{ display: "flex", flexDirection: "column", gap: 2, flex: "1 1 100px", minWidth: 80 }}>
            <label style={{ fontSize: 9, fontWeight: 700, color: THEME.textMuted, textTransform: "uppercase" }}>
              {label}
            </label>
            <select
              id={`dashboard-filter-${key}`}
              className="dash-select"
              value={filters[key]}
              onChange={(e) => handleFilter(key, e.target.value)}
              style={{
                height: 30, padding: "0 8px", fontSize: 11,
                border: `1px solid ${THEME.border}`, borderRadius: 6,
                background: "#f9fafb", color: THEME.text,
                cursor: "pointer",
              }}
            >
              {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        ))}

        {/* Exporter dropdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: "3 1 200px", minWidth: 160 }}>
          <label style={{ fontSize: 9, fontWeight: 700, color: THEME.textMuted, textTransform: "uppercase" }}>
            Exporter
          </label>
          <select
            id="dashboard-filter-exporter"
            className="dash-select"
            value={filters.exporter}
            onChange={(e) => handleFilter("exporter", e.target.value)}
            style={{
              height: 30, padding: "0 8px", fontSize: 11,
              border: `1px solid ${THEME.border}`, borderRadius: 6,
              background: "#f9fafb", color: THEME.text,
              cursor: "pointer",
            }}
          >
            <option value="">All Exporters</option>
            {exporters.map((exp, i) => <option key={i} value={exp}>{exp}</option>)}
          </select>
        </div>

        {/* Clear Filters Icon */}
        <MuiTooltip title="Clear Filters">
          <IconButton
            onClick={() => { setFilters({ year: "26-27", movementType: "", branch: "", exporter: "" }); setSearchQuery(""); }}
            sx={{
              mt: 2, border: `1px solid ${THEME.border}`, borderRadius: 2,
              backgroundColor: "#fff", transition: "all 0.2s",
              "&:hover": { backgroundColor: "#fee2e2", color: THEME.red }
            }}
          >
            <FilterAltOffIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </MuiTooltip>
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
          borderRadius: 12,
          padding: "20px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          border: `1px solid ${THEME.border}`,
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: THEME.text, margin: 0 }}>Monthly Volume</h3>
              <p style={{ fontSize: 11, color: THEME.textMuted, margin: "2px 0 0" }}>Financial Year {filters.year || 'Trend'}</p>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {/* Chart Switch */}
              <div style={{
                display: "flex", background: "#f1f5f9", padding: "3px", borderRadius: 8, border: "1px solid #e2e8f0"
              }}>
                <button
                  onClick={() => setChartType("area")}
                  style={{
                    padding: "4px 8px", border: "none", borderRadius: 6, cursor: "pointer",
                    background: chartType === "area" ? "#fff" : "transparent",
                    color: chartType === "area" ? THEME.blue : THEME.textMuted,
                    boxShadow: chartType === "area" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                    display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700
                  }}
                >
                  <ShowChartIcon sx={{ fontSize: 14 }} /> Area
                </button>
                <button
                  onClick={() => setChartType("bar")}
                  style={{
                    padding: "4px 8px", border: "none", borderRadius: 6, cursor: "pointer",
                    background: chartType === "bar" ? "#fff" : "transparent",
                    color: chartType === "bar" ? THEME.blue : THEME.textMuted,
                    boxShadow: chartType === "bar" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                    display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700
                  }}
                >
                  <BarChartIcon sx={{ fontSize: 14 }} /> Pillar
                </button>
              </div>

              <span style={{
                fontSize: 10, backgroundColor: THEME.blueSoft, color: THEME.blue,
                padding: "3px 10px", borderRadius: 20, fontWeight: 700,
              }}>
                Total: {monthlyData.reduce((a, m) => a + m.jobs, 0)}
              </span>
            </div>
          </div>

          <div style={{ height: 280, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "area" ? (
                <AreaChart data={filteredMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME.blue} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={THEME.blue} stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false} tickLine={false}
                    tick={{ fill: THEME.textMuted, fontSize: 10, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false} tickLine={false}
                    tick={{ fill: THEME.textMuted, fontSize: 10, fontWeight: 500 }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ stroke: THEME.blue, strokeWidth: 1, strokeDasharray: "4 4" }} />
                  <Area
                    type="natural"
                    dataKey="jobs"
                    stroke={THEME.blue}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorJobs)"
                    activeDot={{ r: 6, strokeWidth: 0, fill: THEME.blue }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={filteredMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false} tickLine={false}
                    tick={{ fill: THEME.textMuted, fontSize: 10, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false} tickLine={false}
                    tick={{ fill: THEME.textMuted, fontSize: 10, fontWeight: 500 }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.4 }} />
                  <Bar
                    dataKey="jobs"
                    fill={THEME.blue}
                    radius={[6, 6, 0, 0]}
                    barSize={24}
                  >
                    {filteredMonthlyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={THEME.blue} fillOpacity={0.8 + (index % 2 === 0 ? 0.2 : 0)} />
                    ))}
                  </Bar>
                </BarChart>
              )}
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
                    <td style={{ padding: "12px 10px", color: THEME.text }}>{formatDate(job.job_date || job.createdAt)}</td>
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
