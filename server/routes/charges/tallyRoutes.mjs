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

/**
 * Format a list of clubbed jobs into a range or a list.
 * Expects job format: PREFIX/SERIAL/SUFFIX, e.g. AMD/EXP/SEA/00302/26-27
 */
const formatClubJobSeries = (clubbedJobs, defaultVal = "") => {
    if (!Array.isArray(clubbedJobs) || clubbedJobs.length === 0) {
        return defaultVal;
    }
    const uniqueJobs = [...new Set(clubbedJobs.map(j => String(j || '').trim()).filter(Boolean))];
    if (uniqueJobs.length === 0) return defaultVal;
    if (uniqueJobs.length === 1) return uniqueJobs[0];

    const parsed = [];
    for (const job of uniqueJobs) {
        const parts = job.split('/');
        if (parts.length === 5) {
            const numStr = parts[3];
            const num = parseInt(numStr, 10);
            if (!isNaN(num)) {
                parsed.push({
                    num,
                    padLength: numStr.length,
                    prefix: parts.slice(0, 3).join('/'),
                    suffix: parts[4],
                    original: job
                });
                continue;
            }
        }
        // Fallback if formatting fails for any item
        return uniqueJobs.join(', ');
    }

    // Ensure all items have the same prefix and suffix
    const firstPrefix = parsed[0].prefix;
    const firstSuffix = parsed[0].suffix;
    const allSamePrefixSuffix = parsed.every(p => p.prefix === firstPrefix && p.suffix === firstSuffix);

    if (!allSamePrefixSuffix) {
        return uniqueJobs.join(', ');
    }

    // Sort by numeric value ascending
    parsed.sort((a, b) => a.num - b.num);

    // Check if continuous
    let isContinuous = true;
    for (let i = 1; i < parsed.length; i++) {
        if (parsed[i].num !== parsed[i - 1].num + 1) {
            isContinuous = false;
            break;
        }
    }

    if (isContinuous) {
        const firstPadded = String(parsed[0].num).padStart(parsed[0].padLength, '0');
        const lastPadded = String(parsed[parsed.length - 1].num).padStart(parsed[parsed.length - 1].padLength, '0');
        return `${firstPrefix}/${firstPadded} TO ${lastPadded}/${firstSuffix}`;
    } else {
        const numString = parsed.map(p => p.num).join(',');
        return `${firstPrefix}/${numString}/${firstSuffix}`;
    }
};

/**
 * Resolves a potentially formatted club job series (or standard job number)
 * into a query conditions array for $or.
 */
