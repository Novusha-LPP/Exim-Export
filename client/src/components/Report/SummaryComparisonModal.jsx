import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Grid,
  Card,
  CardContent,
  InputAdornment,
  TablePagination,
  Collapse,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import DateRangeIcon from "@mui/icons-material/DateRange";
import StarIcon from "@mui/icons-material/Star";
import TableViewIcon from "@mui/icons-material/TableView";
import BusinessIcon from "@mui/icons-material/Business";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { saveAs } from "file-saver";
import { getOptionsForBranch } from "../common/CustomHouseDropdown";

// Indian Financial Year Months (April to March)
export const FY_MONTHS = [
  { value: "4", num: 4, label: "April", short: "Apr", order: 1 },
  { value: "5", num: 5, label: "May", short: "May", order: 2 },
  { value: "6", num: 6, label: "June", short: "Jun", order: 3 },
  { value: "7", num: 7, label: "July", short: "Jul", order: 4 },
  { value: "8", num: 8, label: "August", short: "Aug", order: 5 },
  { value: "9", num: 9, label: "September", short: "Sep", order: 6 },
  { value: "10", num: 10, label: "October", short: "Oct", order: 7 },
  { value: "11", num: 11, label: "November", short: "Nov", order: 8 },
  { value: "12", num: 12, label: "December", short: "Dec", order: 9 },
  { value: "1", num: 1, label: "January", short: "Jan", order: 10 },
  { value: "2", num: 2, label: "February", short: "Feb", order: 11 },
  { value: "3", num: 3, label: "March", short: "Mar", order: 12 },
];

const EMPTY_ARRAY = Object.freeze([]);

const DEFAULT_BRANCH_OPTIONS = Object.freeze([
  { value: "ALL", label: "All Branches" },
  { value: "AMD", label: "Ahmedabad" },
  { value: "BRD", label: "Baroda" },
  { value: "GIM", label: "Gandhidham" },
  { value: "COK", label: "Cochin" },
  { value: "HAZ", label: "Hazira" },
]);

