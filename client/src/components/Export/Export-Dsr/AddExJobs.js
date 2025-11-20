import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Paper,
  CircularProgress,
  Snackbar,
  Alert,
  Fade,
  Backdrop,
  LinearProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  Business as BusinessIcon,
  LocalShipping as ShippingIcon,
  Description as DescriptionIcon,
  AccountBalance as BankIcon,
  Assignment as AssignmentIcon,
  Clear as ClearIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import axios from "axios";

const AddExJobs = () => {
  // Form state
  const [formData, setFormData] = useState({
    exporter_name: "",
    consignee_name: "",
    ie_code: "",
    job_no: "",
    movement_type: "FCL",
    country_of_final_destination: "",
    commodity_description: "",
    commercial_invoice_value: "",
    invoice_currency: "USD",
    port_of_loading: "",
    port_of_discharge: "",
    total_packages: "",
    gross_weight_kg: "",
    net_weight_kg: "",
    status: "pending",
    year: "",
    transportMode: "SEA",
    job_date: new Date(),
  });

  // Organization directory state
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [orgSearchTerm, setOrgSearchTerm] = useState("");

  // Toast notification state
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success", // 'success' | 'error' | 'warning' | 'info'
  });

  // Validation state
  const [touched, setTouched] = useState({});

  const movementTypes = ["FCL", "LCL", "Break Bulk", "Air Freight"];
  const currencies = ["USD", "EUR", "INR", "GBP", "JPY", "CNY"];
  const statusOptions = ["pending", "in-progress", "completed", "cancelled"];

  // Fetch organizations from directory API
  useEffect(() => {
    fetchOrganizations();
  }, [orgSearchTerm]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/directory`
      );

      if (response.data.success) {
        setOrganizations(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
      showToast(
        "Failed to load organizations. Please refresh the page.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Show toast notification
  const showToast = (message, severity = "success") => {
    setToast({
      open: true,
      message,
      severity,
    });
  };

  // Close toast notification
  const handleCloseToast = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setToast((prev) => ({ ...prev, open: false }));
  };

  // Handle organization selection and auto-fill related fields
  const handleOrganizationSelect = (event, selectedOrg) => {
    setSelectedOrganization(selectedOrg);

    if (selectedOrg) {
      setFormData((prev) => ({
        ...prev,
        exporter_name: selectedOrg.organization || selectedOrg.alias || "",
        ie_code: selectedOrg.registrationDetails?.ieCode || "",
      }));

      // Mark fields as touched
      setTouched((prev) => ({
        ...prev,
        exporter_name: true,
        ie_code: true,
      }));

      showToast("Organization details auto-filled successfully", "info");
    } else {
      setFormData((prev) => ({
        ...prev,
        exporter_name: "",
        ie_code: "",
      }));
    }
  };

  // Handle form field changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle field blur for validation
  const handleBlur = (field) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
  };

  // Validate form fields
  const validateField = (field, value) => {
    switch (field) {
      case "exporter_name":
      case "consignee_name":
        return value.trim() === "" ? "This field is required" : "";
      case "ie_code":
        if (value.trim() === "") return "IE Code is required";
        if (!/^\d{10}$/.test(value)) return "IE Code must be exactly 10 digits";
        return "";
      default:
        return "";
    }
  };

  // Check if form is valid
  const isFormValid = () => {
    return (
      formData.exporter_name.trim() !== "" &&
      formData.consignee_name.trim() !== "" &&
      /^\d{10}$/.test(formData.ie_code)
    );
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all required fields as touched
    setTouched({
      exporter_name: true,
      consignee_name: true,
      ie_code: true,
    });

    // Validate required fields
    if (!isFormValid()) {
      showToast("Please fill in all required fields correctly", "error");
      return;
    }

    try {
      setSubmitLoading(true);

      const response = await axios.post(
        `${import.meta.env.VITE_API_STRING}/jobs/add-job-exp-man`,
        {
          ...formData,
          job_date: formData.job_date.toISOString().split("T")[0],
        }
      );

      if (response.data.success) {
        const jobNo = response.data.job.job_no;
        const msg = response.data.message || "Job created successfully!";
        showToast(`🎉 ${msg} Job No: ${jobNo}`, "success");

        // Reset form after short delay
        setTimeout(() => {
          handleClear();
        }, 1000);
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        "Failed to create job. Please try again.";
      showToast(`❌ ${errorMessage}`, "error");
      console.error("Error creating job:", error);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Clear form
  const handleClear = () => {
    setFormData({
      exporter_name: "",
      consignee_name: "",
      ie_code: "",
      job_no: "",
      movement_type: "FCL",
      country_of_final_destination: "",
      commodity_description: "",
      commercial_invoice_value: "",
      invoice_currency: "USD",
      port_of_loading: "",
      port_of_discharge: "",
      total_packages: "",
      gross_weight_kg: "",
      net_weight_kg: "",
      status: "pending",
      year: "",
      job_date: new Date(),
    });
    setSelectedOrganization(null);
    setTouched({});
    showToast("Form cleared", "info");
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
        {/* Header */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: "primary.main",
                display: "flex",
                alignItems: "center",
                boxShadow: 2,
              }}
            >
              <AssignmentIcon sx={{ fontSize: 32, color: "white" }} />
            </Box>
            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                Create Export Job
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Fill in the details below to create a new export job
              </Typography>
            </Box>
          </Box>
        </Fade>

        {/* Loading Backdrop */}
        <Backdrop
          sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
          open={submitLoading}
        >
          <Box sx={{ textAlign: "center" }}>
            <CircularProgress color="inherit" size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Creating Job...
            </Typography>
          </Box>
        </Backdrop>

        {/* Toast Notification */}
        <Snackbar
          open={toast.open}
          autoHideDuration={6000}
          onClose={handleCloseToast}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          TransitionComponent={Fade}
        >
          <Alert
            onClose={handleCloseToast}
            severity={toast.severity}
            variant="filled"
            sx={{
              width: "100%",
              fontSize: "1rem",
              "& .MuiAlert-icon": {
                fontSize: "1.5rem",
              },
            }}
            icon={
              toast.severity === "success" ? (
                <CheckCircleIcon />
              ) : toast.severity === "error" ? (
                <ErrorIcon />
              ) : undefined
            }
          >
            {toast.message}
          </Alert>
        </Snackbar>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Organization Selection Card */}
            <Grid item xs={12}>
              <Fade in timeout={700}>
                <Card
                  elevation={3}
                  sx={{
                    borderLeft: 4,
                    borderLeftColor: "primary.main",
                    transition: "transform 0.2s",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: 6,
                    },
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 3,
                      }}
                    >
                      <BusinessIcon color="primary" sx={{ fontSize: 28 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Organization Details
                      </Typography>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Autocomplete
                          options={organizations}
                          getOptionLabel={(option) =>
                            option.organization || option.alias || ""
                          }
                          value={selectedOrganization}
                          onChange={handleOrganizationSelect}
                          onInputChange={(event, newValue) => {
                            setOrgSearchTerm(newValue);
                          }}
                          loading={loading}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Select Organization *"
                              placeholder="Search organizations..."
                              variant="outlined"
                              InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                  <>
                                    {loading ? (
                                      <CircularProgress
                                        color="inherit"
                                        size={20}
                                      />
                                    ) : null}
                                    {params.InputProps.endAdornment}
                                  </>
                                ),
                              }}
                            />
                          )}
                          renderOption={(props, option) => (
                            <Box
                              component="li"
                              {...props}
                              sx={{
                                flexDirection: "column",
                                alignItems: "flex-start",
                                py: 1.5,
                              }}
                            >
                              <Typography
                                variant="body1"
                                sx={{ fontWeight: 500 }}
                              >
                                {option.organization || option.alias}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                IE Code:{" "}
                                {option.registrationDetails?.ieCode || "N/A"} |
                                Type: {option.generalInfo?.entityType || "N/A"}
                              </Typography>
                            </Box>
                          )}
                          noOptionsText="No organizations found"
                        />
                      </Grid>

                      {selectedOrganization && (
                        <Grid item xs={12} md={6}>
                          <Fade in>
                            <Paper
                              sx={{
                                p: 2,
                                bgcolor: "primary.50",
                                border: 1,
                                borderColor: "primary.200",
                              }}
                            >
                              <Typography
                                variant="subtitle2"
                                color="primary"
                                sx={{ fontWeight: 600, mb: 1 }}
                              >
                                Selected Organization:
                              </Typography>
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                <strong>Name:</strong>{" "}
                                {selectedOrganization.organization}
                              </Typography>
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                <strong>IE Code:</strong>{" "}
                                {
                                  selectedOrganization.registrationDetails
                                    ?.ieCode
                                }
                              </Typography>
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                <strong>Type:</strong>{" "}
                                {selectedOrganization.generalInfo?.entityType}
                              </Typography>
                              <Typography variant="body2">
                                <strong>PAN:</strong>{" "}
                                {
                                  selectedOrganization.registrationDetails
                                    ?.panNo
                                }
                              </Typography>
                            </Paper>
                          </Fade>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>

            {/* Basic Job Information */}
            <Grid item xs={12}>
              <Fade in timeout={900}>
                <Card
                  elevation={3}
                  sx={{
                    borderLeft: 4,
                    borderLeftColor: "success.main",
                    transition: "transform 0.2s",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: 6,
                    },
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 3,
                      }}
                    >
                      <DescriptionIcon color="success" sx={{ fontSize: 28 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Job Information
                      </Typography>
                    </Box>

                    <Grid container spacing={2}>
                      {/* <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Job Number"
                          placeholder="Auto-generated if empty"
                          value={formData.job_no}
                          onChange={(e) => handleInputChange('job_no', e.target.value)}
                          variant="outlined"
                        />
                      </Grid> */}

                      <Grid item xs={12} md={4}>
                        <DatePicker
                          label="Job Date"
                          value={formData.job_date}
                          onChange={(newValue) =>
                            handleInputChange("job_date", newValue)
                          }
                          renderInput={(params) => (
                            <TextField {...params} fullWidth />
                          )}
                        />
                      </Grid>

                      <Grid item xs={6} md={2}>
                        <FormControl fullWidth>
                          <InputLabel>Year</InputLabel>
                          <Select
                            value={formData.year}
                            onChange={(e) =>
                              handleInputChange("year", e.target.value)
                            }
                            label="Year"
                          >
                            <MenuItem value="25-26">25-26</MenuItem>
                            <MenuItem value="26-27">26-27</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={6} md={2}>
                        <FormControl fullWidth>
                          <InputLabel>Transport Mode</InputLabel>
                          <Select
                            value={formData.transportMode}
                            onChange={(e) =>
                              handleInputChange("transportMode", e.target.value)
                            }
                            label="Transport Mode"
                          >
                            <MenuItem value="SEA">SEA</MenuItem>
                            <MenuItem value="AIR">AIR</MenuItem>
                            <MenuItem value="LAND">LAND</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>

            {/* Party Details */}
            <Grid item xs={12}>
              <Fade in timeout={1100}>
                <Card
                  elevation={3}
                  sx={{
                    borderLeft: 4,
                    borderLeftColor: "info.main",
                    transition: "transform 0.2s",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: 6,
                    },
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 3,
                      }}
                    >
                      <BusinessIcon color="info" sx={{ fontSize: 28 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Party Details
                      </Typography>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Exporter Name *"
                          value={formData.exporter_name}
                          onChange={(e) =>
                            handleInputChange("exporter_name", e.target.value)
                          }
                          onBlur={() => handleBlur("exporter_name")}
                          variant="outlined"
                          required
                          error={
                            touched.exporter_name && !formData.exporter_name
                          }
                          helperText={
                            touched.exporter_name &&
                            validateField(
                              "exporter_name",
                              formData.exporter_name
                            )
                          }
                        />
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Consignee Name *"
                          value={formData.consignee_name}
                          onChange={(e) =>
                            handleInputChange("consignee_name", e.target.value)
                          }
                          onBlur={() => handleBlur("consignee_name")}
                          variant="outlined"
                          required
                          error={
                            touched.consignee_name && !formData.consignee_name
                          }
                          helperText={
                            touched.consignee_name &&
                            validateField(
                              "consignee_name",
                              formData.consignee_name
                            )
                          }
                        />
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="IE Code *"
                          value={formData.ie_code}
                          onChange={(e) =>
                            handleInputChange("ie_code", e.target.value)
                          }
                          onBlur={() => handleBlur("ie_code")}
                          variant="outlined"
                          required
                          error={
                            touched.ie_code &&
                            !!validateField("ie_code", formData.ie_code)
                          }
                          helperText={
                            touched.ie_code &&
                            validateField("ie_code", formData.ie_code)
                          }
                          inputProps={{ maxLength: 10 }}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>

            {/* Shipment Details */}
            <Grid item xs={12}>
              <Fade in timeout={1300}>
                <Card
                  elevation={3}
                  sx={{
                    borderLeft: 4,
                    borderLeftColor: "warning.main",
                    transition: "transform 0.2s",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: 6,
                    },
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 3,
                      }}
                    >
                      <ShippingIcon color="warning" sx={{ fontSize: 28 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Shipment Details
                      </Typography>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                          <InputLabel>Movement Type</InputLabel>
                          <Select
                            value={formData.movement_type}
                            onChange={(e) =>
                              handleInputChange("movement_type", e.target.value)
                            }
                            label="Movement Type"
                          >
                            {movementTypes.map((type) => (
                              <MenuItem key={type} value={type}>
                                {type}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          label="Port of Loading"
                          value={formData.port_of_loading}
                          onChange={(e) =>
                            handleInputChange("port_of_loading", e.target.value)
                          }
                          variant="outlined"
                        />
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          label="Port of Discharge"
                          value={formData.port_of_discharge}
                          onChange={(e) =>
                            handleInputChange(
                              "port_of_discharge",
                              e.target.value
                            )
                          }
                          variant="outlined"
                        />
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          label="Country of Final Destination"
                          value={formData.country_of_final_destination}
                          onChange={(e) =>
                            handleInputChange(
                              "country_of_final_destination",
                              e.target.value
                            )
                          }
                          variant="outlined"
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Commodity Description"
                          value={formData.commodity_description}
                          onChange={(e) =>
                            handleInputChange(
                              "commodity_description",
                              e.target.value
                            )
                          }
                          variant="outlined"
                          multiline
                          rows={2}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>

            {/* Commercial & Weight Details */}
            <Grid item xs={12}>
              <Fade in timeout={1500}>
                <Card
                  elevation={3}
                  sx={{
                    borderLeft: 4,
                    borderLeftColor: "secondary.main",
                    transition: "transform 0.2s",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: 6,
                    },
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 3,
                      }}
                    >
                      <BankIcon color="secondary" sx={{ fontSize: 28 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Commercial & Weight Details
                      </Typography>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          label="Commercial Invoice Value"
                          value={formData.commercial_invoice_value}
                          onChange={(e) =>
                            handleInputChange(
                              "commercial_invoice_value",
                              e.target.value
                            )
                          }
                          variant="outlined"
                          type="number"
                          inputProps={{ step: "0.01", min: "0" }}
                        />
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                          <InputLabel>Invoice Currency</InputLabel>
                          <Select
                            value={formData.invoice_currency}
                            onChange={(e) =>
                              handleInputChange(
                                "invoice_currency",
                                e.target.value
                              )
                            }
                            label="Invoice Currency"
                          >
                            {currencies.map((currency) => (
                              <MenuItem key={currency} value={currency}>
                                {currency}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={2}>
                        <TextField
                          fullWidth
                          label="Total Packages"
                          value={formData.total_packages}
                          onChange={(e) =>
                            handleInputChange("total_packages", e.target.value)
                          }
                          variant="outlined"
                          type="number"
                          inputProps={{ min: "0" }}
                        />
                      </Grid>

                      <Grid item xs={12} md={2}>
                        <TextField
                          fullWidth
                          label="Gross Weight (KG)"
                          value={formData.gross_weight_kg}
                          onChange={(e) =>
                            handleInputChange("gross_weight_kg", e.target.value)
                          }
                          variant="outlined"
                          type="number"
                          inputProps={{ step: "0.001", min: "0" }}
                        />
                      </Grid>

                      <Grid item xs={12} md={2}>
                        <TextField
                          fullWidth
                          label="Net Weight (KG)"
                          value={formData.net_weight_kg}
                          onChange={(e) =>
                            handleInputChange("net_weight_kg", e.target.value)
                          }
                          variant="outlined"
                          type="number"
                          inputProps={{ step: "0.001", min: "0" }}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12}>
              <Fade in timeout={1900}>
                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    justifyContent: "flex-end",
                    mt: 2,
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={handleClear}
                    startIcon={<ClearIcon />}
                    sx={{
                      minWidth: 120,
                      height: 48,
                      fontSize: "1rem",
                    }}
                    disabled={submitLoading}
                  >
                    Clear
                  </Button>

                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={submitLoading ? null : <AddIcon />}
                    disabled={submitLoading || !isFormValid()}
                    sx={{
                      minWidth: 150,
                      height: 48,
                      fontSize: "1rem",
                      boxShadow: 3,
                      "&:hover": {
                        boxShadow: 6,
                      },
                    }}
                  >
                    {submitLoading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      "Create Job"
                    )}
                  </Button>
                </Box>
              </Fade>
            </Grid>
          </Grid>
        </form>
      </Box>
    </LocalizationProvider>
  );
};

export default AddExJobs;
