import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/sidebar.scss";
import { Avatar, IconButton, ListItemButton, Tooltip } from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import FeedbackIcon from "@mui/icons-material/Feedback";
import LockResetIcon from "@mui/icons-material/LockReset";
import DescriptionIcon from '@mui/icons-material/Description';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import HistoryIcon from '@mui/icons-material/History';
import { UserContext } from "../../contexts/UserContext";
import CurrencyRateDialog from "./CurrencyRateDialog.js"; // Import the dialog
import axios from "axios";

function Sidebar() {
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);
  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);

  // Server-verified admin status (not from localStorage)
  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState(false);

  // Verify admin role from server on mount
  useEffect(() => {
    async function verifyAdminRole() {
      if (user?.username) {
        try {
          const res = await axios.get(
            `${import.meta.env.VITE_API_STRING}/get-user/${user.username}`
          );
          // Only trust the role from the server response
          setIsVerifiedAdmin(res.data?.role === "Admin");
        } catch (error) {
          console.error("Error verifying admin role:", error);
          setIsVerifiedAdmin(false);
        }
      }
    }
    verifyAdminRole();
  }, [user?.username]);

  const handleLogout = () => {
    setUser(null);
    navigate("/");
    // Remove user from local storage
    localStorage.removeItem("exim_user");
    localStorage.removeItem("selected_importer");
    localStorage.removeItem("selected_importer_url");
    localStorage.removeItem("tab_value");
  };

  return (
    <div className="sidebar">
      <Tooltip
        title={`Welcome ${user.first_name}`}
        enterDelay={0}
        placement="right"
      >
        <IconButton>
          <Avatar src={user.employee_photo} alt="Employee Photo" />
        </IconButton>
      </Tooltip>

      <Tooltip title="Home" enterDelay={0} placement="right">
        <ListItemButton
          className="appbar-links"
          aria-label="list-item"
          onClick={() => navigate("/")}
        >
          <IconButton sx={{ color: "#ffffff9f" }} aria-label="icon">
            <HomeRoundedIcon />
          </IconButton>
        </ListItemButton>
      </Tooltip>

      {/* Only show admin features if server verified */}
      {isVerifiedAdmin && (
        <Tooltip title="Assign Module" enterDelay={0} placement="right">
          <ListItemButton
            className="appbar-links"
            aria-label="list-item"
            onClick={() => navigate("/assign")}
          >
            <IconButton sx={{ color: "#ffffff9f" }} aria-label="icon">
              <AssignmentIndIcon />
            </IconButton>
          </ListItemButton>
        </Tooltip>
      )}

      {/* NEW: Currency Exchange Rates Icon */}
      <Tooltip title="Currency Exchange Rates" enterDelay={0} placement="right">
        <ListItemButton
          sx={{ textAlign: "left" }}
          className="appbar-links"
          aria-label="list-item"
          onClick={() => setCurrencyDialogOpen(true)}
        >
          <IconButton sx={{ color: "#ffffff9f" }} aria-label="icon">
            <CurrencyExchangeIcon />
          </IconButton>
        </ListItemButton>
      </Tooltip>
      <Tooltip title="Feedback" enterDelay={0} placement="right">
        <ListItemButton
          sx={{ textAlign: "left" }}
          className="appbar-links"
          aria-label="list-item"
          onClick={() => navigate("/feedback")}
        >
          <IconButton sx={{ color: "#ffffff9f" }} aria-label="icon">
            <FeedbackIcon />
          </IconButton>
        </ListItemButton>
      </Tooltip>

      <Tooltip title="Change Password" enterDelay={0} placement="right">
        <ListItemButton
          sx={{ textAlign: "left" }}
          className="appbar-links"
          aria-label="list-item"
          onClick={() => navigate("/change-password")}
        >
          <IconButton sx={{ color: "#ffffff9f" }} aria-label="icon">
            <LockResetIcon />
          </IconButton>
        </ListItemButton>
      </Tooltip>

      <Tooltip title="Logout" enterDelay={0} placement="right">
        <ListItemButton
          sx={{ textAlign: "left" }}
          className="appbar-links"
          aria-label="list-item"
          onClick={handleLogout}
        >
          <IconButton sx={{ color: "#ffffff9f" }} aria-label="icon">
            <LogoutRoundedIcon />
          </IconButton>
        </ListItemButton>
      </Tooltip>

      {/* Currency Rate Dialog */}
      <CurrencyRateDialog
        open={currencyDialogOpen}
        onClose={() => setCurrencyDialogOpen(false)}
      />
    </div>
  );
}

export default React.memo(Sidebar);
