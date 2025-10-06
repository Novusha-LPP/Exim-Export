import React, { useState } from "react";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Toolbar from "@mui/material/Toolbar";
import { Route, Routes } from "react-router-dom";
import { TabValueContext } from "../contexts/TabValueContext.jsx";
import { SearchQueryProvider } from "../contexts/SearchQueryContext.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
// Home
import Home from "../components/home/Home.js";
import Assign from "../components/home/Assign.js";
import ChangePassword from "../components/home/ChangePassword.js";

import Directories from "../components/Export/Directories/Directories.js";
import DsrTabs from "../components/Export/Export-Dsr/DsrTabs.js";
import Handover from "../components/Export/Handover.js";
import JobsListPage from "../components/Export/BookingManagement/JobListPage.js";
import ExportViewJob from "../components/Export/Export-Dsr/ExportViewJob.js";
import ExportDocumentJobs from "../components/Export/ExportDocumentJobs.js";
import DocumentViewJob from "../components/Export/DocumentVIewJob.js";
import EsanchitJobList from "../components/Export/EsanchitJobList.js";
import EsanchitViewJob from "../components/Export/EsanchitViewJob.js";
import ExportSubmission from "../components/Export/ExportSubmission.js";

// import auditrail
import AuditTrailViewer from "../components/audit/AuditTrailViewer.js";
import AllUsersPage from "./AllUsersPage.js";

import AppbarComponent from "../components/home/AppbarComponent.js";
import DrawerComponent from "../components/home/DrawerComponent.js";
const drawerWidth = 60;

function HomePage() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [tabValue, setTabValue] = useState(
    JSON.parse(localStorage.getItem("tab_value") || 0)
  );

  return (
    <TabValueContext.Provider value={{ tabValue, setTabValue }}>
      <SearchQueryProvider>
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
                path="/audit-trail"
                element={
                  <ProtectedRoute requiredModule="Audit Trail">
                    <AuditTrailViewer />
                  </ProtectedRoute>
                }
              />
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
                  <ProtectedRoute requiredModule="Export - DSR">
                    <DsrTabs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/handover"
                element={
                  <ProtectedRoute requiredModule="Handover">
                    <Handover />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/booking-job-list"
                element={
                  <ProtectedRoute requiredModule="Booking Management">
                    <JobsListPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/export-dsr/job/:year/:job_no"
                element={
                  <ProtectedRoute requiredModule="Export - DSR">
                    <ExportViewJob />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/documentation-jobs"
                element={
                  <ProtectedRoute requiredModule="Export - Documentation">
                    <ExportDocumentJobs />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/documentation/:job_no"
                element={<DocumentViewJob />}
              />

              <Route
                path="/esanchit-job-list"
                element={
                  <ProtectedRoute requiredModule="Export - ESanchit">
                    <EsanchitJobList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/esanchit-job-list/:job_no"
                element={<EsanchitViewJob />}
              />

              <Route
                path="/export-submission"
                element={
                  <ProtectedRoute requiredModule="Export - Submission">
                    <ExportSubmission />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Box>
        </Box>
      </SearchQueryProvider>
    </TabValueContext.Provider>
  );
}

export default HomePage;
