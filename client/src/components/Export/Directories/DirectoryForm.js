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
  IconButton,
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

const validationSchema = Yup.object({
  organization: Yup.string()
    .max(255)
    .required("Organization is required")
    .matches(/^[A-Z\s]*$/, "Only capital letters allowed"),
  approvalStatus: Yup.string()
    .oneOf(["Pending", "Approved", "Rejected"])
    .required(),

  generalInfo: Yup.object({
    entityType: Yup.string()
      .oneOf(["Company", "Partnership", "LLP", "Proprietorship"])
      .required("Company Type is required"),
    msmeRegistered: Yup.boolean(),
    shipperConsignee: Yup.boolean(),
  }),

  address: Yup.object({
    branchName: Yup.string().max(255).required("Branch Name is required"),
    addressLine: Yup.string().max(500).required("Address is required"),
    postalCode: Yup.string().max(10).required("Postal Code is required"),
    mobile: Yup.string().max(15),
    email: Yup.string().email().max(255),
  }),

  registrationDetails: Yup.object({
    ieCode: Yup.string().max(20).required("IE Code is required"),
    panNo: Yup.string().max(10).required("PAN No is required"),
    gstinMainBranch: Yup.string().max(15),
  }),

  authorizedSignatory: Yup.array().of(
    Yup.object({
      name: Yup.string().max(255),
      designation: Yup.string().max(100),
      mobile: Yup.string().max(15),
      email: Yup.string().email().max(255),
    })
  ),
});

