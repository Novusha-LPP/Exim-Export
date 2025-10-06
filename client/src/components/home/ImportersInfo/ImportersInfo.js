import React, { useEffect, useState } from "react";
import axios from "axios";
import { Row, Col } from "react-bootstrap";
import {
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Snackbar,
  Alert,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";

const ImportersInfo = () => {
  const [importers, setImporters] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    email: "",
    address: "",
  });
  const [editingImporter, setEditingImporter] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedImporterId, setSelectedImporterId] = useState(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success", // 'success', 'error', 'info', 'warning'
  });

  // Fetch all importers
  useEffect(() => {
    fetchImporters();
  }, []);

  const fetchImporters = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_STRING}/importers`
      );
      setImporters(res.data.importers);
    } catch (error) {
      console.error("Error fetching importers:", error);
    }
  };

  // Handle form changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Create or Update importer
  const handleSubmit = async () => {
    try {
      if (editingImporter) {
        // Update
        const res = await axios.patch(
          `${import.meta.env.VITE_API_STRING}/importers/${editingImporter._id}`,
          formData
        );

        // Update the importers list dynamically
        setImporters((prev) =>
          prev.map((importer) =>
            importer._id === editingImporter._id ? res.data.importer : importer
          )
        );

        // Show success message
        setSnackbar({
          open: true,
          message: `Importer "${formData.name}" updated successfully!`,
          severity: "success",
        });
      } else {
        // Create
        const res = await axios.post(
          `${import.meta.env.VITE_API_STRING}/importers`,
          formData
        );

        // Add the new importer dynamically
        setImporters((prev) => [...prev, res.data.importer]);

        // Show success message
        setSnackbar({
          open: true,
          message: `Importer "${formData.name}" added successfully!`,
          severity: "success",
        });
      }

      // Reset the form
      setFormData({ name: "", contact: "", email: "", address: "" });
      setEditingImporter(null);
    } catch (error) {
      console.error("Error saving importer:", error);

      // Handle specific error messages
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        setSnackbar({
          open: true,
          message: `Error: ${error.response.data.message}`,
          severity: "error",
        });
      } else {
        setSnackbar({
          open: true,
          message: "Failed to save importer. Please try again.",
          severity: "error",
        });
      }
    }
  };

  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (id) => {
    setSelectedImporterId(id);
    setOpenDeleteDialog(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setSelectedImporterId(null);
    setOpenDeleteDialog(false);
  };

  // Delete importer
  const handleDelete = async () => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_STRING}/importers/${selectedImporterId}`
      );
      setImporters((prev) =>
        prev.filter((importer) => importer._id !== selectedImporterId)
      );

      // Show success message
      setSnackbar({
        open: true,
        message: "Importer deleted successfully!",
        severity: "success",
      });

      handleCloseDeleteDialog();
    } catch (error) {
      console.error("Error deleting importer:", error);
      setSnackbar({
        open: true,
        message: "Failed to delete importer. Please try again.",
        severity: "error",
      });
    }
  };

  // Set importer for editing
  const handleEdit = (importer) => {
    setFormData(importer);
    setEditingImporter(importer);
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <div>
      <div className="job-details-container">
        <h3>{editingImporter ? "Edit Importer" : "Add Importer"}</h3>
        <br />
        <Row style={{ marginBottom: "20px" }}>
          <Col xs={12} lg={4}>
            <div style={{ marginBottom: "20px" }}>
              <TextField
                name="name"
                label="Name"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <TextField
                name="contact"
                label="Contact"
                value={formData.contact}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <TextField
                name="email"
                label="Email"
                value={formData.email}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <TextField
                name="address"
                label="Address"
                value={formData.address}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                style={{ marginTop: "10px" }}
              >
                {editingImporter ? "Update Importer" : "Add Importer"}
              </Button>
            </div>
          </Col>
          <Col xs={12} lg={8}>
            <h3>Importers List</h3>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {importers.map((importer) => (
                  <TableRow key={importer._id}>
                    <TableCell>{importer.name}</TableCell>
                    <TableCell>{importer.contact}</TableCell>
                    <TableCell>{importer.email}</TableCell>
                    <TableCell>{importer.address}</TableCell>
                    <TableCell>
                      <IconButton
                        color="primary"
                        onClick={() => handleEdit(importer)}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleOpenDeleteDialog(importer._id)}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Col>
        </Row>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">Delete Importer</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this importer? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for Feedback Messages */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default ImportersInfo;
