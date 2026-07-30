
import React, { useState } from "react";
import axios from "axios";
import { MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import jsPDF from "jspdf";
import DocumentEditorDialog from "./DocumentEditorDialog";

const BillOfLadingGenerator = ({ jobNo, children }) => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const [choiceOpen, setChoiceOpen] = useState(false);

  // Helper to format dates
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(/ /g, "-");
  };

  // Helper to convert number to words (for package count display like "40(FORTY)")
  const numberToWords = (num) => {
    const n = parseInt(num, 10);
    if (isNaN(n)) return "";
    const ones = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
      "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
    const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
    if (n === 0) return "ZERO";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " HUNDRED" + (n % 100 ? " " + numberToWords(n % 100) : "");
    if (n < 100000) return numberToWords(Math.floor(n / 1000)) + " THOUSAND" + (n % 1000 ? " " + numberToWords(n % 1000) : "");
    return String(n);
  };

  const generateHTML = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    
    // Prevent default anchor behavior if wrapped in one
    if (e && e.preventDefault) e.preventDefault();

    const encodedJobNo = encodeURIComponent(jobNo);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/get-export-job/${encodedJobNo}`
      );
      const data = response.data;

      // --- Data Mapping ---
      const invoice = data.invoices?.[0] || {};
      const products = invoice.products || [];
      const firstProduct = products[0] || {};
      
      const containerCount = data.containers?.length || 0;
      const containerSize = data.containers?.[0]?.size || data.containers?.[0]?.containerSize || data.container_size || '20';
      const containerSummary = containerCount > 0 
        ? `${containerCount}x${containerSize}' FCL` 
        : "";

      // Address Strings
      const shipperText = (data.exporter || "") + (data.exporter_address ? `<br/>${data.exporter_address}` : "");
      
      const consigneeObj = data.consignees?.[0] || {};
      const consigneeText = (consigneeObj.consignee_name || data.consignee_name || "") + 
                           (consigneeObj.consignee_address ? `<br/>${consigneeObj.consignee_address}` : "");

      // 1. Notify Party = Exporter Address (per user request)
      const notifyText = (data.exporter || "") + (data.exporter_address ? `<br/>${data.exporter_address}` : "");

      // 2. 2nd Notify Party = Third Party Address (per user request)
      const thirdParty = data.buyerThirdPartyInfo || {};
      const thirdPartyName = thirdParty.buyer_name || thirdParty.name || data.third_party_name || "";
      const thirdPartyAddr = thirdParty.buyer_address || thirdParty.address || data.third_party_address || "";
      const notifyText2 = (thirdPartyName ? thirdPartyName + "<br/>" : "") + thirdPartyAddr;

      // Routing
      const vesselVoyage = (data.vessel_name || data.vesselName || "") + (data.voyage_no || data.voyageNo ? ` / ${data.voyage_no || data.voyageNo}` : "");
      // Place of Receipt = Custom House Location (per user request)
      const placeOfReceipt = data.custom_house || data.customHouse || data.place_of_receipt || "";
      const portOfLoading = data.port_of_loading || "";
      const portOfDischarge = data.port_of_discharge || "";
      // Place of Delivery = Same as Destination Port (per user request)
      const placeOfDelivery = data.destination_port || data.port_of_discharge || data.final_destination || "";

      // Clean Product Description: remove "as per invoice" in capital or small cases
      let rawDesc = firstProduct.description || data.commodity || data.goods_description || data.description || "";
      let productDesc = rawDesc.replace(/as\s+per\s+invoice/gi, "").trim();

      // HSN Code
      const hsnCode = firstProduct.hsn_code || firstProduct.hsnCode || firstProduct.ritc || "";

      // Invoice info
      const invoiceNo = invoice.invoiceNumber || data.invoice_no || "";
      const invoiceDt = invoice.invoiceDate || data.invoice_date || "";
      const invoiceInfo = invoiceNo ? `INVOICE NO. ${invoiceNo}${invoiceDt ? ' DT.' + formatDate(invoiceDt) : ''}` : "";

      // Shipping Bill Info
      const sbNo = data.sb_no || data.shipping_bill_no || "";
      const sbDt = data.sb_date || data.shipping_bill_date || "";
      const sbInfo = sbNo ? `SB NO. ${sbNo}${sbDt ? ' dt ' + formatDate(sbDt) : ''}` : "";

      // Packages & Weight
      const totalPkgs = data.total_packages || data.total_no_of_pkgs || "";
      const pkgUnit = data.package_unit || "BAGS";
      const totalGrossWt = data.gross_weight_kg ? `${data.gross_weight_kg} MT` : "";
      const totalNetWt = data.net_weight_kg ? `${data.net_weight_kg} MT` : "";

      // Container Rows
      let containerTableRows = "";
      const containers = data.containers || [];
      containers.forEach((c, i) => {
        const pkgs = c.package_count || c.noOfPackages || c.pkgsStuffed || "";
        const grossWt = c.gross_weight || c.grossWeightKgs || c.grossWeight || "";
        const netWt = c.net_weight || c.netWeightKgs || c.netWeight || "";
        const cbm = c.cbm || c.volumeCbm || "";

        // SB number only (without "SB NO." prefix)
        const containerSbNo = c.sb_no || c.shippingBillNo || sbNo || "";
        // SB date in DD/MM/YY format
        const containerSbDt = c.sb_date || c.shippingBillDate || sbDt || "";
        let sbDateFormatted = "";
        if (containerSbDt) {
          const d = new Date(containerSbDt);
          if (!isNaN(d.getTime())) {
            sbDateFormatted = d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" });
          } else {
            sbDateFormatted = containerSbDt;
          }
        }

        containerTableRows += `
          <tr>
            <td style="padding: 4px; border: 1px solid #000; text-align: center;">${i + 1}</td>
            <td style="padding: 4px; border: 1px solid #000; font-weight: bold;">${c.container_number || c.containerNo || ""}</td>
            <td style="padding: 4px; border: 1px solid #000;">${c.seal_number || c.shippingLineSealNo || c.line_seal || ""}</td>
            <td style="padding: 4px; border: 1px solid #000;">${c.custom_seal || c.customSealNo || ""}</td>
            <td style="padding: 4px; border: 1px solid #000;">${pkgs ? pkgs + " " + pkgUnit : ""}</td>
            <td style="padding: 4px; border: 1px solid #000;">${grossWt ? grossWt + " MT" : ""}</td>
            <td style="padding: 4px; border: 1px solid #000;">${netWt ? netWt + " MT" : ""}</td>
            <td style="padding: 4px; border: 1px solid #000; color: red; font-size: 11px;">${containerSbNo}${sbDateFormatted ? "<br/>" + sbDateFormatted : ""}</td>
            <td style="padding: 4px; border: 1px solid #000;">${cbm}</td>
          </tr>
        `;
      });
      // Pad to minimum 3 rows
      const minRows = 3;
      for (let i = containers.length; i < minRows; i++) {
        containerTableRows += `
          <tr>
            <td style="padding: 4px; border: 1px solid #000; text-align: center;">${i + 1}</td>
            <td style="padding: 4px; border: 1px solid #000;"></td>
            <td style="padding: 4px; border: 1px solid #000;"></td>
            <td style="padding: 4px; border: 1px solid #000;"></td>
            <td style="padding: 4px; border: 1px solid #000;"></td>
            <td style="padding: 4px; border: 1px solid #000;"></td>
            <td style="padding: 4px; border: 1px solid #000;"></td>
            <td style="padding: 4px; border: 1px solid #000;"></td>
            <td style="padding: 4px; border: 1px solid #000;"></td>
          </tr>
        `;
      }

      // --- HTML Template ---
      const template = `
        <div style="font-family: Arial, sans-serif; color: #000; padding: 10px; max-width: 780px; margin: 0 auto; line-height: 1.35; font-size: 12px;">

          <!-- ===== UPPER TABLE: Shipper to Ports ===== -->
          <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; table-layout: fixed;">
            <colgroup>
              <col style="width: 55%;" />
              <col style="width: 45%;" />
            </colgroup>

            <tr>
              <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 3px; font-size: 11px;">SHIPPER</div>
                <div style="font-weight: bold; line-height: 1.4;">${shipperText}</div>
              </td>
              <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="font-weight: bold; padding-bottom: 6px;">BL FORMAT</td>
                    <td style="font-weight: bold; padding-bottom: 6px; text-align: right;">${data.job_no || jobNo || ""}</td>
                  </tr>
                </table>
                <div style="background: yellow; color: red; font-weight: bold; padding: 4px 6px; border: 1px solid red; text-align: center; font-size: 11px; line-height: 1.3;">MENTION REQUIRE BL TYPE IN DRAFT ITSELF: OBL / SEAWAY</div>
              </td>
            </tr>

            <tr>
              <td colspan="2" style="border: 1px solid #000; padding: 8px; vertical-align: top;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 3px; font-size: 11px;">Consignee:</div>
                <div style="font-weight: bold; line-height: 1.4;">${consigneeText}</div>
              </td>
            </tr>

            <tr>
              <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 3px; font-size: 11px;">Notify Party:</div>
                <div style="font-weight: bold; line-height: 1.4;">${notifyText}</div>
              </td>
              <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 3px; font-size: 11px;">2.Notify Party:</div>
                <div style="font-weight: bold; line-height: 1.4;">${notifyText2}</div>
              </td>
            </tr>

            <tr>
              <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 3px; font-size: 11px;">Vessel and Voyage No:</div>
                <div style="font-weight: bold;">${vesselVoyage}</div>
              </td>
              <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 3px; font-size: 11px;">Place of Receipt:</div>
                <div style="font-weight: bold;">${placeOfReceipt}</div>
              </td>
            </tr>

            <tr>
              <td style="border: 1px solid #000; padding: 0; vertical-align: top;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="width: 50%; border-right: 1px solid #000; padding: 8px; vertical-align: top;">
                      <div style="font-weight: bold; text-decoration: underline; margin-bottom: 3px; font-size: 11px;">Port of Loading:</div>
                      <div style="font-weight: bold;">${portOfLoading}</div>
                    </td>
                    <td style="width: 50%; padding: 8px; vertical-align: top;">
                      <div style="font-weight: bold; text-decoration: underline; margin-bottom: 3px; font-size: 11px;">Port of Discharge:</div>
                      <div style="font-weight: bold;">${portOfDischarge}</div>
                    </td>
                  </tr>
                </table>
              </td>
              <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 3px; font-size: 11px;">Place of Delivery:</div>
                <div style="font-weight: bold;">${placeOfDelivery}</div>
              </td>
            </tr>
          </table>

          <!-- ===== CARGO TABLE: 3 columns ===== -->
          <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; border-top: none; table-layout: fixed;">
            <colgroup>
              <col style="width: 28%;" />
              <col style="width: 52%;" />
              <col style="width: 20%;" />
            </colgroup>

            <tr>
              <td style="border: 1px solid #000; border-top: none; padding: 6px; vertical-align: top; font-weight: bold; font-size: 11px;">Container Nos. Marks &amp; Numbers</td>
              <td style="border: 1px solid #000; border-top: none; padding: 6px; vertical-align: top; font-weight: bold; font-size: 11px;">Number and Kind of Packages<br/>Description of Goods</td>
              <td style="border: 1px solid #000; border-top: none; padding: 6px; vertical-align: top; font-weight: bold; font-size: 11px;">Gross<br/>Weight</td>
            </tr>

            <tr>
              <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">
                <div style="font-weight: bold;">${data.marks_and_numbers || "N/M"}</div>
              </td>
              <td style="border: 1px solid #000; padding: 8px 10px; vertical-align: top; line-height: 1.6;">
                ${containerSummary ? '<strong>' + containerSummary + ' SAID TO CONTAIN</strong><br/>' : ""}
                ${totalPkgs ? 'Total Packages: <strong>' + totalPkgs + '(' + numberToWords(totalPkgs) + ') ' + pkgUnit + '</strong><br/><br/>' : ""}
                ${productDesc ? '<div style="font-weight: bold;">' + productDesc + '</div>' : ""}
                ${hsnCode ? '<div>HSN CODE: ' + hsnCode + '</div>' : ""}
                <div>PURCHASE ORDER:</div>
                <div>SALES CONTRACT NO.</div>
                ${invoiceInfo ? '<div>' + invoiceInfo + '</div>' : ""}
                ${sbInfo ? '<div>' + sbInfo + '</div>' : ""}
                <br/>
                ${totalGrossWt ? '<div>Total Gross Weight: <strong>' + totalGrossWt + '</strong></div>' : ""}
                ${totalNetWt ? '<div>Total Net Weight: <strong>' + totalNetWt + '</strong></div>' : ""}
                <br/>
                <div>Freight: <strong>PREPAID</strong></div>
              </td>
              <td style="border: 1px solid #000; padding: 8px; vertical-align: top; font-weight: bold;">
                ${totalGrossWt}
              </td>
            </tr>

            <tr style="font-weight: bold;">
              <td style="border: 1px solid #000; padding: 6px; vertical-align: top;">Total No. of /Packages:<br/>${totalPkgs} ${pkgUnit}</td>
              <td style="border: 1px solid #000; padding: 6px; vertical-align: top;">Total Weight:<br/>${totalGrossWt ? totalGrossWt + "S" : ""}</td>
              <td style="border: 1px solid #000; padding: 6px; vertical-align: top;">Freight:<br/>PREPAID</td>
            </tr>
          </table>

          <!-- ===== CONTAINER DETAILS TABLE ===== -->
          <div style="height: 12px;"></div>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 11px; table-layout: fixed;">
            <colgroup>
              <col style="width: 5%;" />
              <col style="width: 15%;" />
              <col style="width: 11%;" />
              <col style="width: 13%;" />
              <col style="width: 10%;" />
              <col style="width: 10%;" />
              <col style="width: 10%;" />
              <col style="width: 14%;" />
              <col style="width: 12%;" />
            </colgroup>
            <thead>
              <tr style="font-weight: bold; text-align: left;">
                <th style="padding: 4px; border: 1px solid #000;">Sr<br/>no.</th>
                <th style="padding: 4px; border: 1px solid #000;">Container No</th>
                <th style="padding: 4px; border: 1px solid #000;">Line Seal<br/>No.</th>
                <th style="padding: 4px; border: 1px solid #000;">Custom Seal<br/>no</th>
                <th style="padding: 4px; border: 1px solid #000;">No. of<br/>Packages</th>
                <th style="padding: 4px; border: 1px solid #000;">Gross<br/>Weight</th>
                <th style="padding: 4px; border: 1px solid #000;">Net<br/>Weight</th>
                <th style="padding: 4px; border: 1px solid #000; color: red;"><em>Shipping<br/>Bill No &amp;<br/>Date*</em></th>
                <th style="padding: 4px; border: 1px solid #000;">CBM if<br/>required</th>
              </tr>
            </thead>
            <tbody>
              ${containerTableRows}
            </tbody>
          </table>

        </div>
      `;

      setHtmlContent(template);
      setChoiceOpen(true);
    } catch (err) {
      console.error("Error generating Bill of Lading:", err);
      alert("Failed to generate Bill of Lading");
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
          doc.save(`Bill_of_Lading_${jobNo}.pdf`);
        },
        x: 10,
        y: 10,
        width: 550, // A4 width (~595pt) - margins
        windowWidth: 800, // rendering width
        margin: [15, 15, 15, 15],
        autoPaging: 'text',
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
          },
        })
      ) : (
        <Button onClick={generateHTML} variant="contained">
          Bill of Lading
        </Button>
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
        title={`Bill of Lading - ${jobNo}`}
      />
    </>
  );
};

export default BillOfLadingGenerator;