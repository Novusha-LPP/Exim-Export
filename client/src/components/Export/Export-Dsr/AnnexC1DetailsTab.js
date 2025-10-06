// AnnexC1DetailsTab.jsx - Annex C1 Details tab component
import React, { useState, useRef, useCallback } from "react";
import {
  Grid,
  Card,
  TextField,
  Typography,
  Box,
  Checkbox,
  FormControlLabel,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";

const AnnexC1DetailsTab = ({ formik, directories, params, onUpdate }) => {
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

  // Handle document list changes
  const handleDocumentChange = (index, field, value) => {
    const documents = [...(formik.values.annex_c1_documents || [])];
    documents[index] = { ...documents[index], [field]: value };
    formik.setFieldValue('annex_c1_documents', documents);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      autoSave(formik.values);
    }, 1500);
  };

  const addNewDocument = () => {
    const documents = [...(formik.values.annex_c1_documents || [])];
    documents.push({
      sr_no: documents.length + 1,
      document_name: ""
    });
    formik.setFieldValue('annex_c1_documents', documents);
  };

  const deleteDocument = (index) => {
    const documents = [...(formik.values.annex_c1_documents || [])];
    documents.splice(index, 1);
    // Re-number the remaining documents
    documents.forEach((doc, idx) => {
      doc.sr_no = idx + 1;
    });
    formik.setFieldValue('annex_c1_documents', documents);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Annex C1 Details
      </Typography>
      
      <Grid container spacing={3}>
        {/* Left Column - Export/Import Details */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, height: "100%" }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Export/Import Information
            </Typography>
            
            <Grid container spacing={2}>
              {/* IE Code Of EOU */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="IE Code Of EOU"
                  size="small"
                  value={formik.values.ie_code_of_eou || ''}
                  onChange={(e) => handleFieldChange('ie_code_of_eou', e.target.value)}
                  placeholder="Enter IE Code of EOU"
                />
              </Grid>

              {/* Branch Sr No */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Branch Sr No"
                  size="small"
                  value={formik.values.branch_sr_no || ''}
                  onChange={(e) => handleFieldChange('branch_sr_no', e.target.value)}
                  placeholder="0"
                />
              </Grid>

              {/* Examination Date */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Examination Date"
                  type="date"
                  size="small"
                  value={formik.values.examination_date || ''}
                  onChange={(e) => handleFieldChange('examination_date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Examining Officer */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Examining Officer"
                  size="small"
                  value={formik.values.examining_officer || ''}
                  onChange={(e) => handleFieldChange('examining_officer', e.target.value)}
                  placeholder="Enter examining officer name"
                />
              </Grid>

              {/* Supervising Officer */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Supervising Officer"
                  size="small"
                  value={formik.values.supervising_officer || ''}
                  onChange={(e) => handleFieldChange('supervising_officer', e.target.value)}
                  placeholder="Enter supervising officer name"
                />
              </Grid>

              {/* Commissionerate */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Commissionerate"
                  size="small"
                  value={formik.values.commissionerate || ''}
                  onChange={(e) => handleFieldChange('commissionerate', e.target.value)}
                  placeholder="Enter commissionerate"
                />
              </Grid>

              {/* Verified by Examining Officer Checkbox */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formik.values.verified_by_examining_officer || false}
                      onChange={(e) => handleFieldChange('verified_by_examining_officer', e.target.checked)}
                      size="small"
                    />
                  }
                  label="Verified by Examining Officer"
                  sx={{ 
                    fontSize: "0.875rem",
                    "& .MuiFormControlLabel-label": { fontSize: "0.875rem" }
                  }}
                />
              </Grid>

              {/* Seal Number */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Seal Number"
                  size="small"
                  value={formik.values.annex_seal_number || ''}
                  onChange={(e) => handleFieldChange('annex_seal_number', e.target.value)}
                  placeholder="Enter seal number"
                />
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Right Column - Additional Details */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, height: "100%" }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Additional Information
            </Typography>
            
            <Grid container spacing={2}>
              {/* Designation */}
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Designation"
                  size="small"
                  value={formik.values.annex_designation || ''}
                  onChange={(e) => handleFieldChange('annex_designation', e.target.value)}
                  placeholder="Enter designation"
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Designation"
                  size="small"
                  value={formik.values.annex_designation_2 || ''}
                  onChange={(e) => handleFieldChange('annex_designation_2', e.target.value)}
                  placeholder="Enter designation"
                />
              </Grid>

              {/* Division */}
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Division"
                  size="small"
                  value={formik.values.annex_division || ''}
                  onChange={(e) => handleFieldChange('annex_division', e.target.value)}
                  placeholder="Enter division"
                />
              </Grid>

              {/* Range */}
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Range"
                  size="small"
                  value={formik.values.annex_range || ''}
                  onChange={(e) => handleFieldChange('annex_range', e.target.value)}
                  placeholder="Enter range"
                />
              </Grid>

              {/* Sample Forwarded Checkbox */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formik.values.sample_forwarded || false}
                      onChange={(e) => handleFieldChange('sample_forwarded', e.target.checked)}
                      size="small"
                    />
                  }
                  label="Sample Forwarded"
                  sx={{ 
                    fontSize: "0.875rem",
                    "& .MuiFormControlLabel-label": { fontSize: "0.875rem" }
                  }}
                />
              </Grid>

              {/* Additional Notes */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Additional Notes"
                  multiline
                  rows={4}
                  size="small"
                  value={formik.values.annex_additional_notes || ''}
                  onChange={(e) => handleFieldChange('annex_additional_notes', e.target.value)}
                  placeholder="Enter any additional notes..."
                />
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Documents Section - Full Width */}
        <Grid item xs={12}>
          <Card sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Documents
            </Typography>
            
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Sr No</strong></TableCell>
                    <TableCell><strong>Document Name</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(formik.values.annex_c1_documents || []).map((doc, index) => (
                    <TableRow key={index}>
                      <TableCell>{doc.sr_no}</TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          value={doc.document_name || ''}
                          onChange={(e) => handleDocumentChange(index, 'document_name', e.target.value)}
                          placeholder="Enter document name"
                        />
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="small" 
                          color="error"
                          onClick={() => deleteDocument(index)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Action Buttons */}
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button variant="outlined" size="small" onClick={addNewDocument}>
                New
              </Button>
              <Button variant="outlined" size="small">
                Edit
              </Button>
              <Button variant="outlined" size="small">
                Update
              </Button>
              <Button variant="outlined" size="small">
                Update & New
              </Button>
              <Button variant="outlined" size="small" color="error">
                Delete
              </Button>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnnexC1DetailsTab;
