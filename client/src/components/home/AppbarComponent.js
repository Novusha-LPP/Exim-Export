import React, { useContext, useEffect, useState } from "react";
import AppBar from "@mui/material/AppBar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Toolbar from "@mui/material/Toolbar";
import { useNavigate, useLocation } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Box, Typography, Button, Tooltip, Skeleton } from "@mui/material";
import { UserContext } from "../../contexts/UserContext.jsx";
import axios from "axios";

const drawerWidth = 60;

const moduleRoutes = {
  Directories: "/export-directories",
  "Export - Jobs": "/export-dsr",
  "Export - Documentation": "/export-documentation",
  "Export - ESanchit": "/export-esanchit",
  "Export - Operation": "/export-operation",
  "Export - Charges": "/export-charges",
  "Export - Billing": "/export-billing",
  "Export - Audit Trail": "/export-audit-trail",
  "Export - Reports": "/report",
  "Open Points": "/open-points",
};

const moduleShortNames = {
  Directories: "Directories",
  "Export - Jobs": "Jobs",
  "Export - Documentation": "Docs",
  "Export - ESanchit": "ESanchit",
  "Export - Operation": "Ops",
  "Export - Charges": "Charges",
  "Export - Billing": "Billing",
  "Export - Audit Trail": "Audit",
  "Export - Reports": "Reports",
  "Open Points": "Open Points",
};

function AppbarComponent(props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(UserContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUser() {
      if (!user?.username) return;
      try {
        const res = await axios(
          `${import.meta.env.VITE_API_STRING}/get-user/${user.username}`
        );
        setData(res.data);
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    }

    getUser();
  }, [user]);

  const assignedModules = (data?.modules || []).filter(
    (m) => moduleRoutes[m] || m === "Export - VGM"
  );

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { lg: `calc(100% - ${drawerWidth}px)` },
        ml: { lg: `${drawerWidth}px` },
        backgroundColor: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(12px) saturate(180%)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.3)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
        backgroundImage: "none",
      }}
    >
      <Toolbar sx={{ minHeight: "64px !important" }}>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={() => props.setMobileOpen(!props.mobileOpen)}
          sx={{ mr: 1, display: { lg: "none" } }}
        >
          <MenuIcon sx={{ color: "#334155" }} />
        </IconButton>

        <Tooltip title="Back">
          <IconButton
            color="inherit"
            aria-label="go back"
            edge="start"
            onClick={() => window.history.back()}
            sx={{
              mr: 1,
              transition: "all 0.2s",
              "&:hover": { backgroundColor: "rgba(0,0,0,0.05)" },
            }}
          >
            <ArrowBackIcon sx={{ color: "#334155", fontSize: 20 }} />
          </IconButton>
        </Tooltip>

        <Box
          sx={{
            height: 32,
            width: "auto",
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
            px: 1,
            mr: 2,
            transition: "transform 0.2s",
            "&:hover": {
              transform: "scale(1.05)",
            },
          }}
          onClick={() => navigate("/")}
        >
          <img
            src={new URL("../../assets/images/logo.webp", import.meta.url).href}
            alt="logo"
            style={{
              height: "100%",
              width: "auto",
              objectFit: "contain",
            }}
          />
        </Box>

        {/* Modules Navigation */}
        <Box
          sx={{
            display: "flex",
            gap: 1,
            overflowX: "auto",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
            flexGrow: 1,
            mx: 1,
          }}
        >
          {loading ? (
            <Box sx={{ display: "flex", gap: 1 }}>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton
                  key={i}
                  variant="rectangular"
                  width={60}
                  height={28}
                  sx={{ borderRadius: 1.5 }}
                />
              ))}
            </Box>
          ) : (
            assignedModules.map((module) => {
              const route = moduleRoutes[module];
              const isActive = location.pathname === route;

              if (module === "Export - VGM") {
                return (
                  <Tooltip key={module} title={module}>
                    <Button
                      size="small"
                      href="http://handover-odex.s3-website.ap-south-1.amazonaws.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#64748b",
                        textTransform: "none",
                        minWidth: "auto",
                        px: 1.5,
                        py: 0.5,
                        whiteSpace: "nowrap",
                        borderRadius: 1.5,
                        "&:hover": {
                          backgroundColor: "#f1f5f9",
                          color: "#1e293b",
                        },
                      }}
                    >
                      VGM
                    </Button>
                  </Tooltip>
                );
              }

              return (
                <Tooltip key={module} title={module}>
                  <Button
                    size="small"
                    onClick={() => navigate(route)}
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: isActive ? 700 : 600,
                      color: isActive ? "#2563eb" : "#64748b",
                      backgroundColor: isActive
                        ? "rgba(37, 99, 235, 0.08)"
                        : "transparent",
                      textTransform: "none",
                      minWidth: "auto",
                      px: 1.5,
                      py: 0.5,
                      whiteSpace: "nowrap",
                      borderRadius: 1.5,
                      border: isActive
                        ? "1px solid rgba(37, 99, 235, 0.2)"
                        : "1px solid transparent",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        backgroundColor: isActive
                          ? "rgba(37, 99, 235, 0.12)"
                          : "#f1f5f9",
                        color: isActive ? "#1d4ed8" : "#1e293b",
                        transform: "translateY(-1px)",
                      },
                      "&:active": {
                        transform: "translateY(0)",
                      },
                    }}
                  >
                    {moduleShortNames[module] || module}
                  </Button>
                </Tooltip>
              );
            })
          )}
        </Box>

        {/* Right Section: Version and potentially User Info */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            pl: 1,
            borderLeft: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          <Box sx={{ textAlign: "right", display: { xs: "none", sm: "block" } }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: "#94a3b8",
                letterSpacing: "0.02em",
                display: "block",
                lineHeight: 1,
              }}
            >
              V {import.meta.env.VITE_VERSION}
            </Typography>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default AppbarComponent;
