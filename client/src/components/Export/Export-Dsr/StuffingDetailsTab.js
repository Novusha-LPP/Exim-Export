// StuffingDetailsTab.jsx - Stuffing Details tab component
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
  Checkbox,
  FormControlLabel,
} from "@mui/material";

const StuffingDetailsTab = ({ formik, directories, params, onUpdate }) => {
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
  const getGoodsStuffedAtOptions = () => [
    { label: "Factory", value: "Factory" },
    { label: "Warehouse", value: "Warehouse" },
    { label: "CFS", value: "CFS" },
    { label: "ICD", value: "ICD" },
    { label: "Terminal", value: "Terminal" }
  ];

  const getSealTypeOptions = () => [
    { label: "BTSL - Bottle", value: "BTSL - Bottle" },
    { label: "WIRE", value: "WIRE" },
    { label: "PLASTIC", value: "PLASTIC" },
    { label: "METAL", value: "METAL" },
    { label: "CUSTOMS", value: "CUSTOMS" }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Stuffing Details
      </Typography>
      
      <Grid container spacing={3}>
        {/* Left Column - Stuffing Location Details */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, height: "100%" }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Stuffing Location & Details
            </Typography>
            
            <Grid container spacing={2}>
              {/* Goods Stuffed At */}
              <Grid item xs={8}>
                <FormControl fullWidth size="small">
                  <InputLabel>Goods Stuffed At</InputLabel>
                  <Select
                    value={formik.values.goods_stuffed_at || ''}
                    onChange={(e) => handleFieldChange('goods_stuffed_at', e.target.value)}
                    label="Goods Stuffed At"
                  >
                    {getGoodsStuffedAtOptions().map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Sample Accompanied Checkbox */}
              <Grid item xs={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formik.values.sample_accompanied || false}
                      onChange={(e) => handleFieldChange('sample_accompanied', e.target.checked)}
                      size="small"
                    />
                  }
                  label="Sample Accompanied"
                  sx={{ 
                    fontSize: "0.875rem",
                    "& .MuiFormControlLabel-label": { fontSize: "0.875rem" }
                  }}
                />
              </Grid>

              {/* Factory Address - Large Text Area */}
              <Grid item xs={12}>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 0.5 }}>
                  Factory Address
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  size="small"
                  value={formik.values.factory_address || ''}
                  onChange={(e) => handleFieldChange('factory_address', e.target.value)}
                  placeholder="Enter factory address details..."
                  sx={{
                    "& .MuiInputBase-input": {
                      fontSize: "0.875rem",
                      lineHeight: 1.4
                    }
                  }}
                />
              </Grid>

              {/* Warehouse Code */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Warehouse Code (of CFS/ICD/Terminal)"
                  size="small"
                  value={formik.values.warehouse_code || ''}
                  onChange={(e) => handleFieldChange('warehouse_code', e.target.value)}
                  placeholder="Enter warehouse code"
                />
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Right Column - Seal & Agency Details */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, height: "100%" }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Seal & Agency Information
            </Typography>
            
            <Grid container spacing={2}>
              {/* Seal Type */}
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Seal Type</InputLabel>
                  <Select
                    value={formik.values.stuffing_seal_type || ''}
                    onChange={(e) => handleFieldChange('stuffing_seal_type', e.target.value)}
                    label="Seal Type"
                  >
                    {getSealTypeOptions().map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Seal No */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Seal No"
                  size="small"
                  value={formik.values.stuffing_seal_no || ''}
                  onChange={(e) => handleFieldChange('stuffing_seal_no', e.target.value)}
                  placeholder="Enter seal number"
                />
              </Grid>

              {/* Agency Name */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Agency Name"
                  size="small"
                  value={formik.values.stuffing_agency_name || ''}
                  onChange={(e) => handleFieldChange('stuffing_agency_name', e.target.value)}
                  placeholder="Enter agency name"
                />
              </Grid>

              {/* Additional Information Section */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Additional Information
                </Typography>
                
                {/* Stuffing Date */}
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Stuffing Date"
                      type="date"
                      size="small"
                      value={formik.values.stuffing_date || ''}
                      onChange={(e) => handleFieldChange('stuffing_date', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  {/* Stuffing Time */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Stuffing Time"
                      type="time"
                      size="small"
                      value={formik.values.stuffing_time || ''}
                      onChange={(e) => handleFieldChange('stuffing_time', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  {/* Supervisor Name */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Supervisor Name"
                      size="small"
                      value={formik.values.stuffing_supervisor || ''}
                      onChange={(e) => handleFieldChange('stuffing_supervisor', e.target.value)}
                      placeholder="Enter supervisor name"
                    />
                  </Grid>

                  {/* Remarks */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Stuffing Remarks"
                      multiline
                      rows={3}
                      size="small"
                      value={formik.values.stuffing_remarks || ''}
                      onChange={(e) => handleFieldChange('stuffing_remarks', e.target.value)}
                      placeholder="Enter any additional remarks..."
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

export default StuffingDetailsTab;
