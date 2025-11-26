import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Grid,
  Card,
  CardContent,
  Fade,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Avatar,
  LinearProgress,
  Divider,
  useTheme,
  alpha,
} from "@mui/material";
import {
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Insights as InsightsIcon,
  TrendingUp as TrendingUpIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  Bar,
  BarChart,
} from "recharts";

const AuditCharts = ({
  userFilter: propUserFilter,
  filters,
  colorPalette,
  glassMorphismCard,
  LoadingSkeleton,
  alpha: alphaFn,
}) => {
  const theme = useTheme();
  // Use userFilter from props or from filters
  const userFilter =
    propUserFilter !== undefined ? propUserFilter : filters?.username || "";
  const [statsLoading, setStatsLoading] = useState(true);
  const [dailyActivity, setDailyActivity] = useState([]);
  const [actionTypes, setActionTypes] = useState([]);
  const [totalActions, setTotalActions] = useState(0);
  const [avgDailyActions, setAvgDailyActions] = useState(0);
  const [peakDay, setPeakDay] = useState(null);
  const [hoveredData, setHoveredData] = useState(null);

  // Enhanced color palette for charts
  const chartColors = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#ef4444",
    "#06b6d4",
    "#84cc16",
  ];

  useEffect(() => {
    // Log the API URL and userFilter for debugging
    const params = new URLSearchParams();
    if (userFilter) {
      params.append("username", userFilter);
    }
    const today = new Date();
    const fromDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - 29
    );
    params.append("fromDate", fromDate.toISOString().slice(0, 10));
    params.append("toDate", today.toISOString().slice(0, 10));
    loadData();
  }, [userFilter]);

  const loadData = async () => {
    setStatsLoading(true);
    const params = new URLSearchParams();
    if (userFilter) {
      params.append("username", userFilter);
    }
    const today = new Date();
    const fromDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - 29
    );
    params.append("fromDate", fromDate.toISOString().slice(0, 10));
    params.append("toDate", today.toISOString().slice(0, 10));
    // No need to send groupBy, backend always returns day-wise
    try {
      const [activityRes, statsRes] = await Promise.all([
        axios.get(
          `${
            import.meta.env.VITE_API_STRING
          }/audit-trail/activity-timeline?${params}`
        ),
        axios.get(
          `${import.meta.env.VITE_API_STRING}/audit-trail/stats?${params}`
        ),
      ]);

      // Use day-wise activity data for line graph
      const activityData = activityRes.data.dailyActivity || [];
      setDailyActivity(activityData);

      // Calculate statistics
      const total = activityData.reduce((sum, day) => sum + day.actions, 0);
      const avg =
        activityData.length > 0 ? (total / activityData.length).toFixed(1) : 0;
      const peak = activityData.reduce(
        (max, day) => (day.actions > max.actions ? day : max),
        { actions: 0 }
      );

      setTotalActions(total);
      setAvgDailyActions(avg);
      setPeakDay(peak);

      // Enhanced action types with colors
      const actionTypesData = (statsRes.data.actionTypes || []).map(
        (a, index) => ({
          name: a._id,
          value: a.count,
          color: chartColors[index % chartColors.length],
          percentage: ((a.count / total) * 100).toFixed(1),
        })
      );

      setActionTypes(actionTypesData);
      setStatsLoading(false);
    } catch (error) {
      setStatsLoading(false);
      console.error("Error loading data:", error);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            backgroundColor: "rgba(255, 255, 255, 0.98)",
            border: `1px solid ${alphaFn(colorPalette.primary, 0.2)}`,
            borderRadius: "16px",
            padding: "16px",
            boxShadow:
              "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            backdropFilter: "blur(16px)",
            minWidth: "200px",
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ color: colorPalette.textPrimary, fontWeight: 600, mb: 1 }}
          >
            {new Date(label).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: colorPalette.primary,
              }}
            />
            <Typography
              variant="body2"
              sx={{ color: colorPalette.textSecondary }}
            >
              Actions:{" "}
              <strong style={{ color: colorPalette.textPrimary }}>
                {payload[0].value}
              </strong>
            </Typography>
          </Box>
        </Box>
      );
    }
    return null;
  };

  const StatCard = ({ icon, title, value, subtitle, color }) => (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        backgroundColor: alphaFn(color, 0.05),
        border: `1px solid ${alphaFn(color, 0.1)}`,
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          backgroundColor: alphaFn(color, 0.08),
          transform: "translateY(-2px)",
          boxShadow: `0 8px 25px ${alphaFn(color, 0.15)}`,
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Avatar
          sx={{ backgroundColor: alphaFn(color, 0.1), width: 40, height: 40 }}
        >
          {icon}
        </Avatar>
        <Box>
          <Typography
            variant="h4"
            sx={{
              color: colorPalette.textPrimary,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {value}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: colorPalette.textSecondary, mb: 0.5 }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ color: alphaFn(color, 0.8) }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );

  if (statsLoading) {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card sx={glassMorphismCard}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    backgroundColor: alphaFn(colorPalette.primary, 0.1),
                    mr: 2,
                  }}
                >
                  <TimelineIcon
                    sx={{ color: colorPalette.primary, fontSize: 24 }}
                  />
                </Box>
                <Typography
                  variant="h6"
                  sx={{ color: colorPalette.textPrimary, fontWeight: 600 }}
                >
                  Loading Analytics...
                </Typography>
              </Box>
              <LinearProgress
                sx={{
                  mb: 2,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: alphaFn(colorPalette.primary, 0.1),
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: colorPalette.primary,
                    borderRadius: 3,
                  },
                }}
              />
              <LoadingSkeleton rows={4} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  }

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {/* Header with Actions */}
      {/* <Grid item xs={12}>
        <Fade in={true}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ color: colorPalette.textPrimary, fontWeight: 700, mb: 1 }}>
                Audit Analytics Dashboard
              </Typography>
              <Typography variant="body2" sx={{ color: colorPalette.textSecondary }}>
                {userFilter ? `Filtered by: ${userFilter}` : 'All users'} • Last 30 days
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Refresh Data">
                <IconButton onClick={loadData} sx={{ color: colorPalette.textSecondary }}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export Data">
                <IconButton sx={{ color: colorPalette.textSecondary }}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Filter Options">
                <IconButton sx={{ color: colorPalette.textSecondary }}>
                  <FilterIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Fade>
      </Grid> */}

      {/* Stats Overview */}
      {/* <Grid item xs={12}>
        <Fade in={true}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                icon={<AssessmentIcon sx={{ color: colorPalette.primary }} />}
                title="Total Actions"
                value={totalActions.toLocaleString()}
                subtitle="30 days"
                color={colorPalette.primary}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                icon={<TrendingUpIcon sx={{ color: colorPalette.secondary }} />}
                title="Daily Average"
                value={avgDailyActions}
                subtitle="actions/day"
                color={colorPalette.secondary}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                icon={<TimelineIcon sx={{ color: '#10b981' }} />}
                title="Peak Day"
                value={peakDay?.actions || 0}
                subtitle={peakDay?.date ? new Date(peakDay.date).toLocaleDateString() : 'N/A'}
                color="#10b981"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                icon={<InsightsIcon sx={{ color: '#f59e0b' }} />}
                title="Action Types"
                value={actionTypes.length}
                subtitle="categories"
                color="#f59e0b"
              />
            </Grid>
          </Grid>
        </Fade>
      </Grid> */}

      {/* Activity Timeline */}
      <Grid item xs={12} md={12}>
        <Fade in={true} style={{ transitionDelay: "200ms" }}>
          <Card
            sx={{
              ...glassMorphismCard,
              overflow: "hidden",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: `0 20px 40px ${alphaFn(colorPalette.primary, 0.1)}`,
              },
            }}
          >
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ p: 3, pb: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: alphaFn(colorPalette.primary, 0.1),
                        mr: 2,
                      }}
                    >
                      <TimelineIcon
                        sx={{ color: colorPalette.primary, fontSize: 24 }}
                      />
                    </Box>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          color: colorPalette.textPrimary,
                          fontWeight: 600,
                          mb: 0.5,
                        }}
                      >
                        Activity Timeline
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: colorPalette.textSecondary }}
                      >
                        Daily audit activities over the last 30 days
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {hoveredData &&
                  hoveredData.date &&
                  typeof hoveredData.actions === "number" && (
                    <Chip
                      label={`${hoveredData.actions} actions on ${new Date(
                        hoveredData.date
                      ).toLocaleDateString()}`}
                      size="small"
                      sx={{
                        backgroundColor: alphaFn(colorPalette.primary, 0.1),
                        color: colorPalette.primary,
                        border: `1px solid ${alphaFn(
                          colorPalette.primary,
                          0.2
                        )}`,
                      }}
                    />
                  )}
              </Box>

              <Divider
                sx={{ borderColor: alphaFn(colorPalette.primary, 0.1) }}
              />

              <Box sx={{ p: 3, pt: 2 }}>
                {dailyActivity.length === 0 ? (
                  <Box
                    sx={{
                      p: 6,
                      textAlign: "center",
                      backgroundColor: alphaFn(colorPalette.primary, 0.02),
                      borderRadius: 3,
                      border: `2px dashed ${alphaFn(
                        colorPalette.primary,
                        0.1
                      )}`,
                      transition: "all 0.2s ease-in-out",
                      "&:hover": {
                        backgroundColor: alphaFn(colorPalette.primary, 0.04),
                      },
                    }}
                  >
                    <InsightsIcon
                      sx={{
                        fontSize: 64,
                        color: alphaFn(colorPalette.primary, 0.3),
                        mb: 2,
                      }}
                    />
                    <Typography
                      variant="h6"
                      sx={{
                        color: colorPalette.textPrimary,
                        mb: 1,
                        fontWeight: 600,
                      }}
                    >
                      No Activity Data
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: colorPalette.textSecondary,
                        maxWidth: 300,
                        mx: "auto",
                      }}
                    >
                      No activity data available for the selected period. Try
                      adjusting your filters or check back later.
                    </Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart
                      data={dailyActivity}
                      onMouseEnter={(data) => setHoveredData(data)}
                      onMouseLeave={() => setHoveredData(null)}
                    >
                      <defs>
                        <linearGradient
                          id="colorActivity"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={colorPalette.primary}
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor={colorPalette.primary}
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={alphaFn(colorPalette.primary, 0.08)}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        stroke={colorPalette.textSecondary}
                        tick={{ fontSize: 11 }}
                        interval={Math.floor(dailyActivity.length / 6)}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        stroke={colorPalette.textSecondary}
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <ChartTooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="actions"
                        stroke={colorPalette.primary}
                        fill="url(#colorActivity)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Fade>
      </Grid>

      {/* Action Types Distribution */}
      {/* <Grid item xs={12} md={4}>
        <Fade in={true} style={{ transitionDelay: '400ms' }}>
          <Card sx={{ 
            ...glassMorphismCard, 
            overflow: 'hidden',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: `0 20px 40px ${alphaFn(colorPalette.primary, 0.1)}`
            }
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ 
                  p: 1.5, 
                  borderRadius: 2, 
                  backgroundColor: alphaFn(colorPalette.primary, 0.1), 
                  mr: 2 
                }}>
                  <InsightsIcon sx={{ color: colorPalette.primary, fontSize: 24 }} />
                </Box>
                <Typography variant="h6" sx={{ color: colorPalette.textPrimary, fontWeight: 600 }}>
                  Action Types Distribution
                </Typography>
              </Box>
              
              {actionTypes.length === 0 ? (
                <Box sx={{ 
                  p: 6, 
                  textAlign: 'center', 
                  backgroundColor: alphaFn(colorPalette.primary, 0.02), 
                  borderRadius: 3,
                  border: `2px dashed ${alphaFn(colorPalette.primary, 0.1)}`,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: alphaFn(colorPalette.primary, 0.04)
                  }
                }}>
                  <InsightsIcon sx={{ fontSize: 64, color: alphaFn(colorPalette.primary, 0.3), mb: 2 }} />
                  <Typography variant="h6" sx={{ color: colorPalette.textPrimary, mb: 1, fontWeight: 600 }}>
                    No Action Type Data
                  </Typography>
                  <Typography variant="body2" sx={{ color: colorPalette.textSecondary, maxWidth: 300, mx: 'auto' }}>
                    No action type data available for the selected period. Try adjusting your filters or check back later.
                  </Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <defs>
                      {actionTypes.map((entry, index) => (
                        <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={entry.color} stopOpacity={0.7}/>
                          <stop offset="95%" stopColor={entry.color} stopOpacity={0.2}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <Box sx={{
                              backgroundColor: 'rgba(255, 255, 255, 0.98)',
                              border: `1px solid ${alphaFn(colorPalette.primary, 0.2)}`,
                              borderRadius: '16px',
                              padding: '16px',
                              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                              backdropFilter: 'blur(16px)',
                              minWidth: '150px'
                            }}>
                              <Typography variant="subtitle2" sx={{ color: colorPalette.textPrimary, fontWeight: 600, mb: 1 }}>
                                {payload[0].name}
                              </Typography>
                              <Typography variant="body2" sx={{ color: colorPalette.textSecondary }}>
                                Count: <strong style={{ color: colorPalette.textPrimary }}>{payload[0].value}</strong>
                              </Typography>
                              <Typography variant="body2" sx={{ color: colorPalette.textSecondary }}>
                                Percentage: <strong style={{ color: colorPalette.textPrimary }}>{payload[0].payload.percentage}%</strong>
                              </Typography>
                            </Box>
                          );
                        }
                        return null;
                      }} 
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right" 
                      layout="vertical"
                      wrapperStyle={{ paddingLeft: '20px' }}
                    />
                    {actionTypes.map((entry, index) => (
                      <Pie
                        key={`pie-${index}`}
                        data={actionTypes}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="60%" 
                        outerRadius="80%"
                        fill={`url(#gradient-${index})`}
                        stroke={alpha(colorPalette.textPrimary, 0.1)}
                        strokeWidth={2}
                        isAnimationActive={false}
                      >
                        {actionTypes.map((_, i) => (
                          <Cell key={`cell-${i}`} fill={chartColors[i % chartColors.length]} />
                        ))}
                      </Pie>
                    ))}
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Fade>
      </Grid> */}
    </Grid>
  );
};

export default AuditCharts;
