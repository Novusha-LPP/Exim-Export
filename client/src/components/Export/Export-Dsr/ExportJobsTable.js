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
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Button,
  Tabs,
  Tab,
  Badge,
} from "@mui/material";
import {
  Edit,
  Delete,
  Visibility,
  Refresh,
  Download,
  BuildCircle as ToolboxIcon,
} from "@mui/icons-material";
import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom"; // Add this import
import axios from "axios";
import PropTypes from "prop-types";

// Custom Tab Panel Component
function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`export-tabpanel-${index}`}
      aria-labelledby={`export-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

// Export Jobs Table Component for each tab
const ExportJobsTableContent = ({ status }) => {
  const navigate = useNavigate(); // Add navigate hook
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    search: "",
    exporter: "",
    country: "",
    movement_type: "",
  });

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/exports`,
        {
          params: {
            page: page + 1,
            limit: rowsPerPage,
            status: status.toLowerCase(), // Add status filter
            ...filters,
          },
        }
      );

      if (response.data.success) {
        setJobs(response.data.data.jobs || []);
        setTotalCount(response.data.data.pagination?.totalCount || 0);
      }
    } catch (err) {
      console.error("Error fetching export jobs:", err);
      setJobs([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [page, rowsPerPage, filters, status]);

  // Handle row click navigation
  const handleRowClick = (job, event) => {
    // Prevent navigation if clicking on action buttons
    if (event.target.closest(".MuiIconButton-root")) {
      return;
    }

    const jobNo = job.job_no;
    const year = job.year;

    if (jobNo && year) {
      navigate(`/export-dsr/job/${year}/${jobNo}`, {
        state: {
          fromJobList: true,
          searchQuery: filters.search,
          selectedExporter: filters.exporter,
          selectedCountry: filters.country,
          currentTab: status === "Pending" ? 0 : status === "Completed" ? 1 : 2,
        },
      });
    }
  };

  // Handle action button clicks
  const handleViewClick = (job, event) => {
    event.stopPropagation();
    handleRowClick(job, event);
  };

  const handleEditClick = (job, event) => {
    event.stopPropagation();
    handleRowClick(job, event);
  };

  const handleDeleteClick = (job, event) => {
    event.stopPropagation();
    // Add delete functionality here
    console.log("Delete job:", job);
  };

  const columns = [
    { id: "job_no", label: "Job Number", minWidth: 120 },
    { id: "exporter_name", label: "Exporter", minWidth: 200 },
    { id: "consignee_name", label: "Consignee Name", minWidth: 200 },
    { id: "port_of_origin", label: "Port of Origin", minWidth: 150 },
    { id: "port_of_discharge", label: "Port of Destination", minWidth: 150 },
    { id: "country_of_final_destination", label: "Country", minWidth: 120 },
    { id: "movement_type", label: "LCL/FCL/AIR", minWidth: 100 },
    { id: "cntr_size", label: "CNTR 20/40", minWidth: 100 },
    { id: "commercial_invoice_number", label: "Invoice No", minWidth: 120 },
    { id: "commercial_invoice_date", label: "Invoice Date", minWidth: 120 },
    { id: "commercial_invoice_value", label: "Invoice Value", minWidth: 120 },
    { id: "shipping_bill_number", label: "SB Number", minWidth: 120 },
    { id: "shipping_bill_date", label: "SB Date", minWidth: 120 },
    { id: "total_packages", label: "No of Packages", minWidth: 120 },
    { id: "net_weight_kg", label: "Net Weight Kgs", minWidth: 130 },
    { id: "gross_weight_kg", label: "Gross Weight Kgs", minWidth: 140 },
    {
      id: "container_placement_date_factory",
      label: "Container Placement",
      minWidth: 160,
    },
    {
      id: "original_docs_received_date",
      label: "Original Docs Received",
      minWidth: 180,
    },
    {
      id: "gate_in_thar_khodiyar_date",
      label: "Gate In Thar/Khodiyar",
      minWidth: 180,
    },
    { id: "hand_over_date", label: "Hand Over Date", minWidth: 140 },
    { id: "rail_out_date_plan", label: "Rail Out Plan", minWidth: 140 },
    { id: "rail_out_date_actual", label: "Rail Out Actual", minWidth: 150 },
    { id: "port_gate_in_date", label: "Port Gate In", minWidth: 140 },
    { id: "tracking_remarks", label: "Remarks", minWidth: 250 },
  ];

  return (
    <Box sx={{ width: "100%" }}>
      {/* Filters Card */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters - {status} Jobs ({totalCount})
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

      {/* Jobs Table */}
      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    style={{
                      minWidth: column.minWidth,
                      fontWeight: "bold",
                      backgroundColor: "#f5f5f5",
                    }}
                  >
                    {column.label}
                  </TableCell>
                ))}
                <TableCell
                  style={{
                    minWidth: 120,
                    fontWeight: "bold",
                    backgroundColor: "#f5f5f5",
                  }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} align="center">
                    <Typography>Loading...</Typography>
                  </TableCell>
                </TableRow>
              ) : jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} align="center">
                    <Typography>
                      No {status.toLowerCase()} jobs found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job, index) => (
                  <TableRow
                    hover
                    key={job._id || index}
                    onClick={(event) => handleRowClick(job, event)}
                    sx={{
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: "#f5f5f5",
                      },
                    }}
                  >
                    {columns.map((column) => {
                      let value = job[column.id];

                      if (column.id.includes("date") && value) {
                        value = format(parseISO(value), "dd-MM-yyyy");
                      } else if (column.id === "movement_type") {
                        value = (
                          <Chip
                            label={value || "N/A"}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        );
                      } else if (column.id === "status") {
                        const colors = {
                          pending: "warning",
                          completed: "success",
                          cancelled: "error",
                        };
                        value = (
                          <Chip
                            label={
                              value?.charAt(0).toUpperCase() +
                                value?.slice(1) || "N/A"
                            }
                            size="small"
                            color={colors[value?.toLowerCase()] || "default"}
                          />
                        );
                      } else if (!value) {
                        value = "-";
                      }

                      return <TableCell key={column.id}>{value}</TableCell>;
                    })}
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={(event) => handleViewClick(job, event)}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Job">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(event) => handleEditClick(job, event)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {status === "Pending" && (
                          <Tooltip title="Cancel Job">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(event) => handleDeleteClick(job, event)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
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

