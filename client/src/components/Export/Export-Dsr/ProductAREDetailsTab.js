import React from "react";
import { Box, Card, Typography, Grid, TextField, Button } from "@mui/material";

const defaultAreRow = (idx) => ({
  serialNumber: idx + 1,
  areNumber: "",
  areDate: "",
  commissionerate: "",
  division: "",
  range: "",
  remark: "",
});

const ProductAREDetailsTab = ({ formik, idx = 0 }) => {
  const product = formik.values.products?.[idx] || {};
  const areDetails = product.areDetails || [];

  const handleAreChange = (rowIdx, field, value) => {
    const updatedProducts = [...(formik.values.products || [])];
    if (!updatedProducts[idx]) updatedProducts[idx] = {};
    const areRows = [...(updatedProducts[idx].areDetails || [])];
    areRows[rowIdx] = { ...areRows[rowIdx], [field]: value };
    updatedProducts[idx].areDetails = areRows;
    formik.setFieldValue("products", updatedProducts);
  };

  const addAreRow = () => {
    const updatedProducts = [...(formik.values.products || [])];
    const areRows = [...(updatedProducts[idx]?.areDetails || [])];
    areRows.push(defaultAreRow(areRows.length));
    updatedProducts[idx].areDetails = areRows;
    formik.setFieldValue("products", updatedProducts);
  };

  const deleteAreRow = (i) => {
    const updatedProducts = [...(formik.values.products || [])];
    const areRows = [...(updatedProducts[idx]?.areDetails || [])];
    areRows.splice(i, 1);
    updatedProducts[idx].areDetails = areRows;
    formik.setFieldValue("products", updatedProducts);
  };

  return (
    <Box>
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          ARE Details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={1}>
            <b>Sr No</b>
          </Grid>
          <Grid item xs={2}>
            <b>ARE Number</b>
          </Grid>
          <Grid item xs={2}>
            <b>ARE Date</b>
          </Grid>
          <Grid item xs={2}>
            <b>Commissionerate</b>
          </Grid>
          <Grid item xs={1}>
            <b>Division</b>
          </Grid>
          <Grid item xs={2}>
            <b>Range</b>
          </Grid>
          <Grid item xs={2}>
            <b>Remark</b>
          </Grid>
          <Grid item xs={1}></Grid>
        </Grid>
        {areDetails.map((row, i) => (
          <Grid
            container
            spacing={2}
            alignItems="center"
            key={i}
            sx={{ mt: 1 }}
          >
            <Grid item xs={1}>
              {i + 1}
            </Grid>
            <Grid item xs={2}>
              <TextField
                size="small"
                value={row.areNumber}
                onChange={(e) =>
                  handleAreChange(i, "areNumber", e.target.value)
                }
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                type="date"
                size="small"
                value={row.areDate ? row.areDate.substring(0, 10) : ""}
                onChange={(e) => handleAreChange(i, "areDate", e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                size="small"
                value={row.commissionerate}
                onChange={(e) =>
                  handleAreChange(i, "commissionerate", e.target.value)
                }
              />
            </Grid>
            <Grid item xs={1}>
              <TextField
                size="small"
                value={row.division}
                onChange={(e) => handleAreChange(i, "division", e.target.value)}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                size="small"
                value={row.range}
                onChange={(e) => handleAreChange(i, "range", e.target.value)}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                size="small"
                value={row.remark}
                onChange={(e) => handleAreChange(i, "remark", e.target.value)}
              />
            </Grid>
            <Grid item xs={1}>
              <Button
                size="small"
                color="error"
                onClick={() => deleteAreRow(i)}
              >
                Delete
              </Button>
            </Grid>
          </Grid>
        ))}
        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" size="small" onClick={addAreRow}>
            Add ARE Detail
          </Button>
        </Box>
      </Card>
    </Box>
  );
};

export default ProductAREDetailsTab;
