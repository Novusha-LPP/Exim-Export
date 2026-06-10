import React, { useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import axios from "axios";
import { MenuItem, Button, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import DocumentEditorDialog from "./DocumentEditorDialog";

// Import the logo properly for Vite
import concorLogo from "../../../../assets/images/concor.png";
import { imageToBase64 } from "../../../../utils/imageUtils";

const ConcorForwardingNotePDFGenerator = ({ jobNo, children }) => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [jobData, setJobData] = useState(null);
  const [isClubJob, setIsClubJob] = useState(false);
  const [clubbedJobsData, setClubbedJobsData] = useState([]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const getAggregatedContainers = (primaryJob, isClubActive, clubbedJobsList) => {
    const allJobsToProcess = [primaryJob];
    if (isClubActive && !primaryJob.is_club_job_parent && Array.isArray(clubbedJobsList)) {
      clubbedJobsList.forEach(j => {
        if (j && j.job_no !== primaryJob.job_no) {
          if (!allJobsToProcess.some(existing => existing.job_no === j.job_no)) {
            allJobsToProcess.push(j);
          }
        }
      });
    }

    let result = [];
    allJobsToProcess.forEach(job => {
      const containers = job.containers?.length > 0 ? job.containers : (job.operations?.[0]?.containerDetails || []);
      containers.forEach(c => {
        result.push({
          ...c,
          jobNo: c._sourceJobNo || job.job_no,
          shippingBillNo: c._sourceSbNo || job.custom_house_details?.shipping_bill_no || job.sb_no || job.shippingBillNo,
          sb_date: c._sourceSbDate || job.custom_house_details?.sb_date || job.sb_date,
          hsn: c.hsn || c._sourceHsnList || job.custom_house_details?.hsn_code,
          pkgsStuffed: c.pkgsStuffed || c.pkgs || 0
        });
      });
    });

    const grouped = {};
    result.forEach(c => {
      const key = (c.containerNo || "").trim().toUpperCase();
      const groupKey = key || `EMPTY_${Math.random()}`;

      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          ...c,
          uniqueDescriptions: [],
          uniqueHsnCodes: [],
          uniqueSBs: [],
          uniqueSealNos: [],
          uniqueShippingLineSealNos: [],
          uniqueLeoDates: [],
          pkgsStuffed: 0,
          grossWeight: 0,
          grWtPlusTrWt: 0,
          invoiceValues: []
        };
      }

      const group = grouped[groupKey];
      group.pkgsStuffed += Number(c.pkgsStuffed) || 0;
      group.grossWeight += Number(c.grossWeight) || 0;
      group.grWtPlusTrWt += Number(c.grWtPlusTrWt) || 0;

      const desc = c._sourceDescription || c.descriptionOfGoods || c.description || primaryJob.descriptionOfGoods || "";
      if (desc && !group.uniqueDescriptions.includes(desc)) {
        group.uniqueDescriptions.push(desc);
      }
      const hsn = c.hsn || c._sourceHsnList || c.hsnList || c.ritc || "";
      if (hsn && !group.uniqueHsnCodes.includes(hsn)) {
        group.uniqueHsnCodes.push(hsn);
      }
      const sbNo = c.shippingBillNo || c.sb_no || "";
      const sbDate = c.sb_date || "";

      group.uniqueSBs.push({
        sbNo,
        sbDate,
        pkgs: Number(c.pkgsStuffed) || 0,
        weight: Number(c.grossWeight) || 0,
        tareWeight: Number(c.tareWeightKgs) || 0,
        ritc: hsn,
        description: desc,
        sealNo: c.sealNo || "",
        shippingLineSealNo: c.shippingLineSealNo || "",
        invoiceValue: Number(c.invoiceValue || c._sourceInvoiceValue) || 0,
        leoDate: c.leoDate || c._sourceLeoDate || ""
      });

      const trimmedSeal = c.sealNo ? String(c.sealNo).trim() : "";
      if (trimmedSeal && !group.uniqueSealNos.includes(trimmedSeal)) {
        group.uniqueSealNos.push(trimmedSeal);
      }
      const trimmedAgentSeal = c.shippingLineSealNo ? String(c.shippingLineSealNo).trim() : "";
      if (trimmedAgentSeal && !group.uniqueShippingLineSealNos.includes(trimmedAgentSeal)) {
        group.uniqueShippingLineSealNos.push(trimmedAgentSeal);
      }
      const leoDate = c.leoDate || c._sourceLeoDate || "";
      if (leoDate && !group.uniqueLeoDates.includes(leoDate)) {
        group.uniqueLeoDates.push(leoDate);
      }
      const invVal = Number(c.invoiceValue || c._sourceInvoiceValue) || 0;
      if (invVal) {
        group.invoiceValues.push(invVal);
      }
    });

    return Object.values(grouped).map(group => {
      return {
        ...group,
        descriptionOfGoods: group.uniqueDescriptions.join(", "),
        description: group.uniqueDescriptions.join(", "),
        hsnList: group.uniqueHsnCodes.join(", "),
        ritc: group.uniqueHsnCodes.join(", "),
        sealNo: group.uniqueSealNos.join(", "),
        shippingLineSealNo: group.uniqueShippingLineSealNos.join(", "),
        leoDate: group.uniqueLeoDates[0] || "",
        invoiceValue: group.invoiceValues.length > 0 ? group.invoiceValues.reduce((a, b) => a + b, 0) : ""
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
      const data = response.data;

      let fetchedClubbedJobsData = [];
      let isClubActive = false;

      if (data.parent_club_job) {
        try {
          const parentRes = await axios.get(`${import.meta.env.VITE_API_STRING}/get-export-job/${encodeURIComponent(data.parent_club_job)}`);
          if (parentRes.data) {
            Object.assign(data, parentRes.data);
            isClubActive = true;
          }
        } catch (e) { console.warn(e); }
      } else if (data.is_club_job_parent && Array.isArray(data.clubbed_jobs) && data.clubbed_jobs.length > 0) {
        isClubActive = true;
      }

      setIsClubJob(isClubActive);
      setClubbedJobsData(fetchedClubbedJobsData);
      setJobData(data);

      // Pre-load logo as base64
      let logoBase64 = concorLogo;
      try {
        logoBase64 = await imageToBase64(concorLogo);
      } catch (err) {
        console.warn("Failed to convert concorLogo to base64", err);
      }

      // Generate HTML for the editor
      const template = generateHTML(data, logoBase64, isClubActive, fetchedClubbedJobsData);
      setHtmlContent(template);
      setChoiceOpen(true);
    } catch (err) {
      console.error("Error fetching data:", err);
      alert("Error fetching job data");
    }
  };

  const generateHTML = (exportJob, logoSrc = concorLogo, isClubActive, clubbedJobsList) => {
    const aggregatedContainers = getAggregatedContainers(exportJob, isClubActive, clubbedJobsList);
    const invoice = exportJob.invoices?.[0] || {};
    const product = invoice.products?.[0] || {};

    const totalPackages = aggregatedContainers.reduce((sum, cnt) => sum + (Number(cnt.pkgsStuffed) || 0), 0);
    const totalCargoWeight = aggregatedContainers.reduce((sum, cnt) => sum + parseFloat(cnt.grossWeight || 0) / 1000, 0);

    let sbNoText = exportJob.sb_no || "";
    let sbDateText = formatDate(exportJob.sb_date);

    if (isClubActive && exportJob.containers?.length > 0) {
      const allSBs = [];
      const seenSBs = new Set();
      exportJob.containers.forEach(c => {
        const sbNo = c._sourceSbNo || c.shippingBillNo || exportJob.sb_no;
        const sbDate = c._sourceSbDate || c.sb_date || exportJob.sb_date;
        if (sbNo) {
          const key = `${sbNo}-${sbDate}`;
          if (!seenSBs.has(key)) {
            seenSBs.add(key);
            allSBs.push({ sbNo, sbDate });
          }
        }
      });
      if (allSBs.length > 0) {
        sbNoText = allSBs.map(sb => sb.sbNo).join(", ");
        sbDateText = allSBs.map(sb => formatDate(sb.sbDate)).join(", ");
      }
    }

    let containerRows = "";
    aggregatedContainers.forEach((cnt, i) => {
      const sizeMatch = (cnt.type || "").match(/^(\d+)/);
      const size = sizeMatch ? sizeMatch[1] : "";

      const uniqueSBsList = [];
      const seenSBs = new Set();
      if (cnt.uniqueSBs) {
        cnt.uniqueSBs.forEach((sb, idx) => {
          const key = sb.sbNo ? `${sb.sbNo}-${sb.sbDate}` : `__empty_${idx}`;
          if (!seenSBs.has(key)) {
            seenSBs.add(key);
            uniqueSBsList.push(sb);
          }
        });
      }

      const pkgsDisplay = uniqueSBsList.length > 0
        ? uniqueSBsList.map(sb => `<div>${sb.pkgs || ""}</div>`).join("")
        : (cnt.pkgsStuffed ? `<div>${cnt.pkgsStuffed}</div>` : "");

      const descDisplay = cnt.uniqueDescriptions && cnt.uniqueDescriptions.length > 0
        ? cnt.uniqueDescriptions.map(d => `<div>${d}</div>`).join("")
        : (product.description || "");

      const hsnDisplay = cnt.uniqueHsnCodes && cnt.uniqueHsnCodes.length > 0
        ? cnt.uniqueHsnCodes.join(", ")
        : (product.ritc || "");

      const weightDisplay = uniqueSBsList.length > 0
        ? uniqueSBsList.map(sb => `<div>${(parseFloat(sb.weight || 0) / 1000).toFixed(1)}</div>`).join("")
        : (parseFloat(cnt.grossWeight || 0) / 1000).toFixed(1);

      const vgmDisplay = uniqueSBsList.length > 0
        ? uniqueSBsList.map(sb => `<div>${sb.tareWeight ? ((parseFloat(sb.weight || 0) + parseFloat(sb.tareWeight || 0)) / 1000).toFixed(1) : ""}</div>`).join("")
        : (cnt.grWtPlusTrWt ? (parseFloat(cnt.grWtPlusTrWt) / 1000).toFixed(1) : "");

      const invoiceValueDisplay = uniqueSBsList.length > 0
        ? uniqueSBsList.map(sb => `<div>${sb.invoiceValue || ""}</div>`).join("")
        : (invoice.invoiceValue || "");

      const leoDateDisplay = uniqueSBsList.length > 0
        ? uniqueSBsList.map(sb => `<div>${formatDate(sb.leoDate)}</div>`).join("")
        : formatDate(exportJob.operations?.[0]?.statusDetails?.[0]?.leoDate);

      const uniqueSeals = cnt.uniqueSBs ? [...new Set(cnt.uniqueSBs.map(sb => sb.sealNo ? String(sb.sealNo).trim() : '').filter(Boolean))] : [];
      const sealDisplay = uniqueSeals.length > 0
        ? uniqueSeals.map(s => `<div>${s}</div>`).join("")
        : (cnt.sealNo || "");

      containerRows += `
        <tr>
          <td style="text-align: center; vertical-align: middle; border: 1px solid black; padding: 1px 2px 3px 2px; font-size: 10px;">${i + 1}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${cnt.containerNo || ""}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${cnt.sealType || "RFID"}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${size}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${cnt.tareWeightKgs || ""}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${pkgsDisplay}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; vertical-align: middle; font-size: 10px;">${descDisplay}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${hsnDisplay}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${weightDisplay}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${vgmDisplay}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">NO</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${invoiceValueDisplay}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${leoDateDisplay}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${sealDisplay}</td>
        </tr>
      `;
    });

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
                <span style="display: inline-block; width: 45%; text-align: right; padding-right: 20px; margin-bottom: 10px;">JOB  ${exportJob.job_no || ""}</span>
                <span style="display: inline-block; width: 45%; text-align: left; padding-left: 20px; margin-bottom: 10px;">INV  ${invoice.invoiceNumber || ""}</span>
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
            <td colspan="3" style="border: 1px solid black; vertical-align: middle; padding: 1px 5px 4px 5px; font-weight: bold; font-size: 13px;">
              CHA NAME &amp; CODE:  SURAJ FORWARDERS AND SHIPPING AGENCIES
            </td>
          </tr>
          <tr>
             <td colspan="3" style="border: 1px solid black; font-size: 9px; vertical-align: middle; padding: 0px 5px 2px 5px;">
              TRANSPORTED BY: SELF TPT | CONCOR
             </td>
          </tr>
          <tr>
             <td colspan="3" style="border: 1px solid black; font-size: 8px; vertical-align: middle; padding: 0px 5px 2px 5px;">
              <i>In case of CONCOR service, Kindly provide</i>
             </td>
          </tr>
          <tr>
             <td colspan="3" style="border: 1px solid black; font-size: 9px; vertical-align: middle; padding: 0px 5px 2px 5px;">
              PICK UP POINT/KM: ${exportJob.factory_address || ""}
             </td>
          </tr>
          <tr>
             <td colspan="3" style="border: 1px solid black; font-size: 9px; vertical-align: middle; padding: 0px 5px 2px 5px;">
              DELIVER POINT/KM:
             </td>
          </tr>
          <tr>
            <td colspan="3" style="border: 1px solid black; vertical-align: middle; padding: 2px 5px 5px 5px; font-weight: bold; font-size: 14px;">
              SHIPPING BILL NO. ${sbNoText} DATE ${sbDateText}
            </td>
          </tr>
          <tr>
            <td colspan="2" style="border: 1px solid black; font-size: 10px; vertical-align: middle; padding: 1px 5px 4px 5px;">
              STUFFING TYPE: ${exportJob.goods_stuffed_at === "Factory" ? "FCL" : "ICD"}
            </td>
            <td style="border: 1px solid black; font-size: 10px; vertical-align: middle; padding: 1px 5px 4px 5px;">
              GST IN INVOICE NAME: ${exportJob.exporter || ""}
            </td>
          </tr>
           <tr>
            <td colspan="3" style="border: 1px solid black; font-size: 9px; vertical-align: middle; padding: 1px 5px 4px 5px;">
              PAYMENT MODE (PDA) &amp; NO.: SURAJ FORWARDERS PVT. LTD.
            </td>
          </tr>
          <tr>
            <td colspan="3" style="border: 1px solid black; vertical-align: middle; padding: 2px 5px 5px 5px; font-weight: bold; font-size: 14px;">
              EXPORTER NAME : ${exportJob.exporter || ""}
            </td>
          </tr>
          <tr>
            <td colspan="3" style="border: 1px solid black; vertical-align: middle; padding: 1px 5px 4px 5px; font-size: 12px;">
              NAME IN INVOICE GSTIN NO : ${exportJob.gstin || ""}
            </td>
          </tr>
        </table>

        <table style="width: 100%; border: 1px solid black; border-collapse: collapse; font-size: 10px; table-layout: fixed; margin-top: -1px;">
          <thead style="background: white;">
            <tr>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 3%; vertical-align: middle; text-align: center; font-size: 10px;">Sr.<br/>No.</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 8.5%; vertical-align: middle; text-align: center; font-size: 10px;">CONTAINER NO.</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 4%; vertical-align: middle; text-align: center; font-size: 10px;">TYPE</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 4%; vertical-align: middle; text-align: center; font-size: 10px;">SIZE</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 6%; vertical-align: middle; text-align: center; font-size: 10px;">TARE WT.</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 6%; vertical-align: middle; text-align: center; font-size: 10px;">NO. OF<br/>PACKAGE<br/>S</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 18%; vertical-align: middle; text-align: left; font-size: 10px;">COMMODITY NAME</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 7%; vertical-align: middle; text-align: center; font-size: 9px;">COMMODIT<br/>Y<br/>HSN CODE</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 6%; vertical-align: middle; text-align: center; font-size: 10px;">CARGO WT<br/>(In MTS)</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 6%; vertical-align: middle; text-align: center; font-size: 10px;">VGM</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 7%; vertical-align: middle; text-align: center; font-size: 10px;">HAZARDOUS</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 8%; vertical-align: middle; text-align: center; font-size: 10px;">VALUE/FOB</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 7%; vertical-align: middle; text-align: center; font-size: 10px;">LEO DT</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 9%; vertical-align: middle; text-align: center; font-size: 10px;">SEAL NO.</th>
            </tr>
          </thead>
          <tbody>
            ${containerRows}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold;">
              <td colspan="5" style="border: 1px solid black; text-align: right; vertical-align: middle; padding: 1px 4px 4px 4px; font-size: 10px;">Total:</td>
              <td style="border: 1px solid black; text-align: center; vertical-align: middle; padding: 1px 2px 4px 2px; font-size: 10px;">${totalPackages}</td>
              <td colspan="2" style="border: 1px solid black; padding: 1px 2px 4px 2px;"></td>
              <td style="border: 1px solid black; text-align: center; vertical-align: middle; padding: 1px 2px 4px 2px; font-size: 10px;">${totalCargoWeight.toFixed(1)}</td>
              <td colspan="5" style="border: 1px solid black; padding: 1px 2px 4px 2px;"></td>
            </tr>
          </tfoot>
        </table>


        <div style="margin-top: 4px; font-size: 9px; line-height: 1.4;">
          <div>(Accepted on said to contain Basis)</div>
          <div>1. I declare that each consignment is of value Rs._________________ and engage**/do not engage** to pay percentage charge on excess value for the increased risk as required by CONCOR...</div>
          <div>&nbsp;&nbsp;&nbsp;Alternative CONCOR risk and Owner's risk being available, I elect to pay ________________ rates.</div>
          <div>2. Please declare whether above container/contains high value cargo YES/NO</div>
          <div>3. I do hereby certify that I have satisfied myself that the description, marks &amp; weights or quantity of goods consigned by me have been correctly entered in the Forwarding Note...</div>
          
          <div style="margin-top: 4px;">Tick the appropriate option shown above.</div>
          
          <div style="float: right; text-align: right; width: 240px; font-size: 10px;">
            <b>Signature &amp; Seal of the Customer</b><br/>
            DATE: ${formatDate(new Date())}
          </div>
          <div style="clear: both;"></div>
        </div>

        <div style="margin-top: 10px; text-align: center; font-size: 13px; font-weight: bold;">TERMS AND CONDITIONS</div>
        <div style="font-size: 9px; margin-top: 4px; line-height: 1.3;">
          <div>1. Unless the consignor declares in clause(1) overleaf the value of any consignment &amp; pays percentage charge on excess value as required by CONCOR, the maximum limit of liability shall not exceed Rs. 50 per kg.</div>
          <div>2. When alternative 'CONCOR Risk' and 'Owner Risk' rates are quoted, the latter will apply unless sender elects 'CONCOR Risk'.</div>
          <div>3. I accept responsibility for any consequences to the property of CONCOR or others caused by this consignment Note - Attention is invited to terms for dangerous goods in I.R.C.A Red Tariff and IMDG.</div>
        </div>
        
        <div style="margin-top: 8px; border: 1px solid black; padding: 5px 8px; font-size: 10px; font-weight: bold; min-height: 25px;">
          Additional declarations for Dangerous Goods (I.R.C.A / IMDG)
        </div>
        
        <div style="margin-top: -1px; border: 1px solid black; padding: 5px 8px; font-size: 11px; font-weight: bold; min-height: 35px;">
          FOR OFFICE USE
        </div>
      </div>
    `;
  };

  const downloadDirectly = async () => {
    setChoiceOpen(false);
    const exportJob = jobData;
    if (!exportJob) return;

    try {
      const operations = exportJob.operations?.[0] || {};
      const invoice = exportJob.invoices?.[0] || {};
      const product = invoice.products?.[0] || {};
      const statusDetails = operations.statusDetails?.[0] || {};

      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });

      const pageWidth = doc.internal.pageSize.getWidth();
      const leftMargin = 5;
      const rightMargin = 5;
      const topMargin = 5;
      const contentWidth = pageWidth - leftMargin - rightMargin;

      const aggregatedContainers = getAggregatedContainers(exportJob, isClubJob, clubbedJobsData);
      const containerCount = aggregatedContainers.length;
      const isCompact = containerCount > 6;
      const headerScale = isCompact ? 1.1 : 1.25;
      const rowScale = isCompact ? 1.05 : 1.2;

      let yPos = topMargin;

      const drawContentBox = (startY, columns, minHeight) => {
        let maxLines = 1;
        const processedCols = columns.map((col) => {
          const fontSize = col.fontSize || 8 * rowScale;
          doc.setFontSize(fontSize);
          doc.setFont(col.font || "helvetica", col.style || "normal");
          const padding = 1.0;
          const availableWidth = col.width - padding * 2;
          const text = String(col.text || "");
          const textLines = doc.splitTextToSize(text, availableWidth);
          if (textLines.length > maxLines) maxLines = textLines.length;
          return { ...col, textLines, fontSize };
        });

        const refFontSize = processedCols[0]?.fontSize || 8 * rowScale;
        const lineHeightMm = refFontSize * 0.3527 * 1.1;
        const dynamicHeight = Math.max(minHeight, maxLines * lineHeightMm + 1.0);

        let currentX = leftMargin;
        processedCols.forEach((col) => {
          doc.rect(currentX, startY, col.width, dynamicHeight);
          doc.setFontSize(col.fontSize);
          doc.setFont(col.font || "helvetica", col.style || "normal");
          const textX = col.align === "center" ? currentX + col.width / 2 : currentX + 2;
          const colLineHeight = col.fontSize * 0.3527 * 1.1;
          const textBlockHeight = col.textLines.length * colLineHeight;
          const textY = startY + (dynamicHeight - textBlockHeight) / 2;
          doc.text(col.textLines, textX, textY, { align: col.align || "left", baseline: "top" });
          currentX += col.width;
        });
        return dynamicHeight;
      };

      const headerHeight = 12 * headerScale;
      const logoSize = 10 * headerScale;

      try {
        const logoBase64 = await imageToBase64(concorLogo);
        doc.addImage(logoBase64, "PNG", leftMargin + 1, yPos + 0.5, logoSize, logoSize);
        doc.addImage(logoBase64, "PNG", pageWidth - rightMargin - logoSize - 1, yPos + 1, logoSize, logoSize);
      } catch (err) {
        console.warn("Failed to pre-load logo for addImage, trying direct URL", err);
        try {
          doc.addImage(concorLogo, "PNG", leftMargin + 1, yPos + 0.5, logoSize, logoSize);
          doc.addImage(concorLogo, "PNG", pageWidth - rightMargin - logoSize - 1, yPos + 1, logoSize, logoSize);
        } catch (innerErr) {
          console.error("Critical logo loading failure", innerErr);
        }
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11 * headerScale);
      doc.text("CONTAINER CORPORATION OF INDIA LIMITED (CONCOR)", pageWidth / 2, yPos + 4, { align: "center" });
      doc.setFontSize(5 * headerScale);
      doc.text("FORWARDING NOTE FOR GENERAL AND DANGEROUS MERCHANDISE", pageWidth / 2, yPos + 7, { align: "center" });
      doc.setFontSize(4 * headerScale);
      doc.text("(FOR CONCOR USE ONLY)", pageWidth / 2, yPos + 10, { align: "center" });

      yPos += headerHeight;
      doc.setFontSize(9 * headerScale);
      doc.text(`JOB  ${exportJob.job_no || ""}`, pageWidth / 2 - 40, yPos);
      doc.text(`INV  ${invoice.invoiceNumber || ""}`, pageWidth / 2 + 20, yPos);

      yPos += 3 * headerScale;
      let boxY = yPos;
      const rowH = 4.5 * rowScale;
      const smallRowH = 2.5 * rowScale;
      doc.setLineWidth(0.2);

      doc.rect(leftMargin, boxY, 30, rowH);
      doc.rect(leftMargin + 30, boxY, 30, rowH);
      doc.rect(leftMargin + 60, boxY, contentWidth - 60, rowH);
      doc.setFontSize(6 * rowScale);
      doc.text("SEGMENT", leftMargin + 15, boxY + rowH * 0.7, { align: "center" });
      doc.text("EXIM", leftMargin + 45, boxY + rowH * 0.7, { align: "center" });
      doc.setFontSize(7 * rowScale);
      doc.text("MODE (TICK ONE):    BY    RAIL /ROAD", leftMargin + 65, boxY + rowH * 0.7);

      boxY += rowH;
      const fromWidth = contentWidth * 0.35;
      const toWidth = contentWidth * 0.65;
      doc.rect(leftMargin, boxY, fromWidth, rowH);
      doc.rect(leftMargin + fromWidth, boxY, toWidth, rowH);
      doc.text("FROM", leftMargin + fromWidth / 2, boxY + rowH * 0.7, { align: "center" });
      doc.text("TO", leftMargin + fromWidth + toWidth / 2, boxY + rowH * 0.7, { align: "center" });

      boxY += rowH;
      const col1 = fromWidth / 2, col2 = fromWidth / 2, col3 = toWidth * 0.35, col4 = toWidth * 0.35, col5 = toWidth * 0.3;
      doc.rect(leftMargin, boxY, col1, rowH);
      doc.rect(leftMargin + col1, boxY, col2, rowH);
      doc.rect(leftMargin + fromWidth, boxY, col3, rowH);
      doc.rect(leftMargin + fromWidth + col3, boxY, col4, rowH);
      doc.rect(leftMargin + fromWidth + col3 + col4, boxY, col5, rowH);
      doc.setFontSize(5.5 * rowScale);
      doc.text("TERMINAL", leftMargin + col1 / 2, boxY + rowH * 0.7, { align: "center" });
      doc.text("GATEWAY PORT", leftMargin + col1 + col2 / 2, boxY + rowH * 0.7, { align: "center" });
      doc.text("SHIPPING LINE", leftMargin + fromWidth + col3 / 2, boxY + rowH * 0.7, { align: "center" });
      doc.text("PORT OF DISCHARGE", leftMargin + fromWidth + col3 + col4 / 2, boxY + rowH * 0.7, { align: "center" });
      doc.text("COUNTRY", leftMargin + fromWidth + col3 + col4 + col5 / 2, boxY + rowH * 0.7, { align: "center" });

      boxY += rowH;
      const valuesHeight = drawContentBox(boxY, [
        { width: col1, text: exportJob.branchCode || "KHDB", align: "center", style: "bold" },
        { width: col2, text: exportJob.gateway_port || exportJob.port_of_loading || "", align: "center", style: "bold" },
        { width: col3, text: exportJob.shipping_line_airline || "", align: "center", style: "bold" },
        { width: col4, text: exportJob.port_of_discharge || "", align: "center", style: "bold" },
        { width: col5, text: exportJob.discharge_country || "", align: "center", style: "bold" },
      ], rowH);
      boxY += valuesHeight;

      doc.rect(leftMargin, boxY, contentWidth, rowH);
      doc.setFontSize(6 * rowScale);
      doc.text("CUSTOMER TYPE: (TICK ONE) EXPORTER | IMPORTER | ASSOCIATE PARTNER | CORPORATE CUSTOMER", leftMargin + 3, boxY + rowH * 0.7);
      boxY += rowH;

      doc.rect(leftMargin, boxY, contentWidth, rowH + 1);
      doc.setFontSize(9 * rowScale);
      doc.text("CHA NAME & CODE:  SURAJ FORWARDERS AND SHIPPING AGENCIES", leftMargin + 3, boxY + (rowH + 1) * 0.7);
      boxY += rowH + 1;

      doc.rect(leftMargin, boxY, contentWidth, smallRowH);
      doc.setFontSize(5.5 * rowScale);
      doc.text("TRANSPORTED BY: SELF TPT | CONCOR", leftMargin + 3, boxY + smallRowH * 0.75);
      boxY += smallRowH;

      doc.rect(leftMargin, boxY, contentWidth, smallRowH);
      doc.setFontSize(5 * rowScale);
      doc.text("In case of CONCOR service, Kindly provide", leftMargin + 3, boxY + smallRowH * 0.75);
      boxY += smallRowH;

      boxY += drawContentBox(boxY, [{ width: contentWidth, text: `PICK UP POINT/KM:    ${exportJob.factory_address || ""}`, fontSize: 6 * rowScale }], smallRowH);
      doc.rect(leftMargin, boxY, contentWidth, smallRowH);
      doc.text("DELIVER POINT/KM:", leftMargin + 3, boxY + smallRowH * 0.75);
      boxY += smallRowH;

      let sbNoText = exportJob.sb_no || "";
      let sbDateText = formatDate(exportJob.sb_date);
      if (isClubJob && exportJob.containers?.length > 0) {
        const allSBs = [];
        const seenSBs = new Set();
        exportJob.containers.forEach(c => {
          const sbNo = c._sourceSbNo || c.shippingBillNo || exportJob.sb_no;
          const sbDate = c._sourceSbDate || c.sb_date || exportJob.sb_date;
          if (sbNo) {
            const key = `${sbNo}-${sbDate}`;
            if (!seenSBs.has(key)) {
              seenSBs.add(key);
              allSBs.push({ sbNo, sbDate });
            }
          }
        });
        if (allSBs.length > 0) {
          sbNoText = allSBs.map(sb => sb.sbNo).join(", ");
          sbDateText = allSBs.map(sb => formatDate(sb.sbDate)).join(", ");
        }
      }

      boxY += drawContentBox(boxY, [{ width: contentWidth, text: `SHIPPING BILL NO. ${sbNoText} DATE ${sbDateText}`, fontSize: 10 * rowScale, style: "bold" }], rowH + 1);
      boxY += drawContentBox(boxY, [
        { width: contentWidth / 2, text: `STUFFING TYPE: ${exportJob.goods_stuffed_at === "Factory" ? "FCL" : "ICD"}`, fontSize: 6 * rowScale },
        { width: contentWidth / 2, text: `GST IN INVOICE NAME: ${exportJob.exporter || ""}`, fontSize: 6 * rowScale },
      ], rowH);

      doc.rect(leftMargin, boxY, contentWidth, rowH);
      doc.text("PAYMENT MODE (PDA) & NO.: SURAJ FORWARDERS PVT. LTD.", leftMargin + 3, boxY + rowH * 0.7);
      boxY += rowH;

      boxY += drawContentBox(boxY, [{ width: contentWidth, text: `EXPORTER NAME : ${exportJob.exporter || ""}`, fontSize: 10 * rowScale, style: "bold" }], rowH + 1);
      boxY += drawContentBox(boxY, [{ width: contentWidth, text: `NAME IN INVOICE GSTIN NO : ${exportJob.gstin || ""}`, fontSize: 8 * rowScale }], rowH);
      boxY += 2;

      const tableHeaders = ["Sr.\nNo.", "CONTAINER NO.", "TYPE", "SIZE", "TARE WT.", "NO. OF\nPACKAGES", "COMMODITY NAME", "COMMODITY\nHSN CODE", "CARGO WT\n(In MTS)", "VGM", "HAZARDOUS", "VALUE/FOB", "LEO DT", "SEAL NO."];

      const tableBody = aggregatedContainers.map((cnt, i) => {
        const uniqueSBsList = [];
        const seenSBs = new Set();
        if (cnt.uniqueSBs) {
          cnt.uniqueSBs.forEach((sb, idx) => {
            const key = sb.sbNo ? `${sb.sbNo}-${sb.sbDate}` : `__empty_${idx}`;
            if (!seenSBs.has(key)) {
              seenSBs.add(key);
              uniqueSBsList.push(sb);
            }
          });
        }

        const pkgsText = uniqueSBsList.length > 0
          ? uniqueSBsList.map(sb => sb.pkgs || "").join("\n")
          : (cnt.pkgsStuffed || "");

        const descText = cnt.uniqueDescriptions && cnt.uniqueDescriptions.length > 0
          ? cnt.uniqueDescriptions.join("\n")
          : (product.description || "");

        const hsnText = cnt.uniqueHsnCodes && cnt.uniqueHsnCodes.length > 0
          ? cnt.uniqueHsnCodes.join(", ")
          : (product.ritc || "");

        const weightText = uniqueSBsList.length > 0
          ? uniqueSBsList.map(sb => (parseFloat(sb.weight || 0) / 1000).toFixed(1)).join("\n")
          : (parseFloat(cnt.grossWeight || 0) / 1000).toFixed(1);

        const vgmText = uniqueSBsList.length > 0
          ? uniqueSBsList.map(sb => sb.tareWeight ? ((parseFloat(sb.weight || 0) + parseFloat(sb.tareWeight || 0)) / 1000).toFixed(1) : "").join("\n")
          : (cnt.grWtPlusTrWt ? (parseFloat(cnt.grWtPlusTrWt) / 1000).toFixed(1) : "");

        const invoiceValueText = uniqueSBsList.length > 0
          ? uniqueSBsList.map(sb => sb.invoiceValue || "").join("\n")
          : (invoice.invoiceValue || "");

        const leoDateText = uniqueSBsList.length > 0
          ? uniqueSBsList.map(sb => formatDate(sb.leoDate)).join("\n")
          : formatDate(statusDetails.leoDate);

        const uniqueSeals = cnt.uniqueSBs ? [...new Set(cnt.uniqueSBs.map(sb => sb.sealNo ? String(sb.sealNo).trim() : '').filter(Boolean))] : [];
        const sealText = uniqueSeals.length > 0
          ? uniqueSeals.join("\n")
          : (cnt.sealNo || "");

        return [
          i + 1,
          cnt.containerNo || "",
          cnt.sealType || "RFID",
          (cnt.type || "").match(/^(\d+)/)?.[1] || "",
          cnt.tareWeightKgs || "",
          pkgsText,
          descText,
          hsnText,
          weightText,
          vgmText,
          "NO",
          invoiceValueText,
          leoDateText,
          sealText
        ];
      });

      const totalPackages = aggregatedContainers.reduce((sum, cnt) => sum + (Number(cnt.pkgsStuffed) || 0), 0);
      const totalCargoWeight = aggregatedContainers.reduce((sum, cnt) => sum + parseFloat(cnt.grossWeight || 0) / 1000, 0);

      tableBody.push([
        { content: "Total:", colSpan: 5, styles: { halign: "right", fontStyle: "bold" } },
        { content: String(totalPackages || ""), styles: { fontStyle: "bold" } },
        "",
        "",
        { content: totalCargoWeight.toFixed(1), styles: { fontStyle: "bold" } },
        "", "", "", "", ""
      ]);

      const totalWidth = contentWidth;
      const colWidths = {
        0: { cellWidth: totalWidth * 0.03 },
        1: { cellWidth: totalWidth * 0.09 },
        2: { cellWidth: totalWidth * 0.04 },
        3: { cellWidth: totalWidth * 0.04 },
        4: { cellWidth: totalWidth * 0.06 },
        5: { cellWidth: totalWidth * 0.05 },
        6: { cellWidth: totalWidth * 0.20 },
        7: { cellWidth: totalWidth * 0.06 },
        8: { cellWidth: totalWidth * 0.06 },
        9: { cellWidth: totalWidth * 0.06 },
        10: { cellWidth: totalWidth * 0.07 },
        11: { cellWidth: totalWidth * 0.08 },
        12: { cellWidth: totalWidth * 0.07 },
        13: { cellWidth: totalWidth * 0.09 },
      };

      doc.autoTable({
        startY: boxY, head: [tableHeaders], body: tableBody, theme: "grid",
        styles: { fontSize: (isCompact ? 7.5 : 8.5), cellPadding: (isCompact ? 0.5 : 0.7), lineColor: [0, 0, 0], lineWidth: 0.1, halign: "center", font: "helvetica" },
        headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: "bold" },
        margin: { left: leftMargin, right: rightMargin }, tableWidth: contentWidth,
        columnStyles: colWidths
      });

      yPos = doc.lastAutoTable.finalY + 3;
      doc.setFontSize(7); doc.setFont("helvetica", "normal");
      doc.text("(Accepted on said to contain Basis)", leftMargin, yPos);
      yPos += 3;
      const declarations = [
        "1. I declare that each consignment is of value Rs._________________ and engage**/do not engage** to pay percentage charge on excess value for the increased risk as required by CONCOR...",
        "   Alternative CONCOR risk and Owner's risk being available, I elect to pay ________________ rates.",
        "2. Please declare whether above container/contains high value cargo YES/NO",
        "3. I do hereby certify that I have satisfied myself that the description,marks & weights or quantity of goods consigned by me have been correctly entered in the Forwarding Note..."
      ];
      declarations.forEach(line => { doc.text(line, leftMargin, yPos); yPos += 3.5; });
      yPos += 2; doc.text("Tick the appropriate option shown above.", leftMargin, yPos);
      doc.setFont("helvetica", "bold");
      doc.text("Signature & Seal of the Customer", pageWidth - rightMargin - 65, yPos);
      doc.text(`DATE: ${formatDate(new Date())}`, pageWidth - rightMargin - 65, yPos + 5);

      yPos += 12;
      doc.setFontSize(10); doc.setFont("helvetica", "bold");
      doc.text("TERMS AND CONDITIONS", pageWidth / 2, yPos, { align: "center" });
      yPos += 5; doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      const terms = [
        "1. Unless the consignor declares in clause(1) overleaf the value of any consignment & pays percentage charge on excess value as required by CONCOR, the maximum limit of liability shall not exceed Rs. 50 per kg.",
        "2. When alternative 'CONCOR Risk' and 'Owner Risk' rates are quoted, the latter will apply unless sender elects 'CONCOR Risk'.",
        "3. I accept responsibility for any consequences to the property of CONCOR or others caused by this consignment Note - Attention is invited to terms for dangerous goods in I.R.C.A Red Tariff and IMDG."
      ];
      terms.forEach(line => { doc.text(line, leftMargin, yPos); yPos += 3; });
      yPos += 2; doc.rect(leftMargin, yPos, contentWidth, 10);
      doc.setFont("helvetica", "bold"); doc.text("Additional declarations for Dangerous Goods (I.R.C.A / IMDG)", leftMargin + 3, yPos + 5);
      yPos += 12; doc.rect(leftMargin, yPos, contentWidth, 12);
      doc.setFontSize(9); doc.text("FOR OFFICE USE", leftMargin + 3, yPos + 6);

      window.open(doc.output("bloburl"), "_blank");
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Error: " + err.message);
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

      <Dialog open={choiceOpen} onClose={() => setChoiceOpen(false)}>
        <DialogTitle>Document Action</DialogTitle>
        <DialogContent>
          <div>Do you want to edit the CONCOR document inline or download the precise version directly?</div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChoiceOpen(false)}>Cancel</Button>
          <Button onClick={handleEdit} color="primary" variant="outlined">Edit</Button>
          <Button onClick={downloadDirectly} color="primary" variant="contained">Download Directly</Button>
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