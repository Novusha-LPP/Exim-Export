import React, { useRef, useCallback } from "react";
import {
  Box,
  Card,
  Typography,
  Button,
  Grid,
  TextField,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
} from "@mui/material";

const ProductMainTab = ({ formik }) => {
  const saveTimeoutRef = useRef(null);

  // Handle grid (row/cell) edit
  const handleProductFieldChange = (idx, field, value) => {
    const updated = [...(formik.values.products || [])];
    updated[idx][field] = value;
    formik.setFieldValue("products", updated);
  };
  const addNewProduct = () => {
    const products = [...(formik.values.products || [])];
    products.push({
      serialNumber: products.length + 1,
      description: "",
      ritc: "",
      quantity: 0,
      socQuantity: 0,
      unitPrice: 0,
      per: "",
      amount: 0,
    });
    formik.setFieldValue("products", products);
  };
  const deleteProduct = (idx) => {
    const products = [...(formik.values.products || [])];
    products.splice(idx, 1);
    formik.setFieldValue("products", products);
  };

  // For editing the selected product below the table
  const products = formik.values.products || [];
  const selectedIdx = 0; // You could set this based on UI selection logic if needed

  return (
    <Box>
      <Card sx={{ mb: 2, p: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Product Items
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Sr No</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>RITC</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>SQC Qty</TableCell>
                <TableCell>Unit Price</TableCell>
                <TableCell>Per</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((prod, idx) => (
                <TableRow key={idx}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>
                    <TextField
                      value={prod.description}
                      onChange={(e) =>
                        handleProductFieldChange(
                          idx,
                          "description",
                          e.target.value
                        )
                      }
                      size="small"
                      variant="outlined"
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={prod.ritc}
                      onChange={(e) =>
                        handleProductFieldChange(idx, "ritc", e.target.value)
                      }
                      size="small"
                      variant="outlined"
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={prod.quantity}
                      onChange={(e) =>
                        handleProductFieldChange(
                          idx,
                          "quantity",
                          e.target.value
                        )
                      }
                      size="small"
                      type="number"
                      variant="outlined"
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={prod.socQuantity}
                      onChange={(e) =>
                        handleProductFieldChange(
                          idx,
                          "socQuantity",
                          e.target.value
                        )
                      }
                      size="small"
                      type="number"
                      variant="outlined"
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={prod.unitPrice}
                      onChange={(e) =>
                        handleProductFieldChange(
                          idx,
                          "unitPrice",
                          e.target.value
                        )
                      }
                      size="small"
                      type="number"
                      variant="outlined"
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={prod.per}
                      onChange={(e) =>
                        handleProductFieldChange(idx, "per", e.target.value)
                      }
                      size="small"
                      variant="outlined"
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={prod.amount}
                      onChange={(e) =>
                        handleProductFieldChange(idx, "amount", e.target.value)
                      }
                      size="small"
                      type="number"
                      variant="outlined"
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      color="error"
                      size="small"
                      onClick={() => deleteProduct(idx)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Button onClick={addNewProduct} variant="outlined" sx={{ mt: 2 }}>
          Add New Product
        </Button>
      </Card>
    </Box>
  );
};
export default ProductMain