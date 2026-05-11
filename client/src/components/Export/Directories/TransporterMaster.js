import React, { useState, useEffect } from "react";
import {
  Container, Paper, Typography, Button, Box, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogContent, TextField, InputAdornment, Chip, Snackbar, Alert
} from "@mui/material";
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Search as SearchIcon, Business as BusinessIcon
} from "@mui/icons-material";
import { TransporterService } from "./MasterDirectoryService";
import MasterDirectoryForm from "./MasterDirectoryForm";

const TransporterMaster = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => { fetchItems(); }, []);

  useEffect(() => {
    const filtered = data.filter(item => 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredData(filtered);
  }, [searchTerm, data]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await TransporterService.getAll();
      setData(res.data || res);
    } catch (err) {
      showSnackbar("Error fetching data", "error");
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = "success") => setSnackbar({ open: true, message, severity });

  const handleSave = async (formData) => {
    try {
      if (selectedItem) {
        await TransporterService.update(selectedItem._id, formData);
        showSnackbar("Updated successfully");
      } else {
        await TransporterService.create(formData);
        showSnackbar("Created successfully");
      }
      setOpenDialog(false);
      fetchItems();
    } catch (err) {
      showSnackbar("Error saving: " + (err.message || "Unknown error"), "error");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this entry?")) {
      try {
        await TransporterService.delete(id);
        showSnackbar("Deleted successfully");
        fetchItems();
      } catch (err) {
        showSnackbar("Error deleting", "error");
      }
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextField
          size="small" placeholder="Search Transporters..."
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          sx={{ width: 300 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setSelectedItem(null); setOpenDialog(true); }}>
          Add Transporter
        </Button>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Active</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Branches</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>TDS %</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} align="center">Loading...</TableCell></TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center">No data found</TableCell></TableRow>
            ) : (
              filteredData.map((item) => (
                <TableRow key={item._id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{item.name}</TableCell>
                  <TableCell>
                    <Chip label={item.active} size="small" color={item.active === "Yes" ? "success" : "default"} />
                  </TableCell>
                  <TableCell>{item.branches?.length || 0}</TableCell>
                  <TableCell>{item.tds_percent}%</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="primary" onClick={() => { setSelectedItem(item); setOpenDialog(true); }}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(item._id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogContent sx={{ p: 0 }}>
          <MasterDirectoryForm 
            title={selectedItem ? "Edit Transporter" : "Add Transporter"}
            data={selectedItem} 
            onSave={handleSave} 
            onCancel={() => setOpenDialog(false)} 
          />
        </DialogContent>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default TransporterMaster;
