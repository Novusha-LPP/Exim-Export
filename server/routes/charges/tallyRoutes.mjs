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
 * Internal helper to format job and invoice data for Tally
 */
const mapJobAndInvoiceToTally = (job, inv) => {
    return {
        "Job Number": job.tally_club_ref_no || job.job_no,
        "Job Year": job.year || "",
        "Job Type": "EXPORT",
        "Job Date": normalizeDate(job.createdAt),
        "ImporterExporter Name": job.exporter || "",
        "Consignee": job.consignees?.[0]?.consignee_name || "",
        "Shipper": job.shipper || "",
        "Origin Port": job.port_of_loading || "",
        "Destination Port": job.port_of_discharge || "",
        "Custom House": job.custom_house || "",
        "Gross Weight": job.gross_weight_kg ? String(Math.round(parseFloat(job.gross_weight_kg))) : "",
        "Net Wt": job.net_weight_kg ? String(Math.round(parseFloat(job.net_weight_kg))) : "",
        "Package Count": job.total_no_of_pkgs || "",
        "Package Unit": job.package_unit || "",
        "Container Count": (() => {
            const containers = job.containers || [];
            if (containers.length === 0) return job.no_of_containers || "0";
            const counts = {};
            containers.forEach(c => {
                const detail = c.type || c.size || "20";
                counts[detail] = (counts[detail] || 0) + 1;
            });
            return Object.entries(counts)
                .map(([detail, count]) => `${count} X ${detail}`)
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
        "Invoice Number": inv?.invoiceNumber || inv?.invoice_number || "",
        "Inv Date": normalizeDate(inv?.invoiceDate || inv?.invoice_date),
        "Branch": job.branch_code || "",
        "Status": (job.status || "Pending").toLowerCase(),
        "Sb type": (() => {
            const eximCode = inv?.products?.[0]?.eximCode || "";
            return eximCode.includes("-") ? eximCode.split("-").slice(1).join("-").trim() : eximCode;
        })(),
        "Consignment Type": job.consignmentType || "",
        "Customer Ref No": job.exporter_ref_no || "",
        "TOI": inv?.termsOfInvoice || "",
        "Invoice Value": (() => {
            if (!inv) return "";
            return `${inv.invoiceValue || 0}(${inv.currency || ""})`;
        })(),
        "Invoice Currency": inv?.currency || "",
        "FOB Value": (() => {
            if (!inv) return "0.00";
            if (inv.precalculatedFob) return inv.precalculatedFob;
            const fob = inv.freightInsuranceCharges?.fobValue?.amount || inv.invoiceValue || 0;
            const rate = parseFloat(job.exchange_rate || inv.freightInsuranceCharges?.freight?.exchangeRate || 1);
            return (fob * rate).toFixed(2);
        })(),
        "Sb Heading": inv?.products?.[0]?.description || ""
    };
};

/**
 * Internal helper to retrieve and format job data for Tally
 */
const getJobDetailsInternal = async (job_number) => {
    if (!job_number) return null;
    const job = await ExJobModel.findOne({
        $or: [{ job_no: job_number }, { tally_club_ref_no: job_number }]
    }).sort({ is_club_job_parent: -1 }).lean();
    if (!job) return null;

    if (job.is_club_job_parent && Array.isArray(job.clubbed_jobs) && job.clubbed_jobs.length > 0) {
        const childJobs = await ExJobModel.find({ job_no: { $in: job.clubbed_jobs } }).lean();

        let totalNetWeight = 0;
        let totalGrossWeight = 0;
        let totalPkgs = 0;
        let allSbNos = [];

        childJobs.forEach(j => {
            const nw = parseFloat(j.net_weight_kg);
            const gw = parseFloat(j.gross_weight_kg);
            const pkgs = parseInt(j.total_no_of_pkgs, 10);
            if (!isNaN(nw)) totalNetWeight += nw;
            if (!isNaN(gw)) totalGrossWeight += gw;
            if (!isNaN(pkgs)) totalPkgs += pkgs;
            if (j.sb_no) allSbNos.push(j.sb_no);
        });

        job.net_weight_kg = totalNetWeight.toFixed(3);
        job.gross_weight_kg = totalGrossWeight.toFixed(3);
        job.total_no_of_pkgs = totalPkgs.toString();
        job.sb_no = [...new Set(allSbNos)].filter(Boolean).join(", ");

        const uniqueContainersMap = new Map();
        childJobs.flatMap(j => j.containers || []).forEach(c => {
            if (c && c.containerNo) {
                uniqueContainersMap.set(c.containerNo, c);
            }
        });
        job.containers = Array.from(uniqueContainersMap.values());
        
        const allInvoices = childJobs.flatMap(j => j.invoices || []);
        let invNumbers = [];
        let invDates = [];
        let totalInvValue = 0;
        let totalFobValue = 0;
        let currency = "";

        allInvoices.forEach(inv => {
            if (inv.invoiceNumber) invNumbers.push(inv.invoiceNumber);
            if (inv.invoiceDate) invDates.push(normalizeDate(inv.invoiceDate));
            
            const invVal = parseFloat(inv.invoiceValue) || 0;
            totalInvValue += invVal;
            
            const fob = parseFloat(inv.freightInsuranceCharges?.fobValue?.amount || invVal);
            const rate = parseFloat(inv.freightInsuranceCharges?.freight?.exchangeRate || job.exchange_rate || 1);
            totalFobValue += (fob * rate);
            
            if (!currency && inv.currency) currency = inv.currency;
        });

        job.invoices = [{
            invoiceNumber: [...new Set(invNumbers)].filter(Boolean).join(", "),
            invoiceDate: [...new Set(invDates)].filter(Boolean).join(", "),
            invoiceValue: totalInvValue,
            currency: currency || "USD",
            precalculatedFob: totalFobValue.toFixed(2),
            products: allInvoices[0]?.products || [],
            termsOfInvoice: allInvoices[0]?.termsOfInvoice || ""
        }];
    }

    const invoices = job.invoices || [];
    if (invoices.length === 0) {
        return [mapJobAndInvoiceToTally(job, null)];
    }
    return invoices.map(inv => mapJobAndInvoiceToTally(job, inv));
};

router.get("/job-data", authApiKey, async (req, res) => {
    try {
        const { job_number, invoice_number } = req.query;
        if (!job_number) {
            return res.status(400).send({ error: "job_number is a required query parameter" });
        }
        const responseData = await getJobDetailsInternal(job_number);
        if (!responseData) {
            return res.status(404).send({ error: "Job not found for the provided job_number" });
        }

        // If an invoice_number query parameter is provided, find that specific invoice
        if (invoice_number && Array.isArray(responseData)) {
            const matched = responseData.find(inv =>
                (inv["Invoice Number"] || "").toLowerCase() === invoice_number.trim().toLowerCase()
            );
            if (matched) {
                return res.status(200).json(matched);
            }
        }

        // Return a single object (the first mapped invoice) instead of an array
        // to remove the [] brackets for Tally integration compatibility
        const singleObject = Array.isArray(responseData) ? (responseData[0] || {}) : responseData;
        res.status(200).json(singleObject);
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
            const jobNoRegex = { $regex: new RegExp("^" + jobNo.split(",")[0].trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "(,|$)", "i") };
            count = await PurchaseBookEntryModel.countDocuments({ jobNo: jobNoRegex });
            prefix = "PB";
        } else if (type === "payment") {
            count = await PaymentRequestModel.countDocuments({ jobNo });
            prefix = "R1";
        } else {
            return res.status(400).json({ error: "Invalid type." });
        }

        const nextIndex = (count + 1).toString().padStart(2, '0');
        let fullNo = `${prefix}/${nextIndex}/${jobNo}`;

        const parts = jobNo.split('/');
        if (parts.length === 5 && parts[1].toUpperCase() === 'EXP') {
            // Already in BRANCH/EXP/MODE/SERIAL/YEAR format
            fullNo = `${prefix}/${nextIndex}/${jobNo}`.toUpperCase();
        } else if (parts.length === 5 && parts[2].toUpperCase() === 'EXP') {
            // In OLD format: BRANCH/MODE/EXP/SERIAL/YEAR
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

// Helper to join unique non-empty strings with a comma
const joinUniqueStrings = (arr) => {
    const unique = [...new Set(arr.map(s => String(s || '').trim()).filter(Boolean))];
    return unique.join(", ");
};

// Helper to join unique container numbers
const joinUniqueContainers = (arr) => {
    const allContainers = [];
    arr.forEach(s => {
        if (s) {
            s.split(",").forEach(c => {
                const trimmed = c.trim();
                if (trimmed && !allContainers.includes(trimmed)) {
                    allContainers.push(trimmed);
                }
            });
        }
    });
    return allContainers.join(", ");
};

// Helper to look up supplier invoice details from clubbed jobs
const getSupplierInvoiceDetails = async (mainJobNo, clubbedJobs, chargeHeading, mainInvNo, mainInvDate) => {
    let invNos = [mainInvNo].filter(Boolean);
    let invDates = [normalizeDate(mainInvDate)].filter(Boolean);

    if (clubbedJobs && clubbedJobs.length > 0 && chargeHeading) {
        const normHeading = chargeHeading.trim().toLowerCase();
        for (const jNo of clubbedJobs) {
            try {
                const job = await ExJobModel.findOne({ job_no: jNo }).lean();
                if (job && job.charges) {
                    const charge = job.charges.find(c => (c.chargeHead || '').trim().toLowerCase() === normHeading);
                    if (charge) {
                        const invNo = charge.invoice_number || charge.cost?.invoiceNo || '';
                        const invDate = charge.invoice_date || charge.cost?.invoiceDate || '';
                        if (invNo && !invNos.includes(invNo)) {
                            invNos.push(invNo);
                        }
                        const normD = normalizeDate(invDate);
                        if (normD && !invDates.includes(normD)) {
                            invDates.push(normD);
                        }
                    }
                }
            } catch (err) {
                console.error(`Error fetching supplier inv details for job ${jNo}:`, err);
            }
        }
    }
    return {
        supplierInvNo: invNos.join(", "),
        supplierInvDate: invDates.join(", ")
    };
};

// Helper to map Tally keys
const mapPurchaseEntryData = (data) => {
    const rawEntryNo = data["Entry No"] || data.entryNo || "";
    const entryNo = String(rawEntryNo).split(",")[0].trim();
    const jobNo = (data["Job No"] || data.jobNo || "").trim();

    return {
        entryNo,
        entryDate: normalizeDate(data["Entry Date"] || data.entryDate),
        supplierInvNo: data["Supplier Inv No"] || data.supplierInvNo,
        supplierInvDate: normalizeDate(data["Supplier Inv Date"] || data.supplierInvDate),
        jobNo,
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
        chargeHeading: data["Charge Heading"] || data.chargeHeading,
        sac: data["SAC"] || data.sac,
        taxableValue: data["Taxable Value"] || data.taxableValue,
        gstPercent: data["GST%"] || data.gstPercent,
        cgstAmt: data["CGST"] || data.cgstAmt,
        sgstAmt: data["SGST"] || data.sgstAmt,
        igstAmt: data["IGST"] || data.igstAmt,
        tds: data["TDS"] || data.tds,
        total: data["Total"] || data.total,
        netAmount: data["Net Amount"] || data.netAmount,
        chargeRef: data.chargeRef,
        jobRef: data.jobRef,
        status: data["Status"] || data.status || '',
        chargeHeadCategory: data["Charge Head Category"] || data.chargeHeadCategory || '',
        isClubJob: data.isClubJob !== undefined ? data.isClubJob : false,
        clubbedJobs: Array.isArray(data.clubbedJobs) ? data.clubbedJobs : []
    };
};

router.post("/purchase-entry", authApiKey, async (req, res) => {
    try {
        const data = mapPurchaseEntryData(req.body);

        // Include Job Details
        const firstJob = String(data.jobNo).split(",")[0].trim();
        const details = await getJobDetailsInternal(firstJob);
        if (details) {
            data.jobDetails = details;
        } else {
            data.jobDetails = [];
        }

        const entry = await PurchaseBookEntryModel.create(data);
        res.status(201).json({
            success: true,
            "Entry No": entry.entryNo
        });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ error: "Duplicate entry." });
        res.status(500).send({ error: "Internal Server Error" });
    }
});

router.get("/purchase-entry", authApiKey, async (req, res) => {
    try {
        const entryNo = req.query.entry_no || req.query.entryNo;
        if (!entryNo) return res.status(400).json({ error: "entry_no is a required query parameter" });

        // Find using either the exact entryNo, or the first part if it's comma-separated
        const firstPart = String(entryNo).split(",")[0].trim();
        const entry = await PurchaseBookEntryModel.findOne({
            $or: [
                { entryNo: entryNo },
                { entryNo: firstPart }
            ]
        }).lean();

        if (!entry) return res.status(404).json({ error: "Purchase Book Entry not found." });

        // Fallback for Charge Head Category if missing
        let chargeCategory = entry.chargeHeadCategory;
        if (!chargeCategory) {
            try {
                let job = null;
                if (entry.jobRef) {
                    job = await ExJobModel.findById(entry.jobRef).lean();
                }
                if (!job && entry.jobNo) {
                    const firstJob = String(entry.jobNo).split(",")[0].trim();
                    job = await ExJobModel.findOne({
                        $or: [{ job_no: firstJob }, { tally_club_ref_no: firstJob }]
                    }).sort({ is_club_job_parent: -1 }).lean();
                }
                if (job) {
                    let charge = null;
                    if (entry.chargeRef) {
                        charge = job.charges?.find(c => c._id?.toString() === entry.chargeRef);
                    }
                    if (!charge && entry.chargeHeading) {
                        const normHeading = entry.chargeHeading.trim().toLowerCase();
                        charge = job.charges?.find(c => c.chargeHead?.trim().toLowerCase() === normHeading);
                    }
                    if (charge) {
                        chargeCategory = charge.chargeType || charge.category;
                    }
                }
            } catch (err) {
                console.error("Error fetching fallback category for purchase entry:", err);
            }
        }

        // Get comma-separated supplier invoice numbers & dates if clubbed
        let supplierInvNo = entry.supplierInvNo;
        let supplierInvDate = normalizeDate(entry.supplierInvDate);
        let c1ParentJobNo = null;

        const firstJobRaw = String(entry.jobNo).split(",")[0].trim();
        let rawJobDB = null;
        try {
            rawJobDB = await ExJobModel.findOne({
                $or: [{ job_no: firstJobRaw }, { tally_club_ref_no: firstJobRaw }]
            }).sort({ is_club_job_parent: -1 }).lean();
        } catch (e) { }

        let isClub = entry.isClubJob;
        let clubbedList = entry.clubbedJobs || [];

        if (rawJobDB) {
            if (rawJobDB.is_club_job_parent && rawJobDB.clubbed_jobs?.length > 0) {
                isClub = true;
                clubbedList = rawJobDB.clubbed_jobs;
                c1ParentJobNo = rawJobDB.tally_club_ref_no || rawJobDB.job_no;
            } else if (rawJobDB.parent_club_job) {
                c1ParentJobNo = rawJobDB.tally_club_ref_no || rawJobDB.parent_club_job;
            }
        }

        if (isClub && clubbedList?.length > 0 && entry.chargeHeading) {
            const { supplierInvNo: clubInvNo, supplierInvDate: clubInvDate } = await getSupplierInvoiceDetails(
                firstJobRaw,
                clubbedList,
                entry.chargeHeading,
                entry.supplierInvNo,
                entry.supplierInvDate
            );
            supplierInvNo = clubInvNo;
            supplierInvDate = clubInvDate;
        }

        const tdsVal = Number(entry.tds || 0);
        let grossTotal = entry.total;
        let netAmount = entry.netAmount;
        if (netAmount === undefined || netAmount === null) {
            netAmount = entry.total;
            grossTotal = netAmount + tdsVal;
        }

        const formattedData = {
            "Entry No": entry.entryNo,
            "Entry Date": normalizeDate(entry.entryDate),
            "Supplier Inv No": supplierInvNo,
            "Supplier Inv Date": supplierInvDate,
            "Job No": c1ParentJobNo ? c1ParentJobNo : entry.jobNo,
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
            "Description of Services": entry.descriptionOfServices || (entry.supplierName ? `NEW - ${entry.supplierName}` : ""),
            "Charge Heading": entry.chargeHeading || "",
            "SAC": entry.sac,
            "Taxable Value": entry.taxableValue,
            "GST%": entry.gstPercent,
            "CGST": entry.cgstAmt,
            "SGST": entry.sgstAmt,
            "IGST": entry.igstAmt,
            "TDS": entry.tds,
            "Total": grossTotal,
            "Net Amount": netAmount,
            "Charge Description": entry.chargeDescription || '',
            "Charge Head Category": chargeCategory || '',
            "TDS Category": entry.tdsCategory || '94C',
            "Status": entry.status,
            "isClubJob": entry.isClubJob || false,
            "clubbedJobs": entry.clubbedJobs || []
        };

        // SAFETY: If it's a reimbursement, zero out GST fields for Tally even if saved in DB
        if (formattedData["Charge Head Category"] === "Reimbursement") {
            formattedData["GST%"] = "";
            formattedData["CGST"] = "";
            formattedData["SGST"] = "";
            formattedData["IGST"] = "";

            // Custom Description of Services for reimbursements
            if (!entry.descriptionOfServices && entry.supplierName) {
                formattedData["Description of Services"] = `REIMBURSEMENT - ${entry.supplierName}`;
            }

            // For reimbursements, the taxable value should be the gross amount.
            // We use Math.max to ensure we pick the gross amount, 
            // whether it's from the saved taxableValue or reconstructed from Total + TDS.
            const savedTaxable = Number(entry.taxableValue) || 0;
            const total = Number(formattedData["Total"]) || 0;
            const tds = Number(formattedData["TDS"]) || 0;
            formattedData["Taxable Value"] = Math.max(savedTaxable, total + tds).toFixed(2);
        }

        // Include Job Details
        const jobNoToFetch = (isClub && c1ParentJobNo) ? c1ParentJobNo : entry.jobNo;
        const jobDetails = await getJobDetailsInternal(jobNoToFetch);
        if (jobDetails) {
            formattedData["Job Details"] = jobDetails;
        } else {
            formattedData["Job Details"] = [];
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
