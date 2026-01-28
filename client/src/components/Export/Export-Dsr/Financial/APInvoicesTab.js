import React, { useState, useRef, useCallback } from "react";
import {
  Grid,
  Card,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Link,
} from "@mui/material";

const APInvoicesTab = ({ formik, directories, params, onUpdate }) => {
  const [snackbar, setSnackbar] = useState(false);
  const saveTimeoutRef = useRef(null);

  // Auto-save function
  const autoSave = useCallback(
    async (values) => {
      try {
        if (onUpdate) {
          await onUpdate(values);
        }
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    },
    [onUpdate]
  );

  // Handle field changes with auto-save
  const handleFieldChange = (field, value) => {
    formik.setFieldValue(field, value);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      autoSave(formik.values);
    }, 1500);
  };

  // Handle AP invoice changes
  const handleAPInvoiceChange = (index, field, value) => {
    const apInvoices = [...(formik.values.ap_invoices || [])];
    if (!apInvoices[index]) {
      apInvoices[index] = {
        date: "",
        bill_no: "",
        type: "INV",
        organization: "",
        currency: "INR",
        amount: 0,
        balance: 0,
        vendor_bill_no: "",
      };
    }
    apInvoices[index][field] = value;
    formik.setFieldValue("ap_invoices", apInvoices);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      autoSave(formik.values);
    }, 1500);
  };

  const addNewAPInvoice = () => {
    const apInvoices = [...(formik.values.ap_invoices || [])];
    apInvoices.push({
      date: "",
      bill_no: "",
      type: "INV",
      organization: "",
      currency: "INR",
      amount: 0,
      balance: 0,
      vendor_bill_no: "",
    });
    formik.setFieldValue("ap_invoices", apInvoices);
  };

  const deleteAPInvoice = (index) => {
    const apInvoices = [...(formik.values.ap_invoices || [])];
    apInvoices.splice(index, 1);
    formik.setFieldValue("ap_invoices", apInvoices);
  };

  const refreshInvoices = () => {
    // Implement refresh logic here

  };

  // Ensure we have at least one empty invoice for display
  const apInvoices = formik.values.ap_invoices?.length
    ? formik.values.ap_invoices
    : [
      {
        date: "",
        bill_no: "",
        type: "INV",
        organization: "",
        currency: "INR",
        amount: 0,
        balance: 0,
        vendor_bill_no: "",
      },
    ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        AP Invoices
      </Typography>

      <Grid container spacing={3}>
        {/* AP Invoices Table - Full Width */}
        <Grid item xs={12}>
          <Card sx={{ p: 2 }}>
            {/* Action Buttons */}
            <Box
              sx={{
                mb: 2,
                display: "flex",
                gap: 1,
                justifyContent: "flex-end",
              }}
            >
              <Button
                variant="contained"
                size="small"
                onClick={refreshInvoices}
                sx={{
                  fontSize: "0.75rem",
                  textTransform: "none",
                }}
              >
                Refresh
              </Button>
            </Box>

            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell>
                      <strong>Date</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Bill No</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Type</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Organization</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Curr</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Amount</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Balance</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Vendor Bill No</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Actions</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {apInvoices.map((invoice, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <TextField
                          size="small"
                          placeholder="dd-MM-yyyy"
                          value={invoice.date || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^[0-9-]*$/.test(val) && val.length <= 10) {
                              handleAPInvoiceChange(index, "date", val);
                            }
                          }}
                          sx={{ width: 140 }}
                          InputLabelProps={{ shrink: true }}
                        />
                      </TableCell>
                      <TableCell>
                        <Link
                          href="#"
                          underline="hover"
                          sx={{
                            color: "blue",
                            fontSize: "0.875rem",
                            cursor: "pointer",
                          }}
                        >
                          {invoice.bill_no || "Enter Bill No"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={invoice.type || "INV"}
                          onChange={(e) =>
                            handleAPInvoiceChange(index, "type", e.target.value)
                          }
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={invoice.organization || ""}
                          onChange={(e) =>
                            handleAPInvoiceChange(
                              index,
                              "organization",
                              e.target.value
                            )
                          }
                          sx={{ width: 200 }}
                          placeholder="Organization name"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={invoice.currency || "INR"}
                          onChange={(e) =>
                            handleAPInvoiceChange(
                              index,
                              "currency",
                              e.target.value
                            )
                          }
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={invoice.amount || ""}
                          onChange={(e) =>
                            handleAPInvoiceChange(
                              index,
                              "amount",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          sx={{ width: 120 }}
                          InputProps={{
                            inputProps: { min: 0, step: 0.01 },
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={invoice.balance || ""}
                          onChange={(e) =>
                            handleAPInvoiceChange(
                              index,
                              "balance",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          sx={{ width: 120 }}
                          InputProps={{
                            inputProps: { min: 0, step: 0.01 },
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={invoice.vendor_bill_no || ""}
                          onChange={(e) =>
                            handleAPInvoiceChange(
                              index,
                              "vendor_bill_no",
                              e.target.value
                            )
                          }
                          sx={{ width: 140 }}
                          placeholder="Vendor bill number"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => deleteAPInvoice(index)}
                          sx={{ fontSize: "0.75rem" }}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Add New Button */}
            <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={addNewAPInvoice}
                sx={{ fontSize: "0.75rem", textTransform: "none" }}
              >
                Add New Invoice
              </Button>
            </Box>

            {/* Summary Information Section */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                AP Invoice Summary
              </Typography>

              <Grid container spacing={2}>
                {/* Total AP Amount */}
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Total AP Amount"
                    type="number"
                    size="small"
                    value={formik.values.total_ap_amount || ""}
                    onChange={(e) =>
                      handleFieldChange(
                        "total_ap_amount",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="0.00"
                    InputProps={{
                      inputProps: { min: 0, step: 0.01 },
                    }}
                  />
                </Grid>

                {/* Outstanding Balance */}
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Outstanding Balance"
                    type="number"
                    size="small"
                    value={formik.values.ap_outstanding_balance || ""}
                    onChange={(e) =>
                      handleFieldChange(
                        "ap_outstanding_balance",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="0.00"
                    InputProps={{
                      inputProps: { min: 0, step: 0.01 },
                    }}
                  />
                </Grid>

                {/* Default Currency */}
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Default Currency"
                    size="small"
                    value={formik.values.ap_default_currency || "INR"}
                    onChange={(e) =>
                      handleFieldChange("ap_default_currency", e.target.value)
                    }
                  />
                </Grid>

                {/* Payment Terms */}
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Payment Terms (Days)"
                    type="number"
                    size="small"
                    value={formik.values.ap_payment_terms_days || ""}
                    onChange={(e) =>
                      handleFieldChange(
                        "ap_payment_terms_days",
                        parseInt(e.target.value) || 30
                      )
                    }
                    placeholder="30"
                    InputProps={{
                      inputProps: { min: 0, step: 1 },
                    }}
                  />
                </Grid>

                {/* AP Notes */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="AP Notes"
                    multiline
                    rows={3}
                    size="small"
                    value={formik.values.ap_notes || ""}
                    onChange={(e) =>
                      handleFieldChange("ap_notes", e.target.value)
                    }
                    placeholder="Add notes about AP invoices..."
                  />
                </Grid>
              </Grid>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default APInvoicesTab;
