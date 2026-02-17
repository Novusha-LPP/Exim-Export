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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  Checkbox,
  ListItemText,
} from "@mui/material";
import { UserContext } from "../../../contexts/UserContext";

function SelectIcdCode({ selectedUser }) {
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [selectedPorts, setSelectedPorts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [userData, setUserData] = useState(null);
  const { user } = useContext(UserContext);


  const branchOptions = [
    { code: "BRD", label: "BRD - BARODA" },
    { code: "GIM", label: "GIM - GANDHIDHAM" },
    { code: "HAZ", label: "HAZ - HAZIRA" },
    { code: "AMD", label: "AMD - AHMEDABAD" },
    { code: "COK", label: "COK - COCHIN" },
  ];

  const portOptions = [
    { value: "INMUN1 - MUNDRA", label: "MUNDRA (INMUN1)" },
    { value: "INIXY1 - KANDLA", label: "KANDLA (INIXY1)" },
    { value: "INPAV1 - PIPAVAV", label: "PIPAVAV (INPAV1)" },
    { value: "INHZA1 - HAZIRA", label: "HAZIRA (INHZA1)" },
    { value: "INNSA1 - NHAVA SHEVA", label: "NHAVA SHEVA (INNSA1)" },
    { value: "INAMD4 - AHMEDABAD AIR PORT", label: "AHMEDABAD AIR PORT (INAMD4)" },
  ];

  useEffect(() => {
    // Reset form when selected user changes
    setSelectedBranches([]);
    setSelectedPorts([]);
    setMessage({ text: "", type: "" });

    // Fetch user data to check current ICD assignment
    if (selectedUser) {
      fetchUserData();
    }
  }, [selectedUser]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_STRING}/get-user/${selectedUser}`
      );
      setUserData(res.data);

      // Set current branches
      const currentBranches = res.data.selected_branches || [];
      setSelectedBranches(currentBranches);

      // Set current ports
      const currentPorts = res.data.selected_ports || [];
      setSelectedPorts(currentPorts);

      if (currentBranches.length > 0 || currentPorts.length > 0) {
        setMessage({
          text: `User has existing assignments.`,
          type: "info",
        });
      } else {
        setMessage({
          text: "No assignments currently for this user",
          type: "warning",
        });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setMessage({
        text: "Error fetching user information",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (
      (!selectedBranches || selectedBranches.length === 0) &&
      (!selectedPorts || selectedPorts.length === 0)
    ) {
      setMessage({
        text: "Please select at least one branch or port",
        type: "error",
      });
      return;
    }

    // Check if current user has admin privileges
    if (user.role !== "Admin") {
      setMessage({ text: "Only admins can Assign Branch", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_STRING}/admin/assign-icd-code`,
        {
          username: selectedUser,
          selectedBranches: selectedBranches,
          selectedPorts: selectedPorts,
          adminUsername: user.username,
        }
      );

      setMessage({
        text: response.data.message || "ICD codes assigned successfully",
        type: "success",
      });

      // Update local user data to reflect the change
      setUserData((prev) => ({
        ...prev,
        selected_branches: selectedBranches,
        selected_ports: selectedPorts,
      }));
    } catch (error) {
      console.error("Error assigning ICD codes:", error);

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
          text: error.response?.data?.message || "Error assigning ICD codes",
          type: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAllIcdCodes = async () => {
    if (
      (!userData?.selected_branches || userData.selected_branches.length === 0) &&
      (!userData?.selected_ports || userData.selected_ports.length === 0)
    ) {
      setMessage({ text: "No assignments to remove", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_STRING}/admin/remove-icd-code`,
        {
          username: selectedUser,
          adminUsername: user.username,
        }
      );

      setMessage({
        text: response.data.message || "Assignments removed successfully",
        type: "success",
      });
      setSelectedBranches([]);
      setSelectedPorts([]);

      // Update local user data
      setUserData((prev) => ({
        ...prev,
        selected_branches: [],
        selected_ports: [],
      }));
    } catch (error) {
      console.error("Error removing ICD codes:", error);
      setMessage({
        text: error.response?.data?.message || "Error removing ICD codes",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIcdCodeChange = (event) => {
    const value = event.target.value;
    setSelectedIcdCodes(typeof value === "string" ? value.split(",") : value);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">
          Assign Branch for {selectedUser}
        </Typography>
        {selectedUser && (
          <Button
            variant="outlined"
            size="small"
            onClick={fetchUserData}
            disabled={loading}
          >
            Refresh Data
          </Button>
        )}
      </Box>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {message.text && (
        <Alert
          severity={
            message.type === "success"
              ? "success"
              : message.type === "info"
                ? "info"
                : "error"
          }
          sx={{ mb: 2 }}
        >
          {message.text}
        </Alert>
      )}

      {/* Display current assignments */}
      {(userData?.selected_branches?.length > 0 ||
        userData?.selected_ports?.length > 0) && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {userData?.selected_branches?.length > 0 && (
              <>
                <Typography variant="body2" sx={{ mb: 0.5, fontWeight: "bold" }}>
                  Assigned Branches:
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1.5 }}>
                  {userData.selected_branches.map((code, index) => (
                    <Chip key={index} label={code} size="small" color="secondary" />
                  ))}
                </Box>
              </>
            )}

            {userData?.selected_ports?.length > 0 && (
              <>
                <Typography variant="body2" sx={{ mb: 0.5, fontWeight: "bold" }}>
                  Assigned Ports:
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {userData.selected_ports.map((code, index) => (
                    <Chip key={index} label={code} size="small" color="success" />
                  ))}
                </Box>
              </>
            )}
          </Alert>
        )}

      {/* Show when no ICD codes are assigned */}
      {userData &&
        (!userData.selected_icd_codes ||
          userData.selected_icd_codes.length === 0) && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>No ICD codes are currently assigned to this user.</strong>
            </Typography>
            <Typography
              variant="body2"
              sx={{ mt: 1, fontSize: "0.875rem", color: "text.secondary" }}
            >
              User: {userData.first_name} {userData.last_name} (
              {userData.username})
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontSize: "0.875rem", color: "text.secondary" }}
            >
              You can Assign Branch using the dropdown below.
            </Typography>
          </Alert>
        )}

      {user.role !== "Admin" ? (
        <Alert severity="warning">
          Only administrators can Assign Branch to users
        </Alert>
      ) : (
        <Box component="form" onSubmit={handleSubmit}>
          <FormControl fullWidth margin="normal" size="small">
            <InputLabel id="branches-select-label">Assign Branch</InputLabel>
            <Select
              labelId="branches-select-label"
              multiple
              value={selectedBranches}
              onChange={(e) => setSelectedBranches(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Assign Branch" />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {branchOptions.map((branch) => (
                <MenuItem key={branch.code} value={branch.code}>
                  <Checkbox checked={selectedBranches.indexOf(branch.code) > -1} />
                  <ListItemText primary={branch.label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal" size="small">
            <InputLabel id="ports-select-label">Assign Ship Port</InputLabel>
            <Select
              labelId="ports-select-label"
              multiple
              value={selectedPorts}
              onChange={(e) => setSelectedPorts(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Assign Ship Port" />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {portOptions.map((port) => (
                <MenuItem key={port.value} value={port.value}>
                  <Checkbox checked={selectedPorts.indexOf(port.value) > -1} />
                  <ListItemText primary={port.label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ mt: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Assign Branch"}
            </Button>

            {userData?.selected_icd_codes &&
              userData.selected_icd_codes.length > 0 && (
                <Button
                  onClick={handleRemoveAllIcdCodes}
                  variant="outlined"
                  color="error"
                  disabled={loading}
                >
                  {loading ? (
                    <CircularProgress size={24} />
                  ) : (
                    "Remove All ICD Codes"
                  )}
                </Button>
              )}
          </Box>
        </Box>
      )}
    </Paper>
  );
}

export default SelectIcdCode;
