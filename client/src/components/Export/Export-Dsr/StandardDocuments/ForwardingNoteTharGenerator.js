import React, { useState } from "react";
import axios from "axios";
import { MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button, Chip, Switch } from "@mui/material";
import jsPDF from "jspdf";
import DocumentEditorDialog from "./DocumentEditorDialog";
import thatLogo from "../../../../assets/images/that-logo.png";
import { imageToBase64 } from "../../../../utils/imageUtils";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const ForwardingNoteTharGenerator = ({ jobNo, children }) => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [jobData, setJobData] = useState(null);

  const [isClubJob, setIsClubJob] = useState(false);
    const [clubbedJobsData, setClubbedJobsData] = useState([]);
        const [logoSrc, setLogoSrc] = useState(thatLogo);

  const formatDate = (dateString) => {
    if (!dateString) return "";

    // Handle string inputs like "09-03-2026" carefully to avoid MM-DD-YYYY misinterpretation
    if (typeof dateString === "string") {
      const match = dateString.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
      if (match) {
        const day = match[1].padStart(2, "0");
        const month = match[2].padStart(2, "0");
        const year = match[3];
        return `${day}.${month}.${year}`;
      }
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, ".");
  };

  const formatDateForApi = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Convert logo on mount
  React.useEffect(() => {
    const loadLogo = async () => {
      try {
        const base64 = await imageToBase64(thatLogo);
        setLogoSrc(base64);
      } catch (err) {
        console.warn("Failed to convert logo to base64, using original path", err);
      }
    };
    loadLogo();
  }, []);

  
  
  // Regenerate htmlContent when jobData, isClubJob, or clubbedJobsData changes
  React.useEffect(() => {
    if (!jobData) return;
    const template = buildTemplate(jobData, isClubJob, clubbedJobsData, logoSrc);
    setHtmlContent(template);
  }, [jobData, isClubJob, clubbedJobsData, logoSrc]);

  
  const getAggregatedContainers = (primaryJob, isClubActive, clubbedJobsList) => {
    // If this is a club parent, the server already pre-merged all child containers
    // into primaryJob.containers. Don't add children again to avoid double-counting.
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
      
      const desc = c._sourceDescription || c.descriptionOfGoods || c.description || "";
      if (desc && !group.uniqueDescriptions.includes(desc)) {
        group.uniqueDescriptions.push(desc);
      }
      const hsn = c.hsn || c._sourceHsnList || c.hsnList || c.ritc || "";
      if (hsn && !group.uniqueHsnCodes.includes(hsn)) {
        group.uniqueHsnCodes.push(hsn);
      }
      const sbNo = c.shippingBillNo || c.sb_no || "";
      const sbDate = c.sb_date || "";
      
      // Push SB details to array for row-based alignment
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

  const buildTemplate = (primaryData, isClubActive, clubbedJobsList, logo) => {
    const operations = primaryData.operations?.[0] || {};
    const invoice = primaryData.invoices?.[0] || {};
    const statusDetails = operations.statusDetails?.[0] || {};

    const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
    const generatedBy = (user.first_name || user.user_first_name
      ? `${user.first_name || user.user_first_name || ""} ${user.last_name || user.user_last_name || ""}`.trim()
      : user.username || "System User").toUpperCase();

    const vesselName = primaryData.vesselName || primaryData.vessel_name || "";
    const Bookingno = primaryData.Bookingno || primaryData.booking_no || "";
    const agentCha = "SURAJ FORWARDERS & SHIPPING AGENCIES";
    const cutOffDate = formatDate(primaryData.cutOffDate || primaryData.cut_off_date || primaryData.booking_date);
    const dischargeCountry = primaryData.dischargeCountry || primaryData.discharge_country || "";
    const exporterAddress = primaryData.exporterAddress || primaryData.exporter || "";
    const gatewayPort = primaryData.gatewayPort || primaryData.gateway_port || primaryData.port_of_loading || "";
    const shippingBillNo = primaryData.shippingBillNo || primaryData.sb_no || "";
    const portOfDischarge = primaryData.portOfDischarge || primaryData.port_of_discharge || "";
    const stuffingType = primaryData.stuffingType || (primaryData.goods_stuffed_at?.toString().toLowerCase() === "factory" ? "FACTORY" : "ICD (CFS) / FACTORY");
    const shippingLineName = primaryData.shippingLineName || primaryData.shipping_line_airline || "";
    const fobvalue = primaryData.fobvalue || primaryData.invoices?.[0]?.freightInsuranceCharges?.fobValue?.amount || "";

    const aggregatedContainers = getAggregatedContainers(primaryData, isClubActive, clubbedJobsList);
    
    let containersRows = "";
    aggregatedContainers.forEach((c, i) => {
      const uniqueSBsList = [];
      const seenSBs = new Set();
      if (c.uniqueSBs) {
          c.uniqueSBs.forEach((sb, idx) => {
             const key = sb.sbNo ? `${sb.sbNo}-${sb.sbDate}` : `__empty_${idx}`;
             if (!seenSBs.has(key)) {
                 seenSBs.add(key);
                 uniqueSBsList.push(sb);
             }
          });
      }

      const pkgs = Number(c.pkgsStuffed) || 0;
      const weight = Number(c.grossWeight) || 0;

      const descDisplay = c.uniqueDescriptions && c.uniqueDescriptions.length > 0
        ? c.uniqueDescriptions.map(d => `<div style="margin-bottom: 4px;"><b>${d}</b></div>`).join("")
        : `<b>${c.descriptionOfGoods || ""}</b>`;

      const sealDisplay = c.uniqueSealNos && c.uniqueSealNos.length > 0
        ? c.uniqueSealNos.join("<br/>")
        : (c.sealNo || "");

      const agentSealDisplay = c.uniqueShippingLineSealNos && c.uniqueShippingLineSealNos.length > 0
        ? c.uniqueShippingLineSealNos.join("<br/>")
        : (c.shippingLineSealNo || "");

      const pkgsDisplay = c.uniqueSBs && c.uniqueSBs.length > 0
        ? uniqueSBsList.map(sb => `<div>${sb.pkgs || ""}<br/>&nbsp;</div>`).join("<div style='height: 8px;'></div>")
        : (pkgs ? `<div>${pkgs}</div>` : "");

      const weightDisplay = c.uniqueSBs && c.uniqueSBs.length > 0
        ? uniqueSBsList.map(sb => `<div>${sb.weight || ""}<br/>&nbsp;</div>`).join("<div style='height: 8px;'></div>")
        : `<div>${weight}</div>`;

      const uniqueTareWeights = uniqueSBsList.length > 0 ? [...new Set(uniqueSBsList.map(sb => sb.tareWeight).filter(Boolean))] : [];
      const tareWeightDisplay = uniqueTareWeights.length > 0
        ? uniqueTareWeights.map(tw => `<div>${tw}</div>`).join("<div style='height: 8px;'></div>")
        : `<div>${c.tareWeightKgs || ""}</div>`;


      const sbDisplay = uniqueSBsList.length > 0
        ? uniqueSBsList.map(sb => `<div>${sb.sbNo || ""}<br/>dt ${formatDate(sb.sbDate)}</div>`).join("<div style='height: 8px;'></div>")
        : (c.shippingBillNo ? `${c.shippingBillNo}<br/><br/>dt ${formatDate(c.sb_date)}` : "");

      containersRows += `
        <tr style="height: 60px;">
          <td style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: top;">${i + 1}</td>
          <td style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: top;">${c.containerNo || ""}</td>
          <td style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: top;">${c.type?.match(/\d+/)?.[0] || "20"}</td>
          <td style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: top;">${pkgsDisplay}</td>
          <td style="border: 1px solid black; padding: 5px; text-align: left; vertical-align: top; font-size: 10px; font-weight: bold; word-wrap: break-word;">
            <div style="margin-bottom: 5px;">${descDisplay}</div>
            ${c.hsnList ? `<div>HSN: ${c.hsnList}</div>` : ""}
          </td>
          <td style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: top;">${weightDisplay}</td>
          <td style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: top;">${tareWeightDisplay}</td>
          <td style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: top;">${sealDisplay}</td>
          <td style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: top;">${agentSealDisplay}</td>
          <td style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: top;">
            ${sbDisplay}
          </td>
        </tr>
      `;
    });

    const totalPkgs = aggregatedContainers.reduce((sum, c) => {
    if (c.uniqueSBs) {
        const seen = new Set();
        let subTotal = 0;
        c.uniqueSBs.forEach(sb => {
            const key = `${sb.sbNo}-${sb.sbDate}`;
            if (!seen.has(key)) { seen.add(key); subTotal += (Number(sb.pkgs) || 0); }
        });
        return sum + subTotal;
    }
    return sum + (Number(c.pkgsStuffed) || 0);
}, 0);
    const totalGrossWeight = aggregatedContainers.reduce((sum, c) => {
    if (c.uniqueSBs) {
        const seen = new Set();
        let subTotal = 0;
        c.uniqueSBs.forEach(sb => {
            const key = `${sb.sbNo}-${sb.sbDate}`;
            if (!seen.has(key)) { seen.add(key); subTotal += (Number(sb.weight) || 0); }
        });
        return sum + subTotal;
    }
    return sum + (Number(c.grossWeight) || 0);
}, 0);

    if (aggregatedContainers.length > 0) {
      containersRows += `
        <tr style="height: 30px;">
          <td colspan="3" style="border: 1px solid black; padding: 5px; text-align: right; font-size: 10px; font-weight: bold; vertical-align: middle;">Total:</td>
          <td style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: middle;">${totalPkgs || ""}</td>
          <td style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: middle;"></td>
          <td style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: middle;">${totalGrossWeight || ""}</td>
          <td colspan="4" style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: middle;"></td>
        </tr>
      `;
    }

    const headerHeight = 510;
    const containerRowHeight = 60;
    const certFooterHeight = 380;
    const pageHeightPx = 1228;

    const contentBeforeCert = headerHeight + (aggregatedContainers.length * containerRowHeight) + (aggregatedContainers.length > 0 ? 30 : 0);
    const currentPagePos = contentBeforeCert % pageHeightPx;
    const remainingOnPage = pageHeightPx - currentPagePos;

    let spacerHtml = '';
    if (remainingOnPage < certFooterHeight && remainingOnPage > 0) {
      spacerHtml = `<div style="height: ${remainingOnPage + 10}px;"></div>`;
    }

    let invoiceInfo = `INVOICE NO.: ${invoice.invoiceNumber || ""}`;
    let exporterRefInfo = primaryData.exporter_ref_no ? `EXPORTER REF NO.: ${primaryData.exporter_ref_no}` : "";
    if (isClubActive && Array.isArray(clubbedJobsList)) {
      const allInvoiceNos = [
        invoice.invoiceNumber,
        ...clubbedJobsList.map(j => j.invoices?.[0]?.invoiceNumber)
      ].filter(Boolean);
      invoiceInfo = `INVOICE NO.: ${allInvoiceNos.join(", ")}`;

      const allExpRefNos = [
        primaryData.exporter_ref_no,
        ...clubbedJobsList.map(j => j.exporter_ref_no)
      ].filter(Boolean);
      if (allExpRefNos.length > 0) {
        exporterRefInfo = `EXPORTER REF NO.: ${allExpRefNos.join(", ")}`;
      }
    }

    return `
      <div style="width: 900px; font-family: 'Arial', sans-serif; color: #000; padding: 0 22px; box-sizing: border-box; line-height: 1.2;">
        <table style="width: 100%; border-collapse: collapse; border: 1px solid black; table-layout: fixed; box-sizing: border-box;">
          <colgroup>
            <col style="width: 3%;">
            <col style="width: 13%;">
            <col style="width: 5%;">
            <col style="width: 7%;">
            <col style="width: 25%;">
            <col style="width: 8%;">
            <col style="width: 7%;">
            <col style="width: 10%;">
            <col style="width: 10%;">
            <col style="width: 12%;">
          </colgroup>
          <!-- ROW 1: Logo & Header Information -->
          <tr style="height: 100px;">
            <td colspan="4" style="border: 1px solid black; padding: 5px; text-align: center; vertical-align: middle;">
              <img src="${logo}" alt="Logo" style="max-width: 150px; height: auto;" />
            </td>
            <td colspan="4" style="border: 1px solid black; padding: 5px; vertical-align: bottom; text-align: center;">
              <div style="font-weight: bold; font-size: 14px; margin-bottom: 15px;">HPCSL CONSIGNMENT NOTE</div>
            </td>
            <td colspan="2" style="border: 1px solid black; padding: 0; vertical-align: top;">
              <table style="width: 100%; height: 100%; margin: 0; border: none; border-collapse: collapse; table-layout: fixed;">
                <tr><td colspan="2" style="border-bottom: 1px solid black; font-weight: bold; font-size: 10px; text-align: center; background: #eee; height: 20px; vertical-align: middle;">HPCSL USE</td></tr>
                <tr><td colspan="2" style="border-bottom: 1px solid black; font-size: 10px; padding: 4px; vertical-align: middle;">CCN No. & Date :</td></tr>
                <tr><td colspan="2" style="border-bottom: 1px solid black; font-size: 10px; padding: 4px; vertical-align: middle;">To :</td></tr>
                <tr><td colspan="2" style="border-bottom: 1px solid black; font-size: 10px; padding: 4px; vertical-align: middle;">Rail Operator (Please Specify)</td></tr>
                <tr>
                  <td style="border-right: 1px solid black; width: 50%; font-weight: bold; font-size: 10px; text-align: center; vertical-align: middle;">HPCSL</td>
                  <td style="width: 50%;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ROW 2: Destination and Invoice -->
          <tr style="height: 50px;">
            <td colspan="10" style="border: 1px solid black; padding: 5px; vertical-align: top;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 30%; vertical-align: top; padding: 5px;">
                    <div style="font-weight: bold; font-size: 10px;">To,</div>
                    <div style="font-weight: bold; font-size: 10px;">The Terminal Manager,</div>
                    <div style="font-weight: bold; font-size: 10px;">HPCSL, The Thar Dry Port, ICD-Sanand</div>
                  </td>
                  <td style="width: 40%; vertical-align: top; text-align: center; padding: 5px;">
                     <div style="font-weight: bold; font-size: 12px; margin-bottom: 5px;">Mode By : ${statusDetails.railRoad || "RAIL"}</div>
                  </td>
                  <td style="width: 30%; vertical-align: top; text-align: right; padding: 5px;">
                    <div style="font-weight: bold; font-size: 11px; padding-bottom: 10px;">${invoiceInfo}</div>
                    ${exporterRefInfo ? `<div style="font-weight: bold; font-size: 11px; padding-bottom: 10px;">${exporterRefInfo}</div>` : ""}
                    <div style="font-weight: bold; font-size: 10px;">Cargo : Non Hazardous</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ROW 3: Disclaimer -->
          <tr style="height: 35px;">
            <td colspan="10" style="border: 1px solid black; padding: 8px; font-size: 8px; text-align: justify; line-height: 1.4; vertical-align: middle;">
              Please receive the under mentioned container stuffed at ICD/Factory. We accept the all Transportation and/or provision of Containers of business incidental there to have been under taken by HPCSL-THE THAR DRY PORT on the basis of their standard terms and conditions which have been read by us and understood. No servant or agent of the company has any authority to vary or waive conditions or any part there of.
            </td>
          </tr>

          <!-- ROW 4: Consignor and Vessel -->
          <tr style="height: 50px;">
            <td colspan="5" style="border: 1px solid black; padding: 8px; vertical-align: top;">
              <div style="font-size: 10px; margin-bottom: 5px;"><b>Name of Consignor (S/Line) :</b></div>
              <div style="font-size: 11px; font-weight: bold;">${shippingLineName}</div>
            </td>
            <td colspan="5" style="border: 1px solid black; padding: 8px; vertical-align: top;">
              <div style="font-size: 11px; font-weight: bold; margin-bottom: 5px;">VESSEL NAME : ${vesselName}</div>
              <div style="font-size: 11px; font-weight: bold;">BOOKING NO : ${Bookingno}</div>
            </td>
          </tr>

          <!-- ROW 5: Agent and Date -->
          <tr style="height: 45px;">
            <td colspan="5" style="border: 1px solid black; padding: 8px; vertical-align: top;">
              <div style="font-size: 10px;"><b>Agent/CHA :</b> ${agentCha}</div>
            </td>
            <td colspan="3" style="border: 1px solid black; border-left: none; padding: 8px; vertical-align: top;">
              <div style="font-size: 10px;"><b>Cut-Off Date.:</b> ${cutOffDate}</div>
            </td>
            <td colspan="2" style="border: 1px solid black; border-left: none; padding: 8px; vertical-align: top;">
              <div style="font-size: 10px; margin-bottom: 5px;"><b>Country</b></div>
              <div style="font-size: 10px; text-align: center; width: 100%; font-weight: bold;">${dischargeCountry}</div>
            </td>
          </tr>

          <!-- ROW 6: Exporter and Gateway Port -->
          <tr style="height: 55px;">
            <td colspan="5" style="border: 1px solid black; padding: 8px; vertical-align: top;">
              <div style="font-size: 10px; margin-bottom: 5px;"><b>Name and Address of Exporter :</b></div>
              <div style="font-size: 11px; font-weight: bold;">${exporterAddress}</div>
            </td>
            <td colspan="5" style="border: 1px solid black; padding: 8px; vertical-align: middle; background-color: #FFFF00;">
              <span style="font-size: 11px; font-weight: bold;">Gateway Port;</span>
              <span style="font-size: 24px; font-weight: bold; margin-left: 10px;">${gatewayPort}</span>
            </td>
          </tr>

          <!-- ROW 7: SB No and Port of Discharge -->
          <tr style="height: 45px;">
            <td colspan="5" style="border: 1px solid black; padding: 8px; vertical-align: top;">
              <div style="font-size: 10px; margin-bottom: 5px;"><b>SHIPPING BILL NO.</b></div>
              <div style="font-size: 11px; font-weight: bold;">${shippingBillNo}</div>
            </td>
            <td colspan="5" style="border: 1px solid black; padding: 8px; vertical-align: top;">
              <div style="font-size: 10px;"><b>Port of Discharge : ${portOfDischarge}</b></div>
            </td>
          </tr>

          <!-- ROW 8: Stuffing and FOB -->
          <tr style="height: 45px;">
            <td colspan="5" style="border: 1px solid black; padding: 8px; vertical-align: top;">
              <div style="font-size: 10px; margin-bottom: 5px;"><b>Stuffing (Please Tick) F/S</b></div>
              <div style="font-size: 10px; font-weight: bold;">${stuffingType}</div>
            </td>
            <td colspan="5" style="border: 1px solid black; padding: 8px; vertical-align: top;">
              <div style="font-size: 10px;"><b>F.O.B./C.I.F. Value : ${fobvalue}</b></div>
            </td>
          </tr>

          <!-- ROW 9: Payment Type -->
          <tr style="height: 35px;">
            <td colspan="10" style="border: 1px solid black; padding: 5px; font-weight: bold; font-size: 9px; vertical-align: middle;">
              e:LCL/FCL/ODC:Yes/No.Payment Type:PAID / TO PAY
            </td>
          </tr>

          <!-- CONTAINER TABLE HEADERS -->
          <tr style="background: #eee; font-weight: bold; font-size: 9px; text-align: center; height: 40px;">
            <td style="border: 1px solid black; padding: 5px 2px; vertical-align: middle;">Sr No</td>
            <td style="border: 1px solid black; padding: 5px 2px; vertical-align: middle;">Container No</td>
            <td style="border: 1px solid black; padding: 5px 2px; vertical-align: middle;">Size</td>
            <td style="border: 1px solid black; padding: 5px 2px; vertical-align: middle;">No & Type of Pkgs.</td>
            <td style="border: 1px solid black; padding: 5px 2px; vertical-align: middle;">Description of Goods</td>
            <td style="border: 1px solid black; padding: 5px 2px; vertical-align: middle;">Cargo Weight (MT)</td>
            <td style="border: 1px solid black; padding: 5px 2px; vertical-align: middle;">TARE WT</td>
            <td style="border: 1px solid black; padding: 5px 2px; vertical-align: middle;">Customs Seal No.</td>
            <td style="border: 1px solid black; padding: 5px 2px; vertical-align: middle;">Shipping Line Seal No.</td>
            <td style="border: 1px solid black; padding: 5px 2px; vertical-align: middle;">SB NO.: & DATE</td>
          </tr>
          ${containersRows}

        </table>

        ${spacerHtml}
        <!-- CERTIFICATIONS + FOOTER wrapped together -->
        <div style="margin-top: -1px;">
        <table style="width: 100%; border-collapse: collapse; border: 1px solid black; table-layout: fixed; box-sizing: border-box;">
          <colgroup>
            <col style="width: 3%;">
            <col style="width: 97%;">
          </colgroup>
          <tr><td style="border: 1px solid black; padding: 6px 4px; font-weight: bold; font-size: 7px; text-align: center; vertical-align: middle;">1</td><td style="border: 1px solid black; padding: 6px 4px; font-size: 10px;">I do hereby certify that I have satisfied by self description, marks, quantity, measurement and weight of goods consigned by me have been correctly entered in the note.</td></tr>
          <tr><td style="border: 1px solid black; padding: 6px 4px; font-weight: bold; font-size: 7px; text-align: center; vertical-align: middle;">2</td><td style="border: 1px solid black; padding: 6px 4px; font-size: 10px; text-align: center; font-weight: bold;">I hereby certify that the goods described above are in goods order and condition at the time of dispatch.</td></tr>
          <tr><td style="border: 1px solid black; padding: 6px 4px; font-weight: bold; font-size: 7px; text-align: center; vertical-align: middle;">3</td><td style="border: 1px solid black; padding: 6px 4px; font-size: 10px; text-align: center; font-weight: bold;">I hereby certify that goods are not classified as dangerous in Indian Railway. Road Tariff of my IMO regulations.</td></tr>
          <tr><td style="border: 1px solid black; padding: 6px 4px; font-weight: bold; font-size: 7px; text-align: center; vertical-align: middle;">4</td><td style="border: 1px solid black; padding: 6px 4px; font-size: 10px; text-align: center; font-weight: bold;">It is certify that rated tonnage of the commitment (5) has been exceeded.</td></tr>
          <tr><td style="border: 1px solid black; padding: 6px 4px; font-weight: bold; font-size: 7px; text-align: center; vertical-align: middle;">5</td><td style="border: 1px solid black; padding: 6px 4px; font-size: 10px; text-align: center; font-weight: bold;">IF THE CONTAINER WEIGHT, IS NOT SPECIFIED THEIR TARE WEIGHT, IT WILL BE TAKEN AS 2.3 TONS FOR 20' & 4.6 TONS FOR 40'</td></tr>
          <tr><td style="border: 1px solid black; padding: 6px 4px; font-weight: bold; font-size: 7px; text-align: center; vertical-align: middle;">6</td><td style="border: 1px solid black; padding: 6px 4px; font-size: 10px; text-align: center; font-weight: bold;">I understand that the principal terms and conditions applying to the carriage of above containers are subject to the conditions and liabilities as specified in the Indian Railway Act 1989, as amended from time to time.</td></tr>
        </table>

        <!-- FOOTER SIGNATURE SECTION -->
        <table style="width: 100%; border-collapse: collapse; border: 1px solid black; table-layout: fixed; box-sizing: border-box; margin-top: -1px;">
          <tr>
            <td colspan="2" style="border: 1px solid black; padding: 10px 5px; vertical-align: top; min-height: 70px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 50%; vertical-align: top; padding: 5px;">
                    <div style="font-size: 10px; font-weight: bold; margin-bottom: 30px;">PDA A/C/Cheque No):</div>
                    <div style="font-size: 14px; font-weight: bold;">${shippingLineName}</div>
                  </td>
                  <td style="width: 50%; vertical-align: top; text-align: right; padding: 5px;">
                     <div style="font-size: 10px; font-weight: bold; margin-bottom: 30px;">PDA/PDC ${shippingLineName}</div>
                     <div style="font-size: 12px; font-weight: bold;">${generatedBy.toUpperCase()}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid black; padding: 5px; vertical-align: bottom; width: 70%;">
              <div style="font-size: 10px; font-weight: bold;">DATE : ${formatDate(new Date())}</div>
            </td>
            <td style="border: 1px solid black; padding: 5px; text-align: center; vertical-align: top; width: 30%;">
              <div style="font-size: 10px; font-weight: bold;">STAMP AND SIGNATURE</div>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="border: 1px solid black; padding: 5px; vertical-align: top; min-height: 40px;">
              <div style="font-size: 10px; font-weight: bold; text-decoration: underline; margin-bottom: 5px;">(HPCSL USE ONLY)</div>
              <div style="font-size: 10px; font-weight: bold;">DATE & TIME OF BOOKING OR (EA) :</div>
            </td>
          </tr>
        </table>
        </div>
      </div>
    `;
  };

  const generateHTML = async (e) => {
    if (e) e.stopPropagation();
    const encodedJobNo = encodeURIComponent(jobNo);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/get-export-job/${encodedJobNo}`
      );
      const data = response.data;

      const operations = data.operations?.[0] || {};
      const invoice = data.invoices?.[0] || {};
      const statusDetails = operations.statusDetails?.[0] || {};
      const containers = data.containers?.length > 0 ? data.containers : (data.operations?.[0]?.containerDetails || []);
      const products = invoice.products || [];

      const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
      const generatedBy = (user.first_name || user.user_first_name
        ? `${user.first_name || user.user_first_name || ""} ${user.last_name || user.user_last_name || ""}`.trim()
        : user.username || "System User").toUpperCase();

      const consignorName = data.exporter || "";
      const vesselName = data.vessel_name || "";
      const Bookingno = data.booking_no || "";
      const agentCha = "SURAJ FORWARDERS & SHIPPING AGENCIES";
      const cutOffDate = formatDate(data.cut_off_date || data.booking_date);
      const dischargeCountry = data.discharge_country || "";
      const exporterAddress = data.exporter || "";
      const gatewayPort = data.gateway_port || data.port_of_loading || "";
      const shippingBillNo = data.sb_no || "";
      const portOfDischarge = data.port_of_discharge || "";

      const hsnList = [...new Set(products.map(p => {
        if (p.hsn_code || p.hsnCode || p.hsn) return p.hsn_code || p.hsnCode || p.hsn;
        if (p.ritc) {
          if (typeof p.ritc === 'object') return p.ritc.hsnCode || p.ritc.ritcCode;
          return p.ritc;
        }
        return null;
      }).filter(Boolean))].join(", ");

      const descriptionOfGoods = products[0]?.description || "";

      
      let fetchedClubbedJobsData = [];
      let isClubActive = false;

      // If this is a child job, use the parent's pre-merged data to avoid double-counting.
      // The server already merges all child containers into the parent's containers array.
      if (data.parent_club_job) {
          try {
            const parentRes = await axios.get(`${import.meta.env.VITE_API_STRING}/get-export-job/${encodeURIComponent(data.parent_club_job)}`);
            if (parentRes.data) {
                // Replace current data with parent's pre-merged data
                Object.assign(data, parentRes.data);
                isClubActive = true;
            }
          } catch(e) { console.warn(e); }
      } else if (data.is_club_job_parent && Array.isArray(data.clubbed_jobs) && data.clubbed_jobs.length > 0) {
          // Parent job: server already merged all children into data.containers
          isClubActive = true;
      }

      setIsClubJob(isClubActive);
      setClubbedJobsData(fetchedClubbedJobsData);


      setJobData({
        consignorName,
        vesselName,
        Bookingno,
        agentCha,
        cutOffDate,
        dischargeCountry,
        exporterAddress,
        gatewayPort,
        shippingBillNo,
        portOfDischarge,
        stuffingType: data.goods_stuffed_at?.toString().toLowerCase() === "factory" ? "FACTORY" : "ICD (CFS) / FACTORY",
        shippingLineName: data.shipping_line_airline || "",
        fobvalue: data.invoices?.[0]?.freightInsuranceCharges?.fobValue?.amount || "",
        hsnList,
        descriptionOfGoods,
        containers,
        generatedBy,
        sb_date: data.sb_date,
        total_no_of_pkgs: data.total_no_of_pkgs,
        gross_weight_kg: data.gross_weight_kg,
        invoiceNumber: data.invoices?.[0]?.invoiceNumber || "",
        exporter_ref_no: data.exporter_ref_no || "",
        railRoad: statusDetails.railRoad || "RAIL",
        job_no: data.job_no
      });

      setChoiceOpen(true);
    } catch (err) {
      console.error("Error generating Forwarding Note:", err);
      alert("Failed to generate Forwarding Note");
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
      const worksheet = workbook.addWorksheet("Consignment Note");

      worksheet.columns = [
        { width: 6 },   // A: Sr No
        { width: 18 },  // B: Container No
        { width: 8 },   // C: Size
        { width: 14 },  // D: No & Type of Pkgs.
        { width: 35 },  // E: Description of Goods
        { width: 14 },  // F: Cargo Weight (MT)
        { width: 12 },  // G: TARE WT
        { width: 18 },  // H: Customs Seal No.
        { width: 18 },  // I: Shipping Line Seal No.
        { width: 18 }   // J: SB NO.: & DATE
      ];

      for (let r = 1; r <= 100; r++) {
        worksheet.getRow(r).height = 20;
      }

      const setOuterBorder = (ws, startRow, startCol, endRow, endCol) => {
        const borderStyle = { style: 'thin', color: { argb: 'FF000000' } };
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            const cell = ws.getCell(r, c);
            const border = {};
            if (r === startRow) border.top = borderStyle;
            if (r === endRow) border.bottom = borderStyle;
            if (c === startCol) border.left = borderStyle;
            if (c === endCol) border.right = borderStyle;
            cell.border = border;
          }
        }
      };

      if (logoSrc && logoSrc.startsWith("data:image")) {
        try {
          const base64Data = logoSrc.split(",")[1];
          const extension = logoSrc.match(/image\/(\w+)/)?.[1] || "png";
          const imageId = workbook.addImage({
            base64: base64Data,
            extension: extension
          });
          worksheet.addImage(imageId, {
            tl: { col: 0.3, row: 0.5 },
            ext: { width: 150, height: 44 },
            editAs: 'oneCell'
          });
        } catch (err) {
          console.warn("Failed to add image to Excel", err);
        }
      }

      setOuterBorder(worksheet, 1, 1, 5, 4);
      worksheet.mergeCells("E1:H5");
      worksheet.mergeCells("I1:J1");
      worksheet.mergeCells("I2:J2");
      worksheet.mergeCells("I3:J3");
      worksheet.mergeCells("I4:J4");

      worksheet.getRow(1).height = 20;
      worksheet.getRow(2).height = 20;
      worksheet.getRow(3).height = 20;
      worksheet.getRow(4).height = 20;
      worksheet.getRow(5).height = 20;

      worksheet.getCell("E1").value = "HPCSL CONSIGNMENT NOTE";
      worksheet.getCell("E1").font = { name: "Arial", bold: true, size: 16 };
      worksheet.getCell("E1").alignment = { vertical: "middle", horizontal: "center" };

      worksheet.getCell("I1").value = "HPCSL USE";
      worksheet.getCell("I1").font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell("I1").alignment = { vertical: "middle", horizontal: "center" };
      worksheet.getCell("I1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } };
      worksheet.getCell("J1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } };

      worksheet.getCell("I2").value = "CCN No. & Date :";
      worksheet.getCell("I2").font = { name: "Arial", size: 8 };
      worksheet.getCell("I2").alignment = { vertical: "middle", horizontal: "left" };

      worksheet.getCell("I3").value = "To :";
      worksheet.getCell("I3").font = { name: "Arial", size: 8 };
      worksheet.getCell("I3").alignment = { vertical: "middle", horizontal: "left" };

      worksheet.getCell("I4").value = "Rail Operator (Please Specify)";
      worksheet.getCell("I4").font = { name: "Arial", size: 8 };
      worksheet.getCell("I4").alignment = { vertical: "middle", horizontal: "left" };

      worksheet.getCell("I5").value = "HPCSL";
      worksheet.getCell("I5").font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell("I5").alignment = { vertical: "middle", horizontal: "center" };

      worksheet.getRow(6).height = 55;
      worksheet.mergeCells("A6:C6");
      worksheet.getCell("A6").value = {
        richText: [
          { text: "To,\nThe Terminal Manager,\nHPCSL, The Thar Dry Port, ICD-Sanand", font: { name: "Arial", bold: true, size: 9 } }
        ]
      };
      worksheet.getCell("A6").alignment = { vertical: "top", horizontal: "left", wrapText: true };

      worksheet.mergeCells("D6:G6");
      worksheet.getCell("D6").value = `Mode By : ${jobData.railRoad || "RAIL"}`;
      worksheet.getCell("D6").font = { name: "Arial", bold: true, size: 10 };
      worksheet.getCell("D6").alignment = { vertical: "middle", horizontal: "center" };

      worksheet.mergeCells("H6:J6");
      let invoiceInfo = `INVOICE NO.: ${jobData.invoiceNumber || ""}`;
      let exporterRefInfo = jobData.exporter_ref_no ? `EXPORTER REF NO.: ${jobData.exporter_ref_no}` : "";
      if (isClubJob && clubbedJobsData.length > 0) {
        const allInvoices = [jobData.invoiceNumber, ...clubbedJobsData.map(j => j.invoices?.[0]?.invoiceNumber)].filter(Boolean);
        invoiceInfo = `INVOICE NO.: ${allInvoices.join(", ")}`;

        const allExpRefs = [jobData.exporter_ref_no, ...clubbedJobsData.map(j => j.exporter_ref_no)].filter(Boolean);
        if (allExpRefs.length > 0) {
          exporterRefInfo = `EXPORTER REF NO.: ${allExpRefs.join(", ")}`;
        }
      }
      worksheet.getCell("H6").value = {
        richText: [
          { text: invoiceInfo + "\n", font: { name: "Arial", bold: true, size: 9.5 } },
          { text: exporterRefInfo + "\n", font: { name: "Arial", bold: true, size: 9.5 } },
          { text: "Cargo : Non Hazardous", font: { name: "Arial", bold: true, size: 8.5 } }
        ]
      };
      worksheet.getCell("H6").alignment = { vertical: "top", horizontal: "right", wrapText: true };

      worksheet.getRow(7).height = 35;
      worksheet.mergeCells("A7:J7");
      worksheet.getCell("A7").value = "Please receive the under mentioned container stuffed at ICD/Factory. We accept the all Transportation and/or provision of Containers of business incidental there to have been under taken by HPCSL-THE THAR DRY PORT on the basis of their standard terms and conditions which have been read by us and understood. No servant or agent of the company has any authority to vary or waive conditions or any part there of.";
      worksheet.getCell("A7").font = { name: "Arial", size: 7.5 };
      worksheet.getCell("A7").alignment = { vertical: "middle", horizontal: "left", wrapText: true };

      worksheet.getRow(8).height = 40;
      worksheet.mergeCells("A8:E8");
      worksheet.getCell("A8").value = {
        richText: [
          { text: "Name of Consignor (S/Line) :\n", font: { name: "Arial", size: 8.5 } },
          { text: jobData.shippingLineName || "", font: { name: "Arial", bold: true, size: 10 } }
        ]
      };
      worksheet.getCell("A8").alignment = { vertical: "top", horizontal: "left", wrapText: true };

      worksheet.mergeCells("F8:J8");
      worksheet.getCell("F8").value = {
        richText: [
          { text: `VESSEL NAME : ${jobData.vesselName || ""}\n`, font: { name: "Arial", bold: true, size: 9.5 } },
          { text: `BOOKING NO : ${jobData.Bookingno || ""}`, font: { name: "Arial", bold: true, size: 9.5 } }
        ]
      };
      worksheet.getCell("F8").alignment = { vertical: "top", horizontal: "left", wrapText: true };

      worksheet.getRow(9).height = 35;
      worksheet.mergeCells("A9:E9");
      worksheet.getCell("A9").value = {
        richText: [
          { text: "Agent/CHA : ", font: { name: "Arial", bold: true, size: 8.5 } },
          { text: jobData.agentCha || "", font: { name: "Arial", size: 9 } }
        ]
      };
      worksheet.getCell("A9").alignment = { vertical: "middle", horizontal: "left" };

      worksheet.mergeCells("F9:H9");
      worksheet.getCell("F9").value = {
        richText: [
          { text: "Cut-Off Date.: ", font: { name: "Arial", bold: true, size: 8.5 } },
          { text: jobData.cutOffDate || "", font: { name: "Arial", size: 9 } }
        ]
      };
      worksheet.getCell("F9").alignment = { vertical: "middle", horizontal: "left" };

      worksheet.mergeCells("I9:J9");
      worksheet.getCell("I9").value = {
        richText: [
          { text: "Country\n", font: { name: "Arial", size: 8 } },
          { text: jobData.dischargeCountry || "", font: { name: "Arial", bold: true, size: 9.5 } }
        ]
      };
      worksheet.getCell("I9").alignment = { vertical: "middle", horizontal: "center", wrapText: true };

      worksheet.getRow(10).height = 45;
      worksheet.mergeCells("A10:E10");
      worksheet.getCell("A10").value = {
        richText: [
          { text: "Name and Address of Exporter :\n", font: { name: "Arial", size: 8.5 } },
          { text: jobData.exporterAddress || "", font: { name: "Arial", bold: true, size: 10 } }
        ]
      };
      worksheet.getCell("A10").alignment = { vertical: "top", horizontal: "left", wrapText: true };

      worksheet.mergeCells("F10:J10");
      worksheet.getCell("F10").value = `Gateway Port;  ${jobData.gatewayPort || ""}`;
      worksheet.getCell("F10").font = { name: "Arial", bold: true, size: 14 };
      worksheet.getCell("F10").alignment = { vertical: "middle", horizontal: "center" };
      worksheet.getCell("F10").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };

      worksheet.getRow(11).height = 35;
      worksheet.mergeCells("A11:E11");
      worksheet.getCell("A11").value = {
        richText: [
          { text: "SHIPPING BILL NO.\n", font: { name: "Arial", size: 8 } },
          { text: jobData.shippingBillNo || "", font: { name: "Arial", bold: true, size: 10 } }
        ]
      };
      worksheet.getCell("A11").alignment = { vertical: "top", horizontal: "left", wrapText: true };

      worksheet.mergeCells("F11:J11");
      worksheet.getCell("F11").value = `Port of Discharge : ${jobData.portOfDischarge || ""}`;
      worksheet.getCell("F11").font = { name: "Arial", bold: true, size: 9.5 };
      worksheet.getCell("F11").alignment = { vertical: "middle", horizontal: "left" };

      worksheet.getRow(12).height = 35;
      worksheet.mergeCells("A12:E12");
      worksheet.getCell("A12").value = {
        richText: [
          { text: "Stuffing (Please Tick) F/S\n", font: { name: "Arial", size: 8 } },
          { text: jobData.stuffingType || "", font: { name: "Arial", bold: true, size: 9 } }
        ]
      };
      worksheet.getCell("A12").alignment = { vertical: "top", horizontal: "left", wrapText: true };

      worksheet.mergeCells("F12:J12");
      worksheet.getCell("F12").value = `F.O.B./C.I.F. Value : ${jobData.fobvalue || ""}`;
      worksheet.getCell("F12").font = { name: "Arial", bold: true, size: 9.5 };
      worksheet.getCell("F12").alignment = { vertical: "middle", horizontal: "left" };

      worksheet.getRow(13).height = 25;
      worksheet.mergeCells("A13:J13");
      worksheet.getCell("A13").value = "e:LCL/FCL/ODC:Yes/No.Payment Type:PAID / TO PAY";
      worksheet.getCell("A13").font = { name: "Arial", bold: true, size: 8.5 };
      worksheet.getCell("A13").alignment = { vertical: "middle", horizontal: "left" };

      const headers = ["Sr No", "Container No", "Size", "No & Type of Pkgs.", "Description of Goods", "Cargo Weight (MT)", "TARE WT", "Customs Seal No.", "Shipping Line Seal No.", "SB NO.: & DATE"];
      worksheet.getRow(14).height = 28;
      headers.forEach((h, cidx) => {
        const cell = worksheet.getCell(14, cidx + 1);
        cell.value = h;
        cell.font = { name: "Arial", bold: true, size: 9 };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } };
      });

      let currentRow = 15;
      let totalPkgs = 0;
      let totalWeight = 0;

      const aggregatedContainers = getAggregatedContainers(jobData, isClubJob, clubbedJobsData);

      aggregatedContainers.forEach((c, i) => {
      const uniqueSBsList = [];
      const seenSBs = new Set();
      if (c.uniqueSBs) {
          c.uniqueSBs.forEach((sb, idx) => {
             const key = sb.sbNo ? `${sb.sbNo}-${sb.sbDate}` : `__empty_${idx}`;
             if (!seenSBs.has(key)) {
                 seenSBs.add(key);
                 uniqueSBsList.push(sb);
             }
          });
      }

        worksheet.getRow(currentRow).height = 60;
        const pkgs = Number(c.pkgsStuffed) || 0;
        const weight = Number(c.grossWeight) || 0;
        const tareWeight = Number(c.tareWeightKgs) || 0;
        totalPkgs += pkgs;
        totalWeight += weight;

        worksheet.getCell(currentRow, 1).value = i + 1;
        worksheet.getCell(currentRow, 2).value = c.containerNo || "";
        worksheet.getCell(currentRow, 3).value = c.type?.match(/\d+/)?.[0] || "20";

        const pkgsText = uniqueSBsList.length > 0
          ? uniqueSBsList.map(sb => sb.pkgs || "").join("\n")
          : (pkgs || "");
        worksheet.getCell(currentRow, 4).value = pkgsText;

        const descText = c.uniqueDescriptions && c.uniqueDescriptions.length > 0
          ? c.uniqueDescriptions.join("\n")
          : (c.descriptionOfGoods || "");
        const hsnText = c.uniqueHsnCodes && c.uniqueHsnCodes.length > 0
          ? c.uniqueHsnCodes.join(", ")
          : (c.hsnList || "");

        worksheet.getCell(currentRow, 5).value = {
          richText: [
            { text: descText + "\n", font: { name: "Arial", bold: true, size: 9 } },
            { text: "HSN: " + hsnText, font: { name: "Arial", size: 8, color: { argb: "FF333333" } } }
          ]
        };

        const weightText = uniqueSBsList.length > 0
          ? uniqueSBsList.map(sb => sb.weight || "").join("\n")
          : (weight || "");
        worksheet.getCell(currentRow, 6).value = weightText;

        const tareWeightText = uniqueSBsList.length > 0
          ? uniqueSBsList.map(sb => sb.tareWeight || "").join("\n")
          : (tareWeight || "");
        worksheet.getCell(currentRow, 7).value = tareWeightText;

        worksheet.getCell(currentRow, 8).value = c.uniqueSealNos && c.uniqueSealNos.length > 0 ? c.uniqueSealNos.join("\n") : (c.sealNo || "");
        worksheet.getCell(currentRow, 9).value = c.uniqueShippingLineSealNos && c.uniqueShippingLineSealNos.length > 0 ? c.uniqueShippingLineSealNos.join("\n") : (c.shippingLineSealNo || "");

        const sbText = uniqueSBsList.length > 0
          ? uniqueSBsList.map(sb => sb.sbNo ? `${sb.sbNo}\ndt ${formatDate(sb.sbDate)}` : `dt ${formatDate(sb.sbDate)}`).join("\n\n")
          : (c.shippingBillNo ? `${c.shippingBillNo}\n\ndt ${formatDate(c.sb_date)}` : "");

        worksheet.getCell(currentRow, 10).value = {
          richText: [
            { text: sbText, font: { name: "Arial", bold: true, size: 9 } }
          ]
        };

        worksheet.getRow(currentRow).eachCell((cell, colNum) => {
          cell.font = cell.font || { name: "Arial", size: 9 };
          if (colNum === 2) cell.font.bold = true;
          cell.alignment = { vertical: "middle", horizontal: colNum === 5 ? "left" : "center", wrapText: true };
        });

        currentRow++;
      });

      worksheet.getRow(currentRow).height = 24;
      worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = "Total:";
      worksheet.getCell(`A${currentRow}`).font = { name: "Arial", bold: true, size: 10 };
      worksheet.getCell(`A${currentRow}`).alignment = { vertical: "middle", horizontal: "right" };

      worksheet.getCell(`D${currentRow}`).value = totalPkgs || "";
      worksheet.getCell(`D${currentRow}`).font = { name: "Arial", bold: true, size: 10 };
      worksheet.getCell(`D${currentRow}`).numFormat = '#,##0';
      worksheet.getCell(`D${currentRow}`).alignment = { vertical: "middle", horizontal: "center" };

      worksheet.getCell(`F${currentRow}`).value = totalWeight || "";
      worksheet.getCell(`F${currentRow}`).font = { name: "Arial", bold: true, size: 10 };
      worksheet.getCell(`F${currentRow}`).numFormat = '#,##0.000';
      worksheet.getCell(`F${currentRow}`).alignment = { vertical: "middle", horizontal: "center" };

      worksheet.mergeCells(`G${currentRow}:J${currentRow}`);

      currentRow++;

      const certs = [
        "I do hereby certify that I have satisfied by self description, marks, quantity, measurement and weight of goods consigned by me have been correctly entered in the note.",
        "I hereby certify that the goods described above are in goods order and condition at the time of dispatch.",
        "I hereby certify that goods are not classified as dangerous in Indian Railway. Road Tariff of my IMO regulations.",
        "It is certify that rated tonnage of the commitment (5) has been exceeded.",
        "IF THE CONTAINER WEIGHT, IS NOT SPECIFIED THEIR TARE WEIGHT, IT WILL BE TAKEN AS 2.3 TONS FOR 20' & 4.6 TONS FOR 40'",
        "I understand that the principal terms and conditions applying to the carriage of above containers are subject to the conditions and liabilities as specified in the Indian Railway Act 1989, as amended from time to time."
      ];

      certs.forEach((text, cIdx) => {
        worksheet.getRow(currentRow).height = 24;
        worksheet.getCell(`A${currentRow}`).value = cIdx + 1;
        worksheet.getCell(`A${currentRow}`).font = { name: "Arial", bold: true, size: 8 };
        worksheet.getCell(`A${currentRow}`).alignment = { vertical: "middle", horizontal: "center" };

        worksheet.mergeCells(`B${currentRow}:J${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = text;
        worksheet.getCell(`B${currentRow}`).font = { name: "Arial", size: 8.5 };
        worksheet.getCell(`B${currentRow}`).alignment = { vertical: "middle", horizontal: "left", wrapText: true };
        currentRow++;
      });

      worksheet.getRow(currentRow).height = 40;
      worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = {
        richText: [
          { text: "PDA A/C/Cheque No):\n", font: { name: "Arial", bold: true, size: 8 } },
          { text: jobData.shippingLineName || "", font: { name: "Arial", bold: true, size: 10 } }
        ]
      };
      worksheet.getCell(`A${currentRow}`).alignment = { vertical: "top", horizontal: "left", wrapText: true };

      worksheet.mergeCells(`H${currentRow}:J${currentRow}`);
      worksheet.getCell(`H${currentRow}`).value = {
        richText: [
          { text: `PDA/PDC ${jobData.shippingLineName || ""}\n`, font: { name: "Arial", bold: true, size: 8 } },
          { text: (jobData.generatedBy || "").toUpperCase(), font: { name: "Arial", bold: true, size: 9.5 } }
        ]
      };
      worksheet.getCell(`H${currentRow}`).alignment = { vertical: "top", horizontal: "right", wrapText: true };

      currentRow++;

      worksheet.getRow(currentRow).height = 22;
      worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = `DATE : ${formatDate(new Date())}`;
      worksheet.getCell(`A${currentRow}`).font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell(`A${currentRow}`).alignment = { vertical: "middle", horizontal: "left" };

      worksheet.mergeCells(`H${currentRow}:J${currentRow}`);
      worksheet.getCell(`H${currentRow}`).value = "STAMP AND SIGNATURE";
      worksheet.getCell(`H${currentRow}`).font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell(`H${currentRow}`).alignment = { vertical: "middle", horizontal: "center" };

      currentRow++;

      worksheet.getRow(currentRow).height = 20;
      worksheet.getRow(currentRow + 1).height = 20;
      worksheet.mergeCells(`A${currentRow}:J${currentRow+1}`);
      worksheet.getCell(`A${currentRow}`).value = {
        richText: [
          { text: "(HPCSL USE ONLY)\n", font: { name: "Arial", bold: true, size: 9, underline: true } },
          { text: "DATE & TIME OF BOOKING OR (EA) :", font: { name: "Arial", bold: true, size: 9 } }
        ]
      };
      worksheet.getCell(`A${currentRow}`).alignment = { vertical: "top", horizontal: "left", wrapText: true };

      currentRow += 2;

      const borderStyle = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };

      for (let r = 1; r < currentRow; r++) {
        const rowObj = worksheet.getRow(r);
        for (let c = 1; c <= 10; c++) {
          const cell = rowObj.getCell(c);
          cell.border = borderStyle;
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `HPCSL_Consignment_Note_${jobNo}.xlsx`);
    } catch (error) {
      console.error("Error generating Excel:", error);
      alert("Failed to generate Excel file.");
    }
  };

  const handleEdit = () => {
    setChoiceOpen(false);
    setEditorOpen(true);
  };

  const handleDownloadDirectly = async () => {
    setChoiceOpen(false);
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    try {
      await doc.html(htmlContent, {
        callback: function (doc) {
          doc.save(`Forwarding_Note_${jobNo}.pdf`);
        },
        x: 0,
        y: 15,
        width: 595,
        windowWidth: 900,
        margin: [15, 0, 15, 0],
        autoPaging: 'slice',
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF");
    }
  };

  return (
    <>
      {children ? (
        React.cloneElement(children, {
          onClick: (e) => {
            e.stopPropagation();
            if (children.props.onClick) children.props.onClick(e);
            generateHTML(e);
          }
        })
      ) : (
        <MenuItem onClick={generateHTML}>Forwarding Note (THAR)</MenuItem>
      )}

      {/* Choice Dialog */}
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
              onClick={handleDownloadDirectly}
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
        title={`Forwarding Note (Thar) - ${jobNo}`}
        pdfOptions={{
          x: 0,
          y: 15,
          width: 595,
          windowWidth: 900,
          margin: [15, 0, 15, 0],
        }}
      />
    </>
  );
};

export default ForwardingNoteTharGenerator;