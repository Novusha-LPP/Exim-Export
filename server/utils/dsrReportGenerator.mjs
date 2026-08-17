import ExcelJS from "exceljs";
import ExportJob from "../model/export/ExJobModel.mjs";

/**
 * Utility to extract clean container size (excluding ISO code)
 * @param {Object|string} cntr
 * @returns {string} - Cleaned size string e.g. "40 HC", "20 DV"
 */
export const getCleanContainerSize = (cntr) => {
  if (!cntr) return "";
  let raw = "";
  if (typeof cntr === "string") {
    raw = cntr;
  } else {
    raw = cntr.containerSize || cntr.type || "";
  }
  if (!raw) return "";

  // Remove leading 4-digit ISO code e.g. "4510 40 HC" -> "40 HC"
  let cleaned = raw.replace(/^\d{4}\s+/, "").replace(/\s+\d{4}$/, "").trim();

  // If cleaned is still just 4 digits or empty, match standard sizes
  if (/^\d{4}$/.test(cleaned) || !cleaned) {
    const match = raw.match(/(?:20|40|45)\s*(?:HC|DV|FT|FEET)?/i);
    if (match) return match[0].toUpperCase();
    if (/^\d{4}$/.test(cleaned)) {
      if (cleaned.startsWith("2")) return "20";
      if (cleaned.startsWith("4")) return "40";
    }
    return "";
  }

  return cleaned.toUpperCase();
};

/**
 * Format date values to DD-MM-YYYY
 * @param {string|Date} dateVal
 * @returns {string}
 */
export const formatDateStr = (dateVal) => {
  if (!dateVal) return "";
  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return "";
    const day = String(dateVal.getDate()).padStart(2, "0");
    const month = String(dateVal.getMonth() + 1).padStart(2, "0");
    const year = dateVal.getFullYear();
    return `${day}-${month}-${year}`;
  }
  const trimmed = String(dateVal).trim();
  if (!trimmed) return "";

  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed) || /^\d{2}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.includes("T") || trimmed.includes("-")) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
  }

  return trimmed;
};

/**
 * Helper to extract Drawback, RoSCTL, EGM, Third Party info
 * @param {Object} job
 * @returns {Object}
 */
export const extractScrollAndEgmInfo = (job) => {
  const dbkInfoList = [];
  const rosctlInfoList = [];

  if (Array.isArray(job.invoices)) {
    job.invoices.forEach((inv) => {
      if (Array.isArray(inv.products)) {
        inv.products.forEach((prod) => {
          if (Array.isArray(prod.drawbackDetails)) {
            prod.drawbackDetails.forEach((dbk) => {
              if (dbk.drawback_scroll_no) {
                const exists = dbkInfoList.some(
                  (item) => item.no === dbk.drawback_scroll_no
                );
                if (!exists) {
                  dbkInfoList.push({
                    no: dbk.drawback_scroll_no,
                    date: dbk.drawback_scroll_date,
                  });
                }
              }
              if (dbk.rosctl_scroll_no) {
                const exists = rosctlInfoList.some(
                  (item) => item.no === dbk.rosctl_scroll_no
                );
                if (!exists) {
                  rosctlInfoList.push({
                    no: dbk.rosctl_scroll_no,
                    date: dbk.rosctl_scroll_date,
                  });
                }
              }
            });
          }
        });
      }
    });
  }

  if (job.drawback_scroll_no && !dbkInfoList.some((item) => item.no === job.drawback_scroll_no)) {
    dbkInfoList.push({
      no: job.drawback_scroll_no,
      date: job.drawback_scroll_date,
    });
  }

  if (job.rosctl_scroll_no && !rosctlInfoList.some((item) => item.no === job.rosctl_scroll_no)) {
    rosctlInfoList.push({
      no: job.rosctl_scroll_no,
      date: job.rosctl_scroll_date,
    });
  }

  const thirdPartyName =
    job.buyerThirdPartyInfo?.thirdParty?.name ||
    job.buyerThirdPartyInfo?.buyer?.name ||
    (typeof job.buyerThirdPartyInfo === "string" ? job.buyerThirdPartyInfo : "") ||
    job.third_party_name ||
    job.third_party ||
    "";

  return {
    dbkScrolls: dbkInfoList,
    rosctlScrolls: rosctlInfoList,
    egmNo: job.egm_no || "",
    egmDate: job.egm_date || "",
    thirdPartyName,
    fwdrName: job.forwarder || (job.operations?.[0]?.statusDetails?.[0]?.forwarderName) || "",
    bookingNo: job.booking_no || "",
    shippingLine: job.shipping_line_airline || "",
  };
};

/**
 * Generate DSR HTML Table for Email Body
 * @param {string} exporter - Exporter name or "all"
 * @param {boolean} onlyPending - If true, filter out completed/cancelled jobs
 * @returns {Promise<{ html: string, jobCount: number }>}
 */
