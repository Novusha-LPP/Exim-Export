import React from "react";
import { Formik, Form, FieldArray } from "formik";
import * as Yup from "yup";
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Paper,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Description as DocumentIcon,
  AccountBalance as BankIcon,
  Assignment as AssignmentIcon,
} from "@mui/icons-material";
import FileUpload from "./FileUpload";
import Snackbar from "@mui/material/Snackbar";
import { FormHelperText } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";

const validationSchema = Yup.object({
  organization: Yup.string().max(255).required("Organization is required"),
  alias: Yup.string().max(50).required("Alias is required"),
  approvalStatus: Yup.string()
    .oneOf(["Pending", "Approved", "Rejected"])
    .required(),

  generalInfo: Yup.object({
    entityType: Yup.string()
      .oneOf(["Company", "Partnership", "LLP", "Proprietorship"])
      .required("Entity Type is required"),
    companyName: Yup.string().max(255).required("Company Name is required"),
    msmeRegistered: Yup.boolean(),
  }),

  address: Yup.object({
    addressLine: Yup.string().max(500).required("Address is required"),
    postalCode: Yup.string().max(10).required("Postal Code is required"),
    telephone: Yup.string().max(50),
    fax: Yup.string().max(50),
    email: Yup.string().email().max(255),
  }),

  registrationDetails: Yup.object({
    binNo: Yup.string().max(50),
    ieCode: Yup.string().max(20).required("IE Code is required"),
    panNo: Yup.string().max(10).required("PAN No is required"),
    gstinMainBranch: Yup.string().max(15),
    gstinBranchCodeFree: Yup.string().max(15),
    gstinBranchCode15: Yup.string().max(15),
  }),

  aeoDetails: Yup.object({
    aeoRole: Yup.string().max(10, "Maximum 10 characters"),
  }),

  authorizedSignatory: Yup.array().of(
    Yup.object({
      name: Yup.string().max(255),
      designation: Yup.string().max(100),
      mobile: Yup.string().max(15),
      email: Yup.string().email().max(255),
    })
  ),

  customHouse: Yup.array().of(
    Yup.object({
      name: Yup.string().max(255),
      location: Yup.string().max(255),
      code: Yup.string().max(50),
      linkedStatus: Yup.string().oneOf(["Linked", "Not Linked"]),
    })
  ),
});

