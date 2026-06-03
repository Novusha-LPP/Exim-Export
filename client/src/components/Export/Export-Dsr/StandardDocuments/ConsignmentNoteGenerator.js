import React, { useState } from "react";
import axios from "axios";
import { MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import jsPDF from "jspdf";
import DocumentEditorDialog from "./DocumentEditorDialog";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const ConsignmentNoteGenerator = ({ jobNo, children }) => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [jobData, setJobData] = useState(null);

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

  const generateHTML = async (e) => {
    if (e) e.stopPropagation();
    const encodedJobNo = encodeURIComponent(jobNo);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/get-export-job/${encodedJobNo}`
      );
      const data = response.data;
      setJobData(data);

      const invoice = data.invoices?.[0] || {};
      const statusDetails = data.operations?.[0]?.statusDetails?.[0] || {};
      const containers = data.containers || [];
      const products = invoice.products || [];

      // Fetch Currency Rates
      let exchangeRate = 1;
      try {
        const jobDateFormatted = formatDateForApi(data.job_date || new Date());
        const currencyResponse = await axios.get(
          `${import.meta.env.VITE_API_STRING
          }/currency-rates/by-date/${jobDateFormatted}`
        );
        if (
          currencyResponse.data.success &&
          currencyResponse.data.data.exchange_rates
        ) {
          const rateObj = currencyResponse.data.data.exchange_rates.find(
            (r) => r.currency_code === (invoice.currency || "USD")
          );
          if (rateObj) {
            exchangeRate = rateObj.export_rate || rateObj.import_rate || 1;
          }
        }
      } catch (err) {
        console.warn("Currency rate fetch failed", err);
      }

      // Calculations
      const totalFobVal = (data.invoices || []).reduce((sum, inv) => {
        const val =
          inv.freightInsuranceCharges?.fobValue?.amount ||
          inv.productValue ||
          0;
        return sum + (Number(val) || 0);
      }, 0);
      const totalInvoiceVal = (data.invoices || []).reduce((sum, inv) => {
        return sum + (Number(inv.invoiceValue) || 0);
      }, 0);

      const fobInInr = (totalFobVal * exchangeRate).toFixed(2);
      const invInInr = (totalInvoiceVal * exchangeRate).toFixed(2);

      const shortenedDescription = products[0]?.description || "";

      let containersRows = "";
      let totalPkgs = 0;
      let totalWeight = 0;

      containers.forEach((c, idx) => {
        const pkgs = Number(c.pkgsStuffed) || 0;
        const weight = Number(c.grossWeight) || 0;
        const weightMT = (weight / 1000).toFixed(3);
        totalPkgs += pkgs;
        totalWeight += weight;

        containersRows += `
          <tr>
            <td style="border: 1px solid black; padding: 4px; vertical-align: middle;">${idx + 1}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: middle;">${c.containerNo || ""}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: middle;">${c.type?.match(/\d+/)?.[0] || "20"}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: middle;">${pkgs || ""}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: left; vertical-align: middle;">${shortenedDescription}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: middle;">${weightMT || ""}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: middle;">${c.sealNo || ""}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: middle;">${c.shippingLineSealNo || ""}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: middle;">${data.sb_no || ""}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: middle;">${formatDate(data.sb_date)}</td>
          </tr>
        `;
      });

      // Total Row
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

      const template = `
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
              <p style="margin: 2px 0; font-weight: bold;">INVOICE NO:- ${data.invoices?.map((inv) => inv.invoiceNumber).join(", ") || ""}</p>
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
                 <div>${data.sb_no || ""} / ${formatDate(data.sb_date)}</div>
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
                 <div>${formatDate(statusDetails.leoDate)}</div>
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
              <td style="border: 1px solid black; padding: 4px; vertical-align: middle;">I hereby certify that the goods described above are in goods order and condition at the time of dispatch.</td>
            </tr>
            <tr>
              <td style="border: 1px solid black; width: 30px; text-align: center; vertical-align: middle; padding: 4px;">3</td>
              <td style="border: 1px solid black; padding: 4px; vertical-align: middle;">I hereby certify that goods are not classified as dangerous in Indian Railway. Road Tariff of my IMO regulations.</td>
            </tr>
            <tr>
              <td style="border: 1px solid black; width: 30px; text-align: center; vertical-align: middle; padding: 4px;">4</td>
              <td style="border: 1px solid black; padding: 4px; vertical-align: middle;">It is certify that rated tonnage of the commitment (5) has been exceeded.</td>
            </tr>
            <tr>
              <td style="border: 1px solid black; width: 30px; text-align: center; vertical-align: middle; padding: 4px;">5</td>
              <td style="border: 1px solid black; padding: 4px; vertical-align: middle;">IF THE CONTAINER WEIGHT, IS NOT SPECIFIED THEIR TARE WEIGHT, IT WILL BE TAKEN AS 2.3 TONS FOR 20' & 4.6 TONS FOR 40'</td>
            </tr>
            <tr>
              <td style="border: 1px solid black; width: 30px; text-align: center; vertical-align: middle; padding: 4px;">6</td>
              <td style="border: 1px solid black; padding: 4px; vertical-align: middle;">I understand that the principal terms and conditions applying to the carriage of above containers are subject to the conditions and liabilities as specified in the Indian Railway Act 1989, as amended from time to time.</td>
            </tr>
          </table>

          <!-- Signature / Footer Section - Avoid Page Break -->
          <!-- Footer Table to ensure block stays together -->
          <table style="width: 100%; margin-top: 10px; page-break-inside: avoid; break-inside: avoid;">
            <tr style="page-break-inside: avoid; break-inside: avoid;">
                <td style="border: none; padding: 0;">
                    <div style="border: 1px solid black; padding: 10px; margin-bottom: 20px; min-height: 40px; font-size: 12px; page-break-inside: avoid; break-inside: avoid;">
                      <strong>Remarks, if any (PDA A/C/Cheque No):</strong>
                    </div>

                    <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 12px; page-break-inside: avoid; break-inside: avoid;">
                      <div>DATE ________________________</div>
                      <div style="text-align: right;">STAMP AND SIGNATURE OF SHIPPER OR AGENT (CHA)</div>
                    </div>

                    <div style="border: 1px solid black; padding: 10px; margin-top: 30px; font-size: 12px; page-break-inside: avoid; break-inside: avoid;">
                       <strong>CES (NS) PVT. LTD.</strong><br/>
                       DATE & TIME OF BOOKING OR (EA) :
                    </div>
                </td>
            </tr>
          </table>

        </div>
      `;

      setHtmlContent(template);
      setChoiceOpen(true);
    } catch (err) {
      console.error("Error generating Consignment Note:", err);
      alert("Failed to generate Consignment Note");
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

      // Column Widths
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

      // Defaults
      for (let r = 1; r <= 100; r++) {
        worksheet.getRow(r).height = 20;
      }

      // Title & Address
      worksheet.mergeCells("A1:J1");
      worksheet.getCell("A1").value = "DP WORLD CONTINENTAL WAREHOUSING CORPORATION (NHAVA SEVA) PVT. LTD.";
      worksheet.getCell("A1").font = { name: "Arial", bold: true, size: 14 };
      worksheet.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };

      worksheet.mergeCells("A2:J2");
      worksheet.getCell("A2").value = "Near Nirma Factory, Opposite Jakhwada Railway Station, Village Sachana, Viramgam Taluka, Ahmedabad - 382 150, Gujarat, India.";
      worksheet.getCell("A2").font = { name: "Arial", size: 8 };
      worksheet.getCell("A2").alignment = { vertical: "middle", horizontal: "center" };

      worksheet.mergeCells("A3:G4");
      worksheet.getCell("A3").value = "CONSIGNMENT NOTE";
      worksheet.getCell("A3").font = { name: "Arial", bold: true, size: 18 };
      worksheet.getCell("A3").alignment = { vertical: "middle", horizontal: "left" };

      // Top Right CWC Use Box
      worksheet.mergeCells("H3:J3");
      worksheet.getCell("H3").value = "CWC (NS) PVT. LTD. USE";
      worksheet.getCell("H3").font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell("H3").alignment = { vertical: "middle", horizontal: "center" };
      worksheet.getCell("H3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } };
      worksheet.getCell("I3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } };
      worksheet.getCell("J3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } };

      worksheet.mergeCells("H4:J4");
      worksheet.getCell("H4").value = "CCN No. & Date :";
      worksheet.getCell("H4").font = { name: "Arial", size: 8 };
      worksheet.getCell("H4").alignment = { vertical: "middle", horizontal: "left" };

      worksheet.mergeCells("H5:J5");
      worksheet.getCell("H5").value = "To :";
      worksheet.getCell("H5").font = { name: "Arial", size: 8 };
      worksheet.getCell("H5").alignment = { vertical: "middle", horizontal: "left" };

      worksheet.mergeCells("H6:J6");
      worksheet.getCell("H6").value = "Rail Operator :";
      worksheet.getCell("H6").font = { name: "Arial", size: 8 };
      worksheet.getCell("H6").alignment = { vertical: "middle", horizontal: "left" };

      // Left Mode & Invoice info
      worksheet.mergeCells("A5:G6");
      const invoiceNumbers = (jobData.invoices || []).map((inv) => inv.invoiceNumber).join(", ");
      const statusDetails = jobData.operations?.[0]?.statusDetails?.[0] || {};
      worksheet.getCell("A5").value = `Mode By : ${statusDetails.railRoad ? statusDetails.railRoad.toUpperCase() : "RAIL / ROAD"}\nINVOICE NO:- ${invoiceNumbers}`;
      worksheet.getCell("A5").font = { name: "Arial", bold: true, size: 10 };
      worksheet.getCell("A5").alignment = { vertical: "middle", horizontal: "left", wrapText: true };

      // To Terminal Manager
      worksheet.mergeCells("A7:G7");
      worksheet.getCell("A7").value = "To,\nThe Terminal Manager,\nCWC (NS) PVT. LTD. Sachana";
      worksheet.getCell("A7").font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell("A7").alignment = { vertical: "top", horizontal: "left", wrapText: true };
      worksheet.getRow(7).height = 40;

      worksheet.mergeCells("H7:J7");
      worksheet.getCell("H7").value = "Cargo : Non Hazardous";
      worksheet.getCell("H7").font = { name: "Arial", bold: true, size: 10 };
      worksheet.getCell("H7").alignment = { vertical: "middle", horizontal: "right" };

      // Disclaimer
      worksheet.mergeCells("A8:J8");
      worksheet.getRow(8).height = 35;
      worksheet.getCell("A8").value = "Please receive the under mentioned container stuffed at ICD/Factory. We accept the all Transportation and/or provision of Containers of business incidental there to have been under taken by CWC(NS) PVT. LTD. on the basis of their standard terms and conditions which have been read by us and understood. No servant or agent of the company has any authority to vary or waive conditions or any part there of.";
      worksheet.getCell("A8").font = { name: "Arial", size: 7.5 };
      worksheet.getCell("A8").alignment = { vertical: "middle", horizontal: "left", wrapText: true };

      // Details block rows 9-14
      const rowHeights = { 9: 30, 10: 30, 11: 36, 12: 30, 13: 30, 14: 30 };
      Object.keys(rowHeights).forEach((r) => {
        worksheet.getRow(Number(r)).height = rowHeights[r];
        worksheet.mergeCells(`A${r}:E${r}`);
        worksheet.mergeCells(`F${r}:J${r}`);
      });

      // Fetch rates & calculate FOB/Invoice value in INR
      const invoice = jobData.invoices?.[0] || {};
      let exchangeRate = 1;
      try {
        const jobDateFormatted = formatDateForApi(jobData.job_date || new Date());
        const currencyResponse = await axios.get(
          `${import.meta.env.VITE_API_STRING}/currency-rates/by-date/${jobDateFormatted}`
        );
        if (currencyResponse.data.success && currencyResponse.data.data.exchange_rates) {
          const rateObj = currencyResponse.data.data.exchange_rates.find(
            (r) => r.currency_code === (invoice.currency || "USD")
          );
          if (rateObj) {
            exchangeRate = rateObj.export_rate || rateObj.import_rate || 1;
          }
        }
      } catch (err) {
        console.warn("Currency rate fetch failed for Excel", err);
      }

      const totalFobVal = (jobData.invoices || []).reduce((sum, inv) => {
        const val = inv.freightInsuranceCharges?.fobValue?.amount || inv.productValue || 0;
        return sum + (Number(val) || 0);
      }, 0);
      const totalInvoiceVal = (jobData.invoices || []).reduce((sum, inv) => {
        return sum + (Number(inv.invoiceValue) || 0);
      }, 0);

      const fobInInr = (totalFobVal * exchangeRate).toFixed(2);
      const invInInr = (totalInvoiceVal * exchangeRate).toFixed(2);

      worksheet.getCell("A9").value = { richText: [{ text: "Shipping Line\n", font: { name: "Arial", size: 8 } }, { text: jobData.shipping_line_airline || "", font: { name: "Arial", bold: true, size: 9 } }] };
      worksheet.getCell("F9").value = { richText: [{ text: "Booking No\n", font: { name: "Arial", size: 8 } }, { text: jobData.booking_no || "", font: { name: "Arial", bold: true, size: 9 } }] };

      worksheet.getCell("A10").value = { richText: [{ text: "Agent / CHA\n", font: { name: "Arial", size: 8 } }, { text: jobData.cha || "SURAJ FORWARDERS & SHIPPING AGENCIES", font: { name: "Arial", bold: true, size: 9 } }] };
      worksheet.getCell("F10").value = { richText: [{ text: "Final Destination / Country\n", font: { name: "Arial", size: 8 } }, { text: `${jobData.destination_port || ""} / ${jobData.destination_country || ""}`, font: { name: "Arial", bold: true, size: 9 } }] };

      worksheet.getCell("A11").value = { richText: [{ text: "Name & Address of Exporter\n", font: { name: "Arial", size: 8 } }, { text: `${jobData.exporter || ""}\n${jobData.exporter_address || ""}`, font: { name: "Arial", bold: true, size: 9 } }] };
      worksheet.getCell("F11").value = { richText: [{ text: "Gateway Port\n", font: { name: "Arial", size: 8 } }, { text: jobData.gateway_port || jobData.port_of_loading || "", font: { name: "Arial", bold: true, size: 9 } }] };

      worksheet.getCell("A12").value = { richText: [{ text: "Shipping Bill No. & Date\n", font: { name: "Arial", size: 8 } }, { text: `${jobData.sb_no || ""} / ${formatDate(jobData.sb_date)}`, font: { name: "Arial", bold: true, size: 9 } }] };
      worksheet.getCell("F12").value = { richText: [{ text: "Port of Discharge\n", font: { name: "Arial", size: 8 } }, { text: jobData.port_of_discharge || "", font: { name: "Arial", bold: true, size: 9 } }] };

      worksheet.getCell("A13").value = { richText: [{ text: "Stuffing\n", font: { name: "Arial", size: 8 } }, { text: jobData.goods_stuffed_at === "Factory" ? "FACTORY (FS)" : "ICD (CFS)", font: { name: "Arial", bold: true, size: 9 } }] };
      worksheet.getCell("F13").value = { richText: [{ text: "F.O.B./C.I.F. Value\n", font: { name: "Arial", size: 8 } }, { text: `FOB: ${fobInInr} INR / INVVAL: ${invInInr} INR`, font: { name: "Arial", bold: true, size: 9 } }] };

      worksheet.getCell("A14").value = { richText: [{ text: "VESSEL NAME AND VOYAGE\n", font: { name: "Arial", size: 8 } }, { text: `${jobData.vessel_name || ""} ${jobData.voyage_no || ""}`, font: { name: "Arial", bold: true, size: 9 } }] };
      worksheet.getCell("F14").value = { richText: [{ text: "LEO Date\n", font: { name: "Arial", size: 8 } }, { text: formatDate(statusDetails.leoDate), font: { name: "Arial", bold: true, size: 9 } }] };

      ["A9", "F9", "A10", "F10", "A11", "F11", "A12", "F12", "A13", "F13", "A14", "F14"].forEach((cId) => {
        worksheet.getCell(cId).alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      });

      // Row 15: Sub-headers
      worksheet.getRow(15).height = 20;
      worksheet.mergeCells("A15:C15");
      worksheet.mergeCells("D15:G15");
      worksheet.mergeCells("H15:J15");
      worksheet.getCell("A15").value = "Factory stuffing arranged by: SHIPPER";
      worksheet.getCell("D15").value = "Type: LCL/FCL/ODC: Yes/No.";
      worksheet.getCell("H15").value = "Payment Type: PAID / TO PAY";
      ["A15", "D15", "H15"].forEach((cId) => {
        worksheet.getCell(cId).font = { name: "Arial", bold: true, size: 8.5 };
        worksheet.getCell(cId).alignment = { vertical: "middle", horizontal: cId === "H15" ? "right" : "left" };
      });

      // Container Headers
      const headers = ["Sr No", "Container No", "Size", "No & Type of Pkgs.", "Description of Goods", "Cargo Weight (MT)", "Customs Seal No.", "S.Line/Agent Seal No.", "SB NO.", "SB DATE"];
      worksheet.getRow(16).height = 28;
      headers.forEach((h, cidx) => {
        const cell = worksheet.getCell(16, cidx + 1);
        cell.value = h;
        cell.font = { name: "Arial", bold: true, size: 9 };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } };
      });

      // Containers Rows
      let currentRow = 17;
      let totalPkgs = 0;
      let totalWeight = 0;
      const containers = jobData.containers || [];
      const invoiceFirst = jobData.invoices?.[0] || {};
      const productFirst = invoiceFirst.products?.[0] || {};
      const shortenedDescription = productFirst.description || "";

      containers.forEach((c, idx) => {
        worksheet.getRow(currentRow).height = 45;
        const pkgs = Number(c.pkgsStuffed) || 0;
        const weight = Number(c.grossWeight) || 0;
        const weightMT = weight / 1000;
        totalPkgs += pkgs;
        totalWeight += weight;

        worksheet.getCell(currentRow, 1).value = idx + 1;
        worksheet.getCell(currentRow, 2).value = c.containerNo || "";
        worksheet.getCell(currentRow, 3).value = c.type?.match(/\d+/)?.[0] || "20";
        worksheet.getCell(currentRow, 4).value = pkgs || "";
        worksheet.getCell(currentRow, 4).numFormat = '#,##0';
        worksheet.getCell(currentRow, 5).value = shortenedDescription;
        worksheet.getCell(currentRow, 6).value = weightMT || "";
        worksheet.getCell(currentRow, 6).numFormat = '#,##0.000';
        worksheet.getCell(currentRow, 7).value = c.sealNo || "";
        worksheet.getCell(currentRow, 8).value = c.shippingLineSealNo || "";
        worksheet.getCell(currentRow, 9).value = jobData.sb_no || "";
        worksheet.getCell(currentRow, 10).value = formatDate(jobData.sb_date);

        // Alignments
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

      // Certifications
      const certs = [
        "I do hereby certify that I have satisfied by self description, marks, quantity, measurement and weight of goods consigned by me have been correctly entered in the note.",
        "I hereby certify that the goods described above are in goods order and condition at the time of dispatch.",
        "I hereby certify that goods are not classified as dangerous in Indian Railway. Road Tariff of my IMO regulations.",
        "It is certify that rated tonnage of the commitment (5) has been exceeded.",
        "IF THE CONTAINER WEIGHT, IS NOT SPECIFIED THEIR TARE WEIGHT, IT WILL BE TAKEN AS 2.3 TONS FOR 20' & 4.6 TONS FOR 40'",
        "I understand that the principal terms and conditions applying to the carriage of above containers are subject to the conditions and liabilities as specified in the Indian Railway Act 1989, as amended from time to time."
      ];

      certs.forEach((cert, cidx) => {
        worksheet.getRow(currentRow).height = 26;
        worksheet.getCell(currentRow, 1).value = cidx + 1;
        worksheet.getCell(currentRow, 1).font = { name: "Arial", bold: true, size: 8 };
        worksheet.getCell(currentRow, 1).alignment = { vertical: "middle", horizontal: "center" };

        worksheet.mergeCells(`B${currentRow}:J${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = cert;
        worksheet.getCell(`B${currentRow}`).font = { name: "Arial", bold: true, size: 8 };
        worksheet.getCell(`B${currentRow}`).alignment = { vertical: "middle", horizontal: "left", wrapText: true };
        currentRow++;
      });

      // Signature / Footer
      worksheet.getRow(currentRow).height = 36;
      worksheet.mergeCells(`A${currentRow}:J${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = "Remarks, if any (PDA A/C/Cheque No):";
      worksheet.getCell(`A${currentRow}`).font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell(`A${currentRow}`).alignment = { vertical: "top", horizontal: "left" };
      currentRow++;

      worksheet.getRow(currentRow).height = 24;
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = `DATE : ${formatDate(new Date())}`;
      worksheet.getCell(`A${currentRow}`).font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell(`A${currentRow}`).alignment = { vertical: "middle", horizontal: "left" };

      worksheet.mergeCells(`F${currentRow}:J${currentRow}`);
      worksheet.getCell(`F${currentRow}`).value = "STAMP AND SIGNATURE OF SHIPPER OR CHA";
      worksheet.getCell(`F${currentRow}`).font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell(`F${currentRow}`).alignment = { vertical: "middle", horizontal: "right" };
      currentRow++;

      worksheet.getRow(currentRow).height = 30;
      worksheet.mergeCells(`A${currentRow}:J${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = "CES (NS) PVT. LTD.\nDATE & TIME OF BOOKING OR (EA) :";
      worksheet.getCell(`A${currentRow}`).font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell(`A${currentRow}`).alignment = { vertical: "top", horizontal: "left", wrapText: true };
      currentRow++;

      // Borders
      const borderStyle = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };

      for (let r = 1; r < currentRow; r++) {
        const rowObj = worksheet.getRow(r);
        for (let c = 1; c <= 10; c++) {
          rowObj.getCell(c).border = borderStyle;
        }
      }

      // Save
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Consignment_Note_${jobNo}.xlsx`);
    } catch (error) {
      console.error("Error generating CWC Consignment Note Excel:", error);
      alert("Failed to generate Excel file.");
    }
  };

  const handleDownloadFNTable = async () => {
    setChoiceOpen(false);
    if (!jobData) {
      alert("No job data loaded.");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("FN Table");

      // Column Widths
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

      // Headers
      const headers = ["Sr No", "Container No", "Size", "No & Type of Pkgs.", "Description of Goods", "Cargo Weight (MT)", "Customs Seal No.", "S.Line/Agent Seal No.", "SB NO.", "SB DATE"];
      worksheet.getRow(1).height = 28;
      headers.forEach((h, cidx) => {
        const cell = worksheet.getCell(1, cidx + 1);
        cell.value = h;
        cell.font = { name: "Arial", bold: true, size: 9 };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } };
      });

      // Containers Rows
      let currentRow = 2;
      let totalPkgs = 0;
      let totalWeight = 0;
      const containers = jobData.containers || [];
      const invoiceFirst = jobData.invoices?.[0] || {};
      const productFirst = invoiceFirst.products?.[0] || {};
      const shortenedDescription = productFirst.description || "";

      containers.forEach((c, idx) => {
        worksheet.getRow(currentRow).height = 45;
        const pkgs = Number(c.pkgsStuffed) || 0;
        const weight = Number(c.grossWeight) || 0;
        const weightMT = weight / 1000;
        totalPkgs += pkgs;
        totalWeight += weight;

        worksheet.getCell(currentRow, 1).value = idx + 1;
        worksheet.getCell(currentRow, 2).value = c.containerNo || "";
        worksheet.getCell(currentRow, 3).value = c.type?.match(/\d+/)?.[0] || "20";
        worksheet.getCell(currentRow, 4).value = pkgs || "";
        worksheet.getCell(currentRow, 4).numFormat = '#,##0';
        worksheet.getCell(currentRow, 5).value = shortenedDescription;
        worksheet.getCell(currentRow, 6).value = weightMT || "";
        worksheet.getCell(currentRow, 6).numFormat = '#,##0.000';
        worksheet.getCell(currentRow, 7).value = c.sealNo || "";
        worksheet.getCell(currentRow, 8).value = c.shippingLineSealNo || "";
        worksheet.getCell(currentRow, 9).value = jobData.sb_no || "";
        worksheet.getCell(currentRow, 10).value = formatDate(jobData.sb_date);

        // Alignments
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

      // Borders
      const borderStyle = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };

      for (let r = 1; r < currentRow; r++) {
        const rowObj = worksheet.getRow(r);
        for (let c = 1; c <= 10; c++) {
          rowObj.getCell(c).border = borderStyle;
        }
      }

      // Save
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `FN_Table_${jobNo}.xlsx`);
    } catch (error) {
      console.error("Error generating Consignment Note FN Table Excel:", error);
      alert("Failed to generate FN Table Excel file.");
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

      {/* Choice Dialog */}
      <Dialog open={choiceOpen} onClose={() => setChoiceOpen(false)}>
        <DialogTitle>Document Action</DialogTitle>
        <DialogContent>
          <div style={{ marginBottom: "10px" }}>
            Do you want to edit the document inline, download PDF, or download Excel?
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChoiceOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleEdit} variant="outlined" color="primary">
            Edit
          </Button>
          <Button onClick={handleDownloadDirectly} variant="contained" color="primary">
            Download PDF
          </Button>
          <Button onClick={handleDownloadExcel} variant="contained" color="success">
            Download Excel
          </Button>
          <Button onClick={handleDownloadFNTable} variant="contained" color="warning">
            Download FN Table
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