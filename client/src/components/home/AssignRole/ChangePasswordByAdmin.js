import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import {
  TextField,
  Button,
  Paper,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from "@mui/material";
import { UserContext } from "../../../contexts/UserContext";

function ChangePasswordByAdmin({ selectedUser }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [userData, setUserData] = useState(null);
  const { user } = useContext(UserContext);

  useEffect(() => {
    // Reset form when selected user changes
    setNewPassword("");
    setConfirmPassword("");
    setMessage({ text: "", type: "" });

    // Fetch user data to check role
    if (selectedUser) {
      fetchUserData();
    }
  }, [selectedUser]);

  const fetchUserData = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_STRING}/get-user/${selectedUser}`
      );
      setUserData(res.data);
    } catch (error) {
      console.error("Error fetching user data:", error);
      setMessage({
        text: "Error fetching user information",
        type: "error",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!newPassword || !confirmPassword) {
      setMessage({ text: "Please fill in all fields", type: "error" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ text: "Passwords do not match", type: "error" });
      return;
    }

    // Password strength validation
    if (newPassword.length < 8) {
      setMessage({
        text: "Password must be at least 8 characters long",
        type: "error",
      });
      return;
    }

    // Check if current user is admin and target user is also admin
    if (
      userData?.role === "Admin" &&
      user.role === "Admin" &&
      userData.username !== user.username
    ) {
      setMessage({
        text: "Admin cannot change another admin's password",
        type: "error",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_STRING}/admin/change-password`,
        {
          username: selectedUser,
          newPassword: newPassword,
          adminUsername: user.username,
        }
      );

      setMessage({ text: response.data.message, type: "success" });
      // Reset form fields after successful password change
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error changing password:", error);

      // Handle specific error cases
      if (error.response?.status === 403) {
        setMessage({
          text: error.response.data.message || "Unauthorized action",
          type: "error",
        });
      } else if (error.response?.status === 404) {
        setMessage({
          text: "User not found",
          type: "error",
        });
      } else {
        setMessage({
          text: error.response?.data?.message || "Error changing password",
          type: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Change Password for {selectedUser}
      </Typography>

      {message.text && (
        <Alert
          severity={message.type === "success" ? "success" : "error"}
          sx={{ mb: 2 }}
        >
          {message.text}
        </Alert>
      )}

      {userData?.role === "Admin" &&
      user.role === "Admin" &&
      userData.username !== user.username ? (
        <Alert severity="warning">
          Admin cannot change another admin's password
        </Alert>
      ) : (
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            margin="normal"
            size="small"
          />

          <TextField
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
            margin="normal"
            size="small"
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            sx={{ mt: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Change Password"}
          </Button>
        </Box>
      )}
    </Paper>
  );
}

export default ChangePasswordByAdmin;
