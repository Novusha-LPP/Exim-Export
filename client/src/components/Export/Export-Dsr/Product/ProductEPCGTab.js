import React, { useRef, useCallback } from "react";
import {
  Box,
  Card,
  Typography,
  Grid,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  MenuItem,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";

// Default EPCG item
const getDefaultEpcgItem = (idx = 1) => ({
  serialNumber: idx,
  itemSnoPartC: "",
  description: "",
  quantity: 0,
  unit: "",
  itemType: "Indigenous",
});

const ProductEPCGTab = ({ formik, productIndex }) => {
  const saveTimeoutRef = useRef(null);
  const product = formik.values.products[productIndex];
  const epcgDetails = product?.epcgDetails || {
    isEpcgItem: false,
    epcgItems: [getDefaultEpcgItem(1)],
  };

  const autoSave = useCallback(() => formik.submitForm(), [formik]);

  const handleEpcgFieldChange = (field, value) => {
    const updatedProducts = [...formik.values.products];
    if (!updatedProducts[productIndex].epcgDetails) {
      updatedProducts[productIndex].epcgDetails = {
        isEpcgItem: false,
        epcgItems: [getDefaultEpcgItem(1)],
      };
    }

    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      updatedProducts[productIndex].epcgDetails[parent] = {
        ...updatedProducts[productIndex].epcgDetails[parent],
        [child]: value,
      };
    } else {
      updatedProducts[productIndex].epcgDetails[field] = value;
    }

    formik.setFieldValue("products", updatedProducts);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(autoSave, 1200);
  };

  const handleEpcgItemChange = (itemIndex, field, value) => {
    const updatedProducts = [...formik.values.products];
    const epcgItems = [
      ...(updatedProducts[productIndex].epcgDetails?.epcgItems || []),
    ];

    if (!epcgItems[itemIndex]) {
      epcgItems[itemIndex] = getDefaultEpcgItem(itemIndex + 1);
    }

    epcgItems[itemIndex][field] = value;
    updatedProducts[productIndex].epcgDetails.epcgItems = epcgItems;

    formik.setFieldValue("products", updatedProducts);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(autoSave, 1200);
  };

  const addEpcgItem = () => {
    const updatedProducts = [...formik.values.products];
    const epcgItems = [
      ...(updatedProducts[productIndex].epcgDetails?.epcgItems || []),
    ];
    epcgItems.push(getDefaultEpcgItem(epcgItems.length + 1));

    if (!updatedProducts[productIndex].epcgDetails) {
      updatedProducts[productIndex].epcgDetails = { isEpcgItem: true };
    }
    updatedProducts[productIndex].epcgDetails.epcgItems = epcgItems;

    formik.setFieldValue("products", updatedProducts);
  };

  const deleteEpcgItem = (itemIndex) => {
    const updatedProducts = [...formik.values.products];
    const epcgItems = [
      ...(updatedProducts[productIndex].epcgDetails?.epcgItems || []),
    ];

    if (epcgItems.length > 1) {
      epcgItems.splice(itemIndex, 1);
      // Re-number serial numbers
      epcgItems.forEach((item, idx) => {
        item.serialNumber = idx + 1;
      });
      updatedProducts[productIndex].epcgDetails.epcgItems = epcgItems;
      formik.setFieldValue("products", updatedProducts);
    }
  };

  if (!epcgDetails.isEpcgItem) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography variant="h6" color="textSecondary">
          This product is not marked as an EPCG item
        </Typography>
        <Button
          variant="outlined"
          sx={{ mt: 2 }}
          onClick={() => handleEpcgFieldChange("isEpcgItem", true)}
        >
          Enable EPCG Details
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Card sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom color="primary">
          📌 This is a EPCG Item
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={epcgDetails.isEpcgItem || false}
                  onChange={(e) =>
                    handleEpcgFieldChange("isEpcgItem", e.target.checked)
                  }
                />
              }
              label="This is a EPCG item"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="EDI Regn. No"
              value={epcgDetails.ediRegnNo || ""}
              onChange={(e) =>
                handleEpcgFieldChange("ediRegnNo", e.target.value)
              }
              size="small"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Date"
              type="date"
              value={epcgDetails.date || ""}
              onChange={(e) => handleEpcgFieldChange("date", e.target.value)}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Item SNo (Part E)"
              value={epcgDetails.itemSnoPartE || ""}
              onChange={(e) =>
                handleEpcgFieldChange("itemSnoPartE", e.target.value)
              }
              size="small"
              fullWidth
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Export Qty Under Licence"
              type="number"
              value={epcgDetails.exportQtyUnderLicence || 0}
              onChange={(e) =>
                handleEpcgFieldChange(
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
              value={epcgDetails.licRefNo || ""}
              onChange={(e) =>
                handleEpcgFieldChange("licRefNo", e.target.value)
              }
              size="small"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Regn No"
              value={epcgDetails.regnNo || ""}
              onChange={(e) => handleEpcgFieldChange("regnNo", e.target.value)}
              size="small"
              fullWidth
            />
          </Grid>
        </Grid>

        {/* EPCG Items Table */}
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          EPCG Items
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
              {epcgDetails.epcgItems?.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.serialNumber}</TableCell>
                  <TableCell>
                    <TextField
                      value={item.itemSnoPartC || ""}
                      onChange={(e) =>
                        handleEpcgItemChange(
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
                        handleEpcgItemChange(idx, "description", e.target.value)
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
                        handleEpcgItemChange(
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
                        handleEpcgItemChange(idx, "unit", e.target.value)
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
                        handleEpcgItemChange(idx, "itemType", e.target.value)
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
                      onClick={() => deleteEpcgItem(idx)}
                      disabled={epcgDetails.epcgItems?.length <= 1}
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
          onClick={addEpcgItem}
          variant="outlined"
          size="small"
        >
          Add EPCG Item
        </Button>
      </Card>
    </Box>
  );
};

export default ProductEPCGTab;
