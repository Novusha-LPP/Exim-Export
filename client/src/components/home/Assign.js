import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import {
  TextField,
  MenuItem,
  Autocomplete,
  CircularProgress,
  Box,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import AssignModule from "./AssignModule";
import AssignRole from "./AssignRole/AssignRole";
import ChangePasswordByAdmin from "./AssignRole/ChangePasswordByAdmin";
import SelectIcdCode from "./AssignRole/SelectIcdCode";
import AssignImporters from "./AssignImporters";
import { priorityFilter } from "../../utils/filterUtils";
import { UserContext } from "../../contexts/UserContext";

function Assign() {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [userList, setUserList] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [masterType, setMasterType] = useState("Assign Module");

  // Server-side admin verification
  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Verify admin role from server on mount
  useEffect(() => {
    async function verifyAdminAccess() {
      if (!user?.username) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_STRING}/get-user/${user.username}`
        );
        const isAdmin = res.data?.role === "Admin";
        setIsVerifiedAdmin(isAdmin);

        // If not admin, redirect to home
        if (!isAdmin) {
          console.warn("Access denied: User is not an admin");
          navigate("/");
        }
      } catch (error) {
        console.error("Error verifying admin access:", error);
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    }

    verifyAdminAccess();
  }, [user?.username, navigate]);

  const handleMasterChange = (e) => {
    setMasterType(e.target.value);
  };

  useEffect(() => {
    async function getUsers() {
      if (!isVerifiedAdmin) return;

      try {
        const res = await axios(
          `${import.meta.env.VITE_API_STRING}/get-all-users`
        );
        // API returns array of users directly
        const users = Array.isArray(res.data) ? res.data : (res.data.users || []);
        // Store full user objects with display name
        const usersWithDisplayName = users.map((user) => ({
          username: user.username,
          displayName: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username,
          first_name: user.first_name,
          last_name: user.last_name,
        }));
        setUserList(usersWithDisplayName);
      } catch (error) {
        console.error("Error fetching user list:", error);
      }
    }

    getUsers();
  }, [isVerifiedAdmin]);

  // Get username from selected user object
  const selectedUsername = selectedUser?.username || "";

  const masterComponent = () => {
    switch (masterType) {
      case "Assign Module":
        return <AssignModule selectedUser={selectedUsername} />;
      case "Assign Role":
        return <AssignRole selectedUser={selectedUsername} />;
      case "Change Password":
        return <ChangePasswordByAdmin selectedUser={selectedUsername} />;
      case "Assign ICD Code":
        return <SelectIcdCode selectedUser={selectedUsername} />;
      case "Assign Importers":
        return <AssignImporters selectedUser={selectedUsername} />;
      default:
        return null;
    }
  };

  // Show loading while verifying admin access
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <CircularProgress />
      </Box>
    );
  }

  // Don't render anything if not verified admin (redirect will happen)
  if (!isVerifiedAdmin) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <Typography color="error">Access Denied: Admin privileges required</Typography>
      </Box>
    );
  }

  return (
    <>
      <div
        className="flex-div"
        style={{ marginTop: "20px", marginBottom: "10px" }}
      >
        <div style={{ flex: 1 }}>
          <Autocomplete
            value={selectedUser}
            onChange={(event, newValue) => {
              setSelectedUser(newValue);
            }}
            options={userList}
            getOptionLabel={(option) => option?.displayName || ""}
            isOptionEqualToValue={(option, value) => option?.username === value?.username}
            filterOptions={(options, { inputValue }) => {
              // Filter by both displayName and username
              const lowerInput = inputValue.toLowerCase();
              return options.filter(
                (opt) =>
                  opt.displayName?.toLowerCase().includes(lowerInput) ||
                  opt.username?.toLowerCase().includes(lowerInput)
              );
            }}
            sx={{ width: 250, marginBottom: "20px" }}
            renderInput={(params) => (
              <TextField {...params} size="small" label="Select User" />
            )}
          />
        </div>
        <TextField
          select
          size="small"
          label={!selectedUser ? "First select user" : "Select"}
          sx={{ width: "200px", marginBottom: "20px" }}
          value={masterType}
          onChange={handleMasterChange}
          disabled={!selectedUser}
        >
          <MenuItem value="Assign Module">Assign Module</MenuItem>
          <MenuItem value="Assign Role">Assign Role</MenuItem>
          <MenuItem value="Change Password">Change Password</MenuItem>
          <MenuItem value="Assign ICD Code">Assign ICD Code</MenuItem>
          <MenuItem value="Assign Importers">Assign Importers</MenuItem>
        </TextField>
      </div>

      {masterComponent()}
    </>
  );
}

export default React.memo(Assign);