export const generateDSRHTMLTable = async (exporter, onlyPending = true) => {
  try {
    const isAll = String(exporter || "").toLowerCase() === "all";
    const filter = { $and: [] };

    if (!isAll && exporter) {
      filter.$and.push({ exporter: { $regex: `^${exporter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: "i" } });
    }

    filter.$and.push({ job_no: { $regex: "^(?!GEN|FF).*", $options: "i" } });
    filter.$and.push({ isGeneralJob: { $ne: true } });

    if (onlyPending) {
      filter.$and.push({
        status: { $nin: ["Completed", "completed", "Cancelled", "cancelled"] },
        isJobCanceled: { $ne: true },
        detailedStatus: { $ne: "Billing Done" }
      });
    }

    const jobs = await ExportJob.find(filter.$and.length > 0 ? filter : {})
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();

    if (!jobs || jobs.length === 0) {
      return { html: "", jobCount: 0 };
    }

    let rowsHtml = "";

    jobs.forEach((job, index) => {
      const status = job.operations?.[0]?.statusDetails?.[0] || {};
      const bgColor = index % 2 === 0 ? "#ffffff" : "#f8fafd";
      const scrollAndEgm = extractScrollAndEgmInfo(job);

      // 1. Job No column
      let jobNoCell = `<strong>${job.job_no || job.job_number || ""}</strong>`;
      if (job.exporter_ref_no) jobNoCell += `<br/>Ref: ${job.exporter_ref_no}`;
      if (job.custom_house) jobNoCell += `<br/>${job.custom_house}`;
      if (job.consignmentType) jobNoCell += `<br/>${job.consignmentType}`;
      if (scrollAndEgm.egmNo) {
        jobNoCell += `<br/><span style="color: #dc2626; font-weight: bold;">EGM: ${scrollAndEgm.egmNo}${scrollAndEgm.egmDate ? " (" + formatDateStr(scrollAndEgm.egmDate) + ")" : ""}</span>`;
      }

      // 2. Exporter column
      let exporterCell = `<strong>${job.exporter || ""}</strong>`;
      if (scrollAndEgm.fwdrName) {
        exporterCell += `<br/><span style="color: #fc8019; font-weight: bold;">FWDR:</span> ${scrollAndEgm.fwdrName}`;
      }
      if (scrollAndEgm.thirdPartyName) {
        exporterCell += `<br/><span style="color: #4b5563; font-weight: bold;">3rd PARTY:</span> ${scrollAndEgm.thirdPartyName}`;
      }
      if (scrollAndEgm.bookingNo) {
        exporterCell += `<br/><span style="color: #4b5563; font-weight: bold;">Bk No:</span> ${scrollAndEgm.bookingNo}`;
      }
      if (scrollAndEgm.shippingLine) {
        exporterCell += `<br/><span style="color: #4b5563; font-weight: bold;">S/L:</span> ${scrollAndEgm.shippingLine}`;
      }

      // 3. Consignee Name column
      const consigneeName = job.consignee_name || (job.consignees && job.consignees[0] && job.consignees[0].consignee_name) || "-";

      // 4. Invoice column (allow multiple invoices)
      let invoiceLines = [];
      if (job.invoices && job.invoices.length > 0) {
        job.invoices.forEach(inv => {
          let parts = [];
          let invNum = inv.invoiceNumber || inv.invoiceNo || "";
          if (invNum) parts.push(`<strong>${invNum}</strong>`);
          if (inv.invoiceDate || inv.invoice_date) parts.push(formatDateStr(inv.invoiceDate || inv.invoice_date));
          const invVal = inv.invoiceValue || inv.amount || inv.invValue || inv.invoice_value;
          if (invVal !== undefined && invVal !== null && invVal !== "") {
            const term = inv.termsOfInvoice || inv.terms_of_invoice ? (inv.termsOfInvoice || inv.terms_of_invoice) + " " : "";
            const curr = inv.currency || job.currency || "USD";
            parts.push(`${term}${curr} ${invVal}`);
          }
          if (parts.length > 0) invoiceLines.push(parts.join("<br/>"));
        });
      }
      if (invoiceLines.length === 0 && (job.invoice_number || job.invoice_no)) {
        let parts = [];
        let invNum = job.invoice_number || job.invoice_no || "";
        if (invNum) parts.push(`<strong>${invNum}</strong>`);
        if (job.invoice_date) parts.push(formatDateStr(job.invoice_date));
        if (job.invoice_value) parts.push(`${job.currency || "USD"} ${job.invoice_value}`);
        if (parts.length > 0) invoiceLines.push(parts.join("<br/>"));
      }
      const invoiceCell = invoiceLines.length > 0 ? invoiceLines.join("<br/><br/>") : "-";

      // 5. SB / Date column (including Drawback & RoSCTL Scroll details)
      let sbLines = [];
      if (job.sb_no) sbLines.push(`<strong>${job.sb_no}</strong>`);
      if (job.sb_date) sbLines.push(formatDateStr(job.sb_date));

      if (scrollAndEgm.dbkScrolls.length > 0) {
        scrollAndEgm.dbkScrolls.forEach(d => {
          sbLines.push(`<span style="color: #2563eb; font-weight: bold;">DBK Scroll: ${d.no}${d.date ? " (" + formatDateStr(d.date) + ")" : ""}</span>`);
        });
      }
      if (scrollAndEgm.rosctlScrolls.length > 0) {
        scrollAndEgm.rosctlScrolls.forEach(r => {
          sbLines.push(`<span style="color: #059669; font-weight: bold;">RoSCTL Scroll: ${r.no}${r.date ? " (" + formatDateStr(r.date) + ")" : ""}</span>`);
        });
      }
      const sbCell = sbLines.length > 0 ? sbLines.join("<br/>") : "-";

      // 6. Port column
      let portLines = [];
      if (job.destination_port || job.destination_country) {
        portLines.push(`Dest: ${job.destination_port || ""} ${job.destination_country ? "(" + job.destination_country + ")" : ""}`.trim());
      }
      if (job.discharge_port || job.discharge_country) {
        portLines.push(`Discharge: ${job.discharge_port || ""} ${job.discharge_country ? "(" + job.discharge_country + ")" : ""}`.trim());
      }
      if (job.port_of_loading) {
        portLines.push(`POL: ${job.port_of_loading}`);
      }
      const portCell = portLines.length > 0 ? portLines.join("<br/>") : "-";

      // 7. Container column (Size only, NO ISO code)
      let cntrLines = [];
      const pkgs = job.total_no_of_pkgs || job.no_of_packages;
      if (pkgs) cntrLines.push(`Pkgs: ${pkgs} ${job.package_unit || ""}`.trim());
      const gross = job.gross_weight_kg || job.gross_weight;
      if (gross) cntrLines.push(`G: ${gross} kg`);
      const net = job.net_weight_kg || job.net_weight;
      if (net) cntrLines.push(`N: ${net} kg`);

      if (job.containers && job.containers.length > 0) {
        job.containers.forEach(c => {
          const cntrNo = c.containerNo || c.container_number;
          if (cntrNo) cntrLines.push(`Cont: ${cntrNo}`);
          const cleanSize = getCleanContainerSize(c);
          if (cleanSize) cntrLines.push(`Size/Type: ${cleanSize}`);
        });
      }
      const containerCell = cntrLines.length > 0 ? cntrLines.join("<br/>") : "-";

      // 8. Handover column (Show VGM, F13, ESAB, Handover dates if available)
      let handoverLines = [];
      const vgmDate = job.vgm_date || status.vgmDate || (job.vgm_done ? formatDateStr(job.updatedAt) : "");
      if (vgmDate) handoverLines.push(`VGM: ${formatDateStr(vgmDate)}`);

      const form13Date = job.form13_date || status.form13Date || (job.form13_done ? formatDateStr(job.updatedAt) : "");
      if (form13Date) handoverLines.push(`F13: ${formatDateStr(form13Date)}`);

      const esabDate = job.esanchit_completed_date_time || job.esab_date || job.eSanchitDate || status.esanchitDate;
      if (esabDate) handoverLines.push(`ESAB: ${formatDateStr(esabDate)}`);

      const handoverDate = status.handoverForwardingNoteDate || status.handoverConcorTharSanganaRailRoadDate || job.handover_date;
      if (handoverDate) handoverLines.push(`Handover: ${formatDateStr(handoverDate)}`);

      const handoverCell = handoverLines.length > 0 ? handoverLines.join("<br/>") : "-";

      // 9. Status column
      const statusCell = job.detailedStatus || job.status || "Pending";

      rowsHtml += `
        <tr style="background-color: ${bgColor}; color: #333333;">
          <td style="padding: 8px 10px; border: 1px solid #d0d7de; vertical-align: top; line-height: 1.4;">${jobNoCell}</td>
          <td style="padding: 8px 10px; border: 1px solid #d0d7de; vertical-align: top; line-height: 1.4;">${exporterCell}</td>
          <td style="padding: 8px 10px; border: 1px solid #d0d7de; vertical-align: top; line-height: 1.4;">${consigneeName}</td>
          <td style="padding: 8px 10px; border: 1px solid #d0d7de; vertical-align: top; line-height: 1.4;">${invoiceCell}</td>
          <td style="padding: 8px 10px; border: 1px solid #d0d7de; vertical-align: top; line-height: 1.4;">${sbCell}</td>
          <td style="padding: 8px 10px; border: 1px solid #d0d7de; vertical-align: top; line-height: 1.4;">${portCell}</td>
          <td style="padding: 8px 10px; border: 1px solid #d0d7de; vertical-align: top; line-height: 1.4;">${containerCell}</td>
          <td style="padding: 8px 10px; border: 1px solid #d0d7de; vertical-align: top; line-height: 1.4;">${handoverCell}</td>
          <td style="padding: 8px 10px; border: 1px solid #d0d7de; vertical-align: top; line-height: 1.4; font-weight: bold; color: #1f4e78;">${statusCell}</td>
        </tr>
      `;
    });

    const html = `
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; font-family: Arial, Helvetica, sans-serif; font-size: 12px; border: 1px solid #1f4e78;">
        <thead>
          <tr style="background-color: #1f4e78; color: #ffffff; text-align: left; font-weight: bold; font-size: 13px;">
            <th style="padding: 10px; border: 1px solid #1f4e78;">Job No</th>
            <th style="padding: 10px; border: 1px solid #1f4e78;">Exporter</th>
            <th style="padding: 10px; border: 1px solid #1f4e78;">Consignee Name</th>
            <th style="padding: 10px; border: 1px solid #1f4e78;">Invoice</th>
            <th style="padding: 10px; border: 1px solid #1f4e78;">SB / Date</th>
            <th style="padding: 10px; border: 1px solid #1f4e78;">Port</th>
            <th style="padding: 10px; border: 1px solid #1f4e78;">Container</th>
            <th style="padding: 10px; border: 1px solid #1f4e78;">Handover</th>
            <th style="padding: 10px; border: 1px solid #1f4e78;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;

    return { html, jobCount: jobs.length };
  } catch (error) {
    console.error("Error generating DSR HTML table:", error);
    throw error;
  }
};

/**
 * Generate DSR Report Excel Buffer for a specific exporter
 * @param {string} exporter - Exporter name
 * @param {boolean} onlyPending - If true, only include pending jobs
 * @returns {Promise<Buffer>} - Excel workbook buffer
 */
export const generateDSRBuffer = async (exporter, onlyPending = false, year = "", startDate = "", endDate = "", status = "all") => {
  try {
    const isAll = String(exporter).toLowerCase() === "all";
    const filter = {};
    if (!filter.$and) filter.$and = [];

    if (!isAll) {
      filter.$and.push({ exporter });
    }

    if (year && year !== "" && year.toLowerCase() !== "all") {
      filter.$and.push({ year });
    }

    const statusLower = (status || "all").toLowerCase();

    // 1. Exclude/Include General Jobs & Freight Forwarding based on status selection
    if (statusLower === "general jobs" || statusLower === "general-jobs") {
      filter.$and.push({ isGeneralJob: true });
      filter.$and.push({ job_no: { $regex: "^GEN/", $options: "i" } });
    } else if (statusLower === "freight forwarding" || statusLower === "freight-forwarding") {
      filter.$and.push({ job_no: { $regex: "^FF", $options: "i" } });
    } else {
      filter.$and.push({ job_no: { $regex: "^(?!GEN|FF).*", $options: "i" } });
      filter.$and.push({ isGeneralJob: { $ne: true } });
    }

    // 2. Status specific queries
    if (statusLower === "pending") {
      filter.$and.push({
        $and: [
          { status: { $regex: "^pending$", $options: "i" } },
          { detailedStatus: { $ne: "Billing Done" } },
          { isJobCanceled: { $ne: true } },
        ],
      });
    } else if (statusLower === "completed") {
      filter.$and.push({
        $and: [
          {
            $and: [
              { status: { $regex: "^(?!cancelled$).*", $options: "i" } },
              { isJobCanceled: { $ne: true } },
            ],
          },
          {
            $or: [
              { status: { $regex: "^completed$", $options: "i" } },
              { detailedStatus: "Billing Done" },
            ],
          },
        ],
      });
    } else if (statusLower === "cancelled") {
      filter.$and.push({
        $or: [
          { status: { $regex: "^cancelled$", $options: "i" } },
          { isJobCanceled: true },
        ],
      });
    } else if (statusLower === "booking pending") {
      filter.$and.push({
        $and: [
          {
            $or: [
              { status: { $regex: "^pending$", $options: "i" } },
              { status: { $exists: false } },
              { status: null },
              { status: "" },
            ],
          },
          { detailedStatus: { $ne: "Billing Done" } },
        ],
        goods_stuffed_at: "DOCK",
        consignmentType: "FCL",
        sb_no: { $type: "string", $ne: "" },
        $or: [
          { "operations.statusDetails.leoDate": { $exists: false } },
          { "operations.statusDetails.leoDate": null },
          { "operations.statusDetails.leoDate": "" },
          { "operations.statusDetails": { $size: 0 } }
        ]
      });
    } else if (statusLower === "handover pending") {
      filter.$and.push({
        $and: [
          {
            $or: [
              { status: { $regex: "^pending$", $options: "i" } },
              { status: { $exists: false } },
              { status: null },
              { status: "" },
            ],
          },
          { detailedStatus: { $ne: "Billing Done" } },
        ],
        "operations.statusDetails.leoDate": { $type: "string", $ne: "" },
        $or: [
          { "operations.statusDetails.handoverForwardingNoteDate": { $in: [null, ""] } },
          { "operations.statusDetails": { $size: 0 } }
        ]
      });
    } else if (statusLower === "prepare for billing" || statusLower === "op completed" || statusLower === "op-completed") {
      filter.$and.push({
        $and: [
          {
            $or: [
              { status: { $regex: "^pending$", $options: "i" } },
              { status: { $exists: false } },
              { status: null },
              { status: "" },
            ],
          },
          { detailedStatus: { $ne: "Billing Done" } },
        ]
      });
      filter.$and.push({
        $or: [
          {
            $and: [
              { consignmentType: { $ne: "LCL" } },
              { job_no: { $not: { $regex: "/AIR/", $options: "i" } } },
              { "operations.statusDetails.leoDate": { $exists: true, $nin: [null, ""] } },
              { "operations.statusDetails.handoverForwardingNoteDate": { $exists: true, $nin: [null, ""] } },
              { "operations.statusDetails.handoverConcorTharSanganaRailRoadDate": { $exists: true, $nin: [null, ""] } },
              { "operations.statusDetails.railOutReachedDate": { $exists: true, $nin: [null, ""] } }
            ]
          },
          {
            $and: [
              {
                $or: [
                  { consignmentType: "LCL" },
                  { job_no: { $regex: "/AIR/", $options: "i" } }
                ]
              },
              { "operations.statusDetails.leoDate": { $exists: true, $nin: [null, ""] } },
              { "operations.statusDetails.handoverForwardingNoteDate": { $exists: true, $nin: [null, ""] } }
            ]
          }
        ]
      });
      filter.$and.push({
        $or: [
          { send_for_billing: { $exists: false } },
          { send_for_billing: null },
          { send_for_billing: false },
        ]
      });
    } else if (statusLower === "sent for billing") {
      filter.$and.push({
        $and: [
          {
            $or: [
              { status: { $regex: "^pending$", $options: "i" } },
              { status: { $exists: false } },
              { status: null },
              { status: "" },
            ],
          },
          { detailedStatus: { $ne: "Billing Done" } },
        ]
      });
      filter.$and.push({
        send_for_billing: true
      });
    } else if (statusLower === "club-jobs") {
      filter.$and.push({
        $or: [
          { is_club_job_parent: true },
          { parent_club_job: { $exists: true, $ne: null, $ne: "" } }
        ]
      });
      filter.$and.push({
        $or: [
          { status: { $regex: "^pending$", $options: "i" } },
          { status: { $exists: false } },
          { status: null },
          { status: "" },
        ]
      });
      filter.$and.push({ detailedStatus: { $ne: "Billing Done" } });
      filter.$and.push({ isJobCanceled: { $ne: true } });
    } else {
      if (onlyPending) {
        filter.$and.push({
          status: { $nin: ["Completed", "completed", "Cancelled", "cancelled"] },
          isJobCanceled: { $ne: true },
          detailedStatus: { $ne: "Billing Done" }
        });
      }
    }

    if (startDate || endDate) {
      const getEffDateExpr = () => ({
        $cond: {
          if: {
            $and: [
              { $ne: ["$job_date", null] },
              { $ne: ["$job_date", ""] },
              { $regexMatch: { input: { $ifNull: ["$job_date", ""] }, regex: "^\\d{2}-\\d{2}-\\d{4}$" } }
            ]
          },
          then: {
            $dateFromString: {
              dateString: "$job_date",
              format: "%d-%m-%Y",
              onError: "$createdAt"
            }
          },
          else: "$createdAt"
        }
      });

      filter.$and.push({
        $expr: {
          $let: {
            vars: {
              effDate: getEffDateExpr()
            },
            in: {
              $and: [
                ...(startDate ? [{ $gte: ["$$effDate", new Date(startDate + "T00:00:00.000Z")] }] : []),
                ...(endDate ? [{ $lte: ["$$effDate", new Date(endDate + "T23:59:59.999Z")] }] : [])
              ]
            }
          }
        }
      });
    }

    if (filter.$and.length === 0) {
      delete filter.$and;
    }

    const MAX_JOBS_FOR_REPORT = 5000; // Increased for background job

    const jobs = await ExportJob.find(filter)
      .sort({ createdAt: -1 })
      .limit(MAX_JOBS_FOR_REPORT)
      .lean();

    if (!jobs || jobs.length === 0) {
      throw new Error("No jobs found for the selected exporter");
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("DSR Report");

    // Define columns
    worksheet.columns = [
      { header: "Container placement date", key: "container_placement_date", width: 22 },
      { header: "Origin docs received", key: "origin_docs_received", width: 20 },
      { header: "Handover date", key: "handover_date", width: 18 },
      { header: "Gate in at thar/khodiyar date & time", key: "gate_in_thar", width: 30 },
      { header: "Rail out date from icd (planned)", key: "rail_out_planned", width: 30 },
      { header: "Rail out date (actual)", key: "rail_out_actual", width: 20 },
      { header: "Cntr port gate in date", key: "cntr_port_gate_in", width: 22 },
      { header: "Remarks", key: "remarks", width: 30 },
      { header: "Lcl / fcl / air", key: "consignment_type", width: 15 },
      { header: "Remarks", key: "milestone_remarks", width: 65 },
      { header: "Port of origin", key: "port_of_origin", width: 20 },
      { header: "Job number", key: "job_no", width: 20 },
      { header: "EGM No", key: "egm_no", width: 18 },
      { header: "EGM Date", key: "egm_date", width: 15 },
      { header: "Cntr 20 / 40", key: "cntr_size", width: 15 },
      { header: "Exporter", key: "exporter", width: 25 },
      { header: "FWDR Name", key: "fwdr_name", width: 25 },
      { header: "3rd Party", key: "third_party", width: 25 },
      { header: "Booking No", key: "booking_no", width: 20 },
      { header: "S/L", key: "shipping_line", width: 25 },
      { header: "Consignee name", key: "consignee_name", width: 30 },
      { header: "Exporter Ref No", key: "exporter_ref_no", width: 20 },
      { header: "Invoice no", key: "invoice_no", width: 25 },
      { header: "Invoice date", key: "invoice_date", width: 20 },
      { header: "Invoice value", key: "invoice_value", width: 25 },
      { header: "Sb number", key: "sb_no", width: 15 },
      { header: "Sb date", key: "sb_date", width: 15 },
      { header: "Drawback Scroll No", key: "drawback_scroll_no", width: 22 },
      { header: "Drawback Scroll Date", key: "drawback_scroll_date", width: 22 },
      { header: "RoSCTL Scroll No", key: "rosctl_scroll_no", width: 22 },
      { header: "RoSCTL Scroll Date", key: "rosctl_scroll_date", width: 22 },
      { header: "No of packages", key: "no_of_packages", width: 15 },
      { header: "Net weight (kgs)", key: "net_weight", width: 18 },
      { header: "Gross weight (kgs)", key: "gross_weight", width: 18 },
      { header: "Port", key: "port_details", width: 25 },
      { header: "Country", key: "country_details", width: 25 },
    ];

    // Add rows
    const formatDate = (dateStr) => {
      if (!dateStr || typeof dateStr !== 'string') return "";
      const trimmed = dateStr.trim();
      if (!trimmed) return "";

      // check if already DD-MM-YYYY
      if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
        return trimmed;
      }

      // check if dd-MMM-yyyy (e.g. 23-Jan-2026)
      const months = {
        jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
        jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
      };
      const parts = trimmed.split(/[-/]/);
      if (parts.length >= 3) {
        let day = parts[0];
        let month = parts[1];
        let year = parts[2].split(/\s+/)[0]; // strip time if present

        if (day.length === 1) day = "0" + day;

        const lowerMonth = month.toLowerCase();
        if (months[lowerMonth]) {
          month = months[lowerMonth];
        } else if (months[lowerMonth.substring(0, 3)]) {
          month = months[lowerMonth.substring(0, 3)];
        } else if (month.length === 1) {
          month = "0" + month;
        }

        if (year.length === 2) {
          year = "20" + year;
        }

        if (/^\d{2}$/.test(day) && /^\d{2}$/.test(month) && /^\d{4}$/.test(year)) {
          return `${day}-${month}-${year}`;
        }
      }

      try {
        const d = new Date(trimmed);
        if (!isNaN(d.getTime())) {
          const day = String(d.getDate()).padStart(2, "0");
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        }
      } catch (e) { }

      return trimmed;
    };

    const cleanPort = (portStr) => {
      if (!portStr) return "";
      const parts = portStr.split("-");
      const name = parts[parts.length - 1].trim();
      return name.toUpperCase();
    };

    jobs.forEach((job) => {
      const firstOp = job.operations?.[0] || {};
      const status = firstOp.statusDetails?.[0] || {};

      let cntrSize = "";
      const cType = (job.consignmentType || "").toUpperCase();
      if (cType === "AIR" || cType === "LCL") {
        cntrSize = job.consignmentType;
      } else {
        const type = job.containers?.[0]?.type || "";
        const match = type.match(/20|40/);
        if (match) {
          cntrSize = match[0];
        } else {
          cntrSize = type;
        }
      }

      const sb_date = formatDate(job.sb_date);
      const gateInDate = formatDate(status.gateInDate);
      const leoDate = formatDate(status.leoDate);
      const handoverForwardingNoteDate = formatDate(status.handoverForwardingNoteDate);
      const handoverConcorTharSanganaRailRoadDate = formatDate(status.handoverConcorTharSanganaRailRoadDate);
      const eGatePassCopyDate = formatDate(status.eGatePassCopyDate);
      const railOutReachedDate = formatDate(status.railOutReachedDate);
      const portOfLoading = cleanPort(job.port_of_loading);

      const customHouse = (job.custom_house || "").toUpperCase().trim();
      const location = customHouse.startsWith("ICD") ? customHouse.replace(/\s+/g, "-") : (customHouse || "ICD-SANAND");

      const rawConsignmentType = (job.consignmentType || "").toUpperCase();
      const stuffedAt = (job.goods_stuffed_at || "").toUpperCase();

      let category = "";
      if (rawConsignmentType === "AIR") {
        category = "AIR";
      } else if (rawConsignmentType === "LCL") {
        category = "LCL";
      } else if (rawConsignmentType === "FCL") {
        if (stuffedAt === "FACTORY") {
          category = "FCL_FACTORY";
        } else {
          category = "FCL_DOCK";
        }
      } else {
        if (rawConsignmentType.includes("AIR")) {
          category = "AIR";
        } else if (rawConsignmentType.includes("LCL")) {
          category = "LCL";
        } else if (rawConsignmentType.includes("FACTORY")) {
          category = "FCL_FACTORY";
        } else if (rawConsignmentType.includes("DOCK") || rawConsignmentType.includes("FCL")) {
          category = "FCL_DOCK";
        }
      }

      const remarksParts = [];

      if (category === "AIR") {
        if (sb_date) {
          remarksParts.push(`DOCS RECD FOR SB FILING ON ${sb_date}`);
          remarksParts.push(`SB FILED ON  ${sb_date}`);
        }
        if (gateInDate) {
          remarksParts.push(`CARGO ARRIVED AT AIRPORT ON ${gateInDate}`);
        }
        if (leoDate) {
          remarksParts.push(`LEO ON ${leoDate}`);
        }
        if (handoverForwardingNoteDate) {
          remarksParts.push(`CUST CLEARANCE DONE`);
        }
        if (handoverConcorTharSanganaRailRoadDate) {
          remarksParts.push(`FILE H O TO ${handoverConcorTharSanganaRailRoadDate}`);
        }
      } else if (category === "FCL_DOCK") {
        if (sb_date) {
          remarksParts.push(`DOCS RECD FOR SB FILING ON ${sb_date}`);
          remarksParts.push(`SB FILED ON  ${sb_date}`);
        }
        if (gateInDate) {
          remarksParts.push(`CARGO ARRIVED AT ${location} ON ${gateInDate}`);
        }
        if (leoDate) {
          remarksParts.push(`LEO ON ${leoDate}`);
        }
        if (handoverForwardingNoteDate) {
          remarksParts.push(`D.O ON ${handoverForwardingNoteDate}`);
        }
        if (eGatePassCopyDate) {
          remarksParts.push(`STUFFING DONE`);
        }
        if (handoverForwardingNoteDate) {
          remarksParts.push(`CUST CLEARANCE DONE`);
          remarksParts.push(`CNTR H O TO ON ${handoverForwardingNoteDate}`);
        }
        if (railOutReachedDate) {
          const polStr = portOfLoading ? `POL:${portOfLoading} ` : "";
          remarksParts.push(`${polStr}CNTR RAIL OUT ON ${railOutReachedDate}`);
        }
      } else if (category === "LCL") {
        if (sb_date) {
          remarksParts.push(`DOCS RECD FOR SB FILING ON ${sb_date}`);
          remarksParts.push(`SB FILED ON  ${sb_date}`);
        }
        if (gateInDate) {
          remarksParts.push(`CARGO ARRIVED AT ${location} ON ${gateInDate}`);
        }
        if (leoDate) {
          remarksParts.push(`LEO ON ${leoDate}`);
        }
        if (handoverForwardingNoteDate) {
          remarksParts.push(`CUST CLEARANCE DONE`);
        }
        if (handoverConcorTharSanganaRailRoadDate) {
          remarksParts.push(`FILE H O TO ON ${handoverConcorTharSanganaRailRoadDate}`);
        }
      } else if (category === "FCL_FACTORY") {
        if (sb_date) {
          remarksParts.push(`DOCS RECD FOR SB FILING ON ${sb_date}`);
          remarksParts.push(`SB FILED ON  ${sb_date}`);
        }
        if (gateInDate) {
          remarksParts.push(`FS CNTR ARRIVED AT ${location} ON ${gateInDate}`);
        }
        if (leoDate) {
          remarksParts.push(`LEO ON ${leoDate}`);
        }
        if (handoverForwardingNoteDate) {
          remarksParts.push(`CUST CLEARANCE DONE`);
          remarksParts.push(`CNTR H O TO ON ${handoverForwardingNoteDate}`);
        }
        if (railOutReachedDate) {
          const polStr = portOfLoading ? `POL:${portOfLoading} ` : "";
          remarksParts.push(`${polStr}CNTR RAIL OUT ON ${railOutReachedDate}`);
        }
      }

      let milestoneRemarksStr = "";
      if (remarksParts.length > 0) {
        milestoneRemarksStr = remarksParts.join(", ") + ".";
      } else {
        milestoneRemarksStr = job.milestones
          ?.map((m) => m.remarks)
          .filter((r) => r && r.trim() !== "")
          .join(", ") || "";
      }

      const scrollAndEgm = extractScrollAndEgmInfo(job);

      // Handle multiple invoices for Excel
      let invNos = [];
      let invDates = [];
      let invVals = [];
      if (job.invoices && job.invoices.length > 0) {
        job.invoices.forEach(inv => {
          if (inv.invoiceNumber || inv.invoiceNo) invNos.push(inv.invoiceNumber || inv.invoiceNo);
          if (inv.invoiceDate || inv.invoice_date) invDates.push(formatDate(inv.invoiceDate || inv.invoice_date));
          const val = inv.invoiceValue || inv.amount || inv.invValue || inv.invoice_value;
          if (val !== undefined && val !== null && val !== "") {
            const term = inv.termsOfInvoice || inv.terms_of_invoice ? (inv.termsOfInvoice || inv.terms_of_invoice) + " " : "";
            const curr = inv.currency || job.currency || "USD";
            invVals.push(`${term}${curr} ${val}`);
          }
        });
      }
      if (invNos.length === 0 && (job.invoice_number || job.invoice_no)) {
        invNos.push(job.invoice_number || job.invoice_no);
        if (job.invoice_date) invDates.push(formatDate(job.invoice_date));
        if (job.invoice_value) invVals.push(`${job.currency || "USD"} ${job.invoice_value}`);
      }

      worksheet.addRow({
        container_placement_date: status.containerPlacementDate || "",
        origin_docs_received: job.job_date || "",
        handover_date: status.handoverForwardingNoteDate || "",
        gate_in_thar: status.gateInDate || "",
        rail_out_planned: status.handoverConcorTharSanganaRailRoadDate || "",
        rail_out_actual: status.railOutReachedDate || "",
        cntr_port_gate_in: status.gateInDate || "",
        remarks: job.customerremark,
        consignment_type: job.consignmentType || "",
        milestone_remarks: milestoneRemarksStr,
        port_of_origin: job.custom_house || "",
        job_no: job.job_no || "",
        egm_no: scrollAndEgm.egmNo,
        egm_date: formatDate(scrollAndEgm.egmDate),
        cntr_size: cntrSize,
        exporter: job.exporter || "",
        fwdr_name: scrollAndEgm.fwdrName,
        third_party: scrollAndEgm.thirdPartyName,
        booking_no: scrollAndEgm.bookingNo,
        shipping_line: scrollAndEgm.shippingLine,
        consignee_name: job.consignees?.[0]?.consignee_name || "",
        exporter_ref_no: job.exporter_ref_no || "",
        invoice_no: invNos.join("\n"),
        invoice_date: invDates.join("\n"),
        invoice_value: invVals.join("\n"),
        sb_no: job.sb_no || "",
        sb_date: sb_date,
        drawback_scroll_no: scrollAndEgm.dbkScrolls.map(s => s.no).join("\n"),
        drawback_scroll_date: scrollAndEgm.dbkScrolls.map(s => formatDate(s.date)).join("\n"),
        rosctl_scroll_no: scrollAndEgm.rosctlScrolls.map(s => s.no).join("\n"),
        rosctl_scroll_date: scrollAndEgm.rosctlScrolls.map(s => formatDate(s.date)).join("\n"),
        no_of_packages: job.total_no_of_pkgs || 0,
        net_weight: job.net_weight_kg || 0,
        gross_weight: job.gross_weight_kg || 0,
        port_details: `Destination: ${job.destination_port || ""}\nDischarge: ${job.port_of_discharge || ""}`,
        country_details: `Destination: ${job.destination_country || ""}\nDischarge: ${job.discharge_country || ""}`,
      });
    });

    // Style the header
    const headerRow = worksheet.getRow(1);
    headerRow.height = 60;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 11, color: { argb: "FF000000" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFFF00" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    });

    // Set Column Widths
    worksheet.columns.forEach(column => {
      column.width = column.width || 15;
    });

    // Apply borders
    worksheet.eachRow((row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      });
    });

    return await workbook.xlsx.writeBuffer();
  } catch (error) {
    console.error("Error generating DSR buffer:", error);
    throw error;
  }
};
