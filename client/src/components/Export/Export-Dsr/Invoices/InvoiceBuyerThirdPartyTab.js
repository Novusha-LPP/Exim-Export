import React, { useRef, useCallback } from "react";
import { Box, Card, Typography, TextField, Grid } from "@mui/material";

const InvoiceBuyerThirdPartyTab = ({ formik }) => {
  const saveTimeoutRef = useRef(null);


  const handleThirdPartyFieldChange = (field, value) => {
    const current = { ...(formik.values.buyerThirdPartyInfo?.thirdParty || {}) };
    current[field] = value;
    formik.setFieldValue("buyerThirdPartyInfo.thirdParty", current);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  };

  const handleBuyerFieldChange = (field, value) => {
    const current = { ...(formik.values.buyerThirdPartyInfo?.buyer || {}) };
    current[field] = value;
    formik.setFieldValue("buyerThirdPartyInfo.buyer", current);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  };

  const tp = formik.values.buyerThirdPartyInfo?.thirdParty || {};
  const by = formik.values.buyerThirdPartyInfo?.buyer || {};

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Third Party Info
            </Typography>
            <TextField
              label="Name"
              fullWidth
              size="small"
              value={tp.name || ""}
              onChange={e => handleThirdPartyFieldChange("name", e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Address"
              fullWidth
              multiline
              rows={3}
              size="small"
              value={tp.address || ""}
              onChange={e => handleThirdPartyFieldChange("address", e.target.value)}
              sx={{ mb: 2 }}
            />
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <TextField
                  label="City"
                  fullWidth
                  size="small"
                  value={tp.city || ""}
                  onChange={e => handleThirdPartyFieldChange("city", e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="PIN"
                  fullWidth
                  size="small"
                  value={tp.pin || ""}
                  onChange={e => handleThirdPartyFieldChange("pin", e.target.value)}
                />
              </Grid>
            </Grid>
            <Grid container spacing={1} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <TextField
                  label="Country"
                  fullWidth
                  size="small"
                  value={tp.country || ""}
                  onChange={e => handleThirdPartyFieldChange("country", e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="State"
                  fullWidth
                  size="small"
                  value={tp.state || ""}
                  onChange={e => handleThirdPartyFieldChange("state", e.target.value)}
                />
              </Grid>
            </Grid>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Buyer Info
            </Typography>
            <TextField
              label="Name"
              fullWidth
              size="small"
              value={by.name || ""}
              onChange={e => handleBuyerFieldChange("name", e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Address"
              fullWidth
              multiline
              rows={3}
              size="small"
              value={by.addressLine1 || ""}
              onChange={e => handleBuyerFieldChange("addressLine1", e.target.value)}
              sx={{ mb: 2 }}
            />
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <TextField
                  label="City"
                  fullWidth
                  size="small"
                  value={by.city || ""}
                  onChange={e => handleBuyerFieldChange("city", e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="PIN"
                  fullWidth
                  size="small"
                  value={by.pin || ""}
                  onChange={e => handleBuyerFieldChange("pin", e.target.value)}
                />
              </Grid>
            </Grid>
            <Grid container spacing={1} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <TextField
                  label="Country"
                  fullWidth
                  size="small"
                  value={by.country || ""}
                  onChange={e => handleBuyerFieldChange("country", e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="State"
                  fullWidth
                  size="small"
                  value={by.state || ""}
                  onChange={e => handleBuyerFieldChange("state", e.target.value)}
                />
              </Grid>
            </Grid>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default InvoiceBuyerThirdPartyTab;
