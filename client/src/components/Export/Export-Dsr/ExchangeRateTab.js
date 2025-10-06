// ExchangeRateTab.jsx - Exchange Rate tab component
import React, { useState, useRef, useCallback } from "react";
import {
  Grid,
  Card,
  TextField,
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
} from "@mui/material";

const ExchangeRateTab = ({ formik, directories, params, onUpdate }) => {
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

  // Handle exchange rate row changes
  const handleExchangeRateChange = (index, field, value) => {
    const exchangeRates = [...(formik.values.exchange_rates || [])];
    exchangeRates[index] = { ...exchangeRates[index], [field]: value };
    formik.setFieldValue('exchange_rates', exchangeRates);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      autoSave(formik.values);
    }, 1500);
  };

  const addNewExchangeRate = () => {
    const exchangeRates = [...(formik.values.exchange_rates || [])];
    exchangeRates.push({
      code: "",
      custom_exch_rate: "",
      non_std_cur: "",
      ex_rate: "",
      ex_rate_revenue: "",
      agent_ex_rate: "",
      cfx: "",
      ex_rate_cost: "",
      ex_rate_cost_revenue: ""
    });
    formik.setFieldValue('exchange_rates', exchangeRates);
  };

  const deleteExchangeRate = (index) => {
    const exchangeRates = [...(formik.values.exchange_rates || [])];
    exchangeRates.splice(index, 1);
    formik.setFieldValue('exchange_rates', exchangeRates);
  };

  // Initialize with default INR and USD rates if empty
  const exchangeRates = formik.values.exchange_rates?.length ? 
    formik.values.exchange_rates : 
    [
      {
        code: "INR",
        custom_exch_rate: "1.000000",
        non_std_cur: "",
        ex_rate: "1.000000",
        ex_rate_revenue: "1.000000",
        agent_ex_rate: "0.000000",
        cfx: "0.000000",
        ex_rate_cost: "0.000000",
        ex_rate_cost_revenue: "1.000000"
      },
      {
        code: "USD",
        custom_exch_rate: "87.300000",
        non_std_cur: "",
        ex_rate: "90.000000",
        ex_rate_revenue: "90.000000",
        agent_ex_rate: "0.000000",
        cfx: "0.000000",
        ex_rate_cost: "0.000000",
        ex_rate_cost_revenue: "90.000000"
      }
    ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Exchange Rate
      </Typography>
      
      <Grid container spacing={3}>
        {/* Exchange Rate Table - Full Width */}
        <Grid item xs={12}>
          <Card sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Currency Exchange Rates
            </Typography>
            
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Code</strong></TableCell>
                    <TableCell><strong>Custom Exch Rate</strong></TableCell>
                    <TableCell><strong>Non Std. Cur.</strong></TableCell>
                    <TableCell><strong>Ex. Rate</strong></TableCell>
                    <TableCell><strong>Ex. Rate (Revenue)</strong></TableCell>
                    <TableCell><strong>Agent Ex Rate</strong></TableCell>
                    <TableCell><strong>CFX</strong></TableCell>
                    <TableCell><strong>Ex. Rate (Cost)</strong></TableCell>
                    <TableCell><strong>Ex. Rate (Cost Revenue)</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {exchangeRates.map((rate, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <TextField
                          size="small"
                          value={rate.code || ''}
                          onChange={(e) => handleExchangeRateChange(index, 'code', e.target.value)}
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={rate.custom_exch_rate || ''}
                          onChange={(e) => handleExchangeRateChange(index, 'custom_exch_rate', e.target.value)}
                          sx={{ width: 120 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: "0.75rem" }}
                        >
                          Bank Details
                        </Button>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={rate.ex_rate || ''}
                          onChange={(e) => handleExchangeRateChange(index, 'ex_rate', e.target.value)}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={rate.ex_rate_revenue || ''}
                          onChange={(e) => handleExchangeRateChange(index, 'ex_rate_revenue', e.target.value)}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={rate.agent_ex_rate || ''}
                          onChange={(e) => handleExchangeRateChange(index, 'agent_ex_rate', e.target.value)}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={rate.cfx || ''}
                          onChange={(e) => handleExchangeRateChange(index, 'cfx', e.target.value)}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={rate.ex_rate_cost || ''}
                          onChange={(e) => handleExchangeRateChange(index, 'ex_rate_cost', e.target.value)}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={rate.ex_rate_cost_revenue || ''}
                          onChange={(e) => handleExchangeRateChange(index, 'ex_rate_cost_revenue', e.target.value)}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="small" 
                          color="error"
                          onClick={() => deleteExchangeRate(index)}
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

            {/* Action Buttons */}
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={addNewExchangeRate}
                sx={{ fontSize: "0.75rem" }}
              >
                Add Currency
              </Button>
              <Button 
                variant="outlined" 
                size="small"
                sx={{ fontSize: "0.75rem" }}
              >
                Update
              </Button>
              <Button 
                variant="outlined" 
                size="small"
                sx={{ fontSize: "0.75rem" }}
              >
                Initialize CFX
              </Button>
              <Button 
                variant="outlined" 
                size="small"
                sx={{ fontSize: "0.75rem" }}
              >
                Load today's Bank rates
              </Button>
              <Button 
                variant="outlined" 
                size="small"
                sx={{ fontSize: "0.75rem" }}
              >
                Load today's Custom Rates
              </Button>
            </Box>

            {/* Additional Information */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Exchange Rate Settings
              </Typography>
              
              <Grid container spacing={2}>
                {/* Last Update Date */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Last Rate Update Date"
                    type="date"
                    size="small"
                    value={formik.values.last_rate_update_date || ''}
                    onChange={(e) => handleFieldChange('last_rate_update_date', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                {/* Default Currency */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Default Currency"
                    size="small"
                    value={formik.values.default_currency || 'USD'}
                    onChange={(e) => handleFieldChange('default_currency', e.target.value)}
                    placeholder="USD"
                  />
                </Grid>

                {/* Auto Update Settings */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Auto Update Interval (hours)"
                    type="number"
                    size="small"
                    value={formik.values.auto_update_interval || '24'}
                    onChange={(e) => handleFieldChange('auto_update_interval', e.target.value)}
                    placeholder="24"
                  />
                </Grid>

                {/* Rate Source */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Rate Source"
                    size="small"
                    value={formik.values.rate_source || ''}
                    onChange={(e) => handleFieldChange('rate_source', e.target.value)}
                    placeholder="Central Bank / Custom / Manual"
                  />
                </Grid>

                {/* Remarks */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Rate Remarks"
                    multiline
                    rows={2}
                    size="small"
                    value={formik.values.rate_remarks || ''}
                    onChange={(e) => handleFieldChange('rate_remarks', e.target.value)}
                    placeholder="Enter any remarks about exchange rates..."
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

export default ExchangeRateTab;
