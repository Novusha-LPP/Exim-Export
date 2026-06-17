import React, { useState } from "react";
import jsPDF from "jspdf";
import axios from "axios";
import { Button, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import DocumentEditorDialog from "./DocumentEditorDialog";

const AnnexureDGenerator = ({ jobNo, children }) => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const [choiceOpen, setChoiceOpen] = useState(false);

  // Helper to format dates to dd/MM/yyyy
  const formatDateSlash = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const generateHTML = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (e && e.preventDefault) e.preventDefault();

    try {
      const encodedJobNo = encodeURIComponent(jobNo);
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/get-export-job/${encodedJobNo}`
      );
      const data = response.data;

      // Extract Data
      const chaName = data.cha || "SURAJ FORWARDERS AND SHIPPING AGENCIES";
      const exporter = data.exporter || "";
      const portOfLoading = data.port_of_loading || "";

      // Gather all unique shipping bills
      const sbList = [];
      const seenSBs = new Set();
      if (data.sb_no) {
        const key = `${data.sb_no}_${data.sb_date || ""}`;
        seenSBs.add(key);
        sbList.push(`${data.sb_no} / ${formatDateSlash(data.sb_date)}`);
      }
      const containers = data.containers?.length > 0 ? data.containers : (data.operations?.[0]?.containerDetails || []);
      containers.forEach(c => {
        const sbNo = c._sourceSbNo || c.shippingBillNo;
        const sbDate = c._sourceSbDate || c.sb_date;
        if (sbNo) {
          const key = `${sbNo}_${sbDate || ""}`;
          if (!seenSBs.has(key)) {
            seenSBs.add(key);
            sbList.push(`${sbNo} / ${formatDateSlash(sbDate)}`);
          }
        }
      });
      const sbDisplay = sbList.join(" | ") || "N/A";

      // Render container rows
      let containerRows = "";
      containers.forEach((cnt) => {
        // Extract size
        const sizeMatch = (cnt.type || "").match(/^(\d+)/);
        const size = sizeMatch ? `${sizeMatch[1]}"` : (cnt.type || "");

        containerRows += `
          <tr>
            <td style="border: 1px solid #000; padding: 8px; font-size: 13px; text-align: center; vertical-align: middle; font-weight: bold;">${cnt.containerNo || ""}</td>
            <td style="border: 1px solid #000; padding: 8px; font-size: 13px; text-align: center; vertical-align: middle; font-weight: bold;">${size}</td>
            <td style="border: 1px solid #000; padding: 8px; font-size: 13px; text-align: center; vertical-align: middle; font-weight: bold;">${cnt.sealNo || ""}</td>
            <td style="border: 1px solid #000; padding: 8px; font-size: 13px; text-align: center; vertical-align: middle; font-weight: bold;">${cnt.shippingLineSealNo || ""}</td>
          </tr>
        `;
      });

      // Pad container table with empty rows to match paper layout (at least 6 rows)
      const totalRowsToRender = Math.max(6, containers.length);
      for (let i = containers.length; i < totalRowsToRender; i++) {
        containerRows += `
          <tr>
            <td style="border: 1px solid #000; padding: 12px; text-align: center; vertical-align: middle;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 12px; text-align: center; vertical-align: middle;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 12px; text-align: center; vertical-align: middle;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 12px; text-align: center; vertical-align: middle;">&nbsp;</td>
          </tr>
        `;
      }

      const template = `
        <div style="font-family: Arial, Helvetica, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #000000; box-sizing: border-box;">
            
            <!-- Document Title -->
            <div style="text-align: center; margin-bottom: 25px; line-height: 1.4;">
              <div style="font-size: 16px; font-weight: bold; letter-spacing: 0.5px;">"ANNEXURE: D"</div>
              <div style="font-size: 14px; font-weight: bold; margin-top: 5px;">FOR ICD STUFFING EXPORT CONTAINERS</div>
              <div style="font-size: 11px; font-style: italic; margin-top: 3px;">(w.e.f 25 July , 2018).</div>
            </div>

            <!-- Recipient & Date Header -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13.5px;">
              <tr>
                <td style="vertical-align: top; width: 60%; line-height: 1.5;">
                  To,<br/>
                  <strong>The Manager,</strong><br/>
                  EXIM warehouse,<br/>
                  ICD Sanand.
                </td>
                <td style="vertical-align: top; width: 40%; text-align: right;">
                  <strong>Date:</strong> <u>${formatDateSlash(new Date())}</u>
                </td>
              </tr>
            </table>

            <!-- Salutation & Cover Text -->
            <div style="font-size: 13.5px; margin-bottom: 20px; line-height: 1.5;">
              Dear Sir,<br/><br/>
              We have submitted following documents along with required details to your desk for the ICD Stuffing containers.
            </div>

            <!-- Document Submission Checklist -->
            <ol style="font-size: 13.5px; margin-bottom: 25px; padding-left: 20px; line-height: 1.6;">
              <li>Check list of Shipping Bill</li>
              <li>Copy of shipping line delivery order.</li>
              <li>Customs Stuffing Allowed permission.</li>
            </ol>

            <!-- Main Unified Table -->
            <table style="width: 100%; border: 1.5px solid #000; border-collapse: collapse; margin-bottom: 25px; font-size: 13.5px;">
              <tbody>
                <!-- Name of CHA -->
                <tr>
                  <td style="border: 1px solid #000; padding: 8px; width: 30%; font-weight: bold; background-color: #fcfcfc; vertical-align: middle;">Name of CHA</td>
                  <td colspan="3" style="border: 1px solid #000; padding: 8px; font-weight: bold; vertical-align: middle; color: #0000FF;">${chaName}</td>
                </tr>
                <!-- Name of Exporter -->
                <tr>
                  <td style="border: 1px solid #000; padding: 8px; font-weight: bold; background-color: #fcfcfc; vertical-align: middle;">Name of Exporter</td>
                  <td colspan="3" style="border: 1px solid #000; padding: 8px; font-weight: bold; vertical-align: middle;">${exporter}</td>
                </tr>
                <!-- S/B Number & Date -->
                <tr>
                  <td style="border: 1px solid #000; padding: 8px; font-weight: bold; background-color: #fcfcfc; vertical-align: middle;">S/B Number & Date</td>
                  <td colspan="3" style="border: 1px solid #000; padding: 8px; font-weight: bold; vertical-align: middle; color: #0000FF;">${sbDisplay}</td>
                </tr>
                <!-- Port of Loading -->
                <tr>
                  <td style="border: 1px solid #000; padding: 8px; font-weight: bold; background-color: #fcfcfc; vertical-align: middle;">Port of Loading</td>
                  <td colspan="3" style="border: 1px solid #000; padding: 8px; font-weight: bold; vertical-align: middle;">${portOfLoading}</td>
                </tr>
                
                <!-- Table Headers for Containers -->
                <tr style="background-color: #f1f5f9;">
                  <td style="border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 30%; vertical-align: middle;">Container Number</td>
                  <td style="border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 15%; vertical-align: middle;">Size</td>
                  <td style="border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 27.5%; vertical-align: middle;">Customs Seal Number</td>
                  <td style="border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 27.5%; vertical-align: middle;">Line Seal Number</td>
                </tr>
                
                <!-- Container Details Rows -->
                ${containerRows}
              </tbody>
            </table>

            <!-- Closing Text -->
            <div style="font-size: 13.5px; margin-bottom: 45px; line-height: 1.5;">
              Kindly acknowledge above documents & details so we can handover the containers for Rail/Road movement.
            </div>

            <!-- Signatures Section -->
            <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; margin-top: 30px;">
              <tr>
                <td style="width: 45%; vertical-align: bottom; padding-bottom: 15px;">
                  <div style="margin-bottom: 40px; border-bottom: 1px dashed #aaa; width: 150px;"></div>
                  <div><strong>EXIM Acknowledgment</strong></div>
                </td>
                <td style="width: 55%; vertical-align: bottom; text-align: right;">
                  <div style="display: inline-block; text-align: left; line-height: 2.2;">
                    <div><strong>Signature of CHA Person:</strong> ____________________</div>
                    <div><strong>H/G Card Number:</strong> ____________________</div>
                  </div>
                </td>
              </tr>
            </table>

        </div>
      `;

      setHtmlContent(template);
      setChoiceOpen(true);
    } catch (err) {
      console.error("Error generating Annexure D:", err);
      alert("Failed to generate Annexure D");
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
          doc.save(`Annexure_D_${jobNo}.pdf`);
        },
        x: 10,
        y: 10,
        width: 550, 
        windowWidth: 800,
        margin: [20, 20, 20, 20],
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
          Generate Annexure D
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
        title={`Annexure D - ${jobNo}`}
      />
    </>
  );
};

export default AnnexureDGenerator;
