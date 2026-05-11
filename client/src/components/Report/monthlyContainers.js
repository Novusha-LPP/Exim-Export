import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Container,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Box,
  TableSortLabel,
  Chip,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Alert,
  Fade,
  Zoom,
  Tooltip,
  useTheme,
  ClickAwayListener,
  Popper
} from "@mui/material";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import BusinessIcon from '@mui/icons-material/Business';
import InventoryIcon from '@mui/icons-material/Inventory';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Legend, ResponsiveContainer 
} from 'recharts';
import { getOptionsForBranch, getAllOptions } from '../common/CustomHouseDropdown';

// Custom dot component with growth/decline indicators
const CustomDot = ({ cx, cy, payload, dataKey, index, allData }) => {
  if (index === 0) return null; // No comparison for first month

  const prevValue = allData[index - 1][dataKey];
  const currValue = payload[dataKey];
  const isGrowth = currValue > prevValue;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={isGrowth ? '#4caf50' : '#f44336'}
        stroke="white"
        strokeWidth={2}
      />
      {isGrowth ? (
        <polygon
          points={`${cx - 4},${cy - 8} ${cx + 4},${cy - 8} ${cx},${cy - 12}`}
          fill="#4caf50"
        />
      ) : (
        <polygon
          points={`${cx - 4},${cy + 8} ${cx + 4},${cy + 8} ${cx},${cy + 12}`}
          fill="#f44336"
        />
      )}
    </g>
  );
};

// Chart tooltip component
const ChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Box sx={{
        backgroundColor: 'white',
        padding: 2,
        borderRadius: 1,
        boxShadow: 3,
        border: '1px solid #e0e0e0'
      }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
          {label}
        </Typography>
        {payload.map((entry, index) => (
          <Box key={`item-${index}`} sx={{
            color: entry.stroke,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            fontSize: '0.875rem'
          }}>
            <Box sx={{
              width: 10,
              height: 10,
              backgroundColor: entry.stroke,
              borderRadius: '50%'
            }} />
            {entry.name}: {entry.value}
          </Box>
        ))}
      </Box>
    );
  }
  return null;
};

