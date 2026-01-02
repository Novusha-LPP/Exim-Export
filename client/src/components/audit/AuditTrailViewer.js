import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import {
  Container,
  alpha,
  useTheme,
  Slide,
  Stack,
  Skeleton,
  Box,
  Typography,
  Avatar,
  Grow,
  Pagination,
  Card,
  Grid,
  Tab,
  Tabs,
  Paper,
} from "@mui/material";
import { UserContext } from "../../contexts/UserContext";
import AuditHeader from "./AuditHeader";
import AuditFilters from "./AuditFilters";
import AuditContent from "./AuditContent";
import AuditTable from "./AuditTable";
import format from "date-fns/format";

// Enhanced transition component with bounce effect
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// Loading skeleton component
const LoadingSkeleton = ({ rows = 5 }) => (
  <Stack spacing={2} sx={{ mt: 2 }}>
    {Array.from({ length: rows }).map((_, index) => (
      <Skeleton
        key={index}
        variant="rectangular"
        height={60}
        sx={{
          borderRadius: 2,
          animation: `pulse 2s ease-in-out ${index * 0.1}s infinite`,
        }}
      />
    ))}
  </Stack>
);

// Animated counter component
const AnimatedCounter = ({ value, duration = 2000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value);
    const range = end - start;
    const increment = range / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count.toLocaleString()}</span>;
};

// Enhanced status indicator
const StatusIndicator = ({ status, label }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "#10B981";
      case "warning":
        return "#F59E0B";
      case "error":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          bgcolor: getStatusColor(status),
          animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        }}
      />
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
    </Box>
  );
};

