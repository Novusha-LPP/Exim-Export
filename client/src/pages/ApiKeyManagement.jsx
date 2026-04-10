import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Button,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Chip,
  DialogContentText
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

const API_BASE = import.meta.env.VITE_API_STRING || "/api";

function ApiKeyManagement() {
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [visibleKeys, setVisibleKeys] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/api-keys`, {
        withCredentials: true
      });
      setApiKeys(response.data || []);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      showSnackbar("Failed to fetch API keys", "error");
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const toggleKeyVisibility = (id) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      showSnackbar("Key Name is required", "warning");
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE}/admin/api-keys`,
        { name: newKeyName },
        { withCredentials: true }
      );
      setGeneratedKey(response.data);
      setSuccessDialogOpen(true);
      setNewKeyName("");
      fetchApiKeys();
    } catch (error) {
      showSnackbar(error.response?.data?.error || "Error generating API key", "error");
    }
  };

  const handleToggleClick = (key) => {
    setToggleTarget(key);
    setConfirmDialogOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (!toggleTarget) return;
    const action = toggleTarget.isActive !== false ? "deactivate" : "activate";

    try {
      await axios.patch(`${API_BASE}/admin/api-keys/${toggleTarget._id}/toggle`, {}, {
        withCredentials: true
      });
      showSnackbar(`API Key ${action}d successfully`, "success");
      setConfirmDialogOpen(false);
      setToggleTarget(null);
      fetchApiKeys();
    } catch (error) {
      showSnackbar(`Error ${action}ing API key`, "error");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showSnackbar("Copied to clipboard!", "success");
  };

  const getCreatorName = (key) => {
    if (key.createdBy && typeof key.createdBy === 'object') {
        const { first_name, last_name, username } = key.createdBy;
        if (first_name || last_name) {
            return `${first_name || ""} ${last_name || ""}`.trim();
        }
        return username || "Unknown";
    }
    return key.createdBy || "Admin"; // Fallback for legacy keys
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#1a237e' }}>
        API Key Management
      </Typography>

      <Paper sx={{ p: 3, mb: 4, borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Typography variant="h6" gutterBottom color="primary" sx={{ fontWeight: 600 }}>
          Generate New API Key
        </Typography>
        <form onSubmit={handleCreateKey}>
          <Box display="flex" alignItems="center" gap={2}>
            <TextField
              label="Key Name (e.g., Tally Integration)"
              variant="outlined"
              size="small"
              fullWidth
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
            />
            <Button 
                type="submit" 
                variant="contained" 
                color="primary" 
                sx={{ whiteSpace: 'nowrap', borderRadius: '8px', px: 4, bgcolor: '#1a237e' }}
            >
              Generate Key
            </Button>
          </Box>
        </form>
      </Paper>

      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        API Keys
      </Typography>
      <TableContainer component={Paper} sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: "#f8f9fa" }}>
            <TableRow>
              <TableCell><strong>Key Name</strong></TableCell>
              <TableCell><strong>Secret Key</strong></TableCell>
              <TableCell><strong>Created By</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Created At</strong></TableCell>
              <TableCell><strong>Last Used</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {apiKeys.map((key) => (
              <TableRow key={key._id} sx={{ '&:hover': { bgcolor: '#fcfcff' }, opacity: key.isActive === false ? 0.6 : 1 }}>
                <TableCell sx={{ fontWeight: 600 }}>{key.name}</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', letterSpacing: 1, color: visibleKeys[key._id] ? 'inherit' : '#aaa' }}>
                      {visibleKeys[key._id] ? key.key : '••••••••••••••••'}
                    </Typography>
                    <IconButton size="small" onClick={() => toggleKeyVisibility(key._id)}>
                      {visibleKeys[key._id] ? <VisibilityOffIcon fontSize="inherit" /> : <VisibilityIcon fontSize="inherit" />}
                    </IconButton>
                    {visibleKeys[key._id] && (
                      <IconButton size="small" onClick={() => copyToClipboard(key.key)}>
                        <ContentCopyIcon fontSize="inherit" />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
                <TableCell>{getCreatorName(key)}</TableCell>
                <TableCell>
                    <Chip 
                        label={key.isActive !== false ? "Active" : "Inactive"} 
                        color={key.isActive !== false ? "success" : "default"} 
                        size="small" 
                        sx={{ fontWeight: 600, borderRadius: '6px' }}
                    />
                </TableCell>
                <TableCell>{new Date(key.createdAt).toLocaleString()}</TableCell>
                <TableCell>
                  {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never Used"}
                </TableCell>
                <TableCell align="center">
                  <Tooltip title={key.isActive !== false ? "Deactivate Key" : "Activate Key"}>
                    <IconButton 
                        size="small" 
                        onClick={() => handleToggleClick(key)} 
                        color={key.isActive !== false ? "warning" : "success"}
                    >
                      {key.isActive !== false ? <ToggleOnIcon fontSize="large" /> : <ToggleOffIcon fontSize="large" />}
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {apiKeys.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#999' }}>
                  No API keys found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Confirmation Dialog */}
      <Dialog 
        open={confirmDialogOpen} 
        onClose={() => setConfirmDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
            {toggleTarget?.isActive === false ? "Activate API Key?" : "Deactivate API Key?"}
        </DialogTitle>
        <DialogContent>
            <DialogContentText>
                Are you sure you want to {toggleTarget?.isActive === false ? "activate" : "deactivate"} the API key for <strong>{toggleTarget?.name}</strong>?
            </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setConfirmDialogOpen(false)} color="inherit">Cancel</Button>
            <Button 
                onClick={handleConfirmToggle} 
                variant="contained" 
                color={toggleTarget?.isActive === false ? "success" : "warning"}
                sx={{ borderRadius: '8px', px: 3 }}
            >
                Confirm {toggleTarget?.isActive === false ? "Activation" : "Deactivation"}
            </Button>
        </DialogActions>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onClose={() => setSuccessDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>New API Key Generated</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: '8px' }}>
            Please copy and store this key securely. It will <strong>NOT</strong> be displayed again.
          </Alert>
          <Box
            p={2}
            bgcolor="#f5f5f5"
            borderRadius={2}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            sx={{ wordBreak: 'break-all', border: '1px dashed #ccc' }}
          >
            <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: 1 }}>
              {generatedKey?.key}
            </Typography>
            <IconButton onClick={() => copyToClipboard(generatedKey?.key)} color="primary">
              <ContentCopyIcon />
            </IconButton>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSuccessDialogOpen(false)} variant="contained" color="primary" sx={{ borderRadius: '8px', px: 4, bgcolor: '#1a237e' }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%", borderRadius: '8px' }} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ApiKeyManagement;
