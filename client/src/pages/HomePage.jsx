import React, { useState } from "react";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Toolbar from "@mui/material/Toolbar";
import { Route, Routes } from "react-router-dom";
import { TabValueContext } from "../contexts/TabValueContext.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
// Home
import Home from "../components/home/Home.js";
import Assign from "../components/home/Assign.js";
import ChangePassword from "../components/home/ChangePassword.js";

import Directories from "../components/Export/Directories/Directories.js";
import DsrTabs from "../components/Export/Export-Dsr/DsrTabs.js";
import ExportViewJob from "../components/Export/Export-Dsr/ExportViewJob.js";

// import auditrail
import AllUsersPage from "./AllUsersPage.js";
import AuditTrailPage from "./AuditTrailPage.js";

import AppbarComponent from "../components/home/AppbarComponent.js";
import DrawerComponent from "../components/home/DrawerComponent.js";

import Feedback from "../components/home/FeedBack.js";
const drawerWidth = 60;

function HomePage() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [tabValue, setTabValue] = useState(
    JSON.parse(localStorage.getItem("tab_value") ?? 1)
  );

  return (
    <TabValueContext.Provider value={{ tabValue, setTabValue }}>
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <AppbarComponent
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        <DrawerComponent
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: {
              lg: `calc(100% - ${drawerWidth}px)`,
              height: "100vh",
              padding: "20px",
              paddingTop: 0,
            },
          }}
        >
          <Toolbar />
          <Routes>
            {/* Public Routes - No protection needed */}
            <Route path="/" element={<Home />} />
            <Route path="/change-password" element={<ChangePassword />} />

            {/* Protected Routes */}
            <Route path="/assign" element={<Assign />} />

            {/* Accounts */}

            <Route
              path="/all-users"
              element={
                <ProtectedRoute requiredModule="Audit Trail">
                  <AllUsersPage />
                </ProtectedRoute>
              }
            />

            {/* Screens */}

            {/* Export */}
            <Route
              path="/export-directories"
              element={
                <ProtectedRoute requiredModule="Directories">
                  <Directories />
                </ProtectedRoute>
              }
            />
            <Route
              path="/export-dsr"
              element={
                <ProtectedRoute requiredModule="Export - Jobs">
                  <DsrTabs />
                </ProtectedRoute>
              }
            />

            <Route
              path="export-dsr/job/:jobNo"
              element={
                <ProtectedRoute requiredModule="Export - Jobs">
                  <ExportViewJob />
                </ProtectedRoute>
              }
            />

            <Route
              path="/export-audit-trail"
              element={
                <ProtectedRoute requiredModule="Export - Audit Trail">
                  <AuditTrailPage />
                </ProtectedRoute>
              }
            />

            <Route path="/feedback" element={<Feedback />} />
          </Routes>
        </Box>
      </Box>
    </TabValueContext.Provider>
  );
}

export default HomePage;