const AuditTrailViewer = ({ job_no, year }) => {
  const theme = useTheme();
  const [auditData, setAuditData] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useContext(UserContext);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    action: "",
    username: user.role === "Admin" ? "" : user.username,
    field: "",
    fromDate: "",
    toDate: "",
    groupBy: "day",
    job_no: "",
  });
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [activeUsers, setActiveUsers] = useState([]);
  const [activeUsersLoading, setActiveUsersLoading] = useState(false);
  const [openFilterDialog, setOpenFilterDialog] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [userList, setUserList] = useState([]);
  const [selectedUserForFilter, setSelectedUserForFilter] = useState(null);
  const [userFilter, setUserFilter] = useState(
    user.role === "Admin" ? "" : user.username
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [statsError, setStatsError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Enhanced color palette with more modern colors
  const colorPalette = {
    primary: "#3B82F6",
    primaryDark: "#1E40AF",
    secondary: "#8B5CF6",
    accent: "#F1F5F9",
    accentLight: "#F8FAFC",
    light: "#FAFAFC",
    darkBlue: "#1E293B",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    textPrimary: "#1F2937",
    textSecondary: "#6B7280",
    gradient: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
    cardGradient: "linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)",
    glassEffect: "rgba(255, 255, 255, 0.8)",
    shadowPrimary: "0 4px 20px rgba(59, 130, 246, 0.15)",
    shadowSecondary: "0 2px 10px rgba(0, 0, 0, 0.05)",
    hover: "rgba(59, 130, 246, 0.04)",
  };

  // Enhanced action colors with modern palette
  const actionColors = {
    CREATE: colorPalette.success,
    UPDATE: colorPalette.primary,
    DELETE: colorPalette.error,
    READ: colorPalette.secondary,
    VIEW: colorPalette.warning,
  };

  // Enhanced glass morphism card style
  const glassMorphismCard = {
    background: `linear-gradient(135deg, ${alpha("#FFFFFF", 0.9)} 0%, ${alpha(
      "#F8FAFC",
      0.8
    )} 100%)`,
    backdropFilter: "blur(20px)",
    border: `1px solid ${alpha("#FFFFFF", 0.2)}`,
    borderRadius: 3,
    boxShadow: colorPalette.shadowPrimary,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 8px 25px rgba(59, 130, 246, 0.2)",
    },
  };

  // Enhanced button styles
  const primaryButton = {
    background: colorPalette.gradient,
    color: "white",
    borderRadius: 2,
    px: 3,
    py: 1.5,
    textTransform: "none",
    fontWeight: 600,
    boxShadow: colorPalette.shadowPrimary,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    "&:hover": {
      transform: "translateY(-1px)",
      boxShadow: "0 6px 20px rgba(59, 130, 246, 0.3)",
    },
  };

  const handleDateChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
      page: 1,
    }));
  };

  useEffect(() => {
    const today = new Date();
    let fromDate = filters.fromDate;
    let toDate = filters.toDate;
    if (filters.groupBy === "day" || filters.groupBy === "hour") {
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      fromDate = `${yyyy}-${mm}-${dd}`;
      toDate = `${yyyy}-${mm}-${dd}`;
    } else if (filters.groupBy === "week") {
      const dayOfWeek = today.getDay() || 7;
      const monday = new Date(today);
      monday.setDate(today.getDate() - dayOfWeek + 1);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const yyyy1 = monday.getFullYear();
      const mm1 = String(monday.getMonth() + 1).padStart(2, "0");
      const dd1 = String(monday.getDate()).padStart(2, "0");
      const yyyy2 = sunday.getFullYear();
      const mm2 = String(sunday.getMonth() + 1).padStart(2, "0");
      const dd2 = String(sunday.getDate()).padStart(2, "0");
      fromDate = `${yyyy1}-${mm1}-${dd1}`;
      toDate = `${yyyy2}-${mm2}-${dd2}`;
    } else if (filters.groupBy === "month") {
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      fromDate = `${yyyy}-${mm}-01`;
      const lastDay = new Date(yyyy, today.getMonth() + 1, 0).getDate();
      toDate = `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;
    }
    if (filters.fromDate !== fromDate || filters.toDate !== toDate) {
      setFilters((prev) => ({ ...prev, fromDate, toDate }));
    }
  }, [filters.groupBy]);

  const fetchAllUsers = async () => {
    if (user.role !== "Admin") return;

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/get-all-users`
      );
      const transformedUsers = response.data.map((user) => ({
        label: user.username,
        value: user.username,
        id: user._id,
      }));
      setUserList(transformedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // Fetch user list for admin filter
  useEffect(() => {
    if (user.role === "Admin") {
      fetch(`${import.meta.env.VITE_API_STRING}/audit/user-mappings`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setUserList(
              data.data.map((u) => ({
                label: u.username,
                value: u.username,
                userId: u.userId,
              }))
            );
          }
        });
    }
  }, [user.role]);

  // Ensure selected username is sent in API call for admin
  const fetchAuditTrail = async () => {
    setLoading(true);
    try {
      let url = `${import.meta.env.VITE_API_STRING}/audit-trail`;
      if (job_no && year) {
        url = `${import.meta.env.VITE_API_STRING}/audit-trail/job/${job_no}/${year}`;
      }
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (key === "groupBy") {
          if (filters.fromDate && filters.toDate && value) {
            params.append("groupBy", value);
          }

          if (job_no) params.append("search", job_no);
          if (year) params.append("year", year);
        } else if (value) {
          params.append(key, value);
        }
      });
      let filterUser = "";
      if (user.role !== "Admin") {
        params.set("username", user.username);
        filterUser = user.username;
      } else if (userFilter) {
        params.set("username", userFilter);
        filterUser = userFilter;
      }
      const response = await axios.get(`${url}?${params}`);
      setAuditData(response.data.auditTrail || []);
      setPagination(response.data.pagination || {});
    } catch (error) {
      console.error("Error fetching audit trail:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    setStatsError("");
    // Validate date range before API call
    if (filters.fromDate && filters.toDate) {
      const from = new Date(filters.fromDate);
      const to = new Date(filters.toDate);
      if (from > to) {
        setStatsError(
          "Invalid time range: From Date must be before or equal to To Date."
        );
        setStatsLoading(false);
        return;
      }
    }
    try {
      const params = new URLSearchParams();
      if (filters.fromDate) params.append("fromDate", filters.fromDate);
      if (filters.toDate) params.append("toDate", filters.toDate);
      if (filters.groupBy && filters.fromDate && filters.toDate)
        params.append("groupBy", filters.groupBy);
      // Always use userFilter for admin, else use user.username
      if (user.role !== "Admin") {
        params.append("username", user.username);
      } else if (userFilter) {
        params.append("username", userFilter);
      }
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/audit-trail/stats?${params}`
      );
      setStats(response.data);
    } catch (error) {
      setStatsError("Error fetching audit trail stats.");
      console.error("Error fetching stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditTrail();
    if (!job_no) fetchStats();
    if (user.role === "Admin") {
      fetchAllUsers();
    }
  }, [filters, job_no, year, user.role, userFilter]);

  useEffect(() => {
    if (user.role === "Admin" && filters.username && userList.length > 0) {
      const user = userList.find((u) => u.value === filters.username);
      setSelectedUserForFilter(user || null);
    }
  }, [userList, filters.username, user.role]);

  // Add user filter change handler
  const handleUserFilterChange = (event) => {
    const value = event.target.value;
    setUserFilter(value);
    console.log("User filter changed:", value);
    // Trigger data refresh when user filter changes
    setFilters((prev) => ({ ...prev, username: value }));
  };

  const handlePageChange = (event, page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // Fetch active users only when switching to the tab
    if (newValue === 2 && activeUsers.length === 0) {
      fetchActiveUsers();
    }
  };

  // Fetch all active users with activity
  const fetchActiveUsers = async () => {
    setActiveUsersLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/audit-trail/all-users-with-activity`
      );
      setActiveUsers(response.data.users || []);
    } catch (error) {
      setActiveUsers([]);
      console.error("Error fetching active users:", error);
    } finally {
      setActiveUsersLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      limit: 10,
      action: "",
      username: user.role === "Admin" ? "" : user.username,
      field: "",
      fromDate: "",
      toDate: "",
      groupBy: "day",
      search: "",
    });
    setSelectedUserForFilter(null);
  };

  const toggleRowExpand = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // Helper function to format values for display
  const formatValue = (value) => {
    if (value === null || value === undefined) {
      return "null";
    }
    if (typeof value === "object") {
      try {
        return JSON.stringify(value, null, 2);
      } catch (e) {
        return String(value);
      }
    }
    return String(value);
  };

  const formatChangeDescription = (change, timestamp) => {
    const time = format(new Date(timestamp), "HH:mm");
    // Use fieldPath for more detailed path information, fallback to field
    const fieldName = change.fieldPath || change.field;

    const oldValueFormatted = formatValue(change.oldValue);
    const newValueFormatted = formatValue(change.newValue);

    switch (change.changeType) {
      case "ADDED":
        return `${fieldName} was set to "${newValueFormatted}" at ${time}`;
      case "MODIFIED":
        return `${fieldName} was updated from "${oldValueFormatted}" to "${newValueFormatted}" at ${time}`;
      case "REMOVED":
        return `${fieldName} was removed (previous value: "${oldValueFormatted}") at ${time}`;
      case "VIEWED":
        return `${fieldName} was viewed at ${time}`;
      default:
        return `${fieldName} was changed at ${time}`;
    }
  };

  const renderChanges = (changes, timestamp) => (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        pl: 2,
        borderLeft: `3px solid ${colorPalette.primary}`,
        borderRadius: "0 8px 8px 0",
        backgroundColor: alpha(colorPalette.primary, 0.04),
      }}
    >
      {changes.map((change, index) => (
        <Grow key={index} in={true} timeout={300 + index * 100}>
          <Typography
            variant="body2"
            sx={{
              color: colorPalette.textSecondary,
              fontStyle: "italic",
              padding: "8px 12px",
              backgroundColor: alpha(colorPalette.primary, 0.08),
              borderRadius: 2,
              border: `1px solid ${alpha(colorPalette.primary, 0.1)}`,
              position: "relative",
              "&::before": {
                content: '""',
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 3,
                backgroundColor: colorPalette.primary,
                borderRadius: "0 2px 2px 0",
              },
            }}
          >
            {formatChangeDescription(change, timestamp)}
          </Typography>
        </Grow>
      ))}
    </Box>
  );

  const renderUserAvatar = (username) => {
    if (!username)
      return (
        <Avatar
          sx={{
            bgcolor: colorPalette.primary,
            width: 36,
            height: 36,
            fontSize: "0.875rem",
            boxShadow: colorPalette.shadowSecondary,
          }}
        >
          ?
        </Avatar>
      );

    const initials = username
      .split(".")
      .map((part) => part.charAt(0).toUpperCase())
      .join("");

    return (
      <Avatar
        sx={{
          bgcolor: colorPalette.gradient,
          width: 36,
          height: 36,
          fontSize: "0.875rem",
          fontWeight: 600,
          boxShadow: colorPalette.shadowSecondary,
          border: `2px solid ${alpha(colorPalette.primary, 0.1)}`,
        }}
      >
        {initials}
      </Avatar>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 2, px: { xs: 1, sm: 2, md: 3 } }}>
      <AuditHeader colorPalette={colorPalette} />

      <AuditFilters
        filters={filters}
        setFilters={setFilters}
        handleDateChange={handleDateChange}
        user={user}
        userFilter={userFilter}
        handleUserFilterChange={handleUserFilterChange}
        userList={userList}
        refreshing={refreshing}
        fetchAuditTrail={fetchAuditTrail}
        fetchStats={fetchStats}
        colorPalette={colorPalette}
        handleResetFilters={handleResetFilters}
      />

      <Box sx={{ mt: 2, mb: 0 }}>
        <Paper
          sx={{
            width: "100%",
            mb: 1,
            boxShadow: colorPalette.shadowSecondary,
            borderRadius: 2,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              minHeight: 40,
              borderBottom: 1,
              borderColor: "divider",
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 600,
                color: colorPalette.textSecondary,
                minHeight: 40,
                px: 2,
                py: 0.5,
                "&.Mui-selected": {
                  color: colorPalette.primary,
                },
              },
            }}
            TabIndicatorProps={{ style: { height: 3, borderRadius: 2 } }}
          >
            <Tab label="Statistics" />
            <Tab label="Audit Trail" />
            <Tab label="All Active Users" />
          </Tabs>
        </Paper>

        {activeTab === 0 && (
          <Box sx={{ px: { xs: 0, sm: 0.5, md: 1 }, py: 0.5, mb: 0 }}>
            <AuditContent
              stats={stats}
              colorPalette={colorPalette}
              glassMorphismCard={glassMorphismCard}
              AnimatedCounter={AnimatedCounter}
              StatusIndicator={StatusIndicator}
              statsLoading={statsLoading}
              LoadingSkeleton={LoadingSkeleton}
              alpha={alpha}
              pagination={pagination}
              activeTab={activeTab}
              auditData={auditData}
              filters={filters}
              handlePageChange={handlePageChange}
              userFilter={userFilter}
            />
          </Box>
        )}

        {activeTab === 1 && (
          <Box sx={{ mt: 1, px: { xs: 0, sm: 1, md: 2 } }}>
            <AuditTable
              auditData={auditData}
              loading={loading}
              colorPalette={colorPalette}
              actionColors={actionColors}
              expandedRow={expandedRow}
              toggleRowExpand={toggleRowExpand}
              renderUserAvatar={renderUserAvatar}
              renderChanges={renderChanges}
              fetchAuditTrail={fetchAuditTrail}
              fetchStats={fetchStats}
              job_no={job_no}
            />
            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <Box
                sx={{ display: "flex", justifyContent: "center", mt: 2, mb: 0 }}
              >
                <Pagination
                  count={pagination.totalPages}
                  page={pagination.currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  size="medium"
                  sx={{
                    "& .MuiPaginationItem-root": {
                      color: colorPalette.primary,
                      fontWeight: 600,
                      "&.Mui-selected": {
                        backgroundColor: colorPalette.primary,
                        color: "white",
                      },
                      mx: 0.5,
                      my: 0,
                    },
                  }}
                />
              </Box>
            )}
          </Box>
        )}

        {activeTab === 2 && (
          <Box sx={{ mt: 2, px: { xs: 0, sm: 1, md: 2 } }}>
            <Paper
              sx={{
                p: 2,
                borderRadius: 2,
                boxShadow: colorPalette.shadowSecondary,
              }}
            >
              <Typography
                variant="h6"
                sx={{ mb: 2, fontWeight: 600, color: colorPalette.primary }}
              >
                All Active Users
              </Typography>
              {activeUsersLoading ? (
                <LoadingSkeleton rows={5} />
              ) : (
                <Box sx={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      minWidth: 600,
                    }}
                  >
                    <thead>
                      <tr style={{ background: colorPalette.accentLight }}>
                        <th
                          style={{
                            padding: "10px",
                            border: `1px solid ${colorPalette.accent}`,
                            fontWeight: 700,
                            color: colorPalette.primary,
                          }}
                        >
                          Username
                        </th>
                        <th
                          style={{
                            padding: "10px",
                            border: `1px solid ${colorPalette.accent}`,
                            fontWeight: 700,
                            color: colorPalette.primary,
                          }}
                        >
                          Role
                        </th>
                        <th
                          style={{
                            padding: "10px",
                            border: `1px solid ${colorPalette.accent}`,
                            fontWeight: 700,
                            color: colorPalette.primary,
                          }}
                        >
                          Modules
                        </th>
                        <th
                          style={{
                            padding: "10px",
                            border: `1px solid ${colorPalette.accent}`,
                            fontWeight: 700,
                            color: colorPalette.primary,
                          }}
                        >
                          Last Activity
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeUsers.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            style={{
                              textAlign: "center",
                              color: colorPalette.textSecondary,
                              padding: "16px",
                            }}
                          >
                            No active users found.
                          </td>
                        </tr>
                      )}
                      {activeUsers.map((user, idx) => (
                        <tr
                          key={user.username + idx}
                          style={{
                            background:
                              idx % 2 === 0 ? colorPalette.light : "#fff",
                          }}
                        >
                          <td
                            style={{
                              padding: "10px",
                              border: `1px solid ${colorPalette.accent}`,
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              {renderUserAvatar(user.username)}
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 600,
                                  color: colorPalette.textPrimary,
                                }}
                              >
                                {user.username}
                              </Typography>
                            </Box>
                          </td>
                          <td
                            style={{
                              padding: "10px",
                              border: `1px solid ${colorPalette.accent}`,
                              color: colorPalette.textSecondary,
                            }}
                          >
                            {user.role || "-"}
                          </td>
                          <td
                            style={{
                              padding: "10px",
                              border: `1px solid ${colorPalette.accent}`,
                              color: colorPalette.textSecondary,
                            }}
                          >
                            {user.modules && user.modules.length > 0
                              ? user.modules.join(", ")
                              : "-"}
                          </td>
                          <td
                            style={{
                              padding: "10px",
                              border: `1px solid ${colorPalette.accent}`,
                              color: colorPalette.textSecondary,
                            }}
                          >
                            {user.lastActivity
                              ? new Date(user.lastActivity).toLocaleString(
                                "en-IN",
                                { hour12: true }
                              )
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              )}
            </Paper>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default AuditTrailViewer;
