/**
 * ChargesTab.js
 * Wrapper that plugs the shared ChargesGrid component into the Export DSR job view.
 * Reads the job _id from multiple sources to handle different parent module patterns.
 */
import React from "react";
import ChargesGrid from "../../../chargesGrid/index.jsx";
import { FieldArray, FormikProvider } from "formik";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  Grid,
  TextField,
  MenuItem,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

const ChargesTab = ({ job, formik }) => {
  // Try every known location where the job _id could live
  const parentId =
    job?._id ||
    job?.id ||
    formik?.values?._id ||
    formik?.values?.id ||
    null;

  const jobData = job || formik?.values || {};
  const jobNo = jobData.job_no || jobData.jobNumber || "";
  const jobYear = jobData.year || "";
  const shippingLine = jobData.shipping_line_airline || "";
  const exporterName = jobData.exporter || "";
  const invoices = jobData.invoices || [];
  const firstInvoice = invoices[0] || {};

  const containerCount = jobData.containers?.length || 0;
  const invoiceCount = jobData.invoices?.length || 0;

  if (!parentId) {
    return (
      <div style={{ padding: 24, color: "#6b7280", fontSize: 13 }}>
        Loading charges… (waiting for job data)
      </div>
    );
  }

  return (
    <FormikProvider value={formik}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <ChargesGrid
        parentId={parentId}
        parentModule="ExportJob"
        jobNumber={jobNo}
        jobDisplayNumber={jobNo}
        jobYear={jobYear}
        shippingLineAirline={shippingLine}
        importerName={exporterName}
        invoiceNumber={firstInvoice.invoiceNumber || ""}
        invoiceDate={firstInvoice.invoiceDate || ""}
        invoiceValue={firstInvoice.invoiceValue || ""}
        invoiceCount={invoiceCount}
        containerCount={containerCount}
        hideTabs={false}
      />

      {/* Fine Section */}
      <Card sx={{ 
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)", 
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid #e0e6ed"
      }}>
        <Box sx={{ 
          background: "linear-gradient(90deg, #f8fafc 0%, #ffffff 100%)", 
          p: 2, 
          borderBottom: "1px solid #e2e8f0",
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6" sx={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", display: 'flex', alignItems: 'center' }}>
            <Box component="span" sx={{ width: 4, height: 18, bgcolor: "#d32f2f", mr: 1.5, borderRadius: 1 }} />
            Fine Report
          </Typography>
        </Box>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Total Fine Amount (Summary)"
                size="small"
                type="number"
                name="fine_amount"
                value={formik.values.fine_amount || ""}
                onChange={formik.handleChange}
                placeholder="0.00"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="Summary Accountability"
                size="small"
                name="fine_accountability"
                value={formik.values.fine_accountability || ""}
                onChange={formik.handleChange}
              >
                <MenuItem value="By Us">By Us (Internal)</MenuItem>
                <MenuItem value="By Exporter">By Exporter (Billable)</MenuItem>
                <MenuItem value="Not Applicable">Not Applicable</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="General Remarks"
                size="small"
                name="fine_remarks"
                value={formik.values.fine_remarks || ""}
                onChange={formik.handleChange}
                placeholder="Any special notes..."
              />
            </Grid>
          </Grid>

          <Divider sx={{ mb: 3 }} />

          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: "#475569" }}>
            Individual Fine Breakdown
          </Typography>

          <FieldArray name="fines">
            {({ push, remove }) => (
              <Box>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: "#f8fafc" }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, color: "#64748b", py: 1.5 }}>Fine Type</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: "#64748b" }}>Accountability</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: "#64748b" }}>Amount (INR)</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: "#64748b" }}>Remarks</TableCell>
                        <TableCell sx={{ width: 50 }}></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formik.values.fines && formik.values.fines.length > 0 ? (
                        formik.values.fines.map((fine, index) => (
                          <TableRow key={index} sx={{ "&:hover": { backgroundColor: "#fcfdfe" } }}>
                            <TableCell>
                              <TextField
                                select
                                fullWidth
                                size="small"
                                name={`fines.${index}.fineType`}
                                value={fine.fineType || ""}
                                onChange={formik.handleChange}
                                variant="standard"
                                InputProps={{ disableUnderline: true }}
                              >
                                <MenuItem value="Challan">Challan</MenuItem>
                                <MenuItem value="Fine by Officer">Fine by Officer</MenuItem>
                                <MenuItem value="Notesheet Amount">Notesheet Amount</MenuItem>
                                <MenuItem value="Misc">Miscellaneous</MenuItem>
                              </TextField>
                            </TableCell>
                            <TableCell>
                              <TextField
                                select
                                fullWidth
                                size="small"
                                name={`fines.${index}.accountability`}
                                value={fine.accountability || ""}
                                onChange={formik.handleChange}
                                variant="standard"
                                InputProps={{ disableUnderline: true }}
                              >
                                <MenuItem value="By Us">By Us</MenuItem>
                                <MenuItem value="By Exporter">By Exporter</MenuItem>
                              </TextField>
                            </TableCell>
                            <TableCell>
                              <TextField
                                fullWidth
                                size="small"
                                type="number"
                                name={`fines.${index}.amount`}
                                value={fine.amount || ""}
                                onChange={formik.handleChange}
                                variant="standard"
                                placeholder="0"
                                InputProps={{ disableUnderline: true }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                fullWidth
                                size="small"
                                name={`fines.${index}.remarks`}
                                value={fine.remarks || ""}
                                onChange={formik.handleChange}
                                variant="standard"
                                placeholder="Details..."
                                InputProps={{ disableUnderline: true }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <IconButton size="small" color="error" onClick={() => remove(index)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 4, color: "#94a3b8", fontStyle: "italic", fontSize: "13px" }}>
                            No individual fines recorded for this job.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-start' }}>
                  <Button 
                    startIcon={<AddIcon />} 
                    size="small" 
                    variant="outlined" 
                    sx={{ borderRadius: "6px", textTransform: "none", fontSize: "12px" }}
                    onClick={() => push({ fineType: "Challan", accountability: "By Exporter", amount: 0, remarks: "" })}
                  >
                    Add Fine Entry
                  </Button>
                </Box>
              </Box>
            )}
          </FieldArray>
        </CardContent>
      </Card>
    </Box>
    </FormikProvider>
  );
};

export default ChargesTab;
