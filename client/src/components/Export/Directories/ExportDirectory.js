import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TablePagination,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Toolbar,
  Avatar,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Business as BusinessIcon,
  AccountBalance as BankIcon,
  Description as DocumentIcon,
  LocationOn as LocationIcon,
  Assignment as AssignmentIcon,
} from "@mui/icons-material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import DirectoryForm from "./DirectoryForm.js";
import DirectoryService from "../Directories/DirectoryService";
import { formatDate } from "../../../utils/dateUtils";

// Professional Logistics Theme
const logisticsTheme = createTheme({
  palette: {
    primary: { main: "#2c5aa0", light: "#5a7bc4", dark: "#1e3a6f" },
    secondary: { main: "#ff6b35", light: "#ff8a65", dark: "#e64a19" },
    background: { default: "#f5f7fa", paper: "#ffffff" },
    text: { primary: "#2c3e50", secondary: "#546e7a" },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 600, color: "#2c3e50" },
    h6: { fontWeight: 500, color: "#34495e" },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: { boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderRadius: 8 },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: { borderRadius: 6, textTransform: "none", fontWeight: 500 },
      },
    },
    MuiTableHead: { styleOverrides: { root: { backgroundColor: "#f8fafc" } } },
  },
});

// Directory Listing Table Columns (Compact, dense structure)
const TABLE_COLUMNS = [
  { key: "organization", label: "Organization", minWidth: 200 },
  { key: "approvalStatus", label: "Status", minWidth: 100 },
  { key: "entityType", label: "Company Type", minWidth: 120 },
  { key: "ieCode", label: "IE Code", minWidth: 120 },
  { key: "adCode", label: "AD Code", minWidth: 120 },
  { key: "panNo", label: "PAN", minWidth: 110 },
  { key: "createdAt", label: "Created", minWidth: 100 },
  { key: "actions", label: "Actions", minWidth: 120, align: "center" },
];

// Helper - Color for Approval Status
const getStatusColor = (status) =>
  ({
    Approved: "success",
    Rejected: "error",
    Pending: "warning",
  })[status] || "info";

// Helper - Entity Type Icon
const getEntityIcon = (entityType) => {
  switch (entityType) {
    case "Private Limited":
    case "Public Limited":
      return <BusinessIcon sx={{ color: "#2c5aa0", fontSize: 20, mr: 0.5 }} />;
    case "Partnership":
    case "Partner":
      return (
        <AssignmentIcon sx={{ color: "#ff6b35", fontSize: 20, mr: 0.5 }} />
      );
    case "Proprietor":
      return <DocumentIcon sx={{ color: "#5a7bc4", fontSize: 20, mr: 0.5 }} />;
    default:
      return <BusinessIcon sx={{ color: "#5a7bc4", fontSize: 20, mr: 0.5 }} />;
  }
};

// Get first bank's AD Code
const getFirstAdCode = (bankDetails) => {
  if (!bankDetails || bankDetails.length === 0) return "-";
  return bankDetails[0]?.adCode || "-";
};

