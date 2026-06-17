import React, { useState } from "react";
import jsPDF from "jspdf";
import axios from "axios";
import { Button, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import DocumentEditorDialog from "./DocumentEditorDialog";
import logo from "../../../../assets/images/Frieghttablogo.png";
import { imageToBase64 } from "../../../../utils/imageUtils";

const ConcorPltLetterGenerator = ({ jobNo, children }) => {
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
    if (e && e.preventDefault) e.preventDefault();

    try {
      const encodedJobNo = encodeURIComponent(jobNo);
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/get-export-job/${encodedJobNo}`
      );
      const data = response.data;

      // Extract Data
      const exporter = data.exporter || "";
      const sbNo = data.sb_no || "";
      const sbDate = formatDate(data.sb_date);
      
      const totalPackages = data.total_no_of_pkgs
        ? `${data.total_no_of_pkgs} ${data.package_unit || "PACKAGES"}`
        : "";
      
      const grossWeight = data.gross_weight_kg
        ? `${data.gross_weight_kg} ${data.gross_weight_unit || "KGS"}`
        : "";

      const invoices = data.invoices?.map(inv => inv.invoiceNumber).filter(Boolean).join(", ") || "";

      // Pre-load logo as base64
      let logoSrc = logo;
      try {
        logoSrc = await imageToBase64(logo);
      } catch (err) {
        console.warn("Failed to convert logo to base64", err);
      }

      // Styles
      const blackColor = "#000000";
      
      const template = `
        <div style="font-family: Arial, Helvetica, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: ${blackColor}; box-sizing: border-box;">
            
            <!-- Header Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px;">
              <tr>
                <td style="width: 30%; text-align: left; vertical-align: middle;">
                  <img src="${logoSrc}" style="width: 170px; height: auto; display: block;" />
                </td>
                <td style="width: 70%; text-align: left; vertical-align: middle; padding-left: 15px;">
                  <div style="font-family: 'Georgia', 'Times New Roman', Times, serif; font-size: 13.5px; font-weight: bold; font-style: italic; line-height: 1.4; color: #000; text-align: left;">
                    CLEARING, FORWARDING & SHIPPING AGENTS<br/>
                    CHA LIC No: ABOFS1766LCH005<br/>
                    A – 306, Wall Street II, Opp. Orient Club, Ellis Bridge, Ahmedabad – 380 006<br/>
                    Phone: (079) 30082020/21 &nbsp; Fax: (079) 26401929 &nbsp; Email: surajahd@eth.net
                  </div>
                </td>
              </tr>
            </table>

            <!-- Divider Line -->
            <div style="border-bottom: 2.5px solid #000; margin-bottom: 25px; width: 100%;"></div>

            <!-- Date -->
            <div style="margin-bottom: 25px; font-size: 13.5px;">
              <strong>Date-</strong> ${formatDate(new Date())}
            </div>

            <!-- Recipient -->
            <div style="margin-bottom: 25px; font-size: 13.5px; line-height: 1.5;">
              To<br/>
              <strong>The Chief Manager</strong><br/>
              Inland Container Depot<br/>
              Khodiyar, Ahmedabad.
            </div>

            <!-- Salutation -->
            <div style="margin-bottom: 15px; font-size: 13.5px;">
              Dear Sir,
            </div>

            <!-- Subject -->
            <div style="margin-bottom: 25px; font-size: 13.5px; font-weight: bold; text-decoration: underline;">
              Subject : Palletization permission for export cargo.
            </div>

            <!-- Mapped Details -->
            <div style="font-size: 13.5px; line-height: 2.0; margin-bottom: 30px;">
              <div>Exporter Name: <strong>${exporter}</strong></div>
              <div>Shipping No. & Dt: <strong>${sbNo ? `${sbNo} & ${sbDate}` : ""}</strong></div>
              <div>Total Packages: <strong>${totalPackages}</strong></div>
              <div>Gross Weight: <strong>${grossWeight}</strong></div>
            </div>

            <!-- Closing -->
            <div style="margin-bottom: 45px; font-size: 13.5px;">
              Yours Faithfully
            </div>

            <!-- Signatory Info -->
            <div style="margin-bottom: 35px; font-size: 13.5px; line-height: 1.6;">
              <strong>Authorized Signatory</strong><br/>
              PDA: SURAJFORWARDERS PVT LIMITED (CODE.SURPV)<br/>
              INVOICE: <strong>${invoices || exporter}</strong>
            </div>

            <!-- CONCOR Box -->
            <div style="border: 2px solid #000; padding: 12px; font-size: 13.5px; font-weight: bold; text-align: left; width: 100%; box-sizing: border-box; margin-top: 40px;">
              FOR CONCOR USE: Receipt No.
            </div>

        </div>
      `;

      setHtmlContent(template);
      setChoiceOpen(true);
    } catch (err) {
      console.error("Error generating CONCOR PLT Letter:", err);
      alert("Failed to generate CONCOR PLT Letter");
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
          doc.save(`CONCOR_PLT_Letter_${jobNo}.pdf`);
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
          Generate CONCOR PLT Letter
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
        title={`CONCOR PLT Letter - ${jobNo}`}
      />
    </>
  );
};

export default ConcorPltLetterGenerator;
