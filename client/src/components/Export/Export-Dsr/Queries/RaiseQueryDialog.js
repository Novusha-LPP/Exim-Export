import React, { useState, useContext } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import { UserContext } from "../../../../contexts/UserContext";

const MODULE_OPTIONS = [
  { value: "export-operation", label: "Operations" },
  { value: "export-dsr", label: "Export DSR / Jobs" },
  { value: "export-documentation", label: "Documentation" },
  { value: "export-esanchit", label: "E-Sanchit" },
  { value: "export-charges", label: "Charges" },
];

const RaiseQueryDialog = ({ open, onClose, job, onQueryRaised }) => {
  const { user } = useContext(UserContext);
  const [targetModule, setTargetModule] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Determine the current module from URL
  const pathname = window.location.pathname;
  const currentModule = pathname.startsWith("/export-operation")
    ? "export-operation"
    : pathname.startsWith("/export-documentation")
    ? "export-documentation"
    : pathname.startsWith("/export-esanchit")
    ? "export-esanchit"
    : pathname.startsWith("/export-charges")
    ? "export-charges"
    : "export-dsr";

  // Filter out current module from target options
  const filteredModuleOptions = MODULE_OPTIONS.filter(
    (m) => m.value !== currentModule
  );

  const handleSubmit = async () => {
    if (!targetModule || !message) {
      setError("Please select a module and enter your message.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        job_no: job?.job_no || "",
        job_id: job?._id || "",
        fieldName: "general",
        fieldLabel: "General",
        raisedBy: user?.username || "unknown",
        raisedByName: user?.fullName || user?.username || "Unknown",
        raisedFromModule: currentModule,
        targetModule,
        subject: `Query for ${job?.job_no || "Job"}`,
        message,
      };

      await axios.post(`${import.meta.env.VITE_API_STRING}/queries`, payload);

      // Reset form
      setTargetModule("");
      setMessage("");
      setError("");

      if (onQueryRaised) onQueryRaised();
      onClose();
    } catch (err) {
      console.error("Error raising query:", err);
      setError(err.response?.data?.message || "Failed to raise query. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "6px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #e5e7eb",
          py: 1.5,
          px: 2,
          backgroundColor: "#fff",
          color: "#111",
        }}
      >
        <div>
          <div style={{ fontSize: "15px", fontWeight: 700 }}>Raise Query</div>
          {job?.job_no && (
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "1px" }}>
              Job: {job.job_no}
            </div>
          )}
        </div>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{ color: "#6b7280" }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 2, px: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: "12px" }}>
            {error}
          </Alert>
        )}

        <FormControl size="small" fullWidth sx={{ mt: 1, mb: 2 }}>
          <InputLabel sx={{ fontSize: "13px" }}>Send Query To *</InputLabel>
          <Select
            value={targetModule}
            onChange={(e) => setTargetModule(e.target.value)}
            label="Send Query To *"
            sx={{ fontSize: "13px" }}
          >
            {filteredModuleOptions.map((m) => (
              <MenuItem key={m.value} value={m.value} sx={{ fontSize: "13px" }}>
                {m.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Message / Description *"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          fullWidth
          multiline
          rows={3}
          size="small"
          sx={{ "& .MuiInputBase-root": { fontSize: "13px" } }}
          InputLabelProps={{ sx: { fontSize: "13px" } }}
          placeholder="Describe what needs to be changed and why..."
        />
      </DialogContent>

      <DialogActions
        sx={{
          borderTop: "1px solid #e5e7eb",
          px: 2,
          py: 1.5,
          backgroundColor: "#f9fafb",
        }}
      >
        <Button
          onClick={handleClose}
          variant="outlined"
          size="small"
          sx={{
            textTransform: "none",
            fontSize: "12px",
            borderColor: "#d1d5db",
            color: "#374151",
            "&:hover": { borderColor: "#9ca3af", background: "#f3f4f6" },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          size="small"
          disabled={loading}
          sx={{
            textTransform: "none",
            fontSize: "12px",
            backgroundColor: "#2563eb",
            "&:hover": { backgroundColor: "#1d4ed8" },
            "&.Mui-disabled": { backgroundColor: "#93c5fd" },
          }}
        >
          {loading ? "Sending..." : "Raise Query"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RaiseQueryDialog;
