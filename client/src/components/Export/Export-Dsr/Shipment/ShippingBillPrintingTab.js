// ShippingBillPrintingTab.jsx - Shipping Bill Printing tab component
import React, { useState, useRef, useCallback } from "react";
import {
  Grid,
  Card,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from "@mui/material";

const ShippingBillPrintingTab = ({ formik, directories, params, onUpdate }) => {
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
  const getTypeOfShipmentOptions = () => [
    { label: "Outright Sale", value: "Outright Sale" },
    { label: "Consignment", value: "Consignment" },
    { label: "Branch Transfer", value: "Branch Transfer" },
    { label: "Others", value: "Others" }
  ];

  const getExportUnderOptions = () => [
    { label: "Other", value: "Other" },
    { label: "Advance License", value: "Advance License" },
    { label: "EPCG", value: "EPCG" },
    { label: "SEZ", value: "SEZ" }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Shipping Bill Printing Details
      </Typography>
      
      <Grid container spacing={3}>
        {/* Left Column - Main Fields */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, height: "100%" }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Shipping Bill Information
            </Typography>
            
            <Grid container spacing={2}>
              {/* O/I-Cert. No./Date/Initiative */}
              <Grid item xs={12}>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 0.5 }}>
                  O/I-Cert. No./Date/Initiative
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  size="small"
                  value={formik.values.oi_cert_details || ''}
                  onChange={(e) => handleFieldChange('oi_cert_details', e.target.value)}
                  placeholder="Enter O/I certificate details..."
                  sx={{
                    "& .MuiInputBase-input": {
                      fontSize: "0.875rem",
                      lineHeight: 1.4
                    }
                  }}
                />
              </Grid>

              {/* Type of Shipment */}
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type of Shipment</InputLabel>
                  <Select
                    value={formik.values.type_of_shipment || ''}
                    onChange={(e) => handleFieldChange('type_of_shipment', e.target.value)}
                    label="Type of Shipment"
                  >
                    {getTypeOfShipmentOptions().map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Specify, if Other */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Specify, if Other"
                  size="small"
                  value={formik.values.specify_if_other || ''}
                  onChange={(e) => handleFieldChange('specify_if_other', e.target.value)}
                  placeholder="Specify if shipment type is other"
                  disabled={formik.values.type_of_shipment !== 'Others'}
                />
              </Grid>

              {/* Permission No. & Date */}
              <Grid item xs={8}>
                <TextField
                  fullWidth
                  label="Permission No."
                  size="small"
                  value={formik.values.permission_no || ''}
                  onChange={(e) => handleFieldChange('permission_no', e.target.value)}
                  placeholder="Enter permission number"
                />
              </Grid>

              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Date"
                  type="date"
                  size="small"
                  value={formik.values.permission_date || ''}
                  onChange={(e) => handleFieldChange('permission_date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Export Under */}
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Export Under</InputLabel>
                  <Select
                    value={formik.values.export_under || ''}
                    onChange={(e) => handleFieldChange('export_under', e.target.value)}
                    label="Export Under"
                  >
                    {getExportUnderOptions().map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* S/B Heading */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="S/B Heading"
                  size="small"
                  value={formik.values.sb_heading || ''}
                  onChange={(e) => handleFieldChange('sb_heading', e.target.value)}
                  placeholder="STAINLESS STEEL BAR"
                />
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Right Column - Export Trade Control & Text Area */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, height: "100%" }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Export Trade Control & Additional Details
            </Typography>
            
            <Grid container spacing={2}>
              {/* Export Trade Control */}
              <Grid item xs={12}>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 0.5 }}>
                  Export Trade Control
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  size="small"
                  value={formik.values.export_trade_control || ''}
                  onChange={(e) => handleFieldChange('export_trade_control', e.target.value)}
                  placeholder="Enter export trade control details..."
                  sx={{
                    "& .MuiInputBase-input": {
                      fontSize: "0.875rem",
                      lineHeight: 1.4
                    }
                  }}
                />
              </Grid>

              {/* Text to be printed on S/B bottom area */}
              <Grid item xs={12}>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 0.5 }}>
                  Text to be printed on S/B bottom area
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  size="small"
                  value={formik.values.sb_bottom_text || ''}
                  onChange={(e) => handleFieldChange('sb_bottom_text', e.target.value)}
                  placeholder="Enter text to be printed on shipping bill bottom area..."
                  sx={{
                    "& .MuiInputBase-input": {
                      fontSize: "0.875rem",
                      lineHeight: 1.4
                    }
                  }}
                />
              </Grid>

              {/* Additional Reference Information */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Additional Reference Information
                </Typography>
                
                <Grid container spacing={2}>
                  {/* Reference Type */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Reference Type"
                      size="small"
                      value={formik.values.sb_reference_type || ''}
                      onChange={(e) => handleFieldChange('sb_reference_type', e.target.value)}
                      placeholder="Enter reference type"
                    />
                  </Grid>

                  {/* Reference Number */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Reference Number"
                      size="small"
                      value={formik.values.sb_reference_number || ''}
                      onChange={(e) => handleFieldChange('sb_reference_number', e.target.value)}
                      placeholder="Enter reference number"
                    />
                  </Grid>

                  {/* Additional Notes */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Additional Notes"
                      multiline
                      rows={3}
                      size="small"
                      value={formik.values.sb_additional_notes || ''}
                      onChange={(e) => handleFieldChange('sb_additional_notes', e.target.value)}
                      placeholder="Enter any additional notes..."
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ShippingBillPrintingTab;
