import React, { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Snackbar, Alert } from "@mui/material";
import { ContentCopy as CopyIcon } from "@mui/icons-material";
import html2pdf from "html2pdf.js";
import logo from "../../../assets/images/surajCompanyLogo.jpeg";
import DocumentEditorDialog from "../Export-Dsr/StandardDocuments/DocumentEditorDialog";

const LEGAL_TEXT_1 =
  "Taken in charge in apparently good condition herein at the place of receipt for transport and delivery as mentioned above, unless otherwise stated. The MTO in accordance with the provisions contained in the MTD undertakes to perform or to procure the performance of the multimodal transport from the place at which the goods are taken in charge to the place designated for delivery and assumes responsibility for such transport.";

const LEGAL_TEXT_2 =
  "One of the MTD(s) must be surrendered, duly endorsed in exchange for the goods, in witness whereof the original MTD of all of this tenor and date have been signed in the number indicated below one of which being accomplished the other(s) to be void.";

const FreightBillOfLadingGenerator = ({ enquiry, children }) => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  const buildTemplate = (e, mode = 'draft') => {
    if (e?.stopPropagation) e.stopPropagation();
    if (e?.preventDefault) e.preventDefault();

    const bl = enquiry?.bl_details || {};
    const isOriginal = mode === 'original';
    
    // Borders are rendered transparent in Original mode to keep text placement identical
    const bColor = isOriginal ? 'transparent' : '#000';
    const b22 = `border: 2.2px solid ${bColor};`;
    const b18 = `border: 1.8px solid ${bColor};`;
    const bb22 = `border-bottom: 2.2px solid ${bColor};`;
    const bb2 = `border-bottom: 2px solid ${bColor};`;
    const bb18 = `border-bottom: 1.8px solid ${bColor};`;
    const br22 = `border-right: 2.2px solid ${bColor};`;
    const br18 = `border-right: 1.8px solid ${bColor};`;
    const br12 = `border-right: 1.2px solid ${bColor};`;

    const watermark = !isOriginal ? `
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 150px; color: rgba(0,0,0,0.08); font-weight: 900; pointer-events: none; z-index: 0; text-transform: uppercase;">DRAFT</div>
    ` : '';

    const template = `
      <div style="font-family: 'Helvetica', 'Arial', sans-serif; color: #000; width: 740px; margin: 0 auto; background-color: #fff; line-height: 1.15;">
        
        <!-- FIRST PAGE (MAIN BL) -->
        <div style="${b22} box-sizing: border-box; min-height: 990px; page-break-after: always; position: relative;">
          ${watermark}
          <!-- TOP HEADER BOX -->
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed; ${bb22}">
            <tr>
              <td style="width: 53%; ${br22} padding: 12px 10px; vertical-align: middle;">
                <div style="font-size: 19px; font-weight: 900; letter-spacing: 0.3px; text-transform: uppercase; color: ${isOriginal ? 'transparent' : '#000'};">MULTIMODAL TRANSPORT DOCUMENT</div>
              </td>
              <td style="width: 47%; padding: 0; vertical-align: top;">
                 <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 6px 10px; ${bb2}">
                         <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                            <span style="font-weight: 900; font-size: 10px; white-space: nowrap;">MTD. No.</span>
                            <span style="${b18} padding: 0px 10px; flex: 1; text-align: center; font-weight: 700; min-height: 20px; display: flex; align-items: center; justify-content: center; font-size: 11px;">${enquiry?.enquiry_no || ""}</span>
                         </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 10px;">
                         <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                            <span style="font-weight: 900; font-size: 10px; white-space: nowrap;">Shipment Ref. No.</span>
                            <span style="${b18} padding: 0px 10px; flex: 1; text-align: center; font-weight: 700; min-height: 20px; display: flex; align-items: center; justify-content: center; font-size: 11px;">${bl.shipment_ref_no || ""}</span>
                         </div>
                      </td>
                    </tr>
                 </table>
              </td>
            </tr>
          </table>

          <!-- PARTIES & BRANDING & LEGAL -->
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed; ${bb22}">
            <tr>
              <td style="width: 53%; ${br22} vertical-align: top; padding: 0;">
                 <div style="padding: 8px 10px; ${bb18} min-height: 85px;">
                    <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px;">Consignor</div>
                    <div style="font-weight: 700; text-transform: uppercase; font-size: 10px; line-height: 1.3; white-space: pre-wrap;">${bl.consignor || enquiry?.organization_name || ""}</div>
                 </div>
                 <div style="padding: 8px 10px; ${bb18} min-height: 85px;">
                    <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px;">Consignee (Or Order)</div>
                    <div style="font-weight: 700; text-transform: uppercase; font-size: 10px; white-space: pre-wrap;">${bl.consignee || "TO ORDER"}</div>
                 </div>
                 <div style="padding: 8px 10px; min-height: 85px;">
                    <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px;">Notify Address</div>
                    <div style="font-weight: 700; text-transform: uppercase; font-size: 10px; white-space: pre-wrap;">${bl.notify_party || "SAME AS CONSIGNEE"}</div>
                 </div>
              </td>
              <td style="width: 47%; vertical-align: top; padding: 10px 12px; text-align: center;">
                 <img src="${logo}" alt="Suraj Logo" style="width: 170px; margin: 0 auto 6px; display: block; opacity: ${isOriginal ? 0 : 1};" />
                 <div style="font-size: 8.5px; line-height: 1.25; margin-bottom: 8px; font-weight: 700; text-align: center; color: ${isOriginal ? 'transparent' : '#000'};">
                    A-204,205, Wall Street II, Opp Orient Club, Ellis Bridge,<br/>
                    Ahmedabad - 380 006, (Gujarat) INDIA<br/>
                    Ph : (079) 3008 2020 / 21 / 22 | Fax : (079) 2640 1929<br/>
                    Email : info@surajforwarders.com | Site : www.surajforwarders.co
                 </div>
                 <div style="font-weight: 900; font-size: 12px; margin-bottom: 8px; border-bottom: 1.2px solid ${isOriginal ? 'transparent' : '#000'}; display: inline-block; padding-bottom: 2px;">REGN NO. MTO/DGS/1148/JAN/2022</div>
                 <div style="font-size: 7px; text-align: justify; margin-bottom: 6px; font-weight: 700; line-height: 1.2; color: ${isOriginal ? 'transparent' : '#000'};">${LEGAL_TEXT_1}</div>
                 <div style="font-size: 7px; text-align: justify; margin-bottom: 12px; font-weight: 700; line-height: 1.2; color: ${isOriginal ? 'transparent' : '#000'};">${LEGAL_TEXT_2}</div>
                 
                 <div style="border-top: 1.8px solid ${isOriginal ? 'transparent' : '#000'}; padding-top: 8px; text-align: left;">
                    <div style="font-weight: 900; border-bottom: 1.2px solid ${isOriginal ? 'transparent' : '#000'}; padding-bottom: 3px; margin-bottom: 6px; font-size: 10px; text-transform: uppercase;">Agent Details</div>
                    <div style="font-size: 9.5px; line-height: 1.3; font-weight: 700; text-transform: uppercase;">
                      [OVERSEAS AGENT NAME]<br/>
                      [OFFICE ADDRESS]<br/>
                      [CITY / PORT], [COUNTRY]<br/>
                      TEL: [PHONE]
                    </div>
                 </div>
              </td>
            </tr>
          </table>

          <!-- PORT DATA GRID -->
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed; ${bb22}">
            <tr style="${bb18}">
              <td style="width: 50%; ${br18} padding: 6px 10px; vertical-align: top;">
                 <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px;">Place of Acceptance</div>
                 <div style="font-weight: 700; text-transform: uppercase; font-size: 10px;">${enquiry?.port_of_loading || ""}</div>
              </td>
              <td style="width: 50%; padding: 6px 10px; vertical-align: top;">
                 <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px;">Port of Loading</div>
                 <div style="font-weight: 700; text-transform: uppercase; font-size: 10px;">${enquiry?.port_of_loading || ""}</div>
              </td>
            </tr>
            <tr>
              <td style="width: 50%; ${br18} padding: 6px 10px; vertical-align: top;">
                 <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px;">Port of Discharge</div>
                 <div style="font-weight: 700; text-transform: uppercase; font-size: 10px;">${enquiry?.port_of_destination || ""}</div>
              </td>
              <td style="width: 50%; padding: 6px 10px; vertical-align: top;">
                 <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px;">Place of Delivery</div>
                 <div style="font-weight: 700; text-transform: uppercase; font-size: 10px;">${enquiry?.port_of_destination || ""}</div>
              </td>
            </tr>
          </table>

          <!-- VESSEL & TRANSPORT INFO -->
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed; ${bb22}">
            <tr style="min-height: 40px;">
              <td style="width: 50%; ${br18} padding: 0; vertical-align: top;">
                 <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="width: 75%; ${br12} padding: 6px 10px; font-weight: 900; font-size: 9.5px;">Vessel & Voyage No.</td>
                      <td style="width: 25%; padding: 6px 10px; font-weight: 900;">&nbsp;</td>
                    </tr>
                    <tr>
                      <td style="padding: 2px 10px 6px; font-weight: 700; text-transform: uppercase; font-size: 10px;">${bl.vessel_name || "[MV NAME AND VOY]"}</td>
                      <td style="padding: 2px 10px 6px; font-weight: 700; text-transform: uppercase; text-align: center;">&nbsp;</td>
                    </tr>
                 </table>
              </td>
              <td style="width: 25%; ${br18} padding: 6px 10px; vertical-align: top;">
                 <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px;">Mode of Transport</div>
                 <div style="font-weight: 700; text-transform: uppercase; font-size: 10px;">${bl.mode_of_transport || (enquiry?.consignment_type?.toUpperCase().includes('SEA') ? 'SEA' : 'AIR')}</div>
              </td>
              <td style="width: 25%; padding: 6px 10px; vertical-align: top;">
                 <div style="font-weight: 900; margin-bottom: 3px; font-size: 9px;">Route / transshipment</div>
                 <div style="font-weight: 700; text-transform: uppercase; font-size: 10px;">${bl.route_transshipment || "VIA PORT"}</div>
              </td>
            </tr>
          </table>

          <!-- CARGO DETAILS TABLE -->
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed; ${bb22}">
            <tr style="${bb18}; background-color: ${isOriginal ? 'transparent' : '#fcfcfc'};">
              <th style="width: 18%; ${br18} padding: 8px 6px; font-size: 8.5px; font-weight: 900; text-align: left;">Container No (s)</th>
              <th style="width: 15%; ${br18} padding: 8px 6px; font-size: 8.5px; font-weight: 900; text-align: left;">Marks & Numbers</th>
              <th style="width: 37%; ${br18} padding: 8px 6px; font-size: 8.5px; font-weight: 900; text-align: left;">Number and kind of packages, general description of goods</th>
              <th style="width: 15%; ${br18} padding: 8px 6px; font-size: 8.5px; font-weight: 900; text-align: center;">Gross Weight</th>
              <th style="width: 15%; padding: 8px 6px; font-size: 8.5px; font-weight: 900; text-align: center;">Measurement</th>
            </tr>
            <tr>
              <td style="${br18} min-height: 280px; height: 280px; vertical-align: top; padding: 10px 8px; font-size: 9.5px; line-height: 1.4;">
                 <div style="font-weight: 900; white-space: pre-wrap;">${bl.container_numbers || "[CONTAINER DETAILS]"}</div> 
                 <div style="font-weight: 700; font-size: 8px; margin-top: 5px; white-space: pre-wrap;">${bl.seal_numbers ? 'SEALS: ' + bl.seal_numbers : ''}</div>
              </td>
              <td style="${br18} vertical-align: top; padding: 10px 8px; font-size: 9.5px; line-height: 1.4; font-weight: 900; white-space: pre-wrap;">${bl.marks_numbers || "[SHIPPING MARKS]"}</td>
              <td style="${br18} vertical-align: top; padding: 10px 8px; font-size: 9.5px; line-height: 1.4; font-weight: 700;">
                 <div style="font-weight: 900; margin-bottom: 8px; white-space: pre-wrap;">${bl.packages_description || "[NUMBER & KIND OF PACKAGES]"}</div>
                 <div style="white-space: pre-wrap;">${bl.description_of_goods || "[GOODS DESCRIPTION]"}</div>
                 <div style="margin-top: 8px;">${bl.hsn_code ? 'HSN: ' + bl.hsn_code : ''}</div>
                 <div style="margin-top: 15px; font-style: italic; font-weight: 600; font-size: 8px; text-align: center; color: #555;">(Particulars above furnished by consignor / consignee)</div>
              </td>
              <td style="${br18} vertical-align: top; padding: 10px 8px; font-size: 10px; font-weight: 900; text-align: right;">
                 ${bl.gross_weight || enquiry?.gross_weight || "0.000"} KGS
                 <br/><br/>
                 <span style="font-size: 9px; font-weight: 700; color: #333;">NET WEIGHT<br/>${enquiry?.net_weight || "0.000"} KGS</span>
              </td>
              <td style="vertical-align: top; padding: 10px 8px; font-size: 10px; font-weight: 900; text-align: right;">
                 ${bl.measurement || "[CBM] CBM"}
                 <br/><br/><br/><br/><br/>
                 <div style="font-size: 9px; font-weight: 900; text-align: center; border-top: 1px solid ${isOriginal ? 'transparent' : '#eee'}; padding-top: 12px; line-height: 1.3;">FREIGHT PREPAID<br/>FCL/FCL<br/>CY/CY</div>
              </td>
            </tr>
          </table>

          <!-- FREIGHT & ORIGINALS INFO -->
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed; ${bb22}">
            <tr style="min-height: 45px;">
              <td style="width: 25%; ${br18} padding: 6px 10px; vertical-align: top;">
                 <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px;">Freight Amount</div>
                 <div style="font-weight: 700; text-transform: uppercase; font-size: 10px;">${bl.freight_amount || "AS AGREED"}</div>
              </td>
              <td style="width: 25%; ${br18} padding: 6px 10px; vertical-align: top;">
                 <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px;">Freight Payable at</div>
                 <div style="font-weight: 700; text-transform: uppercase; font-size: 10px;">AHMEDABAD</div>
              </td>
              <td style="width: 25%; ${br18} padding: 6px 10px; vertical-align: top;">
                 <div style="font-weight: 900; margin-bottom: 3px; font-size: 9px;">Number of Original MTD (s)</div>
                 <div style="font-weight: 700; text-transform: uppercase; font-size: 10px;">3 (THREE)</div>
              </td>
              <td style="width: 25%; padding: 6px 10px; vertical-align: top;">
                 <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px;">Place and Date of Issue</div>
                 <div style="font-weight: 700; text-transform: uppercase; font-size: 10px;">AHMEDABAD<br/>${new Date().toLocaleDateString('en-GB')}</div>
              </td>
            </tr>
          </table>

          <!-- OTHER PARTICULARS & SIGNATORY -->
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <tr>
              <td style="width: 58%; padding: 10px 12px; vertical-align: top; ${br22}">
                 <div style="font-weight: 900; margin-bottom: 6px; font-size: 10px;">Other Particulars (If any)</div>
                 <div style="white-space: pre-wrap; font-size: 9px; font-weight: 700; margin-bottom: 8px;">${bl.other_particulars || ""}</div>
                 <div style="margin-top: 30px; font-size: 9px; font-weight: 900; text-align: center; letter-spacing: 0.1px;">Weight & Measurement of container not to be Included.</div>
                 <div style="font-size: 9px; font-weight: 900; text-align: center;">(TERMS CONTINUED ON BACK HERE OF)</div>
              </td>
              <td style="width: 42%; padding: 10px 15px; vertical-align: top; text-align: center;">
                 <div style="font-weight: 900; font-size: 12.5px; margin-bottom: 65px; text-transform: uppercase;">FOR SURAJ FORWARDERS PVT. LTD.</div>
                 <div style="font-weight: 900; font-size: 10.5px;">(Authorised Signatory)</div>
              </td>
            </tr>
          </table>
        </div>

        <!-- SECOND PAGE (ANNEXURE) -->
        <div style="padding: 40px 30px; min-height: 990px; box-sizing: border-box; background-color: #fff; position: relative;">
          ${watermark}
          <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid ${isOriginal ? 'transparent' : '#000'}; padding-bottom: 10px; margin-bottom: 25px;">
              <span style="font-size: 19px; font-weight: 900; text-transform: uppercase;">Annexure to the Multimodal Transport Document.</span>
              <span style="font-size: 15px; font-weight: 900; letter-spacing: 0.5px;">MTD NO. : ${enquiry?.enquiry_no || ""}</span>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 50px; table-layout: fixed;">
              <tr style="border-bottom: 2px solid ${isOriginal ? 'transparent' : '#000'};">
                 <th style="width: 20%; font-size: 10px; font-weight: 900; text-align: left; padding: 10px 6px;">No. Containers /<br/>Packages</th>
                 <th style="width: 15%; font-size: 10px; font-weight: 900; text-align: left; padding: 10px 6px;">Marks and Numbers</th>
                 <th style="width: 35%; font-size: 10px; font-weight: 900; text-align: left; padding: 10px 6px;">Description of goods</th>
                 <th style="width: 15%; font-size: 10px; font-weight: 900; text-align: center; padding: 10px 6px;">Gross Weight<br/>(Kilos)</th>
                 <th style="width: 15%; font-size: 10px; font-weight: 900; text-align: center; padding: 10px 6px;">Measurement (cu.<br/>metres)</th>
              </tr>
              <tr>
                 <td colspan="5" style="padding-top: 80px; text-align: center; font-size: 14px; line-height: 2.5; font-weight: 900; letter-spacing: 0.2px;">
                    <div style="margin-bottom: 15px;">21 DAYS DETENTION FREE AT DESTINATION</div>
                    <div style="margin-bottom: 15px;">"LCL DESTINATION CHARGES ON CONSIGNEES ACCOUNT"</div>
                    <div style="margin-bottom: 15px; max-width: 80%; margin-left: 10%; line-height: 1.8;">"NO LIABILITY ATTACHES TO CARRIER IF MARKS & NOS. ON PACKAGES & MTD DO NOT MATCH OR ARE INADEQUATE/MISSING"</div>
                    <div style="text-transform: uppercase; margin-top: 30px; max-width: 85%; margin-left: 7.5%; line-height: 1.8;">IN CASE THE GOODS LIES UNDELIVERED DEMURRAGE/WAREHOUSING & ANY OTHER CHARGES WILL BE ON SHIPPER'S ACCOUNT</div>
                 </td>
              </tr>
          </table>
          
          <div style="position: absolute; bottom: 80px; right: 50px; text-align: center;">
             <div style="font-weight: 900; font-size: 14px; margin-bottom: 75px; text-transform: uppercase;">FOR SURAJ FORWARDERS PVT. LTD.</div>
             <div style="font-weight: 900; font-size: 11px;">(Authorised Signatory)</div>
          </div>
        </div>
      </div>`;

    setHtmlContent(template);
    setChoiceOpen(true);
  };

  const handleCopyLink = () => {
    const publicUrl = `${window.location.origin}/public/bl-form/${enquiry._id}`;
    navigator.clipboard.writeText(publicUrl);
    setSnackbar({ open: true, message: "Public BL Form link copied to clipboard!" });
  };

  const handleTriggerClick = (e, originalOnClick) => {
    if (e?.stopPropagation) e.stopPropagation();
    if (e?.preventDefault) e.preventDefault();
    if (typeof originalOnClick === "function") {
      originalOnClick(e);
    }
    // Just build the initial draft template for the editor and open choice dialog
    buildTemplate(e, 'draft');
    setChoiceOpen(true);
  };

  const handleEdit = () => {
    setChoiceOpen(false);
    setEditorOpen(true);
  };

  const handleDownloadDraft = async (e) => {
    setChoiceOpen(false);
    await triggerDownload('draft');
  };

  const handleDownloadOriginal = async (e) => {
    setChoiceOpen(false);
    await triggerDownload('original');
  };

  const triggerDownload = async (mode) => {
    const bl = enquiry?.bl_details || {};
    const isOriginal = mode === 'original';
    const bColor = isOriginal ? 'transparent' : '#000';
    
    // Explicitly define all borders for the mode
    const b22 = `border: 2.2px solid ${bColor};`;
    const b18 = `border: 1.8px solid ${bColor};`;
    const bb22 = `border-bottom: 2.2px solid ${bColor};`;
    const bb2 = `border-bottom: 2px solid ${bColor};`;
    const bb18 = `border-bottom: 1.8px solid ${bColor};`;
    const br22 = `border-right: 2.2px solid ${bColor};`;
    const br18 = `border-right: 1.8px solid ${bColor};`;
    const br12 = `border-right: 1.2px solid ${bColor};`;

    const watermark = !isOriginal ? `
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 150px; color: rgba(0,0,0,0.08); font-weight: 900; pointer-events: none; z-index: 0; text-transform: uppercase;">DRAFT</div>
    ` : '';

    const templateMarkup = `
      <div style="font-family: 'Helvetica', 'Arial', sans-serif; color: #000; width: 740px; margin: 0 auto; background-color: #fff; line-height: 1.15;">
        <!-- PAGE 1 -->
        <div style="${b22} box-sizing: border-box; min-height: 990px; page-break-after: always; position: relative;">
          ${watermark}
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed; ${bb22}">
            <tr>
              <td style="width: 53%; ${br22} padding: 12px 10px; vertical-align: middle;">
                <div style="font-size: 19px; font-weight: 900; letter-spacing: 0.3px; text-transform: uppercase; color: ${isOriginal ? 'transparent' : '#000'};">MULTIMODAL TRANSPORT DOCUMENT</div>
              </td>
              <td style="width: 47%; padding: 0; vertical-align: top;">
                 <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 6px 10px; ${bb2}">
                         <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                            <span style="font-weight: 900; font-size: 10px; white-space: nowrap; color: ${isOriginal ? 'transparent' : '#000'};">MTD. No.</span>
                            <span style="${b18} padding: 0px 10px; flex: 1; text-align: center; font-weight: 700; min-height: 20px; display: flex; align-items: center; justify-content: center; font-size: 11px;">${enquiry?.enquiry_no || ""}</span>
                         </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 10px;">
                         <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                            <span style="font-weight: 900; font-size: 10px; white-space: nowrap; color: ${isOriginal ? 'transparent' : '#000'};">Shipment Ref. No.</span>
                            <span style="${b18} padding: 0px 10px; flex: 1; text-align: center; font-weight: 700; min-height: 20px; display: flex; align-items: center; justify-content: center; font-size: 11px;">${bl.shipment_ref_no || ""}</span>
                         </div>
                      </td>
                    </tr>
                 </table>
              </td>
            </tr>
          </table>
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed; ${bb22}">
            <tr>
              <td style="width: 53%; ${br22} vertical-align: top; padding: 0;">
                 <div style="padding: 8px 10px; ${bb18} min-height: 85px;">
                    <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Consignor</div>
                    <div style="font-weight: 700; text-transform: uppercase; font-size: 10px; line-height: 1.3; white-space: pre-wrap;">${bl.consignor || enquiry?.organization_name || ""}</div>
                 </div>
                 <div style="padding: 8px 10px; ${bb18} min-height: 85px;">
                    <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Consignee (Or Order)</div>
                    <div style="font-weight: 700; text-transform: uppercase; font-size: 10px; white-space: pre-wrap;">${bl.consignee || "TO ORDER"}</div>
                 </div>
                 <div style="padding: 8px 10px; min-height: 85px;">
                    <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Notify Address</div>
                    <div style="font-weight: 700; text-transform: uppercase; font-size: 10px; white-space: pre-wrap;">${bl.notify_party || "SAME AS CONSIGNEE"}</div>
                 </div>
              </td>
              <td style="width: 47%; vertical-align: top; padding: 10px 12px; text-align: center;">
                 <img src="${logo}" alt="Suraj Logo" style="width: 170px; margin: 0 auto 6px; display: block; opacity: ${isOriginal ? 0 : 1};" />
                 <div style="font-size: 8.5px; line-height: 1.25; margin-bottom: 8px; font-weight: 700; text-align: center; color: ${isOriginal ? 'transparent' : '#000'};">
                    A-204,205, Wall Street II, Opp Orient Club, Ellis Bridge,<br/>
                    Ahmedabad - 380 006, (Gujarat) INDIA<br/>
                    Ph : (079) 3008 2020 / 21 / 22 | Fax : (079) 2640 1929<br/>
                    Email : info@surajforwarders.com | Site : www.surajforwarders.co
                 </div>
                 <div style="font-weight: 900; font-size: 12px; margin-bottom: 8px; border-bottom: 1.2px solid ${isOriginal ? 'transparent' : '#000'}; display: inline-block; padding-bottom: 2px; color: ${isOriginal ? 'transparent' : '#000'};">REGN NO. MTO/DGS/1148/JAN/2022</div>
                 <div style="font-size: 7px; text-align: justify; margin-bottom: 6px; font-weight: 700; line-height: 1.2; color: ${isOriginal ? 'transparent' : '#000'};">${LEGAL_TEXT_1}</div>
                 <div style="font-size: 7px; text-align: justify; margin-bottom: 12px; font-weight: 700; line-height: 1.2; color: ${isOriginal ? 'transparent' : '#000'};">${LEGAL_TEXT_2}</div>
                 <div style="border-top: 1.8px solid ${isOriginal ? 'transparent' : '#000'}; padding-top: 8px; text-align: left;">
                    <div style="font-weight: 900; border-bottom: 1.2px solid ${isOriginal ? 'transparent' : '#000'}; padding-bottom: 3px; margin-bottom: 6px; font-size: 10px; text-transform: uppercase; color: ${isOriginal ? 'transparent' : '#000'};">Agent Details</div>
                    <div style="font-size: 9.5px; line-height: 1.3; font-weight: 700; text-transform: uppercase;">[OVERSEAS AGENT NAME]<br/>[OFFICE ADDRESS]<br/>[CITY / PORT], [COUNTRY]<br/>TEL: [PHONE]</div>
                 </div>
              </td>
            </tr>
          </table>
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed; ${bb22}">
            <tr style="${bb18}">
              <td style="width: 50%; ${br18} padding: 6px 10px; vertical-align: top;">
                 <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Place of Acceptance</div>
                 <div style="font-weight: 700; text-transform: uppercase; font-size: 10px;">${enquiry?.port_of_loading || ""}</div>
              </td>
              <td style="width: 50%; padding: 6px 10px; vertical-align: top;">
                 <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Port of Loading</div>
                 <div style="font-weight: 700; text-transform: uppercase; font-size: 10px;">${enquiry?.port_of_loading || ""}</div>
              </td>
            </tr>
            <tr>
              <td style="width: 50%; ${br18} padding: 6px 10px; vertical-align: top;">
                 <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Port of Discharge</div>
                 <div style="font-weight: 700; text-transform: uppercase; font-size: 10px;">${enquiry?.port_of_destination || ""}</div>
              </td>
              <td style="width: 50%; padding: 6px 10px; vertical-align: top;">
                 <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Place of Delivery</div>
                 <div style="font-weight: 700; text-transform: uppercase; font-size: 10px;">${enquiry?.port_of_destination || ""}</div>
              </td>
            </tr>
          </table>
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed; ${bb22}">
            <tr style="min-height: 40px;">
              <td style="width: 50%; ${br18} padding: 0; vertical-align: top;">
                 <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="width: 75%; ${br12} padding: 6px 10px; font-weight: 900; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Vessel & Voyage No.</td>
                      <td style="width: 25%; padding: 6px 10px; font-weight: 900;">&nbsp;</td>
                    </tr>
                    <tr>
                      <td style="padding: 2px 10px 6px; font-weight: 700; text-transform: uppercase; font-size: 10px;">${bl.vessel_name || "[MV NAME AND VOY]"}</td>
                      <td style="padding: 2px 10px 6px; font-weight: 700; text-transform: uppercase; text-align: center;">&nbsp;</td>
                    </tr>
                 </table>
              </td>
              <td style="width: 25%; ${br18} padding: 6px 10px; vertical-align: top;">
                 <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Mode of Transport</div>
                 <div style="font-weight: 700; text-transform: uppercase; font-size: 10px;">${bl.mode_of_transport || (enquiry?.consignment_type?.toUpperCase().includes('SEA') ? 'SEA' : 'AIR')}</div>
              </td>
              <td style="width: 25%; padding: 6px 10px; vertical-align: top;">
                 <div style="font-weight: 900; margin-bottom: 3px; font-size: 9px; color: ${isOriginal ? 'transparent' : '#000'};">Route / transshipment</div>
                 <div style="font-weight: 700; text-transform: uppercase; font-size: 10px;">${bl.route_transshipment || "VIA PORT"}</div>
              </td>
            </tr>
          </table>
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed; ${bb22}">
            <tr style="${bb18}; background-color: ${isOriginal ? 'transparent' : '#fcfcfc'};">
              <th style="width: 18%; ${br18} padding: 8px 6px; font-size: 8.5px; font-weight: 900; text-align: left; color: ${isOriginal ? 'transparent' : '#000'};">Container No (s)</th>
              <th style="width: 15%; ${br18} padding: 8px 6px; font-size: 8.5px; font-weight: 900; text-align: left; color: ${isOriginal ? 'transparent' : '#000'};">Marks & Numbers</th>
              <th style="width: 37%; ${br18} padding: 8px 6px; font-size: 8.5px; font-weight: 900; text-align: left; color: ${isOriginal ? 'transparent' : '#000'};">Number and kind of packages, general description of goods</th>
              <th style="width: 15%; ${br18} padding: 8px 6px; font-size: 8.5px; font-weight: 900; text-align: center; color: ${isOriginal ? 'transparent' : '#000'};">Gross Weight</th>
              <th style="width: 15%; padding: 8px 6px; font-size: 8.5px; font-weight: 900; text-align: center; color: ${isOriginal ? 'transparent' : '#000'};">Measurement</th>
            </tr>
            <tr>
              <td style="${br18} min-height: 280px; height: 280px; vertical-align: top; padding: 10px 8px; font-size: 9.5px; line-height: 1.4;">
                 <div style="font-weight: 900; white-space: pre-wrap;">${bl.container_numbers || "[CONTAINER DETAILS]"}</div> 
                 <div style="font-weight: 700; font-size: 8px; margin-top: 5px; white-space: pre-wrap;">${bl.seal_numbers ? 'SEALS: ' + bl.seal_numbers : ''}</div>
              </td>
              <td style="${br18} vertical-align: top; padding: 10px 8px; font-size: 9.5px; line-height: 1.4; font-weight: 900; white-space: pre-wrap;">${bl.marks_numbers || "[SHIPPING MARKS]"}</td>
              <td style="${br18} vertical-align: top; padding: 10px 8px; font-size: 9.5px; line-height: 1.4; font-weight: 700;">
                 <div style="font-weight: 900; margin-bottom: 8px; white-space: pre-wrap;">${bl.packages_description || "[NUMBER & KIND OF PACKAGES]"}</div>
                 <div style="white-space: pre-wrap;">${bl.description_of_goods || "[GOODS DESCRIPTION]"}</div>
                 <div style="margin-top: 8px;">${bl.hsn_code ? 'HSN: ' + bl.hsn_code : ''}</div>
                 <div style="margin-top: 15px; font-style: italic; font-weight: 600; font-size: 8px; text-align: center; color: #555;">(Particulars above furnished by consignor / consignee)</div>
              </td>
              <td style="${br18} vertical-align: top; padding: 10px 8px; font-size: 10px; font-weight: 900; text-align: right;">${bl.gross_weight || enquiry?.gross_weight || "0.000"} KGS<br/><br/><span style="font-size: 9px; font-weight: 700; color: #333;">NET WEIGHT<br/>${enquiry?.net_weight || "0.000"} KGS</span></td>
              <td style="vertical-align: top; padding: 10px 8px; font-size: 10px; font-weight: 900; text-align: right;">${bl.measurement || "[CBM] CBM"}<br/><br/><br/><br/><br/><div style="font-size: 9px; font-weight: 900; text-align: center; border-top: 1px solid ${isOriginal ? 'transparent' : '#eee'}; padding-top: 12px; line-height: 1.3; color: ${isOriginal ? 'transparent' : '#000'};">FREIGHT PREPAID<br/>FCL/FCL<br/>CY/CY</div></td>
            </tr>
          </table>
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed; ${bb22}">
            <tr style="min-height: 45px;">
              <td style="width: 25%; ${br18} padding: 6px 10px; vertical-align: top;">
                 <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Freight Amount</div>
                 <div style="font-weight: 700; text-transform: uppercase; font-size: 10px;">${bl.freight_amount || "AS AGREED"}</div>
              </td>
              <td style="width: 25%; ${br18} padding: 6px 10px; vertical-align: top;">
                 <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Freight Payable at</div>
                 <div style="font-weight: 700; text-transform: uppercase; font-size: 10px;">AHMEDABAD</div>
              </td>
              <td style="width: 25%; ${br18} padding: 6px 10px; vertical-align: top;">
                 <div style="font-weight: 900; margin-bottom: 3px; font-size: 9px; color: ${isOriginal ? 'transparent' : '#000'};">Number of Original MTD (s)</div>
                 <div style="font-weight: 700; text-transform: uppercase; font-size: 10px;">3 (THREE)</div>
              </td>
              <td style="width: 25%; padding: 6px 10px; vertical-align: top;">
                 <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Place and Date of Issue</div>
                 <div style="font-weight: 700; text-transform: uppercase; font-size: 10px;">AHMEDABAD<br/>${new Date().toLocaleDateString('en-GB')}</div>
              </td>
            </tr>
          </table>
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <tr>
              <td style="width: 58%; padding: 10px 12px; vertical-align: top; ${br22}">
                 <div style="font-weight: 900; margin-bottom: 6px; font-size: 10px; color: ${isOriginal ? 'transparent' : '#000'};">Other Particulars (If any)</div>
                 <div style="white-space: pre-wrap; font-size: 9px; font-weight: 700; margin-bottom: 8px;">${bl.other_particulars || ""}</div>
                 <div style="margin-top: 30px; font-size: 9px; font-weight: 900; text-align: center; letter-spacing: 0.1px; color: ${isOriginal ? 'transparent' : '#000'};">Weight & Measurement of container not to be Included.</div>
                 <div style="font-size: 9px; font-weight: 900; text-align: center; color: ${isOriginal ? 'transparent' : '#000'};">(TERMS CONTINUED ON BACK HERE OF)</div>
              </td>
              <td style="width: 42%; padding: 10px 15px; vertical-align: top; text-align: center;">
                 <div style="font-weight: 900; font-size: 12.5px; margin-bottom: 65px; text-transform: uppercase; color: ${isOriginal ? 'transparent' : '#000'};">FOR SURAJ FORWARDERS PVT. LTD.</div>
                 <div style="font-weight: 900; font-size: 10.5px; color: ${isOriginal ? 'transparent' : '#000'};">(Authorised Signatory)</div>
              </td>
            </tr>
          </table>
        </div>
        <div style="padding: 40px 30px; min-height: 990px; box-sizing: border-box; background-color: #fff; position: relative;">
          ${watermark}
          <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid ${isOriginal ? 'transparent' : '#000'}; padding-bottom: 10px; margin-bottom: 25px;">
              <span style="font-size: 19px; font-weight: 900; text-transform: uppercase; color: ${isOriginal ? 'transparent' : '#000'};">Annexure to the Multimodal Transport Document.</span>
              <span style="font-size: 15px; font-weight: 900; letter-spacing: 0.5px; color: ${isOriginal ? 'transparent' : '#000'};">MTD NO. : ${enquiry?.enquiry_no || ""}</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 50px; table-layout: fixed;">
              <tr style="border-bottom: 2px solid ${isOriginal ? 'transparent' : '#000'};">
                 <th style="width: 20%; font-size: 10px; font-weight: 900; text-align: left; padding: 10px 6px; color: ${isOriginal ? 'transparent' : '#000'};">No. Containers /<br/>Packages</th>
                 <th style="width: 15%; font-size: 10px; font-weight: 900; text-align: left; padding: 10px 6px; color: ${isOriginal ? 'transparent' : '#000'};">Marks and Numbers</th>
                 <th style="width: 35%; font-size: 10px; font-weight: 900; text-align: left; padding: 10px 6px; color: ${isOriginal ? 'transparent' : '#000'};">Description of goods</th>
                 <th style="width: 15%; font-size: 10px; font-weight: 900; text-align: center; padding: 10px 6px; color: ${isOriginal ? 'transparent' : '#000'};">Gross Weight<br/>(Kilos)</th>
                 <th style="width: 15%; font-size: 10px; font-weight: 900; text-align: center; padding: 10px 6px; color: ${isOriginal ? 'transparent' : '#000'};">Measurement (cu.<br/>metres)</th>
              </tr>
              <tr>
                 <td colspan="5" style="padding-top: 80px; text-align: center; font-size: 14px; line-height: 2.5; font-weight: 900; letter-spacing: 0.2px; color: ${isOriginal ? 'transparent' : '#000'};">
                    <div style="margin-bottom: 15px;">21 DAYS DETENTION FREE AT DESTINATION</div>
                    <div style="margin-bottom: 15px;">"LCL DESTINATION CHARGES ON CONSIGNEES ACCOUNT"</div>
                    <div style="margin-bottom: 15px; max-width: 80%; margin-left: 10%; line-height: 1.8;">"NO LIABILITY ATTACHES TO CARRIER IF MARKS & NOS. ON PACKAGES & MTD DO NOT MATCH OR ARE INADEQUATE/MISSING"</div>
                    <div style="text-transform: uppercase; margin-top: 30px; max-width: 85%; margin-left: 7.5%; line-height: 1.8;">IN CASE THE GOODS LIES UNDELIVERED DEMURRAGE/WAREHOUSING & ANY OTHER CHARGES WILL BE ON SHIPPER'S ACCOUNT</div>
                 </td>
              </tr>
          </table>
          <div style="position: absolute; bottom: 80px; right: 50px; text-align: center;">
             <div style="font-weight: 900; font-size: 14px; margin-bottom: 75px; text-transform: uppercase; color: ${isOriginal ? 'transparent' : '#000'};">FOR SURAJ FORWARDERS PVT. LTD.</div>
             <div style="font-weight: 900; font-size: 11px; color: ${isOriginal ? 'transparent' : '#000'};">(Authorised Signatory)</div>
          </div>
        </div>
      </div>`;

    try {
      const element = document.createElement("div");
      element.innerHTML = templateMarkup;
      
      await html2pdf()
        .from(element)
        .set({
          margin: [10, 10, 0, 10],
          filename: `${isOriginal ? 'Original' : 'Draft'}_MTD_${enquiry?.enquiry_no || "Freight"}.pdf`,
          image: { type: "jpeg", quality: 0.85 },
          html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 740 },
          jsPDF: { unit: "pt", format: "a4", orientation: "portrait", compress: true },
          pagebreak: { mode: ["css", "legacy"], avoid: "tr" },
        })
        .save();
      setChoiceOpen(false);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF");
    }
  };

  const handleEditSave = async (editedHtml) => {
    try {
      const element = document.createElement("div");
      element.innerHTML = editedHtml;
      
      await html2pdf()
        .from(element)
        .set({
          margin: [10, 10, 0, 10],
          filename: `MTD_Draft_${enquiry?.enquiry_no || "Freight"}.pdf`,
          image: { type: "jpeg", quality: 0.85 },
          html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 740 },
          jsPDF: { unit: "pt", format: "a4", orientation: "portrait", compress: true },
          pagebreak: { mode: ["css", "legacy"], avoid: "tr" },
        })
        .save();
    } catch (error) {
      console.error("Error saving edited PDF:", error);
      alert("Failed to save edited PDF");
    }
  };

  return (
    <>
      {children ? (
        React.cloneElement(children, {
          onClick: (e) => handleTriggerClick(e, children.props.onClick),
        })
      ) : (
        <Button onClick={buildTemplate} variant="contained">
          Generate BL
        </Button>
      )}

      <Dialog open={choiceOpen} onClose={() => setChoiceOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: "#1a237e", textAlign: "center" }}>
          MTD / Bill of Lading Output
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Choose <b>Draft</b> for a soft copy with watermarks and borders, or <b>Original</b> if you are printing on pre-printed stationery (removes borders/branding but keeps alignment).
          </Alert>
          <div style={{ textAlign: "center", marginBottom: "10px", color: "#666" }}>
            Select your download type:
          </div>
        </DialogContent>
        <DialogActions sx={{ p: 4, pt: 0, gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
          <Button
            onClick={() => triggerDownload('draft')}
            variant="contained"
            color="primary"
            sx={{ fontWeight: 700, borderRadius: 2, px: 3 }}
          >
            Download Draft
          </Button>
          <Button
            onClick={() => triggerDownload('original')}
            variant="contained"
            color="secondary"
            sx={{ fontWeight: 700, borderRadius: 2, px: 3, bgcolor: "#2e7d32", '&:hover': { bgcolor: "#1b5e20" } }}
          >
            Download Original
          </Button>
          <Button 
            onClick={handleEdit} 
            variant="outlined" 
            sx={{ fontWeight: 700, borderRadius: 2, px: 3 }}
          >
            Edit Mode
          </Button>
          <div style={{ width: "100%", textAlign: "center", marginTop: "10px" }}>
            <Button
              onClick={handleCopyLink}
              variant="text"
              startIcon={<CopyIcon />}
              sx={{ fontWeight: 700, color: "#1a237e" }}
            >
              Copy Public Form Link
            </Button>
          </div>
        </DialogActions>
      </Dialog>

      <DocumentEditorDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        initialContent={htmlContent}
        title={`Freight MTD Draft - ${enquiry?.enquiry_no || ""}`}
        customSave={handleEditSave}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default FreightBillOfLadingGenerator;
