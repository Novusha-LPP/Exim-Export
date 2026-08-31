import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import BarChartIcon from "@mui/icons-material/BarChart";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import { useNavigate } from "react-router-dom";

// ─── Theme Colors (Matches Enterprise Design System) ─────────────────────────
const THEME = {
  blue: "#2563eb",
  blueSoft: "#eff6ff",
  blueDark: "#1e3a8a",
  green: "#10b981",
  greenSoft: "#ecfdf5",
  purple: "#8b5cf6",
  purpleSoft: "#f5f3ff",
  amber: "#f59e0b",
  amberSoft: "#fffbeb",
  red: "#ef4444",
  redSoft: "#fef2f2",
  text: "#0f172a",
  textMuted: "#64748b",
  border: "#e5e7eb",
  bg: "#fafaff",
  white: "#ffffff",
};

const MODE_COLORS = {
  "Import-Sea": "#2563eb",
  "Export-Sea": "#059669",
  "Import-Air": "#7c3aed",
  "Export-Air": "#d97706",
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FY_MONTH_ORDER = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]; // Apr to Mar

// ─── Custom Tooltip for Recharts ──────────────────────────────────────────────
const CustomChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${THEME.border}`,
      borderRadius: 6,
      padding: "8px 12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      fontSize: 12,
    }}>
      <div style={{ fontWeight: 700, color: THEME.text, marginBottom: 4 }}>{label}</div>
      {payload.map((entry, index) => (
        <div key={index} style={{ color: entry.color || THEME.blue, fontWeight: 600 }}>
          {entry.name}: {entry.value} jobs
        </div>
      ))}
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${THEME.border}`,
      borderRadius: 6,
      padding: "8px 12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      fontSize: 12,
    }}>
      <div style={{ fontWeight: 700, color: THEME.text }}>{d.name}</div>
      <div style={{ color: d.payload.color, fontWeight: 600 }}>
        {d.value} jobs ({d.payload.pct}%)
      </div>
    </div>
  );
};