const DirectoryForm = ({ directory, onSave, onCancel, readOnly = false }) => {
  const initialValues = {
    organization: directory?.organization || "",
    approvalStatus: directory?.approvalStatus || "Pending",
    generalInfo: {
      entityType: directory?.generalInfo?.entityType || "",
      msmeRegistered: directory?.generalInfo?.msmeRegistered || false,
      shipperConsignee: directory?.generalInfo?.shipperConsignee || false,
    },
    address: {
      branchName: directory?.address?.branchName || "",
      addressLine: directory?.address?.addressLine || "",
      postalCode: directory?.address?.postalCode || "",
      mobile: directory?.address?.mobile || "",
      email: directory?.address?.email || "",
    },
    registrationDetails: {
      ieCode: directory?.registrationDetails?.ieCode || "",
      panNo: directory?.registrationDetails?.panNo || "",
      gstinMainBranch: directory?.registrationDetails?.gstinMainBranch || "",
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
        branchName: "",
        address: "",
        city: "",
        state: "",
        postalCode: "",
        country: "India",
      },
    ],
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
        ifscCode: "",
        isDefault: false,
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

  const handleOrganizationChange = (e, handleChange, setFieldValue) => {
    const value = e.target.value.toUpperCase();
    setFieldValue("organization", value);
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
            {/* Organization & Basic Info - Ultra Compact */}
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
                Company Information
              </Typography>

              <Grid container spacing={1}>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    name="organization"
                    label="Company Name *"
                    value={values.organization}
                    onChange={(e) =>
                      handleOrganizationChange(e, handleChange, setFieldValue)
                    }
                    onBlur={handleBlur}
                    error={touched.organization && Boolean(errors.organization)}
                    helperText={touched.organization && errors.organization}
                    margin="dense"
                    inputProps={{
                      style: { textTransform: "uppercase" },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small" margin="dense">
                    <InputLabel>Merchant Exporter Type *</InputLabel>
                    <Select
                      name="generalInfo.entityType"
                      value={values.generalInfo.entityType}
                      onChange={handleChange}
                      label="Company Type *"
                    >
                      <MenuItem value="Manufacturer Exporter">Manufacturer Exporter</MenuItem>
                      <MenuItem value="Marchant Exporter">Marchant Exporter</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="generalInfo.shipperConsignee"
                        checked={values.generalInfo.shipperConsignee}
                        onChange={handleChange}
                        size="small"
                      />
                    }
                    label="Shipper/Consignee"
                    sx={{
                      mt: 1,
                      "& .MuiFormControlLabel-label": { fontSize: "0.8rem" },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={1}>
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
              </Grid>
            </Box>

            {/* Branch Information - Dense Grid */}
            
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                bgcolor: "rgba(0,0,0,0.02)",
                borderRadius: 1,
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
                  <LocationIcon fontSize="small" color="primary" />
                  Branch Information
                </Typography>

                {/* Add Branch button placed at top-right of the section.
                    Uses Formik's setFieldValue (available in the render scope)
                    to append a new branch to values.branchInfo. This avoids
                    relying on FieldArray's `push` which isn't available here. */}
                {!readOnly && (
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() =>
                      setFieldValue("branchInfo", [
                        ...values.branchInfo,
                        {
                          branchCode: "",
                          branchName: "",
                          address: "",
                          city: "",
                          state: "",
                          postalCode: "",
                          country: "India",
                          mobile: "",
                          email: "",
                        },
                      ])
                    }
                    variant="outlined"
                    size="small"
                    sx={{ mt: 0 }}
                  >
                    Add Branch
                  </Button>
                )}
              </Box>

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
                <Grid item xs={12} sm={6} md={4}>
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
                <Grid item xs={12} sm={6} md={4}>
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
                <Grid item xs={12} sm={6} md={4}>
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
                              ifscCode: "",
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
                          {/* Three columns per row: xs=12 sm=4 */}
                          <Grid item xs={12} sm={4}>
                            <TextField
                              fullWidth
                              size="small"
                              name={`bankDetails[${index}].entityName`}
                              label="Bank Name *"
                              value={bank.entityName}
                              onChange={handleChange}
                              margin="dense"
                            />
                          </Grid>

                          <Grid item xs={12} sm={4}>
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

                          <Grid item xs={12} sm={4}>
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

                          <Grid item xs={12} sm={4}>
                            <TextField
                              fullWidth
                              size="small"
                              name={`bankDetails[${index}].adCode`}
                              label="AD Code"
                              value={bank.adCode}
                              onChange={handleChange}
                              margin="dense"
                            />
                          </Grid>

                          <Grid item xs={12} sm={4}>
                            <TextField
                              fullWidth
                              size="small"
                              name={`bankDetails[${index}].ifscCode`}
                              label="IFSC Code"
                              value={bank.ifscCode}
                              onChange={handleChange}
                              margin="dense"
                            />
                          </Grid>

                          <Grid item xs={12} sm={4}>
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

                          <FieldArray name="branchInfo">
                {({ push, remove }) => (
                  <Box>
                    {values.branchInfo.map((branch, index) => (
                      <Box
                        key={index}
                        sx={{
                          mb: 2,
                          p: 1.5,
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
                            mb: 2,
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{ fontSize: "0.9rem", fontWeight: "bold" }}
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

                        <Grid container spacing={1}>
                          <Grid item xs={12} sm={6} md={3}>
                            <TextField
                              fullWidth
                              size="small"
                              name={`branchInfo[${index}].branchName`}
                              label="Branch Name *"
                              value={branch.branchName}
                              onChange={handleChange}
                              margin="dense"
                            />
                          </Grid>
                          <Grid item xs={12} sm={6} md={3}>
                            <TextField
                              fullWidth
                              size="small"
                              name={`branchInfo[${index}].branchCode`}
                              label="Branch Code *"
                              value={branch.branchCode}
                              onChange={handleChange}
                              margin="dense"
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              size="small"
                              multiline
                              rows={1}
                              name={`branchInfo[${index}].address`}
                              label="Address *"
                              value={branch.address}
                              onChange={handleChange}
                              margin="dense"
                            />
                          </Grid>
                          <Grid item xs={6} sm={3} md={2}>
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
                          <Grid item xs={6} sm={3} md={2}>
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
                          <Grid item xs={6} sm={3} md={2}>
                            <TextField
                              fullWidth
                              size="small"
                              name={`branchInfo[${index}].postalCode`}
                              label="Postal Code *"
                              value={branch.postalCode}
                              onChange={handleChange}
                              margin="dense"
                            />
                          </Grid>
                          <Grid item xs={6} sm={3} md={2}>
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
                          <Grid item xs={6} sm={4} md={3}>
                            <TextField
                              fullWidth
                              size="small"
                              name={`branchInfo[${index}].mobile`}
                              label="Mobile"
                              value={branch.mobile}
                              onChange={handleChange}
                              margin="dense"
                            />
                          </Grid>
                          <Grid item xs={6} sm={8} md={5}>
                            <TextField
                              fullWidth
                              size="small"
                              name={`branchInfo[${index}].email`}
                              label="Email"
                              type="email"
                              value={branch.email}
                              onChange={handleChange}
                              margin="dense"
                            />
                          </Grid>
                        </Grid>

                        {/* KYC Documents for each branch */}
                        <Box sx={{ mt: 2 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              mb: 1,
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              fontSize: "0.8rem",
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
                              {
                                key: "powerOfAttorney",
                                label: "Power of Attorney",
                              },
                              { key: "copyOfPanAllotment", label: "PAN Copy" },
                              {
                                key: "copyOfTelephoneBill",
                                label: "Telephone Bill",
                              },
                              {
                                key: "gstRegistrationCopy",
                                label: "GST Registration",
                              },
                              { key: "balanceSheet", label: "Balance Sheet" },
                            ].map((doc) => (
                              <Grid item xs={6} sm={4} md={3} key={doc.key}>
                                <Box sx={{ p: 0.5 }}>
                                  <Typography
                                    variant="caption"
                                    display="block"
                                    gutterBottom
                                    sx={{
                                      fontWeight: "bold",
                                      fontSize: "0.7rem",
                                    }}
                                  >
                                    {doc.label}
                                  </Typography>
                                  <FileUpload
                                    label={`Upload`}
                                    onFilesUploaded={(files) =>
                                      handleFileUpload(
                                        doc.key,
                                        files,
                                        setFieldValue
                                      )
                                    }
                                    bucketPath={`kyc-documents/${
                                      doc.key
                                    }-branch-${index + 1}`}
                                    multiple={false}
                                    acceptedFileTypes={[
                                      ".pdf",
                                      ".jpg",
                                      ".jpeg",
                                      ".png",
                                    ]}
                                    readOnly={readOnly}
                                    existingFiles={
                                      values.kycDocuments[doc.key].files
                                    }
                                    onFileDeleted={(fileIndex) =>
                                      handleFileDelete(
                                        doc.key,
                                        fileIndex,
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
                          <Grid item xs={6} sm={3} md={2}>
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
                                "& .MuiFormControlLabel-label": {
                                  fontSize: "0.8rem",
                                },
                              }}
                            />
                          </Grid>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </FieldArray>
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
