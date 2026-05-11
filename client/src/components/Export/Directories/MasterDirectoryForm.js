import React from "react";
import { Formik, Form, FieldArray } from "formik";
import * as Yup from "yup";
import {
  Grid, TextField, FormControl, InputLabel, Select, MenuItem,
  Button, Typography, Box, IconButton, Divider, Paper
} from "@mui/material";
import {
  Add as AddIcon, Delete as DeleteIcon, Business as BusinessIcon,
  LocationOn as LocationIcon, AccountBalance as BankIcon,
  ContactPhone as ContactIcon
} from "@mui/icons-material";

const validationSchema = Yup.object({
  name: Yup.string().required("Name is required"),
  active: Yup.string().required("Status is required"),
  tds_percent: Yup.number().min(0).max(100),
  branches: Yup.array().of(
    Yup.object({
      branchName: Yup.string().required("Branch Name is required"),
      city: Yup.string().required("City is required"),
      state: Yup.string().required("State is required"),
      accounts: Yup.array().of(
        Yup.object({
          bankName: Yup.string().required("Bank Name is required"),
          accountNo: Yup.string().required("Account No is required")
        })
      )
    })
  )
});

const MasterDirectoryForm = ({ data, onSave, onCancel, title }) => {
  const initialValues = {
    name: data?.name || "",
    active: data?.active || "Yes",
    tds_percent: data?.tds_percent || 0,
    credit_terms: data?.credit_terms || "",
    cin: data?.cin || "",
    branches: data?.branches || [
      {
        branch_no: "",
        branchName: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        country: "India",
        gst: "",
        pan: "",
        accounts: []
      }
    ],
    contacts: data?.contacts || []
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={onSave}
    >
      {({ values, handleChange, handleBlur, setFieldValue, isSubmitting, errors, touched }) => (
        <Form>
          <Box sx={{ p: 2, maxHeight: '80vh', overflow: 'auto' }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}>
              {title}
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth size="small" name="name" label="Name *"
                  value={values.name} onChange={e => setFieldValue("name", e.target.value.toUpperCase())}
                  error={touched.name && !!errors.name} helperText={touched.name && errors.name}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Active</InputLabel>
                  <Select name="active" value={values.active} onChange={handleChange} label="Active">
                    <MenuItem value="Yes">Yes</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth size="small" name="tds_percent" label="TDS %"
                  type="number" value={values.tds_percent} onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth size="small" name="cin" label="CIN No"
                  value={values.cin} onChange={e => setFieldValue("cin", e.target.value.toUpperCase())}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth size="small" name="credit_terms" label="Credit Terms"
                  value={values.credit_terms} onChange={e => setFieldValue("credit_terms", e.target.value.toUpperCase())}
                />
              </Grid>
            </Grid>

            {/* Branches Section */}
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
              <LocationIcon sx={{ mr: 1 }} fontSize="small" /> Branches
            </Typography>
            <FieldArray name="branches">
              {({ push, remove }) => (
                <Box>
                  {values.branches.map((branch, index) => (
                    <Paper key={index} sx={{ p: 2, mb: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="subtitle2">Branch #{index+1}</Typography>
                        <IconButton size="small" color="error" onClick={() => remove(index)} disabled={values.branches.length === 1}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <TextField fullWidth size="small" label="Branch Name *" name={`branches[${index}].branchName`} value={branch.branchName} onChange={e => setFieldValue(`branches[${index}].branchName`, e.target.value.toUpperCase())} />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField fullWidth size="small" label="GST" name={`branches[${index}].gst`} value={branch.gst} onChange={e => setFieldValue(`branches[${index}].gst`, e.target.value.toUpperCase())} />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField fullWidth size="small" label="PAN" name={`branches[${index}].pan`} value={branch.pan} onChange={e => setFieldValue(`branches[${index}].pan`, e.target.value.toUpperCase())} />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField fullWidth size="small" label="Address" name={`branches[${index}].address`} value={branch.address} onChange={e => setFieldValue(`branches[${index}].address`, e.target.value.toUpperCase())} />
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <TextField fullWidth size="small" label="City" name={`branches[${index}].city`} value={branch.city} onChange={e => setFieldValue(`branches[${index}].city`, e.target.value.toUpperCase())} />
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <TextField fullWidth size="small" label="State" name={`branches[${index}].state`} value={branch.state} onChange={e => setFieldValue(`branches[${index}].state`, e.target.value.toUpperCase())} />
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <TextField fullWidth size="small" label="Pincode" name={`branches[${index}].pincode`} value={branch.pincode} onChange={handleChange} />
                        </Grid>
                      </Grid>

                      {/* Nested Bank Accounts */}
                      <Typography variant="caption" sx={{ mt: 2, display: 'block', fontWeight: 'bold' }}>Bank Accounts</Typography>
                      <FieldArray name={`branches[${index}].accounts`}>
                        {({ push: pushAcc, remove: removeAcc }) => (
                          <Box sx={{ mt: 1 }}>
                            {branch.accounts.map((acc, aIdx) => (
                              <Box key={aIdx} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                                <TextField size="small" placeholder="Bank Name" value={acc.bankName} onChange={e => setFieldValue(`branches[${index}].accounts[${aIdx}].bankName`, e.target.value.toUpperCase())} />
                                <TextField size="small" placeholder="Acc No" value={acc.accountNo} onChange={e => setFieldValue(`branches[${index}].accounts[${aIdx}].accountNo`, e.target.value.toUpperCase())} />
                                <TextField size="small" placeholder="IFSC" value={acc.ifsc} onChange={e => setFieldValue(`branches[${index}].accounts[${aIdx}].ifsc`, e.target.value.toUpperCase())} />
                                <TextField size="small" placeholder="AD Code" value={acc.adCode} onChange={e => setFieldValue(`branches[${index}].accounts[${aIdx}].adCode`, e.target.value.toUpperCase())} />
                                <IconButton size="small" color="error" onClick={() => removeAcc(aIdx)}><DeleteIcon fontSize="small" /></IconButton>
                              </Box>
                            ))}
                            <Button size="small" startIcon={<AddIcon />} onClick={() => pushAcc({ bankName: "", accountNo: "", ifsc: "", adCode: "" })}>Add Account</Button>
                          </Box>
                        )}
                      </FieldArray>
                    </Paper>
                  ))}
                  <Button startIcon={<AddIcon />} variant="outlined" onClick={() => push({ branchName: "", city: "", state: "", accounts: [] })}>Add Branch</Button>
                </Box>
              )}
            </FieldArray>

            <Divider sx={{ my: 3 }} />

            {/* Contacts Section */}
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
              <ContactIcon sx={{ mr: 1 }} fontSize="small" /> Contacts
            </Typography>
            <FieldArray name="contacts">
              {({ push, remove }) => (
                <Box>
                  {values.contacts.map((contact, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <TextField size="small" label="Name" value={contact.name} onChange={e => setFieldValue(`contacts[${index}].name`, e.target.value.toUpperCase())} />
                      <TextField size="small" label="Email" value={contact.email} onChange={handleChange} name={`contacts[${index}].email`} />
                      <TextField size="small" label="Phone" value={contact.phone} onChange={handleChange} name={`contacts[${index}].phone`} />
                      <IconButton color="error" onClick={() => remove(index)}><DeleteIcon /></IconButton>
                    </Box>
                  ))}
                  <Button size="small" startIcon={<AddIcon />} onClick={() => push({ name: "", email: "", phone: "" })}>Add Contact</Button>
                </Box>
              )}
            </FieldArray>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button onClick={onCancel}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={isSubmitting}>Save</Button>
            </Box>
          </Box>
        </Form>
      )}
    </Formik>
  );
};

export default MasterDirectoryForm;
