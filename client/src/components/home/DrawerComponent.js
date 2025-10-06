import React from "react";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import { SwipeableDrawer } from "@mui/material";
import Sidebar from "./Sidebar";
import sidebarBg from "../../assets/images/sidebar-bg.webp";

const drawerWidth = 60;

const drawerPaperStyles = {
  backgroundColor: "#111b21",
  backgroundImage: `url(${sidebarBg})`,
  backgroundAttachment: "fixed",
  backgroundPosition: "left 0 bottom 0 !important",
  backgroundSize: "250px !important",
  backgroundRepeat: "no-repeat",
  padding: "0 10px",
};
const drawerStyles = {
  "& .MuiDrawer-paper": {
    boxSizing: "border-box",
    width: drawerWidth,
  },
};

function DrawerComponent(props) {
  return (
    <Box
      component="nav"
      sx={{ width: { lg: drawerWidth }, flexShrink: { lg: 0 } }}
      aria-label="mailbox folders"
    >
      {/* Drawer mobile */}
      <SwipeableDrawer
        PaperProps={{
          sx: drawerPaperStyles,
        }}
        variant="temporary"
        open={props.mobileOpen}
        onOpen={() => props.setMobileOpen(!props.mobileOpen)}
        onClose={() => props.setMobileOpen(!props.mobileOpen)}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{ ...drawerStyles, display: { xs: "block", lg: "none" } }}
      >
        <Sidebar />
      </SwipeableDrawer>

      {/* Drawer desktop */}
      <Drawer
        PaperProps={{
          sx: drawerPaperStyles,
        }}
        variant="permanent"
        sx={{
          ...drawerStyles,
          display: { xs: "none", lg: "block" },
        }}
        open
      >
        <Sidebar />
      </Drawer>
    </Box>
  );
}

export default DrawerComponent;
