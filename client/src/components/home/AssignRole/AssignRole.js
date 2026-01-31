import React, { useState } from "react";
import axios from "axios";
import {
  MenuItem,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  Avatar,
  Grid,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import { useFormik } from "formik";
import { Row, Col } from "react-bootstrap";
import UserDetails from "./UserDetails.js"; // Import the UserDetails component

function AssignRole({ selectedUser }) {
  const [selectedRole, setSelectedRole] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "",
  });
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);

  const fetchUsersByRole = async (role) => {
    if (!role) {
      setUsers([]);
      setErrorMessage("Please select a role to fetch users.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_STRING}/users-by-role?role=${role}`
      );

      if (res.data.success && res.data.users.length === 0) {
        setErrorMessage(res.data.message);
      } else {
        setUsers(res.data.users);
      }
    } catch (error) {
      setErrorMessage("Failed to fetch users. Please try again later.");
      console.error("Error fetching users by role:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (event) => {
    const role = event.target.value;
    setSelectedRole(role);
    fetchUsersByRole(role);
  };

  const handleBoxClick = (user) => {
    setSelectedUserDetails(user);
    setShowUserDetails(true);
  };

  const closeUserDetails = () => {
    setShowUserDetails(false);
    setSelectedUserDetails(null);
  };

  // Define the handleUserUpdate function
  const handleUserUpdate = (updatedImporters) => {
    if (!selectedUserDetails) return;

    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user._id === selectedUserDetails._id
          ? { ...user, assigned_importer_name: updatedImporters }
          : user
      )
    );

    setSnackbar({
      open: true,
      message: "Importers updated successfully.",
      type: "success",
    });
  };

  const formik = useFormik({
    initialValues: {
      role: "",
    },
    onSubmit: async (values, { resetForm }) => {
      if (!selectedUser) {
        setSnackbar({
          open: true,
          message: "Please select a user",
          type: "warning",
        });
        return;
      }

      const data = {
        ...values,
        username: selectedUser,
      };

      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_STRING}/assign-role`,
          data
        );

        setSnackbar({
          open: true,
          message: res.data.message,
          type: "success",
        });

        resetForm();
      } catch (error) {
        console.error("Error assigning role:", error);

        setSnackbar({
          open: true,
          message: "Failed to assign role. Please try again.",
          type: "error",
        });
      }
    },
  });

  const handleSnackbarClose = () => {
    setSnackbar({ open: false, message: "", type: "" });
  };

  return (
    <div className="job-details-container">
      <h4>Assign Role</h4>
      {showUserDetails ? (
        <UserDetails
          selectedUser={selectedUserDetails}
          onClose={closeUserDetails}
          onSave={handleUserUpdate} // Pass the onSave prop here
        />
      ) : (
        <form onSubmit={formik.handleSubmit}>
          <Row style={{ marginBottom: "20px" }}>
            <Col xs={12} lg={2}>
              <TextField
                select
                size="small"
                margin="dense"
                variant="filled"
                fullWidth
                label="Role"
                value={formik.values.role}
                onChange={(event) => {
                  handleRoleChange(event);
                  formik.setFieldValue("role", event.target.value);
                }}
                error={formik.touched.role && Boolean(formik.errors.role)}
                helperText={formik.touched.role && formik.errors.role}
                className="login-input"
              >
                <MenuItem value="Admin">Admin</MenuItem>
                <MenuItem value="Sr_Manager">Sr. Manager</MenuItem>
                <MenuItem value="Manager">Manager</MenuItem>
                <MenuItem value="Asst_Manager">Asst. Manager</MenuItem>
                <MenuItem value="Sr_Executive">Sr. Executive</MenuItem>
                <MenuItem value="Executive">Executive</MenuItem>
                <MenuItem value="Asst_Executive">Asst. Executive</MenuItem>
                <MenuItem value="User">User</MenuItem>
                <MenuItem value="">Clear</MenuItem>
              </TextField>
              <button className="btn" type="submit">
                Submit
              </button>
            </Col>
            <Col xs={12} lg={10}>
              {loading ? (
                <CircularProgress />
              ) : errorMessage ? (
                <Typography>{errorMessage}</Typography>
              ) : (
                <Grid container spacing={2}>
                  {users.map((user) => (
                    <Grid item xs={12} sm={6} md={4} key={user._id}>
                      <Card
                        onClick={() => handleBoxClick(user)}
                        style={{ cursor: "pointer" }}
                      >
                        <CardContent>
                          <Avatar
                            src={user.employee_photo || "/default-avatar.png"}
                            alt={user.username}
                            style={{ marginBottom: "10px" }}
                          />
                          <Typography variant="h6">{user.username}</Typography>
                          <Typography variant="body2">
                            Role: {user.role}
                          </Typography>
                          <Typography variant="body2">
                            Department: {user.department || "—"}
                          </Typography>
                          <Typography variant="body2">
                            Importers Assigned:
                            {user.assigned_importer_name.length > 0
                              ? user.assigned_importer_name.length
                              : 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Col>
          </Row>
        </form>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.type}>{snackbar.message}</Alert>
      </Snackbar>
    </div>
  );
}

export default React.memo(AssignRole);
