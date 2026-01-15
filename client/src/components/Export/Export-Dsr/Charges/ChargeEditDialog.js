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
} from "@mui/material";

const ChargeEditDialog = ({ charge, editMode, formik, onClose, onSave }) => {
  const [formData, setFormData] = useState(charge || {});

  useEffect(() => {
    if (charge) {
      setFormData(charge);
    }
  }, [charge]);

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRevenueChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      revenue: { ...prev.revenue, [field]: value },
    }));
  };

  const handleCostChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      cost: { ...prev.cost, [field]: value },
    }));
  };

  const handleSave = () => {
    if (onSave) {
      onSave(formData);
    }
  };

  const handleUpdate = () => {
    handleSave();
  };

  const handleUpdateAndClose = () => {
    handleSave();
    onClose();
  };

  const handleUpdateAndNew = () => {
    handleSave();
    setFormData({
      chargeHead: "",
      category: "Margin",
      costCenter: "CCL EXP",
      remark: "",
      revenue: {
        basis: "Per S/B",
        qtyUnit: 0,
        rate: 0,
        amount: 0,
        amountINR: 0,
        curr: "INR",
        ovrd: false,
        paid: false,
      },
      cost: {
        basis: "Per S/B",
        qtyUnit: 0,
        rate: 0,
        amount: 0,
        amountINR: 0,
        curr: "INR",
        ovrd: false,
        paid: false,
      },
      chargeDescription: "",
      overrideAutoRate: false,
      receivableType: "Customer",
      receivableFrom: "",
      receivableFromBranchCode: "",
      copyToCost: false,
      quotationNo: "",
    });
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Typography variant="h6">New Charge</Typography>
      </DialogTitle>

      <DialogContent>
        {/* Header Fields */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Charge"
              fullWidth
              size="small"
              value={formData.chargeHead || ""}
              onChange={(e) => handleFieldChange("chargeHead", e.target.value)}
              placeholder="MISC CHARGES"
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField
              label="Remark"
              fullWidth
              size="small"
              multiline
              rows={2}
              value={formData.remark || ""}
              onChange={(e) => handleFieldChange("remark", e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl size="small" fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category || "Margin"}
                onChange={(e) => handleFieldChange("category", e.target.value)}
              >
                <MenuItem value="Margin">Margin</MenuItem>
                <MenuItem value="Direct">Direct</MenuItem>
                <MenuItem value="Overhead">Overhead</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              label="Cost Center"
              size="small"
              fullWidth
              value={formData.costCenter || "CCL EXP"}
              onChange={(e) => handleFieldChange("costCenter", e.target.value)}
            />
          </Grid>
        </Grid>

        {/* Revenue and Cost Table */}
        <TableContainer component={Paper} sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell></TableCell>
                <TableCell>
                  <strong>Basis</strong>
                </TableCell>
                <TableCell>
                  <strong>Qty/Unit</strong>
                </TableCell>
                <TableCell>
                  <strong>Rate</strong>
                </TableCell>
                <TableCell>
                  <strong>Amount</strong>
                </TableCell>
                <TableCell>
                  <strong>Amount(INR)</strong>
                </TableCell>
                <TableCell>
                  <strong>Ovrd</strong>
                </TableCell>
                <TableCell>
                  <strong>Paid</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>
                  <strong>Revenue</strong>
                </TableCell>
                <TableCell>
                  <Select
                    size="small"
                    value={formData.revenue?.basis || "Per S/B"}
                    onChange={(e) =>
                      handleRevenueChange("basis", e.target.value)
                    }
                  >
                    <MenuItem value="Per S/B">Per S/B</MenuItem>
                    <MenuItem value="Per Container">Per Container</MenuItem>
                    <MenuItem value="Per MT">Per MT</MenuItem>
                  </Select>
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={formData.revenue?.qtyUnit || 0}
                    onChange={(e) =>
                      handleRevenueChange(
                        "qtyUnit",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    sx={{ width: 80 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={formData.revenue?.rate || 0}
                    onChange={(e) =>
                      handleRevenueChange(
                        "rate",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    sx={{ width: 80 }}
                  />
                  <Select
                    size="small"
                    value={formData.revenue?.curr || "INR"}
                    onChange={(e) =>
                      handleRevenueChange("curr", e.target.value)
                    }
                    sx={{ width: 60, ml: 1 }}
                  >
                    <MenuItem value="INR">INR</MenuItem>
                    <MenuItem value="USD">USD</MenuItem>
                  </Select>
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={formData.revenue?.amount || 0}
                    onChange={(e) =>
                      handleRevenueChange(
                        "amount",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    sx={{ width: 100 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={formData.revenue?.amountINR || 0}
                    onChange={(e) =>
                      handleRevenueChange(
                        "amountINR",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    sx={{ width: 100 }}
                  />
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={formData.revenue?.ovrd || false}
                    onChange={(e) =>
                      handleRevenueChange("ovrd", e.target.checked)
                    }
                  />
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={formData.revenue?.paid || false}
                    onChange={(e) =>
                      handleRevenueChange("paid", e.target.checked)
                    }
                  />
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell>
                  <strong>Cost</strong>
                </TableCell>
                <TableCell>
                  <Select
                    size="small"
                    value={formData.cost?.basis || "Per S/B"}
                    onChange={(e) => handleCostChange("basis", e.target.value)}
                  >
                    <MenuItem value="Per S/B">Per S/B</MenuItem>
                    <MenuItem value="Per Container">Per Container</MenuItem>
                    <MenuItem value="Per MT">Per MT</MenuItem>
                  </Select>
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={formData.cost?.qtyUnit || 0}
                    onChange={(e) =>
                      handleCostChange(
                        "qtyUnit",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    sx={{ width: 80 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={formData.cost?.rate || 0}
                    onChange={(e) =>
                      handleCostChange("rate", parseFloat(e.target.value) || 0)
                    }
                    sx={{ width: 80 }}
                  />
                  <Select
                    size="small"
                    value={formData.cost?.curr || "INR"}
                    onChange={(e) => handleCostChange("curr", e.target.value)}
                    sx={{ width: 60, ml: 1 }}
                  >
                    <MenuItem value="INR">INR</MenuItem>
                    <MenuItem value="USD">USD</MenuItem>
                  </Select>
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={formData.cost?.amount || 0}
                    onChange={(e) =>
                      handleCostChange(
                        "amount",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    sx={{ width: 100 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={formData.cost?.amountINR || 0}
                    onChange={(e) =>
                      handleCostChange(
                        "amountINR",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    sx={{ width: 100 }}
                  />
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={formData.cost?.ovrd || false}
                    onChange={(e) => handleCostChange("ovrd", e.target.checked)}
                  />
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={formData.cost?.paid || false}
                    onChange={(e) => handleCostChange("paid", e.target.checked)}
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Bottom Fields */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Charge Description"
              fullWidth
              size="small"
              value={formData.chargeDescription || ""}
              onChange={(e) =>
                handleFieldChange("chargeDescription", e.target.value)
              }
              helperText={`${(formData.chargeDescription || "").length}/120`}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl size="small" fullWidth>
              <InputLabel>Receivable Type</InputLabel>
              <Select
                value={formData.receivableType || "Customer"}
                onChange={(e) =>
                  handleFieldChange("receivableType", e.target.value)
                }
              >
                <MenuItem value="Customer">Customer</MenuItem>
                <MenuItem value="Vendor">Vendor</MenuItem>
                <MenuItem value="Agent">Agent</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              label="Receivable From"
              size="small"
              fullWidth
              value={formData.receivableFrom || ""}
              onChange={(e) =>
                handleFieldChange("receivableFrom", e.target.value)
              }
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.overrideAutoRate || false}
                  onChange={(e) =>
                    handleFieldChange("overrideAutoRate", e.target.checked)
                  }
                />
              }
              label="Override Auto Rate"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.copyToCost || false}
                  onChange={(e) =>
                    handleFieldChange("copyToCost", e.target.checked)
                  }
                />
              }
              label="Copy to Cost"
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleUpdate} variant="outlined">
          Update
        </Button>
        <Button onClick={handleUpdateAndClose} variant="contained">
          Update & Close
        </Button>
        <Button onClick={handleUpdateAndNew} variant="contained">
          Update & New
        </Button>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChargeEditDialog;