const resolveJobNumberQuery = (jobNo) => {
    if (!jobNo) return [];
    const cleanJobNo = String(jobNo).trim();
    
    // Check for "TO" format: e.g. AMD/EXP/SEA/00463 TO 00466/26-27
    const toMatch = cleanJobNo.match(/^(.*)\/(\d+)\s+TO\s+(\d+)\/([^\/]+)$/i);
    if (toMatch) {
        const prefix = toMatch[1];
        const startNum = toMatch[2];
        const suffix = toMatch[4];
        const candidate1 = `${prefix}/${startNum}/${suffix}`;
        return [
            { job_no: candidate1 },
            { job_no: { $regex: new RegExp("^" + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "/0*" + parseInt(startNum, 10) + "/" + suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "$", "i") } }
        ];
    }

    // Check for comma-separated format: e.g. AMD/EXP/SEA/302,303,304,306,309/26-27
    const commaMatch = cleanJobNo.match(/^(.*)\/(\d+(?:,\d+)+)\/([^\/]+)$/i);
    if (commaMatch) {
        const prefix = commaMatch[1];
        const firstNum = commaMatch[2].split(',')[0].trim();
        const suffix = commaMatch[3];
        return [
            { job_no: { $regex: new RegExp("^" + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "/0*" + parseInt(firstNum, 10) + "/" + suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "$", "i") } }
        ];
    }

    // Standard case
    return [
        { job_no: cleanJobNo },
        { tally_club_ref_no: cleanJobNo }
    ];
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
    let job = await ExJobModel.findOne({
        $or: resolveJobNumberQuery(job_number)
    }).sort({ is_club_job_parent: -1 }).lean();
    if (!job) return null;

    // If it's a child job of a club job, resolve and retrieve the parent job details instead
    if (!job.is_club_job_parent && job.parent_club_job) {
        const parentJob = await ExJobModel.findOne({
            $or: [{ job_no: job.parent_club_job }, { tally_club_ref_no: job.parent_club_job }]
        }).lean();
        if (parentJob) {
            job = parentJob;
        }
    }

    if (job.is_club_job_parent && Array.isArray(job.clubbed_jobs) && job.clubbed_jobs.length > 0) {
        // Format the club job series
        const clubJobSeries = formatClubJobSeries(job.clubbed_jobs, job.tally_club_ref_no || job.job_no);
        job.tally_club_ref_no = clubJobSeries;

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

        let resolvedJobNo = jobNo;
        let job = await ExJobModel.findOne({
            $or: resolveJobNumberQuery(jobNo)
        }).sort({ is_club_job_parent: -1 }).lean();

        if (job) {
            if (!job.is_club_job_parent && job.parent_club_job) {
                const parentJob = await ExJobModel.findOne({
                    $or: [{ job_no: job.parent_club_job }, { tally_club_ref_no: job.parent_club_job }]
                }).lean();
                if (parentJob) {
                    job = parentJob;
                }
            }
        }

        let countQuery = {};
        if (job && job.is_club_job_parent && Array.isArray(job.clubbed_jobs) && job.clubbed_jobs.length > 0) {
            const formattedSeries = formatClubJobSeries(job.clubbed_jobs, job.tally_club_ref_no || job.job_no);
            resolvedJobNo = formattedSeries;

            // Generate candidates matching legacy/new patterns
            const candidates = new Set([
                job.job_no,
                job.tally_club_ref_no,
                formattedSeries,
                ...job.clubbed_jobs
            ].filter(Boolean));

            const orConditions = [];
            for (const cand of candidates) {
                const escapedCand = cand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                orConditions.push({ jobNo: { $regex: new RegExp("^" + escapedCand + "$", "i") } });

                const parts = cand.split('/');
                if (parts.length === 5 && !cand.includes(" TO ") && !cand.includes(",")) {
                    orConditions.push({ jobNo: { $regex: new RegExp("(^|,|\\s)" + escapedCand + "(\\s|,|$)", "i") } });
                }
            }
            countQuery = { $or: orConditions };
        } else {
            if (type === "purchase") {
                countQuery = { jobNo: { $regex: new RegExp("^" + jobNo.split(",")[0].trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "(,|$)", "i") } };
            } else {
                countQuery = { jobNo: { $regex: new RegExp("^" + jobNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "$", "i") } };
            }
        }

        let count = 0;
        let prefix = "";
        if (type === "purchase") {
            count = await PurchaseBookEntryModel.countDocuments(countQuery);
            prefix = "PB";
        } else if (type === "payment") {
            count = await PaymentRequestModel.countDocuments(countQuery);
            prefix = "R1";
        } else {
            return res.status(400).json({ error: "Invalid type." });
        }

        const nextIndex = (count + 1).toString().padStart(2, '0');
        let fullNo = `${prefix}/${nextIndex}/${resolvedJobNo}`;

        const parts = resolvedJobNo.split('/');
        if (parts.length === 5 && parts[1].toUpperCase() === 'EXP') {
            // Already in BRANCH/EXP/MODE/SERIAL/YEAR format
            fullNo = `${prefix}/${nextIndex}/${resolvedJobNo}`.toUpperCase();
        } else if (parts.length === 5 && parts[2].toUpperCase() === 'EXP') {
            // In OLD format: BRANCH/MODE/EXP/SERIAL/YEAR
            fullNo = `${prefix}/${nextIndex}/${parts[0]}/${parts[2]}/${parts[1]}/${parts[3]}/${parts[4]}`.toUpperCase();
        }

        res.status(200).json({
            success: true,
            nextIndex,
            fullNo,
            jobNo: resolvedJobNo
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

        // Fetch Charge Head Category and TDS Rate from Job & Charge details
        let chargeCategory = entry.chargeHeadCategory;
        let tdsRate = 0;
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
                    if (!chargeCategory) {
                        chargeCategory = charge.chargeType || charge.category;
                    }
                    if (charge.cost && charge.cost.tdsPercent !== undefined) {
                        tdsRate = Number(charge.cost.tdsPercent);
                    }
                }
            }
        } catch (err) {
            console.error("Error fetching job/charge details for purchase entry:", err);
        }

        // Fallback calculation if tdsRate is not retrieved
        if (!tdsRate && entry.tds && entry.taxableValue) {
            const calculated = (entry.tds / entry.taxableValue) * 100;
            tdsRate = Math.round(calculated);
        }

        // Ensure tdsRate is either 1 or 2
        if (tdsRate !== 2) {
            tdsRate = 1;
        }

        const tdsKey = tdsRate === 2 ? "TDS ON CONTRACT 94C - 1024 -2%" : "TDS ON CONTRACT 94C - 1023- 1%";

        // Get comma-separated supplier invoice numbers & dates if clubbed
        let supplierInvNo = entry.supplierInvNo;
        let supplierInvDate = normalizeDate(entry.supplierInvDate);
        let c1ParentJobNo = null;

        const firstJobRaw = String(entry.jobNo).split(",")[0].trim();
        let rawJobDB = null;
        try {
            rawJobDB = await ExJobModel.findOne({
                $or: resolveJobNumberQuery(firstJobRaw)
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
                try {
                    const parentJob = await ExJobModel.findOne({
                        $or: [{ job_no: rawJobDB.parent_club_job }, { tally_club_ref_no: rawJobDB.parent_club_job }]
                    }).lean();
                    if (parentJob) {
                        isClub = true;
                        clubbedList = parentJob.clubbed_jobs || [];
                        c1ParentJobNo = parentJob.tally_club_ref_no || parentJob.job_no;
                    } else {
                        c1ParentJobNo = rawJobDB.tally_club_ref_no || rawJobDB.parent_club_job;
                    }
                } catch (err) {
                    c1ParentJobNo = rawJobDB.tally_club_ref_no || rawJobDB.parent_club_job;
                }
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
            "Job No": (isClub && clubbedList.length > 0) ? formatClubJobSeries(clubbedList, c1ParentJobNo || entry.jobNo) : (c1ParentJobNo ? c1ParentJobNo : entry.jobNo),
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
            [tdsKey]: entry.tds,
            "Total": grossTotal,
            "Net Amount": netAmount,
            "Charge Description": entry.chargeDescription || '',
            "Charge Head Category": chargeCategory || '',
            "TDS Category": tdsKey,
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

            // For reimbursements, the taxable value should be the total value before TDS.
            const taxable = Number(entry.taxableValue || entry.total || 0);
            formattedData["Taxable Value"] = taxable.toFixed(2);

            // The total value should be the net value (after TDS deduction)
            const net = entry.netAmount !== undefined && entry.netAmount !== null
                ? Number(entry.netAmount)
                : (Number(entry.total || 0) - Number(entry.tds || 0));

            formattedData["Total"] = net;
            formattedData["Net Amount"] = net;
        } else if (String(formattedData["Charge Head Category"]).toLowerCase() === "margin") {
            // For Margin, do not change the logic of taxable value, but ensure Total is set to netAmount
            formattedData["Total"] = netAmount;
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
