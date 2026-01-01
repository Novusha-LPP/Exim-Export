// ARInvoicesTab.jsx - AR Invoices tab component
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

const ARInvoicesTab = ({ formik, directories, params, onUpdate }) => {
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

  // Handle AR invoice changes
  const handleARInvoiceChange = (index, field, value) => {
    const arInvoices = [...(formik.values.ar_invoices || [])];
    arInvoices[index] = { ...arInvoices[index], [field]: value };
    formik.setFieldValue("ar_invoices", arInvoices);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      autoSave(formik.values);
    }, 1500);
  };

  const addNewARInvoice = () => {
    const arInvoices = [...(formik.values.ar_invoices || [])];
    arInvoices.push({
      date: "",
      bill_no: "",
      type: "",
      organization: "",
      currency: "",
      amount: 0,
      balance: 0,
    });
    formik.setFieldValue("ar_invoices", arInvoices);
  };

  const deleteARInvoice = (index) => {
    const arInvoices = [...(formik.values.ar_invoices || [])];
    arInvoices.splice(index, 1);
    formik.setFieldValue("ar_invoices", arInvoices);
  };

  // Initialize with sample data if empty
  const arInvoices = formik.values.ar_invoices?.length
    ? formik.values.ar_invoices
    : [
      {
        date: "",
        bill_no: "",
        type: "",
        organization: "",
        currency: "",
        amount: "",
        balance: "",
      },
      {
        date: "",
        bill_no: "",
        type: "",
        organization: "",
        currency: "",
        amount: "",
        balance: "",
      },
    ];

  const refreshInvoices = () => {
    // Implement refresh logic here
    console.log("Refreshing AR Invoices...");
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        AR Invoices
      </Typography>

      <Grid container spacing={3}>
        {/* AR Invoices Table - Full Width */}
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
                      <strong>Bill No.</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Type</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Organization</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Cur</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Amount</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Balance</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Actions</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {arInvoices.map((invoice, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <TextField
                          size="small"
                          placeholder="dd-mm-yyyy"
                          value={invoice.date || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^[0-9-]*$/.test(val) && val.length <= 10) {
                              handleARInvoiceChange(index, "date", val);
                            }
                          }}
                          sx={{ width: 130 }}
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
                          {invoice.bill_no}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={invoice.type || ""}
                          onChange={(e) =>
                            handleARInvoiceChange(index, "type", e.target.value)
                          }
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={invoice.organization || ""}
                          onChange={(e) =>
                            handleARInvoiceChange(
                              index,
                              "organization",
                              e.target.value
                            )
                          }
                          sx={{ width: 200 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={invoice.currency || ""}
                          onChange={(e) =>
                            handleARInvoiceChange(
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
                            handleARInvoiceChange(
                              index,
                              "amount",
                              e.target.value
                            )
                          }
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{ display: "flex", gap: 1, alignItems: "center" }}
                        >
                          <TextField
                            size="small"
                            type="number"
                            value={invoice.balance || ""}
                            onChange={(e) =>
                              handleARInvoiceChange(
                                index,
                                "balance",
                                e.target.value
                              )
                            }
                            sx={{ width: 100 }}
                          />
                          <Link
                            href="#"
                            underline="hover"
                            sx={{
                              color: "blue",
                              fontSize: "0.75rem",
                              cursor: "pointer",
                            }}
                          >
                            View
                          </Link>
                          <Link
                            href="#"
                            underline="hover"
                            sx={{
                              color: "blue",
                              fontSize: "0.75rem",
                              cursor: "pointer",
                            }}
                          >
                            Show Status
                          </Link>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => deleteARInvoice(index)}
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
                onClick={addNewARInvoice}
                sx={{ fontSize: "0.75rem", textTransform: "none" }}
              >
                Add New Invoice
              </Button>
            </Box>

            {/* Additional Information Section */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                AR Invoice Settings
              </Typography>

              <Grid container spacing={2}>
                {/* Total AR Amount */}
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Total AR Amount"
                    type="number"
                    size="small"
                    value={formik.values.total_ar_amount || ""}
                    onChange={(e) =>
                      handleFieldChange("total_ar_amount", e.target.value)
                    }
                    placeholder="0.00"
                  />
                </Grid>

                {/* Outstanding Balance */}
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Outstanding Balance"
                    type="number"
                    size="small"
                    value={formik.values.outstanding_balance || ""}
                    onChange={(e) =>
                      handleFieldChange("outstanding_balance", e.target.value)
                    }
                    placeholder="0.00"
                  />
                </Grid>

                {/* Default Currency */}
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Default Currency"
                    size="small"
                    value={formik.values.ar_default_currency || "INR"}
                    onChange={(e) =>
                      handleFieldChange("ar_default_currency", e.target.value)
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
                    value={formik.values.ar_payment_terms_days || ""}
                    onChange={(e) =>
                      handleFieldChange("ar_payment_terms_days", e.target.value)
                    }
                    placeholder="30"
                  />
                </Grid>

                {/* Last Updated */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Last Updated"
                    size="small"
                    placeholder="dd-mm-yyyy"
                    value={formik.values.ar_last_updated || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^[0-9-]*$/.test(val) && val.length <= 10) {
                        handleFieldChange("ar_last_updated", val);
                      }
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                {/* AR Notes */}
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="AR Notes"
                    multiline
                    rows={2}
                    size="small"
                    value={formik.values.ar_notes || ""}
                    onChange={(e) =>
                      handleFieldChange("ar_notes", e.target.value)
                    }
                    placeholder="Enter any notes about AR invoices..."
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

export default ARInvoicesTab;
