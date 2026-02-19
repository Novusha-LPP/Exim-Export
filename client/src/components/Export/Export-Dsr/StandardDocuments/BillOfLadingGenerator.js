
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
      
      const containerSummary = data.containers?.length 
        ? `${data.containers.length}x${data.containers[0].size || '20'}' FCL` 
        : "";

      // Address Strings
      const shipperText = (data.exporter || "") + (data.exporter_address ? `<br/>${data.exporter_address}` : "");
      
      const consigneeObj = data.consignees?.[0] || {};
      const consigneeText = (consigneeObj.consignee_name || data.consignee_name || "") + 
                           (consigneeObj.consignee_address ? `<br/>${consigneeObj.consignee_address}` : "");

      const notifyText = (data.notify_party_name || "") + (data.notify_party_address ? `<br/>${data.notify_party_address}` : "");
      const notifyText2 = ""; // No field usually for this

      // Shipping Bill Info
      const sbInfo = data.sb_no ? `SB NO. ${data.sb_no} dt ${formatDate(data.sb_date)}` : "";

      // Goods Desc
      const goodsDesc = (data.goods_description || "").replace(/\n/g, "<br/>") || 
                        ((containerSummary ? containerSummary + " SAID TO CONTAIN<br/>" : "") + 
                         `Total Packages: ${data.total_packages || ""} ${data.package_unit || "PACKAGES"}<br/><br/>` + 
                         (firstProduct.description || data.commodity || "") +
                         (sbInfo ? `<br/>${sbInfo}` : ""));

      // Container Rows
      let containerTableRows = "";
      (data.containers || []).forEach((c, i) => {
        containerTableRows += `
          <tr>
            <td style="padding: 4px; border: 1px solid #ccc;">${i + 1}</td>
            <td style="padding: 4px; border: 1px solid #ccc;">${c.container_number || ""}</td>
            <td style="padding: 4px; border: 1px solid #ccc;">${c.seal_number || ""}</td>
            <td style="padding: 4px; border: 1px solid #ccc;">${c.custom_seal || ""}</td>
            <td style="padding: 4px; border: 1px solid #ccc;">${c.package_count || (c.pkgsStuffed || "")}</td>
            <td style="padding: 4px; border: 1px solid #ccc;">${c.gross_weight || (c.grossWeight || "")}</td>
            <td style="padding: 4px; border: 1px solid #ccc;">${c.net_weight || ""}</td>
            <td style="padding: 4px; border: 1px solid #ccc; color: red;">${sbInfo}</td>
          </tr>
        `;
      });
      // Fill empty rows if needed
      if ((data.containers || []).length === 0) {
           containerTableRows = `<tr><td colspan="8" style="text-align:center; padding: 10px;">No Container Details</td></tr>`;
      }

      // --- HTML Template ---
      // Styles are inline to ensure they are captured by doc.html() or the editor
      const template = `
        <div style="font-family: 'Times New Roman', serif; color: #000; padding: 10px; max-width: 800px; margin: 0 auto; line-height: 1.4;">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="margin: 0; text-decoration: underline; font-weight: bold; font-size: 20px;">BILL OF LADING (DRAFT)</h2>
                <div style="margin-top: 5px; font-weight: bold;">BL TYPE: OBL / SEAWAY (Please Specify)</div>
            </div>

            <!-- Parties Row 1 -->
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <div style="width: 48%; vertical-align: top;">
                    <div style="font-weight: bold; margin-bottom: 5px;">Shipper (Max 5 Lines):</div>
                    <div style="min-height: 80px; white-space: pre-wrap; word-wrap: break-word;">${shipperText}</div>
                </div>
                <div style="width: 48%; vertical-align: top;">
                    <div style="font-weight: bold; margin-bottom: 5px;">Consignee:</div>
                    <div style="min-height: 80px; white-space: pre-wrap; word-wrap: break-word;">${consigneeText}</div>
                </div>
            </div>

            <!-- Parties Row 2 -->
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <div style="width: 48%; vertical-align: top;">
                    <div style="font-weight: bold; margin-bottom: 5px;">Notify Party:</div>
                    <div style="min-height: 60px; white-space: pre-wrap; word-wrap: break-word;">${notifyText}</div>
                </div>
                <div style="width: 48%; vertical-align: top;">
                    <div style="font-weight: bold; margin-bottom: 5px;">2nd Notify Party (If Any):</div>
                    <div style="min-height: 60px; white-space: pre-wrap; word-wrap: break-word;">${notifyText2}</div>
                </div>
            </div>

            <!-- Routing Details -->
            <div style="margin-bottom: 15px; line-height: 1.6;">
                <div style="margin-bottom: 5px;">
                    <strong>Vessel & Voyage No:</strong> 
                    <span style="display: inline-block; border-bottom: 1px solid #000; padding: 0 10px; min-width: 200px;">${data.vessel_name || ""} / ${data.voyage_no || ""}</span>
                </div>
                <div style="margin-bottom: 5px;">
                    <strong>Place of Receipt:</strong> 
                    <span style="display: inline-block; border-bottom: 1px solid #000; padding: 0 10px; min-width: 200px;">${data.place_of_receipt || ""}</span>
                </div>
                <div style="margin-bottom: 5px;">
                    <strong>Port of Loading:</strong> 
                    <span style="display: inline-block; border-bottom: 1px solid #000; padding: 0 10px; min-width: 200px;">${data.port_of_loading || ""}</span>
                </div>
                <div style="margin-bottom: 5px;">
                    <strong>Port of Discharge:</strong> 
                    <span style="display: inline-block; border-bottom: 1px solid #000; padding: 0 10px; min-width: 200px;">${data.port_of_discharge || ""}</span>
                </div>
                <div style="margin-bottom: 5px;">
                    <strong>Place of Delivery:</strong> 
                    <span style="display: inline-block; border-bottom: 1px solid #000; padding: 0 10px; min-width: 200px;">${data.final_place_of_delivery || ""}</span>
                </div>
            </div>

            <!-- Cargo Particulars Header -->
            <div style="margin-bottom: 5px; font-weight: bold; text-decoration: underline;">CARGO PARTICULARS:</div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #000;">
                <thead>
                    <tr style="text-align: left; background-color: #f0f0f0;">
                        <th style="width: 20%; padding: 5px; border: 1px solid #000;">Container No / Marks</th>
                        <th style="width: 15%; padding: 5px; border: 1px solid #000;">No. & Kind of Pkgs</th>
                        <th style="width: 40%; padding: 5px; border: 1px solid #000;">Description of Goods</th>
                        <th style="width: 15%; padding: 5px; border: 1px solid #000;">Gross Weight</th>
                        <th style="width: 10%; padding: 5px; border: 1px solid #000;">CBM</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 5px; vertical-align: top; border: 1px solid #000;">${data.marks_and_numbers || "N/M"}</td>
                        <td style="padding: 5px; vertical-align: top; border: 1px solid #000;">${data.total_packages || ""} ${data.package_unit || "PKGS"}</td>
                        <td style="padding: 5px; vertical-align: top; border: 1px solid #000; white-space: pre-wrap; word-wrap: break-word;">${goodsDesc}</td>
                        <td style="padding: 5px; vertical-align: top; border: 1px solid #000;">${data.gross_weight_kg ? data.gross_weight_kg + " KGS" : ""}</td>
                        <td style="padding: 5px; vertical-align: top; border: 1px solid #000;">${data.total_volume_cbm || ""}</td>
                    </tr>
                </tbody>
            </table>

            <div style="margin-bottom: 20px;">
                <div style="margin-bottom: 5px;"><strong>Total No. of Packages:</strong> ______________________ ${data.total_packages || ""}</div>
                <div style="margin-bottom: 5px;"><strong>Total Gross Weight:</strong> ______________________ ${data.gross_weight_kg ? data.gross_weight_kg + " KGS" : ""}</div>
            </div>

            <!-- Container Details -->
            <div style="margin-bottom: 5px; font-weight: bold;">CONTAINER DETAILS:</div>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; border: 1px solid #ccc;">
                <thead>
                    <tr style="background-color: #eee;">
                        <th style="padding: 3px; border: 1px solid #ccc; text-align: left;">Sr</th>
                        <th style="padding: 3px; border: 1px solid #ccc; text-align: left;">Container No</th>
                        <th style="padding: 3px; border: 1px solid #ccc; text-align: left;">Line Seal</th>
                        <th style="padding: 3px; border: 1px solid #ccc; text-align: left;">Custom Seal</th>
                        <th style="padding: 3px; border: 1px solid #ccc; text-align: left;">Pkgs</th>
                        <th style="padding: 3px; border: 1px solid #ccc; text-align: left;">Gross Wt</th>
                        <th style="padding: 3px; border: 1px solid #ccc; text-align: left;">Net Wt</th>
                        <th style="padding: 3px; border: 1px solid #ccc; text-align: left; color: red;">SB No & Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${containerTableRows}
                </tbody>
            </table>

            <!-- Footer -->
            <div style="margin-top: 10px;">
                 <div style="margin-bottom: 15px;">
                    <div><strong>Freight:</strong> PREPAID / COLLECT (Specify)</div>
                     <div style="margin-top: 2px;"><strong>Status:</strong> <u>PREPAID</u></div>
                 </div>
                 
                 <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                     <div>
                        <div><strong>Place & Date of Issue:</strong> _______________________</div>
                        <div style="margin-top: 5px;">AHMEDABAD / ${formatDate(new Date())}</div>
                     </div>
                     <div style="text-align: right;">
                        <div style="margin-bottom: 30px;">For and on behalf of Carrier / NVOCC</div>
                        <div><strong>Authorized Signatory:</strong> _______________________</div>
                     </div>
                 </div>
            </div>

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
            // e might be passed or not depending on MUI
            // We handle logic in generateHTML
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