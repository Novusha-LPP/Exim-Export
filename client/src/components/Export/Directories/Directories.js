import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Paper,
  MenuItem,
  InputAdornment,
  IconButton,
  CircularProgress,
  Chip,
  Grid,
  Card,
  CardActionArea,
} from "@mui/material";
import {
  Search as SearchIcon,
  Close as CloseIcon,
  ArrowForward as ArrowForwardIcon,
  Storage as StorageIcon,
} from "@mui/icons-material";
import axios from "axios";
import { viewMasterList } from "./DirectoriesData.js";
import DirectoryComponent from "./DirectoryComponent";

const DIRECTORY_COLOR_MAP = {
  "Organization": "#1976d2",
  "Airline Code": "#0288d1",
  "Country Code": "#5c6bc0",
  "Shipping Line Code": "#00897b",
  "Port Code-Sea": "#00796b",
  "Port Code-Air": "#0097a7",
  "Gateway Port": "#3949ab",
  "District": "#7b1fa2",
  "Shipping Line": "#00838f",
  "Transporter": "#e65100",
  "Terminal Code": "#d84315",
  "CFS Code": "#0891b2",
  "General Org": "#6a1b9a",
  "Forwarder": "#2e7d32",
  "Drawback": "#c2185b",
};

function Directories() {
  const [selectedDirectory, setSelectedDirectory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const debounceRef = useRef(null);

  const handleDirectoryChange = (event) => {
    setSelectedDirectory(event.target.value);
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = searchQuery.trim();
    if (!query) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_STRING}/directories/global-search`,
          {
            params: { q: query },
          }
        );
        setResults(res.data?.results || []);
      } catch (err) {
        console.error("Global directory search error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const handleClearSearch = () => {
    setSearchQuery("");
    setResults([]);
    setActiveFilter("ALL");
  };

  const handleSelectResult = (item) => {
    let targetDir = item.directory;
    if (targetDir === "Shipping Line" && !viewMasterList.includes("Shipping Line")) {
      targetDir = "Shipping Line Code";
    }
    if (viewMasterList.includes(targetDir)) {
      setSelectedDirectory(targetDir);
    }
  };

  const directoryCounts = results.reduce((acc, item) => {
    acc[item.directory] = (acc[item.directory] || 0) + 1;
    return acc;
  }, {});

  const filteredResults =
    activeFilter === "ALL"
      ? results
      : results.filter((item) => item.directory === activeFilter);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", color: "#1e293b" }}>
          Directory Management
        </Typography>
        <Typography variant="body2" sx={{ color: "#64748b" }}>
          Manage directory entries or search globally across all master directories
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 2,
          border: "1px solid #e2e8f0",
          backgroundColor: "#f8fafc",
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              size="small"
              placeholder="Global Search across all directories (Organization, Ports, Airlines, Shipping Lines, Drawback...)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveFilter("ALL");
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#64748b" }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    {loading && <CircularProgress size={20} sx={{ mr: 1 }} />}
                    {searchQuery && (
                      <IconButton size="small" onClick={handleClearSearch}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    )}
                  </InputAdornment>
                ),
              }}
              sx={{
                backgroundColor: "#ffffff",
                borderRadius: 1,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1.5,
                },
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              size="small"
              label="Select Directory"
              value={selectedDirectory}
              onChange={handleDirectoryChange}
              sx={{
                backgroundColor: "#ffffff",
                borderRadius: 1.5,
              }}
            >
              {viewMasterList.map((dir) => (
                <MenuItem key={dir} value={dir}>
                  {dir}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        {searchQuery.trim() && (
          <Box sx={{ mt: 2.5, pt: 2, borderTop: "1px dashed #cbd5e1" }}>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1.5,
                mb: 2,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569" }}>
                {loading ? (
                  "Searching across all 14 directories..."
                ) : (
                  <>
                    Found <strong>{results.length}</strong> matching records across{" "}
                    <strong>{Object.keys(directoryCounts).length}</strong> directories
                  </>
                )}
              </Typography>

              {!loading && results.length > 0 && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, alignItems: "center" }}>
                  <Typography variant="caption" sx={{ color: "#64748b", mr: 0.5 }}>
                    Filter:
                  </Typography>
                  <Chip
                    label={`All (${results.length})`}
                    size="small"
                    clickable
                    color={activeFilter === "ALL" ? "primary" : "default"}
                    variant={activeFilter === "ALL" ? "filled" : "outlined"}
                    onClick={() => setActiveFilter("ALL")}
                  />
                  {Object.entries(directoryCounts).map(([dir, count]) => {
                    const chipColor = DIRECTORY_COLOR_MAP[dir] || "#475569";
                    const isSelected = activeFilter === dir;
                    return (
                      <Chip
                        key={dir}
                        label={`${dir} (${count})`}
                        size="small"
                        clickable
                        onClick={() => setActiveFilter(dir)}
                        sx={{
                          backgroundColor: isSelected ? chipColor : "transparent",
                          color: isSelected ? "#fff" : chipColor,
                          borderColor: chipColor,
                          fontWeight: isSelected ? 600 : 500,
                          "&:hover": {
                            backgroundColor: isSelected ? chipColor : `${chipColor}15`,
                          },
                        }}
                      />
                    );
                  })}
                </Box>
              )}
            </Box>

            {!loading && filteredResults.length > 0 && (
              <Grid container spacing={1.5}>
                {filteredResults.map((item, idx) => {
                  const badgeColor = DIRECTORY_COLOR_MAP[item.directory] || "#475569";
                  return (
                    <Grid item xs={12} sm={6} md={4} key={item.id ? `${item.directory}-${item.id}` : idx}>
                      <Card
                        elevation={0}
                        sx={{
                          height: "100%",
                          borderRadius: 2,
                          border: "1px solid #e2e8f0",
                          borderLeft: `4px solid ${badgeColor}`,
                          transition: "all 0.15s ease",
                          "&:hover": {
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                            borderColor: badgeColor,
                          },
                        }}
                      >
                        <CardActionArea
                          onClick={() => handleSelectResult(item)}
                          sx={{ p: 1.5, height: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "space-between" }}
                        >
                          <Box sx={{ width: "100%" }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                              <Chip
                                icon={<StorageIcon style={{ fontSize: 13, color: badgeColor }} />}
                                label={item.directory}
                                size="small"
                                sx={{
                                  backgroundColor: `${badgeColor}15`,
                                  color: badgeColor,
                                  fontWeight: 700,
                                  fontSize: "0.72rem",
                                  border: `1px solid ${badgeColor}35`,
                                  borderRadius: 1,
                                  textTransform: "uppercase",
                                }}
                              />
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#64748b", fontSize: "0.75rem" }}>
                                <span>Open</span>
                                <ArrowForwardIcon sx={{ fontSize: 14 }} />
                              </Box>
                            </Box>
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: "bold", color: "#1e293b", mb: 0.5, wordBreak: "break-word" }}
                            >
                              {item.title}
                            </Typography>
                            {item.subtitle && (
                              <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                                {item.subtitle}
                              </Typography>
                            )}
                          </Box>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}

            {!loading && results.length === 0 && (
              <Box
                sx={{
                  py: 3,
                  textAlign: "center",
                  backgroundColor: "#ffffff",
                  borderRadius: 2,
                  border: "1px dashed #cbd5e1",
                }}
              >
                <StorageIcon sx={{ fontSize: 36, color: "#94a3b8", mb: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: "#334155" }}>
                  No matching records found across any directory
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748b" }}>
                  Try searching with a different name, code, GST, or PAN.
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {selectedDirectory ? (
        <DirectoryComponent directoryType={selectedDirectory} />
      ) : (
        !searchQuery.trim() && (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: "center",
              borderRadius: 2,
              border: "1px dashed #cbd5e1",
              backgroundColor: "#f8fafc",
            }}
          >
            <Typography variant="body1" sx={{ color: "#64748b", mb: 1 }}>
              Select a directory above or use the global search to find and open records instantly.
            </Typography>
          </Paper>
        )
      )}
    </Box>
  );
}

export default React.memo(Directories);
