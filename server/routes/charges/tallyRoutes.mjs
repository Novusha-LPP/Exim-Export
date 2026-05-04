import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import authApiKey from "../../middleware/authApiKey.mjs";
import PurchaseBookEntryModel from "../../model/export/purchaseBookEntryModel.mjs";
import PaymentRequestModel from "../../model/export/paymentRequestModel.mjs";

const router = express.Router();

/**
 * Normalize any date to yyyy-MM-dd format
 * Handles: dd-MM-yyyy, dd/MM/yyyy, yyyy-MM-dd, ISO strings, Date objects
 */
const normalizeDate = (dateVal) => {
    if (!dateVal) return "";
    const str = String(dateVal).trim();
    // Already yyyy-MM-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    // dd-MM-yyyy or dd/MM/yyyy
    const dmyMatch = str.match(/^(\d{2})[\-\/](\d{2})[\-\/](\d{4})/);
    if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
    // ISO string like 2026-05-04T05:38:55.109Z
    const isoMatch = str.match(/^(\d{4}-\d{2}-\d{2})T/);
    if (isoMatch) return isoMatch[1];
    // Try Date parse as last resort
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return str;
};

router.get("/test", (req, res) => res.json({ status: "Tally API is connected and working!" }));

/**
 * @api {get} /api/tally/job-data Retrieve job data for Tally integration
 */
/**
 * Internal helper to retrieve and format job data for Tally
 */
const getJobDetailsInternal = async (job_number) => {
    if (!job_number) return null;
    const job = await ExJobModel.findOne({ job_no: job_number }).lean();
    if (!job) return null;

    return {
        "Job Number": job.job_no,
        "Job Year": job.year || "",
        "Job Type": "EXPORT",
        "Job Date": normalizeDate(job.createdAt),
        "ImporterExporter Name": job.exporter || "",
        "Consignee": job.consignees?.[0]?.consignee_name || "",
        "Shipper": job.shipper || "",
        "Origin Port": job.port_of_loading || "",
        "Destination Port": job.port_of_discharge || "",
        "Custom House": job.custom_house || "",
        "Gross Weight": job.gross_weight_kg || "",
        "Net Wt.": job.net_weight_kg || "",
        "Package Count": job.total_no_of_pkgs || "",
        "Package Unit": job.package_unit || "",
        "Container Count": (() => {
            const containers = job.containers || [];
            if (containers.length === 0) return "0";
            const counts = {};
            containers.forEach(c => {
                const size = c.size || "20";
                counts[size] = (counts[size] || 0) + 1;
            });
            return Object.entries(counts)
                .map(([size, count]) => `${count} X ${size}`)
                .join(", ");
        })(),
        "Containers": (job.containers || []).map(c => c.containerNo).filter(Boolean).join(", "),
        "BE No": "",
        "BE Date": "",
        "SB No": job.sb_no || "",
        "SB Date": normalizeDate(job.sb_date),
        "MBL NO": job.awb_bl_no || "",
        "MBL Date": normalizeDate(job.awb_bl_date),
        "HBL No": "",
        "HBL Date": "",
        "Vessel": job.vessel || "",
        "Voyage": job.voyage_no || "",
        "Invoice Number": job.invoice_number || "",
        "Inv Date": normalizeDate(job.invoice_date),
        "Branch": job.branch_code || "",
        "Status": (job.status || "Pending").toLowerCase()
    };
};

