// src/components/UserDetails/UserDetails.js
import React, { useState, useEffect, useContext } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Typography,
  Button,
  Snackbar,
  Alert,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Divider,
} from "@mui/material";
import axios from "axios";
import PropTypes from "prop-types";
import { YearContext } from "../../../contexts/yearContext.jsx";

function not(a, b) {
  return a.filter((value) => b.indexOf(value) === -1);
}

function intersection(a, b) {
  return a.filter((value) => b.indexOf(value) !== -1);
}

function union(a, b) {
  return [...a, ...not(b, a)];
}

function UserDetails({ selectedUser, onClose, onSave }) {
  const [userData, setUserData] = useState(null);
  const [checked, setChecked] = useState([]);
  const [right, setRight] = useState([]); // Assigned importers
  const [left, setLeft] = useState([]); // Available importers
  const [allImporters, setAllImporters] = useState([]);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "",
  });
  const [loading, setLoading] = useState(false);
  const { selectedYearState } = useContext(YearContext);

  const leftChecked = intersection(checked, left);
  const rightChecked = intersection(checked, right);

  // Get importer list
  useEffect(() => {
    async function getImporterList() {
      if (selectedYearState) {
        try {
          const res = await axios.get(
            `${
              import.meta.env.VITE_API_STRING
            }/get-importer-list/${selectedYearState}`
          );
          const importerNames = res.data.map(
            (item) => item.importer || item.name || item
          );
          setAllImporters(importerNames.sort());
        } catch (error) {
          setAllImporters([]);
        }
      }
    }
    getImporterList();
  }, [selectedYearState]);

  // Fetch user data and set up lists
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_STRING}/get-user/${selectedUser}`
        );
        setUserData(res.data);

        // Set assigned importers (right side)
        const assignedImporters = res.data.assigned_importer_name || [];
        setRight(assignedImporters.sort());

        // Set available importers (left side) - exclude already assigned ones
        const availableImporters = allImporters.filter(
          (importer) => !assignedImporters.includes(importer)
        );
        setLeft(availableImporters.sort());
      } catch (error) {
        console.error("Error fetching user data:", error);
        setSnackbar({
          open: true,
          message: "Error fetching user information",
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    if (
      typeof selectedUser === "string" &&
      selectedUser &&
      allImporters.length > 0
    ) {
      fetchUserData();
    } else if (
      selectedUser &&
      typeof selectedUser === "object" &&
      allImporters.length > 0
    ) {
      const assignedImporters = selectedUser.assigned_importer_name || [];
      setRight(assignedImporters.sort());

      const availableImporters = allImporters.filter(
        (importer) => !assignedImporters.includes(importer)
      );
      setLeft(availableImporters.sort());
      setUserData(selectedUser);
    }
  }, [selectedUser, allImporters]);

  const handleToggle = (value) => () => {
    const currentIndex = checked.indexOf(value);
    const newChecked = [...checked];

    if (currentIndex === -1) {
      newChecked.push(value);
    } else {
      newChecked.splice(currentIndex, 1);
    }

    setChecked(newChecked);
  };

  const numberOfChecked = (items) => intersection(checked, items)?.length;

  const handleToggleAll = (items) => () => {
    if (numberOfChecked(items) === items.length) {
      setChecked(not(checked, items));
    } else {
      setChecked(union(checked, items));
    }
  };

  const saveImporters = async (newRight) => {
    setLoading(true);
    try {
      await axios.patch(
        `${import.meta.env.VITE_API_STRING}/users/${userData?._id}/importers`,
        { importers: newRight }
      );
      if (onSave) {
        onSave(newRight);
      }
      setSnackbar({
        open: true,
        message: "Importers assigned successfully.",
        type: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to assign importers. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignImporter = async () => {
    const newRight = right.concat(leftChecked).sort();
    const newLeft = not(left, leftChecked).sort();
    setRight(newRight);
    setLeft(newLeft);
    setChecked(not(checked, leftChecked));
    await saveImporters(newRight);
  };

  const handleUnassignImporter = async () => {
    const newLeft = left.concat(rightChecked).sort();
    const newRight = not(right, rightChecked).sort();
    setLeft(newLeft);
    setRight(newRight);
    setChecked(not(checked, rightChecked));
    await saveImporters(newRight);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Make API call to update importers
      await axios.patch(
        `${import.meta.env.VITE_API_STRING}/users/${userData?._id}/importers`,
        { importers: right }
      );

      // Notify parent component about the update
      if (onSave) {
        onSave(right);
      }

      // Show success snackbar
      setSnackbar({
        open: true,
        message: "Importers assigned successfully.",
        type: "success",
      });

      // Close the UserDetails view after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Error saving importers:", error);
      // Show error snackbar
      setSnackbar({
        open: true,
        message: "Failed to assign importers. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar({ open: false, message: "", type: "" });
  };

  const customList = (title, items) => (
    <Card>
      <CardHeader
        sx={{ px: 2 }}
        avatar={
          <Checkbox
            onClick={handleToggleAll(items)}
            checked={
              numberOfChecked(items) === items?.length && items?.length !== 0
            }
            indeterminate={
              numberOfChecked(items) !== items?.length &&
              numberOfChecked(items) !== 0
            }
            disabled={items?.length === 0}
            inputProps={{
              "aria-label": "all items selected",
            }}
          />
        }
        title={title}
        subheader={`${numberOfChecked(items)}/${items?.length} selected`}
      />
      <Divider />
      <List
        sx={{
          width: 400,
          height: 500,
          bgcolor: "background.paper",
          overflow: "auto",
        }}
        dense
        component="div"
        role="list"
      >
        {items?.map((value) => {
          const labelId = `transfer-list-all-item-${value}-label`;

          return (
            <ListItemButton
              key={value}
              role="listitem"
              onClick={handleToggle(value)}
            >
              <ListItemIcon>
                <Checkbox
                  checked={checked.indexOf(value) !== -1}
                  tabIndex={-1}
                  disableRipple
                  inputProps={{
                    "aria-labelledby": labelId,
                  }}
                />
              </ListItemIcon>
              <ListItemText id={labelId} primary={value} />
            </ListItemButton>
          );
        })}
      </List>
    </Card>
  );

  return (
    <div style={{ padding: "20px", margin: "20px auto", maxWidth: "1000px" }}>
      {/* User Information Header */}
      <Card style={{ marginBottom: "20px" }}>
        <CardContent>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <Avatar
              src={userData?.employee_photo || "/default-avatar.png"}
              alt={userData?.username}
              style={{ width: "80px", height: "80px" }}
            />
            <div>
              <Typography variant="h5" gutterBottom>
                {userData?.username}
              </Typography>
              <Typography variant="body1" color="textSecondary">
                Role: {userData?.role}
              </Typography>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfer List Interface */}
      <Grid container spacing={2} justifyContent="center" alignItems="center">
        <Grid item>{customList("Available Importers", left)}</Grid>
        <Grid item>
          <Grid container direction="column" alignItems="center">
            <Button
              sx={{ my: 0.5 }}
              variant="outlined"
              size="small"
              onClick={handleAssignImporter}
              disabled={leftChecked?.length === 0 || loading}
              aria-label="move selected right"
            >
              &gt;
            </Button>
            <Button
              sx={{ my: 0.5 }}
              variant="outlined"
              size="small"
              onClick={handleUnassignImporter}
              disabled={rightChecked?.length === 0 || loading}
              aria-label="move selected left"
            >
              &lt;
            </Button>
          </Grid>
        </Grid>
        <Grid item>{customList("Assigned Importers", right)}</Grid>
      </Grid>

      {/* Save and Close buttons removed. Saving is automatic on assign/unassign. */}

      {/* Snackbar for Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.type}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

// PropTypes for type checking
UserDetails.propTypes = {
  selectedUser: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      username: PropTypes.string.isRequired,
      role: PropTypes.string.isRequired,
      employee_photo: PropTypes.string,
      assigned_importer_name: PropTypes.arrayOf(PropTypes.string),
    }),
  ]),
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func,
};

// Default props in case they are not provided
UserDetails.defaultProps = {
  selectedUser: null,
  onSave: null,
};

export default UserDetails;
