// GeneralTab.jsx - Fixed version with proper field mapping
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
  IconButton,
  Divider,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";

const GeneralTab = ({ formik, directories, params }) => {
  const [snackbar, setSnackbar] = useState(false);
  const saveTimeoutRef = useRef(null);


  // Handle field changes with auto-save and proper formik integration
  const handleFieldChange = (field, value) => {
    console.log(`Updating field ${field} with value:`, value);
    formik.setFieldValue(field, value);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Auto-save after 2 seconds of inactivity
    saveTimeoutRef.current = setTimeout(() => {
      const updatedValues = {
        ...formik.values,
        [field]: value
      };
    }, 2000);
  };

  // Get options from directory - Enhanced
  const getExporterOptions = () => {
    return directories?.exporters?.map(exp => ({
      label: `${exp.organization} - EXPORT`,
      value: exp.organization,
      data: exp
    })) || [];
  };

  const getBankOptions = () => {
    const banks = [];
    directories?.exporters?.forEach(exp => {
      exp.bankDetails?.forEach(bank => {
        banks.push({
          label: `${bank.entityName} ${bank.branchLocation}`,
          value: `${bank.entityName} ${bank.branchLocation}`,
          data: bank
        });
      });
    });
    return banks;
  };

  const getConsigneeOptions = () => [
    { label: "TO ORDER", value: "TO ORDER" },
    { label: "DIRECT CONSIGNMENT", value: "DIRECT CONSIGNMENT" }
  ];

  // Handle exporter selection and auto-populate related fields
  const handleExporterChange = (event, newValue) => {
    if (newValue?.data) {
      const exp = newValue.data;
      
      // Update multiple fields at once
      const updates = {
        exporter_name: exp.organization,
        exporter: exp.organization, // Also update the main exporter field
        exporter_address: `${exp.address?.addressLine}, ${exp.address?.postalCode}`,
        branch_sno: exp.branchInfo?.[0]?.branchCode || '0',
        branchSrNo: exp.branchInfo?.[0]?.branchCode || '0', // Schema field
        state: exp.branchInfo?.[0]?.state || 'Gujarat',
        ie_code_no: exp.registrationDetails?.ieCode,
        ie_code: exp.registrationDetails?.ieCode, // Schema field  
        regn_no: exp.registrationDetails?.gstinMainBranch,
        exporter_gstin: exp.registrationDetails?.gstinMainBranch, // Schema field
      };

      // Apply all updates
      Object.keys(updates).forEach(key => {
        if (updates[key]) {
          formik.setFieldValue(key, updates[key]);
        }
      });
      
      // Auto-populate bank details if available
      if (exp.bankDetails?.[0]) {
        const bank = exp.bankDetails[0];
        formik.setFieldValue('bank_dealer', `${bank.entityName} ${bank.branchLocation}`);
        formik.setFieldValue('bank_name', bank.entityName); // Schema field
        formik.setFieldValue('ac_number', bank.accountNumber);
        formik.setFieldValue('bank_account_number', bank.accountNumber); // Schema field
        formik.setFieldValue('ad_code', bank.adCode);
        formik.setFieldValue('adCode', bank.adCode); // Schema field
      }

      // Trigger auto-save with all updates
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        const updatedValues = {
          ...formik.values,
          ...updates
        };
      }, 1000);
    }
  };

  // Handle bank selection
  const handleBankChange = (event, newValue) => {
    if (newValue?.data) {
      const bank = newValue.data;
      const updates = {
        bank_dealer: `${bank.entityName} ${bank.branchLocation}`,
        bank_name: bank.entityName,
        ac_number: bank.accountNumber,
        bank_account_number: bank.accountNumber,
        ad_code: bank.adCode,
        adCode: bank.adCode
      };

      Object.keys(updates).forEach(key => {
        formik.setFieldValue(key, updates[key]);
      });
    }
  };

  // Safe value getter
  const getValue = (field) => {
    return formik.values[field] || '';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        General Information
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={3}>
        {/* Left Column - Exporter Details */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, height: "100%" }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Typography variant="subtitle1" fontWeight="bold">
                Exporter
              </Typography>
              <IconButton size="small" color="primary">
                <AddIcon fontSize="small" />
              </IconButton>
              <Button size="small" variant="outlined" sx={{ ml: "auto", fontSize: "0.75rem" }}>
                New
              </Button>
            </Box>
            
            <Grid container spacing={2}>
              {/* Exporter Name with Autocomplete */}
              <Grid item xs={12}>
                <Autocomplete
                  size="small"
                  options={getExporterOptions()}
                  value={getExporterOptions().find(option => 
                    option.value === getValue('exporter_name') || 
                    option.value === getValue('exporter')
                  ) || null}
                  onChange={handleExporterChange}
                  getOptionLabel={(option) => option.label}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Exporter"
                      fullWidth
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {params.InputProps.endAdornment}
                            <IconButton size="small">
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </>
                        )
                      }}
                    />
                  )}
                />
              </Grid>
              
              {/* Address */}
              <Grid item xs={12}>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 0.5 }}>
                  Address
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  size="small"
                  value={getValue('exporter_address')}
                  onChange={(e) => handleFieldChange('exporter_address', e.target.value)}
                  placeholder="PLOT NO.235, SARKHEJ BAVLA ROAD,NH-8A, VILLAGE SART, TAL.SANAND, Ahmedabad - 382220, Gujarat"
                />
              </Grid>
              
              {/* Branch S/No and State */}
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Branch S/No"
                  size="small"
                  value={getValue('branch_sno') || getValue('branchSrNo')}
                  onChange={(e) => {
                    handleFieldChange('branch_sno', e.target.value);
                    handleFieldChange('branchSrNo', e.target.value); // Update both fields
                  }}
                />
              </Grid>
              
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="State"
                  size="small"
                  value={getValue('state') || getValue('exporter_state')}
                  onChange={(e) => {
                    handleFieldChange('state', e.target.value);
                    handleFieldChange('exporter_state', e.target.value); // Update both fields
                  }}
                />
              </Grid>
              
              {/* IE Code No and Regn. No */}
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="IE Code No"
                  size="small"
                  value={getValue('ie_code_no') || getValue('ie_code')}
                  onChange={(e) => {
                    handleFieldChange('ie_code_no', e.target.value);
                    handleFieldChange('ie_code', e.target.value); // Update both fields
                  }}
                />
              </Grid>
              
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Regn. No</InputLabel>
                  <Select 
                    value={getValue('regn_no') || getValue('exporter_gstin')}
                    onChange={(e) => {
                      handleFieldChange('regn_no', e.target.value);
                      handleFieldChange('exporter_gstin', e.target.value); // Update both fields
                    }}
                    label="Regn. No"
                  >
                    <MenuItem value="GSTIN of Norm">GSTIN of Norm</MenuItem>
                    <MenuItem value="24AAACL5064A1Z3">24AAACL5064A1Z3</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {/* DBK Bank */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="DBK Bank"
                  size="small"
                  value={getValue('dbk_bank')}
                  onChange={(e) => handleFieldChange('dbk_bank', e.target.value)}
                />
              </Grid>

              {/* DBK A/c */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="DBK A/c"
                  size="small"
                  value={getValue('dbk_ac')}
                  onChange={(e) => handleFieldChange('dbk_ac', e.target.value)}
                />
              </Grid>

              {/* DBK EDI A/c */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="DBK EDI A/c"
                  size="small"
                  value={getValue('dbk_edi_ac')}
                  onChange={(e) => handleFieldChange('dbk_edi_ac', e.target.value)}
                />
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Right Column - Additional Details */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, height: "100%" }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Reference Details
            </Typography>
            
            <Grid container spacing={2}>
              {/* Ref. Type */}
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Ref. Type</InputLabel>
                  <Select 
                    value={getValue('ref_type')}
                    onChange={(e) => handleFieldChange('ref_type', e.target.value)}
                    label="Ref. Type"
                  >
                    <MenuItem value="Job Order">Job Order</MenuItem>
                    <MenuItem value="Contract">Contract</MenuItem>
                    <MenuItem value="Purchase Order">Purchase Order</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Exporter Ref No./Date */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Exporter Ref No./Date"
                  size="small"
                  value={getValue('exporter_ref_no')}
                  onChange={(e) => handleFieldChange('exporter_ref_no', e.target.value)}
                  placeholder="F22526102243"
                />
              </Grid>

              {/* Exporter Type */}
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Exporter Type</InputLabel>
                  <Select 
                    value={getValue('exporter_type')}
                    onChange={(e) => handleFieldChange('exporter_type', e.target.value)}
                    label="Exporter Type"
                  >
                    <MenuItem value="Manufacturer Exporter">Manufacturer Exporter</MenuItem>
                    <MenuItem value="Merchant Exporter">Merchant Exporter</MenuItem>
                    <MenuItem value="Service Exporter">Service Exporter</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* SB Number/Date */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="SB Number/Date"
                  size="small"
                  value={getValue('sb_number_date') || getValue('sb_no')}
                  onChange={(e) => {
                    handleFieldChange('sb_number_date', e.target.value);
                    handleFieldChange('sb_no', e.target.value); // Update both fields
                  }}
                  placeholder="5296776 | 15-Sep-2025"
                />
              </Grid>

              {/* RBI App. No & Date */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="RBI App. No & Date"
                  size="small"
                  value={getValue('rbi_app_no')}
                  onChange={(e) => handleFieldChange('rbi_app_no', e.target.value)}
                />
              </Grid>

              {/* GR Waived */}
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={getValue('gr_waived') || false}
                      onChange={(e) => handleFieldChange('gr_waived', e.target.checked)}
                      size="small"
                    />
                  }
                  label="GR Waived"
                />
              </Grid>

              {/* GR No */}
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="GR No"
                  size="small"
                  value={getValue('gr_no')}
                  onChange={(e) => handleFieldChange('gr_no', e.target.value)}
                />
              </Grid>

              {/* RBI Waiver No */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="RBI Waiver No"
                  size="small"
                  value={getValue('rbi_waiver_no')}
                  onChange={(e) => handleFieldChange('rbi_waiver_no', e.target.value)}
                />
              </Grid>

              {/* Bank/Dealer with Autocomplete */}
              <Grid item xs={12}>
                <Autocomplete
                  size="small"
                  options={getBankOptions()}
                  value={getBankOptions().find(option => 
                    option.value === getValue('bank_dealer') || 
                    option.label === getValue('bank_dealer')
                  ) || null}
                  onChange={handleBankChange}
                  getOptionLabel={(option) => option.label}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Bank/Dealer"
                      placeholder="INDIAN OVERSEAS BANK ASHRAM ROAD BRANCH AHMEDABAD"
                    />
                  )}
                />
              </Grid>

              {/* A/C Number and AD Code */}
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="A/C Number"
                  size="small"
                  value={getValue('ac_number') || getValue('bank_account_number')}
                  onChange={(e) => {
                    handleFieldChange('ac_number', e.target.value);
                    handleFieldChange('bank_account_number', e.target.value); // Update both fields
                  }}
                  placeholder="293302000129"
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="AD Code"
                  size="small"
                  value={getValue('ad_code') || getValue('adCode')}
                  onChange={(e) => {
                    handleFieldChange('ad_code', e.target.value);
                    handleFieldChange('adCode', e.target.value); // Update both fields
                  }}
                  placeholder="0270355"
                />
              </Grid>

              {/* EPZ Code */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="EPZ Code"
                  size="small"
                  value={getValue('epz_code')}
                  onChange={(e) => handleFieldChange('epz_code', e.target.value)}
                />
              </Grid>

              {/* Notify */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notify"
                  size="small"
                  value={getValue('notify')}
                  onChange={(e) => handleFieldChange('notify', e.target.value)}
                />
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Bottom Section - Consignee Details */}
        <Grid item xs={12}>
          <Card sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Typography variant="subtitle1" fontWeight="bold">
                Consignee
              </Typography>
              <IconButton size="small" color="primary">
                <AddIcon fontSize="small" />
              </IconButton>
              <Button size="small" variant="outlined" sx={{ ml: "auto", fontSize: "0.75rem" }}>
                New
              </Button>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Autocomplete
                  size="small"
                  options={getConsigneeOptions()}
                  value={getConsigneeOptions().find(option => 
                    option.value === getValue('consignee_name')
                  ) || null}
                  onChange={(event, newValue) => handleFieldChange('consignee_name', newValue?.value || '')}
                  getOptionLabel={(option) => option.label}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Consignee"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {params.InputProps.endAdornment}
                            <IconButton size="small">
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </>
                        )
                      }}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Address"
                  size="small"
                  value={getValue('consignee_address')}
                  onChange={(e) => handleFieldChange('consignee_address', e.target.value)}
                  placeholder="KOREA"
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Cons Country"
                  size="small"
                  value={getValue('consignee_country')}
                  onChange={(e) => handleFieldChange('consignee_country', e.target.value)}
                  placeholder="Korea, Republic of"
                />
              </Grid>
            </Grid>

            {/* Additional Fields Row */}
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Sales Person"
                  size="small"
                  value={getValue('sales_person')}
                  onChange={(e) => handleFieldChange('sales_person', e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Business Dimensions"
                  size="small"
                  value={getValue('business_dimensions')}
                  onChange={(e) => handleFieldChange('business_dimensions', e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Quotation"
                  size="small"
                  value={getValue('quotation')}
                  onChange={(e) => handleFieldChange('quotation', e.target.value)}
                />
              </Grid>
            </Grid>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: "italic" }}>
              Note: Items in <em>italic</em> indicates the fields which are used for EDI file submission.
            </Typography>
          </Card>
        </Grid>

        {/* Action Buttons */}
        <Grid item xs={12}>
          <Box display="flex" gap={2} justifyContent="flex-end">
            <Button variant="outlined" size="small">Copy Previous Job</Button>
            <Button variant="outlined" size="small">Import From File</Button>
            <Button variant="contained" size="small">Declarations</Button>
            <Button variant="outlined" size="small" color="error">Close</Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GeneralTab;