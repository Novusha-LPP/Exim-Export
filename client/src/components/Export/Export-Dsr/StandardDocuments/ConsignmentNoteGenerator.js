import React, { useState } from "react";
import axios from "axios";
import { MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button, Chip, Switch } from "@mui/material";
import jsPDF from "jspdf";
import DocumentEditorDialog from "./DocumentEditorDialog";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const ConsignmentNoteGenerator = ({ jobNo, children }) => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [jobData, setJobData] = useState(null);

  const [isClubJob, setIsClubJob] = useState(false);
    const [clubbedJobsData, setClubbedJobsData] = useState([]);
        const [exchangeRate, setExchangeRate] = useState(1);

  const formatDate = (dateString) => {
    if (!dateString) return "";
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

  
  
  // Regenerate htmlContent when jobData, isClubJob, or clubbedJobsData changes
  React.useEffect(() => {
    if (!jobData) return;
    const template = buildTemplate(jobData, exchangeRate, isClubJob, clubbedJobsData);
    setHtmlContent(template);
  }, [jobData, exchangeRate, isClubJob, clubbedJobsData]);

  
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
      const hsn = c.hsn || c._sourceHsnList || c.hsnList || c.ritc || "";
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

      if (desc && !group.uniqueDescriptions.includes(desc)) {
        group.uniqueDescriptions.push(desc);
      }
      if (hsn && !group.uniqueHsnCodes.includes(hsn)) {
        group.uniqueHsnCodes.push(hsn);
      }
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

  const generateHTML = async (e) => {
    if (e) e.stopPropagation();
    const encodedJobNo = encodeURIComponent(jobNo);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/get-export-job/${encodedJobNo}`
      );
      const data = response.data;

      const invoice = data.invoices?.[0] || {};

      // Fetch Currency Rates
      let rate = 1;
      try {
        const jobDateFormatted = formatDateForApi(data.job_date || new Date());
        const currencyResponse = await axios.get(
          `${import.meta.env.VITE_API_STRING}/currency-rates/by-date/${jobDateFormatted}`
        );
        if (
          currencyResponse.data.success &&
          currencyResponse.data.data.exchange_rates
        ) {
          const rateObj = currencyResponse.data.data.exchange_rates.find(
            (r) => r.currency_code === (invoice.currency || "USD")
          );
          if (rateObj) {
            rate = rateObj.export_rate || rateObj.import_rate || 1;
          }
        }
      } catch (err) {
        console.warn("Currency rate fetch failed", err);
      }
      setExchangeRate(rate);

      
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

      setJobData(data);

      const template = buildTemplate(data, rate, isClubActive, fetchedClubbedJobsData);
      setHtmlContent(template);
      setChoiceOpen(true);
    } catch (err) {
      console.error("Error generating Consignment Note:", err);
      alert("Failed to generate Consignment Note");
    }
  };

  const buildTemplate = (data, rate, isClubActive, validClubbedJobs) => {
    const invoice = data.invoices?.[0] || {};
    const statusDetails = data.operations?.[0]?.statusDetails?.[0] || {};

    // Calculations
    const totalFobVal = [data, ...validClubbedJobs].reduce((sum, job) => {
      const val = (job.invoices || []).reduce((s, inv) => {
        return s + (Number(inv.freightInsuranceCharges?.fobValue?.amount || inv.productValue || 0));
      }, 0);
      return sum + val;
    }, 0);

    const totalInvoiceVal = [data, ...validClubbedJobs].reduce((sum, job) => {
      const val = (job.invoices || []).reduce((s, inv) => {
        return s + (Number(inv.invoiceValue || 0));
      }, 0);
      return sum + val;
    }, 0);

    const fobInInr = (totalFobVal * rate).toFixed(2);
    const invInInr = (totalInvoiceVal * rate).toFixed(2);

    const aggregatedContainers = getAggregatedContainers(data, isClubActive, validClubbedJobs);
    
    let containersRows = "";
    let totalPkgs = 0;
    let totalWeight = 0;

    aggregatedContainers.forEach((c, idx) => {
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
      const weightMT = (weight / 1000).toFixed(3);
      totalPkgs += pkgs;
      totalWeight += weight;

      const descDisplay = c.uniqueDescriptions && c.uniqueDescriptions.length > 0
        ? c.uniqueDescriptions.map(d => `<div>${d}</div>`).join("")
        : (c.descriptionOfGoods || "");

      const pkgsDisplay = uniqueSBsList && uniqueSBsList.length > 0
        ? uniqueSBsList.map(sb => `<div>${sb.pkgs || ""}</div>`).join("")
        : (pkgs ? `<div>${pkgs}</div>` : "");

      const weightDisplay = uniqueSBsList && uniqueSBsList.length > 0
        ? uniqueSBsList.map(sb => `<div>${(Number(sb.weight) / 1000).toFixed(3)}</div>`).join("")
        : (Number(c.grossWeight || 0) / 1000).toFixed(3);

      const uniqueSeals = c.uniqueSBs ? [...new Set(c.uniqueSBs.map(sb => sb.sealNo ? String(sb.sealNo).trim() : '').filter(Boolean))] : [];
      const sealDisplay = uniqueSeals.length > 0
        ? uniqueSeals.map(s => `<div>${s}</div>`).join("<div style='height: 8px;'></div>")
        : (c.sealNo || "");

      const uniqueAgentSeals = c.uniqueSBs ? [...new Set(c.uniqueSBs.map(sb => sb.shippingLineSealNo ? String(sb.shippingLineSealNo).trim() : '').filter(Boolean))] : [];
      const agentSealDisplay = uniqueAgentSeals.length > 0
        ? uniqueAgentSeals.map(s => `<div>${s}</div>`).join("<div style='height: 8px;'></div>")
        : (c.shippingLineSealNo || "");

      const uniqueSBNoList = c.uniqueSBs ? [...new Set(c.uniqueSBs.map(sb => sb.sbNo).filter(Boolean))] : [];
      const sbNoDisplay = uniqueSBNoList.length > 0
        ? uniqueSBNoList.map(sb => `<div>${sb}</div>`).join("")
        : (c.sb_no || "");

      const uniqueSBDateList = c.uniqueSBs ? [...new Set(c.uniqueSBs.map(sb => formatDate(sb.sbDate)).filter(Boolean))] : [];
      const sbDateDisplay = uniqueSBDateList.length > 0
        ? uniqueSBDateList.map(sb => `<div>${sb}</div>`).join("")
        : formatDate(c.sb_date);

      containersRows += `
        <tr>
          <td style="border: 1px solid black; padding: 4px; vertical-align: middle;">${idx + 1}</td>
          <td style="border: 1px solid black; padding: 4px; vertical-align: middle;">${c.containerNo || ""}</td>
          <td style="border: 1px solid black; padding: 4px; vertical-align: middle;">${c.type?.match(/\d+/)?.[0] || "20"}</td>
          <td style="border: 1px solid black; padding: 4px; vertical-align: middle;">${pkgsDisplay}</td>
          <td style="border: 1px solid black; padding: 4px; text-align: left; vertical-align: middle;">${descDisplay}</td>
          <td style="border: 1px solid black; padding: 4px; vertical-align: middle;">${weightDisplay}</td>
          <td style="border: 1px solid black; padding: 4px; vertical-align: middle;">${sealDisplay}</td>
          <td style="border: 1px solid black; padding: 4px; vertical-align: middle;">${agentSealDisplay}</td>
          <td style="border: 1px solid black; padding: 4px; vertical-align: middle;">${sbNoDisplay}</td>
          <td style="border: 1px solid black; padding: 4px; vertical-align: middle;">${sbDateDisplay}</td>
        </tr>
      `;
    });

    containersRows += `
      <tr style="font-weight: bold;">
        <td style="border: 1px solid black; vertical-align: middle; padding: 5px;"></td>
        <td style="border: 1px solid black; text-align: left; vertical-align: middle; padding: 5px;">TOTAL</td>
        <td style="border: 1px solid black; vertical-align: middle; padding: 5px;"></td>
        <td style="border: 1px solid black; vertical-align: middle; padding: 5px;">${totalPkgs || ""}</td>
        <td style="border: 1px solid black; vertical-align: middle; padding: 5px;"></td>
        <td style="border: 1px solid black; vertical-align: middle; padding: 5px;">${(totalWeight / 1000).toFixed(3)}</td>
        <td style="border: 1px solid black; vertical-align: middle; padding: 5px;"></td>
        <td style="border: 1px solid black; vertical-align: middle; padding: 5px;"></td>
        <td style="border: 1px solid black; vertical-align: middle; padding: 5px;"></td>
        <td style="border: 1px solid black; vertical-align: middle; padding: 5px;"></td>
      </tr>
    `;

    let invoiceNosInfo = invoice.invoiceNumber || "";
    let sbNosInfo = `${data.sb_no || ""} / ${formatDate(data.sb_date)}`;
    let leoDatesInfo = formatDate(statusDetails.leoDate);

    if (isClubActive && Array.isArray(validClubbedJobs)) {
      const allInvoices = [invoice.invoiceNumber, ...validClubbedJobs.map(j => j.invoices?.[0]?.invoiceNumber)].filter(Boolean);
      invoiceNosInfo = allInvoices.join(", ");

      const allSBs = [`${data.sb_no || ""} (${formatDate(data.sb_date)})`, ...validClubbedJobs.map(j => `${j.sb_no || ""} (${formatDate(j.sb_date)})`)].filter(Boolean);
      sbNosInfo = allSBs.join(", ");

      const allLeos = [formatDate(statusDetails.leoDate), ...validClubbedJobs.map(j => formatDate(j.operations?.[0]?.statusDetails?.[0]?.leoDate))].filter(Boolean);
      leoDatesInfo = allLeos.join(", ");
    }

    return `
      <div style="font-family: 'Helvetica', 'Arial', sans-serif; max-width: 1100px; margin: 0 auto; padding: 5px;">
        
        <!-- Header Section -->
        <div style="text-align: center; margin-bottom: 10px;">
          <h2 style="margin: 0; font-weight: bold; font-size: 20px; text-transform: uppercase;">DP WORLD CONTINENTAL WAREHOUSING CORPORATION (NHAVA SEVA) PVT. LTD.</h2>
          <p style="font-size: 11px; margin: 2px 0 0 0; font-weight: normal;">Near Nirma Factory, Opposite Jakhwada Railway Station, Village Sachana, Viramgam Taluka, Ahmedabad - 382 150, Gujarat, India.</p>
        </div>

        <!-- Title and Top Right Box -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
          <div style="flex: 1;">
            <h2 style="margin: 0; text-decoration: underline; font-size: 18px; font-weight: bold;">CONSIGNMENT NOTE</h2>
            <p style="margin: 2px 0; font-weight: bold;">Mode By : ${statusDetails.railRoad ? statusDetails.railRoad.toUpperCase() : "Rail / Road"}</p>
            <p style="margin: 2px 0; font-weight: bold;">INVOICE NO:- ${invoiceNosInfo}</p>
          </div>
          <div style="border: 1px solid black; padding: 5px; width: 250px;">
            <div style="text-align: center; font-weight: bold; border-bottom: 1px solid black; padding-bottom: 2px; margin-bottom: 2px;">CWC (NS) PVT. LTD. USE</div>
            <p style="margin: 2px 0; font-size: 12px;">CCN No. & Date :</p>
            <p style="margin: 2px 0; font-size: 12px;">To :</p>
            <p style="margin: 2px 0; font-size: 12px;">Rail Operator :</p>
          </div>
        </div>

        <!-- Address Block -->
        <div style="margin-bottom: 10px;">
          <p style="margin: 0;"><strong>To,</strong></p>
          <p style="margin: 0;"><strong>The Terminal Manager,</strong></p>
          <p style="margin: 2px 0;"><strong>CWC (NS) PVT. LTD. Sachana</strong></p>
          <p style="text-align: right; margin: 2px 0; font-weight: bold;">Cargo : Non Hazardous</p>
          <p style="font-size: 11px; text-align: justify; margin: 5px 0; line-height: 1.2; font-weight: 600;">
            Please receive the under mentioned container stuffed at ICD/Factory. We accept the all Transportation and/or provision of Containers of business incidental there to have been under taken by CWC(NS) PVT. LTD. on the basis of their standard terms and conditions which have been read by us and understood. No servant or agent of the company has any authority to vary or waive conditions or any part there of.
          </p>
        </div>

        <!-- Details Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 12px;">
          <tr>
            <td style="border: 1px solid black; padding: 4px; width: 50%; vertical-align: top;">
              <div style="margin-bottom: 2px;"><strong>Shipping Line</strong></div>
              <div>${data.shipping_line_airline || ""}</div>
            </td>
            <td style="border: 1px solid black; padding: 4px; width: 50%; vertical-align: top;">
              <div style="margin-bottom: 2px;"><strong>Booking No</strong></div>
              <div>${data.booking_no || ""}</div>
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top;">
               <div style="margin-bottom: 2px;"><strong>Agent / CHA</strong></div>
               <div>${data.cha || "SURAJ FORWARDERS & SHIPPING AGENCIES"}</div>
            </td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top;">
              <div style="display: flex; gap: 10px;">
                <div style="flex: 1;">
                   <div style="margin-bottom: 2px;"><strong>Final Destination</strong></div>
                   <div>${data.destination_port || ""}</div>
                </div>
                <div style="flex: 1;">
                   <div style="margin-bottom: 2px;"><strong>Country</strong></div>
                   <div>${data.destination_country || ""}</div>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top;">
               <div style="margin-bottom: 2px;"><strong>Name & Address of Exporter</strong></div>
               <div>${data.exporter || ""}</div>
               <div>${data.exporter_address || ""}</div>
            </td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top;">
               <div style="margin-bottom: 2px;"><strong>Gateway Port</strong></div>
               <div>${data.gateway_port || data.port_of_loading || ""}</div>
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top;">
               <div style="margin-bottom: 2px;"><strong>Shipping Bill No. & Date</strong></div>
               <div>${sbNosInfo}</div>
            </td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top;">
               <div style="margin-bottom: 2px;"><strong>Port of Discharge</strong></div>
               <div>${data.port_of_discharge || ""}</div>
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top;">
               <div style="margin-bottom: 2px;"><strong>Stuffing</strong></div>
               <div>${data.goods_stuffed_at === "Factory" ? "FACTORY (FS)" : "ICD (CFS)"}</div>
            </td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top;">
               <div style="margin-bottom: 2px;"><strong>F.O.B./C.I.F. Value</strong></div>
               <div>FOB: ${fobInInr} INR</div>
               <div>INVVAL: ${invInInr} INR</div>
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top;">
               <div style="margin-bottom: 2px;"><strong>VESSEL NAME AND VOYAGE</strong></div>
               <div>${data.vessel_name || ""} ${data.voyage_no || ""}</div>
            </td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top;">
               <div style="margin-bottom: 2px;"><strong>LEO Date</strong></div>
               <div>${leoDatesInfo}</div>
            </td>
          </tr>
        </table>

        <!-- Sub-header for Container Table -->
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 5px;">
           <span>Factory stuffing arranged by: SHIPPER</span>
           <span>Type: LCL/FCL/ODC: Yes/No.</span>
           <span>Payment Type: PAID / TO PAY</span>
        </div>

        <!-- Container Table -->
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: center; margin-bottom: 10px;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th style="border: 1px solid black; padding: 4px; vertical-align: middle;">Sr No</th>
              <th style="border: 1px solid black; padding: 4px; vertical-align: middle;">Container No</th>
              <th style="border: 1px solid black; padding: 4px; vertical-align: middle;">Size</th>
              <th style="border: 1px solid black; padding: 4px; vertical-align: middle;">No & Type of Pkgs.</th>
              <th style="border: 1px solid black; padding: 4px; vertical-align: middle;">Description of Goods</th>
              <th style="border: 1px solid black; padding: 4px; vertical-align: middle;">Cargo Weight (MT)</th>
              <th style="border: 1px solid black; padding: 4px; vertical-align: middle;">Customs Seal No.</th>
              <th style="border: 1px solid black; padding: 4px; vertical-align: middle;">S.Line/Agent Seal No.</th>
              <th style="border: 1px solid black; padding: 4px; vertical-align: middle;">SB NO.</th>
              <th style="border: 1px solid black; padding: 4px; vertical-align: middle;">SB DATE</th>
            </tr>
          </thead>
          <tbody>
            ${containersRows}
          </tbody>
        </table>

        <!-- Certifications Table -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 11px; font-weight: bold; border: 2px solid black;">
          <tr>
            <td style="border: 1px solid black; width: 30px; text-align: center; vertical-align: middle; padding: 4px;">1</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: middle;">I do hereby certify that I have satisfied by self description, marks, quantity, measurement and weight of goods consigned by me have been correctly entered in the note.</td>
          </tr>
          <tr>
            <td style="border: 1px solid black; width: 30px; text-align: center; vertical-align: middle; padding: 4px;">2</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: middle; text-align: center;">I hereby certify that the goods described above are in good order and condition at the time of dispatch.</td>
          </tr>
          <tr>
            <td style="border: 1px solid black; width: 30px; text-align: center; vertical-align: middle; padding: 4px;">3</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: middle; text-align: center;">I hereby certify that goods are not classified as dangerous in Indian Railway / Road Tariff of my IMO regulations.</td>
          </tr>
          <tr>
            <td style="border: 1px solid black; width: 30px; text-align: center; vertical-align: middle; padding: 4px;">4</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: middle; text-align: center;">It is certified that rated tonnage of the container (s) has not been exceeded.</td>
          </tr>
          <tr>
            <td style="border: 1px solid black; width: 30px; text-align: center; vertical-align: middle; padding: 4px;">5</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: middle; text-align: center;">IF THE CONTAINER WEIGHT IS NOT SPECIFIED THEIR TARE WEIGHT WILL BE TAKEN AS 2.3 TONS FOR 20' & 4.6 TONS FOR 40'.</td>
          </tr>
          <tr>
            <td style="border: 1px solid black; width: 30px; text-align: center; vertical-align: middle; padding: 4px;">6</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: middle; text-align: center;">I understand that the principal terms and conditions applying to the carriage of above containers are subject to the conditions and liabilities as specified in the Indian Railway Act 1989, as amended from time to time.</td>
          </tr>
        </table>

        <!-- Signatures Table -->
        <table style="width: 100%; border-collapse: collapse; border: 2px solid black; border-top: none; font-size: 11px; font-weight: bold; height: 120px;">
          <tr>
            <td style="border: 1px solid black; width: 70%; padding: 5px; vertical-align: top;">
               <div style="margin-bottom: 25px;">PDA A/C / Cheque No):</div>
               <div>PDA/PDC:</div>
            </td>
            <td style="border: 1px solid black; width: 30%; padding: 5px; text-align: center; vertical-align: top;">
               <div style="margin-bottom: 25px;">PDA/PDC SURAJ FORWARDERS</div>
               <div style="text-transform: uppercase;">STAMP AND SIGNATURE</div>
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid black; padding: 5px; vertical-align: bottom;">
               DATE : ${formatDate(new Date())}
            </td>
            <td style="border: 1px solid black; padding: 5px; text-align: center; vertical-align: bottom;">
               CWC (NS) PVT. LTD. USE ONLY
            </td>
          </tr>
        </table>
      </div>
    `;
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

      // Column widths
      worksheet.columns = [
        { width: 6 },   // A: Sr No
        { width: 18 },  // B: Container No
        { width: 8 },   // C: Size
        { width: 14 },  // D: No & Type of Pkgs.
        { width: 35 },  // E: Description of Goods
        { width: 14 },  // F: Cargo Weight (MT)
        { width: 18 },  // G: Customs Seal No.
        { width: 18 },  // H: S.Line/Agent Seal No.
        { width: 14 },  // I: SB NO.
        { width: 14 }   // J: SB DATE
      ];

      for (let r = 1; r <= 150; r++) {
        worksheet.getRow(r).height = 18;
      }

      // Title Block
      worksheet.mergeCells("A1:J1");
      worksheet.getCell("A1").value = "DP WORLD CONTINENTAL WAREHOUSING CORPORATION (NHAVA SEVA) PVT. LTD.";
      worksheet.getCell("A1").font = { name: "Arial", bold: true, size: 14 };
      worksheet.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };

      worksheet.mergeCells("A2:J2");
      worksheet.getCell("A2").value = "Near Nirma Factory, Opposite Jakhwada Railway Station, Village Sachana, Viramgam Taluka, Ahmedabad - 382 150, Gujarat, India.";
      worksheet.getCell("A2").font = { name: "Arial", size: 8 };
      worksheet.getCell("A2").alignment = { vertical: "middle", horizontal: "center" };

      // CCN Row
      worksheet.getRow(3).height = 24;
      worksheet.mergeCells("A3:F4");
      worksheet.getCell("A3").value = "CONSIGNMENT NOTE";
      worksheet.getCell("A3").font = { name: "Arial", bold: true, size: 14, underline: true };
      worksheet.getCell("A3").alignment = { vertical: "middle", horizontal: "left" };

      worksheet.mergeCells("G3:J3");
      worksheet.getCell("G3").value = "CWC (NS) PVT. LTD. USE";
      worksheet.getCell("G3").font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell("G3").alignment = { vertical: "middle", horizontal: "center" };
      worksheet.getCell("G3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } };

      worksheet.mergeCells("G4:J4");
      worksheet.getCell("G4").value = "CCN No. & Date : ";
      worksheet.getCell("G4").font = { name: "Arial", size: 8 };
      worksheet.getCell("G4").alignment = { vertical: "middle", horizontal: "left" };

      // To / Cargo
      worksheet.mergeCells("A5:F5");
      worksheet.getCell("A5").value = "To,\nThe Terminal Manager,\nCWC (NS) PVT. LTD. Sachana";
      worksheet.getCell("A5").font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell("A5").alignment = { vertical: "top", horizontal: "left", wrapText: true };
      worksheet.getRow(5).height = 40;

      worksheet.mergeCells("G5:J5");
      worksheet.getCell("G5").value = "Cargo : Non Hazardous";
      worksheet.getCell("G5").font = { name: "Arial", bold: true, size: 10 };
      worksheet.getCell("G5").alignment = { vertical: "middle", horizontal: "right" };

      // Disclaimer
      worksheet.getRow(6).height = 32;
      worksheet.mergeCells("A6:J6");
      worksheet.getCell("A6").value = "Please receive the under mentioned container stuffed at ICD/Factory. We accept the all Transportation and/or provision of Containers of business incidental there to have been under taken by CWC(NS) PVT. LTD. on the basis of their standard terms and conditions which have been read by us and understood. No servant or agent of the company has any authority to vary or waive conditions or any part there of.";
      worksheet.getCell("A6").font = { name: "Arial", size: 7.5 };
      worksheet.getCell("A6").alignment = { vertical: "middle", horizontal: "left", wrapText: true };

      // Setup details block starting row 7
      worksheet.mergeCells("A7:E7");
      worksheet.getCell("A7").value = `Shipping Line:  ${jobData.shipping_line_airline || ""}`;
      worksheet.mergeCells("F7:J7");
      worksheet.getCell("F7").value = `Booking No:  ${jobData.booking_no || ""}`;

      worksheet.mergeCells("A8:E8");
      worksheet.getCell("A8").value = `Agent / CHA:  ${jobData.cha || "SURAJ FORWARDERS & SHIPPING AGENCIES"}`;
      worksheet.mergeCells("F8:H8");
      worksheet.getCell("F8").value = `Final Destination:  ${jobData.destination_port || ""}`;
      worksheet.mergeCells("I8:J8");
      worksheet.getCell("I8").value = `Country:  ${jobData.destination_country || ""}`;

      worksheet.mergeCells("A9:E9");
      worksheet.getCell("A9").value = `Exporter:  ${jobData.exporter || ""}\n${jobData.exporter_address || ""}`;
      worksheet.getCell("A9").alignment = { vertical: "top", horizontal: "left", wrapText: true };
      worksheet.mergeCells("F9:J9");
      worksheet.getCell("F9").value = `Gateway Port:  ${jobData.gateway_port || jobData.port_of_loading || ""}`;

      worksheet.getRow(9).height = 35;

      let sbNosInfo = `${jobData.sb_no || ""} / ${formatDate(jobData.sb_date)}`;
      let leoDatesInfo = formatDate(jobData.operations?.[0]?.statusDetails?.[0]?.leoDate);
      let invoiceNosInfo = jobData.invoices?.map((inv) => inv.invoiceNumber).join(", ") || "";

      const totalFobVal = [jobData, ...clubbedJobsData].reduce((sum, job) => {
        const val = (job.invoices || []).reduce((s, inv) => {
          return s + (Number(inv.freightInsuranceCharges?.fobValue?.amount || inv.productValue || 0));
        }, 0);
        return sum + val;
      }, 0);

      const totalInvoiceVal = [jobData, ...clubbedJobsData].reduce((sum, job) => {
        const val = (job.invoices || []).reduce((s, inv) => {
          return s + (Number(inv.invoiceValue || 0));
        }, 0);
        return sum + val;
      }, 0);

      const fobInInr = (totalFobVal * exchangeRate).toFixed(2);
      const invInInr = (totalInvoiceVal * exchangeRate).toFixed(2);

      if (isClubJob && clubbedJobsData.length > 0) {
        const allInvoices = [invoiceNosInfo, ...clubbedJobsData.map(j => j.invoices?.[0]?.invoiceNumber)].filter(Boolean);
        invoiceNosInfo = allInvoices.join(", ");

        const allSBs = [`${jobData.sb_no || ""} (${formatDate(jobData.sb_date)})`, ...clubbedJobsData.map(j => `${j.sb_no || ""} (${formatDate(j.sb_date)})`)].filter(Boolean);
        sbNosInfo = allSBs.join(", ");

        const allLeos = [leoDatesInfo, ...clubbedJobsData.map(j => formatDate(j.operations?.[0]?.statusDetails?.[0]?.leoDate))].filter(Boolean);
        leoDatesInfo = allLeos.join(", ");
      }

      worksheet.mergeCells("A10:E10");
      worksheet.getCell("A10").value = `Shipping Bill No. & Date:  ${sbNosInfo}`;
      worksheet.mergeCells("F10:J10");
      worksheet.getCell("F10").value = `Port of Discharge:  ${jobData.port_of_discharge || ""}`;

      worksheet.mergeCells("A11:E11");
      worksheet.getCell("A11").value = `Stuffing:  ${jobData.goods_stuffed_at === "Factory" ? "FACTORY (FS)" : "ICD (CFS)"}`;
      worksheet.mergeCells("F11:J11");
      worksheet.getCell("F11").value = `F.O.B./C.I.F. Value: FOB: ${fobInInr} INR | INVVAL: ${invInInr} INR`;

      worksheet.mergeCells("A12:E12");
      worksheet.getCell("A12").value = `Vessel/Voyage:  ${jobData.vessel_name || ""} ${jobData.voyage_no || ""}`;
      worksheet.mergeCells("F12:J12");
      worksheet.getCell("F12").value = `LEO Date:  ${leoDatesInfo}`;

      for (let r = 7; r <= 12; r++) {
        worksheet.getRow(r).eachCell((cell) => {
          cell.font = { name: "Arial", size: 8.5 };
          cell.alignment = cell.alignment || { vertical: "middle", horizontal: "left" };
        });
      }

      // Sub-header Row 14
      worksheet.getRow(14).height = 20;
      worksheet.mergeCells("A14:C14");
      worksheet.getCell("A14").value = "Factory stuffing arranged by: SHIPPER";
      worksheet.mergeCells("D14:F14");
      worksheet.getCell("D14").value = "Type: LCL/FCL/ODC: Yes/No.";
      worksheet.mergeCells("G14:J14");
      worksheet.getCell("G14").value = "Payment Type: PAID / TO PAY";

      ["A14", "D14", "G14"].forEach((cId) => {
        worksheet.getCell(cId).font = { name: "Arial", bold: true, size: 8.5 };
        worksheet.getCell(cId).alignment = { vertical: "middle", horizontal: cId === "G14" ? "right" : "left" };
      });

      // Container Headers
      const headers = ["Sr No", "Container No", "Size", "No & Type of Pkgs.", "Description of Goods", "Cargo Weight (MT)", "Customs Seal No.", "S.Line/Agent Seal No.", "SB NO.5", "SB DATE"];
      worksheet.getRow(15).height = 28;
      headers.forEach((h, cidx) => {
        const cell = worksheet.getCell(15, cidx + 1);
        cell.value = h === "SB NO.5" ? "SB NO." : h;
        cell.font = { name: "Arial", bold: true, size: 9 };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } };
      });

      // Containers Rows
      let currentRow = 16;
      let totalPkgs = 0;
      let totalWeight = 0;
      const aggregatedContainers = getAggregatedContainers(jobData, isClubJob, clubbedJobsData);

      aggregatedContainers.forEach((c, idx) => {
      const uniqueSBsList = [];
      const seenSBs = new Set();
      if (c.uniqueSBs) {
          c.uniqueSBs.forEach(sb => {
             const key = `${sb.sbNo}-${sb.sbDate}`;
             if (!seenSBs.has(key)) {
                 seenSBs.add(key);
                 uniqueSBsList.push(sb);
             }
          });
      }

        worksheet.getRow(currentRow).height = 45;
        const pkgs = Number(c.pkgsStuffed) || 0;
        const weight = Number(c.grossWeight) || 0;
        const weightMT = weight / 1000;
        totalPkgs += pkgs;
        totalWeight += weight;

        worksheet.getCell(currentRow, 1).value = idx + 1;
        worksheet.getCell(currentRow, 2).value = c.containerNo || "";
        worksheet.getCell(currentRow, 3).value = c.type?.match(/\d+/)?.[0] || "20";

        const uniqueSBsListExcel = []; const seenSBsExcel = new Set(); if (c.uniqueSBs) { c.uniqueSBs.forEach((sb, idx) => { const key = sb.sbNo ? `${sb.sbNo}-${sb.sbDate}` : `__empty_${idx}`; if (!seenSBsExcel.has(key)) { seenSBsExcel.add(key); uniqueSBsListExcel.push(sb); } }); } const pkgsText = uniqueSBsListExcel.length > 0 ? uniqueSBsListExcel.map(sb => sb.pkgs || "").join("\n") : (pkgs || "");
        worksheet.getCell(currentRow, 4).value = pkgsText;

        const descText = c.uniqueDescriptions && c.uniqueDescriptions.length > 0 ? c.uniqueDescriptions.join("\n") : (c.descriptionOfGoods || "");
        worksheet.getCell(currentRow, 5).value = descText;

        const weightText = uniqueSBsListExcel.length > 0 ? uniqueSBsListExcel.map(sb => (Number(sb.weight) / 1000).toFixed(3)).join("\n") : (weightMT || "");
        worksheet.getCell(currentRow, 6).value = weightText;

        const uniqueSealsExcel = c.uniqueSBs ? [...new Set(c.uniqueSBs.map(sb => sb.sealNo ? String(sb.sealNo).trim() : '').filter(Boolean))] : [];
        const sealText = uniqueSealsExcel.length > 0 ? uniqueSealsExcel.join("\n") : (c.sealNo || "");
        worksheet.getCell(currentRow, 7).value = sealText;

        const uniqueAgentSealsExcel = c.uniqueSBs ? [...new Set(c.uniqueSBs.map(sb => sb.shippingLineSealNo ? String(sb.shippingLineSealNo).trim() : '').filter(Boolean))] : [];
        const agentSealText = uniqueAgentSealsExcel.length > 0 ? uniqueAgentSealsExcel.join("\n") : (c.shippingLineSealNo || "");
        worksheet.getCell(currentRow, 8).value = agentSealText;

        const uniqueSBNoListExcel = uniqueSBsListExcel.length > 0 ? [...new Set(uniqueSBsListExcel.map(sb => sb.sbNo).filter(Boolean))] : [];
        const sbNoText = uniqueSBNoListExcel.length > 0 ? uniqueSBNoListExcel.join("\n") : (c.sb_no || "");
        worksheet.getCell(currentRow, 9).value = sbNoText;

        const uniqueSBDatesExcel = uniqueSBsListExcel.length > 0 ? [...new Set(uniqueSBsListExcel.map(sb => formatDate(sb.sbDate)).filter(Boolean))] : [];
        const sbDateText = uniqueSBDatesExcel.length > 0 ? uniqueSBDatesExcel.join("\n") : formatDate(c.sb_date);
        worksheet.getCell(currentRow, 10).value = sbDateText;

        worksheet.getRow(currentRow).eachCell((cell, colNum) => {
          cell.font = cell.font || { name: "Arial", size: 9 };
          if (colNum === 2) cell.font.bold = true;
          cell.alignment = { vertical: "middle", horizontal: colNum === 5 ? "left" : "center", wrapText: true };
        });

        currentRow++;
      });

      // Total Row
      worksheet.getRow(currentRow).height = 24;
      worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = "Total:";
      worksheet.getCell(`A${currentRow}`).font = { name: "Arial", bold: true, size: 10 };
      worksheet.getCell(`A${currentRow}`).alignment = { vertical: "middle", horizontal: "right" };

      worksheet.getCell(`D${currentRow}`).value = totalPkgs || "";
      worksheet.getCell(`D${currentRow}`).font = { name: "Arial", bold: true, size: 10 };
      worksheet.getCell(`D${currentRow}`).numFormat = '#,##0';
      worksheet.getCell(`D${currentRow}`).alignment = { vertical: "middle", horizontal: "center" };

      worksheet.getCell(`F${currentRow}`).value = totalWeight / 1000 || "";
      worksheet.getCell(`F${currentRow}`).font = { name: "Arial", bold: true, size: 10 };
      worksheet.getCell(`F${currentRow}`).numFormat = '#,##0.000';
      worksheet.getCell(`F${currentRow}`).alignment = { vertical: "middle", horizontal: "center" };

      worksheet.mergeCells(`G${currentRow}:J${currentRow}`);

      currentRow++;

      // Certifications List (Rows 1-6)
      const certs = [
        "I do hereby certify that I have satisfied by self description, marks, quantity, measurement and weight of goods consigned by me have been correctly entered in the note.",
        "I hereby certify that the goods described above are in good order and condition at the time of dispatch.",
        "I hereby certify that goods are not classified as dangerous in Indian Railway / Road Tariff of my IMO regulations.",
        "It is certified that rated tonnage of the container (s) has not been exceeded.",
        "IF THE CONTAINER WEIGHT IS NOT SPECIFIED THEIR TARE WEIGHT WILL BE TAKEN AS 2.3 TONS FOR 20' & 4.6 TONS FOR 40'.",
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

      // Signature Area (merged columns A-G, H-J)
      worksheet.getRow(currentRow).height = 40;
      worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = `PDA A/C / Cheque No):\n\nPDA/PDC:`;
      worksheet.getCell(`A${currentRow}`).font = { name: "Arial", bold: true, size: 8.5 };
      worksheet.getCell(`A${currentRow}`).alignment = { vertical: "top", horizontal: "left", wrapText: true };

      worksheet.mergeCells(`H${currentRow}:J${currentRow}`);
      worksheet.getCell(`H${currentRow}`).value = `PDA/PDC SURAJ FORWARDERS\n\nSTAMP AND SIGNATURE`;
      worksheet.getCell(`H${currentRow}`).font = { name: "Arial", bold: true, size: 8.5 };
      worksheet.getCell(`H${currentRow}`).alignment = { vertical: "top", horizontal: "center", wrapText: true };

      currentRow++;

      // Date / Stamp Sign
      worksheet.getRow(currentRow).height = 22;
      worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = `DATE : ${formatDate(new Date())}`;
      worksheet.getCell(`A${currentRow}`).font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell(`A${currentRow}`).alignment = { vertical: "middle", horizontal: "left" };

      worksheet.mergeCells(`H${currentRow}:J${currentRow}`);
      worksheet.getCell(`H${currentRow}`).value = "CWC (NS) PVT. LTD. USE ONLY";
      worksheet.getCell("H" + currentRow).font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell("H" + currentRow).alignment = { vertical: "middle", horizontal: "center" };

      currentRow++;

      // Apply borders
      const borderStyle = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };

      for (let r = 7; r < currentRow; r++) {
        if (r === 13 || r === 14) continue; // Skip separator lines
        const rowObj = worksheet.getRow(r);
        for (let c = 1; c <= 10; c++) {
          rowObj.getCell(c).border = borderStyle;
        }
      }

      // Save
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
          doc.save(`Consignment_Note_${jobNo}.pdf`);
        },
        x: 15,
        y: 15,
        width: 545,
        windowWidth: 900,
        margin: [20, 15, 30, 15],
        autoPaging: true,
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
        <MenuItem onClick={generateHTML}>Consignment Note</MenuItem>
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
        title={`Consignment Note - ${jobNo}`}
      />
    </>
  );
};

export default ConsignmentNoteGenerator;