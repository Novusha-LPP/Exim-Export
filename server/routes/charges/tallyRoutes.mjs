import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import authApiKey from "../../middleware/authApiKey.mjs";
import PurchaseBookEntryModel from "../../model/export/purchaseBookEntryModel.mjs";
import PaymentRequestModel from "../../model/export/paymentRequestModel.mjs";

const router = express.Router();

router.get("/test", (req, res) => res.json({ status: "Tally API is connected and working!" }));

/**
 * @api {get} /api/tally/job-data Retrieve job data for Tally integration
 */
router.get("/job-data", authApiKey, async (req, res) => {
    try {
        const { job_number } = req.query;

        if (!job_number) {
            return res.status(400).send({ error: "job_number is a required query parameter" });
        }

        const job = await ExJobModel.findOne({ job_no: job_number }).lean();

        if (!job) {
            return res.status(404).send({ error: "Job not found for the provided job_number" });
        }

        const responseData = {
            "Job Number": job.job_no,
            "Job Year": job.year || "",
            "Job Type": "EXPORT",
            "Job Date": job.createdAt,
            "Importer/Exporter Name": job.exporter || "",
            "Consignee": job.consignees?.[0]?.consignee_name || "",
            "Shipper": job.shipper || "",
            "Origin Port": job.port_of_loading || "",
            "Destination Port": job.port_of_discharge || "",
            "Gross Weight": job.gross_weight_kg || "",
            "Net Weight": job.net_weight_kg || "",
            "Package Count": job.total_no_of_pkgs || "",
            "Package Unit": job.package_unit || "",
            "Container Count": job.containers?.length || 0,
            "BE No": "",
            "BE Date": "",
            "SB No": job.sb_no || "",
            "SB Date": job.sb_date || "",
            "Status": job.status || ""
        };

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
        const fullNo = `${prefix}/${nextIndex}/${jobNo}`;

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
    entryDate: data["Entry Date"] || data.entryDate,
    supplierInvNo: data["Supplier Inv No"] || data.supplierInvNo,
    supplierInvDate: data["Supplier Inv Date"] || data.supplierInvDate,
    jobNo: data["Job No"] || data.jobNo,
    supplierName: data["Supplier Name"] || data.supplierName,
    address1: data["Address 1"] || data.address1,
    address2: data["Address 2"] || data.address2,
    address3: data["Address 3"] || data.address3,
    state: data["State"] || data.state,
    country: data["Country"] || data.country,
    pinCode: data["Pin Code"] || data.pinCode,
    registrationType: data["Registration Type"] || data.registrationType,
    gstinNo: data["GSTIN No"] || data.gstinNo,
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
        res.status(201).json({ success: true, id: entry._id, "Entry No": entry.entryNo });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ error: "Duplicate entry." });
        res.status(500).send({ error: "Internal Server Error" });
    }
});

router.get("/purchase-entry", authApiKey, async (req, res) => {
    try {
        const entryNo = req.query.entry_no || req.query.entryNo;
        if (!entryNo) return res.status(400).json({ error: "entry_no required" });
        const entry = await PurchaseBookEntryModel.findOne({ entryNo }).lean();
        if (!entry) return res.status(404).json({ error: "Not found" });

        let enriched = { ...entry };

        // Enrich with charge attachments from the job
        if (entry.chargeRef && entry.jobRef) {
            try {
                const job = await ExJobModel.findById(entry.jobRef).lean();
                if (job) {
                    const charge = job.charges?.find(c => c._id?.toString() === entry.chargeRef);
                    if (charge) {
                        enriched.url = charge.cost?.url || [];
                        enriched.chargeHead = charge.chargeHead || "";
                    }
                }
            } catch (e) {
                console.error("Error enriching purchase entry:", e);
            }
        }

        // Build full address from stored fields
        enriched.address = [entry.address1, entry.address2, entry.address3, entry.state, entry.country, entry.pinCode].filter(Boolean).join(", ");
        enriched.gstin = entry.gstinNo || "";
        enriched.pan = entry.pan || (entry.gstinNo ? entry.gstinNo.substring(2, 12) : "");

        res.status(200).json(enriched);
    } catch (error) {
        res.status(500).send({ error: "Internal Server Error" });
    }
});

const mapPaymentRequestData = (data) => ({
    requestNo: data["Request No"] || data.requestNo,
    requestDate: data["Request Date"] || data.requestDate,
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
    instrumentDate: data["Instrument Date"] || data.instrumentDate,
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
        res.status(201).json({ success: true, id: request._id, "Request No": request.requestNo });
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

        res.status(200).json(enriched);
    } catch (error) {
        console.error("Payment request fetch error:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

export default router;
