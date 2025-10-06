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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";

const ESanchitEditDialog = ({ open, onClose, onSave, doc = {}, setDoc }) => {
  if (!doc) doc = {};

  const issuingParty = doc.issuingParty || [];
  const beneficiaryParty = doc.beneficiaryParty || {};

  useEffect(() => {
    setDoc(doc || {});
  }, [doc, setDoc]);

  const handleFieldChange = (field, value) => {
    setDoc((prev) => ({ ...prev, [field]: value }));
  };

  const handleIssuingPartyChange = (field, value) => {
    setDoc((prev) => ({
      ...prev,
      issuingParty: { ...prev.issuingParty, [field]: value },
    }));
  };

  const handleBeneficiaryPartyChange = (field, value) => {
    setDoc((prev) => ({
      ...prev,
      beneficiaryParty: { ...prev.beneficiaryParty, [field]: value },
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Typography variant="h6">eSanchit Document</Typography>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={3}>
            <TextField
              select
              label="Document Level"
              value={doc.documentLevel || ""}
              fullWidth
              size="small"
              required
              onChange={(e) =>
                handleFieldChange("documentLevel", e.target.value)
              }
            >
              {["Invoice", "Item", "Job"].map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Inv. Sr. No."
              value={doc.invSerialNo || ""}
              fullWidth
              size="small"
              onChange={(e) => handleFieldChange("invSerialNo", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Item Sr. No."
              value={doc.itemSerialNo || ""}
              fullWidth
              size="small"
              onChange={(e) =>
                handleFieldChange("itemSerialNo", e.target.value)
              }
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Doc. IRN"
              value={doc.irn || ""}
              fullWidth
              size="small"
              onChange={(e) => handleFieldChange("irn", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Doc. Type"
              value={doc.documentType || ""}
              fullWidth
              size="small"
              onChange={(e) =>
                handleFieldChange("documentType", e.target.value)
              }
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Doc. Ref. No."
              value={doc.documentReferenceNo || ""}
              fullWidth
              size="small"
              onChange={(e) =>
                handleFieldChange("documentReferenceNo", e.target.value)
              }
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="ICEGATE ID"
              value={doc.otherIcegateId || ""}
              fullWidth
              size="small"
              onChange={(e) =>
                handleFieldChange("otherIcegateId", e.target.value)
              }
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              type="date"
              label="Date of Issue"
              value={doc.dateOfIssue ? doc.dateOfIssue.substring(0, 10) : ""}
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
              onChange={(e) => handleFieldChange("dateOfIssue", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Place of Issue"
              value={doc.placeOfIssue || ""}
              fullWidth
              size="small"
              onChange={(e) =>
                handleFieldChange("placeOfIssue", e.target.value)
              }
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              type="date"
              label="Expiry Date"
              value={doc.expiryDate ? doc.expiryDate.substring(0, 10) : ""}
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
              onChange={(e) => handleFieldChange("expiryDate", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              type="date"
              label="DateTime of Upload"
              value={
                doc.dateTimeOfUpload
                  ? doc.dateTimeOfUpload.substring(0, 10)
                  : ""
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
              onChange={(e) =>
                handleFieldChange("dateTimeOfUpload", e.target.value)
              }
            />
          </Grid>

          {/* Issuing Party Details */}
          <Grid item xs={12}>
            <Typography fontWeight="bold">Issuing Party Details</Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Name"
              value={issuingParty.name || ""}
              fullWidth
              size="small"
              onChange={(e) => handleIssuingPartyChange("name", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Code"
              value={issuingParty.code || ""}
              fullWidth
              size="small"
              onChange={(e) => handleIssuingPartyChange("code", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Address Line 1"
              value={issuingParty.addressLine1 || ""}
              fullWidth
              size="small"
              onChange={(e) =>
                handleIssuingPartyChange("addressLine1", e.target.value)
              }
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Address Line 2"
              value={issuingParty.addressLine2 || ""}
              fullWidth
              size="small"
              onChange={(e) =>
                handleIssuingPartyChange("addressLine2", e.target.value)
              }
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="City"
              value={issuingParty.city || ""}
              fullWidth
              size="small"
              onChange={(e) => handleIssuingPartyChange("city", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Pin Code"
              value={issuingParty.pinCode || ""}
              fullWidth
              size="small"
              onChange={(e) =>
                handleIssuingPartyChange("pinCode", e.target.value)
              }
            />
          </Grid>

          {/* Beneficiary Party Details */}
          <Grid item xs={12}>
            <Typography fontWeight="bold" sx={{ mt: 3 }}>
              Beneficiary Party Details
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Name"
              value={beneficiaryParty.name || ""}
              fullWidth
              size="small"
              onChange={(e) =>
                handleBeneficiaryPartyChange("name", e.target.value)
              }
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Address Line 1"
              value={beneficiaryParty.addressLine1 || ""}
              fullWidth
              size="small"
              onChange={(e) =>
                handleBeneficiaryPartyChange("addressLine1", e.target.value)
              }
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="City"
              value={beneficiaryParty.city || ""}
              fullWidth
              size="small"
              onChange={(e) =>
                handleBeneficiaryPartyChange("city", e.target.value)
              }
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Pin Code"
              value={beneficiaryParty.pinCode || ""}
              fullWidth
              size="small"
              onChange={(e) =>
                handleBeneficiaryPartyChange("pinCode", e.target.value)
              }
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={() => onSave(doc)}>
          Save
        </Button>
        <Button variant="contained" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ESanchitEditDialog;
