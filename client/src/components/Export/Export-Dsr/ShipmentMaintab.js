// ShipmentMainTab.jsx - Complete Main tab with ALL fields from Logisys screenshot
import React, { useState, useRef, useCallback } from "react";
import {
  Grid,
  Card,
  CardContent,
  TextField,
  Typography,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
} from "@mui/material";

const ShipmentMainTab = ({ formik, directories, params, onUpdate }) => {
  const [snackbar, setSnackbar] = useState(false);
  const saveTimeoutRef = useRef(null);

  // Auto-save function
  const autoSave = useCallback(
    async (values) => {
      try {
        if (onUpdate) {
          await onUpdate(values);
        }
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    },
    [onUpdate]
  );

  // Handle field changes with auto-save
  const handleFieldChange = (field, value) => {
    formik.setFieldValue(field, value);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      autoSave(formik.values);
    }, 1500);
  };

  // Dropdown options
  const getPortOptions = () => [
    { label: "Busan(Korea) (KRBUS)", value: "Busan(Korea) (KRBUS)" },
    { label: "ICD SACHANA", value: "ICD SACHANA" },
    { label: "JNPT", value: "JNPT" },
    { label: "Chennai Port", value: "Chennai Port" },
    { label: "Cochin Port", value: "Cochin Port" }
  ];

  const getCountryOptions = () => [
    { label: "Korea, Republic of", value: "Korea, Republic of" },
    { label: "India", value: "India" },
    { label: "China", value: "China" },
    { label: "USA", value: "USA" },
    { label: "Germany", value: "Germany" }
  ];

  const getShippingLineOptions = () => [
    { label: "MAERSK LINE", value: "MAERSK LINE" },
    { label: "MSC", value: "MSC" },
    { label: "CMA CGM", value: "CMA CGM" },
    { label: "HAPAG LLOYD", value: "HAPAG LLOYD" },
    { label: "EVERGREEN", value: "EVERGREEN" }
  ];

  const getNatureOfCargoOptions = () => [
    { label: "C - Containerised", value: "C - Containerised" },
    { label: "B - Break Bulk", value: "B - Break Bulk" },
    { label: "L - Liquid Bulk", value: "L - Liquid Bulk" },
    { label: "D - Dry Bulk", value: "D - Dry Bulk" }
  ];

  const getStateOptions = () => [
    { label: "GUJARAT", value: "GUJARAT" },
    { label: "MAHARASHTRA", value: "MAHARASHTRA" },
    { label: "TAMIL NADU", value: "TAMIL NADU" },
    { label: "KARNATAKA", value: "KARNATAKA" },
    { label: "WEST BENGAL", value: "WEST BENGAL" }
  ];

  return (
    <Box>
      <Grid container spacing={3}>
        {/* LEFT COLUMN - Port and Location Details */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, height: "100%" }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Port & Location Details
            </Typography>
            
            <Grid container spacing={2}>
              {/* Discharge Port */}
              <Grid item xs={12}>
                <Autocomplete
                  size="small"
                  options={getPortOptions()}
                  value={getPortOptions().find(option => option.value === formik.values.discharge_port) || null}
                  onChange={(event, newValue) => handleFieldChange('discharge_port', newValue?.value || '')}
                  getOptionLabel={(option) => option.label}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Discharge Port"
                      placeholder="Busan(Korea) (KRBUS)"
                    />
                  )}
                />
              </Grid>

              {/* Discharge Country */}
              <Grid item xs={12}>
                <Autocomplete
                  size="small"
                  options={getCountryOptions()}
                  value={getCountryOptions().find(option => option.value === formik.values.discharge_country) || null}
                  onChange={(event, newValue) => handleFieldChange('discharge_country', newValue?.value || '')}
                  getOptionLabel={(option) => option.label}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Discharge Country"
                      placeholder="Korea, Republic of"
                    />
                  )}
                />
              </Grid>

              {/* Destination Port */}
              <Grid item xs={12}>
                <Autocomplete
                  size="small"
                  options={getPortOptions()}
                  value={getPortOptions().find(option => option.value === formik.values.destination_port) || null}
                  onChange={(event, newValue) => handleFieldChange('destination_port', newValue?.value || '')}
                  getOptionLabel={(option) => option.label}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Destination Port"
                      placeholder="Busan(Korea) (KRBUS)"
                    />
                  )}
                />
              </Grid>

              {/* Destination Country */}
              <Grid item xs={12}>
                <Autocomplete
                  size="small"
                  options={getCountryOptions()}
                  value={getCountryOptions().find(option => option.value === formik.values.destination_country) || null}
                  onChange={(event, newValue) => handleFieldChange('destination_country', newValue?.value || '')}
                  getOptionLabel={(option) => option.label}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Destination Country"
                      placeholder="Korea, Republic of"
                    />
                  )}
                />
              </Grid>

              {/* Shipping Line */}
              <Grid item xs={12}>
                <Autocomplete
                  size="small"
                  options={getShippingLineOptions()}
                  value={getShippingLineOptions().find(option => option.value === formik.values.shipping_line) || null}
                  onChange={(event, newValue) => handleFieldChange('shipping_line', newValue?.value || '')}
                  getOptionLabel={(option) => option.label}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Shipping Line"
                    />
                  )}
                />
              </Grid>

              {/* Vessel/Sailing Date */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Vessel/Sailing Date"
                  type="date"
                  size="small"
                  value={formik.values.vessel_sailing_date || ''}
                  onChange={(e) => handleFieldChange('vessel_sailing_date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Voyage No */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Voyage No"
                  size="small"
                  value={formik.values.voyage_no || ''}
                  onChange={(e) => handleFieldChange('voyage_no', e.target.value)}
                />
              </Grid>

              {/* EGM No/Date */}
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="EGM No/Date"
                  size="small"
                  value={formik.values.egm_no || ''}
                  onChange={(e) => handleFieldChange('egm_no', e.target.value)}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="date"
                  size="small"
                  value={formik.values.egm_date || ''}
                  onChange={(e) => handleFieldChange('egm_date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* MBL No/Date */}
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="MBL No/Date"
                  size="small"
                  value={formik.values.mbl_no || ''}
                  onChange={(e) => handleFieldChange('mbl_no', e.target.value)}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="date"
                  size="small"
                  value={formik.values.mbl_date || ''}
                  onChange={(e) => handleFieldChange('mbl_date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* HBL No/Date */}
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="HBL No/Date"
                  size="small"
                  value={formik.values.hbl_no || ''}
                  onChange={(e) => handleFieldChange('hbl_no', e.target.value)}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="date"
                  size="small"
                  value={formik.values.hbl_date || ''}
                  onChange={(e) => handleFieldChange('hbl_date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Pre-Carriage by */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Pre-Carriage by"
                  size="small"
                  value={formik.values.pre_carriage_by || ''}
                  onChange={(e) => handleFieldChange('pre_carriage_by', e.target.value)}
                />
              </Grid>

              {/* Place of Receipt */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Place of Receipt"
                  size="small"
                  value={formik.values.place_of_receipt || ''}
                  onChange={(e) => handleFieldChange('place_of_receipt', e.target.value)}
                />
              </Grid>

              {/* Transhipper Code */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Transhipper Code"
                  size="small"
                  value={formik.values.transhipper_code || ''}
                  onChange={(e) => handleFieldChange('transhipper_code', e.target.value)}
                />
              </Grid>

              {/* Gateway Port */}
              <Grid item xs={12}>
                <Autocomplete
                  size="small"
                  options={getPortOptions()}
                  value={getPortOptions().find(option => option.value === formik.values.gateway_port) || null}
                  onChange={(event, newValue) => handleFieldChange('gateway_port', newValue?.value || '')}
                  getOptionLabel={(option) => option.label}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Gateway Port"
                      placeholder="ICD SACHANA"
                    />
                  )}
                />
              </Grid>

              {/* State Of Origin */}
              <Grid item xs={12}>
                <Autocomplete
                  size="small"
                  options={getStateOptions()}
                  value={getStateOptions().find(option => option.value === formik.values.state_of_origin) || null}
                  onChange={(event, newValue) => handleFieldChange('state_of_origin', newValue?.value || '')}
                  getOptionLabel={(option) => option.label}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="State Of Origin"
                      placeholder="GUJARAT"
                    />
                  )}
                />
              </Grid>

              {/* Annexure-C Details Checkbox */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formik.values.annexure_c_details || false}
                      onChange={(e) => handleFieldChange('annexure_c_details', e.target.checked)}
                      size="small"
                    />
                  }
                  label="Annexure-C Details being filed with Annexure-A"
                  sx={{ fontSize: "0.875rem" }}
                />
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* RIGHT COLUMN - Cargo & Weight Details */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, height: "100%" }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Cargo & Weight Details
            </Typography>
            
            <Grid container spacing={2}>
              {/* Nature of Cargo */}
              <Grid item xs={12}>
                <Autocomplete
                  size="small"
                  options={getNatureOfCargoOptions()}
                  value={getNatureOfCargoOptions().find(option => option.value === formik.values.nature_of_cargo) || null}
                  onChange={(event, newValue) => handleFieldChange('nature_of_cargo', newValue?.value || '')}
                  getOptionLabel={(option) => option.label}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Nature of Cargo"
                      placeholder="C - Containerised"
                    />
                  )}
                />
              </Grid>

              {/* Total No. of Pkgs with BDL and Packing Details Button */}
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Total No. of Pkgs"
                  size="small"
                  type="number"
                  value={formik.values.total_no_of_pkgs || ''}
                  onChange={(e) => handleFieldChange('total_no_of_pkgs', e.target.value)}
                  placeholder="31"
                />
              </Grid>

              <Grid item xs={4}>
                <TextField
                  fullWidth
                  size="small"
                  value="BDL"
                  disabled
                  label="Unit"
                />
              </Grid>

              <Grid item xs={4}>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  sx={{ fontSize: "0.75rem", height: "40px" }}
                >
                  Packing Details
                </Button>
              </Grid>

              {/* Loose Pkgs */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Loose Pkgs"
                  size="small"
                  type="number"
                  value={formik.values.loose_pkgs || ''}
                  onChange={(e) => handleFieldChange('loose_pkgs', e.target.value)}
                  placeholder="0"
                />
              </Grid>

              {/* No of Containers */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="No of Containers"
                  size="small"
                  type="number"
                  value={formik.values.no_of_containers || ''}
                  onChange={(e) => handleFieldChange('no_of_containers', e.target.value)}
                />
              </Grid>

              {/* Gross Weight with KGS */}
              <Grid item xs={8}>
                <TextField
                  fullWidth
                  label="Gross Weight"
                  size="small"
                  type="number"
                  step="0.001"
                  value={formik.values.gross_weight || ''}
                  onChange={(e) => handleFieldChange('gross_weight', e.target.value)}
                  placeholder="22827.000"
                />
              </Grid>

              <Grid item xs={4}>
                <TextField
                  fullWidth
                  size="small"
                  value="KGS"
                  disabled
                  label="Unit"
                />
              </Grid>

              {/* Net Weight with KGS */}
              <Grid item xs={8}>
                <TextField
                  fullWidth
                  label="Net Weight"
                  size="small"
                  type="number"
                  step="0.001"
                  value={formik.values.net_weight || ''}
                  onChange={(e) => handleFieldChange('net_weight', e.target.value)}
                  placeholder="22669.000"
                />
              </Grid>

              <Grid item xs={4}>
                <TextField
                  fullWidth
                  size="small"
                  value="KGS"
                  disabled
                  label="Unit"
                />
              </Grid>

              {/* Volume with CBM */}
              <Grid item xs={8}>
                <TextField
                  fullWidth
                  label="Volume"
                  size="small"
                  type="number"
                  step="0.001"
                  value={formik.values.volume || ''}
                  onChange={(e) => handleFieldChange('volume', e.target.value)}
                  placeholder="0.000"
                />
              </Grid>

              <Grid item xs={4}>
                <TextField
                  fullWidth
                  size="small"
                  value="CBM"
                  disabled
                  label="Unit"
                />
              </Grid>

              {/* Chargeable Weight with KGS */}
              <Grid item xs={8}>
                <TextField
                  fullWidth
                  label="Chargeable Weight"
                  size="small"
                  type="number"
                  step="0.001"
                  value={formik.values.chargeable_weight || ''}
                  onChange={(e) => handleFieldChange('chargeable_weight', e.target.value)}
                  placeholder="0.000"
                />
              </Grid>

              <Grid item xs={4}>
                <TextField
                  fullWidth
                  size="small"
                  value="KGS"
                  disabled
                  label="Unit"
                />
              </Grid>

              {/* Marks & Nos - Large Text Area */}
              <Grid item xs={12}>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 0.5 }}>
                  Marks & Nos
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  size="small"
                  value={formik.values.marks_nos || ''}
                  onChange={(e) => handleFieldChange('marks_nos', e.target.value)}
                  placeholder="WE INTEND TO CLAIM RODTEP SCHEME,Invoice No: 90004319 Invoice,Date: 14 September 2025"
                  sx={{
                    "& .MuiInputBase-input": {
                      fontSize: "0.75rem",
                      lineHeight: 1.4
                    }
                  }}
                />
                <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: "block" }}>
                  [85 chars]
                </Typography>
              </Grid>
            </Grid>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ShipmentMainTab;
