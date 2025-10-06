import React, { useState, useRef, useCallback } from "react";
import {
  Grid,
  Card,
  Typography,
  Box,
  Button,
  TextField,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from "@mui/material";

const TrackingCompletedTab = ({ formik, directories, params, onUpdate }) => {
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

  const handleMilestoneChange = (index, field, value) => {
    const milestones = [...(formik.values.milestones || [])];
    if (!milestones[index]) {
      milestones[index] = {
        milestoneName: "",
        planDate: "dd-MMM-yyyy HH:mm",
        actualDate: "dd-mmm-yyyy hh:mm",
        isCompleted: false,
        isMandatory: false,
        completedBy: "",
        remarks: ""
      };
    }
    milestones[index][field] = value;
    formik.setFieldValue('milestones', milestones);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      autoSave(formik.values);
    }, 1500);
  };

  const reloadMilestones = () => {
    console.log("Reloading milestones...");
    // Implement reload logic here
  };

  const updatePlanDate = () => {
    console.log("Updating plan dates...");
    // Implement update logic here
  };

  const milestones = formik.values.milestones || [];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Job Tracking Completed
      </Typography>
      
      <Grid container spacing={3}>
        {/* Header Section */}
        <Grid item xs={12}>
          <Card sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  label="Job Tracking Completed"
                  type="date"
                  size="small"
                  fullWidth
                  value={formik.values.job_tracking_completed || ''}
                  onChange={(e) => handleFieldChange('job_tracking_completed', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <TextField
                  label="Customer Remark"
                  size="small"
                  fullWidth
                  value={formik.values.customer_remark || ''}
                  onChange={(e) => handleFieldChange('customer_remark', e.target.value)}
                  placeholder="Ready for Billing"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Workflow for
                  </Typography>
                  <Typography variant="body2">
                    Location: {formik.values.workflow_location || 'All Locations'}
                  </Typography>
                  <Typography variant="body2">
                    Shipment Type: {formik.values.shipment_type || 'International'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Milestones Table */}
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 2 }}>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell><strong>Milestone Name</strong></TableCell>
                    <TableCell><strong>Plan Date</strong></TableCell>
                    <TableCell><strong>Actual Date</strong></TableCell>
                    <TableCell><strong>Completed</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {milestones.map((milestone, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {milestone.isMandatory && (
                            <span style={{ color: 'red', marginRight: 4 }}>*</span>
                          )}
                          {milestone.milestoneName}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={milestone.planDate || ''}
                          onChange={(e) => handleMilestoneChange(index, 'planDate', e.target.value)}
                          placeholder="dd-MMM-yyyy HH:mm"
                          sx={{ width: 150 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={milestone.actualDate || ''}
                          onChange={(e) => handleMilestoneChange(index, 'actualDate', e.target.value)}
                          placeholder="dd-mmm-yyyy hh:mm"
                          sx={{ 
                            width: 150,
                            '& .MuiInputBase-input': {
                              color: milestone.actualDate && milestone.actualDate !== 'dd-mmm-yyyy hh:mm' 
                                ? 'inherit' 
                                : '#ccc'
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={milestone.isCompleted || false}
                          onChange={(e) => handleMilestoneChange(index, 'isCompleted', e.target.checked)}
                          color="primary"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Action Buttons */}
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button 
                variant="outlined" 
                size="small"
                onClick={reloadMilestones}
                sx={{ fontSize: "0.75rem", textTransform: "none" }}
              >
                Reload Milestones
              </Button>
              <Button 
                variant="outlined" 
                size="small"
                onClick={updatePlanDate}
                sx={{ fontSize: "0.75rem", textTransform: "none" }}
              >
                Update Plan Date
              </Button>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value="Show All"
                  displayEmpty
                  sx={{ fontSize: "0.75rem" }}
                >
                  <MenuItem value="Show All">Show All</MenuItem>
                  <MenuItem value="Completed Only">Completed Only</MenuItem>
                  <MenuItem value="Pending Only">Pending Only</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              * - Indicates that milestone is mandatory.
            </Typography>
          </Card>
        </Grid>

        {/* Right Panel - Milestone Details */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Milestone:
            </Typography>
            
            <TextField
              label="Remarks"
              multiline
              rows={3}
              fullWidth
              size="small"
              value={formik.values.milestone_remarks || ''}
              onChange={(e) => handleFieldChange('milestone_remarks', e.target.value)}
              sx={{ mb: 2 }}
            />

            <TextField
              label="View/Upload Documents"
              size="small"
              fullWidth
              value={formik.values.milestone_view_upload_documents || ''}
              onChange={(e) => handleFieldChange('milestone_view_upload_documents', e.target.value)}
              sx={{ mb: 2 }}
            />

            <FormControl size="small" fullWidth>
              <InputLabel>Handled By</InputLabel>
              <Select
                value={formik.values.milestone_handled_by || ''}
                onChange={(e) => handleFieldChange('milestone_handled_by', e.target.value)}
              >
                <MenuItem value="">Select User</MenuItem>
                <MenuItem value="Jyothish K R">Jyothish K R</MenuItem>
                <MenuItem value="Admin">Admin</MenuItem>
                <MenuItem value="User1">User1</MenuItem>
              </Select>
            </FormControl>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TrackingCompletedTab;
