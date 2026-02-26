import React, { useState } from "react";
import axios from "axios";
import { MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import jsPDF from "jspdf";
import DocumentEditorDialog from "./DocumentEditorDialog";
import thatLogo from "../../../../assets/images/that-logo.png";

const ForwardingNoteTharGenerator = ({ jobNo, children }) => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const [choiceOpen, setChoiceOpen] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      if (
        typeof dateString === "string" &&
        /^\d{1,2}-\d{1,2}-\d{4}/.test(dateString)
      ) {
        return dateString;
      }
      return dateString;
    }
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
      // Calculations and Data Mapping
      const operations = data.operations?.[0] || {};
      const booking = operations.bookingDetails?.[0] || {};
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
      const Bookingno = booking.bookingNo || "";
      const agentCha = "SURAJ FORWARDERS & SHIPPING AGENCIES";
      const cutOffDate = formatDate(booking.vesselCutOffDate);
      const dischargeCountry = data.discharge_country || "";
      const exporterAddress = data.exporter || "";
      const gatewayPort = data.gateway_port || booking.portOfLoading || "";
      const shippingBillNo = data.sb_no || "";
      const portOfDischarge = data.port_of_discharge || "";
      const stuffingType = data.goods_stuffed_at?.toString().toLowerCase() === "factory" ? "FACTORY" : "ICD (CFS) / FACTORY";
      const shippingLineName = booking.shippingLineName || "";
      const fobvalue= data.invoices?.[0]?.freightInsuranceCharges.fobValue.amount || "";

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
                <img src="${thatLogo}" alt="Logo" style="max-width: 150px; height: auto;" />
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
                <div style="font-size: 10px; margin-bottom: 5px;"><b>Name of Consignor (S/Line) :</b> ${booking.shippingLineName || ""}</div>
                <div style="font-size: 11px; font-weight: bold;">${consignorName}</div>
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

      setHtmlContent(template);
      setChoiceOpen(true);
    } catch (err) {
      console.error("Error generating Forwarding Note:", err);
      alert("Failed to generate Forwarding Note");
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
        React.cloneElement(children, { onClick: generateHTML })
      ) : (
        <MenuItem onClick={generateHTML}>Forwarding Note (THAR)</MenuItem>
      )}

      {/* Choice Dialog */}
      <Dialog open={choiceOpen} onClose={() => setChoiceOpen(false)}>
        <DialogTitle>Document Action</DialogTitle>
        <DialogContent>
          <div style={{ marginBottom: "10px" }}>
            Do you want to edit the document inline or download it directly?
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
            Download Directly
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