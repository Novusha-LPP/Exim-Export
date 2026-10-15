import React, { useEffect, useState, useContext, useMemo } from "react";
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Skeleton,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
  Fade,
  Zoom,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Collapse
} from "@mui/material";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import DownloadIcon from '@mui/icons-material/Download';
import TableViewIcon from '@mui/icons-material/TableView';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import TuneIcon from '@mui/icons-material/Tune';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import BusinessIcon from '@mui/icons-material/Business';
import ListAltIcon from '@mui/icons-material/ListAlt';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { saveAs } from 'file-saver';
import { UserContext } from "../../contexts/UserContext";
import { getOptionsForBranch } from "../common/CustomHouseDropdown";
import CustomizeReportModal from "./CustomizeReportModal.jsx";

export const DEFAULT_CLEARANCE_COLUMNS = [
  { label: "Srl No.", key: "srlNo", minWidth: 50, category: "General", default: true },
  { label: "JOB No", key: "job_no", minWidth: 120, category: "General", default: true },
  { label: "LOCATION", key: "location", minWidth: 90, category: "General", default: true },
  { label: "EXPORTER NAME", key: "exporter", minWidth: 170, category: "General", default: true },
  { label: "COMMODITY", key: "commodity", minWidth: 240, category: "Product & Customs", default: true },
  { label: "HSN CODE", key: "hsn_code", minWidth: 110, category: "Product & Customs", default: true },
  { label: "EXIM CODE", key: "exim_code", minWidth: 130, category: "Product & Customs", default: true },
  { label: "SB NO.", key: "sb_no", minWidth: 90, category: "Product & Customs", default: true },
  { label: "SB DATE", key: "sb_date", minWidth: 80, category: "Product & Customs", default: true },
  { label: "CONTAINER NO.", key: "containerNumbers", minWidth: 120, category: "Containers", default: true },
  { label: "NO. OF CNTR", key: "totalContainers", minWidth: 70, category: "Containers", default: true },
  { label: "SIZE", key: "size", minWidth: 60, category: "Containers", default: true },
  { label: "Teus", key: "teus", minWidth: 60, category: "Containers", default: true },
  { label: "LEO DATE", key: "leo_date", minWidth: 80, category: "Product & Customs", default: true },
  { label: "REMARKS", key: "remarks", minWidth: 100, category: "General", default: true },
];

export const ALL_CUSTOMIZABLE_COLUMNS = [
  ...DEFAULT_CLEARANCE_COLUMNS,
  // Incentives, RoDTEP, and Duty Drawback (DBK)
  { label: "RODTEP RATE", key: "rodtep_rate", minWidth: 100, category: "Incentives & DBK", default: false },
  { label: "RODTEP AMOUNT (₹)", key: "rodtep_amount", minWidth: 130, category: "Incentives & DBK", default: false },
  { label: "RODTEP CLAIM", key: "rodtep_claim", minWidth: 100, category: "Incentives & DBK", default: false },
  { label: "DBK RATE", key: "dbk_rate", minWidth: 100, category: "Incentives & DBK", default: false },
  { label: "DBK AMOUNT (₹)", key: "dbk_amount", minWidth: 130, category: "Incentives & DBK", default: false },
  { label: "DBK SL NO", key: "dbk_sr_no", minWidth: 100, category: "Incentives & DBK", default: false },
  { label: "DBK SCROLL NO", key: "dbk_scroll_no", minWidth: 120, category: "Incentives & DBK", default: false },
  { label: "DBK SCROLL DATE", key: "dbk_scroll_date", minWidth: 110, category: "Incentives & DBK", default: false },
  { label: "ROSCTL RATE", key: "rosctl_rate", minWidth: 100, category: "Incentives & DBK", default: false },
  { label: "ROSCTL AMOUNT (₹)", key: "rosctl_amount", minWidth: 130, category: "Incentives & DBK", default: false },
  { label: "REWARD ITEM", key: "reward_item", minWidth: 100, category: "Incentives & DBK", default: false },
  { label: "IGST STATUS", key: "igst_status", minWidth: 140, category: "Product & Customs", default: false },
  { label: "STATE OF ORIGIN", key: "origin_state", minWidth: 120, category: "General", default: false },
  { label: "DISTRICT OF ORIGIN", key: "origin_district", minWidth: 130, category: "General", default: false },
  // Logistics & Commercial
  { label: "CONTAINER DETAILS", key: "containerDetails", minWidth: 180, category: "Containers", default: false },
  { label: "INV VALUE", key: "invoice_value", minWidth: 130, category: "Commercial", default: false },
  { label: "FOB VALUE", key: "fob_value", minWidth: 120, category: "Commercial", default: false },
  { label: "INVOICE NO.", key: "invoice_no", minWidth: 110, category: "Commercial", default: false },
  { label: "INVOICE DATE", key: "invoice_date", minWidth: 90, category: "Commercial", default: false },
  { label: "CONSIGNEE", key: "consignee", minWidth: 170, category: "Logistics", default: false },
  { label: "SHIPPING LINE", key: "shipping_line", minWidth: 140, category: "Logistics", default: false },
  { label: "PORT OF LOADING", key: "pol", minWidth: 120, category: "Logistics", default: false },
  { label: "PORT OF DISCHARGE", key: "pod", minWidth: 120, category: "Logistics", default: false },
  { label: "COUNTRY", key: "country", minWidth: 90, category: "Logistics", default: false },
  { label: "TYPE OF SB", key: "type_of_sb", minWidth: 90, category: "Product & Customs", default: false },
  { label: "GROSS WT (KG)", key: "gross_weight", minWidth: 100, category: "Logistics", default: false },
  { label: "NET WT (KG)", key: "net_weight", minWidth: 100, category: "Logistics", default: false },
  { label: "PACKAGES", key: "packages", minWidth: 80, category: "Logistics", default: false },
];

const adminFreightColumns = [
  { label: "SR.NO", key: "srlNo", minWidth: 50 },
  { label: "JOB NO", key: "job_no", minWidth: 100 },
  { label: "EXPORTER NAME", key: "exporter", minWidth: 150 },
  { label: "LOCATION", key: "location", minWidth: 80 },
  { label: "SB NO.", key: "sb_no", minWidth: 100 },
  { label: "PORTS", key: "ports", minWidth: 150 },
  { label: "SIZE OF CONTAINER", key: "size", minWidth: 60 },
  { label: "NO. OF CNTR", key: "totalContainers", minWidth: 70 },
  { label: "MOVEMENT TYPE", key: "movement_type", minWidth: 80 },
  { label: "FORWARDER NAME", key: "forwarder_name", minWidth: 120 },
  { label: "SHIPPING LINE", key: "shipping_line", minWidth: 120 },
  { label: "TOI", key: "term_of_invoice", minWidth: 70 },
  { label: "FREIGHT AMOUNT", key: "freight_amount", minWidth: 100 },
  { label: "CURRENCY", key: "currency", minWidth: 70 },
];

