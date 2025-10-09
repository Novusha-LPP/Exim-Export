// InvoiceMainTab.jsx
import React, { useRef, useCallback } from "react";
import { Box, Grid, Card, Typography, TextField, Autocomplete, Button } from "@mui/material";

const currencyOptions = ["USD", "INR", "EUR", "GBP"];
const toiOptions = ["FOB", "CIF"];

const InvoiceMainTab = ({ formik }) => {
  const saveTimeoutRef = useRef(null);

  const handleFieldChange = (field, value) => {
    formik.setFieldValue(field, value);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Invoice Table */}
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Invoice Details
            </Typography>
            {/* Simulated Table Row (single example) */}
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Invoice Number"
                value={formik.values.invoice_number}
                onChange={e => handleFieldChange("invoice_number", e.target.value)}
                size="small"
                sx={{ width: 180 }}
              />
              <TextField
                label="Date"
                type="date"
                value={formik.values.invoice_date}
                onChange={e => handleFieldChange("invoice_date", e.target.value)}
                size="small"
                sx={{ width: 150 }}
                InputLabelProps={{ shrink: true }}
              />
              <Autocomplete
                options={toiOptions}
                value={formik.values.terms_of_invoice}
                onChange={(e, val) => handleFieldChange("terms_of_invoice", val || "")}
                size="small"
                renderInput={params => (
                  <TextField {...params} label="TOI & Place" sx={{ width: 150 }}/>
                )}
              />
              <Autocomplete
                options={currencyOptions}
                value={formik.values.currency}
                onChange={(e, val) => handleFieldChange("currency", val || "")}
                size="small"
                renderInput={params => (
                  <TextField {...params} label="Currency" sx={{ width: 150 }}/>
                )}
              />
              <TextField
                label="Invoice Value"
                type="number"
                value={formik.values.invoice_value}
                onChange={e => handleFieldChange("invoice_value", e.target.value)}
                size="small"
                sx={{ width: 150 }}
              />
              <TextField
                label="Product Value (FOB)"
                type="number"
                value={formik.values.product_value_fob}
                onChange={e => handleFieldChange("product_value_fob", e.target.value)}
                size="small"
                sx={{ width: 150 }}
              />
              {/* <Button variant="outlined" size="small" sx={{ alignSelf: "center" }}>
                View Products
              </Button> */}
            </Box>

            {/* Row 2: editable table footer for quick updates */}
            <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
              <TextField
                label="Exchange Rate"
                type="number"
                value={formik.values.exchange_rate}
                onChange={e => handleFieldChange("exchange_rate", e.target.value)}
                size="small"
              />
              <TextField
                label="Packing/FOB"
                type="number"
                value={formik.values.packing_fob}
                onChange={e => handleFieldChange("packing_fob", e.target.value)}
                size="small"
              />
              {/* <Button variant="contained" size="small">Update</Button>
              <Button variant="contained" size="small" color="secondary">Update & New</Button>
              <Button variant="outlined" size="small" color="error">Delete</Button>
              <Button variant="outlined" size="small">Declarations</Button> */}
            </Box>
          </Card>
        </Grid>

        {/* Invoice Summary */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2 }}>
            {/* Total Section */}
            <Typography variant="subtitle1" fontWeight="bold">Total</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Invoice Value: {formik.values.invoice_value} {formik.values.currency}
              <br/>
              Product Value: {formik.values.product_value_fob} {formik.values.currency}
            </Typography>

            {/* Current Invoice Details */}
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2 }}>Current Invoice Details</Typography>
            <Typography variant="body2">
              Invoice Number: {formik.values.invoice_number}
              <br/>
              TOI: {formik.values.terms_of_invoice}
              <br/>
              Product Value: {formik.values.product_value_fob}
            </Typography>

            <Button variant="outlined" size="small" sx={{ width: "70%", mt: 1 }}>
              Calculate Product Value as per TOI
            </Button>
            <Button variant="contained" size="small" sx={{ width: "70%", mt: 2 }}>
              Update IGST Values
            </Button>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default InvoiceMainTab;
