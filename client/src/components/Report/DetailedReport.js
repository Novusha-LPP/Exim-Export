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
  DialogActions
} from "@mui/material";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import DownloadIcon from '@mui/icons-material/Download';
import TableViewIcon from '@mui/icons-material/TableView';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { UserContext } from "../../contexts/UserContext";
import { getOptionsForBranch } from "../common/CustomHouseDropdown";

const columns = [
  { label: "Srl No.", key: "srlNo", minWidth: 50 },
  { label: "JOB No", key: "job_no", minWidth: 100 },
  { label: "LOCATION", key: "location", minWidth: 80 },
  { label: "EXPORTER NAME", key: "exporter", minWidth: 150 },
  { label: "COMMODITY", key: "commodity", minWidth: 300 },
  { label: 'INV VALUE', key: 'invoice_value', minWidth: 170 }, // NEW PRICE COLUMN
  { label: "SB NO.", key: "sb_no", minWidth: 100 },
  { label: "SB DATE", key: "sb_date", minWidth: 80 },
  { label: "CONTAINER NO.", key: "containerNumbers", minWidth: 120 },
  { label: "NO. OF CNTR", key: "totalContainers", minWidth: 70 },
  { label: "SIZE", key: "size", minWidth: 60 },
  { label: "Teus", key: "teus", minWidth: 60 },
  { label: "LEO DATE", key: "leo_date", minWidth: 80 },
  { label: "REMARKS", key: "remarks", minWidth: 100 },
];

