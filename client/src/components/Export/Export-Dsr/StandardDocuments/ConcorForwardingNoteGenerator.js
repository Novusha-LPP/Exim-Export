import React, { useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import axios from "axios";
import { MenuItem, Button, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Switch } from "@mui/material";
import DocumentEditorDialog from "./DocumentEditorDialog";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// Import the logo properly for Vite
import concorLogo from "../../../../assets/images/concor.png";
import { imageToBase64 } from "../../../../utils/imageUtils";

const ConcorForwardingNotePDFGenerator = ({ jobNo, children }) => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [jobData, setJobData] = useState(null);

  const [isClubJob, setIsClubJob] = useState(false);
  const [clubbedJobs, setClubbedJobs] = useState([]);
  const [clubbedJobsData, setClubbedJobsData] = useState([]);
  const [jobSearch, setJobSearch] = useState("");
  const [jobOptions, setJobOptions] = useState([]);
  const [showJobDropdown, setShowJobDropdown] = useState(false);
  const [logoSrc, setLogoSrc] = useState(concorLogo);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Convert logo on mount
  React.useEffect(() => {
    const loadLogo = async () => {
      try {
        const base64 = await imageToBase64(concorLogo);
        setLogoSrc(base64);
      } catch (err) {
        console.warn("Failed to convert concorLogo to base64, using original path", err);
      }
    };
    loadLogo();
  }, []);

  // Search jobs debounced
  React.useEffect(() => {
    const searchJobs = async () => {
      if (!showJobDropdown) return;
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_STRING}/job-numbers-search`, {
          params: { q: jobSearch }
        });
        if (res.data?.success && Array.isArray(res.data.data)) {
          setJobOptions(res.data.data);
        }
      } catch (err) {
        console.error("Error searching jobs", err);
      }
    };
    const delayDebounce = setTimeout(() => {
      searchJobs();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [jobSearch, showJobDropdown]);

  // Fetch details of clubbed jobs when selected
  React.useEffect(() => {
    const fetchClubbedData = async () => {
      if (!isClubJob || clubbedJobs.length === 0) {
        setClubbedJobsData([]);
        return;
      }
      try {
        const promises = clubbedJobs.map(async (jNo) => {
          const res = await axios.get(`${import.meta.env.VITE_API_STRING}/get-export-job/${encodeURIComponent(jNo)}`);
          return res.data;
        });
        const results = await Promise.all(promises);
        setClubbedJobsData(results);
      } catch (err) {
        console.error("Error fetching clubbed jobs data", err);
      }
    };
    fetchClubbedData();
  }, [isClubJob, clubbedJobs]);

  // Regenerate htmlContent when jobData, isClubJob, or clubbedJobsData changes
  React.useEffect(() => {
    if (!jobData) return;
    const template = buildTemplate(jobData, logoSrc, isClubJob ? clubbedJobsData : []);
    setHtmlContent(template);
  }, [jobData, isClubJob, clubbedJobsData, logoSrc]);

  // Click outside to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (showJobDropdown && !event.target.closest('.ep-search-container')) {
        setShowJobDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showJobDropdown]);

  const getAggregatedContainers = (primaryJob, validClubbedJobs) => {
    if (!primaryJob) return [];
    const primaryContainers = primaryJob.containers || [];
    const invoice = primaryJob.invoices?.[0] || {};
    const product = invoice.products?.[0] || {};
    const operations = primaryJob.operations?.[0] || {};
    const statusDetails = operations.statusDetails?.[0] || {};

    let result = [];
    primaryContainers.forEach(cnt => {
      result.push({
        ...cnt,
        jobNo: primaryJob.job_no,
        description: product.description || "",
        ritc: product.ritc || "",
        invoiceValue: invoice.invoiceValue || "",
        leoDate: statusDetails.leoDate || "",
      });
    });

    if (Array.isArray(validClubbedJobs)) {
      validClubbedJobs.forEach(cJobData => {
        const cJobContainers = cJobData.containers || [];
        const cJobInvoice = cJobData.invoices?.[0] || {};
        const cJobProduct = cJobInvoice.products?.[0] || {};
        const cJobOperations = cJobData.operations?.[0] || {};
        const cJobStatusDetails = cJobOperations.statusDetails?.[0] || {};

        cJobContainers.forEach(cnt => {
          result.push({
            ...cnt,
            jobNo: cJobData.job_no,
            description: cJobProduct.description || "",
            ritc: cJobProduct.ritc || "",
            invoiceValue: cJobInvoice.invoiceValue || "",
            leoDate: cJobStatusDetails.leoDate || "",
          });
        });
      });
    }

    // Group/Aggregate by containerNo (case-insensitive)
    const grouped = {};
    result.forEach(cnt => {
      const key = (cnt.containerNo || "").trim().toUpperCase();
      const groupKey = key || `EMPTY_${Math.random()}`;
      
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          ...cnt,
          uniqueDescriptions: [],
          uniqueHsnCodes: [],
          uniqueSBs: [],
          uniqueSealNos: [],
          uniqueShippingLineSealNos: [],
          uniqueLeoDates: [],
          uniqueInvoiceValues: [],
          pkgsStuffed: 0,
          grossWeight: 0,
          grWtPlusTrWt: 0,
        };
      }
      
      const group = grouped[groupKey];
      group.pkgsStuffed += Number(cnt.pkgsStuffed) || 0;
      group.grossWeight += Number(cnt.grossWeight) || 0;
      group.grWtPlusTrWt += Number(cnt.grWtPlusTrWt || 0);
      
      const desc = cnt.description || "";
      const hsn = cnt.ritc || "";
      const sbNo = cnt.jobNo || "";
      const sbDate = cnt.sb_date || "";

      group.uniqueSBs.push({
        sbNo,
        sbDate,
        pkgs: Number(cnt.pkgsStuffed) || 0,
        weight: Number(cnt.grossWeight) || 0,
        tareWeight: Number(cnt.tareWeightKgs) || 0,
        ritc: hsn,
        description: desc,
        sealNo: cnt.sealNo || "",
        shippingLineSealNo: cnt.shippingLineSealNo || "",
        invoiceValue: Number(cnt.invoiceValue) || 0,
        leoDate: cnt.leoDate || ""
      });

      if (desc && !group.uniqueDescriptions.includes(desc)) {
        group.uniqueDescriptions.push(desc);
      }
      if (hsn && !group.uniqueHsnCodes.includes(hsn)) {
        group.uniqueHsnCodes.push(hsn);
      }
      if (cnt.sealNo && !group.uniqueSealNos.includes(cnt.sealNo)) {
        group.uniqueSealNos.push(cnt.sealNo);
      }
      if (cnt.shippingLineSealNo && !group.uniqueShippingLineSealNos.includes(cnt.shippingLineSealNo)) {
        group.uniqueShippingLineSealNos.push(cnt.shippingLineSealNo);
      }
      if (cnt.leoDate && !group.uniqueLeoDates.includes(cnt.leoDate)) {
        group.uniqueLeoDates.push(cnt.leoDate);
      }
      if (cnt.invoiceValue) {
        group.uniqueInvoiceValues.push(Number(cnt.invoiceValue) || 0);
      }
    });

    return Object.values(grouped).map(group => {
      return {
        ...group,
        description: group.uniqueDescriptions.join(", "),
        ritc: group.uniqueHsnCodes.join(", "),
        sealNo: group.uniqueSealNos.join(", "),
        shippingLineSealNo: group.uniqueShippingLineSealNos.join(", "),
        leoDate: group.uniqueLeoDates[0] || "",
        invoiceValue: group.uniqueInvoiceValues.length > 0 ? group.uniqueInvoiceValues.reduce((a, b) => a + b, 0) : ""
      };
    });
  };

  const handleAction = async (e) => {
    if (e) e.stopPropagation();
    const encodedJobNo = encodeURIComponent(jobNo);

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/get-export-job/${encodedJobNo}`
      );
      const exportJob = response.data;

      setIsClubJob(false);
      setClubbedJobs([]);
      setClubbedJobsData([]);
      setJobData(exportJob);

      const template = buildTemplate(exportJob, logoSrc, []);
      setHtmlContent(template);
      setChoiceOpen(true);
    } catch (err) {
      console.error("Error fetching data:", err);
      alert("Error fetching job data");
    }
  };

  const buildTemplate = (exportJob, logoSrc = concorLogo, validClubbedJobs = []) => {
    const containers = getAggregatedContainers(exportJob, validClubbedJobs);
    const operations = exportJob.operations?.[0] || {};
    const invoice = exportJob.invoices?.[0] || {};
    const statusDetails = operations.statusDetails?.[0] || {};

    const totalPackages = containers.reduce((sum, cnt) => sum + (Number(cnt.pkgsStuffed) || 0), 0);
    const totalCargoWeight = containers.reduce((sum, cnt) => sum + parseFloat(cnt.grossWeight || 0) / 1000, 0);

    let containerRows = "";
    containers.forEach((cnt, i) => {
      const sizeMatch = (cnt.type || "").match(/^(\d+)/);
      const size = sizeMatch ? sizeMatch[1] : "";

      const descDisplay = cnt.uniqueDescriptions && cnt.uniqueDescriptions.length > 0
        ? cnt.uniqueDescriptions.map(d => `<div>${d}</div>`).join("")
        : (cnt.description || "");

      const ritcDisplay = cnt.uniqueHsnCodes && cnt.uniqueHsnCodes.length > 0
        ? cnt.uniqueHsnCodes.join("<br/>")
        : (cnt.ritc || "");

      const tareDisplay = cnt.uniqueSBs && cnt.uniqueSBs.length > 0
        ? cnt.uniqueSBs.map(sb => `<div>${sb.tareWeight || ""}</div>`).join("")
        : (cnt.tareWeightKgs || "");

      const pkgsDisplay = cnt.uniqueSBs && cnt.uniqueSBs.length > 0
        ? cnt.uniqueSBs.map(sb => `<div>${sb.pkgs || ""}</div>`).join("")
        : (cnt.pkgsStuffed || "");

      const weightDisplay = cnt.uniqueSBs && cnt.uniqueSBs.length > 0
        ? cnt.uniqueSBs.map(sb => `<div>${(Number(sb.weight) / 1000).toFixed(1)}</div>`).join("")
        : (parseFloat(cnt.grossWeight || 0) / 1000).toFixed(1);

      const vgmDisplay = cnt.uniqueSBs && cnt.uniqueSBs.length > 0
        ? cnt.uniqueSBs.map(sb => `<div>${((Number(sb.weight) + Number(sb.tareWeight)) / 1000).toFixed(1)}</div>`).join("")
        : (cnt.grWtPlusTrWt ? (parseFloat(cnt.grWtPlusTrWt) / 1000).toFixed(1) : "");

      const invoiceValDisplay = cnt.uniqueSBs && cnt.uniqueSBs.length > 0
        ? cnt.uniqueSBs.map(sb => `<div>${sb.invoiceValue || ""}</div>`).join("")
        : (cnt.invoiceValue || "");

      const leoDisplay = cnt.uniqueSBs && cnt.uniqueSBs.length > 0
        ? cnt.uniqueSBs.map(sb => `<div>${formatDate(sb.leoDate)}</div>`).join("")
        : formatDate(cnt.leoDate);

      const sealDisplay = cnt.uniqueSBs && cnt.uniqueSBs.length > 0
        ? cnt.uniqueSBs.map(sb => `<div>${sb.sealNo || ""}</div>`).join("")
        : (cnt.sealNo || "");

      containerRows += `
        <tr>
          <td style="text-align: center; vertical-align: middle; border: 1px solid black; padding: 1px 2px 3px 2px; font-size: 10px;">${i + 1}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${cnt.containerNo || ""}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${cnt.sealType || "RFID"}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${size}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${tareDisplay}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${pkgsDisplay}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; vertical-align: middle; font-size: 10px;">${descDisplay}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${ritcDisplay}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${weightDisplay}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${vgmDisplay}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">NO</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${invoiceValDisplay}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${leoDisplay}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${sealDisplay}</td>
        </tr>
      `;
    });

    let jobNosInfo = exportJob.job_no || "";
    let invNosInfo = invoice.invoiceNumber || "";
    if (validClubbedJobs.length > 0) {
      jobNosInfo = [exportJob.job_no, ...validClubbedJobs.map(j => j.job_no)].filter(Boolean).join(", ");
      invNosInfo = [invoice.invoiceNumber, ...validClubbedJobs.map(j => j.invoices?.[0]?.invoiceNumber)].filter(Boolean).join(", ");
    }

    return `
      <div style="width: 1140px; margin: 5px auto; font-family: Helvetica, Arial, sans-serif; color: black; background: white;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 2px; table-layout: fixed;">
          <tr>
            <td style="width: 70px; text-align: left; vertical-align: middle; border: none; padding: 0;"><img src="${logoSrc}" style="height: 50px; width: auto;"/></td>
            <td style="text-align: center; vertical-align: middle; border: none; padding: 0;">
              <div style="font-size: 18px; font-weight: bold; letter-spacing: 0.5px;">CONTAINER CORPORATION OF INDIA LIMITED (CONCOR)</div>
              <div style="font-size: 8px; margin-top: 1px;">FORWARDING NOTE FOR GENERAL AND DANGEROUS MERCHANDISE</div>
              <div style="font-size: 7px;">(FOR CONCOR USE ONLY)</div>
              <div style="margin-top: 6px; font-size: 14px; font-weight: bold;">
                <span style="display: inline-block; width: 45%; text-align: right; padding-right: 20px; margin-bottom: 10px;">JOB  ${jobNosInfo}</span>
                <span style="display: inline-block; width: 45%; text-align: left; padding-left: 20px; margin-bottom: 10px;">INV  ${invNosInfo}</span>
              </div>
            </td>
            <td style="width: 70px; text-align: right; vertical-align: middle; border: none; padding: 0;"><img src="${logoSrc}" style="height: 50px; width: auto;"/></td>
          </tr>
        </table>

        <table style="width: 100%; border: 1px solid black; border-collapse: collapse; table-layout: fixed;">
          <tr>
            <td style="border: 1px solid black; width: 14%; text-align: center; vertical-align: middle; font-weight: bold; padding: 1px 2px 4px 2px; font-size: 10px;">SEGMENT</td>
            <td style="border: 1px solid black; width: 14%; text-align: center; vertical-align: middle; font-weight: bold; padding: 1px 2px 4px 2px; font-size: 10px;">EXIM</td>
            <td style="border: 1px solid black; width: 72%; vertical-align: middle; padding: 1px 2px 4px 10px; font-size: 11px; font-weight: bold;">MODE (TICK ONE):&nbsp;&nbsp;&nbsp;&nbsp;BY&nbsp;&nbsp;&nbsp;&nbsp;RAIL /ROAD</td>
          </tr>
          <tr>
            <td colspan="2" style="border: 1px solid black; text-align: center; vertical-align: middle; font-weight: bold; padding: 1px 2px 4px 2px; font-size: 10px;">FROM</td>
            <td style="border: 1px solid black; text-align: center; vertical-align: middle; font-weight: bold; padding: 1px 2px 4px 2px; font-size: 10px;">TO</td>
          </tr>
          <tr>
            <td style="border: 1px solid black; font-size: 9px; text-align: center; vertical-align: middle; padding: 1px 2px 3px 2px;">TERMINAL</td>
            <td style="border: 1px solid black; font-size: 9px; text-align: center; vertical-align: middle; padding: 1px 2px 3px 2px;">GATEWAY PORT</td>
            <td style="border: 1px solid black; padding: 0;">
              <table style="width: 100%; border-collapse: collapse; height: 100%;">
                <tr>
                  <td style="border: none; border-right: 1px solid black; width: 35%; font-size: 9px; text-align: center; vertical-align: middle; padding: 1px 2px 3px 2px;">SHIPPING LINE</td>
                  <td style="border: none; border-right: 1px solid black; width: 35%; font-size: 9px; text-align: center; vertical-align: middle; padding: 1px 2px 3px 2px;">PORT OF DISCHARGE</td>
                  <td style="border: none; width: 30%; font-size: 9px; text-align: center; vertical-align: middle; padding: 1px 2px 3px 2px;">COUNTRY</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid black; text-align: center; vertical-align: middle; font-weight: bold; padding: 2px 2px 4px 2px; font-size: 12px;">${exportJob.branchCode || "KHDB"}</td>
            <td style="border: 1px solid black; text-align: center; vertical-align: middle; font-weight: bold; padding: 2px 2px 4px 2px; font-size: 12px;">${exportJob.gateway_port || exportJob.port_of_loading || ""}</td>
            <td style="border: 1px solid black; padding: 0;">
               <table style="width: 100%; border-collapse: collapse; height: 100%;">
                <tr>
                  <td style="border: none; border-right: 1px solid black; width: 35%; text-align: center; vertical-align: middle; font-weight: bold; padding: 2px 2px 4px 2px; font-size: 12px;">${exportJob.shipping_line_airline || ""}</td>
                  <td style="border: none; border-right: 1px solid black; width: 35%; text-align: center; vertical-align: middle; font-weight: bold; padding: 2px 2px 4px 2px; font-size: 12px;">${exportJob.port_of_discharge || ""}</td>
                  <td style="border: none; width: 30%; text-align: center; vertical-align: middle; font-weight: bold; padding: 2px 2px 4px 2px; font-size: 12px;">${exportJob.discharge_country || ""}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td colspan="3" style="border: 1px solid black; font-size: 10px; vertical-align: middle; padding: 1px 5px 4px 5px;">
              CUSTOMER TYPE: (TICK ONE) EXPORTER | IMPORTER | ASSOCIATE PARTNER | CORPORATE CUSTOMER
            </td>
          </tr>
          <tr>
            <td colspan="3" style="border: 1px solid black; font-size: 10px; padding: 0;">
              <table style="width: 100%; border-collapse: collapse; height: 100%;">
                 <tr>
                    <td style="border: none; border-right: 1px solid black; width: 50%; padding: 1px 5px 4px 5px; vertical-align: middle;">NAME OF CUSTOMER / ASSOCIATE PARTNER:&nbsp;&nbsp;<b>${exportJob.exporter || ""}</b></td>
                    <td style="border: none; width: 50%; padding: 1px 5px 4px 5px; vertical-align: middle;">GST REGISTRATION NO.:&nbsp;&nbsp;<b>${exportJob.gstin || ""}</b></td>
                 </tr>
              </table>
            </td>
          </tr>
          <tr>
             <td colspan="3" style="border: 1px solid black; font-size: 10px; padding: 0;">
               <table style="width: 100%; border-collapse: collapse; height: 100%;">
                 <tr>
                    <td style="border: none; border-right: 1px solid black; width: 50%; padding: 1px 5px 4px 5px; vertical-align: middle;">ADDRESS OF CUSTOMER:&nbsp;&nbsp;<b>${exportJob.exporter || ""}</b></td>
                    <td style="border: none; width: 50%; padding: 1px 5px 4px 5px; vertical-align: middle;">PAN NO.:&nbsp;&nbsp;<b>${exportJob.panNo || ""}</b></td>
                 </tr>
              </table>
             </td>
          </tr>
          <tr>
            <td colspan="3" style="border: 1px solid black; font-size: 10px; padding: 0;">
              <table style="width: 100%; border-collapse: collapse; height: 100%;">
                 <tr>
                   <td style="border: none; border-right: 1px solid black; width: 25%; padding: 1px 5px 4px 5px; vertical-align: middle;">BOOKING NO.:&nbsp;&nbsp;<b>${exportJob.booking_no || ""}</b></td>
                   <td style="border: none; border-right: 1px solid black; width: 25%; padding: 1px 5px 4px 5px; vertical-align: middle;">BOOKING DT:&nbsp;&nbsp;<b>${formatDate(exportJob.booking_date)}</b></td>
                   <td style="border: none; border-right: 1px solid black; width: 25%; padding: 1px 5px 4px 5px; vertical-align: middle;">EXPORTER REF NO.:&nbsp;&nbsp;<b>${exportJob.exporter_ref_no || ""}</b></td>
                   <td style="border: none; width: 25%; padding: 1px 5px 4px 5px; vertical-align: middle;">CHA / AGENT NAME:&nbsp;&nbsp;<b>SURAJ FORWARDERS & SHIPPING AGENCIES</b></td>
                 </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Table of containers -->
        <table style="width: 100%; border: 1px solid black; border-collapse: collapse; margin-top: 5px; table-layout: fixed;">
          <thead>
            <tr style="background-color: #f2f2f2; font-weight: bold; text-align: center; height: 35px;">
              <th style="border: 1px solid black; width: 3%; font-size: 9px; padding: 2px;">Sr.<br/>No.</th>
              <th style="border: 1px solid black; width: 12%; font-size: 9px; padding: 2px;">CONTAINER NO.</th>
              <th style="border: 1px solid black; width: 7%; font-size: 9px; padding: 2px;">TYPE<br/>RFID/OTH</th>
              <th style="border: 1px solid black; width: 5%; font-size: 9px; padding: 2px;">SIZE</th>
              <th style="border: 1px solid black; width: 6%; font-size: 9px; padding: 2px;">TARE WT.<br/>(In KGS)</th>
              <th style="border: 1px solid black; width: 6%; font-size: 9px; padding: 2px;">NO. OF<br/>PACKAGES</th>
              <th style="border: 1px solid black; width: 17%; font-size: 9px; padding: 2px;">COMMODITY NAME / DESCRIPTION</th>
              <th style="border: 1px solid black; width: 9%; font-size: 9px; padding: 2px;">COMMODITY<br/>HSN CODE</th>
              <th style="border: 1px solid black; width: 7%; font-size: 9px; padding: 2px;">CARGO WT<br/>(In MTS)</th>
              <th style="border: 1px solid black; width: 7%; font-size: 9px; padding: 2px;">VGM<br/>CARGO+TARE</th>
              <th style="border: 1px solid black; width: 6%; font-size: 9px; padding: 2px;">HAZAR-<br/>DOUS</th>
              <th style="border: 1px solid black; width: 6%; font-size: 9px; padding: 2px;">VALUE/<br/>FOB</th>
              <th style="border: 1px solid black; width: 8%; font-size: 9px; padding: 2px;">LEO DT</th>
              <th style="border: 1px solid black; width: 10%; font-size: 9px; padding: 2px;">SEAL NO.</th>
            </tr>
          </thead>
          <tbody>
            ${containerRows}
            <tr style="font-weight: bold; background-color: #f9f9f9; height: 25px;">
              <td colspan="5" style="border: 1px solid black; text-align: right; padding-right: 10px; font-size: 10px;">Total</td>
              <td style="border: 1px solid black; text-align: center; font-size: 10px;">${totalPackages || ""}</td>
              <td colspan="2" style="border: 1px solid black;"></td>
              <td style="border: 1px solid black; text-align: center; font-size: 10px;">${totalCargoWeight.toFixed(1)}</td>
              <td colspan="5" style="border: 1px solid black;"></td>
            </tr>
          </tbody>
        </table>

        <!-- bottom instructions -->
        <table style="width: 100%; border: 1px solid black; border-collapse: collapse; margin-top: 5px; font-size: 8px; table-layout: fixed;">
          <tr>
            <td style="border: 1px solid black; width: 50%; vertical-align: top; padding: 4px 6px;">
               <div style="font-weight: bold; font-size: 9px; text-decoration: underline; margin-bottom: 2px;">TERMS AND CONDITIONS</div>
               1. We agree to pay all charges to CONCOR as per current tariff.<br/>
               2. We certify that description and weight of goods have been correctly entered in this forwarding note.<br/>
               3. We certify that the container(s) has/have been stuffed in compliance with all safety regulations.<br/>
               4. We certify that the seals have been verified and found intact.<br/>
               5. We accept the liabilities and terms as specified under CONCOR Rules & Regulations.
            </td>
            <td style="border: 1px solid black; width: 50%; vertical-align: top; padding: 4px 6px;">
               <div style="font-weight: bold; font-size: 9px; text-decoration: underline; margin-bottom: 2px;">STUFFING CERTIFICATE (FOR FACTORY / CFS STUFFED)</div>
               Stuffed Container(s) described above has/have been sealed in my/our presence after verifying container condition.<br/><br/>
               <table style="width: 100%; border: none; margin-top: 8px;">
                 <tr>
                   <td style="border: none; text-align: left; font-size: 8px; font-weight: bold; vertical-align: bottom;">DATE : ${formatDate(new Date())}</td>
                   <td style="border: none; text-align: right; font-size: 8px; font-weight: bold; vertical-align: bottom;">SIGNATURE OF EXPORTER / CHA / AGENT</td>
                 </tr>
               </table>
            </td>
          </tr>
        </table>
      </div>
    `;
  };

  const downloadDirectly = async () => {
    setChoiceOpen(false);
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
    const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
    const leftMargin = 5;
    const rightMargin = 5;
    const contentWidth = pageWidth - leftMargin - rightMargin; // 287mm

    try {
      await doc.html(htmlContent, {
        callback: function (doc) {
          doc.save(`CONCOR_Forwarding_Note_${jobNo}.pdf`);
        },
        x: leftMargin,
        y: 5,
        width: contentWidth,
        windowWidth: 1150,
        autoPaging: "slice",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF");
    }
  };

  const handleDownloadExcel = async () => {
    setChoiceOpen(false);
    if (!jobData) {
      alert("No job data loaded.");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("CONCOR Note");

      // Column Widths for 14 columns
      worksheet.columns = [
        { width: 5 },   // A: Sr No
        { width: 18 },  // B: Container No
        { width: 10 },  // C: Type
        { width: 8 },   // D: Size
        { width: 12 },  // E: Tare Wt
        { width: 12 },  // F: No of Packages
        { width: 35 },  // G: Commodity Name
        { width: 14 },  // H: HSN Code
        { width: 12 },  // I: Cargo Wt (MT)
        { width: 12 },  // J: VGM
        { width: 12 },  // K: Hazardous
        { width: 14 },  // L: Value/FOB
        { width: 14 },  // M: LEO Dt
        { width: 16 }   // N: Seal No
      ];

      for (let r = 1; r <= 100; r++) {
        worksheet.getRow(r).height = 18;
      }

      // Add logo
      if (logoSrc && logoSrc.startsWith("data:image")) {
        try {
          const base64Data = logoSrc.split(",")[1];
          const extension = logoSrc.match(/image\/(\w+)/)?.[1] || "png";
          const imageId = workbook.addImage({
            base64: base64Data,
            extension: extension
          });
          worksheet.addImage(imageId, {
            tl: { col: 0.1, row: 0.5 },
            ext: { width: 50, height: 36 },
            editAs: 'oneCell'
          });
          worksheet.addImage(imageId, {
            tl: { col: 12.9, row: 0.5 },
            ext: { width: 50, height: 36 },
            editAs: 'oneCell'
          });
        } catch (err) {
          console.warn("Failed to add concor image to Excel", err);
        }
      }

      // Title Block
      worksheet.mergeCells("B1:M1");
      worksheet.getCell("B1").value = "CONTAINER CORPORATION OF INDIA LIMITED (CONCOR)";
      worksheet.getCell("B1").font = { name: "Arial", bold: true, size: 14 };
      worksheet.getCell("B1").alignment = { vertical: "middle", horizontal: "center" };

      worksheet.mergeCells("B2:M2");
      worksheet.getCell("B2").value = "FORWARDING NOTE FOR GENERAL AND DANGEROUS MERCHANDISE";
      worksheet.getCell("B2").font = { name: "Arial", bold: true, size: 8 };
      worksheet.getCell("B2").alignment = { vertical: "middle", horizontal: "center" };

      worksheet.mergeCells("B3:M3");
      worksheet.getCell("B3").value = "(FOR CONCOR USE ONLY)";
      worksheet.getCell("B3").font = { name: "Arial", size: 7.5 };
      worksheet.getCell("B3").alignment = { vertical: "middle", horizontal: "center" };

      worksheet.mergeCells("B4:G4");
      let jobNosInfo = jobData.job_no || "";
      if (isClubJob && clubbedJobsData.length > 0) {
        jobNosInfo = [jobData.job_no, ...clubbedJobsData.map(j => j.job_no)].filter(Boolean).join(", ");
      }
      worksheet.getCell("B4").value = `JOB: ${jobNosInfo}`;
      worksheet.getCell("B4").font = { name: "Arial", bold: true, size: 11 };
      worksheet.getCell("B4").alignment = { vertical: "middle", horizontal: "right" };

      worksheet.mergeCells("H4:M4");
      const invoice = jobData.invoices?.[0] || {};
      let invNosInfo = invoice.invoiceNumber || "";
      if (isClubJob && clubbedJobsData.length > 0) {
        invNosInfo = [invoice.invoiceNumber, ...clubbedJobsData.map(j => j.invoices?.[0]?.invoiceNumber)].filter(Boolean).join(", ");
      }
      worksheet.getCell("H4").value = `INV: ${invNosInfo}`;
      worksheet.getCell("H4").font = { name: "Arial", bold: true, size: 11 };
      worksheet.getCell("H4").alignment = { vertical: "middle", horizontal: "left" };

      // Row 5: Segment
      worksheet.getRow(5).height = 24;
      worksheet.mergeCells("A5:B5");
      worksheet.getCell("A5").value = "SEGMENT";
      worksheet.getCell("A5").font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell("A5").alignment = { vertical: "middle", horizontal: "center" };

      worksheet.mergeCells("C5:D5");
      worksheet.getCell("C5").value = "EXIM";
      worksheet.getCell("C5").font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell("C5").alignment = { vertical: "middle", horizontal: "center" };

      worksheet.mergeCells("E5:N5");
      worksheet.getCell("E5").value = "MODE (TICK ONE):    BY    RAIL / ROAD";
      worksheet.getCell("E5").font = { name: "Arial", bold: true, size: 9.5 };
      worksheet.getCell("E5").alignment = { vertical: "middle", horizontal: "left" };

      // Row 6: From/To Headers
      worksheet.mergeCells("A6:D6");
      worksheet.getCell("A6").value = "FROM";
      worksheet.getCell("A6").font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell("A6").alignment = { vertical: "middle", horizontal: "center" };

      worksheet.mergeCells("E6:N6");
      worksheet.getCell("E6").value = "TO";
      worksheet.getCell("E6").font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell("E6").alignment = { vertical: "middle", horizontal: "center" };

      // Row 7: Labels
      worksheet.getRow(7).height = 20;
      worksheet.mergeCells("A7:B7");
      worksheet.getCell("A7").value = "TERMINAL";
      worksheet.mergeCells("C7:D7");
      worksheet.getCell("C7").value = "GATEWAY PORT";

      worksheet.mergeCells("E7:H7");
      worksheet.getCell("E7").value = "SHIPPING LINE";

      worksheet.mergeCells("I7:K7");
      worksheet.getCell("I7").value = "PORT OF DISCHARGE";

      worksheet.mergeCells("L7:N7");
      worksheet.getCell("L7").value = "COUNTRY";

      ["A7", "C7", "E7", "I7", "L7"].forEach(cid => {
        worksheet.getCell(cid).font = { name: "Arial", size: 8 };
        worksheet.getCell(cid).alignment = { vertical: "middle", horizontal: "center" };
      });

      // Row 8: Value
      worksheet.getRow(8).height = 26;
      worksheet.mergeCells("A8:B8");
      worksheet.getCell("A8").value = jobData.branchCode || "KHDB";
      worksheet.mergeCells("C8:D8");
      worksheet.getCell("C8").value = jobData.gateway_port || jobData.port_of_loading || "";

      worksheet.mergeCells("E8:H8");
      worksheet.getCell("E8").value = jobData.shipping_line_airline || "";

      worksheet.mergeCells("I8:K8");
      worksheet.getCell("I8").value = jobData.port_of_discharge || "";

      worksheet.mergeCells("L8:N8");
      worksheet.getCell("L8").value = jobData.discharge_country || "";

      ["A8", "C8", "E8", "I8", "L8"].forEach(cid => {
        worksheet.getCell(cid).font = { name: "Arial", bold: true, size: 10.5 };
        worksheet.getCell(cid).alignment = { vertical: "middle", horizontal: "center" };
      });

      // Row 9: Cust Type
      worksheet.mergeCells("A9:N9");
      worksheet.getCell("A9").value = "CUSTOMER TYPE: (TICK ONE) EXPORTER | IMPORTER | ASSOCIATE PARTNER | CORPORATE CUSTOMER";
      worksheet.getCell("A9").font = { name: "Arial", size: 8.5 };
      worksheet.getCell("A9").alignment = { vertical: "middle", horizontal: "left" };

      // Row 10: Cust Name
      worksheet.mergeCells("A10:G10");
      worksheet.getCell("A10").value = `NAME OF CUSTOMER / ASSOCIATE PARTNER:  ${jobData.exporter || ""}`;
      worksheet.getCell("A10").font = { name: "Arial", size: 9 };
      worksheet.getCell("A10").alignment = { vertical: "middle", horizontal: "left" };

      worksheet.mergeCells("H10:N10");
      worksheet.getCell("H10").value = `GST REGISTRATION NO.:  ${jobData.gstin || ""}`;
      worksheet.getCell("H10").font = { name: "Arial", size: 9 };
      worksheet.getCell("H10").alignment = { vertical: "middle", horizontal: "left" };

      // Row 11: Cust Address
      worksheet.mergeCells("A11:G11");
      worksheet.getCell("A11").value = `ADDRESS OF CUSTOMER:  ${jobData.exporter || ""}`;
      worksheet.getCell("A11").font = { name: "Arial", size: 9 };
      worksheet.getCell("A11").alignment = { vertical: "middle", horizontal: "left" };

      worksheet.mergeCells("H11:N11");
      worksheet.getCell("H11").value = `PAN NO.:  ${jobData.panNo || ""}`;
      worksheet.getCell("H11").font = { name: "Arial", size: 9 };
      worksheet.getCell("H11").alignment = { vertical: "middle", horizontal: "left" };

      // Row 12: Booking details
      worksheet.getRow(12).height = 22;
      worksheet.mergeCells("A12:C12");
      worksheet.getCell("A12").value = `BOOKING NO.: ${jobData.booking_no || ""}`;
      worksheet.mergeCells("D12:F12");
      worksheet.getCell("D12").value = `BOOKING DT: ${formatDate(jobData.booking_date)}`;
      worksheet.mergeCells("G12:J12");
      worksheet.getCell("G12").value = `EXPORTER REF NO.: ${jobData.exporter_ref_no || ""}`;
      worksheet.mergeCells("K12:N12");
      worksheet.getCell("K12").value = `CHA / AGENT: SURAJ FORWARDERS`;

      ["A12", "D12", "G12", "K12"].forEach(cid => {
        worksheet.getCell(cid).font = { name: "Arial", size: 8.5 };
        worksheet.getCell(cid).alignment = { vertical: "middle", horizontal: "left" };
      });

      // Row 13: Container Headers
      const tableHeaders = ["Sr. No.", "CONTAINER NO.", "TYPE", "SIZE", "TARE WT.", "NO. OF PACKAGES", "COMMODITY NAME", "COMMODITY HSN CODE", "CARGO WT (In MTS)", "VGM", "HAZARDOUS", "VALUE/FOB", "LEO DT", "SEAL NO."];
      worksheet.getRow(13).height = 28;
      tableHeaders.forEach((h, cidx) => {
        const cell = worksheet.getCell(13, cidx + 1);
        cell.value = h;
        cell.font = { name: "Arial", bold: true, size: 9 };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } };
      });

      // Containers Rows
      let currentRow = 14;
      let totalPackages = 0;
      let totalCargoWeight = 0;

      const aggregatedContainers = getAggregatedContainers(jobData, isClubJob ? clubbedJobsData : []);

      aggregatedContainers.forEach((cnt, i) => {
        worksheet.getRow(currentRow).height = 45;
        const pkgs = Number(cnt.pkgsStuffed) || 0;
        const weight = Number(cnt.grossWeight) || 0;
        const cargoWeightMT = weight / 1000;
        const tareWeight = Number(cnt.tareWeightKgs) || 0;
        const sizeMatch = (cnt.type || "").match(/^(\d+)/);
        const size = sizeMatch ? sizeMatch[1] : "";

        totalPackages += pkgs;
        totalCargoWeight += cargoWeightMT;

        worksheet.getCell(currentRow, 1).value = i + 1;
        worksheet.getCell(currentRow, 2).value = cnt.containerNo || "";
        worksheet.getCell(currentRow, 3).value = cnt.sealType || "RFID";
        worksheet.getCell(currentRow, 4).value = size;

        const tareText = cnt.uniqueSBs && cnt.uniqueSBs.length > 0
          ? cnt.uniqueSBs.map(sb => sb.tareWeight || "").join("\n")
          : (tareWeight || "");
        worksheet.getCell(currentRow, 5).value = tareText;

        const pkgsText = cnt.uniqueSBs && cnt.uniqueSBs.length > 0
          ? cnt.uniqueSBs.map(sb => sb.pkgs || "").join("\n")
          : (pkgs || "");
        worksheet.getCell(currentRow, 6).value = pkgsText;

        const descText = cnt.uniqueDescriptions && cnt.uniqueDescriptions.length > 0 ? cnt.uniqueDescriptions.join("\n") : (cnt.description || "");
        worksheet.getCell(currentRow, 7).value = descText;

        const ritcText = cnt.uniqueHsnCodes && cnt.uniqueHsnCodes.length > 0 ? cnt.uniqueHsnCodes.join("\n") : (cnt.ritc || "");
        worksheet.getCell(currentRow, 8).value = ritcText;

        const weightText = cnt.uniqueSBs && cnt.uniqueSBs.length > 0
          ? cnt.uniqueSBs.map(sb => (Number(sb.weight) / 1000).toFixed(1)).join("\n")
          : (cargoWeightMT || "");
        worksheet.getCell(currentRow, 9).value = weightText;

        const vgmText = cnt.uniqueSBs && cnt.uniqueSBs.length > 0
          ? cnt.uniqueSBs.map(sb => ((Number(sb.weight) + Number(sb.tareWeight)) / 1000).toFixed(1)).join("\n")
          : (cnt.grWtPlusTrWt ? Number(cnt.grWtPlusTrWt) / 1000 : "");
        worksheet.getCell(currentRow, 10).value = vgmText;

        worksheet.getCell(currentRow, 11).value = "NO";

        const valText = cnt.uniqueSBs && cnt.uniqueSBs.length > 0
          ? cnt.uniqueSBs.map(sb => sb.invoiceValue || "").join("\n")
          : (cnt.invoiceValue || "");
        worksheet.getCell(currentRow, 12).value = valText;

        const leoText = cnt.uniqueSBs && cnt.uniqueSBs.length > 0
          ? cnt.uniqueSBs.map(sb => formatDate(sb.leoDate)).join("\n")
          : formatDate(cnt.leoDate);
        worksheet.getCell(currentRow, 13).value = leoText;

        const sealText = cnt.uniqueSBs && cnt.uniqueSBs.length > 0
          ? cnt.uniqueSBs.map(sb => sb.sealNo || "").join("\n")
          : (cnt.sealNo || "");
        worksheet.getCell(currentRow, 14).value = sealText;

        // Alignments
        worksheet.getRow(currentRow).eachCell((cell, colNum) => {
          cell.font = cell.font || { name: "Arial", size: 9 };
          if (colNum === 2) cell.font.bold = true;
          cell.alignment = { vertical: "middle", horizontal: colNum === 7 ? "left" : "center", wrapText: true };
        });

        currentRow++;
      });

      // Total Row
      worksheet.getRow(currentRow).height = 24;
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = "Total:";
      worksheet.getCell(`A${currentRow}`).font = { name: "Arial", bold: true, size: 10 };
      worksheet.getCell(`A${currentRow}`).alignment = { vertical: "middle", horizontal: "right" };

      worksheet.getCell(`F${currentRow}`).value = totalPackages || "";
      worksheet.getCell(`F${currentRow}`).font = { name: "Arial", bold: true, size: 10 };
      worksheet.getCell(`F${currentRow}`).numFormat = '#,##0';
      worksheet.getCell(`F${currentRow}`).alignment = { vertical: "middle", horizontal: "center" };

      worksheet.getCell(`I${currentRow}`).value = totalCargoWeight || "";
      worksheet.getCell(`I${currentRow}`).font = { name: "Arial", bold: true, size: 10 };
      worksheet.getCell(`I${currentRow}`).numFormat = '#,##0.0';
      worksheet.getCell(`I${currentRow}`).alignment = { vertical: "middle", horizontal: "center" };

      worksheet.mergeCells(`J${currentRow}:N${currentRow}`);

      currentRow++;

      // Terms & Stuffing Instructions
      worksheet.getRow(currentRow).height = 100;
      worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = "TERMS AND CONDITIONS\n1. We agree to pay all charges to CONCOR as per current tariff.\n2. We certify that description and weight of goods have been correctly entered in this forwarding note.\n3. We certify that the container(s) has/have been stuffed in compliance with all safety regulations.\n4. We certify that the seals have been verified and found intact.\n5. We accept the liabilities and terms as specified under CONCOR Rules & Regulations.";
      worksheet.getCell(`A${currentRow}`).font = { name: "Arial", size: 7.5 };
      worksheet.getCell(`A${currentRow}`).alignment = { vertical: "top", horizontal: "left", wrapText: true };

      worksheet.mergeCells(`H${currentRow}:N${currentRow}`);
      worksheet.getCell(`H${currentRow}`).value = `STUFFING CERTIFICATE\nStuffed Container(s) described above has/have been sealed in my/our presence after verifying container condition.\n\nDATE : ${formatDate(new Date())}\n\nSIGNATURE OF EXPORTER / CHA / AGENT`;
      worksheet.getCell(`H${currentRow}`).font = { name: "Arial", bold: true, size: 8 };
      worksheet.getCell(`H${currentRow}`).alignment = { vertical: "top", horizontal: "left", wrapText: true };

      currentRow++;

      // Apply borders
      const borderStyle = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };

      for (let r = 5; r < currentRow; r++) {
        const rowObj = worksheet.getRow(r);
        for (let c = 1; c <= 14; c++) {
          rowObj.getCell(c).border = borderStyle;
        }
      }

      // Write buffer and save
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `CONCOR_Forwarding_Note_${jobNo}.xlsx`);
    } catch (error) {
      console.error("Error generating CONCOR Excel:", error);
      alert("Failed to generate CONCOR Excel file.");
    }
  };

  const handleEdit = () => {
    setChoiceOpen(false);
    setEditorOpen(true);
  };

  const saveEditedPdf = async (editedHtmlContent) => {
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
    const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
    const leftMargin = 5;
    const rightMargin = 5;
    const contentWidth = pageWidth - leftMargin - rightMargin; // 287mm

    await doc.html(editedHtmlContent, {
      callback: function (doc) {
        window.open(doc.output("bloburl"), "_blank");
      },
      x: leftMargin,
      y: 5,
      width: contentWidth,
      windowWidth: 1150,
      autoPaging: "slice",
    });
  };

  return (
    <>
      {children ? (
        React.cloneElement(children, {
          onClick: (e) => {
            e.stopPropagation();
            if (children.props.onClick) children.props.onClick(e);
            handleAction(e);
          }
        })
      ) : (
        <MenuItem onClick={handleAction}>Concor Forwarding Note (PDF)</MenuItem>
      )}

      <Dialog 
        open={choiceOpen} 
        onClose={() => setChoiceOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          style: { overflow: 'visible', borderRadius: '12px' }
        }}
      >
        <DialogTitle sx={{ 
          m: 0, 
          p: 3, 
          pb: 2,
          fontWeight: 'bold',
          fontSize: '18px',
          color: '#1e293b',
          borderBottom: '1px solid #f1f5f9'
        }}>
          Document Actions
        </DialogTitle>
        <DialogContent sx={{ p: 3, overflow: 'visible' }}>
          {/* Club Job Section */}
          <div style={{
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '20px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>🔗</span>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '14px' }}>Club Multiple Jobs?</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Aggregate container details across multiple shipments</div>
                </div>
              </div>
              <Switch
                checked={isClubJob}
                onChange={e => setIsClubJob(e.target.checked)}
                color="primary"
                id={`club-job-checkbox-${jobNo}`}
              />
            </div>

            {isClubJob && (
              <div className="ep-search-container" style={{ position: 'relative', width: '100%', marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <span style={{ display: 'block', fontSize: '12px', color: '#1e293b', fontWeight: 'bold', marginBottom: '8px' }}>
                  SELECT CLUBBED JOBS
                </span>
                <div style={{ display: 'flex', width: '100%', gap: '6px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    placeholder="Search and add job numbers (e.g. EXP/...)"
                    value={jobSearch}
                    onChange={e => setJobSearch(e.target.value)}
                    onFocus={() => setShowJobDropdown(true)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowJobDropdown(!showJobDropdown)}
                    style={{
                      padding: '10px 14px',
                      background: '#f1f5f9',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#475569'
                    }}
                  >
                    🔍
                  </button>
                </div>

                {showJobDropdown && (
                  <ul style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '100%',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    zIndex: 9999,
                    background: 'white',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '8px',
                    listStyle: 'none',
                    padding: '6px 0',
                    margin: '4px 0 0 0',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)'
                  }}>
                    {jobOptions
                      .filter(jNo => jNo !== jobNo && !clubbedJobs.includes(jNo))
                      .map((jNo, idx) => (
                        <li
                          key={idx}
                          onClick={() => {
                            if (!clubbedJobs.includes(jNo)) {
                              setClubbedJobs(prev => [...prev, jNo]);
                            }
                            setJobSearch('');
                            setShowJobDropdown(false);
                          }}
                          style={{
                            padding: '8px 16px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: '#334155',
                            transition: 'background 0.2s',
                            fontWeight: '500'
                          }}
                          onMouseEnter={e => e.target.style.background = '#f1f5f9'}
                          onMouseLeave={e => e.target.style.background = 'white'}
                        >
                          {jNo}
                        </li>
                      ))}
                    {jobOptions.filter(jNo => jNo !== jobNo && !clubbedJobs.includes(jNo)).length === 0 && (
                      <li style={{ padding: '8px 16px', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>
                        No other jobs found
                      </li>
                    )}
                  </ul>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                  {clubbedJobs.map((jNo, idx) => (
                    <Chip
                      key={idx}
                      label={jNo}
                      size="small"
                      onDelete={() => {
                        setClubbedJobs(prev => prev.filter(j => j !== jNo));
                      }}
                      sx={{ backgroundColor: '#e2f0fd', color: '#1d4ed8', fontWeight: 'bold' }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Cards Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Edit Card */}
            <div 
              onClick={handleEdit}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                borderRadius: '10px',
                border: '1.5px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                background: 'white'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#2563eb';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.08)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ fontSize: '24px', background: '#eff6ff', padding: '10px', borderRadius: '8px', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                📝
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '14px' }}>Edit Inline</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Modify the document content in an interactive editor before saving</div>
              </div>
              <div style={{ fontSize: '16px', color: '#94a3b8' }}>➔</div>
            </div>

            {/* Download PDF Card */}
            <div 
              onClick={downloadDirectly}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                borderRadius: '10px',
                border: '1.5px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                background: 'white'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#059669';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(5, 150, 105, 0.08)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ fontSize: '24px', background: '#ecfdf5', padding: '10px', borderRadius: '8px', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                📄
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '14px' }}>Download PDF</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Generate and download the formatted PDF file directly</div>
              </div>
              <div style={{ fontSize: '16px', color: '#94a3b8' }}>➔</div>
            </div>

            {/* Download Excel Card */}
            <div 
              onClick={handleDownloadExcel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                borderRadius: '10px',
                border: '1.5px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                background: 'white'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#d97706';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(217, 119, 6, 0.08)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ fontSize: '24px', background: '#fffbeb', padding: '10px', borderRadius: '8px', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                📊
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '14px' }}>Download Excel</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Export the consolidated container tables to a spreadsheet</div>
              </div>
              <div style={{ fontSize: '16px', color: '#94a3b8' }}>➔</div>
            </div>
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 1, borderTop: '1px solid #f1f5f9' }}>
          <Button 
            onClick={() => setChoiceOpen(false)} 
            sx={{ 
              color: '#64748b', 
              fontWeight: 'bold', 
              textTransform: 'none',
              padding: '6px 16px',
              borderRadius: '6px',
              '&:hover': { background: '#f1f5f9' }
            }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      <DocumentEditorDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        initialContent={htmlContent}
        title={`Concor Forwarding Note - ${jobNo}`}
        customSave={saveEditedPdf}
      />
    </>
  );
};

export default ConcorForwardingNotePDFGenerator;