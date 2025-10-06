import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/sidebar.scss";
import { Avatar, IconButton, ListItemButton, Tooltip } from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import FeedbackIcon from "@mui/icons-material/Feedback";
import LockResetIcon from "@mui/icons-material/LockReset";
import { UserContext } from "../../contexts/UserContext";

function Sidebar() {
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);
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

      {user.role === "Admin" && (
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
    </div>
  );
}

export default React.memo(Sidebar);
