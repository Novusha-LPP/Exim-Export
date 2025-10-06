import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  Paper,
} from "@mui/material";

const API_BASE = import.meta.env.VITE_API_STRING;

function Handover() {
  const [formData, setFormData] = useState({
    exportJobId: "",
    shippingBillNumber: "",
    handoverType: "MANUAL",
    documentType: "",
    handoverDateTime: "",
    recipientName: "",
    remarks: "",
  });
  const [handovers, setHandovers] = useState([]);
  const [message, setMessage] = useState("");

  const fetchHandovers = async () => {
    try {
      const res = await fetch(`${API_BASE}/handover`);
      const data = await res.json();
      setHandovers(data);
    } catch {
      setMessage("Error fetching handovers");
    }
  };

  useEffect(() => {
    fetchHandovers();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/handover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (res.ok) {
        setMessage("Handover logged successfully");
        fetchHandovers();
        setFormData({
          exportJobId: "",
          shippingBillNumber: "",
          handoverType: "MANUAL",
          documentType: "",
          handoverDateTime: "",
          recipientName: "",
          remarks: "",
        });
      } else {
        setMessage(result.error || "Submission failed");
      }
    } catch {
      setMessage("Error submitting data");
    }
  };

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 4, mt: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Export Handover Logging
        </Typography>
        <Box
          component="form"
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          onSubmit={handleSubmit}
        >
          <TextField
            label="Export Job ID"
            name="exportJobId"
            required
            value={formData.exportJobId}
            onChange={handleChange}
          />
          <TextField
            label="Shipping Bill Number"
            name="shippingBillNumber"
            required
            value={formData.shippingBillNumber}
            onChange={handleChange}
          />
          <FormControl>
            <InputLabel id="handover-type-label">Handover Type</InputLabel>
            <Select
              labelId="handover-type-label"
              name="handoverType"
              value={formData.handoverType}
              label="Handover Type"
              onChange={handleChange}
              required
            >
              <MenuItem value="MANUAL">Manual</MenuItem>
              <MenuItem value="AUTOMATED">Automated</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Document Type"
            name="documentType"
            required
            value={formData.documentType}
            onChange={handleChange}
          />
          <TextField
            label="Handover Date & Time"
            name="handoverDateTime"
            type="datetime-local"
            required
            value={formData.handoverDateTime}
            onChange={handleChange}
            InputLabelProps={{
              shrink: true,
            }}
          />
          <TextField
            label="Recipient Name"
            name="recipientName"
            required
            value={formData.recipientName}
            onChange={handleChange}
          />
          <TextField
            label="Remarks"
            name="remarks"
            multiline
            minRows={2}
            value={formData.remarks}
            onChange={handleChange}
          />
          <Button type="submit" variant="contained" color="primary">
            Submit
          </Button>
          {message && (
            <Alert
              severity={message.includes("successfully") ? "success" : "error"}
              sx={{ mt: 2 }}
            >
              {message}
            </Alert>
          )}
        </Box>
      </Paper>
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Handover Records
        </Typography>
        <List>
          {handovers.map((h) => (
            <ListItem key={h._id} divider>
              <ListItemText
                primary={`${h.exportJobId} - ${h.shippingBillNumber} - ${h.handoverType}`}
                secondary={`Date: ${
                  h.handoverDateTime
                    ? new Date(h.handoverDateTime).toLocaleString()
                    : ""
                }
                  | Recipient: ${h.recipientName}
                  | Status: ${h.status}`}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Container>
  );
}

export default Handover;
