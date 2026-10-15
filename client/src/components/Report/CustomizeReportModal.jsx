import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Button,
  IconButton,
  Checkbox,
  Chip,
  TextField,
  Divider,
  Paper,
  Tooltip,
  InputAdornment,
  Grid,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import BusinessIcon from "@mui/icons-material/Business";
import ListAltIcon from "@mui/icons-material/ListAlt";

const CATEGORIES = [
  "All",
  "General",
  "Product & Customs",
  "Incentives & DBK",
  "Containers",
  "Commercial",
  "Logistics",
];

export const CustomizeReportModal = ({
  open,
  onClose,
  allColumns = [],
  currentColumns = [],
  defaultColumns = [],
  viewMode = "jobWise",
  onApply,
}) => {
  const [selectedKeys, setSelectedKeys] = useState(() =>
    currentColumns.map((c) => c.key)
  );
  const [orderedKeys, setOrderedKeys] = useState(() => {
    const active = currentColumns.map((c) => c.key);
    const remaining = allColumns
      .map((c) => c.key)
      .filter((k) => !active.includes(k));
    return [...active, ...remaining];
  });
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [tempViewMode, setTempViewMode] = useState(viewMode);

  // Sync state when dialog opens
  React.useEffect(() => {
    if (open) {
      const active = currentColumns.map((c) => c.key);
      setSelectedKeys(active);
      const remaining = allColumns
        .map((c) => c.key)
        .filter((k) => !active.includes(k));
      setOrderedKeys([...active, ...remaining]);
      setTempViewMode(viewMode);
      setSearchQuery("");
      setActiveCategory("All");
    }
  }, [open, currentColumns, allColumns, viewMode]);

  const columnMap = useMemo(() => {
    return new Map(allColumns.map((c) => [c.key, c]));
  }, [allColumns]);

  const filteredOrderedColumns = useMemo(() => {
    return orderedKeys
      .map((k) => columnMap.get(k))
      .filter(Boolean)
      .filter((col) => {
        if (activeCategory !== "All" && col.category !== activeCategory) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const normalizedQ = q.replace(/rodtap/g, "rodtep").replace(/drawback/g, "dbk");
          const targetText = `${col.label} ${col.key} ${col.category || ""}`.toLowerCase();
          const normalizedTarget = targetText.replace(/rodtep/g, "rodtap").replace(/dbk/g, "drawback");
          return (
            targetText.includes(q) ||
            targetText.includes(normalizedQ) ||
            normalizedTarget.includes(q)
          );
        }
        return true;
      });
  }, [orderedKeys, columnMap, activeCategory, searchQuery]);

  const handleToggleColumn = (key) => {
    setSelectedKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev; // Keep at least one column
        return prev.filter((k) => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  const handleMoveUp = (key, e) => {
    e.stopPropagation();
    setOrderedKeys((prev) => {
      const idx = prev.indexOf(key);
      if (idx <= 0) return prev;
      const copy = [...prev];
      const temp = copy[idx - 1];
      copy[idx - 1] = copy[idx];
      copy[idx] = temp;
      return copy;
    });
  };

  const handleMoveDown = (key, e) => {
    e.stopPropagation();
    setOrderedKeys((prev) => {
      const idx = prev.indexOf(key);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const copy = [...prev];
      const temp = copy[idx + 1];
      copy[idx + 1] = copy[idx];
      copy[idx] = temp;
      return copy;
    });
  };

  const handleResetDefault = () => {
    const defaultKeys = defaultColumns.map((c) => c.key);
    setSelectedKeys(defaultKeys);
    const remaining = allColumns
      .map((c) => c.key)
      .filter((k) => !defaultKeys.includes(k));
    setOrderedKeys([...defaultKeys, ...remaining]);
    setTempViewMode("jobWise");
  };

  const handleSelectAll = () => {
    setSelectedKeys(allColumns.map((c) => c.key));
  };

  const handleSaveAndApply = () => {
    // Generate ordered list of selected columns
    const finalCols = orderedKeys
      .filter((k) => selectedKeys.includes(k))
      .map((k) => columnMap.get(k))
      .filter(Boolean);

    onApply(finalCols, tempViewMode);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2.5,
          overflow: "hidden",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        },
      }}
    >
      {/* Modal Header */}
      <DialogTitle
        sx={{
          bgcolor: "#0f172a",
          color: "white",
          px: 3,
          py: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <ViewColumnIcon sx={{ color: "#38bdf8" }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
              Customize Report Columns & Layout
            </Typography>
            <Typography variant="caption" sx={{ color: "#94a3b8" }}>
              Select columns, rearrange order, or switch between Job-wise and Party-wise views
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "#94a3b8", "&:hover": { color: "#fff" } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, bgcolor: "#f8fafc" }}>
        {/* 1. View Mode Selection */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e293b", mb: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
          <CheckCircleIcon sx={{ fontSize: 18, color: "#0284c7" }} />
          Report Presentation Mode:
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <Paper
              elevation={tempViewMode === "jobWise" ? 3 : 1}
              onClick={() => setTempViewMode("jobWise")}
              sx={{
                p: 2,
                borderRadius: 2,
                cursor: "pointer",
                border: tempViewMode === "jobWise" ? "2px solid #0284c7" : "1px solid #cbd5e1",
                bgcolor: tempViewMode === "jobWise" ? "#f0f9ff" : "white",
                transition: "all 0.2s ease",
                "&:hover": { borderColor: "#0284c7", transform: "translateY(-1px)" },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
                <ListAltIcon sx={{ color: tempViewMode === "jobWise" ? "#0284c7" : "#64748b" }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                  Job-Wise Report (Standard)
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                Displays every Shipping Bill / Job individually row-by-row with your customized fields.
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Paper
              elevation={tempViewMode === "partyWise" ? 3 : 1}
              onClick={() => setTempViewMode("partyWise")}
              sx={{
                p: 2,
                borderRadius: 2,
                cursor: "pointer",
                border: tempViewMode === "partyWise" ? "2px solid #0284c7" : "1px solid #cbd5e1",
                bgcolor: tempViewMode === "partyWise" ? "#f0f9ff" : "white",
                transition: "all 0.2s ease",
                "&:hover": { borderColor: "#0284c7", transform: "translateY(-1px)" },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
                <BusinessIcon sx={{ color: tempViewMode === "partyWise" ? "#0284c7" : "#64748b" }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                  Party-Wise Report (Grouped by Exporter)
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                Groups by Party showing total SBs, containers & TEUs with expandable drill-down into all SBs for each party.
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* 2. Column Selection & Ordering */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 1 }}>
            <ViewColumnIcon sx={{ fontSize: 18, color: "#0284c7" }} />
            Select & Reorder Report Fields ({selectedKeys.length} of {allColumns.length} Active):
          </Typography>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" variant="text" onClick={handleResetDefault} startIcon={<RestartAltIcon fontSize="small" />} sx={{ textTransform: "none", fontSize: "0.75rem", color: "#64748b" }}>
              Reset Default
            </Button>
            <Button size="small" variant="text" onClick={handleSelectAll} sx={{ textTransform: "none", fontSize: "0.75rem", color: "#0284c7" }}>
              Select All
            </Button>
          </Box>
        </Box>

        {/* Search and Category Filter Chips */}
        <Box sx={{ display: "flex", gap: 1.5, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
          <TextField
            size="small"
            placeholder="Search column (e.g. HSN, Container, Value)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: "#94a3b8" }} />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 220, bgcolor: "white", borderRadius: 1 }}
          />

          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
            {CATEGORIES.map((cat) => (
              <Chip
                key={cat}
                label={cat}
                size="small"
                clickable
                color={activeCategory === cat ? "primary" : "default"}
                onClick={() => setActiveCategory(cat)}
                sx={{
                  fontWeight: activeCategory === cat ? 700 : 500,
                  fontSize: "0.72rem",
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Column Items Grid */}
        <Box
          sx={{
            maxHeight: 340,
            overflowY: "auto",
            p: 1,
            bgcolor: "white",
            borderRadius: 2,
            border: "1px solid #e2e8f0",
          }}
        >
          {filteredOrderedColumns.map((col, idx) => {
            const isSelected = selectedKeys.includes(col.key);
            const isFirst = idx === 0;
            const isLast = idx === filteredOrderedColumns.length - 1;

            return (
              <Paper
                key={col.key}
                elevation={0}
                onClick={() => handleToggleColumn(col.key)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 1,
                  px: 1.5,
                  mb: 0.8,
                  borderRadius: 1.5,
                  cursor: "pointer",
                  bgcolor: isSelected ? "#f8fafc" : "#fafafa",
                  border: isSelected ? "1px solid #cbd5e1" : "1px dashed #e2e8f0",
                  transition: "all 0.15s ease",
                  "&:hover": { bgcolor: "#f1f5f9", borderColor: "#94a3b8" },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Checkbox
                    checked={isSelected}
                    size="small"
                    sx={{ p: 0.5, color: "#94a3b8", "&.Mui-checked": { color: "#0284c7" } }}
                  />
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? "#0f172a" : "#64748b",
                        fontSize: "0.82rem",
                      }}
                    >
                      {col.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: "0.68rem" }}>
                      Key: {col.key}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Chip
                    label={col.category}
                    size="small"
                    sx={{
                      fontSize: "0.65rem",
                      height: 20,
                      bgcolor:
                        col.category === "Incentives & DBK"
                          ? "#e0f2fe"
                          : col.category === "Product & Customs"
                          ? "#fef3c7"
                          : col.category === "Commercial"
                          ? "#dcfce7"
                          : col.category === "Containers"
                          ? "#e0e7ff"
                          : "#f1f5f9",
                      color:
                        col.category === "Incentives & DBK"
                          ? "#0369a1"
                          : col.category === "Product & Customs"
                          ? "#92400e"
                          : col.category === "Commercial"
                          ? "#166534"
                          : col.category === "Containers"
                          ? "#3730a3"
                          : "#475569",
                      fontWeight: 600,
                    }}
                  />

                  {/* Reorder Buttons */}
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Tooltip title="Move column left / up">
                      <span>
                        <IconButton
                          size="small"
                          disabled={isFirst}
                          onClick={(e) => handleMoveUp(col.key, e)}
                          sx={{ p: 0.5 }}
                        >
                          <ArrowUpwardIcon fontSize="inherit" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Move column right / down">
                      <span>
                        <IconButton
                          size="small"
                          disabled={isLast}
                          onClick={(e) => handleMoveDown(col.key, e)}
                          sx={{ p: 0.5 }}
                        >
                          <ArrowDownwardIcon fontSize="inherit" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </Box>
              </Paper>
            );
          })}
        </Box>
      </DialogContent>

      {/* Modal Actions */}
      <DialogActions sx={{ p: 2, px: 3, bgcolor: "#fff", borderTop: "1px solid #e2e8f0", justifyContent: "space-between" }}>
        <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500 }}>
          {selectedKeys.length} column{selectedKeys.length > 1 ? "s" : ""} selected • Mode: {tempViewMode === "partyWise" ? "Party-Wise" : "Job-Wise"}
        </Typography>

        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button onClick={onClose} sx={{ color: "#64748b", textTransform: "none", fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveAndApply}
            sx={{
              bgcolor: "#0284c7",
              fontWeight: 700,
              textTransform: "none",
              px: 3,
              borderRadius: 2,
              boxShadow: "0 4px 12px rgba(2, 132, 199, 0.3)",
              "&:hover": { bgcolor: "#0369a1" },
            }}
          >
            Apply & Save Settings
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default CustomizeReportModal;
