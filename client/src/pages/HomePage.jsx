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
import ExportJobsModule from "../components/Export/Export-Dsr/ExportJobsModule.js";
import ExportDocumentationModule from "../components/Export/Export-Dsr/ExportDocumentationModule.js";
import ExportEsanchitModule from "../components/Export/Export-Dsr/ExportEsanchitModule.js";
import EximOperationModule from "../components/Export/Export-Dsr/EximOperationModule.js";
import ExportChargesModule from "../components/Export/Export-Dsr/ExportChargesModule.js";

// import auditrail
import AllUsersPage from "./AllUsersPage.js";
import AuditTrailPage from "./AuditTrailPage.js";

import AppbarComponent from "../components/home/AppbarComponent.js";
import DrawerComponent from "../components/home/DrawerComponent.js";

import Feedback from "../components/home/FeedBack.js";
import ReportTabs from "../components/Report/ReportTabs.js";
import MonthlyContainers from "../components/Report/monthlyContainers.js";
import DetailedReport from "../components/Report/DetailedReport.js";
import OpenPointsHome from "../components/open-points/OpenPointsHome.js";
import ProjectWorkspace from "../components/open-points/ProjectWorkspace.js";
import AnalyticsDashboard from "../components/open-points/AnalyticsDashboard.js";
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

            {/* Export - Jobs */}
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
                  <ExportJobsModule />
                </ProtectedRoute>
              }
            />

            {/* Export - Documentation */}
            <Route
              path="/export-documentation"
              element={
                <ProtectedRoute requiredModule="Export - Documentation">
                  <DsrTabs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/export-documentation/job/:jobNo"
              element={
                <ProtectedRoute requiredModule="Export - Documentation">
                  <ExportDocumentationModule />
                </ProtectedRoute>
              }
            />

            {/* Export - ESanchit */}
            <Route
              path="/export-esanchit"
              element={
                <ProtectedRoute requiredModule="Export - ESanchit">
                  <DsrTabs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/export-esanchit/job/:jobNo"
              element={
                <ProtectedRoute requiredModule="Export - ESanchit">
                  <ExportEsanchitModule />
                </ProtectedRoute>
              }
            />

            {/* Export - Operation */}
            <Route
              path="/export-operation"
              element={
                <ProtectedRoute requiredModule="Export - Operation">
                  <DsrTabs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/export-operation/job/:jobNo"
              element={
                <ProtectedRoute requiredModule="Export - Operation">
                  <EximOperationModule />
                </ProtectedRoute>
              }
            />

            {/* Export - Charges */}
            <Route
              path="/export-charges"
              element={
                <ProtectedRoute requiredModule="Export - Charges">
                  <DsrTabs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/export-charges/job/:jobNo"
              element={
                <ProtectedRoute requiredModule="Export - Charges">
                  <ExportChargesModule />
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

            <Route
              path="/open-points"
              element={
                <ProtectedRoute requiredModule="Open Points">
                  <OpenPointsHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/open-points/project/:projectId"
              element={
                <ProtectedRoute requiredModule="Open Points">
                  <ProjectWorkspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/open-points/analytics"
              element={
                <ProtectedRoute requiredModule="Open Points">
                  <AnalyticsDashboard />
                </ProtectedRoute>
              }
            />

            <Route path="/feedback" element={<Feedback />} />

            {/* Reports */}
            <Route
              path="/report"
              element={
                <ProtectedRoute requiredModule="Export - Reports">
                  <ReportTabs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/report/monthly-containers"
              element={
                <ProtectedRoute requiredModule="Export - Reports">
                  <MonthlyContainers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/report/detailed"
              element={
                <ProtectedRoute requiredModule="Export - Reports">
                  <DetailedReport />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Box>
      </Box>
    </TabValueContext.Provider>
  );
}

export default HomePage;
