import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Badge,
  Chip,
  Autocomplete,
  IconButton,
} from "@mui/material";
import {
  Edit,
  Delete,
  Visibility,
  BuildCircle as ToolboxIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import { format, parseISO, isValid } from "date-fns";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import PropTypes from "prop-types";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";

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

CustomTabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

// Safe date formatter function
const safeDateFormatter = (value) => {
  if (!value) return "-";

  try {
    const date = parseISO(value);
    return isValid(date) ? format(date, "dd-MM-yyyy") : "-";
  } catch (error) {
    console.error("Error formatting date:", error);
    return "-";
  }
};

// Search Input Component
const SearchInput = ({ searchQuery, setSearchQuery, fetchJobs }) => {
  return (
    <TextField
      size="small"
      variant="outlined"
      placeholder="Search..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      onKeyPress={(e) => {
        if (e.key === "Enter") {
          fetchJobs();
        }
      }}
      sx={{ width: "200px", marginRight: "20px" }}
    />
  );
};

// Export Jobs Table Component for each tab
const ExportJobsTableContent = ({ status }) => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExporter, setSelectedExporter] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedMovementType, setSelectedMovementType] = useState("");
  const [exporterNames, setExporterNames] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState("all");

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/exports`,
        {
          params: {
            status: status.toLowerCase(),
            search: searchQuery,
            exporter: selectedExporter,
            country: selectedCountry,
            movement_type: selectedMovementType,
            year: selectedYear === "all" ? "" : selectedYear,
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
  }, [status, selectedYear]);

  useEffect(() => {
    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchJobs();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedExporter, selectedCountry, selectedMovementType]);

  const handleViewClick = (job) => {
    if (job) {
      const jobNo = job.job_no?.split("/")[3];
      const year = job.year;
      if (jobNo && year) {
        navigate(`/export-dsr/job/${year}/${jobNo}`, {
          state: {
            fromJobList: true,
            searchQuery: searchQuery,
            selectedExporter: selectedExporter,
            selectedCountry: selectedCountry,
            currentTab:
              status === "Pending" ? 0 : status === "Completed" ? 1 : 2,
          },
        });
      }
    }
  };

  const handleEditClick = (job) => {
    handleViewClick(job);
  };

  const handleDeleteClick = (job) => {
    console.log("Delete job:", job);
    // Add delete functionality here
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "job_no",
        header: "Job Number",
        size: 120,
        enablePinning: true,
      },
      {
        accessorKey: "exporter_name",
        header: "Exporter",
        size: 200,
        enablePinning: true,
      },
      {
        accessorKey: "consignee_name",
        header: "Consignee Name",
        size: 200,
      },
      {
        accessorKey: "port_of_origin",
        header: "Port of Origin",
        size: 150,
      },
      {
        accessorKey: "port_of_discharge",
        header: "Port of Destination",
        size: 150,
      },
      {
        accessorKey: "country_of_final_destination",
        header: "Country",
        size: 120,
      },
      {
        accessorKey: "movement_type",
        header: "LCL/FCL/AIR",
        size: 100,
        Cell: ({ cell }) => (
          <Chip
            label={cell.getValue() || "N/A"}
            size="small"
            color="primary"
            variant="outlined"
          />
        ),
      },
      {
        accessorKey: "cntr_size",
        header: "CNTR 20/40",
        size: 100,
      },
      {
        accessorKey: "commercial_invoice_number",
        header: "Invoice No",
        size: 120,
      },
      {
        accessorKey: "commercial_invoice_date",
        header: "Invoice Date",
        size: 120,
        Cell: ({ cell }) => safeDateFormatter(cell.getValue()),
      },
      {
        accessorKey: "commercial_invoice_value",
        header: "Invoice Value",
        size: 120,
      },
      {
        accessorKey: "shipping_bill_number",
        header: "SB Number",
        size: 120,
      },
      {
        accessorKey: "shipping_bill_date",
        header: "SB Date",
        size: 120,
        Cell: ({ cell }) => safeDateFormatter(cell.getValue()),
      },
      {
        accessorKey: "total_packages",
        header: "No of Packages",
        size: 120,
      },
      {
        accessorKey: "net_weight_kg",
        header: "Net Weight Kgs",
        size: 130,
      },
      {
        accessorKey: "gross_weight_kg",
        header: "Gross Weight Kgs",
        size: 140,
      },
      {
        accessorKey: "container_placement_date_factory",
        header: "Container Placement",
        size: 160,
        Cell: ({ cell }) => safeDateFormatter(cell.getValue()),
      },
      {
        accessorKey: "original_docs_received_date",
        header: "Original Docs Received",
        size: 180,
        Cell: ({ cell }) => safeDateFormatter(cell.getValue()),
      },
      {
        accessorKey: "gate_in_thar_khodiyar_date",
        header: "Gate In Thar/Khodiyar",
        size: 180,
        Cell: ({ cell }) => safeDateFormatter(cell.getValue()),
      },
      {
        accessorKey: "hand_over_date",
        header: "Hand Over Date",
        size: 140,
        Cell: ({ cell }) => safeDateFormatter(cell.getValue()),
      },
      {
        accessorKey: "rail_out_date_plan",
        header: "Rail Out Plan",
        size: 140,
        Cell: ({ cell }) => safeDateFormatter(cell.getValue()),
      },
      {
        accessorKey: "rail_out_date_actual",
        header: "Rail Out Actual",
        size: 150,
        Cell: ({ cell }) => safeDateFormatter(cell.getValue()),
      },
      {
        accessorKey: "port_gate_in_date",
        header: "Port Gate In",
        size: 140,
        Cell: ({ cell }) => safeDateFormatter(cell.getValue()),
      },
      {
        accessorKey: "tracking_remarks",
        header: "Remarks",
        size: 250,
      },
      {
        id: "actions",
        header: "Actions",
        size: 120,
        enableColumnFilter: false,
        enableSorting: false,
        Cell: ({ row }) => (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <IconButton
              size="small"
              color="info"
              onClick={(e) => {
                e.stopPropagation();
                handleViewClick(row.original);
              }}
            >
              <Visibility fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                handleEditClick(row.original);
              }}
            >
              <Edit fontSize="small" />
            </IconButton>
            {status === "Pending" && (
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(row.original);
                }}
              >
                <Delete fontSize="small" />
              </IconButton>
            )}
          </Box>
        ),
      },
    ],
    [status]
  );

  const table = useMaterialReactTable({
    columns,
    data: jobs,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enablePagination: false,
    enableBottomToolbar: false,
    enableDensityToggle: false,
    enableRowVirtualization: true,
    rowVirtualizerOptions: { overscan: 8 },
    initialState: {
      density: "compact",
      columnPinning: { left: ["job_no", "exporter_name"] },
    },
    enableGlobalFilter: false,
    enableGrouping: true,
    enableColumnFilters: false,
    enableColumnActions: false,
    enableStickyHeader: true,
    enablePinning: true,
    muiTableContainerProps: {
      sx: { maxHeight: "590px", overflowY: "auto" },
    },
    muiTableBodyRowProps: ({ row }) => ({
      onClick: (event) => {
        // Don't trigger row click if clicking on action buttons
        if (!event.target.closest(".MuiIconButton-root")) {
          handleViewClick(row.original);
        }
      },
      sx: {
        cursor: "pointer",
        "&:hover": {
          backgroundColor: "#f5f5f5",
        },
      },
    }),
    muiTableHeadCellProps: {
      sx: {
        position: "sticky",
        top: 0,
        zIndex: 1,
        backgroundColor: "#f5f5f5",
        fontWeight: "bold",
      },
    },
    state: {
      isLoading: loading,
    },
    renderTopToolbarCustomActions: () => (
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          padding: "16px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
          {status} Jobs: {totalCount}
        </Typography>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {years.length > 0 && (
            <TextField
              select
              size="small"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              sx={{ width: "120px" }}
            >
              <MenuItem value="all">All Years</MenuItem>
              {years.map((year, index) => (
                <MenuItem key={`year-${year}-${index}`} value={year}>
                  {year}
                </MenuItem>
              ))}
            </TextField>
          )}

          <Autocomplete
            sx={{ width: "250px" }}
            freeSolo
            options={exporterNames.map((option) => option.label)}
            value={selectedExporter}
            onInputChange={(event, newValue) => setSelectedExporter(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                size="small"
                fullWidth
                label="Select Exporter"
              />
            )}
          />

          <FormControl size="small" sx={{ width: "150px" }}>
            <InputLabel>Movement Type</InputLabel>
            <Select
              value={selectedMovementType}
              label="Movement Type"
              onChange={(e) => setSelectedMovementType(e.target.value)}
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="FCL">FCL</MenuItem>
              <MenuItem value="LCL">LCL</MenuItem>
              <MenuItem value="Break Bulk">Break Bulk</MenuItem>
              <MenuItem value="Air Freight">Air Freight</MenuItem>
            </Select>
          </FormControl>

          <SearchInput
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            fetchJobs={fetchJobs}
          />

          <IconButton onClick={() => console.log("Download clicked")}>
            <DownloadIcon />
          </IconButton>
        </Box>
      </Box>
    ),
  });

  return (
    <Box sx={{ width: "100%" }}>
      <MaterialReactTable table={table} />
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