export default function SummaryComparisonModal({
  open,
  onClose,
  currentYear = "26-27",
  currentMonth = "10",
  years = EMPTY_ARRAY,
  selectedBranch = "AMD",
  branchOptions = EMPTY_ARRAY,
  allowedCustomHouses = null,
  isSrManager = false,
  gradeFilter = "",
  reportType = "clearance",
  initialData = EMPTY_ARRAY,
  initialDetailedRows = EMPTY_ARRAY,
}) {

  const effectiveBranchOptions = useMemo(() => {
    const base =
      branchOptions && branchOptions.length > 0 ? branchOptions : DEFAULT_BRANCH_OPTIONS;
    const hasAll = base.some((b) => b.value === "ALL");
    if (!hasAll) {
      return [{ value: "ALL", label: "All Branches" }, ...base];
    }
    return base;
  }, [branchOptions]);

  // Mode: "single" | "range" | "multi"
  const [filterMode, setFilterMode] = useState("range");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [singleMonth, setSingleMonth] = useState(String(currentMonth));
  const [currBranch, setCurrBranch] = useState(selectedBranch || "AMD");
  
  // Range selection (From - To in FY order)
  const [rangeFrom, setRangeFrom] = useState("4"); // default April
  const [rangeTo, setRangeTo] = useState("7");     // default July (4 months: Apr, May, Jun, Jul)
  
  // Custom multi-month selection
  const [customMonths, setCustomMonths] = useState(["4", "5", "6", "7"]);

  // Search & Filters inside the table
  const [searchQuery, setSearchQuery] = useState("");
  const [trendFilter, setTrendFilter] = useState("all"); // "all" | "increased" | "decreased" | "steady" | "new"
  const [sortBy, setSortBy] = useState("teus_desc"); // "teus_desc" | "growth_desc" | "growth_asc" | "name_asc"

  // View sections & pagination
  const [viewSection, setViewSection] = useState("all"); // "all" | "exporter" | "location"
  const [locationCollapsed, setLocationCollapsed] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100); // Default to 100 so all 63 are immediately visible!

  // Data fetching states
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Sync selectedYear, singleMonth & currBranch when dialog opens or props change
  useEffect(() => {
    if (open) {
      setSelectedYear(currentYear);
      if (currentMonth !== "all") {
        setSingleMonth(String(currentMonth));
      }
      setCurrBranch(selectedBranch || "AMD");
    }
  }, [open, currentYear, currentMonth, selectedBranch]);

  // Dynamic custom house filtering based on currBranch (null when "ALL")
  const modalAllowedCustomHouses = useMemo(() => {
    if (!currBranch || currBranch === "ALL") return null;
    const houses = new Set();
    try {
      const opts = getOptionsForBranch(currBranch);
      if (Array.isArray(opts)) {
        opts.forEach((group) => {
          (group.items || []).forEach((item) =>
            houses.add(String(item.value || "").toUpperCase())
          );
        });
      }
    } catch (err) {
      console.error("Error computing allowed custom houses:", err);
    }
    return houses.size > 0 ? houses : null;
  }, [currBranch]);

  const branchDisplayName = useMemo(() => {
    if (!currBranch || currBranch === "ALL") return "All Branches";
    const found = effectiveBranchOptions.find((b) => b.value === currBranch);
    return found?.label || currBranch;
  }, [currBranch, effectiveBranchOptions]);

  // Determine active months in FY chronological order
  const activeMonths = useMemo(() => {
    if (filterMode === "single") {
      if (singleMonth === "all") {
        return [...FY_MONTHS];
      }
      const found = FY_MONTHS.find((m) => String(m.value) === String(singleMonth));
      return found ? [found] : [FY_MONTHS[0]];
    }

    if (filterMode === "range") {
      const fromIdx = FY_MONTHS.findIndex((m) => String(m.value) === String(rangeFrom));
      const toIdx = FY_MONTHS.findIndex((m) => String(m.value) === String(rangeTo));
      if (fromIdx === -1 || toIdx === -1) return FY_MONTHS.slice(0, 4);
      if (fromIdx <= toIdx) {
        return FY_MONTHS.slice(fromIdx, toIdx + 1);
      } else {
        // wrap-around across year boundary
        return [...FY_MONTHS.slice(fromIdx), ...FY_MONTHS.slice(0, toIdx + 1)];
      }
    }

    if (filterMode === "multi") {
      const set = new Set(customMonths.map(String));
      const list = FY_MONTHS.filter((m) => set.has(String(m.value)));
      return list.length > 0 ? list : [FY_MONTHS[0]];
    }

    return FY_MONTHS.slice(0, 4);
  }, [filterMode, singleMonth, rangeFrom, rangeTo, customMonths]);

  // Stable string key of active month numbers (e.g. "4,5,6,7") for fetch dependencies
  const activeMonthsKey = useMemo(() => {
    return activeMonths.map((m) => m.num).join(",");
  }, [activeMonths]);

  // Fetch summary data whenever dialog is open and month selection, year, or branch changes
  useEffect(() => {
    if (!open) return;

    const monthNums = activeMonthsKey ? activeMonthsKey.split(",").map(Number).filter(Boolean) : [];
    if (monthNums.length === 0) return;

    const isSingleMonthSameAsCurrent =
      monthNums.length === 1 &&
      String(monthNums[0]) === String(currentMonth) &&
      selectedYear === currentYear &&
      currBranch === selectedBranch;
    const isFullYearSame =
      currentMonth === "all" &&
      selectedYear === currentYear &&
      currBranch === selectedBranch;

    // If current main report already has the exact data, reuse it
    if ((isSingleMonthSameAsCurrent || isFullYearSame) && initialData && initialData.length > 0) {
      setRawData(initialData);
      return;
    }

    let isCancelled = false;
    const fetchSummaryData = async () => {
      setLoading(true);
      try {
        const apiBase = import.meta.env.VITE_API_STRING || "";
        const endpoint =
          reportType === "adminFreight"
            ? `/report/admin-freight/${selectedYear}/all`
            : `/report/export-clearance/${selectedYear}/all`;
        const url = new URL(`${apiBase}${endpoint}`, window.location.origin);
        url.searchParams.append("months", activeMonthsKey);
        if (currBranch && currBranch !== "ALL") {
          url.searchParams.append("branch_code", currBranch);
        }
        if (isSrManager && gradeFilter) {
          url.searchParams.append("grade", gradeFilter);
        }

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error("Failed to fetch summary data");
        const json = await res.json();
        if (!isCancelled) {
          setRawData(json);
        }
      } catch (err) {
        console.error("Error fetching summary comparison data:", err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchSummaryData();
    return () => {
      isCancelled = true;
    };
  }, [
    open,
    activeMonthsKey,
    selectedYear,
    currBranch,
    reportType,
    gradeFilter,
  ]);

  // Filter raw data according to branch allowed houses and exclude AIR jobs
  const processedRows = useMemo(() => {
    let rows = [...rawData];
    if (modalAllowedCustomHouses) {
      rows = rows.filter((row) =>
        modalAllowedCustomHouses.has(String(row.location || "").toUpperCase())
      );
    }
    rows = rows.filter((row) => {
      const transportMode = String(row.transport_mode || "").toUpperCase();
      const location = String(row.location || "").toUpperCase();
      const isAir = transportMode === "AIR" || location.includes("AIR");
      return !isAir;
    });
    return rows;
  }, [rawData, modalAllowedCustomHouses]);

  // Summary By Location Table Calculation
  const locationRows = useMemo(() => {
    const summaryData = {};
    let lclCount = 0;

    processedRows.forEach((row) => {
      const location = row.location || "Unknown";
      const consignmentType = (row.consignment_type || "").toUpperCase();
      const sizeInfo = row.noOfContrSize || "";
      const count20 = parseInt((sizeInfo.match(/(\d+)\s*x\s*20/i) || [0, 0])[1]) || 0;
      const count40 = parseInt((sizeInfo.match(/(\d+)\s*x\s*40/i) || [0, 0])[1]) || 0;
      const teus = parseInt(row.teus) || 0;

      if (consignmentType === "LCL") {
        lclCount += 1;
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
    const totalTeus = rows.reduce((sum, r) => sum + (parseInt(r.teus) || 0), 0);
    const total20 = rows.reduce((sum, r) => sum + (parseInt(r.count20) || 0), 0);
    const total40 = rows.reduce((sum, r) => sum + (parseInt(r.count40) || 0), 0);

    rows.push({ location: "LCL JOBS", count20: "", count40: "", teus: lclCount });
    rows.push({
      location: "TOTAL",
      count20: total20,
      count40: total40,
      teus: totalTeus + lclCount,
    });
    return rows;
  }, [processedRows]);

  // Exporter Monthly Comparison Calculation
  const exporterComparisonRows = useMemo(() => {
    const map = new Map();

    processedRows.forEach((row) => {
      const exporter = (row.exporter || "UNKNOWN EXPORTER").trim().toUpperCase();
      const consignmentType = (row.consignment_type || "").toUpperCase();
      const sizeInfo = row.noOfContrSize || "";
      const count20 = parseInt((sizeInfo.match(/(\d+)\s*x\s*20/i) || [0, 0])[1]) || 0;
      const count40 = parseInt((sizeInfo.match(/(\d+)\s*x\s*40/i) || [0, 0])[1]) || 0;
      let teus = parseInt(row.teus) || 0;
      if (consignmentType === "LCL") {
        teus = 1;
      }

      const rowMonth =
        row.leo_month ||
        (row.leo_date ? parseInt(row.leo_date.split("-")[1], 10) : null);

      if (!map.has(exporter)) {
        const monthMap = {};
        activeMonths.forEach((m) => {
          monthMap[m.num] = { teus: 0, count20: 0, count40: 0, jobs: 0 };
        });
        map.set(exporter, {
          exporter,
          months: monthMap,
          totalTeus: 0,
          total20: 0,
          total40: 0,
          totalJobs: 0,
        });
      }

      const expObj = map.get(exporter);
      if (rowMonth && expObj.months[rowMonth] !== undefined) {
        expObj.months[rowMonth].teus += teus;
        expObj.months[rowMonth].count20 += count20;
        expObj.months[rowMonth].count40 += count40;
        expObj.months[rowMonth].jobs += 1;
      }
      expObj.totalTeus += teus;
      expObj.total20 += count20;
      expObj.total40 += count40;
      expObj.totalJobs += 1;
    });

    const rows = Array.from(map.values()).map((exp) => {
      const monthlyValues = activeMonths.map((m) => exp.months[m.num]?.teus || 0);
      const firstVal = monthlyValues[0] || 0;
      const lastVal = monthlyValues[monthlyValues.length - 1] || 0;
      const netChange = lastVal - firstVal;
      let percentChange = 0;
      if (firstVal > 0) {
        percentChange = Math.round(((lastVal - firstVal) / firstVal) * 100 * 10) / 10;
      } else if (lastVal > 0) {
        percentChange = 100;
      }

      // Determine Status
      let status = "STEADY";
      if (firstVal === 0 && lastVal > 0) {
        status = "NEW";
      } else if (firstVal > 0 && lastVal === 0) {
        status = "INACTIVE";
      } else if (netChange > 0) {
        status = "INCREASED";
      } else if (netChange < 0) {
        status = "DECREASED";
      }

      const maxMonthly = Math.max(...monthlyValues, 1);

      return {
        ...exp,
        monthlyValues,
        firstVal,
        lastVal,
        netChange,
        percentChange,
        status,
        maxMonthly,
      };
    });

    return rows;
  }, [processedRows, activeMonths]);

  // Filter & Sort Exporter Comparison Rows
  const filteredComparisonRows = useMemo(() => {
    let list = [...exporterComparisonRows];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((r) => r.exporter.toLowerCase().includes(q));
    }

    if (trendFilter === "increased") {
      list = list.filter((r) => r.status === "INCREASED" || r.status === "NEW");
    } else if (trendFilter === "decreased") {
      list = list.filter((r) => r.status === "DECREASED" || r.status === "INACTIVE");
    } else if (trendFilter === "steady") {
      list = list.filter((r) => r.status === "STEADY");
    } else if (trendFilter === "new") {
      list = list.filter((r) => r.status === "NEW");
    }

    if (sortBy === "teus_desc") {
      list.sort((a, b) => b.totalTeus - a.totalTeus);
    } else if (sortBy === "growth_desc") {
      list.sort((a, b) => b.netChange - a.netChange || b.percentChange - a.percentChange);
    } else if (sortBy === "growth_asc") {
      list.sort((a, b) => a.netChange - b.netChange || a.percentChange - b.percentChange);
    } else if (sortBy === "name_asc") {
      list.sort((a, b) => a.exporter.localeCompare(b.exporter));
    }

    return list;
  }, [exporterComparisonRows, searchQuery, trendFilter, sortBy]);

  // Pagination logic
  const paginatedComparisonRows = useMemo(() => {
    if (rowsPerPage === -1) return filteredComparisonRows;
    return filteredComparisonRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredComparisonRows, page, rowsPerPage]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [searchQuery, trendFilter, sortBy, filterMode, activeMonthsKey, selectedYear, currBranch]);

  // Summary Statistics (KPI Cards & Footer Totals)
  const stats = useMemo(() => {
    const totalExporters = exporterComparisonRows.length;
    const totalTeus = exporterComparisonRows.reduce((s, r) => s + r.totalTeus, 0);
    const increasedCount = exporterComparisonRows.filter(
      (r) => r.status === "INCREASED" || r.status === "NEW"
    ).length;
    const decreasedCount = exporterComparisonRows.filter(
      (r) => r.status === "DECREASED" || r.status === "INACTIVE"
    ).length;
    const steadyCount = exporterComparisonRows.filter((r) => r.status === "STEADY").length;
    const newCount = exporterComparisonRows.filter((r) => r.status === "NEW").length;

    // Monthly totals for footer
    const monthTotals = {};
    activeMonths.forEach((m) => {
      monthTotals[m.num] = exporterComparisonRows.reduce(
        (s, r) => s + (r.months[m.num]?.teus || 0),
        0
      );
    });

    const firstMonthVal =
      activeMonths.length > 0 ? monthTotals[activeMonths[0].num] || 0 : 0;
    const lastMonthVal =
      activeMonths.length > 0 ? monthTotals[activeMonths[activeMonths.length - 1].num] || 0 : 0;
    const overallNetChange = lastMonthVal - firstMonthVal;
    let overallPercentChange = 0;
    if (firstMonthVal > 0) {
      overallPercentChange =
        Math.round(((lastMonthVal - firstMonthVal) / firstMonthVal) * 100 * 10) / 10;
    } else if (lastMonthVal > 0) {
      overallPercentChange = 100;
    }

    return {
      totalExporters,
      totalTeus,
      increasedCount,
      decreasedCount,
      steadyCount,
      newCount,
      monthTotals,
      firstMonthVal,
      lastMonthVal,
      overallNetChange,
      overallPercentChange,
    };
  }, [exporterComparisonRows, activeMonths]);

  // Description label for the range
  const rangeDescription = useMemo(() => {
    if (activeMonths.length === 1) {
      return `${activeMonths[0].label} ${selectedYear}`;
    }
    return `${activeMonths[0].short} to ${activeMonths[activeMonths.length - 1].short} (${activeMonths.length} Months) • FY ${selectedYear}`;
  }, [activeMonths, selectedYear]);

  // Quick Preset Handlers
  const handlePresetSelect = (presetKey) => {
    setFilterMode("range");
    if (presetKey === "4months") {
      setRangeFrom("4");
      setRangeTo("7");
    } else if (presetKey === "last4") {
      const curNum = new Date().getMonth() + 1;
      const curIdx = FY_MONTHS.findIndex((m) => m.num === curNum);
      const endIdx = curIdx >= 0 ? curIdx : 3;
      const startIdx = (endIdx - 3 + 12) % 12;
      setRangeFrom(String(FY_MONTHS[startIdx].value));
      setRangeTo(String(FY_MONTHS[endIdx].value));
    } else if (presetKey === "q1") {
      setRangeFrom("4");
      setRangeTo("6");
    } else if (presetKey === "q2") {
      setRangeFrom("7");
      setRangeTo("9");
    } else if (presetKey === "q3") {
      setRangeFrom("10");
      setRangeTo("12");
    } else if (presetKey === "q4") {
      setRangeFrom("1");
      setRangeTo("3");
    } else if (presetKey === "fullYear") {
      setRangeFrom("4");
      setRangeTo("3");
    }
  };

  // Toggle month chip in custom multi-select mode
  const handleToggleCustomMonth = (monthVal) => {
    setCustomMonths((prev) => {
      const set = new Set(prev);
      if (set.has(monthVal)) {
        if (set.size > 1) set.delete(monthVal);
      } else {
        set.add(monthVal);
      }
      return Array.from(set);
    });
  };

  // Download Excel Report
  const handleDownloadExcel = async () => {
    try {
      setDownloading(true);
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Exim Export System";
      workbook.created = new Date();

      const isMulti = activeMonths.length > 1;
      const branchName = branchDisplayName;

      // 1. Exporter Comparison Sheet
      const exporterSheet = workbook.addWorksheet(
        isMulti ? "Exporter Monthly Comparison" : "Summary by Exporter"
      );

      const headerFill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0284C7" }, // Ocean Blue
      };
      const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };

      // Title & Subtitle
      exporterSheet.mergeCells(
        "A1",
        isMulti ? String.fromCharCode(66 + activeMonths.length + 3) + "1" : "E1"
      );
      const titleCell = exporterSheet.getCell("A1");
      titleCell.value = `EXPORTER SHIPMENTS SUMMARY & MONTHLY COMPARISON`;
      titleCell.font = { bold: true, size: 13, color: { argb: "FF0F172A" } };
      titleCell.alignment = { vertical: "middle", horizontal: "left" };
      exporterSheet.getRow(1).height = 26;

      exporterSheet.getCell("A2").value = `Period: ${rangeDescription} | Branch: ${branchName} | Generated: ${new Date().toLocaleDateString()}`;
      exporterSheet.getCell("A2").font = { italic: true, size: 9, color: { argb: "FF64748B" } };
      exporterSheet.getRow(2).height = 18;

      exporterSheet.addRow([]); // Empty separator

      if (isMulti) {
        // Multi-Month Columns:
        const headers = [
          "Sr.",
          "Exporter Name",
          ...activeMonths.map((m) => `${m.short} (${selectedYear})`),
          "Total TEUs",
          "Net Change",
          "% Growth",
          "Trend Status",
        ];
        const hRow = exporterSheet.addRow(headers);
        hRow.height = 24;
        hRow.eachCell((cell) => {
          cell.fill = headerFill;
          cell.font = headerFont;
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.border = {
            top: { style: "thin", color: { argb: "FF94A3B8" } },
            left: { style: "thin", color: { argb: "FF94A3B8" } },
            bottom: { style: "thin", color: { argb: "FF94A3B8" } },
            right: { style: "thin", color: { argb: "FF94A3B8" } },
          };
        });
        exporterSheet.getCell(`B${hRow.number}`).alignment = {
          vertical: "middle",
          horizontal: "left",
        };

        // Data rows
        exporterComparisonRows.forEach((row, idx) => {
          const rowData = [
            idx + 1,
            row.exporter,
            ...activeMonths.map((m) => row.months[m.num]?.teus || 0),
            row.totalTeus,
            row.netChange > 0 ? `+${row.netChange}` : String(row.netChange),
            row.firstVal > 0
              ? `${row.percentChange > 0 ? "+" : ""}${row.percentChange}%`
              : row.lastVal > 0
              ? "New"
              : "0%",
            row.status,
          ];
          const dRow = exporterSheet.addRow(rowData);
          dRow.height = 20;

          if (idx % 2 === 1) {
            dRow.eachCell((c) => {
              c.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFF8FAFC" },
              };
            });
          }

          dRow.eachCell((cell, colNumber) => {
            cell.border = {
              top: { style: "hair", color: { argb: "FFE2E8F0" } },
              left: { style: "hair", color: { argb: "FFE2E8F0" } },
              bottom: { style: "hair", color: { argb: "FFE2E8F0" } },
              right: { style: "hair", color: { argb: "FFE2E8F0" } },
            };
            if (colNumber === 2) {
              cell.alignment = { vertical: "middle", horizontal: "left" };
            } else {
              cell.alignment = { vertical: "middle", horizontal: "center" };
            }
          });

          // Highlight trend color
          const netCol = 2 + activeMonths.length + 2;
          const statusCol = 2 + activeMonths.length + 4;
          if (row.netChange > 0) {
            dRow.getCell(netCol).font = { color: { argb: "FF16A34A" }, bold: true };
            dRow.getCell(statusCol).font = { color: { argb: "FF16A34A" }, bold: true };
          } else if (row.netChange < 0) {
            dRow.getCell(netCol).font = { color: { argb: "FFDC2626" }, bold: true };
            dRow.getCell(statusCol).font = { color: { argb: "FFDC2626" }, bold: true };
          }
        });

        // Totals Row
        const totalRowData = [
          "",
          "TOTAL",
          ...activeMonths.map((m) => stats.monthTotals[m.num] || 0),
          stats.totalTeus,
          stats.overallNetChange > 0 ? `+${stats.overallNetChange}` : String(stats.overallNetChange),
          `${stats.overallPercentChange > 0 ? "+" : ""}${stats.overallPercentChange.toFixed(1)}%`,
          stats.overallNetChange > 0
            ? "INCREASED"
            : stats.overallNetChange < 0
            ? "DECREASED"
            : "STEADY",
        ];
        const tRow = exporterSheet.addRow(totalRowData);
        tRow.height = 24;
        tRow.eachCell((c) => {
          c.font = { bold: true, size: 10, color: { argb: "FF0F172A" } };
          c.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFEF3C7" },
          };
          c.border = {
            top: { style: "medium", color: { argb: "FF94A3B8" } },
            bottom: { style: "double", color: { argb: "FF475569" } },
          };
          c.alignment = { vertical: "middle", horizontal: "center" };
        });
        exporterSheet.getCell(`B${tRow.number}`).alignment = {
          vertical: "middle",
          horizontal: "left",
        };
      } else {
        // Single Month Columns
        const headers = ["Sr.", "Exporter Name", "20", "40", "TEUS"];
        const hRow = exporterSheet.addRow(headers);
        hRow.height = 24;
        hRow.eachCell((c) => {
          c.fill = headerFill;
          c.font = headerFont;
          c.alignment = { vertical: "middle", horizontal: "center" };
        });
        exporterSheet.getCell(`B${hRow.number}`).alignment = {
          vertical: "middle",
          horizontal: "left",
        };

        exporterComparisonRows.forEach((r, idx) => {
          const dRow = exporterSheet.addRow([
            idx + 1,
            r.exporter,
            r.total20,
            r.total40,
            r.totalTeus,
          ]);
          dRow.height = 20;
          dRow.getCell(2).alignment = { vertical: "middle", horizontal: "left" };
          dRow.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
          dRow.getCell(3).alignment = { vertical: "middle", horizontal: "center" };
          dRow.getCell(4).alignment = { vertical: "middle", horizontal: "center" };
          dRow.getCell(5).alignment = { vertical: "middle", horizontal: "center" };
        });
      }

      // Auto-fit column widths
      exporterSheet.columns.forEach((col, idx) => {
        let maxLen = 10;
        col.eachCell({ includeEmpty: false }, (cell) => {
          const len = String(cell.value || "").length;
          if (len > maxLen) maxLen = len;
        });
        col.width = Math.min(Math.max(maxLen + 4, idx === 1 ? 32 : 12), 48);
      });

      // 2. Location Summary Sheet
      const locationSheet = workbook.addWorksheet("Summary by Location");
      locationSheet.addRow(["SUMMARY BY LOCATION", "", "", ""]);
      locationSheet.getCell("A1").font = { bold: true, size: 12 };
      locationSheet.addRow([`Period: ${rangeDescription} | Branch: ${branchName}`]);
      locationSheet.addRow([]);

      const locHRow = locationSheet.addRow(["Particulars", "20", "40", "TEUS"]);
      locHRow.height = 22;
      locHRow.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF59E0B" } };
        c.font = { bold: true, color: { argb: "FFFFFFFF" } };
        c.alignment = { vertical: "middle", horizontal: "center" };
      });
      locationSheet.getCell(`A${locHRow.number}`).alignment = {
        vertical: "middle",
        horizontal: "left",
      };

      locationRows.forEach((row) => {
        const lRow = locationSheet.addRow([
          row.location,
          row.count20,
          row.count40,
          row.teus,
        ]);
        if (row.location === "TOTAL" || row.location === "LCL JOBS") {
          lRow.eachCell((c) => {
            c.font = { bold: true };
            c.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor:
                row.location === "TOTAL"
                  ? { argb: "FFFEF3C7" }
                  : { argb: "FFE0F2FE" },
            };
          });
        }
      });

      locationSheet.columns.forEach((col) => {
        col.width = 18;
      });
      locationSheet.getColumn(1).width = 30;

      // Save file
      const dateStr = new Date().toISOString().slice(0, 10);
      const cleanRange = rangeDescription.replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `Exporter_Summary_Comparison_${selectedYear}_${cleanRange}_${dateStr}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), filename);
    } catch (err) {
      console.error("Error generating Excel summary:", err);
    } finally {
      setDownloading(false);
    }
  };

  const isMultiMonth = activeMonths.length > 1;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={isMultiMonth ? "lg" : "md"}
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: "96vh",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        },
      }}
    >
      {/* Title Bar with Download Button & Close */}
      <DialogTitle
        sx={{
          fontWeight: "bold",
          background: "linear-gradient(90deg, #fdf6f0 0%, #e3f2fd 100%)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          py: 1.5,
          px: 2.5,
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <DateRangeIcon sx={{ color: "#0284c7" }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a" }}>
              {isMultiMonth
                ? `Monthly Comparison: ${rangeDescription}`
                : `Summary - ${rangeDescription}`}
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
              Branch: <strong style={{ color: "#0284c7" }}>{branchDisplayName}</strong> • Compare monthly exporter performance • Track increase or decrease in TEUs
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            color="success"
            startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
            onClick={handleDownloadExcel}
            disabled={loading || downloading || exporterComparisonRows.length === 0}
            sx={{
              fontWeight: 700,
              textTransform: "none",
              fontSize: "0.8rem",
              background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
              boxShadow: "0 2px 4px rgba(22, 163, 74, 0.25)",
              "&:hover": {
                background: "linear-gradient(135deg, #15803d 0%, #166534 100%)",
              },
            }}
          >
            {downloading ? "Exporting..." : "Download Excel"}
          </Button>
          <IconButton onClick={onClose} size="small" sx={{ color: "#64748b" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ background: "#f8fafc", p: { xs: 1.5, sm: 2.5 } }}>
        {/* Filter & Range Selector Panel */}
        <Card
          elevation={0}
          sx={{
            mb: 2,
            p: 2,
            background: "#ffffff",
            borderRadius: 2,
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          {/* Row 1: Mode Toggle & Year Selection */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1.5,
              mb: 1.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                Filter Mode:
              </Typography>
              <ToggleButtonGroup
                value={filterMode}
                exclusive
                onChange={(e, val) => val && setFilterMode(val)}
                size="small"
                sx={{
                  bgcolor: "#f1f5f9",
                  p: "2px",
                  borderRadius: 1.5,
                  "& .MuiToggleButton-root": {
                    px: 1.5,
                    py: 0.4,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "none",
                    border: "none",
                    borderRadius: 1,
                    color: "#64748b",
                    "&.Mui-selected": {
                      bgcolor: "#0284c7",
                      color: "#ffffff",
                      "&:hover": { bgcolor: "#0369a1" },
                    },
                  },
                }}
              >
                <ToggleButton value="range">Month Range (e.g. 4 Months)</ToggleButton>
                <ToggleButton value="single">Single Month</ToggleButton>
                <ToggleButton value="multi">Custom Months</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel sx={{ fontSize: "0.8rem" }}>Year</InputLabel>
                <Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  label="Year"
                  sx={{ fontSize: "0.8rem", height: 32 }}
                >
                  {years.map((y) => (
                    <MenuItem key={y.value} value={y.value} sx={{ fontSize: "0.8rem" }}>
                      {y.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 155 }}>
                <InputLabel sx={{ fontSize: "0.8rem" }}>Branch</InputLabel>
                <Select
                  value={currBranch}
                  onChange={(e) => setCurrBranch(e.target.value)}
                  label="Branch"
                  sx={{
                    fontSize: "0.8rem",
                    height: 32,
                    fontWeight: currBranch === "ALL" ? 700 : 500,
                  }}
                >
                  {effectiveBranchOptions.map((b) => (
                    <MenuItem
                      key={b.value}
                      value={b.value}
                      sx={{
                        fontSize: "0.8rem",
                        fontWeight: b.value === "ALL" ? 700 : 500,
                        color: b.value === "ALL" ? "#0284c7" : "inherit",
                      }}
                    >
                      {b.value === "ALL" ? "🌐 All Branches" : b.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          {/* Row 2: Range / Single Month Selectors */}
          {filterMode === "range" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel sx={{ fontSize: "0.8rem" }}>From Month</InputLabel>
                  <Select
                    value={rangeFrom}
                    onChange={(e) => setRangeFrom(e.target.value)}
                    label="From Month"
                    sx={{ fontSize: "0.8rem", height: 36 }}
                  >
                    {FY_MONTHS.map((m) => (
                      <MenuItem key={m.value} value={m.value} sx={{ fontSize: "0.8rem" }}>
                        {m.label} ({m.order})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Typography variant="body2" sx={{ fontWeight: 700, color: "#64748b" }}>
                  ➔
                </Typography>

                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel sx={{ fontSize: "0.8rem" }}>To Month</InputLabel>
                  <Select
                    value={rangeTo}
                    onChange={(e) => setRangeTo(e.target.value)}
                    label="To Month"
                    sx={{ fontSize: "0.8rem", height: 36 }}
                  >
                    {FY_MONTHS.map((m) => (
                      <MenuItem key={m.value} value={m.value} sx={{ fontSize: "0.8rem" }}>
                        {m.label} ({m.order})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Chip
                  label={`${activeMonths.length} Months: ${activeMonths.map((m) => m.short).join(", ")}`}
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                />
              </Box>

              {/* Quick Presets */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, flexWrap: "wrap" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", mr: 0.5 }}>
                  Quick Presets:
                </Typography>
                <Chip
                  label="4 Months (Apr - Jul)"
                  size="small"
                  onClick={() => handlePresetSelect("4months")}
                  clickable
                  variant={rangeFrom === "4" && rangeTo === "7" ? "filled" : "outlined"}
                  color="info"
                  sx={{ fontSize: "0.72rem", height: 24 }}
                />
                <Chip
                  label="Last 4 Months"
                  size="small"
                  onClick={() => handlePresetSelect("last4")}
                  clickable
                  variant="outlined"
                  sx={{ fontSize: "0.72rem", height: 24 }}
                />
                <Chip
                  label="Q1 (Apr - Jun)"
                  size="small"
                  onClick={() => handlePresetSelect("q1")}
                  clickable
                  variant={rangeFrom === "4" && rangeTo === "6" ? "filled" : "outlined"}
                  sx={{ fontSize: "0.72rem", height: 24 }}
                />
                <Chip
                  label="Q2 (Jul - Sep)"
                  size="small"
                  onClick={() => handlePresetSelect("q2")}
                  clickable
                  variant={rangeFrom === "7" && rangeTo === "9" ? "filled" : "outlined"}
                  sx={{ fontSize: "0.72rem", height: 24 }}
                />
                <Chip
                  label="Q3 (Oct - Dec)"
                  size="small"
                  onClick={() => handlePresetSelect("q3")}
                  clickable
                  variant={rangeFrom === "10" && rangeTo === "12" ? "filled" : "outlined"}
                  sx={{ fontSize: "0.72rem", height: 24 }}
                />
                <Chip
                  label="Q4 (Jan - Mar)"
                  size="small"
                  onClick={() => handlePresetSelect("q4")}
                  clickable
                  variant={rangeFrom === "1" && rangeTo === "3" ? "filled" : "outlined"}
                  sx={{ fontSize: "0.72rem", height: 24 }}
                />
                <Chip
                  label="Full Year"
                  size="small"
                  onClick={() => handlePresetSelect("fullYear")}
                  clickable
                  variant={rangeFrom === "4" && rangeTo === "3" ? "filled" : "outlined"}
                  sx={{ fontSize: "0.72rem", height: 24 }}
                />
              </Box>
            </Box>
          )}

          {filterMode === "single" && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel sx={{ fontSize: "0.8rem" }}>Month</InputLabel>
                <Select
                  value={singleMonth}
                  onChange={(e) => setSingleMonth(e.target.value)}
                  label="Month"
                  sx={{ fontSize: "0.8rem", height: 36 }}
                >
                  <MenuItem value="all" sx={{ fontSize: "0.8rem", fontWeight: 700 }}>
                    Full Year (All Months)
                  </MenuItem>
                  {FY_MONTHS.map((m) => (
                    <MenuItem key={m.value} value={m.value} sx={{ fontSize: "0.8rem" }}>
                      {m.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" sx={{ color: "#64748b" }}>
                Viewing single month summary (Particulars, 20, 40, TEUS)
              </Typography>
            </Box>
          )}

          {filterMode === "multi" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b" }}>
                Select months to compare side-by-side ({customMonths.length} selected):
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
                {FY_MONTHS.map((m) => {
                  const isSelected = customMonths.includes(String(m.value));
                  return (
                    <Chip
                      key={m.value}
                      label={m.short}
                      clickable
                      onClick={() => handleToggleCustomMonth(String(m.value))}
                      color={isSelected ? "primary" : "default"}
                      variant={isSelected ? "filled" : "outlined"}
                      size="small"
                      sx={{ fontWeight: isSelected ? 700 : 500, fontSize: "0.75rem" }}
                    />
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Row 3: Search, Trend Filter & Sort (Active for Exporter Table) */}
          <Divider sx={{ my: 1.5 }} />
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1.5,
            }}
          >
            <TextField
              size="small"
              placeholder="Search exporter name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: "#94a3b8" }} />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 220, flex: 1, "& .MuiInputBase-root": { height: 32, fontSize: "0.75rem" } }}
            />

            {isMultiMonth && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, flexWrap: "wrap" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b" }}>
                  Status:
                </Typography>
                <Chip
                  label={`All (${exporterComparisonRows.length})`}
                  size="small"
                  onClick={() => setTrendFilter("all")}
                  color={trendFilter === "all" ? "primary" : "default"}
                  sx={{ fontSize: "0.72rem", height: 24, fontWeight: trendFilter === "all" ? 700 : 500 }}
                />
                <Chip
                  icon={<TrendingUpIcon fontSize="small" />}
                  label={`Increased (${stats.increasedCount})`}
                  size="small"
                  onClick={() => setTrendFilter("increased")}
                  color={trendFilter === "increased" ? "success" : "default"}
                  sx={{
                    fontSize: "0.72rem",
                    height: 24,
                    fontWeight: trendFilter === "increased" ? 700 : 500,
                    bgcolor: trendFilter === "increased" ? undefined : "#f0fdf4",
                    color: trendFilter === "increased" ? undefined : "#15803d",
                  }}
                />
                <Chip
                  icon={<TrendingDownIcon fontSize="small" />}
                  label={`Decreased (${stats.decreasedCount})`}
                  size="small"
                  onClick={() => setTrendFilter("decreased")}
                  color={trendFilter === "decreased" ? "error" : "default"}
                  sx={{
                    fontSize: "0.72rem",
                    height: 24,
                    fontWeight: trendFilter === "decreased" ? 700 : 500,
                    bgcolor: trendFilter === "decreased" ? undefined : "#fef2f2",
                    color: trendFilter === "decreased" ? undefined : "#b91c1c",
                  }}
                />
                <Chip
                  icon={<StarIcon fontSize="small" />}
                  label={`New (${stats.newCount})`}
                  size="small"
                  onClick={() => setTrendFilter("new")}
                  color={trendFilter === "new" ? "info" : "default"}
                  sx={{ fontSize: "0.72rem", height: 24, fontWeight: trendFilter === "new" ? 700 : 500 }}
                />
              </Box>
            )}

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                sx={{ fontSize: "0.75rem", height: 32 }}
              >
                <MenuItem value="teus_desc" sx={{ fontSize: "0.75rem" }}>
                  Sort: Total TEUs (High to Low)
                </MenuItem>
                <MenuItem value="growth_desc" sx={{ fontSize: "0.75rem" }}>
                  Sort: Highest Growth (▲)
                </MenuItem>
                <MenuItem value="growth_asc" sx={{ fontSize: "0.75rem" }}>
                  Sort: Biggest Decline (▼)
                </MenuItem>
                <MenuItem value="name_asc" sx={{ fontSize: "0.75rem" }}>
                  Sort: Exporter Name (A-Z)
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Card>

        {/* Loading Spinner */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
            <CircularProgress size={36} color="primary" />
            <Typography variant="body2" sx={{ ml: 2, color: "#64748b", fontWeight: 600 }}>
              Fetching monthly shipment data...
            </Typography>
          </Box>
        ) : (
          <>
            {/* KPI Overview Cards for Multi-Month Range */}
            {isMultiMonth && (
              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ p: 1.5, background: "linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)", border: "1px solid #bae6fd" }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "#0369a1", textTransform: "uppercase" }}>
                      Total Shipments
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: "#0c4a6e", mt: 0.5 }}>
                      {stats.totalTeus}{" "}
                      <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>TEUs</span>
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#0284c7" }}>
                      Across {activeMonths.length} Months
                    </Typography>
                  </Card>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Card sx={{ p: 1.5, background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", border: "1px solid #cbd5e1" }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                      Active Exporters
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: "#1e293b", mt: 0.5 }}>
                      {stats.totalExporters}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748b" }}>
                      Shipped in this period
                    </Typography>
                  </Card>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Card sx={{ p: 1.5, background: "linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)", border: "1px solid #bbf7d0" }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "#15803d", textTransform: "uppercase" }}>
                      Increased Shipments
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: "#166534", mt: 0.5 }}>
                      {stats.increasedCount}{" "}
                      <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Exporters</span>
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#16a34a", fontWeight: 700 }}>
                      ▲ Growing month-over-month
                    </Typography>
                  </Card>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Card sx={{ p: 1.5, background: "linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)", border: "1px solid #fecaca" }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "#b91c1c", textTransform: "uppercase" }}>
                      Decreased Shipments
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: "#991b1b", mt: 0.5 }}>
                      {stats.decreasedCount}{" "}
                      <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Exporters</span>
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#dc2626", fontWeight: 700 }}>
                      ▼ Declining month-over-month
                    </Typography>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* View Section Selector Tabs */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
              <ToggleButtonGroup
                value={viewSection}
                exclusive
                onChange={(e, val) => val && setViewSection(val)}
                size="small"
                sx={{
                  bgcolor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 1.5,
                  p: "2px",
                  "& .MuiToggleButton-root": {
                    px: 1.8,
                    py: 0.4,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "none",
                    border: "none",
                    borderRadius: 1,
                    color: "#475569",
                    "&.Mui-selected": {
                      bgcolor: "#0284c7",
                      color: "#ffffff",
                      "&:hover": { bgcolor: "#0369a1" },
                    },
                  },
                }}
              >
                <ToggleButton value="all">Show Both Sections</ToggleButton>
                <ToggleButton value="exporter">
                  By Exporter Only ({filteredComparisonRows.length})
                </ToggleButton>
                <ToggleButton value="location">
                  By Location Only ({locationRows.length - 2})
                </ToggleButton>
              </ToggleButtonGroup>

              {viewSection === "all" && (
                <Button
                  size="small"
                  onClick={() => setLocationCollapsed(!locationCollapsed)}
                  startIcon={locationCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                  sx={{ textTransform: "none", fontSize: "0.75rem", color: "#64748b" }}
                >
                  {locationCollapsed ? "Expand Location Summary" : "Collapse Location Summary"}
                </Button>
              )}
            </Box>

            {/* Section 1: By Location Table */}
            {(viewSection === "all" || viewSection === "location") && (
              <Collapse in={!locationCollapsed || viewSection === "location"}>
                <TableContainer
                  component={Paper}
                  elevation={0}
                  sx={{
                    mb: 2.5,
                    border: "1px solid #fed7aa",
                    borderRadius: 2,
                    overflow: "auto",
                    maxHeight: "350px",
                  }}
                >
                  <Box sx={{ px: 2, py: 1, bgcolor: "#fff7ed", borderBottom: "1px solid #fed7aa", display: "flex", alignItems: "center", gap: 1 }}>
                    <LocationOnIcon fontSize="small" sx={{ color: "#f57c00" }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#ea580c" }}>
                      By Location ({locationRows.length - 2} Ports/Locations)
                    </Typography>
                  </Box>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell align="left" sx={{ fontWeight: 800, background: "#ffe0b2", color: "#333", pl: 3 }}>
                          Particulars
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, background: "#ffe0b2", color: "#333" }}>
                          20
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, background: "#ffe0b2", color: "#333" }}>
                          40
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, background: "#ffe0b2", color: "#333" }}>
                          TEUS
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {locationRows.map((row, idx) => {
                        const isLcl = row.location === "LCL JOBS";
                        const isTotal = row.location === "TOTAL";
                        return (
                          <TableRow
                            key={idx}
                            sx={{
                              background: isLcl ? "#e3f2fd" : isTotal ? "#fff3e0" : idx % 2 === 1 ? "#fafafa" : "#fff",
                            }}
                          >
                            <TableCell
                              align="left"
                              sx={{
                                fontWeight: isLcl || isTotal ? 800 : 500,
                                pl: 3,
                                fontSize: "0.8rem",
                                color: isTotal ? "#c2410c" : "#1e293b",
                              }}
                            >
                              {row.location}
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: isTotal ? 800 : 500, fontSize: "0.8rem" }}>
                              {row.count20}
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: isTotal ? 800 : 500, fontSize: "0.8rem" }}>
                              {row.count40}
                            </TableCell>
                            <TableCell
                              align="center"
                              sx={{
                                fontWeight: isLcl || isTotal ? 800 : 600,
                                fontSize: "0.8rem",
                                color: isTotal ? "#c2410c" : isLcl ? "#0284c7" : "#0f172a",
                              }}
                            >
                              {row.teus}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Collapse>
            )}

            {/* Section 2: By Exporter - Comparison & Trend Table */}
            {(viewSection === "all" || viewSection === "exporter") && (
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  border: "1px solid #bae6fd",
                  borderRadius: 2,
                  overflow: "auto",
                  maxHeight: viewSection === "exporter" ? "calc(88vh - 220px)" : "550px",
                  "&::-webkit-scrollbar": { width: "8px", height: "8px" },
                  "&::-webkit-scrollbar-thumb": { backgroundColor: "#94a3b8", borderRadius: "4px" },
                  "&::-webkit-scrollbar-thumb:hover": { backgroundColor: "#64748b" },
                }}
              >
                <Box
                  sx={{
                    px: 2,
                    py: 1.2,
                    bgcolor: "#f0f9ff",
                    borderBottom: "1px solid #bae6fd",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <BusinessIcon fontSize="small" sx={{ color: "#0284c7" }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0369a1" }}>
                      By Exporter {isMultiMonth ? "— Monthly Shipment Trend Comparison" : ""}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#0369a1" }}>
                    Showing {filteredComparisonRows.length === 0 ? 0 : (rowsPerPage === -1 ? 1 : page * rowsPerPage + 1)}–{rowsPerPage === -1 ? filteredComparisonRows.length : Math.min((page + 1) * rowsPerPage, filteredComparisonRows.length)} of {filteredComparisonRows.length} Exporters
                  </Typography>
                </Box>

                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        align="center"
                        sx={{ fontWeight: 800, background: "#e1f5fe", color: "#333", width: 50, fontSize: "0.75rem" }}
                      >
                        #
                      </TableCell>
                      <TableCell
                        align="left"
                        sx={{ fontWeight: 800, background: "#e1f5fe", color: "#333", minWidth: 200, fontSize: "0.75rem" }}
                      >
                        Exporter Name
                      </TableCell>

                      {isMultiMonth ? (
                        <>
                          {activeMonths.map((m) => (
                            <TableCell
                              key={m.num}
                              align="center"
                              sx={{
                                fontWeight: 800,
                                background: "#e1f5fe",
                                color: "#0369a1",
                                minWidth: 85,
                                fontSize: "0.75rem",
                              }}
                            >
                              {m.short}
                            </TableCell>
                          ))}
                          <TableCell
                            align="center"
                            sx={{
                              fontWeight: 800,
                              background: "#bae6fd",
                              color: "#0c4a6e",
                              minWidth: 90,
                              fontSize: "0.75rem",
                            }}
                          >
                            Total TEUS
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              fontWeight: 800,
                              background: "#e1f5fe",
                              color: "#333",
                              minWidth: 150,
                              fontSize: "0.75rem",
                            }}
                          >
                            Monthly Trend
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell
                            align="center"
                            sx={{ fontWeight: 800, background: "#e1f5fe", color: "#333", minWidth: 80, fontSize: "0.75rem" }}
                          >
                            20
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{ fontWeight: 800, background: "#e1f5fe", color: "#333", minWidth: 80, fontSize: "0.75rem" }}
                          >
                            40
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{ fontWeight: 800, background: "#e1f5fe", color: "#333", minWidth: 90, fontSize: "0.75rem" }}
                          >
                            TEUS
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {paginatedComparisonRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={isMultiMonth ? activeMonths.length + 4 : 5}
                          align="center"
                          sx={{ py: 4, color: "#64748b" }}
                        >
                          No exporters found matching your filter criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedComparisonRows.map((row, idx) => {
                        const globalIdx = (rowsPerPage === -1 ? 0 : page * rowsPerPage) + idx + 1;
                        return (
                          <TableRow
                            key={idx}
                            sx={{
                              "&:hover": { bgcolor: "#f1f5f9" },
                              background: idx % 2 === 1 ? "#fafafa" : "#fff",
                            }}
                          >
                            <TableCell align="center" sx={{ fontSize: "0.75rem", color: "#64748b" }}>
                              {globalIdx}
                            </TableCell>
                            <TableCell align="left" sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#0f172a" }}>
                              {row.exporter}
                            </TableCell>

                            {isMultiMonth ? (
                              <>
                                {activeMonths.map((m) => {
                                  const mTeus = row.months[m.num]?.teus || 0;
                                  const m20 = row.months[m.num]?.count20 || 0;
                                  const m40 = row.months[m.num]?.count40 || 0;
                                  return (
                                    <TableCell key={m.num} align="center" sx={{ fontSize: "0.78rem" }}>
                                      {mTeus > 0 ? (
                                        <Tooltip title={`${m.label}: ${mTeus} TEUs (${m20}x20, ${m40}x40)`} arrow>
                                          <span style={{ fontWeight: 700, color: "#0369a1" }}>{mTeus}</span>
                                        </Tooltip>
                                      ) : (
                                        <span style={{ color: "#cbd5e1" }}>-</span>
                                      )}
                                    </TableCell>
                                  );
                                })}

                                {/* Total TEUs */}
                                <TableCell
                                  align="center"
                                  sx={{
                                    fontSize: "0.82rem",
                                    fontWeight: 800,
                                    bgcolor: "#f0f9ff",
                                    color: "#0c4a6e",
                                  }}
                                >
                                  {row.totalTeus}
                                </TableCell>

                                {/* Trend Badge & Sparkline */}
                                <TableCell align="center" sx={{ fontSize: "0.75rem" }}>
                                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                                    {row.status === "INCREASED" && (
                                      <Chip
                                        icon={<TrendingUpIcon fontSize="small" sx={{ color: "#16a34a !important" }} />}
                                        label={`+${row.netChange} (${row.percentChange > 0 ? "+" : ""}${row.percentChange}%)`}
                                        size="small"
                                        sx={{
                                          bgcolor: "#dcfce7",
                                          color: "#15803d",
                                          fontWeight: 700,
                                          fontSize: "0.7rem",
                                          height: 22,
                                        }}
                                      />
                                    )}
                                    {row.status === "DECREASED" && (
                                      <Chip
                                        icon={<TrendingDownIcon fontSize="small" sx={{ color: "#dc2626 !important" }} />}
                                        label={`${row.netChange} (${row.percentChange}%)`}
                                        size="small"
                                        sx={{
                                          bgcolor: "#fee2e2",
                                          color: "#b91c1c",
                                          fontWeight: 700,
                                          fontSize: "0.7rem",
                                          height: 22,
                                        }}
                                      />
                                    )}
                                    {row.status === "STEADY" && (
                                      <Chip
                                        icon={<TrendingFlatIcon fontSize="small" sx={{ color: "#64748b !important" }} />}
                                        label="0% (Steady)"
                                        size="small"
                                        sx={{
                                          bgcolor: "#f1f5f9",
                                          color: "#475569",
                                          fontWeight: 600,
                                          fontSize: "0.7rem",
                                          height: 22,
                                        }}
                                      />
                                    )}
                                    {row.status === "NEW" && (
                                      <Chip
                                        icon={<StarIcon fontSize="small" sx={{ color: "#0284c7 !important" }} />}
                                        label={`New (+${row.lastVal})`}
                                        size="small"
                                        sx={{
                                          bgcolor: "#e0f2fe",
                                          color: "#0369a1",
                                          fontWeight: 700,
                                          fontSize: "0.7rem",
                                          height: 22,
                                        }}
                                      />
                                    )}
                                    {row.status === "INACTIVE" && (
                                      <Chip
                                        label={`Inactive (-${row.firstVal})`}
                                        size="small"
                                        sx={{
                                          bgcolor: "#ffedd5",
                                          color: "#c2410c",
                                          fontWeight: 700,
                                          fontSize: "0.7rem",
                                          height: 22,
                                        }}
                                      />
                                    )}

                                    {/* Visual mini-sparkline bars */}
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "flex-end",
                                        gap: "2px",
                                        height: 18,
                                        width: activeMonths.length * 7,
                                      }}
                                    >
                                      {row.monthlyValues.map((val, mIdx) => {
                                        const prev = mIdx > 0 ? row.monthlyValues[mIdx - 1] : val;
                                        const isUp = val > prev;
                                        const isDown = val < prev;
                                        const barH = Math.max(Math.round((val / row.maxMonthly) * 16), val > 0 ? 3 : 1);
                                        const barColor =
                                          val === 0
                                            ? "#e2e8f0"
                                            : isUp
                                            ? "#22c55e"
                                            : isDown
                                            ? "#ef4444"
                                            : "#0284c7";
                                        return (
                                          <Tooltip
                                            key={mIdx}
                                            title={`${activeMonths[mIdx].short}: ${val} TEUs`}
                                            arrow
                                          >
                                            <Box
                                              sx={{
                                                width: 5,
                                                height: barH,
                                                bgcolor: barColor,
                                                borderRadius: "1px",
                                                transition: "height 0.2s ease",
                                              }}
                                            />
                                          </Tooltip>
                                        );
                                      })}
                                    </Box>
                                  </Box>
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell align="center" sx={{ fontSize: "0.78rem" }}>
                                  {row.total20}
                                </TableCell>
                                <TableCell align="center" sx={{ fontSize: "0.78rem" }}>
                                  {row.total40}
                                </TableCell>
                                <TableCell align="center" sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#0369a1" }}>
                                  {row.totalTeus}
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        );
                      })
                    )}

                    {/* Table Footer with Monthly Column Totals */}
                    {isMultiMonth && filteredComparisonRows.length > 0 && (
                      <TableRow sx={{ bgcolor: "#fef3c7" }}>
                        <TableCell align="center" sx={{ fontWeight: 800, fontSize: "0.75rem", color: "#92400e" }}>
                          Σ
                        </TableCell>
                        <TableCell align="left" sx={{ fontWeight: 800, fontSize: "0.82rem", color: "#92400e" }}>
                          TOTAL ({filteredComparisonRows.length} Exporters)
                        </TableCell>
                        {activeMonths.map((m) => {
                          const mTotal = filteredComparisonRows.reduce(
                            (sum, r) => sum + (r.months[m.num]?.teus || 0),
                            0
                          );
                          return (
                            <TableCell
                              key={m.num}
                              align="center"
                              sx={{ fontWeight: 800, fontSize: "0.82rem", color: "#92400e" }}
                            >
                              {mTotal}
                            </TableCell>
                          );
                        })}
                        <TableCell
                          align="center"
                          sx={{
                            fontWeight: 900,
                            fontSize: "0.85rem",
                            bgcolor: "#fde68a",
                            color: "#78350f",
                          }}
                        >
                          {filteredComparisonRows.reduce((sum, r) => sum + r.totalTeus, 0)}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={
                              stats.overallNetChange > 0
                                ? `Overall ▲ +${stats.overallNetChange} (${stats.overallPercentChange > 0 ? "+" : ""}${stats.overallPercentChange}%)`
                                : stats.overallNetChange < 0
                                ? `Overall ▼ ${stats.overallNetChange} (${stats.overallPercentChange}%)`
                                : "Overall ➔ 0%"
                            }
                            size="small"
                            sx={{
                              fontWeight: 800,
                              fontSize: "0.7rem",
                              bgcolor: stats.overallNetChange >= 0 ? "#dcfce7" : "#fee2e2",
                              color: stats.overallNetChange >= 0 ? "#15803d" : "#b91c1c",
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Table Pagination Component */}
                <TablePagination
                  rowsPerPageOptions={[15, 25, 50, 100, { label: "All", value: -1 }]}
                  component="div"
                  count={filteredComparisonRows.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  sx={{
                    borderTop: "1px solid #bae6fd",
                    bgcolor: "#f0f9ff",
                    "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "#0369a1",
                    },
                    "& .MuiTablePagination-select": {
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "#0369a1",
                    },
                  }}
                />
              </TableContainer>
            )}
          </>
        )}
      </DialogContent>

      {/* Dialog Footer Actions */}
      <DialogActions sx={{ p: 2, bgcolor: "#f8fafc", borderTop: "1px solid #e2e8f0", justifyContent: "space-between" }}>
        <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
          {isMultiMonth
            ? `Active comparison: ${activeMonths.length} months (${activeMonths.map((m) => m.short).join(", ")}) • ${stats.totalTeus} Total TEUs`
            : `Single month summary: ${activeMonths[0]?.label || ""} ${selectedYear}`}
        </Typography>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="contained"
            color="success"
            startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
            onClick={handleDownloadExcel}
            disabled={loading || downloading || exporterComparisonRows.length === 0}
            size="small"
            sx={{ fontWeight: 700, textTransform: "none" }}
          >
            {downloading ? "Exporting..." : "Download Excel"}
          </Button>
          <Button onClick={onClose} color="primary" variant="outlined" size="small" sx={{ fontWeight: 700, textTransform: "none" }}>
            Close
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
