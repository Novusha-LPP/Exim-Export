import React, { useState, useRef } from "react";
import {
  Grid,
  Card,
  TextField,
  Typography,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Divider,
  Checkbox,
  FormControlLabel,
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import DescriptionIcon from "@mui/icons-material/Description";

const GeneralTab = ({ formik, directories }) => {
  const saveTimeoutRef = useRef(null);

  // Handle field changes with auto-save and proper formik integration
  const handleFieldChange = (field, value) => {
    formik.setFieldValue(field, value);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Auto-save after 2 seconds of inactivity
    saveTimeoutRef.current = setTimeout(() => {
      const updatedValues = {
        ...formik.values,
        [field]: value,
      };
    }, 2000);
  };

  // Get options from directory - Enhanced
  const getExporterOptions = () => {
    return (
      directories?.exporters?.map((exp) => ({
        label: `${exp.organization} - EXPORT`,
        value: exp.organization,
        data: exp,
      })) || []
    );
  };

  const getBankOptions = () => {
    const banks = [];
    directories?.exporters?.forEach((exp) => {
      exp.bankDetails?.forEach((bank) => {
        banks.push({
          label: `${bank.entityName} ${bank.branchLocation}`,
          value: `${bank.entityName} ${bank.branchLocation}`,
          data: bank,
        });
      });
    });
    return banks;
  };

  const getConsigneeOptions = () => [
    { label: "TO ORDER", value: "TO ORDER" },
    { label: "DIRECT CONSIGNMENT", value: "DIRECT CONSIGNMENT" },
  ];

  // Handle exporter selection and auto-populate related fields
const handleExporterChange = (event, newValue) => {
  if (newValue?.data) {
    const exp = newValue.data;
    const primaryBranch = exp.branchInfo?.[0];

    const updates = {
      exporter_name: exp.organization,
      exporter: exp.organization,
      exporter_address: primaryBranch
        ? `${primaryBranch.address || ""}${
            primaryBranch.postalCode ? `, ${primaryBranch.postalCode}` : ""
          }`
        : "",
      branch_sno: primaryBranch?.branchCode || "0",
      branchSrNo: primaryBranch?.branchCode || "0",
      state: primaryBranch?.state,
      ie_code_no: exp.registrationDetails?.ieCode,
      ie_code: exp.registrationDetails?.ieCode,
      regn_no: exp.registrationDetails?.gstinMainBranch,
      exporter_gstin: exp.registrationDetails?.gstinMainBranch,
    };

    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined && updates[key] !== null && updates[key] !== "") {
        formik.setFieldValue(key, updates[key]);
      }
    });

    if (exp.bankDetails?.[0]) {
      const bank = exp.bankDetails[0];
      formik.setFieldValue(
        "bank_dealer",
        `${bank.entityName} ${bank.branchLocation}`
      );
      formik.setFieldValue("bank_name", bank.entityName);
      formik.setFieldValue("ac_number", bank.accountNumber);
      formik.setFieldValue("bank_account_number", bank.accountNumber);
      formik.setFieldValue("ad_code", bank.adCode);
      formik.setFieldValue("adCode", bank.adCode);
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const updatedValues = {
        ...formik.values,
        ...updates,
      };
      // call your autosave function here with updatedValues
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
        adCode: bank.adCode,
      };

      Object.keys(updates).forEach((key) => {
        formik.setFieldValue(key, updates[key]);
      });
    }
  };

  // Safe value getter
  const getValue = (field) => {
    return formik.values[field] || "";
  };

  return (
    <div className="p-3 bg-gray-50">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-2">

      </div>

      <Grid container spacing={1.5}>
        {/* Left Column - Exporter & Bank */}
        <Grid item xs={12} lg={6}>
          <Card
            elevation={0}
            className="border border-gray-200 h-full"
            sx={{ p: 2 }}
          >
            {/* Exporter Section */}
            <div className="flex items-center justify-between mb-2">
              <Typography
                variant="body2"
                className="font-semibold text-gray-700 flex items-center gap-1"
              >
                <BusinessIcon fontSize="small" className="text-blue-600" />
                Exporter
              </Typography>
            </div>

            <Grid container spacing={1}>
              <Grid item xs={12}>
                <Autocomplete
                  size="small"
                  options={getExporterOptions()}
                  value={
                    getExporterOptions().find(
                      (option) =>
                        option.value === getValue("exporter_name") ||
                        option.value === getValue("exporter")
                    ) || null
                  }
                  onChange={handleExporterChange}
                  getOptionLabel={(option) => option.label}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Exporter"
                      sx={{ "& .MuiInputBase-root": { fontSize: "0.875rem" } }}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {params.InputProps.endAdornment}
                            <IconButton size="small" sx={{ p: 0.5 }}>
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={1.5}
                  size="small"
                  label="Address"
                  value={getValue("exporter_address")}
                  onChange={(e) =>
                    handleFieldChange("exporter_address", e.target.value)
                  }
                  sx={{ "& .MuiInputBase-root": { fontSize: "0.875rem" } }}
                  placeholder="Address"
                />
              </Grid>

              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Branch S/No"
                  size="small"
                  value={getValue("branch_sno") || getValue("branchSrNo")}
                  onChange={(e) => {
                    handleFieldChange("branch_sno", e.target.value);
                    handleFieldChange("branchSrNo", e.target.value);
                  }}
                  sx={{ "& .MuiInputBase-root": { fontSize: "0.875rem" } }}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="State"
                  size="small"
                  value={getValue("state") || getValue("exporter_state")}
                  onChange={(e) => {
                    handleFieldChange("state", e.target.value);
                    handleFieldChange("exporter_state", e.target.value);
                  }}
                  sx={{ "& .MuiInputBase-root": { fontSize: "0.875restore" } }}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="IE Code No"
                  size="small"
                  value={getValue("ie_code_no") || getValue("ie_code")}
                  onChange={(e) => {
                    handleFieldChange("ie_code_no", e.target.value);
                    handleFieldChange("ie_code", e.target.value);
                  }}
                  sx={{ "& .MuiInputBase-root": { fontSize: "0.875rem" } }}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography
                  variant="caption"
                  className="text-gray-600 font-medium"
                >
                  Bank Details
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Autocomplete
                  size="small"
                  options={getBankOptions()}
                  value={
                    getBankOptions().find(
                      (option) =>
                        option.value === getValue("bank_dealer") ||
                        option.label === getValue("bank_dealer")
                    ) || null
                  }
                  onChange={handleBankChange}
                  getOptionLabel={(option) => option.label}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Bank/Dealer"
                      placeholder="INDIAN OVERSEAS BANK ASHRAM ROAD BRANCH AHMEDABAD"
                      sx={{ "& .MuiInputBase-root": { fontSize: "0.875rem" } }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="A/C Number"
                  size="small"
                  value={
                    getValue("ac_number") || getValue("bank_account_number")
                  }
                  onChange={(e) => {
                    handleFieldChange("ac_number", e.target.value);
                    handleFieldChange("bank_account_number", e.target.value);
                  }}
                  placeholder="293302000129"
                  sx={{ "& .MuiInputBase-root": { fontSize: "0.875rem" } }}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="AD Code"
                  size="small"
                  value={getValue("ad_code") || getValue("adCode")}
                  onChange={(e) => {
                    handleFieldChange("ad_code", e.target.value);
                    handleFieldChange("adCode", e.target.value);
                  }}
                  placeholder="0270355"
                  sx={{ "& .MuiInputBase-root": { fontSize: "0.875rem" } }}
                />
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Right Column - Reference Details */}
        <Grid item xs={12} lg={6}>
          <Card
            elevation={0}
            className="border border-gray-200 h-full"
            sx={{ p: 2 }}
          >
            <Typography
              variant="body2"
              className="font-semibold text-gray-700 flex items-center gap-1 mb-2"
            >
              <DescriptionIcon fontSize="small" className="text-purple-600" />
              Reference Details
            </Typography>

            <Grid container spacing={1}>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: "0.875rem" }}>
                    Ref. Type
                  </InputLabel>
                  <Select
                    value={getValue("ref_type")}
                    onChange={(e) =>
                      handleFieldChange("ref_type", e.target.value)
                    }
                    label="Ref. Type"
                    sx={{ fontSize: "0.875rem" }}
                  >
                    <MenuItem value="Job Order">Job Order</MenuItem>
                    <MenuItem value="Contract">Contract</MenuItem>
                    <MenuItem value="Purchase Order">Purchase Order</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Exporter Ref No./Date"
                  size="small"
                  value={getValue("exporter_ref_no")}
                  onChange={(e) =>
                    handleFieldChange("exporter_ref_no", e.target.value)
                  }
                  placeholder="F22526102243"
                  sx={{ "& .MuiInputBase-root": { fontSize: "0.875rem" } }}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: "0.875rem" }}>
                    Exporter Type
                  </InputLabel>
                  <Select
                    value={getValue("exporter_type")}
                    onChange={(e) =>
                      handleFieldChange("exporter_type", e.target.value)
                    }
                    label="Exporter Type"
                    sx={{ fontSize: "0.875rem" }}
                  >
                    <MenuItem value="Manufacturer Exporter">
                      Manufacturer Exporter
                    </MenuItem>
                    <MenuItem value="Merchant Exporter">
                      Merchant Exporter
                    </MenuItem>
                    <MenuItem value="Service Exporter">
                      Service Exporter
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="SB Number"
                  size="small"
                  value={getValue("sb_no")}
                  onChange={(e) => handleFieldChange("sb_no", e.target.value)}
                  placeholder="5296776"
                  sx={{ "& .MuiInputBase-root": { fontSize: "0.875rem" } }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="SB Date"
                  size="small"
                  type="date"
                  value={getValue("sb_date") || ""}
                  onChange={(e) => handleFieldChange("sb_date", e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  InputProps={{
                    sx: { fontSize: "0.875rem" },
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="RBI App. No & Date"
                  size="small"
                  value={getValue("rbi_app_no")}
                  onChange={(e) =>
                    handleFieldChange("rbi_app_no", e.target.value)
                  }
                  sx={{ "& .MuiInputBase-root": { fontSize: "0.875rem" } }}
                />
              </Grid>

              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={getValue("gr_waived") || false}
                      onChange={(e) =>
                        handleFieldChange("gr_waived", e.target.checked)
                      }
                      sx={{ py: 0 }}
                    />
                  }
                  label={<Typography variant="caption">GR Waived</Typography>}
                  sx={{ m: 0 }}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="GR No"
                  size="small"
                  value={getValue("gr_no")}
                  onChange={(e) => handleFieldChange("gr_no", e.target.value)}
                  sx={{ "& .MuiInputBase-root": { fontSize: "0.875rem" } }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="RBI Waiver No"
                  size="small"
                  value={getValue("rbi_waiver_no")}
                  onChange={(e) =>
                    handleFieldChange("rbi_waiver_no", e.target.value)
                  }
                  sx={{ "& .MuiInputBase-root": { fontSize: "0.875rem" } }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="EPZ Code"
                  size="small"
                  value={getValue("epz_code")}
                  onChange={(e) =>
                    handleFieldChange("epz_code", e.target.value)
                  }
                  sx={{ "& .MuiInputBase-root": { fontSize: "0.875rem" } }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notify"
                  size="small"
                  value={getValue("notify")}
                  onChange={(e) => handleFieldChange("notify", e.target.value)}
                  sx={{ "& .MuiInputBase-root": { fontSize: "0.875rem" } }}
                />
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Bottom Section - Consignee */}
        <Grid item xs={12}>
          <Card elevation={0} className="border border-gray-200" sx={{ p: 2 }}>
            <div className="flex items-center justify-between mb-2">
              <Typography
                variant="body2"
                className="font-semibold text-gray-700 flex items-center gap-1"
              >
                <PersonIcon fontSize="small" className="text-green-600" />
                Consignee Details
              </Typography>
              <div className="flex gap-0.5">
                <IconButton size="small" sx={{ width: 24, height: 24 }}>
                  <AddIcon sx={{ fontSize: 16 }} className="text-green-600" />
                </IconButton>
                <Button
                  size="small"
                  sx={{
                    textTransform: "none",
                    fontSize: "0.7rem",
                    py: 0.25,
                    px: 1,
                    minHeight: 24,
                  }}
                >
                  New
                </Button>
              </div>
            </div>

            <Grid container spacing={1}>
              <Grid item xs={12} sm={6} md={4}>
                <Autocomplete
                  size="small"
                  options={getConsigneeOptions()}
                  value={
                    getConsigneeOptions().find(
                      (option) => option.value === getValue("consignee_name")
                    ) || null
                  }
                  onChange={(event, newValue) => {
                    handleFieldChange("consignee_name", newValue?.value || "");
                  }}
                  getOptionLabel={(option) => option.label}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Consignee"
                      sx={{ "& .MuiInputBase-root": { fontSize: "0.875rem" } }}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {params.InputProps.endAdornment}
                            <IconButton size="small" sx={{ p: 0.5 }}>
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Address"
                  size="small"
                  value={getValue("consignee_address")}
                  onChange={(e) =>
                    handleFieldChange("consignee_address", e.target.value)
                  }
                  placeholder="KOREA"
                  sx={{ "& .MuiInputBase-root": { fontSize: "0.875rem" } }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Cons Country"
                  size="small"
                  value={getValue("consignee_country")}
                  onChange={(e) =>
                    handleFieldChange("consignee_country", e.target.value)
                  }
                  placeholder="Korea, Republic of"
                  sx={{ "& .MuiInputBase-root": { fontSize: "0.875rem" } }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Sales Person"
                  size="small"
                  value={getValue("sales_person")}
                  onChange={(e) =>
                    handleFieldChange("sales_person", e.target.value)
                  }
                  sx={{ "& .MuiInputBase-root": { fontSize: "0.875rem" } }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Business Dimensions"
                  size="small"
                  value={getValue("business_dimensions")}
                  onChange={(e) =>
                    handleFieldChange("business_dimensions", e.target.value)
                  }
                  sx={{ "& .MuiInputBase-root": { fontSize: "0.875rem" } }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Quotation"
                  size="small"
                  value={getValue("quotation")}
                  onChange={(e) =>
                    handleFieldChange("quotation", e.target.value)
                  }
                  sx={{ "& .MuiInputBase-root": { fontSize: "0.875rem" } }}
                />
              </Grid>
            </Grid>

            <div className="mt-2 p-1.5 bg-blue-50 border-l-4 border-blue-400 rounded">
              <Typography variant="caption" className="text-blue-800">
                ℹ️ Note: Items in <em>italic</em> indicates the fields which are
                used for EDI file submission.
              </Typography>
            </div>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
};

export default GeneralTab;
