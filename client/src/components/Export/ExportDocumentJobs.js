import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  TextField,
  Box,
  Typography,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import { format, parseISO } from "date-fns";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = `${import.meta.env.VITE_API_STRING}/exports/pending`;

const ExportDocumentJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0); // zero-based for frontend, one-based for API
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    search: "",
    exporter: "",
    country: "",
    movement_type: "",
  });

  const navigate = useNavigate();

  // Fetch jobs from API
  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...filters,
      };
      const response = await axios.get(API_URL, { params });

      if (response.data.success) {
        setJobs(response.data.data.jobs || []);
        setTotalCount(response.data.data.pagination?.totalCount || 0);
      }
    } catch (err) {
      console.error("Error fetching documentation jobs:", err);
      setJobs([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line
  }, [page, rowsPerPage, filters]);

  // Table columns configuration
  const columns = [
    { id: "job_no", label: "Job Number", minWidth: 120 },
    { id: "exporter_name", label: "Exporter", minWidth: 200 },
    { id: "consignee_name", label: "Consignee Name", minWidth: 200 },
    { id: "port_of_origin", label: "Port of Origin", minWidth: 150 },
    { id: "port_of_discharge", label: "Port of Destination", minWidth: 150 },
    { id: "country_of_final_destination", label: "Country", minWidth: 120 },
    { id: "movement_type", label: "Movement", minWidth: 100 },
  ];

  // Navigate to documentation details page for selected job
  const handleRowClick = (jobNo) => {

    const JobNumber = jobNo.split("/")[3];
    navigate(`/documentation/${JobNumber}`);
  };

  return (
    <Box sx={{ width: "100%" }}>
      {/* Filters Section */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters - Pending Documentation Jobs ({totalCount})
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Search (Job No, Exporter, Consignee)"
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Exporter"
                value={filters.exporter}
                onChange={(e) =>
                  setFilters({ ...filters, exporter: e.target.value })
                }
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Country"
                value={filters.country}
                onChange={(e) =>
                  setFilters({ ...filters, country: e.target.value })
                }
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Movement Type</InputLabel>
                <Select
                  value={filters.movement_type}
                  label="Movement Type"
                  onChange={(e) =>
                    setFilters({ ...filters, movement_type: e.target.value })
                  }
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="FCL">FCL</MenuItem>
                  <MenuItem value="LCL">LCL</MenuItem>
                  <MenuItem value="Break Bulk">Break Bulk</MenuItem>
                  <MenuItem value="Air Freight">Air Freight</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell
                    key={col.id}
                    style={{
                      minWidth: col.minWidth,
                      fontWeight: "bold",
                      backgroundColor: "#f5f5f5",
                    }}
                  >
                    {col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                    <Typography>Loading...</Typography>
                  </TableCell>
                </TableRow>
              ) : jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                    <Typography>No pending documentation jobs found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job, index) => (
                  <TableRow
                    hover
                    key={job._id || index}
                    onClick={() => handleRowClick(job.job_no)}
                    sx={{
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: "#f5f5f5",
                      },
                    }}
                  >
                    {columns.map((col) => {
                      let value = job[col.id];
                      if (col.id.includes("date") && value) {
                        value = format(parseISO(value), "dd-MM-yyyy");
                      }
                      if (col.id === "movement_type" && value) {
                        value = (
                          <Chip
                            label={value}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        );
                      }
                      if (!value) value = "-";
                      return <TableCell key={col.id}>{value}</TableCell>;
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>
    </Box>
  );
};

export default ExportDocumentJobs;
