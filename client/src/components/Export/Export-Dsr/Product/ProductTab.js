// ProductTab.js - UPDATED TO USE selectedProductIndex
import React, { useState, useMemo } from "react";
import { Box, Tabs, Tab, Typography, Divider, Chip } from "@mui/material";

import ProductMainTab from "./ProductMainTab";
import ProductGeneralTab from "./ProductGeneralTab";
import DrawbackTab from "./DrawbackTab";
import ProductCessDutyTab from "./ProductCessDutyTab";
import ProductAREDetailsTab from "./ProductAREDetailsTab";
import ProductReExportTab from "./ProductReExportTab";
import ProductOtherDetailsTab from "./ProductOtherDetailsTab";
import ProductDEECTab from "./ProductDEECTab";
import ProductEPCGTab from "./ProductEPCGTab";

function ProductTabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`product-tabpanel-${index}`}
      aria-labelledby={`product-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

// EXIM Code to Tab mapping
const getTabsForEximCode = (eximCode) => {
  const code = eximCode?.toString();
  switch (code) {
    case "03 - ADVANCE LICENCE ": // ADVANCE LICENCE DEEC
      return [
        "Main",
        "General",
        "DEEC",
        "CessExport Duty",
        "AreDetails",
        "Re-Export",
        "Other Details",
      ];
    case "19 - DRAWBACK (DBK)": // DRAWBACK DBK
      return [
        "Main",
        "General",
        "Drawback",
        "CessExport Duty",
        "AreDetails",
        "Re-Export",
        "Other Details",
      ];
    case "60 - DRAWBACK AND ROSCTL": // DRAWBACK AND ROSCTL
      return [
        "Main",
        "General",
        "Drawback",
        "CessExport Duty",
        "AreDetails",
        "Re-Export",
        "Other Details",
      ];
    case "43 - DRAWBACK AND ZERO DUTY PECG": // DRAWBACK AND ZERO DUTY PECG EPCG
      return [
        "Main",
        "General",
        "EPCG",
        "Drawback",
        "CessExport Duty",
        "AreDetails",
        "Re-Export",
        "Other Details",
      ];
    case "61 - EPCG, DRAWBACK AND ROSCTL": // EPCG, DRAWBACK AND ROSCTL EPCG Drawback
      return [
        "Main",
        "General",
        "EPCG",
        "Drawback",
        "CessExport Duty",
        "AreDetails",
        "Re-Export",
        "Other Details",
      ];
    case "50 - EPCG AND ADVANCE LICENSE DEEC EPCG": // EPCG AND ADVANCE LICENSE DEEC EPCG
      return [
        "Main",
        "General",
        "DEEC",
        "EPCG",
        "CessExport Duty",
        "AreDetails",
        "Re-Export",
        "Other Details",
      ];
    case "21 - EQUEPZSEZEHTPSTP": // EQUEPZSEZEHTPSTP
    case "99 - NFEI": // NFEI
    default:
      return [
        "Main",
        "General",
        "CessExport Duty",
        "AreDetails",
        "Re-Export",
        "Other Details",
      ];
  }
};

const ProductTab = ({ formik, directories, params }) => {
  const [activeSubTab, setActiveSubTab] = useState(0);
  const [selectedProductIndex, setSelectedProductIndex] = useState(0); // Default to first product

  // Get current selected product
  const currentProduct = formik.values.products?.[selectedProductIndex];
  console.log("currentProduct", currentProduct);
  const eximCode = currentProduct?.eximCode;

  // Get tabs based on CURRENT SELECTED product's EXIM code
  const availableTabs = useMemo(() => getTabsForEximCode(eximCode), [eximCode]);
  console.log("availableTabs", availableTabs);
  const handleTabChange = (event, newValue) => {
    setActiveSubTab(newValue);
  };

  const renderTabContent = (tabName) => {
    switch (tabName) {
      case "Main":
        return (
          <ProductMainTab
            formik={formik}
            selectedProductIndex={selectedProductIndex}
          />
        );
      case "General":
        return (
          <ProductGeneralTab
            formik={formik}
            selectedProductIndex={selectedProductIndex}
          />
        );
      case "Drawback":
        return (
          <DrawbackTab
            formik={formik}
            selectedProductIndex={selectedProductIndex}
          />
        );
      case "CessExport Duty":
        return (
          <ProductCessDutyTab formik={formik} idx={selectedProductIndex} />
        );
      case "AreDetails":
        return (
          <ProductAREDetailsTab formik={formik} idx={selectedProductIndex} />
        );
      case "Re-Export":
        return (
          <ProductReExportTab formik={formik} idx={selectedProductIndex} />
        );
      case "Other Details":
        return (
          <ProductOtherDetailsTab formik={formik} idx={selectedProductIndex} />
        );
      case "DEEC":
        return (
          <ProductDEECTab formik={formik} productIndex={selectedProductIndex} />
        );
      case "EPCG":
        return (
          <ProductEPCGTab formik={formik} productIndex={selectedProductIndex} />
        );
      default:
        return <Typography>Tab content not implemented</Typography>;
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          mb: 2,
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          Product Item Details
        </Typography>

        {/* Product Selector - Renders based on selectedProductIndex */}
        {formik.values.products?.length > 0 && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2">Product</Typography>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              {formik.values.products.map((product, index) => (
                <Chip
                  key={index}
                  label={product.serialNumber || index + 1}
                  onClick={() => setSelectedProductIndex(index)}
                  color={selectedProductIndex === index ? "primary" : "default"}
                  variant={
                    selectedProductIndex === index ? "filled" : "outlined"
                  }
                  size="small"
                />
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* EXIM Code Indicator */}
      {eximCode && (
        <Chip
          label={`EXIM: ${eximCode}`}
          size="small"
          color="secondary"
          variant="outlined"
        />
      )}

      <Divider sx={{ mb: 2 }} />

      {/* Dynamic Tabs */}
      <Tabs
        value={activeSubTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 2,
          ".MuiTab-root": {
            minWidth: "80px",
            fontSize: "0.85rem",
            fontWeight: 500,
            textTransform: "none",
          },
        }}
      >
        {availableTabs.map((tabName, index) => (
          <Tab key={tabName} label={tabName} />
        ))}
      </Tabs>

      {/* Dynamic Tab Content - PASSES selectedProductIndex to child tabs */}
      {availableTabs.map((tabName, index) => (
        <ProductTabPanel key={tabName} value={activeSubTab} index={index}>
          {renderTabContent(tabName)}
        </ProductTabPanel>
      ))}
    </Box>
  );
};

export default ProductTab;