// Trend chart component
const TrendChart = ({ trendData }) => {
  // Calculate net containers and TEU for each month
  const dataWithTEU = trendData.map(item => ({
    ...item,
    netContainer20Ft: Math.max(0, (Number(item.container20Ft) || 0) - (Number(item.lcl20Ft) || 0)),
    netContainer40Ft: Math.max(0, (Number(item.container40Ft) || 0) - (Number(item.lcl40Ft) || 0)),
    teu: Math.max(0,
      ((Number(item.container20Ft) || 0) - (Number(item.lcl20Ft) || 0)) +
      2 * ((Number(item.container40Ft) || 0) - (Number(item.lcl40Ft) || 0))
    ),
  }));

  console.log("Trend Data with TEU:", dataWithTEU);

  return (
    <Box sx={{ width: 400, height: 250, p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
        6-Month Trend Analysis
      </Typography>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dataWithTEU} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12 }}
            axisLine={{ stroke: '#e0e0e0' }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            axisLine={{ stroke: '#e0e0e0' }}
          />
          <RechartsTooltip content={<ChartTooltip />} />
          <Legend />

          <Line
            type="monotone"
            dataKey="leoCount"
            stroke="#1976d2"
            strokeWidth={2}
            dot={(props) => <CustomDot {...props} allData={dataWithTEU} />}
            activeDot={{ r: 6, stroke: '#1976d2', strokeWidth: 2 }}
            name="LEO"
          />
          <Line
            type="monotone"
            dataKey="sbDateCount"
            stroke="#6a1b9a"
            strokeWidth={2}
            dot={(props) => <CustomDot {...props} allData={dataWithTEU} />}
            activeDot={{ r: 6, stroke: '#6a1b9a', strokeWidth: 2 }}
            name="SBs Filed"
          />
          <Line
            type="monotone"
            dataKey="airCount"
            stroke="#00897b"
            strokeWidth={2}
            dot={(props) => <CustomDot {...props} allData={dataWithTEU} />}
            activeDot={{ r: 6, stroke: '#00897b', strokeWidth: 2 }}
            name="Air"
          />
          <Line
            type="monotone"
            dataKey="netContainer20Ft"
            stroke="#2e7d32"
            strokeWidth={2}
            dot={(props) => <CustomDot {...props} allData={dataWithTEU} />}
            activeDot={{ r: 6, stroke: '#2e7d32', strokeWidth: 2 }}
            name="Net 20ft Containers"
          />
          <Line
            type="monotone"
            dataKey="netContainer40Ft"
            stroke="#ed6c02"
            strokeWidth={2}
            dot={(props) => <CustomDot {...props} allData={dataWithTEU} />}
            activeDot={{ r: 6, stroke: '#ed6c02', strokeWidth: 2 }}
            name="Net 40ft Containers"
          />
          <Line
            type="monotone"
            dataKey="teu"
            stroke="#d32f2f"
            strokeWidth={2}
            dot={(props) => <CustomDot {...props} allData={dataWithTEU} />}
            activeDot={{ r: 6, stroke: '#d32f2f', strokeWidth: 2 }}
            name="TEU"
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

const MonthlyContainers = () => {
  const theme = useTheme();
  const [year, setYear] = useState("26-27");
  const currentMonth = String(new Date().getMonth() + 1);
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortColumn, setSortColumn] = useState('teu');
  const [sortDirection, setSortDirection] = useState('desc');
  const [popperOpen, setPopperOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRowData, setSelectedRowData] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedCustomHouse, setSelectedCustomHouse] = useState("");
  const navigate = useNavigate();

  const BRANCH_OPTIONS = [
    { value: "AMD", label: "Ahmedabad" },
    { value: "BRD", label: "Baroda" },
    { value: "GIM", label: "Gandhidham" },
    { value: "COK", label: "Cochin" },
    { value: "HAZ", label: "Hazira" },
  ];

  const years = [
    { value: "26-27", label: "26-27" },
    { value: "25-26", label: "25-26" },
    { value: "24-25", label: "24-25" },
    { value: "23-24", label: "23-24" },
    { value: "22-23", label: "22-23" },
    { value: "21-22", lable: "21-22" },
  ];

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  // Mock trend data generator (replace with actual API call)
  const generateMockTrendData = (row) => {
    const currentValues = {
      leoCount: Number(row.leoCount) || 0,
      sbDateCount: Number(row.sbDateCount) || 0,
      container20Ft: Number(row.container20Ft) || 0,
      container40Ft: Number(row.container40Ft) || 0,
      lcl20Ft: Number(row.lcl20Ft) || 0,
      lcl40Ft: Number(row.lcl40Ft) || 0,
      airCount: Number(row.airCount) || 0,
    };

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, index) => {
      const variation = (Math.random() - 0.5) * 0.3; // ±15% variation
      return {
        month,
        leoCount: Math.max(1, Math.round(currentValues.leoCount * (1 + variation * (index + 1) / 6))),
        sbDateCount: Math.max(0, Math.round(currentValues.sbDateCount * (1 + variation * (index + 1) / 6))),
        container20Ft: Math.max(0, Math.round(currentValues.container20Ft * (1 + variation * (index + 1) / 6))),
        container40Ft: Math.max(0, Math.round(currentValues.container40Ft * (1 + variation * (index + 1) / 6))),
        lcl20Ft: Math.max(0, Math.round(currentValues.lcl20Ft * (1 + variation * (index + 1) / 6))),
        lcl40Ft: Math.max(0, Math.round(currentValues.lcl40Ft * (1 + variation * (index + 1) / 6))),
        airCount: Math.max(0, Math.round(currentValues.airCount * (1 + variation * (index + 1) / 6))),
      };
    });
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const apiBase = import.meta.env.VITE_API_STRING || "";
      const params = new URLSearchParams();
      if (selectedCustomHouse) params.append("custom_house", selectedCustomHouse);
      if (selectedBranch) params.append("branch_code", selectedBranch);
      
      const res = await axios.get(`${apiBase}/report/monthly-containers/${year}/${month}?${params.toString()}`);
      setData(res.data);
    } catch (err) {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year, month, selectedCustomHouse, selectedBranch]);

  const handleSort = (column) => {
    const isAsc = sortColumn === column && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortColumn(column);
  };

  const sortedData = [...data].sort((a, b) => {
    let aValue, bValue;

    switch (sortColumn) {
      case 'exporter':
        aValue = a.exporter;
        bValue = b.exporter;
        break;
      case 'leoCount':
        aValue = a.leoCount;
        bValue = b.leoCount;
        break;
      case 'sbDateCount':
        aValue = a.sbDateCount; bValue = b.sbDateCount; break;
      case 'airCount':
        aValue = a.airCount; bValue = b.airCount; break;
      case 'container20Ft':
        aValue = Math.max(0, (Number(a.container20Ft) || 0) - (Number(a.lcl20Ft) || 0));
        bValue = Math.max(0, (Number(b.container20Ft) || 0) - (Number(b.lcl20Ft) || 0));
        break;
      case 'container40Ft':
        aValue = Math.max(0, (Number(a.container40Ft) || 0) - (Number(a.lcl40Ft) || 0));
        bValue = Math.max(0, (Number(b.container40Ft) || 0) - (Number(b.lcl40Ft) || 0));
        break;
      case 'lcl20Ft':
        aValue = Number(a.lcl20Ft) || 0;
        bValue = Number(b.lcl20Ft) || 0;
        break;
      case 'lcl40Ft':
        aValue = Number(a.lcl40Ft) || 0;
        bValue = Number(b.lcl40Ft) || 0;
        break;
      case 'teu':
      default:
        const aNet20 = Math.max(0, (Number(a.container20Ft) || 0) - (Number(a.lcl20Ft) || 0));
        const aNet40 = Math.max(0, (Number(a.container40Ft) || 0) - (Number(a.lcl40Ft) || 0));
        const bNet20 = Math.max(0, (Number(b.container20Ft) || 0) - (Number(b.lcl20Ft) || 0));
        const bNet40 = Math.max(0, (Number(b.container40Ft) || 0) - (Number(b.lcl40Ft) || 0));
        aValue = aNet20 + (2 * aNet40);
        bValue = bNet20 + (2 * bNet40);
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    await fetchData();
  };

  const handlePreviousMonth = () => {
    const prev = parseInt(month) - 1;
    setMonth(prev < 1 ? "12" : String(prev));
  };

  const handleNextMonth = () => {
    const next = parseInt(month) + 1;
    setMonth(next > 12 ? "1" : String(next));
  };

  const handleChartHover = (event, row) => {
    setAnchorEl(event.currentTarget);
    setSelectedRowData(generateMockTrendData(row));
    setPopperOpen(true);
  };

  const handlePopperClose = () => {
    setPopperOpen(false);
    setAnchorEl(null);
    setSelectedRowData(null);
  };

  // Calculate statistics with LCL subtraction
  const totalLEO = data.reduce((sum, row) => sum + (Number(row.leoCount) || 0), 0);
  const totalSBs = data.reduce((sum, row) => sum + (Number(row.sbDateCount) || 0), 0);
  const totalAir = data.reduce((sum, row) => sum + (Number(row.airCount) || 0), 0);
  const totalNet20Ft = data.reduce((sum, row) => sum + Math.max(0, (Number(row.container20Ft) || 0) - (Number(row.lcl20Ft) || 0)), 0);
  const totalNet40Ft = data.reduce((sum, row) => sum + Math.max(0, (Number(row.container40Ft) || 0) - (Number(row.lcl40Ft) || 0)), 0);
  const totalLCL = data.reduce((sum, row) => sum + (Number(row.lcl20Ft) || 0) + (Number(row.lcl40Ft) || 0), 0);
  const totalTEU = data.reduce((sum, row) => {
    const net20Ft = Math.max(0, (Number(row.container20Ft) || 0) - (Number(row.lcl20Ft) || 0));
    const net40Ft = Math.max(0, (Number(row.container40Ft) || 0) - (Number(row.lcl40Ft) || 0));
    return sum + net20Ft + (2 * net40Ft);
  }, 0);

  const StatCard = ({ title, value, icon, color }) => (
    <Zoom in timeout={800}>
      <Card
        elevation={3}
        sx={{
          flex: '1 1 0',
          minWidth: 0,
          background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
          border: `1px solid ${color}30`,
          borderRadius: 2,
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: `0 8px 25px ${color}20`
          }
        }}
      >
        <CardContent sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 1,
          p: '12px !important', // Compact padding
          height: '100%'
        }}>
          <Box sx={{ color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {React.cloneElement(icon, { sx: { fontSize: 24 } })}
          </Box>
          <Box sx={{ textAlign: 'center', minWidth: 0, width: '100%' }}>
            <Typography 
              variant="h6" 
              fontWeight="bold" 
              color={color}
              sx={{ 
                lineHeight: 1.2,
                fontSize: { xs: '1rem', md: '1.25rem' },
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {value.toLocaleString()}
            </Typography>
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ 
                display: 'block',
                lineHeight: 1,
                fontSize: { xs: '0.65rem', md: '0.75rem' },
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontWeight: 500
              }}
            >
              {title}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Zoom>
  );

  return (
    <Container maxWidth="xl" sx={{ padding: 2 }}>
      <Fade in timeout={600}>
        <Box
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: "white",
            padding: 2,
            borderRadius: 3,
            marginBottom: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <InventoryIcon sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" fontWeight="bold">
                Monthly Container Report
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                {months.find(m => m.value === month)?.label} {year}
              </Typography>
            </Box>
          </Box>
          <AssessmentIcon sx={{ fontSize: 48, opacity: 0.3 }} />
        </Box>
      </Fade>

      <Fade in timeout={800}>
        <Card elevation={2} sx={{ marginBottom: 2, borderRadius: 2 }}>
          <CardContent sx={{ p: '12px !important' }}>
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                flexWrap: 'nowrap', // Keep header row tight
                overflowX: 'auto',
                pb: { xs: 1, md: 0 }
              }}
            >
              <FormControl size="small" sx={{ minWidth: 80 }}>
                <InputLabel id="year-label">Year</InputLabel>
                <Select
                  labelId="year-label"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  label="Year"
                  sx={{ borderRadius: 1.5 }}
                >
                  {years.map((y) => (
                    <MenuItem key={y.value} value={y.value}>{y.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Tooltip title="Previous Month">
                  <IconButton
                    size="small"
                    onClick={handlePreviousMonth}
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' }
                    }}
                  >
                    <ArrowBackIosNewIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>

                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel id="month-label">Month</InputLabel>
                  <Select
                    labelId="month-label"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    label="Month"
                    sx={{ borderRadius: 1.5 }}
                  >
                    {months.map((m) => (
                      <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Tooltip title="Next Month">
                  <IconButton
                    size="small"
                    onClick={handleNextMonth}
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' }
                    }}
                  >
                    <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Box>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="branch-label">Branch</InputLabel>
                <Select
                  labelId="branch-label"
                  value={selectedBranch}
                  onChange={(e) => {
                    setSelectedBranch(e.target.value);
                    setSelectedCustomHouse(""); // Reset custom house when branch changes
                  }}
                  label="Branch"
                  sx={{ borderRadius: 1.5 }}
                >
                  <MenuItem value="">All Branches</MenuItem>
                  {BRANCH_OPTIONS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="custom-house-label">Custom House</InputLabel>
                <Select
                  labelId="custom-house-label"
                  value={selectedCustomHouse}
                  onChange={(e) => setSelectedCustomHouse(e.target.value)}
                  label="Custom House"
                  sx={{ borderRadius: 1.5 }}
                >
                  <MenuItem value="">All Custom Houses</MenuItem>
                  {selectedBranch ? (
                    getOptionsForBranch(selectedBranch).map(group => 
                      group.items.map(item => (
                        <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
                      ))
                    )
                  ) : (
                    getAllOptions().map(item => (
                      <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>

              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<span role="img" aria-label="View Detailed Report">🗂</span>}
                sx={{
                  borderRadius: 1.5,
                  px: 2,
                  whiteSpace: 'nowrap',
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
                  }
                }}
                onClick={() => navigate('/report/detailed')}
              >
                Detailed Report
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Fade>

      {error && (
        <Fade in timeout={400}>
          <Alert severity="error" sx={{ marginBottom: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        </Fade>
      )}

      {data.length > 0 && (
        <>
          <Box 
            sx={{ 
              display: 'flex', 
              gap: 1.5, 
              marginBottom: 2,
              width: '100%',
              flexWrap: 'nowrap', // Force one row
              overflowX: 'auto', // Allow scroll if screen is extremely small
              pb: 1, // Padding for scrollbar visibility if needed
              '&::-webkit-scrollbar': {
                height: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0,0,0,0.1)',
                borderRadius: '4px',
              }
            }}
          >
            <StatCard
              title="Total Exporters"
              value={data.length}
              icon={<BusinessIcon />}
              color={theme.palette.primary.main}
            />
            <StatCard
              title="Total LEO"
              value={totalLEO}
              icon={<AssessmentIcon />}
              color={theme.palette.success.main}
            />
            <StatCard
              title="Total SBs"
              value={totalSBs}
              icon={<AssessmentIcon />}
              color={'#6a1b9a'}
            />
            <StatCard
              title="Total Air"
              value={totalAir}
              icon={<InventoryIcon />}
              color={'#00897b'}
            />
            <StatCard
              title="Net Containers"
              value={totalNet20Ft + totalNet40Ft}
              icon={<InventoryIcon />}
              color={theme.palette.warning.main}
            />
            <StatCard
              title="Total LCL"
              value={totalLCL}
              icon={<InventoryIcon />}
              color={theme.palette.info.main}
            />
            <StatCard
              title="Total TEU"
              value={totalTEU}
              icon={<TrendingUpIcon />}
              color={theme.palette.error.main}
            />
          </Box>

          <Fade in timeout={1000}>
            <Card elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: "bold", fontSize: '0.875rem', py: 1 }}>
                        <TableSortLabel
                          active={sortColumn === 'exporter'}
                          direction={sortColumn === 'exporter' ? sortDirection : 'asc'}
                          onClick={() => handleSort('exporter')}
                        >
                          Exporter Name
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold", fontSize: '0.875rem', py: 1 }}>
                        <TableSortLabel
                          active={sortColumn === 'leoCount'}
                          direction={sortColumn === 'leoCount' ? sortDirection : 'asc'}
                          onClick={() => handleSort('leoCount')}
                        >
                          LEO
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold", fontSize: '0.875rem', py: 1 }}>
                        <TableSortLabel
                          active={sortColumn === 'sbDateCount'}
                          direction={sortColumn === 'sbDateCount' ? sortDirection : 'asc'}
                          onClick={() => handleSort('sbDateCount')}
                        >
                          SBs Filed
                        </TableSortLabel>
                      </TableCell>

                      <TableCell sx={{ fontWeight: "bold", fontSize: '0.875rem', py: 1 }}>
                        <TableSortLabel
                          active={sortColumn === 'container20Ft'}
                          direction={sortColumn === 'container20Ft' ? sortDirection : 'asc'}
                          onClick={() => handleSort('container20Ft')}
                        >
                          Net 20ft
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold", fontSize: '0.875rem', py: 1 }}>
                        <TableSortLabel
                          active={sortColumn === 'container40Ft'}
                          direction={sortColumn === 'container40Ft' ? sortDirection : 'asc'}
                          onClick={() => handleSort('container40Ft')}
                        >
                          Net 40ft
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold", fontSize: '0.875rem', py: 1 }}>
                        <TableSortLabel
                          active={sortColumn === 'airCount'}
                          direction={sortColumn === 'airCount' ? sortDirection : 'asc'}
                          onClick={() => handleSort('airCount')}
                        >
                          Air
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold", fontSize: '0.875rem', py: 1 }}>
                        <TableSortLabel
                          active={sortColumn === 'lcl20Ft'}
                          direction={sortColumn === 'lcl20Ft' ? sortDirection : 'asc'}
                          onClick={() => handleSort('lcl20Ft')}
                        >
                          LCL 20ft
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold", fontSize: '0.875rem', py: 1 }}>
                        <TableSortLabel
                          active={sortColumn === 'lcl40Ft'}
                          direction={sortColumn === 'lcl40Ft' ? sortDirection : 'asc'}
                          onClick={() => handleSort('lcl40Ft')}
                        >
                          LCL 40ft
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold", fontSize: '0.875rem', py: 1 }}>
                        <TableSortLabel
                          active={sortColumn === 'teu'}
                          direction={sortColumn === 'teu' ? sortDirection : 'asc'}
                          onClick={() => handleSort('teu')}
                        >
                          TEU
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold", fontSize: '0.875rem', py: 1, textAlign: 'center' }}>
                        Trend
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, idx) => (
                        <TableRow key={idx}>
                          {Array.from({ length: 11 }).map((_, cellIdx) => (
                            <TableCell key={cellIdx}>
                              <Skeleton variant="text" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      sortedData.map((row, idx) => {
                        const net20Ft = Math.max(0, (Number(row.container20Ft) || 0) - (Number(row.lcl20Ft) || 0));
                        const net40Ft = Math.max(0, (Number(row.container40Ft) || 0) - (Number(row.lcl40Ft) || 0));
                        const teu = net20Ft + (2 * net40Ft);

                        return (
                          <TableRow
                            key={idx}
                            sx={{
                              '&:hover': {
                                bgcolor: 'action.hover',
                                transform: 'scale(1.001)'
                              },
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <TableCell sx={{ fontWeight: 500, fontSize: '0.85rem', py: 1 }}>{row.exporter}</TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  backgroundColor: '#1976d2',
                                  color: 'white',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 'bold',
                                  fontSize: '0.8rem',
                                  textAlign: 'center',
                                  minWidth: '40px',
                                  display: 'inline-block'
                                }}
                              >
                                {row.leoCount ?? 0}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  backgroundColor: '#6a1b9a',
                                  color: 'white',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 'bold',
                                  fontSize: '0.8rem',
                                  textAlign: 'center',
                                  minWidth: '40px',
                                  display: 'inline-block'
                                }}
                              >
                                {row.sbDateCount ?? 0}
                              </Box>
                            </TableCell>

                            <TableCell>
                              <Box
                                sx={{
                                  backgroundColor: '#2e7d32',
                                  color: 'white',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 'bold',
                                  fontSize: '0.8rem',
                                  textAlign: 'center',
                                  minWidth: '40px',
                                  display: 'inline-block'
                                }}
                              >
                                {net20Ft}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  backgroundColor: '#ed6c02',
                                  color: 'white',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 'bold',
                                  fontSize: '0.8rem',
                                  textAlign: 'center',
                                  minWidth: '40px',
                                  display: 'inline-block'
                                }}
                              >
                                {net40Ft}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  backgroundColor: '#00897b',
                                  color: 'white',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 'bold',
                                  fontSize: '0.8rem',
                                  textAlign: 'center',
                                  minWidth: '40px',
                                  display: 'inline-block'
                                }}
                              >
                                {row.airCount ?? 0}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  backgroundColor: '#00bcd4',
                                  color: 'white',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 'bold',
                                  fontSize: '0.8rem',
                                  textAlign: 'center',
                                  minWidth: '40px',
                                  display: 'inline-block'
                                }}
                              >
                                {row.lcl20Ft}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  backgroundColor: '#00bcd4',
                                  color: 'white',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 'bold',
                                  fontSize: '0.8rem',
                                  textAlign: 'center',
                                  minWidth: '40px',
                                  display: 'inline-block'
                                }}
                              >
                                {row.lcl40Ft}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={teu}
                                size="small"
                                color="error"
                                variant="filled"
                                sx={{ fontWeight: 'bold' }}
                              />
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              <Tooltip title="View 6-month trend">
                                <IconButton
                                  size="small"
                                  onMouseEnter={(e) => handleChartHover(e, row)}
                                  onMouseLeave={handlePopperClose}
                                  sx={{
                                    color: 'primary.main',
                                    '&:hover': {
                                      backgroundColor: 'primary.main',
                                      color: 'white',
                                      transform: 'scale(1.1)'
                                    },
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  <ShowChartIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Fade>

          {/* Trend Chart Popper */}
          <Popper
            open={popperOpen}
            anchorEl={anchorEl}
            placement="top"
            modifiers={[
              {
                name: 'offset',
                options: {
                  offset: [0, 10],
                },
              },
            ]}
            sx={{ zIndex: 1300 }}
          >
            <ClickAwayListener onClickAway={handlePopperClose}>
              <Card elevation={8} sx={{ borderRadius: 2 }}>
                {selectedRowData && <TrendChart trendData={selectedRowData} />}
              </Card>
            </ClickAwayListener>
          </Popper>
        </>
      )}
    </Container>
  );
};

export default MonthlyContainers;
