// ShipmentTab.jsx - Parent component for Shipment with sub-tabs
import React, { useState } from "react";
import { Box, Tabs, Tab, Typography, Divider } from "@mui/material";
import ShipmentMainTab from "./ShipmentMaintab";
import StuffingDetailsTab from "./StuffingDetailsTab";
import ShippingBillPrintingTab from "./ShippingBillPrintingTab";
import AnnexC1DetailsTab from "./AnnexC1DetailsTab";
// Tab Panel Component
function ShipmentTabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`shipment-tabpanel-${index}`}
      aria-labelledby={`shipment-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const ShipmentTab = ({ formik, directories, params, onUpdate }) => {
  const [activeSubTab, setActiveSubTab] = useState(0);

  const handleSubTabChange = (event, newValue) => {
    setActiveSubTab(newValue);
  };

  return (
    <Box sx={{ p: 1 }}>
      {/* Shipment Sub-Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={activeSubTab}
          onChange={handleSubTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            "& .MuiTab-root": {
              minWidth: 80,
              fontSize: "0.75rem",
              fontWeight: 500,
              padding: "6px 12px",
              textTransform: "none",
            },
          }}
        >
          <Tab label="Main" />
          {(formik.values.transportMode || "").toUpperCase() !== "AIR" && (
            <Tab label="Stuffing Details" />
          )}
          {/* <Tab label="Shipping Bill Printing" /> */}
          {(formik.values.transportMode || "").toUpperCase() !== "AIR" && (
            <Tab label="Annex C1 Details" />
          )}
        </Tabs>
      </Box>

      {/* Tab Content */}
      <ShipmentTabPanel value={activeSubTab} index={0}>
        <ShipmentMainTab
          formik={formik}
          directories={directories}
          params={params}
        />
      </ShipmentTabPanel>

      {(formik.values.transportMode || "").toUpperCase() !== "AIR" && (
        <ShipmentTabPanel value={activeSubTab} index={1}>
          <StuffingDetailsTab
            formik={formik}
            directories={directories}
            params={params}
          />
        </ShipmentTabPanel>
      )}

      {/* <ShipmentTabPanel value={activeSubTab} index={2}>
        <ShippingBillPrintingTab 
          formik={formik} 
          directories={directories} 
          params={params}
        />
      </ShipmentTabPanel>
       */}
      {(formik.values.transportMode || "").toUpperCase() !== "AIR" && (
        <ShipmentTabPanel value={activeSubTab} index={2}>
          <AnnexC1DetailsTab
            formik={formik}
            directories={directories}
            params={params}
            onUpdate={onUpdate}
          />
        </ShipmentTabPanel>
      )}
    </Box>
  );
};

export default ShipmentTab;