const DetailedReport = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [year, setYear] = useState("26-27");
  const [gradeFilter, setGradeFilter] = useState(""); // ✅ New Grade Filter
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportType, setExportType] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("AMD");

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

  const { user } = useContext(UserContext);
  const isSrManager = !!(
    user &&
    typeof user.role === 'string' &&
    user.role.toLowerCase().includes('sr') &&
    user.role.toLowerCase().includes('manager')
  );

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

  const detailedRows = useMemo(() => {
    return processedData;
  }, [processedData]);

  const lclJobCount = useMemo(() => {
    return processedData.filter((row) => isLclJob(row)).length;
  }, [processedData]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const apiBase = import.meta.env.VITE_API_STRING || "";
      // ✅ Pass grade filter as query param
      const url = new URL(`${apiBase}/report/export-clearance/${year}/${month}`);
      console.log("Fetching Export Clearance Data from:", url.toString());
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
      setError("Failed to fetch Export clearance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year, month, gradeFilter, selectedBranch]); // ✅ Added gradeFilter dependency

  const handlePreviousMonth = () => {
    const prev = parseInt(month) - 1;
    setMonth(prev < 1 ? "12" : String(prev));
  };

  const handleNextMonth = () => {
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

    processedData.forEach(row => {
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
    processedData.forEach(row => {
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
    processedData.forEach(row => {
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
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Export Clearance Report');
    const monthName = months.find(m => String(m.value) === String(month))?.label || 'Unknown';

    // 1. Prepare Columns
    const visibleCols = columns.filter((col) => !(col.key === 'invoice_value' && !isSrManager));
    worksheet.columns = visibleCols.map(col => ({
      header: col.label,
      key: col.key,
      width: col.key === 'job_no' ? 22 : (col.key === 'commodity' ? 45 : (col.minWidth / 5) || 16)
    }));

    // Style the header row
    worksheet.getRow(1).font = { bold: true, size: 10 };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // 2. Add Data Rows
    detailedRows.forEach((row, index) => {
      const invValue = row.invoice_value && row.inv_currency
        ? `${row.inv_currency} ${(parseFloat(row.invoice_value)).toFixed(2)}`
        : '';

      const rowData = {};
      visibleCols.forEach(col => {
        switch (col.key) {
          case 'srlNo': rowData[col.key] = String(index + 1).padStart(3, "0"); break;
          case 'invoice_value': rowData[col.key] = invValue; break;
          case 'size': rowData[col.key] = deriveSize(row.noOfContrSize); break;
          case 'containerNumbers': rowData[col.key] = row.containerNumbers ? row.containerNumbers.join('; ') : ''; break;
          case 'sb_date': rowData[col.key] = row.sb_date ? new Date(row.sb_date).toLocaleDateString('en-GB') : ''; break;
          case 'leo_date': rowData[col.key] = row.leo_date ? new Date(row.leo_date).toLocaleDateString('en-GB') : ''; break;
          case 'teus': rowData[col.key] = isLclJob(row) ? 'LCL' : (row.teus || ''); break;
          default: rowData[col.key] = row[col.key] || '';
        }
      });

      const excelRow = worksheet.addRow(rowData);

      // Apply cell styling
      excelRow.eachCell((cell, colNumber) => {
        const colKey = visibleCols[colNumber - 1].key;

        // Default alignment
        cell.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };
        if (colKey === 'exporter' || colKey === 'commodity') {
          cell.alignment.horizontal = 'left';
        }

        // Commodity font size (8pt) smaller than others (10pt)
        if (colKey === 'commodity') {
          cell.font = { size: 8, name: 'Arial Narrow' };
        } else {
          cell.font = { size: 10, name: 'Calibri' };
        }
      });
    });

    // 3. Add Summaries Below Table
    const summaryRows = generateSummaryRows();
    const exporterSummaryRows = generateExporterSummaryRows();
    let currentRow = worksheet.rowCount + 3;

    // Location Summary
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

    // Exporter Summary
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

    // Generate filename and save
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `export_clearance_report_${monthName}_${year}_${timestamp}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), filename);
  };


  const exportToPDF = async () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    // Main report page
    const monthName = months.find(m => m.value === month)?.label || 'Unknown';
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const title = `Export Clearing Details of ${monthName}-${year}`;
    const pageWidth = doc.internal.pageSize.getWidth();
    const textWidth = doc.getTextWidth(title);
    const x = (pageWidth - textWidth) / 2;
    doc.text(title, x, 15);

    // Main table - build headers/data based on visible columns and role
    const visibleCols = columns.filter((col) => !(col.key === 'invoice_value' && !isSrManager));
    const tableHeaders = visibleCols.map(c => c.label);
    const tableData = detailedRows.map((row, index) => {
      const containerNos = row.containerNumbers ? row.containerNumbers.join('\n') : '';
      const sbDate = row.sb_date ? new Date(row.sb_date).toLocaleDateString('en-GB').replace(/\//g, '-') : '';
      const leoDate = row.leo_date ? new Date(row.leo_date).toLocaleDateString('en-GB').replace(/\//g, '-') : '';
      const invValueDisplay = row.invoice_value && row.inv_currency
        ? `${row.inv_currency} ${(parseFloat(row.invoice_value)).toFixed(2)}`
        : '';

      return visibleCols.map((col) => {
        switch (col.key) {
          case 'srlNo':
            return String(index + 1).padStart(4, '0');
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
          case 'sb_no':
            return row.sb_no || '';
          case 'sb_date':
            return sbDate;
          case 'containerNumbers':
            return containerNos;
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
          default:
            return row[col.key] || '';
        }
      });
    });

    // Build columnStyles dynamically so hidden columns (eg. PRICE) are not present
    const styleMap = {
      srlNo: { cellWidth: 8, halign: 'center' },
      job_no: { cellWidth: 32, halign: 'center' },
      location: { cellWidth: 25, halign: 'center' },
      exporter: { cellWidth: 40, halign: 'left' }, // Decreased by 20
      commodity: { halign: 'left' }, // Auto-width to fill space
      invoice_value: { cellWidth: 20, halign: 'center' },
      sb_no: { cellWidth: 15, halign: 'center' },
      sb_date: { cellWidth: 20, halign: 'center' },
      containerNumbers: { cellWidth: 25, halign: 'center' },
      totalContainers: { cellWidth: 8, halign: 'center' },
      size: { cellWidth: 15, halign: 'center' },
      teus: { cellWidth: 10, halign: 'center' },
      leo_date: { cellWidth: 20, halign: 'center' },
      remarks: { cellWidth: 10, halign: 'center' }
    };
    // Total adjusted to approx 287mm to fill the page without overflow

    const columnStyles = {};
    visibleCols.forEach((col, idx) => {
      const cfg = styleMap[col.key] || { halign: 'center' };
      columnStyles[idx] = {
        cellWidth: cfg.cellWidth || 'auto',
        halign: cfg.halign,
        fontSize: col.key === 'commodity' ? 5 : 7
      };
    });
    // Total width will now fill the page as Commodity takes all remaining space

    doc.autoTable({
      head: [tableHeaders],
      body: tableData,
      startY: 25,
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
        fontSize: 8,
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
        // Force font size 6 for commodity column (smaller than others)
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

    // Add summary table on a new page
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const summaryTitle = `Summary - ${monthName} ${year}`;
    const summaryTextWidth = doc.getTextWidth(summaryTitle);
    const summaryX = (doc.internal.pageSize.getWidth() - summaryTextWidth) / 2;
    doc.text(summaryTitle, summaryX, 15);

    // Prepare summary table data
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
      alternateRowStyles: {
        fillColor: [247, 250, 255],
      },
      margin: { top: 25, right: 5, bottom: 15, left: 5 },
      theme: 'grid',
      tableLineColor: [205, 133, 63],
      tableLineWidth: 0.5
    });

    // Add exporter summary table
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
      alternateRowStyles: {
        fillColor: [247, 250, 255],
      },
      margin: { top: 25, right: 5, bottom: 15, left: 5 },
      theme: 'grid',
      tableLineColor: [205, 133, 63],
      tableLineWidth: 0.5
    });

    // Add page numbering at bottom
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`${i}/${pageCount}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10);
    }

    // Generate filename and save
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `EXPORT_CLEARING_DETAILS_${monthName.toUpperCase()}-${year}_${timestamp}.pdf`;
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
          <Button
            variant="outlined"
            startIcon={<TableViewIcon fontSize="small" sx={{ color: '#1976d2' }} />}
            onClick={() => setSummaryOpen(true)}
            disabled={loading || processedData.length === 0}
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
          Export Clearance Report
        </Typography>



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

      {error && (
        <Alert severity="error" sx={{ marginBottom: 2 }}>
          {error}
        </Alert>
      )}

      {/* Data Summary Card */}
      {processedData.length > 0 && (
        <Card elevation={1} sx={{ marginBottom: 2, padding: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              Report Summary: {detailedRows.length} records found for {months.find(m => m.value === month)?.label} {year}
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Total TEUs: {
                (() => {
                  const totalTeus = detailedRows.reduce((sum, row) => {
                    if (isLclJob(row)) return sum;
                    return sum + (parseInt(row.teus) || 0);
                  }, 0);

                  return totalTeus;
                })()
              }
            </Typography>
          </Box>
        </Card>
      )}

      {/* Data Table */}
      {processedData.length > 0 && (
        <Card elevation={1} sx={{ overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {columns
                    .filter((col) => !(col.key === 'invoice_value' && !isSrManager))
                    .map((col) => (
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
                      {columns
                        .filter((col) => !(col.key === 'invoice_value' && !isSrManager))
                        .map((col) => (
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
                  : detailedRows.map((row, idx) => (
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
                      {/* Srl No. */}
                      <TableCell align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px", fontWeight: 'bold', color: '#666' }}>
                        {String(idx + 1).padStart(3, "0")}
                      </TableCell>

                      {/* JOB No */}
                      <TableCell align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px", fontWeight: '500' }}>
                        {row.job_no}
                      </TableCell>

                      {/* LOCATION */}
                      <TableCell align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px" }}>
                        {row.location}
                      </TableCell>

                      {/* IMPORTERS NAME */}
                      <TableCell align="left" sx={{ fontSize: "0.75rem", padding: "6px 8px", maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <Tooltip title={row.exporter}>
                          <span>{row.exporter}</span>
                        </Tooltip>
                      </TableCell>

                      {/* COMMODITY */}
                      <TableCell align="left" sx={{ fontSize: "0.58rem", lineHeight: 1.1, padding: "6px 8px", maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <Tooltip title={row.commodity}>
                          <span>{row.commodity}</span>
                        </Tooltip>
                      </TableCell>

                      {/* PRICE (invoice_value) - NEW COLUMN (only for Sr. Manager) */}
                      {isSrManager && (
                        <TableCell align="right" sx={{
                          fontSize: "0.8rem",
                          padding: "6px 8px",
                          fontWeight: '500',
                          color: '#1976d2',
                          fontFamily: 'monospace',
                          whiteSpace: 'nowrap'
                        }}>
                          {row?.invoice_value && row?.inv_currency
                            ? `${row.inv_currency} ${(parseFloat(row.invoice_value)).toFixed(2)}`
                            : '—'
                          }
                        </TableCell>
                      )}



                      {/* B/E. NO. */}
                      <TableCell align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px" }}>
                        {row.sb_no}
                      </TableCell>

                      {/* DATE */}
                      <TableCell align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px" }}>
                        {row.sb_date ? new Date(row.sb_date).toLocaleDateString('en-GB') : ''}
                      </TableCell>

                      {/* CONTAINER NO. */}
                      <TableCell align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px" }}>
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
                          {row.containerNumbers && row.containerNumbers.map((num, i) => (
                            <Typography key={i} variant="caption" sx={{ fontSize: '0.7rem' }}>
                              {num}
                            </Typography>
                          ))}
                        </Box>
                      </TableCell>

                      {/* NO. OF CNTR */}
                      <TableCell align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px", fontWeight: 'bold' }}>
                        {row.totalContainers}
                      </TableCell>

                      {/* SIZE (separate column) */}
                      <TableCell align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px" }}>
                        {deriveSize(row.noOfContrSize)}
                      </TableCell>

                      {/* Teus */}
                      <TableCell align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px", fontWeight: 'bold', color: '#1976d2' }}>
                        {isLclJob(row) ? "LCL" : row.teus}
                      </TableCell>

                      {/* CLRG DATE */}
                      <TableCell align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px" }}>
                        {row.leo_date ? new Date(row.leo_date).toLocaleDateString('en-GB') : ''}
                      </TableCell>

                      {/* REMARKS */}
                      <TableCell align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px" }}>
                        {row.remarks
                          ? row.remarks.split('\n').map((line, idx) => (
                            <React.Fragment key={idx}>
                              {line}
                              {idx < row.remarks.split('\n').length - 1 && <br />}
                            </React.Fragment>
                          ))
                          : ""}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>

            </Table>
          </TableContainer>
        </Card>
      )}

      {/* No Data State */}
      {!loading && detailedRows.length === 0 && (
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
