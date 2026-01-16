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
    case "03 - ADVANCE LICENCE": // ADVANCE LICENCE DEEC
      return [
        "Main",
        "General",
        "DEEC",
        // "CessExport Duty",
        // "AreDetails",
        "Re-Export",
        "Other Details",
      ];
    case "19 - DRAWBACK (DBK)": // DRAWBACK DBK
      return [
        "Main",
        "General",
        "Drawback",
        // "CessExport Duty",
        // "AreDetails",
        "Re-Export",
        "Other Details",
      ];
    case "21 (EOU/EPZ/SEZ/EHTP/STP)": // DRAWBACK DBK
      return [
        "Main",
        "General",
        // "CessExport Duty",
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
        // "CessExport Duty",
        // "AreDetails",
        "Re-Export",
        "Other Details",
      ];
    case "50 - EPCG AND ADVANCE LICENSE": // EPCG AND ADVANCE LICENSE DEEC EPCG
      return [
        "Main",
        "General",
        "DEEC",
        "EPCG",
        // "CessExport Duty",
        // "AreDetails",
        "Re-Export",
        "Other Details",
      ];
    case "60 - DRAWBACK AND ROSCTL": // DRAWBACK AND ROSCTL
      return [
        "Main",
        "General",
        "Drawback",
        // "CessExport Duty",
        // "AreDetails",
        "Re-Export",
        "Other Details",
      ];

    case "61 - EPCG, DRAWBACK AND ROSCTL": // EPCG, DRAWBACK AND ROSCTL EPCG Drawback
      return [
        "Main",
        "General",
        "EPCG",
        "Drawback",
        // "CessExport Duty",
        // "AreDetails",
        "Re-Export",
        "Other Details",
      ];
    case "99 - NFEI": // NFEI
    default:
      return [
        "Main",
        "General",
        // "CessExport Duty",
        // "AreDetails",
        "Re-Export",
        "Other Details",
      ];
  }
};

const ProductTab = ({ formik, directories, params }) => {
  const [activeSubTab, setActiveSubTab] = useState(0);
  const [selectedInvoiceIndex, setSelectedInvoiceIndex] = useState(0);
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);

  const invoices = formik.values.invoices || [];
  const activeInvoice = invoices[selectedInvoiceIndex] || {};
  const products = activeInvoice.products || [];

  // Get current selected product
  const currentProduct = products[selectedProductIndex];
  const eximCode = currentProduct?.eximCode;

  // Get tabs based on CURRENT SELECTED product's EXIM code
  const availableTabs = useMemo(() => getTabsForEximCode(eximCode), [eximCode]);

  const handleTabChange = (event, newValue) => {
    setActiveSubTab(newValue);
  };

  const handleInvoiceChange = (e) => {
    setSelectedInvoiceIndex(parseInt(e.target.value));
    setSelectedProductIndex(0); // Reset product selection when invoice changes
  };

  const renderTabContent = (tabName) => {
    const commonProps = {
      formik,
      selectedInvoiceIndex,
      selectedProductIndex,
    };

    switch (tabName) {
      case "Main":
        return <ProductMainTab {...commonProps} />;
      case "General":
        return <ProductGeneralTab {...commonProps} />;
      case "Drawback":
        return <DrawbackTab {...commonProps} />;
      // case "CessExport Duty":
      //   return (
      //     <ProductCessDutyTab
      //       formik={formik}
      //       selectedInvoiceIndex={selectedInvoiceIndex}
      //       idx={selectedProductIndex}
      //     />
      //   );
      // case "AreDetails":
      //   return (
      //     <ProductAREDetailsTab
      //       formik={formik}
      //       selectedInvoiceIndex={selectedInvoiceIndex}
      //       idx={selectedProductIndex}
      //     />
      //   );
      case "Re-Export":
        return (
          <ProductReExportTab
            formik={formik}
            selectedInvoiceIndex={selectedInvoiceIndex}
            idx={selectedProductIndex}
          />
        );
      case "Other Details":
        return (
          <ProductOtherDetailsTab
            formik={formik}
            selectedInvoiceIndex={selectedInvoiceIndex}
            idx={selectedProductIndex}
          />
        );
      case "DEEC":
        return (
          <ProductDEECTab
            formik={formik}
            selectedInvoiceIndex={selectedInvoiceIndex}
            productIndex={selectedProductIndex}
          />
        );
      case "EPCG":
        return (
          <ProductEPCGTab
            formik={formik}
            selectedInvoiceIndex={selectedInvoiceIndex}
            productIndex={selectedProductIndex}
          />
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
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <Box>
          {/* Invoice Selector */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
            <Typography variant="body2" fontWeight="600">
              Invoice:
            </Typography>
            <select
              value={selectedInvoiceIndex}
              onChange={handleInvoiceChange}
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                border: "1px solid #ced4da",
                fontSize: "14px",
              }}
            >
              {invoices.map((inv, idx) => (
                <option key={idx} value={idx}>
                  Invoice #{idx + 1}{" "}
                  {inv.invoiceNumber ? `(${inv.invoiceNumber})` : ""}
                </option>
              ))}
            </select>
          </Box>

          {/* Product Selector */}
          {products.length > 0 && (
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.5 }}
            >
              <Typography variant="body2" fontWeight="600">
                Product
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5 }}>
                {products.map((product, index) => (
                  <Chip
                    key={index}
                    label={product.serialNumber || index + 1}
                    onClick={() => setSelectedProductIndex(index)}
                    color={
                      selectedProductIndex === index ? "primary" : "default"
                    }
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
          <Box sx={{ textAlign: "right" }}>
            <Chip
              label={`EXIM: ${eximCode}`}
              size="small"
              color="secondary"
              variant="outlined"
            />
          </Box>
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
