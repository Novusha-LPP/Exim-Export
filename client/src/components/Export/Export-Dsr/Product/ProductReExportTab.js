import React from "react";
import { Box, Card, Typography, Grid, TextField, Checkbox, FormControlLabel, Button } from "@mui/material";

const ProductReExportTab = ({ formik, idx = 0 }) => {
  const product = formik.values.products?.[idx] || {};
  const reExport = product.reExport || {};

  const handleChange = (field, value) => {
    const updatedProducts = [...(formik.values.products || [])];
    if (!updatedProducts[idx]) updatedProducts[idx] = {};
    updatedProducts[idx].reExport = { ...reExport, [field]: value };
    formik.setFieldValue("products", updatedProducts);
  };

  return (
    <Box>
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Re-Export Details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!reExport.isReExport}
                  onChange={(e) => handleChange("isReExport", e.target.checked)}
                />
              }
              label="This is ReExport Item"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="B/E Number"
              value={reExport.beNumber || ""}
              size="small"
              fullWidth
              onChange={(e) => handleChange("beNumber", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="B/E Date"
              type="date"
              value={reExport.beDate || ""}
              InputLabelProps={{ shrink: true }}
              size="small"
              fullWidth
              onChange={(e) => handleChange("beDate", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Invoice SNo"
              value={reExport.invoiceSerialNo || ""}
              size="small"
              fullWidth
              onChange={(e) => handleChange("invoiceSerialNo", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Item SNo"
              value={reExport.itemSerialNo || ""}
              size="small"
              fullWidth
              onChange={(e) => handleChange("itemSerialNo", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Import Port Code"
              value={reExport.importPortCode || ""}
              size="small"
              fullWidth
              onChange={(e) => handleChange("importPortCode", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!reExport.manualBE}
                  onChange={(e) => handleChange("manualBE", e.target.checked)}
                />
              }
              label="Manual B/E"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="B/E Item Desc."
              value={reExport.beItemDescription || ""}
              size="small"
              multiline
              rows={2}
              fullWidth
              onChange={(e) => handleChange("beItemDescription", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Quantity Exported"
              type="number"
              value={reExport.quantityExported || 0}
              size="small"
              fullWidth
              onChange={(e) => handleChange("quantityExported", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Technical Details"
              value={reExport.technicalDetails || ""}
              size="small"
              fullWidth
              onChange={(e) => handleChange("technicalDetails", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!reExport.inputCreditAvailed}
                  onChange={(e) => handleChange("inputCreditAvailed", e.target.checked)}
                />
              }
              label="Input Credit Availed"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!reExport.personalUseItem}
                  onChange={(e) => handleChange("personalUseItem", e.target.checked)}
                />
              }
              label="Personal Use Item"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Other Identifying Parameters"
              value={reExport.otherIdentifyingParameters || ""}
              size="small"
              fullWidth
              onChange={(e) => handleChange("otherIdentifyingParameters", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Against Export Obligation"
              value={reExport.againstExportObligation || ""}
              size="small"
              fullWidth
              onChange={(e) => handleChange("againstExportObligation", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Obligation No."
              value={reExport.obligationNo || ""}
              size="small"
              fullWidth
              onChange={(e) => handleChange("obligationNo", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Quantity Imported"
              type="number"
              value={reExport.quantityImported || 0}
              size="small"
              fullWidth
              onChange={(e) => handleChange("quantityImported", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Assessable Value"
              type="number"
              value={reExport.assessableValue || 0}
              size="small"
              fullWidth
              onChange={(e) => handleChange("assessableValue", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Total Duty Paid"
              type="number"
              value={reExport.totalDutyPaid || 0}
              size="small"
              fullWidth
              onChange={(e) => handleChange("totalDutyPaid", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Duty Paid Date"
              type="date"
              value={reExport.dutyPaidDate || ""}
              InputLabelProps={{ shrink: true }}
              size="small"
              fullWidth
              onChange={(e) => handleChange("dutyPaidDate", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Drawback Amt Claimed"
              type="number"
              value={reExport.drawbackAmtClaimed || 0}
              size="small"
              fullWidth
              onChange={(e) => handleChange("drawbackAmtClaimed", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!reExport.itemUnUsed}
                  onChange={(e) => handleChange("itemUnUsed", e.target.checked)}
                />
              }
              label="Item Un-Used"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Commissioner Permission"
              value={reExport.commissionerPermission || ""}
              size="small"
              fullWidth
              onChange={(e) => handleChange("commissionerPermission", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Permission Date"
              type="date"
              value={reExport.commPermissionDate || ""}
              InputLabelProps={{ shrink: true }}
              size="small"
              fullWidth
              onChange={(e) => handleChange("commPermissionDate", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Board Number"
              value={reExport.boardNumber || ""}
              size="small"
              fullWidth
              onChange={(e) => handleChange("boardNumber", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!reExport.modvatAvailed}
                  onChange={(e) => handleChange("modvatAvailed", e.target.checked)}
                />
              }
              label="MODVAT Availed"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!reExport.modvatReversed}
                  onChange={(e) => handleChange("modvatReversed", e.target.checked)}
                />
              }
              label="MODVAT Reversed"
            />
          </Grid>
        </Grid>
      </Card>
    </Box>
  );
};

export default ProductReExportTab;
