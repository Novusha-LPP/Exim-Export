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
  FormHelperText,
  FormGroup,
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
    .max(255, "Organization name must be at most 255 characters")
    .required("Organization is required"),

  approvalStatus: Yup.string()
    .oneOf(["Pending", "Approved", "Rejected"])
    .required("Approval status is required"),

  generalInfo: Yup.object({
    exporterType: Yup.string().required("Exporter type is required"),
    entityType: Yup.string().required("Entity type is required"),
    shipperConsignee: Yup.string().oneOf(["shipper", "consignee", ""]),
  }),

  registrationDetails: Yup.object({
    ieCode: Yup.string()
    .required("IE Code is required"),
    panNo: Yup.string()
      .matches(
        /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
        "Invalid PAN format (e.g., ABCDE1234F)"
      )
      .required("PAN No is required"),
    gstinMainBranch: Yup.string().matches(
      /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/,
      "Invalid GSTIN format"
    ),
  }),

  branchInfo: Yup.array()
    .of(
      Yup.object({
        branchCode: Yup.string().max(50).required("Branch code is required"),
        branchName: Yup.string().max(255).required("Branch name is required"),
        address: Yup.string().max(500).required("Address is required"),
        city: Yup.string().max(100).required("City is required"),
        state: Yup.string().max(100).required("State is required"),
        postalCode: Yup.string()
          .matches(/^\d{6}$/, "Postal code must be 6 digits")
          .required("Postal code is required"),
        country: Yup.string().max(100).required("Country is required"),
        mobile: Yup.string().matches(/^\d{10}$/, "Mobile must be 10 digits"),
        email: Yup.string().email("Invalid email format").max(255),
        msmeRegistered: Yup.boolean(),
      })
    )
    .min(1, "At least one branch is required"),

  kycDocuments: Yup.object({
    certificateOfIncorporation: Yup.object({
      uploaded: Yup.boolean(),
      files: Yup.array(),
    }),
    memorandumOfAssociation: Yup.object({
      uploaded: Yup.boolean(),
      files: Yup.array(),
    }),
    articlesOfAssociation: Yup.object({
      uploaded: Yup.boolean(),
      files: Yup.array(),
    }),
    powerOfAttorney: Yup.object({
      uploaded: Yup.boolean(),
      files: Yup.array(),
    }),
    copyOfPanAllotment: Yup.object({
      uploaded: Yup.boolean(),
      files: Yup.array(),
    }),
    copyOfTelephoneBill: Yup.object({
      uploaded: Yup.boolean(),
      files: Yup.array(),
    }),
    gstRegistrationCopy: Yup.object({
      uploaded: Yup.boolean(),
      files: Yup.array(),
    }),
    balanceSheet: Yup.object({
      uploaded: Yup.boolean(),
      files: Yup.array(),
    }),
  }),

  billingCurrency: Yup.object({
    defaultCurrency: Yup.string().max(10),
    defaultBillTypes: Yup.array().of(Yup.string()),
  }),

  authorizedSignatory: Yup.array().of(
    Yup.object({
      name: Yup.string().max(255),
      designation: Yup.string().max(100),
      mobile: Yup.string().matches(/^\d{10}$/, "Mobile must be 10 digits"),
      email: Yup.string().email("Invalid email format").max(255),
    })
  ),

  accountCreditInfo: Yup.object({
    creditLimit: Yup.string().max(50),
    unlimitedEnabled: Yup.boolean(),
    creditPeriod: Yup.string().max(50),
  }),

  notes: Yup.string().max(1000),
});