const DirectoryForm = ({ directory, onSave, onCancel, readOnly = false }) => {
  const initialValues = {
    organization: directory?.organization || "",
    alias: directory?.alias || "",
    approvalStatus: directory?.approvalStatus || "Pending",
    generalInfo: {
      entityType: directory?.generalInfo?.entityType || "",
      companyName: directory?.generalInfo?.companyName || "",
      msmeRegistered: directory?.generalInfo?.msmeRegistered || false,
    },
    address: {
      addressLine: directory?.address?.addressLine || "",
      postalCode: directory?.address?.postalCode || "",
      telephone: directory?.address?.telephone || "",
      fax: directory?.address?.fax || "",
      email: directory?.address?.email || "",
    },
    registrationDetails: {
      binNo: directory?.registrationDetails?.binNo || "",
      ieCode: directory?.registrationDetails?.ieCode || "",
      panNo: directory?.registrationDetails?.panNo || "",
      gstinMainBranch: directory?.registrationDetails?.gstinMainBranch || "",
      gstinBranchCodeFree:
        directory?.registrationDetails?.gstinBranchCodeFree || "",
      gstinBranchCode15:
        directory?.registrationDetails?.gstinBranchCode15 || "",
    },
    kycDocuments: {
      certificateOfIncorporation: {
        uploaded:
          directory?.kycDocuments?.certificateOfIncorporation?.uploaded ||
          false,
        files: directory?.kycDocuments?.certificateOfIncorporation?.files || [],
      },
      memorandumOfAssociation: {
        uploaded:
          directory?.kycDocuments?.memorandumOfAssociation?.uploaded || false,
        files: directory?.kycDocuments?.memorandumOfAssociation?.files || [],
      },
      articlesOfAssociation: {
        uploaded:
          directory?.kycDocuments?.articlesOfAssociation?.uploaded || false,
        files: directory?.kycDocuments?.articlesOfAssociation?.files || [],
      },
      powerOfAttorney: {
        uploaded: directory?.kycDocuments?.powerOfAttorney?.uploaded || false,
        files: directory?.kycDocuments?.powerOfAttorney?.files || [],
      },
      copyOfPanAllotment: {
        uploaded:
          directory?.kycDocuments?.copyOfPanAllotment?.uploaded || false,
        files: directory?.kycDocuments?.copyOfPanAllotment?.files || [],
      },
      copyOfTelephoneBill: {
        uploaded:
          directory?.kycDocuments?.copyOfTelephoneBill?.uploaded || false,
        files: directory?.kycDocuments?.copyOfTelephoneBill?.files || [],
      },
      gstRegistrationCopy: {
        uploaded:
          directory?.kycDocuments?.gstRegistrationCopy?.uploaded || false,
        files: directory?.kycDocuments?.gstRegistrationCopy?.files || [],
      },
      balanceSheet: {
        uploaded: directory?.kycDocuments?.balanceSheet?.uploaded || false,
        files: directory?.kycDocuments?.balanceSheet?.files || [],
      },
    },
    branchInfo: directory?.branchInfo || [
      {
        branchCode: "",
        address: "",
        city: "",
        state: "",
        postalCode: "",
        country: "India",
      },
    ],
    aeoDetails: {
      aeoCode: directory?.aeoDetails?.aeoCode || "",
      aeoCountry: directory?.aeoDetails?.aeoCountry || "India",
      aeoRole: directory?.aeoDetails?.aeoRole || "",
    },
    billingCurrency: {
      defaultCurrency: directory?.billingCurrency?.defaultCurrency || "INR",
      defaultBillTypes: directory?.billingCurrency?.defaultBillTypes || [],
    },
    authorizedSignatory: directory?.authorizedSignatory || [
      {
        name: "",
        designation: "",
        mobile: "",
        email: "",
      },
    ],
    customHouse: directory?.customHouse || [
      {
        name: "",
        location: "",
        code: "",
        linkedStatus: "Not Linked",
      },
    ],
    accountCreditInfo: {
      creditLimit: directory?.accountCreditInfo?.creditLimit || "",
      unlimitedEnabled: directory?.accountCreditInfo?.unlimitedEnabled || false,
      creditPeriod: directory?.accountCreditInfo?.creditPeriod || "",
    },
    bankDetails: directory?.bankDetails || [
      {
        entityName: "",
        branchLocation: "",
        accountNumber: "",
        adCode: "",
        isDefault: false,
      },
    ],
    affiliateBranches: directory?.affiliateBranches || [
      {
        branchCode: "",
        branchName: "",
      },
    ],
    notes: directory?.notes || "",
  };

  const [submitError, setSubmitError] = React.useState("");

  const handleSubmit = async (values) => {
    try {
      await onSave(values);
      setSubmitError("");
    } catch (error) {
      setSubmitError(error.message || "Validation failed");
    }
  };

  const handleSnackbarClose = () => {
    setSubmitError("");
  };

  const handleFileUpload = (documentType, files, setFieldValue) => {
    setFieldValue(`kycDocuments.${documentType}.files`, files);
    setFieldValue(`kycDocuments.${documentType}.uploaded`, files.length > 0);
  };

  const handleFileDelete = (documentType, fileIndex, values, setFieldValue) => {
    const updatedFiles = values.kycDocuments[documentType].files.filter(
      (_, index) => index !== fileIndex
    );
    setFieldValue(`kycDocuments.${documentType}.files`, updatedFiles);
    setFieldValue(
      `kycDocuments.${documentType}.uploaded`,
      updatedFiles.length > 0
    );
  };

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({
        values,
        errors,
        touched,
        handleChange,
        handleBlur,
        setFieldValue,
      }) => (
        <Form>
          <Box sx={{ maxHeight: "80vh", overflow: "auto", p: 1 }}>
            {/* Organization & KYC - Ultra Compact */}
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                bgcolor: "rgba(0,0,0,0.02)",
                borderRadius: 1,
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  mb: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  fontSize: "0.9rem",
                }}
              >
                <BusinessIcon fontSize="small" color="primary" />
                Organization & KYC
              </Typography>

              <Grid container spacing={1}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    name="organization"
                    label="Org Name *"
                    value={values.organization}
                    onChange={handleChange}
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    name="alias"
                    label="Alias *"
                    value={values.alias}
                    onChange={handleChange}
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size="small" margin="dense">
                    <InputLabel>Status</InputLabel>
                    <Select
                      name="approvalStatus"
                      value={values.approvalStatus}
                      onChange={handleChange}
                      label="Status"
                    >
                      <MenuItem value="Pending">Pending</MenuItem>
                      <MenuItem value="Approved">Approved</MenuItem>
                      <MenuItem value="Rejected">Rejected</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size="small" margin="dense">
                    <InputLabel>Entity Type</InputLabel>
                    <Select
                      name="generalInfo.entityType"
                      value={values.generalInfo.entityType}
                      onChange={handleChange}
                      label="Entity Type"
                    >
                      <MenuItem value="Company">Company</MenuItem>
                      <MenuItem value="Partnership">Partnership</MenuItem>
                      <MenuItem value="LLP">LLP</MenuItem>
                      <MenuItem value="Proprietorship">Proprietorship</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    name="generalInfo.companyName"
                    label="Company Name *"
                    value={values.generalInfo.companyName}
                    onChange={handleChange}
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="generalInfo.msmeRegistered"
                        checked={values.generalInfo.msmeRegistered}
                        onChange={handleChange}
                        size="small"
                      />
                    }
                    label="MSME"
                    sx={{
                      mt: 1,
                      "& .MuiFormControlLabel-label": { fontSize: "0.8rem" },
                    }}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Address & Contact - Dense Grid */}
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                bgcolor: "rgba(0,0,0,0.02)",
                borderRadius: 1,
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  mb: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  fontSize: "0.9rem",
                }}
              >
                <LocationIcon fontSize="small" color="primary" />
                Address & Contact
              </Typography>

              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    rows={1}
                    name="address.addressLine"
                    label="Address *"
                    value={values.address.addressLine}
                    onChange={handleChange}
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    name="address.postalCode"
                    label="Postal Code *"
                    value={values.address.postalCode}
                    onChange={handleChange}
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    name="address.telephone"
                    label="Telephone"
                    value={values.address.telephone}
                    onChange={handleChange}
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    name="address.fax"
                    label="Fax"
                    value={values.address.fax}
                    onChange={handleChange}
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={6} sm={3} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    name="address.email"
                    label="Email"
                    type="email"
                    value={values.address.email}
                    onChange={handleChange}
                    margin="dense"
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Registration & Financial - Compact Grid */}
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                bgcolor: "rgba(0,0,0,0.02)",
                borderRadius: 1,
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  mb: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  fontSize: "0.9rem",
                }}
              >
                <AssignmentIcon fontSize="small" color="primary" />
                Registration & Financial
              </Typography>

              <Grid container spacing={1}>
                <Grid item xs={6} sm={3} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    name="registrationDetails.binNo"
                    label="BIN No"
                    value={values.registrationDetails.binNo}
                    onChange={handleChange}
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    name="registrationDetails.ieCode"
                    label="IE Code *"
                    value={values.registrationDetails.ieCode}
                    onChange={handleChange}
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    name="registrationDetails.panNo"
                    label="PAN No *"
                    value={values.registrationDetails.panNo}
                    onChange={handleChange}
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    name="registrationDetails.gstinMainBranch"
                    label="GSTIN Main"
                    value={values.registrationDetails.gstinMainBranch}
                    onChange={handleChange}
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    name="registrationDetails.gstinBranchCodeFree"
                    label="GSTIN Code (0)"
                    value={values.registrationDetails.gstinBranchCodeFree}
                    onChange={handleChange}
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    name="registrationDetails.gstinBranchCode15"
                    label="GSTIN Code (15)"
                    value={values.registrationDetails.gstinBranchCode15}
                    onChange={handleChange}
                    margin="dense"
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Bank Details - Ultra Compact */}
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                bgcolor: "rgba(0,0,0,0.02)",
                borderRadius: 1,
              }}
            >
              <FieldArray name="bankDetails">
                {({ push, remove }) => (
                  <Box>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1.5,
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          fontSize: "0.9rem",
                        }}
                      >
                        <BankIcon fontSize="small" color="primary" />
                        Bank Details
                      </Typography>
                      {!readOnly && (
                        <Button
                          startIcon={<AddIcon />}
                          onClick={() =>
                            push({
                              entityName: "",
                              branchLocation: "",
                              accountNumber: "",
                              adCode: "",
                              isDefault: false,
                            })
                          }
                          variant="outlined"
                          size="small"
                          sx={{ minWidth: "auto", px: 1 }}
                        >
                          Add Bank
                        </Button>
                      )}
                    </Box>

                    {values.bankDetails.map((bank, index) => (
                      <Box
                        key={index}
                        sx={{
                          mb: 1,
                          p: 1,
                          bgcolor: "white",
                          borderRadius: 1,
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 1,
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{ fontSize: "0.8rem" }}
                          >
                            Bank {index + 1}
                          </Typography>
                          {!readOnly && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => remove(index)}
                              disabled={values.bankDetails.length === 1}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                        <Grid container spacing={0.5}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              size="small"
                              name={`bankDetails[${index}].entityName`}
                              label="Entity *"
                              value={bank.entityName}
                              onChange={handleChange}
                              margin="dense"
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              size="small"
                              name={`bankDetails[${index}].branchLocation`}
                              label="Branch *"
                              value={bank.branchLocation}
                              onChange={handleChange}
                              margin="dense"
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              size="small"
                              name={`bankDetails[${index}].accountNumber`}
                              label="Account *"
                              value={bank.accountNumber}
                              onChange={handleChange}
                              margin="dense"
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              size="small"
                              name={`bankDetails[${index}].adCode`}
                              label="AD Code *"
                              value={bank.adCode}
                              onChange={handleChange}
                              margin="dense"
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  name={`bankDetails[${index}].isDefault`}
                                  checked={bank.isDefault}
                                  onChange={handleChange}
                                  size="small"
                                />
                              }
                              label="Default Bank"
                              sx={{
                                mt: 0.5,
                                "& .MuiFormControlLabel-label": {
                                  fontSize: "0.8rem",
                                },
                              }}
                            />
                          </Grid>
                        </Grid>
                      </Box>
                    ))}
                  </Box>
                )}
              </FieldArray>
            </Box>

            {/* Documents - Compact Grid */}
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                bgcolor: "rgba(0,0,0,0.02)",
                borderRadius: 1,
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  mb: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  fontSize: "0.9rem",
                }}
              >
                <DocumentIcon fontSize="small" color="primary" />
                KYC Documents
              </Typography>

              <Grid container spacing={1}>
                {[
                  {
                    key: "certificateOfIncorporation",
                    label: "Incorporation Cert",
                  },
                  { key: "memorandumOfAssociation", label: "MOA" },
                  { key: "articlesOfAssociation", label: "AOA" },
                  { key: "powerOfAttorney", label: "Power of Attorney" },
                  { key: "copyOfPanAllotment", label: "PAN Copy" },
                  { key: "copyOfTelephoneBill", label: "Telephone Bill" },
                  { key: "gstRegistrationCopy", label: "GST Registration" },
                  { key: "balanceSheet", label: "Balance Sheet" },
                ].map((doc) => (
                  <Grid item xs={6} sm={4} md={3} key={doc.key}>
                    <Box sx={{ p: 0.5 }}>
                      <Typography
                        variant="caption"
                        display="block"
                        gutterBottom
                        sx={{ fontWeight: "bold", fontSize: "0.7rem" }}
                      >
                        {doc.label}
                      </Typography>
                      <FileUpload
                        label={`Upload`}
                        onFilesUploaded={(files) =>
                          handleFileUpload(doc.key, files, setFieldValue)
                        }
                        bucketPath={`kyc-documents/${doc.key}`}
                        multiple={false}
                        acceptedFileTypes={[".pdf", ".jpg", ".jpeg", ".png"]}
                        readOnly={readOnly}
                        existingFiles={values.kycDocuments[doc.key].files}
                        onFileDeleted={(index) =>
                          handleFileDelete(
                            doc.key,
                            index,
                            values,
                            setFieldValue
                          )
                        }
                        compact
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Branch & AEO - Side by Side Compact */}
            <Grid container spacing={1} sx={{ mb: 2 }}>
              {/* Branch Information */}
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: "rgba(0,0,0,0.02)",
                    borderRadius: 1,
                    height: "100%",
                  }}
                >
                  <FieldArray name="branchInfo">
                    {({ push, remove }) => (
                      <Box>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 1.5,
                          }}
                        >
                          <Typography
                            variant="subtitle1"
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              fontSize: "0.9rem",
                            }}
                          >
                            <LocationIcon fontSize="small" color="primary" />
                            Branches
                          </Typography>
                          {!readOnly && (
                            <Button
                              startIcon={<AddIcon />}
                              onClick={() =>
                                push({
                                  branchCode: "",
                                  address: "",
                                  city: "",
                                  state: "",
                                  postalCode: "",
                                  country: "India",
                                })
                              }
                              variant="outlined"
                              size="small"
                              sx={{ minWidth: "auto", px: 1 }}
                            >
                              Add
                            </Button>
                          )}
                        </Box>

                        {values.branchInfo.map((branch, index) => (
                          <Box
                            key={index}
                            sx={{
                              mb: 1,
                              p: 1,
                              bgcolor: "white",
                              borderRadius: 1,
                              border: "1px solid",
                              borderColor: "divider",
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                mb: 1,
                              }}
                            >
                              <Typography
                                variant="subtitle2"
                                sx={{ fontSize: "0.8rem" }}
                              >
                                Branch {index + 1}
                              </Typography>
                              {!readOnly && (
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => remove(index)}
                                  disabled={values.branchInfo.length === 1}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                            <Grid container spacing={0.5}>
                              <Grid item xs={6}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  name={`branchInfo[${index}].branchCode`}
                                  label="Code *"
                                  value={branch.branchCode}
                                  onChange={handleChange}
                                  margin="dense"
                                />
                              </Grid>
                              <Grid item xs={6}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  name={`branchInfo[${index}].city`}
                                  label="City *"
                                  value={branch.city}
                                  onChange={handleChange}
                                  margin="dense"
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  name={`branchInfo[${index}].address`}
                                  label="Address *"
                                  value={branch.address}
                                  onChange={handleChange}
                                  margin="dense"
                                />
                              </Grid>
                              <Grid item xs={4}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  name={`branchInfo[${index}].state`}
                                  label="State *"
                                  value={branch.state}
                                  onChange={handleChange}
                                  margin="dense"
                                />
                              </Grid>
                              <Grid item xs={4}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  name={`branchInfo[${index}].postalCode`}
                                  label="Postal *"
                                  value={branch.postalCode}
                                  onChange={handleChange}
                                  margin="dense"
                                />
                              </Grid>
                              <Grid item xs={4}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  name={`branchInfo[${index}].country`}
                                  label="Country *"
                                  value={branch.country}
                                  onChange={handleChange}
                                  margin="dense"
                                />
                              </Grid>
                            </Grid>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </FieldArray>
                </Box>
              </Grid>

              {/* AEO & Currency */}
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: "rgba(0,0,0,0.02)",
                    borderRadius: 1,
                    height: "100%",
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      mb: 1.5,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      fontSize: "0.9rem",
                    }}
                  >
                    <AssignmentIcon fontSize="small" color="primary" />
                    AEO & Billing
                  </Typography>

                  <Grid container spacing={1}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        name="aeoDetails.aeoCode"
                        label="AEO Code"
                        value={values.aeoDetails.aeoCode}
                        onChange={handleChange}
                        margin="dense"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        name="aeoDetails.aeoCountry"
                        label="AEO Country"
                        value={values.aeoDetails.aeoCountry}
                        onChange={handleChange}
                        margin="dense"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        name="aeoDetails.aeoRole"
                        label="AEO Role"
                        value={values.aeoDetails.aeoRole}
                        onChange={handleChange}
                        margin="dense"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small" margin="dense">
                        <InputLabel>Currency</InputLabel>
                        <Select
                          name="billingCurrency.defaultCurrency"
                          value={values.billingCurrency.defaultCurrency}
                          onChange={handleChange}
                          label="Currency"
                        >
                          <MenuItem value="INR">INR</MenuItem>
                          <MenuItem value="USD">USD</MenuItem>
                          <MenuItem value="EUR">EUR</MenuItem>
                          <MenuItem value="GBP">GBP</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        name="accountCreditInfo.creditLimit"
                        label="Credit Limit"
                        type="number"
                        value={values.accountCreditInfo.creditLimit}
                        onChange={handleChange}
                        margin="dense"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        name="accountCreditInfo.creditPeriod"
                        label="Credit Days"
                        type="number"
                        value={values.accountCreditInfo.creditPeriod}
                        onChange={handleChange}
                        margin="dense"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="accountCreditInfo.unlimitedEnabled"
                            checked={values.accountCreditInfo.unlimitedEnabled}
                            onChange={handleChange}
                            size="small"
                          />
                        }
                        label="Unlimited Credit"
                        sx={{
                          mt: 1,
                          "& .MuiFormControlLabel-label": {
                            fontSize: "0.8rem",
                          },
                        }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
            </Grid>

            {/* Signatory & Custom House - Side by Side Compact */}
            <Grid container spacing={1} sx={{ mb: 2 }}>
              {/* Authorized Signatory */}
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: "rgba(0,0,0,0.02)",
                    borderRadius: 1,
                    height: "100%",
                  }}
                >
                  <FieldArray name="authorizedSignatory">
                    {({ push, remove }) => (
                      <Box>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 1.5,
                          }}
                        >
                          <Typography
                            variant="subtitle1"
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              fontSize: "0.9rem",
                            }}
                          >
                            <AssignmentIcon fontSize="small" color="primary" />
                            Signatories
                          </Typography>
                          {!readOnly && (
                            <Button
                              startIcon={<AddIcon />}
                              onClick={() =>
                                push({
                                  name: "",
                                  designation: "",
                                  mobile: "",
                                  email: "",
                                })
                              }
                              variant="outlined"
                              size="small"
                              sx={{ minWidth: "auto", px: 1 }}
                            >
                              Add
                            </Button>
                          )}
                        </Box>

                        {values.authorizedSignatory.map((signatory, index) => (
                          <Box
                            key={index}
                            sx={{
                              mb: 1,
                              p: 1,
                              bgcolor: "white",
                              borderRadius: 1,
                              border: "1px solid",
                              borderColor: "divider",
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                mb: 1,
                              }}
                            >
                              <Typography
                                variant="subtitle2"
                                sx={{ fontSize: "0.8rem" }}
                              >
                                Signatory {index + 1}
                              </Typography>
                              {!readOnly && (
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => remove(index)}
                                  disabled={
                                    values.authorizedSignatory.length === 1
                                  }
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                            <Grid container spacing={0.5}>
                              <Grid item xs={6}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  name={`authorizedSignatory[${index}].name`}
                                  label="Name"
                                  value={signatory.name}
                                  onChange={handleChange}
                                  margin="dense"
                                />
                              </Grid>
                              <Grid item xs={6}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  name={`authorizedSignatory[${index}].designation`}
                                  label="Designation"
                                  value={signatory.designation}
                                  onChange={handleChange}
                                  margin="dense"
                                />
                              </Grid>
                              <Grid item xs={6}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  name={`authorizedSignatory[${index}].mobile`}
                                  label="Mobile"
                                  value={signatory.mobile}
                                  onChange={handleChange}
                                  margin="dense"
                                />
                              </Grid>
                              <Grid item xs={6}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  name={`authorizedSignatory[${index}].email`}
                                  label="Email"
                                  value={signatory.email}
                                  onChange={handleChange}
                                  margin="dense"
                                />
                              </Grid>
                            </Grid>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </FieldArray>
                </Box>
              </Grid>

              {/* Custom House & Affiliates */}
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: "rgba(0,0,0,0.02)",
                    borderRadius: 1,
                    height: "100%",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 1.5,
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        fontSize: "0.9rem",
                      }}
                    >
                      <BusinessIcon fontSize="small" color="primary" />
                      Custom & Affiliates
                    </Typography>
                    {!readOnly && (
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <FieldArray name="customHouse">
                          {({ push: pushCustomHouse }) => (
                            <Button
                              startIcon={<AddIcon />}
                              onClick={() =>
                                pushCustomHouse({
                                  name: "",
                                  location: "",
                                  code: "",
                                  linkedStatus: "Not Linked",
                                })
                              }
                              variant="outlined"
                              size="small"
                              sx={{ minWidth: "auto", px: 1 }}
                            >
                              Custom
                            </Button>
                          )}
                        </FieldArray>
                        <FieldArray name="affiliateBranches">
                          {({ push: pushAffiliate }) => (
                            <Button
                              startIcon={<AddIcon />}
                              onClick={() =>
                                pushAffiliate({
                                  branchCode: "",
                                  branchName: "",
                                })
                              }
                              variant="outlined"
                              size="small"
                              sx={{ minWidth: "auto", px: 1 }}
                            >
                              Affiliate
                            </Button>
                          )}
                        </FieldArray>
                      </Box>
                    )}
                  </Box>

                  {/* Custom House */}
                  <FieldArray name="customHouse">
                    {({ push, remove }) => (
                      <Box sx={{ mb: 2 }}>
                        {values.customHouse.map((house, index) => (
                          <Box
                            key={index}
                            sx={{
                              mb: 1,
                              p: 1,
                              bgcolor: "white",
                              borderRadius: 1,
                              border: "1px solid",
                              borderColor: "divider",
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                mb: 1,
                              }}
                            >
                              <Typography
                                variant="subtitle2"
                                sx={{ fontSize: "0.8rem" }}
                              >
                                Custom {index + 1}
                              </Typography>
                              {!readOnly && (
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => remove(index)}
                                  disabled={values.customHouse.length === 1}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                            <Grid container spacing={0.5}>
                              <Grid item xs={12}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  name={`customHouse[${index}].name`}
                                  label="Name"
                                  value={house.name}
                                  onChange={handleChange}
                                  margin="dense"
                                />
                              </Grid>
                              <Grid item xs={6}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  name={`customHouse[${index}].location`}
                                  label="Location"
                                  value={house.location}
                                  onChange={handleChange}
                                  margin="dense"
                                />
                              </Grid>
                              <Grid item xs={6}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  name={`customHouse[${index}].code`}
                                  label="Code"
                                  value={house.code}
                                  onChange={handleChange}
                                  margin="dense"
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <FormControl
                                  fullWidth
                                  size="small"
                                  margin="dense"
                                >
                                  <InputLabel>Status</InputLabel>
                                  <Select
                                    name={`customHouse[${index}].linkedStatus`}
                                    value={house.linkedStatus}
                                    onChange={handleChange}
                                    label="Status"
                                  >
                                    <MenuItem value="Linked">Linked</MenuItem>
                                    <MenuItem value="Not Linked">
                                      Not Linked
                                    </MenuItem>
                                  </Select>
                                </FormControl>
                              </Grid>
                            </Grid>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </FieldArray>

                  {/* Affiliate Branches */}
                  <FieldArray name="affiliateBranches">
                    {({ push, remove }) => (
                      <Box>
                        {values.affiliateBranches.map((branch, index) => (
                          <Box
                            key={index}
                            sx={{
                              mb: 1,
                              p: 1,
                              bgcolor: "white",
                              borderRadius: 1,
                              border: "1px solid",
                              borderColor: "divider",
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                mb: 1,
                              }}
                            >
                              <Typography
                                variant="subtitle2"
                                sx={{ fontSize: "0.8rem" }}
                              >
                                Affiliate {index + 1}
                              </Typography>
                              {!readOnly && (
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => remove(index)}
                                  disabled={
                                    values.affiliateBranches.length === 1
                                  }
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                            <Grid container spacing={0.5}>
                              <Grid item xs={6}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  name={`affiliateBranches[${index}].branchCode`}
                                  label="Code"
                                  value={branch.branchCode}
                                  onChange={handleChange}
                                  margin="dense"
                                />
                              </Grid>
                              <Grid item xs={6}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  name={`affiliateBranches[${index}].branchName`}
                                  label="Name"
                                  value={branch.branchName}
                                  onChange={handleChange}
                                  margin="dense"
                                />
                              </Grid>
                            </Grid>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </FieldArray>
                </Box>
              </Grid>
            </Grid>

            {/* Notes - Compact */}
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                bgcolor: "rgba(0,0,0,0.02)",
                borderRadius: 1,
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{ mb: 1, fontSize: "0.9rem" }}
              >
                Notes
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                name="notes"
                label="Additional Notes"
                value={values.notes}
                onChange={handleChange}
                margin="dense"
              />
            </Box>
          </Box>

          {!readOnly && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
                p: 1.5,
                bgcolor: "background.paper",
                borderTop: 1,
                borderColor: "divider",
              }}
            >
              <Button variant="outlined" onClick={onCancel} size="small">
                Cancel
              </Button>
              <Button variant="contained" type="submit" size="small">
                Save Directory
              </Button>
            </Box>
          )}

          {submitError && (
            <Snackbar
              open={Boolean(submitError)}
              autoHideDuration={6000}
              onClose={handleSnackbarClose}
              message={submitError}
              anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            />
          )}
        </Form>
      )}
    </Formik>
  );
};

export default DirectoryForm;
