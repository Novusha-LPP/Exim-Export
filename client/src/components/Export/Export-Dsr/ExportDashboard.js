import React, { useState, useEffect } from "react";
import axios from "axios";
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
} from "recharts";

// --- Colors from Screenshot ---
const COLORS = {
  pending: "#f59e0b", // Orange
  completed: "#10b981", // Green
  cancelled: "#ef4444", // Red
  blue: "#3b82f6", // Blue for Total/Bars
  grid: "#e2e8f0", // Light Gray Grid
};

// --- Styles ---
const s = {
  wrapper: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    backgroundColor: "#dfdfdfff",
    padding: "20px",
    minHeight: "100vh",
    color: "#334155",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    backgroundColor: "#fff",
    padding: "15px 20px",
    borderRadius: "8px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
  title: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#0f172a",
    margin: 0,
  },
  lastUpdated: {
    fontSize: "12px",
    color: "#94a3b8",
  },
  // Filters
  filterBar: {
    display: "flex",
    gap: "15px",
    marginBottom: "20px",
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    flexWrap: "wrap",
  },
  filterGroup: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minWidth: "150px",
  },
  label: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#64748b",
    marginBottom: "8px",
    textTransform: "uppercase",
  },
  select: {
    height: "38px",
    padding: "0 10px",
    fontSize: "13px",
    border: "1px solid #cbd5e1",
    borderRadius: "4px",
    backgroundColor: "#fff",
    color: "#334155",
    width: "100%",
    outline: "none",
  },
  // Stats Cards
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "20px",
    marginBottom: "20px",
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: "8px",
    padding: "20px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    display: "flex",
    flexDirection: "column",
    borderLeftWidth: "4px",
    borderLeftStyle: "solid",
  },
  statTitle: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#94a3b8", // Muted gray
    textTransform: "uppercase",
    marginBottom: "10px",
  },
  statValue: {
    fontSize: "32px",
    fontWeight: "700",
    lineHeight: "1",
  },
  // Charts
  chartsRow: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr", // Left chart wider
    gap: "20px",
  },
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: "8px",
    padding: "24px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    minHeight: "400px",
    display: "flex",
    flexDirection: "column",
  },
  chartTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "30px",
  },
  // Custom Legend
  legendContainer: {
    marginTop: "auto",
    paddingTop: "20px",
  },
  legendItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    fontSize: "13px",
  },
  legendLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "#64748b",
  },
  colorBox: {
    width: "12px",
    height: "12px",
    borderRadius: "3px",
  },
  legendValue: {
    fontWeight: "600",
    color: "#0f172a",
  },
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const ExportDashboard = () => {
  const [exporters, setExporters] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [filters, setFilters] = useState({
    year: "",
    movementType: "",
    branch: "",
    exporter: "",
  });

  // Initial Fetch
  useEffect(() => {
    const fetchExporters = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_STRING}/exporter-list`
        );
        if (res.data.success) setExporters(res.data.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchExporters();
  }, []);

  // Stats Fetch
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_STRING}/dashboard-stats`,
          {
            params: {
              year: filters.year === "all" ? "" : filters.year,
              consignmentType: filters.movementType,
              branch: filters.branch,
              exporter: filters.exporter,
            },
          }
        );

        if (res.data.success) {
          const { total, pending, completed, cancelled, monthlyTrend } =
            res.data.data;
          setStats({ total, pending, completed, cancelled });

          // Map Monthly Data (ensure all 12 months exist)
          const trend = Array(12)
            .fill(0)
            .map((_, i) => {
              const found = monthlyTrend.find((m) => m._id === i + 1);
              return { name: MONTH_NAMES[i], jobs: found ? found.count : 0 };
            });
          setMonthlyData(trend);
        }
      } catch (err) {
        console.error(err);
      }
    };

    // Debounce
    const timer = setTimeout(fetchStats, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const handleFilter = (key, val) =>
    setFilters((prev) => ({ ...prev, [key]: val }));

  // Prepare Pie Data
  const pieData = [
    { name: "Pending", value: stats.pending, color: COLORS.pending },
    { name: "Completed", value: stats.completed, color: COLORS.completed },
    { name: "Cancelled", value: stats.cancelled, color: COLORS.cancelled },
  ].filter((d) => d.value > 0);

  const totalPieValue = pieData.reduce((acc, cur) => acc + cur.value, 0);

  return (
    <div style={s.wrapper}>
      {/* Header */}
      <div style={s.header}>
        <h1 style={s.title}>Export Overview</h1>
        <span style={s.lastUpdated}>
          Last updated: {new Date().toLocaleTimeString()}
        </span>
      </div>

      {/* Filters Row */}
      <div style={s.filterBar}>
        <div style={s.filterGroup}>
          <label style={s.label}>Year</label>
          <select
            style={s.select}
            value={filters.year}
            onChange={(e) => handleFilter("year", e.target.value)}
          >
            <option value="">All Time</option>
            <option value="25-26">2025-2026</option>
            <option value="26-27">2026-2027</option>
          </select>
        </div>
        <div style={s.filterGroup}>
          <label style={s.label}>Type</label>
          <select
            style={s.select}
            value={filters.movementType}
            onChange={(e) => handleFilter("movementType", e.target.value)}
          >
            <option value="">All Types</option>
            <option value="FCL">FCL</option>
            <option value="LCL">LCL</option>
            <option value="AIR">Air Freight</option>
          </select>
        </div>
        <div style={s.filterGroup}>
          <label style={s.label}>Branch</label>
          <select
            style={s.select}
            value={filters.branch}
            onChange={(e) => handleFilter("branch", e.target.value)}
          >
            <option value="">All Branches</option>
            <option value="BRD">Baroda</option>
            <option value="GIM">Gandhidham</option>
            <option value="HAZ">Hazira</option>
            <option value="AMD">Ahmedabad</option>
            <option value="COK">Cochin</option>
          </select>
        </div>
        <div style={s.filterGroup}>
          <label style={s.label}>Exporter</label>
          <select
            style={s.select}
            value={filters.exporter}
            onChange={(e) => handleFilter("exporter", e.target.value)}
          >
            <option value="">All Exporters</option>
            {exporters.map((exp, i) => (
              <option key={i} value={exp}>
                {exp}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div style={s.statsGrid}>
        <div style={{ ...s.statCard, borderLeftColor: COLORS.blue }}>
          <div style={s.statTitle}>Total Jobs</div>
          <div style={{ ...s.statValue, color: COLORS.blue }}>
            {stats.total}
          </div>
        </div>
        <div style={{ ...s.statCard, borderLeftColor: COLORS.pending }}>
          <div style={s.statTitle}>Active / Pending</div>
          <div style={{ ...s.statValue, color: COLORS.pending }}>
            {stats.pending}
          </div>
        </div>
        <div style={{ ...s.statCard, borderLeftColor: COLORS.completed }}>
          <div style={s.statTitle}>Completed</div>
          <div style={{ ...s.statValue, color: COLORS.completed }}>
            {stats.completed}
          </div>
        </div>
        <div style={{ ...s.statCard, borderLeftColor: COLORS.cancelled }}>
          <div style={s.statTitle}>Cancelled</div>
          <div style={{ ...s.statValue, color: COLORS.cancelled }}>
            {stats.cancelled}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={s.chartsRow}>
        {/* Monthly Bar Chart */}
        <div style={s.chartCard}>
          <h3 style={s.chartTitle}>Monthly Job Volume</h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={COLORS.grid}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }}
                  contentStyle={{
                    borderRadius: "6px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar
                  dataKey="jobs"
                  fill={COLORS.blue}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Donut Chart */}
        <div style={s.chartCard}>
          <h3 style={s.chartTitle}>Job Status Distribution</h3>
          <div style={{ height: "220px", width: "100%" }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Custom Legend to Match Image */}
          <div style={s.legendContainer}>
            {pieData.map((item, index) => (
              <div key={index} style={s.legendItem}>
                <div style={s.legendLeft}>
                  <div style={{ ...s.colorBox, backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </div>
                <div style={s.legendValue}>
                  {item.value}{" "}
                  <span style={{ color: "#94a3b8", fontWeight: 400 }}>
                    ({((item.value / totalPieValue) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
            {pieData.length === 0 && (
              <div style={{ textAlign: "center", color: "#ccc" }}>
                No data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportDashboard;
