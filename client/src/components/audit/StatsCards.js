import React, { useEffect, useState, useContext } from "react";
import { Grid, Card, Box, Typography, Chip, Grow } from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  Timeline as TimelineIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Analytics as AnalyticsIcon,
  Description as DocumentIcon,
  TrendingUp as TrendingUpIcon,
  Event as EventIcon,
} from "@mui/icons-material";
import { UserContext } from "../../contexts/UserContext";

const StatsCards = ({
  stats,
  colorPalette,
  glassMorphismCard,
  AnimatedCounter,
  StatusIndicator,
}) => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  // Helper function to get the most common action
  const getMostCommonAction = () => {
    if (!stats?.actionBreakdown || stats.actionBreakdown.length === 0)
      return "N/A";
    const sortedActions = [...stats.actionBreakdown].sort(
      (a, b) => b.count - a.count
    );
    return sortedActions[0]._id;
  };

  // Helper function to calculate success rate (assuming all actions are successful for now)
  const calculateSuccessRate = () => {
    if (!stats?.summary?.totalActions) return 0;
    // You can modify this logic based on your actual success/failure tracking
    return Math.round(
      (stats.summary.totalActions / (stats.summary.totalActions + 0)) * 100
    );
  };

  // Helper function to get trend indicator (mock data for now)
  const getTrendIndicator = (type) => {
    // This would ideally come from comparing with previous period data
    const trends = {
      actions: "+12%",
      users: stats?.summary?.totalUsers > 1 ? "+5%" : "0%",
      documents: stats?.summary?.totalDocuments > 5 ? "+8%" : "+2%",
      rate: "+3%",
    };
    return trends[type] || "0%";
  };

  // Dynamic stats configuration
  const statsConfig = [
    {
      title: "Total Actions",
      value: stats?.summary?.totalActions || 0,
      icon: TimelineIcon,
      color: colorPalette.primary,
      trend: getTrendIndicator("actions"),
      description: "All recorded activities",
    },
    ...(user?.role === "Admin"
      ? [
          {
            title: "Active Users",
            value: stats?.summary?.totalUsers || 0,
            icon: PersonIcon,
            color: colorPalette.success,
            trend: getTrendIndicator("users"),
            description: "Users with activity",
          },
        ]
      : []),
    {
      title: "Documents Modified",
      value: stats?.summary?.totalDocuments || 0,
      icon: DocumentIcon,
      color: colorPalette.secondary,
      trend: getTrendIndicator("documents"),
      description: "Unique documents changed",
    },
    {
      title: "Most Common Action",
      value: getMostCommonAction(),
      displayValue: getMostCommonAction(),
      icon: AnalyticsIcon,
      color: colorPalette.warning,
      trend: getTrendIndicator("rate"),
      description: "Primary activity type",
      isText: true,
    },
  ];

  // Additional stats for expanded view
  const expandedStats = [
    {
      title: "Daily Activity",
      value: stats?.dailyActivity?.length || 0,
      icon: EventIcon,
      color: colorPalette.primary,
      trend: "+2%",
      description: "Days with activity",
    },
    {
      title: "Action Types",
      value: stats?.actionTypes?.length || 0,
      icon: TrendingUpIcon,
      color: colorPalette.success,
      trend: "+1%",
      description: "Different action types",
    },
  ];

  // Combine stats based on available data
  const displayStats = stats?.summary ? statsConfig : statsConfig.slice(0, 2);

  // Top users state for API
  const [topUsers, setTopUsers] = useState([]);
  const [topUsersLoading, setTopUsersLoading] = useState(false);

  useEffect(() => {
    setTopUsersLoading(true);
    fetch(`${import.meta.env.VITE_API_STRING}/audit-trail/top-users?limit=4`)
      .then((res) => res.json())
      .then((data) => {
        setTopUsers(data.topUsers || []);
        setTopUsersLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching top users:", err);
        setTopUsersLoading(false);
      });
  }, []);

  return (
    <Grid container spacing={1.5} sx={{ mb: 2 }}>
      {displayStats.map((stat, index) => (
        <Grid
          item
          xs={12}
          sm={6}
          md={displayStats.length <= 4 ? 3 : 2}
          key={index}
        >
          <Grow in={true} timeout={300 + index * 100}>
            <Card
              sx={{
                ...glassMorphismCard,
                p: 1.5,
                position: "relative",
                overflow: "hidden",
                minHeight: 100,
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: `linear-gradient(90deg, ${stat.color} 0%, ${stat.color}99 100%)`,
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    backgroundColor: `${stat.color}22`,
                    mr: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <stat.icon sx={{ color: stat.color, fontSize: 28 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                      color: colorPalette.textPrimary,
                      mb: 0.25,
                      fontSize: stat.isText ? "1.1rem" : "1.5rem",
                      lineHeight: 1.2,
                    }}
                  >
                    {stat.isText ? (
                      stat.displayValue
                    ) : (
                      <AnimatedCounter value={stat.value} />
                    )}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: colorPalette.textSecondary,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      lineHeight: 1.2,
                    }}
                  >
                    {stat.title}
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 0.5,
                }}
              >
                <Chip
                  label={stat.trend}
                  size="small"
                  sx={{
                    backgroundColor: `${stat.color}22`,
                    color: stat.color,
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    height: 20,
                    "& .MuiChip-label": {
                      padding: "0 6px",
                    },
                  }}
                />
                <StatusIndicator status="active" label="Live" />
              </Box>

              <Typography
                variant="caption"
                sx={{
                  color: colorPalette.textSecondary,
                  fontSize: "0.68rem",
                  display: "block",
                  opacity: 0.8,
                  lineHeight: 1.2,
                }}
              >
                {stat.description}
              </Typography>
            </Card>
          </Grow>
        </Grid>
      ))}

      {/* Top Users Section (from API) - Compact Horizontal Layout */}
      {topUsers.length > 0 && user?.role === "Admin" && (
        <Grid item xs={12}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: colorPalette.textPrimary,
                fontWeight: 700,
                fontSize: "1rem",
              }}
            >
              Top Active Users
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: colorPalette.primary,
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                "&:hover": { textDecoration: "underline" },
              }}
              onClick={() => {
                // Navigate to detailed users page
                navigate("/all-users");
              }}
            >
              View All →
            </Typography>
          </Box>
          <Grid container spacing={1}>
            {topUsers.map((user, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Grow in={true} timeout={600 + index * 100}>
                  <Card
                    sx={{
                      ...glassMorphismCard,
                      p: 1.5,
                      minHeight: 60,
                      border: `1px solid ${colorPalette.success}22`,
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 1.5,
                        backgroundColor: `${colorPalette.success}22`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: 40,
                        height: 40,
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 800,
                          color: colorPalette.success,
                          fontSize: "1.1rem",
                        }}
                      >
                        <AnimatedCounter value={user.count} />
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: colorPalette.textPrimary,
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          mb: 0.25,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {user._id}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: colorPalette.textSecondary,
                          fontSize: "0.7rem",
                          display: "block",
                        }}
                      >
                        Last: {new Date(user.lastActivity).toLocaleDateString()}
                      </Typography>
                      {user.actions && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: colorPalette.textSecondary,
                            fontSize: "0.65rem",
                            display: "block",
                            opacity: 0.8,
                          }}
                        >
                          {user.actions.length} action types
                        </Typography>
                      )}
                    </Box>
                  </Card>
                </Grow>
              </Grid>
            ))}
          </Grid>
        </Grid>
      )}
    </Grid>
  );
};

export default StatsCards;
