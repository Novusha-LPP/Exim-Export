import React from "react";
import { Box, Button } from "@mui/material";

const ExportJobFooter = ({ onUpdate, onClose, loading = false }) => {
  return (
    <Box
      sx={{
        px: 3,
        pb: 3,
        display: "flex",
        gap: 2,
        justifyContent: "flex-end",
      }}
    >
      <Button
        variant="contained"
        onClick={onUpdate}
        disabled={loading}
        sx={{
          position: "fixed",
          bottom: 25,
          right: 30,
          zIndex: 2000,
          minWidth: 110,
          backgroundColor: "#1565c0",
          color: "#fff",
          fontWeight: "bold",
          borderRadius: "30px",
          padding: "5px 20px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
          "&:hover": {
            backgroundColor: "#0d47a1",
            boxShadow: "0 6px 25px rgba(0,0,0,0.35)",
          },
        }}
      >
        Update Job
      </Button>
      <Button
        variant="contained"
        onClick={onClose}
        disabled={loading}
        sx={{
          position: "fixed",
          bottom: 25,
          right: 195,
          zIndex: 2000,
          minWidth: 110,
          backgroundColor: "#fff",
          color: "#d32f2f",
          border: "1px solid #d32f2f",
          fontWeight: "bold",
          borderRadius: "30px",
          padding: "5px 20px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.20)",
          "&:hover": {
            backgroundColor: "#fff5f5",
            boxShadow: "0 6px 25px rgba(0,0,0,0.30)",
          },
        }}
      >
        Close
      </Button>
    </Box>
  );
};

export default ExportJobFooter;
