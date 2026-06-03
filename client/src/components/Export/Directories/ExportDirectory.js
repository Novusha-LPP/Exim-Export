import React, { useState, useEffect } from "react";
import {
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
  FileDownload as FileDownloadIcon,
  Email as EmailIcon,
} from "@mui/icons-material";
import DirectoryForm from "./DirectoryForm.js";
import axios from "axios"; // For testing API call
import DirectoryService from "../Directories/DirectoryService";
import { formatDate } from "../../../utils/dateUtils";


// Directory Listing Table Columns (Compact, dense structure)
const TABLE_COLUMNS = [
  { key: "organization", label: "Organization", minWidth: 200 },
  { key: "approvalStatus", label: "Status", minWidth: 100 },
  { key: "gstNo", label: "GST Number", minWidth: 160 },
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

// Get first branch's GST Number
const getFirstGstNo = (branchInfo) => {
  if (!branchInfo || branchInfo.length === 0) return "-";
  return branchInfo[0]?.gstNo || "-";
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
                    <strong>Branch {idx + 1}:</strong> {branch.branchName || "-"} (Code: {branch.branchCode || "-"})
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>GST No:</strong> {branch.gstNo || "-"}
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

  const handleTestEmail = async (directory) => {
    try {
      showSnackbar(`Sending test DSR email for ${directory.organization}...`, "info");
      const response = await axios.post(`${import.meta.env.VITE_API_STRING}/export-dsr/test-dsr-email`, {
        exporterName: directory.organization
      });
      if (response.data.success) {
        showSnackbar(response.data.message, "success");
      } else {
        showSnackbar("Failed to send test email: " + (response.data.message || "Unknown error"), "error");
      }
    } catch (error) {
      console.error("Test email error:", error);
      showSnackbar("Error sending test email: " + (error.response?.data?.message || error.message), "error");
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

  // Export to Excel
  const handleExportToExcel = () => {
    const headers = ["Exporter Name", "GST Number", "IE Code", "AD Code", "PAN"];
    const rows = filteredDirectories.map((dir) => [
      dir.organization || "-",
      getFirstGstNo(dir.branchInfo),
      dir.registrationDetails?.ieCode || "-",
      getFirstAdCode(dir.bankDetails),
      dir.registrationDetails?.panNo || "-",
    ]);

    // Build CSV
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Export_Directory_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showSnackbar(`Exported ${rows.length} directories to Excel`, "success");
  };

  const paginatedDirectories = filteredDirectories.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  return (
    <Box>
      <Paper sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, gap: 2 }}>
        {/* Search */}
        <TextField
          size="small"
          placeholder="Search organizations, IE codes, PAN, AD codes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flexGrow: 1, maxWidth: 400 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />

        {/* Status Filter */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
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

        {/* Count */}
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {filteredDirectories.length} record{filteredDirectories.length !== 1 ? 's' : ''}
        </Typography>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportToExcel}
            size="small"
          >
            Export CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            size="small"
          >
            Add Directory
          </Button>
        </Box>
      </Paper>

      {/* Directory Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: "70vh" }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {TABLE_COLUMNS.map((col) => (
                  <TableCell
                    key={col.key}
                    sx={{ fontWeight: 600, minWidth: col.minWidth, background: '#f5f5f5' }}
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
                    <BusinessIcon
                      sx={{
                        fontSize: 48,
                        color: "text.secondary",
                        mb: 2,
                        display: 'block',
                        mx: 'auto',
                      }}
                    />
                    <Typography variant="h6" color="textSecondary">
                      No directories found
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Try adjusting your search filters
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDirectories.map((directory) => (
                  <TableRow
                    key={directory._id}
                    hover
                    sx={{
                      "&:hover": { bgcolor: "rgba(0,0,0,0.02)" },
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
                      <Typography variant="body2" fontFamily="monospace">
                        {getFirstGstNo(directory.branchInfo)}
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
                            onClick={() => handleTestEmail(directory)}
                            size="small"
                            title="Send Test DSR Email"
                            color="secondary"
                          >
                            <EmailIcon fontSize="small" />
                          </IconButton>
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
        <DialogTitle>
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
    </Box>
  );
};

export default ExportDirectory;