// Directory Detail View (Dialog)
const DirectoryDetailView = ({ directory }) => (
  <Box sx={{ p: 2 }}>
    <Grid container spacing={3}>
      {/* Header Card */}
      <Grid item xs={12}>
        <Paper
          sx={{
            background: "linear-gradient(135deg, #2c5aa0 0%, #1e3a6f 100%)",
            p: 2,
            color: "white",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              sx={{ bgcolor: "rgba(255,255,255,0.2)", width: 56, height: 56 }}
            >
              <BusinessIcon fontSize="large" sx={{ color: "white" }} />
            </Avatar>
            <Box>
              <Typography variant="h5" color="white">
                {directory.organization}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, color: "white" }}>
                {directory.generalInfo?.entityType || "-"}
              </Typography>
              <Chip
                label={directory.approvalStatus}
                sx={{
                  mt: 1,
                  bgcolor:
                    directory.approvalStatus === "Approved"
                      ? "rgba(76, 175, 80, 0.9)"
                      : directory.approvalStatus === "Rejected"
                        ? "rgba(244, 67, 54, 0.9)"
                        : "rgba(255, 193, 7, 0.9)",
                  color: "white",
                  fontWeight: 600,
                }}
              />
            </Box>
          </Box>
        </Paper>
      </Grid>

      {/* Quick Stats */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          <Grid item xs={3}>
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <DocumentIcon color="primary" sx={{ fontSize: 32, mb: 0.5 }} />
              <Typography variant="h6">
                {directory.registrationDetails?.ieCode || "N/A"}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                IE Code
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={3}>
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <BankIcon color="primary" sx={{ fontSize: 32, mb: 0.5 }} />
              <Typography variant="h6">
                {directory.bankDetails?.length || 0}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Bank Accounts
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={3}>
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <LocationIcon color="primary" sx={{ fontSize: 32, mb: 0.5 }} />
              <Typography variant="h6">
                {directory.branchInfo?.length || 0}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Branches
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={3}>
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <AssignmentIcon color="primary" sx={{ fontSize: 32, mb: 0.5 }} />
              <Typography variant="h6">
                {directory.registrationDetails?.panNo || "N/A"}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                PAN Number
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Grid>

      {/* Detailed - Company Info */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ mb: 1 }}>
            <Typography variant="h6" color="primary">
              Company Information
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Organization:</strong> {directory.organization}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Company Type:</strong>{" "}
              {directory.generalInfo?.entityType || "-"}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Exporter Type:</strong>{" "}
              {directory.generalInfo?.exporterType || "-"}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Shipper/Consignee:</strong>{" "}
              {directory.generalInfo?.shipperConsignee || "-"}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>IE Code:</strong>{" "}
              {directory.registrationDetails?.ieCode || "-"}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>PAN No:</strong>{" "}
              {directory.registrationDetails?.panNo || "-"}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>GSTIN:</strong>{" "}
              {directory.registrationDetails?.gstinMainBranch || "-"}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>MSME Registered:</strong>{" "}
              {directory.registrationDetails?.msmeRegistered ? "Yes" : "No"}
            </Typography>
          </Box>
        </Paper>
      </Grid>

      {/* Detailed - Branch Info */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ mb: 1 }}>
            <Typography variant="h6" color="primary">
              Branch Information
            </Typography>
            <Divider sx={{ my: 1 }} />
            {directory.branchInfo && directory.branchInfo.length > 0 ? (
              directory.branchInfo.map((branch, idx) => (
                <Box key={idx} sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Branch Name:</strong> {branch.branchName || "-"}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Branch Code:</strong> {branch.branchCode || "-"}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Address:</strong> {branch.address || "-"}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>City:</strong> {branch.city || "-"},{" "}
                    <strong>State:</strong> {branch.state || "-"}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Postal Code:</strong> {branch.postalCode || "-"}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Mobile:</strong> {branch.mobile || "-"}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Email:</strong> {branch.email || "-"}
                  </Typography>

                  {idx < directory.branchInfo.length - 1 && (
                    <Divider sx={{ my: 1 }} />
                  )}
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="textSecondary">
                No branch information available
              </Typography>
            )}
          </Box>
        </Paper>
      </Grid>

      {/* Detailed - Bank Info */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
            Banking Information
          </Typography>
          {directory.bankDetails && directory.bankDetails.length > 0 ? (
            directory.bankDetails.map((bank, idx) => (
              <Box key={idx} sx={{ mb: 2 }}>
                <Divider sx={{ mb: 1 }} />
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <strong>Bank:</strong> {bank.entityName || "-"}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <strong>Branch:</strong> {bank.branchLocation || "-"}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <strong>Account:</strong> {bank.accountNumber || "-"}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <strong>IFSC Code:</strong> {bank.ifscCode || "-"}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <strong>AD Code:</strong> {bank.adCode || "-"}
                    </Typography>
                    {bank.isDefault && (
                      <Chip
                        label="Default"
                        color="primary"
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Grid>
                </Grid>
              </Box>
            ))
          ) : (
            <Typography variant="body2" color="textSecondary">
              No banking information available
            </Typography>
          )}
        </Paper>
      </Grid>
    </Grid>
  </Box>
);

// Main Component
const ExportDirectory = () => {
  const [directories, setDirectories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDirectory, setSelectedDirectory] = useState(null);
  const [viewMode, setViewMode] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filteredDirectories, setFilteredDirectories] = useState([]);

  useEffect(() => {
    fetchDirectories();
  }, []);

  useEffect(() => {
    let filtered = directories;
    if (searchTerm) {
      filtered = filtered.filter(
        (dir) =>
          dir.organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          dir.registrationDetails?.ieCode
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          dir.registrationDetails?.panNo
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          dir.generalInfo?.entityType
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          // Search in bank details AD codes
          dir.bankDetails?.some((bank) =>
            bank.adCode?.toLowerCase().includes(searchTerm.toLowerCase()),
          ),
      );
    }
    if (statusFilter) {
      filtered = filtered.filter((dir) => dir.approvalStatus === statusFilter);
    }
    setFilteredDirectories(filtered);
    setPage(0);
  }, [directories, searchTerm, statusFilter]);

  const fetchDirectories = async () => {
    try {
      setLoading(true);
      const response = await DirectoryService.getAll({ limit: 1000 });
      setDirectories(response.data);
    } catch (error) {
      showSnackbar("Error fetching directories", "error");
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleChangePage = (event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleAdd = () => {
    setSelectedDirectory(null);
    setViewMode(false);
    setOpenDialog(true);
  };

  const handleEdit = (directory) => {
    setSelectedDirectory(directory);
    setViewMode(false);
    setOpenDialog(true);
  };

  const handleView = (directory) => {
    setSelectedDirectory(directory);
    setViewMode(true);
    setOpenDialog(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this directory?")) {
      try {
        await DirectoryService.delete(id);
        showSnackbar("Directory deleted successfully");
        fetchDirectories();
      } catch (error) {
        showSnackbar("Error deleting directory", "error");
      }
    }
  };

  const handleSave = async (formData) => {
    try {
      if (selectedDirectory) {
        await DirectoryService.update(selectedDirectory._id, formData);
        showSnackbar("Directory updated successfully");
      } else {
        await DirectoryService.create(formData);
        showSnackbar("Directory created successfully");
      }
      setOpenDialog(false);
      fetchDirectories();
    } catch (error) {
      showSnackbar("Error saving directory", "error");
    }
  };

  const paginatedDirectories = filteredDirectories.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  return (
    <ThemeProvider theme={logisticsTheme}>
      <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
        <Container maxWidth="xxl" sx={{ py: 4 }}>
          {/* Header */}
          <Paper
            sx={{
              mb: 3,
              background: "linear-gradient(135deg, #2c5aa0 0%, #1e3a6f 100%)",
            }}
          >
            <Toolbar sx={{ color: "white", py: 2 }}>
              <BusinessIcon sx={{ mr: 2, fontSize: 32 }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h4" component="h1" color="white">
                  Export Directory Management
                </Typography>
                <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                  Comprehensive logistics directory system
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAdd}
                sx={{
                  bgcolor: "rgba(255,255,255,0.2)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                }}
              >
                Add Directory
              </Button>
            </Toolbar>
          </Paper>

          {/* Search & Filter Controls */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={5}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search organizations, IE codes, PAN, AD codes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="">All Status</MenuItem>
                    <MenuItem value="Pending">Pending</MenuItem>
                    <MenuItem value="Approved">Approved</MenuItem>
                    <MenuItem value="Rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="h6" color="primary">
                    {filteredDirectories.length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Directories
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Directory Table - Compact, Professional, Dense */}
          <Paper>
            <TableContainer sx={{ maxHeight: "70vh" }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {TABLE_COLUMNS.map((col) => (
                      <TableCell
                        key={col.key}
                        sx={{ fontWeight: 600, minWidth: col.minWidth }}
                        align={col.align || "left"}
                      >
                        {col.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={TABLE_COLUMNS.length}
                        align="center"
                        sx={{ py: 4 }}
                      >
                        Loading directories...
                      </TableCell>
                    </TableRow>
                  ) : paginatedDirectories.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={TABLE_COLUMNS.length}
                        align="center"
                        sx={{ py: 4 }}
                      >
                        <Box sx={{ textAlign: "center" }}>
                          <BusinessIcon
                            sx={{
                              fontSize: 48,
                              color: "text.secondary",
                              mb: 2,
                            }}
                          />
                          <Typography variant="h6" color="textSecondary">
                            No directories found
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Try adjusting your search filters
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedDirectories.map((directory) => (
                      <TableRow
                        key={directory._id}
                        hover
                        sx={{
                          "&:hover": { bgcolor: "rgba(44,90,160,0.05)" },
                          height: 48,
                        }}
                      >
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            {getEntityIcon(directory.generalInfo?.entityType)}
                            <Box>
                              <Typography variant="body2" fontWeight={500}>
                                {directory.organization}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="textSecondary"
                              >
                                {directory.generalInfo?.exporterType || "-"}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={directory.approvalStatus}
                            color={getStatusColor(directory.approvalStatus)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {directory.generalInfo?.entityType || "-"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {directory.registrationDetails?.ieCode || "-"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {getFirstAdCode(directory.bankDetails)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {directory.registrationDetails?.panNo || "-"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {directory.createdAt
                              ? formatDate(directory.createdAt)
                              : "-"}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "center",
                              gap: 0.5,
                            }}
                          >
                            <IconButton
                              onClick={() => handleView(directory)}
                              size="small"
                              title="View"
                              color="primary"
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              onClick={() => handleEdit(directory)}
                              size="small"
                              title="Edit"
                              color="info"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              onClick={() => handleDelete(directory._id)}
                              size="small"
                              title="Delete"
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={filteredDirectories.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{ borderTop: 1, borderColor: "divider" }}
            />
          </Paper>

          {/* Directory Dialog */}
          <Dialog
            open={openDialog}
            onClose={() => setOpenDialog(false)}
            maxWidth="xl"
            fullWidth
          >
            <DialogTitle
              sx={{ bgcolor: "primary.main", color: "white", pb: 1 }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <BusinessIcon />
                {viewMode
                  ? "View Directory"
                  : selectedDirectory
                    ? "Edit Directory"
                    : "Add Directory"}
              </Box>
            </DialogTitle>
            <DialogContent sx={{ p: 0 }}>
              {viewMode && selectedDirectory ? (
                <DirectoryDetailView directory={selectedDirectory} />
              ) : (
                <DirectoryForm
                  directory={selectedDirectory}
                  onSave={handleSave}
                  onCancel={() => setOpenDialog(false)}
                  readOnly={viewMode}
                />
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setOpenDialog(false)}>Close</Button>
            </DialogActions>
          </Dialog>

          {/* Snackbar */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
          >
            <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default ExportDirectory;
