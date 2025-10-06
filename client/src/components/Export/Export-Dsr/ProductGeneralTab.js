import React from "react";
import {
  Box,
  Grid,
  TextField,
  Typography,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";

const ProductGeneralTab = ({ formik }) => {
  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...formik.values.products];
    
    // Handle nested object updates
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      updatedProducts[index][parent] = {
        ...updatedProducts[index][parent],
        [child]: value
      };
    } else {
      updatedProducts[index][field] = value;
    }
    
    formik.setFieldValue('products', updatedProducts);
  };

  const addNewProduct = () => {
    const newProduct = {
      serialNumber: formik.values.products.length + 1,
      description: "",
      ritc: "",
      quantity: 0,
      socQuantity: 0,
      unitPrice: 0,
      per: "",
      amount: 0,
      eximCode: "",
      nfeiCategory: "",
      endUse: "",
      ptaFtaInfo: "",
      rewardItem: "",
      strCode: "",
      originDistrict: "",
      originState: "",
      alternateQty: 0,
      materialCode: "",
      medicinalPlant: "",
      formulation: "",
      surfaceMaterialInContact: "",
      labGrownDiamond: "",
      currency: "INR",
      calculationMethod: "",
      percentage: 0,
      pmvPerUnit: 0,
      totalPMV: 0,
      igstPaymentStatus: "",
      taxableValueINR: 0,
      igstRate: 0,
      igstAmountINR: 0,
      compensationCessAmountINR: 0,
      rodtepClaim: "",
      rodtepQuantity: 0,
      rodtepCapValue: 0,
      rodtepCapValuePerUnits: 0,
      rodtepUnit: "",
      rodtepRatePercent: 0,
      rodtepAmountINR: 0,
      // New fields
      sbTypeDetails: "",
      dbkType: "",
      cessExciseDuty: 0,
      compensationCess: 0,
      pmvInfo: {
        currency: "INR",
        calculationMethod: "",
        pmvPerUnit: 0,
        totalPMV: 0
      },
      igstCompensationCess: {
        igstPaymentStatus: "",
        taxableValueINR: 0,
        igstRate: 0,
        igstAmountINR: 0,
        compensationCessAmountINR: 0
      },
      rodtepInfo: {
        claim: "",
        quantity: 0,
        capValue: 0,
        capValuePerUnits: 0,
        unit: "",
        ratePercent: 0,
        amountINR: 0
      }
    };
    
    formik.setFieldValue('products', [...formik.values.products, newProduct]);
  };

  const removeProduct = (index) => {
    const updatedProducts = formik.values.products.filter((_, i) => i !== index);
    formik.setFieldValue('products', updatedProducts);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Product General Information
      </Typography>
      <Divider sx={{ mb: 2 }} />

      {/* Product Table */}
      <TableContainer component={Paper} sx={{ mb: 3, maxHeight: 600, overflow: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }}>
                S.No
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }}>
                Description
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }}>
                RITC/Tariff Head
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }}>
                Quantity
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }}>
                Unit Price
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }}>
                Per (UQC)
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }}>
                Amount
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {formik.values.products?.map((product, index) => (
              <TableRow key={index}>
                <TableCell>{product.serialNumber}</TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={product.description || ''}
                    onChange={(e) => handleProductChange(index, 'description', e.target.value)}
                    multiline
                    minRows={2}
                    sx={{ minWidth: 200 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={product.ritc || ''}
                    onChange={(e) => handleProductChange(index, 'ritc', e.target.value)}
                    sx={{ minWidth: 120 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    value={product.quantity || 0}
                    onChange={(e) => handleProductChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                    sx={{ minWidth: 100 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    value={product.unitPrice || 0}
                    onChange={(e) => handleProductChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    sx={{ minWidth: 100 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={product.per || ''}
                    onChange={(e) => handleProductChange(index, 'per', e.target.value)}
                    sx={{ minWidth: 80 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    value={product.amount || 0}
                    onChange={(e) => handleProductChange(index, 'amount', parseFloat(e.target.value) || 0)}
                    sx={{ minWidth: 100 }}
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeProduct(index)}
                    disabled={formik.values.products.length <= 1}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Product Button */}
      <Box sx={{ mb: 3 }}>
        <IconButton
          onClick={addNewProduct}
          color="primary"
          sx={{ border: 1, borderStyle: 'dashed' }}
        >
          <AddIcon />
        </IconButton>
        <Typography variant="body2" sx={{ ml: 1, display: 'inline' }}>
          Add New Product
        </Typography>
      </Box>

      {/* Product Details Section */}
      {formik.values.products?.map((product, index) => (
        <Box key={index} sx={{ mb: 4, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Product {index + 1} - Additional Details
            <Chip label={`S.No: ${product.serialNumber}`} size="small" sx={{ ml: 1 }} />
          </Typography>

          <Grid container spacing={2}>
            {/* EXIM Code */}
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="EXIM Code"
                value={product.eximCode || ''}
                onChange={(e) => handleProductChange(index, 'eximCode', e.target.value)}
              />
            </Grid>

            {/* NFEI Category */}
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="NFEI Category"
                value={product.nfeiCategory || ''}
                onChange={(e) => handleProductChange(index, 'nfeiCategory', e.target.value)}
              />
            </Grid>

            {/* End Use */}
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="End Use"
                value={product.endUse || ''}
                onChange={(e) => handleProductChange(index, 'endUse', e.target.value)}
              />
            </Grid>

            {/* PTA/FTA Info */}
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="PTA/FTA Info"
                value={product.ptaFtaInfo || ''}
                onChange={(e) => handleProductChange(index, 'ptaFtaInfo', e.target.value)}
              />
            </Grid>

            {/* Reward Item */}
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Reward Item"
                value={product.rewardItem || ''}
                onChange={(e) => handleProductChange(index, 'rewardItem', e.target.value)}
              />
            </Grid>

            {/* STR Code */}
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="STR Code"
                value={product.strCode || ''}
                onChange={(e) => handleProductChange(index, 'strCode', e.target.value)}
              />
            </Grid>

            {/* Origin District */}
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Origin District"
                value={product.originDistrict || ''}
                onChange={(e) => handleProductChange(index, 'originDistrict', e.target.value)}
              />
            </Grid>

            {/* Origin State */}
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Origin State"
                value={product.originState || ''}
                onChange={(e) => handleProductChange(index, 'originState', e.target.value)}
              />
            </Grid>

            {/* Alternate Quantity */}
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Alternate Qty"
                value={product.alternateQty || 0}
                onChange={(e) => handleProductChange(index, 'alternateQty', parseFloat(e.target.value) || 0)}
              />
            </Grid>

            {/* Material Code */}
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Material Code"
                value={product.materialCode || ''}
                onChange={(e) => handleProductChange(index, 'materialCode', e.target.value)}
              />
            </Grid>

            {/* Medicinal Plant */}
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Medicinal Plant"
                value={product.medicinalPlant || ''}
                onChange={(e) => handleProductChange(index, 'medicinalPlant', e.target.value)}
              />
            </Grid>

            {/* Formulation */}
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Formulation"
                value={product.formulation || ''}
                onChange={(e) => handleProductChange(index, 'formulation', e.target.value)}
              />
            </Grid>

            {/* Surface Material in Contact */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="Surface Material in Contact"
                value={product.surfaceMaterialInContact || ''}
                onChange={(e) => handleProductChange(index, 'surfaceMaterialInContact', e.target.value)}
              />
            </Grid>

            {/* Lab Grown Diamond */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="Lab Grown Diamond"
                value={product.labGrownDiamond || ''}
                onChange={(e) => handleProductChange(index, 'labGrownDiamond', e.target.value)}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* PMV Info Section */}
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            PMV Info
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Currency</InputLabel>
                <Select
                  value={product.currency || 'INR'}
                  label="Currency"
                  onChange={(e) => handleProductChange(index, 'currency', e.target.value)}
                >
                  <MenuItem value="INR">INR</MenuItem>
                  <MenuItem value="USD">USD</MenuItem>
                  <MenuItem value="EUR">EUR</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Calc. Method"
                value={product.calculationMethod || ''}
                onChange={(e) => handleProductChange(index, 'calculationMethod', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="% age"
                value={product.percentage || 0}
                onChange={(e) => handleProductChange(index, 'percentage', parseFloat(e.target.value) || 0)}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="PMV/Unit"
                value={product.pmvPerUnit || 0}
                onChange={(e) => handleProductChange(index, 'pmvPerUnit', parseFloat(e.target.value) || 0)}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Total PMV"
                value={product.totalPMV || 0}
                onChange={(e) => handleProductChange(index, 'totalPMV', parseFloat(e.target.value) || 0)}
              />
            </Grid>
          </Grid>

          {/* IGST & Compensation Cess Section */}
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            IGST & Compensation Cess Info
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>IGST Pymt Status</InputLabel>
                <Select
                  value={product.igstPaymentStatus || ''}
                  label="IGST Pymt Status"
                  onChange={(e) => handleProductChange(index, 'igstPaymentStatus', e.target.value)}
                >
                  <MenuItem value="Export Against Pay">Export Against Pay</MenuItem>
                  <MenuItem value="Not Applicable">Not Applicable</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Taxable Value (INR)"
                value={product.taxableValueINR || 0}
                onChange={(e) => handleProductChange(index, 'taxableValueINR', parseFloat(e.target.value) || 0)}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="IGST Rate (%)"
                value={product.igstRate || 0}
                onChange={(e) => handleProductChange(index, 'igstRate', parseFloat(e.target.value) || 0)}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="IGST Amt (INR)"
                value={product.igstAmountINR || 0}
                onChange={(e) => handleProductChange(index, 'igstAmountINR', parseFloat(e.target.value) || 0)}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Comp. Cess Amt (INR)"
                value={product.compensationCessAmountINR || 0}
                onChange={(e) => handleProductChange(index, 'compensationCessAmountINR', parseFloat(e.target.value) || 0)}
              />
            </Grid>
          </Grid>

          {/* RODTEP Info Section */}
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            RODTEP Info
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>RODTEP Claim</InputLabel>
                <Select
                  value={product.rodtepClaim || ''}
                  label="RODTEP Claim"
                  onChange={(e) => handleProductChange(index, 'rodtepClaim', e.target.value)}
                >
                  <MenuItem value="Not Applicable">Not Applicable</MenuItem>
                  <MenuItem value="Applicable">Applicable</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Quantity"
                value={product.rodtepQuantity || 0}
                onChange={(e) => handleProductChange(index, 'rodtepQuantity', parseFloat(e.target.value) || 0)}
              />
            </Grid>

            <Grid item xs={12} md={1.5}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Cap Value"
                value={product.rodtepCapValue || 0}
                onChange={(e) => handleProductChange(index, 'rodtepCapValue', parseFloat(e.target.value) || 0)}
              />
            </Grid>

            <Grid item xs={12} md={1.5}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Cap value per units"
                value={product.rodtepCapValuePerUnits || 0}
                onChange={(e) => handleProductChange(index, 'rodtepCapValuePerUnits', parseFloat(e.target.value) || 0)}
              />
            </Grid>

            <Grid item xs={12} md={1}>
              <TextField
                fullWidth
                size="small"
                label="Unit"
                value={product.rodtepUnit || ''}
                onChange={(e) => handleProductChange(index, 'rodtepUnit', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Rate (in %)"
                value={product.rodtepRatePercent || 0}
                onChange={(e) => handleProductChange(index, 'rodtepRatePercent', parseFloat(e.target.value) || 0)}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="RODTEP Amount (INR)"
                value={product.rodtepAmountINR || 0}
                onChange={(e) => handleProductChange(index, 'rodtepAmountINR', parseFloat(e.target.value) || 0)}
              />
            </Grid>
          </Grid>
        </Box>
      ))}
    </Box>
  );
};

export default ProductGeneralTab;