router.get("/job-data", authApiKey, async (req, res) => {
    try {
        const { job_number } = req.query;
        if (!job_number) {
            return res.status(400).send({ error: "job_number is a required query parameter" });
        }
        const responseData = await getJobDetailsInternal(job_number);
        if (!responseData) {
            return res.status(404).send({ error: "Job not found for the provided job_number" });
        }
        res.status(200).json(responseData);
    } catch (error) {
        console.error("Tally API Error:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});


/**
 * @api {get} /api/tally/next-sequence Retrieve the next sequence number
 */
router.get("/next-sequence", authApiKey, async (req, res) => {
    try {
        const { type, jobNo } = req.query;
        if (!type || !jobNo) {
            return res.status(400).json({ error: "type (purchase/payment) and jobNo are required" });
        }

        let count = 0;
        let prefix = "";
        if (type === "purchase") {
            count = await PurchaseBookEntryModel.countDocuments({ jobNo });
            prefix = "PB";
        } else if (type === "payment") {
            count = await PaymentRequestModel.countDocuments({ jobNo });
            prefix = "R1";
        } else {
            return res.status(400).json({ error: "Invalid type." });
        }

        const nextIndex = (count + 1).toString().padStart(2, '0');
        let fullNo = `${prefix}/${nextIndex}/${jobNo}`;

        // If jobNo has 5 parts (BRANCH/MODE/EXP/SERIAL/YEAR), rearrange for PB/R
        // Requested: PB/01/AMD/EXP/SEA/00147/26-27
        const parts = jobNo.split('/');
        if (parts.length === 5 && parts[2].toUpperCase() === 'EXP') {
            fullNo = `${prefix}/${nextIndex}/${parts[0]}/${parts[2]}/${parts[1]}/${parts[3]}/${parts[4]}`.toUpperCase();
        }

        res.status(200).json({
            success: true,
            nextIndex,
            fullNo,
            jobNo
        });

    } catch (error) {
        console.error("Next Sequence Error:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

// Helper to map Tally keys
const mapPurchaseEntryData = (data) => ({
    entryNo: data["Entry No"] || data.entryNo,
    entryDate: normalizeDate(data["Entry Date"] || data.entryDate),
    supplierInvNo: data["Supplier Inv No"] || data.supplierInvNo,
    supplierInvDate: normalizeDate(data["Supplier Inv Date"] || data.supplierInvDate),
    jobNo: data["Job No"] || data.jobNo,
    supplierName: data["Supplier Name"] || data.supplierName,
    address1: data["Address 1"] || data.address1,
    address2: data["Address 2"] || data.address2,
    address3: data["Address 3"] || data.address3,
    state: data["State"] || data.state,
    country: data["Country"] || data.country,
    pinCode: data["Pin Code"] || data.pinCode,
    registrationType: data["Registration Type"] || data.registrationType,
    gstinNo: data["GSTIN NO"] || data["GSTIN No"] || data.gstinNo,
    pan: data["PAN"] || data.pan,
    cin: data["CIN"] || data.cin,
    placeOfSupply: data["Place of Supply"] || data.placeOfSupply,
    creditTerms: data["Credit Terms"] || data.creditTerms,
    descriptionOfServices: data["Description of Services"] || data.descriptionOfServices,
    sac: data["SAC"] || data.sac,
    taxableValue: data["Taxable Value"] || data.taxableValue,
    gstPercent: data["GST%"] || data.gstPercent,
    cgstAmt: data["CGST"] || data.cgstAmt,
    sgstAmt: data["SGST"] || data.sgstAmt,
    igstAmt: data["IGST"] || data.igstAmt,
    tds: data["TDS"] || data.tds,
    total: data["Total"] || data.total,
    chargeRef: data.chargeRef,
    jobRef: data.jobRef,
    status: data["Status"] || data.status || ''
});

router.post("/purchase-entry", authApiKey, async (req, res) => {
    try {
        const data = mapPurchaseEntryData(req.body);
        const entry = await PurchaseBookEntryModel.create(data);
        res.status(201).json({ success: true, "Entry No": entry.entryNo });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ error: "Duplicate entry." });
        res.status(500).send({ error: "Internal Server Error" });
    }
});

router.get("/purchase-entry", authApiKey, async (req, res) => {
    try {
        const entryNo = req.query.entry_no || req.query.entryNo;
        if (!entryNo) return res.status(400).json({ error: "entry_no is a required query parameter" });
        const entry = await PurchaseBookEntryModel.findOne({ entryNo }).lean();
        if (!entry) return res.status(404).json({ error: "Purchase Book Entry not found." });

        // Fallback for Charge Head Category if missing
        let chargeCategory = entry.chargeHeadCategory;
        if (!chargeCategory && entry.jobRef && entry.chargeRef) {
            try {
                const job = await ExJobModel.findOne(
                    { _id: entry.jobRef, "charges._id": entry.chargeRef },
                    { "charges.$": 1 }
                ).lean();
                if (job && job.charges && job.charges[0]) {
                    chargeCategory = job.charges[0].category;
                }
            } catch (err) {
                console.error("Error fetching fallback category for purchase entry:", err);
            }
        }

        const formattedData = {
            "Entry No": entry.entryNo,
            "Entry Date": normalizeDate(entry.entryDate),
            "Supplier Inv No": entry.supplierInvNo,
            "Supplier Inv Date": normalizeDate(entry.supplierInvDate),
            "Job No": entry.jobNo,
            "Supplier Name": entry.supplierName,
            "Address 1": entry.address1,
            "Address 2": entry.address2,
            "Address 3": entry.address3,
            "State": entry.state,
            "Country": entry.country,
            "Pin Code": entry.pinCode,
            "Registration Type": entry.registrationType,
            "GSTIN No": entry.gstinNo,
            "PAN": entry.pan,
            "CIN": entry.cin,
            "Place of Supply": entry.placeOfSupply,
            "Credit Terms": entry.creditTerms,
            "Description of Services": entry.descriptionOfServices || "",
            "Charge Heading": entry.chargeHeading || "",
            "SAC": entry.sac,
            "Taxable Value": entry.taxableValue,
            "GST%": entry.gstPercent,
            "CGST": entry.cgstAmt,
            "SGST": entry.sgstAmt,
            "IGST": entry.igstAmt,
            "TDS": entry.tds,
            "Total": entry.total,
            "Charge Description": entry.chargeDescription || '',
            "Charge Head Category": chargeCategory || '',
            "TDS Category": entry.tdsCategory || '94C',
            "Status": entry.status
        };

        // Include Job Details
        const job_number = entry.jobNo;
        const jobDetails = await getJobDetailsInternal(job_number);
        if (jobDetails) {
            formattedData["Job Details"] = jobDetails;
        }

        res.status(200).json(formattedData);
    } catch (error) {
        console.error("Fetch Purchase Entry Error:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

const mapPaymentRequestData = (data) => ({
    requestNo: data["Request No"] || data.requestNo,
    requestDate: normalizeDate(data["Request Date"] || data.requestDate),
    bankFrom: data["Bank From"] || data.bankFrom,
    paymentTo: data["Payment To"] || data.paymentTo,
    againstBill: data["Against Bill"] || data.againstBill,
    amount: data["Amount"] || data.amount,
    transactionType: data["Transaction Type"] || data.transactionType,
    accountNo: data["Account No"] || data.accountNo,
    ifscCode: data["IFSC Code"] || data.ifscCode,
    bankName: data["Bank Name"] || data.bankName,
    jobNo: data["Job No"] || data.jobNo,
    chargeRef: data.chargeRef,
    jobRef: data.jobRef,
    instrumentNo: data["Instrument No"] || data.instrumentNo,
    instrumentDate: normalizeDate(data["Instrument Date"] || data.instrumentDate),
    transferMode: data["Transfer Mode"] || data.transferMode,
    beneficiaryCode: data["Beneficiary Code"] || data.beneficiaryCode,
    grossAmount: data["Gross Amount"] || data.grossAmount,
    tdsAmount: data["TDS Amount"] || data.tdsAmount,
    tdsCategory: data["TDS Category"] || data.tdsCategory,
    status: data["Status"] || data.status || ''
});

router.post("/payment-request", authApiKey, async (req, res) => {
    try {
        const data = mapPaymentRequestData(req.body);
        const request = await PaymentRequestModel.create(data);
        res.status(201).json({ success: true, "Request No": request.requestNo });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ error: "Duplicate." });
        res.status(500).send({ error: "Internal Server Error" });
    }
});

router.get("/payment-request", authApiKey, async (req, res) => {
    try {
        const requestNo = req.query.request_no || req.query.requestNo;
        if (!requestNo) {
            return res.status(400).json({ error: "request_no required" });
        }

        const request = await PaymentRequestModel.findOne({ requestNo }).lean();
        if (!request) {
            return res.status(404).json({ error: "Not found" });
        }

        // Enrich with charge details from the job
        let enriched = { ...request };
        if (request.chargeRef && request.jobRef) {
            try {
                const job = await ExJobModel.findById(request.jobRef).lean();
                if (job) {
                    const charge = job.charges?.find(c => c._id?.toString() === request.chargeRef);
                    if (charge) {
                        const cost = charge.cost || {};
                        enriched.chargeHead = charge.chargeHead || "";
                        enriched.category = charge.category || "";
                        enriched.invoiceNo = charge.invoice_number || cost.invoiceNo || "";
                        enriched.invoiceDate = charge.invoice_date || cost.invoiceDate || "";
                        enriched.description = cost.chargeDescription || charge.chargeHead || "";
                        enriched.url = cost.url || [];

                        // GST details
                        enriched.isGst = cost.isGst || false;
                        enriched.gstPercent = cost.gstRate || 18;
                        enriched.taxableValue = cost.basicAmount || 0;
                        enriched.gstAmount = cost.gstAmount || 0;
                        enriched.cgstAmt = cost.cgst || 0;
                        enriched.sgstAmt = cost.sgst || 0;
                        enriched.igstAmt = cost.igst || 0;

                        // TDS details
                        enriched.isTds = cost.isTds || false;
                        enriched.tdsPercent = cost.tdsPercent || 0;
                        enriched.tdsAmount = enriched.tdsAmount || cost.tdsAmount || 0;
                        enriched.netPayable = cost.netPayable || request.amount || 0;

                        // Party details
                        enriched.partyName = cost.partyName || request.paymentTo || "";
                        enriched.partyType = cost.partyType || "";
                    }

                    // Enrich with supplier directory info (GSTIN, PAN, address)
                    enriched.jobNo = enriched.jobNo || job.job_no || "";
                }
            } catch (e) {
                console.error("Error enriching payment request:", e);
            }
        }

        // Try to get supplier GSTIN/PAN/address from directory
        if (enriched.paymentTo) {
            try {
                const mongoose = (await import("mongoose")).default;
                const DirectoryModel = mongoose.models.directory || mongoose.model("directory", new mongoose.Schema({}, { strict: false, collection: "directories" }));
                const supplier = await DirectoryModel.findOne({ organization: { $regex: new RegExp(`^${enriched.paymentTo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }).lean();
                if (supplier) {
                    const branch = supplier.branchInfo?.[0] || {};
                    enriched.address = [branch.address, branch.city, branch.state, branch.country, branch.pinCode ? `- ${branch.pinCode}` : ""].filter(Boolean).join(", ");
                    enriched.gstin = branch.gst || supplier.gstin || "";
                    enriched.pan = supplier.pan || enriched.gstin?.substring(2, 12) || "";
                }
            } catch (dirErr) {
                console.error("Directory lookup error:", dirErr);
            }
        }

        // Include Job Details
        const job_number = enriched.jobNo;
        const jobDetails = await getJobDetailsInternal(job_number);
        if (jobDetails) {
            enriched["Job Details"] = jobDetails;
        }

        res.status(200).json(enriched);
    } catch (error) {
        console.error("Payment request fetch error:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

export default router;
