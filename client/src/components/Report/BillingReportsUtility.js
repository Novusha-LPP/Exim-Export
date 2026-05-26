import React, { useState, useEffect, useContext } from "react";
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  TextField,
  Card,
  CardContent,
  CardActions,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PaymentIcon from "@mui/icons-material/Payment";
import SummarizeIcon from "@mui/icons-material/Summarize";
import FilterListIcon from "@mui/icons-material/FilterList";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { UserContext } from "../../contexts/UserContext";
import axios from "axios";

const BillingReportsUtility = ({ isDialog, onClose }) => {
  const { user } = useContext(UserContext);
  const [branches, setBranches] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [filters, setFilters] = useState({
    year: "",
    branchId: "all",
    startDate: "",
    endDate: "",
  });

  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const API_URL = import.meta.env.VITE_API_STRING;

  // Standard FY generator to match ExportBillingPage.jsx
  const getCurrentFinancialYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 4
      ? `${String(year).slice(-2)}-${String(year + 1).slice(-2)}`
      : `${String(year - 1).slice(-2)}-${String(year).slice(-2)}`;
  };

  useEffect(() => {
    const loadFilters = () => {
      setLoading(true);

      // 1. Load Branches from user object
      const userBranches = user?.selected_branches || [];
      const branchOptions = userBranches.map(b => ({
        _id: b,
        branch_name: b === 'AMD' ? 'Ahmedabad' :
          b === 'GIM' ? 'Gandhidham' :
            b === 'BRD' ? 'Baroda' :
              b === 'HAZ' ? 'Hazira' :
                b === 'COK' ? 'Cochin' : b
      }));
      setBranches(branchOptions);

      // 2. Load Years statically
      const currentFY = getCurrentFinancialYear();
      const [y1, y2] = currentFY.split('-').map(Number);
      const lastYears = [];
      for (let i = 0; i < 5; i++) {
        const start = y1 - i;
        const end = y2 - i;
        lastYears.push(`${String(start).padStart(2, '0')}-${String(end).padStart(2, '0')}`);
      }
      setYears(lastYears);

      // Set default year
      if (lastYears.length > 0) {
        setFilters(prev => ({ ...prev, year: lastYears[0] }));
      }

      setLoading(false);
    };

    loadFilters();
  }, [user]);

  const handleDownload = async (type) => {
    if (!filters.year && !filters.startDate) {
      setNotification({ open: true, message: "Please select a year or date range", severity: "warning" });
      return;
    }

    setDownloading(true);
    try {
      const endpoint = type === 'tds' ? '/report/tds-payable-register' : '/report/billing-charges-excel';
      const response = await axios.get(`${API_URL}${endpoint}`, {
        params: { ...filters, type },
        responseType: 'blob',
        withCredentials: true
      });

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      const dateSuffix = filters.startDate ? `${filters.startDate}_to_${filters.endDate || 'now'}` : filters.year;
      const filename = type === 'tds' ? `TDS_Payable_Register_${dateSuffix}.xlsx` : `Report_${type}_${dateSuffix}.xlsx`;

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setNotification({ open: true, message: "Report downloaded successfully", severity: "success" });
    } catch (error) {
      setNotification({ open: true, message: "Error generating report", severity: "error" });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress thickness={5} size={60} sx={{ color: '#1a73e8' }} />
      </Box>
    );
  }

  const reportCards = [
    {
      id: 'tds',
      title: "TDS Payable Register",
      description: "Official TDS register with Party details, PAN, Taxable, and TDS breakdown for compliance.",
      icon: <AccountBalanceWalletIcon sx={{ fontSize: 40, color: '#d32f2f' }} />,
      bgColor: '#ffebee',
      btnColor: '#d32f2f'
    },
    {
      id: 'pb',
      title: "Purchase Book",
      description: "Detailed report of all Purchase Book entries including taxes and supplier details.",
      icon: <ReceiptLongIcon sx={{ fontSize: 40, color: '#1a73e8' }} />,
      bgColor: '#e8f0fe',
      btnColor: '#1a73e8'
    },
    {
      id: 'pr',
      title: "Payment Request",
      description: "Comprehensive list of all payment requests with status, bank details, and approval dates.",
      icon: <PaymentIcon sx={{ fontSize: 40, color: '#34a853' }} />,
      bgColor: '#e6f4ea',
      btnColor: '#34a853'
    }
  ];

  return (
    <Box sx={{ maxWidth: 1200, margin: "0 auto", p: isDialog ? 3 : { xs: 2, md: 4 } }}>
      {!isDialog && (
        <Box sx={{ mb: 5, textAlign: 'center' }}>
          <Typography variant="h4" fontWeight="800" sx={{ mb: 1, color: '#202124' }}>
            Billing Reports Hub
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Filter by Branch, Year, or Date Range to generate professional TDS and Billing reports.
          </Typography>
        </Box>
      )}

      <Paper elevation={0} sx={{ p: 3, mb: 5, borderRadius: 3, border: '1px solid #e0e0e0', backgroundColor: '#fafafa' }}>
        <Box display="flex" alignItems="center" mb={3}>
          <FilterListIcon sx={{ mr: 1, color: '#5f6368' }} />
          <Typography variant="subtitle1" fontWeight="600" color="#5f6368">Filter Parameters</Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Financial Year</InputLabel>
              <Select value={filters.year} label="Financial Year" onChange={(e) => setFilters({ ...filters, year: e.target.value })} sx={{ borderRadius: 2 }}>
                {years.map((year) => <MenuItem key={year} value={year}>{year}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Branch</InputLabel>
              <Select value={filters.branchId} label="Branch" onChange={(e) => setFilters({ ...filters, branchId: e.target.value })} sx={{ borderRadius: 2 }}>
                <MenuItem value="all">All Branches</MenuItem>
                {branches.map((branch) => <MenuItem key={branch._id} value={branch._id}>{branch.branch_name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField fullWidth size="small" label="From Date" type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField fullWidth size="small" label="To Date" type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={4}>
        {reportCards.map((card) => (
          <Grid item xs={12} md={4} key={card.id}>
            <Card elevation={0} sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 4, border: '1px solid #e0e0e0', transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 12px 24px rgba(0,0,0,0.1)', borderColor: card.btnColor } }}>
              <CardContent sx={{ flexGrow: 1, p: 3 }}>
                <Box sx={{ width: 70, height: 70, borderRadius: 3, backgroundColor: card.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>{card.icon}</Box>
                <Typography variant="h6" fontWeight="700" gutterBottom>{card.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ minHeight: 60 }}>{card.description}</Typography>
              </CardContent>
              <Divider />
              <CardActions sx={{ p: 2 }}>
                <Button fullWidth variant="contained" startIcon={downloading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />} onClick={() => handleDownload(card.id)} disabled={downloading} sx={{ borderRadius: 2, py: 1.2, fontWeight: '600', textTransform: 'none', backgroundColor: card.btnColor, '&:hover': { backgroundColor: card.btnColor, filter: 'brightness(0.9)' } }}>
                  {downloading ? "Preparing..." : `Download Report`}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Snackbar open={notification.open} autoHideDuration={4000} onClose={() => setNotification({ ...notification, open: false })} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={() => setNotification({ ...notification, open: false })} severity={notification.severity} variant="filled" sx={{ borderRadius: 3 }}>{notification.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default BillingReportsUtility;
