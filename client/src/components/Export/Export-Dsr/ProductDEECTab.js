import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  Checkbox,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import React, { useCallback, useRef } from "react";

// Default DEEC item
const getDefaultDeecItem = (idx = 1) => ({
  serialNumber: idx,
  itemSnoPartC: "",
  description: "",
  quantity: 0,
  unit: "",
  itemType: "Indigenous",
});

const ProductDEECTab = ({ formik, productIndex }) => {
  const saveTimeoutRef = useRef(null);
  const product = formik.values.products[productIndex];
  const deecDetails = product?.deecDetails || {
    isDeecItem: false,
    deecItems: [getDefaultDeecItem(1)],
  };

  const autoSave = useCallback(() => formik.submitForm(), [formik]);

  const handleDeecItemChange = (itemIndex, field, value) => {
    const updatedProducts = [...formik.values.products];
    const deecItems = [
      ...(updatedProducts[productIndex].deecDetails?.deecItems || []),
    ];

    if (!deecItems[itemIndex]) {
      deecItems[itemIndex] = getDefaultDeecItem(itemIndex + 1);
    }

    deecItems[itemIndex][field] = value;
    updatedProducts[productIndex].deecDetails.deecItems = deecItems;

    formik.setFieldValue("products", updatedProducts);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(autoSave, 1200);
  };

  const addDeecItem = () => {
    const updatedProducts = [...formik.values.products];
    const deecItems = [
      ...(updatedProducts[productIndex].deecDetails?.deecItems || []),
    ];
    deecItems.push(getDefaultDeecItem(deecItems.length + 1));

    if (!updatedProducts[productIndex].deecDetails) {
      updatedProducts[productIndex].deecDetails = { isDeecItem: true };
    }
    updatedProducts[productIndex].deecDetails.deecItems = deecItems;

    formik.setFieldValue("products", updatedProducts);
  };

  const deleteDeecItem = (itemIndex) => {
    const updatedProducts = [...formik.values.products];
    const deecItems = [
      ...(updatedProducts[productIndex].deecDetails?.deecItems || []),
    ];

    if (deecItems.length > 1) {
      deecItems.splice(itemIndex, 1);
      // Re-number serial numbers
      deecItems.forEach((item, idx) => {
        item.serialNumber = idx + 1;
      });
      updatedProducts[productIndex].deecDetails.deecItems = deecItems;
      formik.setFieldValue("products", updatedProducts);
    }
  };

  return (
    <Box>
      <Card sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom color="primary">
          📌 This is a DEEC Item
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={deecDetails.isDeecItem || false}
                  // onChange={(e) =>
                  //   handleDeecFieldChange("isDeecItem", e.target.checked)
                  // }
                />
              }
              label="This is a DEEC item"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="EDI Regn. No"
              value={deecDetails.ediRegnNo || ""}
              onChange={(e) =>
                handleDeecFieldChange("ediRegnNo", e.target.value)
              }
              size="small"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Date"
              type="date"
              value={deecDetails.date || ""}
              onChange={(e) => handleDeecFieldChange("date", e.target.value)}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Item SNo (Part E)"
              value={deecDetails.itemSnoPartE || ""}
              onChange={(e) =>
                handleDeecFieldChange("itemSnoPartE", e.target.value)
              }
              size="small"
              fullWidth
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Export Qty Under Licence"
              type="number"
              value={deecDetails.exportQtyUnderLicence || 0}
              onChange={(e) =>
                handleDeecFieldChange(
                  "exportQtyUnderLicence",
                  parseFloat(e.target.value) || 0
                )
              }
              size="small"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Lic Ref. No"
              value={deecDetails.licRefNo || ""}
              onChange={(e) =>
                handleDeecFieldChange("licRefNo", e.target.value)
              }
              size="small"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Regn No"
              value={deecDetails.regnNo || ""}
              onChange={(e) => handleDeecFieldChange("regnNo", e.target.value)}
              size="small"
              fullWidth
            />
          </Grid>
        </Grid>

        {/* DEEC Items Table */}
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          DEEC Items
        </Typography>

        <TableContainer component={Paper} sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Sr No</strong>
                </TableCell>
                <TableCell>
                  <strong>Item SNo Part C</strong>
                </TableCell>
                <TableCell>
                  <strong>Description</strong>
                </TableCell>
                <TableCell>
                  <strong>Quantity</strong>
                </TableCell>
                <TableCell>
                  <strong>Unit</strong>
                </TableCell>
                <TableCell>
                  <strong>Item Type</strong>
                </TableCell>
                <TableCell>
                  <strong>Actions</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deecDetails.deecItems?.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.serialNumber}</TableCell>
                  <TableCell>
                    <TextField
                      value={item.itemSnoPartC || ""}
                      onChange={(e) =>
                        handleDeecItemChange(
                          idx,
                          "itemSnoPartC",
                          e.target.value
                        )
                      }
                      size="small"
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={item.description || ""}
                      onChange={(e) =>
                        handleDeecItemChange(idx, "description", e.target.value)
                      }
                      size="small"
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={item.quantity || 0}
                      onChange={(e) =>
                        handleDeecItemChange(
                          idx,
                          "quantity",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      size="small"
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={item.unit || ""}
                      onChange={(e) =>
                        handleDeecItemChange(idx, "unit", e.target.value)
                      }
                      size="small"
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      value={item.itemType || "Indigenous"}
                      onChange={(e) =>
                        handleDeecItemChange(idx, "itemType", e.target.value)
                      }
                      size="small"
                      fullWidth
                    >
                      <MenuItem value="Indigenous">Indigenous</MenuItem>
                      <MenuItem value="Imported">Imported</MenuItem>
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => deleteDeecItem(idx)}
                      disabled={deecDetails.deecItems?.length <= 1}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Button
          startIcon={<AddIcon />}
          onClick={addDeecItem}
          variant="outlined"
          size="small"
        >
          Add DEEC Item
        </Button>
      </Card>
    </Box>
  );
};

export default ProductDEECTab;
