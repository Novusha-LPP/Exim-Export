import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Button,
  Typography,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Tabs,
  Tab
} from "@mui/material";

function TabPanel({ children, value, index, ...other }) {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 1 }}>{children}</Box>}
    </div>
  );
}

const PaymentRequestForm = ({ request, editMode, formik, onClose, onSave }) => {
  const [formData, setFormData] = useState(request || {});
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (request) {
      setFormData(request);
    }
  }, [request]);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleChargeChange = (index, field, value) => {
    const charges = [...(formData.charges || [])];
    if (!charges[index]) charges[index] = {};
    charges[index][field] = value;
    setFormData(prev => ({ ...prev, charges }));
  };

  const addCharge = () => {
    const charges = [...(formData.charges || [])];
    charges.push({
      chargeName: "",
      amountTC: 0,
      curr: "INR",
      amountHC: 0,
      payableTo: ""
    });
    setFormData(prev => ({ ...prev, charges }));
  };

  const handlePurchaseBillChange = (index, field, value) => {
    const purchaseBills = [...(formData.purchaseBills || [])];
    if (!purchaseBills[index]) purchaseBills[index] = {};
    purchaseBills[index][field] = value;
    setFormData(prev => ({ ...prev, purchaseBills }));
  };

  const handleSave = () => {
    if (onSave) {
      onSave(formData);
    }
  };

  const handleSaveAndClose = () => {
    handleSave();
    onClose();
  };

  const handleSaveAndNew = () => {
    handleSave();
    setFormData({
      date: new Date().toISOString().split('T')[0],
      no: `PR-${Date.now()}`,
      mode: "Electronic",
      payeeName: "",
      amount: 0,
      status: "Pending",
      remarks: "",
      payTo: "Vendor",
      against: "Expense",
      jobExpenses: true,
      nonJobExpenses: false,
      jobNo: formik.values.job_no || "",
      requestTo: "AHMEDABAD",
      referenceNo: "",
      modeOfPayment: "Cheque No.",
      markAsUrgent: false,
      narration: "",
      charges: [],
      purchaseBills: [],
      totalAmount: 0
    });
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Typography variant="h6">
          Payment Request - {editMode ? 'Edit' : 'New'}
        </Typography>
        <Typography variant="subtitle2" color="text.secondary">
          Task: {editMode ? 'Edit' : 'New'} | 59 mins left ⚡ Active
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        {/* Header Information */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Pay To</InputLabel>
              <Select
                value={formData.payTo || "Vendor"}
                onChange={(e) => handleFieldChange('payTo', e.target.value)}
              >
                <MenuItem value="Vendor">Vendor</MenuItem>
                <MenuItem value="Customer">Customer</MenuItem>
                <MenuItem value="Employee">Employee</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <TextField
              label="Reference No."
              size="small"
              fullWidth
              value={formData.referenceNo || ""}
              onChange={(e) => handleFieldChange('referenceNo', e.target.value)}
              placeholder="--New--"
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <TextField
              label="Date"
              type="date"
              size="small"
              fullWidth
              value={formData.date || ""}
              onChange={(e) => handleFieldChange('date', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Against</InputLabel>
              <Select
                value={formData.against || "Expense"}
                onChange={(e) => handleFieldChange('against', e.target.value)}
              >
                <MenuItem value="Expense">Expense</MenuItem>
                <MenuItem value="Invoice">Invoice</MenuItem>
                <MenuItem value="Advance">Advance</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.jobExpenses || false}
                  onChange={(e) => handleFieldChange('jobExpenses', e.target.checked)}
                />
              }
              label="Job Expenses"
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.nonJobExpenses || false}
                  onChange={(e) => handleFieldChange('nonJobExpenses', e.target.checked)}
                />
              }
              label="Non Job Expenses"
            />
          </Grid>
        </Grid>

        {/* Second Row */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <TextField
              label="Job No."
              size="small"
              fullWidth
              value={formData.jobNo || ""}
              onChange={(e) => handleFieldChange('jobNo', e.target.value)}
              InputProps={{
                endAdornment: <Button size="small">🔍</Button>
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Request To</InputLabel>
              <Select
                value={formData.requestTo || "AHMEDABAD"}
                onChange={(e) => handleFieldChange('requestTo', e.target.value)}
              >
                <MenuItem value="AHMEDABAD">AHMEDABAD</MenuItem>
                <MenuItem value="MUMBAI">MUMBAI</MenuItem>
                <MenuItem value="DELHI">DELHI</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Mode of Payment</InputLabel>
              <Select
                value={formData.modeOfPayment || "Cheque No."}
                onChange={(e) => handleFieldChange('modeOfPayment', e.target.value)}
              >
                <MenuItem value="Cheque No.">Cheque No.</MenuItem>
                <MenuItem value="NEFT">NEFT</MenuItem>
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="RTGS">RTGS</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.markAsUrgent || false}
                  onChange={(e) => handleFieldChange('markAsUrgent', e.target.checked)}
                />
              }
              label="Mark As Urgent"
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <TextField
              label="Amount"
              type="number"
              size="small"
              fullWidth
              value={formData.amount || 0}
              onChange={(e) => handleFieldChange('amount', parseFloat(e.target.value) || 0)}
            />
          </Grid>
        </Grid>

        {/* Narration */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <TextField
              label="Narration"
              multiline
              rows={3}
              fullWidth
              value={formData.narration || ""}
              onChange={(e) => handleFieldChange('narration', e.target.value)}
            />
          </Grid>
        </Grid>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
            <Tab label="General" />
            <Tab label="Notes" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          {/* Charges Table */}
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            Charge Details
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                  <TableCell>Charge Name</TableCell>
                  <TableCell>Amount (TC)</TableCell>
                  <TableCell>Curr</TableCell>
                  <TableCell>Amount (HC)</TableCell>
                  <TableCell>Payable To</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(formData.charges || []).map((charge, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <TextField
                        size="small"
                        value={charge.chargeName || ""}
                        onChange={(e) => handleChargeChange(index, 'chargeName', e.target.value)}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={charge.amountTC || 0}
                        onChange={(e) => handleChargeChange(index, 'amountTC', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={charge.curr || "INR"}
                        onChange={(e) => handleChargeChange(index, 'curr', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={charge.amountHC || 0}
                        onChange={(e) => handleChargeChange(index, 'amountHC', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={charge.payableTo || ""}
                        onChange={(e) => handleChargeChange(index, 'payableTo', e.target.value)}
                        fullWidth
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Button onClick={addCharge} variant="outlined" size="small">
            Add Charge
          </Button>

          {/* Purchase Bills Table */}
          <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
            Purchase Bills
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                  <TableCell>Purchase Bill No</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Vendor Inv No</TableCell>
                  <TableCell>Curr</TableCell>
                  <TableCell>Bill Amt</TableCell>
                  <TableCell>Outstanding Amt</TableCell>
                  <TableCell>Amount(TC)</TableCell>
                  <TableCell>Allocated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(formData.purchaseBills || []).map((bill, index) => (
                  <TableRow key={index}>
                    <TableCell>{bill.purchaseBillNo}</TableCell>
                    <TableCell>{bill.date}</TableCell>
                    <TableCell>{bill.vendorInvNo}</TableCell>
                    <TableCell>{bill.curr}</TableCell>
                    <TableCell>{bill.billAmt}</TableCell>
                    <TableCell>{bill.outstandingAmt}</TableCell>
                    <TableCell>{bill.amountTC}</TableCell>
                    <TableCell>{bill.allocated}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <TextField
            label="Notes"
            multiline
            rows={6}
            fullWidth
            value={formData.remarks || ""}
            onChange={(e) => handleFieldChange('remarks', e.target.value)}
          />
        </TabPanel>

        {/* Total */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Typography variant="h6">
            Total: {formData.totalAmount || 0}
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleSave} variant="outlined">
          Save
        </Button>
        <Button onClick={handleSaveAndClose} variant="contained">
          Save & Close
        </Button>
        <Button onClick={handleSaveAndNew} variant="contained">
          Save & New
        </Button>
        <Button onClick={onClose} color="secondary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentRequestForm;
