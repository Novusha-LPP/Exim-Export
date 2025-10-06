import React, { useState } from "react";
import { Box, Tabs, Tab, Typography, Divider } from "@mui/material";
import InvoiceMainTab from "./InvoiceMainTab";
import InvoiceFreightTab from "./InvoiceFreightTab";
import InvoiceBuyerThirdPartyTab from "./InvoiceBuyerThirdPartyTab";
import OtherInfoTab from "./OtherInfoTab";

function InvoiceTabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`invoice-tabpanel-${index}`}
      aria-labelledby={`invoice-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const InvoiceTab = ({ formik, directories, params, }) => {
  const [activeSubTab, setActiveSubTab] = useState(0);

  const handleSubTabChange = (event, newValue) => {
    setActiveSubTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Invoice Information
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={activeSubTab}
          onChange={handleSubTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            "& .MuiTab-root": {
              minWidth: 100,
              fontSize: "0.75rem",
              fontWeight: 500,
              padding: "6px 12px",
              textTransform: "none",
            },
          }}
        >
          <Tab label="Main" />
          <Tab label="Freight, Insurance & Other Charges" />
          <Tab label="Buyer/Third Party Info" />
          <Tab label="Other Info" />
        </Tabs>
      </Box>

      <InvoiceTabPanel value={activeSubTab} index={0}>
        <InvoiceMainTab
          formik={formik}
          directories={directories}
          params={params}
        />
      </InvoiceTabPanel>
      <InvoiceTabPanel value={activeSubTab} index={1}>
        <InvoiceFreightTab formik={formik} />
      </InvoiceTabPanel>
      <InvoiceTabPanel value={activeSubTab} index={2}>
        <InvoiceBuyerThirdPartyTab formik={formik}  />
      </InvoiceTabPanel>
      <InvoiceTabPanel value={activeSubTab} index={3}>
        <OtherInfoTab formik={formik}  />
      </InvoiceTabPanel>
    </Box>
  );
};

export default InvoiceTab;
