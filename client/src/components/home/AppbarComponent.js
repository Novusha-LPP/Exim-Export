import React from "react";
import AppBar from "@mui/material/AppBar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Toolbar from "@mui/material/Toolbar";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Box, Typography } from "@mui/material";

const drawerWidth = 60;

function AppbarComponent(props) {
  const navigate = useNavigate();

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { lg: `calc(100% - ${drawerWidth}px)` },
        ml: { lg: `${drawerWidth}px` },
        backgroundColor: "rgba(249, 250, 251, 0.3)",
        backdropFilter: "blur(6px) !important",
        boxShadow: "none",
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={() => props.setMobileOpen(!props.mobileOpen)}
          sx={{ mr: 2, display: { lg: "none" } }}
        >
          <MenuIcon sx={{ color: "#000" }} />
        </IconButton>

        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={() => window.history.back()}
          sx={{ mr: 1 }}
        >
          <ArrowBackIcon sx={{ color: "#000" }} />
        </IconButton>

        <div>
          <img
            src={new URL("../../assets/images/logo.webp", import.meta.url).href}
            alt="logo"
            height="50px"
            onClick={() => navigate("/")}
            style={{ cursor: "pointer" }}
          />
        </div>

        {/* Spacer to push the version text to the extreme right */}
        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ textAlign: "center", mt: 2 }}>
          <Typography
            variant="body1"
            sx={{ fontWeight: "bold", color: "#000" }}
          >
            Version: {import.meta.env.VITE_VERSION}
          </Typography>
          {/* <Typography variant="body2" sx={{ color: "#666", mt: 0.5 }}>
            {import.meta.env.VITE_VERSION_DATE}
          </Typography> */}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default AppbarComponent;
