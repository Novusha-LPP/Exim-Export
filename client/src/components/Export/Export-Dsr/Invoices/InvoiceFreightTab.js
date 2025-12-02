import React, { useRef, useCallback } from "react";
import {
  Box,
  Card,
  Typography,
  TextField,
  Autocomplete,
  Grid,
} from "@mui/material";

const chargeTypes = [
  { key: "Freight", label: "Freight" },
  { key: "Insurance", label: "Insurance" },
  { key: "Discount", label: "Discount" },
  { key: "Other Deduction", label: "Other Deduction" },
  { key: "Commission", label: "Commission" },
  { key: "FOB Value", label: "FOB Value" },
];

const currencyOptions = ["USD", "INR", "EUR", "GBP"];

const InvoiceFreightTab = ({ formik }) => {
  const saveTimeoutRef = useRef(null);

  // Initialize export charges if empty
  if (
    !formik.values.export_charges ||
    formik.values.export_charges.length === 0
  ) {
    const initialCharges = chargeTypes.map((charge) => ({
      charge_type: charge.key,
      charge_description: charge.label,
      amount: "",
      currency: "USD",
      payment_terms: "",
      invoice_number: "",
      invoice_date: "",
      payment_status: "",
      payment_date: "",
      document_urls: [],
    }));
    formik.setFieldValue("export_charges", initialCharges);
  }

  const handleChargeChange = (index, field, value) => {
    const charges = [...(formik.values.export_charges || [])];
    charges[index] = {
      ...charges[index],
      [field]: value,
    };
    formik.setFieldValue("export_charges", charges);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  };

  return (
    <Box>
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Freight, Insurance & Other Charges
        </Typography>

        <Grid
          container
          spacing={1}
          sx={{ fontSize: "0.85rem", fontWeight: "bold" }}
        >
          <Grid item xs={2}>
            Charge Type
          </Grid>
          <Grid item xs={2}>
            Currency
          </Grid>

          <Grid item xs={2}>
            Amount
          </Grid>
          <Grid item xs={2}>
            Payment Terms
          </Grid>
        </Grid>

        {(formik.values.export_charges || []).map((charge, idx) => (
          <Grid container spacing={1} key={idx} sx={{ mb: 1 }}>
            <Grid item xs={2}>
              <TextField
                size="small"
                value={charge.charge_description}
                disabled
                fullWidth
              />
            </Grid>
            <Grid item xs={2}>
              <Autocomplete
                options={currencyOptions}
                size="small"
                value={charge.currency || ""}
                onChange={(e, val) =>
                  handleChargeChange(idx, "currency", val || "")
                }
                renderInput={(params) => <TextField {...params} size="small" />}
              />
            </Grid>
            {/* <Grid item xs={2}>
              <TextField
                size="small"
                value={charge.invoice_number || ""}
                onChange={(e) => handleChargeChange(idx, "invoice_number", e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                size="small"
                type="date"
                value={charge.invoice_date ? charge.invoice_date.substring(0,10) : ""}
                onChange={(e) => handleChargeChange(idx, "invoice_date", e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid> */}
            <Grid item xs={2}>
              <TextField
                size="small"
                type="number"
                value={charge.amount || ""}
                onChange={(e) =>
                  handleChargeChange(idx, "amount", e.target.value)
                }
                fullWidth
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                size="small"
                value={charge.payment_terms || ""}
                onChange={(e) =>
                  handleChargeChange(idx, "payment_terms", e.target.value)
                }
                fullWidth
              />
            </Grid>
          </Grid>
        ))}
      </Card>
    </Box>
  );
};

export default InvoiceFreightTab;