// Main Export Jobs Table Component with Tabs
const ExportJobsTable = () => {
  const [value, setValue] = useState(0);
  const [statusCounts, setStatusCounts] = useState({
    pending: 0,
    completed: 0,
    cancelled: 0,
  });

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  // Fetch status counts for badges
  useEffect(() => {
    const fetchStatusCounts = async () => {
      try {
        const statuses = ["pending", "completed", "cancelled"];
        const promises = statuses.map((status) =>
          axios
            .get(`${import.meta.env.VITE_API_STRING}/exports/count`, {
              params: { status },
            })
            .catch(() => ({ data: { count: 0 } }))
        );

        const results = await Promise.all(promises);
        const counts = {
          pending: results[0].data.count || 0,
          completed: results[1].data.count || 0,
          cancelled: results[2].data.count || 0,
        };

        setStatusCounts(counts);
      } catch (error) {
        console.error("Error fetching status counts:", error);
      }
    };

    fetchStatusCounts();
  }, []);

  return (
    <Box sx={{ width: "100%", p: 2 }}>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" sx={{ fontWeight: 600, color: "#1976d2" }}>
          Export Jobs Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<ToolboxIcon />}
          sx={{
            borderRadius: 3,
            textTransform: "none",
            fontWeight: 500,
            background: "linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)",
            boxShadow: "0 4px 12px rgba(25, 118, 210, 0.3)",
            "&:hover": {
              background: "linear-gradient(135deg, #1565c0 0%, #1976d2 100%)",
              boxShadow: "0 6px 16px rgba(25, 118, 210, 0.4)",
              transform: "translateY(-1px)",
            },
          }}
        >
          Export Utility Tool
        </Button>
      </Box>

      {/* Tabs */}
      <Box sx={{ width: "100%" }}>
        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Tabs
            value={value}
            onChange={handleChange}
            aria-label="export jobs tabs"
          >
            <Tab
              label={
                <Badge badgeContent={statusCounts.pending} color="warning">
                  Pending
                </Badge>
              }
            />
            <Tab
              label={
                <Badge badgeContent={statusCounts.completed} color="success">
                  Completed
                </Badge>
              }
            />
            <Tab
              label={
                <Badge badgeContent={statusCounts.cancelled} color="error">
                  Cancelled
                </Badge>
              }
            />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <CustomTabPanel value={value} index={0}>
          <ExportJobsTableContent status="Pending" />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={1}>
          <ExportJobsTableContent status="Completed" />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={2}>
          <ExportJobsTableContent status="Cancelled" />
        </CustomTabPanel>
      </Box>
    </Box>
  );
};

export default ExportJobsTable;