const DirectoryForm = ({ directory, onSave, onCancel, readOnly = false }) => {
  const initialValues = {
    organization: directory?.organization || "",
    approvalStatus: directory?.approvalStatus || "Pending",
    generalInfo: {
      exporterType: directory?.generalInfo?.exporterType || "",
      entityType: directory?.generalInfo?.entityType || "",
      shipperConsignee: directory?.generalInfo?.shipperConsignee || "",
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
        mobile: "",
        email: "",
        msmeRegistered: false,
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

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      await onSave(values);
      setSubmitError("");
    } catch (error) {
      setSubmitError(error.message || "Validation failed");
    } finally {
      setSubmitting(false);
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
      validationSchema={validationSchema}
      initialValues={initialValues}
      onSubmit={handleSubmit}
      enableReinitialize
      validateOnChange={true}
      validateOnBlur={true}
    >
      {({
        values,
        errors,
        touched,
        handleChange,
        handleBlur,
        setFieldValue,
        isSubmitting,
      }) => {
        console.log("Form Errors:", errors); // Debug errors
        console.log("Form Touched:", touched); // Debug touched fields

        return (
          <Form>
            <Box sx={{ maxHeight: "80vh", overflow: "auto", p: 1 }}>
              {/* Organization & Basic Info */}
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
                      onChange={(e) => {
                        const uppercaseValue = e.target.value.toUpperCase();
                        setFieldValue("organization", uppercaseValue);
                      }}
                      onBlur={handleBlur}
                      error={
                        touched.organization && Boolean(errors.organization)
                      }
                      helperText={touched.organization && errors.organization}
                      margin="dense"
                      inputProps={{
                        style: { textTransform: "uppercase" },
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={2}>
                    <FormControl
                      fullWidth
                      size="small"
                      margin="dense"
                      error={
                        touched.generalInfo?.entityType &&
                        Boolean(errors.generalInfo?.entityType)
                      }
                    >
                      <InputLabel>Company Type *</InputLabel>
                      <Select
                        name="generalInfo.entityType"
                        value={values.generalInfo.entityType}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Company Type *"
                      >
                        <MenuItem value="Private Limited">
                          Private Limited
                        </MenuItem>
                        <MenuItem value="Public Limited">
                          Public Limited
                        </MenuItem>
                        <MenuItem value="Proprietor">Proprietor</MenuItem>
                        <MenuItem value="Partner">Partner</MenuItem>
                      </Select>
                      {touched.generalInfo?.entityType &&
                        errors.generalInfo?.entityType && (
                          <FormHelperText>
                            {errors.generalInfo.entityType}
                          </FormHelperText>
                        )}
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={2}>
                    <FormControl
                      fullWidth
                      size="small"
                      margin="dense"
                      error={
                        touched.generalInfo?.exporterType &&
                        Boolean(errors.generalInfo?.exporterType)
                      }
                    >
                      <InputLabel>Exporter Type *</InputLabel>
                      <Select
                        name="generalInfo.exporterType"
                        value={values.generalInfo.exporterType}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Exporter Type *"
                      >
                        <MenuItem value="Manufacturer Exporter">
                          Manufacturer Exporter
                        </MenuItem>
                        <MenuItem value="Marchant Exporter">
                          Marchant Exporter
                        </MenuItem>
                      </Select>
                      {touched.generalInfo?.exporterType &&
                        errors.generalInfo?.exporterType && (
                          <FormHelperText>
                            {errors.generalInfo.exporterType}
                          </FormHelperText>
                        )}
                    </FormControl>
                  </Grid>

                  <Grid item xs={6} sm={2} md={2}>
                    <FormGroup>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={
                              values.generalInfo.shipperConsignee === "shipper"
                            }
                            onChange={(e) => {
                              const newValue = e.target.checked
                                ? "shipper"
                                : "";
                              setFieldValue(
                                "generalInfo.shipperConsignee",
                                newValue
                              );
                            }}
                            size="small"
                          />
                        }
                        label="Shipper"
                        sx={{
                          "& .MuiFormControlLabel-label": {
                            fontSize: "0.8rem",
                          },
                        }}
                      />

                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={
                              values.generalInfo.shipperConsignee ===
                              "consignee"
                            }
                            onChange={(e) => {
                              const newValue = e.target.checked
                                ? "consignee"
                                : "";
                              setFieldValue(
                                "generalInfo.shipperConsignee",
                                newValue
                              );
                            }}
                            size="small"
                          />
                        }
                        label="Consignee"
                        sx={{
                          "& .MuiFormControlLabel-label": {
                            fontSize: "0.8rem",
                          },
                        }}
                      />
                    </FormGroup>
                  </Grid>

                  <Grid item xs={12} sm={6} md={2}>
                    <FormControl
                      fullWidth
                      size="small"
                      margin="dense"
                      error={
                        touched.approvalStatus && Boolean(errors.approvalStatus)
                      }
                    >
                      <InputLabel>Status *</InputLabel>
                      <Select
                        name="approvalStatus"
                        value={values.approvalStatus}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Status *"
                      >
                        <MenuItem value="Pending">Pending</MenuItem>
                        <MenuItem value="Approved">Approved</MenuItem>
                        <MenuItem value="Rejected">Rejected</MenuItem>
                      </Select>
                      {touched.approvalStatus && errors.approvalStatus && (
                        <FormHelperText>{errors.approvalStatus}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>

              {/* Registration Details */}
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
                  Registration
                </Typography>

                <Grid container spacing={1}>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      size="small"
                      name="registrationDetails.ieCode"
                      label="IE Code * (10 digits)"
                      value={values.registrationDetails.ieCode}
                      onChange={(e) => {
                        // Only allow numbers and max 10 digits
                        const value = e.target.value;

                        setFieldValue("registrationDetails.ieCode", value);
                      }}
                      onBlur={handleBlur}
                      error={
                        touched.registrationDetails?.ieCode &&
                        Boolean(errors.registrationDetails?.ieCode)
                      }
                      helperText={
                        touched.registrationDetails?.ieCode &&
                        errors.registrationDetails?.ieCode
                      }
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
                      onChange={(e) => {
                        const uppercaseValue = e.target.value.toUpperCase();
                        setFieldValue(
                          "registrationDetails.panNo",
                          uppercaseValue
                        );
                      }}
                      onBlur={handleBlur}
                      error={
                        touched.registrationDetails?.panNo &&
                        Boolean(errors.registrationDetails?.panNo)
                      }
                      helperText={
                        touched.registrationDetails?.panNo &&
                        errors.registrationDetails?.panNo
                      }
                      margin="dense"
                      inputProps={{
                        style: { textTransform: "uppercase" },
                        maxLength: 10,
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      size="small"
                      name="registrationDetails.gstinMainBranch"
                      label="GSTIN"
                      value={values.registrationDetails.gstinMainBranch}
                      onChange={(e) => {
                        const uppercaseValue = e.target.value.toUpperCase();
                        setFieldValue(
                          "registrationDetails.gstinMainBranch",
                          uppercaseValue
                        );
                      }}
                      onBlur={handleBlur}
                      error={
                        touched.registrationDetails?.gstinMainBranch &&
                        Boolean(errors.registrationDetails?.gstinMainBranch)
                      }
                      helperText={
                        touched.registrationDetails?.gstinMainBranch &&
                        errors.registrationDetails?.gstinMainBranch
                      }
                      margin="dense"
                      inputProps={{
                        style: { textTransform: "uppercase" },
                        maxLength: 15,
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* Bank Details */}
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
                            <Grid item xs={12} sm={4}>
                              <TextField
                                fullWidth
                                size="small"
                                name={`bankDetails[${index}].entityName`}
                                label="Bank Name *"
                                value={bank.entityName}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={
                                  touched.bankDetails?.[index]?.entityName &&
                                  Boolean(
                                    errors.bankDetails?.[index]?.entityName
                                  )
                                }
                                helperText={
                                  touched.bankDetails?.[index]?.entityName &&
                                  errors.bankDetails?.[index]?.entityName
                                }
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
                                onBlur={handleBlur}
                                error={
                                  touched.bankDetails?.[index]
                                    ?.branchLocation &&
                                  Boolean(
                                    errors.bankDetails?.[index]?.branchLocation
                                  )
                                }
                                helperText={
                                  touched.bankDetails?.[index]
                                    ?.branchLocation &&
                                  errors.bankDetails?.[index]?.branchLocation
                                }
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
                                onBlur={handleBlur}
                                error={
                                  touched.bankDetails?.[index]?.accountNumber &&
                                  Boolean(
                                    errors.bankDetails?.[index]?.accountNumber
                                  )
                                }
                                helperText={
                                  touched.bankDetails?.[index]?.accountNumber &&
                                  errors.bankDetails?.[index]?.accountNumber
                                }
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
                                onBlur={handleBlur}
                                error={
                                  touched.bankDetails?.[index]?.adCode &&
                                  Boolean(errors.bankDetails?.[index]?.adCode)
                                }
                                helperText={
                                  touched.bankDetails?.[index]?.adCode &&
                                  errors.bankDetails?.[index]?.adCode
                                }
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
                                onChange={(e) => {
                                  const uppercaseValue =
                                    e.target.value.toUpperCase();
                                  setFieldValue(
                                    `bankDetails[${index}].ifscCode`,
                                    uppercaseValue
                                  );
                                }}
                                onBlur={handleBlur}
                                error={
                                  touched.bankDetails?.[index]?.ifscCode &&
                                  Boolean(errors.bankDetails?.[index]?.ifscCode)
                                }
                                helperText={
                                  touched.bankDetails?.[index]?.ifscCode &&
                                  errors.bankDetails?.[index]?.ifscCode
                                }
                                margin="dense"
                                inputProps={{
                                  style: { textTransform: "uppercase" },
                                  maxLength: 11,
                                }}
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

              {/* Branch Information Header */}
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
                            msmeRegistered: false,
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

              {/* Branch Information Array */}
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
                              onBlur={handleBlur}
                              error={
                                touched.branchInfo?.[index]?.branchName &&
                                Boolean(errors.branchInfo?.[index]?.branchName)
                              }
                              helperText={
                                touched.branchInfo?.[index]?.branchName &&
                                errors.branchInfo?.[index]?.branchName
                              }
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
                              onBlur={handleBlur}
                              error={
                                touched.branchInfo?.[index]?.branchCode &&
                                Boolean(errors.branchInfo?.[index]?.branchCode)
                              }
                              helperText={
                                touched.branchInfo?.[index]?.branchCode &&
                                errors.branchInfo?.[index]?.branchCode
                              }
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
                              onBlur={handleBlur}
                              error={
                                touched.branchInfo?.[index]?.address &&
                                Boolean(errors.branchInfo?.[index]?.address)
                              }
                              helperText={
                                touched.branchInfo?.[index]?.address &&
                                errors.branchInfo?.[index]?.address
                              }
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
                              onBlur={handleBlur}
                              error={
                                touched.branchInfo?.[index]?.city &&
                                Boolean(errors.branchInfo?.[index]?.city)
                              }
                              helperText={
                                touched.branchInfo?.[index]?.city &&
                                errors.branchInfo?.[index]?.city
                              }
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
                              onBlur={handleBlur}
                              error={
                                touched.branchInfo?.[index]?.state &&
                                Boolean(errors.branchInfo?.[index]?.state)
                              }
                              helperText={
                                touched.branchInfo?.[index]?.state &&
                                errors.branchInfo?.[index]?.state
                              }
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
                              onChange={(e) => {
                                const value = e.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 6);
                                setFieldValue(
                                  `branchInfo[${index}].postalCode`,
                                  value
                                );
                              }}
                              onBlur={handleBlur}
                              error={
                                touched.branchInfo?.[index]?.postalCode &&
                                Boolean(errors.branchInfo?.[index]?.postalCode)
                              }
                              helperText={
                                touched.branchInfo?.[index]?.postalCode &&
                                errors.branchInfo?.[index]?.postalCode
                              }
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
                              onBlur={handleBlur}
                              error={
                                touched.branchInfo?.[index]?.country &&
                                Boolean(errors.branchInfo?.[index]?.country)
                              }
                              helperText={
                                touched.branchInfo?.[index]?.country &&
                                errors.branchInfo?.[index]?.country
                              }
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
                              onChange={(e) => {
                                const value = e.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 10);
                                setFieldValue(
                                  `branchInfo[${index}].mobile`,
                                  value
                                );
                              }}
                              onBlur={handleBlur}
                              error={
                                touched.branchInfo?.[index]?.mobile &&
                                Boolean(errors.branchInfo?.[index]?.mobile)
                              }
                              helperText={
                                touched.branchInfo?.[index]?.mobile &&
                                errors.branchInfo?.[index]?.mobile
                              }
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
                              onBlur={handleBlur}
                              error={
                                touched.branchInfo?.[index]?.email &&
                                Boolean(errors.branchInfo?.[index]?.email)
                              }
                              helperText={
                                touched.branchInfo?.[index]?.email &&
                                errors.branchInfo?.[index]?.email
                              }
                              margin="dense"
                            />
                          </Grid>
                          <Grid item xs={6} sm={3} md={2}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={Boolean(branch.msmeRegistered)}
                                  onChange={() =>
                                    setFieldValue(
                                      `branchInfo[${index}].msmeRegistered`,
                                      !branch.msmeRegistered
                                    )
                                  }
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
                <Button
                  variant="contained"
                  type="submit"
                  size="small"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save Directory"}
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
        );
      }}
    </Formik>
  );
};

export default DirectoryForm;
