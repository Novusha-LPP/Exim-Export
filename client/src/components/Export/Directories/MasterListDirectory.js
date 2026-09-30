import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  InputAdornment,
  IconButton,
  Chip,
  Button,
  CircularProgress,
} from "@mui/material";
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  Cached as CachedIcon,
} from "@mui/icons-material";
import { getMasterList, fetchAllMasterLists } from "../../../services/directoryCacheService.js";

const CATEGORIES = [
  { key: "unitCodes", label: "Unit Codes (UQC)" },
  { key: "END_USE_CODES", label: "End Use Codes" },
  { key: "PTA_FTA_CODES", label: "PTA / FTA Codes" },
  { key: "eximCodes", label: "EXIM Codes" },
  { key: "currencyList", label: "Currencies" },
  { key: "natureOfCargo", label: "Nature of Cargo" },
  { key: "states", label: "States" },
  { key: "cfs", label: "CFS List" },
  { key: "SHIPPING_LINES", label: "Shipping Lines Master" },
  { key: "hauliers", label: "Hauliers Master" },
];

function MasterListDirectory() {
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const currentCategory = CATEGORIES[activeTab]?.key || "unitCodes";

  const loadData = async (forceRefresh = false) => {
    setLoading(true);
    try {
      if (forceRefresh) {
        await fetchAllMasterLists(true);
      }
      const data = await getMasterList(currentCategory, { force: forceRefresh });
      setItems(Array.isArray(data) ? data : []);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Error loading master list directory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(0);
    setSearch("");
    loadData(false);
  }, [activeTab]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleRefresh = () => {
    loadData(true);
  };

  // Filter items based on search query
  const filteredItems = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.trim().toUpperCase();

    if (typeof item === "string") {
      return item.toUpperCase().includes(q);
    }
    if (typeof item === "object" && item !== null) {
      return Object.values(item).some(
        (val) => val && String(val).toUpperCase().includes(q)
      );
    }
    return false;
  });

  const paginatedItems = filteredItems.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ width: "100%", p: 2 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: "bold", color: "#1976d2" }}>
            Master List Directory
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cached centrally from Directory APIs • Last synced: {lastRefreshed || "Cached"}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Chip
            icon={<CachedIcon />}
            label="API Cached"
            color="success"
            size="small"
            variant="outlined"
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Force Sync
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          {CATEGORIES.map((cat, idx) => (
            <Tab key={cat.key} label={cat.label} id={`ml-tab-${idx}`} />
          ))}
        </Tabs>
      </Paper>

      {/* Search & Stats Bar */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <TextField
          size="small"
          placeholder={`Search ${CATEGORIES[activeTab].label}...`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 320 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: search && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearch("")}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          Total: <strong>{filteredItems.length}</strong> items
          {search && ` (filtered from ${items.length})`}
        </Typography>
      </Box>

      {/* Data Table */}
      <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell sx={{ fontWeight: "bold", width: 80 }}>#</TableCell>
              {currentCategory === "unitCodes" && (
                <TableCell sx={{ fontWeight: "bold" }}>Unit Code (UQC)</TableCell>
              )}
              {currentCategory === "states" && (
                <TableCell sx={{ fontWeight: "bold" }}>State Name</TableCell>
              )}
              {currentCategory === "cfs" && (
                <TableCell sx={{ fontWeight: "bold" }}>CFS Facility Name</TableCell>
              )}
              {currentCategory === "natureOfCargo" && (
                <TableCell sx={{ fontWeight: "bold" }}>Cargo Nature Description</TableCell>
              )}
              {currentCategory === "END_USE_CODES" && (
                <>
                  <TableCell sx={{ fontWeight: "bold", width: 140 }}>Code</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>End Use Description</TableCell>
                </>
              )}
              {currentCategory === "PTA_FTA_CODES" && (
                <>
                  <TableCell sx={{ fontWeight: "bold", width: 140 }}>Code</TableCell>
                  <TableCell sx={{ fontWeight: "bold", width: 220 }}>Country / Region</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Trade Agreement</TableCell>
                </>
              )}
              {currentCategory === "eximCodes" && (
                <>
                  <TableCell sx={{ fontWeight: "bold", width: 120 }}>Scheme Code</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Description</TableCell>
                </>
              )}
              {currentCategory === "currencyList" && (
                <>
                  <TableCell sx={{ fontWeight: "bold", width: 120 }}>Currency Code</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Currency Name</TableCell>
                </>
              )}
              {(currentCategory === "SHIPPING_LINES" || currentCategory === "hauliers") && (
                <>
                  <TableCell sx={{ fontWeight: "bold", width: 160 }}>Code / Value</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Organization / Line Name</TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Loading master data...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  No master list items found matching "{search}"
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((item, idx) => {
                const rowNum = page * rowsPerPage + idx + 1;

                if (typeof item === "string") {
                  return (
                    <TableRow key={idx} hover>
                      <TableCell>{rowNum}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{item}</TableCell>
                    </TableRow>
                  );
                }

                if (currentCategory === "END_USE_CODES") {
                  return (
                    <TableRow key={idx} hover>
                      <TableCell>{rowNum}</TableCell>
                      <TableCell>
                        <Chip label={item.code} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell>{item.description}</TableCell>
                    </TableRow>
                  );
                }

                if (currentCategory === "PTA_FTA_CODES") {
                  return (
                    <TableRow key={idx} hover>
                      <TableCell>{rowNum}</TableCell>
                      <TableCell>
                        <Chip label={item.code} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell>{item.country || "-"}</TableCell>
                      <TableCell>{item.agreement || item.description || "-"}</TableCell>
                    </TableRow>
                  );
                }

                if (currentCategory === "eximCodes") {
                  return (
                    <TableRow key={idx} hover>
                      <TableCell>{rowNum}</TableCell>
                      <TableCell>
                        <Chip label={item.code} size="small" color="secondary" variant="outlined" />
                      </TableCell>
                      <TableCell>{item.description}</TableCell>
                    </TableRow>
                  );
                }

                if (currentCategory === "currencyList") {
                  return (
                    <TableRow key={idx} hover>
                      <TableCell>{rowNum}</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>{item.code}</TableCell>
                      <TableCell>{item.description || item.name}</TableCell>
                    </TableRow>
                  );
                }

                if (currentCategory === "SHIPPING_LINES" || currentCategory === "hauliers") {
                  return (
                    <TableRow key={idx} hover>
                      <TableCell>{rowNum}</TableCell>
                      <TableCell>
                        <Chip label={item.value} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{item.label}</TableCell>
                    </TableRow>
                  );
                }

                return (
                  <TableRow key={idx} hover>
                    <TableCell>{rowNum}</TableCell>
                    <TableCell colSpan={3}>{JSON.stringify(item)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={filteredItems.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
      />
    </Box>
  );
}

export default MasterListDirectory;
