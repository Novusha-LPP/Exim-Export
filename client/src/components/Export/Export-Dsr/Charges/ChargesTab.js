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
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import FileUpload from "../../../gallery/FileUpload.js";
import ImagePreview from "../../../gallery/ImagePreview.js";
import DateInput from "../../../common/DateInput.js";

const ChargesTab = ({ job, formik, isEditable = true }) => {
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

  const headerBoxStyle = {
    background: "linear-gradient(to right, #f8fafc 0%, #ffffff 100%)",
    px: 2,
    py: 1.25,
    borderBottom: "1px solid #eef2f6",
    display: 'flex',
    alignItems: 'center',
  };

  const sectionCardStyle = {
    boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
    borderRadius: "10px",
    border: "1px solid #eef2f6",
    overflow: "hidden",
    mb: 2.5
  };

  return (
    <FormikProvider value={formik}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <ChargesGrid
          parentId={parentId}
          parentModule="ExportJob"
          jobNumber={jobNo}
          jobDisplayNumber={jobNo}
          jobYear={jobYear}
          shippingLineAirline={shippingLine}
          exporterName={exporterName}
          invoiceNumber={firstInvoice.invoiceNumber || ""}
          invoiceDate={firstInvoice.invoiceDate || ""}
          invoiceValue={firstInvoice.invoiceValue || ""}
          invoiceCount={invoiceCount}
          containerCount={containerCount}
          hideTabs={false}
          isEditable={isEditable}
        />

        {/* Fine Section */}
        <fieldset disabled={!isEditable} style={{ border: 'none', padding: 0, margin: 0, width: '100%', background: 'transparent' }}>
          <Card sx={sectionCardStyle}>
            {/* ... rest of Fines and Billing sections ... */}
            <Box sx={headerBoxStyle}>
              <Box component="span" sx={{ width: 3, height: 16, bgcolor: "#ef4444", mr: 1, borderRadius: 0.5 }} />
              <Typography variant="h6" sx={{ fontSize: "14px", fontWeight: 700, color: "#334155" }}>
                Fine Report & Penalties
              </Typography>
            </Box>
            <CardContent sx={{ p: 2 }}>
              <FieldArray name="fines">
                {({ push, remove }) => (
                  <Box>
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "8px", border: "1px solid #f1f5f9", overflow: 'hidden' }}>
                      <Table size="small">
                        <TableHead sx={{ backgroundColor: "#fbfcfd" }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600, color: "#64748b", py: 1.25, fontSize: "11px", textTransform: 'uppercase', letterSpacing: '0.02em' }}>Fine Type</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: "#64748b", py: 1.25, fontSize: "11px", textTransform: 'uppercase', letterSpacing: '0.02em' }}>Accountability</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: "#64748b", py: 1.25, fontSize: "11px", textTransform: 'uppercase', letterSpacing: '0.02em' }}>Amount (INR)</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: "#64748b", py: 1.25, fontSize: "11px", textTransform: 'uppercase', letterSpacing: '0.02em' }}>Remarks</TableCell>
                            <TableCell sx={{ width: 40 }}></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {formik.values.fines && formik.values.fines.length > 0 ? (
                            formik.values.fines.map((fine, index) => (
                              <TableRow key={index} sx={{ "&:hover": { backgroundColor: "#f9fafb" }, transition: 'background-color 0.2s' }}>
                                <TableCell>
                                  <TextField
                                    select
                                    fullWidth
                                    size="small"
                                    name={`fines.${index}.fineType`}
                                    value={fine.fineType || ""}
                                    onChange={formik.handleChange}
                                    variant="standard"
                                    InputProps={{ disableUnderline: true, style: { fontSize: "13px", color: '#1e293b' } }}
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
                                    InputProps={{ disableUnderline: true, style: { fontSize: "13px", color: '#1e293b' } }}
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
                                    InputProps={{ disableUnderline: true, style: { fontSize: "13px", fontWeight: 600, color: '#0f172a' } }}
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
                                    InputProps={{ disableUnderline: true, style: { fontSize: "13px", color: '#475569' } }}
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <IconButton
                                    size="small"
                                    sx={{ color: '#cbd5e1', '&:hover': { color: '#ef4444' } }}
                                    onClick={() => remove(index)}
                                  >
                                    <DeleteIcon sx={{ fontSize: "16px" }} />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} align="center" sx={{ py: 3, color: "#94a3b8", fontStyle: "italic", fontSize: "12px" }}>
                                No fines recorded for this shipment.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <Box sx={{ mt: 1.5 }}>
                      <Button
                        startIcon={<AddIcon sx={{ fontSize: '16px' }} />}
                        size="small"
                        variant="text"
                        sx={{
                          textTransform: "none",
                          fontSize: "12px",
                          color: "#6366f1",
                          fontWeight: 600,
                          '&:hover': { background: '#f5f3ff' }
                        }}
                        onClick={() => push({ fineType: "Challan", accountability: "By Exporter", amount: 0, remarks: "" })}
                      >
                        Add Penalty Entry
                      </Button>
                    </Box>
                  </Box>
                )}
              </FieldArray>
            </CardContent>
          </Card>
  
          {/* Invoice & Documents Section */}
          <Card sx={sectionCardStyle}>
            <Box sx={headerBoxStyle}>
              <Box component="span" sx={{ width: 3, height: 16, bgcolor: "#6366f1", mr: 1, borderRadius: 0.5 }} />
              <Typography variant="h6" sx={{ fontSize: "14px", fontWeight: 700, color: "#334155" }}>
                Billing Submission & Document Proof
              </Typography>
            </Box>
            <CardContent sx={{ p: 2 }}>
              <Grid container spacing={4} alignItems="flex-start">
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, mb: 1, display: "block", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Billing Date
                  </Typography>
                  <DateInput
                    name="operations[0].statusDetails[0].billingDocsSentDt"
                    value={formik.values.operations?.[0]?.statusDetails?.[0]?.billingDocsSentDt || ""}
                    onChange={(e) => formik.setFieldValue("operations[0].statusDetails[0].billingDocsSentDt", e.target.value)}
                    style={{
                      width: "100%",
                      fontSize: "13px",
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      height: "38px",
                      background: "#fcfdfe",
                      outline: "none",
                      boxSizing: "border-box",
                      fontWeight: 500,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, mb: 1, display: "block", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Invoice Document / Bill Copy
                  </Typography>
                  <Box sx={{
                    p: 1.5,
                    border: "1px dashed #e2e8f0",
                    borderRadius: "10px",
                    bgcolor: "#fbfcfd",
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f8fafc' }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <FileUpload
                        bucketPath="billing_docs"
                        onFilesUploaded={(urls) => {
                          const current = formik.values.operations?.[0]?.statusDetails?.[0]?.billingDocsSentUpload || [];
                          formik.setFieldValue("operations[0].statusDetails[0].billingDocsSentUpload", [...current, ...urls]);
                        }}
                      />
                      <ImagePreview
                        images={formik.values.operations?.[0]?.statusDetails?.[0]?.billingDocsSentUpload || []}
                        onDeleteImage={(index) => {
                          const current = formik.values.operations?.[0]?.statusDetails?.[0]?.billingDocsSentUpload || [];
                          const updated = current.filter((_, i) => i !== index);
                          formik.setFieldValue("operations[0].statusDetails[0].billingDocsSentUpload", updated);
                        }}
                        readOnly={!isEditable}
                      />
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'center', pt: { md: 3.5 } }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formik.values.financial_lock || false}
                        onChange={(e) => formik.setFieldValue("financial_lock", e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                        Financial Lock
                      </Typography>
                    }
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </fieldset>
      </Box>
    </FormikProvider>
  );
};

export default ChargesTab;
