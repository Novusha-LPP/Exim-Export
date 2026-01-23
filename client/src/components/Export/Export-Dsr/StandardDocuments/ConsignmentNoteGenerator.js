import React, { useState } from "react";
import axios from "axios";
import { MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import jsPDF from "jspdf";
import DocumentEditorDialog from "./DocumentEditorDialog";

const ConsignmentNoteGenerator = ({ jobNo, children }) => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const [choiceOpen, setChoiceOpen] = useState(false);

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

      const invoice = data.invoices?.[0] || {};
      const booking = data.operations?.[0]?.bookingDetails?.[0] || {};
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
            <td style="border: 1px solid black; padding: 4px; vertical-align: middle;">${booking.shippingLineSealNo || ""}</td>
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
              <td style="border: 1px solid black; padding: 4px; width: 40%; vertical-align: top;">
                <div style="margin-bottom: 2px;"><strong>Shipping Line</strong></div>
                <div>${booking.shippingLineName || ""}</div>
              </td>
              <td style="border: 1px solid black; padding: 4px; width: 60%; vertical-align: top;">
                <div style="margin-bottom: 2px;"><strong>Booking No</strong></div>
                <div>${booking.bookingNo || ""}</div>
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
                 <div>${data.gateway_port || booking.portOfLoading || ""}</div>
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
                 <div>${booking.vesselName || ""} ${booking.voyageNo || ""}</div>
              </td>
              <td style="border: 1px solid black; padding: 4px; vertical-align: top;">
                 <div style="margin-bottom: 2px;"><strong>LEO Date</strong></div>
                 <div>${formatDate(data.statusDetails?.[0]?.leoDate)}</div>
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
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; font-weight: bold; border: 2px solid black;">
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

          <!-- Signature / Footer Section - Forced Page Break -->
          <!-- Footer Table to ensure block stays together -->
          <table style="width: 100%; margin-top: 10px; page-break-inside: avoid;">
            <tr style="page-break-inside: avoid;">
                <td style="border: none; padding: 0;">
                    <div style="border: 1px solid black; padding: 10px; margin-bottom: 20px; min-height: 40px; font-size: 12px;">
                      <strong>Remarks, if any (PDA A/C/Cheque No):</strong>
                    </div>

                    <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 12px;">
                      <div>DATE ________________________</div>
                      <div style="text-align: right;">STAMP AND SIGNATURE OF SHIPPER OR AGENT (CHA)</div>
                    </div>

                    <div style="border: 1px solid black; padding: 10px; margin-top: 30px; font-size: 12px;">
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
        margin: [20, 15, 110, 15],
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
        <MenuItem onClick={generateHTML}>Consignment Note</MenuItem>
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
        title={`Consignment Note - ${jobNo}`}
      />
    </>
  );
};

export default ConsignmentNoteGenerator;