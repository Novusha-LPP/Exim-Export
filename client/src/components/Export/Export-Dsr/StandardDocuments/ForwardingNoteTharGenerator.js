import React, { useState } from "react";
import axios from "axios";
import { MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
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

  const generateHTML = async (e) => {
    if (e) e.stopPropagation();
    const encodedJobNo = encodeURIComponent(jobNo);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/get-export-job/${encodedJobNo}`
      );
      const data = response.data;

      // Pre-load logo as base64 to ensure it appears in PDF
      let logoSrc = thatLogo;
      try {
        logoSrc = await imageToBase64(thatLogo);
      } catch (err) {
        console.warn("Failed to convert logo to base64, using original path", err);
      }
      // Calculations and Data Mapping
      const operations = data.operations?.[0] || {};
      const invoice = data.invoices?.[0] || {};
      const statusDetails = operations.statusDetails?.[0] || {};
      const containers = data.containers?.length > 0 ? data.containers : (data.operations?.[0]?.containerDetails || []);
      const products = invoice.products || [];

      // Extract User Information for Footer
      const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
      const generatedBy = (user.first_name || user.user_first_name
        ? `${user.first_name || user.user_first_name || ""} ${user.last_name || user.user_last_name || ""}`.trim()
        : user.username || "System User").toUpperCase();

      // Mapping values
      const consignorName = data.exporter || "";
      const vesselName = data.vessel_name || "";
      const Bookingno = data.booking_no || "";
      const agentCha = "SURAJ FORWARDERS & SHIPPING AGENCIES";
      const cutOffDate = formatDate(data.cut_off_date || data.booking_date);
      const portofLoading = data.port_of_loading || "";
      const dischargeCountry = data.discharge_country || "";
      const exporterAddress = data.exporter || "";
      const gatewayPort = data.gateway_port || data.port_of_loading || "";
      const shippingBillNo = data.sb_no || "";
      const portOfDischarge = data.port_of_discharge || "";
      const stuffingType = data.goods_stuffed_at?.toString().toLowerCase() === "factory" ? "FACTORY" : "ICD (CFS) / FACTORY";
      const shippingLineName = data.shipping_line_airline || "";
      const fobvalue = data.invoices?.[0]?.freightInsuranceCharges?.fobValue?.amount || "";

      const hsnList = [...new Set(products.map(p => {
        if (p.hsn_code || p.hsnCode || p.hsn) return p.hsn_code || p.hsnCode || p.hsn;
        if (p.ritc) {
          if (typeof p.ritc === 'object') return p.ritc.hsnCode || p.ritc.ritcCode;
          return p.ritc;
        }
        return null;
      }).filter(Boolean))].join(", ");

      const descriptionOfGoods = products[0]?.description || "";

      let containersRows = "";
      containers.forEach((c, i) => {
        const pkgs = Number(c.pkgsStuffed) || 0;
        const pkgsDisplay = pkgs ? `${pkgs}` : "";
        const weight = Number(c.grossWeight) || 0;

        containersRows += `
          <tr style="height: 60px;">
            <td style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: top;">${i + 1}</td>
            <td style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: top;">${c.containerNo || ""}</td>
            <td style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: top;">${c.type?.match(/\d+/)?.[0] || "20"}</td>
            <td style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: top;">${pkgsDisplay}</td>
            <td style="border: 1px solid black; padding: 5px; text-align: left; vertical-align: top; font-size: 10px; font-weight: bold; word-wrap: break-word;">${i === 0 ? `<div style="margin-bottom: 5px;"><b>${descriptionOfGoods}</b></div><div>HSN: ${hsnList}</div>` : ""}</td>
            <td style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: top;">${weight}</td>
            <td style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: top;">${c.tareWeightKgs || ""}</td>
            <td style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: top;">${c.sealNo || ""}</td>
            <td style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: top;">${c.shippingLineSealNo || ""}</td>
            <td style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: top;">${i === 0 ? `${shippingBillNo}<br/><br/>dt ${formatDate(data.sb_date)}` : ""}</td>
          </tr>
        `;
      });

      if (containers.length > 0) {
        containersRows += `
          <tr style="height: 30px;">
            <td colspan="3" style="border: 1px solid black; padding: 5px; text-align: right; font-size: 10px; font-weight: bold; vertical-align: middle;">Total:</td>
            <td style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: middle;">${data.total_no_of_pkgs || ""}</td>
            <td style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: middle;"></td>
            <td style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: middle;">${data.gross_weight_kg || ""}</td>
            <td colspan="4" style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; vertical-align: middle;"></td>
          </tr>
        `;
      }

      // Calculate spacer to prevent certifications from breaking across pages
      // jsPDF 'slice' mode renders HTML as one tall canvas then slices at page boundaries.
      // CSS page-break-inside has no effect, so we manually compute a spacer.
      const headerHeight = 510;     // approximate px height of rows 1-9 + table header row
      const containerRowHeight = 60; // each container row is 60px
      const certFooterHeight = 380;  // certifications (6 rows) + footer section
      // A4=842pt, margins [15,0,15,0], usable=812pt. Scale: 595/900≈0.661. Page height in px ≈ 812/0.661 ≈ 1228
      const pageHeightPx = 1228;

      const contentBeforeCert = headerHeight + (containers.length * containerRowHeight) + (containers.length > 0 ? 30 : 0);
      const currentPagePos = contentBeforeCert % pageHeightPx;
      const remainingOnPage = pageHeightPx - currentPagePos;

      let spacerHtml = '';
      if (remainingOnPage < certFooterHeight && remainingOnPage > 0) {
        // Not enough room on current page — push certifications to next page
        spacerHtml = `<div style="height: ${remainingOnPage + 10}px;"></div>`;
      }

      const template = `
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
                <img src="${logoSrc}" alt="Logo" style="max-width: 150px; height: auto;" />
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
                      <div style="font-weight: bold; font-size: 11px; padding-bottom: 10px;">INVOICE NO.: ${data.invoices?.[0]?.invoiceNumber || ""}</div>
                      ${data.exporter_ref_no ? `<div style="font-weight: bold; font-size: 11px; padding-bottom: 10px;">EXPORTER REF NO.: ${data.exporter_ref_no}</div>` : ""}
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

      setJobData({
        consignorName,
        vesselName,
        Bookingno,
        agentCha,
        cutOffDate,
        portofLoading,
        dischargeCountry,
        exporterAddress,
        gatewayPort,
        shippingBillNo,
        portOfDischarge,
        stuffingType,
        shippingLineName,
        fobvalue,
        hsnList,
        descriptionOfGoods,
        containers,
        generatedBy,
        logoSrc,
        sb_date: data.sb_date,
        total_no_of_pkgs: data.total_no_of_pkgs,
        gross_weight_kg: data.gross_weight_kg,
        invoiceNumber: data.invoices?.[0]?.invoiceNumber || "",
        exporter_ref_no: data.exporter_ref_no || "",
        railRoad: statusDetails.railRoad || "RAIL"
      });

      setHtmlContent(template);
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

      // 1. Column Widths
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

      // Row heights defaults
      for (let r = 1; r <= 100; r++) {
        worksheet.getRow(r).height = 20;
      }

      // Helper to draw outer borders for unmerged cell ranges (prevents image stretching in Google Sheets/Excel)
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

      // Add logo image if exists
      if (jobData.logoSrc && jobData.logoSrc.startsWith("data:image")) {
        try {
          const base64Data = jobData.logoSrc.split(",")[1];
          const extension = jobData.logoSrc.match(/image\/(\w+)/)?.[1] || "png";
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

      // Merges
      setOuterBorder(worksheet, 1, 1, 5, 4); // Logo border box without merging
      worksheet.mergeCells("E1:H5"); // Title
      worksheet.mergeCells("I1:J1"); // HPCSL USE
      worksheet.mergeCells("I2:J2"); // CCN No. & Date :
      worksheet.mergeCells("I3:J3"); // To :
      worksheet.mergeCells("I4:J4"); // Rail Operator (Please Specify)
      // I5 and J5 are not merged (HPCSL | blank)

      // Row heights specifically
      worksheet.getRow(1).height = 20;
      worksheet.getRow(2).height = 20;
      worksheet.getRow(3).height = 20;
      worksheet.getRow(4).height = 20;
      worksheet.getRow(5).height = 20;

      // Values
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

      // Row 6 & 7: Destination and Invoice
      worksheet.mergeCells("A6:D7");
      worksheet.mergeCells("E6:G7");
      worksheet.mergeCells("H6:J7");
      worksheet.getRow(6).height = 18;
      worksheet.getRow(7).height = 18;

      worksheet.getCell("A6").value = "To,\nThe Terminal Manager,\nHPCSL, The Thar Dry Port, ICD-Sanand";
      worksheet.getCell("A6").font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell("A6").alignment = { vertical: "top", horizontal: "left", wrapText: true };

      worksheet.getCell("E6").value = `Mode By : ${jobData.railRoad}`;
      worksheet.getCell("E6").font = { name: "Arial", bold: true, size: 11 };
      worksheet.getCell("E6").alignment = { vertical: "middle", horizontal: "center" };

      worksheet.getCell("H6").value = `INVOICE NO.: ${jobData.invoiceNumber}\nEXPORTER REF NO.: ${jobData.exporter_ref_no}\nCargo : Non Hazardous`;
      worksheet.getCell("H6").font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell("H6").alignment = { vertical: "top", horizontal: "right", wrapText: true };

      // Row 8: Disclaimer
      worksheet.mergeCells("A8:J8");
      worksheet.getRow(8).height = 35;
      worksheet.getCell("A8").value = "Please receive the under mentioned container stuffed at ICD/Factory. We accept the all Transportation and/or provision of Containers of business incidental there to have been under taken by HPCSL-THE THAR DRY PORT on the basis of their standard terms and conditions which have been read by us and understood. No servant or agent of the company has any authority to vary or waive conditions or any part there of.";
      worksheet.getCell("A8").font = { name: "Arial", size: 7.5 };
      worksheet.getCell("A8").alignment = { vertical: "middle", horizontal: "left", wrapText: true };

      // Row 9 & 10: Consignor and Vessel
      worksheet.mergeCells("A9:E10");
      worksheet.mergeCells("F9:J10");
      worksheet.getRow(9).height = 18;
      worksheet.getRow(10).height = 18;

      worksheet.getCell("A9").value = {
        richText: [
          { text: "Name of Consignor (S/Line) :\n", font: { name: "Arial", size: 8, color: { argb: "FF333333" } } },
          { text: jobData.shippingLineName, font: { name: "Arial", bold: true, size: 10 } }
        ]
      };
      worksheet.getCell("A9").alignment = { vertical: "top", horizontal: "left", wrapText: true };

      worksheet.getCell("F9").value = {
        richText: [
          { text: "VESSEL NAME : ", font: { name: "Arial", bold: true, size: 9 } },
          { text: jobData.vesselName + "\n", font: { name: "Arial", bold: true, size: 9 } },
          { text: "BOOKING NO : ", font: { name: "Arial", bold: true, size: 9 } },
          { text: jobData.Bookingno, font: { name: "Arial", bold: true, size: 9 } }
        ]
      };
      worksheet.getCell("F9").alignment = { vertical: "top", horizontal: "left", wrapText: true };

      // Row 11: Agent, Cut-off date, Country
      worksheet.mergeCells("A11:E11");
      worksheet.mergeCells("F11:H11");
      worksheet.mergeCells("I11:J11");
      worksheet.getRow(11).height = 30;

      worksheet.getCell("A11").value = `Agent/CHA : ${jobData.agentCha}`;
      worksheet.getCell("A11").font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell("A11").alignment = { vertical: "middle", horizontal: "left" };

      worksheet.getCell("F11").value = `Cut-Off Date.: ${jobData.cutOffDate}`;
      worksheet.getCell("F11").font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell("F11").alignment = { vertical: "middle", horizontal: "left" };

      worksheet.getCell("I11").value = {
        richText: [
          { text: "Country\n", font: { name: "Arial", size: 8, color: { argb: "FF333333" } } },
          { text: jobData.dischargeCountry, font: { name: "Arial", bold: true, size: 9 } }
        ]
      };
      worksheet.getCell("I11").alignment = { vertical: "middle", horizontal: "center", wrapText: true };

      // Row 12 & 13: Exporter and Gateway Port
      worksheet.mergeCells("A12:E13");
      worksheet.mergeCells("F12:J13");
      worksheet.getRow(12).height = 18;
      worksheet.getRow(13).height = 18;

      worksheet.getCell("A12").value = {
        richText: [
          { text: "Name and Address of Exporter :\n", font: { name: "Arial", size: 8, color: { argb: "FF333333" } } },
          { text: jobData.exporterAddress, font: { name: "Arial", bold: true, size: 10 } }
        ]
      };
      worksheet.getCell("A12").alignment = { vertical: "top", horizontal: "left", wrapText: true };

      worksheet.getCell("F12").value = {
        richText: [
          { text: "Gateway Port;  ", font: { name: "Arial", bold: true, size: 11 } },
          { text: jobData.gatewayPort, font: { name: "Arial", bold: true, size: 20 } }
        ]
      };
      worksheet.getCell("F12").alignment = { vertical: "middle", horizontal: "center" };

      const yellowFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
      for (let r = 12; r <= 13; r++) {
        for (let c = 6; c <= 10; c++) {
          worksheet.getCell(r, c).fill = yellowFill;
        }
      }

      // Row 14: SB No and Port of Discharge
      worksheet.mergeCells("A14:E14");
      worksheet.mergeCells("F14:J14");
      worksheet.getRow(14).height = 32;

      worksheet.getCell("A14").value = {
        richText: [
          { text: "SHIPPING BILL NO.\n", font: { name: "Arial", size: 8, color: { argb: "FF333333" } } },
          { text: jobData.shippingBillNo, font: { name: "Arial", bold: true, size: 10 } }
        ]
      };
      worksheet.getCell("A14").alignment = { vertical: "top", horizontal: "left", wrapText: true };

      worksheet.getCell("F14").value = {
        richText: [
          { text: "Port of Discharge : ", font: { name: "Arial", size: 9 } },
          { text: jobData.portOfDischarge, font: { name: "Arial", bold: true, size: 10 } }
        ]
      };
      worksheet.getCell("F14").alignment = { vertical: "middle", horizontal: "left" };

      // Row 15: Stuffing and FOB value
      worksheet.mergeCells("A15:E15");
      worksheet.mergeCells("F15:J15");
      worksheet.getRow(15).height = 32;

      worksheet.getCell("A15").value = {
        richText: [
          { text: "Stuffing (Please Tick) F/S\n", font: { name: "Arial", size: 8, color: { argb: "FF333333" } } },
          { text: jobData.stuffingType, font: { name: "Arial", bold: true, size: 10 } }
        ]
      };
      worksheet.getCell("A15").alignment = { vertical: "top", horizontal: "left", wrapText: true };

      worksheet.getCell("F15").value = {
        richText: [
          { text: "F.O.B./C.I.F. Value : ", font: { name: "Arial", size: 9 } },
          { text: String(jobData.fobvalue), font: { name: "Arial", bold: true, size: 10 } }
        ]
      };
      worksheet.getCell("F15").alignment = { vertical: "middle", horizontal: "left" };

      // Row 16: Payment Type
      worksheet.mergeCells("A16:J16");
      worksheet.getRow(16).height = 22;
      worksheet.getCell("A16").value = "e:LCL/FCL/ODC:Yes/No.Payment Type:PAID / TO PAY";
      worksheet.getCell("A16").font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell("A16").alignment = { vertical: "middle", horizontal: "left" };

      // Row 17: Container Headers
      const headers = ["Sr No", "Container No", "Size", "No & Type of Pkgs.", "Description of Goods", "Cargo Weight (MT)", "TARE WT", "Customs Seal No.", "Shipping Line Seal No.", "SB NO.: & DATE"];
      worksheet.getRow(17).height = 28;
      headers.forEach((h, cidx) => {
        const cell = worksheet.getCell(17, cidx + 1);
        cell.value = h;
        cell.font = { name: "Arial", bold: true, size: 9 };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } };
      });

      // Row 18 onwards: Containers
      let currentRow = 18;
      let totalPkgs = 0;
      let totalWeight = 0;

      jobData.containers.forEach((c, i) => {
        worksheet.getRow(currentRow).height = 60;
        const pkgs = Number(c.pkgsStuffed) || 0;
        const weight = Number(c.grossWeight) || 0;
        const tareWeight = Number(c.tareWeightKgs) || 0;
        totalPkgs += pkgs;
        totalWeight += weight;

        worksheet.getCell(currentRow, 1).value = i + 1;
        worksheet.getCell(currentRow, 2).value = c.containerNo || "";
        worksheet.getCell(currentRow, 3).value = c.type?.match(/\d+/)?.[0] || "20";
        worksheet.getCell(currentRow, 4).value = pkgs || "";
        worksheet.getCell(currentRow, 4).numFormat = '#,##0';
        
        if (i === 0) {
          worksheet.getCell(currentRow, 5).value = {
            richText: [
              { text: jobData.descriptionOfGoods + "\n", font: { name: "Arial", bold: true, size: 9 } },
              { text: "HSN: " + jobData.hsnList, font: { name: "Arial", size: 8, color: { argb: "FF333333" } } }
            ]
          };
        } else {
          worksheet.getCell(currentRow, 5).value = "";
        }
        
        worksheet.getCell(currentRow, 6).value = weight || "";
        worksheet.getCell(currentRow, 6).numFormat = '#,##0';
        worksheet.getCell(currentRow, 7).value = tareWeight || "";
        worksheet.getCell(currentRow, 7).numFormat = '#,##0';
        worksheet.getCell(currentRow, 8).value = c.sealNo || "";
        worksheet.getCell(currentRow, 9).value = c.shippingLineSealNo || "";

        if (i === 0) {
          worksheet.getCell(currentRow, 10).value = {
            richText: [
              { text: jobData.shippingBillNo + "\n\n", font: { name: "Arial", bold: true, size: 9 } },
              { text: "dt " + formatDate(jobData.sb_date), font: { name: "Arial", bold: true, size: 9 } }
            ]
          };
        } else {
          worksheet.getCell(currentRow, 10).value = "";
        }

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

      worksheet.getCell(`F${currentRow}`).value = totalWeight || "";
      worksheet.getCell(`F${currentRow}`).font = { name: "Arial", bold: true, size: 10 };
      worksheet.getCell(`F${currentRow}`).numFormat = '#,##0.000';
      worksheet.getCell(`F${currentRow}`).alignment = { vertical: "middle", horizontal: "center" };

      worksheet.mergeCells(`G${currentRow}:J${currentRow}`);

      currentRow++;

      // Certifications Table (6 items)
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
        worksheet.getCell(`B${currentRow}`).font = { name: "Arial", bold: cidx > 0, size: 8 };
        worksheet.getCell(`B${currentRow}`).alignment = { 
          vertical: "middle", 
          horizontal: cidx === 0 ? "left" : "center", 
          wrapText: true 
        };
        currentRow++;
      });

      // Footer - Remarks & Signature
      worksheet.getRow(currentRow).height = 20;
      worksheet.getRow(currentRow + 1).height = 20;
      worksheet.getRow(currentRow + 2).height = 20;

      worksheet.mergeCells(`A${currentRow}:E${currentRow+2}`);
      worksheet.getCell(`A${currentRow}`).value = {
        richText: [
          { text: "PDA A/C/Cheque No):\n\n\n", font: { name: "Arial", bold: true, size: 9 } },
          { text: jobData.shippingLineName, font: { name: "Arial", bold: true, size: 12 } }
        ]
      };
      worksheet.getCell(`A${currentRow}`).alignment = { vertical: "top", horizontal: "left", wrapText: true };

      worksheet.mergeCells(`F${currentRow}:J${currentRow+2}`);
      worksheet.getCell(`F${currentRow}`).value = {
        richText: [
          { text: `PDA/PDC ${jobData.shippingLineName}\n\n\n`, font: { name: "Arial", bold: true, size: 9 } },
          { text: jobData.generatedBy.toUpperCase(), font: { name: "Arial", bold: true, size: 11 } }
        ]
      };
      worksheet.getCell(`F${currentRow}`).alignment = { vertical: "top", horizontal: "right", wrapText: true };
      
      currentRow += 3;

      // Date / Stamp Sign
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

      // HPCSL USE
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

      // 4. Apply thin borders around all cells
      const borderStyle = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };

      for (let r = 6; r < currentRow; r++) {
        const rowObj = worksheet.getRow(r);
        for (let c = 1; c <= 10; c++) {
          const cell = rowObj.getCell(c);
          cell.border = borderStyle;
        }
      }

      // Write buffer and save
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `HPCSL_Consignment_Note_${jobNo}.xlsx`);
    } catch (error) {
      console.error("Error generating Excel:", error);
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

      // 1. Column Widths
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

      // Row 1: Headers
      const headers = ["Sr No", "Container No", "Size", "No & Type of Pkgs.", "Description of Goods", "Cargo Weight (MT)", "TARE WT", "Customs Seal No.", "Shipping Line Seal No.", "SB NO.: & DATE"];
      worksheet.getRow(1).height = 28;
      headers.forEach((h, cidx) => {
        const cell = worksheet.getCell(1, cidx + 1);
        cell.value = h;
        cell.font = { name: "Arial", bold: true, size: 9 };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } };
      });

      // Rows 2 onwards: Containers
      let currentRow = 2;
      let totalPkgs = 0;
      let totalWeight = 0;

      jobData.containers.forEach((c, i) => {
        worksheet.getRow(currentRow).height = 60;
        const pkgs = Number(c.pkgsStuffed) || 0;
        const weight = Number(c.grossWeight) || 0;
        const tareWeight = Number(c.tareWeightKgs) || 0;
        totalPkgs += pkgs;
        totalWeight += weight;

        worksheet.getCell(currentRow, 1).value = i + 1;
        worksheet.getCell(currentRow, 2).value = c.containerNo || "";
        worksheet.getCell(currentRow, 3).value = c.type?.match(/\d+/)?.[0] || "20";
        worksheet.getCell(currentRow, 4).value = pkgs || "";
        worksheet.getCell(currentRow, 4).numFormat = '#,##0';
        
        if (i === 0) {
          worksheet.getCell(currentRow, 5).value = {
            richText: [
              { text: jobData.descriptionOfGoods + "\n", font: { name: "Arial", bold: true, size: 9 } },
              { text: "HSN: " + jobData.hsnList, font: { name: "Arial", size: 8, color: { argb: "FF333333" } } }
            ]
          };
        } else {
          worksheet.getCell(currentRow, 5).value = "";
        }
        
        worksheet.getCell(currentRow, 6).value = weight || "";
        worksheet.getCell(currentRow, 6).numFormat = '#,##0';
        worksheet.getCell(currentRow, 7).value = tareWeight || "";
        worksheet.getCell(currentRow, 7).numFormat = '#,##0';
        worksheet.getCell(currentRow, 8).value = c.sealNo || "";
        worksheet.getCell(currentRow, 9).value = c.shippingLineSealNo || "";

        if (i === 0) {
          worksheet.getCell(currentRow, 10).value = {
            richText: [
              { text: jobData.shippingBillNo + "\n\n", font: { name: "Arial", bold: true, size: 9 } },
              { text: "dt " + formatDate(jobData.sb_date), font: { name: "Arial", bold: true, size: 9 } }
            ]
          };
        } else {
          worksheet.getCell(currentRow, 10).value = "";
        }

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

      worksheet.getCell(`F${currentRow}`).value = totalWeight || "";
      worksheet.getCell(`F${currentRow}`).font = { name: "Arial", bold: true, size: 10 };
      worksheet.getCell(`F${currentRow}`).numFormat = '#,##0.000';
      worksheet.getCell(`F${currentRow}`).alignment = { vertical: "middle", horizontal: "center" };

      worksheet.mergeCells(`G${currentRow}:J${currentRow}`);

      currentRow++;

      // Apply borders
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

      // Write buffer and save
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `FN_Table_${jobNo}.xlsx`);
    } catch (error) {
      console.error("Error generating FN Table Excel:", error);
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
      <Dialog open={choiceOpen} onClose={() => setChoiceOpen(false)}>
        <DialogTitle>Document Action</DialogTitle>
        <DialogContent>
          <div style={{ marginBottom: "10px" }}>
            Do you want to edit the document inline, download PDF directly, or download Excel?
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