import React from "react";
import {
  Box,
  Card,
  Typography,
  Grid,
  TextField,
  Checkbox,
  FormControlLabel,
} from "@mui/material";

const fields = [
  { name: "exportDuty", label: "Export Duty" },
  { name: "cess", label: "Cess" },
  { name: "otherDutyCess", label: "Oth. Duty/Cess" },
  { name: "thirdCess", label: "Third Cess" },
];

const ProductCessDutyTab = ({ formik, idx = 0 }) => {
  const product = formik.values.products?.[idx] || {};
  const cessExpDuty = product.cessExpDuty || {};
  const cenvat = cessExpDuty.cenvat || {};

  const handleChange = (field, value) => {
    const updated = [...(formik.values.products || [])];
    if (!updated[idx]) updated[idx] = {};
    updated[idx].cessExpDuty = {
      ...updated[idx].cessExpDuty,
      [field]: value,
    };
    formik.setFieldValue("products", updated);
  };

  const handleCenvatChange = (field, value) => {
    const updated = [...(formik.values.products || [])];
    if (!updated[idx]) updated[idx] = {};
    updated[idx].cessExpDuty = {
      ...updated[idx].cessExpDuty,
      cenvat: {
        ...((updated[idx].cessExpDuty || {}).cenvat || {}),
        [field]: value,
      },
    };
    formik.setFieldValue("products", updated);
  };

  return (
    <Box>
      <Card sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Cess/Export Duty Details
        </Typography>

        <FormControlLabel
          control={
            <Checkbox
              checked={!!cessExpDuty.cessDutyApplicable}
              onChange={(e) =>
                handleChange("cessDutyApplicable", e.target.checked)
              }
            />
          }
          label="CESS/Exp. Duty is leviable on this item"
          sx={{ mb: 2 }}
        />

        {/* Grid for Export Duty, Cess, etc. */}
        <Grid container spacing={2}>
          {fields.map((f, i) => (
            <React.Fragment key={f.name}>
              <Grid item xs={12} md={3}>
                <TextField
                  label={f.label}
                  type="number"
                  value={cessExpDuty[f.name] || 0}
                  onChange={(e) => handleChange(f.name, e.target.value)}
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label={`${f.label} Rate`}
                  type="number"
                  value={cessExpDuty[`${f.name}Rate`] || 0}
                  onChange={(e) =>
                    handleChange(`${f.name}Rate`, e.target.value)
                  }
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label={`${f.label} Tariff Value`}
                  type="number"
                  value={cessExpDuty[`${f.name}TariffValue`] || 0}
                  onChange={(e) =>
                    handleChange(`${f.name}TariffValue`, e.target.value)
                  }
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label={`Qty for ${f.label}`}
                  type="number"
                  value={cessExpDuty[`${f.name}Qty`] || 0}
                  onChange={(e) => handleChange(`${f.name}Qty`, e.target.value)}
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label={`${f.label} Description`}
                  value={cessExpDuty[`${f.name}Desc`] || ""}
                  onChange={(e) =>
                    handleChange(`${f.name}Desc`, e.target.value)
                  }
                  size="small"
                  fullWidth
                />
              </Grid>
            </React.Fragment>
          ))}
        </Grid>

        {/* UNIT/Desc for Cess, etc. */}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={3}>
            <TextField
              label="Cess Unit"
              value={cessExpDuty.cessUnit || ""}
              onChange={(e) => handleChange("cessUnit", e.target.value)}
              size="small"
              fullWidth
            />
          </Grid>
        </Grid>
      </Card>

      {/* CENVAT Details */}
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          CENVAT Details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              label="Certificate Number"
              value={cenvat.certificateNumber || ""}
              onChange={(e) =>
                handleCenvatChange("certificateNumber", e.target.value)
              }
              size="small"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Date"
              type="date"
              value={cenvat.date || ""}
              onChange={(e) => handleCenvatChange("date", e.target.value)}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Valid Upto"
              type="date"
              value={cenvat.validUpto || ""}
              onChange={(e) => handleCenvatChange("validUpto", e.target.value)}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="CEX Office Code"
              value={cenvat.cexOfficeCode || ""}
              onChange={(e) =>
                handleCenvatChange("cexOfficeCode", e.target.value)
              }
              size="small"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Assessee Code"
              value={cenvat.assesseeCode || ""}
              onChange={(e) =>
                handleCenvatChange("assesseeCode", e.target.value)
              }
              size="small"
              fullWidth
            />
          </Grid>
        </Grid>
      </Card>
    </Box>
  );
};

export default ProductCessDutyTab;
