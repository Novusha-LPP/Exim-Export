import React from "react";
import AuditTrailViewer from "../components/audit/AuditTrailViewer";
import Box from "@mui/material/Box";

const AuditTrailPage = () => {
    return (
        <Box sx={{ p: 2 }}>
            <AuditTrailViewer />
        </Box>
    );
};

export default AuditTrailPage;
