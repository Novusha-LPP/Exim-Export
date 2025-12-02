import React from "react";
import {
  Box,
  Card,
  Typography,
  Grid,
  TextField,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from "@mui/material";

const accessoryOptions = [
  "No Accessories",
  "Packing Material",
  "Spare Parts",
  "Consumables",
  "Others",
];

const ProductOtherDetailsTab = ({ formik, idx = 0 }) => {
  const product = formik.values.products?.[idx] || {};
  const otherDetails = product.otherDetails || {};
  const thirdParty = otherDetails.thirdParty || {};
  const manufacturer = otherDetails.manufacturer || {};

  const handleChange = (field, value) => {
    const updatedProducts = [...(formik.values.products || [])];
    if (!updatedProducts[idx]) updatedProducts[idx] = {};
    updatedProducts[idx].otherDetails = { ...otherDetails, [field]: value };
    formik.setFieldValue("products", updatedProducts);
  };
  const handleThirdPartyChange = (field, value) =>
    handleChange("thirdParty", { ...thirdParty, [field]: value });
  const handleManufacturerChange = (field, value) =>
    handleChange("manufacturer", { ...manufacturer, [field]: value });

  return (
    <Box>
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Other Product Details
        </Typography>
        <Grid container spacing={2}>
          {/* Accessories Section */}
          <Grid item xs={12} md={3}>
            <FormControl size="small" fullWidth>
              <InputLabel>Accessories</InputLabel>
              <Select
                value={otherDetails.accessories || "No Accessories"}
                label="Accessories"
                onChange={(e) => handleChange("accessories", e.target.value)}
              >
                {accessoryOptions.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={9}>
            <TextField
              label=""
              multiline
              minRows={2}
              fullWidth
              value={otherDetails.accessoriesRemarks || ""}
              onChange={(e) =>
                handleChange("accessoriesRemarks", e.target.value)
              }
              placeholder="Remarks"
            />
          </Grid>

          {/* Third Party EXPORT Section */}
          <Grid item xs={12} md={3} alignItems="center">
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!otherDetails.isThirdPartyExport}
                  onChange={(e) =>
                    handleChange("isThirdPartyExport", e.target.checked)
                  }
                />
              }
              label="Third Party EXPORT"
            />
          </Grid>
          <Grid item xs={12} md={9}></Grid>

          <Grid item xs={12} md={3}>
            <TextField
              label="Name"
              size="small"
              fullWidth
              value={thirdParty.name || ""}
              onChange={(e) => handleThirdPartyChange("name", e.target.value)}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              label="IE Code"
              size="small"
              fullWidth
              value={thirdParty.ieCode || ""}
              onChange={(e) => handleThirdPartyChange("ieCode", e.target.value)}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              label="Branch SNo"
              size="small"
              fullWidth
              value={thirdParty.branchSrNo || ""}
              onChange={(e) =>
                handleThirdPartyChange("branchSrNo", e.target.value)
              }
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Regn. No"
              size="small"
              fullWidth
              value={thirdParty.regnNo || ""}
              onChange={(e) => handleThirdPartyChange("regnNo", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Address"
              size="small"
              fullWidth
              multiline
              minRows={2}
              value={thirdParty.address || ""}
              onChange={(e) =>
                handleThirdPartyChange("address", e.target.value)
              }
            />
          </Grid>
        </Grid>

        {/* Manufacturer/Producer/Grower Details */}
        <Typography sx={{ mt: 3, mb: 3 }} fontWeight="bold">
          Manufacturer / Producer / Grower Details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              label="Name"
              size="small"
              fullWidth
              value={manufacturer.name || ""}
              onChange={(e) => handleManufacturerChange("name", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Code"
              size="small"
              fullWidth
              value={manufacturer.code || ""}
              onChange={(e) => handleManufacturerChange("code", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={7}>
            <TextField
              label="Address"
              size="small"
              fullWidth
              value={manufacturer.address || ""}
              onChange={(e) =>
                handleManufacturerChange("address", e.target.value)
              }
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Country"
              size="small"
              fullWidth
              value={manufacturer.country || ""}
              onChange={(e) =>
                handleManufacturerChange("country", e.target.value)
              }
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="State/Province"
              size="small"
              fullWidth
              value={manufacturer.stateProvince || ""}
              onChange={(e) =>
                handleManufacturerChange("stateProvince", e.target.value)
              }
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Postal Code"
              size="small"
              fullWidth
              value={manufacturer.postalCode || ""}
              onChange={(e) =>
                handleManufacturerChange("postalCode", e.target.value)
              }
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Source State"
              size="small"
              fullWidth
              value={manufacturer.sourceState || ""}
              onChange={(e) =>
                handleManufacturerChange("sourceState", e.target.value)
              }
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Transit Country"
              size="small"
              fullWidth
              value={manufacturer.transitCountry || ""}
              onChange={(e) =>
                handleManufacturerChange("transitCountry", e.target.value)
              }
            />
          </Grid>
        </Grid>
      </Card>
    </Box>
  );
};

export default ProductOtherDetailsTab;