const DetailedReport = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportType, setReportType] = useState("clearance"); // 'clearance' | 'adminFreight'
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("exim_clearance_view_mode") || "jobWise";
  });

  const [customColumns, setCustomColumns] = useState(() => {
    try {
      const saved = localStorage.getItem("exim_clearance_custom_cols");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const colMap = new Map(ALL_CUSTOMIZABLE_COLUMNS.map((c) => [c.key, c]));
          const validCols = parsed.map((k) => colMap.get(k)).filter(Boolean);
          if (validCols.length > 0) return validCols;
        }
      }
    } catch (e) {
      console.warn("Failed to load saved clearance columns:", e);
    }
    return [...DEFAULT_CLEARANCE_COLUMNS];
  });

  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [selectedParty, setSelectedParty] = useState("");
  const [collapsedParties, setCollapsedParties] = useState(new Set());

  const [year, setYear] = useState("26-27");
  const [gradeFilter, setGradeFilter] = useState(""); // ✅ New Grade Filter
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportType, setExportType] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("AMD");
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("");

  const { user } = useContext(UserContext);
  const isSrManager = !!(
    user &&
    typeof user.role === 'string' &&
    user.role.toLowerCase().includes('sr') &&
    user.role.toLowerCase().includes('manager')
  );

  const activeColumns = useMemo(() => {
    if (reportType === 'adminFreight') return adminFreightColumns;
    return customColumns;
  }, [reportType, customColumns]);

  const visibleCols = useMemo(() => {
    return activeColumns.filter((col) => !(col.key === 'invoice_value' && !isSrManager));
  }, [activeColumns, isSrManager]);

  const BRANCH_OPTIONS = [
    { value: "AMD", label: "Ahmedabad" },
    { value: "BRD", label: "Baroda" },
    { value: "GIM", label: "Gandhidham" },
    { value: "COK", label: "Cochin" },
    { value: "HAZ", label: "Hazira" },
  ];

  const gradeOptions = [
    { value: "", label: "All Grades" },
    { value: "Grade 316", label: "Grade 316" },
    { value: "Nickel", label: "Nickel" },
    { value: "Grade 304", label: "Grade 304" },
  ];

  const years = [
    { value: "26-27", label: "26-27" },
    { value: "25-26", label: "25-26" },
    { value: "24-25", label: "24-25" },
    { value: "23-24", label: "23-24" },
    { value: "22-23", label: "22-23" },
    { value: "21-22", lable: "21-22" },
  ];

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
    { value: "all", label: "Full Year" },
  ];

  const allowedCustomHouses = useMemo(() => {
    if (!selectedBranch) return null;
    const houses = new Set();
    getOptionsForBranch(selectedBranch).forEach((group) => {
      (group.items || []).forEach((item) => houses.add(String(item.value || "").toUpperCase()));
    });
    return houses;
  }, [selectedBranch]);

  const processedData = useMemo(() => {
    let rows = [...data];
    if (allowedCustomHouses) {
      rows = rows.filter((row) => allowedCustomHouses.has(String(row.location || "").toUpperCase()));
    }
    rows = rows.filter((row) => {
      const transportMode = String(row.transport_mode || "").toUpperCase();
      const location = String(row.location || "").toUpperCase();
      const isAir = transportMode === "AIR" || location.includes("AIR");
      return !isAir;
    });
    return rows;
  }, [data, allowedCustomHouses]);

  const isLclJob = (row) => String(row?.consignment_type || "").toUpperCase() === "LCL";

  const partyOptions = useMemo(() => {
    const parties = new Set();
    processedData.forEach((row) => {
      const p = (row.exporter || "").trim().toUpperCase();
      if (p) parties.add(p);
    });
    return Array.from(parties).sort();
  }, [processedData]);

  const detailedRows = useMemo(() => {
    let rows = [...processedData];
    if (selectedParty) {
      const targetParty = selectedParty.trim().toUpperCase();
      rows = rows.filter((row) => (row.exporter || "").trim().toUpperCase() === targetParty);
    }
    if (countryFilter) {
      const targetCountry = countryFilter.trim().toUpperCase();
      rows = rows.filter((row) => {
        let rowCountry = row.country || row.discharge_country || "";
        if (rowCountry.includes(")")) {
          rowCountry = rowCountry.substring(rowCountry.indexOf(")") + 1).trim();
        }
        return rowCountry.toUpperCase().trim() === targetCountry;
      });
    }
    if (searchQuery) {
      const needle = searchQuery.toLowerCase().trim();
      const normalizedNeedle = needle.replace(/rodtap/g, "rodtep").replace(/drawback/g, "dbk");
      rows = rows.filter((row) => {
        const jobNo = String(row.job_no || "").toLowerCase();
        const exporter = String(row.exporter || "").toLowerCase();
        const commodity = String(row.commodity || "").toLowerCase();
        const sbNo = String(row.sb_no || "").toLowerCase();
        const location = String(row.location || "").toLowerCase();
        const pol = String(row.pol || "").toLowerCase();
        const pod = String(row.pod || "").toLowerCase();
        const remarks = String(row.remarks || "").toLowerCase();
        const hsn = String(row.hsn_code || "").toLowerCase();
        const exim = String(row.exim_code || "").toLowerCase();
        const rodtepRate = String(row.rodtep_rate || "").toLowerCase();
        const dbkRate = String(row.dbk_rate || "").toLowerCase();
        const dbkSrNo = String(row.dbk_sr_no || "").toLowerCase();
        const dbkScroll = String(row.dbk_scroll_no || "").toLowerCase();
        const containers = Array.isArray(row.containerNumbers)
          ? row.containerNumbers.map(c => String(c).toLowerCase()).join(" ")
          : String(row.containerNumbers || "").toLowerCase();

        const matchNeedle = (n) =>
          jobNo.includes(n) ||
          exporter.includes(n) ||
          commodity.includes(n) ||
          sbNo.includes(n) ||
          location.includes(n) ||
          pol.includes(n) ||
          pod.includes(n) ||
          remarks.includes(n) ||
          hsn.includes(n) ||
          exim.includes(n) ||
          containers.includes(n) ||
          rodtepRate.includes(n) ||
          dbkRate.includes(n) ||
          dbkSrNo.includes(n) ||
          dbkScroll.includes(n);

        return matchNeedle(needle) || matchNeedle(normalizedNeedle);
      });
    }
    return rows;
  }, [processedData, selectedParty, countryFilter, searchQuery]);

  const countryOptions = useMemo(() => {
    const countries = new Set();
    processedData.forEach((row) => {
      let rowCountry = row.country || row.discharge_country || "";
      if (rowCountry) {
        if (rowCountry.includes(")")) {
          rowCountry = rowCountry.substring(rowCountry.indexOf(")") + 1).trim();
        }
        if (rowCountry) {
          countries.add(rowCountry.toUpperCase().trim());
        }
      }
    });
    return Array.from(countries).sort();
  }, [processedData]);

  const lclJobCount = useMemo(() => {
    return detailedRows.filter((row) => isLclJob(row)).length;
  }, [detailedRows]);

  // Aggregate Party-wise (Exporter-wise) Summary Data
  const partyWiseData = useMemo(() => {
    const map = new Map();
    detailedRows.forEach((row) => {
      const party = (row.exporter || "UNKNOWN EXPORTER").trim().toUpperCase();
      if (!map.has(party)) {
        map.set(party, {
          partyName: party,
          jobs: [],
          totalSbs: 0,
          totalContainers: 0,
          totalTeus: 0,
          totalInvoiceValue: 0,
          totalFobValue: 0,
          totalRodtepAmount: 0,
          totalDbkAmount: 0,
          totalRosctlAmount: 0,
          currencies: new Set(),
          locations: new Set(),
          commodities: new Set(),
          sbNumbers: new Set(),
          hsnCodes: new Set(),
        });
      }
      const p = map.get(party);
      p.jobs.push(row);
      if (row.sb_no) p.sbNumbers.add(String(row.sb_no).trim());
      p.totalContainers += parseInt(row.totalContainers) || 0;
      if (!isLclJob(row)) {
        p.totalTeus += parseInt(row.teus) || 0;
      }
      if (row.invoice_value) p.totalInvoiceValue += parseFloat(row.invoice_value) || 0;
      if (row.fob_value) p.totalFobValue += parseFloat(row.fob_value) || 0;
      if (row.rodtep_amount) p.totalRodtepAmount += parseFloat(row.rodtep_amount) || 0;
      if (row.dbk_amount) p.totalDbkAmount += parseFloat(row.dbk_amount) || 0;
      if (row.rosctl_amount) p.totalRosctlAmount += parseFloat(row.rosctl_amount) || 0;
      if (row.inv_currency) p.currencies.add(row.inv_currency);
      if (row.location) p.locations.add(row.location);
      if (row.commodity) p.commodities.add(row.commodity);
      if (row.hsn_code) {
        String(row.hsn_code)
          .split(",")
          .forEach((h) => {
            const trimmed = h.trim();
            if (trimmed) p.hsnCodes.add(trimmed);
          });
      }
    });

    return Array.from(map.values())
      .map((p) => ({
        ...p,
        totalSbs: p.sbNumbers.size || p.jobs.length,
        locationsList: Array.from(p.locations).join(", "),
        currency: Array.from(p.currencies)[0] || "INR",
        hsnList: Array.from(p.hsnCodes).join(", "),
      }))
      .sort((a, b) => b.totalSbs - a.totalSbs);
  }, [detailedRows]);

  const togglePartyCollapse = (partyName) => {
    setCollapsedParties((prev) => {
      const next = new Set(prev);
      if (next.has(partyName)) next.delete(partyName);
      else next.add(partyName);
      return next;
    });
  };

  const handleToggleAllParties = () => {
    if (collapsedParties.size === 0) {
      setCollapsedParties(new Set(partyWiseData.map((p) => p.partyName)));
    } else {
      setCollapsedParties(new Set());
    }
  };

  const handleApplyCustomization = (selectedCols, newViewMode) => {
    setCustomColumns(selectedCols);
    setViewMode(newViewMode);
    try {
      localStorage.setItem(
        "exim_clearance_custom_cols",
        JSON.stringify(selectedCols.map((c) => c.key))
      );
      localStorage.setItem("exim_clearance_view_mode", newViewMode);
    } catch (e) {
      console.warn("Failed to persist report settings:", e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const apiBase = import.meta.env.VITE_API_STRING || "";
      const endpoint = reportType === 'adminFreight' 
        ? `/report/admin-freight/${year}/${month}`
        : `/report/export-clearance/${year}/${month}`;
      const url = new URL(`${apiBase}${endpoint}`);
      console.log("Fetching Data from:", url.toString());
      // Only include grade when user is Sr. Manager
      if (isSrManager && gradeFilter) {
        url.searchParams.append('grade', gradeFilter);
      }
      if (selectedBranch) {
        url.searchParams.append('branch_code', selectedBranch);
      }
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year, month, gradeFilter, selectedBranch, reportType]); // ✅ Added reportType dependency

  const handlePreviousMonth = () => {
    if (month === "all") return;
    const prev = parseInt(month) - 1;
    setMonth(prev < 1 ? "12" : String(prev));
  };

  const handleNextMonth = () => {
    if (month === "all") return;
    const next = parseInt(month) + 1;
    setMonth(next > 12 ? "1" : String(next));
  };

  // Export menu handlers
  const handleExportClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleExportClose = () => {
    setAnchorEl(null);
  };

  // Generate summary data
  const generateSummaryData = () => {
    const locationGroups = {};

    detailedRows.forEach(row => {
      const location = row.location || 'Unknown';
      if (!locationGroups[location]) {
        locationGroups[location] = {
          scrap: { count20: 0, count40: 0, teus: 0, containers: 0 },
          others: { count20: 0, count40: 0, teus: 0, containers: 0 },
          total: { count20: 0, count40: 0, teus: 0, containers: 0 }
        };
      }

      const teus = parseInt(row.teus) || 0;
      const containers = parseInt(row.totalContainers) || 0;
      const commodity = (row.commodity || '').toLowerCase();

      // Determine container sizes from noOfContrSize
      const sizeInfo = row.noOfContrSize || '';
      const count20 = (sizeInfo.match(/(\d+)\s*x\s*20/i) || [0, 0])[1];
      const count40 = (sizeInfo.match(/(\d+)\s*x\s*40/i) || [0, 0])[1];

      const category = commodity.includes('scrap') ? 'scrap' : 'others';

      locationGroups[location][category].count20 += parseInt(count20) || 0;
      locationGroups[location][category].count40 += parseInt(count40) || 0;
      locationGroups[location][category].teus += teus;
      locationGroups[location][category].containers += containers;

      locationGroups[location].total.count20 += parseInt(count20) || 0;
      locationGroups[location].total.count40 += parseInt(count40) || 0;
      locationGroups[location].total.teus += teus;
      locationGroups[location].total.containers += containers;
    });

    const monthName = months.find(m => String(m.value) === String(month))?.label || 'Unknown';
    return locationGroups;
  };

  // Generate summary for dialog (with LCL row)
  const generateSummaryRows = () => {
    const summaryData = {};
    detailedRows.forEach(row => {
      const location = row.location || 'Unknown';
      const consignmentType = (row.consignment_type || '').toUpperCase();
      const sizeInfo = row.noOfContrSize || '';
      const count20 = parseInt((sizeInfo.match(/(\d+)\s*x\s*20/i) || [0, 0])[1]) || 0;
      const count40 = parseInt((sizeInfo.match(/(\d+)\s*x\s*40/i) || [0, 0])[1]) || 0;
      const teus = parseInt(row.teus) || 0;

      if (consignmentType === 'LCL') {
        return;
      }
      if (!summaryData[location]) {
        summaryData[location] = { count20: 0, count40: 0, teus: 0 };
      }
      summaryData[location].count20 += count20;
      summaryData[location].count40 += count40;
      summaryData[location].teus += teus;
    });
    const rows = Object.entries(summaryData).map(([location, details]) => ({
      location,
      count20: details.count20,
      count40: details.count40,
      teus: details.teus,
    }));
    const summaryTotalTeus = rows.reduce((sum, row) => sum + (parseInt(row.teus) || 0), 0);
    const summaryTotal20 = rows.reduce((sum, row) => sum + (parseInt(row.count20) || 0), 0);
    const summaryTotal40 = rows.reduce((sum, row) => sum + (parseInt(row.count40) || 0), 0);

    // Add LCL and Total
    rows.push({ location: 'LCL JOBS', count20: '', count40: '', teus: lclJobCount });
    rows.push({ location: 'TOTAL', count20: summaryTotal20, count40: summaryTotal40, teus: summaryTotalTeus + (parseInt(lclJobCount) || 0) });
    return rows;
  };

  const generateExporterSummaryRows = () => {
    const summaryData = {};
    detailedRows.forEach(row => {
      const exporter = row.exporter || 'Unknown';
      const consignmentType = (row.consignment_type || '').toUpperCase();
      const sizeInfo = row.noOfContrSize || '';
      const count20 = parseInt((sizeInfo.match(/(\d+)\s*x\s*20/i) || [0, 0])[1]) || 0;
      const count40 = parseInt((sizeInfo.match(/(\d+)\s*x\s*40/i) || [0, 0])[1]) || 0;
      const teus = parseInt(row.teus) || 0;

      if (consignmentType === 'LCL') {
        if (!summaryData[exporter]) summaryData[exporter] = { count20: 0, count40: 0, teus: 0 };
        summaryData[exporter].teus += 1; // Count LCL as 1 TEU for summary purposes or just job count
        return;
      }
      if (!summaryData[exporter]) {
        summaryData[exporter] = { count20: 0, count40: 0, teus: 0 };
      }
      summaryData[exporter].count20 += count20;
      summaryData[exporter].count40 += count40;
      summaryData[exporter].teus += teus;
    });

    const rows = Object.entries(summaryData).map(([exporter, details]) => ({
      exporter,
      count20: details.count20,
      count40: details.count40,
      teus: details.teus,
    }));

    // Sort by teus descending
    rows.sort((a, b) => b.teus - a.teus);

    return rows;
  };

  const deriveSize = (noOfContrSize) => {
    if (!noOfContrSize) return '';
    const has20 = /\b20\b/.test(noOfContrSize);
    const has40 = /\b40\b/.test(noOfContrSize);
    if (has20 && has40) return '20/40';
    if (has20) return '20';
    if (has40) return '40';
    return noOfContrSize;
  };

  const formatPortsText = (pol, pod, country, isHtml = false) => {
    const cleanPort = (str) => str ? String(str).replace(/^.*?-\s*/, '').replace(/\(.*?\)\s*/, '').trim() : '';
    const polClean = cleanPort(pol);
    const podClean = cleanPort(pod);
    const countryClean = cleanPort(country);
    
    let podWithCountry = podClean;
    if (countryClean && podClean) podWithCountry += ` (${countryClean})`;
    else if (countryClean) podWithCountry = countryClean;

    if (!polClean && podWithCountry) {
      return isHtml ? <Box><b>POD:</b> {podWithCountry}</Box> : `POD: ${podWithCountry}`;
    } else if (polClean && podWithCountry) {
      return isHtml ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Typography variant="caption" sx={{ fontSize: '0.75rem' }}><b>POL:</b> {polClean}</Typography>
          <Typography variant="caption" sx={{ fontSize: '0.75rem' }}><b>POD:</b> {podWithCountry}</Typography>
        </Box>
      ) : `POL: ${polClean}\nPOD: ${podWithCountry}`;
    } else if (polClean) {
      return isHtml ? <Box><b>POL:</b> {polClean}</Box> : `POL: ${polClean}`;
    }
    return '';
  };

  const getExcelRowData = (row, index, cols) => {
    const invValue = row.invoice_value && row.inv_currency
      ? `${row.inv_currency} ${(parseFloat(row.invoice_value)).toFixed(2)}`
      : (row.invoice_value ? String(row.invoice_value) : '');

    const rowData = {};
    cols.forEach(col => {
      switch (col.key) {
        case 'srlNo':
          rowData[col.key] = String(index + 1).padStart(3, "0");
          break;
        case 'invoice_value':
          rowData[col.key] = invValue;
          break;
        case 'fob_value':
          rowData[col.key] = row.fob_value ? parseFloat(row.fob_value).toFixed(2) : '';
          break;
        case 'size':
          rowData[col.key] = deriveSize(row.noOfContrSize);
          break;
        case 'containerNumbers':
          rowData[col.key] = Array.isArray(row.containerNumbers)
            ? row.containerNumbers.join('; ')
            : (row.containerNumbers || '');
          break;
        case 'containerDetails':
          rowData[col.key] = Array.isArray(row.containerDetails)
            ? row.containerDetails
                .map(c => `${c.containerNo || ''} (${c.containerSize || ''})${c.sealNo ? ` [Seal: ${c.sealNo}]` : ''}`)
                .filter(Boolean)
                .join('; ')
            : '';
          break;
        case 'sb_date':
          rowData[col.key] = row.sb_date ? new Date(row.sb_date).toLocaleDateString('en-GB') : '';
          break;
        case 'leo_date':
          rowData[col.key] = row.leo_date ? new Date(row.leo_date).toLocaleDateString('en-GB') : '';
          break;
        case 'teus':
          rowData[col.key] = isLclJob(row) ? 'LCL' : (row.teus ?? '');
          break;
        case 'ports':
          rowData[col.key] = formatPortsText(row.pol, row.pod, row.country, false);
          break;
        case 'packages':
          rowData[col.key] = row.packages ? `${row.packages} ${row.package_unit || ''}`.trim() : '';
          break;
        case 'freight_amount':
          rowData[col.key] = row.freight_amount || row.rate_total || '—';
          break;
        case 'rodtep_amount':
          rowData[col.key] = row.rodtep_amount ? parseFloat(row.rodtep_amount).toFixed(2) : '';
          break;
        case 'dbk_amount':
          rowData[col.key] = row.dbk_amount ? parseFloat(row.dbk_amount).toFixed(2) : '';
          break;
        case 'rosctl_amount':
          rowData[col.key] = row.rosctl_amount ? parseFloat(row.rosctl_amount).toFixed(2) : '';
          break;
        case 'dbk_scroll_date':
          rowData[col.key] = row.dbk_scroll_date ? new Date(row.dbk_scroll_date).toLocaleDateString('en-GB') : '';
          break;
        case 'currency': {
          let curr = row.currency || "USD";
          if (!row.currency && row.freight_amount && typeof row.freight_amount === 'string') {
            const match = row.freight_amount.match(/[A-Za-z]+/);
            if (match) curr = match[0].toUpperCase();
          }
          rowData[col.key] = curr;
          break;
        }
        default:
          rowData[col.key] = row[col.key] ?? '';
      }
    });
    return rowData;
  };

  const renderCellContent = (row, col, idx) => {
    const val = row[col.key];

    switch (col.key) {
      case 'srlNo':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px", fontWeight: 700, color: '#64748b' }}>
            {String(idx + 1).padStart(3, "0")}
          </TableCell>
        );

      case 'job_no':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px", fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>
            {val || '—'}
          </TableCell>
        );

      case 'location':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px", fontWeight: 500, color: '#475569' }}>
            {val || '—'}
          </TableCell>
        );

      case 'exporter':
        return (
          <TableCell key={col.key} align="left" sx={{ fontSize: "0.75rem", fontWeight: 600, color: '#1e293b', padding: "6px 8px", maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <Tooltip title={val || ""}><span>{val || '—'}</span></Tooltip>
          </TableCell>
        );

      case 'commodity':
        return (
          <TableCell key={col.key} align="left" sx={{ fontSize: "0.62rem", lineHeight: 1.1, padding: "6px 8px", maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#334155' }}>
            <Tooltip title={val || ""}><span>{val || '—'}</span></Tooltip>
          </TableCell>
        );

      case 'sb_no':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px", fontWeight: 700, color: '#0369a1' }}>
            {val || '—'}
          </TableCell>
        );

      case 'sb_date':
      case 'leo_date':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px", whiteSpace: 'nowrap', color: '#475569' }}>
            {val ? new Date(val).toLocaleDateString('en-GB') : '—'}
          </TableCell>
        );

      case 'containerNumbers':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px" }}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.3 }}>
              {Array.isArray(val) && val.length > 0 ? (
                val.map((num, i) => (
                  <Typography key={i} variant="caption" sx={{ fontSize: '0.68rem', fontFamily: 'monospace', bgcolor: '#f1f5f9', px: 0.8, py: 0.1, borderRadius: 0.5, border: '1px solid #e2e8f0' }}>
                    {num}
                  </Typography>
                ))
              ) : (
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>{val || '—'}</Typography>
              )}
            </Box>
          </TableCell>
        );

      case 'containerDetails':
        return (
          <TableCell key={col.key} align="left" sx={{ fontSize: "0.72rem", padding: "6px 8px" }}>
            {Array.isArray(row.containerDetails) && row.containerDetails.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                {row.containerDetails.map((c, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', bgcolor: '#f8fafc', p: 0.3, borderRadius: 1, border: '1px solid #e2e8f0' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.68rem', color: '#0f172a' }}>
                      {c.containerNo}
                    </Typography>
                    {c.containerSize && (
                      <Chip label={c.containerSize} size="small" sx={{ height: 16, fontSize: '0.58rem', bgcolor: '#e0f2fe', color: '#0284c7', fontWeight: 600 }} />
                    )}
                    {c.sealNo && (
                      <Typography variant="caption" sx={{ fontSize: '0.62rem', color: '#64748b' }}>
                        Seal: {c.sealNo}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            ) : '—'}
          </TableCell>
        );

      case 'totalContainers':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px", fontWeight: 600 }}>
            {val ?? '—'}
          </TableCell>
        );

      case 'size':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px" }}>
            {deriveSize(row.noOfContrSize) || '—'}
          </TableCell>
        );

      case 'teus':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px", fontWeight: 700, color: '#0284c7' }}>
            {isLclJob(row) ? (
              <Chip label="LCL" size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#e0f2fe', color: '#0369a1' }} />
            ) : (
              val ?? '—'
            )}
          </TableCell>
        );

      case 'hsn_code':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.72rem", padding: "6px 8px" }}>
            {val ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4, justifyContent: 'center' }}>
                {String(val).split(',').map((h, i) => (
                  <Chip key={i} label={h.trim()} size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600, bgcolor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }} />
                ))}
              </Box>
            ) : '—'}
          </TableCell>
        );

      case 'exim_code':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.72rem", padding: "6px 8px" }}>
            {val ? (
              <Chip label={val} size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600, bgcolor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }} />
            ) : '—'}
          </TableCell>
        );

      case 'invoice_value':
        return (
          <TableCell key={col.key} align="right" sx={{ fontSize: "0.75rem", padding: "6px 8px", fontWeight: 600, color: '#0369a1', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
            {row.invoice_value && row.inv_currency ? `${row.inv_currency} ${(parseFloat(row.invoice_value)).toFixed(2)}` : (val || '—')}
          </TableCell>
        );

      case 'fob_value':
        return (
          <TableCell key={col.key} align="right" sx={{ fontSize: "0.75rem", padding: "6px 8px", fontWeight: 700, color: '#15803d', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
            {val ? `₹ ${parseFloat(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          </TableCell>
        );

      case 'invoice_no':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.72rem", padding: "6px 8px", fontFamily: 'monospace', color: '#1e293b' }}>
            {val || '—'}
          </TableCell>
        );

      case 'invoice_date':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.72rem", padding: "6px 8px", color: '#475569' }}>
            {val || '—'}
          </TableCell>
        );

      case 'consignee':
        return (
          <TableCell key={col.key} align="left" sx={{ fontSize: "0.72rem", padding: "6px 8px", maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#334155' }}>
            <Tooltip title={val || ""}><span>{val || '—'}</span></Tooltip>
          </TableCell>
        );

      case 'shipping_line':
        return (
          <TableCell key={col.key} align="left" sx={{ fontSize: "0.72rem", padding: "6px 8px", maxWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#334155' }}>
            <Tooltip title={val || ""}><span>{val || '—'}</span></Tooltip>
          </TableCell>
        );

      case 'gross_weight':
      case 'net_weight':
        return (
          <TableCell key={col.key} align="right" sx={{ fontSize: "0.72rem", padding: "6px 8px", fontFamily: 'monospace' }}>
            {val ? `${val} KG` : '—'}
          </TableCell>
        );

      case 'packages':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.72rem", padding: "6px 8px" }}>
            {val ? `${val} ${row.package_unit || ''}`.trim() : '—'}
          </TableCell>
        );

      case 'type_of_sb':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.72rem", padding: "6px 8px" }}>
            {val ? <Chip label={val} size="small" sx={{ height: 18, fontSize: '0.62rem', bgcolor: '#f1f5f9' }} /> : '—'}
          </TableCell>
        );

      case 'pol':
      case 'pod':
      case 'country':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.72rem", padding: "6px 8px" }}>
            {val || '—'}
          </TableCell>
        );

      case 'remarks':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.72rem", padding: "6px 8px", maxWidth: 150 }}>
            {val ? val.split('\n').map((line, lidx) => (
              <React.Fragment key={lidx}>{line}{lidx < val.split('\n').length - 1 && <br />}</React.Fragment>
            )) : "—"}
          </TableCell>
        );

      case 'ports':
        return (
          <TableCell key={col.key} align="left" sx={{ fontSize: "0.72rem", padding: "6px 8px" }}>
            {formatPortsText(row.pol, row.pod, row.country, true)}
          </TableCell>
        );

      case 'movement_type':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px" }}>
            {val || '—'}
          </TableCell>
        );

      case 'forwarder_name':
        return (
          <TableCell key={col.key} align="left" sx={{ fontSize: "0.75rem", padding: "6px 8px", maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <Tooltip title={val || ""}><span>{val || '—'}</span></Tooltip>
          </TableCell>
        );

      case 'term_of_invoice':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px" }}>
            {val || '—'}
          </TableCell>
        );

      case 'freight_amount':
        return (
          <TableCell key={col.key} align="right" sx={{ fontSize: "0.75rem", padding: "6px 8px", fontWeight: 700 }}>
            {val || row.rate_total || '—'}
          </TableCell>
        );

      case 'currency': {
        let curr = row.currency || "USD";
        if (!row.currency && row.freight_amount && typeof row.freight_amount === 'string') {
          const match = row.freight_amount.match(/[A-Za-z]+/);
          if (match) curr = match[0].toUpperCase();
        }
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px", fontWeight: 700 }}>
            {curr}
          </TableCell>
        );
      }

      case 'rodtep_rate':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.72rem", padding: "6px 8px" }}>
            {val ? <Chip label={val} size="small" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, bgcolor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }} /> : '—'}
          </TableCell>
        );

      case 'rodtep_amount':
        return (
          <TableCell key={col.key} align="right" sx={{ fontSize: "0.75rem", padding: "6px 8px", fontWeight: 700, color: '#0369a1', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
            {val ? `₹ ${parseFloat(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          </TableCell>
        );

      case 'rodtep_claim':
      case 'rosctl_claim':
      case 'reward_item':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.72rem", padding: "6px 8px" }}>
            {val ? (
              <Chip
                label={val}
                size="small"
                sx={{
                  height: 19,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  bgcolor: val === 'Yes' ? '#dcfce7' : '#f1f5f9',
                  color: val === 'Yes' ? '#166534' : '#64748b',
                  border: val === 'Yes' ? '1px solid #bbf7d0' : '1px solid #cbd5e1'
                }}
              />
            ) : '—'}
          </TableCell>
        );

      case 'dbk_rate':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.72rem", padding: "6px 8px" }}>
            {val ? <Chip label={val} size="small" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, bgcolor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }} /> : '—'}
          </TableCell>
        );

      case 'dbk_amount':
        return (
          <TableCell key={col.key} align="right" sx={{ fontSize: "0.75rem", padding: "6px 8px", fontWeight: 700, color: '#b45309', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
            {val ? `₹ ${parseFloat(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          </TableCell>
        );

      case 'dbk_sr_no':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.72rem", padding: "6px 8px", fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>
            {val || '—'}
          </TableCell>
        );

      case 'dbk_scroll_no':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.72rem", padding: "6px 8px", fontFamily: 'monospace', color: '#1e293b' }}>
            {val || '—'}
          </TableCell>
        );

      case 'dbk_scroll_date':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.72rem", padding: "6px 8px", color: '#475569' }}>
            {val ? new Date(val).toLocaleDateString('en-GB') : '—'}
          </TableCell>
        );

      case 'rosctl_rate':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.72rem", padding: "6px 8px" }}>
            {val ? <Chip label={val} size="small" sx={{ height: 20, fontSize: '0.68rem', bgcolor: '#f3e8ff', color: '#7e22ce' }} /> : '—'}
          </TableCell>
        );

      case 'rosctl_amount':
        return (
          <TableCell key={col.key} align="right" sx={{ fontSize: "0.75rem", padding: "6px 8px", fontWeight: 700, color: '#7e22ce', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
            {val ? `₹ ${parseFloat(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          </TableCell>
        );

      case 'igst_status':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.72rem", padding: "6px 8px", maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <Tooltip title={val || ""}>
              <span>{val ? <Chip label={val} size="small" sx={{ height: 18, fontSize: '0.62rem', bgcolor: '#f1f5f9' }} /> : '—'}</span>
            </Tooltip>
          </TableCell>
        );

      case 'origin_state':
      case 'origin_district':
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.72rem", padding: "6px 8px", color: '#334155' }}>
            {val || '—'}
          </TableCell>
        );

      default:
        return (
          <TableCell key={col.key} align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px" }}>
            {val ?? '—'}
          </TableCell>
        );
    }
  };

  // Export functionality
  const handleExportReport = async (format) => {
    setExportLoading(true);
    setExportType(format);
    setAnchorEl(null);

    try {
      if (format === 'excel') {
        await exportToExcel();
      } else if (format === 'pdf') {
        await exportToPDF();
      }
    } catch (error) {
      console.error('Export failed:', error);
      setError(`Failed to export report as ${format.toUpperCase()}`);
    } finally {
      setExportLoading(false);
      setExportType('');
    }
  };

  const exportToExcel = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const monthName = months.find(m => String(m.value) === String(month))?.label || 'Unknown';

    if (viewMode === 'partyWise' && reportType === 'clearance') {
      const partiesToExport = partyWiseData;
      const exportCols = visibleCols;
      const numCols = exportCols.length;

      // 1. SHEET 1: PARTY-WISE DETAILED JOBS REPORT
      const partyReportSheet = workbook.addWorksheet('Party Wise Report');

      // Set column widths
      exportCols.forEach((col, idx) => {
        const colLetter = partyReportSheet.getColumn(idx + 1);
        let w = 15;
        if (col.key === 'srlNo') w = 8;
        else if (col.key === 'job_no') w = 20;
        else if (col.key === 'exporter') w = 30;
        else if (col.key === 'commodity') w = 45;
        else if (col.key === 'hsn_code') w = 16;
        else if (col.key === 'exim_code') w = 16;
        else if (col.key === 'sb_no') w = 14;
        else if (col.key === 'sb_date' || col.key === 'leo_date') w = 13;
        else if (col.key === 'containerNumbers') w = 24;
        else if (col.key === 'remarks') w = 25;
        else if (col.minWidth) w = Math.max(12, Math.round(col.minWidth / 6));
        colLetter.width = w;
      });

      // Title Banner
      const titleRow = partyReportSheet.addRow([`EXPORT CLEARANCE REPORT - PARTY-WISE DETAILED (${monthName} ${year})`]);
      partyReportSheet.mergeCells(titleRow.number, 1, titleRow.number, numCols);
      titleRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
      titleRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' } // Deep Navy Blue
      };
      titleRow.height = 28;

      // Subtitle / Info
      const totalParties = partiesToExport.length;
      const totalSbs = partiesToExport.reduce((s, p) => s + (p.totalSbs || 0), 0);
      const infoText = `Branch: ${selectedBranch} | Generated: ${new Date().toLocaleDateString('en-GB')} | Parties: ${totalParties} | Total SBs: ${totalSbs}${selectedParty ? ` | Filtered by Party: ${selectedParty}` : ''}`;
      const infoRow = partyReportSheet.addRow([infoText]);
      partyReportSheet.mergeCells(infoRow.number, 1, infoRow.number, numCols);
      infoRow.font = { italic: true, size: 9, color: { argb: 'FF475569' } };
      infoRow.alignment = { vertical: 'middle', horizontal: 'center' };
      infoRow.height = 20;
      partyReportSheet.addRow([]); // Blank spacer

      // Iterate through each party and add all jobs
      partiesToExport.forEach((party, pIdx) => {
        // A. Party Banner Row
        const bannerText = `🏢 EXPORTER / PARTY [${String(pIdx + 1).padStart(3, '0')}]: ${party.partyName}   |   SBs Filed: ${party.totalSbs}   |   Containers: ${party.totalContainers}   |   TEUs: ${party.totalTeus}   |   FOB Value: ₹ ${party.totalFobValue > 0 ? party.totalFobValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}${party.locationsList ? `   |   Customs: ${party.locationsList}` : ''}`;

        const partyBannerRow = partyReportSheet.addRow([bannerText]);
        partyReportSheet.mergeCells(partyBannerRow.number, 1, partyBannerRow.number, numCols);
        partyBannerRow.font = { bold: true, size: 10.5, color: { argb: 'FFFFFFFF' } };
        partyBannerRow.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        partyBannerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0284C7' } // Sky / Ocean Blue
        };
        partyBannerRow.height = 24;

        // B. Column Headers for Jobs
        const colHeaders = exportCols.map(c => c.label);
        const headerRow = partyReportSheet.addRow(colHeaders);
        headerRow.font = { bold: true, size: 9, color: { argb: 'FF1E293B' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE2E8F0' } // Light slate
        };
        headerRow.height = 20;
        headerRow.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          };
        });

        // C. Individual Jobs for this Party
        party.jobs.forEach((job, jIdx) => {
          const rowData = getExcelRowData(job, jIdx, exportCols);
          const jobValues = exportCols.map(c => rowData[c.key] ?? '');
          const jobRow = partyReportSheet.addRow(jobValues);
          jobRow.height = 20;

          jobRow.eachCell((cell, colNumber) => {
            const colKey = exportCols[colNumber - 1]?.key;
            cell.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };
            if (colKey === 'exporter' || colKey === 'commodity' || colKey === 'consignee' || colKey === 'shipping_line') {
              cell.alignment.horizontal = 'left';
            } else if (colKey === 'fob_value' || colKey === 'invoice_value' || colKey === 'gross_weight' || colKey === 'net_weight') {
              cell.alignment.horizontal = 'right';
            }

            if (colKey === 'commodity') {
              cell.font = { size: 8, name: 'Arial Narrow' };
            } else if (colKey === 'hsn_code' || colKey === 'exim_code' || colKey === 'job_no') {
              cell.font = { size: 9, name: 'Consolas', bold: colKey === 'job_no' };
            } else {
              cell.font = { size: 9, name: 'Calibri' };
            }

            if (jIdx % 2 === 1) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF8FAFC' }
              };
            }

            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            };
          });
        });

        // D. Party Subtotal Row
        const subtotalValues = new Array(numCols).fill('');
        subtotalValues[0] = `SUBTOTAL (${party.totalSbs} SBs)`;
        exportCols.forEach((col, cIdx) => {
          if (col.key === 'totalContainers') subtotalValues[cIdx] = party.totalContainers;
          if (col.key === 'teus') subtotalValues[cIdx] = party.totalTeus;
          if (col.key === 'fob_value') subtotalValues[cIdx] = party.totalFobValue > 0 ? party.totalFobValue.toFixed(2) : '';
          if (col.key === 'rodtep_amount') {
            const partyRodtepTotal = party.jobs.reduce((s, j) => s + (parseFloat(j.rodtep_amount) || 0), 0);
            if (partyRodtepTotal > 0) subtotalValues[cIdx] = partyRodtepTotal.toFixed(2);
          }
          if (col.key === 'dbk_amount') {
            const partyDbkTotal = party.jobs.reduce((s, j) => s + (parseFloat(j.dbk_amount) || 0), 0);
            if (partyDbkTotal > 0) subtotalValues[cIdx] = partyDbkTotal.toFixed(2);
          }
        });
        const subtotalRow = partyReportSheet.addRow(subtotalValues);
        subtotalRow.font = { bold: true, size: 9, color: { argb: 'FF92400E' } };
        subtotalRow.height = 22;
        subtotalRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF3C7' } // Light amber
        };
        subtotalRow.eachCell((cell, colNumber) => {
          const colKey = exportCols[colNumber - 1]?.key;
          if (colKey === 'fob_value' || colKey === 'totalContainers' || colKey === 'teus' || colKey === 'rodtep_amount' || colKey === 'dbk_amount') {
            cell.alignment = { vertical: 'middle', horizontal: (colKey === 'fob_value' || colKey === 'rodtep_amount' || colKey === 'dbk_amount') ? 'right' : 'center' };
          } else if (colNumber === 1) {
            cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
          }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFF59E0B' } },
            bottom: { style: 'medium', color: { argb: 'FFF59E0B' } }
          };
        });

        // Spacing before next party
        const spacer = partyReportSheet.addRow([]);
        spacer.height = 12;
      });

      // E. Grand Total Row across all exported parties
      const grandTotalValues = new Array(numCols).fill('');
      const totalPartiesCount = partiesToExport.length;
      const totalSbsCount = partiesToExport.reduce((s, p) => s + (p.totalSbs || 0), 0);
      const totalCntrsCount = partiesToExport.reduce((s, p) => s + (p.totalContainers || 0), 0);
      const totalTeusCount = partiesToExport.reduce((s, p) => s + (p.totalTeus || 0), 0);
      const totalFobCount = partiesToExport.reduce((s, p) => s + (p.totalFobValue || 0), 0);
      const totalRodtepCount = partiesToExport.reduce((s, p) => s + p.jobs.reduce((sj, j) => sj + (parseFloat(j.rodtep_amount) || 0), 0), 0);
      const totalDbkCount = partiesToExport.reduce((s, p) => s + p.jobs.reduce((sj, j) => sj + (parseFloat(j.dbk_amount) || 0), 0), 0);

      grandTotalValues[0] = `GRAND TOTAL (${totalPartiesCount} PARTIES - ${totalSbsCount} SBS)`;
      exportCols.forEach((col, cIdx) => {
        if (col.key === 'totalContainers') grandTotalValues[cIdx] = totalCntrsCount;
        if (col.key === 'teus') grandTotalValues[cIdx] = totalTeusCount;
        if (col.key === 'fob_value') grandTotalValues[cIdx] = totalFobCount > 0 ? totalFobCount.toFixed(2) : '';
        if (col.key === 'rodtep_amount') grandTotalValues[cIdx] = totalRodtepCount > 0 ? totalRodtepCount.toFixed(2) : '';
        if (col.key === 'dbk_amount') grandTotalValues[cIdx] = totalDbkCount > 0 ? totalDbkCount.toFixed(2) : '';
      });

      const grandTotalRow = partyReportSheet.addRow(grandTotalValues);
      grandTotalRow.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      grandTotalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF065F46' } // Deep Emerald
      };
      grandTotalRow.height = 24;
      grandTotalRow.eachCell((cell, colNumber) => {
        const colKey = exportCols[colNumber - 1]?.key;
        if (colKey === 'fob_value' || colKey === 'totalContainers' || colKey === 'teus') {
          cell.alignment = { vertical: 'middle', horizontal: colKey === 'fob_value' ? 'right' : 'center' };
        } else if (colNumber === 1) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        }
      });

      // 2. SHEET 2: PARTY SUMMARY OVERVIEW (Rollup per party)
      const partySummarySheet = workbook.addWorksheet('Party Summary Overview');
      partySummarySheet.columns = [
        { header: 'Srl No.', key: 'srlNo', width: 10 },
        { header: 'Exporter / Party Name', key: 'partyName', width: 38 },
        { header: 'Total SBs Filed', key: 'totalSbs', width: 16 },
        { header: 'Total TEUs', key: 'totalTeus', width: 14 },
        { header: 'Total Containers', key: 'totalContainers', width: 16 },
        { header: 'Total FOB Value (INR)', key: 'totalFobValue', width: 22 },
        { header: 'Custom House Locations', key: 'locationsList', width: 30 },
        { header: 'HSN Codes (Summary)', key: 'hsnList', width: 35 },
      ];

      partySummarySheet.getRow(1).font = { bold: true, size: 10 };
      partySummarySheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      partySummarySheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDCE6F1' }
      };

      partiesToExport.forEach((party, idx) => {
        const row = partySummarySheet.addRow({
          srlNo: String(idx + 1).padStart(3, '0'),
          partyName: party.partyName,
          totalSbs: party.totalSbs,
          totalTeus: party.totalTeus,
          totalContainers: party.totalContainers,
          totalFobValue: party.totalFobValue > 0 ? party.totalFobValue.toFixed(2) : '',
          locationsList: party.locationsList,
          hsnList: party.hsnList,
        });

        row.eachCell((cell, colNumber) => {
          cell.alignment = { vertical: 'middle', horizontal: colNumber === 2 ? 'left' : (colNumber === 6 ? 'right' : 'center') };
          cell.font = { size: 10, name: 'Calibri' };
        });
      });
    } else {
      // Job-Wise Mode (Standard clearance or admin freight)
      const worksheet = workbook.addWorksheet(reportType === 'adminFreight' ? 'Admin Freight Report' : 'Export Clearance Report');
      worksheet.columns = visibleCols.map(col => ({
        header: col.label,
        key: col.key,
        width: col.key === 'job_no' ? 22 : (col.key === 'commodity' ? 45 : (col.minWidth / 5) || 16)
      }));

      worksheet.getRow(1).font = { bold: true, size: 10 };
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

      detailedRows.forEach((row, index) => {
        const rowData = getExcelRowData(row, index, visibleCols);
        const excelRow = worksheet.addRow(rowData);
        excelRow.eachCell((cell, colNumber) => {
          const colKey = visibleCols[colNumber - 1].key;
          cell.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };
          if (colKey === 'exporter' || colKey === 'commodity' || colKey === 'consignee') {
            cell.alignment.horizontal = 'left';
          }
          if (colKey === 'commodity') {
            cell.font = { size: 8, name: 'Arial Narrow' };
          } else {
            cell.font = { size: 10, name: 'Calibri' };
          }
        });
      });

      if (reportType === 'clearance') {
        const summaryRows = generateSummaryRows();
        const exporterSummaryRows = generateExporterSummaryRows();
        let currentRow = worksheet.rowCount + 3;

        worksheet.getRow(currentRow).values = [`SUMMARY BY LOCATION - ${monthName} ${year}`];
        worksheet.getRow(currentRow).font = { bold: true, size: 11 };
        currentRow++;
        worksheet.getRow(currentRow).values = ['Particulars', '20', '40', 'TEUS'];
        worksheet.getRow(currentRow).font = { bold: true, size: 10 };
        currentRow++;
        summaryRows.forEach(row => {
          worksheet.getRow(currentRow).values = [row.location, row.count20, row.count40, row.teus];
          worksheet.getRow(currentRow).font = { size: 10 };
          currentRow++;
        });

        currentRow += 2;
        worksheet.getRow(currentRow).values = [`SUMMARY BY EXPORTER - ${monthName} ${year}`];
        worksheet.getRow(currentRow).font = { bold: true, size: 11 };
        currentRow++;
        worksheet.getRow(currentRow).values = ['Exporter Name', '20', '40', 'TEUS'];
        worksheet.getRow(currentRow).font = { bold: true, size: 10 };
        currentRow++;
        exporterSummaryRows.forEach(row => {
          worksheet.getRow(currentRow).values = [row.exporter, row.count20, row.count40, row.teus];
          worksheet.getRow(currentRow).font = { size: 10 };
          currentRow++;
        });
      }
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const modePrefix = viewMode === 'partyWise' ? 'party_wise_' : '';
    const filename = `${modePrefix}export_clearance_report_${monthName}_${year}_${timestamp}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), filename);
  };

  const exportToPDF = async () => {
    const jsPDF = (await import('jspdf')).default;
    await import('jspdf-autotable');
    const doc = new jsPDF('l', 'mm', 'a4');
    const monthName = months.find(m => String(m.value) === String(month))?.label || 'Unknown';

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const title = viewMode === 'partyWise' && reportType === 'clearance'
      ? `Export Clearance Party-Wise Report of ${monthName}-${year}`
      : `Export Clearing Details of ${monthName}-${year}`;
    const pageWidth = doc.internal.pageSize.getWidth();
    const textWidth = doc.getTextWidth(title);
    const x = (pageWidth - textWidth) / 2;
    doc.text(title, x, 15);

    if (viewMode === 'partyWise' && reportType === 'clearance') {
      // Party-Wise Summary Table
      const partyHeaders = ['Srl No.', 'Exporter / Party Name', 'SBs Filed', 'TEUs', 'Containers', 'FOB Value (₹)', 'Locations', 'HSN Codes'];
      const partyData = partyWiseData.map((p, idx) => [
        String(idx + 1).padStart(3, '0'),
        p.partyName,
        `${p.totalSbs} SBs`,
        String(p.totalTeus),
        String(p.totalContainers),
        p.totalFobValue > 0 ? p.totalFobValue.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—',
        p.locationsList || '—',
        p.hsnList || '—'
      ]);

      doc.autoTable({
        head: [partyHeaders],
        body: partyData,
        startY: 25,
        styles: {
          fontSize: 7,
          cellPadding: 1.5,
          overflow: 'linebreak',
          textColor: [0, 0, 0]
        },
        headStyles: {
          fillColor: [25, 118, 210],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
          halign: 'center',
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 14, halign: 'center' },
          1: { cellWidth: 55, halign: 'left' },
          2: { cellWidth: 18, halign: 'center' },
          3: { cellWidth: 15, halign: 'center' },
          4: { cellWidth: 18, halign: 'center' },
          5: { cellWidth: 30, halign: 'right' },
          6: { cellWidth: 60, halign: 'left' },
          7: { cellWidth: 'auto', halign: 'left' },
        },
        margin: { top: 25, right: 5, bottom: 15, left: 5 },
        theme: 'grid'
      });

      doc.addPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const detTitle = `Export Shipping Bills Breakdown by Party - ${monthName} ${year}`;
      doc.text(detTitle, (pageWidth - doc.getTextWidth(detTitle)) / 2, 15);
    }

    // Main / Detailed Table Data
    const tableHeaders = visibleCols.map(c => c.label);
    const tableData = detailedRows.map((row, index) => {
      const containerNos = Array.isArray(row.containerNumbers) ? row.containerNumbers.join('\n') : (row.containerNumbers || '');
      const sbDate = row.sb_date ? new Date(row.sb_date).toLocaleDateString('en-GB').replace(/\//g, '-') : '';
      const leoDate = row.leo_date ? new Date(row.leo_date).toLocaleDateString('en-GB').replace(/\//g, '-') : '';
      const invValueDisplay = row.invoice_value && row.inv_currency
        ? `${row.inv_currency} ${(parseFloat(row.invoice_value)).toFixed(2)}`
        : (row.invoice_value ? String(row.invoice_value) : '');

      return visibleCols.map((col) => {
        switch (col.key) {
          case 'srlNo':
            return String(index + 1).padStart(3, '0');
          case 'job_no':
            return row.job_no || '';
          case 'location':
            return row.location || '';
          case 'exporter':
            return row.exporter || '';
          case 'commodity':
            return row.commodity || '';
          case 'invoice_value':
            return invValueDisplay;
          case 'fob_value':
            return row.fob_value ? parseFloat(row.fob_value).toFixed(2) : '';
          case 'sb_no':
            return row.sb_no || '';
          case 'sb_date':
            return sbDate;
          case 'containerNumbers':
            return containerNos;
          case 'containerDetails':
            return Array.isArray(row.containerDetails)
              ? row.containerDetails.map(c => `${c.containerNo} (${c.containerSize})`).join('\n')
              : '';
          case 'totalContainers':
            return row.totalContainers || '';
          case 'noOfContrSize':
            return row.noOfContrSize || '';
          case 'size':
            return deriveSize(row.noOfContrSize);
          case 'teus':
            return isLclJob(row) ? 'LCL' : (row.teus || '');
          case 'leo_date':
            return leoDate;
          case 'remarks':
            return row.remarks || '';
          case 'hsn_code':
            return row.hsn_code || '';
          case 'exim_code':
            return row.exim_code || '';
          case 'invoice_no':
            return row.invoice_no || '';
          case 'invoice_date':
            return row.invoice_date || '';
          case 'consignee':
            return row.consignee || '';
          case 'shipping_line':
            return row.shipping_line || '';
          case 'gross_weight':
            return row.gross_weight ? `${row.gross_weight} KG` : '';
          case 'net_weight':
            return row.net_weight ? `${row.net_weight} KG` : '';
          case 'packages':
            return row.packages ? `${row.packages} ${row.package_unit || ''}`.trim() : '';
          case 'pol':
            return row.pol || '';
          case 'pod':
            return row.pod || '';
          case 'country':
            return row.country || '';
          case 'type_of_sb':
            return row.type_of_sb || '';
          case 'ports':
            return formatPortsText(row.pol, row.pod, row.country, false);
          case 'rodtep_rate':
            return row.rodtep_rate || '';
          case 'rodtep_amount':
            return row.rodtep_amount ? parseFloat(row.rodtep_amount).toFixed(2) : '';
          case 'rodtep_claim':
            return row.rodtep_claim || '';
          case 'dbk_rate':
            return row.dbk_rate || '';
          case 'dbk_amount':
            return row.dbk_amount ? parseFloat(row.dbk_amount).toFixed(2) : '';
          case 'dbk_sr_no':
            return row.dbk_sr_no || '';
          case 'dbk_scroll_no':
            return row.dbk_scroll_no || '';
          case 'dbk_scroll_date':
            return row.dbk_scroll_date ? new Date(row.dbk_scroll_date).toLocaleDateString('en-GB') : '';
          case 'rosctl_rate':
            return row.rosctl_rate || '';
          case 'rosctl_amount':
            return row.rosctl_amount ? parseFloat(row.rosctl_amount).toFixed(2) : '';
          case 'rosctl_claim':
            return row.rosctl_claim || '';
          case 'reward_item':
            return row.reward_item || '';
          case 'igst_status':
            return row.igst_status || '';
          case 'origin_state':
            return row.origin_state || '';
          case 'origin_district':
            return row.origin_district || '';
          case 'freight_amount':
            return row.freight_amount || row.rate_total || '—';
          case 'currency': {
            let curr = row.currency || "USD";
            if (!row.currency && row.freight_amount && typeof row.freight_amount === 'string') {
              const match = row.freight_amount.match(/[A-Za-z]+/);
              if (match) curr = match[0].toUpperCase();
            }
            return curr;
          }
          default:
            return row[col.key] || '';
        }
      });
    });

    const styleMap = {
      srlNo: { cellWidth: 8, halign: 'center' },
      job_no: { cellWidth: 30, halign: 'center' },
      location: { cellWidth: 22, halign: 'center' },
      exporter: { cellWidth: 38, halign: 'left' },
      commodity: { halign: 'left' },
      invoice_value: { cellWidth: 20, halign: 'center' },
      fob_value: { cellWidth: 20, halign: 'right' },
      sb_no: { cellWidth: 16, halign: 'center' },
      sb_date: { cellWidth: 18, halign: 'center' },
      containerNumbers: { cellWidth: 24, halign: 'center' },
      containerDetails: { cellWidth: 26, halign: 'left' },
      totalContainers: { cellWidth: 8, halign: 'center' },
      size: { cellWidth: 12, halign: 'center' },
      teus: { cellWidth: 10, halign: 'center' },
      leo_date: { cellWidth: 18, halign: 'center' },
      remarks: { cellWidth: 12, halign: 'center' },
      hsn_code: { cellWidth: 18, halign: 'center' },
      exim_code: { cellWidth: 14, halign: 'center' },
      invoice_no: { cellWidth: 16, halign: 'center' },
      invoice_date: { cellWidth: 16, halign: 'center' },
      consignee: { cellWidth: 26, halign: 'left' },
      shipping_line: { cellWidth: 20, halign: 'left' },
      gross_weight: { cellWidth: 16, halign: 'right' },
      net_weight: { cellWidth: 16, halign: 'right' },
      packages: { cellWidth: 14, halign: 'center' },
      pol: { cellWidth: 18, halign: 'center' },
      pod: { cellWidth: 18, halign: 'center' },
      country: { cellWidth: 16, halign: 'center' },
      type_of_sb: { cellWidth: 15, halign: 'center' },
      ports: { cellWidth: 28, halign: 'center' },
      movement_type: { cellWidth: 15, halign: 'center' },
      forwarder_name: { halign: 'left' },
      term_of_invoice: { cellWidth: 15, halign: 'center' },
      freight_amount: { cellWidth: 20, halign: 'center' },
      currency: { cellWidth: 15, halign: 'center' }
    };

    const columnStyles = {};
    visibleCols.forEach((col, idx) => {
      const cfg = styleMap[col.key] || { halign: 'center' };
      columnStyles[idx] = {
        cellWidth: cfg.cellWidth || 'auto',
        halign: cfg.halign,
        fontSize: col.key === 'commodity' ? 5 : 7
      };
    });

    doc.autoTable({
      head: [tableHeaders],
      body: tableData,
      startY: (viewMode === 'partyWise' && reportType === 'clearance') ? 25 : 25,
      styles: {
        fontSize: 6,
        cellPadding: 1,
        overflow: 'linebreak',
        lineColor: [205, 133, 63],
        lineWidth: 0.3,
        textColor: [0, 0, 0]
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 6,
        halign: 'center',
        valign: 'middle',
        lineColor: [205, 133, 63],
        lineWidth: 0.5
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 7.5,
        valign: 'middle',
        lineColor: [205, 133, 63],
        lineWidth: 0.3
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255],
      },
      rowPageBreak: 'avoid',
      columnStyles: columnStyles,
      didParseCell: (data) => {
        const colKey = visibleCols[data.column.index]?.key;
        if (colKey === 'commodity') {
          data.cell.styles.fontSize = 6;
        }
      },
      margin: { top: 25, right: 5, bottom: 15, left: 5 },
      theme: 'grid',
      tableLineColor: [205, 133, 63],
      tableLineWidth: 0.5
    });

    if (reportType === 'clearance' && viewMode !== 'partyWise') {
      doc.addPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const summaryTitle = `Summary - ${monthName} ${year}`;
      const summaryTextWidth = doc.getTextWidth(summaryTitle);
      const summaryX = (doc.internal.pageSize.getWidth() - summaryTextWidth) / 2;
      doc.text(summaryTitle, summaryX, 15);

      const summaryRows = generateSummaryRows();
      const summaryHeaders = ['Particulars', '20', '40', 'TEUS'];
      const summaryBody = summaryRows.map(row => [
        row.location,
        row.count20,
        row.count40,
        row.teus
      ]);
      doc.autoTable({
        head: [summaryHeaders],
        body: summaryBody,
        startY: 25,
        styles: {
          fontSize: 8,
          cellPadding: 2,
          halign: 'center',
          valign: 'middle',
          lineColor: [205, 133, 63],
          lineWidth: 0.3,
          textColor: [0, 0, 0]
        },
        headStyles: {
          fillColor: [255, 224, 178],
          textColor: [51, 51, 51],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          valign: 'middle',
          lineColor: [205, 133, 63],
          lineWidth: 0.5
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: [51, 51, 51],
          fontSize: 8,
          halign: 'center',
          valign: 'middle',
          lineColor: [205, 133, 63],
          lineWidth: 0.3
        },
        margin: { top: 25, right: 5, bottom: 15, left: 5 },
        theme: 'grid',
        tableLineColor: [205, 133, 63],
        tableLineWidth: 0.5
      });

      const exporterSummaryRows = generateExporterSummaryRows();
      const exporterHeaders = ['Exporter Name', '20', '40', 'TEUS'];
      const exporterBody = exporterSummaryRows.map(row => [
        row.exporter,
        row.count20,
        row.count40,
        row.teus
      ]);

      doc.autoTable({
        head: [exporterHeaders],
        body: exporterBody,
        startY: doc.lastAutoTable.finalY + 10,
        styles: {
          fontSize: 8,
          cellPadding: 2,
          halign: 'center',
          valign: 'middle',
          lineColor: [205, 133, 63],
          lineWidth: 0.3,
          textColor: [0, 0, 0]
        },
        headStyles: {
          fillColor: [225, 245, 254],
          textColor: [51, 51, 51],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          valign: 'middle',
          lineColor: [205, 133, 63],
          lineWidth: 0.5
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: [51, 51, 51],
          fontSize: 8,
          halign: 'center',
          valign: 'middle',
          lineColor: [205, 133, 63],
          lineWidth: 0.3
        },
        margin: { top: 25, right: 5, bottom: 15, left: 5 },
        theme: 'grid',
        tableLineColor: [205, 133, 63],
        tableLineWidth: 0.5
      });
    }

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`${i}/${pageCount}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10);
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const modePrefix = viewMode === 'partyWise' ? 'PARTY_WISE_' : '';
    const filename = `${modePrefix}EXPORT_CLEARING_DETAILS_${monthName.toUpperCase()}-${year}_${timestamp}.pdf`;
    doc.save(filename);
  };

  return (
    <Container maxWidth="xl" sx={{ padding: 1, background: 'linear-gradient(135deg, #fdf6f0 0%, #f7faff 100%)', minHeight: '100vh' }}>
      {/* Compact Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 2,
          padding: 1,
          background: 'linear-gradient(90deg, #1976d2 0%, #e3f2fd 100%)',
          borderRadius: 1,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <Box sx={{ flex: 1, display: 'flex', gap: 1 }}>
          {/* Export Button with Dark Blue Gradient */}
          <Button
            variant="contained"
            startIcon={exportLoading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
            endIcon={!exportLoading && <ArrowDropDownIcon />}
            onClick={handleExportClick}
            disabled={loading || detailedRows.length === 0 || exportLoading}
            size="small"
            sx={{
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 50%, #5c6bc0 100%)',
              boxShadow: '0 4px 8px rgba(26, 35, 126, 0.3)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 50%, #42a5f5 100%)',
                boxShadow: '0 6px 12px rgba(26, 35, 126, 0.4)',
                transform: 'translateY(-1px)'
              },
              '&:disabled': {
                background: 'linear-gradient(135deg, #9e9e9e 0%, #bdbdbd 100%)',
                color: 'rgba(255,255,255,0.7)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            {exportLoading ? `Exporting ${exportType}...` : 'Export Report'}
          </Button>

          {/* Summary Button */}
          {reportType === 'clearance' && (
            <Button
              variant="outlined"
              startIcon={<TableViewIcon fontSize="small" sx={{ color: '#1976d2' }} />}
              onClick={() => setSummaryOpen(true)}
              disabled={loading || detailedRows.length === 0}
              size="small"
              sx={{
                fontWeight: 'bold',
                borderColor: '#1976d2',
                color: '#1976d2',
                background: 'linear-gradient(135deg, #e3f2fd 0%, #fdf6f0 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #bbdefb 0%, #ffe0b2 100%)',
                  borderColor: '#1976d2',
                  color: '#1565c0'
                },
                '&:disabled': {
                  color: '#bdbdbd',
                  borderColor: '#bdbdbd',
                  background: 'linear-gradient(135deg, #f5f5f5 0%, #eeeeee 100%)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              Summary
            </Button>
          )}

          {/* Customize Columns Button */}
          {reportType === 'clearance' && (
            <Button
              variant="outlined"
              startIcon={<TuneIcon fontSize="small" sx={{ color: '#0284c7' }} />}
              onClick={() => setCustomizeOpen(true)}
              size="small"
              sx={{
                fontWeight: 'bold',
                borderColor: '#0284c7',
                color: '#0284c7',
                background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                  borderColor: '#0369a1',
                  color: '#0369a1'
                },
                transition: 'all 0.3s ease'
              }}
            >
              Customize ({customColumns.length})
            </Button>
          )}

          {/* Job-Wise vs Party-Wise Toggle */}
          {reportType === 'clearance' && (
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, next) => {
                if (next) {
                  setViewMode(next);
                  try {
                    localStorage.setItem("exim_clearance_view_mode", next);
                  } catch (err) {}
                }
              }}
              size="small"
              sx={{
                bgcolor: 'white',
                borderRadius: 1,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                '& .MuiToggleButton-root': {
                  px: 1.5,
                  py: 0.5,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  '&.Mui-selected': {
                    bgcolor: '#0f172a',
                    color: '#38bdf8',
                    borderColor: '#0f172a',
                    '&:hover': { bgcolor: '#1e293b' }
                  }
                }
              }}
            >
              <ToggleButton value="jobWise">
                <ListAltIcon fontSize="small" sx={{ mr: 0.5, fontSize: 16 }} /> Job-Wise
              </ToggleButton>
              <ToggleButton value="partyWise">
                <BusinessIcon fontSize="small" sx={{ mr: 0.5, fontSize: 16 }} /> Party-Wise
              </ToggleButton>
            </ToggleButtonGroup>
          )}

          {/* Export Options Menu */}
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleExportClose}
            PaperProps={{
              elevation: 8,
              sx: {
                mt: 1,
                minWidth: 200,
                borderRadius: 2,
                '& .MuiMenuItem-root': {
                  px: 2,
                  py: 1.5,
                  borderRadius: 1,
                  mx: 1,
                  my: 0.5,
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  }
                }
              }
            }}
          >
            <MenuItem onClick={() => handleExportReport('excel')}>
              <ListItemIcon>
                <TableViewIcon fontSize="small" sx={{ color: '#1976d2' }} />
              </ListItemIcon>
              <ListItemText
                primary="Export as Excel"
                secondary="With summary sheet"
                sx={{
                  '& .MuiListItemText-secondary': {
                    fontSize: '0.75rem',
                    color: '#666'
                  }
                }}
              />
            </MenuItem>
            <Divider sx={{ mx: 1 }} />
            <MenuItem onClick={() => handleExportReport('pdf')}>
              <ListItemIcon>
                <PictureAsPdfIcon fontSize="small" sx={{ color: '#d32f2f' }} />
              </ListItemIcon>
              <ListItemText
                primary="Export as PDF"
                secondary="With summary table"
                sx={{
                  '& .MuiListItemText-secondary': {
                    fontSize: '0.75rem',
                    color: '#666'
                  }
                }}
              />
            </MenuItem>
          </Menu>
        </Box>
        {/* Summary Dialog */}
        <Dialog open={summaryOpen} onClose={() => setSummaryOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 'bold', background: 'linear-gradient(90deg, #fdf6f0 0%, #e3f2fd 100%)' }}>
            Summary - {months.find(m => m.value === month)?.label} {year}
          </DialogTitle>
          <DialogContent sx={{ background: '#fff' }}>
            <TableContainer sx={{ mb: 4 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: '#f57c00' }}>By Location</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ fontWeight: 'bold', background: '#ffe0b2', color: '#333' }}>Particulars</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', background: '#ffe0b2', color: '#333' }}>20</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', background: '#ffe0b2', color: '#333' }}>40</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', background: '#ffe0b2', color: '#333' }}>TEUS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {generateSummaryRows().map((row, idx) => (
                    <TableRow key={idx} sx={{ background: row.location === 'LCL JOBS' ? '#e3f2fd' : (row.location === 'TOTAL' ? '#fff3e0' : undefined) }}>
                      <TableCell align="center" sx={{ fontWeight: (row.location === 'LCL JOBS' || row.location === 'TOTAL') ? 'bold' : 'normal' }}>{row.location}</TableCell>
                      <TableCell align="center">{row.count20}</TableCell>
                      <TableCell align="center">{row.count40}</TableCell>
                      <TableCell align="center">{row.teus}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TableContainer>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: '#0288d1' }}>By Exporter</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ fontWeight: 'bold', background: '#e1f5fe', color: '#333' }}>Exporter Name</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', background: '#e1f5fe', color: '#333' }}>20</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', background: '#e1f5fe', color: '#333' }}>40</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', background: '#e1f5fe', color: '#333' }}>TEUS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {generateExporterSummaryRows().map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell align="left" sx={{ fontSize: '0.75rem' }}>{row.exporter}</TableCell>
                      <TableCell align="center">{row.count20}</TableCell>
                      <TableCell align="center">{row.count40}</TableCell>
                      <TableCell align="center">{row.teus}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSummaryOpen(false)} color="primary" variant="contained">Close</Button>
          </DialogActions>
        </Dialog>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
          <Typography
            variant="h6"
            align="center"
            sx={{
              fontWeight: 'bold',
              color: 'white',
              textShadow: '0 1px 4px rgba(25, 118, 210, 0.15)',
              fontSize: '1rem'
            }}
          >
            {reportType === 'adminFreight' ? 'Admin Freight Report' : 'Export Clearance Report'}
          </Typography>
          {user && user.role === 'Admin' && (
            <FormControl size="small" sx={{ minWidth: 150, background: 'white', borderRadius: 1 }}>
              <Select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                sx={{ fontSize: '0.8rem', height: 30 }}
              >
                <MenuItem value="clearance">Clearance Report</MenuItem>
                <MenuItem value="adminFreight">Freight Report</MenuItem>
              </Select>
            </FormControl>
          )}
        </Box>



        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>

          {isSrManager && (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Grade</InputLabel>
              <Select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                label="Grade"
              >
                {gradeOptions.map((grade) => (
                  <MenuItem key={grade.value} value={grade.value}>
                    {grade.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel>Year</InputLabel>
            <Select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              label="Year"
            >
              {years.map((y) => (
                <MenuItem key={y.value} value={y.value}>{y.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Branch</InputLabel>
            <Select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              label="Branch"
            >
              {BRANCH_OPTIONS.map((branch) => (
                <MenuItem key={branch.value} value={branch.value}>
                  {branch.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={handlePreviousMonth}
              sx={{
                bgcolor: '#f5f5f5',
                '&:hover': { bgcolor: '#e0e0e0' }
              }}
            >
              <ArrowBackIosNewIcon fontSize="small" />
            </IconButton>

            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Month</InputLabel>
              <Select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                label="Month"
              >
                {months.map((m) => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <IconButton
              size="small"
              onClick={handleNextMonth}
              sx={{
                bgcolor: '#f5f5f5',
                '&:hover': { bgcolor: '#e0e0e0' }
              }}
            >
              <ArrowForwardIosIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Search and Country Filters */}
      {processedData.length > 0 && (
        <Box
          sx={{
            display: "flex",
            gap: 2,
            marginBottom: 2,
            padding: 1.5,
            backgroundColor: "white",
            borderRadius: 1,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            border: "1px solid #cbd5e1",
            alignItems: "center",
            flexWrap: "wrap"
          }}
        >
          <TextField
            size="small"
            label="Search Report"
            variant="outlined"
            placeholder="Search by Job No, Exporter, Commodity, Container, SB No..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flex: 1, minWidth: 250 }}
          />

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Country</InputLabel>
            <Select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              label="Country"
            >
              <MenuItem value="">All Countries</MenuItem>
              {countryOptions.map((country) => (
                <MenuItem key={country} value={country}>
                  {country}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel>Filter by Exporter / Party</InputLabel>
            <Select
              value={selectedParty}
              onChange={(e) => setSelectedParty(e.target.value)}
              label="Filter by Exporter / Party"
            >
              <MenuItem value="">
                <em>All Parties ({partyOptions.length})</em>
              </MenuItem>
              {partyOptions.map((partyName) => (
                <MenuItem key={partyName} value={partyName}>
                  {partyName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ marginBottom: 2 }}>
          {error}
        </Alert>
      )}

      {/* Data Summary Card */}
      {processedData.length > 0 && (
        <Card elevation={1} sx={{ marginBottom: 2, padding: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            {viewMode === 'partyWise' && reportType === 'clearance' ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1a237e' }}>
                  Party-Wise Report: {partyWiseData.length} {partyWiseData.length === 1 ? 'Party' : 'Parties'} ({detailedRows.length} total SBs) found for {months.find(m => String(m.value) === String(month))?.label} {year}
                </Typography>
                {partyWiseData.length > 1 && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleToggleAllParties}
                    startIcon={collapsedParties.size === 0 ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    sx={{ textTransform: 'none', fontSize: '0.72rem', py: 0.2, px: 1, borderColor: '#0284c7', color: '#0284c7' }}
                  >
                    {collapsedParties.size === 0 ? "Collapse All Parties" : "Expand All Parties"}
                  </Button>
                )}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1a237e' }}>
                Report Summary: {detailedRows.length} records found for {months.find(m => String(m.value) === String(month))?.label} {year}
              </Typography>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1976d2', bgcolor: '#e3f2fd', px: 2, py: 0.5, borderRadius: 1 }}>
                Total TEUs: {
                  detailedRows.reduce((sum, row) => {
                    if (isLclJob(row)) return sum;
                    return sum + (parseInt(row.teus) || 0);
                  }, 0)
                }
              </Typography>
              {viewMode === 'partyWise' && reportType === 'clearance' && (
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#166534', bgcolor: '#dcfce7', px: 2, py: 0.5, borderRadius: 1 }}>
                  Total SBs: {detailedRows.length}
                </Typography>
              )}
            </Box>
          </Box>
        </Card>
      )}

      {/* Data Table: Party-Wise or Job-Wise */}
      {processedData.length > 0 && (
        <Card elevation={1} sx={{ overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
            {viewMode === 'partyWise' && reportType === 'clearance' ? (
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {visibleCols.map((col) => (
                      <TableCell
                        key={col.key}
                        align="center"
                        sx={{
                          fontWeight: "bold",
                          fontSize: "0.75rem",
                          padding: "8px 6px",
                          backgroundColor: '#f1f5f9',
                          color: '#1e293b',
                          minWidth: col.minWidth,
                          whiteSpace: 'nowrap',
                          borderBottom: '2px solid #cbd5e1'
                        }}
                      >
                        {col.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, idx) => (
                      <TableRow key={idx}>
                        {visibleCols.map((col) => (
                          <TableCell key={col.key} align="center" sx={{ py: 1 }}>
                            <Skeleton variant="text" height={22} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : partyWiseData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={visibleCols.length} align="center" sx={{ py: 6, fontSize: '0.85rem', color: 'text.secondary' }}>
                        🔍 No records match your search or filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    partyWiseData.map((party, pIdx) => {
                      const isCollapsed = collapsedParties.has(party.partyName);
                      return (
                        <React.Fragment key={pIdx}>
                          {/* Party Group Header Banner Row */}
                          <TableRow
                            sx={{
                              bgcolor: '#0284c7',
                              borderTop: pIdx > 0 ? '3px solid #0369a1' : 'none',
                              '&:hover': { bgcolor: '#0369a1' }
                            }}
                          >
                            <TableCell
                              colSpan={visibleCols.length}
                              sx={{
                                py: 0.9,
                                px: 2,
                                color: '#ffffff',
                                fontWeight: 700
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap' }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => togglePartyCollapse(party.partyName)}
                                    sx={{ color: '#ffffff', bgcolor: 'rgba(255,255,255,0.15)', p: 0.4, '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}
                                  >
                                    {isCollapsed ? <KeyboardArrowRightIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                                  </IconButton>
                                  <BusinessIcon sx={{ fontSize: 18, color: '#e0f2fe' }} />
                                  <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.86rem', letterSpacing: '0.2px', color: '#ffffff' }}>
                                    {String(pIdx + 1).padStart(3, '0')}. {party.partyName}
                                  </Typography>
                                  <Chip
                                    label={`${party.totalSbs} SBs`}
                                    size="small"
                                    sx={{ height: 22, fontSize: '0.72rem', fontWeight: 700, bgcolor: '#ffffff', color: '#0369a1' }}
                                  />
                                  <Chip
                                    label={`${party.totalTeus} TEUs`}
                                    size="small"
                                    sx={{ height: 22, fontSize: '0.72rem', fontWeight: 700, bgcolor: 'rgba(255,255,255,0.2)', color: '#ffffff' }}
                                  />
                                  <Chip
                                    label={`${party.totalContainers} Cntrs`}
                                    size="small"
                                    sx={{ height: 22, fontSize: '0.72rem', fontWeight: 600, bgcolor: 'rgba(255,255,255,0.2)', color: '#ffffff' }}
                                  />
                                  {party.totalFobValue > 0 && (
                                    <Chip
                                      label={`₹ ${party.totalFobValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                      size="small"
                                      sx={{ height: 22, fontSize: '0.72rem', fontWeight: 700, bgcolor: '#dcfce7', color: '#166534', fontFamily: 'monospace' }}
                                    />
                                  )}
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {party.locationsList && (
                                    <Typography variant="caption" sx={{ color: '#e0f2fe', fontSize: '0.72rem' }}>
                                      Customs: <b>{party.locationsList}</b>
                                    </Typography>
                                  )}
                                  <Button
                                    size="small"
                                    onClick={() => togglePartyCollapse(party.partyName)}
                                    sx={{
                                      color: '#ffffff',
                                      textTransform: 'none',
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      py: 0.2,
                                      px: 1,
                                      bgcolor: 'rgba(255,255,255,0.15)',
                                      '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                                    }}
                                  >
                                    {isCollapsed ? `Show ${party.jobs.length} Jobs` : 'Hide Jobs'}
                                  </Button>
                                </Box>
                              </Box>
                            </TableCell>
                          </TableRow>

                          {/* Individual Job Rows for this Party */}
                          {!isCollapsed && (
                            <>
                              {party.jobs.map((jobRow, jIdx) => (
                                <TableRow
                                  key={jIdx}
                                  hover
                                  sx={{
                                    '&:hover': { bgcolor: '#f1f5f9' },
                                    '&:nth-of-type(even)': { bgcolor: '#fafafa' }
                                  }}
                                >
                                  {visibleCols.map((col) => renderCellContent(jobRow, col, jIdx))}
                                </TableRow>
                              ))}

                              {/* Party Subtotal Row */}
                              <TableRow sx={{ bgcolor: '#fef3c7', borderBottom: '2px solid #fde68a' }}>
                                {visibleCols.map((col, cIdx) => {
                                  if (cIdx === 0) {
                                    return (
                                      <TableCell
                                        key={col.key}
                                        align="left"
                                        sx={{
                                          py: 0.8,
                                          px: 1.5,
                                          fontWeight: 800,
                                          fontSize: '0.72rem',
                                          color: '#92400e',
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        SUBTOTAL ({party.totalSbs} SBs)
                                      </TableCell>
                                    );
                                  }
                                  if (col.key === 'totalContainers') {
                                    return (
                                      <TableCell key={col.key} align="center" sx={{ py: 0.8, fontWeight: 800, fontSize: '0.75rem', color: '#92400e' }}>
                                        {party.totalContainers}
                                      </TableCell>
                                    );
                                  }
                                  if (col.key === 'teus') {
                                    return (
                                      <TableCell key={col.key} align="center" sx={{ py: 0.8, fontWeight: 800, fontSize: '0.75rem', color: '#92400e' }}>
                                        {party.totalTeus}
                                      </TableCell>
                                    );
                                  }
                                  if (col.key === 'fob_value') {
                                    return (
                                      <TableCell key={col.key} align="right" sx={{ py: 0.8, fontWeight: 800, fontSize: '0.75rem', color: '#166534', fontFamily: 'monospace' }}>
                                        {party.totalFobValue > 0 ? `₹ ${party.totalFobValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                      </TableCell>
                                    );
                                  }
                                  if (col.key === 'invoice_value') {
                                    return (
                                      <TableCell key={col.key} align="right" sx={{ py: 0.8, fontWeight: 800, fontSize: '0.75rem', color: '#166534', fontFamily: 'monospace' }}>
                                        {party.totalInvoiceValue > 0 ? `${party.currency} ${party.totalInvoiceValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                      </TableCell>
                                    );
                                  }
                                  if (col.key === 'rodtep_amount') {
                                    return (
                                      <TableCell key={col.key} align="right" sx={{ py: 0.8, fontWeight: 800, fontSize: '0.75rem', color: '#0369a1', fontFamily: 'monospace' }}>
                                        {party.totalRodtepAmount > 0 ? `₹ ${party.totalRodtepAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                      </TableCell>
                                    );
                                  }
                                  if (col.key === 'dbk_amount') {
                                    return (
                                      <TableCell key={col.key} align="right" sx={{ py: 0.8, fontWeight: 800, fontSize: '0.75rem', color: '#b45309', fontFamily: 'monospace' }}>
                                        {party.totalDbkAmount > 0 ? `₹ ${party.totalDbkAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                      </TableCell>
                                    );
                                  }
                                  if (col.key === 'rosctl_amount') {
                                    return (
                                      <TableCell key={col.key} align="right" sx={{ py: 0.8, fontWeight: 800, fontSize: '0.75rem', color: '#7e22ce', fontFamily: 'monospace' }}>
                                        {party.totalRosctlAmount > 0 ? `₹ ${party.totalRosctlAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                      </TableCell>
                                    );
                                  }
                                  return (
                                    <TableCell key={col.key} sx={{ py: 0.8, borderBottom: 'none' }} />
                                  );
                                })}
                              </TableRow>
                            </>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            ) : (
              // Job-Wise Normal Table
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {visibleCols.map((col) => (
                      <TableCell
                        key={col.key}
                        align="center"
                        sx={{
                          fontWeight: "bold",
                          fontSize: "0.75rem",
                          padding: "8px 6px",
                          backgroundColor: '#f5f5f5',
                          color: '#333',
                          minWidth: col.minWidth,
                          whiteSpace: 'nowrap',
                          borderBottom: '2px solid #e0e0e0'
                        }}
                      >
                        {col.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading
                    ? Array.from({ length: 8 }).map((_, idx) => (
                        <TableRow key={idx}>
                          {visibleCols.map((col) => (
                            <TableCell
                              key={col.key}
                              align="center"
                              sx={{
                                fontSize: "0.75rem",
                                padding: "6px 8px",
                                borderBottom: '1px solid #e0e0e0'
                              }}
                            >
                              <Skeleton variant="text" height={20} />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    : detailedRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={visibleCols.length} align="center" sx={{ py: 6, fontSize: "0.85rem", color: "text.secondary" }}>
                            🔍 No records match your search or country filter.
                          </TableCell>
                        </TableRow>
                      ) : (
                        detailedRows.map((row, idx) => (
                          <TableRow
                            key={idx}
                            sx={{
                              '&:hover': {
                                backgroundColor: '#f9f9f9'
                              },
                              '&:nth-of-type(even)': {
                                backgroundColor: '#fafafa'
                              }
                            }}
                          >
                            {visibleCols.map((col) => renderCellContent(row, col, idx))}
                          </TableRow>
                        ))
                      )}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        </Card>
      )}

      {/* Customize Report Modal */}
      <CustomizeReportModal
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        allColumns={ALL_CUSTOMIZABLE_COLUMNS}
        currentColumns={customColumns}
        defaultColumns={DEFAULT_CLEARANCE_COLUMNS}
        viewMode={viewMode}
        onApply={handleApplyCustomization}
      />

      {/* No Data State */}
      {!loading && processedData.length === 0 && (
        <Card elevation={1} sx={{ padding: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary" sx={{ mb: 2 }}>
            No Data Available
          </Typography>
          <Typography variant="body2" color="textSecondary">
            No Export clearance records found for {months.find(m => m.value === month)?.label} {year}
          </Typography>
        </Card>
      )}
    </Container>
  );
};

export default DetailedReport;
