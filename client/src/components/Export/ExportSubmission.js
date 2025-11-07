import React, { useEffect, useState } from "react";
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

const ExportSubmission = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0); // zero-based frontend, one-based API
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    search: "",
    exporter: "",
    country: "",
    movement_type: "",
  });

  const navigate = useNavigate();

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...filters,
      };
      const res = await axios.get(API_URL, { params });
      if (res.data.success) {
        setJobs(res.data.data.jobs || []);
        setTotalCount(res.data.data.pagination?.totalCount || 0);
      } else {
        setJobs([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error("Error loading jobs:", err);
      setJobs([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchJobs();
  }, [page, rowsPerPage, filters]);

  const columns = [
    { id: "job_no", label: "Job Number", minWidth: 120 },
    { id: "exporter_name", label: "Exporter", minWidth: 200 },
    { id: "consignee_name", label: "Consignee Name", minWidth: 200 },
    { id: "port_of_origin", label: "Port of Origin", minWidth: 150 },
    { id: "port_of_discharge", label: "Port of Destination", minWidth: 150 },
    { id: "country_of_final_destination", label: "Country", minWidth: 120 },
    { id: "movement_type", label: "Movement", minWidth: 100 },
  ];

  const handleRowClick = (jobNo) => {
    const JobNumber = jobNo.split("/")[3];
    navigate(`/submission-job-list/${JobNumber}`);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters - Pending Jobs ({totalCount})
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Search (Job No, Exporter, Consignee)"
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Exporter"
                value={filters.exporter}
                onChange={(e) =>
                  setFilters({ ...filters, exporter: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Country"
                value={filters.country}
                onChange={(e) =>
                  setFilters({ ...filters, country: e.target.value })
                }
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

      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell
                    key={col.id}
                    sx={{
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
                jobs.map((job, idx) => (
                  <TableRow
                    hover
                    key={job._id || idx}
                    // onClick={() => handleRowClick(job.job_no)}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { backgroundColor: "#f5f5f5" },
                    }}
                  >
                    {columns.map((col) => {
                      let value = job[col.id];
                      if (col.id.includes("date") && value) {
                        try {
                          value = format(parseISO(value), "dd-MM-yyyy");
                        } catch {
                          // If invalid date string, fallback
                        }
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
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>
    </Box>
  );
};

export default ExportSubmission;
