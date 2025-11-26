import React, { useRef, useCallback } from "react";
import { Box, Card, Typography, TextField, MenuItem, Grid } from "@mui/material";

const natureOfPaymentOptions = [
  "Letter Of Credit",
  "Advance Payment",
  "Open Account",
  "Consignment"
];

const OtherInfoTab = ({ formik }) => {
  const saveTimeoutRef = useRef(null);



  const handleFieldChange = (field, value) => {
    formik.setFieldValue(`otherInfo.${field}`, value);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  };

  const otherInfo = formik.values.otherInfo || {};

  return (
    <Box sx={{ p: 3 }}>
      <Card sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Other Info
        </Typography>
        <Grid container spacing={2}>
          {/* Export Contract No / Dt. */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Export Contract No / Dt."
              fullWidth
              size="small"
              value={otherInfo.exportContractNoDate || ""}
              onChange={e => handleFieldChange("exportContractNoDate", e.target.value)}
            />
          </Grid>
          {/* Nature Of Payment */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Nature Of Payment"
              select
              fullWidth
              size="small"
              value={otherInfo.natureOfPayment}
              onChange={e => handleFieldChange("natureOfPayment", e.target.value)}
            >
              {natureOfPaymentOptions.map(opt => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </TextField>
          </Grid>
          {/* Payment Period */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Payment Period (days)"
              type="number"
              fullWidth
              size="small"
              value={otherInfo.paymentPeriod || 0}
              onChange={e => handleFieldChange("paymentPeriod", e.target.value)}
              InputProps={{ endAdornment: <span>days</span> }}
            />
          </Grid>

          {/* Export Contract Date Picker */}
          <Grid item xs={12} md={6}>
            {/* If you want to split Export Contract Date, add here */}
          </Grid>
        </Grid>

        <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3 }}>
          AEO Info
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              label="AEO Code"
              fullWidth
              size="small"
              value={otherInfo.aeoCode || ""}
              onChange={e => handleFieldChange("aeoCode", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="AEO Country"
              fullWidth
              size="small"
              value={otherInfo.aeoCountry || ""}
              onChange={e => handleFieldChange("aeoCountry", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="AEO Role"
              fullWidth
              size="small"
              value={otherInfo.aeoRole || ""}
              onChange={e => handleFieldChange("aeoRole", e.target.value)}
            />
          </Grid>
        </Grid>
      </Card>
    </Box>
  );
};

export default OtherInfoTab;
