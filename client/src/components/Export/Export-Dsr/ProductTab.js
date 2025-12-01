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

function ProductTabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

// EXIM Code to Tab mapping
const getTabsForEximCode = (eximCode) => {
  const code = eximCode?.toString();

  switch (code) {
    case "03 - ADVANCE LICENCE": // DEEC
      return [
        "Main",
        "General",
        "DEEC",
        "Cess/Export Duty",
        "AreDetails",
        "Re-Export",
        "Other Details",
      ];

    case "19 - DRAWBACK (DBK)": // Drawback
    case "60 - DRAWBACK AND ROSCTL": // Drawback
      return [
        "Main",
        "General",
        "Drawback",
        "Cess/Export Duty",
        "AreDetails",
        "Re-Export",
        "Other Details",
      ];

    case "43 - DRAWBACK AND ZERO DUTY PECG": // EPCG
    case "61 - EPCG, DRAWBACK AND ROSCTL": // EPCG & Drawback
      return [
        "Main",
        "General",
        "EPCG",
        "Drawback",
        "Cess/Export Duty",
        "AreDetails",
        "Re-Export",
        "Other Details",
      ];

    case "50 - EPCG AND ADVANCE LICENSE": // DEEC & EPCG
      return [
        "Main",
        "General",
        "DEEC",
        "EPCG",
        "Cess/Export Duty",
        "AreDetails",
        "Re-Export",
        "Other Details",
      ];

    case "21 - EQU/EPZ/SEZ/EHTP/STP": // Nothing special
    case "99 - NFEI": // NFEI
    default:
      return [
        "Main",
        "General",
        "Cess/Export Duty",
        "AreDetails",
        "Re-Export",
        "Other Details",
      ];
  }
};

const ProductTab = ({ formik, directories, params }) => {
  const [activeSubTab, setActiveSubTab] = useState(0);
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);

  // Get current product's EXIM code
  const currentProduct = formik.values.products?.[selectedProductIndex];
  const eximCode = currentProduct?.eximCode;

  // Get tabs based on EXIM code
  const availableTabs = useMemo(() => getTabsForEximCode(eximCode), [eximCode]);

  const handleTabChange = (event, newValue) => {
    setActiveSubTab(newValue);
  };

  const renderTabContent = (tabName) => {
    switch (tabName) {
      case "Main":
        return (
          <ProductMainTab
            formik={formik}
            directories={directories}
            params={params}
          />
        );

      case "General":
        return <ProductGeneralTab formik={formik} />;

      case "Drawback":
        return <DrawbackTab formik={formik} />;

      case "Cess/Export Duty":
        return <ProductCessDutyTab formik={formik} />;

      case "AreDetails":
        return <ProductAREDetailsTab formik={formik} />;

      case "Re-Export":
        return <ProductReExportTab formik={formik} />;

      case "Other Details":
        return <ProductOtherDetailsTab formik={formik} />;

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
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          Product & Item Details
        </Typography>

        {/* Product Selector */}
        {formik.values.products?.length > 1 && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2">Product:</Typography>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              {formik.values.products.map((product, index) => (
                <Chip
                  key={index}
                  label={`${product.serialNumber}`}
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

        {/* EXIM Code Indicator */}
        {eximCode && (
          <Chip
            label={`EXIM: ${eximCode}`}
            size="small"
            color="secondary"
            variant="outlined"
          />
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Dynamic Tabs */}
      <Tabs
        value={activeSubTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 2,
          "& .MuiTab-root": {
            minWidth: 80,
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

      {/* Dynamic Tab Content */}
      {availableTabs.map((tabName, index) => (
        <ProductTabPanel key={tabName} value={activeSubTab} index={index}>
          {renderTabContent(tabName)}
        </ProductTabPanel>
      ))}
    </Box>
  );
};

export default ProductTab;