// ─── Stat Card Component ──────────────────────────────────────────────────────
const StatCard = ({ title, value, color, softColor, icon, subtitle }) => (
  <div style={{
    background: THEME.white,
    borderRadius: 8,
    padding: "14px 16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    border: `1px solid ${THEME.border}`,
    display: "flex",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: "160px",
  }}>
    <div style={{
      width: 42,
      height: 42,
      borderRadius: 8,
      background: softColor,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 20,
      color: color,
      flexShrink: 0,
    }}>
      {icon}
    </div>
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: THEME.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
        {title}
      </span>
      <div style={{ fontSize: 22, fontWeight: 800, color: THEME.text, lineHeight: 1.1 }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {subtitle && (
        <span style={{ fontSize: 10, color: THEME.textMuted, marginTop: 2 }}>{subtitle}</span>
      )}
    </div>
  </div>
);

function FreightForwardingDashboard({ onSelectTab, onOpenCreate }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [enquiries, setEnquiries] = useState([]);
  const [serverCounts, setServerCounts] = useState({});
  const [chartType, setChartType] = useState("area");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [filters, setFilters] = useState({
    year: "26-27",
    shipment_type: "",
    search: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_STRING}/freight-enquiries`);
      if (res.data.success) {
        setEnquiries(res.data.data || []);
        if (res.data.counts) setServerCounts(res.data.counts);
      }
    } catch (err) {
      console.error("Error fetching freight enquiries for dashboard:", err);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return enquiries.filter((item) => {
      const matchShipment = !filters.shipment_type || item.shipment_type === filters.shipment_type;
      const needle = filters.search.trim().toUpperCase();
      const matchSearch =
        !needle ||
        [item.enquiry_no, item.success_no, item.rejected_no, item.organization_name, item.port_of_loading, item.port_of_destination]
          .filter(Boolean)
          .some((f) => String(f).toUpperCase().includes(needle));

      return matchShipment && matchSearch;
    });
  }, [enquiries, filters]);

  // Key KPI stats
  const stats = useMemo(() => {
    const total = filteredData.length;
    const open = filteredData.filter(e => e.status === "Open").length;
    const rejected = filteredData.filter(e => e.status === "Rejected").length;
    const completed = filteredData.filter(e => e.status === "Converted" || e.pipeline_status === "Completed").length;
    const pendingOps = total - (open + rejected + completed);

    return {
      total,
      open,
      pendingOps: pendingOps > 0 ? pendingOps : 0,
      completed,
      rejected,
    };
  }, [filteredData]);

  // Mode Distribution (Pie Chart Data)
  const modeData = useMemo(() => {
    const counts = {
      "Import-Sea": 0,
      "Export-Sea": 0,
      "Import-Air": 0,
      "Export-Air": 0,
    };

    filteredData.forEach(item => {
      if (counts[item.shipment_type] !== undefined) {
        counts[item.shipment_type]++;
      }
    });

    const total = filteredData.length || 1;
    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key],
      pct: ((counts[key] / total) * 100).toFixed(1),
      color: MODE_COLORS[key] || THEME.blue,
    })).filter(d => d.value > 0);
  }, [filteredData]);

  // Pipeline Stage Distribution (Bar Chart Data)
  const pipelineStageData = useMemo(() => {
    const stages = {
      "Enquiry": 0,
      "Pending": 0,
      "Draft BL": 0,
      "SOB": 0,
      "Billing": 0,
      "Completed": 0,
    };

    filteredData.forEach(item => {
      if (item.status === "Open") stages["Enquiry"]++;
      else if (item.status === "Rejected") { }
      else {
        const stage = item.pipeline_stage || "Pending";
        if (stages[stage] !== undefined) stages[stage]++;
        else stages["Pending"]++;
      }
    });

    return Object.keys(stages).map(stage => ({
      stage,
      jobs: stages[stage],
    }));
  }, [filteredData]);

  // Monthly Financial Year Volume Trend
  const monthlyTrendData = useMemo(() => {
    const monthCounts = {};
    FY_MONTH_ORDER.forEach(m => { monthCounts[m] = 0; });

    filteredData.forEach(item => {
      const dateStr = item.createdAt || item.enquiry_date;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const m = d.getMonth() + 1; // 1-12
          if (monthCounts[m] !== undefined) {
            monthCounts[m]++;
          }
        }
      }
    });

    return FY_MONTH_ORDER.map(m => ({
      month: MONTH_NAMES[m - 1],
      jobs: monthCounts[m],
    }));
  }, [filteredData]);

  // Recent 8 jobs
  const recentJobs = useMemo(() => {
    return [...filteredData].slice(0, 8);
  }, [filteredData]);

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "-";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr.split("-").reverse().join("/");
    return dateStr;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* ─── Top Control Toolbar ─── */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 10,
        backgroundColor: "#fff",
        padding: "8px 14px",
        borderRadius: 6,
        border: `1px solid ${THEME.border}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: THEME.text, margin: 0 }}>
            Freight Forwarding Analytics
          </h2>
          <span style={{ fontSize: 11, color: THEME.textMuted, fontWeight: 600 }}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Search Filter */}
          <input
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder="Search enquiries, org, port..."
            style={{
              height: 32,
              padding: "0 10px",
              fontSize: 12,
              border: filters.search ? `1px solid ${THEME.blue}` : `1px solid ${THEME.border}`,
              borderRadius: 4,
              outline: "none",
              backgroundColor: filters.search ? THEME.blueSoft : "#fff",
              color: filters.search ? THEME.blue : THEME.text,
              width: 220,
            }}
          />

          {/* Shipment Type Dropdown */}
          <select
            value={filters.shipment_type}
            onChange={(e) => setFilters(prev => ({ ...prev, shipment_type: e.target.value }))}
            style={{
              height: 32,
              padding: "0 10px",
              fontSize: 12,
              border: filters.shipment_type ? `1px solid ${THEME.blue}` : `1px solid ${THEME.border}`,
              borderRadius: 4,
              backgroundColor: filters.shipment_type ? THEME.blueSoft : "#fff",
              color: filters.shipment_type ? THEME.blue : THEME.text,
              fontWeight: 600,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="">All Shipment Modes</option>
            <option value="Import-Sea">Import - Sea</option>
            <option value="Export-Sea">Export - Sea</option>
            <option value="Import-Air">Import - Air</option>
            <option value="Export-Air">Export - Air</option>
          </select>

          {/* Reset Button */}
          {(filters.search || filters.shipment_type) && (
            <button
              onClick={() => setFilters({ year: "26-27", shipment_type: "", search: "" })}
              style={{
                height: 32,
                padding: "0 10px",
                fontSize: 12,
                fontWeight: 600,
                backgroundColor: "#fef2f2",
                color: "#ef4444",
                border: "1px solid #fca5a5",
                borderRadius: 4,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <FilterAltOffIcon style={{ fontSize: 14 }} /> Clear
            </button>
          )}

          <Tooltip title="Refresh Dashboard Data">
            <IconButton size="small" onClick={fetchData} sx={{ border: `1px solid ${THEME.border}` }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* ─── KPI Stat Cards ─── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <StatCard
          title="Total Volume"
          value={stats.total}
          color={THEME.blue}
          softColor={THEME.blueSoft}
          icon="📦"
          subtitle="All Freight Enquiries"
        />
        <StatCard
          title="Open Enquiries"
          value={stats.open}
          color={THEME.amber}
          softColor={THEME.amberSoft}
          icon="📝"
          subtitle="Awaiting Rate Approvals"
        />
        <StatCard
          title="Active Operations"
          value={stats.pendingOps}
          color={THEME.purple}
          softColor={THEME.purpleSoft}
          icon="🚚"
          subtitle="Pending / Draft BL / Billing"
        />
        <StatCard
          title="Completed Jobs"
          value={stats.completed}
          color={THEME.green}
          softColor={THEME.greenSoft}
          icon="✅"
          subtitle="Successfully Closed"
        />
        <StatCard
          title="Rejected Enquiries"
          value={stats.rejected}
          color={THEME.red}
          softColor={THEME.redSoft}
          icon="❌"
          subtitle="Declined / Non-viable"
        />
      </div>

      {/* ─── Main Charts Grid (2 Columns) ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 12 }}>
        {/* Monthly Financial Year Trend */}
        <div style={{
          background: THEME.white,
          borderRadius: 8,
          padding: 16,
          border: `1px solid ${THEME.border}`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: THEME.text, margin: 0 }}>
                Financial Year Volume Trend (2026-27)
              </h3>
              <span style={{ fontSize: 11, color: THEME.textMuted }}>Monthly breakdown (Apr to Mar)</span>
            </div>
            <div style={{ display: "flex", gap: 4, background: "#f1f5f9", padding: 2, borderRadius: 6 }}>
              <IconButton
                size="small"
                onClick={() => setChartType("area")}
                sx={{
                  borderRadius: 4,
                  backgroundColor: chartType === "area" ? "#fff" : "transparent",
                  boxShadow: chartType === "area" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <ShowChartIcon fontSize="small" sx={{ color: chartType === "area" ? THEME.blue : THEME.textMuted }} />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setChartType("bar")}
                sx={{
                  borderRadius: 4,
                  backgroundColor: chartType === "bar" ? "#fff" : "transparent",
                  boxShadow: chartType === "bar" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <BarChartIcon fontSize="small" sx={{ color: chartType === "bar" ? THEME.blue : THEME.textMuted }} />
              </IconButton>
            </div>
          </div>

          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "area" ? (
                <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME.blue} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={THEME.blue} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: THEME.textMuted }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: THEME.textMuted }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RechartsTooltip content={<CustomChartTooltip />} />
                  <Area type="monotone" dataKey="jobs" name="Jobs" stroke={THEME.blue} strokeWidth={2.5} fillOpacity={1} fill="url(#colorJobs)" />
                </AreaChart>
              ) : (
                <BarChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: THEME.textMuted }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: THEME.textMuted }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RechartsTooltip content={<CustomChartTooltip />} />
                  <Bar dataKey="jobs" name="Jobs" fill={THEME.blue} radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mode Breakdown Pie Chart */}
        <div style={{
          background: THEME.white,
          borderRadius: 8,
          padding: 16,
          border: `1px solid ${THEME.border}`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          display: "flex",
          flexDirection: "column",
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: THEME.text, margin: "0 0 4px 0" }}>
            Shipment Modes Distribution
          </h3>
          <span style={{ fontSize: 11, color: THEME.textMuted, marginBottom: 12 }}>Sea vs Air breakdown</span>

          <div style={{ width: "100%", height: 180, position: "relative" }}>
            {modeData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {modeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: THEME.textMuted, fontSize: 12 }}>
                No mode data available
              </div>
            )}
          </div>

          {/* Custom Mode Legend */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {Object.keys(MODE_COLORS).map(modeKey => {
              const item = modeData.find(d => d.name === modeKey);
              const count = item ? item.value : 0;
              const pct = item ? item.pct : 0;

              return (
                <div key={modeKey} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: MODE_COLORS[modeKey] }} />
                    <span style={{ fontWeight: 600, color: THEME.text }}>{modeKey}</span>
                  </div>
                  <div style={{ fontWeight: 700, color: THEME.text }}>
                    {count} <span style={{ fontSize: 10, color: THEME.textMuted, fontWeight: 400 }}>({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Pipeline Stage Distribution & Recent Jobs Table ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 12 }}>
        {/* Pipeline Stage Bar Chart */}
        <div style={{
          background: THEME.white,
          borderRadius: 8,
          padding: 16,
          border: `1px solid ${THEME.border}`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: THEME.text, margin: "0 0 4px 0" }}>
            Pipeline Stage Breakdown
          </h3>
          <span style={{ fontSize: 11, color: THEME.textMuted, marginBottom: 12, display: "block" }}>Jobs per operational step</span>

          <div style={{ width: "100%", height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={pipelineStageData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: THEME.textMuted }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="stage" type="category" tick={{ fontSize: 11, fill: THEME.text, fontWeight: 600 }} axisLine={false} tickLine={false} width={65} />
                <RechartsTooltip content={<CustomChartTooltip />} />
                <Bar dataKey="jobs" name="Jobs" fill={THEME.purple} radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Freight Enquiries Table */}
        <div style={{
          background: THEME.white,
          borderRadius: 8,
          padding: 16,
          border: `1px solid ${THEME.border}`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: THEME.text, margin: 0 }}>
                Recent Freight Forwarding Enquiries
              </h3>
              <span style={{ fontSize: 11, color: THEME.textMuted }}>Latest 8 active jobs</span>
            </div>
            <button
              onClick={() => onSelectTab("Pending")}
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: THEME.blue,
                background: THEME.blueSoft,
                border: "none",
                padding: "4px 10px",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              View All Jobs →
            </button>
          </div>

          <div style={{ overflowX: "auto", flex: 1 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: `1px solid ${THEME.border}`, color: THEME.textMuted }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700 }}>JOB / ENQUIRY NO</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700 }}>SHIPPER / PARTY</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700 }}>MODE</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700 }}>ROUTING</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700 }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.length ? (
                  recentJobs.map((row, idx) => (
                    <tr
                      key={row._id || row.enquiry_no}
                      style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                      onClick={() => {
                        if (row.status === "Converted" || row.success_no) {
                          const jobNo = row.success_no || row.enquiry_no;
                          navigate(`/freight-forwarding/job/${encodeURIComponent(jobNo)}`);
                        }
                      }}
                    >
                      <td style={{ padding: "8px", fontWeight: 700, color: THEME.blue }}>
                        {row.success_no || row.enquiry_no}
                        <div style={{ fontSize: 10, color: THEME.textMuted, fontWeight: 400 }}>
                          {formatDateDisplay(row.enquiry_date || row.createdAt)}
                        </div>
                      </td>
                      <td style={{ padding: "8px", fontWeight: 600, color: THEME.text, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.shipper_name || row.organization_name || row.consignee_name || "-"}
                      </td>
                      <td style={{ padding: "8px" }}>
                        <span style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 3,
                          backgroundColor: row.shipment_type?.includes("Sea") ? "#eff6ff" : "#f5f3ff",
                          color: row.shipment_type?.includes("Sea") ? "#1d4ed8" : "#6d28d9",
                          border: `1px solid ${row.shipment_type?.includes("Sea") ? "#bfdbfe" : "#ddd6fe"}`,
                        }}>
                          {row.shipment_type || "SEA"}
                        </span>
                      </td>
                      <td style={{ padding: "8px", fontSize: 10, color: THEME.textMuted }}>
                        {row.port_of_loading || row.pol ? `${row.port_of_loading || row.pol} ➔ ${row.port_of_destination || row.pod || ""}` : "-"}
                      </td>
                      <td style={{ padding: "8px" }}>
                        <span style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 3,
                          backgroundColor: row.status === "Converted" ? "#ecfdf5" : (row.status === "Open" ? "#fffbeb" : "#f1f5f9"),
                          color: row.status === "Converted" ? "#047857" : (row.status === "Open" ? "#b45309" : "#475569"),
                        }}>
                          {row.status === "Converted" ? "Converted" : (row.status || "Pending")}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: "20px", textAlign: "center", color: THEME.textMuted }}>
                      No recent enquiries found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FreightForwardingDashboard;
