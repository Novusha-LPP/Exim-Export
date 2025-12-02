import React, { useRef, useCallback } from "react";
import {
  Box,
  Card,
  Typography,
  Grid,
  TextField,
  Button,
  Checkbox,
  MenuItem,
  FormControlLabel,
} from "@mui/material";

// Default drawback detail object per updated schema
const getDefaultDrawback = (idx = 1) => ({
  serialNumber: String(idx),
  dbkitem: false,
  dbkSrNo: "",
  fobValue: "",
  quantity: 0,
  dbkUnder: "Actual",
  dbkDescription: "",
  dbkRate: 1.5,
  dbkCap: 0,
  dbkAmount: 0,
  percentageOfFobValue: "1.5% of FOB Value",
});

const DrawbackTab = ({ formik }) => {
  const saveTimeoutRef = useRef(null);
  const drawbackDetails = formik.values.drawbackDetails || [getDefaultDrawback(1)];

  const autoSave = useCallback(() => formik.submitForm(), [formik]);

  const handleDrawbackFieldChange = (idx, field, value) => {
    const updated = [...(formik.values.drawbackDetails || [])];
    if (!updated[idx]) updated[idx] = getDefaultDrawback(idx + 1);
    updated[idx][field] = value;
    formik.setFieldValue("drawbackDetails", updated);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(autoSave, 1200);
  };

  const addDrawbackDetail = () => {
    const updated = [...(formik.values.drawbackDetails || [])];
    updated.push(getDefaultDrawback(updated.length + 1));
    formik.setFieldValue("drawbackDetails", updated);
  };

  const deleteDrawbackDetail = (idx) => {
    const updated = [...(formik.values.drawbackDetails || [])];
    updated.splice(idx, 1);
    formik.setFieldValue("drawbackDetails", updated);
  };

  return (
    <Box>
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Drawback (DBK) Details
        </Typography>

        {drawbackDetails.map((item, idx) => (
          <Box
            key={idx}
            sx={{ mb: 3, p: 2, border: "1px solid #eee", borderRadius: 2 }}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} md={2}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={item.dbkitem || false}
                      onChange={(e) =>
                        handleDrawbackFieldChange(idx, "dbkitem", e.target.checked)
                      }
                    />
                  }
                  label="This is DBK item"
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  label="DBK Sr. No"
                  value={item.dbkSrNo || ""}
                  onChange={(e) =>
                    handleDrawbackFieldChange(idx, "dbkSrNo", e.target.value)
                  }
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  label="FOB Value"
                  value={item.fobValue || ""}
                  type="number"
                  onChange={(e) =>
                    handleDrawbackFieldChange(idx, "fobValue", e.target.value)
                  }
                  InputProps={{ startAdornment: <span>INR&nbsp;</span> }}
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  label="Quantity"
                  value={item.quantity || 0}
                  type="number"
                  onChange={(e) =>
                    handleDrawbackFieldChange(idx, "quantity", e.target.value)
                  }
                  size="small"
                  fullWidth
                  InputProps={{ endAdornment: <span>MTS</span> }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  label="DBK Under"
                  select
                  value={item.dbkUnder || "Actual"}
                  onChange={(e) =>
                    handleDrawbackFieldChange(idx, "dbkUnder", e.target.value)
                  }
                  size="small"
                  fullWidth
                >
                  <MenuItem value="Actual">Actual</MenuItem>
                  <MenuItem value="Provisional">Provisional</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField
                  label="DBK Description"
                  value={item.dbkDescription || ""}
                  onChange={(e) =>
                    handleDrawbackFieldChange(idx, "dbkDescription", e.target.value)
                  }
                  size="small"
                  fullWidth
                  multiline
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <TextField
                  label="DBK Rate (%)"
                  value={item.dbkRate}
                  type="number"
                  onChange={(e) =>
                    handleDrawbackFieldChange(idx, "dbkRate", e.target.value)
                  }
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <TextField
                  label="DBK Cap"
                  value={item.dbkCap}
                  type="number"
                  onChange={(e) =>
                    handleDrawbackFieldChange(idx, "dbkCap", e.target.value)
                  }
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <TextField
                  label="DBK Amount"
                  value={item.dbkAmount}
                  type="number"
                  onChange={(e) =>
                    handleDrawbackFieldChange(idx, "dbkAmount", e.target.value)
                  }
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <TextField
                  label="Percentage of FOB"
                  value={item.percentageOfFobValue}
                  InputProps={{ readOnly: true }}
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  color="error"
                  size="small"
                  onClick={() => deleteDrawbackDetail(idx)}
                >
                  Delete
                </Button>
              </Grid>
            </Grid>
          </Box>
        ))}

        <Button sx={{ mt: 2 }} onClick={addDrawbackDetail} variant="outlined">
          Add Drawback Entry
        </Button>
      </Card>
    </Box>
  );
};

export default DrawbackTab;
