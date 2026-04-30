// ShipmentTab.jsx - Parent component for Shipment with sub-tabs
import React, { useState } from "react";
import { Box, Tabs, Tab, Typography, Divider } from "@mui/material";
import ShipmentMainTab from "./ShipmentMaintab";
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

const ShipmentTab = ({ formik, directories, params, onUpdate, isEditable = true }) => {
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
          {/* {(formik.values.consignmentType || "").toUpperCase() !== "AIR" && (
            <Tab label="Stuffing Details" />
          )} */}
          {/* <Tab label="Shipping Bill Printing" /> */}
          {(formik.values.consignmentType || "").toUpperCase() !== "AIR" &&
            formik.values.annexure_c_details && (
              <Tab label="Annex C1 Details" />
            )}
        </Tabs>
      </Box>

      <fieldset disabled={!isEditable} style={{ border: 'none', padding: 0, margin: 0, width: '100%', background: 'transparent' }}>
        {/* Tab Content */}
        <ShipmentTabPanel value={activeSubTab} index={0}>
          <ShipmentMainTab
            formik={formik}
            directories={directories}
            params={params}
            isEditable={isEditable}
          />
        </ShipmentTabPanel>

        {(formik.values.consignmentType || "").toUpperCase() !== "AIR" &&
          formik.values.annexure_c_details && (
            <ShipmentTabPanel value={activeSubTab} index={1}>
              <AnnexC1DetailsTab
                formik={formik}
                directories={directories}
                params={params}
                onUpdate={onUpdate}
                isEditable={isEditable}
              />
            </ShipmentTabPanel>
          )}
      </fieldset>
    </Box>
  );
};

export default ShipmentTab;
