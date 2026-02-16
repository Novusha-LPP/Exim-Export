import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Chip,
  Grid,
  Avatar,
  InputAdornment,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
} from "@mui/material";
import {
  PendingActions,
  Business,
  Assignment,
  Search,
  FilterList,
  Download,
  Refresh,
} from "@mui/icons-material";
import axios from "axios";

function BillingPending() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    count: 0,
    exporterCount: [],
    results: []
  });
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState("25-26");

  useEffect(() => {
    fetchBillingPendingData();
  }, [selectedYear]);

  const fetchBillingPendingData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use API base from environment variable
      const apiBase = import.meta.env.VITE_API_STRING || '';
      const response = await axios.get(
        `${apiBase}/report/billing-pending`,
        {
          params: {
            year: selectedYear
          }
        }
      );

      console.log("API Response:", response.data); // For debugging

      setData({
        count: response.data.count || 0,
        exporterCount: response.data.exporterCount || [],
        results: response.data.results || []
      });

    } catch (err) {
      console.error("Error fetching billing pending data:", err);
      setError(`Failed to fetch billing pending data: ${err.message}`);
      setData({ count: 0, exporterCount: [], results: [] });
    } finally {
      setLoading(false);
    }
  };

  // Filter results based on search term
  const filteredResults = data.results.filter(
    (item) =>
      !searchTerm ||
      item.job_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.exporter?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get top 5 exporters by count
  const topExporters = data.exporterCount
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const StatsCard = ({ title, value, icon, color, subtitle }) => (
    <Card sx={{ height: '100%', boxShadow: 2, borderRadius: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}15`, color: color, width: 48, height: 48 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const handleYearChange = (event) => {
    setSelectedYear(event.target.value);
  };

  const handleRefresh = () => {
    fetchBillingPendingData();
  };

  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
        sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 4 }}
      >
        <CircularProgress size={48} sx={{ mb: 2 }} />
        <Typography variant="body1" color="text.secondary">
          Loading billing pending data for year {selectedYear}...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", minHeight: "100vh", bgcolor: 'grey.50', p: 3 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              Billing Pending Jobs
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Monitor and track jobs with pending billing status for year {selectedYear}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              onClick={handleRefresh}
              sx={{ bgcolor: 'white', '&:hover': { bgcolor: 'grey.100' } }}
              title="Refresh Data"
            >
              <Refresh />
            </IconButton>
            <IconButton
              sx={{ bgcolor: 'white', '&:hover': { bgcolor: 'grey.100' } }}
              title="Download Report"
            >
              <Download />
            </IconButton>
            <IconButton
              sx={{ bgcolor: 'white', '&:hover': { bgcolor: 'grey.100' } }}
              title="Filter Options"
            >
              <FilterList />
            </IconButton>
          </Box>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={4}>
            <StatsCard
              title="Total Pending Jobs"
              value={data.count}
              icon={<PendingActions />}
              color="#ff9800"
              subtitle="Jobs awaiting billing"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatsCard
              title="Total Exporters"
              value={data.exporterCount.length}
              icon={<Business />}
              color="#2196f3"
              subtitle="Unique exporters"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatsCard
              title="Filtered Results"
              value={filteredResults.length}
              icon={<Assignment />}
              color="#4caf50"
              subtitle="Currently shown"
            />
          </Grid>
        </Grid>

        {/* Top Importers */}
        {topExporters.length > 0 && (
          <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Top 5 Exporters by Pending Jobs
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {topExporters.map((exporter, index) => (
                  <Chip
                    key={index}
                    label={`${exporter.exporter} (${exporter.count})`}
                    variant="outlined"
                    size="small"
                    sx={{
                      fontSize: '0.75rem',
                      '& .MuiChip-label': {
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Search and Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 120, bgcolor: 'white' }}>
          <InputLabel>Year</InputLabel>
          <Select
            value={selectedYear}
            onChange={handleYearChange}
            label="Year"
            size="small"
          >
            <MenuItem value="23-24">2023-24</MenuItem>
            <MenuItem value="24-25">2024-25</MenuItem>
            <MenuItem value="25-26">2025-26</MenuItem>
          </Select>
        </FormControl>
        <TextField
          variant="outlined"
          placeholder="Search by Job No or Exporter..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            flexGrow: 1,
            bgcolor: 'white',
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Data Table */}
      <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead sx={{ bgcolor: 'grey.100' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Job No</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Year</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Exporter</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>SB No</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Detailed Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredResults.length > 0 ? (
                  filteredResults.map((row, index) => (
                    <TableRow
                      key={`${row.job_no}-${index}`}
                      sx={{
                        '&:last-child td, &:last-child th': { border: 0 },
                        '&:hover': { bgcolor: 'grey.50' }
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>
                          {row.job_no}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {row.year}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: '250px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={row.exporter}
                        >
                          {row.exporter}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {row.sb_no || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.status}
                          size="small"
                          color={row.status === 'Pending' ? 'warning' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        {Array.isArray(row.detailedStatus) ? (
                          row.detailedStatus.map((ds, i) => (
                            <Chip
                              key={i}
                              label={ds}
                              size="small"
                              variant="outlined"
                              color="error"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))
                        ) : (
                          <Chip
                            label={row.detailedStatus || row.detailed_status || '-'}
                            size="small"
                            variant="outlined"
                            color="error"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <PendingActions sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                          No Billing Pending Jobs Found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {searchTerm ? 'Try adjusting your search criteria' : `No pending jobs found for year ${selectedYear}`}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}

export default BillingPending;
