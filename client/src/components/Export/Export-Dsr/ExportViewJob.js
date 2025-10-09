import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Stack,
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
import FinancialTab from "./FinancialTab.js";
import GeneralTab from "./GeneralTab";
import ContainerTab from "./ContainerTab";
import InvoiceTab from "./InvoiceTab";
import ProductTab from "./ProductTab.js";
import TrackingCompletedTab from "./TrackingCompletedTab.js";
import ChargesTab from "./ChargesTab.js";
import ESanchitTab from "./EsanchitTab.js";
import ExportChecklistGenerator from "./ExportChecklistGenerator.js";

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
        mb: 3,
        background: "linear-gradient(90deg,#f7fafc 85%, #e3f2fd 100%)",
        border: "1.5px solid #e3e7ee",
        borderRadius: 2,
        boxShadow: "0 2px 6px 0 rgba(60,72,100,0.10)",
        px: 3,
      }}
    >
      <CardContent sx={{ pb: 0 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Typography variant="subtitle1" fontWeight="bold" color="primary">
            Export Job Overview
          </Typography>
          <Stack direction="row" spacing={1}>
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
          </Stack>
        </Stack>

        <Divider sx={{ my: 1 }} />

        {/* Grouped Fields */}
        <Grid container spacing={2} sx={{ mt: 1 }} alignItems="center">
          <Grid item xs={12} sm={4} md={2.2}>
            <Typography variant="caption" color="text.secondary">
              Job Number
            </Typography>
            <Box display="flex" alignItems="center">
              {isEditing ? (
                <TextField
                  size="small"
                  value={formik.values.job_no}
                  name="job_no"
                  onChange={handleFieldChange}
                  fullWidth
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <>
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    sx={{
                      cursor: "pointer",
                      color: "#1769aa",
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

          <Grid item xs={6} sm={3} md={1.7}>
            <Typography variant="caption" color="text.secondary">
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
                sx={{ mt: 0.5 }}
                InputLabelProps={{ shrink: true }}
              />
            ) : (
              <Typography variant="body2">
                {formik.values.job_date || "15-Sep-2025"}
              </Typography>
            )}
          </Grid>

          <Grid item xs={6} sm={4} md={2.3}>
            <Typography variant="caption" color="text.secondary">
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
                sx={{ mt: 0.5 }}
                InputLabelProps={{ shrink: true }}
              />
            ) : (
              <Typography variant="body2">
                {formik.values.job_received_on || "15-Sep-2025 10:45"}
              </Typography>
            )}
          </Grid>

          <Grid item xs={6} sm={3} md={1.5}>
            <Typography variant="caption" color="text.secondary">
              SB No
            </Typography>
            {isEditing ? (
              <TextField
                size="small"
                fullWidth
                value={formik.values.sb_no}
                onChange={handleFieldChange}
                name="sb_no"
                sx={{ mt: 0.5 }}
              />
            ) : (
              <Typography variant="body2" fontWeight="bold" color="primary">
                {formik.values.sb_no || "5296776"}
              </Typography>
            )}
          </Grid>

          <Grid item xs={6} sm={4} md={2}>
            <Typography variant="caption" color="text.secondary">
              Job Owner
            </Typography>
            {isEditing ? (
              <FormControl size="small" fullWidth sx={{ mt: 0.5 }}>
                <Select
                  value={formik.values.job_owner}
                  onChange={handleFieldChange}
                  name="job_owner"
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

          <Grid item xs={12} sm={12} md={3}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent={{ xs: "flex-start", md: "flex-end" }}
              gap={2}
            >
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

        {/* Row 2 */}
        <Grid container spacing={2} sx={{ mt: 2 }} alignItems="center">
          <Grid item xs={6} sm={3} md={1.5}>
            <Typography variant="caption" color="text.secondary">
              Filing Mode
            </Typography>
            {isEditing ? (
              <FormControl size="small" fullWidth sx={{ mt: 0.5 }}>
                <Select
                  value={formik.values.filing_mode}
                  onChange={handleFieldChange}
                  name="filing_mode"
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

          <Grid item xs={12} sm={6} md={3} sx={{ ml: { md: 7 } }}>
            <Typography variant="caption" color="text.secondary">
              Shipper
            </Typography>
            {isEditing ? (
              <Autocomplete
                size="small"
                options={getShipperOptions()}
                value={
                  getShipperOptions().find(
                    (opt) => opt.value === formik.values.shipper
                  ) || null
                }
                onChange={(event, newValue) => {
                  formik.setFieldValue("shipper", newValue?.value || "");
                  if (newValue?.data) {
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
                fullWidth
                renderInput={(params) => (
                  <TextField {...params} name="shipper" sx={{ mt: 0.5 }} />
                )}
              />
            ) : (
              <Typography variant="body2">
                {formik.values.shipper || "RAJANSFPL"}
              </Typography>
            )}
          </Grid>

          <Grid item xs={6} sm={3} md={1.7}>
            <Typography variant="caption" color="text.secondary">
              Transport Mode
            </Typography>
            {isEditing ? (
              <FormControl size="small" fullWidth sx={{ mt: 0.5 }}>
                <Select
                  value={formik.values.transportMode}
                  onChange={handleFieldChange}
                  name="transportMode"
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

          <Grid item xs={12} sm={6} md={2.3}>
            <Typography variant="caption" color="text.secondary">
              Custom House
            </Typography>
            {isEditing ? (
              <Autocomplete
                size="small"
                options={getCustomHouseOptions()}
                value={
                  getCustomHouseOptions().find(
                    (opt) => opt.value === formik.values.custom_house
                  ) || null
                }
                onChange={(event, newValue) => {
                  formik.setFieldValue("custom_house", newValue?.value || "");
                }}
                fullWidth
                renderInput={(params) => (
                  <TextField {...params} name="custom_house" sx={{ mt: 0.5 }} />
                )}
              />
            ) : (
              <Typography variant="body2">
                {formik.values.custom_house || "ICD SACHANA"}
              </Typography>
            )}
          </Grid>

          <Grid item xs={6} sm={3} md={1.7}>
            <Typography variant="caption" color="text.secondary">
              Consignment Type
            </Typography>
            {isEditing ? (
              <FormControl size="small" fullWidth sx={{ mt: 0.5 }}>
                <Select
                  value={formik.values.consignment_type}
                  onChange={handleFieldChange}
                  name="consignment_type"
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

        {/* Row 3 */}
        <Grid container spacing={2} sx={{ mt: 2 }} alignItems="center">
          <Grid item xs={12} sm={6} md={2.2}>
            <Typography variant="caption" color="text.secondary">
              Loading Port
            </Typography>
            {isEditing ? (
              <Autocomplete
                size="small"
                options={getCustomHouseOptions()}
                value={
                  getCustomHouseOptions().find(
                    (opt) => opt.value === formik.values.loading_port
                  ) || null
                }
                onChange={(event, newValue) => {
                  formik.setFieldValue("loading_port", newValue?.value || "");
                }}
                fullWidth
                renderInput={(params) => (
                  <TextField {...params} name="loading_port" sx={{ mt: 0.5 }} />
                )}
              />
            ) : (
              <Typography variant="body2">
                {formik.values.loading_port || "ICD SACHANA"}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} sm={6} md={2.3}>
            <Typography variant="caption" color="text.secondary">
              SB Type
            </Typography>
            {isEditing ? (
              <FormControl size="small" fullWidth sx={{ mt: 0.5 }}>
                <Select
                  value={formik.values.sb_type}
                  onChange={handleFieldChange}
                  name="sb_type"
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
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

// Main Export View Job Component
function LogisysExportViewJob() {
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [fileSnackbar, setFileSnackbar] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [directories, setDirectories] = useState({});

  // Only use hook's formik!
  const { data, loading, formik, setData } = useExportJobDetails(
    params,
    setFileSnackbar
  );

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
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <Typography variant="h6" color="primary">
          Loading export job details...
        </Typography>
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
          mt: 6,
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
      <Box sx={{ mt: 3, mb: 2, mx: 1 }}>
        <LogisysEditableHeader
          formik={formik}
          directories={directories}
          onUpdate={formik.handleSubmit}
        />
      </Box>

      <Paper
        sx={{
          margin: { xs: 1, sm: "20px" },
          borderRadius: 3,
          boxShadow: "0 4px 16px rgba(60,72,100,0.11)",
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2, pt: 1 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              "& .MuiTab-root": {
                minWidth: 80,
                fontSize: "0.87rem",
                fontWeight: 500,
                padding: "6px 14px",
                borderRadius: 2,
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

        {/* Tabs */}
        <TabPanel value={activeTab} index={0}>
          <GeneralTab
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
        <TabPanel value={activeTab} index={2}>
          <ShipmentTab
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
        <TabPanel value={activeTab} index={6}>
          <ChargesTab formik={formik} />
        </TabPanel>
        <TabPanel value={activeTab} index={7}>
          <FinancialTab formik={formik} />
        </TabPanel>
        <TabPanel value={activeTab} index={8}>
          <TrackingCompletedTab formik={formik} />
        </TabPanel>
        <TabPanel value={activeTab} index={9}>
          <ESanchitTab formik={formik} />
        </TabPanel>

        <Divider sx={{ my: 2 }} />

        {/* Action Buttons */}
        <Box
          sx={{
            px: 3,
            pb: 3,
            display: "flex",
            gap: 2,
            justifyContent: "flex-end",
          }}
        >
          <Button
            variant="contained"
            size="small"
            onClick={formik.handleSubmit}
            sx={{ minWidth: 120 }}
          >
            Update Job
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="error"
            sx={{ minWidth: 90 }}
          >
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
