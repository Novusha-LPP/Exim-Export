import React, { useState, useEffect } from "react";
import {
  Paper, Typography, Button, Box, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, InputAdornment, Snackbar, Alert,
  Pagination
} from "@mui/material";
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Search as SearchIcon
} from "@mui/icons-material";
import { DrawbackService } from "./MasterDirectoryService";

const DrawbackDirectory = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    chapter: "",
    tariff_item: "",
    description_of_goods: "",
    unit: "",
    drawback_rate: "",
    drawback_cap: ""
  });
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    fetchItems();
  }, [page, searchTerm]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await DrawbackService.getAll({
        page,
        limit: 10,
        search: searchTerm
      });
      setData(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalRecords(res.pagination?.totalRecords || 0);
    } catch (err) {
      showSnackbar("Error fetching data", "error");
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = "success") => setSnackbar({ open: true, message, severity });

  const handleOpenAdd = () => {
    setSelectedItem(null);
    setFormData({
      chapter: "",
      tariff_item: "",
      description_of_goods: "",
      unit: "",
      drawback_rate: "",
      drawback_cap: ""
    });
    setErrors({});
    setOpenDialog(true);
  };

  const handleOpenEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      chapter: item.chapter || "",
      tariff_item: item.tariff_item || "",
      description_of_goods: item.description_of_goods || "",
      unit: item.unit || "",
      drawback_rate: item.drawback_rate || "",
      drawback_cap: item.drawback_cap || ""
    });
    setErrors({});
    setOpenDialog(true);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.chapter) newErrors.chapter = "Chapter is required";
    if (!formData.tariff_item) newErrors.tariff_item = "Tariff Item is required";
    if (!formData.description_of_goods) newErrors.description_of_goods = "Description of goods is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    try {
      if (selectedItem) {
        await DrawbackService.update(selectedItem._id, formData);
        showSnackbar("Updated drawback successfully");
      } else {
        await DrawbackService.create(formData);
        showSnackbar("Created drawback successfully");
      }
      setOpenDialog(false);
      fetchItems();
    } catch (err) {
      showSnackbar("Error saving drawback: " + (err.message || "Unknown error"), "error");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this drawback entry?")) {
      try {
        await DrawbackService.delete(id);
        showSnackbar("Deleted drawback successfully");
        fetchItems();
      } catch (err) {
        showSnackbar("Error deleting drawback", "error");
      }
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextField
          size="small" placeholder="Search Drawbacks..."
          value={searchTerm} 
          onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
          sx={{ width: 300 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
          Add Drawback
        </Button>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>Chapter</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Tariff Item</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '40%' }}>Description of Goods</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>Unit</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>Drawback Rate</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>Drawback Cap</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', width: '10%' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} align="center">Loading...</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center">No drawbacks found</TableCell></TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item._id} hover>
                  <TableCell>{item.chapter}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{item.tariff_item}</TableCell>
                  <TableCell>{item.description_of_goods}</TableCell>
                  <TableCell>{item.unit || "-"}</TableCell>
                  <TableCell>{item.drawback_rate || "-"}</TableCell>
                  <TableCell>{item.drawback_cap || "-"}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="primary" onClick={() => handleOpenEdit(item)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(item._id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box display="flex" justifyContent="center" alignItems="center" mt={2} mb={2}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(event, value) => setPage(value)}
          color="primary"
          showFirstButton
          showLastButton
        />
      </Box>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedItem ? "Edit Drawback" : "Add Drawback"}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            size="small"
            label="Chapter"
            value={formData.chapter}
            onChange={e => setFormData({ ...formData, chapter: e.target.value })}
            error={!!errors.chapter}
            helperText={errors.chapter}
            fullWidth
            required
          />
          <TextField
            size="small"
            label="Tariff Item"
            value={formData.tariff_item}
            onChange={e => setFormData({ ...formData, tariff_item: e.target.value })}
            error={!!errors.tariff_item}
            helperText={errors.tariff_item}
            fullWidth
            required
          />
          <TextField
            size="small"
            label="Description of Goods"
            multiline
            rows={3}
            value={formData.description_of_goods}
            onChange={e => setFormData({ ...formData, description_of_goods: e.target.value })}
            error={!!errors.description_of_goods}
            helperText={errors.description_of_goods}
            fullWidth
            required
          />
          <TextField
            size="small"
            label="Unit"
            value={formData.unit}
            onChange={e => setFormData({ ...formData, unit: e.target.value })}
            fullWidth
          />
          <TextField
            size="small"
            label="Drawback Rate"
            value={formData.drawback_rate}
            onChange={e => setFormData({ ...formData, drawback_rate: e.target.value })}
            fullWidth
          />
          <TextField
            size="small"
            label="Drawback Cap"
            value={formData.drawback_cap}
            onChange={e => setFormData({ ...formData, drawback_cap: e.target.value })}
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default DrawbackDirectory;
