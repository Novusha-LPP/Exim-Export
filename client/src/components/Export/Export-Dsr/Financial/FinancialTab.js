import React, { useState } from "react";
import { Box, Tabs, Tab, Typography, Divider } from "@mui/material";
import ARInvoicesTab from "./ARInvoicesTab";
import APInvoicesTab from "./APInvoicesTab";
import PaymentRequestTab from "./PaymentRequestTab";
// TODO: Import other subtabs when needed
// import APInvoicesTab from "./APInvoicesTab";
// import PaymentRequestTab from "./PaymentRequestTab";

function FinancialTabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`financial-tabpanel-${index}`}
      aria-labelledby={`financial-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const FinancialTab = ({ formik, directories, params, onUpdate }) => {
  const [activeSubTab, setActiveSubTab] = useState(0);

  const handleSubTabChange = (event, newValue) => {
    setActiveSubTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={activeSubTab}
          onChange={handleSubTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            "& .MuiTab-root": {
              minWidth: 120,
              fontSize: "0.75rem",
              fontWeight: 500,
              padding: "6px 12px",
              textTransform: "none"
            }
          }}
        >
          <Tab label="AR Invoices" />
          <Tab label="AP Invoices" />
          <Tab label="Payment Request" />
        </Tabs>
      </Box>

      <FinancialTabPanel value={activeSubTab} index={0}>
        <ARInvoicesTab formik={formik} directories={directories} params={params} />
      </FinancialTabPanel>

      <FinancialTabPanel value={activeSubTab} index={1}>
        <APInvoicesTab formik={formik} directories={directories} params={params} />
      </FinancialTabPanel>

      <FinancialTabPanel value={activeSubTab} index={2}>
        <PaymentRequestTab formik={formik} directories={directories} params={params} />
      </FinancialTabPanel>
    </Box>
  );
};

export default FinancialTab;
