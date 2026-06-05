import express from "express";
import PurchaseBookEntryModel from "../../model/export/purchaseBookEntryModel.mjs";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import Directory from "../../model/Directorties/Directory.js";
import PaymentRequestModel from "../../model/export/paymentRequestModel.mjs";
import ExcelJS from "exceljs";

const router = express.Router();

const formatDateToDDMMYYYY = (dateVal) => {
    if (!dateVal) return "";
    const str = String(dateVal).trim();
    const ymdMatch = str.match(/^(\d{4})[\-\/](\d{2})[\-\/](\d{2})/);
    if (ymdMatch) {
        return `${ymdMatch[3]}-${ymdMatch[2]}-${ymdMatch[1]}`;
    }
    const dmyMatch = str.match(/^(\d{2})[\-\/](\d{2})[\-\/](\d{4})/);
    if (dmyMatch) {
        return `${dmyMatch[1]}-${dmyMatch[2]}-${dmyMatch[3]}`;
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    }
    return str;
};

router.get("/api/report/tds-payable-register", async (req, res) => {
  const { year, branchId, startDate, endDate } = req.query;

  try {
    const query = { tds: { $gt: 0 } };
    if (branchId && branchId !== "all") {
        // We might need to join with Job to get branch_code/branch_id
    }

    // Date filtering logic
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    } else if (year && year !== "all") {
      const parts = year.split("-");
      if (parts.length === 2) {
        const startY = 2000 + parseInt(parts[0], 10);
        const endY = 2000 + parseInt(parts[1], 10);
        query.createdAt = {
          $gte: new Date(`${startY}-04-01T00:00:00.000Z`),
          $lte: new Date(`${endY}-03-31T23:59:59.999Z`),
        };
      }
    }

    const entries = await PurchaseBookEntryModel.find(query).lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("TDS Payable Register");

    worksheet.columns = [
      { header: "Org Type", key: "orgType", width: 15 },
      { header: "Purchase Book Date", key: "pbDate", width: 15 },
      { header: "Type", key: "type", width: 10 },
      { header: "Trans No.", key: "transNo", width: 25 },
      { header: "Party Name", key: "partyName", width: 30 },
      { header: "Deductee PAN", key: "pan", width: 15 },
      { header: "Vendor Ref No.", key: "vendorRefNo", width: 20 },
      { header: "Vendor Bill Amount (INR)", key: "total", width: 20 },
      { header: "Taxable Amount (INR)", key: "taxableValue", width: 20 },
      { header: "GST Amount (INR)", key: "gstAmount", width: 15 },
      { header: "TDS Code", key: "tdsCode", width: 15 },
      { header: "TDS Section Code", key: "tdsSection", width: 15 },
      { header: "TDS %", key: "tdsPercent", width: 10 },
      { header: "TDS Amount (INR)", key: "tdsAmount", width: 15 },
    ];

    // Style the header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };

    for (const entry of entries) {
      // Fetch Job and Party details for enrichment
      const [job, party] = await Promise.all([
          ExJobModel.findById(entry.jobRef).lean(),
          Directory.findOne({ 
              $or: [
                  { "registrationDetails.panNo": entry.pan },
                  { "branchInfo.gstNo": entry.gstinNo }
              ] 
          }).lean()
      ]);

      if (branchId && branchId !== "all" && job?.branch_code !== branchId) {
          continue; 
      }

      const charge = job?.charges?.find(c => c._id?.toString() === entry.chargeRef);
      const tdsCategory = charge?.cost?.tdsCategory || '';
      
      let chargeCategory = entry.chargeHeadCategory;
      if (!chargeCategory && job) {
          if (entry.chargeRef) {
              const c = job.charges?.find(ch => ch._id?.toString() === entry.chargeRef);
              if (c) {
                  chargeCategory = c.chargeType || c.category || '';
              }
          }
          if (!chargeCategory && entry.chargeHeading) {
              const normHeading = entry.chargeHeading.trim().toLowerCase();
              const c = job.charges?.find(ch => ch.chargeHead?.trim().toLowerCase() === normHeading);
              if (c) {
                  chargeCategory = c.chargeType || c.category || '';
              }
          }
      }

      const isReimbursement = (chargeCategory || '').trim().toLowerCase() === 'reimbursement';
      let gstAmount = (entry.cgstAmt || 0) + (entry.sgstAmt || 0) + (entry.igstAmt || 0);
      let taxableValue = entry.taxableValue;

      if (isReimbursement && entry.total) {
          gstAmount = parseFloat((entry.total * 18 / 118).toFixed(2));
          taxableValue = parseFloat((entry.total - gstAmount).toFixed(2));
      }

      const exemptAmount = (entry.total || 0) - (taxableValue || 0) - gstAmount + (entry.tds || 0);

      const panVal = String(entry.pan || "").trim();
      let orgType = "Proprietor";
      if (panVal.length >= 4) {
        const fourthLetter = panVal[3].toUpperCase();
        if (fourthLetter === 'C' || fourthLetter === 'F') {
          orgType = "Company";
        }
      }

      worksheet.addRow({
        orgType: orgType,
        pbDate: formatDateToDDMMYYYY(entry.entryDate),
        type: "Purchase",
        transNo: entry.entryNo,
        partyName: entry.supplierName,
        pan: entry.pan,
        vendorRefNo: entry.supplierInvNo,
        total: entry.total,
        taxableValue: entry.taxableValue,
        gstAmount: gstAmount,
        tdsCode: tdsCategory,
        tdsSection: tdsCategory ? tdsCategory.split(' ').pop() : '', // e.g. "94C" -> "94C" or "TDS... 94C" -> "94C"
        tdsPercent: charge?.cost?.tdsPercent || '',
        tdsAmount: entry.tds,
      });
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="TDS_Payable_Register_${new Date().toISOString().split('T')[0]}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Error generating TDS report:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

router.get("/api/report/billing-charges-excel", async (req, res) => {
  const { year, branchId, startDate, endDate, type } = req.query;

  try {
    const query = {};
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    } else if (year && year !== "all") {
      const parts = year.split("-");
      if (parts.length === 2) {
        const startY = 2000 + parseInt(parts[0], 10);
        const endY = 2000 + parseInt(parts[1], 10);
        query.createdAt = {
          $gte: new Date(`${startY}-04-01T00:00:00.000Z`),
          $lte: new Date(`${endY}-03-31T23:59:59.999Z`),
        };
      }
    }

    const workbook = new ExcelJS.Workbook();
    const sheetName = type === 'pb' ? 'Purchase Book' : 'Payment Requests';
    const worksheet = workbook.addWorksheet(sheetName);

    if (type === 'pb') {
      worksheet.columns = [
        { header: "Entry No", key: "entryNo", width: 25 },
        { header: "Date", key: "entryDate", width: 15 },
        { header: "Job No", key: "jobNo", width: 25 },
        { header: "Supplier", key: "supplierName", width: 30 },
        { header: "GSTIN", key: "gstinNo", width: 20 },
        { header: "Inv No", key: "supplierInvNo", width: 20 },
        { header: "Inv Date", key: "supplierInvDate", width: 15 },
        { header: "Taxable", key: "taxableValue", width: 15 },
        { header: "GST", key: "gst", width: 15 },
        { header: "TDS", key: "tds", width: 15 },
        { header: "Total", key: "total", width: 15 },
        { header: "Net Amount", key: "netAmount", width: 15 },
        { header: "Charge Category", key: "chargeCategory", width: 20 },
        { header: "Status", key: "status", width: 15 },
      ];

      const entries = await PurchaseBookEntryModel.find(query).lean();
      for (const entry of entries) {
        let job = null;
        let chargeCategory = entry.chargeHeadCategory;
        
        // We need job either for branch filter or missing chargeCategory fallback
        if (!chargeCategory || (branchId && branchId !== 'all')) {
            if (entry.jobRef) {
                job = await ExJobModel.findById(entry.jobRef).lean();
            }
            if (!job && entry.jobNo) {
                job = await ExJobModel.findOne({ job_no: entry.jobNo }).lean();
            }
            
            if (branchId && branchId !== 'all' && job?.branch_code !== branchId) continue;
            
            if (!chargeCategory && job) {
                let charge = null;
                if (entry.chargeRef) {
                    charge = job.charges?.find(c => c._id?.toString() === entry.chargeRef);
                }
                if (!charge && entry.chargeHeading) {
                    const normHeading = entry.chargeHeading.trim().toLowerCase();
                    charge = job.charges?.find(c => c.chargeHead?.trim().toLowerCase() === normHeading);
                }
                if (charge) {
                    chargeCategory = charge.chargeType || charge.category || '';
                }
            }
        }

        const isReimbursement = (chargeCategory || '').trim().toLowerCase() === 'reimbursement';
        let gst = (entry.cgstAmt || 0) + (entry.sgstAmt || 0) + (entry.igstAmt || 0);
        let taxableValue = entry.taxableValue;

        if (isReimbursement && entry.total) {
            gst = parseFloat((entry.total * 18 / 118).toFixed(2));
            taxableValue = parseFloat((entry.total - gst).toFixed(2));
        }

        let totalVal = entry.total;
        if (!isReimbursement) {
            totalVal = (taxableValue || 0) + (gst || 0);
        }

        const netAmount = entry.netAmount !== undefined && entry.netAmount !== null
            ? entry.netAmount
            : (totalVal - (entry.tds || 0));

        worksheet.addRow({
          entryNo: entry.entryNo,
          entryDate: formatDateToDDMMYYYY(entry.entryDate),
          jobNo: entry.jobNo,
          supplierName: entry.supplierName,
          gstinNo: entry.gstinNo,
          supplierInvNo: entry.supplierInvNo,
          supplierInvDate: formatDateToDDMMYYYY(entry.supplierInvDate),
          taxableValue: taxableValue,
          gst: gst,
          tds: entry.tds,
          total: totalVal,
          netAmount: netAmount,
          chargeCategory: chargeCategory || '',
          status: entry.status || 'Finalized',
        });
      }
    } else {
      // Payment Request
      worksheet.columns = [
        { header: "EXPORTER", key: "exporter", width: 30 },
        { header: "SB NO", key: "sbNo", width: 15 },
        { header: "SHIPPING LINE", key: "shippingLine", width: 25 },
        { header: "BOOKING NO", key: "bookingNo", width: 20 },
        { header: "CONTAINER NO", key: "containerNo", width: 30 },
        { header: "JOB NO", key: "jobNo", width: 25 },
        { header: "Payment Request No", key: "requestNo", width: 25 },
        { header: "Date", key: "requestDate", width: 15 },
        { header: "Transaction Mode", key: "transactionMode", width: 20 },
        { header: "Completion Date", key: "completionDate", width: 15 },
        { header: "Amount", key: "amount", width: 15 },
        { header: "bankFrom", key: "bankFrom", width: 20 },
        { header: "paymentTo", key: "paymentTo", width: 30 },
      ];

      const formatToDDMMYYYY = (dateVal) => {
        return formatDateToDDMMYYYY(dateVal) || "-";
      };

      const normalizeDate = (dateVal) => {
        if (!dateVal) return "";
        const str = String(dateVal).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
        const dmyMatch = str.match(/^(\d{2})[\-\/](\d{2})[\-\/](\d{4})/);
        if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
        const isoMatch = str.match(/^(\d{4}-\d{2}-\d{2})T/);
        if (isoMatch) return isoMatch[1];
        const d = new Date(str);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        return str;
      };

      const entries = await PaymentRequestModel.find(query).lean();
      for (const entry of entries) {
        let job = null;
        if (entry.jobRef) {
          job = await ExJobModel.findById(entry.jobRef).lean();
        }
        if (!job && entry.jobNo) {
          job = await ExJobModel.findOne({ job_no: entry.jobNo }).lean();
        }

        if (branchId && branchId !== 'all' && job?.branch_code !== branchId) {
          continue;
        }

        const parsedReqDate = entry.requestDate ? normalizeDate(entry.requestDate) : (entry.createdAt ? entry.createdAt.toISOString().split('T')[0] : '');

        let status = entry.status || "";
        let completionDate = "-";
        
        if (job) {
          const charge = job.charges?.find(c => c.payment_request_no === entry.requestNo);
          if (charge) {
            status = charge.payment_request_status || status;
          }
        }

        if (status?.toLowerCase() === 'completed') {
          completionDate = formatToDDMMYYYY(entry.updatedAt);
        }

        worksheet.addRow({
          exporter: job?.exporter || "",
          sbNo: job?.sb_no || "",
          shippingLine: job?.shipping_line_airline || "",
          bookingNo: job?.booking_no || "",
          containerNo: (job?.containers || []).map(c => c.containerNo || c.container_number).filter(Boolean).join(", ") || "",
          jobNo: entry.jobNo || job?.job_no || "",
          requestNo: entry.requestNo,
          requestDate: parsedReqDate ? formatToDDMMYYYY(parsedReqDate) : "-",
          transactionMode: entry.transactionType || "NEFT",
          completionDate: completionDate,
          amount: entry.amount || 0,
          bankFrom: entry.bankFrom || "-",
          paymentTo: entry.paymentTo || "-",
        });
      }
    }

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="Billing_Report_${type}_${new Date().toISOString().split('T')[0]}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating billing report:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

export default router;
