import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  IconButton,
  TextField,
  Typography,
  MenuItem,
  Button,
  Box,
  Checkbox,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  Paper,
  Tabs,
  Tab,
  Snackbar,
  Card,
  CardContent,
  Divider,
  Grid,
  Chip,
  Autocomplete,
} from "@mui/material";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import { UserContext } from "../../../contexts/UserContext";
import useExportJobDetails from "../../../customHooks/useExportJobDetails.js";
import ExchangeRateTab from "./ExchangeRateTab.js";
import ShipmentTab from "./ShipmentTab";
import axios from "axios";

//IMport of tabs
import FinancialTab from "./FinancialTab.js";

//IMport of tabs
import GeneralTab from "./GeneralTab"; // Adjust path as needed
import ContainerTab from "./ContainerTab";
import InvoiceTab from "./InvoiceTab";
import ProductTab from "./ProductTab.js";
import TrackingCompletedTab from "./TrackingCompletedTab.js";
import ChargesTab from "./ChargesTab.js";
import ESanchitTab from "./EsanchitTab.js";
import ExportChecklistGenerator from "./ExportChecklistGenerator.js";

// Enhanced Editable Header Component
const LogisysEditableHeader = ({ formik, onUpdate, directories }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [snackbar, setSnackbar] = useState(false);

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    setSnackbar(true);
    setTimeout(() => setSnackbar(false), 2000);
  };

  const handleSave = async () => {
    if (onUpdate) {
      await onUpdate(formik.values);
    }
    setIsEditing(false);
  };

  const handleFieldChange = (event) => {
    formik.handleChange(event);
  };

  // Enhanced dropdown options with directory integration
  const getShipperOptions = () => {
    return (
      directories?.exporters?.map((exp) => ({
        label: `${exp.organization} (${exp.registrationDetails?.ieCode})`,
        value: exp.organization,
        data: exp,
      })) || []
    );
  };

  const getCustomHouseOptions = () => [
    { value: "ICD SACHANA", label: "ICD SACHANA" },
    { value: "JNPT", label: "JNPT" },
    { value: "Chennai Port", label: "Chennai Port" },
    { value: "Cochin Port", label: "Cochin Port" },
  ];

  return (
    <Card
      sx={{
        mb: 2,
        backgroundColor: "#f5f7fa",
        border: "1px solid #e0e0e0",
        borderRadius: "4px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}
    >
      <CardContent sx={{ pb: "16px !important" }}>
        {/* Task Status Bar */}
        <Box
          sx={{
            backgroundColor: "#e3f2fd",
            p: 1,
            borderRadius: 1,
            mb: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="subtitle2" fontWeight="bold">
            Task - Update
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            {/* <Typography variant="body2" color="text.secondary">
              59 mins left ⚡ Active
            </Typography> */}
            <Button
              size="small"
              variant={isEditing ? "contained" : "outlined"}
              onClick={() => setIsEditing(!isEditing)}
              color={isEditing ? "secondary" : "primary"}
            >
              {isEditing ? "Cancel" : "Edit"}
            </Button>
            {isEditing && (
              <Button
                size="small"
                variant="contained"
                color="primary"
                onClick={handleSave}
              >
                Save
              </Button>
            )}
          </Box>
        </Box>

        {/* Main Header Fields - Row 1 */}
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} md={2}>
            <Typography
              variant="caption"
              display="block"
              color="text.secondary"
              sx={{ mb: 0.5 }}
            >
              Job Number
            </Typography>
            <Box display="flex" alignItems="center" gap={0.5}>
              {isEditing ? (
                <TextField
                  size="small"
                  value={formik.values.job_no}
                  onChange={handleFieldChange}
                  name="job_no"
                  fullWidth
                  sx={{
                    "& .MuiInputBase-input": {
                      fontSize: "0.875rem",
                      padding: "4px 8px",
                    },
                  }}
                />
              ) : (
                <>
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    sx={{
                      cursor: "pointer",
                      color: "blue",
                      textDecoration: "underline",
                    }}
                    onClick={() => handleCopyText(formik.values.job_no)}
                  >
                    {formik.values.job_no}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleCopyText(formik.values.job_no)}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </>
              )}
            </Box>
          </Grid>

          <Grid item xs={12} md={1.5}>
            <Typography
              variant="caption"
              display="block"
              color="text.secondary"
              sx={{ mb: 0.5 }}
            >
              Job Date
            </Typography>
            {isEditing ? (
              <TextField
                type="date"
                size="small"
                fullWidth
                value={formik.values.job_date}
                onChange={handleFieldChange}
                name="job_date"
                sx={{
                  "& .MuiInputBase-input": {
                    fontSize: "0.875rem",
                    padding: "4px 8px",
                  },
                }}
                InputLabelProps={{ shrink: true }}
              />
            ) : (
              <Typography variant="body2">
                {formik.values.job_date || "15-Sep-2025"}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} md={2}>
            <Typography
              variant="caption"
              display="block"
              color="text.secondary"
              sx={{ mb: 0.5 }}
            >
              Job Received On
            </Typography>
            {isEditing ? (
              <TextField
                type="datetime-local"
                size="small"
                fullWidth
                value={formik.values.job_received_on}
                onChange={handleFieldChange}
                name="job_received_on"
                sx={{
                  "& .MuiInputBase-input": {
                    fontSize: "0.875rem",
                    padding: "4px 8px",
                  },
                }}
                InputLabelProps={{ shrink: true }}
              />
            ) : (
              <Typography variant="body2">
                {formik.values.job_received_on || "15-Sep-2025 10:45"}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} md={1.5}>
            <Typography
              variant="caption"
              display="block"
              color="text.secondary"
              sx={{ mb: 0.5 }}
            >
              SB No
            </Typography>
            {isEditing ? (
              <TextField
                size="small"
                fullWidth
                value={formik.values.sb_no}
                onChange={handleFieldChange}
                name="sb_no"
                sx={{
                  "& .MuiInputBase-input": {
                    fontSize: "0.875rem",
                    padding: "4px 8px",
                  },
                }}
              />
            ) : (
              <Typography variant="body2" fontWeight="bold" color="primary">
                {formik.values.sb_no || "5296776"}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} md={2}>
            <Typography
              variant="caption"
              display="block"
              color="text.secondary"
              sx={{ mb: 0.5 }}
            >
              Job Owner
            </Typography>
            {isEditing ? (
              <FormControl size="small" fullWidth>
                <Select
                  value={formik.values.job_owner}
                  onChange={handleFieldChange}
                  name="job_owner"
                  sx={{
                    "& .MuiSelect-select": {
                      fontSize: "0.875rem",
                      padding: "4px 8px",
                    },
                  }}
                >
                  <MenuItem value="Jyothish K R">Jyothish K R</MenuItem>
                  <MenuItem value="Karan Mis">Karan Mis</MenuItem>
                  <MenuItem value="Yash">Yash</MenuItem>
                </Select>
              </FormControl>
            ) : (
              <Typography variant="body2">
                {formik.values.job_owner || "Jyothish K R"}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} md={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <Button
                variant="outlined"
                size="small"
                sx={{ fontSize: "0.75rem" }}
              >
                Standard Documents
              </Button>
            </Box>
          </Grid>
        </Grid>

        {/* Header Fields - Row 2 */}
        <Grid container spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
          <Grid item xs={12} md={1.5}>
            <Typography
              variant="caption"
              display="block"
              color="text.secondary"
              sx={{ mb: 0.5 }}
            >
              Filing Mode
            </Typography>
            {isEditing ? (
              <FormControl size="small" fullWidth>
                <Select
                  value={formik.values.filing_mode}
                  onChange={handleFieldChange}
                  name="filing_mode"
                  sx={{
                    "& .MuiSelect-select": {
                      fontSize: "0.875rem",
                      padding: "4px 8px",
                    },
                  }}
                >
                  <MenuItem value="ICEGATE">ICEGATE</MenuItem>
                  <MenuItem value="Manual">Manual</MenuItem>
                </Select>
              </FormControl>
            ) : (
              <Typography variant="body2">
                {formik.values.filing_mode || "ICEGATE"}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} md={2}>
            <Typography
              variant="caption"
              display="block"
              color="text.secondary"
              sx={{ mb: 0.5 }}
            >
              Shipper
            </Typography>
            {isEditing ? (
              <Autocomplete
                size="small"
                options={getShipperOptions()}
                value={formik.values.shipper}
                onChange={(event, newValue) => {
                  formik.setFieldValue("shipper", newValue?.value || "");
                  if (newValue?.data) {
                    // Auto-populate related fields from directory
                    formik.setFieldValue(
                      "exporter_name",
                      newValue.data.organization
                    );
                    formik.setFieldValue(
                      "ie_code_no",
                      newValue.data.registrationDetails?.ieCode
                    );
                    formik.setFieldValue(
                      "exporter_address",
                      newValue.data.address?.addressLine
                    );
                  }
                }}
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    name="shipper"
                    sx={{
                      "& .MuiInputBase-input": {
                        fontSize: "0.875rem",
                        padding: "4px 8px",
                      },
                    }}
                  />
                )}
              />
            ) : (
              <Typography variant="body2">
                {formik.values.shipper || "RAJANSFPL"}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} md={1.5}>
            <Typography
              variant="caption"
              display="block"
              color="text.secondary"
              sx={{ mb: 0.5 }}
            >
              Transport Mode
            </Typography>
            {isEditing ? (
              <FormControl size="small" fullWidth>
                <Select
                  value={formik.values.transportMode}
                  onChange={handleFieldChange}
                  name="transportMode"
                  sx={{
                    "& .MuiSelect-select": {
                      fontSize: "0.875rem",
                      padding: "4px 8px",
                    },
                  }}
                >
                  <MenuItem value="Sea">Sea</MenuItem>
                  <MenuItem value="Air">Air</MenuItem>
                  <MenuItem value="Land">Land</MenuItem>
                </Select>
              </FormControl>
            ) : (
              <Typography variant="body2">
                {formik.values.transportMode || "Sea"}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} md={2}>
            <Typography
              variant="caption"
              display="block"
              color="text.secondary"
              sx={{ mb: 0.5 }}
            >
              Custom House
            </Typography>
            {isEditing ? (
              <Autocomplete
                size="small"
                options={getCustomHouseOptions()}
                value={formik.values.custom_house}
                onChange={(event, newValue) => {
                  formik.setFieldValue("custom_house", newValue?.value || "");
                }}
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    name="custom_house"
                    sx={{
                      "& .MuiInputBase-input": {
                        fontSize: "0.875rem",
                        padding: "4px 8px",
                      },
                    }}
                  />
                )}
              />
            ) : (
              <Typography variant="body2">
                {formik.values.custom_house || "ICD SACHANA"}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} md={1.5}>
            <Typography
              variant="caption"
              display="block"
              color="text.secondary"
              sx={{ mb: 0.5 }}
            >
              Consignment Type
            </Typography>
            {isEditing ? (
              <FormControl size="small" fullWidth>
                <Select
                  value={formik.values.consignment_type}
                  onChange={handleFieldChange}
                  name="consignment_type"
                  sx={{
                    "& .MuiSelect-select": {
                      fontSize: "0.875rem",
                      padding: "4px 8px",
                    },
                  }}
                >
                  <MenuItem value="FCL">FCL</MenuItem>
                  <MenuItem value="LCL">LCL</MenuItem>
                  <MenuItem value="Break Bulk">Break Bulk</MenuItem>
                </Select>
              </FormControl>
            ) : (
              <Typography variant="body2">
                {formik.values.consignment_type || "FCL"}
              </Typography>
            )}
          </Grid>
        </Grid>

        {/* Header Fields - Row 3 */}
        <Grid container spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
          <Grid item xs={12} md={2}>
            <Typography
              variant="caption"
              display="block"
              color="text.secondary"
              sx={{ mb: 0.5 }}
            >
              Loading Port
            </Typography>
            {isEditing ? (
              <Autocomplete
                size="small"
                options={getCustomHouseOptions()}
                value={formik.values.loading_port}
                onChange={(event, newValue) => {
                  formik.setFieldValue("loading_port", newValue?.value || "");
                }}
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    name="loading_port"
                    sx={{
                      "& .MuiInputBase-input": {
                        fontSize: "0.875rem",
                        padding: "4px 8px",
                      },
                    }}
                  />
                )}
              />
            ) : (
              <Typography variant="body2">
                {formik.values.loading_port || "ICD SACHANA"}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} md={2}>
            <Typography
              variant="caption"
              display="block"
              color="text.secondary"
              sx={{ mb: 0.5 }}
            >
              SB Type
            </Typography>
            {isEditing ? (
              <FormControl size="small" fullWidth>
                <Select
                  value={formik.values.sb_type}
                  onChange={handleFieldChange}
                  name="sb_type"
                  sx={{
                    "& .MuiSelect-select": {
                      fontSize: "0.875rem",
                      padding: "4px 8px",
                    },
                  }}
                >
                  <MenuItem value="Green - Drawback">Green - Drawback</MenuItem>
                  <MenuItem value="Green - RODTEP">Green - RODTEP</MenuItem>
                  <MenuItem value="Yellow">Yellow</MenuItem>
                  <MenuItem value="Red">Red</MenuItem>
                </Select>
              </FormControl>
            ) : (
              <Chip
                label={formik.values.sb_type || "Green - Drawback"}
                color="success"
                size="small"
                sx={{
                  backgroundColor: "#4caf50",
                  color: "white",
                  fontSize: "0.75rem",
                }}
              />
            )}
          </Grid>

          {/* <Grid item xs={12} md={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" sx={{ 
                backgroundColor: "#fff3cd", 
                color: "#856404",
                px: 1, 
                py: 0.5, 
                borderRadius: 1,
                fontSize: "0.75rem"
              }}>
                🟡 Ready for Billing
              </Typography>
            </Box>
          </Grid> */}
        </Grid>

        <Snackbar
          open={snackbar}
          message="Copied to clipboard"
          autoHideDuration={2000}
          onClose={() => setSnackbar(false)}
        />
      </CardContent>
    </Card>
  );
};

// Enhanced Entity Tab
const EntityTab = ({ formik, directories }) => {
  const [selectedExporter, setSelectedExporter] = useState(null);

  const getExporterOptions = () => {
    return (
      directories?.exporters?.map((exp) => ({
        label: `${exp.organization} - ${exp.generalInfo?.entityType}`,
        value: exp.organization,
        data: exp,
      })) || []
    );
  };

  const handleExporterChange = (event, newValue) => {
    if (newValue?.data) {
      setSelectedExporter(newValue.data);
      formik.setFieldValue("exporter_name", newValue.data.organization);
      formik.setFieldValue(
        "exporter_address",
        `${newValue.data.address?.addressLine}, ${newValue.data.address?.postalCode}`
      );
      formik.setFieldValue(
        "branch_sno",
        newValue.data.branchInfo?.[0]?.branchCode || "0"
      );
      formik.setFieldValue(
        "state",
        newValue.data.branchInfo?.[0]?.state || "Gujarat"
      );
      formik.setFieldValue(
        "ie_code_no",
        newValue.data.registrationDetails?.ieCode
      );
      formik.setFieldValue(
        "gstin",
        newValue.data.registrationDetails?.gstinMainBranch
      );
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Entity Information
        </Typography>
        <Divider sx={{ mb: 3 }} />
      </Grid>

      {/* Exporter and Consignee sections using formik from hook */}
      <Grid item xs={12} md={6}>
        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Exporter Details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Exporter Name"
                name="exporter_name"
                value={formik.values.exporter_name}
                onChange={formik.handleChange}
                size="small"
              />
            </Grid>
            {/* Add more fields as needed */}
          </Grid>
        </Card>
      </Grid>
    </Grid>
  );
};

// Tab Panel Component
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`logisys-tabpanel-${index}`}
      aria-labelledby={`logisys-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Main Export View Job Component using the hook properly
function LogisysExportViewJob() {
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [fileSnackbar, setFileSnackbar] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [directories, setDirectories] = useState({});

  // 🔥 SINGLE SOURCE: Use ONLY the hook's formik - NO DUPLICATE!
  const {
    data,
    loading,
    formik, // ← This is the ONLY formik instance we use
    setData,
  } = useExportJobDetails(params, setFileSnackbar);

  // Fetch directories for dropdowns
  useEffect(() => {
    const fetchDirectories = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_STRING}/directory`
        );
        setDirectories({
          exporters: response.data.data || response.data,
          importers: [],
          banks: [],
        });
      } catch (error) {
        console.error("Error fetching directories:", error);
      }
    };

    fetchDirectories();
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <Typography>Loading export job details...</Typography>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          mt: 4,
        }}
      >
        <Typography variant="h6" color="error">
          Export job not found
        </Typography>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/export-dsr")}
          sx={{ mt: 2 }}
        >
          Back to Export List
        </Button>
      </Box>
    );
  }

  return (
    <>
      {/* Editable Job Header using the hook's formik */}
      <Box sx={{ mt: 2, mb: 2 }}>
        <LogisysEditableHeader
          formik={formik} // ← Use formik from hook
          directories={directories}
        />
      </Box>

      {/* Main Tabs Interface */}
      <Paper sx={{ margin: "20px" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              "& .MuiTab-root": {
                minWidth: 60,
                fontSize: "0.75rem",
                fontWeight: 500,
                padding: "4px 8px",
                textTransform: "none",
              },
            }}
          >
            <Tab label="General" />
            <Tab label="Invoice" />
            <Tab label="Shipment" />
            <Tab label="Container" />
            <Tab label="Exch. Rate" />
            <Tab label="Products" />
            <Tab label="Charges" />
            <Tab label="Financial" />
            <Tab label="Tracking Completed" />
            <Tab label="ESanchit" />
          </Tabs>
        </Box>

        {/* Tab Content using the hook's formik */}
        <TabPanel value={activeTab} index={0}>
          <GeneralTab
            formik={formik}
            directories={directories}
            params={params}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <ShipmentTab
            formik={formik}
            directories={directories}
            params={params}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <InvoiceTab
            formik={formik}
            directories={directories}
            params={params}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <ContainerTab formik={formik} />
        </TabPanel>
        <TabPanel value={activeTab} index={4}>
          <ExchangeRateTab formik={formik} />
        </TabPanel>

        <TabPanel value={activeTab} index={5}>
          <ProductTab formik={formik} />
        </TabPanel>

        <TabPanel value={activeTab} index={7}>
          <FinancialTab formik={formik} />
        </TabPanel>

        <TabPanel value={activeTab} index={9}>
          <ESanchitTab formik={formik} />
        </TabPanel>

        <TabPanel value={activeTab} index={6}>
          <ChargesTab formik={formik} />
        </TabPanel>

        <TabPanel value={activeTab} index={8}>
          <TrackingCompletedTab formik={formik} />
        </TabPanel>

        {/* Action Buttons */}
        <Box sx={{ p: 3, display: "flex", gap: 2, justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            size="small"
            onClick={formik.handleSubmit} // ← Use hook's formik
          >
            Update Job
          </Button>
          <Button variant="outlined" size="small" color="error">
            Close
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={fileSnackbar}
        message="Export job updated successfully!"
        autoHideDuration={3000}
        onClose={() => setFileSnackbar(false)}
      />
      <ExportChecklistGenerator jobNo={formik.values.job_no} />
    </>
  );
}

export default LogisysExportViewJob;
